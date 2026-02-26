<template>
  <section class="space-y-4">
    <!-- Appearance -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">Appearance</h2>
      <p class="mt-2 text-xs text-terminal-muted">Switch between dark (terminal) and light (flat) themes.</p>
      <div class="mt-3 flex w-48 border border-terminal-border">
        <button
          class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
          :class="ui.theme === 'dark' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="ui.setTheme('dark')"
        >
          Dark
        </button>
        <button
          class="flex-1 border-l border-terminal-border px-3 py-1.5 text-xs font-medium transition-colors"
          :class="ui.theme === 'light' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="ui.setTheme('light')"
        >
          Light
        </button>
      </div>
    </div>

    <!-- Data Management -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">Data Management</h2>
      <p class="mt-2 text-sm text-terminal-muted">Rows stored locally: {{ tx.rows.length }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="term-btn" @click="exportJson">[ Export JSON ]</button>
        <label class="term-btn cursor-pointer">[ Import JSON ]<input type="file" class="hidden" accept="application/json" @change="importJson" /></label>
      </div>
    </div>

    <!-- Import History -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">Import History</h2>
      <div v-if="importHistory.history.value.length" class="mt-3 max-h-48 overflow-auto border border-terminal-border">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-terminal-bg">
            <tr>
              <th class="p-2 text-left text-terminal-amber">Date</th>
              <th class="p-2 text-left text-terminal-amber">Filename</th>
              <th class="p-2 text-right text-terminal-amber">Rows</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in importHistory.history.value" :key="record.id" class="border-t border-terminal-border">
              <td class="p-2">{{ formatDate(record.timestamp) }}</td>
              <td class="p-2">{{ record.fileName }}</td>
              <td class="p-2 text-right">{{ record.rowCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-2 text-xs text-terminal-muted">No imports recorded yet.</p>
    </div>

    <!-- Danger Zone -->
    <div class="term-pane border-terminal-red">
      <h2 class="text-sm font-bold text-terminal-red">Danger Zone</h2>
      <p class="mt-2 text-xs text-terminal-muted">Permanently delete all transaction data from local storage.</p>
      <button class="term-btn-danger mt-3" @click="showPurgeConfirm = true">[ Purge all data ]</button>
    </div>

    <!-- About -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">About</h2>
      <p class="mt-2 text-xs text-terminal-muted">TX_ANALYZER v0.1.0</p>
      <p class="text-xs text-terminal-muted">All data is stored locally in your browser. Nothing is sent to any server.</p>
    </div>

    <TermConfirmModal
      :open="showPurgeConfirm"
      title="Purge all data"
      message="This will permanently delete all transaction data and import history. This action cannot be undone."
      confirm-label="Purge"
      @confirm="purge"
      @cancel="showPurgeConfirm = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../stores/useUiStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { clearRows } from '../utils/storage';
import { useImportHistory } from '../composables/useImportHistory';
import TermConfirmModal from './TermConfirmModal.vue';

const ui = useUiStore();
const tx = useTransactionsStore();
const importHistory = useImportHistory();
const showPurgeConfirm = ref(false);

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

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
    const rows = parsed.rows ?? [];
    tx.setRows(rows);
    importHistory.add(file.name, rows.length);
  });
}

function purge() {
  clearRows();
  tx.setRows([]);
  importHistory.clear();
  showPurgeConfirm.value = false;
}
</script>
