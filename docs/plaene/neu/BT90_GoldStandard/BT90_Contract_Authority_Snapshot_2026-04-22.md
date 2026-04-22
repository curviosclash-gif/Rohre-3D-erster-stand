# BT90 Contract- und Authority-Snapshot 2026-04-22

Stand: 2026-04-22
Status: Referenz-Snapshot unter `docs/plaene/neu/`

## Rolle des Dokuments

Dieses Dokument friert die Contract- und Authority-Lage fuer `BT90` bis `BT92` gegen den aktuellen Repo-Stand ein.
Es ist kein aktiver Masterplan.
Operative Phasen, Locks, Evidence und Abschluss-Gates bleiben weiterhin ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md`.

## Entscheidung

- Fuer `BT90` bis `BT92` gilt ein expliziter Dokumentations-Freeze gegen den Repo-Stand vom 2026-04-22.
- `V101` ist **kein** harter Vorblocker fuer `BT90` oder `BT91`, solange die hier benannten Authority- und Adjacent-Dateien unveraendert bleiben.
- Wenn `V101` oder ein anderer Block eine Authority- oder Adjacent-Datei aendert, muss dieser Snapshot vor dem naechsten `BT90`- bis `BT92`-Claim neu bestaetigt oder neu geschrieben werden.
- Bei Widerspruch gilt: reale JS-Artefakte > dieser Snapshot > BT90-Draft-Texte > historische Kontextstellen.

Wichtig:

- `docs/referenz/ai_architecture_context.md` bleibt die Layer- und No-Touch-Referenz.
- Die dortige historische Sektion zum eingefrorenen Bot-Bridge-V1 ist fuer `BT90` bis `BT92` **nicht** die Feldauthority fuer runtime-near Observation- und Action-Mapping.
- Fuer diese Feldsemantik gilt das Authority-Viereck unten.

## Authority-Viereck

### 1. `src/entities/ai/training/TrainingContractV1.js`

Autoritaet fuer den internen Reset-/Step-Transitionshape.

Festgezogen fuer `BT90` bis `BT92`:

- `contractVersion` kommt aus `TRAINING_CONTRACT_VERSION` und steht aktuell auf `v1`.
- `operation` ist nur `reset` oder `step`.
- `observation` wird auf den aktuellen V2-Sollwert normalisiert.
- `info` fuehrt mindestens `observationSchemaVersion`, `observationLength`, `domain`, `match`, `terminalReason`, `truncatedReason`, `rewardBreakdown` und `metadata`.
- `hybridDecision` ist hier kein eigener Top-Level-Info-Schluessel; falls vorhanden, liegt es innerhalb von `info.metadata`.

### 2. `src/entities/ai/training/TrainerPayloadAdapter.js`

Autoritaet fuer den externen Transport- und Projektionsshape.

Festgezogen fuer `BT90` bis `BT92`:

- `buildTrainerRuntimeObservationPayload(...)` liefert den runtime-near Observation-Payload.
- `buildTrainerTransitionPayload(...)` projiziert denselben JS-Pfad in einen serialisierbaren Sidecar-Payload.
- `observationSchemaVersion` und `observationLength` liegen hier top-level am Payload.
- `info` fuehrt hier `domain`, `terminalReason`, `truncatedReason`, `rewardBreakdown`, `match`, `observationContext` und `hybridDecision`.
- `kernelRuntime` bleibt optionaler Diagnose-/Harness-Kontext und ist kein Anlass fuer Python-seitige Semantik-Neudefinition.

### 3. `src/entities/ai/observation/ObservationSchemaV2.js`

Statische Soll-Referenz fuer den runtime-near Observation-Pfad.

Festgezogen fuer `BT90` bis `BT92`:

- `OBSERVATION_SCHEMA_VERSION_V2 = 'v2-runtime-near'`
- `OBSERVATION_LENGTH_V2 = 64`
- Die runtime-near Zusatzsignale liegen in den Indizes `40` bis `63`.
- `ObservationSchemaV1.js` bleibt nur Altpfad-/Kompatibilitaetsreferenz, nicht Zielshape fuer `BT90` bis `BT92`.

### 4. `src/entities/ai/actions/BotActionContract.js`

Kanonische Aktionssprache fuer Sanitization, Clamping und Invalid-Handling.

Festgezogen fuer `BT90` bis `BT92`:

- Bool-Felder: `pitchUp`, `pitchDown`, `yawLeft`, `yawRight`, `rollLeft`, `rollRight`, `boost`, `cameraSwitch`, `dropItem`, `shootItem`, `shootMG`, `nextItem`
- Index-Felder: `shootItemIndex`, `useItem`
- `useItem` bleibt ein expliziter Inventory-Index; `-1` bedeutet "kein Item verwenden"
- `shootItem` ohne gueltigen `shootItemIndex` wird neutralisiert
- Indizes werden nur in den Bereich `-1..inventoryLength-1` geklemmt

## Stabilisierende Evidenz fuer den Snapshot

Diese JS-Artefakte bestaetigen die oben eingefrorene Authority praktisch:

- `tests/training-environment.contract.test.mjs`
- `scripts/training-smoke.mjs`
- `scripts/headless-match-kernel-smoke.mjs`

Sie bestaetigen fuer den aktuellen Stand:

- `training-reset` und `training-step` als reale Transition-Typen
- runtime-near Observation V2 mit Laenge `64`
- Transport ueber den bestehenden Headless- und Bridge-Pfad
- keine fachliche Python-Sondersemantik als Voraussetzung fuer den Start

## Pflichtfelder fuer BT90-BT92

### Uebergreifend verpflichtend

- `contractVersion`
- `operation`
- `episodeId`
- `episodeIndex`
- `stepIndex`
- `observation`
- `action`
- `reward`
- `done`
- `truncated`

### Info- und Schemafelder

- `observationSchemaVersion`
- `observationLength`
- `domain`
- `terminalReason`
- `truncatedReason`
- `rewardBreakdown`

### Nur soweit tatsaechlich projeziert

- `match`
- `observationContext`
- `hybridDecision`
- `kernelRuntime`

Klarstellung:

- `hybridDecision` und `observationContext` sitzen im Reset-/Step-Contract nicht an derselben Stelle wie im externen Transport-Payload.
- Python darf daraus **keinen** eigenen "vereinheitlichten Wahrheitsshape" erfinden.
- Der JS-Pfad bleibt authoritative; Python adaptiert nur.

## Adjacent-Dateien mit Re-Audit-Pflicht

Die folgenden Dateien sind nicht Teil des Authority-Vierecks, beeinflussen aber die Semantik direkt genug, dass ein Re-Audit Pflicht wird:

- `src/state/training/TrainingDomain.js`
- `src/entities/ai/observation/RuntimeNearObservationAdapter.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
- `src/state/training/EpisodeController.js`

Relevanz:

- `TrainingDomain.js` bestimmt `domainId`, `dimension` und `controlProfileId`
- `RuntimeNearObservationAdapter.js` bestimmt V2-Lifting und `observationContext`
- `HybridDecisionArchitecture.js` bestimmt finale Aktionsausgabe und `hybridDecision`
- `EpisodeController.js` bestimmt `done`, `truncated`, `terminalReason` und `truncatedReason`

## Harte Blocker-Signale

Ein neuer `BT90`- bis `BT92`-Claim ist zu stoppen und erneut zu auditieren, wenn mindestens einer dieser Punkte eintritt:

- `TRAINING_CONTRACT_VERSION` wechselt weg von `v1`
- `OBSERVATION_SCHEMA_VERSION_V2` oder `OBSERVATION_LENGTH_V2` aendert sich
- `useItem` oder `shootItemIndex` wechselt semantisch von Indexlogik auf etwas anderes
- `rewardBreakdown`, `terminalReason` oder `truncatedReason` verschwinden aus Transition oder Transport
- `hybridDecision` oder `observationContext` wechseln still den Ort oder fallen still weg
- fuer `BT90` oder `BT91` werden neue Message-Typen, neue Runtime-Schalter oder Schreibzugriffe auf read-only Runtime-/AI-Hub-Surfaces erforderlich

## Kontrollierte Restrisiko-Entscheidung gegen V101

Der aktuelle Entscheid fuer den Startpfad lautet:

- `BT90` und `BT91` duerfen gegen diesen Snapshot vorbereitet oder geclaimt werden, solange Authority-Viereck und Adjacent-Dateien seit dem 2026-04-22 unveraendert sind.
- `BT92` braucht vor dem Claim zusaetzlich eine frische Bestaetigung, wenn `V101` seitdem `TrainingDomain`, `RuntimeNearObservationAdapter`, `HybridDecisionArchitecture`, `ObservationSchemaV2`, `TrainerPayloadAdapter` oder `BotActionContract` geaendert hat.
- Wenn diese Bestaetigung fehlt, gilt das nicht als "kleiner Restpunkt", sondern als echter Re-Audit-Blocker.

## Konsequenz fuer den Python-Pfad

- Python darf fehlende oder driftende JS-Felder nicht still kapseln oder neu interpretieren.
- Kein stiller Fallback von `v2-runtime-near` auf einen alten V1-Snapshot.
- Kein boolesches Umdeuten von `useItem`.
- Keine Python-seitige Neuberechnung von Reward-, Episode- oder Domain-Semantik.

Wenn einer dieser Punkte fuer den Start doch noetig wird, ist nicht "der Python-Adapter noch nicht fertig", sondern der Block falsch zugeschnitten und muss als neuer Intake-Fall zurueck in die Planung.
