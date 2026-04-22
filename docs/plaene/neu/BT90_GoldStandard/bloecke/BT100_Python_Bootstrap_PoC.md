---
id: BT100
title: Python-Bootstrap und Headless-Contract-PoC
status: planned
priority: P1
owner: frei
depends_on: []
blocked_by: []
affected_area: bot-training-ppo-bootstrap
scope_files:
  - python/requirements.txt
  - python/README.md
  - python/bridge/**
  - python/tests/**
  - python/scripts/**
  - data/training/ppo/bootstrap_manifest.json
  - data/training/ppo/contract_smoke.json
  - scripts/training-headless-bridge-smoke.mjs
verification:
  - python --version
  - node --test tests/training-environment.contract.test.mjs
  - node scripts/training-smoke.mjs
  - node scripts/headless-match-kernel-smoke.mjs
  - python -m pytest python/tests -k "bootstrap or contract"
  - python python/scripts/contract_smoke.py --max-steps 100
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
  - npm run build
updated_at: 2026-04-22
---

# BT100 Python-Bootstrap und Headless-Contract-PoC

## Ziel

BT100 ist der Eintrittsblock fuer den PPO-Zweitpfad.
Der Block beweist nicht "PPO im Spiel", sondern nur den kleinsten belastbaren Wahrheitskern fuer einen externen Python-Sidecar ueber den bestehenden Headless- und Transportpfad.

BT100 hat bewusst nur vier Aufgaben:

1. einen minimalen reproduzierbaren Python-Bootstrap fuer Contract-Smokes herstellen
2. den bestehenden Training-Contract `v1` gegen reale JS-Artefakte und einen externen Python-Sidecar verifizieren
3. genau eine deterministische 1-Worker-Headless-Lane ueber den vorhandenen Kernelpfad nachweisen
4. einen artefaktbasierten Handover fuer BT101 schreiben

Nicht Teil von BT100:

- 2- oder 4-Worker-Parallelisierung
- Vector-Env
- vollwertiges PPO-Training
- fruehes Hardware-Sizing fuer BT102

Diese Punkte werden bewusst nach BT101 verschoben.

## Startpunkt fuer die erste Umsetzungswelle

BT100 ist weiter der Wahrheitsblock des PPO-Zweitpfads, aber jetzt enger und ehrlicher geschnitten.

Die Reihenfolge innerhalb von BT100 ist hart:

1. JS-seitige Wahrheitsartefakte lesen und festziehen
2. minimalen Python-Bootstrap herstellen
3. externen Python-Sidecar gegen den bestehenden Contract `v1` pruefen
4. genau eine deterministische 1-Worker-Headless-Lane mit mindestens 100 Steps beweisen
5. Restpunkte und Handover fuer BT101 dokumentieren

Wenn BT100 fuer Handshake, Contract oder den 1-Worker-Headless-Pfad produktive Runtime-Aenderungen braucht, wird nicht still weitergebaut.
Dann ist der Zuschnitt falsch und es braucht einen neuen Intake-Entscheid.

## Nicht-Ziel

- kein produktiver PPO-Rollout
- kein Eingriff in Spielcode oder AI-Hub-Schnittstelle
- kein neuer Runtime-Bot-Typ
- kein Multi-Worker-Profiling
- kein Vector-Env
- kein vollstaendiger PPO-/Torch-Stack als Closure-Kriterium

## Referenzen

- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
- `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/referenz/ai_architecture_context.md`
- `src/state/HeadlessMatchKernelRuntime.js`
- `src/core/MatchKernelTrainingAdapter.js`
- `src/entities/ai/training/TrainingTransportFacade.js`
- `src/entities/ai/training/WebSocketTrainerBridge.js`
- `src/entities/ai/training/TrainingContractV1.js`
- `src/entities/ai/training/TrainerPayloadAdapter.js`
- `tests/training-environment.contract.test.mjs`
- `scripts/training-smoke.mjs`
- `scripts/headless-match-kernel-smoke.mjs`

## Architektur- und Vertragszuschnitt

### JS-seitige Wahrheitsartefakte fuer BT100

Bevor BT100 neue Python-Dateien behauptet, muss der bestehende JS-Pfad als Wahrheitsbasis gelesen werden.

Fuer BT100 gelten diese Artefakte als primaere Referenz:

- `tests/training-environment.contract.test.mjs`
- `scripts/training-smoke.mjs`
- `scripts/headless-match-kernel-smoke.mjs`
- `TrainingContractV1.js`
- `TrainerPayloadAdapter.js`

BT100 erfindet also keinen "idealen" Contract neu, sondern koppelt an das, was diese Artefakte heute tatsaechlich nachweisen.

### Vertragsrahmen

Der externe Python-Sidecar spricht denselben Transportrahmen wie die bestehende Bridge:

| Richtung | Message-Type | Zweck |
| --- | --- | --- |
| Python -> JS | `trainer-ready` | Ready-/Handshake-Signal nach Sidecar-Start |
| JS -> Python | `bot-action-request` | Action-Anfrage auf Basis einer Observation |
| JS -> Python | `training-reset` | Reset-Transition fuer Episode-/Env-Start |
| JS -> Python | `training-step` | Step-Transition mit Reward-/Done-/Info-Daten |
| JS -> Python | `trainer-stats-request` | optionale Diagnostik oder Stats-Abfrage |

Der Transportvertrag bleibt:

- `contractVersion = v1`
- Envelope via `createTrainerTransportEnvelope(...)`
- Transition-Payload via `buildTrainerTransitionPayload(...)`
- produktive Bridge-/Payload-Dateien bleiben read-only

### Primaerer Datenpfad

Der gewuenschte BT100-Pfad ist:

`headless runtime -> MatchKernelTrainingAdapter -> TrainingTransportFacade -> WebSocketTrainerBridge -> Python sidecar`

Leitplanken:

- `HeadlessMatchKernelRuntime` bleibt der Simulationspfad.
- `TrainingTransportFacade` bleibt der einzige BT100-Ausstiegspunkt fuer Reset-/Step-Transitions.
- Falls die bestehenden repo-Smokes fuer den externen Sidecar-Nachweis nicht reichen, darf BT100 genau einen dedizierten Boundary-Smoke unter `scripts/training-headless-bridge-smoke.mjs` anlegen.
- Dieser Boundary-Smoke darf nur Start, Reset, Step, Dispose und Artefakt-Logging orchestrieren.

### No-Touch-Regel

Wenn BT100 neue Felder, neue Message-Typen oder neue Runtime-Schalter braucht, ist der Block falsch zugeschnitten.
Der Bedarf wird dann als Risiko dokumentiert, nicht still im produktiven Code umgesetzt.

## Python-Stack

### Minimaler Bootstrap-Stack fuer BT100

BT100 schliesst nur mit dem kleinsten Stack, der fuer Contract- und Bridge-Smokes wirklich noetig ist.

Pflicht in BT100:

- `python >= 3.10`
- `pytest`
- `websockets`
- `numpy`, falls fuer Payload-/Observation-Helfer tatsaechlich gebraucht

Nur nachrangig und nicht Closure-kritisch in BT100:

- `gymnasium`
- `stable-baselines3`
- `torch`
- `tensorboard`
- `pydantic` oder `jsonschema`

Wenn Contract- und Bridge-Smokes ohne Teile des schweren PPO-Stacks beweisbar sind, werden diese Pakete nicht in BT100 zur Pflicht gemacht.

### Install-Strategie

- CPU-first
- venv-/Installpfad dokumentieren
- exakten Minimalstack pinnen
- CUDA nur als dokumentierter Folgepfad notieren, wenn fuer BT100 nicht zwingend noetig

## Headless-Contract-PoC

### Erfolgsdefinition

Der PoC ist erfolgreich, wenn:

- ein Python-Prozess `trainer-ready` sauber sendet
- ein Python-Sidecar `bot-action-request`, `training-reset`, `training-step` und `trainer-stats-request` lesen und gegen `TrainingContractV1` validieren kann
- eine deterministische 1-Worker-Lane mindestens 100 Schritte ueber den bestehenden Headless-Pfad liefert
- die zentralen Felder `observationSchemaVersion`, `observationLength`, `rewardBreakdown`, `terminalReason`, `truncatedReason` und soweit transportiert `hybridDecision` nicht still verlorengehen
- kein produktiver Runtime-/AI-Hub-Code fuer diesen PoC geaendert wurde

### 1-Worker-Regel

BT100 schliesst nur gegen genau einen stabilen Worker.

Pflicht:

- feste Seeds fuer den PoC
- 1-Worker-Grundpfad
- mindestens 100 deterministische Steps
- grobe Boot-/Reset-/Step-Latenzen fuer diese eine Lane

Nicht Pflicht in BT100:

- 2-Worker-Smokes
- 4-Worker-Smokes
- Throughput-Versprechen fuer BT102

Diese Folgefragen werden erst nach stabiler Single-Lane in BT101 weitergezogen.

## Artefaktbasierte Baseline in BT100

### Pflichtmetriken

- Prozess-Bootzeit bis `trainer-ready`
- erste Reset-Latenz
- grobe mittlere Step-Latenz ueber die 100-Step-Lane
- dokumentierte Seed-/Mode-/Contract-Version fuer den PoC

### Nicht aus BT100 ableiten

BT100 darf noch keine belastbare Aussage treffen ueber:

- spaeteres PPO-Trainingstempo
- VecEnv-Skalierung
- 2- oder 4-Worker-Produktivitaet

BT100 liefert nur die kleinstmoegliche Baseline fuer BT101.

## Definition of Done

- [ ] DoD.1 `python/requirements.txt`, venv-Pfad und Minimal-Install-Smoketest sind reproduzierbar dokumentiert.
- [ ] DoD.2 Der bestehende Contract `v1` ist gegen die vorhandenen JS-Artefakte und einen externen Python-Sidecar hart abgeglichen.
- [ ] DoD.3 Eine deterministische 1-Worker-Headless-Lane liefert mindestens 100 Steps ueber bestehende Adapter.
- [ ] DoD.4 Eine kleine Boot-/Reset-/Step-Baseline fuer genau diese eine Lane liegt als Artefakt vor; 2- und 4-Worker bleiben explizit ausserhalb von BT100.
- [ ] DoD.5 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Risiken

| ID | Risiko | Wahrscheinlichkeit | Impact | Mitigation | Trigger | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R100.1 | Der volle PPO-/Torch-Stack wird wieder zu frueh in BT100 gezogen | MED | HIGH | BT100 nur mit Minimal-Bootstrap schliessen; schwere RL-Dependencies erst spaeter erzwingen | Bootstrap-Diskussion dreht sich wieder um SB3/Torch statt Contract-Smoke | Governance |
| R100.2 | Der Python-Sidecar missversteht den bestehenden `v1`-Payload | MED | HIGH | Contract-Validatoren gegen echte Transportartefakte bauen | `missing-action`, `invalid-json`, Feldmismatch | Integration |
| R100.3 | Ein PoC braucht ungeplant Runtime-Aenderungen | MED | HIGH | No-touch-Regel hart halten; Bedarf als Risiko statt Patch dokumentieren | Wunsch nach neuen Feldern oder Message-Typen | Governance |
| R100.4 | Schon die 1-Worker-Lane kippt unter Handshake-, Reset- oder Step-Drift | MED | HIGH | erst JS-Wahrheitsartefakte, dann Sidecar, dann 100-Step-Lane | kein stabiler 100-Step-Lauf | Train-Ops |
| R100.5 | Der Block driftet in repo-weite Helper-/Tooling-Arbeit statt in den Contract-Nachweis | MED | MED | nur Boundary-Script zulaessig; keine stillen Root-Surface-Ausweitungen | `package.json`/Infra-Debatten wachsen schneller als der PoC | Governance |
| R100.6 | 2- und 4-Worker-Erwartungen kommen wieder in den Closure-Scope zurueck | MED | MED | BT100.99 explizit auf 1 Worker begrenzen; Mehr-Worker erst nach BT101 | neue Verify-/DoD-Forderungen ziehen Parallelisierung wieder vor | Governance |

## Phasen

### 100.1 Minimaler Python-Bootstrap
status: open
goal: kleinsten reproduzierbaren Python-Bootstrap fuer Contract-Smokes festziehen
output: dokumentierter Minimalstack mit klarer venv- und Install-Story

- [ ] 100.1.1 Python-Version, venv-Pfad und Install-Reihenfolge dokumentieren.
- [ ] 100.1.2 Minimal-Dependencies fuer Contract-/Bridge-Smokes pinnen; schwere PPO-Libs nur bei echter Notwendigkeit mitziehen.
- [ ] 100.1.3 CPU-first-Install-Smoketest dokumentieren; CUDA nur als Folgepfad notieren, wenn fuer BT100 nicht zwingend.

### 100.2 JS-seitige Contract-Wahrheit festziehen
status: open
goal: vorhandene JS-Artefakte als harte Wahrheitsbasis fuer BT100 absichern
output: dokumentierte Contract- und Feldliste fuer den Sidecar-PoC

- [ ] 100.2.1 `tests/training-environment.contract.test.mjs`, `scripts/training-smoke.mjs` und `scripts/headless-match-kernel-smoke.mjs` gegen BT100 auswerten.
- [ ] 100.2.2 Die Felder `observationSchemaVersion`, `observationLength`, `rewardBreakdown`, `terminalReason`, `truncatedReason` und `hybridDecision` als Pflichtbeobachtungen dokumentieren.
- [ ] 100.2.3 Feld- oder Contract-Drift als Blocker markieren statt sie still im Python-Stack zu normalisieren.

### 100.3 Python-Sidecar fuer Contract `v1`
status: open
goal: externen Python-Sidecar gegen den bestehenden Transportvertrag pruefen
output: stabiler Sidecar-Grundpfad fuer den eingefrorenen Contract `v1`

- [ ] 100.3.1 Python-Sidecar sendet `trainer-ready` sauber und reproduzierbar.
- [ ] 100.3.2 Python-Sidecar liest `bot-action-request`, `training-reset`, `training-step` und `trainer-stats-request` ohne neue Message-Typen.
- [ ] 100.3.3 Payload-Validierung erfolgt gegen `TrainingContractV1` und reale JS-Artefakte, nicht gegen eine frei erfundene Python-Spezifikation.

### 100.4 Deterministische 1-Worker-Headless-Lane
status: open
goal: kleinste end-to-end-faehige Bridge-Lane ueber den vorhandenen Headless-Pfad beweisen
output: 100-Step-Smoke mit Seed, Artefakten und kleinen Latenzmetriken

- [ ] 100.4.1 Boundary-Harness oder gleichwertiger PoC-Pfad startet genau einen Worker und bleibt ausserhalb des produktiven Runtime-Pfads.
- [ ] 100.4.2 Die 1-Worker-Lane liefert mindestens 100 deterministische Steps ueber `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` und `TrainingTransportFacade`.
- [ ] 100.4.3 Boot-, Reset- und mittlere Step-Latenz dieser einen Lane werden als BT100-Baseline dokumentiert.

### 100.5 Doku und Handover fuer BT101
status: open
goal: BT100 mit sauberem Handover statt mit fruehem Parallelisierungsballast schliessen
output: Abschlussreport mit Artefakten, Restblockern und BT101-Handover

- [ ] 100.5.1 `python/README.md`, Bootstrap-Manifest und Artefaktpfade sind nachvollziehbar dokumentiert.
- [ ] 100.5.2 Es ist explizit festgehalten, dass 2- und 4-Worker nicht zu BT100.99 gehoeren.
- [ ] 100.5.3 Der Handover fuer BT101 fokussiert Observation-/Action-Authority, Single-Env und JS-authoritative Semantik.

### 100.99 Abschluss-Gate
status: open
goal: BT100 nur mit nachgewiesenem Contract-PoC und stabiler 1-Worker-Lane schliessen
output: gruener, enger Wahrheitsblock fuer BT101

- [ ] 100.99.1 Alle Phasen 100.1 bis 100.5 sind mit Evidence dokumentiert.
- [ ] 100.99.2 Der externe Python-Sidecar spricht den bestehenden Contract `v1` stabil.
- [ ] 100.99.3 Eine deterministische 1-Worker-Lane liefert mindestens 100 Steps ueber bestehende Adapter.
- [ ] 100.99.4 Eine kleine Boot-/Reset-/Step-Baseline fuer diese Lane liegt vor; 2- und 4-Worker sind bewusst nicht Teil von BT100.99.
- [ ] 100.99.5 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Checkpoint-Log

| Datum | Typ | Evidence | Ergebnis |
| --- | --- | --- | --- |
| - | - | - | - |
