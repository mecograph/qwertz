import type { AuthUser } from '../stores/useAuthStore';
import { decryptWithKey, encryptWithKey, generateDataKey, unwrapDataKey, wrapDataKey, type EncryptedPayload } from '../utils/crypto';

export interface ImportMetaPayload {
  fileName: string;
  fileSize: number;
  rowCount: number;
  source: 'csv-xlsx' | 'json';
  status: 'uploaded' | 'processed';
  mimeType?: string;
  encryptedOriginal?: {
    storageBlobId: string;
    wrappedDek: EncryptedPayload;
  };
}

export interface PersistedImport extends ImportMetaPayload {
  id: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
}

interface StoredBlob {
  id: string;
  uid: string;
  payload: EncryptedPayload;
}

const IMPORTS_KEY = 'tx-backend-imports-v1';
const BLOBS_KEY = 'tx-backend-encrypted-blobs-v1';

function loadImports(): PersistedImport[] {
  try {
    const raw = localStorage.getItem(IMPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistImports(items: PersistedImport[]) {
  localStorage.setItem(IMPORTS_KEY, JSON.stringify(items));
}

function loadBlobs(): StoredBlob[] {
  try {
    const raw = localStorage.getItem(BLOBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistBlobs(items: StoredBlob[]) {
  localStorage.setItem(BLOBS_KEY, JSON.stringify(items));
}

export async function encryptAndStoreOriginal(user: AuthUser, file: File) {
  const dataKey = await generateDataKey();
  const plain = new Uint8Array(await file.arrayBuffer());
  const payload = await encryptWithKey(dataKey, plain);
  const wrappedDek = await wrapDataKey(dataKey);

  const blob: StoredBlob = {
    id: crypto.randomUUID(),
    uid: user.uid,
    payload,
  };

  const blobs = loadBlobs();
  blobs.unshift(blob);
  persistBlobs(blobs.slice(0, 2000));

  return {
    storageBlobId: blob.id,
    wrappedDek,
    mimeType: file.type || 'application/octet-stream',
  };
}

export async function downloadOriginalImport(user: AuthUser, importId: string) {
  const imp = loadImports().find((item) => item.id === importId && item.uid === user.uid);
  if (!imp?.encryptedOriginal) throw new Error('Original file not available.');

  const blob = loadBlobs().find((item) => item.id === imp.encryptedOriginal?.storageBlobId && item.uid === user.uid);
  if (!blob) throw new Error('Encrypted blob not found.');

  const dataKey = await unwrapDataKey(imp.encryptedOriginal.wrappedDek);
  const bytes = await decryptWithKey(dataKey, blob.payload);

  return {
    bytes,
    fileName: imp.fileName,
    mimeType: imp.mimeType || 'application/octet-stream',
  };
}

export async function createImportMeta(user: AuthUser, payload: ImportMetaPayload) {
  const now = Date.now();
  const entry: PersistedImport = {
    id: crypto.randomUUID(),
    uid: user.uid,
    createdAt: now,
    updatedAt: now,
    ...payload,
  };

  const items = loadImports();
  items.unshift(entry);
  persistImports(items.slice(0, 1000));
  return entry;
}

export async function listImportMeta(user: AuthUser) {
  return loadImports().filter((item) => item.uid === user.uid);
}

export async function clearImportMeta(user: AuthUser) {
  const nextImports = loadImports().filter((item) => item.uid !== user.uid);
  persistImports(nextImports);

  const nextBlobs = loadBlobs().filter((item) => item.uid !== user.uid);
  persistBlobs(nextBlobs);
}
