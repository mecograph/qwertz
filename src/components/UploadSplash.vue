<template>
  <section class="rounded-xl bg-white p-6 shadow">
    <h1 class="text-2xl font-semibold">Client-Side Transaction Analyzer</h1>
    <p class="mt-2 text-sm text-slate-600">
      Upload the standardized .xlsx template. All parsing and analytics happen in your browser and stay local.
    </p>
    <div class="mt-4 flex flex-wrap gap-3">
      <input type="file" accept=".xlsx" @change="onFile" class="block w-full max-w-sm rounded border p-2" />
      <button class="rounded bg-slate-900 px-4 py-2 text-white" @click="$emit('resume')">Resume local data</button>
      <a :href="templateHref" download="template.csv" class="rounded border px-4 py-2">Download template</a>
    </div>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'file', file: File): void; (e: 'resume'): void }>()

const csv =
  'Buchungsdatum,Monat,Kategorie,Bezeichnung,Verwendungszweck,Typ,Betrag ABS,Betrag\n2026-01-01,01,Gehalt,Company,Salary,Einnahme,2500,2500'
const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('file', file)
}
</script>
