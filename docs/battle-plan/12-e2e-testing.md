# #12 — End-to-End Testing with Real Data

## The Problem

30+ commits of feature code have been written without evidence of end-to-end testing with real bank data. The components work in isolation (types compile, stores have correct logic), but the full pipeline — from CSV upload to categorized transactions on the dashboard — has not been validated.

Bank CSV formats are notoriously inconsistent. Every bank, every country, every account type produces different formats. The parsing and mapping logic needs to handle all of them.

### Why Unit Tests Aren't Enough

- Unit tests verify `parseAmountValue("-47,23")` returns `-47.23` — good
- But they don't verify that a real Sparkasse CSV with BOM markers, semicolons, European number formatting, and German headers actually flows through the entire pipeline correctly
- Integration between components is where bugs hide: the mapper produces output, the validator transforms it, the categorizer interprets it — any mismatch in expectations breaks silently

## Proposed Solution

### 1. Collect Real Bank CSV Samples

Create a test fixtures directory with anonymized real bank exports:

```
web/test/fixtures/bank-samples/
├── sparkasse-monthly.csv          # Sparkasse (semicolon, UTF-8, German)
├── dkb-quarterly.csv              # DKB (semicolon, UTF-8-BOM, German)
├── ing-diba-annual.csv            # ING (semicolon, ISO-8859-1, German)
├── n26-monthly.csv                # N26 (comma, UTF-8, English headers)
├── commerzbank-monthly.csv        # Commerzbank (semicolon, UTF-16-LE, German)
├── comdirect-monthly.csv          # Comdirect (semicolon, UTF-8, German)
├── postbank-monthly.csv           # Postbank (semicolon, UTF-8, German)
├── revolut-monthly.csv            # Revolut (comma, UTF-8, English)
├── wise-monthly.csv               # Wise/TransferWise (comma, UTF-8, English)
└── generic-excel.xlsx             # Excel format test
```

**Anonymization:** Replace real merchant names with realistic fake ones. Keep the format structure identical. Include edge cases that exist in real exports:
- BOM markers
- Multiple header rows
- Summary/footer rows
- Empty rows between sections
- Mixed decimal formats (`,` vs `.`)
- Currency symbols in amount fields
- Negative amounts in parentheses
- Separate debit/credit columns

### 2. Pipeline Integration Tests

Test the full flow for each sample:

```ts
// web/test/integration/importPipeline.test.ts

describe('Import Pipeline — Sparkasse', () => {
  const fixture = loadFixture('sparkasse-monthly.csv');

  it('detects encoding correctly', () => {
    expect(detectEncoding(fixture.buffer)).toBe('utf-8');
  });

  it('detects delimiter correctly', () => {
    expect(detectDelimiter(fixture.text)).toBe(';');
  });

  it('detects header row correctly', () => {
    const { headerRow, dataStartRow } = detectHeaderRow(fixture.rows);
    expect(headerRow).toBe(0); // or wherever it is
    expect(fixture.rows[headerRow]).toContain('Buchungstag');
  });

  it('suggests correct column mapping', () => {
    const suggestions = suggestMappings(fixture.headers, emptyProfile);
    expect(suggestions.date.header).toBe('Buchungstag');
    expect(suggestions.amount.header).toBe('Betrag');
    expect(suggestions.description.header).toBe('Verwendungszweck');
  });

  it('normalizes rows correctly', () => {
    const { valid, invalid } = normalizeRows(fixture.rows, {
      date: 'Buchungstag',
      amount: 'Betrag',
      description: 'Verwendungszweck',
    });
    expect(valid.length).toBeGreaterThan(0);
    expect(invalid.length).toBe(0);
    // Verify date format
    expect(valid[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Verify amount is a number
    expect(typeof valid[0].amount).toBe('number');
  });

  it('categorizes with rules after learning', () => {
    // First import: all unmatched
    const result1 = categorizeByRules(fixture.normalizedRows, []);
    expect(result1.unmatched.length).toBe(fixture.normalizedRows.length);

    // Create rules from first import
    const rules = fixture.normalizedRows.slice(0, 10).map(row =>
      createRuleFromTransaction(row.description, 'groceries', 'supermarket', 'Test', 'user')
    );

    // Second import: some should match
    const result2 = categorizeByRules(fixture.normalizedRows, rules);
    expect(result2.matched.length).toBeGreaterThan(0);
  });
});
```

### 3. Pattern Extraction Test Suite

Dedicated tests for pattern extraction with real German bank descriptions:

```ts
describe('Pattern Extraction — German Bank Descriptions', () => {
  const cases = [
    // [input, expectedPattern]
    ['KARTENZAHLUNG REWE SAGT DANKE 12345//BERLIN/DE', 'rewe'],
    ['LASTSCHRIFT SPOTIFY AB STOCKHOLM SE', 'spotify'],
    ['EC 28.01 15:32 EDEKA SUED MARKT 4711//MUENCHEN', 'edeka'],
    ['DAUERAUFTRAG MIETE WOHNUNG JANUAR 2026', 'miete wohnung'],
    ['SEPA-LASTSCHRIFT VODAFONE GMBH RECHNUNG 12/25', 'vodafone'],
    ['GUTSCHRIFT GEHALT DEZEMBER FIRMA XYZ GMBH', 'firma xyz'],
    ['KARTENZAHLUNG AMAZON EU SARL LUXEMBOURG LU', 'amazon'],
    ['KARTENZAHLUNG DM DROGERIE MARKT//BERLIN/DE', 'dm drogerie'],
    ['SEPA-ÜBERWEISUNG FINANZAMT BERLIN MITTE', 'finanzamt berlin'],
    ['LASTSCHRIFT NETFLIX INTL AMSTERDAM NL', 'netflix'],
  ];

  cases.forEach(([input, expected]) => {
    it(`extracts "${expected}" from "${input.substring(0, 40)}..."`, () => {
      expect(extractMerchantPattern(input)).toBe(expected);
    });
  });
});
```

### 4. Learning Regression Tests

Verify the learning flywheel works across multiple simulated imports:

```ts
describe('Learning Flywheel', () => {
  it('improves rule match rate over 6 imports', () => {
    let profile = emptyProfile();
    const matchRates: number[] = [];

    for (let importNum = 0; importNum < 6; importNum++) {
      // Same recurring transactions + some new ones
      const rows = generateImportRows(importNum);
      const { matched, unmatched } = categorizeByRules(rows, profile.rules);

      matchRates.push(matched.length / rows.length);

      // Simulate user confirming all (creates rules for unmatched)
      for (const row of unmatched) {
        const rule = createRuleFromTransaction(
          row.description, 'groceries', 'supermarket', 'Test', 'user'
        );
        profile.rules.push(rule);
      }
      for (const { rule } of matched) {
        rule.hitCount++;
      }
    }

    // Match rate should increase monotonically
    for (let i = 1; i < matchRates.length; i++) {
      expect(matchRates[i]).toBeGreaterThanOrEqual(matchRates[i - 1]);
    }

    // By import 6, should be >70%
    expect(matchRates[5]).toBeGreaterThan(0.7);
  });
});
```

### 5. Visual Regression Testing (Future)

For the ReviewWizard and MappingWizard, add Playwright visual tests:
- Screenshot the mapping wizard with auto-suggestions
- Screenshot the review wizard with mixed confidence rows
- Compare against baseline screenshots

### Test Data Generation

Create a utility that generates realistic bank transaction data:

```ts
function generateImportRows(importNumber: number): RawRow[] {
  const recurring = [
    // These appear every month
    { desc: 'LASTSCHRIFT SPOTIFY AB', amount: -9.99 },
    { desc: 'DAUERAUFTRAG MIETE WOHNUNG', amount: -950.00 },
    { desc: 'SEPA-LASTSCHRIFT VODAFONE GMBH', amount: -39.99 },
    { desc: 'KARTENZAHLUNG REWE SAGT DANKE', amount: -45 + Math.random() * 30 },
    { desc: 'KARTENZAHLUNG EDEKA SUED', amount: -15 + Math.random() * 20 },
    { desc: 'GUTSCHRIFT GEHALT FIRMA XYZ GMBH', amount: 3500.00 },
    // ... 20+ recurring transactions
  ];

  const occasional = [
    // Some of these appear randomly
    { desc: 'KARTENZAHLUNG AMAZON EU SARL', amount: -20 - Math.random() * 100 },
    { desc: 'KARTENZAHLUNG ZALANDO SE', amount: -30 - Math.random() * 80 },
    { desc: 'KARTENZAHLUNG IKEA DEUTSCHLAND', amount: -50 - Math.random() * 200 },
    // ... 30+ occasional transactions
  ];

  const rows = [...recurring];
  // Add random subset of occasional transactions
  for (const tx of occasional) {
    if (Math.random() > 0.6) rows.push(tx);
  }
  // Add 1-3 truly new transactions per import
  for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
    rows.push({ desc: `KARTENZAHLUNG NEW MERCHANT ${importNumber}-${i}`, amount: -Math.random() * 100 });
  }

  return rows.map((tx, i) => ({
    date: generateDateInMonth(importNumber, i),
    description: tx.desc + ` ${10000 + Math.floor(Math.random() * 90000)}//BERLIN/DE`,
    amount: tx.amount,
  }));
}
```

### Implementation Steps

1. Create `web/test/fixtures/bank-samples/` directory
2. Collect and anonymize real bank CSV samples (at least 5 German banks)
3. Write pipeline integration tests for each sample
4. Write pattern extraction test suite with German descriptions
5. Write learning regression test (6-import simulation)
6. Create realistic test data generator
7. Add to CI pipeline (these tests should run on every PR)
8. (Future) Add Playwright visual tests for UI components
