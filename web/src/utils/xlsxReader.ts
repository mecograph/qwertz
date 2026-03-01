import * as XLSX from 'xlsx';

export interface WorkbookSheet {
  name: string;
  rows: Record<string, string>[];
}

export async function readXlsx(file: File): Promise<WorkbookSheet[]> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      raw: false,
      defval: '',
    });
    return { name, rows };
  });
}
