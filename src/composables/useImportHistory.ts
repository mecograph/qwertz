import { ref } from 'vue';
import { clearImportMeta, createImportMeta, downloadOriginalImport, extendImportRetentionOnce, listImportMeta, runRetentionCheck } from '../services/backendClient';
import { useAuthStore } from '../stores/useAuthStore';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ImportRecord {
  id: string;
  timestamp: number;
  fileName: string;
  rowCount: number;
  status: 'uploaded' | 'processed';
  source: 'csv-xlsx' | 'json';
  hasEncryptedOriginal: boolean;
  retentionExpiresAt: number;
  extensionUsed: boolean;
  daysUntilExpiry: number;
}

const history = ref<ImportRecord[]>([]);

export function useImportHistory() {
  const auth = useAuthStore();

  async function refresh() {
    if (!auth.user) {
      history.value = [];
      return;
    }

    const docs = await listImportMeta(auth.user);
    history.value = docs
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((doc) => ({
        id: doc.id,
        timestamp: doc.createdAt,
        fileName: doc.fileName,
        rowCount: doc.rowCount,
        status: doc.status,
        source: doc.source,
        hasEncryptedOriginal: Boolean(doc.encryptedOriginal),
        retentionExpiresAt: doc.retentionExpiresAt,
        extensionUsed: doc.extensionUsed,
        daysUntilExpiry: Math.ceil((doc.retentionExpiresAt - Date.now()) / ONE_DAY_MS),
      }));
  }

  async function add(fileName: string, rowCount: number, payload?: {
    fileSize?: number;
    source?: 'csv-xlsx' | 'json';
    status?: 'uploaded' | 'processed';
    mimeType?: string;
    encryptedOriginal?: {
      storageBlobId: string;
      wrappedDek: { cipherTextB64: string; ivB64: string };
    };
  }) {
    if (!auth.user) return;

    await createImportMeta(auth.user, {
      fileName,
      fileSize: payload?.fileSize ?? 0,
      rowCount,
      source: payload?.source ?? 'json',
      status: payload?.status ?? 'processed',
      mimeType: payload?.mimeType,
      encryptedOriginal: payload?.encryptedOriginal,
    });

    await refresh();
  }

  async function downloadOriginal(importId: string) {
    if (!auth.user) return;
    const result = await downloadOriginalImport(auth.user, importId);
    const blob = new Blob([result.bytes], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function extendRetention(importId: string) {
    if (!auth.user) return false;
    const updated = await extendImportRetentionOnce(auth.user, importId);
    await refresh();
    return updated;
  }

  async function runRetentionSweep() {
    if (!auth.user) return { reminders: [], expired: [] };
    const result = await runRetentionCheck(auth.user);
    await refresh();
    return result;
  }

  async function clear() {
    if (!auth.user) {
      history.value = [];
      return;
    }

    await clearImportMeta(auth.user);
    history.value = [];
  }

  return { history, add, clear, refresh, downloadOriginal, extendRetention, runRetentionSweep };
}
