import type { MappingConfig } from '../types';

const HINTS: Record<keyof MappingConfig, string[]> = {
  date: ['date', 'datum', 'booking date', 'buchungsdatum'],
  category: ['category', 'kategorie', 'art'],
  label: ['label', 'bezeichnung', 'name', 'payee'],
  amount: ['amount', 'betrag', 'sum'],
  purpose: ['purpose', 'verwendungszweck', 'memo', 'description'],
};

export function suggestMappings(headers: string[]): MappingConfig {
  const lower = headers.map((header) => header.toLowerCase());
  const mapping: MappingConfig = {};

  (Object.keys(HINTS) as (keyof MappingConfig)[]).forEach((field) => {
    const matchIndex = lower.findIndex((header) => HINTS[field]?.some((hint) => header.includes(hint)));
    if (matchIndex >= 0) mapping[field] = headers[matchIndex];
  });

  return mapping;
}
