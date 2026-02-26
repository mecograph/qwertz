import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Tx, ValidationError } from '@/types/tx';
import { buildKpis } from '@/utils/aggregations';
import { loadRows, saveRows } from '@/utils/storage';

export const useTransactionsStore = defineStore('transactions', () => {
  const rows = ref<Tx[]>(loadRows());
  const errors = ref<ValidationError[]>([]);

  const kpis = computed(() => buildKpis(rows.value));

  function setRows(next: Tx[], nextErrors: ValidationError[] = []) {
    rows.value = next;
    errors.value = nextErrors;
    saveRows(rows.value);
  }

  function updateRow(id: string, patch: Partial<Tx>) {
    const tx = rows.value.find((r) => r.id === id);
    if (!tx) return;
    Object.assign(tx, patch);
    tx.monat = String(tx.buchungsdatum.getMonth() + 1).padStart(2, '0');
    tx.typ = tx.kategorie === 'Umbuchung' ? 'Neutral' : tx.betrag > 0 ? 'Einnahme' : 'Ausgabe';
    tx.betragAbs = Math.abs(tx.betrag);
    saveRows(rows.value);
  }

  return { rows, errors, kpis, setRows, updateRow };
});
