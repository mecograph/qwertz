export type TxType = 'Einnahme' | 'Ausgabe' | 'Neutral'

export interface Tx {
  id: string
  buchungsdatum: string
  monat: string
  kategorie: string
  bezeichnung: string
  verwendungszweck: string
  typ: TxType
  betrag: number
  betragAbs: number
  sourceSheet: string
  sourceRowIndex: number
}

export interface ValidationError {
  rowIndex: number
  sheet: string
  message: string
  raw: Record<string, unknown>
}

export const REQUIRED_COLUMNS = [
  'Buchungsdatum',
  'Monat',
  'Kategorie',
  'Bezeichnung',
  'Verwendungszweck',
  'Typ',
  'Betrag ABS',
  'Betrag'
]
