import type { MappingConfig, MappingField, MappingFieldSuggestion } from '../types';

const HINTS: Record<MappingField, string[]> = {
  date: ['date', 'datum', 'booking date', 'buchungsdatum', 'timestamp', 'buchungstag'],
  category: ['category', 'kategorie', 'art'],
  label: ['label', 'bezeichnung', 'name', 'payee'],
  amount: ['amount', 'betrag', 'sum'],
  purpose: ['purpose', 'verwendungszweck', 'memo', 'description', 'buchungstext', 'text'],
};

const PROFILE_VERSION = 2;
const PROFILE_PREFIX = 'tx-mapping-profile-v';
const MAX_FINGERPRINTS_PER_FIELD = 200;

type FingerprintCounter = Record<string, number>;
type HeaderFingerprintCounts = Record<string, FingerprintCounter>;
type FieldHeaderFingerprintCounts = Partial<Record<MappingField, HeaderFingerprintCounts>>;

interface MappingProfile {
  version: number;
  updatedAt: number;
  counts: FieldHeaderFingerprintCounts;
  negativeCounts: FieldHeaderFingerprintCounts;
}

export interface HistoricalMappingItem {
  field: MappingField;
  count: number;
}

const FIELDS = Object.keys(HINTS) as MappingField[];

function profileStorageKey(scope: string) {
  return `${PROFILE_PREFIX}${PROFILE_VERSION}:${scope}`;
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[€$£¥]/g, '')
    .replace(/[_\-/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSourceFingerprint(headers: string[]): string {
  const normalized = headers.map(normalizeHeader).join('|');
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash)}`;
}

function emptyProfile(): MappingProfile {
  return { version: PROFILE_VERSION, updatedAt: Date.now(), counts: {}, negativeCounts: {} };
}

function coerceProfile(parsed: unknown): MappingProfile {
  if (!parsed || typeof parsed !== 'object') return emptyProfile();
  const candidate = parsed as Partial<MappingProfile>;
  if (!candidate.counts || candidate.version !== PROFILE_VERSION) return emptyProfile();
  return {
    version: PROFILE_VERSION,
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
    counts: candidate.counts,
    negativeCounts: candidate.negativeCounts ?? {},
  };
}

function loadProfile(scope: string): MappingProfile {
  if (typeof localStorage === 'undefined') return emptyProfile();
  try {
    const raw = localStorage.getItem(profileStorageKey(scope));
    if (!raw) return emptyProfile();
    return coerceProfile(JSON.parse(raw));
  } catch {
    return emptyProfile();
  }
}

function saveProfile(scope: string, profile: MappingProfile) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(profileStorageKey(scope), JSON.stringify(profile));
}

function hintScore(header: string, field: MappingField): number {
  return HINTS[field].some((hint) => header.includes(hint)) ? 0.45 : 0;
}

function getFieldCounter(store: FieldHeaderFingerprintCounts, field: MappingField): HeaderFingerprintCounts {
  return store[field] ?? {};
}

function sumFingerprintCounter(counter: FingerprintCounter): number {
  return Object.values(counter).reduce((sum, count) => sum + count, 0);
}

function learnedScore(profile: MappingProfile, field: MappingField, normalizedHeader: string, sourceFingerprint: string): number {
  const posField = getFieldCounter(profile.counts, field);
  const negField = getFieldCounter(profile.negativeCounts, field);

  const perHeaderPos = posField[normalizedHeader] ?? {};
  const perHeaderNeg = negField[normalizedHeader] ?? {};

  const posFp = perHeaderPos[sourceFingerprint] ?? 0;
  const negFp = perHeaderNeg[sourceFingerprint] ?? 0;

  const totalPosField = Object.values(posField).reduce((sum, fpCounter) => sum + sumFingerprintCounter(fpCounter), 0);
  if (totalPosField === 0 && posFp === 0 && negFp === 0) return 0;

  const localSignal = Math.max(0, posFp - negFp);
  const localScore = localSignal > 0 ? Math.min(0.25, localSignal / (localSignal + 2)) : 0;

  const globalHeaderPos = sumFingerprintCounter(perHeaderPos);
  const globalHeaderNeg = sumFingerprintCounter(perHeaderNeg);
  const globalSignal = Math.max(0, globalHeaderPos - globalHeaderNeg);
  const globalScore = Math.min(0.20, globalSignal / Math.max(1, totalPosField));

  return Math.min(0.45, localScore + globalScore);
}

function incrementCounter(
  store: FieldHeaderFingerprintCounts,
  field: MappingField,
  normalizedHeader: string,
  sourceFingerprint: string,
) {
  const fieldCounters = getFieldCounter(store, field);
  const headerCounters = fieldCounters[normalizedHeader] ?? {};
  headerCounters[sourceFingerprint] = (headerCounters[sourceFingerprint] ?? 0) + 1;
  fieldCounters[normalizedHeader] = headerCounters;
  store[field] = fieldCounters;
}

function enforceFingerprintCap(profile: MappingProfile, field: MappingField) {
  const fieldCounters = getFieldCounter(profile.counts, field);
  const entries: Array<{ header: string; fp: string; score: number }> = [];

  Object.entries(fieldCounters).forEach(([header, fps]) => {
    Object.entries(fps).forEach(([fp, value]) => entries.push({ header, fp, score: value }));
  });

  if (entries.length <= MAX_FINGERPRINTS_PER_FIELD) return;

  entries.sort((a, b) => b.score - a.score);
  const keep = new Set(entries.slice(0, MAX_FINGERPRINTS_PER_FIELD).map((item) => `${item.header}::${item.fp}`));

  Object.entries(fieldCounters).forEach(([header, fps]) => {
    Object.keys(fps).forEach((fp) => {
      if (!keep.has(`${header}::${fp}`)) {
        delete fps[fp];
      }
    });
    if (Object.keys(fps).length === 0) delete fieldCounters[header];
  });

  profile.counts[field] = fieldCounters;
}

export function suggestMappings(headers: string[], profileScope = 'anon'): {
  mapping: MappingConfig;
  suggestions: Partial<Record<MappingField, MappingFieldSuggestion>>;
  sourceFingerprint: string;
} {
  const profile = loadProfile(profileScope);
  const normalizedHeaders = headers.map(normalizeHeader);
  const sourceFingerprint = buildSourceFingerprint(headers);
  const mapping: MappingConfig = {};
  const suggestions: Partial<Record<MappingField, MappingFieldSuggestion>> = {};

  FIELDS.forEach((field) => {
    let bestIndex = -1;
    let bestScore = 0;
    let bestReasons: string[] = [];

    normalizedHeaders.forEach((header, idx) => {
      const hScore = hintScore(header, field);
      const lScore = learnedScore(profile, field, header, sourceFingerprint);
      const score = Math.max(0, Math.min(1, hScore + lScore));
      const reasons: string[] = [];
      if (hScore > 0) reasons.push('header_hint');
      if (lScore > 0) reasons.push('user_history');

      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
        bestReasons = reasons;
      }
    });

    if (bestIndex >= 0) {
      const selectedHeader = headers[bestIndex];
      mapping[field] = selectedHeader;
      suggestions[field] = {
        field,
        header: selectedHeader,
        confidence: Number(bestScore.toFixed(2)),
        reasons: bestReasons,
      };
    } else {
      suggestions[field] = { field, confidence: 0, reasons: [] };
    }
  });

  return { mapping, suggestions, sourceFingerprint };
}

export function learnMappings(mapping: MappingConfig, headers: string[], profileScope = 'anon') {
  const profile = loadProfile(profileScope);
  const headerSet = new Set(headers.map(normalizeHeader));
  const sourceFingerprint = buildSourceFingerprint(headers);

  FIELDS.forEach((field) => {
    const selectedHeader = mapping[field];
    if (!selectedHeader) return;
    const normalized = normalizeHeader(selectedHeader);
    if (!headerSet.has(normalized)) return;

    incrementCounter(profile.counts, field, normalized, sourceFingerprint);
    enforceFingerprintCap(profile, field);
  });

  profile.updatedAt = Date.now();
  saveProfile(profileScope, profile);
}

export function registerNegativeMappingSignal(
  field: MappingField,
  suggestedHeader: string,
  headers: string[],
  profileScope = 'anon',
) {
  const profile = loadProfile(profileScope);
  const sourceFingerprint = buildSourceFingerprint(headers);
  const normalized = normalizeHeader(suggestedHeader);
  incrementCounter(profile.negativeCounts, field, normalized, sourceFingerprint);
  profile.updatedAt = Date.now();
  saveProfile(profileScope, profile);
}

export function buildAiHistoricalContext(headers: string[], profileScope = 'anon') {
  const profile = loadProfile(profileScope);
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
