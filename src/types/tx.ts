export type TxType = 'Einnahme' | 'Ausgabe' | 'Neutral'

export interface Tx {
  id: string
  buchungsdatum: Date
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
  messages: string[]
  raw: Record<string, unknown>
}

export interface ImportResult {
  validRows: Tx[]
  errors: ValidationError[]
}
