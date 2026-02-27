import type { AuthUser } from '../stores/useAuthStore';
import { getAccessToken } from './authClient';
import { getFirebaseConfig } from './firebaseConfig';
import { firebaseJsonRequest, firestoreDocUrl } from './firebaseRest';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: number;
  readAt: number | null;
}

interface NotificationClient {
  list(user: AuthUser | null): Promise<AppNotification[]>;
  create(user: AuthUser | null, payload: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'>): Promise<AppNotification>;
  markRead(user: AuthUser | null, id: string): Promise<void>;
  markAllRead(user: AuthUser | null): Promise<void>;
  clear(user: AuthUser | null): Promise<void>;
}

const MOCK_KEY = 'tx-notifications-v2';

interface MockStoredNotification extends AppNotification {
  uid: string;
}

function getUid(user: AuthUser | null) {
  return user?.uid ?? 'anon';
}

function loadMock(): MockStoredNotification[] {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMock(items: MockStoredNotification[]) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(items));
}

const mockClient: NotificationClient = {
  async list(user) {
    const uid = getUid(user);
    return loadMock().filter((item) => item.uid === uid).sort((a, b) => b.createdAt - a.createdAt);
  },
  async create(user, payload) {
    const uid = getUid(user);
    const entry: MockStoredNotification = {
      uid,
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      createdAt: Date.now(),
      readAt: null,
    };
    const items = [entry, ...loadMock()].slice(0, 500);
    saveMock(items);
    const { uid: _uid, ...result } = entry;
    return result;
  },
  async markRead(user, id) {
    const uid = getUid(user);
    const next = loadMock().map((item) => {
      if (item.uid !== uid || item.id !== id) return item;
      return { ...item, readAt: item.readAt ?? Date.now() };
    });
    saveMock(next);
  },
  async markAllRead(user) {
    const uid = getUid(user);
    const now = Date.now();
    const next = loadMock().map((item) => {
      if (item.uid !== uid) return item;
      return { ...item, readAt: item.readAt ?? now };
    });
    saveMock(next);
  },
  async clear(user) {
    const uid = getUid(user);
    saveMock(loadMock().filter((item) => item.uid !== uid));
  },
};

function requireFirebaseConfig() {
  const cfg = getFirebaseConfig();
  if (!cfg.projectId) throw new Error('Missing VITE_FIREBASE_PROJECT_ID for notifications backend.');
  return cfg;
}

async function requireToken() {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing Firebase auth token for notifications backend.');
  return token;
}
function collectionPath(uid: string) {
  return `users/${uid}/notifications`;
}

function notificationPath(uid: string, id: string) {
  return `users/${uid}/notifications/${id}`;
}

async function fireReq<T>(url: string, init: RequestInit = {}, allow404 = false): Promise<T | null> {
  const token = await requireToken();
  const method = init.method ?? 'GET';
  let body: Record<string, unknown> | undefined;
  if (typeof init.body === 'string') {
    body = JSON.parse(init.body) as Record<string, unknown>;
  }

  return firebaseJsonRequest<T>({
    url,
    method,
    body,
    allow404,
    bearerToken: token,
    headers: (init.headers ?? {}) as Record<string, string>,
  });
}

function toFields(item: AppNotification) {
  return {
    fields: {
      title: { stringValue: item.title },
      message: { stringValue: item.message },
      severity: { stringValue: item.severity },
      createdAt: { integerValue: String(item.createdAt) },
      readAt: item.readAt === null ? { nullValue: null } : { integerValue: String(item.readAt) },
    },
  };
}

function parseDoc(doc: any): AppNotification {
  const fields = doc?.fields ?? {};
  return {
    id: String(doc?.name ?? '').split('/').pop() ?? crypto.randomUUID(),
    title: fields.title?.stringValue ?? '',
    message: fields.message?.stringValue ?? '',
    severity: (fields.severity?.stringValue ?? 'info') as NotificationSeverity,
    createdAt: Number(fields.createdAt?.integerValue ?? Date.now()),
    readAt: fields.readAt?.integerValue ? Number(fields.readAt.integerValue) : null,
  };
}

const firebaseClient: NotificationClient = {
  async list(user) {
    if (!user) return [];
    const { projectId } = requireFirebaseConfig();
    const res = await fireReq<{ documents?: any[] }>(firestoreDocUrl(projectId, collectionPath(user.uid)), {}, true);
    return (res?.documents ?? []).map(parseDoc).sort((a, b) => b.createdAt - a.createdAt);
  },
  async create(user, payload) {
    if (!user) throw new Error('Auth required for notifications backend.');
    const { projectId } = requireFirebaseConfig();
    const item: AppNotification = {
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      createdAt: Date.now(),
      readAt: null,
    };
    await fireReq(firestoreDocUrl(projectId, notificationPath(user.uid, item.id)), {
      method: 'PATCH',
      body: JSON.stringify(toFields(item)),
    });
    return item;
  },
  async markRead(user, id) {
    if (!user) return;
    const { projectId } = requireFirebaseConfig();
    const current = await fireReq<any>(firestoreDocUrl(projectId, notificationPath(user.uid, id)), {}, true);
    if (!current) return;
    const parsed = parseDoc(current);
    const next: AppNotification = { ...parsed, readAt: parsed.readAt ?? Date.now() };
    await fireReq(firestoreDocUrl(projectId, notificationPath(user.uid, id)), {
      method: 'PATCH',
      body: JSON.stringify(toFields(next)),
    });
  },
  async markAllRead(user) {
    if (!user) return;
    const items = await this.list(user);
    for (const item of items) {
      if (item.readAt === null) {
        await this.markRead(user, item.id);
      }
    }
  },
  async clear(user) {
    if (!user) return;
    const { projectId } = requireFirebaseConfig();
    const items = await this.list(user);
    for (const item of items) {
      await fireReq(firestoreDocUrl(projectId, notificationPath(user.uid, item.id)), { method: 'DELETE' }, true);
    }
  },
};

const provider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
const client = provider === 'firebase' ? firebaseClient : mockClient;

export const notificationClient = client;
