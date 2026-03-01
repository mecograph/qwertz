import { defineStore } from 'pinia';
import type { MappingConfig, ValidationIssue } from '../types';
import { suggestMappings } from '../utils/mappingSuggestions';

export const useMappingStore = defineStore('mapping', {
  state: () => ({
    mapping: {} as MappingConfig,
    issues: [] as ValidationIssue[],
  }),
  getters: {
    isComplete: (state) => Boolean(state.mapping.date && state.mapping.category && state.mapping.label && state.mapping.amount),
  },
  actions: {
    autoSuggest(headers: string[]) {
      this.mapping = suggestMappings(headers);
    },
    setField(field: keyof MappingConfig, value: string) {
      this.mapping[field] = value;
    },
    setIssues(issues: ValidationIssue[]) {
      this.issues = issues;
    },
  },
});
