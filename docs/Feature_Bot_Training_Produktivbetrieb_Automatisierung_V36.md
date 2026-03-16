# Feature: Bot-Training Produktivbetrieb und Automatisierung V36

Stand: 2026-03-11

## Ziel

Der bestehende V33/V34 Trainingspfad soll in einen robusten Produktivbetrieb ueberfuehrt werden, damit trainierte Bots im normalen Spiel reproduzierbar genutzt werden koennen und laengere Lernserien ohne manuellen Eingriff laufen.

Der Ziel-Flow:

1. Trainerprozess laeuft stabil und kann optional mit letztem Checkpoint starten.
2. Trainingslaeufe koennen als Serie (`N` Runs) automatisiert mit `resume-checkpoint=latest` laufen.
3. Eval/Gate messen nicht nur Pipeline-Health, sondern auch Lernfortschritt.
4. Der normale Matchbetrieb kann den Trainerpfad explizit aktivieren, ohne Fallback-Sicherheit zu verlieren.

## Nicht-Ziele

1. Kein Breaking Change am Observation- oder Action-Contract.
2. Kein GPU-/Cluster-Zwang.
3. Kein breiter UI-Redesign-Track ausser notwendiger Bedien-/Statuspfad-Ergaenzungen.

## Architektur-Check

Bestehende Bausteine (Reuse):

1. `scripts/training-run.mjs` mit Bridge-Handshake, Resume-Token und Artefaktpfad.
2. `scripts/training-eval.mjs` und `scripts/training-gate.mjs` fuer KPI/Gate.
3. `src/entities/ai/training/WebSocketTrainerBridge.js` fuer Ready/Retry/Telemetry.
4. `trainer/server/TrainerServer.mjs` und `trainer/session/TrainerSession.mjs` fuer Request/Step/Ack und Checkpoint-Export/Load.
5. `src/core/RuntimeConfig.js` plus `src/entities/ai/ObservationBridgePolicy.js` fuer Runtime-Wiring.

Erkannte Luecken:

1. `training:e2e` nutzt aktuell nicht durchgaengig den echten Bridge-Run als Standardpfad.
2. Im normalen Spiel gibt es keinen klaren Auto-Resume-Flow fuer das letzte Checkpoint.
3. Eval/Gate sind stark deterministisch/synthetisch und bilden Lernfortschritt nur begrenzt ab.

Reuse-vs-New Entscheidung:

1. Bestehende Runner/Bridge-Module werden erweitert statt neu aufgebaut.
2. Neuer Orchestrator fuer Serienlaeufe kommt additiv als Script in `scripts/**`.
3. Play-Eval kommt additiv als neue Eval-Lane, ohne bestehende deterministische Gates zu entfernen.

Risiko-Rating: `hoch`

Hauptrisiken:

1. Scheinfortschritt durch synthetische Eval-Metriken.
2. Session-Neustarts ohne korrektes Resume.
3. Bridge-Instabilitaet erzeugt KPI-Rauschen und versteckte Fallback-Nutzung.

## Doku-Impact

1. `docs/Bot-Training-Schnittstelle.md` (Produktivbetrieb, Resume-Flow, Runbook).
2. `docs/Feature_Bot_Training_Produktivbetrieb_Automatisierung_V36.md` (dieser Plan).
3. `docs/Umsetzungsplan.md` (Plan-Eingang + Statuspflege).

## Datei-Ownership-Check

1. Primaere Pfade: `scripts/**`, `trainer/**`, `src/entities/ai/training/**`, `src/core/**`, `src/state/training/**`, `tests/**`, `docs/**`.
2. Ownership-Mapping ist kompatibel (`scripts/tests/docs` shared, `trainer/**` bereits als PX V34-Feld vorhanden, `src/core/**` und `src/state/**` ueber V28/V27 referenziert).
3. Cross-Block-Aenderungen in `src/core/**` werden im Conflict-Log dokumentiert, falls parallel aktiv.

## Phasen

- [x] 36.0 Baseline-Freeze und Betriebsvertrag
  - [x] 36.0.1 Letzten stabilen Referenzlauf (`run/eval/gate/trainer/checkpoint`) als Baseline dokumentieren
  - [x] 36.0.2 KPI-/Telemetry-Vertrag fuer Produktivbetrieb finalisieren (`fallbackRate`, `timeoutRate`, `actionCoverage`)
  - Status 2026-03-11: Baseline-Runs mit Artefakten unter `data/training/runs/20260311T220754Z/` und Serien-Referenz unter `data/training/series/20260311T222457Z/` eingefroren; KPI-Vertrag in `TrainingOpsKpiContractV36` + Gate-Evaluator/Thresholds verdrahtet.

- [x] 36.1 Serien-Orchestrierung fuer Training
  - [x] 36.1.1 Neues `scripts/training-loop.mjs` fuer `N` Runs mit `--resume-checkpoint latest` bauen
  - [x] 36.1.2 Fehlertoleranz, Stop-on-fail und lauffaehige Zusammenfassung pro Run/Serie ausgeben
  - Status 2026-03-11: `scripts/training-loop.mjs` integriert (`run -> eval -> gate`, Stop-on-fail, optionaler Trainer-Server, Serienartefakt `loop.json`).

- [x] 36.2 Resume-/Checkpoint-Flow haerten
  - [x] 36.2.1 Auto-Resume-Option fuer Trainerstart und Trainingslauf harmonisieren
  - [x] 36.2.2 Checkpoint-Validierung plus klare Failure-Meldungen bei Import-Fehlern absichern
  - Status 2026-03-11: `trainer-checkpoint-load-latest` plus Startup-Resume (`--resume-checkpoint`, `--resume-strict`) in Trainer-Server, Session und Run-Skript harmonisiert; Checkpoint-Validator liefert strukturierte Fehlerdetails.

- [x] 36.3 Normalspiel-Integration (trained bot)
  - [x] 36.3.1 Runtime-Settings-Pfad fuer `botBridge.enabled/url/timeout` explizit verifizieren und dokumentieren
  - [x] 36.3.2 Matchstart-Flow optional um `checkpoint-load` erweitern, bevor Traineraktionen genutzt werden
  - Status 2026-03-11: Runtime-Settings (`botBridge.*`) ueber `SettingsManager`/`RuntimeConfig`/`SettingsRuntimeContract` erweitert; `ObservationBridgePolicy` laedt Resume-Checkpoint vor Trainer-Action-Nutzung.

- [x] 36.4 Eval/Gate auf Lernfortschritt erweitern
  - [x] 36.4.1 Additiven Play-Eval mit festen Match-Szenarien gegen stabile Baselines einfuehren
  - [x] 36.4.2 Trend-Gate (Rolling Window ueber mehrere Stamps) plus Drift-Regeln (`warn`/`hard`) ergaenzen
  - Status 2026-03-11: `training-eval` enthaelt additive Play-Eval-Lane; `training-gate` enthaelt Rolling-Window-Trend-Gate plus Play-Eval-Driftbewertung.

- [x] 36.5 Betriebsresilienz und Observability
  - [x] 36.5.1 Bridge-Ausfall/Fallback im Match explizit messen und in Artefakten reporten
  - [x] 36.5.2 Trainer- und Match-Telemetrie fuer Live-Diagnose vereinheitlichen
  - Status 2026-03-11: Bridge-Telemetrie um Request-/Response-Typzaehler erweitert und als Ops-KPIs in `run/eval/gate` persistiert; `GameDebugApi` liefert Match-Bruecken-Snapshot fuer Developer-Outputs.

- [x] 36.6 Test-Lane Produktivbetrieb
  - [x] 36.6.1 Unit-/Integrationstests fuer Resume, Ready-Handshake und Loop-Orchestrator erweitern
  - [x] 36.6.2 End-to-End-Test fuer "Server -> Resume -> Matchstart -> Traineraktionen" absichern
  - Status 2026-03-11: Neue Tests `trainer-v34-loop`, `trainer-v34-resume-latest.integration`, `trainer-v34-match-resume.integration`; Playwright `T99` validiert Resume-before-action im Matchpfad.

- [x] 36.7 Runbook und Bedienpfad
  - [x] 36.7.1 Operator-Runbook fuer lokale Nutzung (`start`, `loop`, `resume`, `stop`) schreiben
  - [x] 36.7.2 Troubleshooting fuer bekannte Fehlerbilder (`ready-timeout`, `checkpoint-import-failed`) dokumentieren
  - Status 2026-03-11: Runbook- und Troubleshooting-Abschnitte in `docs/Bot-Training-Schnittstelle.md` ergaenzt.

- [x] 36.9 Abschluss-Gate und Doku-Freeze
  - Abgeschlossen am: `2026-03-13`
  - [x] 36.9.1 Verifikation: zielgerichtete V36-Tests, Trainingsserie, `training:e2e`, relevante Core-Checks
  - [x] 36.9.2 Verifikation: `npm run docs:sync` und `npm run docs:check`
  - [x] 36.9.3 Abschlussbericht mit PASS/FAIL, Restrisiken und naechsten Schritten
  - Status 2026-03-13: Alle V36-spezifischen Gates sind im aktuellen Stand gruen (`training:loop`, `training:e2e`, `trainer-v34-*`, `training-environment`, `test:core`, `docs:sync`, `docs:check`, `build`); der fruehere `T7`-Blocker ist nicht mehr reproduzierbar.

## Definition of Done

1. Serienlaeufe mit Resume laufen reproduzierbar ohne manuellen Eingriff.
2. Normalspiel kann trainierte Aktionen sicher nutzen (inklusive kontrolliertem Fallback).
3. Eval/Gate enthalten mindestens einen lernnahen Play-Eval-Pfad.
4. Checkpoint-Lifecycle ist robust und nachvollziehbar dokumentiert.
5. Pflichttests und Doku-Gates sind gruener Abschlussstand.

## Verifikation

Pflichtreihenfolge zum Abschluss:

1. gezielte V36-Tests (`trainer-v34-*` erweitert + neue V36-Tests)
2. Serienlauf (`training-loop`) mit Resume ueber mehrere Stamps
3. `npm run training:e2e`
4. relevante Kernchecks (`npm run test:core`, ggf. fokussierte Physics-/Training-Specs)
5. `npm run docs:sync`
6. `npm run docs:check`

Freshness-Hinweis:

Vor Task-Abschluss immer `npm run docs:sync && npm run docs:check` ausfuehren.

## Abschlussbericht 2026-03-11

Ergebnis: `PARTIAL PASS`.

Verifikation:

1. `node scripts/training-loop.mjs --runs 2 --episodes 2 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict false --with-trainer-server true --stop-on-fail true` -> PASS (`data/training/series/20260311T222457Z/loop.json`).
2. `npm run training:e2e` -> PASS (`stamp=20260311T220754Z`).
3. `node --test tests/trainer-v34-*.test.mjs` -> PASS (13/13).
4. `npx playwright test tests/training-environment.spec.js --workers=1` -> PASS (10/10, inkl. `T99`).
5. `npm run test:core` -> FAIL (`T7: Spiel startet - HUD sichtbar`, Timeout).
6. Isolierte Re-Runs fuer Flake-/Blockerbewertung:
   - `npx playwright test tests/core.spec.js -g "T7: Spiel startet" --workers=1` -> FAIL.
   - `npx playwright test tests/core.spec.js -g "T7: Spiel startet" --workers=1 --retries=1` -> FAIL (inkl. Retry).
7. `npm run docs:sync` -> PASS.
8. `npm run docs:check` -> PASS.
9. `npm run build` -> PASS.

Restrisiken im Zwischenstand 2026-03-11:

1. Core-Gate `T7` war zu diesem Zeitpunkt ein reproduzierbarer Blocker fuer den Vollabschluss.
2. Erster Run nach `resume-checkpoint=latest` kann ohne vorhandenes Checkpoint erwartbar mit `loaded=false` starten; ab Folgerun wird `latest` geladen.

## Abschlussbericht 2026-03-13

Ergebnis: `PASS`.

Verifikation:

1. `node scripts/training-loop.mjs --runs 2 --episodes 2 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict false --with-trainer-server true --stop-on-fail true` -> PASS (`data/training/series/20260313T124626Z/loop.json`).
2. `npm run training:e2e` -> PASS (`stamp=20260313T124557Z`).
3. `node --test tests/trainer-v34-*.test.mjs` -> PASS (13/13).
4. `npx playwright test tests/training-environment.spec.js --workers=1` -> PASS (10/10, inkl. `T99`).
5. `TEST_PORT=5341 PW_RUN_TAG=plan-core PW_OUTPUT_DIR=test-results/plan-core PW_WORKERS=1 npm run test:core` -> PASS (82 passed, 1 skipped).
6. `npm run docs:sync` -> PASS.
7. `npm run docs:check` -> PASS.
8. `npm run build` -> PASS.

Restrisiken:

1. Der erste `training-loop`-Run mit `resume-checkpoint=latest` kann erwartbar noch `loaded=false` mit `invalid-transition` melden, wenn im frischen Serienlauf noch kein neues `latest` aus dieser Serie existiert; der Folgerun laedt den aktuellen Checkpoint anschließend korrekt.
2. `npm run bot:validate` bleibt funktional gruen, zeigt im aktuellen Stand aber weiterhin viele erzwungene Rundenenden (`forcedRounds=10/17`) und sollte fuer kuenftige Gameplay-/Performance-Arbeit beobachtet werden.

## Statuslog 2026-03-16 - Resume-/Long-Run-Haertung

Umgesetzt:

1. `training-loop` und `training:e2e` leiten lange Run-/Trainer-Timeouts jetzt vollstaendig an `training-run` durch (`timeout-step/episode/run`, `trainer-command-timeout-ms`, Ready-/Probe-Parameter).
2. Auto-Start des Trainer-Servers wartet aktiv auf Port-Readiness statt auf eine fixe 900ms-Pause.
3. `writeTrainerArtifacts` schreibt kein leeres `checkpoint.json` mehr; dadurch zeigen `latest`-Resume-Pfade nicht mehr auf Artefakte mit `checkpoint: null`.
4. `training-run` behaelt beim Latest-Index den letzten gueltigen Checkpoint-Pfad, wenn ein Lauf selbst keinen neuen validen Checkpoint exportiert.
5. `WebSocketTrainerBridge` expose't Pending-Zaehler im Telemetrie-Snapshot; der Run-Drain nutzt diese Infos fuer lange Serienlaeufe.

Verifikation:

1. `node --test tests/trainer-v34-bridge.test.mjs tests/trainer-v34-loop.test.mjs` -> PASS.
2. `node scripts/training-e2e.mjs --bridge-mode bridge --resume-checkpoint latest --resume-strict true --with-trainer-server true --episodes 1 --seeds 11 --modes hunt-2d --timeout-run-ms 123456 --trainer-command-timeout-ms 20000 --trainer-server-ready-timeout-ms 30000` -> PASS (`stamp=20260316T180905Z`).
3. `node scripts/training-loop.mjs --runs 2 --episodes 50 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict true --with-trainer-server true --timeout-run-ms 900000 --stage-timeout-ms 900000 --trainer-command-timeout-ms 20000 --trainer-server-ready-timeout-ms 30000` -> PASS (`data/training/series/20260316T181558Z/loop.json`).

Ergebnis:

1. Kumulative Resume-Laeufe sind lokal wieder reproduzierbar.
2. `latest.json` referenziert nach dem Abschluss einen validen Checkpoint unter `data/training/models/20260316T181558Z-r02/checkpoint.json`.

## Statuslog 2026-03-16 - Export-/Latest-Isolation und weiterer Trainingsfortschritt

Umgesetzt:

1. `training-eval` und `training-gate` respektieren jetzt ebenfalls `--write-latest false`; `training-loop` und `training:e2e` reichen den Schalter an alle Stages weiter.
2. Testlaeufe fuer Loop-/Resume-Pfade sichern `data/training/runs/latest.json` gegen Seiteneffekte ab; `trainer-v34-resume-latest` nutzt einen eigenen Latest-Index.
3. `training-run` wartet beim Bridge-Drain jetzt auf die reale Ack-Backlog-Schaetzung (`trainingRequests - ackResponses`) statt nur auf den bei `512` gekappten Pending-Zaehler.
4. Die Caps fuer `--bridge-drain-timeout-ms` und `--trainer-command-timeout-ms` wurden fuer echte Long-Runs angehoben; dadurch funktionieren Checkpoint-Export und `resume-checkpoint=latest` auch nach backlog-lastigen Serienlaeufen.

Verifikation:

1. `node --test tests/trainer-v34-loop.test.mjs tests/trainer-v34-resume-latest.integration.test.mjs tests/trainer-v34-run-fallback.test.mjs tests/trainer-v34-bridge.test.mjs` -> PASS.
2. `node scripts/training-loop.mjs --runs 1 --episodes 25 --seeds 11,23,37,41 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --bridge-mode bridge --resume-checkpoint data/training/models/20260316T181558Z-r02/checkpoint.json --resume-strict true --with-trainer-server true --timeout-run-ms 900000 --stage-timeout-ms 1200000 --trainer-command-timeout-ms 60000 --trainer-server-ready-timeout-ms 30000 --bridge-drain-timeout-ms 240000` -> PASS (`data/training/series/20260316T201750Z/loop.json`, neuer Checkpoint `data/training/models/20260316T201750Z-r01/checkpoint.json`).
3. `node scripts/training-loop.mjs --runs 1 --episodes 25 --seeds 11,23,37,41 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict true --with-trainer-server true --timeout-run-ms 900000 --stage-timeout-ms 1200000 --trainer-command-timeout-ms 60000 --trainer-server-ready-timeout-ms 30000 --bridge-drain-timeout-ms 240000` -> PASS (`data/training/series/20260316T201922Z/loop.json`, neuer Checkpoint `data/training/models/20260316T201922Z-r01/checkpoint.json`).
4. `npm run bot:validate` -> PASS (`data/bot_validation_report.json`, `docs/Testergebnisse_Phase4b_2026-03-16.md`).

Ergebnis:

1. `latest.json` zeigt aktuell auf `20260316T201922Z-r01` mit validem Checkpoint unter `data/training/models/20260316T201922Z-r01/checkpoint.json`.
2. Die aktuelle Bot-Validierung liegt bei `botWinRate=0.5`, `stuckEvents=0`, `forcedRounds=8/16`; Hunt-Szenarien sind deutlich staerker als Classic.
3. `npm run build` ist aktuell nicht gruen, aber wegen eines bestehenden Architektur-/Lint-Gates in `src/core/config/maps/MapPresetCatalog.js` und nicht wegen des Trainingspfads.
