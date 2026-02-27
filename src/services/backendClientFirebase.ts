import type { AuthUser } from '../stores/useAuthStore';
import type { Tx } from '../types';
import { decryptWithKey, encryptWithKey, generateDataKey, unwrapDataKey, wrapDataKey, type EncryptedPayload } from '../utils/crypto';
import { getAccessToken } from './authClient';
import { getFirebaseConfig } from './firebaseConfig';
import type { AnalyticsOverview, ImportMetaPayload, PersistedImport, RetentionCheckResult } from './backendClientMock';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;

function requireFirebaseConfig() {
  const cfg = getFirebaseConfig();
  if (!cfg.projectId || !cfg.storageBucket) {
    throw new Error('Firebase backend is not configured. Please set VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_STORAGE_BUCKET.');
  }
  return cfg;
}

function requireAccessToken() {
  const token = getAccessToken();
  if (!token) throw new Error('Missing Firebase auth token. Please sign in again.');
  return token;
}

function firestoreDocUrl(projectId: string, path: string) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`;
}

function firestoreCollectionUrl(projectId: string, path: string) {
  return firestoreDocUrl(projectId, path);
}

function storageObjectUrl(bucket: string, objectPath: string) {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodedPath}`;
}

function storageUploadUrl(bucket: string, objectPath: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?name=${encodeURIComponent(objectPath)}`;
}

async function requestJson<T>(url: string, init: RequestInit = {}, allow404 = false): Promise<T | null> {
  const token = requireAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (allow404 && response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firebase backend request failed (${response.status}): ${body || 'unknown error'}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

function asString(v?: { stringValue?: string }) {
  return v?.stringValue ?? '';
}

function asNumber(v?: { integerValue?: string; doubleValue?: number }) {
  if (!v) return 0;
  if (typeof v.integerValue === 'string') return Number(v.integerValue);
  if (typeof v.doubleValue === 'number') return v.doubleValue;
  return 0;
}

function asBoolean(v?: { booleanValue?: boolean }) {
  return Boolean(v?.booleanValue);
}

function asArray<T>(v: any, mapper: (entry: any) => T): T[] {
  const values = v?.arrayValue?.values;
  if (!Array.isArray(values)) return [];
  return values.map(mapper);
}

function importDocumentPath(uid: string, importId: string) {
  return `users/${uid}/imports/${importId}`;
}

function importsCollectionPath(uid: string) {
  return `users/${uid}/imports`;
}

function analyticsOverviewPath(uid: string) {
  return `users/${uid}/analytics/overview`;
}

function toFirestoreImportDoc(payload: PersistedImport) {
  return {
    fields: {
      uid: { stringValue: payload.uid },
      fileName: { stringValue: payload.fileName },
      fileSize: { integerValue: String(payload.fileSize) },
      rowCount: { integerValue: String(payload.rowCount) },
      source: { stringValue: payload.source },
      status: { stringValue: payload.status },
      mimeType: { stringValue: payload.mimeType ?? '' },
      createdAt: { integerValue: String(payload.createdAt) },
      updatedAt: { integerValue: String(payload.updatedAt) },
      retentionExpiresAt: { integerValue: String(payload.retentionExpiresAt) },
      extensionUsed: { booleanValue: payload.extensionUsed },
      reminderOffsetsSent: {
        arrayValue: {
          values: payload.reminderOffsetsSent.map((value) => ({ integerValue: String(value) })),
        },
      },
      encryptedOriginal: payload.encryptedOriginal
        ? {
          mapValue: {
            fields: {
              storageBlobId: { stringValue: payload.encryptedOriginal.storageBlobId },
              wrappedDek: {
                mapValue: {
                  fields: {
                    cipherTextB64: { stringValue: payload.encryptedOriginal.wrappedDek.cipherTextB64 },
                    ivB64: { stringValue: payload.encryptedOriginal.wrappedDek.ivB64 },
                  },
                },
              },
            },
          },
        }
        : { nullValue: null },
    },
  };
}

function fromFirestoreImportDoc(document: any): PersistedImport {
  const fields = document?.fields ?? {};
  const id = String(document?.name ?? '').split('/').pop() ?? crypto.randomUUID();
  const encryptedMap = fields.encryptedOriginal?.mapValue?.fields;

  return {
    id,
    uid: asString(fields.uid),
    fileName: asString(fields.fileName),
    fileSize: asNumber(fields.fileSize),
    rowCount: asNumber(fields.rowCount),
    source: (asString(fields.source) || 'json') as PersistedImport['source'],
    status: (asString(fields.status) || 'uploaded') as PersistedImport['status'],
    mimeType: asString(fields.mimeType) || undefined,
    createdAt: asNumber(fields.createdAt),
    updatedAt: asNumber(fields.updatedAt),
    retentionExpiresAt: asNumber(fields.retentionExpiresAt),
    extensionUsed: asBoolean(fields.extensionUsed),
    reminderOffsetsSent: asArray<number>(fields.reminderOffsetsSent, (entry) => asNumber(entry)),
    encryptedOriginal: encryptedMap
      ? {
        storageBlobId: asString(encryptedMap.storageBlobId),
        wrappedDek: {
          cipherTextB64: asString(encryptedMap.wrappedDek?.mapValue?.fields?.cipherTextB64),
          ivB64: asString(encryptedMap.wrappedDek?.mapValue?.fields?.ivB64),
        },
      }
      : undefined,
  };
}

async function fetchImport(user: AuthUser, importId: string) {
  const { projectId } = requireFirebaseConfig();
  const doc = await requestJson<any>(firestoreDocUrl(projectId, importDocumentPath(user.uid, importId)), {}, true);
  if (!doc) return null;
  return fromFirestoreImportDoc(doc);
}

async function saveImport(user: AuthUser, item: PersistedImport) {
  const { projectId } = requireFirebaseConfig();
  await requestJson(
    firestoreDocUrl(projectId, importDocumentPath(user.uid, item.id)),
    {
      method: 'PATCH',
      body: JSON.stringify(toFirestoreImportDoc(item)),
    },
  );
}

async function deleteStorageObjectIfExists(bucket: string, objectPath: string) {
  await requestJson(storageObjectUrl(bucket, objectPath), { method: 'DELETE' }, true);
}

export async function encryptAndStoreOriginal(user: AuthUser, file: File) {
  const { storageBucket } = requireFirebaseConfig();
  const dataKey = await generateDataKey();
  const plain = new Uint8Array(await file.arrayBuffer());
  const payload = await encryptWithKey(dataKey, plain);
  const wrappedDek = await wrapDataKey(dataKey);

  const storageBlobId = `users/${user.uid}/imports/${crypto.randomUUID()}/original.enc.json`;
  const serializedPayload = JSON.stringify(payload);

  const token = requireAccessToken();
  const response = await fetch(storageUploadUrl(storageBucket, storageBlobId), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: serializedPayload,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Storage upload failed (${response.status}): ${body || 'unknown error'}`);
  }

  return {
    storageBlobId,
    wrappedDek,
    mimeType: file.type || 'application/octet-stream',
    encryptionMeta: {
      ivB64: payload.ivB64,
    },
  };
}

export async function downloadOriginalImport(user: AuthUser, importId: string) {
  const { storageBucket } = requireFirebaseConfig();
  const imp = await fetchImport(user, importId);
  if (!imp?.encryptedOriginal) throw new Error('Original file not available.');

  const token = requireAccessToken();
  const encryptedRes = await fetch(`${storageObjectUrl(storageBucket, imp.encryptedOriginal.storageBlobId)}?alt=media`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!encryptedRes.ok) {
    const body = await encryptedRes.text();
    throw new Error(`Storage download failed (${encryptedRes.status}): ${body || 'unknown error'}`);
  }

  const payload = (await encryptedRes.json()) as EncryptedPayload;
  if (!payload?.cipherTextB64 || !payload?.ivB64) {
    throw new Error('Encrypted payload format is invalid.');
  }

  const dataKey = await unwrapDataKey(imp.encryptedOriginal.wrappedDek);
  const bytes = await decryptWithKey(dataKey, payload);

  return {
    bytes,
    fileName: imp.fileName,
    mimeType: imp.mimeType || 'application/octet-stream',
  };
}

export async function createImportMeta(user: AuthUser, payload: ImportMetaPayload) {
  const now = Date.now();
  const item: PersistedImport = {
    id: crypto.randomUUID(),
    uid: user.uid,
    createdAt: now,
    updatedAt: now,
    retentionExpiresAt: now + ONE_YEAR_MS,
    extensionUsed: false,
    reminderOffsetsSent: [],
    ...payload,
  };

  await saveImport(user, item);
  return item;
}

export async function extendImportRetentionOnce(user: AuthUser, importId: string) {
  const item = await fetchImport(user, importId);
  if (!item || item.extensionUsed) return false;

  item.extensionUsed = true;
  item.retentionExpiresAt += ONE_YEAR_MS;
  item.updatedAt = Date.now();
  item.reminderOffsetsSent = [];
  await saveImport(user, item);
  return true;
}

export async function runRetentionCheck(user: AuthUser): Promise<RetentionCheckResult> {
  const imports = await listImportMeta(user);
  const now = Date.now();
  const targetOffsets = [30, 7, 1];
  const reminders: RetentionCheckResult['reminders'] = [];
  const expired: RetentionCheckResult['expired'] = [];
  const { storageBucket } = requireFirebaseConfig();

  for (const item of imports) {
    const daysLeft = Math.ceil((item.retentionExpiresAt - now) / ONE_DAY_MS);

    if (daysLeft <= 0) {
      expired.push({ importId: item.id, fileName: item.fileName });
      if (item.encryptedOriginal?.storageBlobId) {
        await deleteStorageObjectIfExists(storageBucket, item.encryptedOriginal.storageBlobId);
      }
      const { projectId } = requireFirebaseConfig();
      await requestJson(firestoreDocUrl(projectId, importDocumentPath(user.uid, item.id)), { method: 'DELETE' }, true);
      continue;
    }

    const reminder = targetOffsets.find((offset) => offset === daysLeft && !item.reminderOffsetsSent.includes(offset));
    if (reminder) {
      reminders.push({ importId: item.id, fileName: item.fileName, daysLeft });
      item.reminderOffsetsSent = [...item.reminderOffsetsSent, reminder];
      item.updatedAt = now;
      await saveImport(user, item);
    }
  }

  return { reminders, expired };
}

export async function listImportMeta(user: AuthUser) {
  const { projectId } = requireFirebaseConfig();
  const response = await requestJson<{ documents?: any[] }>(
    firestoreCollectionUrl(projectId, importsCollectionPath(user.uid)),
    {},
    true,
  );

  const documents = response?.documents ?? [];
  return documents.map(fromFirestoreImportDoc).sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearImportMeta(user: AuthUser) {
  const imports = await listImportMeta(user);
  const { projectId, storageBucket } = requireFirebaseConfig();

  for (const item of imports) {
    if (item.encryptedOriginal?.storageBlobId) {
      await deleteStorageObjectIfExists(storageBucket, item.encryptedOriginal.storageBlobId);
    }
    await requestJson(firestoreDocUrl(projectId, importDocumentPath(user.uid, item.id)), { method: 'DELETE' }, true);
  }

  await requestJson(firestoreDocUrl(projectId, analyticsOverviewPath(user.uid)), { method: 'DELETE' }, true);
}

function toAnalyticsDoc(user: AuthUser, rows: Tx[]): AnalyticsOverview {
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

  return {
    uid: user.uid,
    updatedAt: Date.now(),
    totals: { income, expense, net: income - expense, transactions: rows.length },
    topCategories: [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amountAbs]) => ({ category, amountAbs })),
    monthly: [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, values]) => ({ month, ...values })),
  };
}

function toFirestoreAnalyticsDoc(doc: AnalyticsOverview) {
  return {
    fields: {
      uid: { stringValue: doc.uid },
      updatedAt: { integerValue: String(doc.updatedAt) },
      totals: {
        mapValue: {
          fields: {
            income: { doubleValue: doc.totals.income },
            expense: { doubleValue: doc.totals.expense },
            net: { doubleValue: doc.totals.net },
            transactions: { integerValue: String(doc.totals.transactions) },
          },
        },
      },
      topCategories: {
        arrayValue: {
          values: doc.topCategories.map((entry) => ({
            mapValue: {
              fields: {
                category: { stringValue: entry.category },
                amountAbs: { doubleValue: entry.amountAbs },
              },
            },
          })),
        },
      },
      monthly: {
        arrayValue: {
          values: doc.monthly.map((entry) => ({
            mapValue: {
              fields: {
                month: { stringValue: entry.month },
                income: { doubleValue: entry.income },
                expense: { doubleValue: entry.expense },
              },
            },
          })),
        },
      },
    },
  };
}

function fromFirestoreAnalyticsDoc(document: any): AnalyticsOverview {
  const fields = document?.fields ?? {};
  const totals = fields.totals?.mapValue?.fields ?? {};

  return {
    uid: asString(fields.uid),
    updatedAt: asNumber(fields.updatedAt),
    totals: {
      income: asNumber(totals.income),
      expense: asNumber(totals.expense),
      net: asNumber(totals.net),
      transactions: asNumber(totals.transactions),
    },
    topCategories: asArray(fields.topCategories, (item) => {
      const map = item?.mapValue?.fields ?? {};
      return { category: asString(map.category), amountAbs: asNumber(map.amountAbs) };
    }),
    monthly: asArray(fields.monthly, (item) => {
      const map = item?.mapValue?.fields ?? {};
      return { month: asString(map.month), income: asNumber(map.income), expense: asNumber(map.expense) };
    }),
  };
}

export async function materializeAnalyticsOverview(user: AuthUser, rows: Tx[]) {
  const { projectId } = requireFirebaseConfig();
  const doc = toAnalyticsDoc(user, rows);
  await requestJson(firestoreDocUrl(projectId, analyticsOverviewPath(user.uid)), {
    method: 'PATCH',
    body: JSON.stringify(toFirestoreAnalyticsDoc(doc)),
  });
  return doc;
}

export async function getAnalyticsOverview(user: AuthUser) {
  const { projectId } = requireFirebaseConfig();
  const document = await requestJson<any>(firestoreDocUrl(projectId, analyticsOverviewPath(user.uid)), {}, true);
  if (!document) return null;
  return fromFirestoreAnalyticsDoc(document);
}
