import type { WorkBook } from 'xlsx';
import * as XLSX from 'xlsx';

export const REQUIRED_HEADERS = [
  'Buchungsdatum',
  'Monat',
  'Kategorie',
  'Bezeichnung',
  'Verwendungszweck',
  'Typ',
  'Betrag ABS',
  'Betrag',
] as const;

export type HeaderDetectionResult = {
  sheetName: string;
  headerRowIndex: number;
};

export function detectHeaderRow(workbook: WorkBook): HeaderDetectionResult | null {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

    for (let i = 0; i < rows.length; i += 1) {
      const normalized = rows[i].map((cell) => String(cell ?? '').trim());
      if (REQUIRED_HEADERS.every((header) => normalized.includes(header))) {
        return { sheetName, headerRowIndex: i };
      }
    }
  }
  return null;
}
