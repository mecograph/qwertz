import { ref } from 'vue';

export interface ImportRecord {
  id: string;
  timestamp: number;
  fileName: string;
  rowCount: number;
}

const STORAGE_KEY = 'tx-import-history';

function load(): ImportRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(records: ImportRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

const history = ref<ImportRecord[]>(load());

export function useImportHistory() {
  function add(fileName: string, rowCount: number) {
    const record: ImportRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      fileName,
      rowCount,
    };
    history.value = [record, ...history.value];
    persist(history.value);
  }

  function clear() {
    history.value = [];
    persist([]);
  }

  return { history, add, clear };
}
