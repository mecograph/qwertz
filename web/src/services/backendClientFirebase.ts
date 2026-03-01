import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, orderBy, query } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { getFirebaseFirestore, getFirebaseStorage } from './firebaseApp';
import type { AuthUser } from '../stores/useAuthStore';
import type { Tx, ImportEvent, ImportEventType } from '../types';
import { decryptWithKey, encryptWithKey, generateDataKey, unwrapDataKey, wrapDataKey, type EncryptedPayload } from '../utils/crypto';
import type { AnalyticsOverview, ImportMetaPayload, PersistedImport, RetentionCheckResult } from './backendClientMock';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB client-side limit

function importDocRef(uid: string, importId: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'imports', importId);
}

function importsCollectionRef(uid: string) {
  return collection(getFirebaseFirestore(), 'users', uid, 'imports');
}

function analyticsOverviewRef(uid: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'analytics', 'overview');
}

function toDocData(item: PersistedImport): Record<string, unknown> {
  return {
    uid: item.uid,
    fileName: item.fileName,
    fileSize: item.fileSize,
    rowCount: item.rowCount,
    source: item.source,
    status: item.status,
    mimeType: item.mimeType ?? '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    retentionExpiresAt: item.retentionExpiresAt,
    extensionUsed: item.extensionUsed,
    reminderOffsetsSent: item.reminderOffsetsSent,
    schemaVersion: item.schemaVersion,
    encryptedOriginal: item.encryptedOriginal ?? null,
    ...(item.revertedAt !== undefined ? { revertedAt: item.revertedAt } : {}),
    ...(item.mappingConfig ? { mappingConfig: item.mappingConfig } : {}),
  };
}

function fromDocData(id: string, data: Record<string, unknown>): PersistedImport {
  return {
    id,
    uid: (data.uid as string) ?? '',
    fileName: (data.fileName as string) ?? '',
    fileSize: (data.fileSize as number) ?? 0,
    rowCount: (data.rowCount as number) ?? 0,
    source: ((data.source as string) || 'json') as PersistedImport['source'],
    status: ((data.status as string) || 'uploaded') as PersistedImport['status'],
    mimeType: (data.mimeType as string) || undefined,
    createdAt: (data.createdAt as number) ?? 0,
    updatedAt: (data.updatedAt as number) ?? 0,
    retentionExpiresAt: (data.retentionExpiresAt as number) ?? 0,
    extensionUsed: Boolean(data.extensionUsed),
    reminderOffsetsSent: (data.reminderOffsetsSent as number[]) ?? [],
    schemaVersion: (data.schemaVersion as number) ?? 1,
    revertedAt: data.revertedAt as number | undefined,
    mappingConfig: data.mappingConfig as PersistedImport['mappingConfig'],
    encryptedOriginal: data.encryptedOriginal
      ? (data.encryptedOriginal as PersistedImport['encryptedOriginal'])
      : undefined,
  };
}

async function fetchImport(user: AuthUser, importId: string): Promise<PersistedImport | null> {
  const snap = await getDoc(importDocRef(user.uid, importId));
  if (!snap.exists()) return null;
  return fromDocData(snap.id, snap.data() as Record<string, unknown>);
}

async function saveImport(user: AuthUser, item: PersistedImport) {
  await setDoc(importDocRef(user.uid, item.id), toDocData(item));
}

async function deleteStorageObjectIfExists(path: string) {
  try {
    await deleteObject(storageRef(getFirebaseStorage(), path));
  } catch {
    // Ignore if not found
  }
}

export async function encryptAndStoreOriginal(user: AuthUser, file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB size limit.`);
  }

  const dataKey = await generateDataKey();
  const plain = new Uint8Array(await file.arrayBuffer());
  const payload = await encryptWithKey(dataKey, plain);
  const wrappedDek = await wrapDataKey(dataKey);

  const storageBlobId = `users/${user.uid}/imports/${crypto.randomUUID()}/original.enc.json`;
  const serialized = new TextEncoder().encode(JSON.stringify(payload));

  const blobRef = storageRef(getFirebaseStorage(), storageBlobId);
  await uploadBytes(blobRef, serialized, { contentType: 'application/json' });

  return {
    storageBlobId,
    wrappedDek,
    mimeType: file.type || 'application/octet-stream',
    encryptionMeta: { ivB64: payload.ivB64 },
  };
}

export async function downloadOriginalImport(user: AuthUser, importId: string) {
  const imp = await fetchImport(user, importId);
  if (!imp?.encryptedOriginal) throw new Error('Original file not available.');

  const blobRef = storageRef(getFirebaseStorage(), imp.encryptedOriginal.storageBlobId);
  const bytes = await getBytes(blobRef);
  const payload = JSON.parse(new TextDecoder().decode(bytes)) as EncryptedPayload;

  if (!payload?.cipherTextB64 || !payload?.ivB64) {
    throw new Error('Encrypted payload format is invalid.');
  }

  const dataKey = await unwrapDataKey(imp.encryptedOriginal.wrappedDek);
  const decrypted = await decryptWithKey(dataKey, payload);

  return {
    bytes: decrypted,
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
    schemaVersion: 1,
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

  for (const item of imports) {
    const daysLeft = Math.ceil((item.retentionExpiresAt - now) / ONE_DAY_MS);

    if (daysLeft <= 0) {
      expired.push({ importId: item.id, fileName: item.fileName });
      if (item.encryptedOriginal?.storageBlobId) {
        await deleteStorageObjectIfExists(item.encryptedOriginal.storageBlobId);
      }
      await deleteDoc(importDocRef(user.uid, item.id));
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
  const q = query(importsCollectionRef(user.uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDocData(d.id, d.data() as Record<string, unknown>));
}

export async function clearImportMeta(user: AuthUser) {
  const imports = await listImportMeta(user);

  for (const item of imports) {
    if (item.encryptedOriginal?.storageBlobId) {
      await deleteStorageObjectIfExists(item.encryptedOriginal.storageBlobId);
    }
    await deleteDoc(importDocRef(user.uid, item.id));
  }

  await deleteDoc(analyticsOverviewRef(user.uid));
}

function buildAnalyticsDoc(user: AuthUser, rows: Tx[]): AnalyticsOverview {
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

export async function materializeAnalyticsOverview(user: AuthUser, rows: Tx[]) {
  const analytics = buildAnalyticsDoc(user, rows);
  await setDoc(analyticsOverviewRef(user.uid), analytics);
  return analytics;
}

export async function getAnalyticsOverview(user: AuthUser) {
  const snap = await getDoc(analyticsOverviewRef(user.uid));
  if (!snap.exists()) return null;
  return snap.data() as AnalyticsOverview;
}

export async function updateImportWrappedDek(user: AuthUser, importId: string, wrappedDek: import('../utils/crypto').EncryptedPayload) {
  const imp = await fetchImport(user, importId);
  if (!imp?.encryptedOriginal) return;

  imp.encryptedOriginal.wrappedDek = wrappedDek;
  imp.updatedAt = Date.now();
  await saveImport(user, imp);
}

export async function revertImport(user: AuthUser, importId: string) {
  const imp = await fetchImport(user, importId);
  if (!imp) return;

  imp.status = 'reverted' as PersistedImport['status'];
  imp.revertedAt = Date.now();
  imp.updatedAt = Date.now();
  await saveImport(user, imp);
}

function eventCollectionRef(uid: string, importId: string) {
  return collection(getFirebaseFirestore(), 'users', uid, 'imports', importId, 'events');
}

export async function writeImportEvent(user: AuthUser, importId: string, event: { type: ImportEventType; detail?: string }) {
  const id = crypto.randomUUID();
  const docRef = doc(getFirebaseFirestore(), 'users', user.uid, 'imports', importId, 'events', id);
  await setDoc(docRef, {
    type: event.type,
    timestamp: Date.now(),
    ...(event.detail ? { detail: event.detail } : {}),
  });
}

export async function listImportEvents(user: AuthUser, importId: string): Promise<ImportEvent[]> {
  const q = query(eventCollectionRef(user.uid, importId), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      type: data.type as ImportEventType,
      timestamp: data.timestamp as number,
      detail: data.detail as string | undefined,
    };
  });
}

function avatarStoragePath(uid: string) {
  return `users/${uid}/profile/avatar.jpg`;
}

export async function uploadProfileAvatar(user: AuthUser, blob: Blob): Promise<string> {
  const path = avatarStoragePath(user.uid);
  const ref = storageRef(getFirebaseStorage(), path);
  await uploadBytes(ref, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(ref);
}

export async function deleteProfileAvatar(user: AuthUser): Promise<void> {
  try {
    await deleteObject(storageRef(getFirebaseStorage(), avatarStoragePath(user.uid)));
  } catch {
    // Ignore if not found
  }
}

export async function getProfileAvatarUrl(user: AuthUser): Promise<string | null> {
  try {
    return await getDownloadURL(storageRef(getFirebaseStorage(), avatarStoragePath(user.uid)));
  } catch {
    return null;
  }
}
