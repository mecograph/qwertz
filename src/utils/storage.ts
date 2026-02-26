import type { Tx } from '../types/tx'

const TX_KEY = 'tx_app_transactions'
const SETTINGS_KEY = 'tx_app_settings'

export function saveTransactions(rows: Tx[]) {
  localStorage.setItem(TX_KEY, JSON.stringify(rows))
}

export function loadTransactions(): Tx[] {
  const raw = localStorage.getItem(TX_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Tx[]
    return parsed.map((r) => ({ ...r, buchungsdatum: new Date(r.buchungsdatum) }))
  } catch {
    return []
  }
}

export function clearStorage() {
  localStorage.removeItem(TX_KEY)
}

export function exportJson(rows: Tx[]) {
  return JSON.stringify(rows, null, 2)
}

export function importJson(content: string): Tx[] {
  const parsed = JSON.parse(content) as Tx[]
  return parsed.map((r) => ({ ...r, buchungsdatum: new Date(r.buchungsdatum) }))
}

export function saveSettings(settings: unknown) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadSettings<T>(defaults: T): T {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return defaults
  try {
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return defaults
  }
}
