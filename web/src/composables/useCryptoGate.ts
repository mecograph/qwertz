import { ref, computed } from 'vue';
import {
  getCryptoSchemaVersion,
  deriveKeyFromPassphrase,
  getOrCreateSalt,
  verifyPassphrase,
  setSessionMasterKey,
  hasSessionMasterKey,
  migrateToPassphrase,
  createVerificationToken,
} from '../utils/crypto';
import { listImportMeta, updateImportWrappedDek } from '../services/backendClient';
import { useAuthStore } from '../stores/useAuthStore';

const unlocked = ref(false);
const needsSetup = ref(false);

export function useCryptoGate() {
  const auth = useAuthStore();

  function checkState() {
    const schema = getCryptoSchemaVersion();
    if (schema >= 2) {
      unlocked.value = hasSessionMasterKey();
      needsSetup.value = false;
    } else {
      // v1 (random key) — user needs to set up passphrase
      unlocked.value = true; // v1 is auto-unlocked (random key in localStorage)
      needsSetup.value = true;
    }
  }

  async function unlock(passphrase: string): Promise<boolean> {
    const salt = getOrCreateSalt();
    const key = await deriveKeyFromPassphrase(passphrase, salt);
    const valid = await verifyPassphrase(key);
    if (!valid) return false;

    setSessionMasterKey(key);
    unlocked.value = true;
    return true;
  }

  async function setupPassphrase(passphrase: string) {
    if (!auth.user) throw new Error('Not authenticated');

    // Get all wrapped DEKs from existing imports
    const imports = await listImportMeta(auth.user);
    const wrappedDeks = imports
      .filter((imp) => imp.encryptedOriginal?.wrappedDek)
      .map((imp) => ({
        importId: imp.id,
        wrappedDek: imp.encryptedOriginal!.wrappedDek,
      }));

    // Migrate all DEKs to new PBKDF2 key
    const reWrapped = await migrateToPassphrase(passphrase, wrappedDeks);

    // Update each import's wrappedDek in the backend
    for (const { importId, wrappedDek } of reWrapped) {
      await updateImportWrappedDek(auth.user, importId, wrappedDek);
    }

    unlocked.value = true;
    needsSetup.value = false;
  }

  // Check state on first use
  checkState();

  return {
    unlocked: computed(() => unlocked.value),
    needsSetup: computed(() => needsSetup.value),
    checkState,
    unlock,
    setupPassphrase,
  };
}
