import type { Tx } from '../types';

export function computeKpis(rows: Tx[]) {
  const income = rows.filter((row) => row.amount > 0).reduce((acc, row) => acc + row.amount, 0);
  const expenses = rows.filter((row) => row.amount < 0).reduce((acc, row) => acc + Math.abs(row.amount), 0);
  const net = income - expenses;
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    if (row.amount < 0) grouped.set(row.category, (grouped.get(row.category) ?? 0) + Math.abs(row.amount));
  });

  const topCategory = [...grouped.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  return { income, expenses, net, txCount: rows.length, topCategory };
}

function topNGrouped(entries: Map<string, number>, topN: number) {
  const sorted = [...entries.entries()].sort((a, b) => b[1] - a[1]);
  const kept = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const other = rest.reduce((sum, [, value]) => sum + value, 0);
  if (other > 0) kept.push(['Other', other]);
  return kept;
}

export function buildBudgetSankey(rows: Tx[]) {
  const incomeByCategory = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();

  rows.forEach((row) => {
    if (row.type === 'Income') incomeByCategory.set(row.category, (incomeByCategory.get(row.category) ?? 0) + row.amountAbs);
    if (row.type === 'Expense') expenseByCategory.set(row.category, (expenseByCategory.get(row.category) ?? 0) + row.amountAbs);
  });

  const nodes = [{ name: 'Budget' }];
  const links: { source: string; target: string; value: number }[] = [];

  topNGrouped(incomeByCategory, 12).forEach(([category, value]) => {
    const source = `Income · ${category}`;
    nodes.push({ name: source });
    links.push({ source, target: 'Budget', value });
  });

  topNGrouped(expenseByCategory, 12).forEach(([category, value]) => {
    nodes.push({ name: category });
    links.push({ source: 'Budget', target: category, value });
  });

  return { nodes, links };
}

export function buildCategoryDrilldownSankey(rows: Tx[], category: string) {
  const expenses = rows.filter((row) => row.type === 'Expense' && row.category === category);
  const byLabel = new Map<string, number>();

  expenses.forEach((row) => {
    byLabel.set(row.label, (byLabel.get(row.label) ?? 0) + row.amountAbs);
  });

  const nodes = [{ name: category }];
  const links: { source: string; target: string; value: number }[] = [];

  topNGrouped(byLabel, 20).forEach(([label, value]) => {
    const target = `${label}`;
    nodes.push({ name: target });
    links.push({ source: category, target, value });
  });

  return { nodes, links };
}
