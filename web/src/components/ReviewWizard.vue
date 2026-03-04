<template>
  <section class="term-pane space-y-4">
    <h2 class="text-sm font-bold">$ {{ t('review_title') }}</h2>

    <!-- AI progress -->
    <div v-if="catStore.aiRunning" class="flex items-center gap-2 text-xs text-terminal-amber">
      <span class="animate-pulse">{{ t('review_ai_running') }}</span>
      <span>{{ catStore.aiProgress.done }} / {{ catStore.aiProgress.total }}</span>
    </div>

    <!-- AI error banner -->
    <div v-if="catStore.aiError" class="rounded border border-terminal-amber/40 bg-terminal-amber/10 px-3 py-2 text-xs text-terminal-amber">
      {{ catStore.aiError === 'rate_limit' ? t('ai_error_rate_limit') : t('ai_error_generic') }}
    </div>

    <!-- Summary bar -->
    <div class="flex flex-wrap items-center gap-3 text-xs">
      <span class="text-terminal-green">
        {{ catStore.pending.length }} rows &mdash;
        {{ catStore.reviewStats.byRule }} rule,
        {{ catStore.reviewStats.byAi }} AI,
        {{ catStore.reviewStats.byCsv }} CSV
      </span>
      <span class="text-terminal-amber">
        {{ catStore.pending.filter(p => !p.reviewed).length }} {{ t('review_edit') }}
      </span>
    </div>

    <!-- Action buttons -->
    <div class="flex flex-wrap gap-2">
      <button class="term-btn px-3 py-1.5 text-xs" @click="catStore.confirmAllHighConfidence()">
        {{ t('review_confirm_high') }}
      </button>
      <button class="term-btn px-3 py-1.5 text-xs" @click="catStore.confirmAll()">
        {{ t('review_confirm_all') }}
      </button>
    </div>

    <!-- Review table -->
    <div class="max-h-[60vh] overflow-auto">
      <table class="w-full text-xs">
        <thead class="sticky top-0 z-10 bg-terminal-bg">
          <tr>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber">{{ t('col_description') }}</th>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber">{{ t('col_category') }}</th>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber">{{ t('col_label') }}</th>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber">{{ t('col_purpose') }}</th>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber">{{ t('mapping_confidence') }}</th>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber">Source</th>
            <th class="whitespace-nowrap border-b border-terminal-border px-2 py-2 text-left text-terminal-amber"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in pagedRows"
            :key="item.txId"
            class="border-b border-terminal-border"
            :class="rowTint(item)"
          >
            <!-- Description (read-only) -->
            <td class="max-w-[200px] truncate whitespace-nowrap px-2 py-1.5" :title="item.description">
              {{ item.description || '—' }}
            </td>

            <!-- Category dropdown -->
            <td class="px-2 py-1.5">
              <select
                class="term-select w-full px-1 py-0 text-xs"
                :value="item.category"
                @change="onCategoryChange(item.txId, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ t('review_no_category') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.label[locale] || cat.label.en }}
                </option>
              </select>
            </td>

            <!-- Label dropdown (filtered by category) -->
            <td class="px-2 py-1.5">
              <select
                class="term-select w-full px-1 py-0 text-xs"
                :value="item.label"
                @change="onLabelChange(item.txId, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ t('review_no_label') }}</option>
                <option v-for="sub in getSubcats(item.category)" :key="sub.id" :value="sub.id">
                  {{ sub.label[locale] || sub.label.en }}
                </option>
              </select>
            </td>

            <!-- Purpose (editable) -->
            <td class="px-2 py-1.5">
              <input
                class="term-input w-full px-1 py-0 text-xs"
                :value="item.purpose"
                @blur="onPurposeChange(item.txId, ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
            </td>

            <!-- Confidence badge -->
            <td class="whitespace-nowrap px-2 py-1.5">
              <span :class="confidenceClass(item.confidence)" class="rounded px-1.5 py-0.5">
                {{ Math.round(item.confidence * 100) }}%
              </span>
            </td>

            <!-- Source badge -->
            <td class="whitespace-nowrap px-2 py-1.5">
              <span :class="sourceBadgeClass(item.source)" class="rounded px-1.5 py-0.5">
                {{ sourceLabel(item.source) }}
              </span>
            </td>

            <!-- Confirm button -->
            <td class="whitespace-nowrap px-2 py-1.5">
              <button
                v-if="!item.reviewed"
                class="term-btn px-2 py-1 text-[10px]"
                @click="catStore.confirmRow(item.txId)"
              >{{ t('review_confirm') }}</button>
              <span v-else class="text-terminal-green text-[10px]">{{ t('review_confirmed') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between text-xs">
      <span class="text-terminal-muted">{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, catStore.pending.length) }} / {{ catStore.pending.length }}</span>
      <div class="flex items-center gap-2">
        <button class="term-btn px-2 py-1 text-xs disabled:opacity-40" :disabled="page === 1" @click="page--">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="term-btn px-2 py-1 text-xs disabled:opacity-40" :disabled="page >= totalPages" @click="page++">&gt;</button>
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="flex gap-2 lg:justify-end">
      <button class="term-btn w-full border-terminal-green/40 text-terminal-green/60 hover:border-terminal-green hover:text-terminal-green lg:w-auto" @click="$emit('back')">
        {{ t('review_back') }}
      </button>
      <button class="term-btn w-full lg:w-auto" @click="$emit('finish')">
        {{ t('review_finish') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCatStore } from '../stores/useCatStore';
import { useLocale } from '../composables/useLocale';
import { useLocaleStore } from '../stores/useLocaleStore';
import { getAllCategories, getSubcategoriesFor } from '../data/categoryTaxonomy';
import type { PendingCategorization } from '../types';

defineEmits<{ back: []; finish: [] }>();

const catStore = useCatStore();
const { t } = useLocale();
const localeStore = useLocaleStore();
const locale = computed(() => localeStore.lang);
const page = ref(1);
const pageSize = 50;

const categories = computed(() => getAllCategories(catStore.profile.customCategories));
const totalPages = computed(() => Math.max(1, Math.ceil(catStore.pending.length / pageSize)));

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize;
  return catStore.pending.slice(start, start + pageSize);
});

function getSubcats(categoryId: string) {
  return getSubcategoriesFor(categoryId, catStore.profile.customCategories);
}

function onCategoryChange(txId: string, category: string) {
  const subcats = getSubcategoriesFor(category, catStore.profile.customCategories);
  catStore.updatePending(txId, {
    category,
    label: subcats.length > 0 ? subcats[0].id : '',
  });
}

function onLabelChange(txId: string, label: string) {
  catStore.updatePending(txId, { label });
}

function onPurposeChange(txId: string, purpose: string) {
  catStore.updatePending(txId, { purpose });
}

function rowTint(item: PendingCategorization): string {
  if (item.reviewed) return 'bg-terminal-green/5';
  if (item.confidence >= 0.7) return 'bg-terminal-green/10';
  if (item.confidence >= 0.4) return 'bg-terminal-amber/10';
  return 'bg-terminal-red/10';
}

function confidenceClass(score: number): string {
  if (score >= 0.7) return 'bg-terminal-green/20 text-terminal-green';
  if (score >= 0.4) return 'bg-terminal-amber/20 text-terminal-amber';
  return 'bg-terminal-red/20 text-terminal-red';
}

function sourceBadgeClass(source: string): string {
  switch (source) {
    case 'csv': return 'bg-terminal-muted/20 text-terminal-muted';
    case 'rule': return 'bg-terminal-green/20 text-terminal-green';
    case 'ai': return 'bg-terminal-amber/20 text-terminal-amber';
    default: return 'bg-terminal-red/20 text-terminal-red';
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'csv': return t('review_source_csv');
    case 'rule': return t('review_source_rule');
    case 'ai': return t('review_source_ai');
    default: return t('review_source_manual');
  }
}
</script>
