import type { Tx } from '../types/tx'

export function buildKpis(rows: Tx[]) {
  const income = rows.filter((r) => r.typ === 'Einnahme').reduce((s, r) => s + r.betrag, 0)
  const expenses = rows.filter((r) => r.typ === 'Ausgabe').reduce((s, r) => s + Math.abs(r.betrag), 0)
  const topCategory = Object.entries(
    rows
      .filter((r) => r.typ === 'Ausgabe')
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.kategorie] = (acc[row.kategorie] ?? 0) + row.betragAbs
        return acc
      }, {}),
  ).sort((a, b) => b[1] - a[1])[0]

  return {
    income,
    expenses,
    net: income - expenses,
    count: rows.length,
    topCategory: topCategory?.[0] ?? '-',
  }
}

export function sankeyData(rows: Tx[], topCategories: number, topLabels: number) {
  const txRows = rows.filter((r) => r.typ !== 'Neutral')
  const expenses = txRows.filter((r) => r.typ === 'Ausgabe')
  const income = txRows.filter((r) => r.typ === 'Einnahme').reduce((s, r) => s + r.betrag, 0)

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, r) => {
    acc[r.kategorie] = (acc[r.kategorie] ?? 0) + r.betragAbs
    return acc
  }, {})

  const topCats = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCategories)

  const catSet = new Set(topCats.map(([k]) => k))

  const labelTotals = expenses
    .filter((r) => catSet.has(r.kategorie))
    .reduce<Record<string, number>>((acc, r) => {
      const key = `${r.kategorie}::${r.bezeichnung}`
      acc[key] = (acc[key] ?? 0) + r.betragAbs
      return acc
    }, {})

  const topLab = Object.entries(labelTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLabels)

  const nodes = [{ name: 'Einnahmen' }, { name: 'Budget' }, ...topCats.map(([c]) => ({ name: c }))]
  topLab.forEach(([k]) => {
    const [, label] = k.split('::')
    nodes.push({ name: label })
  })

  const links = [{ source: 'Einnahmen', target: 'Budget', value: income }]
  topCats.forEach(([cat, value]) => links.push({ source: 'Budget', target: cat, value }))
  topLab.forEach(([k, value]) => {
    const [cat, label] = k.split('::')
    links.push({ source: cat, target: label, value })
  })

  return { nodes, links }
}
