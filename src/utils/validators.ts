import { v4 as uuidv4 } from 'uuid'
import type { ImportResult, Tx, TxType, ValidationError } from '../types/tx'

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

const parseNumber = (value: unknown): number | null => {
  const normalized = String(value).replace(',', '.').trim()
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

export function deriveTyp(kategorie: string, betrag: number): TxType {
  if (kategorie === 'Umbuchung') return 'Neutral'
  return betrag > 0 ? 'Einnahme' : 'Ausgabe'
}

export function normalizeRows(rows: Record<string, unknown>[], sheet: string): ImportResult {
  const validRows: Tx[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, idx) => {
    const rowErrors: string[] = []
    const date = parseDate(row.Buchungsdatum)
    const betrag = parseNumber(row.Betrag)
    const kategorie = String(row.Kategorie ?? '').trim()
    const bezeichnung = String(row.Bezeichnung ?? '').trim()

    if (!date) rowErrors.push('Invalid Buchungsdatum')
    if (betrag === null) rowErrors.push('Invalid Betrag')
    if (!kategorie) rowErrors.push('Kategorie required')
    if (!bezeichnung) rowErrors.push('Bezeichnung required')

    if (rowErrors.length > 0) {
      errors.push({
        rowIndex: idx + 2,
        sheet,
        messages: rowErrors,
        raw: row,
      })
      return
    }

    const typ = deriveTyp(kategorie, betrag!)
    validRows.push({
      id: uuidv4(),
      buchungsdatum: date!,
      monat: String(date!.getMonth() + 1).padStart(2, '0'),
      kategorie,
      bezeichnung,
      verwendungszweck: String(row.Verwendungszweck ?? ''),
      typ,
      betrag: betrag!,
      betragAbs: Math.abs(betrag!),
      sourceSheet: sheet,
      sourceRowIndex: idx + 2,
    })
  })

  return { validRows, errors }
}
