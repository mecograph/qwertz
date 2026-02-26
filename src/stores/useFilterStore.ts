import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { TxType } from '../types/tx'
import { useTransactionsStore } from './useTransactionsStore'

export const useFilterStore = defineStore('filters', () => {
  const txStore = useTransactionsStore()
  const year = ref<number | null>(null)
  const month = ref<string>('')
  const typ = ref<TxType | 'All'>('All')
  const categories = ref<string[]>([])
  const labels = ref<string[]>([])
  const query = ref('')

  const years = computed(() =>
    Array.from(new Set(txStore.rows.map((r) => r.buchungsdatum.getFullYear()))).sort((a, b) => b - a),
  )

  const filtered = computed(() => {
    const selectedYear = year.value ?? years.value[0]
    return txStore.rows.filter((r) => {
      if (selectedYear && r.buchungsdatum.getFullYear() !== selectedYear) return false
      if (month.value && r.monat !== month.value) return false
      if (typ.value !== 'All' && r.typ !== typ.value) return false
      if (categories.value.length > 0 && !categories.value.includes(r.kategorie)) return false
      if (labels.value.length > 0 && !labels.value.includes(r.bezeichnung)) return false
      if (query.value && !r.verwendungszweck.toLowerCase().includes(query.value.toLowerCase())) return false
      return true
    })
  })

  function reset() {
    month.value = ''
    typ.value = 'All'
    categories.value = []
    labels.value = []
    query.value = ''
  }

  return { year, month, typ, categories, labels, query, years, filtered, reset }
})
