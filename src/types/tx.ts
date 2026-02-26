export type TxType = 'Einnahme' | 'Ausgabe' | 'Neutral';

export type Tx = {
  id: string;
  buchungsdatum: Date;
  monat: string;
  kategorie: string;
  bezeichnung: string;
  verwendungszweck: string;
  typ: TxType;
  betrag: number;
  betragAbs: number;
  sourceSheet: string;
  sourceRowIndex: number;
};

export type ValidationError = {
  rowIndex: number;
  sheet: string;
  reasons: string[];
  row: Record<string, unknown>;
};
