import { defineStore } from 'pinia'
import * as XLSX from 'xlsx'
import type { Tx, ValidationError } from '@/types/transactions'
import { detectHeader, readWorkbook } from '@/utils/xlsxReader'
import { normalizeRow } from '@/utils/rowValidator'
import { clearLocal, loadFromLocal, saveToLocal } from '@/utils/storage'

interface ProcessResult {
  valid: Tx[]
  invalid: ValidationError[]
}

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as Tx[],
    invalidRows: [] as ValidationError[],
    isProcessing: false,
    processingStep: '',
    processingError: '',
    lastUpdatedAt: ''
  }),
  getters: {
    hasData: (state) => state.transactions.length > 0
  },
  actions: {
    clearProcessingError() {
      this.processingError = ''
    },
    hydrateFromLocal() {
      const saved = loadFromLocal()
      if (!saved) return
      this.transactions = saved.transactions
      this.lastUpdatedAt = saved.updatedAt
    },
    purgeLocal() {
      clearLocal()
      this.transactions = []
      this.invalidRows = []
      this.lastUpdatedAt = ''
      this.processingError = ''
    },
    async processWorkbook(file: File, loadValidOnly = true) {
      this.isProcessing = true
      this.processingError = ''
      this.processingStep = 'Reading workbook'

      try {
        const workbook = await readWorkbook(file)
        const result = this.processWorkbookInternal(workbook)

        this.invalidRows = result.invalid
        this.transactions = loadValidOnly ? result.valid : [...result.valid]
        saveToLocal(this.transactions)
        this.lastUpdatedAt = new Date().toISOString()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Lesen der Datei.'
        this.processingError = `Upload fehlgeschlagen: ${message}`
      } finally {
        this.isProcessing = false
        this.processingStep = ''
      }
    },
    processWorkbookInternal(workbook: XLSX.WorkBook): ProcessResult {
      this.processingStep = 'Locate dataset by headers'
      const header = detectHeader(workbook)
      if (!header) throw new Error('Keine gültige Header-Zeile mit allen erforderlichen Spalten gefunden.')

      this.processingStep = 'Extract and validate rows'
      const sheet = workbook.Sheets[header.sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        range: header.headerRowIndex,
        defval: ''
      })

      const valid: Tx[] = []
      const invalid: ValidationError[] = []
      rows.forEach((row, i) => {
        const parsed = normalizeRow(row, header.sheetName, i + header.headerRowIndex + 2)
        if (parsed.tx) valid.push(parsed.tx)
        if (parsed.error) invalid.push(parsed.error)
      })

      return { valid, invalid }
    },
    updateTransaction(next: Tx) {
      const idx = this.transactions.findIndex((t) => t.id === next.id)
      if (idx === -1) return
      this.transactions[idx] = next
      saveToLocal(this.transactions)
    },
    setTransactions(next: Tx[]) {
      this.transactions = next
      saveToLocal(this.transactions)
    }
  }
})
