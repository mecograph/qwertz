<template>
  <section class="flex h-full min-h-0 flex-col term-pane">
    <div>
      <h2 class="text-sm font-bold">$ dashboard_sankey</h2>
      <p class="text-xs text-terminal-muted">Income categories flow into Budget, then Budget flows to spending categories. Click categories (or links) to drill down.</p>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-5">
      <div class="term-stat" v-for="item in kpisList" :key="item.label">
        <p class="text-xs text-terminal-muted">{{ item.label }}</p>
        <p class="font-bold" :class="item.tone">{{ item.value }}</p>
      </div>
    </div>

    <!-- Breadcrumb (visible only when drilled down) -->
    <div v-if="selectedCategory" class="mt-3 text-sm">
      <button class="text-terminal-cyan hover:underline" @click="clearDrilldown">Budget</button>
      <span class="text-terminal-muted"> / </span>
      <span class="text-terminal-amber">{{ drillType === 'income' ? 'Income' : 'Expense' }}</span>
      <span class="text-terminal-muted"> / </span>
      <span class="text-terminal-green">{{ selectedCategory }}</span>
    </div>

    <VChart class="mt-4 min-h-0 flex-1 w-full" :option="option" :theme="ui.chartTheme" autoresize aria-label="Sankey chart" @click="onChartClick" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import { buildBudgetSankey, buildCategoryDrilldownSankey, buildIncomeDrilldownSankey, computeKpis } from '../utils/aggregations';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useFilterStore } from '../stores/useFilterStore';
import { useUiStore } from '../stores/useUiStore';

const tx = useTransactionsStore();
const filters = useFilterStore();
const ui = useUiStore();
const selectedCategory = ref('');
const drillType = ref<'' | 'income' | 'expense'>('');

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

const filteredRows = computed(() => {
  return tx.rows.filter((row) => {
    if (!filters.includeNeutral && row.type === 'Neutral') return false;
    if (filters.type && row.type !== filters.type) return false;
    if (filters.categories.length && !filters.categories.includes(row.category)) return false;
    if (filters.labels.length && !filters.labels.includes(row.label)) return false;
    if (filters.startDate && row.date.slice(0, 10) < filters.startDate) return false;
    if (filters.endDate && row.date.slice(0, 10) > filters.endDate) return false;
    return true;
  });
});

const kpis = computed(() => computeKpis(filteredRows.value));
const kpisList = computed(() => [
  { label: 'Income', value: formatter.format(kpis.value.income), tone: 'text-terminal-green' },
  { label: 'Expenses', value: formatter.format(kpis.value.expenses), tone: 'text-terminal-red' },
  { label: 'Net', value: formatter.format(kpis.value.net), tone: kpis.value.net >= 0 ? 'text-terminal-green' : 'text-terminal-red' },
  { label: 'Transactions', value: String(kpis.value.txCount), tone: 'text-terminal-amber' },
  {
    label: selectedCategory.value ? `Drilldown (${drillType.value || 'category'})` : 'Top category',
    value: selectedCategory.value || kpis.value.topCategory,
    tone: 'text-terminal-cyan',
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onChartClick(params: any) {
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
