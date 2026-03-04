export type TxType = 'Income' | 'Expense' | 'Neutral';

export interface Tx {
  id: string;
  date: string;
  category: string;
  label: string;
  purpose?: string;
  amount: number;
  type: TxType;
  month: string;
  amountAbs: number;
  importId?: string;
  description?: string;
  catSource?: 'csv' | 'rule' | 'ai' | 'manual';
  catConfidence?: number;
}

export interface ValidationIssue {
  row: number;
  reasons: string[];
}

export interface MappingConfig {
  date?: string;
  category?: string;
  label?: string;
  amount?: string;
  purpose?: string;
  description?: string;
}

export type MappingField = keyof MappingConfig;

export interface MappingFieldSuggestion {
  field: MappingField;
  header?: string;
  confidence: number;
  reasons: string[];
}

export type ConfidenceBucket = 'high' | 'medium' | 'low';

export type FingerprintCounter = Record<string, number>;
export type HeaderFingerprintCounts = Record<string, FingerprintCounter>;
export type FieldHeaderFingerprintCounts = Partial<Record<MappingField, HeaderFingerprintCounts>>;
export type FieldHeaderTimestamps = Partial<Record<MappingField, Record<string, number>>>;

export interface MappingProfileQuality {
  totalImports: number;
  highConfidenceHits: number;
  mediumConfidenceHits: number;
  lowConfidenceHits: number;
  corrections: number;
}

export interface MappingProfileAi {
  assistRuns: number;
  lastAssistAt: number | null;
}

export interface MappingProfile {
  version: number;
  updatedAt: number;
  counts: FieldHeaderFingerprintCounts;
  negativeCounts: FieldHeaderFingerprintCounts;
  lastUsedAt: FieldHeaderTimestamps;
  quality: MappingProfileQuality;
  ai: MappingProfileAi;
}

export interface MappingProfileDelta {
  counts?: FieldHeaderFingerprintCounts;
  negativeCounts?: FieldHeaderFingerprintCounts;
  lastUsedAt?: FieldHeaderTimestamps;
  quality?: Partial<MappingProfileQuality>;
  ai?: Partial<MappingProfileAi>;
}

export type MappingFeedbackType = 'import_confirm' | 'import_correction' | 'grid_correction';

export interface MappingFeedbackEvent {
  id?: string;
  type: MappingFeedbackType;
  field: MappingField;
  header: string;
  sourceFingerprint: string;
  previousValue?: string;
  newValue?: string;
  createdAt: number;
}

export interface AiMappingSuggestRequest {
  headers: string[];
  sampleRows: Record<string, string>[];
  locale?: string;
  historicalContext: Array<{
    header: string;
    historicalMappings: Array<{ field: MappingField; count: number }>;
  }>;
}

export interface AiMappingSuggestResponse {
  suggestions: Partial<Record<MappingField, { header: string; score: number; reasoning: string }>>;
}

// --- Categorization types ---

export interface CatRule {
  id: string;
  pattern: string;
  category: string;
  label: string;
  purpose?: string;
  hitCount: number;
  source: 'ai' | 'user';
  createdAt: number;
  updatedAt: number;
}

export interface CatRuleProfileQuality {
  totalCategorized: number;
  ruleHits: number;
  aiHits: number;
  corrections: number;
}

export interface CatRuleProfileAi {
  batchRuns: number;
  lastBatchAt: number | null;
}

export interface SubcategoryDef {
  id: string;
  label: Record<string, string>;
}

export interface CategoryDef {
  id: string;
  label: Record<string, string>;
  type: 'expense' | 'income' | 'neutral';
  subcategories: SubcategoryDef[];
}

export interface CatRuleProfile {
  version: number;
  updatedAt: number;
  rules: CatRule[];
  customCategories: CategoryDef[];
  quality: CatRuleProfileQuality;
  ai: CatRuleProfileAi;
}

export interface CatRuleProfileDelta {
  rules?: CatRule[];
  removedRuleIds?: string[];
  customCategories?: CategoryDef[];
  quality?: Partial<CatRuleProfileQuality>;
  ai?: Partial<CatRuleProfileAi>;
}

export type CatFeedbackType = 'review_confirm' | 'review_correction' | 'grid_correction';

export interface CatFeedbackEvent {
  id?: string;
  type: CatFeedbackType;
  description: string;
  pattern: string;
  category: string;
  label: string;
  purpose?: string;
  previousCategory?: string;
  previousLabel?: string;
  source: 'rule' | 'ai' | 'csv' | 'manual';
  createdAt: number;
}

export interface PendingCategorization {
  txId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  label: string;
  purpose: string;
  confidence: number;
  source: 'csv' | 'rule' | 'ai' | 'manual';
  reasoning?: string;
  reviewed: boolean;
  edited: boolean;
}

export interface AiCategorizeBatchRequest {
  transactions: Array<{ id: string; description: string; amount: number; date: string }>;
  existingRules: Array<{ pattern: string; category: string; label: string; purpose?: string }>;
  locale?: string;
}

export interface AiCategorizeBatchItem {
  id: string;
  category: string;
  label: string;
  purpose: string;
  confidence: number;
  reasoning: string;
  suggestedPattern: string;
}

export interface AiCategorizeBatchResponse {
  results: AiCategorizeBatchItem[];
}

export type ImportEventType = 'upload' | 'parse' | 'transform' | 'revert' | 'download';

export interface ImportEvent {
  id: string;
  type: ImportEventType;
  timestamp: number;
  detail?: string;
}
