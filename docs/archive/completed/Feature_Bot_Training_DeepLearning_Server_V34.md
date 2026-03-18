# Feature: Bot-Training DeepLearning Server V34

Stand: 2026-03-13

## Ziel

Die bisherige Mock-Bridge soll zu einem echten lernfaehigen Trainer ausgebaut werden, damit Bot-Aktionen aus einem trainierten Modell kommen und Modellgewichte reproduzierbar gespeichert/geladen werden koennen.

Der Ziel-Flow:

1. WebSocket-Trainerprozess laeuft stabil lokal (`ws://127.0.0.1:8765`).
2. `bot-action-request` wird vom Modell inferiert beantwortet.
3. `training-reset`/`training-step` werden fuer Online-Lernen (Replay + Updates) verarbeitet.
4. Checkpoints + Metriken werden als Artefakte abgelegt.
5. Run/Eval/Gate koennen mit echtem Trainer durchlaufen.

## Nicht-Ziele

1. Kein GPU-/Cluster-Zwang in dieser Phase.
2. Kein Umbau des Observation-Schemas V1 oder Action-Contracts V1.
3. Kein Eingriff in Menu-UX-Lanes ausser minimaler Bedien-/Doku-Hinweise.

## Architektur-Check

Bestehende Bausteine (Reuse):

1. `src/entities/ai/training/WebSocketTrainerBridge.js` (WS-Client, Telemetrie).
2. `src/entities/ai/training/TrainingTransportFacade.js` (Reset/Step-Emission).
3. `scripts/training-run.mjs`, `scripts/training-eval.mjs`, `scripts/training-gate.mjs`.
4. `scripts/trainer-server.mjs` (derzeit Mock-Server als Startpunkt).

Neue Kernbausteine (V34):

1. `trainer/server/**` fuer echten Trainerprozess (Session-, Replay-, Update-Loop).
2. `trainer/model/**` fuer Modellarchitektur, Inferenz, Optimierung, Checkpoint-I/O.
3. `trainer/config/**` fuer deterministische Hyperparameter + Environment-Overrides.
4. `trainer/artifacts/**` fuer Modell-/Metrikablage und Rotationsregeln.

Reuse-vs-New Entscheidung:

1. WS-Protokoll bleibt kompatibel, damit Runtime-Bridge nicht gebrochen wird.
2. Lernlogik kommt bewusst in neues `trainer/**`, damit Game-Runtime schlank bleibt.
3. `scripts/trainer-server.mjs` wird nur als Launcher/Bootstrap behalten.

Risiko-Rating: `hoch`

Hauptrisiken:

1. Instabiles Lernen (Reward-/Hyperparameter-Divergenz).
2. Event-Backpressure bei hoher Step-Rate.
3. Nicht-deterministische Ergebnisse ohne Seed-/Checkpoint-Disziplin.

## Doku-Impact

1. `docs/Bot-Training-Schnittstelle.md` (Protokoll + Betriebsmodus + Runbook).
2. `docs/Feature_Bot_Training_DeepLearning_Server_V34.md` (dieser Plan, Statuspflege).
3. `docs/Umsetzungsplan.md` (Plan-Eingang + Status).

## Datei-Ownership-Check

1. Scope liegt primaer in `scripts/**`, `src/entities/ai/training/**`, neu `trainer/**`, `tests/**`, `docs/**`.
2. Keine neuen Konflikte mit gelockten Hauptbloecken; Shared-Pfade werden additiv gepflegt.
3. Keine UI-Kerndateien als Pflichtpfad fuer V34.

## Phasen

- [x] 34.0 Contract- und Laufzeit-Freeze
  - [x] 34.0.1 WS-Vertrag fuer `bot-action-request`, `training-reset`, `training-step` finalisieren
  - [x] 34.0.2 Session-/Seed-/Checkpoint-Vertrag (Load/Save/Resume) festlegen
  - [x] 34.0.3 Failure-Policy (Timeout, Retry, Backpressure, Fallback) verbindlich definieren

- [x] 34.1 Trainer-Server-Fundament
  - [x] 34.1.1 `scripts/trainer-server.mjs` als Bootstrap auf `trainer/server` umstellen
  - [x] 34.1.2 Session-Manager mit verbindlicher Message-Routing-Logik bauen
  - [x] 34.1.3 Health-/Stats-Endpunkte (oder WS-Stats-Message) fuer Betrieb einfuehren

- [x] 34.2 Replay- und Datenpipeline
  - [x] 34.2.1 Transition-Schema (`s, a, r, s', done`) inkl. Validierung implementieren
  - [x] 34.2.2 Replay-Buffer (Kapazitaet, Sampling, Priorisierung optional) bauen
  - [x] 34.2.3 Observation-Normalisierung und Action-Maskierung robust kapseln

- [x] 34.3 Modell und Optimierung (Deep Learning)
  - [x] 34.3.1 Basismodell (DQN/MLP) mit deterministischer Initialisierung implementieren
  - [x] 34.3.2 Trainingsschritt (Loss, Backprop, Target-Update) integrieren
  - [x] 34.3.3 Inferenzpfad mit Epsilon-Greedy und sicheren Action-Grenzen absichern

- [x] 34.4 Bridge-Integration in den Lauf
  - [x] 34.4.1 `WebSocketTrainerBridge` Handshake/Readiness gegen echten Trainer stabilisieren
  - [x] 34.4.2 `training-run` Bridge-Modus fuer echtes ACK-/Action-Handling haerten
  - [x] 34.4.3 Telemetrie um Lernmetriken (loss, epsilon, replayFill) erweitern

- [x] 34.5 Checkpoints und Artefakte
  - [x] 34.5.1 Modellablage unter `data/training/models/<runStamp>/` einfuehren
  - [x] 34.5.2 Metrik-Serien unter `data/training/runs/<stamp>/trainer.json` schreiben
  - [x] 34.5.3 `latest`-Index um aktiven Checkpoint und Resume-Quelle erweitern

- [x] 34.6 Test- und Stabilitaets-Gates
  - [x] 34.6.1 Unit-Tests fuer Replay, Sampler und Action-Sanitizing bauen
  - [x] 34.6.2 WS-Integrations-Tests mit realem Trainerprozess bauen
  - [x] 34.6.3 deterministische Smoke-Session mit festen Seeds als Regression absichern

- [x] 34.7 Betriebs- und Startflow
  - [x] 34.7.1 Startskripte (`start_trainer_server`, `start_training_bridge`) fuer V34-Lifecycle finalisieren
  - [x] 34.7.2 `.env`/CLI-Parameter fuer Hyperparameter + Pfade dokumentieren
  - [x] 34.7.3 Schnellstart fuer lokale Nutzung und CI beschreiben

- [x] 34.9 Abschluss-Gate und Doku-Freeze
  - Abgeschlossen am: `2026-03-13`
  - [x] 34.9.1 Verifikation: zielgerichtete V34-Tests, `npm run test:core`, `npm run build`
  - [x] 34.9.2 Verifikation: `npm run docs:sync` und `npm run docs:check`
  - [x] 34.9.3 Doku-Freeze + Status-Update in Umsetzungsplan und Schnittstellen-Doku
  - Status 2026-03-13: `node --test tests/trainer-v34-*.test.mjs` PASS (13/13), `npm run training:e2e` PASS (`stamp=20260313T124557Z`), `TEST_PORT=5341 PW_RUN_TAG=plan-core PW_OUTPUT_DIR=test-results/plan-core PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`), `npm run docs:sync` PASS, `npm run docs:check` PASS und `npm run build` PASS.

## Definition of Done

1. Ein echter Trainerprozess beantwortet `bot-action-request` mit modellbasierten Aktionen.
2. `training-step` wird in einem echten Lernpfad verarbeitet (Replay + Update).
3. Checkpoints sind reproduzierbar speicher-/ladbar und im Artefaktindex referenziert.
4. Bridge-Telemetrie zeigt reale Requests/Responses/Loss-Trends statt Mock-Only.
5. V34-Tests sowie Repo-Gates sind gruen.

## Verifikation

Pflichtreihenfolge bei Abschluss:

1. neue V34 Unit-/Integrations-Tests
2. Bridge-Run gegen echten Trainer (`start_training_bridge.bat ...`)
3. `npm run training:e2e`
4. `npm run test:core`
5. `npm run docs:sync`
6. `npm run docs:check`
7. `npm run build`

Freshness-Hinweis:

Vor Task-Abschluss immer `npm run docs:sync && npm run docs:check` ausfuehren.

## Statuslog (append-only)

### 2026-03-11 - Iteration 1 (34.0 bis 34.2)

Umgesetzt:

1. `34.0` Contract- und Laufzeit-Freeze im neuen Trainer-Layer:
   - `trainer/config/TrainerRuntimeContract.mjs`
   - `trainer/config/TrainerConfig.mjs`
   - verbindliche Message-Typen (`bot-action-request`, `training-reset`, `training-step`) sowie ACK-/Error-Typen und Failure-Codes.
2. `34.1` Trainer-Server-Fundament:
   - Bootstrap von `scripts/trainer-server.mjs` auf neues `trainer/server/TrainerServer.mjs`.
   - Session-Routing in `trainer/session/TrainerSession.mjs`.
   - Health-/Stats-Routing ueber WS-Requests (`trainer-health-request`, `trainer-stats-request`).
3. `34.2` Replay- und Datenpipeline:
   - Transition-Validierung und Normalisierung in `trainer/replay/TransitionSchema.mjs`.
   - Replay-Buffer in `trainer/replay/ReplayBuffer.mjs`.
   - Observation-Normalisierung und Action-Maskierung in:
     - `trainer/session/ObservationNormalizer.mjs`
     - `trainer/session/ActionSanitizer.mjs`
4. Neue V34-Tests:
   - `tests/trainer-v34-replay.test.mjs`
   - `tests/trainer-v34-server.integration.test.mjs`

Hinweis:

- Fokus war bewusst auf 34.0-34.2 (Fundament) begrenzt.
- Modell-/Optimizer-Pfad (`34.3`) ist noch offen.

### 2026-03-11 - Iteration 2 (34.3 Modell und Optimierung)

Umgesetzt:

1. `34.3.1` Basismodell (DQN/MLP) mit deterministischer Initialisierung:
   - `trainer/model/SeededRng.mjs`
   - `trainer/model/DqnMlpNetwork.mjs`
   - `trainer/model/ActionVocabulary.mjs`
   - `trainer/model/DqnTrainer.mjs`
2. `34.3.2` Trainingsschritt (TD-Loss + Backprop + Target-Sync):
   - Training nach Replay-Warmup und `trainEvery` direkt in `TrainerSession` verdrahtet.
   - `training-step` ACK enthaelt Trainingsmetriken (`loss`, `epsilon`, `trained`, `optimizerSteps`, `targetSynced`).
3. `34.3.3` Inferenz mit Epsilon-Greedy und sicheren Action-Grenzen:
   - `bot-action-request` wird ueber DQN-Inferenz beantwortet.
   - Planar-/Item-Grenzen werden ueber Action-Sanitizing erzwungen.
4. V34-Testausbau:
   - `tests/trainer-v34-model.test.mjs` (Determinismus, Backprop-Update, Action-Safety)
   - `tests/trainer-v34-server.integration.test.mjs` erweitert um Trainingsmetriken

Status:

- `34.0` bis `34.3` funktional umgesetzt.
- `34.4+` (Bridge-Telemetrie-Vertiefung, Checkpoint-Artefakte, Betriebsflow-Haertung) verbleiben fuer Folgeiteration.

### 2026-03-11 - Iteration 3 (34.4 bis 34.9)

Umgesetzt:

1. `34.4` Bridge-Integration gehaertet:
   - `WebSocketTrainerBridge` um `trainer-ready` Handshake/Readiness-Status erweitert.
   - Command-Channel (`submitCommand`) fuer request/response Pfade stabilisiert.
   - Lerntelemetrie (`loss`, `epsilon`, `replayFill`, `optimizerSteps`) in Bridge-Snapshot integriert.
2. `34.5` Checkpoints + Artefakte:
   - Checkpoint-Request/Load-Contract in `trainer/config/TrainerRuntimeContract.mjs` ergaenzt.
   - Session-Routing in `trainer/session/TrainerSession.mjs` um Export/Import + `resumeSource` erweitert.
   - neues `trainer/artifacts/TrainerArtifactStore.mjs` fuer `trainer.json` und `checkpoint.json`.
   - Latest-Index (`data/training/runs/latest.json`) um `trainer`/`checkpoint` und `resumeSource` erweitert.
3. `34.6` Test-/Stabilitaets-Gates:
   - neue Tests:
     - `tests/trainer-v34-bridge.test.mjs`
     - `tests/trainer-v34-checkpoint.integration.test.mjs`
     - `tests/trainer-v34-deterministic-smoke.test.mjs`
   - bestehender Server-Integrationstest um Lernmetrik-Checks erweitert.
4. `34.7` Startflow:
   - `start_training_bridge.bat` und `start_trainer_and_training.bat` mit strikt aktiviertem Ready-Handshake.
   - CLI-Hilfe fuer Modellparameter erweitert.
5. `34.9` Abschluss-Freeze:
   - Gate-Fix in `scripts/training-gate.mjs` fuer `latest.stamp`/`latest.runStamp`-Kompatibilitaet.
   - `npm run training:e2e` wieder gruener End-to-End-Lauf.

Verifikation (Iteration 3):

1. V34-Node-Tests (`trainer-v34-*.mjs`): PASS.
2. `start_training_bridge.bat --episodes 100 --seeds 11 --modes hunt-2d`:
   - ohne laufenden Trainer: FAIL (`bridge-ready-check failed`).
   - mit laufendem `scripts/trainer-server.mjs`: PASS.
3. `npm run training:e2e`: PASS (nach Gate-Stamp-Fix).
4. `npm run test:core`: FAIL (Playwright-Timeout-Flake, in zwei Runs einmal `T7`, einmal `T10e`).
5. `npm run docs:sync`: PASS.
6. `npm run docs:check`: PASS.
7. `npm run build`: PASS.

Status:

- V34-Funktionsziele `34.4` bis `34.7` sowie `34.9` sind umgesetzt.
- Offener Restrisiko-Punkt bleibt die bekannte `test:core`-Flake-Lane ausserhalb des V34-Scopes.
