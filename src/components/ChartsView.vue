<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <div class="rounded-xl bg-white p-4 shadow"><v-chart class="h-72" :option="lineOption" autoresize /></div>
    <div class="rounded-xl bg-white p-4 shadow"><v-chart class="h-72" :option="donutOption" autoresize /></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useFilterStore } from '../stores/useFilterStore'

const filters = useFilterStore()

const lineOption = computed(() => {
  const map = new Map<string, { income: number; expenses: number }>()
  filters.filtered.forEach((tx) => {
    const key = `${tx.buchungsdatum.getFullYear()}-${tx.monat}`
    const item = map.get(key) ?? { income: 0, expenses: 0 }
    if (tx.typ === 'Einnahme') item.income += tx.betrag
    if (tx.typ === 'Ausgabe') item.expenses += Math.abs(tx.betrag)
    map.set(key, item)
  })
  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return {
    xAxis: { type: 'category', data: entries.map(([k]) => k) },
    yAxis: { type: 'value' },
    legend: { data: ['Income', 'Expenses', 'Net'] },
    series: [
      { type: 'line', name: 'Income', data: entries.map(([, v]) => v.income) },
      { type: 'line', name: 'Expenses', data: entries.map(([, v]) => v.expenses) },
      { type: 'line', name: 'Net', data: entries.map(([, v]) => v.income - v.expenses) },
    ],
  }
})

const donutOption = computed(() => {
  const categoryTotals = filters.filtered
    .filter((r) => r.typ === 'Ausgabe')
    .reduce<Record<string, number>>((acc, row) => {
      acc[row.kategorie] = (acc[row.kategorie] ?? 0) + row.betragAbs
      return acc
    }, {})
  return {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        data: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })),
      },
    ],
  }
})
</script>
