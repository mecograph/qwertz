<template>
  <div class="h-screen overflow-hidden bg-terminal-bg text-terminal-green" :class="ui.theme === 'dark' ? 'scanlines font-mono' : 'font-sans'">
    <!-- Splash mode: no chrome, centered content -->
    <template v-if="mode === 'splash'">
      <div class="flex h-full items-center justify-center p-4">
        <slot />
      </div>
    </template>

    <!-- Wizard / App mode: structured layout -->
    <template v-else>
      <div class="flex h-full">
        <!-- Desktop sidebar (app mode only) -->
        <aside
          v-if="mode === 'app'"
          class="hidden h-screen shrink-0 border-r border-terminal-border bg-terminal-surface transition-[width] duration-200 lg:flex lg:flex-col"
          :class="ui.sidebarCollapsed ? 'w-[52px]' : 'w-60'"
        >
          <!-- Header -->
          <div class="flex items-center border-b border-terminal-border px-3 py-4" :class="ui.sidebarCollapsed ? 'justify-center' : 'justify-between'">
            <div v-if="!ui.sidebarCollapsed" class="min-w-0">
              <p class="truncate text-sm font-bold">{{ ui.theme === 'dark' ? '$ ' : '' }}{{ t('app_title') }}</p>
              <p class="mt-0.5 text-xs text-terminal-muted">{{ t('app_version') }}</p>
            </div>
            <button
              class="flex shrink-0 items-center justify-center rounded p-1 text-terminal-muted transition-colors hover:text-terminal-green"
              :title="ui.sidebarCollapsed ? t('sidebar_expand') : t('sidebar_collapse')"
              @click="ui.toggleSidebar()"
            >
              <AppIcon :name="ui.sidebarCollapsed ? 'chevron-right' : 'chevron-left'" :size="16" />
            </button>
          </div>

          <!-- Nav -->
          <nav class="flex-1 space-y-1 overflow-auto p-2">
            <button
              v-for="item in navItems"
              :key="item.key"
              class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors"
              :class="[
                ui.tab === item.key ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green',
                ui.sidebarCollapsed ? 'justify-center px-0' : '',
              ]"
              :title="ui.sidebarCollapsed ? item.label : undefined"
              @click="ui.setTab(item.key)"
            >
              <AppIcon :name="item.icon" :size="20" />
              <span v-if="!ui.sidebarCollapsed">{{ item.label }}</span>
            </button>
          </nav>

          <!-- Bottom -->
          <div class="border-t border-terminal-border p-2 space-y-1">
            <!-- Settings -->
            <button
              class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors"
              :class="[
                ui.tab === 'Settings' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green',
                ui.sidebarCollapsed ? 'justify-center px-0' : '',
              ]"
              :title="ui.sidebarCollapsed ? t('nav_settings') : undefined"
              @click="ui.setTab('Settings')"
            >
              <AppIcon name="settings" :size="20" />
              <span v-if="!ui.sidebarCollapsed">{{ t('nav_settings') }}</span>
            </button>

            <!-- Theme toggle (vertical) -->
            <div
              class="flex w-full items-center gap-3 rounded px-3 py-2"
              :class="ui.sidebarCollapsed ? 'justify-center px-0' : ''"
            >
              <button
                class="relative flex shrink-0 flex-col items-center border border-terminal-border transition-all duration-200"
                :class="ui.theme === 'light' ? 'bg-terminal-green-dim' : 'bg-terminal-surface'"
                :title="ui.theme === 'dark' ? t('settings_light') : t('settings_dark')"
                :style="{ width: '28px', height: '48px', padding: '4px', borderRadius: ui.theme === 'light' ? '9999px' : '0' }"
                @click="ui.setTheme(ui.theme === 'dark' ? 'light' : 'dark')"
              >
                <span
                  class="flex items-center justify-center bg-terminal-green text-terminal-bg transition-all duration-200"
                  :class="ui.theme === 'light' ? 'translate-y-5' : 'translate-y-0'"
                  :style="{ width: '20px', height: '20px', borderRadius: ui.theme === 'light' ? '9999px' : '0' }"
                >
                  <AppIcon :name="ui.theme === 'dark' ? 'moon' : 'sun'" :size="12" />
                </span>
              </button>
              <span v-if="!ui.sidebarCollapsed" class="text-sm text-terminal-muted">{{ ui.theme === 'dark' ? t('settings_dark') : t('settings_light') }}</span>
            </div>

            <!-- Locale switcher with popout -->
            <div ref="localeRoot" class="relative">
              <button
                class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-terminal-muted transition-colors hover:text-terminal-green"
                :class="ui.sidebarCollapsed ? 'justify-center px-0' : ''"
                :title="ui.sidebarCollapsed ? t('settings_language') : undefined"
                @click="localePopoutOpen = !localePopoutOpen"
              >
                <AppIcon name="translate" :size="20" />
                <span v-if="!ui.sidebarCollapsed">{{ lang === 'en' ? 'English' : 'Deutsch' }}</span>
              </button>
              <!-- Locale popout -->
              <div
                v-if="localePopoutOpen"
                class="term-popout absolute z-50"
                :class="ui.sidebarCollapsed ? 'left-full ml-2 bottom-0' : 'bottom-full left-3 mb-2'"
              >
                <button
                  class="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2 text-left text-xs transition-colors hover:bg-terminal-green-dim"
                  :class="lang === 'en' ? 'text-terminal-green' : 'text-terminal-muted'"
                  @click="localeStore.setLang('en'); localePopoutOpen = false"
                >
                  English
                </button>
                <button
                  class="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2 text-left text-xs transition-colors hover:bg-terminal-green-dim"
                  :class="lang === 'de' ? 'text-terminal-green' : 'text-terminal-muted'"
                  @click="localeStore.setLang('de'); localePopoutOpen = false"
                >
                  Deutsch
                </button>
              </div>
            </div>

            <!-- Separator -->
            <div class="border-t border-terminal-border !my-2"></div>

            <!-- Profile / User avatar — opens Profile tab -->
            <button
              v-if="auth.user"
              class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors"
              :class="[
                ui.tab === 'Profile' ? 'text-terminal-green' : 'text-terminal-muted hover:text-terminal-green',
                ui.sidebarCollapsed ? 'justify-center px-0' : '',
              ]"
              :title="ui.sidebarCollapsed ? (profile.displayName || auth.user.email) : undefined"
              @click="ui.setTab('Profile')"
            >
              <div class="h-7 w-7 shrink-0" style="border-radius: 50%; overflow: hidden">
                <img
                  v-if="profile.avatarDataUrl"
                  :src="profile.avatarDataUrl"
                  alt=""
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center border border-terminal-border text-xs font-bold text-terminal-green" style="border-radius: 50%">{{ profileInitial }}</div>
              </div>
              <span v-if="!ui.sidebarCollapsed" class="min-w-0 truncate text-xs">{{ profile.displayName || auth.user.email }}</span>
            </button>

            <!-- Sign out -->
            <button
              class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-terminal-muted transition-colors hover:text-terminal-red"
              :class="ui.sidebarCollapsed ? 'justify-center px-0' : ''"
              :title="ui.sidebarCollapsed ? t('auth_sign_out') : undefined"
              @click="auth.signOut()"
            >
              <AppIcon name="sign-out" :size="20" />
              <span v-if="!ui.sidebarCollapsed">{{ t('auth_sign_out') }}</span>
            </button>
          </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <header class="sticky top-0 z-20 h-12 border-b border-terminal-border bg-terminal-surface lg:h-14">
            <div class="flex h-full w-full items-center justify-between gap-3 px-4">
              <div class="shrink-0">
                <h1 class="text-base font-bold">
                  <template v-if="ui.theme === 'dark'">$ {{ currentTabLabel.toLowerCase() }}<span class="cursor-blink"></span></template>
                  <template v-else>{{ currentTabLabel }}</template>
                </h1>
              </div>
              <div v-if="mode === 'app'" class="min-w-0 flex flex-1 items-center justify-end gap-2">
                <div class="min-w-0 flex-1">
                  <slot name="top-right" />
                </div>
                <NotificationCenter />
              </div>
            </div>
          </header>

          <main class="min-h-0 min-w-0 flex-1 overflow-hidden bg-terminal-bg p-4" :class="mode === 'app' ? 'lg:pb-4' : ''">
            <slot />
          </main>
        </div>
      </div>

      <!-- Mobile bottom nav (app mode only) -->
      <nav
        v-if="mode === 'app'"
        class="mobile-bottom-nav fixed z-30 flex lg:hidden"
        :class="ui.theme === 'light'
          ? 'bottom-3 left-3 right-3 rounded-[28px] bg-white/55 backdrop-blur-xl backdrop-saturate-[1.8] shadow-[0_4px_24px_rgb(0_0_0/0.08)]'
          : 'bottom-0 left-0 right-0 border-t border-terminal-border bg-terminal-surface'"
      >
        <button
          v-for="item in allTabs"
          :key="item.key"
          class="flex flex-1 flex-col items-center gap-0.5 py-2"
          :class="ui.tab === item.key ? 'text-terminal-green' : 'text-terminal-muted'"
          @click="ui.setTab(item.key)"
        >
          <AppIcon :name="item.icon" :size="20" />
          <span class="text-[10px]">{{ item.label }}</span>
        </button>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useUiStore } from '../stores/useUiStore';
import { useLocale } from '../composables/useLocale';
import { useLocaleStore } from '../stores/useLocaleStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useClickOutside } from '../composables/useClickOutside';
import NotificationCenter from './NotificationCenter.vue';
import AppIcon from './AppIcon.vue';

defineProps<{
  mode: 'splash' | 'wizard' | 'app';
}>();

const ui = useUiStore();
const auth = useAuthStore();
const localeStore = useLocaleStore();
const profile = useProfileStore();
const { t, lang } = useLocale();

const localePopoutOpen = ref(false);
const localeRoot = ref<HTMLElement | null>(null);
useClickOutside(localeRoot, () => { localePopoutOpen.value = false; });

type IconName = 'dashboard' | 'chart' | 'data' | 'settings' | 'user';

const profileInitial = computed(() => {
  if (profile.displayName) return profile.displayName.charAt(0).toUpperCase();
  return auth.user?.email?.charAt(0).toUpperCase() ?? '?';
});

const navItems = computed(() => [
  { key: 'Dashboard' as const, label: t('nav_dashboard'), icon: 'dashboard' as IconName },
  { key: 'Charts' as const, label: t('nav_charts'), icon: 'chart' as IconName },
  { key: 'Data' as const, label: t('nav_data'), icon: 'data' as IconName },
]);

const allTabs = computed(() => [
  { key: 'Profile' as const, label: t('nav_profile'), icon: 'user' as IconName },
  { key: 'Dashboard' as const, label: t('nav_dashboard'), icon: 'dashboard' as IconName },
  { key: 'Charts' as const, label: t('nav_charts'), icon: 'chart' as IconName },
  { key: 'Data' as const, label: t('nav_data'), icon: 'data' as IconName },
  { key: 'Settings' as const, label: t('nav_settings'), icon: 'settings' as IconName },
]);

const currentTabLabel = computed(() => {
  if (ui.tab === 'Profile') return t('nav_profile');
  const tab = allTabs.value.find((item) => item.key === ui.tab);
  return tab?.label ?? ui.tab;
});

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', ui.theme);
  document.documentElement.setAttribute('lang', lang.value);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', ui.theme);
});
</script>
