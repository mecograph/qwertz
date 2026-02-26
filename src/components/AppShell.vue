<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold">Transaction Analyzer</span>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Linear × PostHog style</span>
        </div>
        <div class="flex gap-1">
          <button
            v-for="item in tabs"
            :key="item"
            class="rounded-md px-3 py-2 text-sm"
            :class="ui.tab === item ? 'border border-indigo-200 bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'"
            @click="ui.tab = item"
          >
            {{ item }}
          </button>
        </div>
      </nav>
    </header>
    <main class="mx-auto grid max-w-7xl gap-4 p-4">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../stores/useUiStore';

const ui = useUiStore();
const tabs = ['Dashboard', 'Charts', 'Data', 'Settings'] as const;
</script>
