# #3 — Privacy & Data Disclosure

## The Problem

The app sends transaction descriptions, amounts, and dates to Google's Gemini API for categorization. This is financial data — merchant names, payment amounts, recurring subscriptions, salary figures, medical payments. Users have not consented to this, and many would object if they knew.

This isn't hypothetical:
- GDPR (EU) requires explicit consent before processing personal data with third-party services
- German banking data has additional sensitivity under BaFG/KWG
- Google's Gemini API terms allow them to use data for model improvement unless you opt out via API settings
- A user importing their salary transactions is exposing their income to Google

### What's Currently Sent to Gemini

**`categorizeBatch` cloud function sends:**
```json
{
  "transactions": [
    { "id": "...", "description": "GEHALT FIRMA XYZ GMBH", "amount": 3500.00, "date": "2026-01-31" },
    { "id": "...", "description": "MIETE HAUSVERWALTUNG MUELLER", "amount": -950.00, "date": "2026-01-01" },
    { "id": "...", "description": "KARTENZAHLUNG APOTHEKE AM MARKT", "amount": -24.50, "date": "2026-01-15" }
  ]
}
```

From these three rows alone, an observer can determine: employer name, salary, landlord name, rent amount, and a pharmacy visit.

**`suggestMapping` cloud function sends:**
- CSV headers (less sensitive)
- Up to 5 sample rows (potentially very sensitive)

## Proposed Solution

### Three-Layer Approach

#### Layer 1: Informed Consent (mandatory)

**First-time AI usage dialog:**

```
┌─────────────────────────────────────────────────┐
│  🔒 AI-Assisted Categorization                  │
│                                                  │
│  To automatically categorize your transactions,  │
│  we can use AI (Google Gemini). This means:      │
│                                                  │
│  • Transaction descriptions, amounts, and dates  │
│    are sent to Google's servers for processing   │
│  • Data is NOT stored by Google after processing │
│  • You can disable AI at any time in Settings    │
│                                                  │
│  Without AI, the app uses pattern matching only  │
│  (slower to learn but fully private).            │
│                                                  │
│  [Enable AI Categorization]                      │
│  [Use Pattern Matching Only]                     │
│                                                  │
│  This choice is saved and can be changed in      │
│  Settings → Privacy.                             │
└─────────────────────────────────────────────────┘
```

**Store the choice:**
```ts
interface UserPreferences {
  aiCategorizationConsent: boolean;
  aiConsentTimestamp: number;
  aiConsentVersion: number;  // Bump when terms change, re-prompt
}
```

#### Layer 2: Data Minimization

Even with consent, send as little as possible:

**Current approach (sends everything):**
```json
{ "description": "KARTENZAHLUNG REWE SAGT DANKE 12345 BERLIN DE 28.01.2026 15:32", "amount": -47.23 }
```

**Improved approach (strip PII, keep merchant signal):**
```json
{ "description": "REWE", "amount_range": "25-50", "type": "expense" }
```

Specific minimization steps:
1. **Extract merchant name only** — strip transaction metadata (card numbers, dates, locations, terminal IDs)
2. **Bucket amounts** — instead of exact `47.23`, send range `25-50`. AI only needs rough magnitude for categorization.
3. **Strip dates** — AI doesn't need dates for categorization
4. **Remove IDs** — transaction IDs are unnecessary for the AI

This dramatically reduces exposure while preserving categorization accuracy. The AI needs to know "REWE, ~50 EUR expense" to categorize as groceries — it doesn't need the full raw bank string.

#### Layer 3: Rule-Only Mode (full privacy)

For users who decline AI consent:
- Skip `categorizeBatch` entirely
- Skip `suggestMapping` AI call (heuristic-only column mapping)
- Rule matching still works and improves over time
- First few imports require more manual categorization
- After ~5-6 imports, rule base should cover 50-60% of transactions

This is a real, viable mode — not a degraded afterthought. The learning flywheel still works, just slower.

### Implementation for Gemini API Data Usage

Ensure the Gemini API is called with data-use controls:

1. **Vertex AI (recommended):** Use Vertex AI Gemini endpoint instead of Generative AI endpoint. Vertex AI does NOT use customer data for model training by default.
2. **API setting:** If using Generative AI endpoint, set `safetySettings` and check Google's current data usage policy.
3. **Document in privacy policy:** Explicitly state which provider processes the data and link to their data processing terms.

### Settings UI

Add a Privacy section to Settings:

```
Privacy & Data
├── AI Categorization: [Enabled / Disabled]
│   └── "Transaction data is sent to Google Gemini for categorization"
├── AI Column Mapping: [Enabled / Disabled]
│   └── "Sample rows are sent to Google Gemini for column detection"
└── [Delete All AI Data]
    └── Removes all AI-generated rules (keeps user-created ones)
```

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User enables AI, imports, then disables | Existing AI-generated rules stay (already learned). Future imports use rules only. |
| User deletes AI data | Remove all rules with `source: 'ai'`. Reset AI quality metrics. |
| API terms change | Bump `aiConsentVersion`, re-prompt on next import |
| User in EU vs non-EU | Same consent flow for everyone — GDPR-level consent is the baseline |

### Implementation Steps

1. Add `aiConsent` fields to user preferences in Firestore
2. Create `AiConsentDialog.vue` component
3. Add consent check before `runAiBatches()` and `requestAiAssist()`
4. Implement data minimization in `categorizeBatch` cloud function
5. Add Privacy section to Settings view
6. Add "Delete AI Data" action
7. Switch to Vertex AI endpoint (if not already) for stronger data protection
8. Update privacy policy / terms of service
