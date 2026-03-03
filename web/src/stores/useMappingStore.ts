import { defineStore } from 'pinia';
import type {
  MappingConfig,
  MappingField,
  MappingFieldSuggestion,
  MappingProfile,
  MappingProfileDelta,
  ValidationIssue,
  ConfidenceBucket,
} from '../types';
import {
  suggestMappings,
  learnMappings,
  registerNegativeMappingSignal,
  buildAiHistoricalContext,
  emptyProfile,
  classifyConfidence,
  buildSourceFingerprint,
  normalizeHeader,
} from '../utils/mappingSuggestions';
import { mappingProfileClient } from '../services/mappingProfileClient';
import type { AuthUser } from './useAuthStore';

export const useMappingStore = defineStore('mapping', {
  state: () => ({
    mapping: {} as MappingConfig,
    suggestions: {} as Partial<Record<MappingField, MappingFieldSuggestion>>,
    profile: emptyProfile() as MappingProfile,
    profileLoaded: false,
    profileLoading: false,
    currentHeaders: [] as string[],
    issues: [] as ValidationIssue[],
    _user: null as AuthUser | null,
  }),
  getters: {
    isComplete: (state) => Boolean(
      state.mapping.date && state.mapping.category && state.mapping.label && state.mapping.amount && state.mapping.purpose,
    ),
  },
  actions: {
    async loadProfile(user: AuthUser | null) {
      this._user = user;
      if (this.profileLoading) return;
      this.profileLoading = true;
      try {
        this.profile = await mappingProfileClient.getProfile(user);
        this.profileLoaded = true;
      } catch {
        this.profile = emptyProfile();
        this.profileLoaded = true;
      } finally {
        this.profileLoading = false;
      }
    },

    persistDelta(delta: MappingProfileDelta) {
      // Fire-and-forget async save
      mappingProfileClient.updateProfileDelta(this._user, delta).catch(() => {});
    },

    autoSuggest(headers: string[], sampleRows: Record<string, string>[] = [], locale?: string) {
      this.currentHeaders = headers;
      const result = suggestMappings(headers, this.profile);
      this.mapping = result.mapping;
      this.suggestions = result.suggestions;

      // Check if any field has low confidence → trigger AI assist
      const hasLowConfidence = Object.values(result.suggestions).some(
        (s) => s && classifyConfidence(s.confidence) === 'low',
      );
      if (hasLowConfidence) {
        this._triggerAiAssist(headers, sampleRows, locale);
      }
    },

    async _triggerAiAssist(headers: string[], sampleRows: Record<string, string>[] = [], locale?: string) {
      try {
        const historicalContext = buildAiHistoricalContext(headers, this.profile);
        const aiResponse = await mappingProfileClient.aiSuggestMapping(this._user, {
          headers,
          sampleRows: sampleRows.slice(0, 5),
          locale,
          historicalContext,
        });

        if (Object.keys(aiResponse.suggestions).length > 0) {
          // Re-run suggestions with AI scores merged in
          const result = suggestMappings(headers, this.profile, aiResponse.suggestions);
          this.mapping = result.mapping;
          this.suggestions = result.suggestions;

          // Track AI assist usage
          const aiDelta: MappingProfileDelta = {
            ai: { assistRuns: 1, lastAssistAt: Date.now() },
          };
          this.profile = {
            ...this.profile,
            ai: {
              assistRuns: this.profile.ai.assistRuns + 1,
              lastAssistAt: Date.now(),
            },
          };
          this.persistDelta(aiDelta);
        }
      } catch {
        // AI failure is non-critical; keep heuristic suggestions
      }
    },

    setField(field: keyof MappingConfig, value: string) {
      const existing = this.suggestions[field];
      if (existing?.header && existing.header !== value && this.currentHeaders.length > 0) {
        const { updatedProfile, delta } = registerNegativeMappingSignal(
          field,
          existing.header,
          this.currentHeaders,
          this.profile,
        );
        this.profile = updatedProfile;
        this.persistDelta(delta);

        // Record import_correction feedback
        const sourceFingerprint = buildSourceFingerprint(this.currentHeaders);
        mappingProfileClient.recordFeedback(this._user, {
          type: 'import_correction',
          field,
          header: normalizeHeader(existing.header),
          sourceFingerprint,
          previousValue: existing.header,
          newValue: value,
          createdAt: Date.now(),
        }).catch(() => {});
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
      const { updatedProfile, delta } = learnMappings(this.mapping, headers, this.profile);
      this.profile = updatedProfile;
      this.persistDelta(delta);

      // Record import_confirm feedback for each mapped field
      const sourceFingerprint = buildSourceFingerprint(headers);
      const fields: MappingField[] = ['date', 'category', 'label', 'amount', 'purpose'];
      for (const field of fields) {
        const header = this.mapping[field];
        if (!header) continue;
        mappingProfileClient.recordFeedback(this._user, {
          type: 'import_confirm',
          field,
          header: normalizeHeader(header),
          sourceFingerprint,
          createdAt: Date.now(),
        }).catch(() => {});
      }
    },

    trackQuality(
      suggestions: Partial<Record<MappingField, MappingFieldSuggestion>>,
      finalMapping: MappingConfig,
    ) {
      const qualityDelta: Partial<Record<string, number>> = { totalImports: 1 };
      const fields: MappingField[] = ['date', 'category', 'label', 'amount', 'purpose'];

      for (const field of fields) {
        const suggestion = suggestions[field];
        if (!suggestion) continue;
        const bucket = classifyConfidence(suggestion.confidence);

        // Count predictions per bucket
        if (bucket === 'high') qualityDelta.highConfidenceHits = (qualityDelta.highConfidenceHits ?? 0) + 1;
        else if (bucket === 'medium') qualityDelta.mediumConfidenceHits = (qualityDelta.mediumConfidenceHits ?? 0) + 1;
        else qualityDelta.lowConfidenceHits = (qualityDelta.lowConfidenceHits ?? 0) + 1;

        // Check if user changed the suggestion
        if (suggestion.header && suggestion.header !== finalMapping[field]) {
          qualityDelta.corrections = (qualityDelta.corrections ?? 0) + 1;
        }
      }

      const delta: MappingProfileDelta = { quality: qualityDelta };
      // Update in-memory profile
      this.profile = {
        ...this.profile,
        quality: {
          totalImports: this.profile.quality.totalImports + (qualityDelta.totalImports ?? 0),
          highConfidenceHits: this.profile.quality.highConfidenceHits + (qualityDelta.highConfidenceHits ?? 0),
          mediumConfidenceHits: this.profile.quality.mediumConfidenceHits + (qualityDelta.mediumConfidenceHits ?? 0),
          lowConfidenceHits: this.profile.quality.lowConfidenceHits + (qualityDelta.lowConfidenceHits ?? 0),
          corrections: this.profile.quality.corrections + (qualityDelta.corrections ?? 0),
        },
      };
      this.persistDelta(delta);
    },

    recordGridCorrection(field: MappingField, oldValue: string, newValue: string) {
      if (!this.currentHeaders.length) return;
      const sourceFingerprint = buildSourceFingerprint(this.currentHeaders);
      const header = this.mapping[field] ?? '';

      mappingProfileClient.recordFeedback(this._user, {
        type: 'grid_correction',
        field,
        header: normalizeHeader(header),
        sourceFingerprint,
        previousValue: oldValue,
        newValue,
        createdAt: Date.now(),
      }).catch(() => {});

      // Also increment correction quality counter
      const delta: MappingProfileDelta = { quality: { corrections: 1 } };
      this.profile = {
        ...this.profile,
        quality: {
          ...this.profile.quality,
          corrections: this.profile.quality.corrections + 1,
        },
      };
      this.persistDelta(delta);
    },

    setIssues(issues: ValidationIssue[]) {
      this.issues = issues;
    },
  },
});
