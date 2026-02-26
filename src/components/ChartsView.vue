<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Charts</h2>
    <VChart class="mt-4 h-80" :option="lineOption" autoresize />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { useTransactionsStore } from '../stores/useTransactionsStore';

const tx = useTransactionsStore();

const lineOption = computed(() => {
  const byMonth = new Map<string, { income: number; expense: number }>();
  tx.rows.forEach((row) => {
    const month = row.date.slice(0, 7);
    const current = byMonth.get(month) ?? { income: 0, expense: 0 };
    if (row.amount >= 0) current.income += row.amount;
    else current.expense += Math.abs(row.amount);
    byMonth.set(month, current);
  });
  const labels = [...byMonth.keys()].sort();
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Income', 'Expense', 'Net'] },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [
      { name: 'Income', type: 'line', data: labels.map((m) => byMonth.get(m)?.income ?? 0) },
      { name: 'Expense', type: 'line', data: labels.map((m) => byMonth.get(m)?.expense ?? 0) },
      { name: 'Net', type: 'line', data: labels.map((m) => (byMonth.get(m)?.income ?? 0) - (byMonth.get(m)?.expense ?? 0)) },
    ],
  };
});
</script>
