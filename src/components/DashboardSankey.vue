<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Dashboard Sankey</h2>
    <div class="mt-3 grid gap-3 md:grid-cols-5">
      <div class="rounded bg-slate-100 p-2" v-for="item in kpisList" :key="item.label">
        <p class="text-xs text-slate-500">{{ item.label }}</p>
        <p class="font-semibold">{{ item.value }}</p>
      </div>
    </div>
    <VChart class="mt-4 h-96" :option="option" autoresize aria-label="Sankey chart" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { buildSankey, computeKpis } from '../utils/aggregations';
import { useTransactionsStore } from '../stores/useTransactionsStore';

const tx = useTransactionsStore();

const kpis = computed(() => computeKpis(tx.rows));
const kpisList = computed(() => [
  { label: 'Income', value: kpis.value.income.toFixed(2) },
  { label: 'Expenses', value: kpis.value.expenses.toFixed(2) },
  { label: 'Net', value: kpis.value.net.toFixed(2) },
  { label: 'Transactions', value: kpis.value.txCount },
  { label: 'Top category', value: kpis.value.topCategory },
]);

const option = computed(() => {
  const sankey = buildSankey(tx.rows);
  return {
    tooltip: { trigger: 'item' },
    series: [{ type: 'sankey', data: sankey.nodes, links: sankey.links, emphasis: { focus: 'adjacency' } }],
  };
});
</script>
