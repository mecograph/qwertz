import { defineStore } from 'pinia';
import { parseCsv } from '../utils/csvParser';
import { readXlsx } from '../utils/xlsxReader';

export const useImportStore = defineStore('import', {
  state: () => ({
    rows: [] as Record<string, string>[],
    headers: [] as string[],
    sheets: [] as { name: string; rows: Record<string, string>[] }[],
    selectedSheet: '',
    fileName: '',
  }),
  actions: {
    async importFile(file: File) {
      this.fileName = file.name;
      if (file.name.toLowerCase().endsWith('.csv')) {
        this.rows = await parseCsv(file);
      } else {
        this.sheets = await readXlsx(file);
        const first = this.sheets.find((sheet) => sheet.rows.length > 0) ?? this.sheets[0];
        this.selectedSheet = first?.name ?? '';
        this.rows = first?.rows ?? [];
      }
      this.headers = Object.keys(this.rows[0] ?? {});
    },
    setSheet(name: string) {
      const sheet = this.sheets.find((item) => item.name === name);
      if (!sheet) return;
      this.selectedSheet = name;
      this.rows = sheet.rows;
      this.headers = Object.keys(this.rows[0] ?? {});
    },
  },
});
