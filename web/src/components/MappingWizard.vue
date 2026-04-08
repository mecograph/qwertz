<template>
  <section class="term-pane">
    <h2 class="text-sm font-bold">$ map_columns</h2>
    <div v-if="mappingStore.aiError" class="mt-2 rounded border border-terminal-amber/40 bg-terminal-amber/10 px-3 py-2 text-xs text-terminal-amber">
      {{ mappingStore.aiError === 'rate_limit' ? t('ai_error_rate_limit') : t('ai_error_generic') }}
    </div>
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
        <p v-if="field.hint" class="mt-1 text-[10px] text-terminal-muted">{{ field.hint }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MappingConfig, MappingField, MappingFieldSuggestion } from '../types';
import { useLocale } from '../composables/useLocale';
import { useMappingStore } from '../stores/useMappingStore';

const props = defineProps<{ headers: string[]; mapping: MappingConfig; suggestions: Partial<Record<MappingField, MappingFieldSuggestion>> }>();
const mappingStore = useMappingStore();
const emit = defineEmits<{ set: [field: keyof MappingConfig, value: string] }>();
const { t } = useLocale();

const hasDescription = computed(() => Boolean(props.mapping.description));

const fields = computed(() => [
  { key: 'date' as const, label: t('mapping_date'), required: true, hint: '' },
  { key: 'amount' as const, label: t('mapping_amount'), required: true, hint: '' },
  { key: 'description' as const, label: t('mapping_description'), required: false, hint: !hasDescription.value ? t('mapping_description_hint') : '' },
  { key: 'category' as const, label: t('mapping_category'), required: !hasDescription.value, hint: '' },
  { key: 'label' as const, label: t('mapping_label'), required: !hasDescription.value, hint: '' },
  { key: 'purpose' as const, label: t('mapping_purpose'), required: false, hint: '' },
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
