---
id: BT101
title: Headless Gymnasium Environment ueber bestehende Vertraege
status: planned
priority: P1
owner: frei
depends_on:
  - BT100.99
blocked_by: []
affected_area: bot-training-ppo-env
scope_files:
  - python/envs/curvios_env.py
  - python/envs/__init__.py
  - python/bridge/**
  - python/scripts/check_env_smoke.py
  - python/scripts/env_step_smoke.py
  - python/tests/test_curvios_env.py
  - scripts/training-headless-bridge-smoke.mjs
verification:
  - node --test tests/training-environment.contract.test.mjs
  - node scripts/training-eval-smoke.mjs
  - python -m pytest python/tests/test_curvios_env.py -k "single_env or contract"
  - python python/scripts/check_env_smoke.py --single-env
  - python python/scripts/env_step_smoke.py --steps 25
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
  - npm run build
updated_at: 2026-04-22
---

# BT101 Headless Gymnasium Environment ueber bestehende Vertraege

## Ziel

BT101 baut das erste echte `gymnasium.Env` fuer den PPO-Zweitpfad.
Die zentrale Regel bleibt: Python kapselt den bestehenden Headless-, Transport- und Semantikpfad, statt einen zweiten fachlichen Kernel zu erfinden.

BT101 soll genau drei Dinge liefern:

1. Observation- und Action-Authority artefaktbasiert festziehen
2. ein stabiles Single-Env fuer `reset()`/`step()` ueber den bestehenden Headless-Pfad bauen
3. Reward-, `done`-, `truncated`- und Info-Semantik JS-authoritativ durchreichen

Nicht Teil von BT101.99:

- Mehr-Worker-Harness
- Vector-Env
- Throughput-Optimierung fuer PPO

Diese Themen bleiben Folgearbeit fuer den naechsten kleineren Folgeblock.

## Startmodus fuer die erste Umsetzungswelle

BT101 schliesst bewusst nur mit `101.1` bis `101.3`.

Der Block endet also dann gruen, wenn:

- Observation-/Action-Authority sauber dokumentiert ist
- genau ein Single-Env stabil laeuft
- Reward-/Episode-Semantik ohne Python-Reinterpretation uebernommen wird

`101.4` bis `101.6` bleiben als bewusst nachgelagerte Folgespur dokumentiert und sind nicht Teil von `101.99`.

## Nicht-Ziel

- neue Gameplay-Signale
- neue produktive Rewardlogik
- Runtime-Policy-Umschaltung
- Mehr-Env-/VecEnv-Closure in demselben Block
- Electron-Client-Management als Primaerarchitektur

## Referenzen

- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
- `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
- `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`
- `docs/referenz/ai_architecture_context.md`
- `src/entities/ai/observation/ObservationSchemaV1.js`
- `src/entities/ai/observation/ObservationSchemaV2.js`
- `src/entities/ai/actions/BotActionContract.js`
- `src/entities/ai/training/TrainingContractV1.js`
- `src/entities/ai/training/TrainerPayloadAdapter.js`
- `src/entities/ai/training/TrainingTransportFacade.js`
- `src/core/MatchKernelTrainingAdapter.js`
- `src/state/HeadlessMatchKernelRuntime.js`
- `tests/training-environment.contract.test.mjs`
- `scripts/training-eval-smoke.mjs`

## Observation-Contract

### Source of Truth

Der Observation-Space wird in BT101 nicht frei im Python-Stack definiert.
Er wird aus dem bestehenden runtime-near Payload und den dazugehoerigen Vertragsartefakten abgeleitet.

Fuer BT101 gilt diese Reihenfolge:

1. `BT90_Contract_Authority_Snapshot_2026-04-22.md` als Freeze-, Drift- und Prioritaetsregel
2. `TrainerPayloadAdapter.js` und die dadurch gebauten runtime-near Payloads
3. `TrainingContractV1.js` als Contract fuer `observationSchemaVersion` und `observationLength`
4. `ObservationSchemaV2.js` als statische Soll-Referenz fuer den aktuellen runtime-near V2-Pfad
5. `ObservationSchemaV1.js` nur noch als Kompatibilitaets- und Altpfad-Referenz

### Drift-Regel

Wenn real transportierter Payload und statische Schema-Referenz nicht deckungsgleich sind, wird das nicht still im Env "wegadaptiert".

Dann gilt:

- Mismatch dokumentieren
- als Contract- oder Schema-Drift markieren
- BT101 nur dann weiterziehen, wenn klar ist, welche Seite authoritative bleibt

BT101 darf Drift kapseln, aber nicht verstecken.

### Konkrete Erwartung fuer BT101

BT101 zielt auf den aktuellen runtime-near Pfad mit:

- `observationSchemaVersion`
- `observationLength`
- Observation-Vektor aus dem Headless-Pfad

Der erwartete Sollzustand fuer den stabilen BT101-Pfad ist dabei der aktuelle V2-Pfad.
Ein abweichender Payload ist in BT101 kein stiller "Fallback", sondern ein dokumentationspflichtiger Blocker oder Restpunkt.

## Action-Contract

### Keine neue Aktionssprache

Python darf keine neue Aktionssprache einfuehren.
Das Env decodiert PPO-Aktionen in genau das JSON-Format, das der bestehende Contract erwartet.

### Authoritative Action-Quelle

Fuer BT101 ist `src/entities/ai/actions/BotActionContract.js` die kanonische Action-Referenz fuer:

- Feldnamen
- Sanitization
- Clamping
- Invalid-Handling

Wichtig:

- `useItem` ist ein expliziter Inventory-Index
- `-1` bedeutet "kein Item verwenden"
- Python darf daraus kein boolesches "use current item" machen

BT101 sendet Rohaktionen in der bestehenden Sprache und laesst die bestehende JS-Seite sanitizen.

## Reward-, Curriculum- und Episode-Semantik

### Authoritative Ownership

Der bestehende JS-Pfad bleibt authoritative fuer:

- Reward
- `rewardBreakdown`
- `done`
- `truncated`
- `terminalReason`
- `truncatedReason`
- `hybridDecision`, soweit transportiert
- Curriculum-/Domain-Semantik

Python konsumiert diese Daten as-is.

### Konsequenz fuer das Env

`curvios_env.py` liefert Gym-kompatible Rueckgaben, aber errechnet keine fachliche Semantik neu.
Es ist ein Adapter, kein zweiter Kernel.

BT101 muss sichtbar machen, wenn folgende Felder im Env-/Info-Pfad fehlen oder kippen:

- `rewardBreakdown`
- `terminalReason`
- `truncatedReason`
- `hybridDecision`
- `observationSchemaVersion`
- `observationLength`

## Env-Architektur

### Single-Env zuerst

Die erste stabile Architektur ist:

`PPO <-> CurviosEnv <-> Python bridge client <-> JS headless worker <-> MatchKernelTrainingAdapter/TrainingTransportFacade`

BT101.99 schliesst nur gegen diesen Single-Env-Pfad.

### Boundary-Regel

Wenn fuer BT101 ein kleiner JS-Harness noetig ist, darf dieser nur:

- Prozessstart
- Seed-/Mode-Konfiguration
- Reset-/Dispose-Orchestrierung
- Logging/Timeouts

uebernehmen.

Nicht erlaubt:

- neue Rewardlogik
- neue Observation-Semantik
- Umgehung von `TrainingTransportFacade`
- Umgehung des headless Kernelpfads

## Definition of Done

- [ ] DoD.1 `python/envs/curvios_env.py` kapselt den bestehenden Contract stabil fuer genau einen Single-Env-Pfad.
- [ ] DoD.2 Observation- und Action-Authority sind explizit gegen `TrainerPayloadAdapter`, `TrainingContractV1` und `BotActionContract` validiert.
- [ ] DoD.3 `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason`, `truncatedReason` und soweit verfuegbar `hybridDecision` werden JS-authoritativ durchgereicht.
- [ ] DoD.4 Ein Single-Env-Headless-Pfad laeuft stabil und wird ueber echte Compliance-/Step-Smokes validiert.
- [ ] DoD.5 Mehr-Env-/VecEnv-Themen sind explizit aus `101.99` herausgenommen und als Folgearbeit fuer den naechsten kleinen Block dokumentiert.
- [ ] DoD.6 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Risiken

| ID | Risiko | Wahrscheinlichkeit | Impact | Mitigation | Trigger | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R101.1 | Observation- oder Action-Authority driftet zwischen Payload, Schema und Sanitizer | MED | HIGH | `TrainerPayloadAdapter`, `TrainingContractV1` und `BotActionContract` als harte Dreiecksquelle nutzen; Mismatch als Blocker markieren | Shape-/Version-Mismatch oder unklare `useItem`-Semantik | Integration |
| R101.2 | Reward-/Curriculum-Semantik wird doppelt implementiert | MED | HIGH | JS als einzige fachliche Quelle festschreiben | Python beginnt Reward oder Stages neu zu berechnen | Governance |
| R101.3 | Schon der Single-Env-Lifecycle ist bei Reset/Dispose instabil | MED | HIGH | erst Single-Env sauber schliessen, dann Folgearbeit ziehen | Worker- oder Env-Lifecycle bleibt haengen | Train-Ops |
| R101.4 | Mehr-Worker- und VecEnv-Druck kommt wieder zu frueh in den Block | MED | MED | `101.4` bis `101.6` explizit ausserhalb von `101.99` halten | DoD-/Verify-Diskussion zieht Parallelisierung vor | Governance |
| R101.5 | Electron-first-Denken schleicht ueber Altmaterial wieder ein | LOW | MED | Headless als Standard in Prompt, Block und README fixieren | neue Skizzen haengen wieder am Desktop-Client | Governance |

## Phasen

### 101.1 Observation-/Action-Authority
status: open
goal: reale Contracts fuer Observation und Action hart absichern
output: dokumentierte Authority-Regel fuer den Single-Env-Pfad

- [ ] 101.1.1 Reale Payload-Felder aus `TrainerPayloadAdapter` und `TrainingContractV1` als Pflichtliste fuer BT101 erfassen.
- [ ] 101.1.2 Erwartete `observationSchemaVersion` und `observationLength` fuer den aktuellen runtime-near V2-Pfad festziehen; Mismatch als Blocker markieren.
- [ ] 101.1.3 Action-Mapping gegen `BotActionContract.js` absichern, inklusive `useItem`, Clamping und Invalid-Handling.

### 101.2 Single-Env Grundgeruest
status: open
goal: ein erstes stabiles headless `gymnasium.Env` aufziehen
output: `CurviosEnv` mit verdrahtetem `reset()`-/`step()`-Pfad fuer genau eine Lane

- [ ] 101.2.1 `CurviosEnv` fuer genau einen Env-Lifecycle anlegen.
- [ ] 101.2.2 `reset()` und `step()` ueber den bestehenden Headless-/Boundary-Pfad verdrahten.
- [ ] 101.2.3 `close()`/Dispose deterministisch herstellen und als Teil des Single-Env-Lifecycle dokumentieren.

### 101.3 Reward-/Episode-Semantik und Compliance
status: open
goal: JS-authoritative Semantikuebernahme sichtbar und pruefbar machen
output: dokumentierter Single-Env-Semantikpfad mit Compliance-Smokes

- [ ] 101.3.1 `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason` und `truncatedReason` werden im Env as-is uebernommen.
- [ ] 101.3.2 `hybridDecision`, `observationSchemaVersion` und `observationLength` werden im Info-/Manifestpfad explizit sichtbar gemacht oder als Restluecke benannt.
- [ ] 101.3.3 `check_env(...)` oder gleichwertige Compliance sowie ein echter Step-Smoke laufen auf einem instanziierten Single-Env.

## Nachgelagerte Folgespur ausserhalb von 101.99

### 101.4 Mehr-Worker-Harness
status: deferred
goal: nichtproduktive 2- bis 4-Env-Orchestrierung ausserhalb der Runtime pruefen
output: Worker-Harness fuer Prozesse, Ports und Timeouts

- [ ] 101.4.1 Start erst nach gruener Single-Env-Lage aus `101.1` bis `101.3`.
- [ ] 101.4.2 2- bis 4-Env-Orchestrierung ausserhalb der produktiven Runtime aufziehen.
- [ ] 101.4.3 Prozesse, Ports, Timeouts und Restart-Verhalten dokumentieren.

### 101.5 Vector-Env-Smokes und Throughput
status: deferred
goal: Parallelisierungsannahmen gegen echte Laufdaten pruefen
output: Throughput- und Stabilitaetsdaten fuer 2 und 4 Envs

- [ ] 101.5.1 Start erst nach gruener Single-Env-Lage und verwertbarer BT100-Baseline.
- [ ] 101.5.2 2- und 4-Env-Smokes gegen echte Laufdaten pruefen.
- [ ] 101.5.3 ehrlichen Downgrade machen, wenn 4 Envs nicht tragen.

### 101.6 BT91-/BT102-Folgehandover
status: deferred
goal: Parallelisierung und Baseline erst nach stabilem Single-Env sauber oeffnen
output: kleiner Folge-Handover statt stiller Scope-Ausweitung in BT101

- [ ] 101.6.1 Klar dokumentieren, welche Teile in den naechsten kleinen Folgeblock gehoeren.
- [ ] 101.6.2 Keine Parallelisierungsannahme still in BT101.99 hineinziehen.
- [ ] 101.6.3 Handover fuer BT91/BT102 erst nach gruener Single-Env-Lage schreiben.

### 101.99 Abschluss-Gate
status: open
goal: BT101 nur mit stabilem Single-Env und klarer Authority-Regel schliessen
output: gruener Single-Env-Grundblock fuer den naechsten kleinen Folgepfad

- [ ] 101.99.1 Alle Phasen 101.1 bis 101.3 sind mit Evidence dokumentiert.
- [ ] 101.99.2 `CurviosEnv` kapselt den bestehenden headless Contract stabil fuer einen Single-Env-Pfad.
- [ ] 101.99.3 Reward-, Reset-, `done`-, `truncated`- und Info-Semantik bleibt JS-authoritative.
- [ ] 101.99.4 Observation-/Action-Authority ist dokumentiert; Drift wurde nicht still wegadaptiert.
- [ ] 101.99.5 `101.4` bis `101.6` bleiben explizit ausserhalb von `101.99` und werden erst im Folgeblock gezogen.
- [ ] 101.99.6 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Checkpoint-Log

| Datum | Typ | Evidence | Ergebnis |
| --- | --- | --- | --- |
| - | - | - | - |
