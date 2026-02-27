import type { AuthUser } from '../stores/useAuthStore';

export interface ImportMetaPayload {
  fileName: string;
  fileSize: number;
  rowCount: number;
  source: 'csv-xlsx' | 'json';
  status: 'uploaded' | 'processed';
}

const STORAGE_KEY = 'tx-backend-imports-v1';

interface PersistedImport extends ImportMetaPayload {
  id: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
}

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
 * Step-1 backend path placeholder.
 * This mirrors the shape of a Firestore write and can be replaced by Firebase SDK writes.
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
  persist(items.slice(0, 500));
  return entry;
}

export async function listImportMeta(user: AuthUser) {
  return load().filter((item) => item.uid === user.uid);
}
