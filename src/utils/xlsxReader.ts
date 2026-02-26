import * as XLSX from 'xlsx';
import { detectHeaderRow, REQUIRED_HEADERS } from './headerDetector';
import { normalizeTxRow } from './validator';
import type { Tx, ValidationError } from '@/types/tx';

export async function readWorkbook(file: File): Promise<{ validRows: Tx[]; errors: ValidationError[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const detection = detectHeaderRow(workbook);

  if (!detection) {
    throw new Error(`Could not locate table with required headers: ${REQUIRED_HEADERS.join(', ')}`);
  }

  const sheet = workbook.Sheets[detection.sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: detection.headerRowIndex,
    defval: '',
    raw: false,
  });

  const validRows: Tx[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((raw, idx) => {
    const { tx, error } = normalizeTxRow(raw, detection.sheetName, detection.headerRowIndex + idx + 1);
    if (tx) validRows.push(tx);
    if (error) errors.push(error);
  });

  return { validRows, errors };
}
