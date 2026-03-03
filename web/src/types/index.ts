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

export type ImportEventType = 'upload' | 'parse' | 'transform' | 'revert' | 'download';

export interface ImportEvent {
  id: string;
  type: ImportEventType;
  timestamp: number;
  detail?: string;
}
