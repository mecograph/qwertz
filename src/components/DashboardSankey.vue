<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { buildSankeyLinks, topCategory } from '@/utils/aggregations'
import type { Tx } from '@/types/transactions'

const props = defineProps<{ rows: Tx[] }>()
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const metrics = computed(() => {
  const income = props.rows.filter((r) => r.typ === 'Einnahme').reduce((s, r) => s + r.betrag, 0)
  const expenses = props.rows.filter((r) => r.typ === 'Ausgabe').reduce((s, r) => s + r.betragAbs, 0)
  return { income, expenses, net: income - expenses, count: props.rows.length, topCategory: topCategory(props.rows) }
})

const render = () => {
  if (!chartRef.value) return
  chart ??= echarts.init(chartRef.value)
  const links = buildSankeyLinks(props.rows)
  const nodeNames = [...new Set(links.flatMap((l) => [l.source, l.target]))]

  chart.setOption({
    tooltip: { formatter: (p: any) => `${p.data.source} → ${p.data.target}<br/>€ ${Number(p.data.value).toLocaleString('de-DE')}` },
    series: [
      {
        type: 'sankey',
        data: nodeNames.map((n) => ({ name: n })),
        links,
        lineStyle: { color: 'gradient', curveness: 0.5 },
        emphasis: { focus: 'adjacency' }
      }
    ]
  })
}

onMounted(render)
watch(() => props.rows, render, { deep: true })
</script>

<template>
  <section class="space-y-4">
    <div class="grid gap-3 md:grid-cols-5">
      <article class="rounded bg-white p-3 shadow" v-for="(val, key) in metrics" :key="key">
        <p class="text-xs uppercase text-slate-500">{{ key }}</p>
        <p class="text-lg font-semibold" v-if="typeof val === 'number'">{{ val.toLocaleString('de-DE') }}</p>
        <p class="text-lg font-semibold" v-else>{{ val }}</p>
      </article>
    </div>
    <div ref="chartRef" class="h-[540px] rounded bg-white shadow"></div>
  </section>
</template>
