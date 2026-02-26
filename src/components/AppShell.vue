<template>
  <div class="h-screen overflow-hidden bg-terminal-bg text-terminal-green" :class="ui.theme === 'dark' ? 'scanlines font-mono' : 'font-sans'">
    <div class="flex h-full">
      <!-- Desktop sidebar -->
      <aside class="hidden h-screen w-60 shrink-0 border-r border-terminal-border bg-terminal-surface lg:flex lg:flex-col">
        <div class="border-b border-terminal-border px-4 py-4">
          <p class="text-sm font-bold">{{ ui.theme === 'dark' ? '$ ' : '' }}TX_ANALYZER</p>
          <p class="mt-1 text-xs text-terminal-muted">v0.1.0 | local-only</p>
        </div>

        <nav class="flex-1 space-y-1 p-2 overflow-auto">
          <button
            v-for="item in primaryTabs"
            :key="item"
            class="w-full px-3 py-2 text-left text-sm"
            :class="ui.tab === item ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
            @click="ui.tab = item"
          >
            <span v-if="ui.tab === item && ui.theme === 'dark'">&gt; </span>{{ item }}
          </button>
        </nav>

        <div class="border-t border-terminal-border p-2">
          <button
            class="w-full px-3 py-2 text-left text-sm"
            :class="ui.tab === 'Settings' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
            @click="ui.tab = 'Settings'"
          >
            <span v-if="ui.tab === 'Settings' && ui.theme === 'dark'">&gt; </span>Settings
          </button>

          <!-- Theme toggle -->
          <div class="mt-2 flex border border-terminal-border">
            <button
              class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors"
              :class="ui.theme === 'dark' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
              @click="ui.setTheme('dark')"
            >
              Dark
            </button>
            <button
              class="flex-1 border-l border-terminal-border px-2 py-1.5 text-xs font-medium transition-colors"
              :class="ui.theme === 'light' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
              @click="ui.setTheme('light')"
            >
              Light
            </button>
          </div>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 h-14 border-b border-terminal-border bg-terminal-surface lg:h-[72px]">
          <div class="flex h-full w-full items-center justify-between gap-3 px-4">
            <div class="shrink-0">
              <h1 class="text-base font-bold">
                <template v-if="ui.theme === 'dark'">$ {{ ui.tab.toLowerCase() }}<span class="cursor-blink"></span></template>
                <template v-else>{{ ui.tab }}</template>
              </h1>
              <p class="hidden text-xs text-terminal-muted lg:block">session: local</p>
            </div>
            <div class="min-w-0 flex-1">
              <slot name="top-right" />
            </div>
          </div>
        </header>

        <main class="min-h-0 min-w-0 flex-1 overflow-hidden p-4 pb-20 lg:pb-4">
          <slot />
        </main>
      </div>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="fixed bottom-0 left-0 right-0 z-30 flex border-t border-terminal-border bg-terminal-surface lg:hidden">
      <button
        v-for="item in allTabs"
        :key="item.key"
        class="flex flex-1 flex-col items-center gap-0.5 py-2"
        :class="ui.tab === item.key ? 'text-terminal-green' : 'text-terminal-muted'"
        @click="ui.tab = item.key"
      >
        <!-- Dashboard icon: 4-square grid -->
        <svg v-if="item.key === 'Dashboard'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        <!-- Charts icon: bar chart -->
        <svg v-else-if="item.key === 'Charts'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <!-- Data icon: list -->
        <svg v-else-if="item.key === 'Data'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <!-- Settings icon: cog -->
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue';
import { useUiStore } from '../stores/useUiStore';

const ui = useUiStore();
const primaryTabs = ['Dashboard', 'Charts', 'Data'] as const;
const allTabs = [
  { key: 'Dashboard' as const, label: 'Dashboard' },
  { key: 'Charts' as const, label: 'Charts' },
  { key: 'Data' as const, label: 'Data' },
  { key: 'Settings' as const, label: 'Settings' },
];

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', ui.theme);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', ui.theme);
});
</script>
