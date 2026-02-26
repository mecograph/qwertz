import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useTransactionsStore } from './useTransactionsStore';

export const useFilterStore = defineStore('filters', () => {
  const year = ref<number | null>(null);
  const search = ref('');
  const typ = ref<'all' | 'Einnahme' | 'Ausgabe' | 'Neutral'>('all');

  const txStore = useTransactionsStore();

  const filteredRows = computed(() =>
    txStore.rows.filter((tx) => {
      const matchYear = !year.value || tx.buchungsdatum.getFullYear() === year.value;
      const matchTyp = typ.value === 'all' || tx.typ === typ.value;
      const matchSearch = !search.value || tx.verwendungszweck.toLowerCase().includes(search.value.toLowerCase());
      return matchYear && matchTyp && matchSearch;
    }),
  );

  return { year, search, typ, filteredRows };
});
