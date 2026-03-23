# #1 — Duplicate Import Detection

## The Problem

There is zero protection against importing the same transactions twice. A user who exports "January 2026" from their bank, imports it, then next month exports "January + February 2026" will end up with January's transactions duplicated. Or they simply forget they already imported a file and drag it in again.

This is the fastest way to destroy trust. The user sees doubled expenses, incorrect totals, and immediately questions every number in the app. Worse — there's no undo mechanism, so they can't easily fix it.

### Why This Happens

The current flow treats every import as independent:
1. Parse file → 2. Map columns → 3. Categorize → 4. Save transactions

There is no step that checks: "Have I seen these transactions before?"

### Real-World Scenarios

| Scenario | Frequency | Severity |
|----------|-----------|----------|
| User imports same CSV twice by accident | Very common | High — full duplication |
| Monthly export includes overlap with previous month | Common (many banks export by statement period, not exact dates) | High — partial duplication |
| User exports "last 3 months" repeatedly | Common | Medium — growing overlap |
| Different banks, different accounts, no overlap | Rare false positive risk | Must not block legitimate imports |

## Proposed Solution

### Transaction Fingerprinting

Generate a fingerprint for each transaction row that's stable across reimports but unique enough to avoid false positives.

**Fingerprint formula:**
```
fingerprint = SHA-256(
  normalizeDate(date) +
  "|" +
  normalizeAmount(amount) +
  "|" +
  normalizeDescription(description).substring(0, 80)
)
```

Why these three fields:
- **Date** — anchors the transaction in time
- **Amount** — the exact value (normalized to 2 decimal places, no currency symbol)
- **Description** — the merchant/reference text (first 80 chars, normalized)

Why NOT include other fields:
- Category/label change between imports (user may have categorized differently)
- Purpose is derived, not raw
- Row order varies between exports

### Handling Same-Day Same-Amount Duplicates

Some legitimate transactions share date + amount + description (e.g., two coffees at the same shop on the same day). The fingerprint would collide.

**Solution:** Allow up to N duplicates of the same fingerprint within one import, where N = count of that fingerprint in the current file. Only flag as duplicates when the count in the new import exceeds the count already stored.

Example:
- Existing data: 2 transactions with fingerprint `abc123`
- New import: 3 rows produce fingerprint `abc123`
- Result: 1 new transaction imported, 2 flagged as existing

### User Interface

**Pre-categorization check (after parsing, before mapping):**

```
┌─────────────────────────────────────────────────┐
│  ⚠ Overlap Detected                             │
│                                                  │
│  47 of 120 transactions appear to already exist  │
│  in your data (matching date, amount, and        │
│  description).                                   │
│                                                  │
│  Date range overlap: Jan 1 – Jan 31, 2026       │
│                                                  │
│  What would you like to do?                      │
│                                                  │
│  ○ Import only new transactions (73 rows)        │
│  ○ Import everything (replace existing matches)  │
│  ○ Import everything (keep duplicates)           │
│  ○ Cancel                                        │
│                                                  │
│  [Show duplicates]  [Continue →]                 │
└─────────────────────────────────────────────────┘
```

**"Show duplicates" expands a collapsible table:**
- Side-by-side: existing vs. new row
- Highlights differences (if any)
- Per-row checkbox to include/exclude

### Storage

Add a `fingerprint` field to each stored transaction:

```ts
interface Tx {
  // ... existing fields
  fingerprint: string;   // SHA-256 hash
  importId: string;      // Which import batch this came from
  importedAt: number;    // Timestamp of import
}
```

Create a Firestore composite index on `users/{uid}/transactions` for:
- `fingerprint` (for duplicate lookup)
- `date` (for date-range overlap detection)

### Performance

For duplicate checking, we need to query existing transactions. Two approaches:

**Option A: Client-side (small datasets <5,000 transactions)**
- Load all existing fingerprints into a Set
- O(1) lookup per new row
- Works offline, fast

**Option B: Cloud Function (large datasets)**
- Send batch of fingerprints to a cloud function
- Function queries Firestore with `where('fingerprint', 'in', batch)` (max 30 per query)
- Returns set of existing fingerprints
- More scalable but requires network

**Recommendation:** Start with Option A. Most users will have <5,000 transactions in the first year. Add Option B when needed.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Same transaction, different description format (bank changed format) | Accept as new — different description = different fingerprint. User can merge later. |
| Refund that looks identical to original charge | Different date usually. If same day, same amount, same description — fingerprint collision. Handled by the N-duplicate rule. |
| Currency conversion differences | Normalize to 2 decimal places. 10.005 → 10.01. Consistent rounding. |
| Empty description | Use amount + date only. Higher collision risk but rare. |

### Implementation Steps

1. Add `fingerprint` field to `Tx` type
2. Add `computeFingerprint(date, amount, description)` utility
3. Add fingerprint computation to `normalizeRows()` after parsing
4. Add `checkForDuplicates(fingerprints)` to import flow (after parse, before mapping)
5. Build `DuplicateOverlapDialog` component
6. Wire into `App.vue` import orchestration between parse and mapping steps
7. Add `importId` and `importedAt` metadata to each saved transaction
