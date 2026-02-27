<template>
  <AppShell :mode="appMode">
    <template #top-right>
      <FilterBar v-if="mappingDone" />
    </template>

    <UploadSplash
      v-if="!importStore.rows.length && !tx.rows.length"
      @upload="onUpload"
      @import-json="onImportJson"
      @continue="noop"
    />

    <template v-else>
      <ProcessingView :active="ui.processing" />
      <div v-if="!mappingDone" class="space-y-4">
        <SourceSelect
          :sheets="importStore.sheets"
          :selected-sheet="importStore.selectedSheet"
          @change-sheet="importStore.setSheet"
        />
        <MappingWizard
          :headers="importStore.headers"
          :mapping="mappingStore.mapping"
          @set="mappingStore.setField"
        />
        <ValidationReview :issues="mappingStore.issues" :valid-count="validRows.length" />
        <div class="flex lg:justify-end">
          <button class="term-btn w-full disabled:opacity-40 lg:w-auto" :disabled="!mappingStore.isComplete" @click="applyMapping">
            {{ t('finish_import') }}
          </button>
        </div>
      </div>

      <template v-else>
        <div class="h-full min-h-0">
          <DashboardSankey v-show="ui.tab === 'Dashboard'" class="h-full" />
          <ChartsView v-show="ui.tab === 'Charts'" class="h-full overflow-auto" />
          <DataGrid v-show="ui.tab === 'Data'" class="h-full" />
          <SettingsView v-show="ui.tab === 'Settings'" class="h-full overflow-auto" @upload-more="onUpload" @import-json-more="onImportJson" />
        </div>
      </template>
    </template>
  </AppShell>

  <ToastHost />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppShell from './components/AppShell.vue';
import UploadSplash from './components/UploadSplash.vue';
import SourceSelect from './components/SourceSelect.vue';
import MappingWizard from './components/MappingWizard.vue';
import ValidationReview from './components/ValidationReview.vue';
import ProcessingView from './components/ProcessingView.vue';
import FilterBar from './components/FilterBar.vue';
import DashboardSankey from './components/DashboardSankey.vue';
import ChartsView from './components/ChartsView.vue';
import DataGrid from './components/DataGrid.vue';
import SettingsView from './components/SettingsView.vue';
import ToastHost from './components/ToastHost.vue';
import { useImportStore } from './stores/useImportStore';
import { useMappingStore } from './stores/useMappingStore';
import { useTransactionsStore } from './stores/useTransactionsStore';
import { useUiStore } from './stores/useUiStore';
import { normalizeRows } from './utils/validator';
import { useImportHistory } from './composables/useImportHistory';
import { useLocale } from './composables/useLocale';
import { useToastStore } from './stores/useToastStore';
import { useNotificationStore } from './stores/useNotificationStore';
import { toAppError } from './utils/appError';

const importStore = useImportStore();
const mappingStore = useMappingStore();
const tx = useTransactionsStore();
const ui = useUiStore();
const importHistory = useImportHistory();
const toast = useToastStore();
const notifications = useNotificationStore();
const { t } = useLocale();
const mappingDone = ref(tx.rows.length > 0);
const validRows = computed(() => normalizeRows(importStore.rows, mappingStore.mapping).valid);

const appMode = computed<'splash' | 'wizard' | 'app'>(() => {
  if (!importStore.rows.length && !tx.rows.length) return 'splash';
  if (!mappingDone.value) return 'wizard';
  return 'app';
});

const handleHashChange = () => ui.syncTabFromLocation();

onMounted(() => {
  ui.syncTabFromLocation();
  window.addEventListener('hashchange', handleHashChange);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange);
});

async function onUpload(file: File) {
  try {
    ui.processing = true;
    await importStore.importFile(file);
    mappingStore.autoSuggest(importStore.headers);
    mappingDone.value = false;
    toast.push('success', `Imported ${file.name}`);
    notifications.add('Import complete', `${file.name} uploaded and parsed.`, 'success');
  } catch (error) {
    const appError = toAppError(error, 'Import failed. Please try again.');
    toast.push('error', appError.message, 4200);
    notifications.add('Import failed', appError.message, 'error');
  } finally {
    ui.processing = false;
  }
}

function onImportJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((raw) => {
      const parsed = JSON.parse(raw);
      const rows = parsed.rows ?? [];
      if (tx.rows.length > 0) {
        tx.addRows(rows);
      } else {
        tx.setRows(rows);
      }
      importHistory.add(file.name, rows.length);
      mappingDone.value = true;
      toast.push('success', `Imported JSON ${file.name}`);
      notifications.add('JSON import complete', `${file.name} merged into current dataset.`, 'success');
    }).catch((error) => {
      const appError = toAppError(error, 'JSON import failed.');
      toast.push('error', appError.message, 4200);
      notifications.add('JSON import failed', appError.message, 'error');
    });
  };
  input.click();
}

function applyMapping() {
  try {
    ui.processing = true;
    const result = normalizeRows(importStore.rows, mappingStore.mapping);
    mappingStore.setIssues(result.issues);
    if (tx.rows.length > 0) {
      tx.addRows(result.valid);
    } else {
      tx.setRows(result.valid);
    }
    importHistory.add(importStore.fileName || 'unknown', result.valid.length);
    mappingDone.value = true;
    toast.push('success', `Mapped ${result.valid.length} rows`);
    notifications.add('Mapping applied', `${result.valid.length} rows are now active.`, 'success');
    if (result.issues.length > 0) {
      toast.push('warning', `${result.issues.length} validation issues found`, 4200);
      notifications.add('Validation issues', `${result.issues.length} rows need attention.`, 'warning');
    }
  } catch (error) {
    const appError = toAppError(error, 'Failed to apply mapping.');
    toast.push('error', appError.message, 4200);
    notifications.add('Mapping failed', appError.message, 'error');
  } finally {
    ui.processing = false;
  }
}

function noop() {}
</script>
