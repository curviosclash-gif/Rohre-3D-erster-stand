# Bot-Training Schnittstelle (Reinforcement Learning / KI)

Dieses Dokument beschreibt die bestehende Spiel- und Bot-Architektur als Grundlage fuer kuenftiges Bot-Training (z. B. Reinforcement Learning oder PPO). Die KI laeuft kontinuierlich im `update`-Loop und erzeugt aus Observations konkrete Actions.

## Modulstatus (Stand 2026-03-03)

- `src/entities/Bot.js` ist die Runtime-Huelle mit zentralem `update()`.
- Probe-Logik liegt in `src/entities/ai/BotProbeOps.js`.
- Portal-Intent und Exit-Safety liegen in `src/entities/ai/BotPortalOps.js`.
- Projektil-, Hoehen-, Spacing- und Pursuit-Sensorik liegt in `src/entities/ai/BotThreatOps.js`.

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
