import { ref } from 'vue';
import {
  clearImportMeta,
  createImportMeta,
  downloadOriginalImport,
  extendImportRetentionOnce,
  listImportMeta,
  runRetentionCheck,
  revertImport as revertImportMeta,
  writeImportEvent,
} from '../services/backendClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import type { MappingConfig } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ImportRecord {
  id: string;
  timestamp: number;
  fileName: string;
  rowCount: number;
  status: 'uploaded' | 'processed' | 'reverted';
  source: 'csv-xlsx' | 'json';
  hasEncryptedOriginal: boolean;
  retentionExpiresAt: number;
  extensionUsed: boolean;
  daysUntilExpiry: number;
  revertedAt?: number;
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
        status: doc.status as ImportRecord['status'],
        source: doc.source,
        hasEncryptedOriginal: Boolean(doc.encryptedOriginal),
        retentionExpiresAt: doc.retentionExpiresAt,
        extensionUsed: doc.extensionUsed,
        daysUntilExpiry: Math.ceil((doc.retentionExpiresAt - Date.now()) / ONE_DAY_MS),
        revertedAt: doc.revertedAt,
      }));
  }

  async function add(fileName: string, rowCount: number, payload?: {
    fileSize?: number;
    source?: 'csv-xlsx' | 'json';
    status?: 'uploaded' | 'processed';
    mimeType?: string;
    mappingConfig?: MappingConfig;
    encryptedOriginal?: {
      storageBlobId: string;
      wrappedDek: { cipherTextB64: string; ivB64: string };
    };
  }): Promise<string | undefined> {
    if (!auth.user) return undefined;

    const created = await createImportMeta(auth.user, {
      fileName,
      fileSize: payload?.fileSize ?? 0,
      rowCount,
      source: payload?.source ?? 'json',
      status: payload?.status ?? 'processed',
      mimeType: payload?.mimeType,
      encryptedOriginal: payload?.encryptedOriginal,
      mappingConfig: payload?.mappingConfig,
    });

    await refresh();
    return created.id;
  }

  async function downloadOriginal(importId: string) {
    if (!auth.user) return;
    const result = await downloadOriginalImport(auth.user, importId);
    await writeImportEvent(auth.user, importId, { type: 'download' });
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

  async function revert(importId: string) {
    if (!auth.user) return;
    const txStore = useTransactionsStore();
    txStore.revertImport(importId);
    await revertImportMeta(auth.user, importId);
    await writeImportEvent(auth.user, importId, { type: 'revert' });
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

  return { history, add, clear, refresh, downloadOriginal, extendRetention, runRetentionSweep, revert };
}
