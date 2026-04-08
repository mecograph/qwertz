# #6 — Transaction Limit Ceiling

## The Problem

The current pipeline caps AI categorization at 250 transactions per import (5 batches × 50 transactions). A user doing a yearly export from their bank can easily have 500-2,000+ transactions. On a first import with zero rules, nearly all transactions go to AI. The excess silently falls to `source: 'manual'` with `confidence: 0` — the user sees hundreds of uncategorized rows and thinks the system doesn't work.

### Current Limits (hardcoded)

```ts
// useCatStore.ts
const MAX_AI_BATCH_SIZE = 50;         // Transactions per API call
const MAX_AI_CALLS_PER_IMPORT = 5;    // Max batches per import
// Effective ceiling: 250 transactions via AI
```

### Real-World Import Sizes

| Export Type | Typical Rows | AI Needed (1st import) | AI Needed (6th import) |
|---|---|---|---|
| Monthly (1 bank) | 30-100 | 30-100 | 5-15 |
| Quarterly | 100-300 | 100-300 | 20-50 |
| Semi-annual | 200-600 | 200-600 | 30-80 |
| Annual | 500-2000 | 500-2000 | 50-150 |
| Annual (active user) | 1000-3000 | 1000-3000 | 80-200 |

The 250 cap works for monthly imports but breaks for anything larger — exactly the use case where the app should shine (the user drops their yearly export and the app categorizes everything).

## Proposed Solution

### Remove the Hard Cap, Add Smart Throttling

#### Step 1: Remove `MAX_AI_CALLS_PER_IMPORT`

There's no good reason to cap at 5 calls. The real constraints are:
- **API rate limits** (Gemini: 60 requests/minute on free tier, 1000/minute on paid)
- **Cost** (Gemini 2.5 Flash: ~$0.15/1M input tokens, ~$0.60/1M output tokens)
- **User patience** (waiting 2+ minutes is too long — but this is solved by #7 async processing)

#### Step 2: Calculate Actual Costs

For a 1,000-transaction import:
- Average transaction context: ~50 tokens (description + amount + date)
- System prompt + taxonomy: ~2,000 tokens (one-time per batch)
- Per batch of 50: ~2,000 + (50 × 50) = ~4,500 input tokens
- 20 batches needed: ~90,000 input tokens total
- Output: ~100 tokens per transaction × 1,000 = ~100,000 output tokens

**Cost: ~$0.07 per 1,000-transaction import.** This is negligible.

#### Step 3: Implement Adaptive Batching

```ts
interface BatchConfig {
  batchSize: number;        // Transactions per API call
  concurrency: number;      // Parallel API calls
  delayBetweenMs: number;   // Rate limit protection
  maxTotalTransactions: number; // Safety ceiling
}

function getBatchConfig(unmatched: number): BatchConfig {
  if (unmatched <= 100) {
    return { batchSize: 50, concurrency: 1, delayBetweenMs: 0, maxTotalTransactions: 100 };
  }
  if (unmatched <= 500) {
    return { batchSize: 50, concurrency: 2, delayBetweenMs: 500, maxTotalTransactions: 500 };
  }
  // Large imports: bigger batches, slight parallelism, rate limit protection
  return { batchSize: 100, concurrency: 2, delayBetweenMs: 1000, maxTotalTransactions: 5000 };
}
```

#### Step 4: Parallel Batch Processing

Currently batches run sequentially. For large imports, run 2 in parallel:

```ts
async function runAiBatches(transactions: UnmatchedTx[], locale: string): Promise<AiResult[]> {
  const config = getBatchConfig(transactions.length);
  const batches = chunk(transactions, config.batchSize);
  const results: AiResult[] = [];

  // Process in waves of `concurrency` batches
  for (let i = 0; i < batches.length; i += config.concurrency) {
    const wave = batches.slice(i, i + config.concurrency);
    const waveResults = await Promise.allSettled(
      wave.map(batch => aiCategorizeBatch(batch, locale))
    );

    for (const result of waveResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
      // On rate limit, reduce concurrency to 1 and increase delay
      if (result.status === 'rejected' && isRateLimit(result.reason)) {
        config.concurrency = 1;
        config.delayBetweenMs = 2000;
      }
    }

    // Progress update
    updateProgress(results.length, transactions.length);

    // Rate limit protection
    if (config.delayBetweenMs > 0 && i + config.concurrency < batches.length) {
      await sleep(config.delayBetweenMs);
    }
  }

  return results;
}
```

#### Step 5: Increase Batch Size for Large Imports

Gemini can handle larger context windows. For imports > 500 transactions, increase batch size to 100:
- Fewer API calls = less overhead
- Gemini 2.5 Flash handles 1M token context — 100 transactions is nothing
- Update `categorizeBatch` cloud function to accept up to 100 transactions

#### Step 6: Safety Ceiling

Keep a generous safety ceiling (5,000 transactions) to prevent abuse or accidents (someone drops a 10-year export). Above this, prompt the user:

```
Your file contains 8,432 transactions. We recommend splitting
large imports into smaller date ranges for better results.

[Import first 5,000]  [Cancel]
```

### Cost Monitoring

Add per-user cost tracking (optional, for the developer's insight):

```ts
interface AiUsage {
  totalBatches: number;
  totalTransactions: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}
```

Log this to the user's profile quality metrics. If a single user is generating outsized costs, you'll see it.

### Implementation Steps

1. Remove `MAX_AI_CALLS_PER_IMPORT` constant
2. Add `getBatchConfig()` adaptive configuration
3. Implement parallel batch processing with `Promise.allSettled`
4. Add adaptive rate limit handling (reduce concurrency on 429)
5. Update `categorizeBatch` cloud function to accept batch size up to 100
6. Add 5,000-transaction safety ceiling with user prompt
7. Add cost estimation to profile quality metrics
8. Update progress UI to handle variable batch counts
