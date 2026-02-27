<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="term-pane w-[90vw] max-w-5xl max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-terminal-amber">{{ t('diff_title') }}</h2>
          <button class="term-btn px-2 py-1 text-xs" @click="$emit('close')">{{ t('cancel') }}</button>
        </div>
        <div v-if="loading" class="mt-4 text-xs text-terminal-muted">{{ t('diff_loading') }}</div>
        <div v-else-if="error" class="mt-4 text-xs text-terminal-red">{{ error }}</div>
        <div v-else-if="diff" class="mt-4">
          <div class="flex gap-4 text-xs mb-3">
            <span class="text-terminal-green">+{{ diff.summary.added }} {{ t('diff_added') }}</span>
            <span class="text-terminal-red">-{{ diff.summary.removed }} {{ t('diff_removed') }}</span>
            <span class="text-terminal-amber">~{{ diff.summary.modified }} {{ t('diff_modified') }}</span>
            <span class="text-terminal-muted">={{ diff.summary.unchanged }} {{ t('diff_unchanged') }}</span>
          </div>
          <div class="flex gap-2 mb-3">
            <button
              v-for="f in filters"
              :key="f"
              class="px-2 py-1 text-xs border border-terminal-border transition-colors"
              :class="activeFilter === f ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
              @click="activeFilter = f"
            >{{ f }}</button>
          </div>
          <div class="max-h-[55vh] overflow-auto border border-terminal-border">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-terminal-bg">
                <tr>
                  <th class="p-2 text-left text-terminal-amber">{{ t('diff_status') }}</th>
                  <th class="p-2 text-left text-terminal-amber">{{ t('col_date') }}</th>
                  <th class="p-2 text-left text-terminal-amber">{{ t('col_category') }}</th>
                  <th class="p-2 text-left text-terminal-amber">{{ t('col_label') }}</th>
                  <th class="p-2 text-right text-terminal-amber">{{ t('col_amount') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in filteredRows"
                  :key="i"
                  class="border-t border-terminal-border"
                  :class="{
                    'text-terminal-green': row.status === 'added',
                    'text-terminal-red': row.status === 'removed',
                    'text-terminal-amber': row.status === 'modified',
                  }"
                >
                  <td class="p-2">{{ row.status }}</td>
                  <td class="p-2">{{ row.current?.date ?? row.original?.date }}</td>
                  <td class="p-2">{{ row.current?.category ?? row.original?.category }}</td>
                  <td class="p-2">{{ row.current?.label ?? row.original?.label }}</td>
                  <td class="p-2 text-right">{{ row.current?.amount ?? row.original?.amount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useLocale } from '../composables/useLocale';
import { useImportDiff, type DiffResult } from '../composables/useImportDiff';

const props = defineProps<{ importId: string }>();
defineEmits<{ close: [] }>();

const { t } = useLocale();
const { computeDiffForImport } = useImportDiff();

const loading = ref(true);
const error = ref<string | null>(null);
const diff = ref<DiffResult | null>(null);

type FilterType = 'All' | 'Added' | 'Removed' | 'Modified';
const filters: FilterType[] = ['All', 'Added', 'Removed', 'Modified'];
const activeFilter = ref<FilterType>('All');

const filteredRows = computed(() => {
  if (!diff.value) return [];
  if (activeFilter.value === 'All') return diff.value.rows;
  const statusMap: Record<FilterType, string> = { All: '', Added: 'added', Removed: 'removed', Modified: 'modified' };
  return diff.value.rows.filter((r) => r.status === statusMap[activeFilter.value]);
});

onMounted(async () => {
  try {
    diff.value = await computeDiffForImport(props.importId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to compute diff.';
  } finally {
    loading.value = false;
  }
});
</script>
