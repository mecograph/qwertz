import { defineStore } from 'pinia';
import type { TxType } from '../types';

export const useFilterStore = defineStore('filters', {
  state: () => ({
    type: '' as '' | TxType,
    categories: [] as string[],
    labels: [] as string[],
    query: '',
  }),
  actions: {
    reset() {
      this.type = '';
      this.categories = [];
      this.labels = [];
      this.query = '';
    },
  },
});
