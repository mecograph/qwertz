<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h3 class="mb-3 text-lg font-medium">Sankey Dashboard</h3>
    <v-chart class="h-[420px]" :option="option" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useFilterStore } from '../stores/useFilterStore'
import { useUiStore } from '../stores/useUiStore'
import { sankeyData } from '../utils/aggregations'

const filters = useFilterStore()
const ui = useUiStore()

const option = computed(() => {
  const data = sankeyData(filters.filtered, ui.settings.topCategories, ui.settings.topLabels)
  return {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'sankey',
        data: data.nodes,
        links: data.links,
        lineStyle: { color: 'gradient', curveness: 0.4 },
      },
    ],
  }
})
</script>
