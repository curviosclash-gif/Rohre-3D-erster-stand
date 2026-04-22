---
id: BT102
title: PPO-Baseline-Training
status: planned
priority: P1
owner: frei
depends_on:
  - BT101.99
blocked_by: []
affected_area: bot-training-ppo-baseline
scope_files:
  - python/train.py
  - python/eval.py
  - python/configs/ppo_baseline.yaml
  - python/callbacks/**
  - python/tests/test_train_pipeline.py
  - data/training/ppo/**
verification:
  - python python/train.py --config python/configs/ppo_baseline.yaml --smoke-run
  - python python/train.py --config python/configs/ppo_baseline.yaml --resume-smoke
  - python python/eval.py --manifest data/training/ppo/run_manifest.json
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
  - npm run build
updated_at: 2026-04-22
---

# BT102 PPO-Baseline-Training

## Ziel

BT102 liefert die erste belastbare PPO-Baseline auf dem headless Gym-Env.
Der Block ist bewusst konservativ: Ziel ist nicht maximale Forschungstiefe, sondern ein sauber reproduzierbarer Referenzlauf mit Checkpoint-, Eval- und Resume-Pfad.

BT102 soll beweisen, dass PPO auf dem externen headless Pfad:

- fuer mindestens `300000` Env-Steps stabil trainiert
- sauber checkpointen und resumieren kann
- ein reproduzierbares Artefaktpaket schreibt
- gegen eine eingefrorene DQN-Referenz sinnvoll eingeordnet werden kann

## Rolling-Draft-Status

BT102 ist bewusst **nicht** der direkte naechste Implementierungsblock.
Vor einer aktiven Umsetzung oder Uebernahme muessen BT100 und BT101 zuerst liefern:

- gemessenen Headless-Throughput
- stabilen Single-Env-Pfad
- verifizierte Telemetrie- und Transportfelder

Bis diese Grundlage vorliegt, bleiben Step-Budgets, Eval-Takte und Env-Anzahl in BT102 ein rolling draft und muessen mit echter BT100/BT101-Evidence neu kalibriert werden.

Stand 2026-04-22:

- `python/` und `data/training/ppo/` sind im Repo noch nicht als reale Arbeitsbasis vorhanden.
- BT102 bleibt deshalb ein Folge-Draft hinter `BT90` bis `BT92`; feste Timesteps, Env-Anzahl oder Eval-Takte sind bis zum echten BT92-Handover keine claimbare Zusage.

## Evidence-Vorbedingungen fuer BT102

Vor einer aktiven Umsetzung oder Uebernahme muessen mindestens vorliegen:

- ein gruener `BT92`-Single-Env-Pfad mit Reset-/Step-Smoke und sichtbaren Pflichtfeldern
- gemessene Boot-, Reset- und Step-Latenzen fuer den realen Headless-Pfad
- dokumentierte Info-/Semantikfelder (`rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion`, `observationLength`) oder explizite Restluecken
- ein realer Bauort unter `python/**` und `data/training/ppo/**`

Fehlt einer dieser Punkte, bleibt BT102 rolling draft und wird nicht ueber Wunschannahmen geschlossen.

## Nicht-Ziel

- aggressive Hyperparameter-Suche
- neue Runtime-Integrationen
- ONNX- oder Inference-Arbeit
- Produktivumschaltung
- stillschweigender Champion-Wechsel

## Referenzen

- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
- `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`
- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/referenz/ai_architecture_context.md`
- `src/entities/ai/training/TrainerPayloadAdapter.js`
- `src/entities/ai/training/TrainingContractV1.js`
- `src/state/training/RewardCalculator.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`

## Baseline-Konfiguration

### Konservative Grundregel

Die BT102-Baseline muss konservativ sein:

- feste Seeds
- dokumentierte Run-Konfiguration
- eindeutiger `run_manifest`
- klarer Referenz-Checkpoint

Ein guter BT102-Lauf ist eine Baseline, keine Promotion.

### Minimaler Ergebnisvertrag

Jeder BT102-Referenzlauf schreibt unter `data/training/ppo/` mindestens:

- Checkpoint
- Normalize-Stats, falls genutzt
- Eval-Report
- Run-Manifest mit Seeds, Env-Anzahl, Timesteps, Versionen, Zielmatrix und dem verwendeten BT92-Evidence-Anker

## Trainings-Pipeline

### `python/train.py`

`python/train.py` ist der Orchestrator fuer:

- Laden der Baseline-Config
- Erzeugen des Env-/VecEnv-Pfads
- Checkpoint-Callback
- Eval-Callback
- Resume
- Logging und Artefaktstruktur

### Resume- und Persistenz-Regel

Ein BT102-Lauf gilt nur als belastbar, wenn:

- Resume mit identischer Config funktioniert
- Normalize-/Env-Stats mitgespeichert werden, falls verwendet
- der Report zwischen frischem und resumiertem Lauf sauber unterscheidet

## Evaluierungs-Methodik

### BT102-Vergleichsrahmen

Der DQN-Vergleich in BT102 ist bewusst nur ein eingefrorener Vorvergleich.
Er braucht:

- eine feste DQN-Referenz
- dieselbe Seed-/Mode-Matrix, soweit auf dem externen Pfad moeglich
- ein explizites Label `Vorvergleich, keine Promotion`

### Pflichtmetriken

- `averageBotSurvival`
- `avgStepsPerEpisode`
- `invalidActionRate`
- `rewardBreakdown`-nahe Diagnostik, soweit verfuegbar
- Stabilitaetsmetriken: Crashs, Reset-Fehler, Resume-Fehler

## Zeit- und Throughput-Regel

BT102 plant nicht gegen Wunschwerte, sondern gegen gemessene BT100/BT101-Daten.

Wenn Throughput oder Parallelitaet geringer sind als gehofft:

- Timesteps anpassen
- Env-Anzahl reduzieren
- Eval-Frequenzen nachkalibrieren
- Downgrade offen dokumentieren

Ein kleinerer, ehrlicher Referenzlauf ist besser als eine fiktive 4-Env-Annahme.

Eine feste `300000`-/`500000`- oder `4-Env`-Zusage ohne gemessene BT92/BT93-Daten ist fuer BT102 unzulaessig.

## Definition of Done

- [ ] DoD.1 `python/train.py` trainiert die BT102-Baseline fuer ein dokumentiertes, aus BT92/BT93-Evidence abgeleitetes Env-Step-Budget ohne Crash; `300000` bleibt nur Referenzziel fuer tragende Throughput-Lagen.
- [ ] DoD.2 Checkpoints, Eval- und Manifest-Artefakte liegen reproduzierbar unter `data/training/ppo/`.
- [ ] DoD.3 Resume-Pfad und `vecnormalize`-Persistenz sind nachgewiesen.
- [ ] DoD.4 PPO-KPIs sind gegen eine eingefrorene DQN-Referenz explizit als Vorvergleich gegenuebergestellt.
- [ ] DoD.5 Ein Reproduzierbarkeits-Smoketest ist dokumentiert.
- [ ] DoD.6 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Risiken

| ID | Risiko | Wahrscheinlichkeit | Impact | Mitigation | Trigger | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R102.1 | Headless-Throughput bleibt unter den Planannahmen | HIGH | HIGH | BT100/BT101-Messwerte als harte Basis nutzen, Konfiguration nachkalibrieren | Steps/s bleibt deutlich unter Zielkorridor | Train-Ops |
| R102.2 | Resume-/Checkpoint-Pfad wirkt stabil, ist aber nicht reproduzierbar | MED | HIGH | Repro-Smoketest verpflichtend machen | Resume laeuft, aber KPIs/Stats driften unklar | Integration |
| R102.3 | DQN-vs-PPO-Vergleich wird als Promotion missverstanden | MED | HIGH | Reports explizit als Vorvergleich labeln | Baseline-Delta wird als Rollout-Freigabe gelesen | Governance |
| R102.4 | Safety-/Intent-Semantik ueberdeckt PPO-Lernfortschritt | MED | MED | Telemetrie mitloggen, aber produktive Semantik nicht aendern | Reward steigt nicht oder Verhalten bleibt flach | RL |
| R102.5 | Der Block driftet in Forschung statt Baseline-Haertung | MED | MED | keine breite Hyperparameter-Suche in BT102 zulassen | immer neue Tuning-Ideen vor erstem Referenzlauf | Governance |

## Phasen

### 102.1 Baseline-Config und Run-Manifest
status: open
goal: Eine konservative, nachvollziehbare Referenzkonfiguration festziehen
output: Baseline-Config mit Seeds, Matrix und Manifest-Struktur

- konservative PPO-Config definieren
- Artefakt- und Manifest-Struktur festlegen
- feste Seeds und Vergleichsmatrix dokumentieren

### 102.2 Kalibrierter Smoke-Run
status: open
goal: Ersten stabilen End-to-End-Trainingslauf ueber den headless Pfad mit realem Budget nachweisen
output: lauffaehiger Smoke-Run mit Crash-/Logging-Nachweis und dokumentiertem Startbudget

- `python/train.py` lauffaehig machen
- erster stabiler Lauf ueber den headless Env-Pfad
- Startbudget aus gemessener BT92-Evidence kalibrieren
- Crash-, Reset- und Loggingpfad pruefen

### 102.3 Checkpoint-, Resume- und Normalize-Persistenz
status: open
goal: Persistenz- und Resume-Kette absichern
output: dokumentierter Resume-Pfad mit konsistenten Artefakten

- Resume-Pfad absichern
- Stats-/Checkpoint-Dateien pruefen
- Reproduzierbarkeit zwischen frischem und fortgesetztem Lauf dokumentieren

### 102.4 Eval-Pipeline und DQN-Referenz-Freeze
status: open
goal: BT102-Vorvergleich methodisch sauber aufziehen
output: `eval.py`, eingefrorene DQN-Referenz und sauber gelabelter Vorvergleich

- `python/eval.py` aufsetzen
- DQN-Referenz klar einfrieren
- Vorvergleich sauber labeln und reporten

### 102.5 Evidenzbasierter Referenzlauf
status: open
goal: Belastbare Baseline ueber eine realistische, gemessene Laufzeit liefern
output: konservativer Referenzlauf mit KPI- und Throughput-Lage

- konservativen Referenzlauf mit aus BT92/BT93-Daten abgeleitetem Budget fahren
- KPI- und Artefaktlage dokumentieren
- Throughput, Env-Anzahl und Laufzeit realistisch festhalten

### 102.6 Reproduzierbarkeits-Smoketest und BT103-Handover
status: open
goal: BT102 fuer kleine Ablationsarbeit uebergabefaehig machen
output: dokumentierter Repro-Smoketest und BT103-Handover

- mindestens ein Repro-Smoketest mit gleichem Setup
- Abschlussreport und Handover fuer Ablationen vorbereiten

### 102.99 Abschluss-Gate
status: open
goal: BT102 nur mit reproduzierbarer Baseline und sauberem Vorvergleich schliessen
output: gruenes Baseline-Fundament fuer BT103

- [ ] 102.99.1 Alle Phasen 102.1 bis 102.6 sind mit Evidence dokumentiert.
- [ ] 102.99.2 PPO trainiert stabil auf dem headless Env-Pfad.
- [ ] 102.99.3 Checkpoint-, Eval- und Resume-Pfad sind reproduzierbar.
- [ ] 102.99.4 Der DQN-Vergleich ist explizit als externe Referenz und nicht als Promotion dokumentiert.
- [ ] 102.99.5 Keine produktive Runtime-/AI-Hub-Datei wurde angepasst.

## Checkpoint-Log

| Datum | Typ | Evidence | Ergebnis |
| --- | --- | --- | --- |
| - | - | - | - |
