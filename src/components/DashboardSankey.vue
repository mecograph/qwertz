<template>
  <section class="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Dashboard Sankey</h2>
        <p class="text-xs text-slate-500">Income categories flow into Budget, then Budget flows to spending categories. Click a spending category (or Budget → category link) to drill down.</p>
      </div>
      <button v-if="selectedCategory" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm" @click="selectedCategory = ''">
        Back to Budget view
      </button>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-5">
      <div class="rounded bg-slate-100 p-2" v-for="item in kpisList" :key="item.label">
        <p class="text-xs text-slate-500">{{ item.label }}</p>
        <p class="font-semibold">{{ item.value }}</p>
      </div>
    </div>

    <VChart class="mt-4 min-h-0 flex-1 w-full" :option="option" autoresize aria-label="Sankey chart" @click="onChartClick" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import { buildBudgetSankey, buildCategoryDrilldownSankey, computeKpis } from '../utils/aggregations';
import { useTransactionsStore } from '../stores/useTransactionsStore';

const tx = useTransactionsStore();
const selectedCategory = ref('');

const kpis = computed(() => computeKpis(tx.rows));
const kpisList = computed(() => [
  { label: 'Income', value: kpis.value.income.toFixed(2) },
  { label: 'Expenses', value: kpis.value.expenses.toFixed(2) },
  { label: 'Net', value: kpis.value.net.toFixed(2) },
  { label: 'Transactions', value: kpis.value.txCount },
  { label: selectedCategory.value ? 'Drilldown' : 'Top category', value: selectedCategory.value || kpis.value.topCategory },
]);

const option = computed(() => {
  const sankey = selectedCategory.value
    ? buildCategoryDrilldownSankey(tx.rows, selectedCategory.value)
    : buildBudgetSankey(tx.rows);

  return {
    tooltip: {
      trigger: 'item',
      valueFormatter: (value: number) => `${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)}`,
    },
    series: [
      {
        type: 'sankey',
        data: sankey.nodes,
        links: sankey.links,
        lineStyle: { color: 'source', curveness: 0.5 },
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        nodeGap: 12,
        draggable: false,
        label: { color: '#0f172a', fontWeight: 500 },
      },
    ],
  };
});

function onChartClick(params: { dataType?: string; name?: string; data?: { source?: string; target?: string } }) {
  if (selectedCategory.value) return;

  let candidate = '';

  if (params.dataType === 'node') {
    candidate = params.name ?? '';
  }

  if ((params.dataType === 'edge' || params.dataType === 'link') && params.data?.source === 'Budget') {
    candidate = params.data.target ?? '';
  }

  if (!candidate || candidate === 'Budget' || candidate === 'Other' || candidate.startsWith('Income ·')) return;
  selectedCategory.value = candidate;
}
</script>
