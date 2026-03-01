<template>
  <section class="term-pane">
    <h2 class="text-sm font-bold">$ select_source</h2>
    <div v-if="nonEmptySheets.length > 1" class="mt-4">
      <p class="text-xs text-terminal-amber">{{ t('source_sheet') }}</p>
      <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <button
          v-for="sheet in nonEmptySheets"
          :key="sheet.name"
          class="flex flex-col items-center gap-2 border p-4 transition-colors"
          :class="selectedSheet === sheet.name
            ? 'border-terminal-green bg-terminal-green-dim text-terminal-green'
            : 'border-terminal-border text-terminal-muted hover:border-terminal-green hover:text-terminal-green'"
          @click="$emit('changeSheet', sheet.name)"
        >
          <!-- Sheet icon -->
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="0"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
          <span class="text-xs font-medium truncate max-w-full">{{ sheet.name }}</span>
        </button>
      </div>
    </div>
    <div v-else-if="nonEmptySheets.length === 1" class="mt-4">
      <p class="text-xs text-terminal-amber">{{ t('source_sheet') }}</p>
      <div class="mt-2">
        <div class="inline-flex flex-col items-center gap-2 border border-terminal-green bg-terminal-green-dim p-4 text-terminal-green">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="0"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
          <span class="text-xs font-medium">{{ nonEmptySheets[0].name }}</span>
        </div>
      </div>
    </div>
    <p class="mt-3 text-xs text-terminal-muted">{{ t('source_header_note') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocale } from '../composables/useLocale';

const props = defineProps<{ sheets: { name: string; rows: Record<string, string>[] }[]; selectedSheet: string }>();
const nonEmptySheets = computed(() => props.sheets.filter((s) => s.rows.length > 0));
defineEmits<{ changeSheet: [name: string] }>();
const { t } = useLocale();
</script>
