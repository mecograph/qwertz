<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'file-selected', file: File): void; (e: 'resume'): void }>()
const fileError = ref('')

const onPick = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileError.value = 'Bitte nur .xlsx Dateien auswählen.'
    return
  }
  fileError.value = ''
  emit('file-selected', file)
}
</script>

<template>
  <section class="mx-auto mt-12 max-w-3xl rounded-xl bg-white p-8 shadow">
    <h1 class="text-2xl font-bold">Client-Side Transaction Analysis</h1>
    <p class="mt-2 text-sm text-slate-600">Upload einer standardisierten Excel-Datei. Keine Daten verlassen den Browser.</p>

    <div class="mt-6 flex flex-wrap gap-3">
      <label class="cursor-pointer rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
        <input class="hidden" type="file" accept=".xlsx" @change="onPick" />
        .xlsx hochladen
      </label>
      <button class="rounded border border-slate-300 px-4 py-2" @click="emit('resume')">Aus localStorage fortsetzen</button>
      <a class="rounded border border-slate-300 px-4 py-2" download="template.csv" href="/template.csv">Template herunterladen</a>
    </div>
    <p v-if="fileError" class="mt-3 text-sm text-rose-600">{{ fileError }}</p>
  </section>
</template>
