import { extractMonth, toIsoDate } from '@/utils/date'
import type { Tx, TxType, ValidationError } from '@/types/transactions'

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return value
  const normalized = String(value).replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const inferType = (kategorie: string, betrag: number): TxType => {
  if (kategorie === 'Umbuchung') return 'Neutral'
  return betrag > 0 ? 'Einnahme' : 'Ausgabe'
}

const uid = () => crypto.randomUUID()

export const normalizeRow = (
  raw: Record<string, unknown>,
  sourceSheet: string,
  sourceRowIndex: number
): { tx?: Tx; error?: ValidationError } => {
  const isoDate = toIsoDate(raw['Buchungsdatum'])
  const betrag = asNumber(raw['Betrag'])
  const kategorie = String(raw['Kategorie'] ?? '').trim()
  const bezeichnung = String(raw['Bezeichnung'] ?? '').trim()
  const verwendungszweck = String(raw['Verwendungszweck'] ?? '').trim()

  if (!isoDate) {
    return { error: { rowIndex: sourceRowIndex, sheet: sourceSheet, message: 'Ungültiges Buchungsdatum', raw } }
  }
  if (betrag === null) {
    return { error: { rowIndex: sourceRowIndex, sheet: sourceSheet, message: 'Betrag ist nicht numerisch', raw } }
  }
  if (!kategorie) {
    return { error: { rowIndex: sourceRowIndex, sheet: sourceSheet, message: 'Kategorie fehlt', raw } }
  }
  if (!bezeichnung) {
    return { error: { rowIndex: sourceRowIndex, sheet: sourceSheet, message: 'Bezeichnung fehlt', raw } }
  }

  const typ = inferType(kategorie, betrag)
  const tx: Tx = {
    id: uid(),
    buchungsdatum: isoDate,
    monat: extractMonth(isoDate),
    kategorie,
    bezeichnung,
    verwendungszweck,
    typ,
    betrag,
    betragAbs: Math.abs(betrag),
    sourceSheet,
    sourceRowIndex
  }

  return { tx }
}
