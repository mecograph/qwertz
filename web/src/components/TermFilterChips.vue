<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Add filter dropdown -->
    <div ref="dropdownRoot" class="relative">
      <button class="term-btn flex items-center gap-1.5 px-3 py-1.5 text-xs" @click="toggleDropdown">
        <AppIcon name="filter" :size="14" />
        {{ t('filter_add') }}
      </button>

      <div v-if="step === 'dimension'" class="term-popout absolute right-0 top-full z-40 mt-2 w-52">
        <button
          v-for="dim in dimensions"
          :key="dim.key"
          class="w-full px-3 py-2 text-left text-xs hover:bg-terminal-green-dim"
          @click="pickDimension(dim.key)"
        >
          {{ dim.label }}
        </button>
      </div>

      <div v-if="step === 'value'" class="term-popout absolute right-0 top-full z-40 mt-2 w-60 px-3">
        <p class="text-xs font-bold text-terminal-amber">{{ activeDimensionLabel }}</p>

        <!-- Type: simple list -->
        <template v-if="activeDimension === 'type'">
          <button
            v-for="opt in typeOptions"
            :key="opt"
            class="w-full px-3 py-2 text-left text-xs hover:bg-terminal-green-dim"
            @click="selectType(opt)"
          >
            {{ opt }}
          </button>
        </template>

        <!-- Include Neutral: toggle -->
        <template v-else-if="activeDimension === 'neutral'">
          <button class="w-full px-3 py-2 text-left text-xs hover:bg-terminal-green-dim" @click="toggleNeutral">
            {{ filters.includeNeutral ? t('chip_disable_neutral') : t('chip_enable_neutral') }}
          </button>
        </template>

        <!-- Category / Label: searchable multi-select -->
        <template v-else>
          <input
            v-model="valueSearch"
            class="term-input mt-2 w-full px-2 py-1.5 text-xs"
            placeholder="> search..."
          />
          <div class="mt-2 max-h-48 overflow-auto">
            <button
              v-for="val in filteredValues"
              :key="val"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-terminal-green-dim"
              @click="toggleValue(val)"
            >
              <span class="inline-block h-2 w-2 border border-terminal-green" :class="isValueSelected(val) ? 'bg-terminal-green' : ''"></span>
              {{ val }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Active chips -->
    <span v-if="filters.type" class="term-chip">
      {{ t('chip_type') }}: {{ filters.type }}
      <button class="term-chip-remove" @click="filters.type = ''">&times;</button>
    </span>

    <span v-for="cat in filters.categories" :key="'cat-' + cat" class="term-chip">
      {{ t('chip_category') }}: {{ cat }}
      <button class="term-chip-remove" @click="removeCategory(cat)">&times;</button>
    </span>

    <span v-for="lbl in filters.labels" :key="'lbl-' + lbl" class="term-chip">
      {{ t('chip_label') }}: {{ lbl }}
      <button class="term-chip-remove" @click="removeLabel(lbl)">&times;</button>
    </span>

    <span v-if="filters.includeNeutral" class="term-chip">
      {{ t('chip_neutral') }}
      <button class="term-chip-remove" @click="filters.includeNeutral = false">&times;</button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useClickOutside } from '../composables/useClickOutside';
import { useLocale } from '../composables/useLocale';
import type { TxType } from '../types';
import AppIcon from './AppIcon.vue';

const filters = useFilterStore();
const tx = useTransactionsStore();
const { t } = useLocale();

const dropdownRoot = ref<HTMLElement | null>(null);
const step = ref<'' | 'dimension' | 'value'>('');
const activeDimension = ref<'type' | 'category' | 'label' | 'neutral'>('type');
const valueSearch = ref('');

useClickOutside(dropdownRoot, () => { step.value = ''; });

const dimensions = computed(() => [
  { key: 'type' as const, label: t('chip_type') },
  { key: 'category' as const, label: t('chip_category') },
  { key: 'label' as const, label: t('chip_label') },
  { key: 'neutral' as const, label: t('chip_neutral') },
]);

const typeOptions: TxType[] = ['Expense', 'Income', 'Neutral'];

const activeDimensionLabel = computed(() =>
  dimensions.value.find((d) => d.key === activeDimension.value)?.label ?? '',
);

const availableValues = computed(() => {
  const values = new Set<string>();
  tx.rows.forEach((row) => {
    if (activeDimension.value === 'category') values.add(row.category);
    else if (activeDimension.value === 'label') values.add(row.label);
  });
  return [...values].sort();
});

const filteredValues = computed(() => {
  const q = valueSearch.value.trim().toLowerCase();
  if (!q) return availableValues.value;
  return availableValues.value.filter((v) => v.toLowerCase().includes(q));
});

function isValueSelected(val: string) {
  if (activeDimension.value === 'category') return filters.categories.includes(val);
  if (activeDimension.value === 'label') return filters.labels.includes(val);
  return false;
}

function toggleDropdown() {
  step.value = step.value ? '' : 'dimension';
  valueSearch.value = '';
}

function pickDimension(key: typeof activeDimension.value) {
  activeDimension.value = key;
  valueSearch.value = '';
  if (key === 'neutral') {
    filters.includeNeutral = !filters.includeNeutral;
    step.value = '';
  } else {
    step.value = 'value';
  }
}

function selectType(opt: TxType) {
  filters.type = opt;
  step.value = '';
}

function toggleNeutral() {
  filters.includeNeutral = !filters.includeNeutral;
  step.value = '';
}

function toggleValue(val: string) {
  if (activeDimension.value === 'category') {
    const idx = filters.categories.indexOf(val);
    if (idx >= 0) filters.categories.splice(idx, 1);
    else filters.categories.push(val);
  } else if (activeDimension.value === 'label') {
    const idx = filters.labels.indexOf(val);
    if (idx >= 0) filters.labels.splice(idx, 1);
    else filters.labels.push(val);
  }
}

function removeCategory(cat: string) {
  const idx = filters.categories.indexOf(cat);
  if (idx >= 0) filters.categories.splice(idx, 1);
}

function removeLabel(lbl: string) {
  const idx = filters.labels.indexOf(lbl);
  if (idx >= 0) filters.labels.splice(idx, 1);
}
</script>
