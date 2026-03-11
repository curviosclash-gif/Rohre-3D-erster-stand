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
