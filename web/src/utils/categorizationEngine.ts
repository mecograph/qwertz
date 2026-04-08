import type { CatRule } from '../types';

/**
 * Normalize raw bank description text for matching.
 * Lowercase, strip reference numbers/dates/special chars, collapse whitespace.
 */
export function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d{4,}/g, '')         // strip long number sequences (refs, IBANs)
    .replace(/\d{2}[./-]\d{2}[./-]\d{2,4}/g, '') // strip dates
    .replace(/\/\//g, ' ')          // double slash to space
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip special chars, keep letters/digits
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a stable merchant pattern from bank description.
 * e.g. "REWE SAGT DANKE 1234//DE" → "rewe sagt danke"
 */
export function extractPattern(description: string): string {
  const normalized = normalizeDescription(description);
  // Take first 3-4 meaningful words as pattern
  const words = normalized.split(' ').filter((w) => w.length >= 2);
  return words.slice(0, 4).join(' ');
}

interface MatchResult {
  rule: CatRule;
  matchType: 'exact' | 'substring';
}

/**
 * Match a normalized description against rules.
 * Try exact match first, then substring match (highest hitCount wins ties).
 */
export function matchRule(normalizedDesc: string, rules: CatRule[]): MatchResult | null {
  // Exact match
  const exact = rules.find((r) => r.pattern === normalizedDesc);
  if (exact) return { rule: exact, matchType: 'exact' };

  // Substring match — find all rules whose pattern appears in the description
  const substringMatches = rules
    .filter((r) => r.pattern.length >= 3 && normalizedDesc.includes(r.pattern))
    .sort((a, b) => {
      // Prefer longer patterns, then higher hitCount
      if (b.pattern.length !== a.pattern.length) return b.pattern.length - a.pattern.length;
      return b.hitCount - a.hitCount;
    });

  if (substringMatches.length > 0) {
    return { rule: substringMatches[0], matchType: 'substring' };
  }

  return null;
}

interface CategorizeBatchResult {
  matched: Array<{ index: number; rule: CatRule; matchType: 'exact' | 'substring'; normalizedDesc: string }>;
  unmatched: Array<{ index: number; normalizedDesc: string; rawDesc: string; amount: number; date: string }>;
}

/**
 * Batch local rule matching for transactions.
 */
export function categorizeByRules(
  transactions: Array<{ description: string; amount: number; date: string }>,
  rules: CatRule[],
): CategorizeBatchResult {
  const matched: CategorizeBatchResult['matched'] = [];
  const unmatched: CategorizeBatchResult['unmatched'] = [];

  transactions.forEach((tx, index) => {
    const normalizedDesc = normalizeDescription(tx.description);
    const result = matchRule(normalizedDesc, rules);
    if (result) {
      matched.push({ index, rule: result.rule, matchType: result.matchType, normalizedDesc });
    } else {
      unmatched.push({ index, normalizedDesc, rawDesc: tx.description, amount: tx.amount, date: tx.date });
    }
  });

  return { matched, unmatched };
}

/**
 * Create a rule from a confirmed/corrected categorization.
 */
export function createRuleFromTransaction(
  description: string,
  category: string,
  label: string,
  purpose: string | undefined,
  source: 'ai' | 'user',
): CatRule {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    pattern: extractPattern(description),
    category,
    label,
    purpose,
    hitCount: 1,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Find an existing rule that matches the same pattern and update it,
 * or return null if no match.
 */
export function findRuleByPattern(pattern: string, rules: CatRule[]): CatRule | undefined {
  return rules.find((r) => r.pattern === pattern);
}
