<template>
  <section class="space-y-4">
    <div class="term-pane">
      <h2 class="text-sm font-bold">$ charts</h2>
      <p class="mt-1 text-xs text-terminal-muted">{{ t('charts_desc') }}</p>
    </div>

    <div class="grid gap-3 md:grid-cols-5">
      <div class="term-stat" v-for="kpi in kpis" :key="kpi.label">
        <p class="text-xs text-terminal-muted">{{ kpi.label }}</p>
        <p class="font-mono text-lg font-bold">{{ kpi.value }}</p>
      </div>
    </div>

    <!-- 2-column grid -->
    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Chart 1: Income vs Expense by Category -->
      <div class="term-pane">
        <h3 class="text-sm font-bold">{{ t('charts_income_expense_by_cat') }}</h3>
        <div class="mt-2 flex gap-2">
          <VChart ref="chart1Ref" class="h-80 min-w-0 flex-1" :option="incomeExpenseByCategoryOption" :theme="ui.chartTheme" autoresize @click="onChartClick" />
          <TermChartLegend class="hidden lg:block" :items="chart1Legend" :chart-ref="chart1Ref" />
        </div>
      </div>

      <!-- Chart 2: Category with Bezeichnung breakdown -->
      <div class="term-pane">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-bold">{{ t('charts_category_label') }}</h3>
          <select v-model="mode" class="term-select px-2 py-1 text-xs">
            <option value="expense">{{ t('charts_mode_expense') }}</option>
            <option value="income">{{ t('charts_mode_income') }}</option>
            <option value="split">{{ t('charts_mode_split') }}</option>
          </select>
        </div>
        <div class="flex gap-2">
          <VChart ref="chart2Ref" class="h-80 min-w-0 flex-1" :option="categoryLabelOption" :theme="ui.chartTheme" autoresize @click="onChartClick" />
          <TermChartLegend class="hidden lg:block" :items="chart2Legend" :chart-ref="chart2Ref" />
        </div>
      </div>

      <!-- Chart 3: Year overview monthly side-by-side (spans both cols) -->
      <div class="term-pane lg:col-span-2">
        <h3 class="text-sm font-bold">{{ t('charts_year_overview') }}</h3>
        <VChart class="mt-2 h-80" :option="monthlySideBySideOption" :theme="ui.chartTheme" autoresize @click="onChartClick" />
      </div>
    </div>

    <!-- Monthly Detail section -->
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="term-pane lg:col-span-2">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-bold">{{ t('charts_monthly_detail') }}</h3>
          <button class="term-btn text-xs" @click="openInData">{{ t('charts_open_in_data') }}</button>
        </div>
        <VChart class="h-64" :option="monthlyDetailCategoryOption" :theme="ui.chartTheme" autoresize @click="onMonthlyCategoryClick" />
        <VChart class="mt-3 h-64" :option="monthlyDetailLabelOption" :theme="ui.chartTheme" autoresize @click="onMonthlyLabelClick" />
      </div>

      <aside class="term-pane">
        <h4 class="text-sm font-bold">{{ t('charts_detail_drawer') }}</h4>
        <p class="mt-1 text-xs text-terminal-muted">{{ breadcrumb }}</p>
        <div class="mt-3 grid gap-2">
          <div class="term-stat text-sm">{{ t('charts_amount_abs') }}: {{ formatCurrency(detailKpis.amountAbs) }}</div>
          <div class="term-stat text-sm">{{ t('kpi_transactions') }}: {{ detailKpis.count }}</div>
          <div class="term-stat text-sm">{{ t('charts_avg') }}: {{ formatCurrency(detailKpis.avg) }}</div>
          <div class="term-stat text-sm">{{ t('charts_largest') }}: {{ formatCurrency(detailKpis.largest) }}</div>
        </div>
        <div class="mt-3 max-h-64 overflow-auto border border-terminal-border">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-terminal-bg">
              <tr><th class="p-1 text-left text-terminal-amber">{{ t('col_date') }}</th><th class="p-1 text-left text-terminal-amber">{{ t('col_category') }}</th><th class="p-1 text-left text-terminal-amber">{{ t('charts_breadcrumb_label') }}</th><th class="p-1 text-right text-terminal-amber">{{ t('col_amount') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in detailRows.slice(0, 20)" :key="row.id" class="border-t border-terminal-border">
                <td class="p-1">{{ row.date.slice(0, 10) }}</td>
                <td class="p-1">{{ row.category }}</td>
                <td class="p-1">{{ row.label }}</td>
                <td class="p-1 text-right">{{ formatCurrency(row.amountAbs) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import VChart from 'vue-echarts';
import type { ECBasicOption } from 'echarts/types/dist/shared';
import TermChartLegend from './TermChartLegend.vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useUiStore } from '../stores/useUiStore';
import { useLocale } from '../composables/useLocale';
import type { Tx } from '../types';

const tx = useTransactionsStore();
const filters = useFilterStore();
const ui = useUiStore();
const { t, formatCurrency } = useLocale();

const mode = ref<'expense' | 'income' | 'split'>('expense');
const selectedCategory = ref<string>('');
const selectedLabel = ref<string>('');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chart1Ref = shallowRef<any>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chart2Ref = shallowRef<any>(null);

const DARK_COLORS = [
  '#33ff00', '#ffb000', '#00ffff', '#ff3333', '#ff00ff',
  '#66ff66', '#ffcc44', '#44dddd', '#ff6666', '#cc88ff',
  '#88ff88', '#ffdd77',
];
const LIGHT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#A855F7', '#F43F5E',
];

const chartColors = computed(() => ui.theme === 'light' ? LIGHT_COLORS : DARK_COLORS);

// Clear drilldown state when filter store changes
watch(
  () => [filters.type, filters.categories, filters.labels, filters.startDate, filters.endDate, filters.includeNeutral],
  () => {
    selectedCategory.value = '';
    selectedLabel.value = '';
  },
);

const filteredRows = computed(() => {
  return tx.rows.filter((row) => {
    if (!filters.includeNeutral && row.type === 'Neutral') return false;
    if (filters.type && row.type !== filters.type) return false;
    if (filters.categories.length && !filters.categories.includes(row.category)) return false;
    if (filters.labels.length && !filters.labels.includes(row.label)) return false;
    if (filters.startDate && row.date.slice(0, 10) < filters.startDate) return false;
    if (filters.endDate && row.date.slice(0, 10) > filters.endDate) return false;
    if (filters.query && !row.purpose?.toLowerCase().includes(filters.query.toLowerCase())) return false;
    return true;
  });
});

const kpis = computed(() => {
  const income = filteredRows.value.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const expense = filteredRows.value.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amountAbs, 0);
  return [
    { label: t('kpi_income'), value: formatCurrency(income) },
    { label: t('kpi_expenses'), value: formatCurrency(expense) },
    { label: t('kpi_net'), value: formatCurrency(income - expense) },
    { label: t('kpi_transactions'), value: String(filteredRows.value.length) },
    { label: t('kpi_top_category'), value: topCategory(filteredRows.value) || '-' },
  ];
});

function topCategory(rows: Tx[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.category, (map.get(row.category) ?? 0) + row.amountAbs));
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function categoriesForTopN(rows: Tx[], n: number) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.category, (map.get(row.category) ?? 0) + row.amountAbs));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name);
}

const incomeExpenseByCategoryOption = computed<ECBasicOption>(() => {
  const rows = filteredRows.value.filter((row) => row.type === 'Income' || row.type === 'Expense');
  const categories = categoriesForTopN(rows, 12);
  const series = categories.map((category) => ({
    name: category,
    type: 'bar',
    stack: 'total',
    barWidth: 12,
    data: [
      rows.filter((row) => row.type === 'Expense' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0),
      rows.filter((row) => row.type === 'Income' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0),
    ],
  }));
  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    legend: { show: false },
    grid: { left: 50, right: 20, bottom: 30, top: 10 },
    xAxis: { type: 'category', data: [t('charts_axis_expense'), t('charts_axis_income')] },
    yAxis: { type: 'value' },
    series,
  };
});

const chart1Legend = computed(() => {
  const rows = filteredRows.value.filter((row) => row.type === 'Income' || row.type === 'Expense');
  return categoriesForTopN(rows, 12).map((name, i) => ({
    name,
    color: chartColors.value[i % chartColors.value.length],
  }));
});

const categoryLabelOption = computed<ECBasicOption>(() => {
  const base = filteredRows.value.filter((row) => {
    if (mode.value === 'expense') return row.type === 'Expense';
    if (mode.value === 'income') return row.type === 'Income';
    return row.type === 'Expense' || row.type === 'Income';
  });

  const categories = categoriesForTopN(base, 12);

  // Sort labels by total descending (Feature 1: chart sorting fix)
  const labelMap = new Map<string, number>();
  base.forEach((row) => labelMap.set(row.label, (labelMap.get(row.label) ?? 0) + row.amountAbs));
  const labels = [...labelMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name]) => name);

  const series = labels.map((label) => ({
    name: label,
    type: 'bar',
    stack: mode.value === 'split' ? undefined : 'label-stack',
    barWidth: 12,
    data: categories.map((category) =>
      base
        .filter((row) => row.category === category && row.label === label)
        .reduce((sum, row) => sum + row.amountAbs, 0),
    ),
  }));

  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    legend: { show: false },
    grid: { left: 50, right: 20, bottom: 50, top: 10 },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: 20 } },
    yAxis: { type: 'value' },
    series,
  };
});

const chart2Legend = computed(() => {
  const base = filteredRows.value.filter((row) => {
    if (mode.value === 'expense') return row.type === 'Expense';
    if (mode.value === 'income') return row.type === 'Income';
    return row.type === 'Expense' || row.type === 'Income';
  });

  // Sort labels by total descending (Feature 1: chart sorting fix)
  const labelMap = new Map<string, number>();
  base.forEach((row) => labelMap.set(row.label, (labelMap.get(row.label) ?? 0) + row.amountAbs));
  return [...labelMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name], i) => ({
      name,
      color: chartColors.value[i % chartColors.value.length],
    }));
});

const monthlySideBySideOption = computed<ECBasicOption>(() => {
  const rows = filteredRows.value.filter((row) => row.type === 'Income' || row.type === 'Expense');
  const months = [...new Set(rows.map((row) => row.date.slice(0, 7)))].sort();
  const categories = categoriesForTopN(rows, 12);

  const series = categories.flatMap((category) => [
    {
      name: `${category} ${t('charts_axis_expense')}`,
      type: 'bar',
      stack: 'expense',
      barWidth: 12,
      data: months.map((month) => rows.filter((row) => row.date.slice(0, 7) === month && row.type === 'Expense' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0)),
    },
    {
      name: `${category} ${t('charts_axis_income')}`,
      type: 'bar',
      stack: 'income',
      barWidth: 12,
      data: months.map((month) => rows.filter((row) => row.date.slice(0, 7) === month && row.type === 'Income' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0)),
    },
  ]);

  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    legend: { show: false },
    grid: { left: 50, right: 30, top: 10, bottom: 55 },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series,
  };
});

const monthlyDetailRows = computed(() => {
  const sorted = [...new Set(filteredRows.value.map((row) => row.date.slice(0, 7)))].sort();
  const latestMonth = sorted[sorted.length - 1] || '';
  let month = latestMonth;
  if (filters.startDate && filters.endDate) {
    const startMonth = filters.startDate.slice(0, 7);
    const endMonth = filters.endDate.slice(0, 7);
    if (startMonth === endMonth) month = startMonth;
  }
  return filteredRows.value.filter((row) => row.date.slice(0, 7) === month && row.type !== 'Neutral');
});

const monthlyDetailCategoryOption = computed<ECBasicOption>(() => {
  const typeRows = monthlyDetailRows.value.filter((row) => (filters.type ? row.type === filters.type : row.type === 'Expense'));
  const grouped = [...new Set(typeRows.map((row) => row.category))].map((category) => ({
    category,
    value: typeRows.filter((row) => row.category === category).reduce((sum, row) => sum + row.amountAbs, 0),
  }));

  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    xAxis: { type: 'category', data: grouped.map((item) => item.category), axisLabel: { rotate: 25 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: grouped.map((item) => item.value), name: t('col_category'), barWidth: 12 }],
  };
});

const monthlyDetailLabelOption = computed<ECBasicOption>(() => {
  const source = monthlyDetailRows.value.filter((row) => (selectedCategory.value ? row.category === selectedCategory.value : true));
  const grouped = [...new Set(source.map((row) => row.label))].slice(0, 20).map((label) => ({
    name: label,
    value: source.filter((row) => row.label === label).reduce((sum, row) => sum + row.amountAbs, 0),
  }));

  // Guard: if empty data, show placeholder so pie chart doesn't break
  const data = grouped.length ? grouped : [{ name: 'No data', value: 0 }];

  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    series: [{ type: 'pie', radius: ['28%', '70%'], data }],
  };
});

const detailRows = computed(() => {
  return monthlyDetailRows.value.filter((row) => {
    if (selectedCategory.value && row.category !== selectedCategory.value) return false;
    if (selectedLabel.value && row.label !== selectedLabel.value) return false;
    return true;
  });
});

const detailKpis = computed(() => {
  const count = detailRows.value.length;
  const amountAbs = detailRows.value.reduce((sum, row) => sum + row.amountAbs, 0);
  const avg = count ? amountAbs / count : 0;
  const largest = detailRows.value.reduce((max, row) => Math.max(max, row.amountAbs), 0);
  return { count, amountAbs, avg, largest };
});

const breadcrumb = computed(() => {
  const range = filters.dateLabel;
  const type = filters.type || t('charts_mode_expense');
  return `${range} > ${type} > ${selectedCategory.value || t('charts_breadcrumb_category')} > ${selectedLabel.value || t('charts_breadcrumb_label')}`;
});

function onChartClick(params: { seriesName?: string; name?: string; dataIndex?: number }) {
  if (!params.seriesName || !params.name) return;
  if (params.name === t('charts_axis_expense') || params.name === t('charts_axis_income')) {
    const type = params.name === t('charts_axis_expense') ? 'Expense' : 'Income';
    filters.applyCrossfilter({ type: type as 'Expense' | 'Income', category: params.seriesName });
    selectedCategory.value = params.seriesName;
  }
}

function onMonthlyCategoryClick(params: { name?: string }) {
  if (!params.name) return;
  selectedCategory.value = params.name;
  filters.applyCrossfilter({ category: params.name });
}

function onMonthlyLabelClick(params: { name?: string }) {
  if (!params.name) return;
  selectedLabel.value = params.name;
  filters.applyCrossfilter({ label: params.name });
}

function openInData() {
  ui.setTab('Data');
}
</script>
