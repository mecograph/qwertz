import type { Tx } from '@/types/transactions'

export interface SankeyLink {
  source: string
  target: string
  value: number
  count: number
}

export const buildSankeyLinks = (rows: Tx[]) => {
  const expenses = rows.filter((r) => r.typ === 'Ausgabe')
  const income = rows.filter((r) => r.typ === 'Einnahme').reduce((sum, r) => sum + r.betrag, 0)

  const categoryTotals = new Map<string, { value: number; count: number }>()
  const labelTotals = new Map<string, { value: number; count: number }>()

  expenses.forEach((row) => {
    const cat = categoryTotals.get(row.kategorie) ?? { value: 0, count: 0 }
    cat.value += row.betragAbs
    cat.count += 1
    categoryTotals.set(row.kategorie, cat)

    const key = `${row.kategorie}::${row.bezeichnung}`
    const label = labelTotals.get(key) ?? { value: 0, count: 0 }
    label.value += row.betragAbs
    label.count += 1
    labelTotals.set(key, label)
  })

  const links: SankeyLink[] = []
  links.push({ source: 'Einnahmen', target: 'Budget', value: income, count: rows.filter((r) => r.typ === 'Einnahme').length })

  for (const [category, val] of categoryTotals.entries()) {
    links.push({ source: 'Budget', target: category, value: val.value, count: val.count })
  }

  for (const [key, val] of labelTotals.entries()) {
    const [category, label] = key.split('::')
    links.push({ source: category, target: `${category}: ${label}`, value: val.value, count: val.count })
  }

  return links
}

export const topCategory = (rows: Tx[]): string => {
  const totals = new Map<string, number>()
  rows.filter((r) => r.typ === 'Ausgabe').forEach((r) => totals.set(r.kategorie, (totals.get(r.kategorie) ?? 0) + r.betragAbs))
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'
}
