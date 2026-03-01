import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, orderBy, query } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebaseApp';
import type { AuthUser } from '../stores/useAuthStore';

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

function notifCollectionRef(uid: string) {
  return collection(getFirebaseFirestore(), 'users', uid, 'notifications');
}

function notifDocRef(uid: string, id: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'notifications', id);
}

function fromDoc(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    title: (data.title as string) ?? '',
    message: (data.message as string) ?? '',
    severity: ((data.severity as string) ?? 'info') as NotificationSeverity,
    createdAt: (data.createdAt as number) ?? Date.now(),
    readAt: (data.readAt as number) ?? null,
  };
}

const firebaseClient: NotificationClient = {
  async list(user) {
    if (!user) return [];
    const q = query(notifCollectionRef(user.uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromDoc(d.id, d.data() as Record<string, unknown>));
  },
  async create(user, payload) {
    if (!user) throw new Error('Auth required for notifications backend.');
    const item: AppNotification = {
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      createdAt: Date.now(),
      readAt: null,
    };
    await setDoc(notifDocRef(user.uid, item.id), {
      title: item.title,
      message: item.message,
      severity: item.severity,
      createdAt: item.createdAt,
      readAt: null,
    });
    return item;
  },
  async markRead(user, id) {
    if (!user) return;
    const snap = await getDoc(notifDocRef(user.uid, id));
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    if (data.readAt !== null && data.readAt !== undefined) return;
    await setDoc(notifDocRef(user.uid, id), { ...data, readAt: Date.now() });
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
    const items = await this.list(user);
    for (const item of items) {
      await deleteDoc(notifDocRef(user.uid, item.id));
    }
  },
};

const provider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
const client = provider === 'firebase' ? firebaseClient : mockClient;

export const notificationClient = client;
