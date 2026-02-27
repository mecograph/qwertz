import { defineStore } from 'pinia';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: number;
  readAt: number | null;
}

const STORAGE_KEY = 'tx-notifications-v1';

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(items: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: load() as AppNotification[],
  }),
  getters: {
    unreadCount: (state) => state.items.filter((item) => item.readAt === null).length,
  },
  actions: {
    add(title: string, message: string, severity: NotificationSeverity = 'info') {
      const entry: AppNotification = {
        id: crypto.randomUUID(),
        title,
        message,
        severity,
        createdAt: Date.now(),
        readAt: null,
      };
      this.items = [entry, ...this.items].slice(0, 100);
      persist(this.items);
    },
    markRead(id: string) {
      this.items = this.items.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? Date.now() } : item));
      persist(this.items);
    },
    markAllRead() {
      const now = Date.now();
      this.items = this.items.map((item) => ({ ...item, readAt: item.readAt ?? now }));
      persist(this.items);
    },
    clear() {
      this.items = [];
      persist([]);
    },
  },
});
