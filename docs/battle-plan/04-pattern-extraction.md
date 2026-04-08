# #4 — Pattern Extraction Quality

## The Problem

The categorization engine's `extractPattern()` function takes the first 3-4 words from a normalized description as the "merchant pattern." This is the foundation of the entire learning system — every rule is stored and matched by this pattern. If pattern extraction is wrong, rules don't match, the knowledge base doesn't grow, and the 99% accuracy goal is impossible.

### Current Implementation

```ts
// categorizationEngine.ts
export function extractPattern(description: string): string {
  const normalized = normalizeDescription(description);
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);
  const pattern = words.slice(0, words.length > 4 ? 4 : 3).join(' ');
  return pattern.length >= 3 ? pattern : normalized.substring(0, 30);
}
```

### Why This Fails

German bank transaction descriptions are structured chaos. Here are real examples and what the current extractor produces:

| Raw Description | Extracted Pattern | Actual Merchant | Problem |
|---|---|---|---|
| `KARTENZAHLUNG REWE SAGT DANKE 12345//BERLIN/DE` | `kartenzahlung rewe sagt danke` | REWE | Includes payment method prefix |
| `LASTSCHRIFT SPOTIFY AB STOCKHOLM SE` | `lastschrift spotify ab` | Spotify | Includes payment method prefix |
| `EC 28.01 15:32 EDEKA SUED MARKT 4711//MUENCHEN` | `ec edeka sued markt` | EDEKA | Includes "EC" prefix, date stripped but "ec" remains |
| `DAUERAUFTRAG MIETE WOHNUNG JANUAR 2026` | `dauerauftrag miete wohnung januar` | (rent payment) | Month name included — different pattern every month |
| `SEPA-LASTSCHRIFT VODAFONE GMBH RECHNUNG 12/25` | `sepa lastschrift vodafone gmbh` | Vodafone | Includes "SEPA-LASTSCHRIFT" prefix |
| `GUTSCHRIFT GEHALT DEZEMBER FIRMA XYZ GMBH` | `gutschrift gehalt dezember firma` | Employer | Includes month, type, "GUTSCHRIFT" |

**The core issue:** German bank descriptions almost always start with a **payment type prefix** (`KARTENZAHLUNG`, `LASTSCHRIFT`, `EC`, `DAUERAUFTRAG`, `GUTSCHRIFT`, `SEPA-ÜBERWEISUNG`, etc.) followed by the actual merchant name. Taking the first 3-4 words always captures this useless prefix.

Additionally:
- Month names (`JANUAR`, `FEBRUAR`, etc.) create 12 different patterns for the same recurring payment
- Invoice numbers (`RECHNUNG 12/25`) change every month
- Location suffixes (`BERLIN/DE`, `MUENCHEN`) vary by branch
- Terminal IDs (`4711`, `12345`) are random

## Proposed Solution

### Multi-Strategy Pattern Extractor

Replace the naive "first N words" approach with an intelligent multi-stage extractor:

#### Stage 1: Strip Known Prefixes

Maintain a list of German (and English) banking prefixes to remove:

```ts
const BANKING_PREFIXES = [
  // German
  'kartenzahlung', 'lastschrift', 'sepa lastschrift', 'sepa überweisung',
  'sepa ueberweisung', 'dauerauftrag', 'gutschrift', 'abbuchung',
  'einzugsermaechtigung', 'überweisung', 'ueberweisung', 'gehalt',
  'lohn', 'ec', 'maestro', 'visa', 'mastercard', 'girocard',
  'kontofuehrungsgebuehr', 'abschluss',
  // English
  'direct debit', 'standing order', 'card payment', 'bank transfer',
  'salary', 'wages', 'credit', 'debit', 'payment', 'purchase',
  'pos', 'atm', 'withdrawal',
];
```

**Apply greedily:** Match longest prefix first, strip it.

#### Stage 2: Strip Temporal/Numeric Noise

Remove tokens that change over time:

```ts
const NOISE_PATTERNS = [
  /\b(januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/gi,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
  /\b(jan|feb|mar|apr|mai|jun|jul|aug|sep|okt|nov|dez)\b/gi,
  /\b\d{1,2}[.\/]\d{1,2}([.\/]\d{2,4})?\b/g,   // Dates: 28.01, 28/01/2026
  /\b\d{2}:\d{2}\b/g,                              // Times: 15:32
  /\b\d{4,}\b/g,                                    // Long numbers (IDs, terminal numbers)
  /\brechnung\s*\d*\b/gi,                           // "Rechnung 12/25"
  /\/\/.*$/,                                         // Everything after // (location/reference)
  /\b[a-z]{2}\b/g,                                  // 2-letter country codes at end
];
```

#### Stage 3: Extract Merchant Core

After stripping prefixes and noise, the remaining text should be the merchant/purpose:

```ts
function extractMerchantCore(cleaned: string): string {
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);

  // Take up to 3 meaningful words
  const core = words.slice(0, 3).join(' ');

  // If we stripped too much, fall back to first 2 words of original (minus prefix)
  if (core.length < 3 && words.length > 0) {
    return words[0];
  }

  return core;
}
```

#### Stage 4: Normalize Common Merchant Names

A small lookup table for known merchant variations:

```ts
const MERCHANT_ALIASES: Record<string, string> = {
  'rewe sagt danke': 'rewe',
  'rewe markt': 'rewe',
  'rewe center': 'rewe',
  'edeka sued': 'edeka',
  'edeka neukauf': 'edeka',
  'aldi sued': 'aldi',
  'aldi nord': 'aldi',
  'lidl vertriebs': 'lidl',
  'amzn mktp': 'amazon',
  'amazon eu': 'amazon',
  'amazon payments': 'amazon',
  'paypal europe': 'paypal',
  'spotify ab': 'spotify',
  'netflix intl': 'netflix',
  'apple com bill': 'apple',
  // ... expandable by user rules
};
```

This table can grow from AI suggestions — when the AI returns a `suggestedPattern`, check if it simplifies a known merchant name and add to aliases.

### Complete Pipeline

```
Raw: "KARTENZAHLUNG REWE SAGT DANKE 12345//BERLIN/DE 28.01.2026 15:32"
  ↓ Strip prefix: "KARTENZAHLUNG" removed
  → "REWE SAGT DANKE 12345//BERLIN/DE 28.01.2026 15:32"
  ↓ Strip noise: date, time, //-suffix, long numbers removed
  → "REWE SAGT DANKE"
  ↓ Extract core: first 3 words
  → "rewe sagt danke"
  ↓ Normalize aliases
  → "rewe"
```

```
Raw: "SEPA-LASTSCHRIFT VODAFONE GMBH RECHNUNG 12/25 KUNDENNR 987654"
  ↓ Strip prefix: "SEPA-LASTSCHRIFT" removed
  → "VODAFONE GMBH RECHNUNG 12/25 KUNDENNR 987654"
  ↓ Strip noise: "RECHNUNG 12/25", long numbers removed
  → "VODAFONE GMBH KUNDENNR"
  ↓ Extract core: first 2 meaningful words
  → "vodafone gmbh"
  ↓ Strip legal suffixes (gmbh, ag, se, ltd, inc, etc.)
  → "vodafone"
```

### AI-Assisted Pattern Improvement

The `categorizeBatch` cloud function already returns `suggestedPattern` in its response. Currently, this is only used when confidence ≥ 0.5. Improve this:

1. **Always store the AI's suggestedPattern** alongside the rule (even if confidence is lower)
2. **Use AI patterns to train the alias table** — if AI consistently maps "REWE SAGT DANKE" → pattern "rewe", add to aliases
3. **Feedback loop:** When user confirms a categorization, compare the extracted pattern with the AI's suggested pattern. If they differ, prefer the AI's (it's usually cleaner).

### Migration

Existing rules use old patterns. Need a one-time migration:

1. On profile load, check `profile.version`
2. If version < 2, re-extract all rule patterns using new extractor
3. Merge rules that now share the same pattern (sum hitCounts)
4. Bump version to 2

### Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Rules matching across months | ~40% (same merchant, different month/ID) | ~90% |
| Rules matching across branches | ~20% (same chain, different location) | ~85% |
| Average rule utility (matches per rule) | 2-3 imports | 8-10 imports |
| Imports to 60% rule coverage | ~6 | ~3 |

### Implementation Steps

1. Build `extractMerchantPattern()` with multi-stage pipeline
2. Build banking prefix list (German + English, easily extensible)
3. Build noise pattern strippers
4. Build merchant alias table with CRUD
5. Add legal suffix stripping (GmbH, AG, SE, Ltd, Inc, etc.)
6. Replace `extractPattern()` calls throughout codebase
7. Add migration logic for existing rule profiles
8. Update `categorizeBatch` prompt to instruct AI to return cleaner patterns
9. Add integration tests with real German bank description samples
