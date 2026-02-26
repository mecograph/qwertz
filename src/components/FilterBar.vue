<template>
  <div class="flex justify-end">
    <div class="relative flex items-center gap-2">
      <button class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50" @click="toggleDatePopover">
        {{ dateSummary }}
      </button>
      <button class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50" @click="toggleFilterPopover">
        Filter
      </button>
      <button class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50" @click="resetToLatestYear">Reset</button>

      <div v-if="showDatePopover" class="absolute right-0 top-11 z-40 w-[28rem] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p class="text-xs font-semibold text-slate-600">Date range</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button v-for="preset in presets" :key="preset.label" class="rounded border border-slate-200 px-2 py-1 text-left text-xs hover:bg-slate-50" @click="applyPreset(preset.days)">
            {{ preset.label }}
          </button>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <label class="text-xs text-slate-600">Start
            <input type="date" v-model="filters.startDate" class="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" />
          </label>
          <label class="text-xs text-slate-600">End
            <input type="date" v-model="filters.endDate" class="mt-1 w-full rounded border border-slate-300 p-1.5 text-sm" />
          </label>
        </div>
      </div>

      <div v-if="showFilterPopover" class="absolute right-0 top-11 z-40 w-[22rem] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p class="text-xs font-semibold text-slate-600">Add Filter...</p>
        <div class="mt-2 space-y-2">
          <label class="text-xs text-slate-600">Type
            <select class="mt-1 w-full rounded border border-slate-300 p-2 text-sm" v-model="filters.type">
              <option value="">Expense + Income</option>
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
              <option value="Neutral">Neutral</option>
            </select>
          </label>
          <label class="text-xs text-slate-600">Year
            <select class="mt-1 w-full rounded border border-slate-300 p-2 text-sm" v-model="filters.selectedYear">
              <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
            </select>
          </label>
          <label class="text-xs text-slate-600">Month
            <select class="mt-1 w-full rounded border border-slate-300 p-2 text-sm" v-model="filters.selectedMonth">
              <option value="">All</option>
              <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" v-model="filters.includeNeutral" class="rounded border-slate-300" /> Include Neutral
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';


const _props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: true });
const filters = useFilterStore();
const tx = useTransactionsStore();
const showFilterPopover = ref(false);
const showDatePopover = ref(false);

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 28 days', days: 28 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This month', days: 0 },
];

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

const dateSummary = computed(() => {
  if (filters.startDate && filters.endDate) return `${filters.startDate} – ${filters.endDate}`;
  if (filters.selectedMonth) return filters.selectedMonth;
  if (filters.selectedYear) return filters.selectedYear;
  return 'Date';
});

watchEffect(() => {
  if (!filters.selectedYear && years.value.length) filters.selectedYear = years.value[0];
});

function resetToLatestYear() {
  filters.reset();
  if (years.value.length) filters.selectedYear = years.value[0];
  showFilterPopover.value = false;
  showDatePopover.value = false;
}

function toggleFilterPopover() {
  showFilterPopover.value = !showFilterPopover.value;
  if (showFilterPopover.value) showDatePopover.value = false;
}

function toggleDatePopover() {
  showDatePopover.value = !showDatePopover.value;
  if (showDatePopover.value) showFilterPopover.value = false;
}

function applyPreset(days: number) {
  const now = new Date();
  const end = new Date(now);
  if (days === 0) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    filters.startDate = start.toISOString().slice(0, 10);
    filters.endDate = end.toISOString().slice(0, 10);
    return;
  }
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  filters.startDate = start.toISOString().slice(0, 10);
  filters.endDate = end.toISOString().slice(0, 10);
}
</script>
