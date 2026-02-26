import { defineStore } from 'pinia';
import type { Tx } from '../types';
import { persistRows, loadRows } from '../utils/storage';

function derive(tx: Tx): Tx {
  const month = String(new Date(tx.date).getMonth() + 1).padStart(2, '0');
  const amountAbs = Math.abs(tx.amount);
  const type = tx.category === 'Umbuchung' ? 'Neutral' : tx.amount > 0 ? 'Income' : 'Expense';
  return { ...tx, month, amountAbs, type };
}

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    rows: loadRows() as Tx[],
    history: [] as Tx[][],
    future: [] as Tx[][],
  }),
  actions: {
    setRows(rows: Tx[]) {
      this.rows = rows;
      persistRows(this.rows);
    },
    addRows(rows: Tx[]) {
      this.history.push(structuredClone(this.rows));
      this.future = [];
      this.rows = [...this.rows, ...rows];
      persistRows(this.rows);
    },
    editRow(id: string, patch: Partial<Tx>) {
      this.history.push(structuredClone(this.rows));
      this.future = [];
      this.rows = this.rows.map((row) => (row.id === id ? derive({ ...row, ...patch }) : row));
      persistRows(this.rows);
    },
    deleteRow(id: string) {
      this.history.push(structuredClone(this.rows));
      this.future = [];
      this.rows = this.rows.filter((row) => row.id !== id);
      persistRows(this.rows);
    },
    duplicateRow(id: string) {
      const row = this.rows.find((item) => item.id === id);
      if (!row) return;
      this.history.push(structuredClone(this.rows));
      this.future = [];
      this.rows.unshift({ ...row, id: crypto.randomUUID() });
      persistRows(this.rows);
    },
    undo() {
      const prev = this.history.pop();
      if (!prev) return;
      this.future.push(structuredClone(this.rows));
      this.rows = prev;
      persistRows(this.rows);
    },
    redo() {
      const next = this.future.pop();
      if (!next) return;
      this.history.push(structuredClone(this.rows));
      this.rows = next;
      persistRows(this.rows);
    },
  },
});
