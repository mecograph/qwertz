<template>
  <section class="space-y-4">
    <!-- Import Data -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_import_data') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('settings_import_desc') }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="term-btn" @click="triggerUploadMore">{{ t('settings_upload_xlsx') }}</button>
        <button class="term-btn" @click="$emit('import-json-more')">{{ t('settings_import_json') }}</button>
      </div>
    </div>

    <!-- Data Management -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_data_management') }}</h2>
      <p class="mt-2 text-sm text-terminal-muted">{{ t('settings_rows_stored') }}: {{ tx.rows.length }}</p>
      <p class="mt-1 text-xs text-terminal-muted">{{ t('settings_daily_import_usage') }}: {{ quota.count }} / 20 · {{ quotaMb }} MB / 120 MB</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="term-btn" @click="exportJson">{{ t('settings_export_json') }}</button>
      </div>
    </div>



    <!-- Analytics Snapshot -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_analytics_snapshot') }}</h2>
      <p v-if="analytics" class="mt-2 text-xs text-terminal-muted">{{ t('settings_analytics_updated') }}: {{ formatHistoryDate(analytics.updatedAt) }}</p>
      <div v-if="analytics" class="mt-3 grid gap-2 sm:grid-cols-2">
        <div class="term-stat text-xs">{{ t('kpi_income') }}: {{ formatCurrency(analytics.totals.income) }}</div>
        <div class="term-stat text-xs">{{ t('kpi_expenses') }}: {{ formatCurrency(analytics.totals.expense) }}</div>
        <div class="term-stat text-xs">{{ t('kpi_net') }}: {{ formatCurrency(analytics.totals.net) }}</div>
        <div class="term-stat text-xs">{{ t('kpi_transactions') }}: {{ analytics.totals.transactions }}</div>
      </div>
      <p v-else class="mt-2 text-xs text-terminal-muted">{{ t('settings_no_analytics') }}</p>
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
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_col_source') }}</th>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_col_status') }}</th>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_col_expires') }}</th>
              <th class="p-2 text-right text-terminal-amber">{{ t('settings_col_rows') }}</th>
              <th class="p-2 text-right text-terminal-amber">{{ t('settings_col_actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in importHistory.history.value" :key="record.id" class="border-t border-terminal-border">
              <td class="p-2">{{ formatHistoryDate(record.timestamp) }}</td>
              <td class="p-2">{{ record.fileName }}</td>
              <td class="p-2">{{ record.source }}</td>
              <td class="p-2" :class="record.status === 'reverted' ? 'text-terminal-red' : ''">{{ record.status }}<span v-if="record.revertedAt" class="ml-1 text-terminal-muted text-[10px]">{{ formatHistoryDate(record.revertedAt) }}</span></td>
              <td class="p-2">
                <span :class="record.daysUntilExpiry <= 7 ? 'text-terminal-amber' : 'text-terminal-muted'">{{ formatExpiry(record.daysUntilExpiry) }}</span>
              </td>
              <td class="p-2 text-right">{{ record.rowCount }}</td>
              <td class="p-2 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    v-if="record.hasEncryptedOriginal && record.status !== 'reverted'"
                    class="term-btn px-2 py-1 text-[11px]"
                    @click="downloadOriginal(record.id)"
                  >{{ t('settings_download_original') }}</button>
                  <button
                    v-if="record.hasEncryptedOriginal && record.status === 'processed'"
                    class="term-btn px-2 py-1 text-[11px]"
                    @click="openDiff(record.id)"
                  >{{ t('settings_compare') }}</button>
                  <button
                    v-if="record.status !== 'reverted'"
                    class="term-btn px-2 py-1 text-[11px] text-terminal-red"
                    @click="confirmRevert(record.id)"
                  >{{ t('settings_revert') }}</button>
                  <button
                    v-if="!record.extensionUsed"
                    class="term-btn px-2 py-1 text-[11px]"
                    @click="extendRetention(record.id)"
                  >{{ t('settings_extend_retention') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-2 text-xs text-terminal-muted">{{ t('settings_no_imports') }}</p>
    </div>



    <!-- Activity Log -->
    <div class="term-pane">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-terminal-amber">{{ t('settings_activity_log') }}</h2>
        <div class="flex gap-2">
          <button class="term-btn px-2 py-1 text-xs" @click="exportOpsLog">{{ t('settings_export_log') }}</button>
          <button class="term-btn px-2 py-1 text-xs" @click="opsLog.clear()">{{ t('settings_clear_log') }}</button>
        </div>
      </div>
      <div v-if="opsLog.entries.length" class="mt-3 max-h-48 overflow-auto border border-terminal-border">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-terminal-bg">
            <tr>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_col_date') }}</th>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_log_level') }}</th>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_log_event') }}</th>
              <th class="p-2 text-left text-terminal-amber">{{ t('settings_log_message') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in opsLog.entries.slice(0, 50)" :key="entry.id" class="border-t border-terminal-border">
              <td class="p-2">{{ formatHistoryDate(entry.createdAt) }}</td>
              <td class="p-2">{{ entry.level }}</td>
              <td class="p-2">{{ entry.event }}</td>
              <td class="p-2">{{ entry.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-2 text-xs text-terminal-muted">{{ t('settings_no_log') }}</p>
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

    <TermConfirmModal
      :open="showRevertConfirm"
      :title="t('settings_revert_title')"
      :message="t('settings_revert_message')"
      :confirm-label="t('settings_revert_confirm')"
      @confirm="executeRevert"
      @cancel="showRevertConfirm = false"
    />

    <ImportDiffView
      v-if="diffImportId"
      :import-id="diffImportId"
      @close="diffImportId = undefined"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { clearRows } from '../utils/storage';
import { useImportHistory } from '../composables/useImportHistory';
import { useLocale } from '../composables/useLocale';
import { useToastStore } from '../stores/useToastStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useOpsLogStore } from '../stores/useOpsLogStore';
import { getImportQuotaState } from '../utils/importGuard';
import { getAnalyticsOverview, type AnalyticsOverview } from '../services/backendClient';
import { useAuthStore } from '../stores/useAuthStore';
import TermConfirmModal from './TermConfirmModal.vue';
import ImportDiffView from './ImportDiffView.vue';

const emit = defineEmits<{ 'upload-more': [file: File]; 'import-json-more': [] }>();

const auth = useAuthStore();
const tx = useTransactionsStore();
const importHistory = useImportHistory();
const { t, lang, formatCurrency } = useLocale();
const showPurgeConfirm = ref(false);
const showRevertConfirm = ref(false);
const revertTargetId = ref<string | undefined>();
const diffImportId = ref<string | undefined>();
const toast = useToastStore();
const notifications = useNotificationStore();
const opsLog = useOpsLogStore();
const quota = computed(() => getImportQuotaState());
const quotaMb = computed(() => (quota.value.bytes / (1024 * 1024)).toFixed(1));
const analytics = ref<AnalyticsOverview | null>(null);

onMounted(async () => {
  importHistory.refresh();
  if (auth.user) analytics.value = await getAnalyticsOverview(auth.user);
});

watch(() => auth.user?.uid, () => {
  refreshAnalytics();
});



async function refreshAnalytics() {
  if (!auth.user) {
    analytics.value = null;
    return;
  }
  analytics.value = await getAnalyticsOverview(auth.user);
}

function formatHistoryDate(ts: number) {
  const loc = lang.value === 'de' ? 'de-DE' : 'en-GB';
  return new Date(ts).toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function triggerUploadMore() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.xlsx';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    emit('upload-more', file);
    refreshAnalytics();
    document.body.removeChild(input);
  };
  input.click();
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


function formatExpiry(days: number) {
  if (days <= 0) return t('settings_expired');
  return `${days} ${t('settings_days_left')}`;
}

async function extendRetention(importId: string) {
  const ok = await importHistory.extendRetention(importId);
  if (ok) {
    toast.push('success', t('settings_extend_retention_ok'));
    notifications.add(t('settings_extend_retention_ok'), t('settings_extend_retention_desc'), 'success');
    refreshAnalytics();
  } else {
    toast.push('warning', t('settings_extend_retention_fail'), 4200);
  }
}

async function downloadOriginal(importId: string) {
  try {
    await importHistory.downloadOriginal(importId);
    toast.push('success', t('settings_download_original_ok'));
  } catch (error) {
    toast.push('error', error instanceof Error ? error.message : t('settings_download_original_fail'), 4200);
  }
}

function confirmRevert(importId: string) {
  revertTargetId.value = importId;
  showRevertConfirm.value = true;
}

async function executeRevert() {
  if (!revertTargetId.value) return;
  await importHistory.revert(revertTargetId.value);
  showRevertConfirm.value = false;
  revertTargetId.value = undefined;
  toast.push('success', t('settings_revert_ok'));
  notifications.add(t('settings_revert_ok'), t('settings_revert_desc'), 'success');
  opsLog.add('info', 'import.revert', 'import reverted');
  refreshAnalytics();
}

function openDiff(importId: string) {
  diffImportId.value = importId;
}

function exportOpsLog() {
  const blob = new Blob([JSON.stringify({ entries: opsLog.entries }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tx-ops-log.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function purge() {
  clearRows();
  tx.setRows([]);
  await importHistory.clear();
  showPurgeConfirm.value = false;
  toast.push('info', t('feedback_data_purged'));
  notifications.add(t('feedback_data_purged_title'), t('feedback_data_purged_desc'), 'warning');
  refreshAnalytics();
  opsLog.add('warning', 'settings.purge', 'local data purged');
}
</script>
