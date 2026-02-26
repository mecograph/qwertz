<template>
  <section class="space-y-4">
    <div class="ui-card p-4">
      <h2 class="text-xl font-semibold text-slate-900">Charts</h2>
      <p class="mt-1 text-sm text-slate-500">Excel parity pack · Subcategory = Bezeichnung · chart-first monthly detail</p>
    </div>

    <div class="grid gap-3 md:grid-cols-5">
      <div class="ui-kpi" v-for="kpi in kpis" :key="kpi.label">
        <p class="text-xs text-slate-500">{{ kpi.label }}</p>
        <p class="font-mono text-lg font-semibold">{{ kpi.value }}</p>
      </div>
    </div>

    <div class="ui-card p-4">
      <h3 class="font-semibold">Income vs Expense by Category</h3>
      <VChart class="mt-2 h-96" :option="incomeExpenseByCategoryOption" autoresize @click="onChartClick" />
    </div>

    <div class="ui-card p-4">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <h3 class="font-semibold">Income/Expense by Category with Bezeichnung breakdown</h3>
        <select v-model="mode" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
          <option value="expense">Expense only (default)</option>
          <option value="income">Income only</option>
          <option value="split">Split Income/Expense</option>
        </select>
      </div>
      <VChart class="h-96" :option="categoryLabelOption" autoresize @click="onChartClick" />
    </div>

    <div class="ui-card p-4">
      <h3 class="font-semibold">Year overview: monthly Income & Expense by Category</h3>
      <VChart class="mt-2 h-96" :option="monthlySideBySideOption" autoresize @click="onChartClick" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="ui-card p-4 lg:col-span-2">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="font-semibold">Monthly Detail (Chart-first)</h3>
          <button class="ui-btn" @click="openInData">Open in Data</button>
        </div>
        <VChart class="h-64" :option="monthlyDetailCategoryOption" autoresize @click="onMonthlyCategoryClick" />
        <VChart class="mt-3 h-64" :option="monthlyDetailLabelOption" autoresize @click="onMonthlyLabelClick" />
      </div>

      <aside class="ui-card p-4">
        <h4 class="font-semibold">Detail drawer</h4>
        <p class="mt-1 text-xs text-slate-500">{{ breadcrumb }}</p>
        <div class="mt-3 grid gap-2">
          <div class="ui-kpi text-sm">AmountAbs: {{ formatCurrency(detailKpis.amountAbs) }}</div>
          <div class="ui-kpi text-sm">Transactions: {{ detailKpis.count }}</div>
          <div class="ui-kpi text-sm">Avg: {{ formatCurrency(detailKpis.avg) }}</div>
          <div class="ui-kpi text-sm">Largest: {{ formatCurrency(detailKpis.largest) }}</div>
        </div>
        <div class="mt-3 max-h-64 overflow-auto rounded border border-slate-200">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-slate-50">
              <tr><th class="p-1 text-left">Date</th><th class="p-1 text-left">Category</th><th class="p-1 text-left">Bezeichnung</th><th class="p-1 text-right">Amount</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in detailRows.slice(0, 20)" :key="row.id" class="border-t border-slate-100">
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
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import type { ECBasicOption } from 'echarts/types/dist/shared';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useUiStore } from '../stores/useUiStore';
import type { Tx } from '../types';

const tx = useTransactionsStore();
const filters = useFilterStore();
const ui = useUiStore();

const mode = ref<'expense' | 'income' | 'split'>('expense');
const selectedCategory = ref<string>('');
const selectedLabel = ref<string>('');

const formatCurrency = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

const filteredRows = computed(() => {
  return tx.rows.filter((row) => {
    if (!filters.includeNeutral && row.type === 'Neutral') return false;
    if (filters.type && row.type !== filters.type) return false;
    if (filters.selectedYear && row.date.slice(0, 4) !== filters.selectedYear) return false;
    if (filters.timeGranularity === 'Month' && filters.selectedMonth && row.date.slice(0, 7) !== filters.selectedMonth) return false;
    if (filters.categories.length && !filters.categories.includes(row.category)) return false;
    if (filters.labels.length && !filters.labels.includes(row.label)) return false;
    if (filters.query && !row.purpose?.toLowerCase().includes(filters.query.toLowerCase())) return false;
    return true;
  });
});

const kpis = computed(() => {
  const income = filteredRows.value.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const expense = filteredRows.value.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amountAbs, 0);
  return [
    { label: 'Income', value: formatCurrency(income) },
    { label: 'Expenses', value: formatCurrency(expense) },
    { label: 'Net', value: formatCurrency(income - expense) },
    { label: 'Transactions', value: String(filteredRows.value.length) },
    { label: 'Top Category', value: topCategory(filteredRows.value) || '-' },
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
    data: [
      rows.filter((row) => row.type === 'Expense' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0),
      rows.filter((row) => row.type === 'Income' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0),
    ],
  }));
  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    legend: { type: 'scroll', right: 0, top: 24 },
    grid: { left: 50, right: 220, bottom: 30, top: 30 },
    xAxis: { type: 'category', data: ['Expense', 'Income'] },
    yAxis: { type: 'value' },
    series,
  };
});

const categoryLabelOption = computed<ECBasicOption>(() => {
  const base = filteredRows.value.filter((row) => {
    if (mode.value === 'expense') return row.type === 'Expense';
    if (mode.value === 'income') return row.type === 'Income';
    return row.type === 'Expense' || row.type === 'Income';
  });

  const categories = categoriesForTopN(base, 12);
  const labels = [...new Set(base.map((row) => row.label))].slice(0, 20);

  const series = labels.map((label) => ({
    name: label,
    type: 'bar',
    stack: mode.value === 'split' ? undefined : 'label-stack',
    data: categories.map((category) =>
      base
        .filter((row) => row.category === category && row.label === label)
        .reduce((sum, row) => sum + row.amountAbs, 0),
    ),
  }));

  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    legend: { type: 'scroll', right: 0, top: 24 },
    grid: { left: 50, right: 280, bottom: 50, top: 30 },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: 20 } },
    yAxis: { type: 'value' },
    series,
  };
});

const monthlySideBySideOption = computed<ECBasicOption>(() => {
  const rows = filteredRows.value.filter((row) => row.type === 'Income' || row.type === 'Expense');
  const months = [...new Set(rows.map((row) => row.date.slice(0, 7)))].sort();
  const categories = categoriesForTopN(rows, 12);

  const series = categories.flatMap((category) => [
    {
      name: `${category} Expense`,
      type: 'bar',
      stack: 'expense',
      data: months.map((month) => rows.filter((row) => row.date.slice(0, 7) === month && row.type === 'Expense' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0)),
    },
    {
      name: `${category} Income`,
      type: 'bar',
      stack: 'income',
      data: months.map((month) => rows.filter((row) => row.date.slice(0, 7) === month && row.type === 'Income' && row.category === category).reduce((sum, row) => sum + row.amountAbs, 0)),
    },
  ]);

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: { left: 50, right: 30, top: 30, bottom: 55 },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series,
  };
});

const monthlyDetailRows = computed(() => {
  const latestMonth = [...new Set(filteredRows.value.map((row) => row.date.slice(0, 7)))].sort().at(-1) || '';
  const month = filters.selectedMonth || latestMonth;
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
    series: [{ type: 'bar', data: grouped.map((item) => item.value), name: 'Category' }],
  };
});

const monthlyDetailLabelOption = computed<ECBasicOption>(() => {
  const source = monthlyDetailRows.value.filter((row) => (selectedCategory.value ? row.category === selectedCategory.value : true));
  const grouped = [...new Set(source.map((row) => row.label))].slice(0, 20).map((label) => ({
    name: label,
    value: source.filter((row) => row.label === label).reduce((sum, row) => sum + row.amountAbs, 0),
  }));

  return {
    tooltip: { trigger: 'item', valueFormatter: (value: number) => formatCurrency(value) },
    series: [{ type: 'pie', radius: ['28%', '70%'], data: grouped }],
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
  const month = filters.selectedMonth || 'Latest month';
  const type = filters.type || 'Expense';
  return `${month} > ${type} > ${selectedCategory.value || 'Category'} > ${selectedLabel.value || 'Bezeichnung'}`;
});

function onChartClick(params: { seriesName?: string; name?: string; dataIndex?: number }) {
  if (!params.seriesName || !params.name) return;
  if (params.name === 'Expense' || params.name === 'Income') {
    filters.applyCrossfilter({ type: params.name as 'Expense' | 'Income', category: params.seriesName });
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
  ui.tab = 'Data';
}
</script>
