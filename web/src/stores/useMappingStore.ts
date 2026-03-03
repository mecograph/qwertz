import { defineStore } from 'pinia';
import type { MappingConfig, MappingField, MappingFieldSuggestion, ValidationIssue } from '../types';
import { learnMappings, registerNegativeMappingSignal, suggestMappings } from '../utils/mappingSuggestions';

export const useMappingStore = defineStore('mapping', {
  state: () => ({
    mapping: {} as MappingConfig,
    suggestions: {} as Partial<Record<MappingField, MappingFieldSuggestion>>,
    profileScope: 'anon',
    currentHeaders: [] as string[],
    issues: [] as ValidationIssue[],
  }),
  getters: {
    isComplete: (state) => Boolean(state.mapping.date && state.mapping.category && state.mapping.label && state.mapping.amount && state.mapping.purpose),
  },
  actions: {
    setProfileScope(scope: string) {
      this.profileScope = scope || 'anon';
    },
    autoSuggest(headers: string[]) {
      const result = suggestMappings(headers, this.profileScope);
      this.currentHeaders = headers;
      this.mapping = result.mapping;
      this.suggestions = result.suggestions;
    },
    setField(field: keyof MappingConfig, value: string) {
      const existing = this.suggestions[field];
      if (existing?.header && existing.header !== value && this.currentHeaders.length > 0) {
        registerNegativeMappingSignal(field, existing.header, this.currentHeaders, this.profileScope);
      }

      this.mapping[field] = value;
      this.suggestions[field] = {
        field,
        header: value,
        confidence: existing?.header === value ? existing.confidence : 0,
        reasons: existing?.header === value ? existing.reasons : [],
      };
    },
    learnFromConfirmedMapping(headers: string[]) {
      learnMappings(this.mapping, headers, this.profileScope);
    },
    setIssues(issues: ValidationIssue[]) {
      this.issues = issues;
    },
  },
});
