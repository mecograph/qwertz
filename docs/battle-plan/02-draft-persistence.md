# #2 — Draft Persistence & Crash Recovery

## The Problem

The entire import state — parsed rows, column mapping, pending categorizations, review progress — lives exclusively in Pinia store memory. If the user closes the tab, the browser crashes, or they accidentally navigate away during a 500-row review session, everything is lost. They have to start over from file upload.

This is especially painful because:
- The review step is the most time-consuming part of the flow
- First imports have the most unmatched transactions (highest review burden)
- AI processing may have taken 20-30 seconds that now needs to repeat
- The user may have already confirmed/edited 200 rows before the crash

### Current State in Code

- `useCatStore.ts` → `pending: PendingCategorization[]` — in-memory only
- `useMappingStore.ts` → `mapping`, `suggestions`, `profile` — in-memory only
- `App.vue` → `importStore.rows` — in-memory only
- No `beforeunload` warning, no auto-save, no recovery mechanism

## Proposed Solution

### Use IndexedDB for Draft Storage

IndexedDB is the right choice because:
- Can store large structured data (thousands of rows)
- Persistent across browser sessions
- No size limits like localStorage (which caps at ~5-10MB)
- Async API won't block the UI
- Available in all modern browsers

**Do NOT use:**
- `localStorage` — too small for transaction data, synchronous (blocks UI)
- `sessionStorage` — cleared on tab close (defeats the purpose)
- Firestore — adds latency, costs writes, unnecessary for drafts

### Draft Schema

```ts
interface ImportDraft {
  id: string;                          // Stable ID per import session
  version: number;                     // Schema version for migrations
  createdAt: number;
  updatedAt: number;
  stage: 'mapping' | 'categorizing' | 'reviewing' | 'finalizing';

  // File metadata (not the file itself)
  fileName: string;
  fileSize: number;
  rowCount: number;
  headerRow: string[];

  // Parsed data
  parsedRows: ParsedRow[];            // Raw parsed rows

  // Mapping state
  mapping: MappingConfig;
  suggestions: Record<MappingField, MappingFieldSuggestion>;

  // Categorization state
  pendingCategorizations: PendingCategorization[];
  aiProgress: { done: number; total: number };
  aiCompleted: boolean;

  // Review progress
  reviewedIds: Set<string>;           // Which rows have been reviewed (serialized as array)
  editedRows: Record<string, Partial<PendingCategorization>>; // User edits
}
```

### Auto-Save Strategy

**When to save:**
1. After column mapping is confirmed (transition to categorization)
2. After AI categorization completes (transition to review)
3. During review: debounced save every 5 seconds if any change occurred
4. On every `confirmRow` / `confirmAll` / `confirmAllHighConfidence` action
5. On `beforeunload` event (last-chance save)

**When NOT to save:**
- During AI processing (state is in flux)
- On every keystroke in the review table (too frequent — debounce handles this)

**How to save:**
```ts
// Thin wrapper around IndexedDB
const draftStore = {
  async save(draft: ImportDraft): Promise<void>,
  async load(): Promise<ImportDraft | null>,
  async delete(): Promise<void>,
  async exists(): Promise<boolean>,
}
```

Use the `idb` library (3KB gzipped) for a promise-based IndexedDB API — no need to wrestle with the raw IndexedDB event-based API.

### Recovery Flow

On app load (or when navigating to import):

```
┌─────────────────────────────────────────────────┐
│  📋 Resume Previous Import?                     │
│                                                  │
│  You have an unfinished import from 2 hours ago: │
│                                                  │
│  File: sparkasse_jan2026.csv                     │
│  Rows: 342                                       │
│  Stage: Review (187 of 342 reviewed)             │
│                                                  │
│  [Resume Import]     [Start Fresh]               │
└─────────────────────────────────────────────────┘
```

If user chooses "Resume":
1. Load draft from IndexedDB
2. Restore Pinia stores from draft state
3. Navigate directly to the correct step (mapping / review)
4. All previous review progress is intact

If user chooses "Start Fresh":
1. Delete draft from IndexedDB
2. Proceed with normal upload flow

### beforeunload Warning

Add a `beforeunload` handler when an import is in progress:

```ts
window.addEventListener('beforeunload', (e) => {
  if (importInProgress.value) {
    e.preventDefault();
    // Most browsers show a generic "Leave site?" dialog
    // Also trigger a last-chance draft save
    draftStore.save(currentDraft());
  }
});
```

### Draft Expiration

Drafts older than 7 days should be auto-deleted on app load. The data is stale — the user likely started over or the bank data has changed.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User starts new import while draft exists | Show "you have an existing draft" dialog before proceeding |
| Draft from a different app version | Version field in draft schema. If incompatible, show "draft from older version, cannot resume" and offer to discard |
| IndexedDB unavailable (private browsing in some browsers) | Gracefully degrade — no draft persistence, show warning |
| Draft data exceeds IndexedDB quota | Extremely unlikely for transaction data. If it happens, catch the error and continue without persistence |
| Multiple tabs | Use a simple lock mechanism (store `tabId` in draft). If another tab tries to resume, warn that the import is open elsewhere |

### Implementation Steps

1. Add `idb` dependency (`npm install idb`)
2. Create `web/src/services/draftStore.ts` with IndexedDB CRUD
3. Add `saveDraft()` and `loadDraft()` methods to import orchestration in `App.vue`
4. Add debounced auto-save in `ReviewWizard.vue` on any row change
5. Add `beforeunload` handler in `App.vue` when import is active
6. Build `ResumeDraftDialog.vue` component
7. Add draft recovery check on app mount / import page navigation
8. Add 7-day expiration cleanup on app load
