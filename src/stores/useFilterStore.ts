import { defineStore } from 'pinia';
import type { TxType } from '../types';

export const useFilterStore = defineStore('filters', {
  state: () => ({
    type: '' as '' | TxType,
    categories: [] as string[],
    labels: [] as string[],
    query: '',
    includeNeutral: false,
    startDate: '' as string,
    endDate: '' as string,
  }),
  getters: {
    dateLabel(state): string {
      if (state.startDate && state.endDate) {
        const fmt = (d: string) => {
          const dt = new Date(d + 'T00:00:00');
          return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };
        return `${fmt(state.startDate)} – ${fmt(state.endDate)}`;
      }
      return 'All time';
    },
  },
  actions: {
    reset() {
      this.type = '';
      this.categories = [];
      this.labels = [];
      this.query = '';
      this.includeNeutral = false;
      this.startDate = '';
      this.endDate = '';
    },
    setDateRange(start: string, end: string) {
      this.startDate = start;
      this.endDate = end;
    },
    applyCrossfilter(payload: { type?: '' | TxType; category?: string; label?: string; month?: string }) {
      if (payload.type !== undefined) this.type = payload.type;
      if (payload.category) this.categories = [payload.category];
      if (payload.label) this.labels = [payload.label];
      if (payload.month) {
        const [year, month] = payload.month.split('-');
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        this.startDate = `${payload.month}-01`;
        this.endDate = `${payload.month}-${String(lastDay).padStart(2, '0')}`;
      }
    },
  },
});
