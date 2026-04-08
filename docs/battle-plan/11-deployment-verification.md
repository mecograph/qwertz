# #11 — Cloud Function Deployment Verification

## The Problem

The backend code exists in `/backend/src/` with two cloud functions (`suggestMapping` and `categorizeBatch`), but there's no evidence they've been deployed, tested against a live Firebase project, or validated with real API credentials.

The codebase has a `mock` provider that uses localStorage for everything, including returning empty results for AI calls. This strongly suggests development has been done primarily in mock mode.

### What Needs Verification

| Component | Question | Risk if Unverified |
|---|---|---|
| Firebase project | Does a project exist? Is Firestore provisioned? | Nothing works |
| Cloud Functions | Are they deployed? Do they compile? | AI features silently fail |
| Gemini API key | Is Genkit configured with valid credentials? | AI calls return auth errors |
| Firestore rules | Are the rules deployed? Do they match the code? | Reads/writes fail with permission errors |
| Firestore indexes | Are composite indexes deployed? | Queries fail or timeout |
| Firebase Auth | Is authentication configured? | User sign-in broken |
| CORS | Can the frontend call cloud functions? | Cross-origin errors |
| Environment variables | Are API keys set in function config? | Functions fail at runtime |

### Signs of Mock-Only Development

1. `mappingProfileClient.ts` and `catRuleClient.ts` both have `mock` providers that return empty/default data
2. `mockClient.aiCategorizeBatch()` returns `{ results: [] }` — no AI
3. `mockClient.aiSuggestMapping()` returns `{ suggestions: {} }` — no AI
4. No `.firebaserc` or `firebase.json` in the repo (or they may be gitignored)
5. No deployment scripts or CI/CD for backend

## Proposed Solution

### Deployment Checklist

Run through this checklist manually, verifying each step:

#### 1. Firebase Project Setup

```bash
# Check if Firebase project exists
firebase projects:list

# If not, create one
firebase projects:create qwertz-app --display-name "Qwertz"

# Select project
firebase use qwertz-app
```

#### 2. Enable Required Services

```bash
# Firestore
firebase firestore:databases:create --location=europe-west3

# Cloud Functions (requires Blaze plan for external API calls)
# Gemini API calls require outbound networking → Blaze plan mandatory

# Firebase Auth
# Enable in Firebase Console → Authentication → Sign-in method
```

#### 3. Deploy Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Verify rules are active
firebase firestore:rules:list
```

#### 4. Configure Genkit / Gemini API

```bash
# Set Gemini API key for Cloud Functions
firebase functions:config:set genkit.api_key="YOUR_GEMINI_API_KEY"

# Or use Google AI Studio key
firebase functions:config:set google_ai.api_key="YOUR_API_KEY"

# Verify config
firebase functions:config:get
```

Alternative: Use Vertex AI (recommended for privacy — see #3):
```bash
# Enable Vertex AI API in Google Cloud Console
gcloud services enable aiplatform.googleapis.com

# Genkit with Vertex AI uses Application Default Credentials
# Cloud Functions running on GCP automatically have ADC
```

#### 5. Deploy Cloud Functions

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy
firebase deploy --only functions

# Verify deployment
firebase functions:list
```

#### 6. Test Functions Individually

```bash
# Test suggestMapping
curl -X POST \
  "https://REGION-PROJECT_ID.cloudfunctions.net/suggestMapping" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "headers": ["Buchungsdatum", "Verwendungszweck", "Betrag"],
      "sampleRows": [
        {"Buchungsdatum": "15.01.2026", "Verwendungszweck": "REWE SAGT DANKE", "Betrag": "-47,23"}
      ],
      "locale": "de"
    }
  }'

# Test categorizeBatch
curl -X POST \
  "https://REGION-PROJECT_ID.cloudfunctions.net/categorizeBatch" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "transactions": [
        {"id": "tx1", "description": "REWE SAGT DANKE 12345", "amount": -47.23, "date": "2026-01-15"},
        {"id": "tx2", "description": "SPOTIFY AB STOCKHOLM", "amount": -9.99, "date": "2026-01-15"}
      ],
      "existingRules": [],
      "locale": "de"
    }
  }'
```

#### 7. Frontend Integration Test

Switch from mock to Firebase provider and verify:

```bash
# In web/.env.local or web/.env.development
VITE_PERSISTENCE_PROVIDER=firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# etc.
```

Then manually test:
1. Sign in with Firebase Auth
2. Upload a CSV file
3. Verify mapping suggestions appear (with AI)
4. Verify categorization runs (rules + AI)
5. Verify review and finalize flow
6. Verify profile is persisted in Firestore
7. Upload a second file — verify rules from first import match

#### 8. Error Handling Verification

Deliberately test failure modes:
- Invalid API key → verify error message in UI
- Rate limit → verify graceful degradation
- Firestore permission denied → verify error handling
- Network timeout → verify retry/fallback behavior
- Large batch (100 transactions) → verify cloud function doesn't timeout

### Automated Smoke Test

Create a minimal smoke test script:

```ts
// backend/test/smoke.ts
import { suggestMapping, categorizeBatch } from '../src/index';

// Test with mock Firebase context
// Verify functions don't throw on valid input
// Verify response shape matches expected schema
```

### Implementation Steps

1. Verify Firebase project exists (or create one)
2. Ensure Blaze plan is active (required for Gemini API calls)
3. Deploy Firestore rules and indexes
4. Configure Genkit/Gemini API credentials
5. Deploy cloud functions
6. Test each function with curl
7. Switch frontend to Firebase provider
8. Run full manual integration test
9. Document deployment steps in README or `docs/deployment.md`
10. (Optional) Add CI/CD for automatic function deployment
