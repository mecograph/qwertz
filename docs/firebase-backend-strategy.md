# Firebase-Backend-Strategie (kostenarm, datenschutzfreundlich)

## Ziele

- Persistenz nicht nur lokal im Browser, sondern zentral im Backend.
- Keine Speicherung sensibler Klardaten im Storage oder in der Datenbank.
- Nutzer können in der Import-History:
  - Importeinträge sehen,
  - die ursprüngliche Datei herunterladen,
  - den Datensatz in ursprünglicher und aktueller Form vergleichen,
  - einen Import rückgängig machen.
- Authentifizierung ohne eigene Security-Implementierung.
- Start auf möglichst kostenlosen Firebase-Produkten.

## Empfohlene Firebase-Produkte (MVP)

1. **Firebase Authentication**
   - Start: **E-Mail-Link (Passwordless)** plus optional Google Sign-In.
   - Vorteil: Sehr geringer UX-Reibungsverlust, kein Passwort-Handling.

2. **Cloud Storage for Firebase**
   - Speichert nur **clientseitig verschlüsselte** Dateien.
   - Originaldatei und ggf. normalisierte Snapshot-Datei als verschlüsselte Artefakte.

3. **Cloud Firestore**
   - Speichert nur Metadaten, Status, Prüfsummen, verschlüsselte Schlüsselhüllen, Audit-Trails.
   - Keine sensiblen Klardaten.

4. **Cloud Functions (2nd gen, on-demand)**
   - Für serverseitige Verarbeitung/Analyse auf Basis bereits entschlüsselter Daten im Request-Kontext oder über kontrollierte Decrypt-Pipeline.
   - Undo/Redo-Orchestrierung, Validierungen, Event-Handling.

5. **(Optional) Firebase App Check**
   - Reduziert Missbrauch von API/Storage durch nicht verifizierte Clients.

## Kostenstrategie (sparsam starten)

- **Blaze ab Tag 1** (mit Billing-Account), da Cloud Storage for Firebase als MVP-Backbone benötigt wird.
- Cloud Functions nur bei echten Backend-Prozessen triggern.
- Analysen batchen (z. B. nachts oder manuell), nicht bei jedem Klick.
- Dateigrößen limitieren (z. B. 10–20 MB) und Upload früh validieren.
- Firestore-Dokumente klein halten, Pagination in History.
- Frühzeitig Budget Alerts im Google Cloud Billing aktivieren.

## Sicherheitsmodell (wichtigster Punkt)

### Grundsatz

**Zero-Plaintext-at-Rest:**
- CSV/XLSX wird im Browser verschlüsselt, bevor Upload zu Storage erfolgt.
- Firestore speichert nur Metadaten und verschlüsselte Schlüsselmaterialien.
- Kein unverschlüsselter Datensatz in Storage/Firestore.

### Praktischer Ansatz (MVP-tauglich)

1. Browser generiert pro Import einen zufälligen **Data Encryption Key (DEK)** (AES-256-GCM).
2. Datei wird lokal im Browser mit DEK verschlüsselt.
3. DEK wird mit einem **Key Encryption Key (KEK)** umhüllt:
   - Option A (einfach): KEK aus Nutzer-Secret ableiten (PBKDF2/Argon2).
   - Option B (besser): KEK über Cloud KMS / serverseitiges Key-Wrapping (späterer Ausbau).
4. Upload:
   - `encryptedOriginalBlob` nach Storage,
   - Firestore-Metadaten inkl. `wrappedDEK`, `hash`, `size`, `mimeType`, `createdAt`.

> Ergebnis: Selbst bei Storage-Leak liegt nur Ciphertext vor.

## Datenmodell (Firestore, Vorschlag)

- `users/{uid}`
  - Profil-/Plan-Metadaten.

- `users/{uid}/imports/{importId}`
  - `status`: `uploaded | processed | failed | reverted`
  - `filenameOriginal`
  - `storagePathEncryptedOriginal`
  - `storagePathEncryptedNormalized` (optional)
  - `wrappedDek`
  - `encryptionMeta` (nonce, algo, version)
  - `schemaVersion`
  - `rowCount`
  - `createdAt`, `updatedAt`
  - `revertedAt` (optional)

- `users/{uid}/imports/{importId}/events/{eventId}`
  - Ereignisprotokoll: upload, parse, transform, revert, download.

## End-to-End Ablauf

1. User meldet sich an (E-Mail-Link/Google).
2. User lädt CSV/XLSX hoch.
3. Client validiert und verschlüsselt Datei lokal.
4. Ciphertext wird in Storage abgelegt.
5. Firestore-Metadateneintrag wird erzeugt.
6. Optional Function verarbeitet Import (z. B. Mapping/Analyse) und schreibt Ergebnis-Metadaten.
7. Import History listet Einträge aus Firestore (pro User-UID gefiltert).
8. Download Original:
   - Client lädt Ciphertext,
   - entschlüsselt lokal,
   - bietet Datei zum Download an.
9. Vergleich Original vs. aktuelle Form:
   - beide Versionen lokal entschlüsseln / laden,
   - UI zeigt Diff/Tabellenvergleich.
10. Revert:
    - Function oder transaktionaler Client-Schritt markiert Import als `reverted`,
    - schreibt Revert-Event,
    - aktualisiert abgeleitete Datensichten.

## Auth-Entscheidung (Empfehlung)

### Für den Start

- **E-Mail-Link (Passwordless)** als Standard.
- Optional zusätzlich **Google Sign-In**.

### Warum nicht klassische Passwörter?

- Höherer Support-Aufwand (Reset, Passwortqualität, UX-Reibung).
- Ihr wollt keine eigene Auth-Lösung bauen.
- Firebase Auth löst Session, Token, Provider, Security Rules Integration bereits robust.

## Security Rules (MVP-Prinzip)

- Firestore: jeder User darf nur unter `users/{uid}` lesen/schreiben, wenn `request.auth.uid == uid`.
- Storage: Zugriff nur auf Pfade mit eigener UID.
- Schreibschutz für serververwaltete Felder (z. B. `status` nur über Function änderbar, falls nötig).
- App Check aktivieren, sobald mobile/web release-nah ist.

## Migrationspfad (vom aktuellen Client-only Zustand)

1. Firebase Projekt konfigurieren (Auth, Firestore, Storage).
2. Login in Frontend integrieren.
3. Import-Pipeline auf „encrypt-then-upload“ umstellen.
4. Import-History auf Firestore umziehen.
5. Download + lokale Entschlüsselung implementieren.
6. Revert-Workflow mit Event-Log hinzufügen.
7. Optional: Functions für Analyse-/Transformationsjobs ergänzen.

## Produktentscheidungen (festgelegt)

### 1) Zusätzliches Entschlüsselungs-Passphrase-Secret: Wozu?

Ein zusätzliches Passphrase-Secret ist ein optionaler Sicherheitshebel für **höhere Vertraulichkeit**:

- Selbst bei kompromittiertem Firebase-Account (Token-Diebstahl) bleiben verschlüsselte Blobs ohne Passphrase unlesbar.
- Schutz gegen „Insider-/Backend-Leak“-Szenarien, weil auch Server/Storage-Admins keinen Klartext sehen.
- Trade-off: Wenn die Passphrase verloren geht, sind Daten nicht wiederherstellbar (muss UX-seitig klar kommuniziert werden).

**Empfehlung für Start:** optional machen (pro Nutzer aktivierbar), nicht hart erzwingen.

### 2) Aufbewahrung: 1 Jahr + Verlängerung

Festlegung:
- Standard-Retention: **365 Tage** je Import.
- Erinnerungen vor Ablauf: **30 Tage, 7 Tage, 1 Tag**.
- Verlängerung: **maximal 1x um weitere 365 Tage** pro Import.

Technische Umsetzung (Firebase-nah):
- Firestore-Felder im Import-Dokument: 
  - `retentionExpiresAt`
  - `extensionUsed` (boolean)
  - `extensionExpiresAt` (optional)
- Scheduled Function (täglich):
  - erzeugt Notification-Events bei T-30/T-7/T-1,
  - löscht abgelaufene Importe (Storage + Metadaten),
  - protokolliert Löschung im Audit-Event,
  - ist **idempotent** implementiert (mehrfaches Ausführen ohne Seiteneffekte).
- Keine Exactly-once-Annahme: Jobs müssen Retries, Doppeltrigger und partielle Fehler robust behandeln.
- UI:
  - Import-History zeigt „läuft ab in X Tagen“,
  - Aktion „um 1 Jahr verlängern“ nur solange `extensionUsed === false`.

### 3) Welche Analyseergebnisse?

Sinnvoll ist eine **zweistufige Analyse**:

- **MVP (günstig, schnell):**
  - Basis-KPIs: Summe Einnahmen/Ausgaben, Saldo, Anzahl Transaktionen.
  - Zeitaggregation: monatliche Summen.
  - Kategorienranking: Top-Kategorien nach Betrag/Frequenz.
  - Qualitätsmetriken: ungemappte Labels, Dubletten-Hinweise, fehlende Pflichtfelder.

- **Später (optional):**
  - Anomalieerkennung (Ausreißer),
  - wiederkehrende Buchungen (Subscriptions),
  - Forecasting pro Kategorie.

Speichern sollte man nur **aggregierte Ergebnisse** und Referenzen, nicht Roh-Klardaten.

### 3b) Technische Ablage der Analyseergebnisse (wichtig für Performance)

Ja: Die Analyseergebnisse sollten **separat/materialisiert** abgelegt werden, damit nicht bei jedem Aufruf die kompletten Imports neu berechnet werden müssen.

Empfohlenes Muster:
- Trigger nach Import-Verarbeitung (`status=processed`) startet Analyse-Job.
- Job schreibt Aggregationen in eine eigene Collection, z. B.
  - `users/{uid}/analytics/overview` (globale KPIs),
  - `users/{uid}/analytics/monthly/{yyyy-mm}` (Monatswerte),
  - `users/{uid}/imports/{importId}/analytics/summary` (importbezogene KPIs).
- UI liest primär diese voraggregierten Dokumente (schnell + günstiger).
- Bei Revert oder Neuimport werden nur betroffene Aggregate inkrementell aktualisiert.

Vorteile:
- deutlich weniger Reads/CPU,
- stabile Ladezeiten in Dashboard/Charts,
- klarer Audit-Pfad, wann welche Kennzahlen erzeugt wurden.

## Error Handling, Logging & Notifications

### Logging / Observability

- **Backend:** Cloud Functions Logs gehen nach **Google Cloud Logging** (integriert).
- Für Fehlerkorrelation `importId`, `uid`, `jobId` als strukturierte Felder mitloggen.
- Kritische Fehler zusätzlich in eine Firestore-Collection `ops/errors` (redacted) schreiben, damit Support sie in der App/Admin-UI sehen kann.
- Optional: GCP Error Reporting auf Basis von Cloud Logging aktivieren.

### Clientseitiges Error Handling + UX-Feedback

- Einheitliches Error-Format im Frontend (`code`, `message`, `retryable`, `context`).
- Toasts nur bei nutzerrelevanten Ereignissen (kein Spam):
  - Erfolg: Upload gestartet/abgeschlossen, Verlängerung bestätigt, Revert abgeschlossen.
  - Warnung: große Datei, baldige Aufbewahrungsfrist, teilweise Mapping-Probleme.
  - Fehler: Upload fehlgeschlagen, Entschlüsselung fehlgeschlagen, Netzwerk/Permission-Probleme.
- Dedupe/Rate-Limit für Toaster (z. B. gleicher Fehler max. 1x pro 30s).
- Zusätzlich Inline-Fehler an der betroffenen UI-Stelle (nicht nur globaler Toast).

### Notifications (Tasks, Async Results, Erinnerungen)

Empfohlen ist eine zentrale Notification-Struktur:
- Firestore: `users/{uid}/notifications/{notificationId}`
  - Felder: `type`, `title`, `message`, `severity`, `createdAt`, `readAt`, `link`, `meta`.
- Erzeugung durch Functions für:
  - Retention-Reminder (T-30/T-7/T-1),
  - Async Analyse fertig/fehlgeschlagen,
  - Revert abgeschlossen,
  - ggf. Sicherheitsereignisse (z. B. wiederholte fehlgeschlagene Entschlüsselung).
- Zustellung:
  - In-App Notification Center (MVP),
  - optional Web Push via Firebase Cloud Messaging für wichtige Events.

MVP-Start ohne Push ist vollkommen ok; In-App + Badge reicht zunächst.

### 4) Limits: initial ohne clientseitiges Limit

Festlegung:
- Keine rein kosmetische Limit-Strategie: **harte serverseitige Limits ab MVP**.
- Orientierung an Firebase-Limits/Quotas, aber zusätzlich produktseitige Schutzgrenzen.

Pragmatische Konfigurationsempfehlung (MVP):
- Hard limit pro Datei: **20–50 MB** (serverseitig erzwungen).
- Daily Upload-Quota pro User (z. B. Anzahl Uploads + Gesamtvolumen/Tag).
- Soft-Warnung in UI ab z. B. 25 MB (Performance-Hinweis).
- Monitoring für Storage-Egress, Function-CPU/RAM, Firestore-Reads.
- Feature-Degradation bei Abuse/Runaway (z. B. temporär Read-only für Downloads/History statt Full Outage).

## Routing-Empfehlung (vue-router)

Ja, das ist sinnvoll. Für den aktuellen App-Zuschnitt empfehle ich:

- `/` = Upload/Splash
- `/import/mapping` = Mapping/Validierung
- `/app/dashboard`
- `/app/charts`
- `/app/data`
- `/app/settings`
- optional `/app/history/:importId` für Detail-/Vergleichsansicht

Vorteile:
- Deep Links auf konkrete Ansichten (z. B. direkt in Charts).
- Browser Back/Forward arbeitet erwartungskonform.
- Berechtigungs-/State-Guards pro Route (z. B. ohne Login nur `/`).

## Konkret empfohlener nächster Sprint

1. Firebase Auth (E-Mail-Link) + Guard für bestehende App.
2. `vue-router` einführen und Tabs auf echte Routen umstellen.
3. Firestore-Modell `users/{uid}/imports` + `users/{uid}/notifications` aufsetzen (inkl. Retention-Felder).
4. Clientseitige AES-GCM-Verschlüsselung + Storage Upload.
5. Analyse-MVP als materialisierte Aggregationen persistieren (`analytics/*`) statt On-the-fly-Berechnung.
6. Einheitliche Error-Utility + Toast-System (mit Dedupe) integrieren.
7. Harte serverseitige Limits/Quotas (Dateigröße, Upload-Rate, Abuse-Controls) als MVP-Requirement aktivieren.
8. History-Ansicht aus Firestore speisen (inkl. Ablaufhinweis + Verlängerung) und Notification Center anbinden.
9. Download & lokale Entschlüsselung einer Originaldatei als vertikaler End-to-End Slice.

Damit habt ihr sehr schnell ein echtes Backend mit minimalen Kosten, sauberer Skalierungsoption und einem datenschutzfreundlichen Sicherheitsfundament.


## CTO-kritischer Review: valide Punkte, Gegenargumente, Entscheidungen

### 1) Spark vs. Blaze

**Valider Punkt:** Für euer Zielbild (Uploads, History, Retention-Jobs, Notifications, Analytics-Jobs) ist Spark als Produktgrundlage riskant. Free-Quota-Shutoff kann faktisch zu ungeplantem Produktstillstand führen.

**Entscheidungsempfehlung:**
- Nicht „Spark-first“ als Betriebsannahme kommunizieren, sondern **Blaze mit harten Budget-Grenzen** als Default.
- Sofort aktivieren: Budget Alerts, Quota-Dashboards, Notfall-Runbook (inkl. Feature-Degradation statt Total-Ausfall).
- Wichtig: Budget Alerts informieren nur; Kostenkontrolle braucht zusätzliche technische Guardrails (Rate Limits, harte Upload-Limits, Abuse-Handling).

### 2) Threat Model sauber trennen (E2EE vs. Server-Processing)

**Valider Punkt:** „Zero-Plaintext-at-Rest“ und „serverseitige Analyse“ sind kompatibel, aber nur mit klaren Grenzen. Sobald Backend Klartext sieht (auch transient), sinkt Insider-Schutz.

**Konkrete Formulierung für CTO/Produkt (Threat-Model in 3 Punkten):**
- **Storage-Leak-Schutz:** ✅ durch Ciphertext-at-rest.
- **Insider-/Plattformschutz:** ❌/teilweise, sobald Server Klartext verarbeiten kann; ✅ nur bei strikt clientseitiger Verarbeitung ohne Server-Decryption.
- **Server-Processing-Ziel:** ✅ möglich, aber expliziter Trade-off gegen maximales Insider-Schutzmodell.

**Entscheidungsoptionen:**
1. **Client-first Analyse (privacy-max):** Parsing/Analyse clientseitig, Backend speichert nur Aggregates/Metadaten.
2. **Hybrid (empfohlen für MVP):** Import bleibt verschlüsselt at rest, Server verarbeitet nur explizit erlaubte Analysepayloads, strikte Log-Redaction.
3. **Server-heavy:** stärkere Backend-Funktionen, aber klar kommunizierter Trade-off beim Insider-Modell.

### 3) Key-Management (Passphrase-Mode)

**Valider Punkt:** Passphrase-basierte KEK-Modelle erzeugen UX-/Support-Risiken (Recovery nicht möglich).

**Produktentscheidung (zweimodig):**
- **Standard-Modus:** account-recoverable, geringere Friktion.
- **Hardened-Modus (optional):** benutzerverwaltete Passphrase, keine Recovery durch Support, explizite Warn-/Bestätigungs-UX.

**Pflichtmaßnahmen, falls Hardened angeboten wird:**
- deutliche UX-Hinweise bei Aktivierung,
- optionales Recovery-Kit/Backup-Key-Konzept,
- dokumentierte Edge-Cases (Gerätewechsel, verlorene Credentials).

### 4) Kosten-Hotspots: Reads/Egress vor Storage-GB

**Valider Punkt:** Haupttreiber werden typischerweise Firestore-Reads, Listener und Storage-Egress sein.

**Muss von Tag 1 an rein:**
- strikte Pagination,
- keine unbounded realtime listener,
- per-user Quotas/Rate-Limits (serverseitig),
- Kosten-Telemetrie je User/Tenant (Reads, Writes, Downloads).

### 5) Undo/Revert: fachlich korrekt modellieren

**Valider Punkt:** `status=reverted` allein ist kein echtes Undo.

**Technische Entscheidung:**
- Imports als **immutable snapshots** behandeln,
- abgeleitete Sichten/Aggregate deterministisch aus Snapshot-Ledger berechnen,
- Revert als idempotente Domain-Operation (mit Lock/Version-Check) implementieren.

Damit werden Race-Conditions und „halb-revertierte“ Zustände deutlich reduziert.

### 6) Security Rules härten

**Valider Punkt:** `request.auth.uid == uid` ist nur die Baseline.

**Ergänzend verpflichtend:**
- server-managed Felder gegen Client-Write sperren (`status`, retention, analytics),
- Storage-Pfade strikt UID-gebunden validieren,
- Write-Spam begrenzen (Rules + backendseitige Prüfungen).

### 7) App Check realistisch einordnen

**Valider Punkt:** App Check ist Zusatzschutz, kein Ersatz für Auth/Rules.

**Positionierung:**
- App Check aktivieren, sobald operativ stabil,
- aber Sicherheitsargumentation primär über Auth, Rules, Encryption, Least Privilege führen.

### 8) Passwordless Security-Niveau

**Valider Punkt:** Email-Link ist UX-stark, aber Security hängt stark an Mailkonto-Hygiene.

**Roadmap-Ergänzung:**
- MFA-Option einplanen,
- Session-Hardening (Token-Rotation, Device-Management, Suspicious-Login-Handling),
- sensible Aktionen optional mit Re-Auth absichern.

## Ergänzte Architektur-Guardrails (MVP)

1. **Operating Plan:** Blaze + Budget Guardrails statt Spark als Default-Betriebsmodell.
2. **Threat-Model-Dokument:** explizit, welche Angreiferklasse durch welche Maßnahme adressiert wird.
3. **Data Plane:** materialisierte Analytics + immutable snapshots + idempotente Reverts.
4. **Control Plane:** serverseitige Quotas/Rate-Limits + Costs by user + Alarmierung.
5. **Security Plane:** Rules-Hardening, Log-Redaction, keine sensiblen Payloads in Error-Tools.

Diese Punkte adressieren die “harten Kanten” direkt und sind aus Principal/CTO-Sicht die zentralen Risiken, bevor ihr in breiteren Rollout geht.


## CTO-ready 1-Seite: Decisions / Risks / Mitigations / Non-goals

### Decisions
- Betrieb auf **Blaze ab Day 1** (Storage/Jobs/Retention als Kernfunktionalität).
- Verschlüsselung: Zero-plaintext-at-rest als Baseline; serverseitige Verarbeitung nur als expliziter Trade-off.
- Datenmodell: immutable Imports + materialisierte Aggregates + idempotente Revert-Operationen.
- Operability: harte Limits/Quotas und Degradation-Strategie statt Hoffnung auf Budget-Alerts.

### Top Risks
- Kosten-Spikes durch Egress/Reads/Abuse.
- Missverständnisse beim Threat Model (E2EE vs. Server-Analyse).
- Inkonsistente Zustände bei Revert/Retry/Parallelität.

### Mitigations
- Server-enforced Limits, per-user quotas, Monitoring pro Nutzer/Tenant.
- Klare Security-Claims pro Modus (Standard vs. Hardened).
- Idempotente Jobs, append-only Audit-Events, deterministische Rebuilds aus Snapshots.

### Non-goals (MVP)
- Kein vollwertiges Event-Sourcing-Framework.
- Kein sofortiger Push-first Notification-Stack (In-App zuerst).
- Keine unbegrenzten Uploads ohne technische Schutzgrenzen.

## Umsetzungsstand: Start der Mock→Firebase-Migration

Bereits umgesetzt in Codebasis:
- `backendClient` ist auf Provider-Switch vorbereitet (`VITE_BACKEND_PROVIDER=mock|firebase`).
- `auth` ist auf Provider-Switch vorbereitet (`VITE_AUTH_PROVIDER=mock|firebase`).
- Mock-Provider bleibt Standard, damit die App weiterhin lauffähig ist.
- Firebase-Provider sind als Scaffold angelegt und werfen aktuell bewusst einen klaren Fehler, bis SDK + echte Adapter implementiert sind.

Nächste technische Schritte (direkt anschlussfähig):
1. Firebase SDK installieren und in `authClientFirebase.ts` verdrahten (Email-Link + Session-Rehydrate).
2. `backendClientFirebase.ts` auf Firestore/Storage umsetzen (zuerst `list/create import meta`).
3. Danach encrypted upload/download End-to-End über Storage aktivieren.
