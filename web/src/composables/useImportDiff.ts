import { downloadOriginalImport, listImportMeta } from '../services/backendClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { normalizeRows } from '../utils/validator';
import { parseCsv } from '../utils/csvParser';
import { readXlsx } from '../utils/xlsxReader';
import { computeDiff } from '../utils/diffEngine';
import type { MappingConfig } from '../types';

export type { DiffResult } from '../utils/diffEngine';

export function useImportDiff() {
  const auth = useAuthStore();

  async function computeDiffForImport(importId: string) {
    if (!auth.user) throw new Error('Not authenticated');

    // 1. Download and decrypt original file
    const original = await downloadOriginalImport(auth.user, importId);

    // 2. Get stored mapping config from import metadata
    const imports = await listImportMeta(auth.user);
    const importMeta = imports.find((i) => i.id === importId);
    const mappingConfig: MappingConfig = importMeta?.mappingConfig ?? {};

    // 3. Parse original file based on type
    const blob = new Blob([original.bytes], { type: original.mimeType });
    const file = new File([blob], original.fileName, { type: original.mimeType });

    let rawRows: Record<string, string>[];
    if (original.fileName.toLowerCase().endsWith('.csv')) {
      rawRows = await parseCsv(file);
    } else {
      const sheets = await readXlsx(file);
      rawRows = sheets.find((s) => s.rows.length > 0)?.rows ?? [];
    }

    // 4. Normalize using stored mapping (or auto-detect if no mapping stored)
    let effectiveMapping = mappingConfig;
    if (!effectiveMapping.date && !effectiveMapping.amount) {
      // Fallback: try to auto-detect headers
      const headers = Object.keys(rawRows[0] ?? {});
      effectiveMapping = autoDetectMapping(headers);
    }
    const { valid: originalTxRows } = normalizeRows(rawRows, effectiveMapping);

    // 5. Filter current rows to those from this import
    const txStore = useTransactionsStore();
    const currentTxRows = txStore.rows.filter((r) => r.importId === importId);

    // 6. Compute diff
    return computeDiff(originalTxRows, currentTxRows);
  }

  return { computeDiffForImport };
}

function autoDetectMapping(headers: string[]): MappingConfig {
  const mapping: MappingConfig = {};
  const lower = headers.map((h) => h.toLowerCase());

  const datePatterns = ['date', 'datum', 'buchungsdatum', 'buchungstag'];
  const categoryPatterns = ['category', 'kategorie', 'type', 'typ'];
  const labelPatterns = ['label', 'bezeichnung', 'description', 'beschreibung'];
  const amountPatterns = ['amount', 'betrag', 'sum', 'summe'];
  const purposePatterns = ['purpose', 'verwendungszweck', 'reference', 'referenz'];

  for (let i = 0; i < headers.length; i++) {
    const l = lower[i];
    if (!mapping.date && datePatterns.some((p) => l.includes(p))) mapping.date = headers[i];
    if (!mapping.category && categoryPatterns.some((p) => l.includes(p))) mapping.category = headers[i];
    if (!mapping.label && labelPatterns.some((p) => l.includes(p))) mapping.label = headers[i];
    if (!mapping.amount && amountPatterns.some((p) => l.includes(p))) mapping.amount = headers[i];
    if (!mapping.purpose && purposePatterns.some((p) => l.includes(p))) mapping.purpose = headers[i];
  }

  return mapping;
}
