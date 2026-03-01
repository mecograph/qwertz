import { defineStore } from 'pinia';

export type OpsLevel = 'info' | 'warning' | 'error';

export interface OpsLogEntry {
  id: string;
  level: OpsLevel;
  event: string;
  message: string;
  createdAt: number;
}

const STORAGE_KEY = 'tx-ops-log-v1';

function load(): OpsLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(items: OpsLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useOpsLogStore = defineStore('ops-log', {
  state: () => ({
    entries: load() as OpsLogEntry[],
  }),
  actions: {
    add(level: OpsLevel, event: string, message: string) {
      const item: OpsLogEntry = {
        id: crypto.randomUUID(),
        level,
        event,
        message,
        createdAt: Date.now(),
      };
      this.entries = [item, ...this.entries].slice(0, 300);
      persist(this.entries);
    },
    clear() {
      this.entries = [];
      persist([]);
    },
  },
});
