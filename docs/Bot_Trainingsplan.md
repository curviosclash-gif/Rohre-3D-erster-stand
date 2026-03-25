# Bot Trainingsplan (Aktiver Master)

Stand: 2026-03-25

Dieser Plan ist die einzige aktive Quelle fuer Bot-Training.
Allgemeine Architektur-/Gameplay-Arbeit bleibt in `docs/Umsetzungsplan.md`.
Roadmap-Horizont fuer kommende Trainingsfenster: `docs/Bot_Trainings_Roadmap.md`.

## Status-Legende

- [ ] Offen
- [/] In Bearbeitung
- [x] Abgeschlossen

## Governance-Regeln (verbindlich)

1. `*.99`-Gates duerfen nur `[x]` sein, wenn alle vorherigen Phasen desselben Blocks `[x]` sind.
2. Jeder abgeschlossene Phasenpunkt (`[x]` mit ID) braucht Evidence:
   - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
3. Jeder aktive Block hat genau einen `LOCK`-Header, eine `Definition of Done (DoD)` und ein Risiko-Register.
4. Bot-Training-Phasen werden nur hier gepflegt, nicht in `docs/Umsetzungsplan.md`.

## Zielbild (Survival First)

- Primaeres Ziel: Bot-Ueberlebenszeit deutlich steigern.
- Leit-KPI 1: `avgStepsPerEpisode` mindestens +30% gegen Baseline.
- Leit-KPI 2: `averageBotSurvival` aus `bot:validate` mindestens +30% gegen Baseline.
- Stabilitaets-KPI: `runtimeErrorCount = 0`, Gate bleibt gruen.

## Report-Modi (bot:validate)

- `npm run bot:validate` schreibt Standard-Reports lokal nach `tmp/` (nicht versioniert).
- `npm run bot:validate:publish` schreibt zusaetzlich Evidence nach `data/bot_validation_report.json` sowie einen Tagesreport unter `docs/` (Dateiname `Testergebnisse_Phase4b_<Datum>.md`).

## Abhaengigkeiten (Hard/Soft)

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| BT10 | - | soft | ja | Operatorlauf kann isoliert laufen |
| BT11 | BT10 Baseline-Laufdaten | soft | ja | Folgefenster fuer 10h-Operatorlauf |
| BT12 | BT11 Abschlussartefakte | soft | ja | weiteres 10h-Folgefenster fuer Bot-Stabilisierung |
| BT15 | BT10 Baseline-Laufdaten | soft | ja | Zukunftsplanung nutzt aktuelle Lauf-KPIs |
| BT20 | BT10 Baseline-Laufdaten + BT15 Zyklenplan | hard | teilweise | BT10 in Arbeit, BT15 aktiv |
| BT30 | 20.9 | hard | nein | startet erst nach Survival-Policy-Phase |
| BT40 | 30.9 | hard | nein | Eval/Gate-Haertung nach Curriculum/Hyperparameter |

## Datei-Ownership (Bot-Training)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `scripts/training-*.mjs`, `scripts/bot-validation-*.mjs` | BT10-BT40 | offen | Orchestrierung, Eval, Gate, Validation |
| `src/entities/ai/training/**`, `trainer/**` | BT20-BT30 | offen | Runner/Bridge/Trainer-Verhalten |
| `src/state/training/**` | BT20-BT40 | offen | Gate-, KPI- und Reward-Logik |
| `tests/trainer-*.mjs`, `tests/training-*.mjs` | BT10-BT40 | shared | Nur trainingsnahe Tests |
| `docs/Bot_Trainingsplan.md`, `docs/Bot_Survival_Training_Plan_12h.md`, `docs/Bot_Survival_Training_Plan_10h.md`, `docs/Bot_Survival_Training_Plan_10h_BT12.md` | BT10-BT40 | shared | Masterplan + Detailplan |
| `data/training/**`, `output/training/**` | BT10 | shared | Laufartefakte, Logs, Serien |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| Train-Ops | BT10 | 2026-03-22 | active | 2026-03-22 |
| Bot-Codex | BT11 | 2026-03-23 | frei | 2026-03-24 (abgeschlossen) |
| Bot-Codex | BT12 | 2026-03-25 | active | 2026-03-25 |
| Train-Ops | BT15 | 2026-03-22 | active | 2026-03-24 |
| Bot-A | BT20 | 2026-03-22 | frei | - |
| Bot-B | BT30 | 2026-03-22 | frei | - |
| Bot-C | BT40 | 2026-03-22 | frei | - |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | Noch leer | - | - |

---

## Aktive Bloecke

## Block BT10: 12h Survival Operatorlauf

Plan-Datei: `docs/Bot_Survival_Training_Plan_12h.md`

<!-- LOCK: Bot-TrainOps seit 2026-03-22 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT10-Phasen inkl. 10.9.* sind abgeschlossen.
- [ ] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit finalen Artefakten dokumentiert.
- [ ] DoD.3 KPI-Vergleich gegen Baseline ist im Plan eingetragen.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 10.1 Laufstabilitaet und Betrieb

- [x] 10.1.1 12h-Laufparameter fuer Stabilitaet haerten (Stage-Timeout, Backpressure, Retry, Learn-Profile) (abgeschlossen: 2026-03-22; evidence: npm run training:12h:survival -> commit 045de8b)
- [/] 10.1.2 Aktiven Lauf ueberwachen und Zwischenstatus in Artefakten pruefen

### 10.2 Zwischenvalidierung waehrend Lauf

- [ ] 10.2.1 Alle 2h `bot:validate` refreshen und Report in Run-Ordner pinnen
- [ ] 10.2.2 Survival-KPI-Delta (`avgStepsPerEpisode`, `averageBotSurvival`) pro Checkpoint protokollieren

### Checkpoint-Log BT10 (laufend)

| Datum | Typ | RunStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs Baseline | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-22 | Baseline | `20260321T180755Z-r01` | `123.799` | `31.908458` | `0.247460` | Referenz | `data/training/runs/20260321T180755Z-r01/run.json` |
| 2026-03-22 | Zwischenstand | `20260322T023812Z-r4344` | `124.138` | `null` | `0.000000` | `+0.274%` (`+0.339`) | `data/training/runs/20260322T023812Z-r4344/run.json` |

### 10.9 Abschluss-Gate

- [ ] 10.9.1 Finales `run -> eval -> gate` plus `bot:validate` mit passendem Report abschliessen
- [ ] 10.9.2 Finale Artefaktpfade + KPI-Vergleich dokumentieren und Lock freigeben

### Risiko-Register BT10

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Langlauf stoppt durch Timeout/Backpressure | hoch | Train-Ops | Guarded retries + Zwischencheck alle 2h | Unvollstaendige Laufserie |
| KPI-Drift trotz gruenem Gate | mittel | Train-Ops | KPI-Deltas je Checkpoint protokollieren | Survival sinkt trotz Pass |
| Artefakt-Luecken bei Resume | mittel | Trainer | latest/series pointers nach jedem Schritt pruefen | fehlende eval/gate Dateien |

---

## Block BT11: 10h Survival Folgefenster

Plan-Datei: `docs/Bot_Survival_Training_Plan_10h.md`

<!-- LOCK: frei -->

### Definition of Done (DoD)

- [x] DoD.1 Alle BT11-Phasen inkl. 11.99.* sind abgeschlossen.
- [x] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit Artefaktpfaden dokumentiert.
- [x] DoD.3 KPI-Deltas gegen BT10-Baseline sind im Checkpoint-Log eingetragen.
- [x] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 11.1 Plan und Laufstart

- [x] 11.1.1 10h-Trainingsplan mit KPI-/Checkpoint-Vorgaben anlegen (abgeschlossen: 2026-03-23; evidence: create 10h plan -> docs/Bot_Survival_Training_Plan_10h.md)
- [x] 11.1.2 10h-Lauf starten und Operator-Artefakte (Series, Log, PID) dokumentieren (abgeschlossen: 2026-03-23; evidence: npm run training:10h -- --series-stamp BT11_20260323T013933 --stop-on-fail false -> output/training/BT11_20260323T013933-10h.log, PID 9332)
- [x] 11.1.3 Fight-Profil fuer 10h-Lauf festlegen (`hunt-3d`,`hunt-2d`, stabile Seeds/Timeouts) (abgeschlossen: 2026-03-24; evidence: update fight profile commands -> docs/Bot_Survival_Training_Plan_10h.md)
- [x] 11.1.4 Fight-10h-Lauf starten und Operator-Artefakte dokumentieren (abgeschlossen: 2026-03-24; evidence: npm run training:10h -- --series-stamp BT11_FIGHT_20260324T014853 --modes hunt-3d,hunt-2d --stop-on-fail false -> output/training/BT11_FIGHT_20260324T014853-10h.log, PID 2772)

### 11.2 Laufmonitoring im 2h-Takt

- [x] 11.2.1 Alle 2h `bot:validate` ausfuehren und Report im aktiven Run-Ordner pinnen (abgeschlossen: 2026-03-23; evidence: BOT_RUNNER_FORCE_KILL_PORT=false BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3 npm run bot:validate -> data/bot_validation_report.json, docs/Testergebnisse_Phase4b_2026-03-23.md)
- [x] 11.2.2 `avgStepsPerEpisode` und `averageBotSurvival` je Checkpoint gegen BT10-Baseline protokollieren (abgeschlossen: 2026-03-24; evidence: final checkpoint update -> `data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json`, `data/bot_validation_report.json`)

### Checkpoint-Log BT11 (laufend)

| Datum | Typ | SeriesStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs Baseline | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-23 | Plan erstellt | `pending` | `-` | `-` | `-` | Referenz BT10 | `docs/Bot_Survival_Training_Plan_10h.md` |
| 2026-03-23 | Laufstart | `BT11_20260323T013933` | `pending` | `pending` | `pending` | wird in 2h-Checkpoints gefuellt | `output/training/BT11_20260323T013933-10h.log` |
| 2026-03-23 | Checkpoint C1 | `BT11_20260323T013933` | `126.444444` | `40.690933` | `0.248243` | Steps `+2.137%`, Survival `+27.524%` (vs BT10 Baseline) | `data/training/runs/BT11_20260323T013933-r2137/run.json`, `data/bot_validation_report.json`, `docs/Testergebnisse_Phase4b_2026-03-23.md`; Hinweis: forced-round-rate `100%` |
| 2026-03-24 | Fight-Plan aktualisiert | `BT11_FIGHT_pending` | `pending` | `pending` | `pending` | hunt-only Fenster vorbereitet | `docs/Bot_Survival_Training_Plan_10h.md` |
| 2026-03-24 | Fight-Laufstart | `BT11_FIGHT_20260324T014853` | `pending` | `pending` | `pending` | 10h-Operatorlauf aktiv; 2h-Checkpoints offen | `output/training/BT11_FIGHT_20260324T014853-10h.log`, PID `2772` |
| 2026-03-24 | 10h-Loop abgeschlossen | `BT11_FIGHT_20260324T014853` | `117.525000` | `pending` | `1.000000` | Steps `-5.068%`, Survival offen (vs BT10 Baseline) | `data/training/series/BT11_FIGHT_20260324T014853/loop.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/eval.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/gate.json` |
| 2026-03-24 | Abschlussvalidate blockiert | `BT11_FIGHT_20260324T014853` | `117.525000` | `null` | `1.000000` | `bot:validate` bricht in `app:game-instance` ab | `output/training/BT11_FIGHT_20260324T014853-botvalidate-final.log`; Hinweis: frueherer HUD-NPE gefixt via commit `40dc4ab` |
| 2026-03-24 | Abschlussvalidate erfolgreich | `BT11_FIGHT_20260324T014853` | `117.525000` | `37.376986` | `1.000000` | Steps `-5.068%`, Survival `+17.138%` (vs BT10 Baseline) | `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`, `docs/Testergebnisse_Phase4b_2026-03-24.md`; Hinweis: scenarioLimit `2`, forced-round-rate `85.714%` |

### 11.99 Abschluss-Gate

- [x] 11.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit gueltigem Report abschliessen (abgeschlossen: 2026-03-24; evidence: `npm run bot:validate` mit `BOT_RUNNER_FORCE_KILL_PORT=false BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3` -> `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`)
- [x] 11.99.2 Finale KPI-Deltas, Artefaktpfade und Lock-Release dokumentieren (abgeschlossen: 2026-03-24; evidence: final KPI row + lock release -> `docs/Bot_Trainingsplan.md`, `docs/Bot_Survival_Training_Plan_10h.md`)

### Risiko-Register BT11

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Lauf stoppt vor 10h durch Stage-Failure | hoch | Bot-Codex | `stop-on-fail` aus + Logmonitoring + Resume ueber latest checkpoint | `loop.json` zeigt fruehen stopReason |
| KPI-Delta unklar ohne valide Zwischenreports | mittel | Bot-Codex | fester 2h Checkpoint-Rhythmus mit `bot:validate` | fehlendes `averageBotSurvival` im Abschluss |
| Artefaktdrift zwischen runs/series/logs | mittel | Bot-Codex | SeriesStamp fixieren und Logpfad im Plan pinnen | mismatch zwischen `loop.json` und run stamps |
| `bot:validate`-Boot timeout (`GAME_INSTANCE` bleibt `null`) | mittel | Bot-Codex | Runtime fallback ueber statischen Localhost-Server + Szenario-Limit-Fix (`8ef8b75`) fuer stabilen Abschlusslauf | erneuter Timeout bei Final-Validate trotz Fallback |

---

## Block BT12: 10h Bot Folgefenster (Classic + Fight Matrix)

Plan-Datei: `docs/Bot_Survival_Training_Plan_10h_BT12.md`

<!-- LOCK: Bot-Codex seit 2026-03-25 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT12-Phasen inkl. 12.99.* sind abgeschlossen.
- [ ] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit Artefaktpfaden dokumentiert.
- [ ] DoD.3 KPI-Deltas gegen BT11-Abschlusswerte sind im Checkpoint-Log eingetragen.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 12.1 Plan und Laufstart

- [x] 12.1.1 10h-Folgeplan fuer Classic/Fight Matrix anlegen (abgeschlossen: 2026-03-24; evidence: create BT12 plan -> docs/Bot_Survival_Training_Plan_10h_BT12.md)
- [x] 12.1.2 10h-Lauf starten und Operator-Artefakte (Series, Log, PID) dokumentieren (abgeschlossen: 2026-03-24; evidence: Start-Process `npm run training:10h -- --series-stamp BT12_20260324T152103 ...` -> `output/training/BT12_20260324T152103-10h.log`, PID `3476`)
- [x] 12.1.3 Survival-First-Restart (Classic + Fight) mit 10h-Matrixlauf starten und dokumentieren (abgeschlossen: 2026-03-25; evidence: `npm run training:10h -- --series-stamp BT12_SURV_20260325T030951 --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true` -> `output/training/BT12_SURV_20260325T030951-10h.log`, PID `5856`)

### 12.2 Laufmonitoring im 2h-Takt

- [ ] 12.2.1 `bot:validate`-Checkpoint im 2h-Rhythmus mit stabilen Runtime-Parametern ausfuehren
- [ ] 12.2.2 `avgStepsPerEpisode` und `averageBotSurvival` je Checkpoint gegen BT11-Finalwerte protokollieren

### Checkpoint-Log BT12 (laufend)

| Datum | Typ | SeriesStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs BT11-Final | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-24 | Plan erstellt | `pending` | `-` | `-` | `-` | Referenz BT11-Final (`117.525` / `37.376986`) | `docs/Bot_Survival_Training_Plan_10h_BT12.md` |
| 2026-03-24 | Laufstart + Warm-up | `BT12_20260324T152103` | `124.137500` | `-` | `0.000000` | Steps `+5.626%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_20260324T152103-10h.log`, `data/training/runs/BT12_20260324T152103-r01/run.json`, `data/training/runs/BT12_20260324T152103-r01/gate.json` |
| 2026-03-24 | Checkpoint Validate fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp01.log` (`phase=app:game-instance`) |
| 2026-03-24 | Checkpoint Validate Retry fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp01-retry.log` (`BOT_RUNNER_FORCE_KILL_PORT=false`, `phase=app:game-instance`) |
| 2026-03-25 | Checkpoint Validate Port-Shift fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp02-port4275.log` (`BOT_RUNNER_PORT=4275`, `phase=app:game-instance`) |
| 2026-03-25 | Survival-First-Restart Laufstart | `BT12_SURV_20260325T030951` | `pending` | `pending` | `pending` | neues 10h-Fenster gestartet | `output/training/BT12_SURV_20260325T030951-10h.log`, PID `5856` |
| 2026-03-25 | Survival-First-Restart Warm-up | `BT12_SURV_20260325T030951` | `135.368750` | `pending` | `0.000000` | Steps `+15.183%`, Survival `pending` (vs BT11-Final) | `data/training/runs/BT12_SURV_20260325T030951-r08/run.json`, `data/training/runs/latest.json` |

### 12.99 Abschluss-Gate

- [ ] 12.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit gueltigem Report abschliessen
- [ ] 12.99.2 Finale KPI-Deltas, Artefaktpfade und Lock-Release dokumentieren

### Risiko-Register BT12

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Lauf stoppt vor 10h durch Stage-Failure | hoch | Bot-Codex | `stop-on-fail=false`, Logmonitoring und Resume ueber latest checkpoint | `loop.json` mit vorzeitigem stopReason |
| KPI-Regression in Fight oder Classic unentdeckt | hoch | Bot-Codex | Matrix-Run (`classic-*`,`hunt-*`) + 2h Checkpoints | Delta kippt in Teilmodus trotz gruenem Gate |
| `bot:validate` Laufzeit > global timeout | mittel | Bot-Codex | scenarioLimit `2`, `BOT_RUNNER_TOTAL_TIMEOUT=600000` fuer Abschlusslauf | Abbruch bei `total-run timeout` |
| `bot:validate` kann `GAME_INSTANCE` waehrend aktivem Loop nicht initialisieren | hoch | Bot-Codex | Checkpoint-Validate nach Loop-Ende oder auf separatem Port (`BOT_RUNNER_PORT`) ausfuehren | Timeout in `phase=app:game-instance` trotz laufendem Dev-Server |

---

## Block BT15: Zukunfts-Roadmap Survival (Q2)

Plan-Datei: `docs/Bot_Trainings_Roadmap.md`

<!-- LOCK: Bot-TrainOps seit 2026-03-22 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT15-Phasen inkl. 15.9.* sind abgeschlossen.
- [ ] DoD.2 C1-C6 Zeitfenster, KPI-Zielkorridor und Entscheidungsregeln sind final dokumentiert.
- [ ] DoD.3 Woechentliche Re-Planung ist an BT10-Checkpoint-Log und Weekly Review gekoppelt.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 15.1 Baseline und Zielkorridor

- [x] 15.1.1 Baseline-Snapshot aus Trainingsartefakten in Roadmap dokumentieren (abgeschlossen: 2026-03-22; evidence: update roadmap baseline -> docs/Bot_Trainings_Roadmap.md)
- [x] 15.1.2 KPI-Zielkorridor und Trainingszyklen C1-C6 festlegen (abgeschlossen: 2026-03-22; evidence: define cycles/targets -> docs/Bot_Trainings_Roadmap.md)

### 15.2 Operative Verzahnung BT10-BT40

- [x] 15.2.1 Promotion-/Rollback-Regeln fuer zyklische Trainingsfenster definieren (abgeschlossen: 2026-03-22; evidence: add promotion rollback rules -> docs/Bot_Trainings_Roadmap.md)
- [/] 15.2.2 Woechentliche Re-Planung in BT10-Checkpoint-Log und Weekly Review verankern

### 15.9 Abschluss-Gate

- [ ] 15.9.1 Ersten kompletten Zyklus (C1) mit KPI-Delta dokumentieren
- [ ] 15.9.2 KW13-Roadmap-Review abschliessen und Lock auf `frei` setzen

### Risiko-Register BT15

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Roadmap driftet von realen KPI-Trends weg | mittel | Train-Ops | weekly KPI checkpoint + zyklusweise Re-Baselining | Zielkorridor wird 2 Zyklen in Folge verfehlt |
| Ueberoptimistische Zielwerte ohne Gate-Stabilitaet | hoch | Train-Ops/RL | harte Promotion-Regeln + rollback Pflicht | kurzfristige KPI-Spitze ohne Reproduzierbarkeit |
| Plan bleibt statisch trotz neuer Artefakte | mittel | Train-Ops | BT10 Checkpoint-Log als Pflichtinput fuer BT15 updates | keine Roadmap-Aktualisierung nach Langlauf |

---

## Block BT20: Survival-Policy und Reward-Shaping

Plan-Datei: `docs/Bot_Trainingsplan.md`

<!-- LOCK: frei -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT20-Phasen inkl. 20.9.* sind abgeschlossen.
- [ ] DoD.2 A/B-Lauf gegen BT10-Baseline zeigt positives Survival-Delta.
- [ ] DoD.3 Training-Gates und betroffene Tests sind PASS.
- [ ] DoD.4 Evidence, Risikoabgleich und Doku-Gates sind abgeschlossen.

### 20.1 Safety-Layer vor Action-Ausgabe

- [ ] 20.1.1 Collision-Risk-Guards in Action-Entscheidung einbauen (Evasion hat Vorrang)
- [ ] 20.1.2 Risky-Action-Sperren bei hoher Bedrohung und niedriger Health einfuehren

### 20.2 Reward-Shaping auf Ueberleben fokussieren

- [ ] 20.2.1 Schrittweises Survival-Reward und klare Death-Penalty kalibrieren
- [ ] 20.2.2 Risk-Proximity-Penalties (Wall/Trail/Opponent) einfuehren und testen

### 20.9 Abschluss-Gate

- [ ] 20.9.1 A/B-Lauf gegen BT10-Baseline mit identischen Seeds/Modes durchfuehren
- [ ] 20.9.2 Verbesserung nur bei positivem Survival-Delta und stabilen Gates uebernehmen

### Risiko-Register BT20

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reward-Hacking statt Survival | hoch | RL | harte Survival-KPIs + adversarial seeds | hohe Reward-Werte bei kurzer Lebenszeit |
| Overfitting auf einzelne Seeds | mittel | RL | seed/mode matrix im Gate fixieren | starke KPI-Schwankung |
| Safety-Layer blockiert lernbare Aktionen | mittel | RL | thresholds iterativ + A/B checks | Policy wird zu konservativ |

---

## Block BT30: Curriculum, Replay-Priorisierung und Hyperparameter

Plan-Datei: `docs/Bot_Trainingsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 20.9 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT30-Phasen inkl. 30.9.* sind abgeschlossen.
- [ ] DoD.2 Gewinner-Setting ist reproduzierbar ueber Vergleichslaeufe.
- [ ] DoD.3 Standard-Training-Skripte nutzen Gewinner-Setting.
- [ ] DoD.4 Evidence + Doku-Gates sind abgeschlossen.

### 30.1 Curriculum-Stufen

- [ ] 30.1.1 Trainingsstufen (einfach -> mittel -> voll) als konfigurierte Sequenz definieren
- [ ] 30.1.2 Stage-spezifische Promotion-Regeln anhand Survival-KPIs implementieren

### 30.2 Replay und Hyperparameter

- [ ] 30.2.1 Priorisierte Samples fuer near-death/death-leading Situationen einfuehren
- [ ] 30.2.2 Survival-orientierte Hyperparameter-Tuning-Laeufe (gamma/epsilon/step-limits) automatisieren

### 30.9 Abschluss-Gate

- [ ] 30.9.1 Gewinner-Setting per reproduzierbarem Vergleichslauf bestimmen
- [ ] 30.9.2 Gewinner-Setting in Standard-Training-Skripten verankern und dokumentieren

### Risiko-Register BT30

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Curriculum-Promotion zu aggressiv | mittel | RL | Mindestdauer je Stage + rollback criteria | unstabile KPI-Verlaeufe |
| Replay-Priorisierung erzeugt Bias | mittel | RL | gemischte sampling quotas | Performance in einfachen Szenen bricht ein |
| Hyperparameter nicht reproduzierbar | hoch | Train-Ops | fixed seeds + run manifests + lockstep eval | Gewinnerlauf nicht reproduzierbar |

---

## Block BT40: Eval-/Gate-Haertung und Regression-Schutz

Plan-Datei: `docs/Bot_Trainingsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 30.9 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT40-Phasen inkl. 40.9.* sind abgeschlossen.
- [ ] DoD.2 Survival-Metriken sind als harte Gates verankert.
- [ ] DoD.3 Trainingsnahe Regressionstests und Operator-Runbook sind aktualisiert.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 40.1 Survival-Metriken als First-Class-Gates

- [ ] 40.1.1 `averageBotSurvival` in Eval/Gate standardmaessig erzwingen (kein `null` fuer Abschlusslaeufe)
- [ ] 40.1.2 Gate-Fehlerbilder und Restore-Pfade fuer Latest/Checkpoint robustifizieren

### 40.2 Test- und Operator-Haertung

- [ ] 40.2.1 Trainingsnahe Regressionstests fuer Survival-Deltas und Guardrails erweitern
- [ ] 40.2.2 Operator-Runbook fuer Start/Resume/Stop/Recovery standardisieren

### 40.9 Abschluss-Gate

- [ ] 40.9.1 `training-run/eval/gate`, `bot:validate`, trainingsnahe Tests und Build sind gruen
- [ ] 40.9.2 Plan-Doku, Lock-Bereinigung und Handoff an `docs/Umsetzungsplan.md` (nur Referenz) abgeschlossen

### Risiko-Register BT40

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| False-positive gates bei sporadischen KPI-Ausreissern | mittel | QA/RL | rolling window + min-run-count | gate flip-flops |
| Restore-Pfad bricht bei latest pointer | hoch | Trainer | checkpoint fallback + smoke resume tests | training cannot resume |
| Regressionstests zu langsam fuer Ops | mittel | QA | fast subset + nightly full suite | Ops delays |

---

## Backlog (priorisiert)

| ID | Titel | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BT50 | Opponent-Class Profiles fuer Survival-Spezialisierung | mittel | mittel | P2 | Profil-Entwurf + KPI-Hypothese | Offen |
| BT60 | Langlauf-Curriculum ueber 24h mit Auto-Promotion | hoch | gross | P2 | Infra-Kosten und Zeitfenster pruefen | Offen |
| BT70 | Offline-Policy-Benchmarking mit festen Seeds | mittel | klein | P1 | Benchmark harness standardisieren | Offen |

## Archivindex

| Block/Plan | Grund | Archiv-Pfad |
| --- | --- | --- |
| - | noch keine abgeschlossenen BT-Rootplaene archiviert | `docs/archive/plans/completed/` |

## Weekly Review (KW 12/2026)

Stand: 2026-03-22

- Abgeschlossen diese Woche: BT10.1.1 Stabilitaetsparameter gehaertet.
- In Arbeit: BT10.1.2 Operatorlauf-Monitoring.
- Naechste 3 Ziele:
  1. BT10.2.1 periodische `bot:validate` Reports sichern.
  2. BT10.2.2 KPI-Deltas pro Checkpoint dokumentieren.
  3. BT15.2.2 woechentliche Roadmap-Replanung gegen Checkpoint-Log verankern.
- Groesstes Risiko: Laufartefakte unvollstaendig bei langen Resume-Ketten.
- Entscheidungsbedarf: feste 2h-Validierungszeitfenster und Owner festlegen.

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
