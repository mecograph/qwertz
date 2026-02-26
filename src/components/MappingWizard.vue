<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Map columns</h2>
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div v-for="field in fields" :key="field.key">
        <label class="text-sm font-medium">{{ field.label }} <span v-if="field.required" class="text-red-600">*</span></label>
        <select class="mt-1 w-full rounded border p-2" :value="mapping[field.key]" @change="set(field.key, $event)">
          <option value="">Not mapped</option>
          <option v-for="header in headers" :key="header" :value="header">{{ header }}</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MappingConfig } from '../types';

const props = defineProps<{ headers: string[]; mapping: MappingConfig }>();
const emit = defineEmits<{ set: [field: keyof MappingConfig, value: string] }>();

const fields = [
  { key: 'date', label: 'Buchungsdatum', required: true },
  { key: 'category', label: 'Kategorie', required: true },
  { key: 'label', label: 'Bezeichnung', required: true },
  { key: 'amount', label: 'Betrag', required: true },
  { key: 'purpose', label: 'Verwendungszweck', required: false },
] as const;

function set(field: keyof MappingConfig, event: Event) {
  emit('set', field, (event.target as HTMLSelectElement).value);
}
</script>
