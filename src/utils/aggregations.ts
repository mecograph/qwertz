import type { Tx } from '@/types/tx';

export function buildKpis(rows: Tx[]) {
  const income = rows.filter((tx) => tx.typ === 'Einnahme').reduce((a, b) => a + b.betrag, 0);
  const expenses = rows.filter((tx) => tx.typ === 'Ausgabe').reduce((a, b) => a + b.betragAbs, 0);
  const topCategory = Object.entries(
    rows
      .filter((tx) => tx.typ === 'Ausgabe')
      .reduce<Record<string, number>>((acc, tx) => {
        acc[tx.kategorie] = (acc[tx.kategorie] || 0) + tx.betragAbs;
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

  return {
    income,
    expenses,
    net: income - expenses,
    count: rows.length,
    topCategory,
  };
}

export function buildSankeyData(rows: Tx[], topCategories = 12, topLabels = 20) {
  const out = rows.filter((r) => r.typ === 'Ausgabe');
  const income = rows.filter((r) => r.typ === 'Einnahme').reduce((s, r) => s + r.betrag, 0);
  const byCategory = new Map<string, number>();
  const byLabel = new Map<string, number>();

  out.forEach((tx) => {
    byCategory.set(tx.kategorie, (byCategory.get(tx.kategorie) || 0) + tx.betragAbs);
    const labelKey = `${tx.kategorie}:::${tx.bezeichnung}`;
    byLabel.set(labelKey, (byLabel.get(labelKey) || 0) + tx.betragAbs);
  });

  const catTop = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, topCategories);
  const catSet = new Set(catTop.map(([k]) => k));

  const nodes = [{ name: 'Einnahmen' }, { name: 'Budget' }, ...catTop.map(([name]) => ({ name }))];
  const links = [{ source: 'Einnahmen', target: 'Budget', value: income }];

  catTop.forEach(([cat, value]) => links.push({ source: 'Budget', target: cat, value }));

  const labelTop = [...byLabel.entries()].filter(([key]) => catSet.has(key.split(':::')[0])).sort((a, b) => b[1] - a[1]).slice(0, topLabels);
  labelTop.forEach(([key, value]) => {
    const [cat, label] = key.split(':::');
    const node = `${cat} • ${label}`;
    nodes.push({ name: node });
    links.push({ source: cat, target: node, value });
  });

  return { nodes, links };
}
