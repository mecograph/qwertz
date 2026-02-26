<script setup lang="ts">
const emit = defineEmits<{ upload: [file: File] }>();

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file?.name.endsWith('.xlsx')) emit('upload', file);
}
</script>

<template>
  <section class="mx-auto mt-20 max-w-2xl rounded-xl bg-white p-8 shadow">
    <h1 class="text-2xl font-bold">Client-Side Transaction Analysis</h1>
    <p class="mt-2 text-sm text-slate-600">Upload your standardized Excel template. Data never leaves your browser.</p>
    <div class="mt-6 flex flex-wrap gap-3">
      <label class="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Upload .xlsx
        <input class="hidden" type="file" accept=".xlsx" @change="onFileChange" />
      </label>
      <a class="rounded border px-4 py-2" href="#">Download Template</a>
    </div>
  </section>
</template>
