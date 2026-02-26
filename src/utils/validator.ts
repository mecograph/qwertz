import type { MappingConfig, Tx, ValidationIssue } from '../types';

export function normalizeRows(rows: Record<string, string>[], mapping: MappingConfig): { valid: Tx[]; issues: ValidationIssue[] } {
  const valid: Tx[] = [];
  const issues: ValidationIssue[] = [];

  rows.forEach((row, index) => {
    const reasons: string[] = [];
    const dateRaw = mapping.date ? row[mapping.date] : '';
    const amountRaw = mapping.amount ? row[mapping.amount] : '';
    const category = (mapping.category ? row[mapping.category] : '').trim();
    const label = (mapping.label ? row[mapping.label] : '').trim();

    const date = new Date(dateRaw);
    const amount = Number(String(amountRaw).replace(',', '.'));

    if (!dateRaw || Number.isNaN(date.getTime())) reasons.push('Invalid date');
    if (!Number.isFinite(amount)) reasons.push('Invalid amount');
    if (!category) reasons.push('Category is empty');
    if (!label) reasons.push('Label is empty');

    if (reasons.length) {
      issues.push({ row: index + 1, reasons });
      return;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const amountAbs = Math.abs(amount);
    const type = category === 'Umbuchung' ? 'Neutral' : amount > 0 ? 'Income' : 'Expense';

    valid.push({
      id: crypto.randomUUID(),
      date: date.toISOString(),
      category,
      label,
      purpose: mapping.purpose ? row[mapping.purpose] : '',
      amount,
      month,
      amountAbs,
      type,
    });
  });

  return { valid, issues };
}

export function exportIssuesCsv(issues: ValidationIssue[]): string {
  return ['row,reasons', ...issues.map((i) => `${i.row},"${i.reasons.join('; ')}"`)].join('\n');
}
