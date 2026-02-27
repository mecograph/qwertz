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
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
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

            <!-- Filter chips -->
            <section>
              <p class="text-xs font-bold text-terminal-amber">{{ t('filter_filters') }}</p>
              <div class="mt-2">
                <TermFilterChips />
              </div>
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
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useLocale } from '../composables/useLocale';

const filters = useFilterStore();
const tx = useTransactionsStore();
const { t, formatMonth } = useLocale();

const drawerOpen = ref(false);
const drawerStart = ref('');
const drawerEnd = ref('');

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
