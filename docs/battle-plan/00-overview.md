# Battle Plan: Import Pipeline — From Good to Speechless

## Mission

Transform the bank transaction import pipeline from a working prototype into a polished, trust-building product that gets smarter with every use. When a user finishes their third import and realizes the app already knows their spending patterns better than they do — that's the moment we're building toward.

## Current State

The core pipeline is ~85% implemented:
- File parsing (CSV/Excel with encoding detection)
- Column mapping with 3-factor scoring (hints 45%, history 35%, AI 20%)
- Rule-based categorization (exact + substring matching)
- AI fallback via Gemini 2.5 Flash (batched, max 250 transactions)
- Review wizard with confidence badges and batch actions
- Learning system with per-user profiles and feedback tracking

## The 12 Critical Concerns

Each concern has a dedicated deep-dive document. Priority is ranked by **user trust impact** — the things that will make or break the first impression.

### Tier 1 — Trust Breakers (fix before any user touches this)

| # | Concern | Impact | Doc |
|---|---------|--------|-----|
| 1 | [Duplicate Import Detection](./01-duplicate-detection.md) | Users will import the same data twice and lose trust in the entire system | Critical |
| 2 | [Draft Persistence & Crash Recovery](./02-draft-persistence.md) | Losing a 500-row review session to a browser crash is unforgivable | Critical |
| 3 | [Privacy & Data Disclosure](./03-privacy-disclosure.md) | Sending financial data to Google Gemini without consent is a legal liability | Critical |

### Tier 2 — Quality Ceiling (determines whether the learning flywheel works)

| # | Concern | Impact | Doc |
|---|---------|--------|-----|
| 4 | [Pattern Extraction Quality](./04-pattern-extraction.md) | Current "first 3-4 words" approach is fragile — this is the #1 bottleneck to 99% accuracy | High |
| 5 | [Fuzzy Matching Upgrade](./05-fuzzy-matching.md) | Substring matching misses obvious merchant matches across format variations | High |
| 6 | [Transaction Limit Ceiling](./06-transaction-limit.md) | 250 AI-categorized transactions per import is too low for yearly exports | High |

### Tier 3 — Polish & Completeness (makes the difference between "works" and "wow")

| # | Concern | Impact | Doc |
|---|---------|--------|-----|
| 7 | [Async Processing & Notifications](./07-async-processing.md) | Synchronous AI wait is a UX killer, especially on first import | Medium |
| 8 | [Custom Category Management](./08-custom-categories.md) | Users can't manage their categories — the taxonomy feels rigid | Medium |
| 9 | [Validation Gate Between Steps](./09-validation-gate.md) | Bad mapping silently produces garbage categorization | Medium |

### Tier 4 — Operational Health (matters at scale)

| # | Concern | Impact | Doc |
|---|---------|--------|-----|
| 10 | [Firebase Cost Optimization](./10-firebase-costs.md) | Per-row feedback writes will get expensive at scale | Low-Med |
| 11 | [Cloud Function Deployment Verification](./11-deployment-verification.md) | Has the backend ever actually been deployed and tested? | Low-Med |
| 12 | [End-to-End Testing with Real Data](./12-e2e-testing.md) | The entire pipeline needs to be validated with real bank exports | Low-Med |

## Implementation Order

```
Phase 1: Foundation (Tier 1)          — "It won't break"
  ├── #1  Duplicate detection
  ├── #2  Draft persistence
  └── #3  Privacy disclosure

Phase 2: Intelligence (Tier 2)        — "It actually works"
  ├── #4  Pattern extraction rewrite
  ├── #5  Fuzzy matching upgrade
  └── #6  Transaction limit removal

Phase 3: Delight (Tier 3)             — "This is amazing"
  ├── #7  Async processing
  ├── #8  Custom categories UI
  └── #9  Validation gate

Phase 4: Scale (Tier 4)               — "It stays amazing"
  ├── #10 Cost optimization
  ├── #11 Deployment verification
  └── #12 E2E test suite
```

## Key Metrics to Track

| Metric | Baseline | Target (3mo) | Target (6mo) |
|--------|----------|--------------|--------------|
| Rule match rate (% of rows matched by rules) | 0% (new user) | 60-70% | 85-90% |
| AI fallback rate | 100% (new user) | 30-40% | 10-15% |
| User correction rate | Unknown | <15% | <5% |
| Review time per import | Unknown | <3 min | <1 min |
| Imports to "zero review" | N/A | ~8-10 | ~5-6 |

## Architecture After All Fixes

```
Upload (CSV/XLSX)
  │
  ├── Duplicate Detection ──→ Show overlap, let user choose
  │
  ├── Parse (encoding, delimiter, headers)
  │
  ├── Column Mapping (hints + history + AI)
  │   └── Validation Gate: verify mapping produces parseable rows
  │
  ├── Categorization Pipeline
  │   ├── Step 1: Token-based fuzzy rule matching (fast, local)
  │   ├── Step 2: AI fallback — unlimited batches, async with notification
  │   └── Step 3: Auto-rule creation from high-confidence AI results
  │
  ├── Draft Saved to IndexedDB (crash-safe)
  │
  ├── Review Wizard (only low-confidence + unreviewed)
  │   ├── Privacy: AI opt-out available, rule-only mode
  │   └── Custom categories inline-creatable
  │
  ├── Finalize → Learn rules + Record feedback (batched writes)
  │
  └── Dashboard (charts enabled, data visible)
```
