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

export type ImportEventType = 'upload' | 'parse' | 'transform' | 'revert' | 'download';

export interface ImportEvent {
  id: string;
  type: ImportEventType;
  timestamp: number;
  detail?: string;
}
