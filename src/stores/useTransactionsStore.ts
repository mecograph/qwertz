import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ImportResult, Tx } from '../types/tx'
import { buildKpis } from '../utils/aggregations'
import { detectDataset, readWorkbook } from '../utils/xlsxReader'
import { normalizeRows } from '../utils/validators'
import { clearStorage, loadTransactions, saveTransactions } from '../utils/storage'

export const useTransactionsStore = defineStore('transactions', () => {
  const rows = ref<Tx[]>(loadTransactions())
  const processing = ref(false)
  const importErrors = ref<ImportResult['errors']>([])

  const kpis = computed(() => buildKpis(rows.value))

  async function importFile(file: File, loadValidOnly = true) {
    processing.value = true
    try {
      const workbook = await readWorkbook(file)
      const dataset = detectDataset(workbook.sheets)
      if (!dataset) throw new Error('No sheet with required headers found')

      const normalized = normalizeRows(dataset.rows, dataset.name)
      importErrors.value = normalized.errors
      rows.value = loadValidOnly ? normalized.validRows : normalized.validRows
      saveTransactions(rows.value)
    } finally {
      processing.value = false
    }
  }

  function setRows(next: Tx[]) {
    rows.value = next
    saveTransactions(rows.value)
  }

  function resetAll() {
    rows.value = []
    importErrors.value = []
    clearStorage()
  }

  return { rows, processing, importErrors, kpis, importFile, setRows, resetAll }
})
