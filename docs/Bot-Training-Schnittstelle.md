# Bot-Training Schnittstelle (Reinforcement Learning / KI)

Dieses Dokument beschreibt die bestehende Spiel- und Bot-Architektur als Grundlage fuer kuenftiges Bot-Training (z. B. Reinforcement Learning oder PPO). Die KI laeuft kontinuierlich im `update`-Loop und erzeugt aus Observations konkrete Actions.

## Modulstatus (Stand 2026-03-10)

- `src/entities/Bot.js` ist die Runtime-Huelle mit zentralem `update()`.
- Probe-Logik liegt in `src/entities/ai/BotProbeOps.js`.
- Portal-Intent und Exit-Safety liegen in `src/entities/ai/BotPortalOps.js`.
- Projektil-, Hoehen-, Spacing- und Pursuit-Sensorik liegt in `src/entities/ai/BotThreatOps.js`.

## Runtime-Bottypen pro Match (V31)

Die Match-Runtime loest genau einen Bot-Typ aus `gameMode + planarMode` auf. Alle Bots im Match nutzen denselben Typ:

- `CLASSIC + 3d` -> `classic-3d`
- `CLASSIC + planar` -> `classic-2d`
- `HUNT + 3d` -> `hunt-3d`
- `HUNT + planar` -> `hunt-2d`

Legacy-Strategien bleiben fuer Kompatibilitaet erhalten:

- `botPolicyStrategy=bridge` -> `classic-bridge|hunt-bridge`
- `botPolicyStrategy=rule-based` -> `rule-based`

## 1. Output / Actions (Aktionsraum)

Die Bot-Klasse (`BotAI`) erzeugt pro Frame eine Entscheidung (`_decision`) und mappt diese auf Input-Flags.
Ein RL-Modell sollte typischerweise vorhersagen:

- Steuerung (diskret oder kontinuierlich):
  - `yaw` in `[-1, 0, 1]` fuer `input.yawLeft` / `input.yawRight`
  - `pitch` in `[-1, 0, 1]` fuer `input.pitchDown` / `input.pitchUp`
  - optional `roll` in `[-1, 0, 1]`
- Aktionen (diskret/boolean):
  - `boost` in `true/false`
  - `useItem` in `[-1 ... maxItemIndex]`
  - `shootItem` plus `shootItemIndex`
  - `shootMG` (nur im Hunt-Modus)

Fuer PPO-Setups passt in der Regel ein Multi-Discrete Action Space.

---

## 2. Input / Observations (Zustandsraum)

Die Engine liefert aufbereitete Sensor- und Zustandsdaten (`sense` und `state`) als Input-Vektor.

### A. Raycast-Sensoren (Probes)

Es gibt 12 Probe-Richtungen:
`forward`, `left`, `right`, `leftWide`, `rightWide`, `up`, `down`, `upLeft`, `upRight`, `downLeft`, `downRight`, `backward`.

Pro Probe werden u. a. folgende Features ermittelt:

- `wallDist`
- `trailDist`
- `clearance`
- `immediateDanger`
- `risk`

### B. Ziel- und Gegner-Tracking

- `targetDistanceSq`
- `pursuitAimDot`
- `pursuitYaw` / `pursuitPitch`
- `pressure`

### C. Ausweich-Sensoren

- `projectileThreat`
- `projectileEvadeYaw` / `projectileEvadePitch`
- `botRepulsionYaw` / `botRepulsionPitch`
- `heightBias`

### D. Interner Zustand

- `speed` / `baseSpeed`
- HP / Schild (vor allem im Hunt-Modus)
- `itemUseCooldown` / `itemShootCooldown`
- gehaltene Items / Munition (z. B. One-Hot)
- `recoveryActive`

---

## 3. Architektur fuer Modell-Training

Fuer eine Python-basierte RL-Umgebung (z. B. Gym/PettingZoo) wird typischerweise benoetigt:

1. Headless-Modus fuer die Simulationslogik (moeglichst mit Time-Scaling).
2. API-Bruecke (REST oder WebSocket) fuer Observation- und Action-Transfer.
3. Reward-Funktion im Spielcode (z. B. Ueberleben, Kills, Item-Nutzung, Strafpunkte fuer Crash/Stuck).
4. Step-Synchronisation: State -> Inferenz -> Action -> naechster Simulationsschritt.

## 4. Beispiel Observation-Vektor (Flat Array)

Empfohlen ist ein normalisierter 1D-Vektor (z. B. Wertebereich `0..1` oder `-1..1`).

- 12 Probes x 2 Kernwerte (Wall/Trail Distanz) = 24 Features
- Ziel-Features (Dot, Distanz, Pitch, Yaw) = 4 Features
- Eigener Zustand (Speed, HP, Schild, Boost-Status) = 4 Features
- Gegnerdruck und Projektilwarnung = ca. 5 Features
- Map-Kontext (z. B. `mapCaution`, Portal-Bias) = ca. 5 Features

Die Normalisierung sollte konsistent bleiben (z. B. Distanzen relativ zu `lookAhead`), damit Training und Inferenz stabil bleiben.

---

## 5. Additive Trainingsumgebung V32 (Stand 2026-03-11)

Die Trainingsumgebung wurde additiv aufgebaut und aendert den bestehenden Observation-/Action-Vertrag nicht.

Kernmodule:

- `src/entities/ai/training/TrainingContractV1.js`
  - additiver Vertragsrahmen fuer `reset` und `step`
  - Ergebnisfelder pro Transition: `reward`, `done`, `truncated`
- `src/state/training/EpisodeController.js`
  - Episoden-Lifecycle, `max-steps`-Truncation und Terminal-Reasons
- `src/state/training/RewardCalculator.js`
  - Reward-Shaping fuer Survival, Kill, Crash, Stuck, Item- und Damage-Signale
- `src/entities/ai/training/DeterministicTrainingStepRunner.js`
  - deterministischer Runner fuer reproduzierbare `reset`/`step`-Ablaufe
- `src/entities/ai/training/TrainerPayloadAdapter.js`
  - additive Runtime-/Training-Payloads fuer Transportpfade
- `src/entities/ai/training/TrainingTransportFacade.js`
  - Koppelstelle zwischen Step-Runner und optionaler Transport-Bridge

Transport:

- `src/entities/ai/training/WebSocketTrainerBridge.js` bleibt kompatibel fuer `submitObservation(...)`.
- Additiv vorhanden: `submitTrainingPayload(...)`, `submitTrainingReset(...)`, `submitTrainingStep(...)`, `consumeLatestResponse()`.
- `src/entities/ai/ObservationBridgePolicy.js` nutzt den Payload-Adapter fuer den bestehenden Observation-Transport.

Domaenenbeschreibung (vorlaeufig, bewusst ohne harte V31-Kopplung):

- Domain wird intern ueber `mode + planarMode` abgeleitet (`classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`).
- Eine spaetere optionale Kopplung an den von V31 aufgeloesten Match-Bot-Typ ist vorbereitet, aber nicht erzwungen.

Developer-Panel Interface (modular, additiv):

- `index.html` stellt unter `submenu-developer` ein Training-Panel mit `Training Reset`, `Training Step` und `Auto Step (N)` bereit.
- `src/ui/menu/MenuDeveloperTrainingEventPayload.js` kapselt die UI->Event-Payload-Bildung fuer Trainingsaktionen.
- `src/core/runtime/MenuRuntimeDeveloperTrainingService.js` kapselt Runtime-Handling, Output-Rendering und Toast-Feedback.
- `src/core/DeveloperTrainingController.js` kapselt Sessionzustand, deterministische Observation-Stubs und `reset/step` auf `TrainingTransportFacade`.
- `src/core/GameDebugApi.js` bleibt Entry-Point fuer `resetTrainingSession(...)`, `stepTrainingSession(...)`, `runTrainingAutoSteps(...)` und `getTrainingSessionSnapshot()`.

---

## 6. Developer-Automation V33 (Bot-C-Lane, Stand 2026-03-11)

Das Developer-Panel wurde fuer den V33-Automationsfluss erweitert, ohne die V32-Vertraege zu brechen.

UI/Events:

- Neue Developer-Buttons: `Run Batch`, `Run Eval`, `Run Gate`.
- Neue Event-Typen: `developer_training_run_batch`, `developer_training_run_eval`, `developer_training_run_gate`.
- `MenuDeveloperTrainingEventPayload` kapselt weiterhin die Input->Payload-Logik (inkl. CSV-Seeds/-Modes, Timeouts und Gate-Thresholds).

Runtime-Service:

- `MenuRuntimeDeveloperTrainingService` kapselt die neuen Automation-Aktionen und haelt `GameRuntimeFacade` frei von Monolith-Logik.
- Das Training-Output-Panel zeigt strukturierte JSON-Ergebnisse inkl. KPI-Block und Artefaktpfad.

Debug-API (Panel-seitig):

- Neue Entry-Points:
  - `runTrainingBatch(input)`
  - `runTrainingEval(input)`
  - `runTrainingGate(input)`
  - `getTrainingAutomationSnapshot()`
- KPI-Vertrag fuer Eval/Gate:
  - `episodeReturnMean`
  - `terminalRate`
  - `truncationRate`
  - `invalidActionRate`
  - `runtimeErrorCount`
- Gate-Ergebnis enthaelt `pass` und `exitCode` (`0`/`1`) sowie Check-Details je KPI.

Artefaktpfad-Konvention (Panel-Ausgabe):

- `data/training/runs/<stamp>/run.json`
- `data/training/runs/<stamp>/eval.json`
- `data/training/runs/<stamp>/gate.json`

---

## 7. Automation-Core V33 (Bot-A-Lane, Stand 2026-03-11)

Der Automation-Core liefert den reproduzierbaren Batch-Lauf fuer die Trainingspipeline und bereitet die E2E-Orchestrierung fuer Eval/Gate vor.

Kernmodule:

- `src/entities/ai/training/TrainingAutomationContractV33.js`
  - normalisiert den Run-Vertrag (`episodes`, `seeds`, `modes`, `maxSteps`, `bridgeMode`, `timeouts`)
  - friert KPI-Basisfelder ein (`episodeReturnMean`, `terminalRate`, `truncationRate`, `invalidActionRate`, `runtimeErrorCount`)
  - definiert Artefaktlayout `data/training/runs/<stamp>/{run,eval,gate}.json` plus `data/training/runs/latest.json`
- `src/entities/ai/training/TrainingAutomationRunner.js`
  - fuehrt deterministische Schleifen ueber `modes x seeds x episodes` aus
  - erzwingt Reuse von `TrainingTransportFacade` / `DeterministicTrainingStepRunner` (kein duplizierter Step-Contract)
  - aggregiert Episode-/Run-Metriken inkl. Terminal-/Truncation-Reason

Skripte:

- `scripts/training-run.mjs`
  - CLI fuer reproduzierbare Batch-Laeufe
  - schreibt `run.json` und aktualisiert `latest.json`
- `scripts/training-e2e.mjs`
  - orchestriert deterministisch `run -> eval -> gate`
  - propagiert Stage-Fehler ueber Exit-Code
  - aktualisiert `latest.json` auch bei Teilfortschritt

Hinweis zur Parallel-Lane:

- `scripts/training-eval.mjs` und `scripts/training-gate.mjs` bleiben Bot-B-Verantwortung.
- Die A-Orchestrierung ist kompatibel vorbereitet und konsumiert diese Stages, sobald vorhanden.

---

## 8. Eval/Gate + Bridge-Telemetrie V33 (Bot-B-Lane, Stand 2026-03-11)

Die Bot-B-Lane liefert den auswertbaren Eval-/Gate-Pfad inklusive Bridge-Robustheit und KPI-Gating.

Skripte:

- `scripts/training-eval.mjs`
  - feste Eval-Seeds (`11`, `23`, `37`, `41`) ueber `classic/hunt` in `2d/3d`
  - schreibt `data/training/runs/<stamp>/eval.json`
  - migriert bei Bedarf `training_smoke_latest.json` nach `runs/<stamp>/run.json`
  - speist Bridge-Mock-Szenarien in die KPI-Bildung ein
- `scripts/training-gate.mjs`
  - liest Eval-Artefakt und bewertet KPI-Schwellen
  - schreibt `data/training/runs/<stamp>/gate.json`
  - gibt je KPI klare `PASS`/`WARN`/`FAIL`-Details aus
  - Exit-Code: `0` bei PASS, `1` bei FAIL

Bridge-/Fallback-Hardening:

- `src/entities/ai/training/WebSocketTrainerBridge.js`
  - Retry- und Timeout-Pfad (`maxRetries`, `retryDelayMs`) fuer request-action/ack
  - Telemetrie-Snapshot: `requestsSent`, `responsesReceived`, `latencyP95Ms`, `timeouts`, `retries`, `fallbacks`
- `src/entities/ai/ObservationBridgePolicy.js`
  - propagiert Fallback-Nutzung in die Bridge-Telemetrie
  - uebernimmt optional Runtime-Config fuer Retry-/Delay-Werte

Gate-KPI-/Threshold-Lane:

- `src/state/training/TrainingGateThresholds.js`
  - Referenz-Baseline `TRAINING_GATE_BASELINE_REFERENCE` aus deterministischen Eval-Runs
  - abgeleitete Drift-Regeln (`warn` vs `hard`) pro KPI
- `src/state/training/TrainingGateEvaluator.js`
  - berechnet KPI-Set:
    - `episodeReturnMean`
    - `terminalRate`
    - `truncationRate`
    - `invalidActionRate`
    - `runtimeErrorCount`
    - `bridgeTimeoutRate`
    - `bridgeFallbackRate`
    - `bridgeLatencyP95Ms`
  - liefert strukturierte Gate-Pruefung inkl. Hard-Fail- und Warnlisten

E2E-Wiring:

- `package.json`
  - `training:run`, `training:eval`, `training:gate`, `training:e2e`
  - `training:e2e` fuehrt deterministisch `run -> eval -> gate` aus
  - `data/training/runs/latest.json` wird pro Lauf fortgeschrieben

Restrisiken (externe Trainerlatenz):

- Die lokale Mock-Baseline ist deterministisch und CI-freundlich, bildet aber echte Netzwerkspitzen nur teilweise ab.
- Fuer produktive externe Trainer sollte `trainerBridgeTimeoutMs`/`trainerBridgeMaxRetries` pro Umgebung kalibriert werden.

---

## 9. DeepLearning Trainer-Server V34 (Stand 2026-03-11, Iteration 1)

Die erste V34-Iteration friert den Runtime-Vertrag fuer den neuen lokalen Trainerprozess ein.

WS-Vertrag (request/step/ack):

- Request `bot-action-request`:
  - Eingehend: `{ id, type, payload }`
  - Antwort: `{ id, ok: true, type: "bot-action-response", action }`
- Request `training-reset`:
  - Eingehend: `{ id, type, payload }`
  - Antwort: `{ id, ok: true, type: "training-ack", requestType: "training-reset", ack: "accepted" }`
- Request `training-step`:
  - Eingehend: `{ id, type, payload }`
  - Antwort: `{ id, ok: true, type: "training-ack", requestType: "training-step", ack: "accepted" }`

Failure-Policy (serverseitig, bridge-kompatibel):

- Timeout/Retry bleiben clientseitig in der Bridge (`WebSocketTrainerBridge`).
- Serverseitig gelten:
  - `payload-too-large` bei zu grossen Frames
  - `invalid-json` / `invalid-envelope` / `missing-id` / `missing-type`
  - `unknown-type`
  - `invalid-transition` fuer fehlerhafte Trainingsframes
  - `backpressure` bei ueberschrittenem `bufferedAmount`-Schwellwert

Trainer-Layer (neu):

- `trainer/config/TrainerRuntimeContract.mjs`
- `trainer/config/TrainerConfig.mjs`
- `trainer/server/TrainerServer.mjs`
- `trainer/session/TrainerSession.mjs`
- `trainer/replay/TransitionSchema.mjs`
- `trainer/replay/ReplayBuffer.mjs`
- `trainer/session/ObservationNormalizer.mjs`
- `trainer/session/ActionSanitizer.mjs`

---

## 10. DQN/MLP Lernpfad V34.3 (Stand 2026-03-11)

Die zweite V34-Iteration aktiviert einen echten Lernpfad im Trainerprozess.

Modell-Layer:

- `trainer/model/DqnMlpNetwork.mjs`
  - MLP-Q-Netz (`input -> hidden(ReLU) -> Q(action)`)
  - deterministische Xavier-Initialisierung per `SeededRng`
- `trainer/model/DqnTrainer.mjs`
  - Epsilon-Greedy Inferenz (`epsilonStart -> epsilonEnd`)
  - Replay-basiertes TD-Training (`reward + gamma * max(Q_target(next))`)
  - periodisches Target-Syncing
- `trainer/model/ActionVocabulary.mjs`
  - diskreter Action-Space fuer DQN-Ausgabe
  - sichere Rueckabbildung auf Runtime-Action-Objekte inkl. Planar-/Item-Grenzen

Session-Wiring:

- `TrainerSession` nutzt fuer `bot-action-request` den DQN-Inferenzpfad.
- `training-step` schreibt weiterhin Replay-Transitions und triggert danach den Optimizer.
- ACK fuer `training-step` fuehrt Trainingsmetriken mit:
  - `trained`, `loss`, `epsilon`, `optimizerSteps`, `targetSynced`, `replayFill`.

Checkpoint-Basis (V34.3):

- `DqnTrainer` stellt `exportCheckpoint()` / `importCheckpoint()` bereit (`v34-dqn-checkpoint-v1`).
- Persistente Artefaktablage (`data/training/models/...`) folgt in V34.5.

---

## 11. DeepLearning Trainer-Server V34.4+ Addendum (Stand 2026-03-11)

Bridge-Handshake / Readiness:

- `WebSocketTrainerBridge` erwartet standardmaessig `trainer-ready`.
- Readiness wird erst als `true` markiert, wenn:
  - Socket offen ist und
  - die Ready-Message eingetroffen ist.
- Bei Strict-Mode ohne Ready-Message wird der Lauf mit `bridge-ready-check failed` abgebrochen.

WS-Datenfluss (request/step/ack):

1. `bot-action-request`:
   - Client -> Trainer: `{ id, type: "bot-action-request", payload }`
   - Trainer -> Client: `{ id, ok: true, type: "bot-action-response", action, epsilon, policy }`
2. `training-reset`:
   - Client -> Trainer: `{ id, type: "training-reset", payload }`
   - Trainer -> Client: `{ id, ok: true, type: "training-ack", requestType: "training-reset", ... }`
3. `training-step`:
   - Client -> Trainer: `{ id, type: "training-step", payload }`
   - Trainer -> Client: `{ id, ok: true, type: "training-ack", requestType: "training-step", training, replay, state }`

Checkpoint-/Resume-Vertrag:

- `trainer-checkpoint-request`:
  - Antwort: `type: "trainer-checkpoint"` mit `checkpoint` und Session-State.
- `trainer-checkpoint-load`:
  - Payload: `{ checkpoint, resumeSource }`
  - Antwort: `type: "trainer-checkpoint", loaded: true, resumeSource`.

Artefaktlayout (V34.5):

- Run-/Trainer-Metriken:
  - `data/training/runs/<stamp>/run.json`
  - `data/training/runs/<stamp>/trainer.json`
- Modell-/Checkpoint:
  - `data/training/models/<stamp>/checkpoint.json`
- Index:
  - `data/training/runs/latest.json` mit `artifacts.{run,eval,gate,trainer,checkpoint}` und `resumeSource`.

---

## 12. Produktivbetrieb und Automatisierung V36 (Stand 2026-03-11)

V36 erweitert den bestehenden V33/V34-Pfad um Betriebsautomation und lernnahe Gates.

Neue Schwerpunkte:

- Serien-Orchestrierung:
  - `scripts/training-loop.mjs` orchestriert `run -> eval -> gate` fuer `N` Runs.
  - Serienartefakt: `data/training/series/<seriesStamp>/loop.json`.
- Resume-/Checkpoint-Haertung:
  - neuer Request `trainer-checkpoint-load-latest`.
  - `scripts/trainer-server.mjs` und `scripts/training-run.mjs` unterstuetzen `--resume-checkpoint` und `--resume-strict`.
  - Checkpoints werden vor Import gegen `v34-dqn-checkpoint-v1` validiert.
- Eval-/Gate-Erweiterung:
  - `training-eval` enthaelt additive `playEval`-Lane (feste Szenarien).
  - `training-gate` enthaelt Rolling-Window-Trend-Gate und Play-Eval-Driftchecks.
- Ops-KPI-Vertrag:
  - `src/state/training/TrainingOpsKpiContractV36.js` liefert produktionsnahe Bridge-KPIs:
    - `timeoutRate`
    - `fallbackRate`
    - `actionCoverage`
    - `responseCoverage`

---

## 13. Operator-Runbook (lokal)

### 13.1 Trainer starten (optional mit Resume)

```bash
node scripts/trainer-server.mjs --host 127.0.0.1 --port 8765 --resume-checkpoint latest --resume-strict false
```

Hinweise:

- Fuer harte Resume-Policy `--resume-strict true` setzen.
- Ohne extern gestarteten Server kann `training:e2e` oder `training-loop --with-trainer-server true` den Prozess selbst starten/stoppen.

### 13.2 Trainingsserie fahren

```bash
node scripts/training-loop.mjs --runs 3 --episodes 3 --seeds 11 --modes hunt-2d --bridge-mode bridge --resume-checkpoint latest --resume-strict false --with-trainer-server true --stop-on-fail true
```

Artefakte:

- pro Run: `data/training/runs/<stamp>/{run,eval,gate,trainer}.json`
- pro Serie: `data/training/series/<seriesStamp>/loop.json`

### 13.3 E2E-Schnellpfad fahren

```bash
npm run training:e2e
```

Default:

- nutzt Bridge-Mode
- setzt `resume-checkpoint=latest`
- startet Trainer-Server automatisch

### 13.4 Match-Runtime mit Trainer nutzen

1. Runtime-Settings setzen (`botBridge.enabled`, `botBridge.url`, `botBridge.timeoutMs`, optional `botBridge.resumeCheckpoint`).
2. Match starten.
3. `ObservationBridgePolicy` laedt den Checkpoint vor Trainer-Action-Nutzung.
4. Bei Fehlern faellt der Bot kontrolliert auf lokale Policy zurueck; Fallbacks werden telemetriert.

### 13.5 Stop

- Wenn Server separat gestartet wurde: `Ctrl+C` im Trainer-Terminal.
- Bei `--with-trainer-server true` erfolgt Shutdown automatisch nach Laufende.

---

## 14. Troubleshooting

### 14.1 `ready-timeout`

Symptom:

- `bridge-ready-check failed` oder Resume-Init bleibt auf `ready-timeout`.

Checks:

1. Ist der Trainer wirklich auf `ws://127.0.0.1:8765` aktiv?
2. Sendet der Server `trainer-ready`?
3. Ist `trainerBridgeTimeoutMs` fuer die Umgebung zu niedrig?

Massnahmen:

- testweise `--bridge-connect-timeout-ms` erhoehen.
- fuer Cold-Start `--bridge-strict false` und `--resume-strict false` nutzen.

### 14.2 `checkpoint-import-failed` / `invalid-transition` bei Resume

Symptom:

- Resume-Antwort `loaded=false` mit Fehlercode.

Checks:

1. Existiert `data/training/runs/latest.json` mit gueltigem Checkpoint-Pfad?
2. Ist die Checkpoint-Datei lesbar und im Contract `v34-dqn-checkpoint-v1`?

Massnahmen:

- einmal ohne Resume starten und neuen Checkpoint erzeugen.
- danach erneut mit `--resume-checkpoint latest` starten.
- fuer harte Gates `--resume-strict true` erst nach valider Baseline aktivieren.

### 14.3 Hohe Fallback-/Timeout-Rate im Match

Symptom:

- `fallbackRate`/`timeoutRate` steigen in `run/eval/gate`.

Checks:

1. Bridge-Latenz (`latencyP95Ms`) und Coverage (`actionCoverage`, `responseCoverage`) pruefen.
2. Retry-Settings (`maxRetries`, `retryDelayMs`) auf Runtime und CLI vergleichen.

Massnahmen:

- `timeoutMs` moderat erhoehen.
- `maxRetries` von `0` auf `1..2` testen.
- bei dauerhaft hohen Raten auf lokalen Fallbackpfad bleiben und Trainer separat stabilisieren.
