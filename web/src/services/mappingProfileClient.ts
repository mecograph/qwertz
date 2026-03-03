import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseFunctions } from './firebaseApp';
import type { AuthUser } from '../stores/useAuthStore';
import type {
  MappingProfile,
  MappingProfileDelta,
  MappingFeedbackEvent,
  AiMappingSuggestRequest,
  AiMappingSuggestResponse,
  FieldHeaderFingerprintCounts,
  FieldHeaderTimestamps,
  MappingProfileQuality,
  MappingProfileAi,
} from '../types';
import { coerceProfile, emptyProfile } from '../utils/mappingSuggestions';

// --- Interface ---

interface MappingProfileClient {
  getProfile(user: AuthUser | null): Promise<MappingProfile>;
  updateProfileDelta(user: AuthUser | null, delta: MappingProfileDelta): Promise<void>;
  recordFeedback(user: AuthUser | null, event: MappingFeedbackEvent): Promise<void>;
  aiSuggestMapping(user: AuthUser | null, request: AiMappingSuggestRequest): Promise<AiMappingSuggestResponse>;
}

// --- Helpers ---

const PROFILE_VERSION = 2;
const MOCK_PROFILE_PREFIX = 'tx-mapping-profile-v2:';
const MOCK_FEEDBACK_KEY = 'tx-mapping-feedback:';
const MAX_MOCK_FEEDBACK = 200;

function getUid(user: AuthUser | null): string {
  return user?.uid ?? 'anon';
}

// --- Mock implementation (localStorage) ---

function loadMockProfile(uid: string): MappingProfile {
  try {
    const raw = localStorage.getItem(`${MOCK_PROFILE_PREFIX}${uid}`);
    if (!raw) return emptyProfile();
    return coerceProfile(JSON.parse(raw));
  } catch {
    return emptyProfile();
  }
}

function saveMockProfile(uid: string, profile: MappingProfile) {
  localStorage.setItem(`${MOCK_PROFILE_PREFIX}${uid}`, JSON.stringify(profile));
}

function applyDeltaToProfile(profile: MappingProfile, delta: MappingProfileDelta): MappingProfile {
  const result = { ...profile };

  // Merge count increments
  if (delta.counts) {
    const merged = { ...result.counts };
    for (const [field, headers] of Object.entries(delta.counts)) {
      if (!headers) continue;
      const f = field as keyof typeof merged;
      const fieldCounters = { ...(merged[f] ?? {}) };
      for (const [header, fps] of Object.entries(headers)) {
        const headerCounters = { ...(fieldCounters[header] ?? {}) };
        for (const [fp, inc] of Object.entries(fps)) {
          headerCounters[fp] = (headerCounters[fp] ?? 0) + inc;
        }
        fieldCounters[header] = headerCounters;
      }
      merged[f] = fieldCounters;
    }
    result.counts = merged;
  }

  // Merge negative count increments
  if (delta.negativeCounts) {
    const merged = { ...result.negativeCounts };
    for (const [field, headers] of Object.entries(delta.negativeCounts)) {
      if (!headers) continue;
      const f = field as keyof typeof merged;
      const fieldCounters = { ...(merged[f] ?? {}) };
      for (const [header, fps] of Object.entries(headers)) {
        const headerCounters = { ...(fieldCounters[header] ?? {}) };
        for (const [fp, inc] of Object.entries(fps)) {
          headerCounters[fp] = (headerCounters[fp] ?? 0) + inc;
        }
        fieldCounters[header] = headerCounters;
      }
      merged[f] = fieldCounters;
    }
    result.negativeCounts = merged;
  }

  // Merge lastUsedAt (overwrite with latest)
  if (delta.lastUsedAt) {
    const merged = { ...result.lastUsedAt };
    for (const [field, headers] of Object.entries(delta.lastUsedAt)) {
      if (!headers) continue;
      const f = field as keyof typeof merged;
      merged[f] = { ...(merged[f] ?? {}), ...headers };
    }
    result.lastUsedAt = merged;
  }

  // Merge quality increments
  if (delta.quality) {
    result.quality = { ...result.quality };
    for (const [key, val] of Object.entries(delta.quality)) {
      if (typeof val === 'number') {
        (result.quality as any)[key] = ((result.quality as any)[key] ?? 0) + val;
      }
    }
  }

  // Merge AI metadata
  if (delta.ai) {
    result.ai = { ...result.ai };
    if (typeof delta.ai.assistRuns === 'number') {
      result.ai.assistRuns = (result.ai.assistRuns ?? 0) + delta.ai.assistRuns;
    }
    if (delta.ai.lastAssistAt !== undefined) {
      result.ai.lastAssistAt = delta.ai.lastAssistAt;
    }
  }

  result.updatedAt = Date.now();
  return result;
}

const mockClient: MappingProfileClient = {
  async getProfile(user) {
    return loadMockProfile(getUid(user));
  },

  async updateProfileDelta(user, delta) {
    const uid = getUid(user);
    const profile = loadMockProfile(uid);
    const updated = applyDeltaToProfile(profile, delta);
    saveMockProfile(uid, updated);
  },

  async recordFeedback(user, event) {
    const uid = getUid(user);
    const key = `${MOCK_FEEDBACK_KEY}${uid}`;
    try {
      const raw = localStorage.getItem(key);
      const items: MappingFeedbackEvent[] = raw ? JSON.parse(raw) : [];
      items.unshift({ ...event, id: event.id ?? crypto.randomUUID() });
      localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_MOCK_FEEDBACK)));
    } catch {
      // ignore localStorage errors
    }
  },

  async aiSuggestMapping() {
    // Mock mode: no AI, return empty suggestions
    return { suggestions: {} };
  },
};

// --- Firebase implementation ---

function profileDocRef(uid: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'mappingProfiles', 'default');
}

function feedbackDocRef(uid: string, eventId: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'mappingFeedback', eventId);
}

/**
 * Flatten nested delta maps to dot-path keys with `increment()` values
 * for atomic Firestore updates.
 *
 * e.g. counts.date.buchungsdatum.fp_123 → increment(1)
 */
function flattenDeltaToIncrements(
  prefix: string,
  nested: FieldHeaderFingerprintCounts,
): Record<string, ReturnType<typeof increment>> {
  const result: Record<string, ReturnType<typeof increment>> = {};
  for (const [field, headers] of Object.entries(nested)) {
    if (!headers) continue;
    for (const [header, fps] of Object.entries(headers)) {
      for (const [fp, val] of Object.entries(fps)) {
        result[`${prefix}.${field}.${header}.${fp}`] = increment(val);
      }
    }
  }
  return result;
}

function flattenTimestamps(
  prefix: string,
  nested: FieldHeaderTimestamps,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [field, headers] of Object.entries(nested)) {
    if (!headers) continue;
    for (const [header, ts] of Object.entries(headers)) {
      result[`${prefix}.${field}.${header}`] = ts;
    }
  }
  return result;
}

const firebaseClient: MappingProfileClient = {
  async getProfile(user) {
    if (!user) return emptyProfile();
    const snap = await getDoc(profileDocRef(user.uid));
    if (!snap.exists()) return emptyProfile();
    return coerceProfile(snap.data());
  },

  async updateProfileDelta(user, delta) {
    if (!user) return;
    const ref = profileDocRef(user.uid);
    const now = Date.now();

    // Build the atomic update map
    const updates: Record<string, any> = {
      version: PROFILE_VERSION,
      updatedAt: now,
    };

    if (delta.counts) {
      Object.assign(updates, flattenDeltaToIncrements('counts', delta.counts));
    }
    if (delta.negativeCounts) {
      Object.assign(updates, flattenDeltaToIncrements('negativeCounts', delta.negativeCounts));
    }
    if (delta.lastUsedAt) {
      Object.assign(updates, flattenTimestamps('lastUsedAt', delta.lastUsedAt));
    }
    if (delta.quality) {
      for (const [key, val] of Object.entries(delta.quality)) {
        if (typeof val === 'number') {
          updates[`quality.${key}`] = increment(val);
        }
      }
    }
    if (delta.ai) {
      if (typeof delta.ai.assistRuns === 'number') {
        updates['ai.assistRuns'] = increment(delta.ai.assistRuns);
      }
      if (delta.ai.lastAssistAt !== undefined) {
        updates['ai.lastAssistAt'] = delta.ai.lastAssistAt;
      }
    }

    await setDoc(ref, updates, { merge: true });
  },

  async recordFeedback(user, event) {
    if (!user) return;
    const id = event.id ?? crypto.randomUUID();
    await setDoc(feedbackDocRef(user.uid, id), {
      type: event.type,
      field: event.field,
      header: event.header,
      sourceFingerprint: event.sourceFingerprint,
      previousValue: event.previousValue ?? null,
      newValue: event.newValue ?? null,
      createdAt: event.createdAt,
    });
  },

  async aiSuggestMapping(user, request) {
    if (!user) return { suggestions: {} };
    try {
      const { httpsCallable } = await import('firebase/functions');
      const functions = await getFirebaseFunctions();
      const callable = httpsCallable<AiMappingSuggestRequest, AiMappingSuggestResponse>(
        functions,
        'suggestMapping',
        { timeout: 15_000 },
      );
      const result = await callable(request);
      return result.data;
    } catch {
      // On any failure, fall back to empty (heuristic-only)
      return { suggestions: {} };
    }
  },
};

// --- Provider selection ---

const provider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
const client = provider === 'firebase' ? firebaseClient : mockClient;

export const mappingProfileClient = client;
