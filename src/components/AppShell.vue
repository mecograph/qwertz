<template>
  <div class="h-screen overflow-hidden bg-slate-50 text-slate-900">
    <div class="flex h-full">
      <aside class="hidden h-screen w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div class="flex h-16 items-center border-b border-slate-200 px-4">
          <div>
            <p class="text-sm font-semibold">Transaction Analyzer</p>
            <p class="text-xs text-slate-500">Linear × PostHog style</p>
          </div>
        </div>

        <nav class="flex-1 space-y-1 overflow-auto p-2">
          <button
            v-for="item in primaryTabs"
            :key="item"
            class="w-full rounded-md px-3 py-2 text-left text-sm"
            :class="ui.tab === item ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100'"
            @click="ui.tab = item"
          >
            {{ item }}
          </button>
        </nav>

        <div class="mt-auto border-t border-slate-200 p-2">
          <button
            class="w-full rounded-md px-3 py-2 text-left text-sm"
            :class="ui.tab === 'Settings' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100'"
            @click="ui.tab = 'Settings'"
          >
            Settings
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div class="flex h-full w-full items-center justify-between gap-3 px-4">
            <div>
              <h1 class="text-base font-semibold">{{ ui.tab }}</h1>
              <p class="text-xs text-slate-500">Local-only analysis</p>
            </div>
            <div class="min-w-0 flex-1">
              <slot name="top-right" />
            </div>
          </div>
        </header>

        <main class="min-h-0 min-w-0 flex-1 overflow-hidden p-4">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../stores/useUiStore';

const ui = useUiStore();
const primaryTabs = ['Dashboard', 'Charts', 'Data'] as const;
</script>
