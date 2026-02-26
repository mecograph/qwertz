import * as XLSX from 'xlsx'

export const REQUIRED_COLUMNS = [
  'Buchungsdatum',
  'Monat',
  'Kategorie',
  'Bezeichnung',
  'Verwendungszweck',
  'Typ',
  'Betrag ABS',
  'Betrag',
] as const

export interface ParsedSheet {
  name: string
  rows: Record<string, unknown>[]
}

export interface WorkbookRows {
  sheets: ParsedSheet[]
}

export function readWorkbook(file: File): Promise<WorkbookRows> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('File could not be read'))
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true })
        const sheets = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name]
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
          return { name, rows }
        })
        resolve({ sheets })
      } catch (error) {
        reject(new Error(`Invalid XLSX file: ${(error as Error).message}`))
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export function detectDataset(sheets: ParsedSheet[]): ParsedSheet | null {
  return (
    sheets.find((sheet) => {
      const first = sheet.rows[0]
      if (!first) return false
      const keys = new Set(Object.keys(first))
      return REQUIRED_COLUMNS.every((header) => keys.has(header))
    }) ?? null
  )
}
