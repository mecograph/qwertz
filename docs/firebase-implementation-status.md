# Firebase Implementation Status & Open TODOs

> Updated 2026-02-27 — reflects completed Firebase Backend Completion Plan (Phases 1–9)

---

## Implementation Status Overview

| Area | Status | Notes |
|------|--------|-------|
| Monorepo Structure | Done | `web/` (Vue app) + `backend/` (Cloud Functions) via pnpm workspaces |
| Firebase Web SDK | Done | Replaced all REST calls with `firebase` npm SDK (Auth, Firestore, Storage) |
| Email-Link Auth (SDK) | Done | `sendSignInLinkToEmail`, `signInWithEmailLink`, `onAuthStateChanged` |
| Google Sign-In | Done | `signInWithPopup` via Firebase Auth SDK |
| App Check | Done | Conditional init via `VITE_FIREBASE_APP_CHECK_SITE_KEY` (ReCaptchaEnterprise) |
| PBKDF2 Passphrase Flow | Done | 600k iterations, SHA-256, schema v1→v2 migration, session key management |
| Encryption (AES-256-GCM) | Done | DEK per import, client-side encrypt/decrypt |
| Key Wrapping (DEK→KEK) | Done | KEK derived from PBKDF2 passphrase (schema v2); legacy random key (v1) |
| Encrypted Upload/Download | Done | Storage SDK, `.enc.json` blobs, 50 MB client-side size limit |
| Firestore Import Metadata | Done | SDK CRUD, `schemaVersion`, `revertedAt`, `mappingConfig` fields |
| Import Revert | Done | Removes rows by importId, updates status to `reverted`, writes event |
| Import Diff (Comparison) | Done | Decrypt original → parse → normalize → diff table with color-coded rows |
| Event Log Subcollection | Done | `users/{uid}/imports/{importId}/events/{eventId}` — upload, transform, revert, download |
| Notification Persistence | Done | Firebase-backed via Firestore SDK |
| Analytics Materialization | Done | `users/{uid}/analytics/overview` via Firestore SDK |
| Retention Management | Done | Client-side sweep + scheduled Cloud Function (`every day 03:00`) |
| Cloud Functions | Done | `retentionSweep` (scheduled) + `checkUploadQuota` (callable) |
| Security Rules (Firestore) | Done | UID-scoped, events subcollection, quotas, expanded import validation |
| Security Rules (Storage) | Done | UID-scoped, `.enc.json` enforced, 55 MB limit, no updates |
| Firestore Indexes | Done | Compound indexes for imports, notifications, collectionGroup for retention |
| `firebase.json` | Done | Hosting → `web/dist`, Functions → `backend` |
| Runtime Config Checks | Done | Warns on provider/env mismatches |
| Provider Switch (mock/firebase) | Done | Auth, backend, notifications switchable |
| i18n Coverage | Done | All keys for passphrase, revert, diff, Google sign-in in en + de |

---

## Completed Implementation Phases

### Phase 1: Monorepo Restructure
- Moved Vue app into `web/`, created `backend/` for Cloud Functions
- `pnpm-workspace.yaml` + root `package.json` with workspace scripts
- `firebase.json` updated for hosting + functions paths

### Phase 2: Firebase SDK + Auth Migration
- Installed `firebase` npm package
- Created `firebaseApp.ts` with lazy singletons (App, Auth, Firestore, Storage, App Check)
- Rewrote `authClientFirebase.ts` using Firebase Auth SDK
- Added Google Sign-In + `onAuthStateChanged` listener
- Updated `AuthGate.vue` with Google Sign-In button

### Phase 3: Firestore + Storage SDK Migration
- Rewrote `backendClientFirebase.ts` using Firestore/Storage SDK
- Rewrote notification firebase client with SDK
- Deleted `firebaseRest.ts` and `firebaseConfig.ts` (dead code)
- Added 50 MB client-side file size validation

### Phase 4: Cloud Functions
- `retentionSweep`: scheduled daily, deletes expired imports, sends reminders
- `checkUploadQuota`: callable, transactional counters (20 imports/day, 120 MB/day)
- Firestore rules for events subcollection + quotas

### Phase 5: PBKDF2 Passphrase Flow
- PBKDF2 derivation (600k iterations, SHA-256, 16-byte salt)
- Schema versioning (v1=random, v2=PBKDF2), migration function
- `PassphraseGate.vue` component (setup + unlock modes)
- `useCryptoGate` composable, session key management

### Phase 6: Data Model Updates
- `importId` on `Tx` interface, `ImportEventType` + `ImportEvent` types
- Extended `PersistedImport`: `revertedAt`, `schemaVersion`, `mappingConfig`, `reverted` status
- `writeImportEvent` + `listImportEvents` in both backends
- `revertImport` action in transaction store
- Import ID tracking through upload → mapping flow

### Phase 7: Import Revert
- Revert button in SettingsView (confirmation modal)
- Composable `revert()`: removes rows, updates metadata, writes event
- Status coloring (red for reverted) with revertedAt timestamp

### Phase 8: Import Diff
- `diffEngine.ts`: composite key matching, occurrence indexing, field-level change detection
- `useImportDiff` composable: decrypt → parse → normalize → diff
- `ImportDiffView.vue`: teleported modal with summary bar, filter tabs, color-coded table

### Phase 9: i18n + Final Polish
- All new translation keys added to `en.ts` and `de.ts`
- Keys cover: passphrase, revert, diff, Google sign-in, event types

---

## Open TODOs

### User TODOs (Infrastructure / Config)

1. **Deploy rules & indexes** — `firebase deploy --only firestore:rules,firestore:indexes,storage`
2. **Deploy Cloud Functions** — `firebase deploy --only functions`
3. **Set production env vars** — all `VITE_FIREBASE_*` values in the deployment environment
4. **Configure App Check site key** — set `VITE_FIREBASE_APP_CHECK_SITE_KEY` once reCAPTCHA Enterprise is provisioned
5. **Set up Cloud Logging / Error Reporting** — enable in Google Cloud Console
6. **Smoke-test in Firebase mode** — end-to-end: sign in → upload → list → download → decrypt → revert → diff

### Nice-to-have (Post-launch)

7. **Cloud KMS key wrapping** — Wrap DEK via Cloud KMS instead of client-derived KEK
8. **Batch analytics** — Nightly materialization instead of inline
9. **Firestore pagination** — Cursor-based pagination for users with many imports
10. **Re-auth for sensitive operations** — Require fresh auth for destructive actions
11. **Tighten Firestore update rules** — Allowlist mutable fields to prevent tampering with `retentionExpiresAt`
12. **Normalized snapshot storage** — `storagePathEncryptedNormalized` for parsed version alongside original

---

## Security Status

| Issue | Severity | Status |
|-------|----------|--------|
| KEK stored as random bytes in localStorage | High | **Fixed** — PBKDF2 passphrase derivation (schema v2) |
| idToken + refreshToken in localStorage | Medium | **Fixed** — Firebase SDK uses IndexedDB, auto-manages tokens |
| Client can set `retentionExpiresAt` on update | Medium | Open — consider server-side enforcement |
| No client-side upload size check | Low | **Fixed** — 50 MB validation before encryption |
| Retention sweep is client-only | Medium | **Fixed** — Cloud Function runs daily at 03:00 |

---

## Rollout TODO Completion Check

| Todo Item | Status |
|-----------|--------|
| Provider switch for Auth/Backend/Notifications | Done |
| Firebase SDK flows (Auth, Firestore, Storage) | Done |
| Security baseline files (firebase.json, rules, indexes) | Done |
| Runtime checks for provider/env config | Done |
| Auth session via Firebase SDK | Done |
| Google Sign-In | Done |
| App Check initialization | Done |
| PBKDF2 passphrase key derivation | Done |
| Import revert | Done |
| Import diff/comparison | Done |
| Event log subcollection | Done |
| Cloud Functions (retention + quotas) | Done |
| i18n for all new features | Done |
| Configure Firebase project (`firebase use`) | User — done |
| Deploy rules/indexes/functions | User — not done |
| Provide secrets/keys in deployment env | User — not done |
| Configure App Check site key | User — not done |
| Cloud Logging setup | User — not done |
| Budget alerts + failure strategy | User — done |
