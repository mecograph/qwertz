import Papa from 'papaparse';

const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const;

/**
 * Detect file encoding by inspecting the BOM (Byte Order Mark).
 * German bank CSVs commonly use UTF-16 LE, Windows-1252, or UTF-8.
 */
function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // UTF-16 LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le';
  }
  // UTF-16 BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be';
  }
  // UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }

  // No BOM — check for null bytes which indicate UTF-16 without BOM
  // (every other byte is 0x00 for ASCII content in UTF-16)
  if (bytes.length >= 4) {
    const hasNullEveryOther = (bytes[1] === 0 && bytes[3] === 0);
    if (hasNullEveryOther) return 'utf-16le';
  }

  return 'utf-8';
}

/**
 * Detect the most likely delimiter by finding the one that produces
 * the most consistent column count across lines.
 */
function detectDelimiter(lines: string[]): string {
  let best = ',';
  let bestScore = 0;

  for (const d of CANDIDATE_DELIMITERS) {
    const counts = lines.map((line) => line.split(d).length);
    const freq = new Map<number, number>();
    for (const c of counts) {
      if (c > 1) freq.set(c, (freq.get(c) ?? 0) + 1);
    }
    let modeCount = 0;
    for (const f of freq.values()) {
      if (f > modeCount) modeCount = f;
    }
    if (modeCount > bestScore) {
      bestScore = modeCount;
      best = d;
    }
  }

  return best;
}

/**
 * Detect the header row index. German bank CSVs often have metadata rows
 * before the actual column headers.
 */
function detectHeaderRow(lines: string[], delimiter: string): number {
  if (lines.length < 2) return 0;

  const colCounts = lines.map((line) => {
    const parsed = Papa.parse(line, { delimiter });
    return (parsed.data as string[][])[0]?.length ?? 0;
  });

  // Find modal column count (most common, > 1)
  const freq = new Map<number, number>();
  for (const c of colCounts) {
    if (c > 1) freq.set(c, (freq.get(c) ?? 0) + 1);
  }

  let modalCount = 0;
  let modalFreq = 0;
  for (const [count, f] of freq) {
    if (f > modalFreq) { modalCount = count; modalFreq = f; }
  }

  if (modalCount <= 1) return 0;

  // First row matching modal count with header-like cells (non-numeric strings)
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (colCounts[i] !== modalCount) continue;
    const cells = (Papa.parse(lines[i], { delimiter }).data as string[][])[0] ?? [];
    const headerLike = cells.filter(
      (cell) => cell.trim().length > 0 && Number.isNaN(Number(cell.replace(/[.,]/g, ''))),
    );
    if (headerLike.length >= 2) return i;
  }

  return 0;
}

/**
 * Read the full file as text using the detected encoding.
 */
function readFileAsText(file: File | Blob, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}

export async function parseCsv(file: File): Promise<Record<string, string>[]> {
  // Step 1: Detect encoding from first bytes
  const bomSlice = await file.slice(0, 16).arrayBuffer();
  const encoding = detectEncoding(bomSlice);

  // Step 2: Read a sample with the correct encoding
  const sampleText = await readFileAsText(file.slice(0, 32768), encoding);
  const sampleLines = sampleText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Step 3: Detect delimiter and header row
  const delimiter = detectDelimiter(sampleLines);
  const headerRowIdx = detectHeaderRow(sampleLines, delimiter);

  // Step 4: Read full file with correct encoding
  const fullText = await readFileAsText(file, encoding);
  const allLines = fullText.split(/\r?\n/);

  // Step 5: Skip metadata rows if needed
  let csvContent: string;
  if (headerRowIdx === 0) {
    csvContent = fullText;
  } else {
    let nonEmptyCount = 0;
    let sliceIdx = 0;
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].trim().length > 0) {
        if (nonEmptyCount === headerRowIdx) { sliceIdx = i; break; }
        nonEmptyCount++;
      }
    }
    csvContent = allLines.slice(sliceIdx).join('\n');
  }

  // Step 6: Parse with PapaParse
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });

  return result.data;
}
