import type { MappingConfig, Tx, ValidationIssue } from '../types';

function parseDateValue(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const normalized = value.replace(/\s+/g, '');
  const dmyMatch = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = dmyMatch[3].length === 2 ? 2000 + Number(dmyMatch[3]) : Number(dmyMatch[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  }

  return null;
}

function parseAmountValue(raw: string): number {
  const input = raw.trim();
  if (!input) return Number.NaN;

  const negative = input.includes('(') && input.includes(')') ? -1 : 1;
  let normalized = input
    .replace(/[€$£¥]/g, '')
    .replace(/\s|\u00A0/g, '')
    .replace(/[']/g, '')
    .replace(/[()]/g, '')
    .replace(/[−–—]/g, '-');

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    normalized = normalized.replace(',', '.');
  }

  normalized = normalized.replace(/(?!^)-/g, '');

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;

  return parsed * negative;
}

export function normalizeRows(rows: Record<string, string>[], mapping: MappingConfig): { valid: Tx[]; issues: ValidationIssue[] } {
  const valid: Tx[] = [];
  const issues: ValidationIssue[] = [];

  rows.forEach((row, index) => {
    const reasons: string[] = [];
    const dateRaw = mapping.date ? row[mapping.date] : '';
    const amountRaw = mapping.amount ? row[mapping.amount] : '';
    const purpose = (mapping.purpose ? row[mapping.purpose] : '').trim();
    const category = (mapping.category ? row[mapping.category] : '').trim();
    const label = (mapping.label ? row[mapping.label] : '').trim();

    const date = parseDateValue(dateRaw);
    const amount = parseAmountValue(String(amountRaw));

    if (!date) reasons.push('Invalid date');
    if (!Number.isFinite(amount)) reasons.push('Invalid amount');
    if (!purpose) reasons.push('Purpose is empty');
    if (!category) reasons.push('Category is empty');
    if (!label) reasons.push('Label is empty');

    if (reasons.length || !date) {
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
      purpose,
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
