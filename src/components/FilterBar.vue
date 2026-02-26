<template>
  <div class="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-semibold tracking-wide text-slate-700">Slicers</h2>
      <button class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" @click="resetToLatestYear">Reset filters</button>
    </div>

    <div class="grid gap-3 md:grid-cols-6">
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-slate-600">Time</label>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="item in granularities"
            :key="item"
            class="rounded-md border px-2 py-1 text-xs"
            :class="filters.timeGranularity === item ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'"
            @click="filters.timeGranularity = item"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600">Year</label>
        <select class="w-full rounded-md border border-slate-300 p-2 text-sm" v-model="filters.selectedYear">
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600">Month</label>
        <select class="w-full rounded-md border border-slate-300 p-2 text-sm" v-model="filters.selectedMonth">
          <option value="">All</option>
          <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600">Type</label>
        <select class="w-full rounded-md border border-slate-300 p-2 text-sm" v-model="filters.type" aria-label="Type slicer">
          <option value="">Expense + Income</option>
          <option value="Expense">Expense</option>
          <option value="Income">Income</option>
          <option value="Neutral">Neutral</option>
        </select>
      </div>

      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" v-model="filters.includeNeutral" class="rounded border-slate-300" />
        Include Neutral
      </label>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-2">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600">Category slicer</label>
        <select multiple class="h-24 w-full rounded-md border border-slate-300 p-2 text-sm" v-model="filters.categories">
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600">Bezeichnung slicer</label>
        <select multiple class="h-24 w-full rounded-md border border-slate-300 p-2 text-sm" v-model="filters.labels">
          <option v-for="label in labels" :key="label" :value="label">{{ label }}</option>
        </select>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <span class="rounded-full bg-slate-100 px-2 py-1 text-xs" v-if="filters.type">Type: {{ filters.type }}</span>
      <span class="rounded-full bg-slate-100 px-2 py-1 text-xs" v-for="category in filters.categories" :key="`c-${category}`">{{ category }}</span>
      <span class="rounded-full bg-slate-100 px-2 py-1 text-xs" v-for="label in filters.labels" :key="`l-${label}`">{{ label }}</span>
      <span class="rounded-full bg-slate-100 px-2 py-1 text-xs" v-if="filters.selectedMonth">Month: {{ filters.selectedMonth }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';

const filters = useFilterStore();
const tx = useTransactionsStore();
const granularities = ['Year', 'Month', 'ISO Week', 'Day', 'Custom'] as const;

const years = computed(() => {
  const set = new Set(tx.rows.map((row) => row.date.slice(0, 4)));
  return [...set].sort((a, b) => Number(b) - Number(a));
});

const months = computed(() => {
  const year = filters.selectedYear;
  const set = new Set(
    tx.rows
      .filter((row) => !year || row.date.slice(0, 4) === year)
      .map((row) => row.date.slice(0, 7)),
  );
  return [...set].sort();
});

const categories = computed(() => [...new Set(tx.rows.map((row) => row.category))].sort());
const labels = computed(() => [...new Set(tx.rows.map((row) => row.label))].sort());

watchEffect(() => {
  if (!filters.selectedYear && years.value.length) filters.selectedYear = years.value[0];
});

function resetToLatestYear() {
  filters.reset();
  if (years.value.length) filters.selectedYear = years.value[0];
}
</script>
