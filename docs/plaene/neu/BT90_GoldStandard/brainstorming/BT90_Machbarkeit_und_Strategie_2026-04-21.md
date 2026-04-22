# BT90 – Hardware-Analyse, Machbarkeit und Strategieempfehlung

> [!IMPORTANT]
> **Fazit vorweg:** Ja, es ist mit deiner Hardware machbar, einen exzellenten Bot zu trainieren. Aber nicht mit dem BT90-Plan. Und nicht mit Self-Play. Der richtige Weg ist ein neuer, systematischer Plan auf dem Governance-Niveau des bestehenden Bot-Trainingsplans, der den vorhandenen Code-Stack (RewardCalculator, HybridDecisionArchitecture, ObservationSchemaV2) als Basis nutzt statt ihn zu ignorieren.

---

## 1. HARDWARE-ANALYSE: Was kannst du WIRKLICH trainieren?

### 1.1 Dein Hauptrechner: GTX 1080 + i7-7700K + 16GB RAM

| Komponente | Specs | RL-Relevanz |
|-----------|-------|-------------|
| **GPU** | GTX 1080, 8GB VRAM, Pascal (Compute 6.1) | Für PPO mit SB3 **ausreichend**. PPO-Netze sind klein (2-3 MLP-Layer, ~1M Parameter). Die GPU wird primär für Matrixmultiplikation im Forward/Backward-Pass genutzt, nicht für riesige Batch-Sizes. 8GB VRAM reicht für SB3-PPO locker. |
| **CPU** | i7-7700K, 4 Kerne / 8 Threads | **Bottleneck Nr. 1.** Jeder Electron-Game-Client braucht einen eigenen Prozess. Bei 8 Threads sind **maximal 4-6 parallele Game-Clients** realistisch (1-2 Threads für OS + Python-Trainer). 12 Clients sind mit dieser CPU **unmöglich** ohne massive Throttling. |
| **RAM** | 16GB DDR4 | **Bottleneck Nr. 2.** Electron im headless Modus braucht ~150-250MB pro Instanz. Python + SB3 + Replay Buffer brauchen ~2-4GB. OS ~2-3GB. Budget: ~10GB für Game-Clients → **maximal 5-6 Instanzen**. |

**Realistische parallele Environments auf deinem Hauptrechner:**

| Konfiguration | Environments | CPU-Auslastung | RAM | Stabil? |
|--------------|-------------|----------------|-----|---------|
| Konservativ | **3** | ~60% | ~10GB | ✅ Ja |
| Optimal | **4-5** | ~80% | ~12-13GB | ✅ Ja mit Monitoring |
| Aggressiv | **6** | ~95% | ~14-15GB | ⚠️ Riskant, Swapping möglich |
| BT90-Plan (12) | ~~12~~ | 🔴 Unmöglich | 🔴 Unmöglich | ❌ Nein |

**Empfehlung: 4 parallele Environments.** Das lässt 1 Thread für Python-Training, 1 für OS, und ist RAM-sicher.

### 1.2 Zusatzrechner: Lenovo ThinkPad T440 (Ubuntu Server)

| Komponente | Typische Specs T440 | RL-Relevanz |
|-----------|---------------------|-------------|
| CPU | i5-4300U, 2 Kerne / 4 Threads | **Zu schwach für Training.** Aber nutzbar als Monitoring-/Logging-Server (TensorBoard, Experiment-Tracking). |
| RAM | 8GB (aufrüstbar auf 16GB) | Für einen Eval-Runner oder Bot-Validate reicht das. |
| GPU | Intel HD 4400 (integriert) | **Keine RL-relevante GPU.** Kein CUDA. |

**Sinnvoller Einsatz:**
- TensorBoard-Server (Training-Logs remote visualisieren)
- `bot:validate`-Runner (separater Validierungsrechner, der den Hauptrechner nicht blockiert)
- Git-Repository-Mirror / Backup
- **NICHT für Training nutzen.**

### 1.3 Zusatzrechner: ASUS G20 (Ubuntu Server)

| Frage | Relevanz |
|-------|----------|
| Welche GPU hat der G20? | **Kritisch.** Wenn er eine GTX 960/970/980 hat, könnte er als zweiter Trainingsknoten dienen. |
| Wie viel RAM? | Mindestens 8GB für sinnvolles Training nötig. |
| Welche CPU? | Desktop-i5/i7 aus ~2015 wäre 4-5 Environments wert. |

> [!NOTE]
> **Bitte prüfe die genauen Specs des ASUS G20** (`lscpu`, `nvidia-smi`, `free -h`). Wenn er eine dedizierte NVIDIA-GPU hat, könnte er als zweiter Trainingsknoten dienen – mit dem ThinkPad als Eval-Server hättest du dann eine Mini-Trainings-Infrastruktur:
> - **Hauptrechner (Windows):** Primärer Trainingsknoten, 4 Envs
> - **ASUS G20 (Ubuntu):** Zweiter Trainingsknoten, 2-4 Envs (je nach GPU/CPU)
> - **ThinkPad T440 (Ubuntu):** TensorBoard + Eval + bot:validate

### 1.4 Ist ein exzellenter Bot mit dieser Hardware möglich?

**Ja. Definitiv.** Aber mit realistischen Erwartungen:

| Aspekt | Realität |
|--------|----------|
| **Trainingszeit pro Modell** | 4-8 Stunden für ein brauchbares Modell, 24-72 Stunden für ein exzellentes Modell (bei 4 Envs) |
| **Hyperparameter-Tuning** | 3-5 Tuning-Runs à 2-4h = 1-2 Tage pro Konfiguration |
| **45 Minuten Survival auf Hard?** | Das ist ein **extrem ambitioniertes Ziel**. 15 Minuten ist erreichbar. 45 Minuten erfordert perfektes Reward-Shaping, Curriculum-Learning und viele Trainingszyklen. |
| **Self-Play?** | **Nicht mit deiner Hardware.** (Siehe nächster Abschnitt.) |

**Realistische Ziel-Staffelung:**

| Meilenstein | Survival-Zeit (Hard, große Map) | Aufwand |
|------------|--------------------------------|---------|
| Baseline (aktueller DQN) | ~30-40 Sekunden | 0 |
| "Gut" (PPO v1) | 2-5 Minuten | 2-3 Wochen |
| "Sehr gut" (PPO v2 + Curriculum) | 5-10 Minuten | 4-6 Wochen |
| "Exzellent" (PPO v3 + Fine-Tuning) | 10-20 Minuten | 8-12 Wochen |
| "Unbesiegbar" (15+ Minuten konsistent) | 15-30 Minuten | 3-6 Monate |
| "45 Minuten" | Möglich, aber nicht garantierbar | 6+ Monate, erfordert Curriculum + Domänenanpassung |

---

## 2. SELF-PLAY: Warum es scheitert und was stattdessen funktioniert

### 2.1 Warum Self-Play auf deiner Hardware scheitert

Self-Play im Hunt-Modus braucht pro Environment:
- **1 trainierbarer Agent** (Forward + Backward Pass)
- **3 Opponent-Agents** (nur Forward Pass, aber je eine Inference-Instanz)
- **1 Electron-Game-Client** (die Spielwelt)

Bei 4 parallelen Environments:
- 4 Game-Clients × ~200MB = ~800MB RAM
- 4 trainierbare Agents = 1 PPO-Netz (geteilt)
- **12 Opponent-Inference-Instanzen** (3 pro Env × 4 Envs)

Die 12 Opponent-Instanzen brauchen:
- Entweder 12 separate ONNX-Inference-Prozesse (~50MB × 12 = 600MB extra)
- Oder ein Snapshot-Management-System das zwischen verschiedenen Modellversionen umschaltet

Zusätzliche Infrastruktur für sinnvolles Self-Play:

| Anforderung | Status auf deiner Hardware |
|-------------|---------------------------|
| ELO/Rating-System für Snapshot-Auswahl | ❌ Existiert nicht, muss gebaut werden |
| Snapshot-Storage (historische Modelle) | ⚠️ Disk-Platz ist lösbar |
| Anti-Mode-Collapse (PFSP oder League) | ❌ Erfordert Population von 50-500 Snapshots |
| Stabile nicht-stationäre Umgebung | ❌ PPO konvergiert schlecht wenn der Gegner sich gleichzeitig ändert |
| RAM für 4 Envs + 12 Opponents + Training | ❌ 16GB reicht nicht |
| Trainingszeit für Konvergenz | ❌ Self-Play braucht 5-10× mehr Trainingszeit als Standardtraining |

### 2.2 Was stattdessen funktioniert (ohne Self-Play)

**Alternative: Frozen-Opponent-Pool + Scripted Bots**

```
Trainingsphase 1: PPO vs. Rule-Based Bots (BotSensingOps + BotThreatOps)
Trainingsphase 2: PPO vs. Best-DQN-Checkpoint (eingefroren)
Trainingsphase 3: PPO vs. Mix (50% Rule-Based, 50% Best-PPO-Snapshot)
```

Das ist:
- ✅ Auf deiner Hardware machbar (keine Extra-Inference-Instanzen, Opponents laufen im selben Game-Prozess)
- ✅ Stationäre Umgebung (PPO konvergiert zuverlässig)
- ✅ Einfach zu implementieren (kein ELO, kein Snapshot-Management)
- ✅ Ausreichend für ein Indie-Spiel (der Bot muss nicht OpenAI-Five-Level erreichen)

### 2.3 Was ist nötig für PROFESSIONELLES Self-Play?

Falls du es irgendwann wirklich willst (BT100+):

| Voraussetzung | Details | Geschätzter Aufwand |
|--------------|---------|---------------------|
| **Dedizierter Trainingsserver** | Mindestens 32GB RAM, GPU mit 8GB+ VRAM, 8+ CPU-Kerne | Hardware-Anschaffung |
| **ELO-Rating-System** | Tracking von Modell-Snapshots mit Win/Loss-Record | 3-5 Tage Entwicklung |
| **Prioritized Fictitious Self-Play (PFSP)** | Spieler werden gegen Gegner gepaired basierend auf Schwachstellen | 5-10 Tage Entwicklung |
| **Population-Based Training (PBT)** | Hyperparameter werden evolutionär mittrainiert | 5-8 Tage Entwicklung |
| **Snapshot-Management** | Automatisches Speichern, Laden, Versionieren von Modellen | 2-3 Tage Entwicklung |
| **Separate Inference-Server** | Opponents laufen auf seperaten Prozessen/GPUs | 3-5 Tage Entwicklung |
| **Gesamt** | | **20-35 Manntage + Hardware** |

**Empfehlung: Self-Play gehört in frühestens BT120+, nachdem PPO ohne Self-Play auf >15min Survival kommt.**

---

## 3. HARTE KRITIK AM ALTEN BOT-TRAININGSPLAN

### 3.1 Was der alte Plan GUT macht

Der bestehende Bot-Trainingsplan (`docs/bot-training/Bot_Trainingsplan.md`) ist **beeindruckend in seiner Governance-Qualität:**

| Stärke | Details |
|--------|---------|
| **Governance-Struktur** | Klare Rollen (Lock-Status, Owner), Evidence-Pflicht, DoDs pro Block, Conflict-Log |
| **Checkpoint-Logging** | Jeder Trainingsrun hat nachvollziehbare KPI-Deltas mit Artefaktpfaden |
| **Risiko-Register pro Block** | Jeder Block hat eigene, spezifische Risiken mit Triggern |
| **Abhängigkeitsketten** | BT10→BT11→BT12→BT20→BT30→BT40→BT73 ist klar sequenziert |
| **Vorhandener Code-Stack** | `RewardCalculator.js` mit 18 Reward-Komponenten, 3 Curriculum-Stages, `HybridDecisionArchitecture.js` mit 7 Intent-Typen, `ObservationSchemaV2` mit ~30 Features |

### 3.2 Was der alte Plan SCHLECHT macht

| Schwäche | Details |
|----------|---------|
| **Algorithmisches Limit: DQN** | DQN ist 2015-Technologie. Es funktioniert für diskrete Aktionen, skaliert aber schlecht mit komplexen Action-Spaces. Der Multi-Discrete-Space aus BT90 ist mit DQN **nicht sinnvoll umsetzbar**. |
| **Kein Python-Stack** | Das gesamte Training läuft in JavaScript (Node.js). Der `DqnTrainer.mjs` und `TrainerSession.mjs` implementieren DQN von Hand. Das ist einerseits beeindruckend, andererseits bedeutet es: Kein SB3, kein TensorBoard, keine Hyperparameter-Bibliotheken, keine Community-Rezepte. |
| **Trainingseffizienz** | Die Checkpoint-Logs zeigen: 10h-Trainingsläufe liefern `avgStepsPerEpisode` von ~120-135. Das ist sehr niedrig. Der Bot überlebt durchschnittlich ~30s. Nach Wochen Training ist das Delta zum Baseline < 20%. |
| **Bot:validate blockiert** | BT80C 80.9.3 ist seit Wochen offen. Classic-3D-Matches terminieren nicht natürlich. Das ganze Validierungssystem ist instabil. |
| **BT30/BT40/BT73 sind Phantome** | Diese Blöcke sind definiert, aber kein einziger Phase-Punkt ist abgeschlossen. BT30 (Curriculum), BT40 (Gate-Härtung), BT73 (Deep Survival) – alle `[ ]` offen. Das sind Pläne für einen DQN-Stack, der fundamental limitiert ist. |
| **Keine VectorEnvs** | Training läuft sequenziell, ein Environment nach dem anderen. Kein parallelisiertes Sampling. Das ist der Hauptgrund für die langsamen KPI-Gewinne. |

### 3.3 Strategische Bewertung: Alten Plan fortführen oder neu anfangen?

| Kriterium | Alten Plan fortführen (DQN) | Neuen Plan (PPO) |
|-----------|----------------------------|-------------------|
| **Zeitaufwand bis 15min Survival** | Sehr lang (DQN hat algorithmisches Ceiling) | 8-12 Wochen |
| **Nutzung des bestehenden Codes** | 100% Wiederverwendung | ~60-70% Wiederverwendung (RewardCalculator, ObservationSchema, HybridDecision bleiben!) |
| **Skalierbarkeit** | Gering (kein Multi-Discrete, kein VecEnv) | Hoch (SB3 VecEnv, Multi-Discrete, PPO) |
| **Community-Support** | Null (custom JS-DQN) | Groß (SB3, Gymnasium, Hunderte Tutorials) |
| **Governance-Qualität** | Sehr hoch (bewiesen) | Muss neu aufgebaut werden (aber nach gleichem Muster) |
| **Risiko** | Niedrig (bekannter Stack) | Mittel (neuer Stack, Python-Setup, IPC-Integration) |

> [!IMPORTANT]
> **Empfehlung: Neuen Plan schreiben.** Aber NICHT als "Ablösung" des alten Plans. Sondern als eigenständiger Block-Cluster, der:
> 1. Den bestehenden JS-Code nutzt (RewardCalculator, HybridDecisionArchitecture, ObservationSchema)
> 2. Einen Python-PPO-Trainer NEBEN dem bestehenden DQN-System baut
> 3. Erst bei bewiesenem Erfolg (PPO schlägt DQN auf allen 4 Modi) den DQN-Pfad ablöst
> 4. Die gleiche Governance-Qualität wie der bestehende Plan hat

---

## 4. WIE BAUEN WIR DEN NEUEN PLAN?

### 4.1 Grundsätzliches Vorgehen

**BT90-Ordner verwerfen.** Einen neuen Ordner `docs/plaene/neu/BT_PPO_Migration/` erstellen.

Die Plan-Struktur muss auf dem gleichen Niveau sein wie der bestehende Bot-Trainingsplan:
- Governance-Regeln
- Klare Blöcke mit IDs, DoDs, Risiko-Register
- Evidence-Pflicht, Checkpoint-Logs
- Abhängigkeitsketten
- Lock-Status, Conflict-Log

### 4.2 Vorgeschlagene Block-Struktur

```
BT100: Python-Bootstrap & Feasibility-PoC
  → Python-Stack aufsetzen (SB3, Gymnasium, requirements.txt, venv)
  → Minimal-PoC: CartPole-artiges Env via WebSocket
  → Hardware-Profil (reale Env-Limits: 3, 4, 5 Clients)
  → Dauer: ~5 Manntage

BT101: Custom Gymnasium Environment
  → gym.Env Wrapper für CurviosClash
  → SubprocVecEnv mit N Electron-Clients
  → Observation-Space formal definiert (basierend auf ObservationSchemaV2!)
  → Action-Space formal definiert (basierend auf HybridDecisionArchitecture!)
  → Dauer: ~8 Manntage

BT102: PPO-Baseline-Training
  → SB3 PPO mit Default-Hyperparametern
  → VecNormalize, Reward-Integration (RewardCalculator!)
  → TensorBoard-Logging
  → Erstes Modell trainieren + evaluieren
  → Dauer: ~5 Manntage

BT103: Hyperparameter-Tuning & Curriculum
  → Systematisches Tuning (clip_range, ent_coef, lr, etc.)
  → Curriculum-Integration (die 3 Stages aus RewardCalculator!)
  → ONNX-Export + JS-Inference-Integration
  → Dauer: ~10 Manntage

BT104: A/B-Validation & Promotion
  → bot:validate reparieren (BT80C 80.9.3 fixen!)
  → PPO vs. DQN A/B auf fester Seed-Matrix
  → Feature-Flag: BOT_STRATEGY=dqn|ppo
  → Promotion-/Rollback-Regeln
  → Dauer: ~8 Manntage

BT105: Feintuning & Hunt-Spezialisierung (optional – nach BT104.99)
  → Hunt-spezifisches Training (Frozen Opponents)
  → Langzeit-Training (24-72h Runs)
  → Ziel: >15min Survival konsistent
  → Dauer: ~10 Manntage
```

**Gesamt: ~46 Manntage** (realistisch 2-3 Monate bei dedizierter Arbeit).

### 4.3 Was der neue Plan vom alten ERBT

Der bestehende Code ist **Gold wert** und darf NICHT neu geschrieben werden:

| Bestehende Komponente | Zeilen | Rolle im neuen Plan |
|----------------------|--------|---------------------|
| `RewardCalculator.js` | 252 | Reward-Signal für PPO – wird direkt genutzt, inkl. der 3 Curriculum-Stages |
| `HybridDecisionArchitecture.js` | 445 | Safety/Veto-Layer bleibt. PPO-Outputs werden durchgefiltert. |
| `ObservationSchemaV1.js` + `V2.js` | ~30 Features | Observation-Space für Gymnasium Env ist damit definiert! |
| `WebSocketTrainerBridge.js` | 616 | IPC-Kanal zu Python – braucht nur minimale Erweiterung |
| `ObservationBridgePolicy.js` | 449 | Bleibt. Nur ein neuer Inference-Pfad für ONNX/PPO wird hinzugefügt. |
| `TrainerPayloadAdapter.js` | 189 | Payload-Format für die Bridge – direkt wiederverwendbar |
| `BotActionContract.js` | (vorh.) | Action-Format – bildet die Basis für den Multi-Discrete-Space |

**Kerninsight: Die ObservationSchemaV2 definiert bereits ~30 Features inkl. Threat-Horizon, Dead-End-Risk, Exit-Quality, Portal-Risk, etc.** Der Observation-Space für das Gymnasium-Env ist zu 80% schon spezifiziert! Das ist der entscheidende Vorteil gegenüber BT90, das so tut als müsste alles von Null gebaut werden.

### 4.4 Die kritische Frage: 1 Netz oder 4 Netze?

**Klare Empfehlung: 1 Netz mit Mode-Conditioning.**

Statt 4 isolierte Netze zu trainieren (4× Aufwand), trainierst du **ein** Netz mit dem Spielmodus als Input-Feature:

```python
# Observation-Space (Beispiel)
observation = [
    # Mode-Encoding (One-Hot, 4 Dimensionen)
    is_classic_2d,  # 0 oder 1
    is_classic_3d,  # 0 oder 1
    is_hunt_2d,     # 0 oder 1
    is_hunt_3d,     # 0 oder 1
    
    # ObservationSchemaV2 Features (~30 Dimensionen)
    health_ratio,
    shield_ratio,
    wall_distance_front,
    wall_distance_left,
    wall_distance_right,
    wall_distance_up,      # 0 in 2D-Modi
    wall_distance_down,     # 0 in 2D-Modi
    pressure_level,
    local_openness_ratio,
    projectile_threat,
    target_distance_ratio,
    target_in_front,
    target_alignment,
    threat_horizon,
    dead_end_risk,
    exit_quality,
    opponent_pressure,
    item_urgency,
    shield_break_risk,
    portal_risk,
    gate_risk,
    recovery_active,
    # ... weitere V2-Features
]
```

Das Netz lernt automatisch, dass in 2D-Modi `wall_distance_up/down` irrelevant sind (Zero-Gewichte). Kein Zero-Padding-Problem, weil die 2D-Werte authentisch 0 sind (es gibt keine vertikale Distanz in 2D).

**Wenn empirisch nachgewiesen wird**, dass Mode-Confusion ein Problem ist (PPO lernt Classic gut aber Hunt schlecht), DANN kann man zu spezialisierten Netzen wechseln. Aber das ist eine datengetriebene Entscheidung, keine Vorab-Architekturwahl.

---

## 5. WAS PASSIERT MIT DEM ALTEN PLAN?

### 5.1 Koexistenz, keine Ablösung

Der alte Bot-Trainingsplan (BT10-BT80C) bleibt **vollständig bestehen**. Gründe:

1. **BT20 hat funktionierenden Reward-Shaping-Code** (`RewardCalculator.js`) – der neue Plan nutzt diesen Code direkt.
2. **BT73 definiert die richtige Intent-Architektur** (`HybridDecisionArchitecture.js`) – der neue Plan behält den Veto-Layer.
3. **BT80C hat den Validation-Harness** (`bot:validate`) – der neue Plan braucht ihn.

Der neue Plan wird als **eigenständiger Block-Cluster** im Bot-Trainingsplan ergänzt:

```
Bestehend (DQN-Pfad):     BT10 → BT11 → BT12 → BT20 → BT30 → BT40 → BT73
Neu (PPO-Pfad):            BT100 → BT101 → BT102 → BT103 → BT104 → BT105
Voraussetzung für BT104:   BT80C 80.9.3 (bot:validate) muss funktionieren
```

**Ablösung des DQN-Pfads** passiert erst bei BT104.99 (PPO schlägt DQN nachweisbar auf allen 4 Modi). Bis dahin bleibt DQN der aktive Champion.

### 5.2 Wo der neue Plan lebt

```
docs/plaene/neu/BT_PPO_Migration/
├── BT_PPO_Migration_Masterplan.md          (Gesamtbeschreibung + Governance)
├── BT100_Python_Bootstrap_PoC.md           (Block-Detail)
├── BT101_Custom_Gymnasium_Environment.md   (Block-Detail)
├── BT102_PPO_Baseline_Training.md          (Block-Detail)
├── BT103_Hyperparameter_Curriculum.md      (Block-Detail)
├── BT104_AB_Validation_Promotion.md        (Block-Detail)
├── BT105_Feintuning_Hunt.md                (Block-Detail, optional)
├── BT_PPO_Risikoregister.md               (Gesamtes Risikoregister)
└── BT_PPO_Definition_of_Done.md           (Gesamt-DoD)
```

---

## 6. WAS SIND DIE NÄCHSTEN SCHRITTE?

### 6.1 Sofort (heute/morgen)

1. **ASUS G20 Specs prüfen.** `lscpu && nvidia-smi && free -h` auf dem G20 ausführen. Das bestimmt, ob du einen zweiten Trainingsknoten hast.

2. **BT90-Ordner nicht löschen**, aber als "verworfen" markieren. Umbenennen in `BT90_GoldStandard_VERWORFEN/` oder eine `DEPRECATED.md` reinlegen.

3. **Entscheidung treffen:** Willst du den neuen Plan in einem einzelnen Prompt erstellen lassen, oder iterativ?

### 6.2 Empfehlung: Iterativer Plan-Aufbau

**Nicht ein einziger Prompt.** Gründe:

| Einzelner Prompt | Iterativ |
|-----------------|----------|
| ❌ Riesiges Dokument, schwer reviewbar | ✅ Block für Block, jeder reviewbar |
| ❌ Fehler propagieren durch ganzes Dokument | ✅ Fehler werden pro Block gefangen |
| ❌ Keine Möglichkeit für Zwischenfeedback | ✅ Du kannst nach jedem Block korrigieren |
| ❌ Kontextverlust bei langen Prompts | ✅ Fokussierter Kontext pro Block |

**Empfohlener Ablauf:**

```
Schritt 1: Masterplan-Rahmen erstellen
  → Governance-Regeln, Block-IDs, Abhängigkeitskette, Gesamtziel
  → Du reviewst und gibst Feedback

Schritt 2: BT100 (Python-Bootstrap) im Detail ausarbeiten  
  → Phasen, DoD, Risiken, scope_files, Zeitschätzung
  → Du reviewst

Schritt 3: BT101 (Custom Gym Env) im Detail
  → Basierend auf realem ObservationSchemaV2 und HybridDecisionArchitecture
  → Formale Obs-Space und Action-Space Spezifikation
  → Du reviewst

... und so weiter für BT102-BT105.

Schritt N: Gesamt-Risikoregister und Gesamt-DoD
  → Cross-Block-Risiken, messbare Gates
```

**Das kostet 3-5 Sessions.** Aber das Ergebnis hat die gleiche Qualität wie der bestehende Bot-Trainingsplan, weil es dem gleichen Muster folgt und auf dem gleichen Code-Stack aufbaut.

### 6.3 Sicherstes Vorgehen

1. **Session-Backup** vor jedem größeren Schritt (der `/session-backup` Workflow existiert bereits).
2. **Alles in `docs/plaene/neu/`** – dort ist es als Intake-Draft geschützt und greift nicht in laufende Arbeit ein.
3. **Kein Code-Änderung** während der Planungsphase. Erst wenn der Plan approved ist UND BT100.1 startet, wird Code geschrieben.
4. **Feature-Branch** für allen PPO-Code: `feature/bt100-ppo-migration`. DQN auf `main` bleibt unberührt.

---

## 7. ENDGÜLTIGE EMPFEHLUNG

### Ist es machbar? **Ja.**

Mit deinem Hauptrechner (GTX 1080, i7-7700K, 16GB) kannst du mit 4 parallelen Environments einen PPO-Bot trainieren, der deutlich besser als der aktuelle DQN ist. 15 Minuten Survival auf Hard/Large Maps ist ein realistisches Ziel in 2-3 Monaten. 45 Minuten ist ambitioniert, aber als Langzeitziel (6+ Monate) erreichbar.

### Ist es sinnvoll? **Ja, WENN richtig geplant.**

Der DQN-Pfad hat sein algorithmisches Ceiling erreicht. PPO ist der richtige nächste Schritt. Aber der BT90-Plan war ein Brainstorming, kein Plan. Der neue Plan muss:

- Den bestehenden Code nutzen (nicht ignorieren)
- Realistische Hardware-Limits akzeptieren (4 Envs, nicht 12)
- Self-Play streichen (Frozen Opponents stattdessen)
- Messbare Gates haben
- Iterativ umsetzbar sein

### Nächster konkreter Schritt

**Sag mir, ob du den Masterplan-Rahmen jetzt erstellen willst.** Ich erstelle dann `BT_PPO_Migration_Masterplan.md` mit:
- Governance-Regeln (übernommen vom bestehenden Bot-Trainingsplan)
- Block-Struktur (BT100-BT105)
- Abhängigkeitskette
- Hardware-Profil (dein Setup)
- Gesamtziel und KPI-Definition
- Zeithorizont

Das wird der Rahmen, in den wir dann Block für Block die Details füllen.
