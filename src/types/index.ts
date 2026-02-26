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
