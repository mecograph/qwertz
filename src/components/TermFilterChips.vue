<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Add filter dropdown -->
    <div ref="dropdownRoot" class="relative">
      <button class="term-btn px-3 py-1.5 text-xs" @click="toggleDropdown">+ Filter</button>

      <div v-if="step === 'dimension'" class="absolute right-0 top-9 z-40 w-48 border border-terminal-border bg-terminal-surface p-2">
        <button
          v-for="dim in dimensions"
          :key="dim.key"
          class="w-full px-2 py-1 text-left text-xs hover:bg-terminal-green-dim"
          @click="pickDimension(dim.key)"
        >
          {{ dim.label }}
        </button>
      </div>

      <div v-if="step === 'value'" class="absolute right-0 top-9 z-40 w-56 border border-terminal-border bg-terminal-surface p-2">
        <p class="text-xs font-bold text-terminal-amber">{{ activeDimensionLabel }}</p>

        <!-- Type: simple list -->
        <template v-if="activeDimension === 'type'">
          <button
            v-for="t in typeOptions"
            :key="t"
            class="w-full px-2 py-1 text-left text-xs hover:bg-terminal-green-dim"
            @click="selectType(t)"
          >
            {{ t }}
          </button>
        </template>

        <!-- Include Neutral: toggle -->
        <template v-else-if="activeDimension === 'neutral'">
          <button class="w-full px-2 py-1 text-left text-xs hover:bg-terminal-green-dim" @click="toggleNeutral">
            {{ filters.includeNeutral ? 'Disable' : 'Enable' }} Include Neutral
          </button>
        </template>

        <!-- Category / Label: searchable multi-select -->
        <template v-else>
          <input
            v-model="valueSearch"
            class="term-input mt-1 w-full px-2 py-1 text-xs"
            placeholder="> search..."
          />
          <div class="mt-1 max-h-48 overflow-auto">
            <button
              v-for="val in filteredValues"
              :key="val"
              class="flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-terminal-green-dim"
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
      Type: {{ filters.type }}
      <button class="term-chip-remove" @click="filters.type = ''">&times;</button>
    </span>

    <span v-for="cat in filters.categories" :key="'cat-' + cat" class="term-chip">
      Category: {{ cat }}
      <button class="term-chip-remove" @click="removeCategory(cat)">&times;</button>
    </span>

    <span v-for="lbl in filters.labels" :key="'lbl-' + lbl" class="term-chip">
      Label: {{ lbl }}
      <button class="term-chip-remove" @click="removeLabel(lbl)">&times;</button>
    </span>

    <span v-if="filters.includeNeutral" class="term-chip">
      Include Neutral
      <button class="term-chip-remove" @click="filters.includeNeutral = false">&times;</button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useClickOutside } from '../composables/useClickOutside';
import type { TxType } from '../types';

const filters = useFilterStore();
const tx = useTransactionsStore();

const dropdownRoot = ref<HTMLElement | null>(null);
const step = ref<'' | 'dimension' | 'value'>('');
const activeDimension = ref<'type' | 'category' | 'label' | 'neutral'>('type');
const valueSearch = ref('');

useClickOutside(dropdownRoot, () => { step.value = ''; });

const dimensions = [
  { key: 'type' as const, label: 'Type' },
  { key: 'category' as const, label: 'Category' },
  { key: 'label' as const, label: 'Label' },
  { key: 'neutral' as const, label: 'Include Neutral' },
];

const typeOptions: TxType[] = ['Expense', 'Income', 'Neutral'];

const activeDimensionLabel = computed(() =>
  dimensions.find((d) => d.key === activeDimension.value)?.label ?? '',
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

function selectType(t: TxType) {
  filters.type = t;
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
