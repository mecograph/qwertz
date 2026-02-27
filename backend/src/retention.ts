import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const retentionSweep = onSchedule('every day 03:00', async () => {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const now = Date.now();
  const targetOffsets = [30, 7, 1];

  const importsSnap = await db.collectionGroup('imports').get();

  for (const doc of importsSnap.docs) {
    const data = doc.data();
    const daysLeft = Math.ceil(((data.retentionExpiresAt as number) - now) / ONE_DAY_MS);
    const uid = data.uid as string;

    if (daysLeft <= 0) {
      // Delete expired import
      const storageBlobId = data.encryptedOriginal?.storageBlobId;
      if (storageBlobId) {
        try {
          await bucket.file(storageBlobId).delete();
        } catch {
          // Ignore if already deleted
        }
      }
      await doc.ref.delete();
      continue;
    }

    // Send reminder notifications
    const sentOffsets: number[] = (data.reminderOffsetsSent as number[]) ?? [];
    const reminder = targetOffsets.find((offset) => offset === daysLeft && !sentOffsets.includes(offset));
    if (reminder) {
      // Update import with new reminder offset
      await doc.ref.update({
        reminderOffsetsSent: [...sentOffsets, reminder],
        updatedAt: now,
      });

      // Create notification for user
      const notifRef = db.collection(`users/${uid}/notifications`).doc();
      await notifRef.set({
        title: 'Retention reminder',
        message: `${data.fileName}: ${daysLeft} days until deletion`,
        severity: 'warning',
        createdAt: now,
        readAt: null,
      });
    }
  }
});
