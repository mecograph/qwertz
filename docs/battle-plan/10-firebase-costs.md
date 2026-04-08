# #10 — Firebase Cost Optimization

## The Problem

Every import generates a significant number of Firestore writes:
- 1 mapping profile update
- 1 categorization profile update (with potentially hundreds of rules)
- N feedback events (one per confirmed/corrected row)
- Cloud Function invocations for AI

For a 500-transaction import where the user reviews and confirms everything:
- 500 feedback events = 500 Firestore document writes
- Each write costs $0.18/100K writes (Firestore pricing)
- At small scale this is pennies, but it compounds

### Current Write Patterns

```
Import 500 transactions:
  mappingFeedback:     1 event (import_confirm)          = 1 write
  catRuleFeedback:     ~500 events (review_confirm each)  = 500 writes
  catRuleProfile:      1 update (delta with rules)        = 1 write
  mappingProfile:      1 update (delta with counts)       = 1 write
  ─────────────────────────────────────────────────────────
  Total:               ~503 Firestore writes per import
```

If a user imports monthly (500 rows): ~6,000 writes/year per user.
100 users: 600,000 writes/year → ~$1.08 (negligible).
10,000 users: 60M writes/year → ~$108 (noticeable but manageable).

### The Real Problem: Rules Array Growth

More concerning than write count is the **rules array size**. Each categorization creates rules. After 12 months of imports:
- 50 new rules per month (conservative)
- 600 rules in the profile
- Each profile read/write transfers the entire rules array
- At 600 rules × ~200 bytes each = ~120KB per profile document

Firestore charges for document size in reads: a 120KB document costs 3x as much to read as a 40KB one (reads billed per 256KB). More importantly, transferring 120KB over mobile networks on every app load adds latency.

## Proposed Solution

### 1. Batch Feedback Events

Instead of writing one feedback event per row, batch them:

```ts
// Current: 500 individual writes
for (const row of confirmedRows) {
  await recordFeedback(user, { type: 'review_confirm', ...row });
}

// Improved: 1 batch write
const batch = confirmedRows.map(row => ({
  type: 'review_confirm',
  txId: row.txId,
  category: row.category,
  label: row.label,
  source: row.source,
}));
await recordFeedbackBatch(user, batch);  // Single Firestore document with array
```

**Storage format:**
```ts
// Instead of: users/{uid}/catRuleFeedback/{eventId} (one doc per event)
// Use:        users/{uid}/catRuleFeedback/{importId} (one doc per import)
{
  importId: 'imp_20260115_abc',
  timestamp: 1737000000,
  events: [
    { type: 'review_confirm', txId: '...', category: 'groceries', label: 'supermarket' },
    { type: 'review_correction', txId: '...', from: { category: 'shopping' }, to: { category: 'groceries' } },
    // ... all events for this import
  ]
}
```

This reduces 500 writes to 1 write. Firestore document size limit is 1MB — easily holds thousands of events.

### 2. Cap Rules with Smart Eviction

Prevent unbounded rule growth:

```ts
const MAX_RULES = 500;

function evictStaleRules(rules: CatRule[]): CatRule[] {
  if (rules.length <= MAX_RULES) return rules;

  // Score each rule by utility
  const scored = rules.map(rule => ({
    rule,
    score: ruleUtilityScore(rule),
  }));

  // Keep top MAX_RULES by score
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RULES).map(s => s.rule);
}

function ruleUtilityScore(rule: CatRule): number {
  const recency = (Date.now() - rule.updatedAt) / (1000 * 60 * 60 * 24); // days
  const frequency = rule.hitCount;
  const sourceBonus = rule.source === 'user' ? 10 : 0; // Prefer user-created rules

  // Higher is better: frequent + recent + user-created
  return frequency * 2 + sourceBonus - recency * 0.01;
}
```

Rules that haven't matched in 6+ months with low hitCounts get evicted. User-created rules are protected.

### 3. Lazy Profile Loading

Don't load the full profile on app startup. Load it when the user starts an import:

```ts
// Current: loads profile on store initialization
// Improved: loads profile on-demand
async categorize(rows, locale) {
  if (!this.profileLoaded) {
    await this.loadProfile();
  }
  // ... rest of categorization
}
```

### 4. Profile Sharding (Future, at Scale)

If rules exceed 500 or the profile document gets too large, shard into sub-collections:

```
users/{uid}/catRuleProfiles/default          ← metadata + quality + ai stats
users/{uid}/catRuleProfiles/default/rules/   ← rules as individual documents
```

This allows querying specific rules without loading all of them. Overkill for now — only implement if monitoring shows profile documents consistently exceed 200KB.

### 5. Cost Monitoring

Add lightweight cost estimation logging:

```ts
function estimateFirestoreCost(operation: 'read' | 'write', docSizeKB: number): number {
  const readCost = 0.06 / 100_000;  // $0.06 per 100K reads
  const writeCost = 0.18 / 100_000; // $0.18 per 100K writes
  const sizeFactor = Math.ceil(docSizeKB / 256); // Billed per 256KB chunk

  return operation === 'read'
    ? readCost * sizeFactor
    : writeCost;
}
```

Log estimated costs per import for monitoring. Surface in a developer dashboard if needed.

### Implementation Steps

1. Refactor feedback recording to batch events per import (single document)
2. Add rule eviction with utility scoring (MAX_RULES = 500)
3. Move profile loading to on-demand (lazy load on first import)
4. Add document size tracking to profile updates
5. Add cost estimation logging for monitoring
6. (Future) Implement profile sharding if documents exceed 200KB
