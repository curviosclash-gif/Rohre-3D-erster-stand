# Bot-Training Schnittstelle (Reinforcement Learning / KI)

Dieses Dokument beschreibt die bestehende Spiel- und Bot-Architektur, um als Grundlage fÃ¼r ein zukÃ¼nftiges Bot-Training (z.B. per Reinforcement Learning oder PPO) zu dienen. Die KI operiert kontinuierlich im `update`-Loop und erzeugt aus **Umgebungsdaten (Observations)** konkrete **Aktionsentscheidungen (Actions)**.

## Modulstatus (Stand 2026-03-03)

- `src/entities/Bot.js` ist die Runtime-Huelle mit zentralem `update()`.
- Probe-Logik liegt in `src/entities/ai/BotProbeOps.js`.
- Portal-Intent/Exit-Safety liegt in `src/entities/ai/BotPortalOps.js`.
- Projektil-/Hoehen-/Spacing-/Pursuit-Sensorik liegt in `src/entities/ai/BotThreatOps.js`.

## 1. Output / Actions (Aktionsraum)

Die Bot-Klasse (`BotAI`) generiert in jedem Frame eine Entscheidung (`_decision`), die in konkrete Eingabesimulationen (Inputs) fÃ¼r den Spieler-Avatar Ã¼bersetzt wird.
Ein RL-Modell mÃ¼sste Folgendes vorhersagen:

- **Steuerung (Diskret oder Kontinuierlich)**:
  - `yaw` (Gieren/Lenken): `[-1, 0, 1]` â†’ FÃ¼hrt zu `input.yawLeft` / `yawRight`
  - `pitch` (Neigen): `[-1, 0, 1]` â†’ FÃ¼hrt zu `input.pitchDown` / `pitchUp`
  - *(Optional)* `roll` (Rollen): `[-1, 0, 1]`
- **Aktionen (Diskret/Boolean)**:
  - `boost`: `true/false` â†’ Beschleunigung nutzen
  - `useItem`: `[-1 ... maxItemIndex]` â†’ Welches gesammelte Item aktiviert werden soll (-1 = keins)
  - `shootItem` / `shootItemIndex`: `true/false`, plus Slotziel fÃ¼r Raketen/Waffen
  - `shootMG`: (In Jagd-Modus verfÃ¼gbar) Waffe abfeuern

FÃ¼r ein typisches RL-Setup (z.B. PPO) eignet sich ein **Multi-Discrete Action Space** (Lenken X, Lenken Y, Boost, Shoot).

---

## 2. Input / Observations (Zustandsraum)

Die Umgebung gibt eine FÃ¼lle an aufbereiteten Sensordaten (Features) zurÃ¼ck, die das Sichtfeld und den Zustand repraesentieren (`this.sense` und `this.state`). Diese bilden den Input-Vektor fÃ¼r das NN.

### A. Raycast-Sensoren (Probes / LiDAR-Ã¤hnlich)

Das Bot-Sensing nutzt 12 gerichtete *"Probes"* (Strahlen) vom Kopf des Spielers aus.
Richtungen: *forward, left, right, leftWide, rightWide, up, down, upLeft, upRight, downLeft, downRight, backward*.
FÃ¼r jeden Strahl errechnet die Engine folgende normierte Werte, die perfekt als ML-Features dienen:

- `wallDist`: Distanz zur nÃ¤chsten Arena-Wand / Hindernis.
- `trailDist`: Distanz zu einem tÃ¶dlichen Spieler-Trail (SchlangenkÃ¶rper).
- `clearance`: Das Minimum aus beiden.
- `immediateDanger` (Boolean/0-1): Sehr nahes Objekt erkannt (Notausweich-Flag).
- `risk`: Ein vorberechneter Risikowert basierend auf aktueller Geschwindigkeit und Karten-Settings.

### B. Ziel- und Gegner-Tracking

- **Gegner-Relative Position**:
  - `targetDistanceSq`: Distanz zum ausgewÃ¤hlten Zielgegner.
  - `pursuitAimDot`: Winkel / Dot-Product zwischen eigener Blickrichtung und Ziel (1.0 = man schaut direkt drauf).
  - `pursuitYaw` / `pursuitPitch`: Richtungssignal, wo sich das Ziel befindet.
- **Druck / Aggression**:
  - `pressure`: Erfasster Feinddruck (Wie viele Gegner sind nah und schauen zu mir).

### C. Ausweich-Sensoren (Projektile & Kollisionen)

- `projectileThreat` (0/1): Rakete / Schuss im Anflug.
- `projectileEvadeYaw` / `projectileEvadePitch`: Empfohlene Ausweichrichtung (-1, 0, 1).
- `botRepulsionYaw` / `botRepulsionPitch`: AbstoÃŸungsvektoren, um zu nahe stehende Bot-KnÃ¤uel zu verhindern.
- `heightBias`: Tendenz-Wert, um die Karte vertikal auszugleichen (sich nicht am Boden/Decke zu verfangen).

### D. Interner Zustand (Eigen-Features)

- `speed` / `baseSpeed`: Aktuelle Geschwindigkeit.
- Aktuelle HP / Schild (vor allem im Jagd-Modus).
- `itemUseCooldown` / `itemShootCooldown`: Ob man feuern kann.
- Aktuell gehaltene Items & Munition (als One-Hot oder Float-Vektor).
- `recoveryActive`: Steckt der Bot aktuell im Notfall-Rückwärtsgang (Stuck State)?

---

## 3. Architektur fÃ¼r das Modell-Training

Um eine Python-basierte RL-Umgebung (z.B. OpenAI Gym / PettingZoo) an dieses Spiel anzubinden, wird folgende BrÃ¼cke gebraucht:

1. **Headless-Modus:** Das Spiel (oder zumindest die `Arena` und `Engine`) muss im Hintergrund auf Node.js ohne Rendering laufen kÃ¶nnen, am besten beschleunigt (Time-Scaling).
2. **REST / WebSocket API:** Ein Socket-Server sendet in jedem Step den gesammelten `Observation-Vector` an das RL-Script.
3. **Reward Function (Belohnungssystem):** Muss im Spiel code definiert werden und per API gesendet werden.
   - *Positive Rewards:* Ãœberleben (+0.1/s), Kills (+10), Item sammeln (+2), naher Gegner im Fadenkreuz (+0.5).
   - *Negative Rewards:* Crash in Wand/Trail (-10 und Episode Done), Stillstand/Stuck (-5).
4. **Step-Synchronisation:** Das Python-Skript empfÃ¤ngt State -> berechnet Forward Pass -> schickt Action zurÃ¼ck an das Spiel -> Spiel berechnet den nÃ¤chsten Physik-Frame.

## 4. Beispiel-Observation-Vector (Flat Array)

FÃ¼r ein neuronales Netz empfiehlt sich ein normalisierter (0.0 bis 1.0 oder -1.0 bis 1.0) 1D-Array als Input. \n\n**Grobe GrÃ¶ÃŸe: ca. 50-60 Features**

- 12 Probes * 2 (Wall Dist, Trail Dist) = 24 Features
- Ziel-Features (Dot, Distanz, Pitch, Yaw) = 4 Features
- Eigener Zustand (Speed, HP, Schild, Boost-Bereitschaft) = 4 Features
- Gegner-Druck & Raketenwarnung = 5 Features
- Map-Kontext (z.B. `mapCaution`, Portal-Winkel) = ~5 Features

*(Die Normalisierung der Werte (z.B. Distanzen immer geteilt durch max LookAhead) ist essenziell fÃ¼r stabile Gradienten im Training.)*
