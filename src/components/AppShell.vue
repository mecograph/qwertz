<template>
  <div class="space-y-4">
    <nav class="flex gap-2 rounded-xl bg-white p-2 shadow">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="rounded px-3 py-2 text-sm"
        :class="ui.settings.tab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100'"
        @click="ui.settings.tab = tab"
      >
        {{ tab }}
      </button>
    </nav>

    <FilterBar />

    <section v-if="ui.settings.tab === 'Dashboard'">
      <div class="mb-4 grid gap-2 md:grid-cols-5">
        <article v-for="(val, key) in tx.kpis" :key="key" class="rounded bg-white p-3 shadow">
          <p class="text-xs uppercase text-slate-500">{{ key }}</p>
          <p class="text-lg font-semibold">{{ val }}</p>
        </article>
      </div>
      <DashboardSankey />
    </section>

    <ChartsView v-else-if="ui.settings.tab === 'Charts'" />
    <DataGrid v-else-if="ui.settings.tab === 'Data'" />
    <SettingsView v-else />
  </div>
</template>

<script setup lang="ts">
import FilterBar from './FilterBar.vue'
import DashboardSankey from './DashboardSankey.vue'
import ChartsView from './ChartsView.vue'
import DataGrid from './DataGrid.vue'
import SettingsView from './SettingsView.vue'
import { useTransactionsStore } from '../stores/useTransactionsStore'
import { useUiStore } from '../stores/useUiStore'

const tabs = ['Dashboard', 'Charts', 'Data', 'Settings'] as const
const tx = useTransactionsStore()
const ui = useUiStore()
</script>
