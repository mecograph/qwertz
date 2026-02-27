import type { AuthUser } from '../stores/useAuthStore';
import type { Tx, MappingConfig, ImportEvent, ImportEventType } from '../types';
import { decryptWithKey, encryptWithKey, generateDataKey, unwrapDataKey, wrapDataKey, type EncryptedPayload } from '../utils/crypto';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;

export interface ImportMetaPayload {
  fileName: string;
  fileSize: number;
  rowCount: number;
  source: 'csv-xlsx' | 'json';
  status: 'uploaded' | 'processed' | 'reverted';
  mimeType?: string;
  encryptedOriginal?: {
    storageBlobId: string;
    wrappedDek: EncryptedPayload;
  };
  mappingConfig?: MappingConfig;
}

export interface PersistedImport extends ImportMetaPayload {
  id: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
  retentionExpiresAt: number;
  extensionUsed: boolean;
  reminderOffsetsSent: number[];
  revertedAt?: number;
  schemaVersion: number;
}

interface StoredBlob {
  id: string;
  uid: string;
  payload: EncryptedPayload;
}

export interface RetentionCheckResult {
  reminders: Array<{ importId: string; fileName: string; daysLeft: number }>;
  expired: Array<{ importId: string; fileName: string }>;
}

export interface AnalyticsOverview {
  uid: string;
  updatedAt: number;
  totals: {
    income: number;
    expense: number;
    net: number;
    transactions: number;
  };
  topCategories: Array<{ category: string; amountAbs: number }>;
  monthly: Array<{ month: string; income: number; expense: number }>;
}

const IMPORTS_KEY = 'tx-backend-imports-v1';
const BLOBS_KEY = 'tx-backend-encrypted-blobs-v1';
const ANALYTICS_KEY = 'tx-backend-analytics-v1';

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

function loadAnalytics(): AnalyticsOverview[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistAnalytics(items: AnalyticsOverview[]) {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(items));
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
    retentionExpiresAt: now + ONE_YEAR_MS,
    extensionUsed: false,
    reminderOffsetsSent: [],
    schemaVersion: 1,
    ...payload,
  };

  const items = loadImports();
  items.unshift(entry);
  persistImports(items.slice(0, 1000));
  return entry;
}

export async function extendImportRetentionOnce(user: AuthUser, importId: string) {
  const items = loadImports();
  let updated = false;
  const next = items.map((item) => {
    if (item.uid !== user.uid || item.id !== importId) return item;
    if (item.extensionUsed) return item;
    updated = true;
    return {
      ...item,
      extensionUsed: true,
      retentionExpiresAt: item.retentionExpiresAt + ONE_YEAR_MS,
      updatedAt: Date.now(),
      reminderOffsetsSent: [],
    };
  });
  if (updated) persistImports(next);
  return updated;
}

export async function runRetentionCheck(user: AuthUser): Promise<RetentionCheckResult> {
  const now = Date.now();
  const targetOffsets = [30, 7, 1];
  const reminders: RetentionCheckResult['reminders'] = [];
  const expired: RetentionCheckResult['expired'] = [];

  const imports = loadImports();
  const expiredBlobIds = new Set<string>();

  const next = imports.flatMap((item) => {
    if (item.uid !== user.uid) return [item];

    const daysLeft = Math.ceil((item.retentionExpiresAt - now) / ONE_DAY_MS);
    if (daysLeft <= 0) {
      expired.push({ importId: item.id, fileName: item.fileName });
      if (item.encryptedOriginal?.storageBlobId) expiredBlobIds.add(item.encryptedOriginal.storageBlobId);
      return [];
    }

    const reminder = targetOffsets.find((offset) => offset === daysLeft && !item.reminderOffsetsSent.includes(offset));
    if (reminder) {
      reminders.push({ importId: item.id, fileName: item.fileName, daysLeft });
      return [{ ...item, reminderOffsetsSent: [...item.reminderOffsetsSent, reminder], updatedAt: now }];
    }

    return [item];
  });

  if (expiredBlobIds.size > 0) {
    const blobs = loadBlobs().filter((blob) => !expiredBlobIds.has(blob.id));
    persistBlobs(blobs);
  }

  persistImports(next);
  return { reminders, expired };
}

export async function listImportMeta(user: AuthUser) {
  return loadImports().filter((item) => item.uid === user.uid);
}

export async function clearImportMeta(user: AuthUser) {
  const nextImports = loadImports().filter((item) => item.uid !== user.uid);
  persistImports(nextImports);

  const nextBlobs = loadBlobs().filter((item) => item.uid !== user.uid);
  persistBlobs(nextBlobs);

  const nextAnalytics = loadAnalytics().filter((item) => item.uid !== user.uid);
  persistAnalytics(nextAnalytics);
}

export async function materializeAnalyticsOverview(user: AuthUser, rows: Tx[]) {
  const income = rows.filter((r) => r.type === 'Income').reduce((sum, r) => sum + r.amountAbs, 0);
  const expense = rows.filter((r) => r.type === 'Expense').reduce((sum, r) => sum + r.amountAbs, 0);

  const categoryMap = new Map<string, number>();
  rows.forEach((row) => {
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.amountAbs);
  });

  const monthMap = new Map<string, { income: number; expense: number }>();
  rows.forEach((row) => {
    const month = row.date.slice(0, 7);
    const current = monthMap.get(month) ?? { income: 0, expense: 0 };
    if (row.type === 'Income') current.income += row.amountAbs;
    if (row.type === 'Expense') current.expense += row.amountAbs;
    monthMap.set(month, current);
  });

  const doc: AnalyticsOverview = {
    uid: user.uid,
    updatedAt: Date.now(),
    totals: {
      income,
      expense,
      net: income - expense,
      transactions: rows.length,
    },
    topCategories: [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amountAbs]) => ({ category, amountAbs })),
    monthly: [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, values]) => ({ month, ...values })),
  };

  const items = loadAnalytics();
  const filtered = items.filter((item) => item.uid !== user.uid);
  filtered.unshift(doc);
  persistAnalytics(filtered.slice(0, 100));
  return doc;
}

export async function getAnalyticsOverview(user: AuthUser) {
  return loadAnalytics().find((item) => item.uid === user.uid) ?? null;
}

export async function revertImport(user: AuthUser, importId: string) {
  const items = loadImports();
  const next = items.map((item) => {
    if (item.uid !== user.uid || item.id !== importId) return item;
    return { ...item, status: 'reverted' as const, revertedAt: Date.now(), updatedAt: Date.now() };
  });
  persistImports(next);
}

const EVENTS_KEY = 'tx-backend-events-v1';

function loadEvents(): Array<ImportEvent & { uid: string; importId: string }> {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEvents(items: Array<ImportEvent & { uid: string; importId: string }>) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(items));
}

export async function writeImportEvent(user: AuthUser, importId: string, event: { type: ImportEventType; detail?: string }) {
  const entry = { id: crypto.randomUUID(), uid: user.uid, importId, type: event.type, timestamp: Date.now(), detail: event.detail };
  const items = [entry, ...loadEvents()].slice(0, 5000);
  persistEvents(items);
}

export async function listImportEvents(user: AuthUser, importId: string): Promise<ImportEvent[]> {
  return loadEvents()
    .filter((e) => e.uid === user.uid && e.importId === importId)
    .map(({ uid: _u, importId: _i, ...rest }) => rest)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function updateImportWrappedDek(user: AuthUser, importId: string, wrappedDek: EncryptedPayload) {
  const items = loadImports();
  const next = items.map((item) => {
    if (item.uid !== user.uid || item.id !== importId) return item;
    if (!item.encryptedOriginal) return item;
    return {
      ...item,
      encryptedOriginal: { ...item.encryptedOriginal, wrappedDek },
      updatedAt: Date.now(),
    };
  });
  persistImports(next);
}
