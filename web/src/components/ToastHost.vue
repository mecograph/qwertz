<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
    <div
      v-for="toast in toastStore.items"
      :key="toast.id"
      class="term-toast pointer-events-auto flex bg-terminal-surface shadow-lg"
    >
      <div class="w-1 shrink-0" :class="levelBarClass(toast.level)"></div>
      <div class="flex flex-1 items-start gap-3 px-4 py-3">
        <p class="min-w-0 flex-1 text-xs leading-relaxed">{{ toast.message }}</p>
        <button
          class="shrink-0 text-base leading-none text-terminal-muted transition-colors hover:text-terminal-green"
          @click="toastStore.remove(toast.id)"
        >×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToastLevel } from '../stores/useToastStore';
import { useToastStore } from '../stores/useToastStore';

const toastStore = useToastStore();

function levelBarClass(level: ToastLevel) {
  if (level === 'success') return 'severity-bar-success';
  if (level === 'warning') return 'bg-terminal-amber';
  if (level === 'error') return 'bg-terminal-red';
  return 'bg-terminal-muted';
}
</script>
