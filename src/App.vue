<template>
  <AppShell>
    <template #top-right>
      <FilterBar v-if="mappingDone" compact />
    </template>

    <UploadSplash
      v-if="!importStore.rows.length && !tx.rows.length"
      @upload="onUpload"
      @import-json="ui.tab = 'Settings'"
      @continue="noop"
    />

    <template v-else>
      <ProcessingView :active="ui.processing" />
      <SourceSelect
        v-if="!mappingDone"
        :sheets="importStore.sheets"
        :selected-sheet="importStore.selectedSheet"
        @change-sheet="importStore.setSheet"
      />
      <MappingWizard
        v-if="!mappingDone"
        :headers="importStore.headers"
        :mapping="mappingStore.mapping"
        @set="mappingStore.setField"
      />
      <ValidationReview v-if="!mappingDone" :issues="mappingStore.issues" :valid-count="validRows.length" />
      <button v-if="!mappingDone" class="w-fit rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40" :disabled="!mappingStore.isComplete" @click="applyMapping">
        Finish import
      </button>

      <template v-else>
        <DashboardSankey v-show="ui.tab === 'Dashboard'" />
        <ChartsView v-show="ui.tab === 'Charts'" />
        <DataGrid v-show="ui.tab === 'Data'" />
        <SettingsView v-show="ui.tab === 'Settings'" />
      </template>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
import { useImportStore } from './stores/useImportStore';
import { useMappingStore } from './stores/useMappingStore';
import { useTransactionsStore } from './stores/useTransactionsStore';
import { useUiStore } from './stores/useUiStore';
import { normalizeRows } from './utils/validator';

const importStore = useImportStore();
const mappingStore = useMappingStore();
const tx = useTransactionsStore();
const ui = useUiStore();
const mappingDone = ref(tx.rows.length > 0);
const validRows = computed(() => normalizeRows(importStore.rows, mappingStore.mapping).valid);

async function onUpload(file: File) {
  ui.processing = true;
  await importStore.importFile(file);
  mappingStore.autoSuggest(importStore.headers);
  ui.processing = false;
}

function applyMapping() {
  ui.processing = true;
  const result = normalizeRows(importStore.rows, mappingStore.mapping);
  mappingStore.setIssues(result.issues);
  tx.setRows(result.valid);
  mappingDone.value = true;
  ui.processing = false;
}

function noop() {}
</script>
