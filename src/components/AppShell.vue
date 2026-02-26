<script setup lang="ts">
import FilterBar from './FilterBar.vue';
import DashboardSankey from './DashboardSankey.vue';
import ChartsView from './ChartsView.vue';
import DataGrid from './DataGrid.vue';
import SettingsView from './SettingsView.vue';
import { useUiStore } from '@/stores/useUiStore';
import { useTransactionsStore } from '@/stores/useTransactionsStore';

const ui = useUiStore();
const txStore = useTransactionsStore();
const tabs = ['Dashboard', 'Charts', 'Data', 'Settings'] as const;
</script>

<template>
  <main class="mx-auto max-w-7xl p-4">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-xl font-bold">Transaction Analyzer</h1>
      <div class="flex gap-2">
        <button
          v-for="t in tabs"
          :key="t"
          class="rounded px-3 py-1.5"
          :class="ui.tab === t ? 'bg-blue-600 text-white' : 'bg-slate-200'"
          @click="ui.tab = t"
        >
          {{ t }}
        </button>
      </div>
    </header>

    <FilterBar />

    <section class="my-4 grid grid-cols-2 gap-3 md:grid-cols-5">
      <div class="rounded bg-white p-3 shadow">Income: {{ txStore.kpis.income.toFixed(2) }}</div>
      <div class="rounded bg-white p-3 shadow">Expenses: {{ txStore.kpis.expenses.toFixed(2) }}</div>
      <div class="rounded bg-white p-3 shadow">Net: {{ txStore.kpis.net.toFixed(2) }}</div>
      <div class="rounded bg-white p-3 shadow">Tx count: {{ txStore.kpis.count }}</div>
      <div class="rounded bg-white p-3 shadow">Top category: {{ txStore.kpis.topCategory }}</div>
    </section>

    <DashboardSankey v-if="ui.tab === 'Dashboard'" />
    <ChartsView v-else-if="ui.tab === 'Charts'" />
    <DataGrid v-else-if="ui.tab === 'Data'" />
    <SettingsView v-else />
  </main>
</template>
