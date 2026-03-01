import { defineStore } from 'pinia';

export type ToastLevel = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  level: ToastLevel;
  message: string;
  createdAt: number;
}

const DEDUPE_WINDOW_MS = 30_000;

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastItem[],
    lastSeen: new Map<string, number>(),
  }),
  actions: {
    push(level: ToastLevel, message: string, ttlMs = 3200) {
      const key = `${level}:${message}`;
      const now = Date.now();
      const last = this.lastSeen.get(key);
      if (last && now - last < DEDUPE_WINDOW_MS) return;

      this.lastSeen.set(key, now);
      const id = crypto.randomUUID();
      this.items.push({ id, level, message, createdAt: now });

      window.setTimeout(() => {
        this.remove(id);
      }, ttlMs);
    },
    remove(id: string) {
      this.items = this.items.filter((item) => item.id !== id);
    },
  },
});
