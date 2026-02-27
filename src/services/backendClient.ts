import type { AuthUser } from '../stores/useAuthStore';

export interface ImportMetaPayload {
  fileName: string;
  fileSize: number;
  rowCount: number;
  source: 'csv-xlsx' | 'json';
  status: 'uploaded' | 'processed';
}

export interface PersistedImport extends ImportMetaPayload {
  id: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'tx-backend-imports-v1';

function load(): PersistedImport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(items: PersistedImport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Step-2 backend path placeholder.
 * Mirrors Firestore import document writes and reads by uid.
 */
export async function createImportMeta(user: AuthUser, payload: ImportMetaPayload) {
  const now = Date.now();
  const entry: PersistedImport = {
    id: crypto.randomUUID(),
    uid: user.uid,
    createdAt: now,
    updatedAt: now,
    ...payload,
  };

  const items = load();
  items.unshift(entry);
  persist(items.slice(0, 1000));
  return entry;
}

export async function listImportMeta(user: AuthUser) {
  return load().filter((item) => item.uid === user.uid);
}

export async function clearImportMeta(user: AuthUser) {
  const next = load().filter((item) => item.uid !== user.uid);
  persist(next);
}
