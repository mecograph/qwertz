import { v4 as uuid } from 'uuid';
import type { Tx, TxType, ValidationError } from '@/types/tx';

type RawRow = Record<string, unknown>;

export function normalizeTxRow(raw: RawRow, sheet: string, rowIndex: number): { tx?: Tx; error?: ValidationError } {
  const reasons: string[] = [];
  const date = new Date(String(raw.Buchungsdatum ?? ''));
  const amount = Number(raw.Betrag ?? NaN);
  const kategorie = String(raw.Kategorie ?? '').trim();
  const bezeichnung = String(raw.Bezeichnung ?? '').trim();

  if (Number.isNaN(date.getTime())) reasons.push('Buchungsdatum invalid');
  if (Number.isNaN(amount)) reasons.push('Betrag not numeric');
  if (!kategorie) reasons.push('Kategorie required');
  if (!bezeichnung) reasons.push('Bezeichnung required');

  if (reasons.length > 0) {
    return { error: { rowIndex, sheet, reasons, row: raw } };
  }

  const monat = String(date.getMonth() + 1).padStart(2, '0');
  const typ: TxType = kategorie === 'Umbuchung' ? 'Neutral' : amount > 0 ? 'Einnahme' : 'Ausgabe';
  const betragAbs = Math.abs(amount);

  return {
    tx: {
      id: uuid(),
      buchungsdatum: date,
      monat,
      kategorie,
      bezeichnung,
      verwendungszweck: String(raw.Verwendungszweck ?? ''),
      typ,
      betrag: amount,
      betragAbs,
      sourceSheet: sheet,
      sourceRowIndex: rowIndex,
    },
  };
}
