# Firebase Rollout – Open TODOs (Kurz-Resume)

## Bereits umgesetzt
- Provider-Switch für Auth/Backend/Notifications (`mock` vs `firebase`).
- Firebase REST-Flows für Auth, Import-Metadata, Storage-Upload/Download, Notifications.
- Firebase Security-Baseline-Dateien angelegt:
  - `firebase.json`
  - `firestore.rules`
  - `storage.rules`
  - `firestore.indexes.json`
- Runtime-Checks für inkonsistente Provider-/Env-Konfiguration.
- Cleanup umgesetzt:
  - gemeinsamer Firebase-REST-Helper (`src/services/firebaseRest.ts`) zur Reduktion doppelter HTTP-Logik.
  - Auth-Session-Refresh via Refresh-Token für längere Sessions ergänzt.

## Noch offen vor Production-Launch
1. **Firebase-Projekt konfigurieren**
   - Firebase CLI Login + `firebase use <project>`
   - Deploy von Rules/Indexes:
     - `firebase deploy --only firestore:rules,firestore:indexes,storage`

2. **Secrets/Keys hinterlegen**
   - alle `VITE_FIREBASE_*` Werte in Deployment-Environment setzen
   - optional `VITE_FIREBASE_APP_CHECK_SITE_KEY`

3. **Auth-Hardening (Restpunkt)**
   - REST-Flow auf offizielles Firebase Web SDK migrieren, sobald Package-Registry-Zugriff verfügbar ist

4. **Backend-Operability**
   - Scheduled Retention-Job in Cloud Functions statt client-triggered Sweep
   - zentrale Error- und Audit-Logs in Cloud Logging/Error Reporting

5. **Abuse/Cost Guardrails**
   - serverseitige Quotas/Rate-Limits finalisieren
   - Budget Alerts + Ausfallstrategie (Degradation statt Hard Outage)

## Empfohlene Reihenfolge
1) Config + Rules deployen
2) Keys setzen + Smoke-Test in Firebase-Mode
3) Scheduled Retention Job
4) SDK-Migration Auth/Firestore/Storage
5) Kosten-/Abuse-Monitoring finalisieren
