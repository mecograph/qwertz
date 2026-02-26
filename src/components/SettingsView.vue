<script setup lang="ts">
import { computed } from 'vue';
import { useTransactionsStore } from '@/stores/useTransactionsStore';
import { clearStorage, exportJson } from '@/utils/storage';

const txStore = useTransactionsStore();
const storageBytes = computed(() => new Blob([JSON.stringify(txStore.rows)]).size);

function purge() {
  clearStorage();
  txStore.setRows([]);
}

function downloadJson() {
  const blob = new Blob([exportJson(txStore.rows)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.json';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="space-y-3 rounded bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Settings</h2>
    <p class="text-sm">localStorage usage: {{ storageBytes }} bytes</p>
    <div class="flex gap-2">
      <button class="rounded bg-slate-700 px-3 py-2 text-white" @click="downloadJson">Export JSON</button>
      <button class="rounded bg-red-600 px-3 py-2 text-white" @click="purge">Purge all data</button>
    </div>
  </div>
</template>
