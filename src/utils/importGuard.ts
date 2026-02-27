interface ImportQuotaState {
  day: string;
  count: number;
  bytes: number;
}

export interface ImportQuotaDecision {
  allowed: boolean;
  reason?: 'size_limit' | 'daily_count_limit' | 'daily_bytes_limit';
  state: ImportQuotaState;
}

const STORAGE_KEY = 'tx-import-quota-v1';
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_DAILY_IMPORTS = 20;
export const MAX_DAILY_BYTES = 120 * 1024 * 1024;

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readState(): ImportQuotaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { day: dayKey(), count: 0, bytes: 0 };
    const parsed = JSON.parse(raw) as ImportQuotaState;
    if (parsed.day !== dayKey()) return { day: dayKey(), count: 0, bytes: 0 };
    return parsed;
  } catch {
    return { day: dayKey(), count: 0, bytes: 0 };
  }
}

function persist(state: ImportQuotaState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function validateImport(fileSize: number): ImportQuotaDecision {
  const state = readState();

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { allowed: false, reason: 'size_limit', state };
  }

  if (state.count >= MAX_DAILY_IMPORTS) {
    return { allowed: false, reason: 'daily_count_limit', state };
  }

  if (state.bytes + fileSize > MAX_DAILY_BYTES) {
    return { allowed: false, reason: 'daily_bytes_limit', state };
  }

  return { allowed: true, state };
}

export function recordImport(fileSize: number) {
  const state = readState();
  const next = { day: dayKey(), count: state.count + 1, bytes: state.bytes + fileSize };
  persist(next);
  return next;
}

export function getImportQuotaState() {
  return readState();
}
