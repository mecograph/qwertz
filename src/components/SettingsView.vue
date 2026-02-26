<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h3 class="text-lg font-medium">Settings & Storage</h3>
    <div class="mt-3 grid gap-3 md:grid-cols-3">
      <label class="space-y-1 text-sm">
        <span>Top Categories</span>
        <input v-model.number="ui.settings.topCategories" type="number" min="3" class="w-full rounded border p-2" />
      </label>
      <label class="space-y-1 text-sm">
        <span>Top Labels</span>
        <input v-model.number="ui.settings.topLabels" type="number" min="5" class="w-full rounded border p-2" />
      </label>
      <label class="space-y-1 text-sm">
        <span>Default granularity</span>
        <select v-model="ui.settings.defaultGranularity" class="w-full rounded border p-2">
          <option value="year">Year</option>
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
          <option value="custom">Custom</option>
        </select>
      </label>
    </div>
    <div class="mt-4 flex gap-2">
      <button class="rounded border px-3 py-2" @click="downloadJson">Export JSON</button>
      <label class="rounded border px-3 py-2">
        Import JSON
        <input hidden type="file" accept="application/json" @change="uploadJson" />
      </label>
      <button class="rounded bg-red-600 px-3 py-2 text-white" @click="txStore.resetAll">Purge all</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTransactionsStore } from '../stores/useTransactionsStore'
import { useUiStore } from '../stores/useUiStore'
import { exportJson, importJson } from '../utils/storage'

const txStore = useTransactionsStore()
const ui = useUiStore()

function downloadJson() {
  const blob = new Blob([exportJson(txStore.rows)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'transactions.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

function uploadJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  file.text().then((content) => txStore.setRows(importJson(content)))
}
</script>
