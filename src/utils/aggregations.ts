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

export function buildSankey(rows: Tx[]) {
  const nodes = [{ name: 'Income' }, { name: 'Budget' }];
  const links: { source: string; target: string; value: number }[] = [];

  const income = rows.filter((row) => row.type === 'Income').reduce((acc, row) => acc + row.amount, 0);
  links.push({ source: 'Income', target: 'Budget', value: income });

  const byCategory = new Map<string, number>();
  const byLabel = new Map<string, number>();

  rows.filter((row) => row.type === 'Expense').forEach((row) => {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.amountAbs);
    const labelKey = `${row.category}::${row.label}`;
    byLabel.set(labelKey, (byLabel.get(labelKey) ?? 0) + row.amountAbs);
  });

  byCategory.forEach((value, category) => {
    nodes.push({ name: category });
    links.push({ source: 'Budget', target: category, value });
  });

  byLabel.forEach((value, key) => {
    const [category, label] = key.split('::');
    const full = `${category} / ${label}`;
    nodes.push({ name: full });
    links.push({ source: category, target: full, value });
  });

  return { nodes, links };
}
