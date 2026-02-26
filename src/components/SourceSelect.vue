<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Select source</h2>
    <div v-if="sheets.length" class="mt-3">
      <label class="text-sm">Sheet</label>
      <select class="mt-1 w-full rounded border p-2" :value="selectedSheet" @change="onSheet">
        <option v-for="sheet in sheets" :key="sheet.name" :value="sheet.name">{{ sheet.name }}</option>
      </select>
    </div>
    <p class="mt-3 text-xs text-slate-500">Header row detection defaults to row 1 in this MVP.</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{ sheets: { name: string }[]; selectedSheet: string }>();
const emit = defineEmits<{ changeSheet: [name: string] }>();

function onSheet(event: Event) {
  emit('changeSheet', (event.target as HTMLSelectElement).value);
}
</script>
