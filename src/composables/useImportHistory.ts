import { ref } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { clearImportMeta, createImportMeta, listImportMeta } from '../services/backendClient';

export interface ImportRecord {
  id: string;
  timestamp: number;
  fileName: string;
  rowCount: number;
  status: 'uploaded' | 'processed';
  source: 'csv-xlsx' | 'json';
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
      }));
  }

  async function add(fileName: string, rowCount: number, payload?: {
    fileSize?: number;
    source?: 'csv-xlsx' | 'json';
    status?: 'uploaded' | 'processed';
  }) {
    if (!auth.user) return;

    await createImportMeta(auth.user, {
      fileName,
      fileSize: payload?.fileSize ?? 0,
      rowCount,
      source: payload?.source ?? 'json',
      status: payload?.status ?? 'processed',
    });

    await refresh();
  }

  async function clear() {
    if (!auth.user) {
      history.value = [];
      return;
    }

    await clearImportMeta(auth.user);
    history.value = [];
  }

  return { history, add, clear, refresh };
}
