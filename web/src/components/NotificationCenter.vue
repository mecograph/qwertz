<template>
  <div ref="root" class="relative">
    <button
      class="relative flex items-center justify-center rounded p-1.5 text-terminal-muted transition-colors hover:text-terminal-green"
      :title="t('notifications_title')"
      @click="open = !open"
    >
      <AppIcon name="bell" :size="18" />
      <span
        v-if="notifications.unreadCount"
        class="notification-badge absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center bg-terminal-red px-1 text-[10px] leading-none text-black"
      >
        {{ notifications.unreadCount }}
      </span>
    </button>

    <!-- Desktop: popout dropdown -->
    <div
      v-if="open"
      class="term-popout absolute right-0 top-full z-40 mt-2 hidden w-[360px] lg:block"
    >
      <div class="flex items-center justify-between px-4 pb-2">
        <p class="text-xs font-bold text-terminal-amber">{{ t('notifications_title') }}</p>
        <div class="flex gap-2">
          <button class="text-[10px] text-terminal-muted hover:text-terminal-green" @click="handleMarkAllRead">{{ t('notifications_mark_all_read') }}</button>
          <button class="text-[10px] text-terminal-muted hover:text-terminal-red" @click="handleClear">{{ t('notifications_clear') }}</button>
        </div>
      </div>

      <div class="relative">
        <div v-if="notifications.items.length" class="max-h-80 overflow-auto">
          <div
            v-for="item in notifications.items"
            :key="item.id"
            :data-notification-id="item.id"
            class="notification-item flex w-full border-b border-terminal-border last:border-b-0"
            :class="item.readAt ? 'opacity-60' : ''"
          >
            <div class="shrink-0" :class="[severityBarClass(item.severity), item.readAt ? 'w-[2px]' : 'w-1']"></div>
            <div class="flex-1 px-4 py-3">
              <p class="text-xs" :class="item.readAt ? 'font-normal' : 'font-semibold'">{{ item.title }}</p>
              <p class="mt-0.5 text-xs text-terminal-muted">{{ item.message }}</p>
              <p class="mt-1 text-[10px] text-terminal-muted">{{ formatDate(item.createdAt) }}</p>
            </div>
          </div>
        </div>
        <p v-else class="px-4 py-4 text-center text-xs text-terminal-muted">{{ t('notifications_empty') }}</p>

        <div v-if="busy" class="absolute inset-0 flex items-center justify-center bg-terminal-surface/70">
          <span class="animate-pulse text-xs text-terminal-muted">&#x2588;</span>
        </div>
      </div>
    </div>

    <!-- Mobile: full-screen modal -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center lg:hidden">
        <!-- Backdrop — click to close -->
        <div class="absolute inset-0 bg-black/50" @click="open = false"></div>
        <!-- Panel — stop all clicks so they don't reach the document listener -->
        <div class="term-popout relative z-10 w-[90vw] max-w-md max-h-[80vh] flex flex-col overflow-hidden" @click.stop>
          <div class="flex shrink-0 items-center justify-between px-4 py-3 border-b border-terminal-border">
            <p class="text-xs font-bold text-terminal-amber">{{ t('notifications_title') }}</p>
            <div class="flex items-center gap-3">
              <button class="text-[10px] text-terminal-muted hover:text-terminal-green" @click="handleMarkAllRead">{{ t('notifications_mark_all_read') }}</button>
              <button class="text-[10px] text-terminal-muted hover:text-terminal-red" @click="handleClear">{{ t('notifications_clear') }}</button>
              <button class="text-base leading-none text-terminal-muted hover:text-terminal-green" @click="open = false">×</button>
            </div>
          </div>

          <div class="relative min-h-0 flex-1 overflow-auto">
            <div v-if="notifications.items.length">
              <div
                v-for="item in notifications.items"
                :key="item.id"
                :data-notification-id="item.id"
                class="notification-item flex w-full border-b border-terminal-border last:border-b-0"
                :class="item.readAt ? 'opacity-60' : ''"
              >
                <div class="shrink-0" :class="[severityBarClass(item.severity), item.readAt ? 'w-[2px]' : 'w-1']"></div>
                <div class="flex-1 px-4 py-3">
                  <p class="text-xs" :class="item.readAt ? 'font-normal' : 'font-semibold'">{{ item.title }}</p>
                  <p class="mt-0.5 text-xs text-terminal-muted">{{ item.message }}</p>
                  <p class="mt-1 text-[10px] text-terminal-muted">{{ formatDate(item.createdAt) }}</p>
                </div>
              </div>
            </div>
            <p v-else class="px-4 py-6 text-center text-xs text-terminal-muted">{{ t('notifications_empty') }}</p>

            <div v-if="busy" class="absolute inset-0 flex items-center justify-center bg-terminal-surface/70">
              <span class="animate-pulse text-xs text-terminal-muted">&#x2588;</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useClickOutside } from '../composables/useClickOutside';
import { useLocale } from '../composables/useLocale';
import type { NotificationSeverity } from '../stores/useNotificationStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import AppIcon from './AppIcon.vue';

const notifications = useNotificationStore();
const { t, lang } = useLocale();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const busy = ref(false);

// Only use click-outside for the desktop dropdown (which lives inside root).
// On mobile, the Teleport'd modal is outside root's DOM subtree, so click-outside
// can't distinguish inside from outside. Mobile uses backdrop + × button instead.
const LG_BREAKPOINT = 1024;
useClickOutside(root, () => {
  if (window.innerWidth >= LG_BREAKPOINT) {
    open.value = false;
  }
});

// --- Spinner overlay for async actions ---
async function handleMarkAllRead() {
  busy.value = true;
  try {
    await notifications.markAllRead();
  } finally {
    busy.value = false;
  }
}

async function handleClear() {
  busy.value = true;
  try {
    await notifications.clear();
  } finally {
    busy.value = false;
  }
}

// --- Auto-mark-read via IntersectionObserver ---
let observer: IntersectionObserver | null = null;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearAutoRead() {
  for (const timer of pendingTimers.values()) clearTimeout(timer);
  pendingTimers.clear();
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function setupAutoRead() {
  clearAutoRead();

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.notificationId;
        if (!id) continue;

        if (entry.isIntersecting) {
          if (!pendingTimers.has(id)) {
            pendingTimers.set(
              id,
              setTimeout(() => {
                pendingTimers.delete(id);
                notifications.markRead(id);
              }, 3000),
            );
          }
        } else {
          const timer = pendingTimers.get(id);
          if (timer != null) {
            clearTimeout(timer);
            pendingTimers.delete(id);
          }
        }
      }
    },
    { threshold: 1.0 },
  );

  // Observe all unread notification items
  const els = document.querySelectorAll<HTMLElement>('.notification-item[data-notification-id]');
  for (const el of els) {
    const id = el.dataset.notificationId!;
    const item = notifications.items.find((n) => n.id === id);
    if (item && item.readAt === null) {
      observer.observe(el);
    }
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    setupAutoRead();
  } else {
    clearAutoRead();
  }
});

onBeforeUnmount(() => {
  clearAutoRead();
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(lang.value === 'de' ? 'de-DE' : 'en-GB');
}

function severityBarClass(severity: NotificationSeverity) {
  if (severity === 'success') return 'severity-bar-success';
  if (severity === 'warning') return 'bg-terminal-amber';
  if (severity === 'error') return 'bg-terminal-red';
  return 'bg-terminal-muted';
}
</script>
