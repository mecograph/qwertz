# #5 — Fuzzy Matching Upgrade

## The Problem

The current rule matching uses two strategies:
1. **Exact match:** `normalizedDescription === rule.pattern` → confidence 0.9
2. **Substring match:** `normalizedDescription.includes(rule.pattern)` → confidence 0.7

This fails for common real-world variations:

| Rule Pattern | New Description | Match? | Should Match? |
|---|---|---|---|
| `rewe sagt danke` | `rewe markt filiale` | No (substring fails) | Yes — same merchant |
| `edeka sued` | `edeka neukauf` | No | Yes — same chain |
| `amazon eu sarl` | `amzn mktp de` | No | Yes — same company |
| `spotify ab` | `spotify technology` | No | Yes — same service |
| `dm drogerie` | `dm markt` | No | Yes — same chain |

Even after improving pattern extraction (#4), we still need the matching engine itself to be smarter. A user who categorized "REWE SAGT DANKE" as groceries should not have to re-categorize "REWE MARKT" — the system should recognize these are the same merchant.

### Current Matching Code

```ts
// categorizationEngine.ts — matchRule()
export function matchRule(normalizedDesc: string, rules: CatRule[]): MatchResult | null {
  // 1. Exact match
  const exact = rules.find(r => r.pattern === normalizedDesc);
  if (exact) return { rule: exact, matchType: 'exact' };

  // 2. Substring match (longest pattern first, then highest hitCount)
  const substringMatches = rules
    .filter(r => r.pattern.length >= 3 && normalizedDesc.includes(r.pattern))
    .sort((a, b) => b.pattern.length - a.pattern.length || b.hitCount - a.hitCount);

  if (substringMatches.length > 0) return { rule: substringMatches[0], matchType: 'substring' };
  return null;
}
```

## Proposed Solution

### Token-Based Matching with Weighted Scoring

Replace the binary exact/substring approach with a multi-signal scoring system:

#### Signal 1: Token Overlap (Jaccard similarity)

Compare the set of meaningful tokens between the pattern and the description:

```ts
function tokenOverlap(patternTokens: Set<string>, descTokens: Set<string>): number {
  const intersection = new Set([...patternTokens].filter(t => descTokens.has(t)));
  const union = new Set([...patternTokens, ...descTokens]);
  return intersection.size / union.size;  // Jaccard index: 0.0 - 1.0
}
```

Example:
- Pattern tokens: `{rewe}`
- Description tokens: `{rewe, markt, filiale}`
- Overlap: 1/3 = 0.33 — but "rewe" is the merchant, so this should score higher...

#### Signal 2: Anchor Token Match

The **first meaningful token** after prefix stripping is almost always the merchant name. Give it extra weight:

```ts
function anchorMatch(patternTokens: string[], descTokens: string[]): number {
  if (patternTokens[0] === descTokens[0]) return 1.0;  // Same anchor
  if (descTokens.includes(patternTokens[0])) return 0.7; // Anchor present but not first
  return 0.0;
}
```

#### Signal 3: Edit Distance (for typos and abbreviations)

Levenshtein distance on the anchor token catches abbreviations:

```ts
function normalizedEditDistance(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - (dist / maxLen);  // 1.0 = identical, 0.0 = completely different
}
```

Examples:
- `spotify` vs `spotify` → 1.0
- `amazon` vs `amzn` → 0.5 (3 edits / 6 chars)
- `edeka` vs `edeka` → 1.0

For short words (<4 chars), require exact match to avoid false positives.

#### Signal 4: Known Alias Match

Check the merchant alias table (from #4):

```ts
function aliasMatch(pattern: string, description: string, aliases: Map<string, string>): number {
  const patternCanonical = aliases.get(pattern) || pattern;
  const descCanonical = aliases.get(description) || description;
  return patternCanonical === descCanonical ? 1.0 : 0.0;
}
```

### Combined Scoring

```ts
function matchScore(rule: CatRule, normalizedDesc: string): number {
  const patternTokens = tokenize(rule.pattern);
  const descTokens = tokenize(normalizedDesc);

  const anchor   = anchorMatch(patternTokens, descTokens);     // 0.0 - 1.0
  const overlap  = tokenOverlap(new Set(patternTokens), new Set(descTokens)); // 0.0 - 1.0
  const editDist = normalizedEditDistance(patternTokens[0], descTokens[0]);    // 0.0 - 1.0
  const alias    = aliasMatch(rule.pattern, normalizedDesc, merchantAliases);  // 0.0 or 1.0

  // Weighted combination
  const score = (
    0.40 * anchor +
    0.25 * overlap +
    0.15 * editDist +
    0.20 * alias
  );

  // Boost by hitCount (rules that have been confirmed many times are more reliable)
  const hitBoost = Math.min(0.1, rule.hitCount / 100);  // Max 0.1 boost

  return Math.min(1.0, score + hitBoost);
}
```

### Confidence Thresholds

```ts
function matchRule(normalizedDesc: string, rules: CatRule[]): MatchResult | null {
  const scored = rules
    .map(rule => ({ rule, score: matchScore(rule, normalizedDesc) }))
    .filter(({ score }) => score >= 0.4)  // Minimum threshold
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const best = scored[0];
  return {
    rule: best.rule,
    matchType: best.score >= 0.85 ? 'exact' : 'fuzzy',
    confidence: best.score,
  };
}
```

| Score Range | Confidence Level | Review Required? |
|---|---|---|
| ≥ 0.85 | High (exact/alias match) | No — auto-confirm |
| 0.60 – 0.84 | Medium (strong fuzzy) | Optional — show in review but pre-confirmed |
| 0.40 – 0.59 | Low (weak fuzzy) | Yes — must review |
| < 0.40 | No match | Falls to AI |

### Performance Considerations

Scoring every rule against every transaction is O(N*M). For 200 rules and 500 transactions, that's 100,000 comparisons.

**Optimization:**
1. **Index by anchor token:** Build a `Map<string, CatRule[]>` keyed by the first token of each rule's pattern. Only score rules that share the anchor token (or an alias) with the description. Reduces to ~O(N) average case.
2. **Pre-compute token sets:** Tokenize all rules once on profile load, not per-match.
3. **Skip Levenshtein for long rules:** Only compute edit distance for anchor tokens ≤ 10 chars.

### Impact on Learning Speed

With fuzzy matching, a single confirmed rule covers more variations:

```
User categorizes: "REWE SAGT DANKE" → Groceries/Supermarket
  Pattern stored: "rewe"

Future matches (all auto-categorized):
  ✓ "REWE MARKT FILIALE 123"     → anchor "rewe" = 1.0
  ✓ "REWE CENTER BERLIN"          → anchor "rewe" = 1.0
  ✓ "REWE ONLINE LIEFERSERVICE"   → anchor "rewe" = 1.0
```

This means fewer rules needed, faster learning, fewer review items per import.

### Implementation Steps

1. Add `tokenize()` utility that strips noise and returns meaningful tokens
2. Implement `matchScore()` with 4-signal scoring
3. Build anchor token index for fast lookup
4. Update `MatchResult` type to include numeric confidence
5. Replace `matchRule()` in `categorizationEngine.ts`
6. Update `useCatStore.categorize()` to use new confidence values
7. Add lightweight Levenshtein implementation (or use `fastest-levenshtein` — 1KB)
8. Integration tests with German bank description corpus
