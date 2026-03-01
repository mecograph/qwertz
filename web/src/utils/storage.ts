import type { Tx } from '../types';

const KEY = 'tx-analyzer-state-v1';

export function persistRows(rows: Tx[]) {
  localStorage.setItem(KEY, JSON.stringify({ rows, updatedAt: Date.now() }));
}

export function loadRows(): Tx[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw).rows ?? [];
}

export function clearRows() {
  localStorage.removeItem(KEY);
}
