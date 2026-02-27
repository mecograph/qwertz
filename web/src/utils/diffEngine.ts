import type { Tx } from '../types';

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffRow {
  status: DiffStatus;
  original?: Tx;
  current?: Tx;
  changedFields?: string[];
}

export interface DiffResult {
  rows: DiffRow[];
  summary: { added: number; removed: number; modified: number; unchanged: number };
}

function compositeKey(row: Tx): string {
  return `${row.date}|${row.amount}|${row.category}|${row.label}`;
}

const COMPARE_FIELDS: (keyof Tx)[] = ['date', 'category', 'label', 'amount', 'purpose'];

function findChangedFields(original: Tx, current: Tx): string[] {
  return COMPARE_FIELDS.filter((f) => String(original[f] ?? '') !== String(current[f] ?? ''));
}

export function computeDiff(originalRows: Tx[], currentRows: Tx[]): DiffResult {
  // Build occurrence-indexed maps to handle duplicate keys
  const originalMap = new Map<string, Tx[]>();
  for (const row of originalRows) {
    const key = compositeKey(row);
    const arr = originalMap.get(key) ?? [];
    arr.push(row);
    originalMap.set(key, arr);
  }

  const currentMap = new Map<string, Tx[]>();
  for (const row of currentRows) {
    const key = compositeKey(row);
    const arr = currentMap.get(key) ?? [];
    arr.push(row);
    currentMap.set(key, arr);
  }

  const rows: DiffRow[] = [];
  const matchedOriginalKeys = new Set<string>();

  // Process all unique keys from both sets
  const allKeys = new Set([...originalMap.keys(), ...currentMap.keys()]);

  for (const key of allKeys) {
    const originals = originalMap.get(key) ?? [];
    const currents = currentMap.get(key) ?? [];

    const matchCount = Math.min(originals.length, currents.length);

    // Matched pairs: check for modifications
    for (let i = 0; i < matchCount; i++) {
      const changed = findChangedFields(originals[i], currents[i]);
      if (changed.length > 0) {
        rows.push({ status: 'modified', original: originals[i], current: currents[i], changedFields: changed });
      } else {
        rows.push({ status: 'unchanged', original: originals[i], current: currents[i] });
      }
    }

    // Extra originals = removed
    for (let i = matchCount; i < originals.length; i++) {
      rows.push({ status: 'removed', original: originals[i] });
    }

    // Extra currents = added
    for (let i = matchCount; i < currents.length; i++) {
      rows.push({ status: 'added', current: currents[i] });
    }
  }

  // Sort: removed first, then modified, added, unchanged
  const order: Record<DiffStatus, number> = { removed: 0, modified: 1, added: 2, unchanged: 3 };
  rows.sort((a, b) => order[a.status] - order[b.status]);

  const summary = {
    added: rows.filter((r) => r.status === 'added').length,
    removed: rows.filter((r) => r.status === 'removed').length,
    modified: rows.filter((r) => r.status === 'modified').length,
    unchanged: rows.filter((r) => r.status === 'unchanged').length,
  };

  return { rows, summary };
}
