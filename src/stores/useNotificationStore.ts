import { defineStore } from 'pinia';
import { notificationClient, type AppNotification, type NotificationSeverity } from '../services/notificationClient';
import { useAuthStore } from './useAuthStore';

export type { AppNotification, NotificationSeverity };

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: [] as AppNotification[],
  }),
  getters: {
    unreadCount: (state) => state.items.filter((item) => item.readAt === null).length,
  },
  actions: {
    async refresh() {
      const auth = useAuthStore();
      try {
        this.items = await notificationClient.list(auth.user);
      } catch (error) {
        console.warn('[notifications] refresh failed', error);
      }
    },
    async add(title: string, message: string, severity: NotificationSeverity = 'info') {
      const auth = useAuthStore();
      const fallback: AppNotification = {
        id: crypto.randomUUID(),
        title,
        message,
        severity,
        createdAt: Date.now(),
        readAt: null,
      };

      try {
        const entry = await notificationClient.create(auth.user, { title, message, severity });
        this.items = [entry, ...this.items].slice(0, 100);
      } catch (error) {
        console.warn('[notifications] add failed; keeping local fallback', error);
        this.items = [fallback, ...this.items].slice(0, 100);
      }
    },
    async markRead(id: string) {
      const auth = useAuthStore();
      try {
        await notificationClient.markRead(auth.user, id);
      } catch (error) {
        console.warn('[notifications] markRead failed', error);
      }
      this.items = this.items.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? Date.now() } : item));
    },
    async markAllRead() {
      const auth = useAuthStore();
      try {
        await notificationClient.markAllRead(auth.user);
      } catch (error) {
        console.warn('[notifications] markAllRead failed', error);
      }
      const now = Date.now();
      this.items = this.items.map((item) => ({ ...item, readAt: item.readAt ?? now }));
    },
    async clear() {
      const auth = useAuthStore();
      try {
        await notificationClient.clear(auth.user);
      } catch (error) {
        console.warn('[notifications] clear failed', error);
      }
      this.items = [];
    },
  },
});
