<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { Tx } from '@/types/transactions'

const props = defineProps<{ rows: Tx[] }>()
const lineRef = ref<HTMLDivElement | null>(null)
let lineChart: echarts.ECharts | null = null

const render = () => {
  if (!lineRef.value) return
  lineChart ??= echarts.init(lineRef.value)
  const byMonth = new Map<string, { income: number; expenses: number }>()
  props.rows.forEach((r) => {
    const key = `${new Date(r.buchungsdatum).getUTCFullYear()}-${r.monat}`
    const slot = byMonth.get(key) ?? { income: 0, expenses: 0 }
    if (r.typ === 'Einnahme') slot.income += r.betrag
    if (r.typ === 'Ausgabe') slot.expenses += r.betragAbs
    byMonth.set(key, slot)
  })
  const labels = [...byMonth.keys()].sort()
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Income', 'Expenses', 'Net'] },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [
      { name: 'Income', type: 'line', data: labels.map((l) => byMonth.get(l)?.income ?? 0) },
      { name: 'Expenses', type: 'line', data: labels.map((l) => byMonth.get(l)?.expenses ?? 0) },
      {
        name: 'Net',
        type: 'line',
        data: labels.map((l) => (byMonth.get(l)?.income ?? 0) - (byMonth.get(l)?.expenses ?? 0))
      }
    ]
  })
}

onMounted(render)
watch(() => props.rows, render, { deep: true })
</script>

<template>
  <section class="rounded bg-white p-3 shadow">
    <h3 class="mb-2 font-semibold">Income vs Expenses vs Net</h3>
    <div ref="lineRef" class="h-[420px]"></div>
  </section>
</template>
