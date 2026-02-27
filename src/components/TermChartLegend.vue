<template>
  <div class="max-h-80 w-40 shrink-0 overflow-auto border-l border-terminal-border pl-2">
    <p class="text-xs font-bold text-terminal-amber">Legend</p>
    <div class="mt-1 space-y-1">
      <button
        v-for="item in items"
        :key="item.name"
        class="flex w-full items-center gap-2 text-left text-xs hover:bg-terminal-green-dim"
        :class="hidden.has(item.name) ? 'opacity-40' : ''"
        @click="toggle(item.name)"
      >
        <span class="inline-block h-2 w-2 shrink-0" :style="{ background: item.color }"></span>
        <span class="truncate">{{ item.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';

const props = defineProps<{
  items: { name: string; color: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartRef?: any;
}>();

const hidden = reactive(new Set<string>());

function toggle(name: string) {
  if (hidden.has(name)) hidden.delete(name);
  else hidden.add(name);

  const chart = props.chartRef;
  if (chart && typeof chart.dispatchAction === 'function') {
    chart.dispatchAction({ type: 'legendToggleSelect', name });
  }
}

watch(() => props.items, () => hidden.clear());
</script>
