import type {
  MappingConfig,
  MappingField,
  MappingFieldSuggestion,
  MappingProfile,
  MappingProfileDelta,
  ConfidenceBucket,
  FieldHeaderFingerprintCounts,
  HeaderFingerprintCounts,
  FingerprintCounter,
  FieldHeaderTimestamps,
  AiMappingSuggestResponse,
} from '../types';

const HINTS: Record<MappingField, string[]> = {
  date: ['date', 'datum', 'booking date', 'buchungsdatum', 'timestamp', 'buchungstag'],
  category: ['category', 'kategorie', 'art'],
  label: ['label', 'bezeichnung', 'name', 'payee'],
  amount: ['amount', 'betrag', 'sum'],
  purpose: ['purpose', 'verwendungszweck', 'memo', 'description', 'buchungstext', 'text'],
};

const PROFILE_VERSION = 2;
const MAX_FINGERPRINTS_PER_FIELD = 200;

const FIELDS = Object.keys(HINTS) as MappingField[];

// --- Pure helpers ---

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[€$£¥]/g, '')
    .replace(/[_\-/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSourceFingerprint(headers: string[]): string {
  const normalized = headers.map(normalizeHeader).join('|');
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash)}`;
}

export function emptyProfile(): MappingProfile {
  return {
    version: PROFILE_VERSION,
    updatedAt: Date.now(),
    counts: {},
    negativeCounts: {},
    lastUsedAt: {},
    quality: { totalImports: 0, highConfidenceHits: 0, mediumConfidenceHits: 0, lowConfidenceHits: 0, corrections: 0 },
    ai: { assistRuns: 0, lastAssistAt: null },
  };
}

export function coerceProfile(parsed: unknown): MappingProfile {
  if (!parsed || typeof parsed !== 'object') return emptyProfile();
  const c = parsed as Partial<MappingProfile>;
  if (!c.counts || c.version !== PROFILE_VERSION) return emptyProfile();
  return {
    version: PROFILE_VERSION,
    updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
    counts: c.counts,
    negativeCounts: c.negativeCounts ?? {},
    lastUsedAt: c.lastUsedAt ?? {},
    quality: {
      totalImports: c.quality?.totalImports ?? 0,
      highConfidenceHits: c.quality?.highConfidenceHits ?? 0,
      mediumConfidenceHits: c.quality?.mediumConfidenceHits ?? 0,
      lowConfidenceHits: c.quality?.lowConfidenceHits ?? 0,
      corrections: c.quality?.corrections ?? 0,
    },
    ai: {
      assistRuns: c.ai?.assistRuns ?? 0,
      lastAssistAt: c.ai?.lastAssistAt ?? null,
    },
  };
}

export function classifyConfidence(score: number): ConfidenceBucket {
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

// --- Scoring functions ---

function getFieldCounter(store: FieldHeaderFingerprintCounts, field: MappingField): HeaderFingerprintCounts {
  return store[field] ?? {};
}

function sumFingerprintCounter(counter: FingerprintCounter): number {
  return Object.values(counter).reduce((sum, count) => sum + count, 0);
}

/** Returns 0 or 1: binary signal whether header matches any hint for the field. */
function hintScore(header: string, field: MappingField): number {
  return HINTS[field].some((hint) => header.includes(hint)) ? 1 : 0;
}

/** Returns 0..1 learned score based on positive/negative fingerprint counts. */
function learnedScore(
  profile: MappingProfile,
  field: MappingField,
  normalizedHeader: string,
  sourceFingerprint: string,
): number {
  const posField = getFieldCounter(profile.counts, field);
  const negField = getFieldCounter(profile.negativeCounts, field);

  const perHeaderPos = posField[normalizedHeader] ?? {};
  const perHeaderNeg = negField[normalizedHeader] ?? {};

  const posFp = perHeaderPos[sourceFingerprint] ?? 0;
  const negFp = perHeaderNeg[sourceFingerprint] ?? 0;

  const totalPosField = Object.values(posField).reduce(
    (sum, fpCounter) => sum + sumFingerprintCounter(fpCounter),
    0,
  );
  if (totalPosField === 0 && posFp === 0 && negFp === 0) return 0;

  // Local fingerprint-specific signal
  const localSignal = Math.max(0, posFp - negFp);
  const localScore = localSignal > 0 ? Math.min(0.55, localSignal / (localSignal + 2)) : 0;

  // Global header signal across all fingerprints
  const globalHeaderPos = sumFingerprintCounter(perHeaderPos);
  const globalHeaderNeg = sumFingerprintCounter(perHeaderNeg);
  const globalSignal = Math.max(0, globalHeaderPos - globalHeaderNeg);
  const globalScore = Math.min(0.45, globalSignal / Math.max(1, totalPosField));

  return Math.min(1, localScore + globalScore);
}

// --- Counter mutation (pure, returns new objects) ---

function incrementCounter(
  store: FieldHeaderFingerprintCounts,
  field: MappingField,
  normalizedHeader: string,
  sourceFingerprint: string,
): FieldHeaderFingerprintCounts {
  const result = { ...store };
  const fieldCounters = { ...(result[field] ?? {}) };
  const headerCounters = { ...(fieldCounters[normalizedHeader] ?? {}) };
  headerCounters[sourceFingerprint] = (headerCounters[sourceFingerprint] ?? 0) + 1;
  fieldCounters[normalizedHeader] = headerCounters;
  result[field] = fieldCounters;
  return result;
}

function setLastUsed(
  store: FieldHeaderTimestamps,
  field: MappingField,
  normalizedHeader: string,
  timestamp: number,
): FieldHeaderTimestamps {
  const result = { ...store };
  const fieldTs = { ...(result[field] ?? {}) };
  fieldTs[normalizedHeader] = timestamp;
  result[field] = fieldTs;
  return result;
}

// --- Fingerprint cap enforcement ---

function enforceFingerprintCapForStore(
  store: FieldHeaderFingerprintCounts,
  field: MappingField,
): FieldHeaderFingerprintCounts {
  const fieldCounters = store[field];
  if (!fieldCounters) return store;

  const entries: Array<{ header: string; fp: string; score: number }> = [];
  Object.entries(fieldCounters).forEach(([header, fps]) => {
    Object.entries(fps).forEach(([fp, value]) => entries.push({ header, fp, score: value }));
  });

  if (entries.length <= MAX_FINGERPRINTS_PER_FIELD) return store;

  entries.sort((a, b) => b.score - a.score);
  const keep = new Set(
    entries.slice(0, MAX_FINGERPRINTS_PER_FIELD).map((item) => `${item.header}::${item.fp}`),
  );

  const pruned: HeaderFingerprintCounts = {};
  Object.entries(fieldCounters).forEach(([header, fps]) => {
    const kept: FingerprintCounter = {};
    Object.entries(fps).forEach(([fp, val]) => {
      if (keep.has(`${header}::${fp}`)) kept[fp] = val;
    });
    if (Object.keys(kept).length > 0) pruned[header] = kept;
  });

  return { ...store, [field]: pruned };
}

function pruneLastUsedAt(
  lastUsedAt: FieldHeaderTimestamps,
  counts: FieldHeaderFingerprintCounts,
  field: MappingField,
): FieldHeaderTimestamps {
  const fieldTs = lastUsedAt[field];
  const fieldCounts = counts[field];
  if (!fieldTs) return lastUsedAt;

  const pruned: Record<string, number> = {};
  Object.entries(fieldTs).forEach(([header, ts]) => {
    if (fieldCounts?.[header] && Object.keys(fieldCounts[header]).length > 0) {
      pruned[header] = ts;
    }
  });

  if (Object.keys(pruned).length === 0) {
    const result = { ...lastUsedAt };
    delete result[field];
    return result;
  }
  return { ...lastUsedAt, [field]: pruned };
}

function enforceFingerprintCap(profile: MappingProfile, field: MappingField): MappingProfile {
  let counts = enforceFingerprintCapForStore(profile.counts, field);
  let negativeCounts = enforceFingerprintCapForStore(profile.negativeCounts, field);
  let lastUsedAt = pruneLastUsedAt(profile.lastUsedAt, counts, field);
  return { ...profile, counts, negativeCounts, lastUsedAt };
}

// --- Collision handling: greedy exclusive allocation ---

interface ScoreEntry {
  field: MappingField;
  headerIdx: number;
  score: number;
  reasons: string[];
}

function greedyAllocate(
  scoreMatrix: ScoreEntry[],
  headers: string[],
): { mapping: MappingConfig; suggestions: Partial<Record<MappingField, MappingFieldSuggestion>> } {
  // Sort descending by score
  const sorted = [...scoreMatrix].sort((a, b) => b.score - a.score);
  const usedFields = new Set<MappingField>();
  const usedHeaders = new Set<number>();
  const mapping: MappingConfig = {};
  const suggestions: Partial<Record<MappingField, MappingFieldSuggestion>> = {};

  for (const entry of sorted) {
    if (usedFields.has(entry.field) || usedHeaders.has(entry.headerIdx)) continue;
    if (entry.score <= 0) continue;

    usedFields.add(entry.field);
    usedHeaders.add(entry.headerIdx);
    const selectedHeader = headers[entry.headerIdx];
    mapping[entry.field] = selectedHeader;
    suggestions[entry.field] = {
      field: entry.field,
      header: selectedHeader,
      confidence: Number(entry.score.toFixed(2)),
      reasons: entry.reasons,
    };
  }

  // Fill unmatched fields with empty suggestions
  for (const field of FIELDS) {
    if (!suggestions[field]) {
      suggestions[field] = { field, confidence: 0, reasons: [] };
    }
  }

  return { mapping, suggestions };
}

// --- Main public API ---

export interface HistoricalMappingItem {
  field: MappingField;
  count: number;
}

export function suggestMappings(
  headers: string[],
  profile: MappingProfile,
  aiScores?: AiMappingSuggestResponse['suggestions'],
): {
  mapping: MappingConfig;
  suggestions: Partial<Record<MappingField, MappingFieldSuggestion>>;
  sourceFingerprint: string;
} {
  const normalizedHeaders = headers.map(normalizeHeader);
  const sourceFingerprint = buildSourceFingerprint(headers);
  const scoreMatrix: ScoreEntry[] = [];

  for (const field of FIELDS) {
    for (let idx = 0; idx < normalizedHeaders.length; idx++) {
      const header = normalizedHeaders[idx];
      const hScore = hintScore(header, field);
      const lScore = learnedScore(profile, field, header, sourceFingerprint);

      // AI score for this field+header pair
      let aScore = 0;
      const aiEntry = aiScores?.[field];
      if (aiEntry && normalizeHeader(aiEntry.header) === header) {
        aScore = Math.max(0, Math.min(1, aiEntry.score));
      }

      // Weighted: 0.45 * hint + 0.35 * history + 0.20 * ai
      const score = Math.max(0, Math.min(1, 0.45 * hScore + 0.35 * lScore + 0.20 * aScore));

      const reasons: string[] = [];
      if (hScore > 0) reasons.push('header_hint');
      if (lScore > 0) reasons.push('user_history');
      if (aScore > 0) reasons.push('ai_suggest');

      scoreMatrix.push({ field, headerIdx: idx, score, reasons });
    }
  }

  const { mapping, suggestions } = greedyAllocate(scoreMatrix, headers);
  return { mapping, suggestions, sourceFingerprint };
}

export function learnMappings(
  mapping: MappingConfig,
  headers: string[],
  profile: MappingProfile,
): { updatedProfile: MappingProfile; delta: MappingProfileDelta } {
  const headerSet = new Set(headers.map(normalizeHeader));
  const sourceFingerprint = buildSourceFingerprint(headers);
  const now = Date.now();
  let updated = { ...profile };
  const delta: MappingProfileDelta = { counts: {}, lastUsedAt: {} };

  for (const field of FIELDS) {
    const selectedHeader = mapping[field];
    if (!selectedHeader) continue;
    const normalized = normalizeHeader(selectedHeader);
    if (!headerSet.has(normalized)) continue;

    updated = {
      ...updated,
      counts: incrementCounter(updated.counts, field, normalized, sourceFingerprint),
      lastUsedAt: setLastUsed(updated.lastUsedAt, field, normalized, now),
    };
    updated = enforceFingerprintCap(updated, field);

    // Build delta for this field
    if (!delta.counts![field]) delta.counts![field] = {};
    if (!delta.counts![field]![normalized]) delta.counts![field]![normalized] = {};
    delta.counts![field]![normalized][sourceFingerprint] = 1; // increment by 1

    if (!delta.lastUsedAt![field]) delta.lastUsedAt![field] = {};
    delta.lastUsedAt![field]![normalized] = now;
  }

  updated.updatedAt = now;
  return { updatedProfile: updated, delta };
}

export function registerNegativeMappingSignal(
  field: MappingField,
  suggestedHeader: string,
  headers: string[],
  profile: MappingProfile,
): { updatedProfile: MappingProfile; delta: MappingProfileDelta } {
  const sourceFingerprint = buildSourceFingerprint(headers);
  const normalized = normalizeHeader(suggestedHeader);
  const now = Date.now();

  const updated: MappingProfile = {
    ...profile,
    negativeCounts: incrementCounter(profile.negativeCounts, field, normalized, sourceFingerprint),
    updatedAt: now,
  };

  const delta: MappingProfileDelta = {
    negativeCounts: {
      [field]: { [normalized]: { [sourceFingerprint]: 1 } },
    },
  };

  return { updatedProfile: updated, delta };
}

export function buildAiHistoricalContext(
  headers: string[],
  profile: MappingProfile,
): Array<{ header: string; historicalMappings: HistoricalMappingItem[] }> {
  return headers.map((header) => {
    const normalizedHeader = normalizeHeader(header);
    const historicalMappings = FIELDS
      .map((field) => {
        const fieldCounters = getFieldCounter(profile.counts, field);
        const total = sumFingerprintCounter(fieldCounters[normalizedHeader] ?? {});
        return { field, count: total };
      })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { header: normalizedHeader, historicalMappings };
  });
}
