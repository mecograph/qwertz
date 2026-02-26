import type { Tx } from '@/types/tx';

const KEY = 'tx-analyzer-state';

export function saveRows(rows: Tx[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function loadRows(): Tx[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as (Omit<Tx, 'buchungsdatum'> & { buchungsdatum: string })[];
  return parsed.map((tx) => ({ ...tx, buchungsdatum: new Date(tx.buchungsdatum) }));
}

export function exportJson(rows: Tx[]) {
  return JSON.stringify(rows, null, 2);
}

export function clearStorage() {
  localStorage.removeItem(KEY);
}
