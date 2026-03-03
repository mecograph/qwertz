<template>
  <section class="term-pane">
    <h2 class="text-sm font-bold">$ map_columns</h2>
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div v-for="field in fields" :key="field.key">
        <label class="text-xs text-terminal-amber">{{ field.label }} <span v-if="field.required" class="text-terminal-red">*</span></label>
        <div v-if="suggestions[field.key]" class="mt-1 flex items-center gap-2 text-[10px]">
          <span :class="confidenceClass(suggestions[field.key]?.confidence ?? 0)">
            {{ t('mapping_confidence') }}: {{ toPercent(suggestions[field.key]?.confidence ?? 0) }}
          </span>
          <span
            v-if="suggestions[field.key]?.reasons?.includes('ai_suggest')"
            class="rounded bg-terminal-amber/20 px-1.5 py-0.5 text-terminal-amber"
          >{{ t('mapping_ai_assisted') }}</span>
        </div>
        <select class="term-select mt-1 w-full" :value="mapping[field.key]" @change="set(field.key, $event)">
          <option value="">{{ t('mapping_not_mapped') }}</option>
          <option v-for="header in headers" :key="header" :value="header">{{ header }}</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MappingConfig, MappingField, MappingFieldSuggestion } from '../types';
import { useLocale } from '../composables/useLocale';

const props = defineProps<{ headers: string[]; mapping: MappingConfig; suggestions: Partial<Record<MappingField, MappingFieldSuggestion>> }>();
const emit = defineEmits<{ set: [field: keyof MappingConfig, value: string] }>();
const { t } = useLocale();

const fields = computed(() => [
  { key: 'date' as const, label: t('mapping_date'), required: true },
  { key: 'category' as const, label: t('mapping_category'), required: true },
  { key: 'label' as const, label: t('mapping_label'), required: true },
  { key: 'amount' as const, label: t('mapping_amount'), required: true },
  { key: 'purpose' as const, label: t('mapping_purpose'), required: false },
]);

function set(field: keyof MappingConfig, event: Event) {
  emit('set', field, (event.target as HTMLSelectElement).value);
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function confidenceClass(score: number): string {
  if (score >= 0.6) return 'text-terminal-green';
  if (score >= 0.3) return 'text-terminal-amber';
  return 'text-terminal-red';
}
</script>
