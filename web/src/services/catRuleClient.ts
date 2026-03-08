import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseFunctions } from './firebaseApp';
import type { AuthUser } from '../stores/useAuthStore';
import type {
  CatRuleProfile,
  CatRuleProfileDelta,
  CatFeedbackEvent,
  CatRule,
  AiCategorizeBatchRequest,
  AiCategorizeBatchResponse,
} from '../types';

// --- Interface ---

export interface CatRuleClient {
  getProfile(user: AuthUser | null): Promise<CatRuleProfile>;
  updateProfileDelta(user: AuthUser | null, delta: CatRuleProfileDelta): Promise<void>;
  recordFeedback(user: AuthUser | null, event: CatFeedbackEvent): Promise<void>;
  aiCategorizeBatch(user: AuthUser | null, request: AiCategorizeBatchRequest): Promise<AiCategorizeBatchResponse>;
}

// --- Helpers ---

const PROFILE_VERSION = 1;
const MOCK_PROFILE_KEY = 'tx-catrule-profile-v1:';
const MOCK_FEEDBACK_KEY = 'tx-catrule-feedback:';
const MAX_MOCK_FEEDBACK = 500;

function getUid(user: AuthUser | null): string {
  return user?.uid ?? 'anon';
}

export function emptyRuleProfile(): CatRuleProfile {
  return {
    version: PROFILE_VERSION,
    updatedAt: Date.now(),
    rules: [],
    customCategories: [],
    quality: { totalCategorized: 0, ruleHits: 0, aiHits: 0, corrections: 0 },
    ai: { batchRuns: 0, lastBatchAt: null },
  };
}

function coerceProfile(parsed: unknown): CatRuleProfile {
  if (!parsed || typeof parsed !== 'object') return emptyRuleProfile();
  const c = parsed as Partial<CatRuleProfile>;
  if (c.version !== PROFILE_VERSION) return emptyRuleProfile();
  return {
    version: PROFILE_VERSION,
    updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
    rules: Array.isArray(c.rules) ? c.rules : [],
    customCategories: Array.isArray(c.customCategories) ? c.customCategories : [],
    quality: {
      totalCategorized: c.quality?.totalCategorized ?? 0,
      ruleHits: c.quality?.ruleHits ?? 0,
      aiHits: c.quality?.aiHits ?? 0,
      corrections: c.quality?.corrections ?? 0,
    },
    ai: {
      batchRuns: c.ai?.batchRuns ?? 0,
      lastBatchAt: c.ai?.lastBatchAt ?? null,
    },
  };
}

function applyDelta(profile: CatRuleProfile, delta: CatRuleProfileDelta): CatRuleProfile {
  const result = { ...profile };

  // Add/update rules
  if (delta.rules && delta.rules.length > 0) {
    const ruleMap = new Map(result.rules.map((r) => [r.id, r]));
    for (const rule of delta.rules) {
      ruleMap.set(rule.id, rule);
    }
    result.rules = Array.from(ruleMap.values());
  }

  // Remove rules
  if (delta.removedRuleIds && delta.removedRuleIds.length > 0) {
    const removeSet = new Set(delta.removedRuleIds);
    result.rules = result.rules.filter((r) => !removeSet.has(r.id));
  }

  // Merge custom categories
  if (delta.customCategories && delta.customCategories.length > 0) {
    const catMap = new Map(result.customCategories.map((c) => [c.id, c]));
    for (const cat of delta.customCategories) {
      catMap.set(cat.id, cat);
    }
    result.customCategories = Array.from(catMap.values());
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
    if (typeof delta.ai.batchRuns === 'number') {
      result.ai.batchRuns += delta.ai.batchRuns;
    }
    if (delta.ai.lastBatchAt !== undefined) {
      result.ai.lastBatchAt = delta.ai.lastBatchAt;
    }
  }

  result.updatedAt = Date.now();
  return result;
}

// --- Mock implementation (localStorage) ---

function loadMockProfile(uid: string): CatRuleProfile {
  try {
    const raw = localStorage.getItem(`${MOCK_PROFILE_KEY}${uid}`);
    if (!raw) return emptyRuleProfile();
    return coerceProfile(JSON.parse(raw));
  } catch {
    return emptyRuleProfile();
  }
}

function saveMockProfile(uid: string, profile: CatRuleProfile) {
  localStorage.setItem(`${MOCK_PROFILE_KEY}${uid}`, JSON.stringify(profile));
}

const mockClient: CatRuleClient = {
  async getProfile(user) {
    return loadMockProfile(getUid(user));
  },

  async updateProfileDelta(user, delta) {
    const uid = getUid(user);
    const profile = loadMockProfile(uid);
    const updated = applyDelta(profile, delta);
    saveMockProfile(uid, updated);
  },

  async recordFeedback(user, event) {
    const uid = getUid(user);
    const key = `${MOCK_FEEDBACK_KEY}${uid}`;
    try {
      const raw = localStorage.getItem(key);
      const items: CatFeedbackEvent[] = raw ? JSON.parse(raw) : [];
      items.unshift({ ...event, id: event.id ?? crypto.randomUUID() });
      localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_MOCK_FEEDBACK)));
    } catch {
      // ignore
    }
  },

  async aiCategorizeBatch() {
    // Mock mode: no AI, return empty
    return { results: [] };
  },
};

// --- Firebase implementation ---

function profileDocRef(uid: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'catRuleProfiles', 'default');
}

function feedbackDocRef(uid: string, eventId: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'catRuleFeedback', eventId);
}

const firebaseClient: CatRuleClient = {
  async getProfile(user) {
    if (!user) return emptyRuleProfile();
    const snap = await getDoc(profileDocRef(user.uid));
    if (!snap.exists()) return emptyRuleProfile();
    return coerceProfile(snap.data());
  },

  async updateProfileDelta(user, delta) {
    if (!user) return;
    // For rules, we do a full read-merge-write since rules are an array
    const snap = await getDoc(profileDocRef(user.uid));
    const existing = snap.exists() ? coerceProfile(snap.data()) : emptyRuleProfile();
    const updated = applyDelta(existing, delta);
    await setDoc(profileDocRef(user.uid), updated);
  },

  async recordFeedback(user, event) {
    if (!user) return;
    const id = event.id ?? crypto.randomUUID();
    await setDoc(feedbackDocRef(user.uid, id), {
      type: event.type,
      description: event.description,
      pattern: event.pattern,
      category: event.category,
      label: event.label,
      purpose: event.purpose ?? null,
      previousCategory: event.previousCategory ?? null,
      previousLabel: event.previousLabel ?? null,
      source: event.source,
      createdAt: event.createdAt,
    });
  },

  async aiCategorizeBatch(user, request) {
    if (!user) return { results: [] };
    // Let errors propagate so the caller can abort batch loop on first failure
    const { httpsCallable } = await import('firebase/functions');
    const functions = await getFirebaseFunctions();
    const callable = httpsCallable<AiCategorizeBatchRequest, AiCategorizeBatchResponse>(
      functions,
      'categorizeBatch',
      { timeout: 30_000 },
    );
    const result = await callable(request);
    return result.data;
  },
};

// --- Provider selection ---

const provider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
const client: CatRuleClient = provider === 'firebase' ? firebaseClient : mockClient;

export const catRuleClient = client;
