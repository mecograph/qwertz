import Papa from 'papaparse';

export function parseCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      complete: (result) => resolve(result.data),
      error: reject,
    });
  });
}
