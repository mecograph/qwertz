<template>
  <div ref="root" class="relative">
    <button class="term-btn px-3 py-1.5 text-xs" @click="open = !open">
      {{ filters.dateLabel }} ▾
    </button>

    <div v-if="open" class="term-popout absolute right-0 top-full z-40 mt-2 flex w-[32rem] max-w-[calc(100vw-2rem)]">
      <!-- Presets (left) -->
      <div class="w-2/5 border-r border-terminal-border p-3 overflow-auto max-h-80">
        <p class="text-xs font-bold text-terminal-amber">{{ t('filter_presets') }}</p>
        <div class="mt-2 space-y-1">
          <button
            v-for="preset in fixedPresets"
            :key="preset.label"
            class="flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-terminal-green-dim"
            @click="selectPreset(preset)"
          >
            <span class="inline-block h-2 w-2 border border-terminal-green" :class="isActivePreset(preset) ? 'bg-terminal-green' : ''"></span>
            {{ preset.label }}
          </button>
        </div>

        <p class="mt-3 text-xs font-bold text-terminal-amber">{{ t('filter_years') }}</p>
        <div class="mt-1 space-y-1">
          <button
            v-for="year in years"
            :key="year"
            class="flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-terminal-green-dim"
            @click="selectYear(year)"
          >
            <span class="inline-block h-2 w-2 border border-terminal-green" :class="isYearActive(year) ? 'bg-terminal-green' : ''"></span>
            {{ year }}
          </button>
        </div>

        <p class="mt-3 text-xs font-bold text-terminal-amber">{{ t('filter_months') }}</p>
        <div class="mt-1 space-y-1">
          <button
            v-for="month in months"
            :key="month"
            class="flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-terminal-green-dim"
            @click="selectMonth(month)"
          >
            <span class="inline-block h-2 w-2 border border-terminal-green" :class="isMonthActive(month) ? 'bg-terminal-green' : ''"></span>
            {{ formatMonth(month) }}
          </button>
        </div>
      </div>

      <!-- Inputs (right) -->
      <div class="flex w-3/5 flex-col p-3">
        <div class="space-y-2">
          <label class="text-xs text-terminal-muted">
            {{ t('filter_start') }}
            <input type="date" v-model="localStart" class="term-input mt-1 w-full" />
          </label>
          <label class="text-xs text-terminal-muted">
            {{ t('filter_end') }}
            <input type="date" v-model="localEnd" class="term-input mt-1 w-full" />
          </label>
        </div>

        <p class="mt-3 text-sm text-terminal-green">{{ localLabel }}</p>

        <div class="mt-auto flex justify-end gap-2 pt-4">
          <button class="term-btn px-3 py-1 text-xs" @click="cancel">{{ t('filter_cancel') }}</button>
          <button class="term-btn px-3 py-1 text-xs" @click="apply">{{ t('filter_apply') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFilterStore } from '../stores/useFilterStore';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useClickOutside } from '../composables/useClickOutside';
import { useLocale } from '../composables/useLocale';

const filters = useFilterStore();
const tx = useTransactionsStore();
const { t, formatDate, formatMonth } = useLocale();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const localStart = ref(filters.startDate);
const localEnd = ref(filters.endDate);

useClickOutside(root, () => { open.value = false; });

watch(open, (isOpen) => {
  if (isOpen) {
    localStart.value = filters.startDate;
    localEnd.value = filters.endDate;
  }
});

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

const localLabel = computed(() => {
  if (localStart.value && localEnd.value) {
    return `${formatDate(localStart.value)} – ${formatDate(localEnd.value)}`;
  }
  return t('filter_all_time');
});

function selectPreset(preset: { days: number }) {
  const now = new Date();
  if (preset.days === 0) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    localStart.value = start.toISOString().slice(0, 10);
    localEnd.value = now.toISOString().slice(0, 10);
  } else {
    const start = new Date(now);
    start.setDate(start.getDate() - preset.days + 1);
    localStart.value = start.toISOString().slice(0, 10);
    localEnd.value = now.toISOString().slice(0, 10);
  }
}

function selectYear(year: string) {
  localStart.value = `${year}-01-01`;
  localEnd.value = `${year}-12-31`;
}

function selectMonth(ym: string) {
  const [year, month] = ym.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  localStart.value = `${ym}-01`;
  localEnd.value = `${ym}-${String(lastDay).padStart(2, '0')}`;
}

function isActivePreset(preset: { days: number }) {
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
  return localStart.value === expStart && localEnd.value === expEnd;
}

function isYearActive(year: string) {
  return localStart.value === `${year}-01-01` && localEnd.value === `${year}-12-31`;
}

function isMonthActive(ym: string) {
  const [year, month] = ym.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return localStart.value === `${ym}-01` && localEnd.value === `${ym}-${String(lastDay).padStart(2, '0')}`;
}

function apply() {
  filters.setDateRange(localStart.value, localEnd.value);
  open.value = false;
}

function cancel() {
  open.value = false;
}
</script>
