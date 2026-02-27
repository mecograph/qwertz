<template>
  <div ref="root" class="relative">
    <button class="term-btn relative px-2 py-1 text-xs" @click="open = !open">
      {{ t('notifications_button') }}
      <span v-if="notifications.unreadCount" class="absolute -right-1 -top-1 rounded-full bg-terminal-red px-1 text-[10px] leading-4 text-black">
        {{ notifications.unreadCount }}
      </span>
    </button>

    <div v-if="open" class="absolute right-0 z-40 mt-2 w-[340px] border border-terminal-border bg-terminal-surface p-2 shadow-lg">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-xs font-bold text-terminal-amber">{{ t('notifications_title') }}</p>
        <div class="flex gap-2">
          <button class="text-[10px] text-terminal-muted hover:text-terminal-green" @click="notifications.markAllRead()">{{ t('notifications_mark_all_read') }}</button>
          <button class="text-[10px] text-terminal-muted hover:text-terminal-red" @click="notifications.clear()">{{ t('notifications_clear') }}</button>
        </div>
      </div>

      <div v-if="notifications.items.length" class="max-h-80 space-y-2 overflow-auto">
        <button
          v-for="item in notifications.items"
          :key="item.id"
          class="w-full border p-2 text-left"
          :class="[item.readAt ? 'opacity-70' : '', severityClass(item.severity)]"
          @click="notifications.markRead(item.id)"
        >
          <p class="text-xs font-semibold">{{ item.title }}</p>
          <p class="mt-1 text-xs text-terminal-muted">{{ item.message }}</p>
          <p class="mt-1 text-[10px] text-terminal-muted">{{ formatDate(item.createdAt) }}</p>
        </button>
      </div>
      <p v-else class="py-4 text-center text-xs text-terminal-muted">{{ t('notifications_empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useClickOutside } from '../composables/useClickOutside';
import { useLocale } from '../composables/useLocale';
import type { NotificationSeverity } from '../stores/useNotificationStore';
import { useNotificationStore } from '../stores/useNotificationStore';

const notifications = useNotificationStore();
const { t, lang } = useLocale();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

useClickOutside(root, () => {
  open.value = false;
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(lang.value === 'de' ? 'de-DE' : 'en-GB');
}

function severityClass(severity: NotificationSeverity) {
  if (severity === 'success') return 'border-terminal-green';
  if (severity === 'warning') return 'border-terminal-amber';
  if (severity === 'error') return 'border-terminal-red';
  return 'border-terminal-border';
}
</script>
