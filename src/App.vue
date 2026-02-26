<template>
  <main class="mx-auto max-w-7xl space-y-4 p-4">
    <UploadSplash v-if="tx.rows.length === 0 && !tx.processing" @file="handleFile" @resume="resume" />
    <ProcessingView v-else-if="tx.processing" />
    <AppShell v-else />

    <section v-if="tx.importErrors.length > 0" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 shadow">
      <h3 class="font-medium">Validation summary ({{ tx.importErrors.length }} errors)</h3>
      <ul class="mt-2 max-h-48 list-disc space-y-1 overflow-auto pl-5">
        <li v-for="err in tx.importErrors.slice(0, 20)" :key="`${err.sheet}-${err.rowIndex}`">
          Sheet {{ err.sheet }} row {{ err.rowIndex }}: {{ err.messages.join(', ') }}
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import AppShell from './components/AppShell.vue'
import ProcessingView from './components/ProcessingView.vue'
import UploadSplash from './components/UploadSplash.vue'
import { useTransactionsStore } from './stores/useTransactionsStore'

const tx = useTransactionsStore()

function handleFile(file: File) {
  tx.importFile(file, true)
}

function resume() {
  // data is auto-loaded from storage in store initialization.
}
</script>
