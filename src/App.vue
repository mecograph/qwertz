<script setup lang="ts">
import { ref } from 'vue';
import UploadSplash from '@/components/UploadSplash.vue';
import AppShell from '@/components/AppShell.vue';
import ProcessingView from '@/components/ProcessingView.vue';
import { useTransactionsStore } from '@/stores/useTransactionsStore';
import { readWorkbook } from '@/utils/xlsxReader';

const txStore = useTransactionsStore();
const isLoaded = ref(txStore.rows.length > 0);
const processingMessage = ref('');
const isProcessing = ref(false);

async function onUpload(file: File) {
  try {
    isProcessing.value = true;
    processingMessage.value = 'Reading workbook and validating rows...';
    const { validRows, errors } = await readWorkbook(file);
    txStore.setRows(validRows, errors);
    isLoaded.value = true;
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <ProcessingView v-if="isProcessing" :message="processingMessage" />
  <UploadSplash v-else-if="!isLoaded" @upload="onUpload" />
  <AppShell v-else />
</template>
