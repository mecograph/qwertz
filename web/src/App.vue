<template>
  <AppShell :mode="appMode">
    <template #top-right>
      <FilterBar v-if="mappingDone" />
    </template>

    <div v-if="auth.initializing" class="flex flex-col items-center justify-center gap-4 py-20">
      <div class="h-1 w-48 overflow-hidden bg-terminal-green-dim" :style="{ borderRadius: ui.theme === 'light' ? '9999px' : '0' }">
        <div class="h-full w-1/2 animate-pulse bg-terminal-green" :style="{ borderRadius: ui.theme === 'light' ? '9999px' : '0' }"></div>
      </div>
    </div>

    <AuthGate v-else-if="!auth.isAuthenticated" />

    <PassphraseGate
      v-else-if="!cryptoGate.unlocked.value"
      :is-setup="cryptoGate.needsSetup.value"
      @purge="showPurgeFromPassphrase"
    />

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
          <ChartsView v-show="ui.tab === 'Charts'" class="h-full overflow-auto pb-20 lg:pb-0" />
          <DataGrid v-show="ui.tab === 'Data'" class="h-full" />
          <SettingsView v-show="ui.tab === 'Settings'" class="h-full overflow-auto pb-20 lg:pb-0" @upload-more="onUpload" @import-json-more="onImportJson" />
          <ProfileView v-show="ui.tab === 'Profile'" class="h-full overflow-auto pb-20 lg:pb-0" />
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
import ProfileView from './components/ProfileView.vue';
import AuthGate from './components/AuthGate.vue';
import PassphraseGate from './components/PassphraseGate.vue';
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
import { encryptAndStoreOriginal, materializeAnalyticsOverview, writeImportEvent } from './services/backendClient';
import { useCryptoGate } from './composables/useCryptoGate';

const importStore = useImportStore();
const mappingStore = useMappingStore();
const tx = useTransactionsStore();
const ui = useUiStore();
const auth = useAuthStore();
const importHistory = useImportHistory();
const toast = useToastStore();
const notifications = useNotificationStore();
const opsLog = useOpsLogStore();
const cryptoGate = useCryptoGate();
const { t } = useLocale();
const mappingDone = ref(tx.rows.length > 0);
const currentImportId = ref<string | undefined>();
const validRows = computed(() => normalizeRows(importStore.rows, mappingStore.mapping).valid);

const appMode = computed<'splash' | 'wizard' | 'app'>(() => {
  if (auth.initializing) return 'splash';
  if (!auth.isAuthenticated) return 'splash';
  if (!importStore.rows.length && !tx.rows.length) return 'splash';
  if (!mappingDone.value) return 'wizard';
  return 'app';
});

const handleHashChange = () => ui.syncTabFromLocation();


async function syncAnalytics() {
  if (!auth.user) return;
  await materializeAnalyticsOverview(auth.user, tx.rows);
}

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

onMounted(async () => {
  ui.syncTabFromLocation();
  window.addEventListener('hashchange', handleHashChange);

  try {
    const completed = await auth.completeSignInFromUrl();
    if (completed) {
      toast.push('success', t('auth_signed_in'));
      notifications.add(t('auth_signed_in'), auth.user?.email ?? '', 'success');
      opsLog.add('info', 'auth.email_link.completed', auth.user?.email ?? 'unknown');
    }
  } catch (error) {
    const appError = toAppError(error, t('auth_complete_failed'));
    toast.push('error', appError.message, 4200);
    notifications.add(t('auth_failed'), appError.message, 'error');
    opsLog.add('error', 'auth.email_link.failed', appError.message);
  }

  notifications.refresh();
  importHistory.refresh();
  runRetentionSweepWithFeedback();
  syncAnalytics();
});

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange);
});

watch(() => auth.user?.uid, () => {
  notifications.refresh();
  importHistory.refresh();
  runRetentionSweepWithFeedback();
  syncAnalytics();
});

watch(() => tx.rows, () => {
  syncAnalytics();
}, { deep: true });

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
    const importId = await importHistory.add(file.name, importStore.rows.length, {
      fileSize: file.size,
      source: 'csv-xlsx',
      status: 'uploaded',
      mimeType: encryptedOriginal.mimeType,
      encryptedOriginal: {
        storageBlobId: encryptedOriginal.storageBlobId,
        wrappedDek: encryptedOriginal.wrappedDek,
      },
    });
    currentImportId.value = importId;
    if (auth.user && importId) {
      await writeImportEvent(auth.user, importId, { type: 'upload' });
    }
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
      const importId = await importHistory.add(file.name, rows.length, {
        fileSize: file.size,
        source: 'json',
        status: 'processed',
        mimeType: encryptedOriginal.mimeType,
        encryptedOriginal: {
          storageBlobId: encryptedOriginal.storageBlobId,
          wrappedDek: encryptedOriginal.wrappedDek,
        },
      });
      const taggedRows = rows.map((r: any) => ({ ...r, importId }));
      if (tx.rows.length > 0) {
        tx.addRows(taggedRows);
      } else {
        tx.setRows(taggedRows);
      }
      if (auth.user && importId) {
        await writeImportEvent(auth.user, importId, { type: 'upload' });
      }
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
    const taggedRows = result.valid.map((r) => ({ ...r, importId: currentImportId.value }));
    if (tx.rows.length > 0) {
      tx.addRows(taggedRows);
    } else {
      tx.setRows(taggedRows);
    }
    await importHistory.add(importStore.fileName || 'unknown', result.valid.length, {
      source: 'csv-xlsx',
      status: 'processed',
      mappingConfig: { ...mappingStore.mapping },
    });
    if (auth.user && currentImportId.value) {
      await writeImportEvent(auth.user, currentImportId.value, { type: 'transform' });
    }
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

function showPurgeFromPassphrase() {
  // Navigate to Settings and let user purge from there
  ui.setTab('Settings');
}

function noop() {}
</script>
