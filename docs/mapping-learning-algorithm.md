# Mapping Learning Algorithm (Detail)

## Status (wichtig)

- **Projektstatus:** Startphase (kein Legacy-Ballast, wir bauen den Lern-Workflow jetzt gezielt auf).
- Ziel dieses Konzepts: ein **selbstlernender Import-Flow**, der mit jedem Import und jeder Korrektur besser wird.

Dieses Dokument beschreibt den **umzusetzenden PR-Zuschnitt** für lernendes Mapping (nicht nur ein späteres Nice-to-have).

## Zielbild

Beim CSV/XLSX-Import soll das System Spalten und Inhalte automatisch zuordnen und mit jeder Nutzerinteraktion besser werden:

1. Upload
2. Auto-Mapping (Header + Inhalte)
3. Unsichere Fälle durch Nutzer bestätigen/korrigieren
4. Learnings serverseitig persistieren
5. Beim nächsten Import bessere Vorschläge

---

## Kernanforderungen für den PR

1. **Geräteübergreifendes Lernen** (Firestore statt browser-lokal)
2. **Lernen aus nachträglichen Korrekturen** (`category`, `label`)
3. **AI-Assist für Cold-Start & Low-Confidence-Fälle**
4. **Kein harter Produkt-Limit-Overhead in der Startphase**, aber technische Safety-Guards

---

## Datenmodell (Firebase)

### 1) Mapping-Profil (aggregiert)

Pfad:

- `users/{uid}/mappingProfiles/default`

Beispielstruktur:

```ts
interface MappingProfileDoc {
  version: number;
  updatedAt: number;
  counts: Partial<Record<MappingField, Record<string, number>>>;
  quality: {
    totalImports: number;
    correctedMappings: number;
    avgConfidence: number;
  };
  ai: {
    assistRuns: number;
    lastAssistAt?: number;
  };
}
```

### 2) Korrektur-Events (leichtgewichtig, optional TTL)

Pfad:

- `users/{uid}/mappingFeedback/{eventId}`

Zweck:
- Audit / Debugging
- spätere Kalibrierung

---

## Lernsignale (was als Training zählt)

### A) Beim Import-Mapping bestätigen

- final gewählter Header pro Feld (`date`, `amount`, `purpose`, `category`, `label`)
- Delta in `counts[field][header] += 1`

### B) Nachträgliche Tabellen-Korrekturen

Wenn Nutzer im Grid `category` oder `label` ändert:

- Korrektur als Lernsignal zählen
- aggregiert in Profil schreiben (debounced/batched)
- optional Event für Audit schreiben

Damit lernt das System auch **nach dem Importabschluss** weiter.

---

## Scoring-Logik (Ensemble)

Score pro Feldkandidat:

`score = w_hint * hintScore + w_history * historyScore + w_ai * aiScore`

Startwerte (tunable):

- `w_hint = 0.45`
- `w_history = 0.35`
- `w_ai = 0.20`

Confidence-Buckets:

- `High >= 0.85`
- `Medium 0.60 - 0.84`
- `Low < 0.60`

---

## AI-Tooling (konkret)

### Empfohlene Stack-Entscheidung

1. **Firebase Cloud Functions (2nd gen)** als Orchestrierung
2. **Firebase Genkit** für AI-Flow-Definitionen
3. **Gemini-Modelle über Google AI / Vertex AI** (z. B. ein schnelles, kostengünstiges Modell für Klassifikation/Mapping)

Warum diese Wahl:
- bleibt im Google/Firebase-Ökosystem
- geringerer Integrationsaufwand
- gute Beobachtbarkeit via Cloud Logging

### Fallback-Strategie

- AI nur bei `Low` Confidence oder frühen Imports
- bei Timeout/Fehlern immer deterministische Heuristik als Fallback

---

## AI-Einsatzregelung in der Startphase

Es gibt **keine produktseitigen harten Nutzergrenzen** in der frühen Konzept-/Lernphase.

Stattdessen technische Guardrails (nicht als User-Limit kommuniziert):

- serverseitiger Timeout pro AI-Call
- Retry max. 1x
- bei Fehler sofort Heuristik-Fallback
- strukturierte Logs (`uid`, `importId`, `confidenceBefore`, `aiUsed`)

Ziel: schnell lernen, ohne den Importfluss zu gefährden.

---

## Import-Flow (Soll)

1. Datei importieren
2. Header + Sample-Zeilen extrahieren
3. Basis-Suggestion (Hints + History)
4. Falls `Low` Confidence: AI-Assist für betroffene Felder
5. Vorschlag anzeigen + Nutzer bestätigt/korrigiert
6. Mapping anwenden
7. Learnings persistieren (Profil + optional Feedback-Event)
8. Spätere Grid-Korrekturen ebenfalls rückkoppeln

---

## Umsetzungsumfang dieses PR-Konzepts

### Web

- `mappingSuggestions.ts` von local-only auf Profil-Injektion umstellen
- `useMappingStore` um Async-Laden/Speichern des Profils erweitern
- DataGrid-Edit-Hooks für Lernfeedback (`category`, `label`) ergänzen

### Services

- neue BackendClient-Methoden:
  - `getMappingProfile(user)`
  - `updateMappingProfileDelta(user, delta)`
  - `recordMappingFeedback(user, payload)`
  - `aiSuggestMapping(user, payload)`

### Firebase

- Firestore-Collections + Security Rules für `mappingProfiles` / `mappingFeedback`
- Function/Genkit-Flow für AI-Suggestion

---

## Akzeptanzkriterien

1. Profile sind geräteübergreifend verfügbar (gleicher Nutzer, anderes Gerät => ähnliche Vorschläge)
2. Nachträgliche `category`/`label`-Korrekturen verbessern den nächsten Import messbar
3. Bei niedriger Confidence wird AI eingesetzt, bei hoher nicht
4. Import bleibt robust (AI-Fehler blockiert nie den Import)

---

## Telemetrie / Erfolgsmessung

- Mapping Auto-Apply Rate
- Korrekturrate pro Import
- AI Assist Rate
- Zeit bis Import-Abschluss
- Confidence-Kalibrierung (High-Confidence-Korrekturquote)


---

## Kritische Design-Safeguards (müssen im PR umgesetzt werden)

Die folgenden Punkte sind **nicht optional**. Sie adressieren die wichtigsten Risiken für Mapping-Qualität, Kosten und Stabilität.

### 1) Nicht nur Header lernen: Kontext-Fingerprints verwenden

Header-only-Learning (`counts[field][header] += 1`) ist zu schwach.

Pflicht-Erweiterung:

```ts
counts[field][normalizedHeader][sourceFingerprint] += 1
```

`sourceFingerprint` wird aus **normalisierten** strukturellen Merkmalen gebildet, z. B.:
- Hash der normalisierten Headerliste (Reihenfolge inkl.)
- Delimiter-/Schema-Merkmale
- optionale Source/Bank-Heuristik

Header-Normalisierung vor Fingerprint-Bildung (Pflicht):
- trim (führende/trailende Leerzeichen entfernen)
- lowercase
- Sonderzeichen/Währungssymbole reduzieren (z. B. `€`, `$`)
- mehrfaches Whitespace kollabieren
- optionale Normalisierung häufiger Separatoren (`_`, `-`, `/`)

Beispiele:
- `"Amount (€)" -> "amount"`
- `"Betrag " -> "betrag"`

Nutzen:
- verhindert Cross-Source-Pollution
- reduziert falsche Confidence-Akkumulation
- verbessert Generalisierung bei heterogenen Exportformaten

### 2) Negative Lernsignale erfassen

Nur positive Verstärkung führt zu „sticky“ Fehlzuordnungen.

Pflicht-Erweiterung:

```ts
signals: {
  positive: number;
  negative: number;
}
```

oder mindestens:

```ts
negativeCounts[field][header][sourceFingerprint] += 1
```

Negative Signale entstehen z. B. wenn:
- Nutzer eine Auto-Suggestion überschreibt
- Nutzer nach Import `category`/`label` korrigiert

### 3) Confidence-Kalibrierung messbar machen

`avgConfidence` alleine reicht nicht.

Pflicht-Metriken pro Bucket:
- `highPredictions`, `highCorrections`
- `mediumPredictions`, `mediumCorrections`
- `lowPredictions`, `lowCorrections`

Damit ableitbar:
- Korrekturquote pro Confidence-Bereich
- Reliability-Kurven
- sichere Auto-Apply-Schwellen

### 4) AI-Payload strikt minimieren

Pflicht-Input-Vertrag für AI:
- Headerliste
- 5–10 repräsentative Sample-Zeilen
- optional Locale-Hint
- kompakter historischer Mapping-Kontext pro relevantem Header

Beispiel für historischen Kontext im Payload:

```json
{
  "header": "amount",
  "historicalMappings": [
    { "field": "amount", "count": 18 },
    { "field": "purpose", "count": 2 }
  ]
}
```

Nicht erlaubt:
- vollständige Datei
- große Row-Sets
- Raw-Blobs

Pflicht-Guardrails:
- harter Timeout
- max. 1 Retry
- deterministischer Heuristik-Fallback

### 5) Counter-Updates atomar ausführen

Learning-Counter müssen race-safe aktualisiert werden.

Pflicht-Umsetzung:
- `FieldValue.increment(...)` für Zählerfelder
- Firestore-Transaktion bei zusammenhängenden Mehrfeld-Updates
- idempotente, retry-sichere Update-Operationen

Typische Race-Szenarien:
- Multi-Tab
- parallele Importe
- Retry nach Timeout
- langsame Netze


### 6) Profilwachstum begrenzen (Firestore-Doc-Size)

Da das Profil als Firestore-Dokument gehalten wird, muss das Wachstum begrenzt werden (1-MB-Dokumentgrenze beachten).

Pflicht-Strategie:
- `maxFingerprintsPerField = 200` (Startwert)
- LRU-/Least-used-Eviction für selten genutzte Fingerprints
- optional Count-Decay über Zeit
- Entfernen sehr kleiner Counts (Pruning)

Ohne diese Begrenzung fragmentieren Signale und das Dokument wächst unnötig stark.

---

## Ergänztes Profil-Schema (empfohlen)

```ts
interface MappingProfileDocV2 {
  version: number;
  updatedAt: number;
  counts: Partial<Record<MappingField, Record<string, Record<string, number>>>>; // field -> header -> fingerprint -> +
  negativeCounts: Partial<Record<MappingField, Record<string, Record<string, number>>>>;
  lastUsedAt?: Partial<Record<MappingField, Record<string, Record<string, number>>>>; // LRU/Pruning
  limits: {
    maxFingerprintsPerField: number;
  };
  quality: {
    totalImports: number;
    avgConfidence: number;
    highPredictions: number;
    highCorrections: number;
    mediumPredictions: number;
    mediumCorrections: number;
    lowPredictions: number;
    lowCorrections: number;
  };
  ai: {
    assistRuns: number;
    lastAssistAt?: number;
  };
}
```

Hinweis: Bei Migration von V1 -> V2 muss eine rückwärtskompatible Normalisierung existierender Counter vorgesehen werden.
