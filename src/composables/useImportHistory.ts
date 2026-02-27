import { ref } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { clearImportMeta, createImportMeta, downloadOriginalImport, listImportMeta } from '../services/backendClient';

export interface ImportRecord {
  id: string;
  timestamp: number;
  fileName: string;
  rowCount: number;
  status: 'uploaded' | 'processed';
  source: 'csv-xlsx' | 'json';
  hasEncryptedOriginal: boolean;
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

  async function clear() {
    if (!auth.user) {
      history.value = [];
      return;
    }

    await clearImportMeta(auth.user);
    history.value = [];
  }

  return { history, add, clear, refresh, downloadOriginal };
}
