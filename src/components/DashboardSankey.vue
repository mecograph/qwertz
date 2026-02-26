<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { SankeyChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { useFilterStore } from '@/stores/useFilterStore';
import { buildSankeyData } from '@/utils/aggregations';

use([CanvasRenderer, SankeyChart, TooltipComponent]);

const filters = useFilterStore();
const option = computed(() => {
  const sankey = buildSankeyData(filters.filteredRows);
  return {
    tooltip: { trigger: 'item' },
    series: [{ type: 'sankey', data: sankey.nodes, links: sankey.links, emphasis: { focus: 'adjacency' } }],
  };
});
</script>

<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h2 class="mb-3 text-lg font-semibold">Dashboard Sankey</h2>
    <VChart class="h-[420px]" :option="option" autoresize />
  </div>
</template>
