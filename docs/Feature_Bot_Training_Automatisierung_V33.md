# Feature: Bot-Training-Automatisierung V33

Stand: 2026-03-11

## Ziel

Die bestehende additive Trainingsumgebung (V32) soll auf einen automatisierten End-to-End-Flow erweitert werden, damit Training reproduzierbar laeuft und am Ende automatisch bewertet werden kann.

Der Ziel-Flow:

1. batch-faehiger Trainingslauf ueber Episoden/Seeds/Modi
2. automatische Eval-Runs mit festen Szenarien
3. automatisches Gate (`pass`/`fail`) ueber KPI-Schwellen
4. reproduzierbare Artefakte + Exit-Code fuer lokale Nutzung und CI

## Nicht-Ziele

1. Kein Breaking Change am Observation-Schema V1.
2. Kein Breaking Change am BotActionContract V1.
3. Kein Pflicht-Cluster-/GPU-Training in dieser Phase.
4. Kein Umbau von V31-Match-Resolver-Kerndateien (`RuntimeConfig`, `BotPolicyTypes`, `BotPolicyRegistry`, `EntitySetupOps`, `MatchSessionFactory`).

## Architektur-Check

Bestehende Bausteine:

1. `src/entities/ai/training/DeterministicTrainingStepRunner.js` liefert reproduzierbare `reset`/`step`-Transitions.
2. `src/entities/ai/training/TrainingTransportFacade.js` koppelt Step-Runner und Bridge.
3. `src/state/training/EpisodeController.js` und `RewardCalculator.js` kapseln Episode/Reward.
4. `src/entities/ai/training/WebSocketTrainerBridge.js` bietet optionalen Transport.
5. `scripts/training-smoke.mjs` und `scripts/training-eval-smoke.mjs` sind vorhandene lokale Smokes.

Aktuelle Luecken zur Vollautomatisierung:

1. Kein orchestrierter Batch-Runner fuer viele Episoden/Seeds.
2. Kein standardisiertes Eval+Gate mit harten KPI-Schwellen und Exit-Code.
3. Keine einheitliche Artefaktstruktur fuer Run/Eval/Gate in einem Lauf.
4. Kein dedizierter CI-kompatibler Gesamtbefehl (`training:e2e`).

Risiko-Rating: `mittel-hoch`

## Parallelbetrieb (3 Bots)

V33 ist fuer parallele Umsetzung mit drei Bots aufgeteilt.

Bot A besitzt primaer:

1. `src/entities/ai/training/**` (Automationskern ausser Bridge-spezifische Erweiterungen)
2. `scripts/training-run.mjs`
3. Orchestrierungsanteile fuer `training:e2e` (ohne UI)

Bot B besitzt primaer:

1. `src/entities/ai/training/**` (Bridge-/Trainer-Client-Lane)
2. `scripts/training-eval.mjs`, `scripts/training-gate.mjs`
3. Gate-KPI-/Threshold-Lane unter `src/state/training/**` falls noetig

Bot C besitzt primaer:

1. `index.html`, `src/core/GameBootstrap.js`
2. `src/ui/menu/**`, `src/core/runtime/MenuRuntimeDeveloperTrainingService.js`, `src/core/GameRuntimeFacade.js`, `src/core/GameDebugApi.js`
3. `tests/training-*.spec.js`, `docs/Bot-Training-Schnittstelle.md`

Shared-Pfade:

1. `tests/**` (append-only bzw. klar getrennte Testdateien)
2. `docs/**` (append-only; Fremdeingriffe im Conflict-Log dokumentieren)
3. `package.json` nur durch Bot B in dieser Phase

## Phasen

- [ ] 33.0 Contract- und KPI-Freeze
  - [ ] 33.0.1 Run-Konfig-Vertrag festlegen (`episodes`, `seeds`, `modes`, `maxSteps`, `bridgeMode`, `timeouts`)
  - [ ] 33.0.2 KPI- und Gate-Vertrag festlegen (`episodeReturnMean`, `terminalRate`, `truncationRate`, `invalidActionRate`, `runtimeErrorCount`)
  - [ ] 33.0.3 Artefaktstruktur einfrieren (`data/training/runs/<stamp>/{run,eval,gate}.json`)
  - [ ] 33.0.4 Parallel-Ownership fuer A/B/C dokumentieren

- [ ] 33.1 Automationskern Batch-Runner (Bot A)
  - [ ] 33.1.1 `TrainingAutomationRunner` fuer Episode-/Seed-Schleifen bauen
  - [ ] 33.1.2 Reuse von `DeterministicTrainingStepRunner` und `TrainingTransportFacade` erzwingen (keine doppelte Step-Logik)
  - [ ] 33.1.3 Basismetriken pro Episode/Run aggregieren (Return, Steps, Terminal-Grund)
  - [ ] 33.1.4 `scripts/training-run.mjs` fuer reproduzierbare Batch-Laeufe liefern

- [ ] 33.2 Eval- und Gate-Lane (Bot B)
  - [ ] 33.2.1 `scripts/training-eval.mjs` fuer feste Eval-Seeds/Szenarien bauen
  - [ ] 33.2.2 `scripts/training-gate.mjs` mit harten Schwellen + Exit-Code (`0`/`1`) bauen
  - [ ] 33.2.3 Gate-Bericht mit klaren PASS/FAIL-Details je KPI ausgeben
  - [ ] 33.2.4 `package.json` Scripts (`training:run`, `training:eval`, `training:gate`, `training:e2e`) verdrahten

- [ ] 33.3 Bridge-/Trainer-Client-Lane (Bot B)
  - [ ] 33.3.1 Optionalen `TrainerSessionClient`/Adapter fuer request-action/ack erweitern
  - [ ] 33.3.2 Timeout-/Retry-/Fallback-Pfad hart absichern
  - [ ] 33.3.3 Bridge-Telemetrie (`latency`, `timeouts`, `fallbacks`) in Eval/Gate einspeisen
  - [ ] 33.3.4 Mock-Bridge-Szenarien fuer deterministische Tests vorbereiten

- [ ] 33.4 Developer-UI Automationslane (Bot C)
  - [ ] 33.4.1 Dev-Panel um `Run Batch`, `Run Eval`, `Run Gate` erweitern
  - [ ] 33.4.2 UI-Input->Payload weiterhin modular halten (`MenuDeveloperTrainingEventPayload`)
  - [ ] 33.4.3 Runtime-Service fuer Fortschritt/Ergebnisanzeige kapseln (keine Monolith-Logik in `GameRuntimeFacade`)
  - [ ] 33.4.4 Artefaktpfade/KPI-Ergebnis im Panel klar anzeigen

- [ ] 33.5 Test-Lane Training Automation (Bot C, shared mit B)
  - [ ] 33.5.1 Neue Training-Automation-Tests fuer Seed-Reproduzierbarkeit und Batch-Ende bauen
  - [ ] 33.5.2 Gate-Tests fuer PASS/FAIL und Exit-Code bauen
  - [ ] 33.5.3 UI-Flow-Tests fuer neue Automationsbuttons (`Run Batch/Eval/Gate`) bauen
  - [ ] 33.5.4 Flaky-Risiko markieren und isolierte Re-Run-Regel dokumentieren

- [ ] 33.6 Baseline- und Threshold-Kalibrierung (Bot B)
  - [ ] 33.6.1 Baseline-Runs auf fixen Seeds erzeugen und als Referenz ablegen
  - [ ] 33.6.2 Gate-Schwellen datenbasiert kalibrieren (nicht willkuerlich)
  - [ ] 33.6.3 Drift-Regeln definieren (`warn` vs `hard fail`)
  - [ ] 33.6.4 Restrisiken fuer echte externe Trainerlatenz dokumentieren

- [ ] 33.7 End-to-End-Orchestrierung (Bot A + B)
  - [ ] 33.7.1 `training:e2e` als deterministische Reihenfolge `run -> eval -> gate` absichern
  - [ ] 33.7.2 Fehlerfortpflanzung und Exit-Codes fuer CI robust machen
  - [ ] 33.7.3 Artefaktindex (`latest`) erzeugen
  - [ ] 33.7.4 Laufzeitbudget fuer lokale/CI-Ausfuehrung dokumentieren

- [ ] 33.9 Abschluss-Gate und Doku-Freeze
  - [ ] 33.9.1 Verifikation: `training:e2e`, relevante Training-Tests, `test:core`
  - [ ] 33.9.2 Verifikation: `docs:sync`, `docs:check`, `build`
  - [ ] 33.9.3 Doku-Update (`Bot-Training-Schnittstelle`, Umsetzungsplan-Status, Restpunkte)
  - [ ] 33.9.4 Lock-Release + sauberer Abschlussbericht mit PASS/FAIL

## Definition of Done

1. Ein einziger Befehl `npm run training:e2e` fuehrt Training, Eval und Gate reproduzierbar aus.
2. Gate liefert belastbares PASS/FAIL mit Exit-Code und KPI-Details.
3. Artefakte fuer Run/Eval/Gate liegen strukturiert unter `data/training/runs/**`.
4. Developer-Menue kann Batch/Eval/Gate ausloesen, ohne bestehende V32-Vertraege zu brechen.
5. Relevante Tests und Repo-Gates sind gruen.

## Verifikation

Pflichtreihenfolge zum Abschluss:

1. neue/angepasste Training-Automation-Tests
2. `npm run training:e2e`
3. `npm run test:core`
4. `npm run docs:sync`
5. `npm run docs:check`
6. `npm run build`

Optional:

1. `npm run test:stress` (bei UI-Eingriffen stark empfohlen)
2. isolierte Re-Runs fuer bekannte Flake-Kandidaten mit Dokumentation
