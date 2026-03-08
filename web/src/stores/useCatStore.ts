import { defineStore } from 'pinia';
import type {
  CatRuleProfile,
  CatRuleProfileDelta,
  PendingCategorization,
  Tx,
  CatRule,
} from '../types';
import { emptyRuleProfile } from '../services/catRuleClient';
import {
  normalizeDescription,
  extractPattern,
  categorizeByRules,
  createRuleFromTransaction,
  findRuleByPattern,
} from '../utils/categorizationEngine';
import type { AuthUser } from './useAuthStore';

// Lazy-load client to avoid blocking store evaluation
let _client: typeof import('../services/catRuleClient')['catRuleClient'] | null = null;
async function getClient() {
  if (!_client) {
    const mod = await import('../services/catRuleClient');
    _client = mod.catRuleClient;
  }
  return _client;
}

const MAX_AI_BATCH_SIZE = 50;
const MAX_AI_CALLS_PER_IMPORT = 5;

export const useCatStore = defineStore('categorization', {
  state: () => ({
    profile: emptyRuleProfile() as CatRuleProfile,
    profileLoaded: false,
    profileLoading: false,
    pending: [] as PendingCategorization[],
    aiRunning: false,
    aiProgress: { done: 0, total: 0 },
    aiError: '' as string,
    activeUser: null as AuthUser | null,
  }),

  getters: {
    needsReview: (state) => state.pending.some((p) => !p.reviewed),
    reviewStats: (state) => {
      const total = state.pending.length;
      const reviewed = state.pending.filter((p) => p.reviewed).length;
      const highConf = state.pending.filter((p) => p.confidence >= 0.7).length;
      const lowConf = state.pending.filter((p) => p.confidence < 0.4).length;
      const byCsv = state.pending.filter((p) => p.source === 'csv').length;
      const byRule = state.pending.filter((p) => p.source === 'rule').length;
      const byAi = state.pending.filter((p) => p.source === 'ai').length;
      return { total, reviewed, highConf, lowConf, byCsv, byRule, byAi };
    },
  },

  actions: {
    async loadProfile(user: AuthUser | null) {
      this.activeUser = user;
      if (this.profileLoading) return;
      this.profileLoading = true;
      try {
        const c = await getClient();
        this.profile = await c.getProfile(user);
        this.profileLoaded = true;
      } catch {
        this.profile = emptyRuleProfile();
        this.profileLoaded = true;
      } finally {
        this.profileLoading = false;
      }
    },

    /**
     * Run the full categorization pipeline on normalized rows.
     * Rows with catSource='csv' are passed through. Others go through rules → AI.
     */
    async categorize(rows: Tx[], locale?: string) {
      const pending: PendingCategorization[] = [];

      // Separate rows that already have CSV categories from those needing categorization
      const needsCategorization: Array<{ idx: number; tx: Tx }> = [];

      for (let i = 0; i < rows.length; i++) {
        const tx = rows[i];
        if (tx.catSource === 'csv' && tx.category && tx.label) {
          pending.push({
            txId: tx.id,
            description: tx.description ?? '',
            amount: tx.amount,
            date: tx.date,
            category: tx.category,
            label: tx.label,
            purpose: tx.purpose ?? '',
            confidence: 1.0,
            source: 'csv',
            reviewed: true,
            edited: false,
          });
        } else if (tx.description) {
          needsCategorization.push({ idx: i, tx });
        } else {
          // No description and no CSV category — mark as manual/low confidence
          pending.push({
            txId: tx.id,
            description: '',
            amount: tx.amount,
            date: tx.date,
            category: tx.category || 'other',
            label: tx.label || 'misc',
            purpose: tx.purpose ?? '',
            confidence: 0,
            source: 'manual',
            reviewed: false,
            edited: false,
          });
        }
      }

      // Step 1: Rule matching
      if (needsCategorization.length > 0) {
        const descriptions = needsCategorization.map((n) => ({
          description: n.tx.description!,
          amount: n.tx.amount,
          date: n.tx.date,
        }));

        const ruleResult = categorizeByRules(descriptions, this.profile.rules);

        // Process matched
        for (const match of ruleResult.matched) {
          const orig = needsCategorization[match.index];
          const confidence = match.matchType === 'exact' ? 0.9 : 0.7;
          pending.push({
            txId: orig.tx.id,
            description: orig.tx.description!,
            amount: orig.tx.amount,
            date: orig.tx.date,
            category: match.rule.category,
            label: match.rule.label,
            purpose: match.rule.purpose ?? '',
            confidence,
            source: 'rule',
            reviewed: false,
            edited: false,
          });
        }

        // Step 2: AI fallback for unmatched
        if (ruleResult.unmatched.length > 0) {
          const aiResults = await this.runAiBatches(
            ruleResult.unmatched.map((u) => ({
              id: needsCategorization[u.index].tx.id,
              description: u.rawDesc,
              amount: u.amount,
              date: u.date,
            })),
            locale,
          );

          const aiMap = new Map(aiResults.map((r) => [r.id, r]));

          for (const unmatched of ruleResult.unmatched) {
            const orig = needsCategorization[unmatched.index];
            const aiResult = aiMap.get(orig.tx.id);

            if (aiResult) {
              pending.push({
                txId: orig.tx.id,
                description: orig.tx.description!,
                amount: orig.tx.amount,
                date: orig.tx.date,
                category: aiResult.category,
                label: aiResult.label,
                purpose: aiResult.purpose,
                confidence: aiResult.confidence,
                source: 'ai',
                reasoning: aiResult.reasoning,
                reviewed: false,
                edited: false,
              });

              // Auto-create rules from AI results with decent confidence
              if (aiResult.confidence >= 0.5 && aiResult.suggestedPattern) {
                const existing = findRuleByPattern(aiResult.suggestedPattern, this.profile.rules);
                if (!existing) {
                  const newRule = createRuleFromTransaction(
                    orig.tx.description!,
                    aiResult.category,
                    aiResult.label,
                    aiResult.purpose,
                    'ai',
                  );
                  newRule.pattern = aiResult.suggestedPattern;
                  this.profile.rules.push(newRule);
                }
              }
            } else {
              pending.push({
                txId: orig.tx.id,
                description: orig.tx.description!,
                amount: orig.tx.amount,
                date: orig.tx.date,
                category: 'other',
                label: 'misc',
                purpose: '',
                confidence: 0,
                source: 'manual',
                reviewed: false,
                edited: false,
              });
            }
          }
        }
      }

      // Sort: low confidence / unreviewed first
      pending.sort((a, b) => {
        if (a.reviewed !== b.reviewed) return a.reviewed ? 1 : -1;
        return a.confidence - b.confidence;
      });

      this.pending = pending;
    },

    async runAiBatches(
      transactions: Array<{ id: string; description: string; amount: number; date: string }>,
      locale?: string,
    ) {
      const allResults: Array<{ id: string; category: string; label: string; purpose: string; confidence: number; reasoning: string; suggestedPattern: string }> = [];
      this.aiRunning = true;
      this.aiProgress = { done: 0, total: transactions.length };

      try {
        const c = await getClient();
        let callCount = 0;

        for (let i = 0; i < transactions.length && callCount < MAX_AI_CALLS_PER_IMPORT; i += MAX_AI_BATCH_SIZE) {
          const batch = transactions.slice(i, i + MAX_AI_BATCH_SIZE);
          callCount++;

          try {
            const response = await c.aiCategorizeBatch(this.activeUser, {
              transactions: batch,
              existingRules: this.profile.rules.slice(0, 50).map((r) => ({
                pattern: r.pattern,
                category: r.category,
                label: r.label,
                purpose: r.purpose,
              })),
              locale,
            });
            allResults.push(...response.results);
          } catch (err: any) {
            // AI call failed — stop retrying and inform user
            const msg = err?.message ?? '';
            if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
              this.aiError = 'rate_limit';
            } else {
              this.aiError = 'generic';
            }
            break;
          }

          this.aiProgress = { done: Math.min(i + MAX_AI_BATCH_SIZE, transactions.length), total: transactions.length };
        }
      } finally {
        this.aiRunning = false;
      }

      return allResults;
    },

    updatePending(txId: string, patch: Partial<PendingCategorization>) {
      const idx = this.pending.findIndex((p) => p.txId === txId);
      if (idx >= 0) {
        this.pending[idx] = { ...this.pending[idx], ...patch, edited: true };
      }
    },

    confirmRow(txId: string) {
      const idx = this.pending.findIndex((p) => p.txId === txId);
      if (idx >= 0) {
        this.pending[idx] = { ...this.pending[idx], reviewed: true };
      }
    },

    confirmAllHighConfidence() {
      this.pending = this.pending.map((p) =>
        p.confidence >= 0.7 ? { ...p, reviewed: true } : p,
      );
    },

    confirmAll() {
      this.pending = this.pending.map((p) => ({ ...p, reviewed: true }));
    },

    /**
     * Finalize: create/update rules from corrections, persist profile, return final Tx array.
     */
    async finalize(): Promise<Tx[]> {
      const newRules: CatRule[] = [];
      const qualityDelta = { totalCategorized: 0, ruleHits: 0, aiHits: 0, corrections: 0 };
      const c = await getClient();

      for (const p of this.pending) {
        qualityDelta.totalCategorized++;
        if (p.source === 'rule') qualityDelta.ruleHits++;
        if (p.source === 'ai') qualityDelta.aiHits++;

        if (p.edited && p.description) {
          qualityDelta.corrections++;
          // Create or update rule from correction
          const pattern = extractPattern(p.description);
          const existing = findRuleByPattern(pattern, this.profile.rules);
          if (existing) {
            existing.category = p.category;
            existing.label = p.label;
            existing.purpose = p.purpose || existing.purpose;
            existing.hitCount++;
            existing.updatedAt = Date.now();
            newRules.push(existing);
          } else {
            const rule = createRuleFromTransaction(p.description, p.category, p.label, p.purpose, 'user');
            this.profile.rules.push(rule);
            newRules.push(rule);
          }

          // Record correction feedback
          c.recordFeedback(this.activeUser, {
            type: 'review_correction',
            description: p.description,
            pattern: extractPattern(p.description),
            category: p.category,
            label: p.label,
            purpose: p.purpose,
            source: p.source,
            createdAt: Date.now(),
          }).catch(() => {});
        } else if (p.source === 'rule' && p.description) {
          // Increment hitCount for confirmed rule matches
          const pattern = extractPattern(p.description);
          const existing = findRuleByPattern(pattern, this.profile.rules);
          if (existing) {
            existing.hitCount++;
            existing.updatedAt = Date.now();
            newRules.push(existing);
          }

          c.recordFeedback(this.activeUser, {
            type: 'review_confirm',
            description: p.description,
            pattern: extractPattern(p.description),
            category: p.category,
            label: p.label,
            purpose: p.purpose,
            source: p.source,
            createdAt: Date.now(),
          }).catch(() => {});
        }
      }

      // Persist profile delta
      const delta: CatRuleProfileDelta = {
        rules: newRules.length > 0 ? newRules : undefined,
        quality: qualityDelta,
        ai: this.aiProgress.total > 0 ? { batchRuns: 1, lastBatchAt: Date.now() } : undefined,
      };

      // Update in-memory profile quality
      this.profile.quality = {
        totalCategorized: this.profile.quality.totalCategorized + qualityDelta.totalCategorized,
        ruleHits: this.profile.quality.ruleHits + qualityDelta.ruleHits,
        aiHits: this.profile.quality.aiHits + qualityDelta.aiHits,
        corrections: this.profile.quality.corrections + qualityDelta.corrections,
      };

      c.updateProfileDelta(this.activeUser, delta).catch(() => {});

      // Build final Tx array
      return this.pending.map((p) => {
        const type = p.category === 'transfers' ? 'Neutral' : p.amount > 0 ? 'Income' : 'Expense';
        const date = new Date(p.date);
        return {
          id: p.txId,
          date: p.date,
          category: p.category,
          label: p.label,
          purpose: p.purpose,
          amount: p.amount,
          type,
          month: String(date.getMonth() + 1).padStart(2, '0'),
          amountAbs: Math.abs(p.amount),
          description: p.description || undefined,
          catSource: p.source,
          catConfidence: p.confidence,
        } as Tx;
      });
    },

    /**
     * Learn from DataGrid edits post-import.
     */
    async recordGridCategorization(description: string, category: string, label: string, purpose: string) {
      if (!description) return;

      const pattern = extractPattern(description);
      const existing = findRuleByPattern(pattern, this.profile.rules);

      if (existing) {
        existing.category = category;
        existing.label = label;
        existing.purpose = purpose || existing.purpose;
        existing.hitCount++;
        existing.updatedAt = Date.now();
      } else {
        const rule = createRuleFromTransaction(description, category, label, purpose, 'user');
        this.profile.rules.push(rule);
      }

      const c = await getClient();
      const delta: CatRuleProfileDelta = {
        rules: [existing ?? this.profile.rules[this.profile.rules.length - 1]],
        quality: { corrections: 1 },
      };
      c.updateProfileDelta(this.activeUser, delta).catch(() => {});

      c.recordFeedback(this.activeUser, {
        type: 'grid_correction',
        description,
        pattern,
        category,
        label,
        purpose,
        source: 'manual',
        createdAt: Date.now(),
      }).catch(() => {});
    },
  },
});
