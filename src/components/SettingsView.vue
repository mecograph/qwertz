<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Settings & Storage</h2>
    <p class="mt-2 text-sm text-slate-600">Rows stored locally: {{ tx.rows.length }}</p>
    <div class="mt-4 flex flex-wrap gap-2">
      <button class="rounded border px-3 py-2" @click="exportJson">Export JSON</button>
      <label class="rounded border px-3 py-2 cursor-pointer">Import JSON<input type="file" class="hidden" accept="application/json" @change="importJson"/></label>
      <button class="rounded border px-3 py-2 text-red-700" @click="purge">Purge all data</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { clearRows } from '../utils/storage';

const tx = useTransactionsStore();

function exportJson() {
  const blob = new Blob([JSON.stringify({ rows: tx.rows }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tx-state.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  file.text().then((raw) => {
    const parsed = JSON.parse(raw);
    tx.setRows(parsed.rows ?? []);
  });
}

function purge() {
  clearRows();
  tx.setRows([]);
}
</script>
