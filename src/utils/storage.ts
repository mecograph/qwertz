import type { Tx } from '@/types/transactions'

const KEY = 'tx-analysis-dataset-v1'

export interface SavedState {
  transactions: Tx[]
  updatedAt: string
}

export const saveToLocal = (transactions: Tx[]) => {
  const payload: SavedState = { transactions, updatedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(payload))
}

export const loadFromLocal = (): SavedState | null => {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SavedState
  } catch {
    return null
  }
}

export const clearLocal = () => localStorage.removeItem(KEY)

export const exportJson = (rows: Tx[]) => {
  const blob = new Blob([JSON.stringify({ transactions: rows }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'transactions.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
