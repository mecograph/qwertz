<template>
  <!-- Desktop: inline layout -->
  <div class="hidden items-center justify-end gap-2 lg:flex">
    <TermFilterChips />
    <TermDatePicker />
    <button
      class="term-btn px-3 py-1.5 text-xs"
      @click="resetFilters"
      aria-label="Reset filters"
      title="Reset filters"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 22v-6h6"/></svg>
    </button>
  </div>

  <!-- Mobile: filter trigger -->
  <div class="flex items-center justify-end gap-2 lg:hidden">
    <span class="truncate text-xs text-terminal-muted">{{ filters.dateLabel }}</span>
    <button class="term-btn relative px-3 py-1.5 text-xs" @click="drawerOpen = true" aria-label="Open filters">
      <AppIcon name="filter" :size="14" />
      <span v-if="activeFilterCount > 0" class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-terminal-amber text-[9px] font-bold text-black">{{ activeFilterCount }}</span>
    </button>
  </div>

  <!-- Mobile filter drawer -->
  <Teleport to="body">
    <Transition name="filter-drawer">
      <div v-if="drawerOpen" class="fixed inset-0 z-50 lg:hidden">
        <!-- Backdrop -->
        <div class="filter-drawer-backdrop absolute inset-0 bg-black/50" @click="drawerOpen = false"></div>
        <!-- Panel -->
        <aside class="filter-drawer-panel absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-l border-terminal-border bg-terminal-surface">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-terminal-border px-4 py-3">
            <p class="text-sm font-bold">{{ t('filter_filters') }}</p>
            <button class="text-terminal-muted hover:text-terminal-green" @click="drawerOpen = false">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="space-y-5 p-4">
            <!-- Date Range -->
            <section>
              <p class="text-xs font-bold text-terminal-amber">{{ t('filter_date_range') }}</p>
              <p class="mt-1 text-xs text-terminal-green">{{ filters.dateLabel }}</p>

              <!-- Presets -->
              <div class="mt-3 space-y-1">
                <button
                  v-for="preset in fixedPresets"
                  :key="preset.label"
                  class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-terminal-green-dim"
                  @click="selectPreset(preset)"
                >
                  <span class="inline-block h-2 w-2 border border-terminal-green" :class="isPresetActive(preset) ? 'bg-terminal-green' : ''"></span>
                  {{ preset.label }}
                </button>
              </div>

              <!-- Years -->
              <p class="mt-3 text-xs font-bold text-terminal-amber">{{ t('filter_year') }}</p>
              <div class="mt-1 flex flex-wrap gap-1">
                <button
                  v-for="year in years"
                  :key="year"
                  class="px-2 py-1 text-xs transition-colors"
                  :class="isYearActive(year) ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
                  @click="selectYear(year)"
                >
                  {{ year }}
                </button>
              </div>

              <!-- Months -->
              <p class="mt-3 text-xs font-bold text-terminal-amber">{{ t('filter_month') }}</p>
              <div class="mt-1 max-h-40 space-y-1 overflow-auto">
                <button
                  v-for="month in months"
                  :key="month"
                  class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-terminal-green-dim"
                  :class="isMonthActive(month) ? 'bg-terminal-green-dim' : ''"
                  @click="selectMonth(month)"
                >
                  <span class="inline-block h-2 w-2 border border-terminal-green" :class="isMonthActive(month) ? 'bg-terminal-green' : ''"></span>
                  {{ formatMonth(month) }}
                </button>
              </div>

              <!-- Custom date inputs -->
              <div class="mt-3 space-y-2">
                <label class="block text-xs text-terminal-muted">
                  {{ t('filter_start') }}
                  <input type="date" v-model="drawerStart" class="term-input mt-1 w-full px-2 py-1 text-xs" />
                </label>
                <label class="block text-xs text-terminal-muted">
                  {{ t('filter_end') }}
                  <input type="date" v-model="drawerEnd" class="term-input mt-1 w-full px-2 py-1 text-xs" />
                </label>
                <button class="term-btn w-full px-3 py-1.5 text-xs" @click="applyCustomDate">{{ t('filter_apply_date_range') }}</button>
              </div>
            </section>

            <div class="border-t border-terminal-border"></div>

            <!-- Type -->
            <section>
              <p class="text-xs font-bold text-terminal-amber">{{ t('chip_type') }}</p>
              <div class="mt-2 flex gap-1">
                <button
                  v-for="tp in txTypes"
                  :key="tp"
                  class="flex-1 px-2 py-1.5 text-xs transition-colors"
                  :class="filters.type === tp ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
                  @click="filters.type = filters.type === tp ? '' : tp"
                >
                  {{ tp === 'Expense' ? t('charts_mode_expense') : tp === 'Income' ? t('charts_mode_income') : t('chip_neutral') }}
                </button>
              </div>
            </section>

            <!-- Category -->
            <section>
              <p class="text-xs font-bold text-terminal-amber">{{ t('chip_category') }}</p>
              <input
                v-model="categorySearch"
                class="term-input mt-2 w-full px-2 py-1 text-xs"
                :placeholder="t('data_search_placeholder')"
              />
              <div class="mt-1 max-h-40 space-y-0.5 overflow-auto">
                <label
                  v-for="cat in filteredCategories"
                  :key="cat"
                  class="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-terminal-green-dim"
                >
                  <input
                    type="checkbox"
                    class="accent-terminal-green"
                    :checked="filters.categories.includes(cat)"
                    @change="toggleCategory(cat)"
                  />
                  <span :class="filters.categories.includes(cat) ? 'text-terminal-green' : 'text-terminal-muted'">{{ cat }}</span>
                </label>
              </div>
              <div v-if="filters.categories.length" class="mt-1 flex flex-wrap gap-1">
                <span v-for="cat in filters.categories" :key="cat" class="term-chip text-[10px]">{{ cat }}</span>
              </div>
            </section>

            <!-- Label -->
            <section>
              <p class="text-xs font-bold text-terminal-amber">{{ t('chip_label') }}</p>
              <input
                v-model="labelSearch"
                class="term-input mt-2 w-full px-2 py-1 text-xs"
                :placeholder="t('data_search_placeholder')"
              />
              <div class="mt-1 max-h-40 space-y-0.5 overflow-auto">
                <label
                  v-for="lbl in filteredLabels"
                  :key="lbl"
                  class="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-terminal-green-dim"
                >
                  <input
                    type="checkbox"
                    class="accent-terminal-green"
                    :checked="filters.labels.includes(lbl)"
                    @change="toggleLabel(lbl)"
                  />
                  <span :class="filters.labels.includes(lbl) ? 'text-terminal-green' : 'text-terminal-muted'">{{ lbl }}</span>
                </label>
              </div>
              <div v-if="filters.labels.length" class="mt-1 flex flex-wrap gap-1">
                <span v-for="lbl in filters.labels" :key="lbl" class="term-chip text-[10px]">{{ lbl }}</span>
              </div>
            </section>

            <!-- Include Neutral toggle -->
            <section>
              <label class="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  class="accent-terminal-green"
                  :checked="filters.includeNeutral"
                  @change="filters.includeNeutral = !filters.includeNeutral"
                />
                <span :class="filters.includeNeutral ? 'text-terminal-green' : 'text-terminal-muted'">{{ t('chip_neutral') }}</span>
              </label>
            </section>

            <div class="border-t border-terminal-border"></div>

            <!-- Reset -->
            <button class="term-btn w-full px-3 py-2 text-xs" @click="resetFilters(); drawerOpen = false">
              {{ t('filter_reset_all') }}
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watchEffect, computed, ref, watch } from 'vue';
import TermDatePicker from './TermDatePicker.vue';
import TermFilterChips from './TermFilterChips.vue';
import AppIcon from './AppIcon.vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useLocale } from '../composables/useLocale';

const filters = useFilterStore();
const tx = useTransactionsStore();
const { t, formatMonth } = useLocale();

const drawerOpen = ref(false);
const drawerStart = ref('');
const drawerEnd = ref('');
const categorySearch = ref('');
const labelSearch = ref('');

const txTypes = ['Expense', 'Income', 'Neutral'] as const;

const allCategories = computed(() => [...new Set(tx.rows.map((r) => r.category))].sort());
const allLabels = computed(() => [...new Set(tx.rows.map((r) => r.label))].sort());

const filteredCategories = computed(() => {
  const q = categorySearch.value.toLowerCase();
  return q ? allCategories.value.filter((c) => c.toLowerCase().includes(q)) : allCategories.value;
});

const filteredLabels = computed(() => {
  const q = labelSearch.value.toLowerCase();
  return q ? allLabels.value.filter((l) => l.toLowerCase().includes(q)) : allLabels.value;
});

function toggleCategory(cat: string) {
  const idx = filters.categories.indexOf(cat);
  if (idx >= 0) filters.categories.splice(idx, 1);
  else filters.categories.push(cat);
}

function toggleLabel(lbl: string) {
  const idx = filters.labels.indexOf(lbl);
  if (idx >= 0) filters.labels.splice(idx, 1);
  else filters.labels.push(lbl);
}

// Sync drawer date inputs when opening
watch(drawerOpen, (isOpen) => {
  if (isOpen) {
    drawerStart.value = filters.startDate;
    drawerEnd.value = filters.endDate;
  }
});

const latestYear = computed(() => {
  const set = new Set(tx.rows.map((row) => row.date.slice(0, 4)));
  return [...set].sort((a, b) => Number(b) - Number(a))[0] || '';
});

watchEffect(() => {
  if (!filters.startDate && !filters.endDate && latestYear.value) {
    filters.setDateRange(`${latestYear.value}-01-01`, `${latestYear.value}-12-31`);
  }
});

// Active filter count for badge
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.type) count++;
  count += filters.categories.length;
  count += filters.labels.length;
  if (filters.includeNeutral) count++;
  return count;
});

// Date presets
const fixedPresets = computed(() => [
  { label: t('preset_last_7'), days: 7 },
  { label: t('preset_last_30'), days: 30 },
  { label: t('preset_last_90'), days: 90 },
  { label: t('preset_this_month'), days: 0 },
]);

const years = computed(() => {
  const set = new Set(tx.rows.map((row) => row.date.slice(0, 4)));
  return [...set].sort((a, b) => Number(b) - Number(a));
});

const months = computed(() => {
  const set = new Set(tx.rows.map((row) => row.date.slice(0, 7)));
  return [...set].sort((a, b) => b.localeCompare(a));
});

function selectPreset(preset: { days: number }) {
  const now = new Date();
  if (preset.days === 0) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    filters.setDateRange(start.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
  } else {
    const start = new Date(now);
    start.setDate(start.getDate() - preset.days + 1);
    filters.setDateRange(start.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
  }
}

function isPresetActive(preset: { days: number }) {
  const now = new Date();
  let expStart: string;
  let expEnd: string;
  if (preset.days === 0) {
    expStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    expEnd = now.toISOString().slice(0, 10);
  } else {
    const start = new Date(now);
    start.setDate(start.getDate() - preset.days + 1);
    expStart = start.toISOString().slice(0, 10);
    expEnd = now.toISOString().slice(0, 10);
  }
  return filters.startDate === expStart && filters.endDate === expEnd;
}

function selectYear(year: string) {
  filters.setDateRange(`${year}-01-01`, `${year}-12-31`);
}

function isYearActive(year: string) {
  return filters.startDate === `${year}-01-01` && filters.endDate === `${year}-12-31`;
}

function selectMonth(ym: string) {
  const [year, month] = ym.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  filters.setDateRange(`${ym}-01`, `${ym}-${String(lastDay).padStart(2, '0')}`);
}

function isMonthActive(ym: string) {
  const [year, month] = ym.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return filters.startDate === `${ym}-01` && filters.endDate === `${ym}-${String(lastDay).padStart(2, '0')}`;
}

function applyCustomDate() {
  if (drawerStart.value && drawerEnd.value) {
    filters.setDateRange(drawerStart.value, drawerEnd.value);
  }
}

function resetFilters() {
  filters.reset();
  if (latestYear.value) {
    filters.setDateRange(`${latestYear.value}-01-01`, `${latestYear.value}-12-31`);
  }
}
</script>
