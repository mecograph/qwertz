import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getIsoWeek } from '@/utils/date'
import type { Tx, TxType } from '@/types/transactions'

type Granularity = 'year' | 'month' | 'week' | 'day' | 'custom'

export const useFilterStore = defineStore('filters', () => {
  const granularity = ref<Granularity>('year')
  const selectedYear = ref<number | null>(null)
  const selectedMonth = ref<string>('')
  const selectedWeek = ref<string>('')
  const selectedTypes = ref<TxType[]>(['Einnahme', 'Ausgabe', 'Neutral'])
  const category = ref<string[]>([])
  const labels = ref<string[]>([])
  const search = ref('')

  const apply = (rows: Tx[]) =>
    rows.filter((tx) => {
      const date = new Date(`${tx.buchungsdatum}T00:00:00Z`)
      if (selectedYear.value && date.getUTCFullYear() !== selectedYear.value) return false
      if (selectedMonth.value && tx.monat !== selectedMonth.value) return false
      if (selectedWeek.value && getIsoWeek(tx.buchungsdatum) !== selectedWeek.value) return false
      if (!selectedTypes.value.includes(tx.typ)) return false
      if (category.value.length && !category.value.includes(tx.kategorie)) return false
      if (labels.value.length && !labels.value.includes(tx.bezeichnung)) return false
      if (search.value && !tx.verwendungszweck.toLowerCase().includes(search.value.toLowerCase())) return false
      return true
    })

  const reset = () => {
    granularity.value = 'year'
    selectedMonth.value = ''
    selectedWeek.value = ''
    selectedTypes.value = ['Einnahme', 'Ausgabe', 'Neutral']
    category.value = []
    labels.value = []
    search.value = ''
  }

  const yearsFromData = (rows: Tx[]) =>
    computed(() => [...new Set(rows.map((r) => new Date(`${r.buchungsdatum}T00:00:00Z`).getUTCFullYear()))].sort((a, b) => b - a))

  return { granularity, selectedYear, selectedMonth, selectedWeek, selectedTypes, category, labels, search, apply, reset, yearsFromData }
})
