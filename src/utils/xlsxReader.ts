import * as XLSX from 'xlsx'
import { REQUIRED_COLUMNS } from '@/types/transactions'

export interface HeaderLocation {
  sheetName: string
  headerRowIndex: number
  headers: string[]
}

export const readWorkbook = async (file: File): Promise<XLSX.WorkBook> => {
  const arrayBuffer = await file.arrayBuffer()
  return XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
}

export const detectHeader = (workbook: XLSX.WorkBook): HeaderLocation | null => {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, blankrows: false })
    for (let i = 0; i < rows.length; i += 1) {
      const candidate = (rows[i] || []).map((v) => String(v ?? '').trim())
      const hasAll = REQUIRED_COLUMNS.every((col) => candidate.includes(col))
      if (hasAll) {
        return { sheetName, headerRowIndex: i, headers: candidate }
      }
    }
  }
  return null
}
