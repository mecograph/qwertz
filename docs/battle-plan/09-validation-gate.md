# #9 — Validation Gate Between Mapping and Categorization

## The Problem

After the user confirms column mapping in MappingWizard, the app immediately runs `normalizeRows()` and pipes the result into `catStore.categorize()`. If the mapping is wrong — e.g., the user accidentally mapped "Balance" to the amount field instead of "Debit" — the categorization engine processes garbage data.

The user only discovers this in the ReviewWizard when they see nonsensical amounts or missing descriptions, and by that point AI has already been called (wasting API credits and time).

### Current Flow

```
MappingWizard → "Apply" clicked
  ↓
normalizeRows(importStore.rows, mapping)
  ↓ (no validation checkpoint)
catStore.categorize(validRows, locale)
  ↓ (AI runs on potentially garbage data)
ReviewWizard shown
```

### What Can Go Wrong

| Wrong Mapping | Symptom | User Discovery Point |
|---|---|---|
| Balance mapped as Amount | All amounts are cumulative, not per-transaction | ReviewWizard — amounts look wrong |
| Reference number mapped as Description | All descriptions are numeric strings | ReviewWizard — categories make no sense |
| Date column wrong | Rows rejected as "invalid date" | MappingWizard — but user might ignore warnings |
| Amount and Description swapped | Complete chaos | ReviewWizard — too late, AI already ran |
| Second header row included as data | First "transaction" is actually headers | ReviewWizard — one garbage row |

## Proposed Solution

### Pre-Categorization Validation Summary

After mapping is applied but before categorization runs, show a summary screen that lets the user verify the data looks correct:

```
┌─────────────────────────────────────────────────────────┐
│  Mapping Preview                                         │
│                                                          │
│  ✓ 342 rows parsed successfully                          │
│  ⚠ 3 rows skipped (invalid date or amount)               │
│                                                          │
│  Sample data with your mapping:                          │
│  ┌──────────┬─────────────────────────┬──────────┐       │
│  │ Date     │ Description             │ Amount   │       │
│  ├──────────┼─────────────────────────┼──────────┤       │
│  │ 15.01.26 │ REWE SAGT DANKE 12345  │ -47.23   │       │
│  │ 15.01.26 │ SPOTIFY AB STOCKHOLM   │  -9.99   │       │
│  │ 31.01.26 │ GEHALT FIRMA XYZ GMBH  │ 3500.00  │       │
│  │ 02.02.26 │ AMAZON EU SARL         │ -29.99   │       │
│  │ 03.02.26 │ EDEKA SUED MARKT 4711  │ -15.80   │       │
│  └──────────┴─────────────────────────┴──────────┘       │
│                                                          │
│  Date range: Jan 1, 2026 – Feb 28, 2026                 │
│  Total income: €3,500.00 (1 transaction)                 │
│  Total expenses: €2,847.32 (341 transactions)            │
│  Net: +€652.68                                           │
│                                                          │
│  Does this look correct?                                 │
│                                                          │
│  [← Back to Mapping]              [Looks Good →]         │
└─────────────────────────────────────────────────────────┘
```

### Automated Sanity Checks

Run these checks automatically and surface warnings:

```ts
interface SanityCheckResult {
  passed: boolean;
  warnings: SanityWarning[];
  errors: SanityError[];
}

function runSanityChecks(rows: NormalizedRow[]): SanityCheckResult {
  const warnings: SanityWarning[] = [];
  const errors: SanityError[] = [];

  // 1. All amounts same sign?
  const signs = rows.map(r => Math.sign(r.amount));
  const allPositive = signs.every(s => s >= 0);
  const allNegative = signs.every(s => s <= 0);
  if (allPositive || allNegative) {
    warnings.push({
      code: 'SINGLE_SIGN',
      message: `All amounts are ${allPositive ? 'positive' : 'negative'}. Did you map the right column?`,
      suggestion: 'Bank exports usually contain both income and expenses.',
    });
  }

  // 2. Amounts unreasonably large?
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.amount)));
  if (maxAbs > 100_000) {
    warnings.push({
      code: 'LARGE_AMOUNTS',
      message: `Largest amount is ${maxAbs.toLocaleString()}. Could this be a balance column?`,
    });
  }

  // 3. Amounts monotonically increasing/decreasing?
  const amounts = rows.map(r => r.amount);
  const isMonotonic = amounts.every((v, i) => i === 0 || v >= amounts[i - 1]) ||
                      amounts.every((v, i) => i === 0 || v <= amounts[i - 1]);
  if (isMonotonic && rows.length > 10) {
    warnings.push({
      code: 'MONOTONIC_AMOUNTS',
      message: 'Amounts appear to be a running balance, not individual transactions.',
      suggestion: 'Check if you mapped the "Balance" column instead of "Amount" or "Debit".',
    });
  }

  // 4. Descriptions look like numbers?
  const numericDescs = rows.filter(r => /^\d+([.,]\d+)?$/.test(r.description?.trim() || ''));
  if (numericDescs.length > rows.length * 0.5) {
    warnings.push({
      code: 'NUMERIC_DESCRIPTIONS',
      message: 'Most descriptions are numbers. The description column may be wrong.',
    });
  }

  // 5. Date range sanity
  const dates = rows.map(r => new Date(r.date).getTime()).filter(d => !isNaN(d));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const rangeYears = (maxDate.getTime() - minDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (rangeYears > 5) {
    warnings.push({
      code: 'WIDE_DATE_RANGE',
      message: `Date range spans ${rangeYears.toFixed(1)} years. Is the date column correct?`,
    });
  }

  // 6. Too many invalid rows
  const invalidCount = rows.filter(r => !r.date || isNaN(r.amount)).length;
  if (invalidCount > rows.length * 0.2) {
    errors.push({
      code: 'HIGH_INVALID_RATE',
      message: `${invalidCount} of ${rows.length} rows (${Math.round(invalidCount/rows.length*100)}%) have invalid date or amount.`,
    });
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors,
  };
}
```

### Warning Display

Warnings are shown in the preview but don't block the user:

```
⚠ All amounts are positive. Did you map the right column?
  Bank exports usually contain both income and expenses.

⚠ Largest amount is 125,847.32. Could this be a balance column?
```

Errors DO block proceeding:

```
❌ 85% of rows have invalid dates. Please go back and check your date mapping.
  [← Back to Mapping]
```

### Implementation Steps

1. Create `sanityChecks.ts` with all validation functions
2. Build `MappingPreview.vue` component (sample table + stats + warnings)
3. Wire into `App.vue` between mapping confirmation and categorization
4. Add "Back to Mapping" action that preserves current mapping state
5. Add automated check results to the preview (warnings/errors)
6. Only proceed to categorization when user clicks "Looks Good"
