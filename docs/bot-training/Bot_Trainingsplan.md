# Bot Trainingsplan (Aktiver Master)

Stand: 2026-04-23

Dieser Plan ist die einzige aktive Quelle fuer Bot-Training.
Allgemeine Architektur-/Gameplay-Arbeit bleibt in `docs/Umsetzungsplan.md`.
Roadmap-Horizont fuer kommende Trainingsfenster: `docs/bot-training/Bot_Trainings_Roadmap.md`.

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
5. `docs/plaene/neu/BT90_GoldStandard/**` bleibt Referenz- und Handoff-Material; aktive PPO-Phasen werden nur als BT90-BT95 in diesem Master gefuehrt.
6. Fuer BT90-BT95 bleibt `docs/referenz/ai_architecture_context.md` die autoritative Layer-Quelle; produktive Runtime-/AI-Hub-Surfaces sind bis zu einem spaeteren Integrationsblock read-only.

## Zielbild (Survival First)

- Primaeres Ziel: Bot-Ueberlebenszeit deutlich steigern.
- Leit-KPI 1: `avgStepsPerEpisode` mindestens +30% gegen Baseline.
- Leit-KPI 2: `averageBotSurvival` aus `bot:validate` mindestens +30% gegen Baseline.
- Stabilitaets-KPI: `runtimeErrorCount = 0`, Gate bleibt gruen.

## Report-Modi (bot:validate)

- `npm run bot:validate` schreibt Standard-Reports lokal nach `tmp/` (nicht versioniert).
- `npm run bot:validate:publish` schreibt zusaetzlich Evidence nach `data/bot_validation_report.json` sowie einen Tagesreport unter `docs/` (Dateiname `Testergebnisse_Phase4b_<Datum>.md`).

## PPO-Zweitpfad (BT90-BT95)

Die Analyse des BT90-Drafts aus `docs/plaene/neu/BT90_GoldStandard/` wird hier nicht als Direktuebernahme von `BT100` bis `BT105` gespiegelt.
Der aktive Zuschnitt folgt stattdessen dem Rolling-Intake aus `IMPLEMENTATION_README.md`: kleine claimbare Bloecke `BT90` bis `BT95`, damit der Bot-Trainingsplan die einzige operative Quelle bleibt und kein zweiter Wahrheitsraum entsteht.

Cross-Plan-Fit zu `docs/Umsetzungsplan.md`:

- `docs/Umsetzungsplan.md` bleibt kompakter Gesamtprojekt-Index und fuehrt weiterhin keine Bot-Training-Phasen.
- Die dort geltenden Surface-/Ownership-Ratchets aus `V77`, `V91` und `V92` bleiben fuer den PPO-Zweitpfad bindend.
- Wenn `V101` vor BT90-BT92 an Shared-Contracts, Schema- oder Typ-Ratchets zieht, muessen Contract- und Authority-Listen fuer den PPO-Zweitpfad vor weiterem Closure neu abgeglichen werden.

## BT90-Zerlegung aus dem Draft

| Aktiver Block hier | Draft-Quelle | Rolle |
| --- | --- | --- |
| `BT90` | `BT100.1` bis `BT100.2` | Python-Minimalbootstrap, JS-authoritative Contract-Wahrheit sowie Bauort- und Drift-Grenzen |
| `BT91` | `BT100.3` bis `BT100.5` | Python-Sidecar-Handshake, Contract-Smoke und deterministische 1-Worker-Lane |
| `BT92` | `BT101.1` bis `BT101.3` | Observation-/Action-Authority, Single-Env und JS-authoritative Semantik |
| `BT93A` | `BT101.4` bis `BT101.6` | Mehr-Env-/Throughput-Harness ausserhalb der produktiven Runtime |
| `BT93B` | `BT102.1` bis `BT102.3` | minimaler PPO-Baseline-Scaffold mit Smoke-, Checkpoint- und Resume-Kette |
| `BT93C` | `BT102.4` bis `BT102.6` | konservative PPO-Baseline, DQN-Vorvergleich und reproduzierbarer Referenzlauf |
| `BT94A` | `BT103` | Candidate Freeze und Ablationen |
| `BT94B` | `BT104` | Externe A/B-Evidence und Urteil |
| `BT95` | `BT105` | Integrations-Handoff und spaeterer Rollout-Intake |

## Layer-Leitplanken fuer BT90-BT95

| Layer | Autoritativer Pfad | Regel fuer BT90-BT95 |
| --- | --- | --- |
| Match-/Runtime-Kern | `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` | primaerer Simulationspfad; kein zweiter Matchstart ausserhalb dieses Kerns |
| Trainings-Adapter | `TrainingTransportFacade`, `TrainerPayloadAdapter` | Reset-/Step-/Reward-Vertrag nur konsumieren, nicht duplizieren |
| Transport / AI-Hub | `WebSocketTrainerBridge`, `TrainingContractV1` | Bridge-V1 bleibt eingefroren; kein neuer produktiver Transportpfad |
| Runtime-Bot-Auswahl | `ObservationBridgePolicy`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes`, `LocalDqnInference` | bis BT95 read-only; keine produktive PPO-Umschaltung |
| Reward / Safety / Intent | `RewardCalculator`, `HybridDecisionArchitecture` | produktive Semantik bleibt authoritative; PPO trainiert dagegen statt daran vorbei |
| Neuer PPO-Bauort | `python/**`, `data/training/ppo/**`, optional `scripts/training-headless-bridge-smoke.mjs` | neue Arbeit nur ausserhalb des produktiven Runtime-Pfads |

## Abhaengigkeiten (Hard/Soft)

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| BT10 | - | soft | ja | Operatorlauf kann isoliert laufen |
| BT11 | BT10 Baseline-Laufdaten | soft | ja | Folgefenster fuer 10h-Operatorlauf |
| BT12 | BT11 Abschlussartefakte | soft | ja | weiteres 10h-Folgefenster fuer Bot-Stabilisierung |
| BT15 | BT10 Baseline-Laufdaten | soft | ja | Zukunftsplanung nutzt aktuelle Lauf-KPIs |
| BT20 | BT10 Baseline-Laufdaten + BT15 Zyklenplan | hard | ja | BT10-Baseline vorhanden; BT15 Zielkorridor in 15.1/15.2.1 dokumentiert |
| BT30 | 20.99 | hard | nein | startet erst nach Survival-Policy-Phase |
| BT40 | 30.99 | hard | nein | Eval/Gate-Haertung nach Curriculum/Hyperparameter |
| BT73 | 40.99 | hard | nein | Deep-Survival-/Intent-/Resume-Folgeblock baut auf den haerteten BT20-BT40-Gates auf |
| BT73 | Fehlerbericht `2026-03-28_training_resume-command-timeout.md` | hard | nein | `trainer-checkpoint-load`/Preview-/Publish-Pfad muss vor Abschluss des Blocks belastbar sein |
| BT73 | V69.99 | soft | ja | Fight/Hunt-Combat-Baseline aus V69 liefert die aktuelle Survival-/Item-Grundlage |
| BT73 | V72 | soft | nein | Portal-/Gate-/Item-Vertraege aus V72 muessen fuer finale Bot-Semantik synchronisiert werden |
| BT90 | V77.99, V91.99, V92.99 | hard | ja | PPO-Zweitpfad respektiert bestehende Surface-/Ownership-Ratchets und bleibt read-only gegen produktive Runtime-Surfaces |
| BT91 | BT90.99 | hard | ja | Sidecar-Handshake, Contract-Smoke und 1-Worker-Lane sind lokal im aktuellen Worktree dokumentiert; die BT91-Artefakte sind noch nicht repo-versioniert |
| BT92 | BT91.99 | hard | ja | gruene BT91-Evidence liefert Sidecar-/100-Step-Handover fuer die Single-Env-Minimalspur |
| BT93A | BT92.99 | hard | ja | BT92.99 ist gruen; claimbar ist jetzt nur der Harness-/Throughput-Block, und nur mit gruener Freeze-Bestaetigung |
| BT93B | BT93A.99 | hard | nein | PPO-Scaffold oeffnet erst nach artefaktbasiertem Harness-/Throughput-Handover aus BT93A |
| BT93C | BT93B.99 | hard | nein | Die konservative PPO-Baseline oeffnet erst nach gruener Scaffold-, Smoke- und Resume-Kette aus BT93B |
| BT94A | BT93C.99 | hard | nein | Candidate-Freeze und Ablationen brauchen eine echte reproduzierbare PPO-Baseline |
| BT94B | BT94A.99 | hard | nein | Externe A/B-Evidence braucht einen eingefrorenen Kandidaten |
| BT94B | BT80C 80.9.3 | soft | nein | gruene produktionsnahe Validation verbessert Vergleichbarkeit, ist aber kein Startblocker fuer externe Evidence |
| BT95 | BT94B Urteil `promote` | hard | nein | Integrations-Handoff ist erst nach positiver externer Evidence sinnvoll |
| BT95 | BT80C 80.9.3 oder gleichwertiger produktiver Validation-Pfad | soft | nein | fuer BT95 als Handoff darf der Punkt offen dokumentiert bleiben; fuer spaeteren Rollout-Intake wird er hart |

## Datei-Ownership (Bot-Training)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `scripts/training-*.mjs`, `scripts/bot-validation-*.mjs` | BT10-BT40, BT73 | offen | Orchestrierung, Eval, Gate, Validation |
| `src/entities/ai/training/**`, `trainer/**` | BT20-BT30, BT73 | offen | Runner/Bridge/Trainer-Verhalten |
| `src/state/training/**` | BT20-BT40, BT73 | offen | Gate-, KPI- und Reward-Logik |
| `src/entities/ai/**`, `src/hunt/HuntBotPolicy.js`, `src/state/validation/**`, `tests/physics-policy.spec.js`, `tests/training-*.mjs`, `docs/referenz/ai_architecture_context.md`, `docs/bot-training/Bot_Trainings_Roadmap.md` | BT73 | offen | Deep-Survival-, Intent-, Resume- und Operator-Haertung fuer Runtime + Training |
| `tests/trainer-*.mjs`, `tests/training-*.mjs` | BT10-BT40 | shared | Nur trainingsnahe Tests |
| `docs/bot-training/Bot_Trainingsplan.md`, `docs/bot-training/Bot_Survival_Training_Plan_12h.md`, `docs/bot-training/Bot_Survival_Training_Plan_10h.md`, `docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md` | BT10-BT40, BT73, BT80C, BT90-BT95 | shared | Masterplan + Detailplaene + PPO-Intake-Leiter |
| `python/**`, `data/training/ppo/**` | BT90-BT95 | offen | neuer Sidecar-/PPO-Pfad ausserhalb der produktiven Runtime |
| `python/scripts/**`, `python/tests/**`, `scripts/training-headless-bridge-smoke.mjs` | BT90-BT93A | offen | Boundary-Harness, Compliance-Smokes und nichtproduktive Mehr-Env-Orchestrierung |
| `python/train.py`, `python/eval.py`, `python/configs/**`, `python/callbacks/**` | BT93B-BT93C | offen | PPO-Scaffold, Eval-, Resume- und Referenzlauf ausserhalb der produktiven Runtime |
| `src/state/HeadlessMatchKernelRuntime.js`, `src/core/MatchKernelTrainingAdapter.js`, `src/entities/ai/training/TrainingTransportFacade.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/entities/ai/ObservationBridgePolicy.js`, `src/core/RuntimeConfig.js`, `src/entities/ai/BotPolicyRegistry.js`, `src/entities/ai/BotPolicyTypes.js`, `src/entities/ai/inference/LocalDqnInference.js`, `src/state/training/RewardCalculator.js`, `src/entities/ai/hybrid/HybridDecisionArchitecture.js`, `src/state/MatchSessionFactory.js` | BT90-BT95 | read-only | Layer-sicher konsumieren; keine produktive Runtime-, Matchstart- oder AI-Hub-Umschaltung |
| `docs/plaene/neu/BT90_GoldStandard/**` | BT90-BT95 | referenz | Draft-, Audit- und Handoff-Material; keine aktiven Locks oder Evidence hier fuehren |
| `data/training/**`, `output/training/**` | BT10 | shared | Laufartefakte, Logs, Serien |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| Train-Ops | BT10 | 2026-03-22 | active | 2026-03-22 |
| Bot-Codex | BT11 | 2026-03-23 | frei | 2026-03-24 (abgeschlossen) |
| Bot-Codex | BT12 | 2026-03-25 | active | 2026-03-25 |
| Train-Ops | BT15 | 2026-03-22 | active | 2026-03-24 |
| Bot-Codex | BT20 | 2026-03-28 | active | 2026-03-28 |
| Bot-B | BT30 | 2026-03-22 | frei | - |
| Bot-C | BT40 | 2026-03-22 | frei | - |
| - | BT73 | - | frei | Intake 2026-03-31 abgeschlossen; Claim nach BT20-/BT30-/BT40-Abstimmung |
| Bot-Codex | BT80C | 2026-04-03 | active | 80.99 offen; 80.7-80.9 repo-technisch vorgezogen |
| Bot-Codex | BT90 | 2026-04-22 | frei | 2026-04-22 (abgeschlossen) |
| Bot-Codex | BT91 | 2026-04-22 | frei | 2026-04-22 (abgeschlossen) |
| Bot-Codex | BT92 | 2026-04-23 | frei | 2026-04-23 (abgeschlossen) |
| Bot-Codex | BT93A | 2026-04-23 | active | 93A.2 |
| - | BT93B | - | frei | wartet auf BT93A.99; minimaler PPO-Scaffold vor echter Baseline |
| - | BT93C | - | frei | wartet auf BT93B.99; konservative Baseline und Vorvergleich |
| - | BT94A | - | frei | wartet auf BT93C.99; Candidate Freeze und Ablationen |
| - | BT94B | - | frei | wartet auf BT94A.99; Externe A/B-Evidence und Urteilsdisziplin |
| - | BT95 | - | frei | wartet auf BT94B `promote`; Integrations-Handoff |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | Noch leer | - | - |

---

## Aktive Bloecke

## Block BT10: 12h Survival Operatorlauf

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_12h.md`

<!-- LOCK: Bot-TrainOps seit 2026-03-22 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT10-Phasen inkl. 10.99.* sind abgeschlossen.
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

### 10.99 Abschluss-Gate

- [ ] 10.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit passendem Report abschliessen
- [ ] 10.99.2 Finale Artefaktpfade + KPI-Vergleich dokumentieren und Lock freigeben

### Risiko-Register BT10

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Langlauf stoppt durch Timeout/Backpressure | hoch | Train-Ops | Guarded retries + Zwischencheck alle 2h | Unvollstaendige Laufserie |
| KPI-Drift trotz gruenem Gate | mittel | Train-Ops | KPI-Deltas je Checkpoint protokollieren | Survival sinkt trotz Pass |
| Artefakt-Luecken bei Resume | mittel | Trainer | latest/series pointers nach jedem Schritt pruefen | fehlende eval/gate Dateien |

---

## Block BT11: 10h Survival Folgefenster

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_10h.md`

<!-- LOCK: Bot-Codex seit 2026-04-03 -->

### Definition of Done (DoD)

- [x] DoD.1 Alle BT11-Phasen inkl. 11.99.* sind abgeschlossen.
- [x] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit Artefaktpfaden dokumentiert.
- [x] DoD.3 KPI-Deltas gegen BT10-Baseline sind im Checkpoint-Log eingetragen.
- [x] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 11.1 Plan und Laufstart

- [x] 11.1.1 10h-Trainingsplan mit KPI-/Checkpoint-Vorgaben anlegen (abgeschlossen: 2026-03-23; evidence: create 10h plan -> docs/bot-training/Bot_Survival_Training_Plan_10h.md)
- [x] 11.1.2 10h-Lauf starten und Operator-Artefakte (Series, Log, PID) dokumentieren (abgeschlossen: 2026-03-23; evidence: npm run training:10h -- --series-stamp BT11_20260323T013933 --stop-on-fail false -> output/training/BT11_20260323T013933-10h.log, PID 9332)
- [x] 11.1.3 Fight-Profil fuer 10h-Lauf festlegen (`hunt-3d`,`hunt-2d`, stabile Seeds/Timeouts) (abgeschlossen: 2026-03-24; evidence: update fight profile commands -> docs/bot-training/Bot_Survival_Training_Plan_10h.md)
- [x] 11.1.4 Fight-10h-Lauf starten und Operator-Artefakte dokumentieren (abgeschlossen: 2026-03-24; evidence: npm run training:10h -- --series-stamp BT11_FIGHT_20260324T014853 --modes hunt-3d,hunt-2d --stop-on-fail false -> output/training/BT11_FIGHT_20260324T014853-10h.log, PID 2772)

### 11.2 Laufmonitoring im 2h-Takt

- [x] 11.2.1 Alle 2h `bot:validate` ausfuehren und Report im aktiven Run-Ordner pinnen (abgeschlossen: 2026-03-23; evidence: BOT_RUNNER_FORCE_KILL_PORT=false BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3 npm run bot:validate -> data/bot_validation_report.json, docs/tests/Testergebnisse_Phase4b_2026-03-23.md)
- [x] 11.2.2 `avgStepsPerEpisode` und `averageBotSurvival` je Checkpoint gegen BT10-Baseline protokollieren (abgeschlossen: 2026-03-24; evidence: final checkpoint update -> `data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json`, `data/bot_validation_report.json`)

### Checkpoint-Log BT11 (laufend)

| Datum | Typ | SeriesStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs Baseline | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-23 | Plan erstellt | `pending` | `-` | `-` | `-` | Referenz BT10 | `docs/bot-training/Bot_Survival_Training_Plan_10h.md` |
| 2026-03-23 | Laufstart | `BT11_20260323T013933` | `pending` | `pending` | `pending` | wird in 2h-Checkpoints gefuellt | `output/training/BT11_20260323T013933-10h.log` |
| 2026-03-23 | Checkpoint C1 | `BT11_20260323T013933` | `126.444444` | `40.690933` | `0.248243` | Steps `+2.137%`, Survival `+27.524%` (vs BT10 Baseline) | `data/training/runs/BT11_20260323T013933-r2137/run.json`, `data/bot_validation_report.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-23.md`; Hinweis: forced-round-rate `100%` |
| 2026-03-24 | Fight-Plan aktualisiert | `BT11_FIGHT_pending` | `pending` | `pending` | `pending` | hunt-only Fenster vorbereitet | `docs/bot-training/Bot_Survival_Training_Plan_10h.md` |
| 2026-03-24 | Fight-Laufstart | `BT11_FIGHT_20260324T014853` | `pending` | `pending` | `pending` | 10h-Operatorlauf aktiv; 2h-Checkpoints offen | `output/training/BT11_FIGHT_20260324T014853-10h.log`, PID `2772` |
| 2026-03-24 | 10h-Loop abgeschlossen | `BT11_FIGHT_20260324T014853` | `117.525000` | `pending` | `1.000000` | Steps `-5.068%`, Survival offen (vs BT10 Baseline) | `data/training/series/BT11_FIGHT_20260324T014853/loop.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/eval.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/gate.json` |
| 2026-03-24 | Abschlussvalidate blockiert | `BT11_FIGHT_20260324T014853` | `117.525000` | `null` | `1.000000` | `bot:validate` bricht in `app:game-instance` ab | `output/training/BT11_FIGHT_20260324T014853-botvalidate-final.log`; Hinweis: frueherer HUD-NPE gefixt via commit `40dc4ab` |
| 2026-03-24 | Abschlussvalidate erfolgreich | `BT11_FIGHT_20260324T014853` | `117.525000` | `37.376986` | `1.000000` | Steps `-5.068%`, Survival `+17.138%` (vs BT10 Baseline) | `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-24.md`; Hinweis: scenarioLimit `2`, forced-round-rate `85.714%` |

### 11.99 Abschluss-Gate

- [x] 11.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit gueltigem Report abschliessen (abgeschlossen: 2026-03-24; evidence: `npm run bot:validate` mit `BOT_RUNNER_FORCE_KILL_PORT=false BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3` -> `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`)
- [x] 11.99.2 Finale KPI-Deltas, Artefaktpfade und Lock-Release dokumentieren (abgeschlossen: 2026-03-24; evidence: final KPI row + lock release -> `docs/bot-training/Bot_Trainingsplan.md`, `docs/bot-training/Bot_Survival_Training_Plan_10h.md`)

### Risiko-Register BT11

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Lauf stoppt vor 10h durch Stage-Failure | hoch | Bot-Codex | `stop-on-fail` aus + Logmonitoring + Resume ueber latest checkpoint | `loop.json` zeigt fruehen stopReason |
| KPI-Delta unklar ohne valide Zwischenreports | mittel | Bot-Codex | fester 2h Checkpoint-Rhythmus mit `bot:validate` | fehlendes `averageBotSurvival` im Abschluss |
| Artefaktdrift zwischen runs/series/logs | mittel | Bot-Codex | SeriesStamp fixieren und Logpfad im Plan pinnen | mismatch zwischen `loop.json` und run stamps |
| `bot:validate`-Boot timeout (`GAME_INSTANCE` bleibt `null`) | mittel | Bot-Codex | Runtime fallback ueber statischen Localhost-Server + Szenario-Limit-Fix (`8ef8b75`) fuer stabilen Abschlusslauf | erneuter Timeout bei Final-Validate trotz Fallback |

---

## Block BT12: 10h Bot Folgefenster (Classic + Fight Matrix)

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md`

<!-- LOCK: Bot-Codex seit 2026-03-25 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT12-Phasen inkl. 12.99.* sind abgeschlossen.
- [ ] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit Artefaktpfaden dokumentiert.
- [ ] DoD.3 KPI-Deltas gegen BT11-Abschlusswerte sind im Checkpoint-Log eingetragen.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 12.1 Plan und Laufstart

- [x] 12.1.1 10h-Folgeplan fuer Classic/Fight Matrix anlegen (abgeschlossen: 2026-03-24; evidence: create BT12 plan -> docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md)
- [x] 12.1.2 10h-Lauf starten und Operator-Artefakte (Series, Log, PID) dokumentieren (abgeschlossen: 2026-03-24; evidence: Start-Process `npm run training:10h -- --series-stamp BT12_20260324T152103 ...` -> `output/training/BT12_20260324T152103-10h.log`, PID `3476`)
- [x] 12.1.3 Survival-First-Restart (Classic + Fight) mit 10h-Matrixlauf starten und dokumentieren (abgeschlossen: 2026-03-25; evidence: `npm run training:10h -- --series-stamp BT12_SURV_20260325T030951 --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true` -> `output/training/BT12_SURV_20260325T030951-10h.log`, PID `5856`)

### 12.2 Laufmonitoring im 2h-Takt

- [/] 12.2.1 `bot:validate`-Checkpoint im 2h-Rhythmus mit stabilen Runtime-Parametern ausfuehren
- [/] 12.2.2 `avgStepsPerEpisode` und `averageBotSurvival` je Checkpoint gegen BT11-Finalwerte protokollieren
- [x] 12.2.3 Runner-Stabilisierung via `BOT_RUNNER_SERVER_MODE=preview` fuer Checkpoint-Validierung aktivieren (abgeschlossen: 2026-03-25; evidence: `BOT_RUNNER_SERVER_MODE=preview BOT_RUNNER_PREVIEW_BUILD=true BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3 BOT_RUNNER_TOTAL_TIMEOUT=900000 BOT_RUNNER_BOOT_TIMEOUT=240000 npm run bot:validate` -> `output/training/BT12_SURV_20260325T030951-botvalidate-cp03-preview.log`, `tmp/bot-validation-report.json`)

### Checkpoint-Log BT12 (laufend)

| Datum | Typ | SeriesStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs BT11-Final | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-24 | Plan erstellt | `pending` | `-` | `-` | `-` | Referenz BT11-Final (`117.525` / `37.376986`) | `docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md` |
| 2026-03-24 | Laufstart + Warm-up | `BT12_20260324T152103` | `124.137500` | `-` | `0.000000` | Steps `+5.626%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_20260324T152103-10h.log`, `data/training/runs/BT12_20260324T152103-r01/run.json`, `data/training/runs/BT12_20260324T152103-r01/gate.json` |
| 2026-03-24 | Checkpoint Validate fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp01.log` (`phase=app:game-instance`) |
| 2026-03-24 | Checkpoint Validate Retry fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp01-retry.log` (`BOT_RUNNER_FORCE_KILL_PORT=false`, `phase=app:game-instance`) |
| 2026-03-25 | Checkpoint Validate Port-Shift fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp02-port4275.log` (`BOT_RUNNER_PORT=4275`, `phase=app:game-instance`) |
| 2026-03-25 | Survival-First-Restart Laufstart | `BT12_SURV_20260325T030951` | `pending` | `pending` | `pending` | neues 10h-Fenster gestartet | `output/training/BT12_SURV_20260325T030951-10h.log`, PID `5856` |
| 2026-03-25 | Survival-First-Restart Warm-up | `BT12_SURV_20260325T030951` | `135.368750` | `pending` | `0.000000` | Steps `+15.183%`, Survival `pending` (vs BT11-Final) | `data/training/runs/BT12_SURV_20260325T030951-r08/run.json`, `data/training/runs/latest.json` |
| 2026-03-25 | C1 Validate fehlgeschlagen | `BT12_SURV_20260325T030951` | `135.368750` | `-` | `0.000000` | Steps `+15.183%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp01.log` (`BOT_RUNNER_FORCE_KILL_PORT=false`, `phase=app:game-instance`) |
| 2026-03-25 | C1 Validate Retry fehlgeschlagen | `BT12_SURV_20260325T030951` | `135.368750` | `-` | `0.000000` | Steps `+15.183%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp01-retry.log` (`BOT_RUNNER_PORT=4275`, `BOT_RUNNER_BOOT_TIMEOUT=300000`, `phase=app:game-instance`) |
| 2026-03-25 | C2 Validate fehlgeschlagen | `BT12_SURV_20260325T030951` | `135.368750` | `-` | `0.000000` | Steps `+15.183%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp02.log` (`BOT_RUNNER_BOOT_TIMEOUT=240000`, `phase=app:game-instance`) |
| 2026-03-25 | C3 Validate erfolgreich (preview mode) | `BT12_SURV_20260325T030951` | `135.368750` | `38.770150` | `0.000000` | Steps `+15.183%`, Survival `+3.727%` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp03-preview.log`, `tmp/bot-validation-report.json`, `tmp/Testergebnisse_Phase4b_2026-03-25.md`; Hinweis: forced-round-rate `83.3%` |
| 2026-03-27 | Abschlussvalidate erfolgreich, Gate weiter rot | `BT12b_SURVIVAL_20260327T035615-r491` | `124.137500` | `40.037833` | `0.000000` | Steps `+5.626%`, Survival `+7.119%` (vs BT11-Final) | `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/run.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/bot-validation-report.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/eval.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/gate.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-27.md`; Hinweis: `bot:validate` PASS nach Portal-Visual-Fix, aber `training:gate` FAIL auf `forcedRoundRate=1.0` und `timeoutRoundRate=1.0` |
| 2026-03-27 | Runner-Fix validiert, Gate weiter rot | `BT12b_SURVIVAL_20260327T035615-r491` | `124.137500` | `6.132433` | `1.000000` | Steps `+5.626%`, Survival `-83.593%` (vs BT11-Final) | `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/bot-validation-report.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/eval.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/gate.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-27.md`; Hinweis: `bot:validate` jetzt ohne Forced-/Timeout-Rounds (`0/0`), aber `training:gate` FAIL auf `averageBotSurvival=6.132433 < 19.145075` |

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
| Abschluss-Gate faellt nach Runner-Stabilisierung auf Survival-KPI | hoch | Bot-Codex | V1/V2-Survival unter natuerlichem Round-End analysieren und Policy/Training gegen fruehes Bot-Sterben nachziehen | `averageBotSurvival < 19.145075` |

---

## Block BT15: Zukunfts-Roadmap Survival (Q2)

Plan-Datei: `docs/bot-training/Bot_Trainings_Roadmap.md`

<!-- LOCK: Bot-TrainOps seit 2026-03-22 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT15-Phasen inkl. 15.99.* sind abgeschlossen.
- [ ] DoD.2 C1-C6 Zeitfenster, KPI-Zielkorridor und Entscheidungsregeln sind final dokumentiert.
- [ ] DoD.3 Woechentliche Re-Planung ist an BT10-Checkpoint-Log und Weekly Review gekoppelt.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 15.1 Baseline und Zielkorridor

- [x] 15.1.1 Baseline-Snapshot aus Trainingsartefakten in Roadmap dokumentieren (abgeschlossen: 2026-03-22; evidence: update roadmap baseline -> docs/bot-training/Bot_Trainings_Roadmap.md)
- [x] 15.1.2 KPI-Zielkorridor und Trainingszyklen C1-C6 festlegen (abgeschlossen: 2026-03-22; evidence: define cycles/targets -> docs/bot-training/Bot_Trainings_Roadmap.md)

### 15.2 Operative Verzahnung BT10-BT40

- [x] 15.2.1 Promotion-/Rollback-Regeln fuer zyklische Trainingsfenster definieren (abgeschlossen: 2026-03-22; evidence: add promotion rollback rules -> docs/bot-training/Bot_Trainings_Roadmap.md)
- [/] 15.2.2 Woechentliche Re-Planung in BT10-Checkpoint-Log und Weekly Review verankern

### 15.99 Abschluss-Gate

- [ ] 15.99.1 Ersten kompletten Zyklus (C1) mit KPI-Delta dokumentieren
- [ ] 15.99.2 KW13-Roadmap-Review abschliessen und Lock auf `frei` setzen

### Risiko-Register BT15

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Roadmap driftet von realen KPI-Trends weg | mittel | Train-Ops | weekly KPI checkpoint + zyklusweise Re-Baselining | Zielkorridor wird 2 Zyklen in Folge verfehlt |
| Ueberoptimistische Zielwerte ohne Gate-Stabilitaet | hoch | Train-Ops/RL | harte Promotion-Regeln + rollback Pflicht | kurzfristige KPI-Spitze ohne Reproduzierbarkeit |
| Plan bleibt statisch trotz neuer Artefakte | mittel | Train-Ops | BT10 Checkpoint-Log als Pflichtinput fuer BT15 updates | keine Roadmap-Aktualisierung nach Langlauf |

---

## Block BT20: Survival-Policy und Reward-Shaping

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_BT20.md`

<!-- LOCK: Bot-Codex seit 2026-03-27 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT20-Phasen inkl. 20.99.* sind abgeschlossen.
- [ ] DoD.2 A/B-Lauf gegen BT10-Baseline zeigt positives Survival-Delta.
- [ ] DoD.3 Training-Gates und betroffene Tests sind PASS.
- [ ] DoD.4 Evidence, Risikoabgleich und Doku-Gates sind abgeschlossen.

### 20.1 Safety-Layer vor Action-Ausgabe

- [x] 20.1.1 Collision-Risk-Guards in Action-Entscheidung einbauen (Evasion hat Vorrang) (abgeschlossen: 2026-03-31; evidence: `node --test tests/trainer-v36-action-safety.test.mjs` -> PASS)
- [x] 20.1.2 Risky-Action-Sperren bei hoher Bedrohung und niedriger Health einfuehren (abgeschlossen: 2026-03-31; evidence: `node --test tests/trainer-v36-action-safety.test.mjs` -> PASS)

### 20.2 Reward-Shaping auf Ueberleben fokussieren

- [x] 20.2.1 Schrittweises Survival-Reward und klare Death-Penalty kalibrieren (abgeschlossen: 2026-03-31; evidence: `node --test tests/training-reward-survival.test.mjs` -> PASS)
- [x] 20.2.2 Risk-Proximity-Penalties (Wall/Trail/Opponent) einfuehren und testen (abgeschlossen: 2026-03-31; evidence: `node --test tests/training-reward-survival.test.mjs` -> PASS)

### Checkpoint-Log BT20 (laufend)

| Datum | Typ | SeriesStamp | Resume-Quelle | Zielbild | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-03-27 | Plan erstellt | `pending` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | Survival-First Resume-Fenster mit 4-Mode-Matrix vorbereiten | `docs/bot-training/Bot_Survival_Training_Plan_BT20.md` |
| 2026-03-28 | 10h-Laufstart | `BT20_SURV_20260328T000841` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | 10h-Operatorlauf aktiv; Resume ueber Startup-Checkpoint bestaetigt (`checkpointLoads=1`, `optimizerSteps=1588329`) | `output/training/BT20_SURV_20260328T000841-10h.log`, `data/training/runs/BT20_SURV_20260328T000841-r01/run.json`, `data/training/runs/BT20_SURV_20260328T000841-r01/trainer.json`, `data/training/runs/latest.json` |
| 2026-03-31 | Safety/Reward rollout | `BT20_code_20260331` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | Trainer-Action-Guards, fallback-korrigierte Observation-Heuristik und Survival-First Reward-Shaping sind vor dem naechsten A/B-Lauf aktiv | `trainer/session/ActionSanitizer.mjs`, `trainer/session/TrainerSession.mjs`, `src/state/training/RewardCalculator.js`, `src/entities/ai/training/TrainingAutomationRunner.js`, `tests/trainer-v36-action-safety.test.mjs`, `tests/training-reward-survival.test.mjs` |
| 2026-03-31 | 10h-Restart aktiv | `BT20_SURV_20260331T043252` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | 4-Mode-10h-Lauf mit externem Startup-Resume-Server aktiv; fruehe Runs `r01/r02` schreiben Artefakte und Gates gruen | `output/training/BT20_SURV_20260331T043252-10h.log`, `output/training/BT20_SURV_20260331T043252-trainer-server.log`, `data/training/runs/BT20_SURV_20260331T043252-r01/run.json`, `data/training/runs/BT20_SURV_20260331T043252-r02/gate.json`, `data/training/runs/latest.json` |

### 20.99 Abschluss-Gate

- [ ] 20.99.1 A/B-Lauf gegen BT10-Baseline mit identischen Seeds/Modes durchfuehren
- [ ] 20.99.2 Verbesserung nur bei positivem Survival-Delta und stabilen Gates uebernehmen

### Risiko-Register BT20

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reward-Hacking statt Survival | hoch | RL | harte Survival-KPIs + adversarial seeds | hohe Reward-Werte bei kurzer Lebenszeit |
| Overfitting auf einzelne Seeds | mittel | RL | seed/mode matrix im Gate fixieren | starke KPI-Schwankung |
| Safety-Layer blockiert lernbare Aktionen | mittel | RL | thresholds iterativ + A/B checks | Policy wird zu konservativ |

---

## Block BT30: Curriculum, Replay-Priorisierung und Hyperparameter

Plan-Datei: `docs/bot-training/Bot_Trainingsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 20.99 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT30-Phasen inkl. 30.99.* sind abgeschlossen.
- [ ] DoD.2 Gewinner-Setting ist reproduzierbar ueber Vergleichslaeufe.
- [ ] DoD.3 Standard-Training-Skripte nutzen Gewinner-Setting.
- [ ] DoD.4 Evidence + Doku-Gates sind abgeschlossen.

### 30.1 Curriculum-Stufen

- [ ] 30.1.1 Trainingsstufen (einfach -> mittel -> voll) als konfigurierte Sequenz definieren
- [ ] 30.1.2 Stage-spezifische Promotion-Regeln anhand Survival-KPIs implementieren

### 30.2 Replay und Hyperparameter

- [ ] 30.2.1 Priorisierte Samples fuer near-death/death-leading Situationen einfuehren
- [ ] 30.2.2 Survival-orientierte Hyperparameter-Tuning-Laeufe (gamma/epsilon/step-limits) automatisieren

### 30.99 Abschluss-Gate

- [ ] 30.99.1 Gewinner-Setting per reproduzierbarem Vergleichslauf bestimmen
- [ ] 30.99.2 Gewinner-Setting in Standard-Training-Skripten verankern und dokumentieren

### Risiko-Register BT30

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Curriculum-Promotion zu aggressiv | mittel | RL | Mindestdauer je Stage + rollback criteria | unstabile KPI-Verlaeufe |
| Replay-Priorisierung erzeugt Bias | mittel | RL | gemischte sampling quotas | Performance in einfachen Szenen bricht ein |
| Hyperparameter nicht reproduzierbar | hoch | Train-Ops | fixed seeds + run manifests + lockstep eval | Gewinnerlauf nicht reproduzierbar |

---

## Block BT40: Eval-/Gate-Haertung und Regression-Schutz

Plan-Datei: `docs/bot-training/Bot_Trainingsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 30.99 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT40-Phasen inkl. 40.99.* sind abgeschlossen.
- [ ] DoD.2 Survival-Metriken sind als harte Gates verankert.
- [ ] DoD.3 Trainingsnahe Regressionstests und Operator-Runbook sind aktualisiert.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 40.1 Survival-Metriken als First-Class-Gates

- [ ] 40.1.1 `averageBotSurvival` in Eval/Gate standardmaessig erzwingen (kein `null` fuer Abschlusslaeufe)
- [ ] 40.1.2 Gate-Fehlerbilder und Restore-Pfade fuer Latest/Checkpoint robustifizieren

### 40.2 Test- und Operator-Haertung

- [ ] 40.2.1 Trainingsnahe Regressionstests fuer Survival-Deltas und Guardrails erweitern
- [ ] 40.2.2 Operator-Runbook fuer Start/Resume/Stop/Recovery standardisieren

### 40.99 Abschluss-Gate

- [ ] 40.99.1 `training-run/eval/gate`, `bot:validate`, trainingsnahe Tests und Build sind gruen
- [ ] 40.99.2 Plan-Doku, Lock-Bereinigung und Handoff an `docs/Umsetzungsplan.md` (nur Referenz) abgeschlossen

### Risiko-Register BT40

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| False-positive gates bei sporadischen KPI-Ausreissern | mittel | QA/RL | rolling window + min-run-count | gate flip-flops |
| Restore-Pfad bricht bei latest pointer | hoch | Trainer | checkpoint fallback + smoke resume tests | training cannot resume |
| Regressionstests zu langsam fuer Ops | mittel | QA | fast subset + nightly full suite | Ops delays |

---

## Block BT73: Deep-Survival-, Intent- und Resume-Haertung fuer Runtime, Training und Operatorpfade

Plan-Datei: `docs/plaene/alt/Feature_Bot_Tiefenverbesserung_Survival_Entscheidung_Operator_V73.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 40.99 -->

Scope:

- Runtime-Bot ueber Safety-, Intent-, Recovery- und Weltmodell-Semantik tiefer auf Survival-First ausrichten, ohne den Runtime-V1-Bridge-Vertrag still zu brechen.
- Eval-, Gate-, Resume- und Operatorpfade so haerten, dass Survival-Fortschritt reproduzierbar ueber feste Vergleichsmatrizen statt ueber Einzelruns beurteilt wird.
- Gameplay-Semantik aus V69 und V72 fuer Items, Shield, Portale und Gates als First-Class-Signal in Runtime, Training, QA und Release-Pfade uebernehmen.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 73.1 bis 73.7 und 73.99 sind abgeschlossen.
- [ ] DoD.2 Runtime-Bot nutzt explizite Safety-, Intent- und Recovery-Logik statt nur reaktive Einzelheuristiken; Classic/Hunt teilen einen klar dokumentierten Kern.
- [ ] DoD.3 Training und Reward-Shaping verbessern Survival auf einer festen Seed-/Mode-Matrix reproduzierbar und ohne Forced-/Timeout-Runden oder Reward-Hacking.
- [ ] DoD.4 Eval-/Validation-Reports liefern Survival-Metriken, Todesursachen, Szenarioklassen, Resume-Gesundheit und Decision-Trace-Evidence pro Kandidatenlauf.
- [ ] DoD.5 Resume-, Preview-Validate- und Publish-Pfade laufen ohne Sonderworkaround stabil; Artefakte und Run-Manifeste sind vollstaendig und reproduzierbar.
- [ ] DoD.6 Trainingsnahe Tests, `bot:validate`, `training:eval`, `training:gate`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.

Leitplanke 2026-04-04 (V84-Folgeverbrauch, Quelle: `docs/referenz/ai_architecture_context.md`, Abschnitte `4.6.1` und `4.6.2`): Preview-, Resume-, Eval- und Kandidatenlaeufe sollen denselben `MatchKernelTrainingAdapter` plus normalisierte `run_profile`-, `seed_envelope`-, `input_frame`- und `snapshot_envelope`-Vertraege nutzen. Neue Trainings- oder Validate-Harnesses fuehren keinen separaten Matchstart an `MatchSessionFactory` oder Renderer vorbei ein.

### 73.1 Ground Truth, Failure-Taxonomie und Vergleichsbasis

- [ ] 73.1.1 `bot:validate`, Eval und Recorder um Failure-Codes, Todesursachen, Exit-Qualitaet, Resume-Status und Szenarioklassen erweitern, damit Regressionen nicht mehr nur als Gesamtzahl sichtbar sind.
- [ ] 73.1.2 Decision-Trace-Artefakte fuer Hochrisiko-Momente einfuehren (letzte Sensoren, Intent, Action-Veto, Reward-Zerlegung), damit schlechte Bot-Entscheidungen reproduzierbar analysiert werden koennen.
- [ ] 73.1.3 Eine feste Vergleichsmatrix aus Maps, Seeds, Modi und Baseline-Stamps definieren, damit BT10/BT11/BT12/BT20 und Folgefenster mit denselben Bedingungen verglichen werden.

### 73.2 Sensorik und internes Weltmodell vertiefen

- [ ] 73.2.1 Threat-Horizon-, Dead-End-, Freiraum-, Gegnerdruck- und Exit-Signale in `BotSensingOps`/`BotThreatOps` zentralisieren, damit der Bot nicht erst am Kollisionspunkt reagiert.
- [ ] 73.2.2 Ein kleines internes Gedaechtnis fuer letzte Gefahr, letzte Recovery-Aktion, Portal-/Gate-Nutzung und Fehlschlaege einfuehren, ohne den Runtime-V1-Contract zu brechen.
- [ ] 73.2.3 Items, Portale, Gates, Shield und Modus-Sonderregeln als explizite Beobachtungs- und Policy-Semantik verdrahten, damit V69/V72-Aenderungen nicht als Seiteneffekt in die KI tropfen.

### 73.3 Entscheidungsarchitektur in Safety-, Intent- und Recovery-Layer aufteilen

- [ ] 73.3.1 Einen klaren Safety-Veto-Layer vor der finalen Action-Ausgabe verankern, der Kollision, Low-HP-Risiko, Sackgassen und riskante Item-/Portal-Aktionen deterministisch blocken kann.
- [ ] 73.3.2 Einen Intent-Layer fuer `survive`, `reposition`, `engage`, `disengage`, `recover`, `use-item`, `take-portal`, `take-gate` einfuehren, damit Entscheidungen nicht nur aus losen Prioritaetslisten entstehen.
- [ ] 73.3.3 Recovery-/Stuck-Verhalten als expliziten Zustandsautomaten mit Eintritts- und Exit-Kriterien modellieren, statt Steckenbleiben nur post hoc zu zaehlen.

### 73.4 Reward-Shaping, Curriculum und Replay auf Survival-First ausrichten

- [ ] 73.4.1 Reward-Zerlegung in Survival, sichere Flaechenkontrolle, gelungene Gefahren-Exits und schadensbezogene Rewards nur bei netto ueberlebensfoerderlichem Verhalten aufspalten.
- [ ] 73.4.2 Curriculum-Stufen von einfach zu voller 4-Mode-Matrix mit Promotion-/Rollback-Regeln an echte Survival- und Stability-KPIs koppeln statt nur an Steps oder Reward-Summen.
- [ ] 73.4.3 Priorisierte Replay-/Scenario-Samples fuer near-death, death-leading, low-HP-combat, Portal-/Gate-Entscheidungen und Item-Fehlgebrauch einfuehren.

### 73.5 Eval-, Gate- und Operator-Pfade haerten

- [ ] 73.5.1 `bot:validate` und `training:eval` um harte Guardrails fuer `averageBotSurvival != null`, Forced-/Timeout-Rates, Death-Cause-Verteilung und per-Szenario-Failures erweitern.
- [ ] 73.5.2 `training:gate` auf Vergleich gegen den letzten stabilen Referenzlauf plus Rolling-Window-Regeln ausrichten, damit einmalige Glueckslaeufe nicht promoted werden.
- [ ] 73.5.3 Einen einheitlichen Validate-Pfad fuer Preview, Publish und Operatorlauf bauen, damit Abschluss-Evidence nicht mehr von instabilen Dev-Server- oder Port-Konstellationen abhaengt.

### 73.6 Resume-, Bridge- und Reproduzierbarkeitsluecken schliessen

- [ ] 73.6.1 Den `trainer-checkpoint-load`-/`trainer-checkpoint-load-latest`-Antwortpfad zwischen `training-run`, `WebSocketTrainerBridge` und `TrainerServer` instrumentieren, testen und reparieren.
- [ ] 73.6.2 Run-Manifeste fuer Resume-Quelle, Modell-/Config-Hash, Gate-Schwellen, Validate-Argumente und Szenario-Matrix standardisieren, damit spaetere KPI-Vergleiche belastbar bleiben.
- [ ] 73.6.3 Eine deterministische A/B-Lane fuer Baseline vs. Kandidat mit festen Seeds, identischem Modus-Mix und publishbarer Evidence etablieren.

### 73.7 Rollout, Fallback und Doku-Sync

- [ ] 73.7.1 Die tieferen KI-Aenderungen hinter klaren Tuning-/Strategy-Schaltern ausrollen, damit `rule-based`, `auto`, Bridge- und Fallback-Pfade kontrolliert verglichen und im Notfall sofort zurueckgenommen werden koennen.
- [ ] 73.7.2 Architektur-, Trainings-, Release- und QA-Dokumentation auf denselben Intent-, Failure- und Gate-Vertrag aktualisieren, damit Runtime, Training und Abnahme denselben Wissensstand teilen.

### 73.99 Integrations- und Abschluss-Gate

- [ ] 73.99.1 Feste Vergleichslaeufe gegen die Baseline sind gruen: kein Resume-Workaround mehr, keine Forced-/Timeout-Runden, `averageBotSurvival` mindestens auf BT11-Stabilniveau und Trend in Richtung Roadmap-Ziel.
- [ ] 73.99.2 Trainingsnahe Tests, `bot:validate`, `training:eval`, `training:gate`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind abgeschlossen; verbleibende Gameplay-/Bridge-Restpunkte sind dokumentiert, bevor `73.99` schliesst.

### Risiko-Register BT73

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Mehr Sensorik und Intent-Logik verlangsamt die Runtime-KI spuerbar | hoch | Runtime AI | Hotpaths in `*Ops.js` halten, Feature-Bundles messen und schwere Debug-Evidence auf Eval/Training begrenzen | Bot-Framezeit oder Tick-Latenz steigt deutlich |
| Ein zu harter Safety-Layer macht die Policy passiv und blockiert Lernen | hoch | RL | Safety zuerst nur fuer klar katastrophale Aktionen als Veto nutzen und ueber A/B-Lane kalibrieren | Survival verbessert sich nicht, obwohl Fehler sinken |
| Reward-Shaping optimiert auf Proxy-Werte statt auf echtes Ueberleben | hoch | RL | Rewards immer gegen `averageBotSurvival`, Death-Causes und feste Seed-/Mode-Matrix spiegeln | Hoher Reward bei schlechter Survival-Metrik |
| Resume-/Bridge-Fixes destabilisieren den Trainingsbetrieb kurzfristig | hoch | Trainer | Smoke-Tests fuer `checkpoint-load`, `latest`, Preview-Validate und Publish-Lane vor Langlaeufen verpflichtend machen | Training kann nicht deterministisch fortgesetzt werden |
| V72-Veraenderungen an Item-/Portal-/Gate-Vertraegen brechen Bot-Heuristiken | mittel | Gameplay + AI | Gemeinsame Capability-/Semantik-Quelle definieren und Cross-Plan-Abhaengigkeiten vor Merge pruefen | Bots reagieren falsch auf neue Items oder Portale |
| Mehr Failure-Codes und Decision-Trace-Artefakte ueberladen Reports und Operatorpfade | mittel | QA/Ops | Kompakte Summary plus gezielte Drilldown-Artefakte statt unstrukturierter Log-Flut | Reports wachsen, aber Entscheidungen werden nicht klarer |

---

## Block BT80C: Algorithmus-Ausbau, High-Util-Training und Champion-Rollout

Plan-Datei: `docs/plaene/neu/BT80C_Validierungs_und_Promotionshaertung_2026-04-03.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: BT80B.99 -->

Scope:

- BT80B-Haertung in Algorithmus-, Promotion-, Gate- und Hardwareprofilen fortziehen, ohne Temperatur-/Thermal-Guardrails weich zu machen.
- BT11 bleibt eingefrorener Champion; BT20 bleibt Challenger-/Referenzlauf.
- Validation-Harness und hardware-passende Kandidatenleiter vor neuen High-Util- oder Rollout-Schritten schliessen.
- Benchmark-Evidence bleibt nur innerhalb desselben Gameplay-/Observation-/Action-/Reward-/Validation-Semantikfensters gueltig.
- Repo-technische Haertung vorziehen, aber keine produktionsnahen Langlaeufe oder stillen Champion-Wechsel ohne frische Operator-Evidence anstossen.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 80.7 bis 80.99 sind abgeschlossen.
- [ ] DoD.2 Champion-/Challenger-/Ablation-Rollen sind hart verdrahtet; BT11 bleibt Champion und BT20 bleibt Referenz.
- [ ] DoD.3 Algorithmus-, Hardware-, Semantik- und Rollout-Vertraege sind als reproduzierbare Repo-Konfiguration dokumentiert.
- [ ] DoD.4 Validation-Harness, Kandidatenleiter und Operator-Runbooks sind fuer BT80C dokumentiert und belastbar.
- [ ] DoD.5 Trainingsnahe Tests sowie `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.

### 80.7 Lernalgorithmus, Ablationen und Champion-Challenger-Regeln

- [x] 80.7.1 Algorithmusprofile (`champion-stable`, `challenger-balanced`, `challenger-high-util`, `ablation-no-per`) definieren und bis in Trainer-/Replay-/Reward-/Exploration-Defaults verdrahten (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/trainer-v36-algorithm-profile.test.mjs` -> PASS)
- [x] 80.7.2 Challenger-/Ablation-/Reference-only-Rollen im Benchmark-Manifest und in der manuellen Promotion-Policy verankern, inklusive BT20-Blockade gegen Champion-Promotion (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-benchmark-artifacts.test.mjs` -> PASS)
- [ ] 80.7.3 Promotions-Evidence auf drei vollstaendige Kandidatenlaeufe derselben Lane und desselben Semantikfensters schaerfen; Median-Delta statt Einzelrun als Entscheidungsbasis dokumentieren

### 80.8 Hardware-, Util- und Langlaufprofile

- [x] 80.8.1 High-Util-Profile `overnight-high-util` und `marathon` mit harten Thermal-Ceilings statt reiner Beobachtung konfigurieren (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-benchmark-artifacts.test.mjs` -> PASS)
- [x] 80.8.2 Hardware-Telemetrie fuer extern gelieferte Temperaturdaten auswertbar machen, ohne produktionsnahe Langlaeufe fuer diese Repo-Haertung zu starten (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-benchmark-artifacts.test.mjs` -> PASS)
- [ ] 80.8.3 Kandidatenleiter `candidate-smoke -> candidate-benchmark -> operator-high-util` hardware-passend definieren und Operator-Runbooks fuer Start/Resume/Pause/Stop/Recovery daran ausrichten

### 80.9 Rollout-, Promotion-, Fallback- und Gate-Haertung

- [x] 80.9.1 `training-gate` um explizite Promotion-Entscheidung gegen den eingefrorenen BT11-Champion erweitern; synthetische und BT20-Referenzlaeufe bleiben geblockt (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-gate.test.mjs` -> PASS)
- [x] 80.9.2 `training-e2e` Dry-Run-Fallback so haerten, dass `write-latest=false` Validation-/Gate-Pfade sauber skippt statt false-positive Rot zu erzeugen (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-e2e.test.mjs` -> PASS)
Hinweis 2026-04-04 (V84-Folgeverbrauch): Die stabile Kandidaten-Validation fuer `80.9.3` soll denselben headless-faehigen Kernelpfad wie Replay und Training konsumieren (`MatchKernelTrainingAdapter` plus normalisierte Seed/Input/Snapshot-Huellen), nicht einen davon getrennten Preview-Sonderpfad.
- [ ] 80.9.3 `bot:validate` als harte Vorbedingung fuer BT80C-Kandidatenevidence stabilisieren; drei reproduzierbare Validation-Paesse auf fixer Matrix verlangen. Stand 2026-04-03: Der operative Runtime-Bruch im normalen Matchstart-/Session-Scope ist behoben; `preview` erreicht wieder `PLAYING` mit echten Match-Refs/Spielern. Die verbleibende Arbeit war zunaechst im Trainingsscope: Runner-/`training-e2e`-Haertung akzeptiert jetzt explizite BT-Validation-Budgets ohne Preview-Prebuild-Overhead, aber `V1` der festen Matrix terminiert selbst mit `preview-build=false` und `BOT_RUNNER_MATCH_TIMEOUT=150000` nicht natuerlich (`PLAYING`, alle 3 Spieler `alive`, `roundsRecorded=0`). Zusatzdiagnose 2026-04-03: Lokale Preview-Proben auf BT-nahe `classic-3d`-Varianten (`standard`, `maze`, `complex`, Portale 0-6, 2-3 Bots) bleiben ebenfalls nach 40-45s in `PLAYING` und liefern weiterhin `roundsRecorded=0`. Damit ist der Restblocker im BT-Scope sauber eingegrenzt, ein sauberer Fix deutet aber wieder auf normalen Runtime-/Session-Scope fuer deterministische Seed-/Startbedingungen oder bewusst geaenderte Gameplay-Terminalsemantik. Vor solchen Eingriffen ist User-Freigabe noetig; Intake-Entwurf: `docs/plaene/neu/BT80C_Classic3D_Validation_Natural_End_Overlap_2026-04-03.md`.
- [ ] 80.9.4 Benchmark-Reports um eindeutige Urteils- und Ursachenklassen (`promote/hold/rollback/diagnose`; `harness/runtime/algorithm/throughput/artifact`) schaerfen
- [ ] 80.9.5 Benchmark-Invalidierung bei Gameplay-/Observation-/Action-/Reward-/Validation-Semantikdrift explizit dokumentieren und im Prozess verankern

### 80.99 Abschluss-Gate

- [ ] 80.99.1 Kein Champion-Wechsel und kein High-Util-Operatorlauf ohne gruene Validation-Lane und drei vollstaendige Kandidatenlaeufe mit neuer Benchmark-Evidence; BT11 bleibt bis zu einer echten manuellen Promotion-Entscheidung Champion.
- [ ] 80.99.2 Abschluss-Checks, finale Doku-Synchronisierung, Runbooks und ehrliche Restpunkt-Dokumentation sind abgeschlossen.

### Checkpoint-Log BT80C

| Datum | Typ | Stamp | Zielbild | Evidence |
| --- | --- | --- | --- | --- |
| 2026-04-02 | Repo-Haertung | `BT80C_repo_20260402` | Algorithmusprofile, PER-Aktivierung, Thermal-Ceilings und manuelle Promotion-Policy sind ohne Langlaufstart im Repo verdrahtet | commit `37bfeb3`, `tests/trainer-v36-algorithm-profile.test.mjs`, `tests/training-benchmark-artifacts.test.mjs`, `tests/training-gate.test.mjs`, `tests/training-e2e.test.mjs` |
| 2026-04-03 | Plan-Nachschaerfung | `BT80C_plan_20260403` | Validation-Harness, Kandidatenleiter, Semantik-Freeze und Drei-Run-Promotionsregel sind vor weiteren BT80C-Operatorlaeufen priorisiert | `docs/plaene/neu/BT80C_Validierungs_und_Promotionshaertung_2026-04-03.md`, `docs/bot-training/Bot_Trainingsplan.md`, `docs/bot-training/Bot_Trainings_Roadmap.md` |
| 2026-04-03 | 80.9.3 Scope-Analyse | `BT80C_80_9_3_scope_20260403` | Validation-Harness laesst sich im Trainingsscope nicht endgueltig reparieren, weil `startMatch()` im normalen Runtime-Startpfad auf `Missing interactive match runtime` faellt; BT80C braucht dafuer erst einen separaten Spielscope-Block | `docs/plaene/neu/BT80C_Runtime_Startpfad_Validation_Ueberlauf_2026-04-03.md`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |
| 2026-04-03 | Runtime-Fix Rueckfluss | `BT80C_runtime_fix_20260403` | Der normale Matchstart-/Session-Pfad erreicht in `preview` wieder `PLAYING`; BT80C 80.9.3 ist damit zurueck im Trainingsscope und blockiert jetzt an natuerlichem Rundenabschluss statt an fehlender Runtime | `tmp/perf_phase28_5_lifecycle_trend.json`, `tmp/bt80c-repro-report.json`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |
| 2026-04-03 | Runner-/Timeout-Haertung | `BT80C_80_9_3_timeout_hardening_20260403` | `bot-validation-runner` akzeptiert jetzt CLI-Budgets; `training-e2e` kann BT-Validation-Profile samt laengerem Stage-Budget weiterreichen; `quick-benchmark` nutzt dafuer `preview-build=false`. V1 bleibt dennoch selbst bei `150000ms` Aktivbudget in `PLAYING` und haelt 80.9.3 weiter im BT-Scope offen. | `scripts/bot-validation-runner.mjs`, `scripts/training-e2e.mjs`, `src/state/training/TrainingBenchmarkProfiles.js`, `tmp/bt80c-debug-report-90s-nobuild.json`, `tmp/bt80c-debug-report-150s-nobuild.json`, `tmp/bt80c-cli-smoke.json`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |
| 2026-04-03 | Classic-3D Restdiagnose | `BT80C_80_9_3_classic3d_probe_20260403` | Nicht nur V1 `standard`, sondern auch BT-nahe `classic-3d`-Varianten (`maze`, `complex`, Portale 0-6, 2-3 Bots) bleiben im Validation-Pfad nach 40-45s in `PLAYING` bei `roundsRecorded=0`; fuer eine feste Lane fehlt damit vermutlich ein deterministischer Seed-/Starthebel ausserhalb des reinen BT-Harness. | `docs/plaene/neu/BT80C_Classic3D_Validation_Natural_End_Overlap_2026-04-03.md`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |

### Risiko-Register BT80C

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Prioritized Replay oder neue Challenger-Defaults destabilisieren Resume-Ketten | hoch | Trainer | Checkpoint-Contract unveraendert halten, PER nur ueber Profile aktivieren und per Unit-Test absichern | Resume oder Replay-Stats kippen nach Profilwechsel |
| Thermal-Ceilings bleiben folgenlos, wenn keine Temperaturquelle angeschlossen ist | mittel | Train-Ops | Externe Temperaturquelle ueber Telemetrie einspeisen; bis dahin Warning sichtbar halten und keine Marathon-Promotion freigeben | High-Util-Lauf ohne Temperaturwert |
| Manual-Promotion wird im Alltag als automatischer Rollout missverstanden | hoch | QA/Ops | Gate-Report explizit auf `manual-promotion-required` bzw. `hold-champion` pinnen | Gruener Gate-Lauf wird als automatischer Champion-Wechsel interpretiert |
| Validation-Harness bleibt wegen nicht terminierender Runden in der festen Matrix blockiert und blockiert vollstaendige BT80C-Evidence | hoch | QA/Ops | Runner-/E2E-Budgets reproduzierbar halten, Preview-Prebuild aus der Lane entfernen und den verbleibenden Matrix-/Round-End-Rest explizit als BT-Scope weiterbearbeiten | `bot:validate` bleibt trotz `PLAYING` bei allen Spielern `alive`, `roundsRecorded=0`, `forced-round` oder `timeout-round` |
| Stille Gameplay-/Observation-/Action-/Reward-Aenderungen machen Champion- und Kandidatenvergleiche ungueltig | hoch | Planung + Runtime | Semantik-Freeze dokumentieren; bei Drift neuen Benchmark-Freeze verlangen | alter Champion schlaegt/neuer Kandidat verliert nur wegen geaenderter Semantik |

---

## Geplante Folgeleiter: BT90 PPO-Zweitpfad

Diese Leiter integriert den Draft aus `docs/plaene/neu/BT90_GoldStandard/**` in kleine aktive BT-Bloecke.
Wichtig: Der Draft-Ordner bleibt Referenzmaterial; sobald einer dieser Bloecke geclaimt wird, laufen Lock, Evidence und Restpunktpflege ausschliesslich in diesem Master weiter.

| id | titel | status | prio | depends_on | current_phase | quelle |
| --- | --- | --- | --- | --- | --- | --- |
| BT90 | Python-Minimalbootstrap und Contract-Wahrheit | completed | P1 | V77.99,V91.99,V92.99 | 90.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` |
| BT91 | Python-Sidecar und 1-Worker-Headless-Lane | completed | P1 | BT90.99 | 91.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` |
| BT92 | Single-Env-Adapter und JS-authoritative Semantik | completed | P1 | BT91.99 | 92.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md` |
| BT93A | Mehr-Env-/Throughput-Harness ausserhalb der Runtime | active | P2 | BT92.99 | 93A.2 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md` |
| BT93B | Minimaler PPO-Baseline-Scaffold | planned | P2 | BT93A.99 | 93B.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` |
| BT93C | Konservative PPO-Baseline und Benchmark-Disziplin | planned | P2 | BT93B.99 | 93C.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` |
| BT94A | Candidate Freeze und Ablationen | planned | P2 | BT93C.99 | 94A.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md` |
| BT94B | Externe A/B-Evidence und Urteilsdisziplin | planned | P2 | BT94A.99 | 94B.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md` |
| BT95 | Integrations-Handoff und Rollout-Intake-Vorbereitung | planned | P3 | BT94B `promote` | 95.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md` |

## Block BT90: Python-Minimalbootstrap und Contract-Wahrheit

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Kleinsten reproduzierbaren Python-Bootstrap fuer den PPO-Zweitpfad festziehen.
- JS-authoritative Contract-Wahrheitsartefakte und Pflichtfelder fuer den `v1`-Pfad dokumentieren.
- Erlaubte PPO-Bauorte fuer den Startpfad auf `python/**` und `data/training/ppo/**` begrenzen.
- Read-only Runtime-, Matchstart- und AI-Hub-Grenzen fuer den Startpfad fest verankern.
- Contract- oder Runtime-Drift vor dem naechsten Claim explizit als Re-Audit-Blocker behandeln.

Ausdruecklich ausserhalb von BT90:

- kein Sidecar-Handshake
- keine 1-Worker-Lane
- kein Single-Env
- kein VecEnv
- keine PPO-Baseline

Authority-Snapshot:

- Referenz fuer `BT90` bis `BT92`: `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
- `V101` bleibt ein kontrolliertes Drift-Risiko statt harter Vorblocker: wenn `TrainingContractV1.js`, `TrainerPayloadAdapter.js`, `ObservationSchemaV2.js`, `BotActionContract.js`, `TrainingDomain.js`, `RuntimeNearObservationAdapter.js`, `HybridDecisionArchitecture.js` oder `EpisodeController.js` seit dem Snapshot driften, ist vor dem naechsten Claim ein Re-Audit Pflicht.

Pre-Claim-Freeze-Check 2026-04-22:

- Maschinenlesbarer Drift-Check: `python python/scripts/bt90_freeze_check.py` schreibt das lokale Artefakt `data/training/ppo/freeze_check.json` und vergleicht Authority-Viereck plus Adjacent-Dateien gegen den Snapshot-Commit `017e8edeb548cb64a164d8dc72d1d1cb3055cc93`.
- Nur Exit-Code `0` plus `freezeOk=true` zaehlen als gruene Freeze-Bestaetigung; Exit-Code `1` oder `reAuditRequired=true` blockieren den naechsten `BT90`- bis `BT92`-Claim bis zum Re-Audit.
- `V101` bleibt nur dann ein kontrolliertes Drift-Risiko, wenn dieser Check fuer die claim-relevanten Dateien gruen bleibt; seit `BTF-06` ist kein Monolith-`BT93` mehr claimbar, sondern nur noch der Folgepfad `BT93A -> BT93B -> BT93C`.
- `BT90`-Closure-Evidence fuer Freeze-, Contract- und Layer-Aussagen muss auf `python/scripts/bt90_freeze_check.py`, `data/training/ppo/freeze_check.json`, den Snapshot und konkrete Source-Queries zeigen; `git status` oder mutable README-Texte allein zaehlen dafuer nicht.

Erlaubte PPO-Bauorte:

- `python/**`
- `data/training/ppo/**`
- Boundary- und Sidecar-Orchestrierung unter Root-Skripten bleibt bis `BT91` ausserhalb dieses Blocks.

Read-only Runtime-Grenzen:

- `src/state/HeadlessMatchKernelRuntime.js`, `src/core/MatchKernelTrainingAdapter.js`, `src/entities/ai/training/TrainingTransportFacade.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`
- `src/entities/ai/ObservationBridgePolicy.js`, `src/core/RuntimeConfig.js`, `src/entities/ai/BotPolicyRegistry.js`, `src/entities/ai/BotPolicyTypes.js`
- `src/entities/ai/inference/LocalDqnInference.js`, `src/state/training/RewardCalculator.js`, `src/entities/ai/hybrid/HybridDecisionArchitecture.js`, `src/state/MatchSessionFactory.js`
- Wenn BT90 Schreibzugriffe auf diese Surfaces, neue Message-Typen oder neue Runtime-Schalter braucht, ist das kein Restpunkt, sondern ein Blocker fuer Re-Audit und Re-Schnitt.

### Definition of Done (DoD)

- [x] DoD.1 Python-Version, venv-Pfad und CPU-first Install-Minimum sind reproduzierbar dokumentiert. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path python/README.md -Pattern 'Python: `3\\.10\\+`|venv-Pfad: `python/\\.venv`|python -m venv python/\\.venv|python/requirements\\.txt'` -> Minimalbootstrap pinnt Version, venv und Install-Reihenfolge)
- [x] DoD.2 JS-Wahrheitsartefakte und Pflichtfelder fuer `TrainingContractV1`/`TrainerPayloadAdapter` sind fuer den PPO-Scope festgezogen. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Authority-Viereck|Pflichtfelder fuer BT90-BT92|TrainingContractV1.js|TrainerPayloadAdapter.js|ObservationSchemaV2.js|BotActionContract.js'` -> Snapshot pinnt Authority-Viereck + Pflichtfelder; `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|TrainingContractV1.js|TrainerPayloadAdapter.js|ObservationSchemaV2.js|BotActionContract.js'` -> Freeze-Artefakt referenziert dieselben Authority-Dateien)
- [x] DoD.3 Erlaubte PPO-Bauorte und read-only Runtime-Surfaces sind explizit dokumentiert. (abgeschlossen: 2026-04-22; evidence: `rg --files python data/training/ppo` -> PPO-Bauort ist konkret angelegt; `Select-String -Path docs/referenz/ai_architecture_context.md -Pattern 'HeadlessMatchKernelRuntime|MatchKernelTrainingAdapter|TrainingTransportFacade|WebSocketTrainerBridge|ObservationBridgePolicy|RuntimeConfig|BotPolicyRegistry|BotPolicyTypes|LocalDqnInference|RewardCalculator|HybridDecisionArchitecture|MatchSessionFactory'` -> Layer-Referenz pinnt die read-only Surfaces)
- [x] DoD.4 Contract-/Runtime-Drift ist als Blocker-Regel festgezogen; Sidecar-, Worker-, Env- und PPO-Baseline-Scope bleiben explizit ausserhalb von BT90. (abgeschlossen: 2026-04-22; evidence: `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (Exit-Code `1`); `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|driftCount|reAuditRequired|TrainingDomain.js|RuntimeNearObservationAdapter.js|HybridDecisionArchitecture.js'` -> Freeze-Artefakt erzwingt Re-Audit statt stiller Drift-Anpassung)
- [x] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-22; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)

### 90.1 Python-Minimalbootstrap

- [x] 90.1.1 Python-Version, venv-Pfad und Install-Reihenfolge fuer den Minimalstack dokumentieren. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path python/README.md -Pattern 'Python: `3\\.10\\+`|venv-Pfad: `python/\\.venv`|python -m venv python/\\.venv|python/requirements\\.txt'` -> Minimalbootstrap pinnt Version, venv und Install-Reihenfolge)
- [x] 90.1.2 Nur fuer Contract-Smokes noetige Dependencies pinnen; schwere PPO-Libs nicht vorschnell in den Startblock ziehen. (abgeschlossen: 2026-04-22; evidence: `Get-Content python/requirements.txt` -> BT90-Minimalstack ist konkret gepinnt; `rg -n 'stable-baselines3|torch|tensorboard' python/requirements.txt` -> keine Treffer fuer schwere PPO-Libs)
- [x] 90.1.3 Artefaktpfade unter `python/**` und `data/training/ppo/**` fuer den Startblock festlegen; Root-Boundary-Skripte bleiben bis BT91 ausserhalb. (abgeschlossen: 2026-04-22; evidence: `rg --files python data/training/ppo` -> reservierte Python-/Artefaktpfade sind konkret angelegt; `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'Boundary- und Sidecar-Orchestrierung unter Root-Skripten bleibt bis `BT91` ausserhalb dieses Blocks.'` -> Root-Boundary-Skripte bleiben ausserhalb von BT90)

### 90.2 Contract- und Layer-Wahrheit

- [x] 90.2.1 `tests/training-environment.contract.test.mjs`, `scripts/training-smoke.mjs` und `scripts/headless-match-kernel-smoke.mjs` als JS-authoritative Wahrheitsbasis auswerten. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Stabilisierende Evidenz fuer den Snapshot|tests/training-environment.contract.test.mjs|scripts/training-smoke.mjs|scripts/headless-match-kernel-smoke.mjs'` -> Snapshot pinnt die JS-authoritative Wahrheitsbasis)
- [x] 90.2.2 Pflichtfelder fuer `TrainingContractV1` und `TrainerPayloadAdapter` dokumentieren (`observationSchemaVersion`, `observationLength`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision` soweit transportiert). (abgeschlossen: 2026-04-22; evidence: `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Pflichtfelder fuer BT90-BT92|observationSchemaVersion|observationLength|rewardBreakdown|terminalReason|truncatedReason|hybridDecision'` -> Snapshot pinnt Pflichtfelder fuer BT90-BT92; `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|TrainingContractV1.js|TrainerPayloadAdapter.js'` -> Freeze-Artefakt verankert die zugehoerigen Authority-Dateien gegen den Snapshot-Commit)
- [x] 90.2.3 Read-only-Surfaces und erlaubte Bauorte fuer den PPO-Zweitpfad explizit abgrenzen. (abgeschlossen: 2026-04-22; evidence: `rg --files python data/training/ppo` -> reservierte PPO-Bauorte sind konkret angelegt; `Select-String -Path docs/referenz/ai_architecture_context.md -Pattern 'HeadlessMatchKernelRuntime|MatchKernelTrainingAdapter|TrainingTransportFacade|WebSocketTrainerBridge|ObservationBridgePolicy|RuntimeConfig|BotPolicyRegistry|BotPolicyTypes|LocalDqnInference|RewardCalculator|HybridDecisionArchitecture|MatchSessionFactory'` -> Layer-Referenz pinnt die read-only Runtime-Surfaces)
- [x] 90.2.4 Runtime- oder Contract-Drift als Blocker markieren; Sidecar-, Worker-, Single-Env-, VecEnv- und PPO-Baseline-Scope explizit ausserhalb von BT90 halten. (abgeschlossen: 2026-04-22; evidence: `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (Exit-Code `1`); `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|driftCount|reAuditRequired|TrainingDomain.js|RuntimeNearObservationAdapter.js|HybridDecisionArchitecture.js'` -> Freeze-Artefakt erzwingt Re-Audit und kapselt Drift nicht still)

### 90.99 Abschluss-Gate

- [x] 90.99.1 Alle Phasen 90.1 bis 90.2 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-22; evidence: BT90.1-BT90.2 Evidence + `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)
- [x] 90.99.2 Minimal-Bootstrap, Contract-Wahrheit, Bauort-/Runtime-Grenzen und Drift-Blocker sind belastbar an BT91 uebergeben. (abgeschlossen: 2026-04-22; evidence: `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (Exit-Code `1`); `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Maschinenlesbarer Freeze-Check|Harte Blocker-Signale'` -> Handover ist an Snapshot + Freeze-Gate statt an README-/`git status`-Aussagen gekoppelt)

BT90-Abschlussstand 2026-04-22:

- Closure-Checks sind gruen: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- BT90-Handover-Evidence ist auf Snapshot + Freeze-Artefakt umgestellt: `data/training/ppo/freeze_check.json` meldet aktuell `driftCount=3` und `reAuditRequired=true` fuer `TrainingDomain.js`, `RuntimeNearObservationAdapter.js` und `HybridDecisionArchitecture.js`; vor dem naechsten `BT90`- bis `BT92`-Claim ist daher Re-Audit Pflicht.
- BT90-Lock ist freigegeben; fuer neue `BT90`- bis `BT92`-Claims zaehlt jetzt der Freeze-/Artefaktpfad statt README-/`git status`-Evidence.

### Risiko-Register BT90

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Schwere PPO-/Torch-Abhaengigkeiten werden zu frueh in den Bootstrap gezogen | hoch | Governance | BT90 nur mit Minimalstack schliessen; volle PPO-Libs erst in Folgeblocks erzwingen | Diskussion dreht sich vor dem Contract-Smoke um CUDA/SB3/Torch |
| Contract-Wahrheit driftet zwischen Testartefakten, Payload und Dokumentation | hoch | Integration | echte JS-Artefakte als primaere Quelle festschreiben; Mismatch als Blocker fuehren | Pflichtfelder oder Versionsangaben widersprechen sich |
| PPO-Pfad greift frueh in produktive Runtime-Surfaces ein | hoch | Architektur | read-only-Liste und Layer-Leitplanken vor Claim festhalten | Wunsch nach Runtime-Schaltern, Bot-Typen oder Matchstart-Abkuerzungen |
| Verdeckte Scope-Ausweitung zieht Sidecar-, Worker- oder Env-Arbeit wieder in BT90 | hoch | Planung | Ausschlussliste im Block fixieren; BT91 und BT92 getrennt claimbar halten | BT90-Diskussion fordert `trainer-ready`, 100 Steps, Single-Env oder PPO-Baseline |
| Repo-Drift oder spaetere Ignore-Aenderungen verstecken versionierte PPO-Manifeste wieder | mittel | Repo-Governance | `.gitignore`-Ausnahme fuer `data/training/ppo/**` beibehalten und PPO-Evidence nur unter diesem Unterpfad versionieren | neuer PPO-Claim legt versionierbare Artefakte ausserhalb von `data/training/ppo/**` ab |

---

## Block BT91: Python-Sidecar und deterministische 1-Worker-Headless-Lane

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Python-Sidecar ueber den bestehenden Contract `v1` bzw. Bridge-V1-Vertrag anschliessen.
- Deterministische 1-Worker-Headless-Lane mit mindestens 100 Steps beweisen.
- Kleine Boot-/Reset-/Step-Baseline nur fuer diese Lane als Handover fuer BT92 dokumentieren.

Quellzuschnitt:

- `BT91` uebernimmt aus `BT100` ausschliesslich `100.3` bis `100.5`.
- `BT92` behaelt `BT101.1` bis `BT101.3`; Mehr-Env-/VecEnv-Folgepfad aus `BT101.4` bis `BT101.6` und PPO-Arbeit aus `BT102` oeffnen erst als `BT93A` bis `BT93C`.

Authority-Snapshot:

- `BT91` arbeitet weiter gegen `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`.
- Wenn `TrainingContractV1.js`, `TrainerPayloadAdapter.js`, `ObservationSchemaV2.js`, `BotActionContract.js` oder die markierten Adjacent-Dateien relevant driften, ist vor dem naechsten `BT91`-Claim ein Re-Audit Pflicht.

Explizit ausserhalb von BT91:

- 2-Worker- oder 4-Worker-Arbeit
- Mehr-Env- oder VecEnv-Themen
- PPO-Baseline oder Throughput-/Skalierungsversprechen

### Definition of Done (DoD)

- [x] DoD.1 Der Python-Sidecar sendet `trainer-ready` stabil und liest `bot-action-request`, `training-reset`, `training-step` und `trainer-stats-request` ohne neue Message-Typen. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`readyPayload.type=trainer-ready`, `messageCounts.bot-action-request=100`, `training-reset=1`, `training-step=100`, `trainer-stats-request=1`))
- [x] DoD.2 Eine deterministische 1-Worker-Lane liefert mindestens 100 Steps ueber den bestehenden Headless-/Transportpfad. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/lane_baseline.json` (`workerCount=1`, `stepsCompleted=100`, `deterministic=true`))
- [x] DoD.3 Boot-, Reset- und mittlere Step-Latenz sind fuer diese eine Lane als Artefakt dokumentiert. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/lane_baseline.json` (`boot=279.554ms`, `resetAck=13.679ms`, `trainingStepAck.average=14.255ms`))
- [x] DoD.4 Keine produktive Runtime-, Matchstart- oder AI-Hub-Datei wurde angepasst. (abgeschlossen: 2026-04-22; evidence: BT91-Diff bleibt in `python/**`, `data/training/ppo/**`, `scripts/training-headless-bridge-smoke.mjs` und `docs/bot-training/Bot_Trainingsplan.md` -> boundary-only BT91-Bauorte)
- [x] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-22; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)

### 91.1 Sidecar-Handshake und Contract-Smoke

- [x] 91.1.1 Python-Sidecar sendet `trainer-ready` reproduzierbar ueber den bestehenden Transportrahmen. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`readyPayload.type=trainer-ready`, `protocolVersion=bt91-bridge-v1`))
- [x] 91.1.2 Sidecar liest `bot-action-request`, `training-reset`, `training-step` und `trainer-stats-request` ohne neue Envelope- oder Message-Typen. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`messageCounts.bot-action-request=100`, `training-reset=1`, `training-step=100`, `trainer-stats-request=1`))
- [x] 91.1.3 Payload-Validierung erfolgt gegen `TrainingContractV1` und reale JS-Artefakte, nicht gegen eine freie Python-Spezifikation. (abgeschlossen: 2026-04-22; evidence: `python\\.venv\\Scripts\\python.exe -m pytest python\\tests\\test_contract_v1.py -q` -> `3 passed in 0.38s`; `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`validationFailures=0`))

### 91.2 1-Worker-Lane und Baseline

- [x] 91.2.1 Boundary-Harness oder gleichwertiger PoC-Pfad startet genau einen Worker ausserhalb des produktiven Runtime-Pfads. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `scripts/training-headless-bridge-smoke.mjs`, `data/training/ppo/lane_baseline.json` (`workerCount=1`))
- [x] 91.2.2 Die Lane liefert mindestens 100 deterministische Steps ueber `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` und `TrainingTransportFacade`. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json`, `data/training/ppo/lane_baseline.json` (`headlessRuntimeContractVersion=match-kernel-headless-runtime.v1`, `trainingAdapterContractVersion=match-kernel-training-adapter.v1`, `stepsCompleted=100`))
- [x] 91.2.3 Boot-, Reset- und Step-Latenz werden fuer diese eine Lane dokumentiert; 2- und 4-Worker, Mehr-Env-/VecEnv-Themen und PPO-Baseline bleiben bewusst ausserhalb von BT91. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/lane_baseline.json` (`boot=279.554ms`, `resetAck=13.679ms`, `trainingStepAck.average=14.255ms`); Boundary-Notes pinnen `workerCount=1` und halten 2-/4-Worker, Mehr-Env, VecEnv und PPO-Baseline explizit ausserhalb)

### 91.99 Abschluss-Gate

- [x] 91.99.1 Alle Phasen 91.1 bis 91.2 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-22; evidence: BT91.1-BT91.2 Evidence + `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)
- [x] 91.99.2 Sidecar-Handshake, Contract-Smoke und 1-Worker-Lane sind belastbar an BT92 uebergeben. (abgeschlossen: 2026-04-22; evidence: `data/training/ppo/contract_smoke.json`, `data/training/ppo/lane_baseline.json`, `python/README.md` -> BT92-Handover mit `workerCount=1`, `stepsCompleted=100` und dokumentierten Latenzen)

BT91-Abschlussstand 2026-04-22:

- Closure-Checks sind gruen: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Lokale BT91-Artefakte liegen im aktuellen Worktree unter `data/training/ppo/contract_smoke.json` und `data/training/ppo/lane_baseline.json`; `git status` fuehrt sie derzeit noch untracked; der Sidecar validiert gegen den eingefrorenen JS-authoritative `v1`-Pfad ohne neue Message-Typen
- Der Boundary-Harness bleibt bewusst ausserhalb produktiver Runtime-Surfaces; 2-/4-Worker, Mehr-Env und VecEnv bleiben fuer `BT93A` offen, PPO-Scaffold und Baseline erst fuer `BT93B`/`BT93C`

BTF-09-Nachschreibung 2026-04-23 (Failure-Klasse `contract_smoke.json`):

- `contract_smoke.json` weist `failures=4` und `lastFailure=socket-closed` aus; der Plan hatte diese Werte beim BT91-Abschluss nicht explizit eingeordnet.
- Fachliche Einordnung: Klasse **shutdown-teardown / akzeptiert**. Die 4 `socket-closed`-Events entstehen beim sauberen Shutdown des Headless-Harness nach Episode-Limit (`truncated=true` bei Step 100). Der Bridge-Transportzaehler registriert den unilateralen Socket-Close als `failure`, weil noch wenige ACK-Slots im Drain-Zustand sind.
- Beleg fuer keine mid-run Instabilitaet: `requestsSent (202) == responsesReceived (202)`; `retries=0`; `timeouts=0`; `fallbacks=0`; `backpressureDrops=0`; `ackEvictions=0`; `validationFailures=0`; `stepsCompleted=100`; `finalStep.delivered=true`.
- Monitoring-Regel fuer BT93A: `failures`-Zaehler pro Worker separat erfassen; akzeptierte Grenzwerte: `failures < 2*workerCount*5 AND retries=0 AND timeouts=0 AND requestsSent=responsesReceived`. Wenn ein Folgelauf `retries > 0` oder `timeouts > 0` zeigt, ist ein Transport-Re-Audit Pflicht.
- Vollstaendige Failure-Klassen-Analyse: `data/training/ppo/bt91_failure_class_btf09.json`.

### Risiko-Register BT91

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Der Sidecar missversteht den Bridge-V1-Payload | hoch | Integration | Validierung gegen reale Transportartefakte und Pflichtfelder aus BT90 | `missing-action`, Feldmismatch oder unerwartete Envelopes |
| Schon die 1-Worker-Lane ist bei Boot/Reset/Step instabil | hoch | Train-Ops | strikt nur eine Lane, feste Seeds und kleine 100-Step-Basis | PoC haengt, driftet oder bleibt unter 100 Steps |
| Root-Harness und Boundary-Skripte wachsen in produktive Orchestrierung hinein | mittel | Governance | nur nichtproduktive Boundary-Skripte ausserhalb der Runtime zulassen | neue Root-Surfaces oder Runtime-Schalter werden noetig |

---

## Block BT92: Single-Env-Adapter und JS-authoritative Semantik

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Observation-/Action-Authority gegen die echten runtime-near Artefakte absichern.
- Genau ein headless `gymnasium.Env` fuer `reset()`, `step()` und `close()` ueber den bestehenden Pfad bauen.
- Reward-, `done`-, `truncated`- und Info-Semantik aus JS authoritative uebernehmen.
- `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` im Single-Env-Pfad sichtbar machen.
- Die BT92-Action-Surface bleibt die rohe JS-authoritative Bool-/Index-Semantik; die feste `257`er-Indexbreite in `CurviosEnv` ist Boundary-Kompatibilitaet und noch keine PPO-Policy-Surface.

Authority-Snapshot:

- BT92 arbeitet gegen denselben Freeze aus `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`.
- Nach relevanten `V101`- oder Repo-Aenderungen an Authority- oder Adjacent-Dateien ist `92.1` vor dem Claim neu zu bestaetigen; ohne frischen Abgleich gilt das als Blocker, nicht als kleiner Restpunkt.

Explizit ausserhalb von BT92:

- Mehr-Env
- VecEnv
- PPO-Baseline
- Parallelisierungs- oder Throughput-Versprechen

### Definition of Done (DoD)

- [x] DoD.1 Observation- und Action-Authority sind gegen `TrainerPayloadAdapter`, `TrainingContractV1`, `ObservationSchemaV2` und `BotActionContract` explizit validiert. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`authority`, `scope`), Freeze-Abgleich ohne BT92-relevanten Drift)
- [x] DoD.2 Ein Single-Env-Headless-Pfad laeuft stabil fuer `reset()`, `step()` und `close()`. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe -m pytest python/tests` -> `6 passed`; `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json`)
- [x] DoD.3 `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` werden JS-authoritative und sichtbar durchgereicht. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`visibleEnvFields`, `smoke.steps[*]`))
- [x] DoD.4 Mehr-Env-, VecEnv-, PPO-Baseline- und Parallelisierungs-Themen bleiben explizit ausserhalb von BT92.99. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`scope.multiEnv=false`, `vecEnv=false`, `ppoBaseline=false`))
- [x] DoD.5 Keine produktive Runtime-, Matchstart- oder AI-Hub-Datei wurde angepasst. (abgeschlossen: 2026-04-23; evidence: BT92-Arbeit bleibt in `python/**`, `data/training/ppo/**`, `scripts/training-single-env-bridge.mjs` und `docs/bot-training/Bot_Trainingsplan.md`; produktive Runtime-Surfaces bleiben read-only)
- [x] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-23; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)

### 92.1 Observation-/Action-Authority

- [x] 92.1.1 Reale Payload-Felder aus `TrainerPayloadAdapter` und `TrainingContractV1` als Pflichtliste fuer den Single-Env-Pfad erfassen. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`authority.trainerTransitionTopLevelFields`, `authority.trainerTransitionInfoFields`))
- [x] 92.1.2 `observationSchemaVersion` und `observationLength` fuer den aktuellen V2-Pfad festziehen; Drift als Blocker markieren statt still zu kapseln. (abgeschlossen: 2026-04-23; evidence: Freeze-Abgleich gegen `TrainingContractV1.js`, `TrainerPayloadAdapter.js`, `ObservationSchemaV2.js`, `BotActionContract.js`, `TrainingDomain.js`, `RuntimeNearObservationAdapter.js`, `HybridDecisionArchitecture.js`, `EpisodeController.js` -> kein BT92-relevanter Drift; `data/training/ppo/single_env_smoke.json` zeigt `v2-runtime-near` und `64`)
- [x] 92.1.3 Action-Mapping gegen `BotActionContract.js` absichern, inklusive `useItem`, Clamping und Invalid-Handling. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe -m pytest python/tests` -> `6 passed`; `data/training/ppo/single_env_smoke.json` zeigt invalides `shootItem`/Index-Payload neutralisiert zu `shootItem=false`, `shootItemIndex=-1`, `useItem=-1`)

### 92.2 Single-Env-Lifecycle und JS-Semantik

- [x] 92.2.1 `CurviosEnv` oder gleichwertiges Env fuer genau einen Lifecycle anlegen und `reset()`, `step()` sowie `close()` ueber den bestehenden Headless-Pfad verdrahten. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe -m pytest python/tests/test_curvios_env.py` -> `2 passed`; `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json`)
- [x] 92.2.2 `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` im Env-/Info-Pfad sichtbar machen oder Restluecken explizit benennen. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`visibleEnvFields`, `smoke.reset`, `smoke.steps[*]`))
- [x] 92.2.3 `check_env(...)` oder gleichwertige Compliance plus echter Reset-/Step-Smoke laufen auf einem instanziierten Single-Env; Parallelisierung bleibt dabei bewusst ausserhalb. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`checkEnv.passed=true`, `finalTruncatedReason=max-steps`))

### 92.99 Abschluss-Gate

- [x] 92.99.1 Alle Phasen 92.1 bis 92.2 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-23; evidence: BT92.1-BT92.2 Evidence + `data/training/ppo/single_env_smoke.json`)
- [x] 92.99.2 Observation-/Action-Authority, Single-Env-Lifecycle und JS-authoritative Semantik sind belastbar an `BT93A` uebergeben; PPO-Scaffold, konservative Baseline und Parallelisierung bleiben bewusst offen fuer `BT93B`/`BT93C`. (abgeschlossen: 2026-04-23; evidence: `data/training/ppo/single_env_smoke.json`, `python/README.md`, `python/envs/README.md` -> Handover bleibt auf den kleinsten Folgepfad `BT93A -> BT93B -> BT93C` begrenzt)

BT92-Abschlussstand 2026-04-23:

- Closure-Checks sind gruen: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Das BT92-Artefakt `data/training/ppo/single_env_smoke.json` liegt aktuell nur als lokale Worktree-Datei vor; `git status` fuehrt es derzeit noch untracked; der Single-Env bleibt bei genau einem Headless-/Bridge-v1-Lifecycle mit sichtbaren JS-authoritativen Semantikfeldern
- BTF-07-Festlegung: spaetere PPO-Claims trainieren nicht direkt auf der rohen `257`er-Indexbreite. `BT93B` muss einen `Split-Head` fuer Bool-/Intent-Felder plus `shootItemIndex`/`useItem` pinnen; eine `Action-Mask` aus `inventoryLength` bleibt optionales Hilfssignal, der Sanitizer nur Boundary-Guardrail.
- Mehr-Env, VecEnv, PPO-Scaffold, konservative Baseline und Parallelisierung bleiben unveraendert offen fuer `BT93A` bis `BT93C`

### Risiko-Register BT92

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Observation-, Schema- und Action-Authority driftet zwischen Payload, Schema und Sanitizer | hoch | Integration | Autoritaetsdreieck aus `TrainerPayloadAdapter`, `TrainingContractV1`, `ObservationSchemaV2` und `BotActionContract` hart pinnen | Shape-Mismatch, falsche `useItem`-Semantik oder unbekannte Length |
| Python interpretiert Reward- oder Episode-Semantik neu statt sie nur zu adaptieren | hoch | Governance | JS als einzige fachliche Quelle festschreiben; fehlende Felder sichtbar machen | Reward-Neuberechnung oder Python-seitige `done`-/`truncated`-Logik |
| Mehr-Env-/VecEnv-, PPO- oder Parallelisierungsdruck zieht wieder in den Minimalblock hinein | mittel | Planung | `BT93A` als separaten Harness-Block sichtbar halten und `BT93B`/`BT93C` erst danach oeffnen; keine Throughput-Ziele in BT92 versprechen | Closure-Diskussion fordert schon Parallelisierung, PPO-Baseline oder Throughput-Ziele |

---

## Block BT93A: Mehr-Env-/Throughput-Harness ausserhalb der Runtime

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- `2-Env` ist die kleinste claimbare Mehr-Env-Lane; `4-Env` bleibt ausdruecklicher Downgrade-Kandidat statt stiller Zielwert.
- Der Block liefert nur Harness-, Throughput-, Timeout- und Failure-Evidence ausserhalb der produktiven Runtime.
- Kein `python/train.py`, kein `python/eval.py`, kein Champion-/Baseline-Urteil in demselben Claim.

Bekannte Harness-Duplikation (BTF-11, dokumentiert 2026-04-23):

- `HeadlessLaneStepRunner` existiert byte-identisch in `scripts/training-headless-bridge-smoke.mjs` (L151) und `scripts/training-single-env-bridge.mjs` (L134); einzige Abweichungen: `episodeId`-Prefix und Reset-Signatur.
- `DeterministicTrainingStepRunner` (`src/entities/ai/training/DeterministicTrainingStepRunner.js`) ist die kanonische Abstraktion, ist aber kein Drop-in-Ersatz: die API erwartet fertige Observation-Arrays statt des internen Session-Aufbaus.
- Entscheidung: Die Duplikation bleibt als stabile Boundary-Ausnahme bis `BT93A`; Konsolidierung (Extraktion einer gemeinsamen Datei oder API-Anpassung) wird als `BT93A.refactor-harness` geoeffnet und erst dann angegangen, wenn der BT93A-Harness konkret wird.

Claim-Grenze:

- `BT93A` ist erst claimbar, wenn `BT92.99` gruen ist, `python python/scripts/bt90_freeze_check.py` mit `freezeOk=true` endet, der Follow-up-Tracker `BTF-01` bis `BTF-08` gruen fuehrt und der Throughput-Anker aus `data/training/ppo/throughput_analysis_btf08.json` als Startbasis vorliegt.
- Die Claim-Freigabe oeffnet nur Harness-/Lane-Arbeit; PPO-Scaffold und echte Baseline bleiben ausserhalb.

Throughput-Anker (BTF-08, abgeleitet aus `data/training/ppo/lane_baseline.json` 2026-04-22):

- 1-Worker-Baseline: `action.average=14.9ms`, `trainingStepAckAvg=14.3ms`, Roundtrip ~`29ms` → max. ~`34 Steps/s` theoretisch, realistisch ~`28 Steps/s` unter Windows.
- 2-Worker-Projektion: `30-55 Steps/s` je nach Subproc-Overhead – NUR ein Projektion; echte Zahl kommt aus dem Harness-Artefakt `data/training/ppo/lane_baseline_2env.json`.
- 4-Worker-Projektion: `40-90 Steps/s` – nur freigegeben wenn 2-Env-Harness >= 45 Steps/s UND failure_rate <= 0.02.
- Smoke-Budget `2-Env`: 100 Steps/Env; Harness-Budget: 500 Steps/Env max. 10 Minuten Wall-Clock.
- Downgrade-Trigger: failure_rate > 0.05 OR Step-Rate unter 1-Worker-Baseline OR Worker-Churn.
- BT93C-Referenzlauf-Budget: erst ableiten wenn BT93A-Harness-Artefakt vorliegt; Draft-Zahlen (z.B. 300k Steps, 4 Envs) zaehlen nicht.
- Vollstaendige Downgrade-Regeln und Budget-Derivation: `data/training/ppo/throughput_analysis_btf08.json`.

### Definition of Done (DoD)

- [ ] DoD.1 Mindestens eine artefaktbasierte `2-Env`-Lane ist ausserhalb der produktiven Runtime dokumentiert.
- [ ] DoD.2 Wall-Clock-Throughput, Reset-/Timeout-Rate, Restart-Verhalten und Failure-Klassen sind fuer `2-Env` reproduzierbar festgehalten.
- [ ] DoD.3 `4-Env` ist nur bei tragender Evidence freigegeben (>= 45 Steps/s bei 2-Env UND failure_rate <= 0.02), sonst explizit als Downgrade ausgeschlossen.
- [ ] DoD.4 `BT93A` oeffnet weder `python/train.py`/`python/eval.py` noch eine echte PPO-Baseline.
- [ ] DoD.5 Der Handover-Artefakt pinnt die gemessene Step-Rate, Env-Anzahl und Downgrade-Entscheid artefaktbasiert als Pflichteingang fuer `BT93B`.
- [ ] DoD.6 Die in BTF-11 identifizierte Code-Duplikation ist aufgeloest und die Trainingslogik konsolidiert.
- [ ] DoD.7 Die PPO-Batch-Size Mathematik ist zwingend aus dem gemessenen Throughput herzuleiten, um realistische Update-Frequenzen nachzuweisen [siehe PPO-ADR-001].
- [ ] DoD.8 Die Überwachung auf Memory-Leaks während der Smoke-Runs ist als hartes Kriterium integriert [siehe PPO-ADR-003].
- [ ] DoD.9 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 93A.1 Harness-Scope und Lane-Start

- [x] 93A.1.1 Start erst nach gruener BT92-Single-Env-Lage, gruener Freeze-Bestaetigung, BTF-08-gruen und explizitem Split-Handover; der Block bleibt ausserhalb jeder PPO-Baseline-Arbeit. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_claim_manifest.py` -> `data/training/ppo/bt93a_claim_manifest.json` (`ok=true`, `nextSubPhase=93A.1.2`))
- [x] 93A.1.2 `2-Env` ist die kleinste Mehr-Env-Lane; Prozesse, Ports, Timeouts, Restart-Verhalten und Boundary-Grenzen werden artefaktbasiert dokumentiert, mit dem 1-Worker-Throughput-Anker aus `data/training/ppo/throughput_analysis_btf08.json` als Vergleichsbasis. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`workerCount=2`, `controllerTimeoutSeconds=30.0`))
- [x] 93A.1.3 `4-Env` wird nur als optionaler Folgefall mit ehrlichem Downgrade geoeffnet; formale Imports, Draft-Zahlen oder Wunschzahlen zaehlen nicht als Lane-Nachweis. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`fourEnvPolicy.defaultStatus=locked-until-measured-2env-evidence`, `nextPhase=93A.1.4`))
- [x] 93A.1.4 Mathematische Herleitung der machbaren PPO-Batch-Size aus dem gemessenen Throughput dokumentieren [siehe PPO-ADR-001]. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`batchMath.examples` fuer `15s`, `30s`, `60s`; `nextPhase=93A.2`))

### 93A.2 Throughput-, Timeout- und Failure-Artefakte

- [x] 93A.2.1 Mehr-Env-/VecEnv-Smokes liefern reproduzierbare Daten zu Env-Anzahl, Wall-Clock-Throughput, Reset-/Timeout-Rate und Failure-Klassen; Ergebnis unter `data/training/ppo/lane_baseline_2env.json` (oder gleichwertigem Artefakt). (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json` (`stepsPerSecond=60.24846827863641`, `resetRatePerEnv=1.0`, `timeoutRatePerRequest=0.0`, `truncatedReasons.max-steps=2`))
- [x] 93A.2.2 Python-seitiges Memory-Usage-Tracking implementieren und auf Memory-Leaks bei laengeren Smoke-Runs ueberpruefen [siehe PPO-ADR-003]. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json` (`memory.leakCheck.memoryStable=true`, `memory.pythonProcess.rssMB.deltaMB=4.785`, `memory.tracemalloc.currentMB.deltaMB=1.13`, `memory.controllerProcesses.cleanupSettled=true`))
- [x] 93A.2.3 Der Handover an den PPO-Scaffold pinnt gemessene Step-Rate, zulassige Env-Anzahl und harte Downgrade-Regeln aus dem Harness-Artefakt statt aus textuellen Annahmen. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --handover-only` -> `data/training/ppo/bt93a_handover_2env.json` (`defaultStartEnvCount=2`, `measuredLane.stepsPerSecond=59.347422348627816`, `scaffoldContract.fourEnvStatus=eligible-from-2env-thresholds-not-yet-measured`))
- [ ] 93A.2.4 Offene Harness-Risiken bleiben sichtbar; fehlende `4-Env`-Tragfaehigkeit gilt als dokumentierter Restpunkt statt als stiller Erfolg; sequenzielle Fallback-Lane als Alternative pinnen wenn Subproc instabil.

### 93A.3 Harness-Konsolidierung (BTF-11)

- [ ] 93A.3.1 Die in BTF-11 als Boundary-Ausnahme dokumentierte Duplikation des `HeadlessLaneStepRunner` zwischen `smoke.mjs` und `single-env-bridge.mjs` aufloesen.
- [ ] 93A.3.2 Gemeinsame Trainingslogik konsolidieren, sobald der `2-Env` Harness in 93A.2 konkret steht.

### 93A.99 Abschluss-Gate

- [ ] 93A.99.1 Alle Phasen 93A.1 bis 93A.3 sind mit Evidence dokumentiert.
- [ ] 93A.99.2 Es existiert mindestens eine stabile `2-Env`-Lane mit gemessenem Throughput-Artefakt; `4-Env` ist nur bei tragender Evidenz freigegeben (Schwelle: >= 45 Steps/s, failure_rate <= 0.02), sonst explizit als Downgrade ausgeschlossen.

### Risiko-Register BT93A

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Windows-/Subproc- oder Worker-Churn destabilisiert Mehr-Env-Laeufe | hoch | Train-Ops | erst `2-Env` auf 500-Step-Basis; sequenzielle Fallback-Lane dokumentieren; 4-Env erst ab 45 Steps/s-Schwelle | Worker starten oder beenden nicht deterministisch |
| Headless-Throughput reicht noch nicht fuer claimbare Folgeschritte | hoch | Performance | Downgrade-Regeln aus `throughput_analysis_btf08.json` verbindlich; kein BT93B ohne artefaktbasiertes Handover | 2-Env Step-Rate liegt unter 1-Worker-Baseline (~28 Steps/s) |
| Boundary-Harness driftet gegen den JS-Trainingspfad | mittel | Planung | Handover auf kleinste Boundary-Grenze beschraenken und Restpunkte explizit halten | Harness kapselt immer mehr Episode-/Reward-/Policy-Logik lokal |

---

## Block BT93B: Minimaler PPO-Baseline-Scaffold

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Der Block liefert nur das minimale PPO-Grundgeruest: `python/train.py`, `python/eval.py`, Config-/Callback-Struktur, Run-Manifest sowie Smoke-/Resume-Kette.
- Budgets, Env-Anzahl und Eval-Takte werden strikt aus `BT93A`-Artefakten abgeleitet.
- Die PPO-Action-Surface wird dort explizit als `Split-Head` ueber der BT92-Boundary gepinnt: Bool-/Intent-Felder getrennt von `shootItemIndex` und `useItem`; keine Policy lernt direkt auf der rohen `257`er-Indexbreite aus `CurviosEnv`.
- Kein voller Referenzlauf, kein DQN-Urteil und kein BT94A-Handover in demselben Claim.

Claim-Grenze:

- `BT93B` ist erst claimbar, wenn `BT93A.99` gruen ist und der Handover eine kleinste tragende Lane plus Startbudget pinnt.
- Ein gruener Scaffold ist noch keine echte PPO-Baseline und oeffnet `BT94A` nicht.
- Eine `Action-Mask` aus aktuellem `inventoryLength` ist nur optionales Zusatzsignal; Sanitizer-Clamping/Neutralisierung darf hoechstens als gemessener Fallback bleiben und nicht als tolerierte Hauptsemantik.

### Definition of Done (DoD)

- [ ] DoD.1 `python/train.py`, `python/eval.py`, Config-/Callback-Pfade und Manifest-Struktur laufen fuer einen minimalen Smoke-Run.
- [ ] DoD.2 Checkpoint-, Eval- und Manifest-Artefakte liegen fuer den Scaffold reproduzierbar unter `data/training/ppo/`.
- [ ] DoD.3 Resume- und Persistenzkette funktionieren fuer den Scaffold, ohne schon eine grosse Baseline zu behaupten.
- [ ] DoD.4 Der Block ist explizit als Scaffold gelabelt und trifft kein Champion-, Promotion- oder BT94A-Urteil.
- [ ] DoD.5 Die explizite Integration einer State-Normalization-Pipeline (z.B. `VecNormalize`) und die Definition der Actor/Critic-Heads ist als harte Pflichtvoraussetzung vor dem ersten Baseline-Scaffold eingebaut [siehe PPO-ADR-002].
- [ ] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 93B.1 Baseline-Config und Run-Manifest

- [ ] 93B.1.1 Konservative PPO-Config und Manifest-Struktur definieren (Seeds, Matrix, Env-Anzahl).
- [ ] 93B.1.2 Run-Manifest und Action-Adapter (`Split-Head`) fuer den Scaffold explizit festziehen.
- [ ] 93B.1.3 Explizite Integration einer State-Normalization-Pipeline (z.B. `VecNormalize`) und Definition der Actor/Critic-Heads [siehe PPO-ADR-002].

### 93B.2 Kalibrierter Smoke-Run auf realem Budget

- [ ] 93B.2.1 Ersten Lauf ausfuehren mit dem Startbudget aus der gemessenen BT93A-Lane-Evidence.
- [ ] 93B.2.2 Crash-Pfade, Hardware-Grenzen und Logging auf dem minimalen Scaffold pruefen.
- [ ] 93B.2.3 Produktive Runtime-Surfaces bleiben unangetastet.

### 93B.3 Checkpoint-, Resume- und Normalize-Persistenz

- [ ] 93B.3.1 Resume-Kette sicherstellen und Stats-/Checkpoint-Dateien pruefen.
- [ ] 93B.3.2 Artefaktkonsistenz zwischen neuem und fortgesetztem Lauf absichern.

### 93B.99 Abschluss-Gate

- [ ] 93B.99.1 Alle Phasen 93B.1 bis 93B.3 sind mit Evidence dokumentiert.
- [ ] 93B.99.2 Der PPO-Scaffold ist reproduzierbar, aber noch nicht als echte konservative Baseline freigegeben.

### Risiko-Register BT93B

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Der Scaffold driftet sofort in eine grosse Baseline-Arbeit | hoch | Governance | Scope hart auf Grundgeruest, Smoke und Resume begrenzen | DoD fordert schon Referenzlauf, DQN-Urteil oder BT94A-Handover |
| Resume-/Checkpoint-Pfad wirkt gruen, ist aber methodisch noch nicht belastbar | hoch | Integration | minimalen Persistenzpfad nachweisen, grossen Referenzlauf bewusst nach `BT93C` verschieben | Smoke-Run schreibt Artefakte, aber Resume oder Eval bleiben inkonsistent |
| Env-Anzahl oder Budgets werden doch wieder aus Draft-Annahmen statt aus `BT93A` gezogen | mittel | Planung | jedes Budget an den Handover aus `BT93A` binden | `4-Env`, `300000` oder aehnliche Zahlen tauchen ohne Lane-Artefakt wieder auf |

---

## Block BT93C: Konservative PPO-Baseline und Benchmark-Disziplin

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- `BT93C` liefert erst nach gruener Harness- und Scaffold-Lage die erste echte konservative PPO-Baseline.
- Der Block bindet Throughput-/Downgrade-Urteile aus `BT93A` und die Scaffold-/Resume-Kette aus `BT93B` zusammen.
- Freeze, Ablationen, externe A/B-Evidence und Promotion bleiben bewusst ausserhalb.

Claim-Grenze:

- `BT93C` ist erst claimbar, wenn `BT93B.99` gruen ist und eine feste Seed-/Mode-/Champion-Matrix fuer den Vorvergleich vorliegt.
- Ohne belastbaren Scaffold-Handover bleibt `BT93C` geschlossen, auch wenn einzelne Training-Skripte lokal laufen.

### Definition of Done (DoD)

- [ ] DoD.1 Eine konservative PPO-Baseline laeuft auf einer festen Seed-/Mode-/Champion-Matrix reproduzierbar.
- [ ] DoD.2 Throughput-, Stability- und Downgrade-Entscheide fuer `1 -> 2 -> optional 4` Envs sind aus `BT93A`-/`BT93B`-Artefakten offen dokumentiert; die 1-Worker-Referenz aus `data/training/ppo/throughput_analysis_btf08.json` gilt als Mindestschwelle.
- [ ] DoD.3 Vergleichsregel gegen den eingefrorenen DQN-Champion und das aktuelle Semantikfenster ist festgezogen.
- [ ] DoD.4 Ergebnis und Restpunkte sind als Baseline-Handover fuer `BT94A` dokumentiert.
- [ ] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 93C.1 Eval-Pipeline und DQN-Referenz-Freeze

- [ ] 93C.1.1 DQN-Champion, Vergleichsmatrix und Semantikfenster explizit einfrieren.
- [ ] 93C.1.2 PPO-Budget und Eval-Takte aus gemessenen BT93A-/BT93B-Artefakten ableiten; keine reinen Annahmen.
- [ ] 93C.1.3 Vorvergleich methodisch sauber und explizit gekennzeichnet aufsetzen.

### 93C.2 Evidenzbasierter Referenzlauf

- [ ] 93C.2.1 Konservativen Referenzlauf mit dem festen Budget fahren und reproduzierbare Artefakte schreiben.
- [ ] 93C.2.2 KPI- und Throughput-Lage gegen die Matrix dokumentieren; fehlende `4-Env`-Tragfaehigkeit ehrlich dokumentieren statt ueberspringen.

### 93C.3 Reproduzierbarkeits-Smoketest und BT94A-Handover

- [ ] 93C.3.1 Mindestens einen Repro-Smoketest fuer die Baseline festhalten.
- [ ] 93C.3.2 Abschlussreport schreiben und als Baseline-Handover fuer BT94A vorbereiten.

### 93C.99 Abschluss-Gate

- [ ] 93C.99.1 Alle Phasen 93C.1 bis 93C.3 sind mit Evidence dokumentiert.
- [ ] 93C.99.2 Es existiert eine solide Basis fuer Ablationen; `4-Env` ist nur bei tragender Evidenz freigegeben.

### Risiko-Register BT93C

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| PPO-vs-DQN bleibt methodisch nicht apples-to-apples | hoch | QA/Ops | Champion, Matrix, Semantikfenster und Reports vorab einfrieren | Sieg/Niederlage erklaert sich nur aus anderem Scope oder anderer Semantik |
| Headless-Throughput reicht selbst nach Harness/Scaffold nicht fuer eine ehrliche Baseline | hoch | Performance | konservatives Budget, klare Downgrades und ehrliche Restpunkte statt Wunschannahmen | Laeufe liefern kaum nutzbare Timesteps oder kippen unter Last |
| Eine gruene Baseline wird als Promotion oder BT94A-Freigabe missverstanden | mittel | Governance | Reports explizit als Baseline-Handover labeln | DQN-Vergleich wird intern schon als Rollout-Signal gelesen |

---

## Block BT94A: Candidate Freeze und Ablationen

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`

<!-- LOCK: frei -->

Scope:

- Kleine Ablationsmatrix, Curriculum-Hardening und Candidate Freeze auf Basis der `BT93C`-Baseline.
- Freeze und Evidence-Sammeln bleiben bewusst vor externer A/B-Urteilsfindung getrennt.

Claim-Grenze vor BT94A:

- `BT94A` ist nur claimbar, wenn `BT93C` ein echtes Baseline-Paket unter `data/training/ppo/**` und eine feste Vergleichsmatrix geliefert hat.

### Definition of Done (DoD)

- [ ] DoD.1 Eine kleine Ablations- und Curriculum-Matrix ist gegen dieselbe PPO-Baseline reproduzierbar ausgewertet.
- [ ] DoD.2 Genau ein Freeze-Kandidat unter `data/training/ppo/candidates/**` ist mit Manifest, Reports und Vergleichsmatrix dokumentiert.
- [ ] DoD.3 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 94A.1 Ablationsmatrix und Entscheidungsregeln

- [ ] 94A.1.1 5 bis 7 gezielte Laeufe mit klarer Champion-/Challenger-Logik gegen BT93C-Baseline definieren.
- [ ] 94A.1.2 Abbruchkriterien dokumentieren (wenn BT93C noch driftet, bleibt BT94A blockiert).

### 94A.2 Curriculum-, Reward- und Telemetry-Paritaet

- [ ] 94A.2.1 Relevante Felder (Observation Schema, Reward Breakdown, Hybrid Decision) abgleichen.
- [ ] 94A.2.2 Bekannte semantische Luecken oder Unterschiede zur DQN-Referenz offenlegen.

### 94A.3 Kandidatenlaeufe und Freeze

- [ ] 94A.3.1 Priorisierte Ablationen ausfuehren und Sieger gegen BT93C ermitteln.
- [ ] 94A.3.2 Genau einen belastbaren Kandidaten als Artefaktpaket (Manifest, Report, Lane-Budget) unter `data/training/ppo/candidates/` einfrieren.

### 94A.4 Reproduzierbarkeit und BT94B-Handover

- [ ] 94A.4.1 Pruefen, ob Freeze-Paket und Vergleichsmatrix sauber fuer die externe A/B-Evidence aufbereitet sind.
- [ ] 94A.4.2 Abschlussreport schreiben; bei fehlendem Sieger endet BT94A ehrlich mit `hold` statt stiller Weitergabe.

### 94A.99 Abschluss-Gate

- [ ] 94A.99.1 Alle Phasen 94A.1 bis 94A.4 sind mit Evidence dokumentiert.
- [ ] 94A.99.2 Ein Freeze-Kandidat liegt vor, oder BT94A stoppt die Kette explizit.

### Risiko-Register BT94A

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Semantikdrift invalidiert Vergleich und Freeze | hoch | Planung + Runtime | Benchmark-Invalidierung explizit im Block fuehren | Gameplay-, Observation-, Action- oder Reward-Vertrag aendert sich |

---

## Block BT94B: Externe A/B-Evidence und Urteilsdisziplin

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md`

<!-- LOCK: frei -->

Scope:

- Externe A/B-Evidence gegen den eingefrorenen DQN-Champion mit klarer Urteilssystematik.
- Promotion-Entscheidung nur ueber Lane-, Median- und Semantikfenster-Regeln vorbereiten.

Claim-Grenze vor BT94B:

- `BT94B` ist nur claimbar, wenn `BT94A` einen Freeze-Kandidaten und die Baseline-Lane geliefert hat.

### Definition of Done (DoD)

- [ ] DoD.1 Externe A/B-Evidence gegen den eingefrorenen DQN-Champion liefert ein klares Urteil (`promote`, `hold`, `rollback` oder `diagnose`).
- [ ] DoD.2 Drei vollstaendige Kandidatenlaeufe derselben Lane und desselben Semantikfensters bilden die Entscheidungsbasis statt eines Einzelruns.
- [ ] DoD.3 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 94B.1 Vergleichsartefakte einfrieren

- [ ] 94B.1.1 DQN-Champion, PPO-Freeze-Kandidat und das Vergleichsmanifest fixieren.
- [ ] 94B.1.2 Urteilskriterien und Primaer-/Sekundaermetriken unveraenderlich festschreiben.

### 94B.2 Externe A/B-Lane ausfuehren

- [ ] 94B.2.1 Mindestens 3 vollstaendige Kandidatenlaeufe auf derselben festen Matrix auswerten (Medianbasiert).
- [ ] 94B.2.2 Invalidierte Paesse separat dokumentieren und nicht still in den Median mischen.

### 94B.3 `bot:validate`-Zusatzsignal oder ehrlicher Restblocker

- [ ] 94B.3.1 Falls verfuegbar, eine `bot:validate`-Zusatz-Gegenprobe dokumentieren.
- [ ] 94B.3.2 Falls noch blockiert (siehe BT80C 80.9.3), Restblocker offen benennen und nicht als Gatekeeper umdeuten.

### 94B.4 Promotions-Evidence-Paket und Handover

- [ ] 94B.4.1 Endurteil in die Klassen `promote`, `hold`, `rollback` oder `diagnose` einordnen.
- [ ] 94B.4.2 Ergebnis ist verdict-sensitiv: nur `promote` oeffnet BT95.

### 94B.99 Abschluss-Gate

- [ ] 94B.99.1 Alle Phasen 94B.1 bis 94B.4 sind mit Evidence dokumentiert.
- [ ] 94B.99.2 Ein klares externes Urteil liegt vor, basierend auf der 3-Run-Regel.

### Risiko-Register BT94B

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Einzelrun-Glueck wird als Promotion fehlgelesen | hoch | QA/Ops | Drei-Run-Regel, Median-Delta und feste Lane verlangen | Kandidat gewinnt nur einmal oder nur knapp |
| Fehlende produktionsnahe Validation aus BT80C wird im PPO-Hype uebersehen | mittel | Governance | `BT80C 80.9.3` als offenen Restblocker im Urteil sichtbar halten | positive PPO-Evidence wird als fast fertiger Rollout gelesen |

---

## Block BT95: Integrations-Handoff und Rollout-Intake-Vorbereitung

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md`

<!-- LOCK: frei -->

Scope:

- Externe PPO-Evidence in ein layer-sicheres Integrationspaket fuer einen spaeteren Rollout-Intake uebersetzen.
- Keine automatische DQN-Ablosung; produktive Umschaltung bleibt separater, user-entschiedener Folgepfad.
- Restblocker zu produktionsnaher Validation, Rollback und Runtime-Guardrails explizit dokumentieren.

Blocktyp:

- BT95 ist ein Handoff-/Intake-Vorbereitungsblock, kein normaler Implementierungsblock.

Claim- und No-Go-Regel:

- `BT95` wird nur als echter Handoff-Block relevant, wenn `BT94B` mit `promote` endet; ohne dieses Urteil dokumentiert der Block hoechstens, warum kein aktiver Rollout-Intake geoeffnet wird.
- Auch bei `promote` bleibt `BT95` Doc-, Guardrail- und Entscheidungsarbeit; produktive Runtime-, Matchstart- oder AI-Hub-Dateien werden hier nicht vorbereitet oder umgeschaltet.
- `BT80C 80.9.3` bleibt als produktionsnaher Restblocker sichtbar, solange die feste Validation-Lane weiter in `PLAYING` mit `roundsRecorded=0` haengen kann.

### Definition of Done (DoD)

- [ ] DoD.1 Integrations-Handoff, Rollback-Leiter und Guardrails fuer einen spaeteren Rollout-Intake sind als doc-only Paket dokumentiert.
- [ ] DoD.2 Produktive Runtime-, Matchstart- und AI-Hub-Surfaces bleiben bis zu einem separaten Rollout-Block read-only.
- [ ] DoD.3 Ein positiver PPO-Kandidat wird nicht als automatische DQN-Ablosung dargestellt; manuelle Entscheidung und Rollback bleiben Pflicht.
- [ ] DoD.4 Offene Restblocker aus `BT80C 80.9.3` oder gleichwertiger produktiver Validation sind sichtbar dokumentiert.
- [ ] DoD.5 Ein aktiver Rollout-Intake oeffnet nicht ohne `BT94B=promote`, gruene produktionsnahe Validation und expliziten User-Entscheid.
- [ ] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 95.1 Spaeteren Integrationsscope zuschneiden

- [ ] 95.1.1 Moegliche Touchpoints (`ObservationBridgePolicy.js`, `RuntimeConfig.js` etc.) fuer einen spaeteren Rollout-Intake benennen.
- [ ] 95.1.2 No-Touch-Ausnahmen explizit als Grenze festhalten. Ohne Runtime-Eingriff in BT95!

### 95.2 Rollout-, Rollback- und Sunset-Regeln

- [ ] 95.2.1 Rollout-Reihenfolge und DQN-Sunset-Kriterien dokumentieren.
- [ ] 95.2.2 Rollback-Pfade bei Instabilitaet definieren und Architektur-Docs synchronisieren.

### 95.3 Folgebacklog separieren

- [ ] 95.3.1 Self-Play, frozen Opponent-Pools und weitere Folgeforschung explizit in den Backlog ausgliedern.
- [ ] 95.3.2 Kernpfad von Forschungsnebenpfaden freihalten.

### 95.4 Intake-Handoff vorbereiten

- [ ] 95.4.1 BT90-Ergebnisse fuer den moeglichen Intake-Block vorbereiten.
- [ ] 95.4.2 Offene produktionsnahe Validation (`BT80C 80.9.3`) und den finalen User-Entscheid als harten Restblocker fuer den Start des operativen Rollout-Blocks ausweisen.

### 95.99 Abschluss-Gate

- [ ] 95.99.1 Alle Phasen 95.1 bis 95.4 sind mit Evidence dokumentiert.
- [ ] 95.99.2 Das Ergebnis ist ein doc-only Handoff fuer einen spaeteren Rollout-Intake, keine vorweggenommene Umschaltung.

### Risiko-Register BT95

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Gruene PPO-Evidence wird als automatische DQN-Ablosung missverstanden | hoch | Governance | manual decision, Rollback-Leiter und separaten Rollout-Intake hart festschreiben | positive A/B-Evidence wird intern schon als Rollout gelesen |
| Produktive Validation-Lane ist noch nicht gruener Bestandteil der Gesamtlage | hoch | QA/Ops | `BT80C 80.9.3` oder gleichwertigen Pfad als offene Integrationsvoraussetzung dokumentieren | Handoff will auf roten produktionsnahen Validate-Pfad aufsetzen |
| Layer-Grenzen werden im letzten Handoff verwischt | hoch | Architektur | read-only-Surfaces und Guardrails aus `ai_architecture_context.md` unveraendert weiterfuehren | Handoff fordert doch Runtime-Schalter, neue Bot-Typen oder Matchstart-Abkuerzungen |

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

