<script setup lang="ts">
import { computed } from 'vue'
import UploadSplash from '@/components/UploadSplash.vue'
import ProcessingView from '@/components/ProcessingView.vue'
import AppShell from '@/components/AppShell.vue'
import FilterBar from '@/components/FilterBar.vue'
import DashboardSankey from '@/components/DashboardSankey.vue'
import ChartsView from '@/components/ChartsView.vue'
import DataGrid from '@/components/DataGrid.vue'
import SettingsView from '@/components/SettingsView.vue'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useFilterStore } from '@/stores/useFilterStore'
import { useUiStore } from '@/stores/useUiStore'

const txStore = useTransactionsStore()
const filterStore = useFilterStore()
const uiStore = useUiStore()

txStore.hydrateFromLocal()

const filteredRows = computed(() => filterStore.apply(txStore.transactions))

const loadFile = async (file: File) => {
  await txStore.processWorkbook(file)
  if (txStore.processingError) return
  const years = filterStore.yearsFromData(txStore.transactions).value
  filterStore.selectedYear = years[0] ?? null
}
</script>

<template>
  <main class="min-h-screen pb-8">
    <div v-if="txStore.processingError" class="fixed right-4 top-4 z-50 max-w-md rounded-lg border border-rose-200 bg-rose-50 p-3 shadow">
      <div class="flex items-start gap-3">
        <p class="text-sm text-rose-700">{{ txStore.processingError }}</p>
        <button class="rounded px-1 text-rose-600 hover:bg-rose-100" @click="txStore.clearProcessingError">✕</button>
      </div>
    </div>

    <UploadSplash v-if="!txStore.hasData && !txStore.isProcessing" @file-selected="loadFile" @resume="txStore.hydrateFromLocal" />
    <ProcessingView v-else-if="txStore.isProcessing" :step="txStore.processingStep" :errors="txStore.invalidRows.length" />
    <template v-else>
      <AppShell :active-tab="uiStore.activeTab" @tab="(t) => (uiStore.activeTab = t)" />
      <div class="mx-auto mt-3 max-w-7xl px-3">
        <FilterBar :rows="txStore.transactions" />
        <p v-if="txStore.invalidRows.length" class="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm">
          {{ txStore.invalidRows.length }} Zeilen sind ungültig und wurden ausgelassen.
        </p>

        <section class="mt-3" v-if="uiStore.activeTab === 'Dashboard'">
          <DashboardSankey :rows="filteredRows" />
        </section>
        <section class="mt-3" v-else-if="uiStore.activeTab === 'Charts'">
          <ChartsView :rows="filteredRows" />
        </section>
        <section class="mt-3" v-else-if="uiStore.activeTab === 'Data'">
          <DataGrid :rows="filteredRows" @update="txStore.setTransactions" />
        </section>
        <section class="mt-3" v-else>
          <SettingsView :rows="txStore.transactions" :updated-at="txStore.lastUpdatedAt" @import="txStore.setTransactions" />
        </section>
      </div>
    </template>
  </main>
</template>
