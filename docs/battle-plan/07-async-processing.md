# #7 — Async Processing & Notifications

## The Problem

The current import flow is fully synchronous. After the user confirms column mapping, the app:
1. Runs rule matching (fast, <1 second)
2. Runs AI batches sequentially (5-30 seconds depending on volume)
3. Only then shows the ReviewWizard

The user stares at a loading state during step 2. This is worst on the first import — when rules are empty, everything goes to AI, and the wait is longest. This is exactly the moment the user is forming their first impression.

### Current Flow

```
User confirms mapping
  ↓
catStore.categorize() — BLOCKS UI
  ├── categorizeByRules() ............. ~100ms
  ├── runAiBatches() .................. 5-30 seconds (blocks)
  │   ├── Batch 1/5 ................... ~3-5s
  │   ├── Batch 2/5 ................... ~3-5s
  │   └── ... (sequential)
  ↓
ReviewWizard shown
```

### Why This Matters

- **First import = worst performance.** Zero rules → everything goes to AI → maximum wait.
- **Progress bar isn't enough.** Users don't want to watch a progress bar for 30 seconds. They want to do something else and come back.
- **The vision says "notification when ready."** The user should be able to leave and return.

## Proposed Solution

### Two-Phase Review: Immediate + Deferred

Instead of waiting for all AI results before showing anything, split the review into immediate availability and background enrichment.

#### Phase 1: Show What We Have Immediately

After mapping is confirmed:
1. Run rule matching (~100ms) — show matched results in ReviewWizard immediately
2. Mark unmatched rows as "pending AI" with a visible status
3. User can start reviewing rule-matched rows right away

```
┌─────────────────────────────────────────────────┐
│  Review Import                                   │
│                                                  │
│  ✓ 127 transactions categorized by rules         │
│  ⏳ 215 transactions being categorized by AI...  │
│     Progress: 45/215 (batch 2 of 5)             │
│                                                  │
│  You can review categorized rows while AI works. │
│                                                  │
│  [Filter: All | Rules ✓ | AI ⏳ | Manual ✋]    │
└─────────────────────────────────────────────────┘
```

#### Phase 2: Stream AI Results Into Review

As each AI batch completes, insert results into the ReviewWizard in real-time:
- New rows appear in the table (sorted by confidence)
- Counter updates: "⏳ 170 remaining..."
- No full-page reload, no navigation — just new rows appearing

```ts
// In useCatStore.ts — stream results as they arrive
async categorize(rows: ValidRow[], locale: string) {
  // Phase 1: Rule matching (instant)
  const { matched, unmatched } = categorizeByRules(rows, this.profile.rules);
  this.pending = [...csvRows, ...buildPending(matched, 'rule')];

  // Phase 2: AI batches (background, streaming results in)
  if (unmatched.length > 0 && userConsent.aiEnabled) {
    this.aiRunning = true;
    await this.runAiBatchesStreaming(unmatched, locale);
    this.aiRunning = false;
  }

  // Phase 3: Remaining unmatched → manual
  const stillUnmatched = unmatched.filter(u => !this.pending.find(p => p.txId === u.id));
  this.pending.push(...buildPending(stillUnmatched, 'manual'));
}

async runAiBatchesStreaming(transactions, locale) {
  const batches = chunk(transactions, batchSize);
  for (const batch of batches) {
    const results = await aiCategorizeBatch(batch, locale);
    // Insert results into pending immediately
    for (const result of results) {
      this.pending.push(buildPendingFromAi(result));
    }
    this.aiProgress = { done: this.pending.length, total: transactions.length };
    // Auto-save draft after each batch
    await draftStore.save(this.currentDraft());
  }
}
```

### Background Processing for Large Imports

For imports > 500 unmatched transactions, offer a true background mode:

```
┌─────────────────────────────────────────────────┐
│  Large Import Detected                           │
│                                                  │
│  743 transactions need AI categorization.         │
│  This may take 2-3 minutes.                      │
│                                                  │
│  ○ Wait here (see results as they arrive)        │
│  ○ Process in background (we'll notify you)      │
│                                                  │
│  [Continue]                                      │
└─────────────────────────────────────────────────┘
```

If "background" is chosen:
1. Processing continues in the current tab (even if user navigates to dashboard)
2. Draft is saved after each batch
3. When complete, show in-app notification:

```
┌─────────────────────────────────┐
│  ✓ Import Ready for Review      │
│                                  │
│  743 transactions categorized.   │
│  [Review Now]                    │
└─────────────────────────────────┘
```

**Note:** This is NOT server-side background processing. It runs in the browser tab. True server-side background (via Cloud Functions) would be a future enhancement. The draft persistence (#2) ensures that even if the user closes the tab, they can resume where they left off.

### Web Worker for Non-Blocking UI (optional enhancement)

For the rule matching phase (which is CPU-bound for very large imports), offload to a Web Worker:

```ts
// Rule matching in worker — doesn't block main thread
const worker = new Worker(new URL('./categorizeWorker.ts', import.meta.url));
worker.postMessage({ rows, rules });
worker.onmessage = (e) => {
  const { matched, unmatched } = e.data;
  // Update store from main thread
};
```

This is only necessary if rule matching takes > 200ms (unlikely until 10,000+ rules). Skip for now, add later if profiling shows a bottleneck.

### Push Notifications (future enhancement)

If the user navigates away or switches tabs:

```ts
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('Import Ready', {
    body: '743 transactions categorized and ready for review.',
    icon: '/app-icon.png',
  });
}
```

Request notification permission on first import (only if background mode is chosen).

### Implementation Steps

1. Refactor `categorize()` to yield results incrementally (rule results first, AI results streaming in)
2. Update ReviewWizard to handle dynamic row insertion (reactive `pending` array)
3. Add "pending AI" status indicator in ReviewWizard
4. Add filter tabs (All / Rules / AI / Manual) to ReviewWizard
5. Add background processing option for large imports (>500 unmatched)
6. Add in-app notification component for "import ready"
7. Wire draft auto-save after each AI batch completion
8. (Future) Add push notification support
