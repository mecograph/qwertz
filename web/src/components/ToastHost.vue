<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,420px)] flex-col gap-2">
    <div
      v-for="toast in toastStore.items"
      :key="toast.id"
      class="pointer-events-auto border px-3 py-2 text-xs shadow-lg"
      :class="levelClass(toast.level)"
    >
      <div class="flex items-start justify-between gap-2">
        <p>{{ toast.message }}</p>
        <button class="text-terminal-muted hover:text-terminal-green" @click="toastStore.remove(toast.id)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToastLevel } from '../stores/useToastStore';
import { useToastStore } from '../stores/useToastStore';

const toastStore = useToastStore();

function levelClass(level: ToastLevel) {
  if (level === 'success') return 'border-terminal-green bg-terminal-surface text-terminal-green';
  if (level === 'warning') return 'border-terminal-amber bg-terminal-surface text-terminal-amber';
  if (level === 'error') return 'border-terminal-red bg-terminal-surface text-terminal-red';
  return 'border-terminal-border bg-terminal-surface text-terminal-muted';
}
</script>
