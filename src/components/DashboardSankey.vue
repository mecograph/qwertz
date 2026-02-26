<template>
  <section class="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Dashboard Sankey</h2>
        <p class="text-xs text-slate-500">Income categories flow into Budget, then Budget flows to spending categories. Click categories (or links) to drill down.</p>
      </div>
      <button v-if="selectedCategory" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm" @click="clearDrilldown">
        Back to Budget view
      </button>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-5">
      <div class="rounded bg-slate-100 p-2" v-for="item in kpisList" :key="item.label">
        <p class="text-xs text-slate-500">{{ item.label }}</p>
        <p class="font-semibold" :class="item.tone">{{ item.value }}</p>
      </div>
    </div>

    <VChart class="mt-4 min-h-0 flex-1 w-full" :option="option" autoresize aria-label="Sankey chart" @click="onChartClick" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import { buildBudgetSankey, buildCategoryDrilldownSankey, buildIncomeDrilldownSankey, computeKpis } from '../utils/aggregations';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useFilterStore } from '../stores/useFilterStore';

const tx = useTransactionsStore();
const filters = useFilterStore();
const selectedCategory = ref('');
const drillType = ref<'' | 'income' | 'expense'>('');

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

const filteredRows = computed(() => {
  return tx.rows.filter((row) => {
    if (!filters.includeNeutral && row.type === 'Neutral') return false;
    if (filters.type && row.type !== filters.type) return false;
    if (filters.selectedYear && row.date.slice(0, 4) !== filters.selectedYear) return false;
    if (filters.selectedMonth && row.date.slice(0, 7) !== filters.selectedMonth) return false;
    if (filters.categories.length && !filters.categories.includes(row.category)) return false;
    if (filters.labels.length && !filters.labels.includes(row.label)) return false;
    if (filters.startDate && row.date.slice(0, 10) < filters.startDate) return false;
    if (filters.endDate && row.date.slice(0, 10) > filters.endDate) return false;
    return true;
  });
});

const kpis = computed(() => computeKpis(filteredRows.value));
const kpisList = computed(() => [
  { label: 'Income', value: formatter.format(kpis.value.income), tone: 'text-emerald-700' },
  { label: 'Expenses', value: formatter.format(kpis.value.expenses), tone: 'text-rose-700' },
  { label: 'Net', value: formatter.format(kpis.value.net), tone: kpis.value.net >= 0 ? 'text-emerald-700' : 'text-rose-700' },
  { label: 'Transactions', value: String(kpis.value.txCount), tone: 'text-slate-900' },
  {
    label: selectedCategory.value ? `Drilldown (${drillType.value || 'category'})` : 'Top category',
    value: selectedCategory.value || kpis.value.topCategory,
    tone: 'text-slate-900',
  },
]);

const option = computed(() => {
  const sankey = !selectedCategory.value
    ? buildBudgetSankey(filteredRows.value)
    : drillType.value === 'income'
      ? buildIncomeDrilldownSankey(filteredRows.value, selectedCategory.value)
      : buildCategoryDrilldownSankey(filteredRows.value, selectedCategory.value);

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  sankey.links.forEach((link) => {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value);
  });

  return {
    tooltip: {
      trigger: 'item',
      valueFormatter: (value: number) => formatter.format(value),
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
        label: {
          color: '#0f172a',
          fontWeight: 500,
          formatter: (params: { name: string }) => {
            const value = Math.max(incoming.get(params.name) ?? 0, outgoing.get(params.name) ?? 0);
            return `${params.name}: ${formatter.format(value)}`;
          },
        },
      },
    ],
  };
});

function clearDrilldown() {
  selectedCategory.value = '';
  drillType.value = '';
}

function onChartClick(params: { dataType?: string; name?: string; data?: { source?: string; target?: string } }) {
  if (selectedCategory.value) return;

  const name = params.name ?? '';

  if (params.dataType === 'node') {
    if (name.startsWith('Income · ')) {
      selectedCategory.value = name.replace(/^Income ·\s*/, '');
      drillType.value = 'income';
      return;
    }

    if (name && name !== 'Budget' && name !== 'Other') {
      selectedCategory.value = name;
      drillType.value = 'expense';
      return;
    }
  }

  if (params.dataType === 'edge' || params.dataType === 'link') {
    const source = params.data?.source ?? '';
    const target = params.data?.target ?? '';

    if (source === 'Budget' && target && target !== 'Other') {
      selectedCategory.value = target;
      drillType.value = 'expense';
      return;
    }

    if (target === 'Budget' && source.startsWith('Income · ')) {
      selectedCategory.value = source.replace(/^Income ·\s*/, '');
      drillType.value = 'income';
    }
  }
}
</script>
