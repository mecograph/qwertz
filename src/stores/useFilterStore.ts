import { defineStore } from 'pinia';
import type { TxType } from '../types';

export type TimeGranularity = 'Year' | 'Month' | 'ISO Week' | 'Day' | 'Custom';

export const useFilterStore = defineStore('filters', {
  state: () => ({
    type: '' as '' | TxType,
    categories: [] as string[],
    labels: [] as string[],
    query: '',
    includeNeutral: false,
    timeGranularity: 'Year' as TimeGranularity,
    selectedYear: '' as string,
    selectedMonth: '' as string,
    startDate: '' as string,
    endDate: '' as string,
  }),
  actions: {
    reset() {
      this.type = '';
      this.categories = [];
      this.labels = [];
      this.query = '';
      this.includeNeutral = false;
      this.timeGranularity = 'Year';
      this.selectedMonth = '';
      this.startDate = '';
      this.endDate = '';
    },
    applyCrossfilter(payload: { type?: '' | TxType; category?: string; label?: string; month?: string }) {
      if (payload.type !== undefined) this.type = payload.type;
      if (payload.category) this.categories = [payload.category];
      if (payload.label) this.labels = [payload.label];
      if (payload.month) {
        this.selectedMonth = payload.month;
        this.timeGranularity = 'Month';
      }
    },
  },
});
