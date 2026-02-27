import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const MAX_IMPORTS_PER_DAY = 20;
const MAX_BYTES_PER_DAY = 120 * 1024 * 1024; // 120 MB

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export const checkUploadQuota = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid = request.auth.uid;
  const fileSize = request.data?.fileSize as number | undefined;
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw new HttpsError('invalid-argument', 'fileSize must be a positive number.');
  }

  const db = getFirestore();
  const day = todayKey();
  const quotaRef = db.doc(`users/${uid}/quotas/${day}`);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(quotaRef);
    const current = snap.exists ? snap.data()! : { count: 0, bytes: 0 };
    const count = (current.count as number) ?? 0;
    const bytes = (current.bytes as number) ?? 0;

    if (count >= MAX_IMPORTS_PER_DAY) {
      return { allowed: false, reason: 'daily_count_limit' as const };
    }
    if (bytes + fileSize > MAX_BYTES_PER_DAY) {
      return { allowed: false, reason: 'daily_bytes_limit' as const };
    }

    if (snap.exists) {
      tx.update(quotaRef, {
        count: FieldValue.increment(1),
        bytes: FieldValue.increment(fileSize),
      });
    } else {
      tx.set(quotaRef, { count: 1, bytes: fileSize });
    }

    return { allowed: true };
  });

  if (!result.allowed) {
    throw new HttpsError('resource-exhausted', `Upload quota exceeded: ${result.reason}`);
  }

  return { allowed: true };
});
