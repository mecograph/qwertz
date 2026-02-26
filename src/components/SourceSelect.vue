<template>
  <section class="term-pane">
    <h2 class="text-sm font-bold">$ select_source</h2>
    <div v-if="sheets.length" class="mt-3">
      <label class="text-xs text-terminal-amber">Sheet</label>
      <select class="term-select mt-1 w-full" :value="selectedSheet" @change="onSheet">
        <option v-for="sheet in sheets" :key="sheet.name" :value="sheet.name">{{ sheet.name }}</option>
      </select>
    </div>
    <p class="mt-3 text-xs text-terminal-muted">$ header_row=1 # default for this MVP</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{ sheets: { name: string }[]; selectedSheet: string }>();
const emit = defineEmits<{ changeSheet: [name: string] }>();

function onSheet(event: Event) {
  emit('changeSheet', (event.target as HTMLSelectElement).value);
}
</script>
