<template>
  <AppShell :mode="appMode">
    <template #top-right>
      <FilterBar v-if="mappingDone" />
    </template>

    <AuthGate v-if="!auth.isAuthenticated" />

    <UploadSplash
      v-else-if="!importStore.rows.length && !tx.rows.length"
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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
import AuthGate from './components/AuthGate.vue';
import ToastHost from './components/ToastHost.vue';
import { useImportStore } from './stores/useImportStore';
import { useMappingStore } from './stores/useMappingStore';
import { useTransactionsStore } from './stores/useTransactionsStore';
import { useUiStore } from './stores/useUiStore';
import { useAuthStore } from './stores/useAuthStore';
import { normalizeRows } from './utils/validator';
import { useImportHistory } from './composables/useImportHistory';
import { useLocale } from './composables/useLocale';
import { useToastStore } from './stores/useToastStore';
import { useNotificationStore } from './stores/useNotificationStore';
import { toAppError } from './utils/appError';
import { useOpsLogStore } from './stores/useOpsLogStore';
import { recordImport, validateImport } from './utils/importGuard';
import { encryptAndStoreOriginal } from './services/backendClient';

const importStore = useImportStore();
const mappingStore = useMappingStore();
const tx = useTransactionsStore();
const ui = useUiStore();
const auth = useAuthStore();
const importHistory = useImportHistory();
const toast = useToastStore();
const notifications = useNotificationStore();
const opsLog = useOpsLogStore();
const { t } = useLocale();
const mappingDone = ref(tx.rows.length > 0);
const validRows = computed(() => normalizeRows(importStore.rows, mappingStore.mapping).valid);

const appMode = computed<'splash' | 'wizard' | 'app'>(() => {
  if (!auth.isAuthenticated) return 'splash';
  if (!importStore.rows.length && !tx.rows.length) return 'splash';
  if (!mappingDone.value) return 'wizard';
  return 'app';
});

const handleHashChange = () => ui.syncTabFromLocation();

async function runRetentionSweepWithFeedback() {
  const result = await importHistory.runRetentionSweep();
  result.reminders.forEach((item) => {
    const msg = `${item.fileName}: ${item.daysLeft} ${t('feedback_retention_days_left')}`;
    notifications.add(t('feedback_retention_reminder'), msg, 'warning');
    opsLog.add('warning', 'retention.reminder', msg);
  });

  result.expired.forEach((item) => {
    notifications.add(t('feedback_retention_expired'), item.fileName, 'warning');
    opsLog.add('warning', 'retention.expired', item.fileName);
  });
}

onMounted(() => {
  ui.syncTabFromLocation();
  window.addEventListener('hashchange', handleHashChange);
  importHistory.refresh();
  runRetentionSweepWithFeedback();
});

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange);
});

watch(() => auth.user?.uid, () => {
  importHistory.refresh();
  runRetentionSweepWithFeedback();
});

async function onUpload(file: File) {
  const decision = validateImport(file.size);
  if (!decision.allowed) {
    const reason = decision.reason === 'size_limit'
      ? t('feedback_import_blocked_size')
      : decision.reason === 'daily_count_limit'
        ? t('feedback_import_blocked_daily_count')
        : t('feedback_import_blocked_daily_bytes');
    toast.push('warning', reason, 4200);
    notifications.add(t('feedback_import_blocked'), reason, 'warning');
    opsLog.add('warning', 'import.blocked', reason);
    return;
  }

  try {
    if (!auth.user) throw new Error('Not authenticated');
    ui.processing = true;
    const encryptedOriginal = await encryptAndStoreOriginal(auth.user, file);
    await importStore.importFile(file);
    mappingStore.autoSuggest(importStore.headers);
    mappingDone.value = false;
    recordImport(file.size);
    await importHistory.add(file.name, importStore.rows.length, {
      fileSize: file.size,
      source: 'csv-xlsx',
      status: 'uploaded',
      mimeType: encryptedOriginal.mimeType,
      encryptedOriginal: {
        storageBlobId: encryptedOriginal.storageBlobId,
        wrappedDek: encryptedOriginal.wrappedDek,
      },
    });
    toast.push('success', `${t('feedback_import_complete')}: ${file.name}`);
    notifications.add(t('feedback_import_complete'), `${file.name} ${t('feedback_import_complete_desc')}`, 'success');
    opsLog.add('info', 'import.complete', file.name);
  } catch (error) {
    const appError = toAppError(error, 'Import failed. Please try again.');
    toast.push('error', appError.message, 4200);
    notifications.add(t('feedback_import_failed'), appError.message, 'error');
    opsLog.add('error', 'import.failed', appError.message);
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

    const decision = validateImport(file.size);
    if (!decision.allowed) {
      const reason = decision.reason === 'size_limit'
        ? t('feedback_import_blocked_size')
        : decision.reason === 'daily_count_limit'
          ? t('feedback_import_blocked_daily_count')
          : t('feedback_import_blocked_daily_bytes');
      toast.push('warning', reason, 4200);
      notifications.add(t('feedback_import_blocked'), reason, 'warning');
      opsLog.add('warning', 'import.blocked', reason);
      return;
    }
    file.text().then(async (raw) => {
      if (!auth.user) throw new Error('Not authenticated');
      const encryptedOriginal = await encryptAndStoreOriginal(auth.user, file);
      const parsed = JSON.parse(raw);
      const rows = parsed.rows ?? [];
      if (tx.rows.length > 0) {
        tx.addRows(rows);
      } else {
        tx.setRows(rows);
      }
      await importHistory.add(file.name, rows.length, {
        fileSize: file.size,
        source: 'json',
        status: 'processed',
        mimeType: encryptedOriginal.mimeType,
        encryptedOriginal: {
          storageBlobId: encryptedOriginal.storageBlobId,
          wrappedDek: encryptedOriginal.wrappedDek,
        },
      });
      mappingDone.value = true;
      recordImport(file.size);
      toast.push('success', `${t('feedback_json_import_complete')}: ${file.name}`);
      notifications.add(t('feedback_json_import_complete'), `${file.name} ${t('feedback_json_import_complete_desc')}`, 'success');
      opsLog.add('info', 'import.json.complete', file.name);
    }).catch((error) => {
      const appError = toAppError(error, 'JSON import failed.');
      toast.push('error', appError.message, 4200);
      notifications.add(t('feedback_json_import_failed'), appError.message, 'error');
      opsLog.add('error', 'import.json.failed', appError.message);
    });
  };
  input.click();
}

async function applyMapping() {
  try {
    ui.processing = true;
    const result = normalizeRows(importStore.rows, mappingStore.mapping);
    mappingStore.setIssues(result.issues);
    if (tx.rows.length > 0) {
      tx.addRows(result.valid);
    } else {
      tx.setRows(result.valid);
    }
    await importHistory.add(importStore.fileName || 'unknown', result.valid.length, { source: 'csv-xlsx', status: 'processed' });
    mappingDone.value = true;
    toast.push('success', `${t('feedback_mapping_applied')}: ${result.valid.length}`);
    notifications.add(t('feedback_mapping_applied'), `${result.valid.length} ${t('feedback_mapping_applied_desc')}`, 'success');
    opsLog.add('info', 'mapping.applied', String(result.valid.length));
    if (result.issues.length > 0) {
      toast.push('warning', `${result.issues.length} ${t('feedback_mapping_issues')}`, 4200);
      notifications.add(t('feedback_mapping_issues'), `${result.issues.length} ${t('feedback_mapping_issues_desc')}`, 'warning');
      opsLog.add('warning', 'mapping.issues', String(result.issues.length));
    }
  } catch (error) {
    const appError = toAppError(error, 'Failed to apply mapping.');
    toast.push('error', appError.message, 4200);
    notifications.add(t('feedback_mapping_failed'), appError.message, 'error');
    opsLog.add('error', 'mapping.failed', appError.message);
  } finally {
    ui.processing = false;
  }
}

function noop() {}
</script>
