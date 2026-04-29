# Bot Trainingsplan PPO-Only Entwurf

Stand: 2026-04-27

Status: Entwurf, nicht aktiv.

Aktive Quelle bleibt bis zur expliziten Aktivierung:
`docs/bot-training/Bot_Trainingsplan.md`.

Dieser Entwurf ist eine schlanke PPO-only-Fassung des aktuellen Bot-Trainingsplans.
Alle DQN-/Operator-/Legacy-Trainingsbloecke fallen als aktive Planarbeit heraus.
DQN bleibt nur als eingefrorene Referenz fuer Vergleich und Rueckfall erhalten.

## Aktivierung und Archivierung

Dieser Entwurf darf erst aktiv werden, wenn der User die Aktivierung ausdruecklich
freigibt. Bei Aktivierung gilt diese Reihenfolge:

1. Aktiven Altplan archivieren:
   - Quelle: `docs/bot-training/Bot_Trainingsplan.md`
   - Ziel: `docs/archive/plans/completed/Bot_Trainingsplan_Legacy_DQN_und_PPO_bis_2026-04-27.md`
2. In diesem Entwurf einen Aktivierungsvermerk ergaenzen:
   - Archivpfad des Altplans
   - Commit/SHA der Archivierung
   - Datum der Aktivierung
   - Hinweis, dass DQN nur noch Frozen-Comparator ist
3. Diesen Entwurf nach `docs/bot-training/Bot_Trainingsplan.md` uebernehmen.
4. `docs/Umsetzungsplan.md` unveraendert lassen: Bot-Training bleibt externe Planquelle.
5. `docs/bot-training/Bot_Trainings_Roadmap.md` entweder historisch markieren oder auf PPO-only verweisen.
6. Governance-Gates laufen lassen:
   - `npm run plan:check`
   - `npm run docs:sync`
   - `npm run docs:check`
   - `npm run build`

Nicht erlaubt bei Aktivierung:

- DQN-Bloecke still loeschen, ohne den Altplan archiviert zu haben.
- DQN-Reports oder alte `bot:validate`-Reports als PPO-Validate-Evidence lesen.
- BT94A per Plantext oeffnen.
- Runtime-/AI-Hub-/Matchstart-Umschaltung vorbereiten.

## Governance

- Dieser PPO-only Plan ist nach Aktivierung die einzige aktive Quelle fuer Bot-Training.
- `docs/Umsetzungsplan.md` bleibt nur Gesamtprojekt-Index und fuehrt keine Bot-Training-Phasen.
- `*.99`-Gates duerfen nur `[x]` sein, wenn alle frueheren Phasen desselben Blocks `[x]` sind.
- Jeder `[x]`-Phasenpunkt braucht Evidence:
  `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Versionierte Evidence liegt unter `data/**` oder `docs/**`.
- `tmp/**`, Plan-Grep, Self-Count, alte DQN-Reports und reine Throughput-Werte sind keine PPO-Closure-Evidence.
- Tests bleiben user-owned, ausser bei expliziter User-Anfrage oder Abschluss-Gate.

## Frozen DQN Reference

DQN ist kein aktiver Trainingspfad mehr. Der beste DQN-Bot bleibt nur als
eingefrorener Comparator, Rueckfall- und Interpretationsanker erhalten.

| Feld | Wert |
| --- | --- |
| Referenztyp | Frozen Comparator, kein aktiver Planblock |
| Champion-ID | `BT11_FIGHT_20260324T014853-r4042` |
| Bekannter Steps-Anker | `avgStepsPerEpisode=117.525` fuer PPO-Vorvergleich |
| Bekannter Survival-Anker | `averageBotSurvival=48.590082` fuer PPO-Vorvergleich |
| Semantikfenster | `runtime-near-headless-v1` fuer aktuelle PPO-Vergleiche; historische DQN-Freeze-Notizen bleiben im archivierten Altplan |
| Nutzung | Nur Vergleich, No-Regression, Rollback-Referenz |
| Verbot | Keine neuen DQN-Trainings-, Tuning-, Operator- oder Promotionsbloecke in diesem Plan |

Wenn die DQN-Referenz durch Gameplay-/Observation-/Reward-/Terminal-Drift nicht
mehr vergleichbar ist, wird sie nicht angepasst, sondern als invalidiert markiert
und ein neuer PPO-Vergleichsanker braucht User-Freigabe.

## Aktueller PPO-Stand

| Thema | Stand |
| --- | --- |
| Aktueller Block | `BT93K` geplant, noch nicht claimed |
| Vorblock | `BT93J.99=diagnose-loop-required` |
| BT94A | geschlossen: `claimable=false` |
| 1M-Longrun | Diagnose-Evidence, `reward-still-blocking` |
| 1M-Steps | `avgStepsPerEpisodeObserved=166.866667` |
| 1M-Semantik | `naturalTerminalCount=0`, `playerDeadOnly=true`, Progress/Objectives `0` |
| 3M/4-Env-Zusatzspur | quarantiniert, kein finaler Runner-Report, keine Closure-Evidence |
| Naechste erlaubte Arbeit | `BT93K.0` bis `BT93K.4` |

Harte Lesart:

- PPO lernt aktuell Survival-Dauer, aber noch nicht belegbar die richtige
  Survival-Aufgabe.
- Mehr Longrun-Zeit ist nicht der naechste Beweis.
- Erst Signalwahrheit, Supervisor, Mode-/Map-Wirklichkeit und kleine
  Env-Smokes; danach erst Longrun-Leiter.

## PPO Blockleiter

| Block | Titel | Status | Depends-On | Ergebnis |
| --- | --- | --- | --- | --- |
| BT90-BT93I | Historische PPO-Basis und Reparaturkette | abgeschlossen | archivierte Evidence im Altplan | Nur Kontext; keine neuen Claims |
| BT93J | Root-Cause-Blocker-Repair | abgeschlossen rot | BT93I | `diagnose-loop-required`; kein BT94A |
| BT93K | Survival-First Objective Reset | naechster Block | BT93J.99 + User-Intake 2026-04-27 | Signal-, Supervisor-, Mode-/Map- und Env-Smoke-Haertung |
| BT94A | Candidate Freeze und Ablationen | gesperrt | BT93K.99 + `claimable=true` | Erst bei echter BT94A-Ready-Evidence |
| BT94B | Externe A/B-Evidence und PPO-Validate | gesperrt | BT94A.99 | Urteil `promote/hold/rollback/diagnose` |
| BT95 | Integrations-Handoff | gesperrt | BT94B `promote` + PPO-Validate gruen | Doc-only Intake, keine Runtime-Aktivierung |

## Scope Files

Primaerer PPO-Scope:

- `docs/bot-training/Bot_Trainingsplan.md`
- `data/training/ppo/**`
- `python/**`
- `python/scripts/bt93k_*.py`
- `python/configs/ppo_bt93k*.json`
- `scripts/training-headless-lane-runner.mjs`
- `scripts/training-single-env-bridge.mjs`
- `src/state/training/EpisodeController.js`
- `src/state/training/RewardCalculator.js`
- `tests/training-*.mjs`
- `python/tests/**`

Read-only bis separater Rollout-Block:

- produktive Runtime-/Matchstart-/AI-Hub-Surfaces
- JS-Inference-/Registry-/Strategy-Flag-/Rollback-/Rollout-Dateien
- Authority-/Bridge-Vertraege ausserhalb trainingsnaher Diagnose

## Block BT93K: Survival-First Objective Reset

<!-- LOCK: frei -->

### Ziel

BT93K korrigiert die Lern- und Evidence-Wahrheit, bevor weitere grosse Runs
erlaubt sind:

- kein BT94A-Claim,
- kein Candidate,
- kein Freeze,
- kein Promote,
- kein Rollout-Signal,
- kein weiterer Blind-Longrun.

### Pflichtartefakte

| Artefakt | Zweck |
| --- | --- |
| `data/training/ppo/bt93k/preflight_quarantine_report.json` | Branch, Guard, Dirty-Workspace, aktive Prozesse, alte User-owned-Skripte/Configs, 3M/4-Env-Quarantaene |
| `data/training/ppo/bt93k/start_truth.json` | BT93J-Post-Decision, rotes BT94A-Gate, Startmetriken |
| `data/training/ppo/bt93k/signal_metric_contract.json` | Survival-, Death-, Max-Step-, Progress-, Natural-Terminal- und Objective-Metrikvertrag |
| `data/training/ppo/bt93k/supervisor_contract_report.json` | Heartbeat, PID-/Sidecar-Liste, Exit-Code, Stopgrund, finaler `run_exit_report.json` |
| `data/training/ppo/bt93k/runner_signal_repair_report.json` | Curriculum-Step-Uhr, Progress-/Objective-Reachability, effective environment |
| `data/training/ppo/bt93k/mode_map_smoke_report.json` | `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` effective values |
| `data/training/ppo/bt93k/env_scale_smoke_report.json` | 2-/4-/6-Env Start-, Snapshot-, Exit- und Action-Safety-Smokes |
| `data/training/ppo/bt93k/cuda_benchmark_report.json` | CPU-vs-CUDA-Wallclock, Stabilitaet, keine Qualitaetswertung |
| `data/training/ppo/bt93k/longrun_ladder_decision_report.json` | 20k/50k/100k/300k/1M Entscheidung |
| `data/training/ppo/bt93k/handover_package.json` | Ergebnis `diagnose-loop-required`, `diagnose-improved`, `BT94A-ready` oder `blocked` |

### Definition of Done

- [ ] DoD.0 Preflight-Quarantaene ist versioniert und blockiert stale 3M/4-Env-Evidence.
- [ ] DoD.1 Startwahrheit ist gepinnt und oeffnet BT94A nicht.
- [ ] DoD.2 Metriken trennen Steps, longestEpisode, deathBefore60Share, maxStepShare, naturalTerminalShare, progressSignalNonZero, objectiveSignalNonZero, runtimeErrorCount und Action-Safety.
- [ ] DoD.3 Kein Run wird laenger, bevor Supervisor-/Exit-Report-Gate gruen ist.
- [ ] DoD.4 Mode-/Map-/Planar-Wirklichkeit steht in Train/Eval-Reports, nicht nur in Configs.
- [ ] DoD.5 2-/4-/6-Env-Smokes sind klein, reportbar und keine Qualitaetsurteile.
- [ ] DoD.6 CUDA bleibt isolierte Infrastruktur-Lane.
- [ ] DoD.7 BT94A bleibt geschlossen, solange Gate-Check nicht vollstaendig gruen ist.
- [ ] DoD.8 Runtime-/AI-Hub-/Matchstart-/Rollout-Surfaces bleiben unveraendert.
- [ ] DoD.9 Governance-Gates sind gruen oder als Blocker dokumentiert.

### 93K.0 Preflight und Quarantaene

- [ ] 93K.0.1 `preflight_quarantine_report.json` schreiben.
- [ ] 93K.0.2 3M/4-Env-Zusatzspur als nicht closure-faehig klassifizieren.
- [ ] 93K.0.3 Stale Labels (`BT93J`, `93J.5b`, `user-owned-survival-3m`) markieren.
- [ ] 93K.0.4 Kein Run startet bei rotem Guard, aktiven Restprozessen oder fehlendem Supervisor-Vertrag.

### 93K.1 Start-Wahrheit und Metrikvertrag

- [ ] 93K.1.1 `start_truth.json` schreiben.
- [ ] 93K.1.2 `signal_metric_contract.json` mit harten Qualitaetsgrenzen schreiben.
- [ ] 93K.1.3 Supervisor-Vertrag mit `completed/stopped/failed/killed/timeout/measurement-invalid` definieren.
- [ ] 93K.1.4 Ladder-Regel pinnen: laenger nur bei gruenem Exit-Report und echtem Zielsignal oder klarer Reduktion frueher Todesfaelle.

### 93K.2 Runner-Signalreparatur

- [ ] 93K.2.1 Curriculum-Uhr auf globale Env-/Trainingssteps oder eindeutig reporteten globalen Step-Zaehler umstellen.
- [ ] 93K.2.2 `activeCurriculumStage`, `curriculumStepOffset`, `globalEnvSteps` reporten.
- [ ] 93K.2.3 Progress-/Objective-Signale nur reporten, wenn reachable.
- [ ] 93K.2.4 `effectiveMap`, `effectiveDomainMode`, `effectiveGameMode`, `planarMode`, `modePath` und Seeds reporten.

### 93K.3 Mode-/Map-Smokes

- [ ] 93K.3.1 CLI und Python-Env fuer Map/Mode/Planar verdrahten.
- [ ] 93K.3.2 `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` kurz pruefen.
- [ ] 93K.3.3 Gemeinsame Policy vs getrennte Policies/Normalize-States auf Evidence entscheiden.
- [ ] 93K.3.4 Keine Vergleiche, wenn effective values fehlen oder von Config abweichen.

### 93K.4 2-/4-/6-Env-Smokes

- [ ] 93K.4.1 2-Env-Referenz-Smoke mit finalem `run_exit_report.json`.
- [ ] 93K.4.2 4-Env-Smoke mit identischem Supervisor-Vertrag.
- [ ] 93K.4.3 6-Env-Smoke als Startup-/Stability-Smoke, nicht als Survival-Beweis.
- [ ] 93K.4.4 Kein 100k-Vergleich bei stdout/stderr-only, fehlendem Exit-Code oder Force-Stop ohne finalen Runner-Report.

### 93K.5 CUDA-Benchmark

- [ ] 93K.5.1 Separaten CUDA-PyTorch-Env vorbereiten.
- [ ] 93K.5.2 CPU vs CUDA mit identischem 2-/4-/6-Env-Smoke vergleichen.
- [ ] 93K.5.3 CUDA nur bei stabiler 20-30 Prozent Wallclock-Verbesserung behalten.

### 93K.6 Signal-gated Longrun-Leiter

- [ ] 93K.6.1 20k Signal-Smoke nur nach gruenem Supervisor-, Runner-Signal- und Mode-/Map-Gate.
- [ ] 93K.6.2 50k 4-/6-Env nur bei nonzero Progress/Objective/Natural oder `deathBefore60Share` mindestens 20 Prozent besser.
- [ ] 93K.6.3 100k 2/4/6-Vergleich nur mit finalen Exit-Reports, gleicher Matrix und `completedEpisodeCount>=15` fuer Qualitaetsurteile.
- [ ] 93K.6.4 300k nur, wenn 100k die Survival-Verteilung verbessert und `maxStepShare` nicht alleiniger Gewinntraeger ist.
- [ ] 93K.6.5 1M nur nach nonzero Zielsignal, stabiler Survival-Verteilung, finalem Exit-Report und unverbrauchtem Holdout.

### 93K.7 Handover

- [ ] 93K.7.1 `longrun_ladder_decision_report.json` und `handover_package.json` schreiben.
- [ ] 93K.7.2 Rote Evidence darf `no_start_gate.json` nicht gruen umdeuten.
- [ ] 93K.7.3 Nur echte BT94A-Ready-Evidence darf `bt94a_gate_check.py` ausloesen.
- [ ] 93K.7.4 Kein Ergebnis heisst `candidate`, `freeze-candidate`, `promote`, `rollout-ready` oder `BT94B-ready`.

### 93K.99 Abschluss-Gate

- [ ] 93K.99.1 Phasen 93K.0 bis 93K.7 sind mit versionierter Evidence dokumentiert.
- [ ] 93K.99.2 Ergebnis ist `diagnose-loop-required`, `diagnose-improved`, `BT94A-ready` oder `blocked`.
- [ ] 93K.99.3 BT94A oeffnet nur mit `claimable=true`.
- [ ] 93K.99.4 Runtime-/Rollout-Surfaces bleiben unveraendert.
- [ ] 93K.99.5 Governance-Gates sind gruen oder als Blocker dokumentiert.

## Block BT94A: Candidate Freeze und Ablationen

<!-- LOCK: frei -->

BT94A ist gesperrt, bis alle Bedingungen wahr sind:

- `BT93K.99=BT94A-ready`
- `data/training/ppo/bt94a/no_start_gate.json` schreibt `claimable=true`
- `candidateRunsAllowed=true`
- `matrixDefinitionAllowed=true`
- `bt94aHandover.ready=true`
- `precomparison != ppo-regression`
- `bt94aBlockerCount=0`

BT94A darf maximal zwei Kandidatenlaeufe pro Claim ausfuehren. Jede Ablation
braucht genau eine Hypothese, feste Matrix, Holdout-Schutz und echtes
Modell-/Normalize-/Optimizer-Paket.

## Block BT94B: Externe A/B-Evidence und PPO-Validate

<!-- LOCK: frei -->

BT94B startet nur nach echtem BT94A-Freeze-Kandidaten.

Promotion braucht:

- mindestens drei gueltige Paesse derselben Matrix,
- Median-/Streuungs-/Holdout-Regeln,
- `runtimeErrorCount=0`,
- keine schlechtere Invalid-/Sanitizer-/Veto-/Failure-Lage,
- PPO-spezifische Validate-Lane aus `94B.3`.

Ohne gruene PPO-Validate-Evidence gibt es kein Rollout-Signal.

## Block BT95: Integrations-Handoff

<!-- LOCK: frei -->

BT95 ist doc-only und startet nur bei:

- `BT94B=promote`
- gruener PPO-Validate-Evidence
- expliziter User-Entscheidung fuer den Folge-Intake

BT95 implementiert keine Runtime-Umschaltung. Ein spaeterer Rollout-Block muss
separat beweisen:

- Export-/Load-Vertrag
- JS-Inference-Adapter
- Latenzbudget
- Strategieflag
- Modellregistry
- Rollback auf Frozen-DQN-Referenz
- PPO-Validate gegen den Freeze-Kandidaten

## No-Go

- Kein weiterer Blind-Longrun vor BT93K-Preflight, Supervisor und Signal-Gates.
- Kein 4-/6-Env-Langlauf vor kleinen final reportbaren Env-Smokes.
- Kein BT94A-Start ohne maschinenlesbares `claimable=true`.
- Kein Candidate/Freeze/Promote innerhalb BT93K.
- Kein DQN-Training in diesem PPO-only Plan.
- Kein alter `data/bot_validation_report.json`, kein `plan:check`, kein Throughput-Report und kein Scaffold-Artefakt zaehlt als PPO-Survival-Beweis.
- Keine Runtime-/AI-Hub-/Matchstart-Umschaltung vor BT95 plus separatem Rollout-Block.

## Naechste Trainingshandlung

| Reihenfolge | Aktion | Voraussetzung | Ergebnis |
| --- | --- | --- | --- |
| 1 | `BT93K.0` Preflight/Quarantaene | User aktiviert/claimed BT93K | Dirty-/Branch-/Prozess-/Zusatzspur-Lage ist maschinenlesbar |
| 2 | `BT93K.1` Startwahrheit und Metrikvertrag | Preflight nicht blockierend | Signal- und Supervisor-Gates stehen |
| 3 | `BT93K.2` Runner-Signalreparatur | Metrikvertrag gruen | globale Curriculum-Uhr und effective values sichtbar |
| 4 | `BT93K.3` Mode-/Map-Smokes | Runner-Signale sichtbar | Mode-/Map-Wirklichkeit belegt |
| 5 | `BT93K.4` 2-/4-/6-Env-Smokes | Supervisor und Mode-/Map gruen | Env-Skalierung ist Startup-/Exit-reportbar |
| 6 | `BT93K.5` CUDA optional | CPU-Smokes gruen | reine Infra-Entscheidung |
| 7 | `BT93K.6` Longrun-Leiter | echte Zielsignale und Exit-Reports gruen | 20k/50k/100k/300k/1M nur stufenweise |
| 8 | `BT93K.7/93K.99` Handover | Evidence komplett | `diagnose-*`, `blocked` oder `BT94A-ready` |

