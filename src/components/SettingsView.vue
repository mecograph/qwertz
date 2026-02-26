<template>
  <section class="space-y-4">
    <!-- Import Data -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_import_data') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('settings_import_desc') }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <label class="term-btn cursor-pointer">
          {{ t('settings_upload_xlsx') }}
          <input class="hidden" type="file" accept=".csv,.xlsx" @change="onUploadMore" />
        </label>
        <button class="term-btn" @click="$emit('import-json-more')">{{ t('settings_import_json') }}</button>
      </div>
    </div>

    <!-- Appearance -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_appearance') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('settings_appearance_desc') }}</p>
      <div class="mt-3 flex w-48 border border-terminal-border">
        <button
          class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
          :class="ui.theme === 'dark' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="ui.setTheme('dark')"
        >
          {{ t('settings_dark') }}
        </button>
        <button
          class="flex-1 border-l border-terminal-border px-3 py-1.5 text-xs font-medium transition-colors"
          :class="ui.theme === 'light' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="ui.setTheme('light')"
        >
          {{ t('settings_light') }}
        </button>
      </div>
    </div>

    <!-- Language -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_language') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('settings_language_desc') }}</p>
      <div class="mt-3 flex w-48 border border-terminal-border">
        <button
          class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
          :class="lang === 'en' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="localeStore.setLang('en')"
        >
          English
        </button>
        <button
          class="flex-1 border-l border-terminal-border px-3 py-1.5 text-xs font-medium transition-colors"
          :class="lang === 'de' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="localeStore.setLang('de')"
        >
          Deutsch
        </button>
      </div>
    </div>

    <!-- Data Management -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_data_management') }}</h2>
      <p class="mt-2 text-sm text-terminal-muted">{{ t('settings_rows_stored') }}: {{ tx.rows.length }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="term-btn" @click="exportJson">{{ t('settings_export_json') }}</button>
      </div>
    </div>

    <!-- Import History -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_import_history') }}</h2>
      <div v-if="importHistory.history.value.length" class="mt-3 max-h-48 overflow-auto border border-terminal-border">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-terminal-bg">
            <tr>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_col_date') }}</th>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_col_filename') }}</th>
              <th class="p-2 text-right text-terminal-amber">{{ t('settings_col_rows') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in importHistory.history.value" :key="record.id" class="border-t border-terminal-border">
              <td class="p-2">{{ formatHistoryDate(record.timestamp) }}</td>
              <td class="p-2">{{ record.fileName }}</td>
              <td class="p-2 text-right">{{ record.rowCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-2 text-xs text-terminal-muted">{{ t('settings_no_imports') }}</p>
    </div>

    <!-- Danger Zone -->
    <div class="term-pane border-terminal-red">
      <h2 class="text-sm font-bold text-terminal-red">{{ t('settings_danger_zone') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('settings_danger_desc') }}</p>
      <button class="term-btn-danger mt-3" @click="showPurgeConfirm = true">{{ t('settings_purge') }}</button>
    </div>

    <!-- About -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_about') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('settings_version') }}</p>
      <p class="text-xs text-terminal-muted">{{ t('settings_about_desc') }}</p>
    </div>

    <TermConfirmModal
      :open="showPurgeConfirm"
      :title="t('settings_purge_title')"
      :message="t('settings_purge_message')"
      :confirm-label="t('settings_purge_confirm')"
      @confirm="purge"
      @cancel="showPurgeConfirm = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../stores/useUiStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { clearRows } from '../utils/storage';
import { useImportHistory } from '../composables/useImportHistory';
import { useLocale } from '../composables/useLocale';
import TermConfirmModal from './TermConfirmModal.vue';

const emit = defineEmits<{ 'upload-more': [file: File]; 'import-json-more': [] }>();

const ui = useUiStore();
const tx = useTransactionsStore();
const localeStore = useLocaleStore();
const importHistory = useImportHistory();
const { t, lang } = useLocale();
const showPurgeConfirm = ref(false);

function formatHistoryDate(ts: number) {
  const loc = lang.value === 'de' ? 'de-DE' : 'en-GB';
  return new Date(ts).toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function onUploadMore(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  emit('upload-more', file);
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

function purge() {
  clearRows();
  tx.setRows([]);
  importHistory.clear();
  showPurgeConfirm.value = false;
}
</script>
