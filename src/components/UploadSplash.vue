<template>
  <div class="rounded-xl bg-white p-8 shadow">
    <h1 class="text-2xl font-bold">Client-Side Transaction Analyzer</h1>
    <p class="mt-2 text-slate-600">Import XLSX/CSV. Your data stays local in your browser.</p>
    <div class="mt-6 flex flex-wrap gap-3">
      <label class="rounded bg-blue-600 px-4 py-2 font-medium text-white cursor-pointer">
        Upload file
        <input class="hidden" type="file" accept=".csv,.xlsx" @change="onChange" />
      </label>
      <button class="rounded border px-4 py-2" @click="$emit('import-json')">Import JSON</button>
      <button class="rounded border px-4 py-2" @click="$emit('continue')">Continue saved dataset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ upload: [file: File]; 'import-json': []; continue: [] }>();

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files?.[0]) return;
  emit('upload', target.files[0]);
}
</script>
