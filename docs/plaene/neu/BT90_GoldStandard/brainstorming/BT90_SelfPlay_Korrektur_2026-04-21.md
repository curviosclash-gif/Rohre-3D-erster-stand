# Self-Play & Hardware-Korrektur: ASUS G20 + Dual-Rechner-Strategie

> [!IMPORTANT]
> **Korrektur meiner vorherigen Analyse.** Ich habe einen kritischen Punkt übersehen: In CurviosClash laufen **alle Bots als Policies im selben Game-Prozess** (`BotPolicyRegistry` → `ClassicBridgePolicy` / `HuntBridgePolicy`). Self-Play-Opponents brauchen **keine separaten Inference-Prozesse**. Das ändert die Kalkulation fundamental.

---

## 1. ASUS G20: Hardware-Bewertung

| Komponente | Specs | RL-Eignung |
|-----------|-------|------------|
| **CPU** | i7-4770 (4C/8T, 3.4-3.9 GHz, Haswell) | **Solide.** ~85% der Pro-Thread-Leistung deines i7-7700K. 2-3 Electron-Clients problemlos. |
| **GPU** | GTX 980 (4GB VRAM, Maxwell, Compute 5.2) | **Nutzbar für Training.** SB3/PPO braucht <1GB VRAM. 4GB reicht. PyTorch + CUDA 11.x unterstützt Maxwell. |
| **RAM** | 8GB DDR3-1600 | **Engpass.** Electron-Client ~200MB × 3 = 600MB. Python + SB3 ~2GB. OS ~1.5GB. **Budget: ~4GB für Envs → max 3 parallele Clients.** |

### Ist der G20 als Trainingsknoten sinnvoll?

**Ja, aber mit Einschränkungen:**

| Einsatz | Machbar? | Sinnvoll? |
|---------|----------|-----------|
| **Standalone-Trainer (2-3 Envs)** | ✅ | ✅ Wenn du ein separates Modell oder eine Ablation trainieren willst |
| **Eval/Validate-Server** | ✅ | ✅ `bot:validate` auf dem G20 laufen lassen, Hauptrechner frei für Training |
| **Verteiltes Training (6 Envs über 2 Rechner)** | ⚠️ | ⚠️ Netzwerk-Latenz + Synchronisierung sind komplex (siehe unten) |
| **TensorBoard + Monitoring** | ✅ | ✅ Zusammen mit dem ThinkPad ideal |

### Dual-Rechner-Architektur (wenn du es willst):

```
┌──────────────────────────────┐     ┌─────────────────────────┐
│  Hauptrechner (Windows)      │     │  ASUS G20 (Ubuntu)      │
│  ─────────────────────────   │     │  ─────────────────────  │
│  i7-7700K + GTX 1080 + 16GB │     │  i7-4770 + GTX 980 + 8GB│
│                              │     │                         │
│  ■ Python PPO Trainer        │ LAN │  ■ 2-3 Electron Envs    │
│  ■ 3-4 Electron Envs        │◄───►│  ■ Worker-Prozess       │
│  ■ GPU: Training (Backward)  │     │  ■ GPU: frei oder Eval  │
│  ■ Gesamt: 5-7 Envs         │     │                         │
└──────────────────────────────┘     └─────────────────────────┘
         ▲                                    ▲
         │                                    │
    ┌────┴──────────────────────┐   ┌─────────┴───────────┐
    │  ThinkPad T440 (Ubuntu)   │   │  Alternativ: G20 als│
    │  ───────────────────────  │   │  separater Trainer   │
    │  ■ TensorBoard-Server     │   │  (eigenständig 2-3   │
    │  ■ bot:validate Runner    │   │   Envs, kein Netz)   │
    │  ■ Monitoring Dashboard   │   └─────────────────────┘
    └───────────────────────────┘
```

**Empfehlung: G20 anfangs als eigenständigen Eval/Validate-Server nutzen.** Verteiltes Training (Envs auf zwei Rechnern, ein zentraler Trainer) erfordert Netzwerk-IPC, was SB3 out-of-the-box nicht kann. Das wäre ein Infrastruktur-Aufwand von 5-8 Tagen. Erst einmal alle Envs auf dem Hauptrechner.

---

## 2. SELF-PLAY: KORRIGIERTE ANALYSE

### 2.1 Warum meine vorherige Analyse zu pessimistisch war

Ich habe geschrieben: "12 Opponent-Inference-Instanzen" seien nötig. **Das war falsch.**

So funktioniert es tatsächlich im Code:

```
1 Game-Client (Electron-Prozess)
├── Spieler 1: PPO-Agent (Slot 1) → WebSocket → Python-Trainer
├── Spieler 2: Frozen PPO Snapshot (Slot 2) → LocalPpoInference (in-process, JS)
├── Spieler 3: Frozen PPO Snapshot (Slot 3) → LocalPpoInference (in-process, JS)
└── Spieler 4: Frozen PPO Snapshot (Slot 4) → LocalPpoInference (in-process, JS)
```

Die Opponents laufen als `BotPolicy` im **selben Electron-Prozess**. Sie brauchen:
- Keinen separaten Prozess
- Keine separate GPU
- Nur ~1-5ms CPU pro Forward-Pass (kleines MLP, `Float64Array`, Zero-Allocation)
- ~10-20MB RAM extra für 3 geladene Checkpoint-Weights

**Kosten für Self-Play pro Environment: praktisch Null Extra-Overhead.**

### 2.2 Self-Play-Konfigurationen mit deiner Hardware

| Konfiguration | Envs | Hardware | Rechenzeit pro Training-Run (100k Steps) | RAM-Budget |
|--------------|------|----------|------------------------------------------|------------|
| **1 Env (Minimum)** | 1 | Hauptrechner | ~48-72h | ~4GB |
| **4 Envs (Empfohlen)** | 4 | Hauptrechner | ~12-18h | ~12GB |
| **6 Envs (Dual-Rechner)** | 4+2 | Hauptrechner + G20 | ~8-12h | 12GB + 5GB |
| **7 Envs (Maximum)** | 4+3 | Hauptrechner + G20 | ~7-10h | 12GB + 7GB |

### 2.3 Wie lange dauert Self-Play-Training wirklich?

PPO-Training hat zwei Phasen, die für Zeitschätzung relevant sind:

**Phase A: Datensammlung (Environment Steps)**
- Pro Step: ~100ms (Game-Tick mit 4× Frame-Skip)
- Pro Step pro Env: ~100ms
- Bei 4 Envs parallel: ~100ms für 4 Steps gleichzeitig
- 100k Steps bei 4 Envs: 100.000 / 4 × 0.1s = ~2.500 Sekunden ≈ **42 Minuten**

**Phase B: PPO-Update (GPU)**
- Pro Update (2048 Steps × 10 Epochs): ~5-15 Sekunden auf GTX 1080
- ~50 Updates pro 100k Steps: ~4-12 Minuten gesamt
- **GPU ist NICHT der Bottleneck** bei kleinen Netzen

**Phase C: Environment-Overhead (Electron-Startup, Reset)**
- Episode-Reset: ~2-5 Sekunden pro Reset
- Bei ~500 Episoden pro 100k Steps: ~20-40 Minuten overhead

**Gesamt für 100k Steps (4 Envs):**

| Komponente | Zeit |
|-----------|------|
| Datensammlung | ~42 min |
| PPO-Updates | ~10 min |
| Env-Overhead | ~30 min |
| **Total** | **~80-90 min** |

**Für ein brauchbares Self-Play-Modell brauchst du ~1-5M Steps:**

| Trainingsumfang | Steps | Zeit (4 Envs) | Zeit (1 Env) |
|-----------------|-------|---------------|--------------|
| Quick Test | 100k | ~1.5h | ~5h |
| Brauchbar | 500k | ~7h | ~25h |
| Gut | 1M | ~14h | ~48h |
| Exzellent | 3M | ~42h | ~144h (6 Tage!) |
| Maximum | 5M | ~70h | ~240h (10 Tage) |

**Mit 4 Envs ist ein guter Self-Play-Trainingsrun in einer Nacht (14h) machbar.** Mit 1 Env brauchst du 2 Tage – funktioniert, aber langsam.

### 2.4 Meine revidierte Empfehlung zu Self-Play

**Von:** "Komplett abraten, gehört in BT120+"
**Zu:** "Ja, machbar – aber als spätere Phase, nicht von Anfang an"

Warum nicht von Anfang an:

| Grund | Details |
|-------|---------|
| **PPO muss erst gegen statische Gegner funktionieren** | Wenn der PPO-Bot nicht einmal gegen Rule-Based-Bots überleben kann, bringt Self-Play nichts. Self-Play lohnt sich erst, wenn der Bot gegen statische Gegner "fertig gelernt" hat und stagniert. |
| **Frozen Opponents brauchen ein gutes Basis-Modell** | Die Snapshots für Self-Play müssen einigermaßen kompetent sein. Wenn du mit einem schlechten PPO-Modell Self-Play startest, lernt der Agent "wie man schlechte Agenten ausnutzt" – nicht "wie man gut spielt". |
| **Debugging ist einfacher ohne Self-Play** | Wenn etwas nicht funktioniert, willst du wissen: liegt es am Training oder am Opponent? Mit statischen Gegnern ist das klar. |

**Empfohlene Staffelung:**

```
BT100-BT103: PPO gegen Rule-Based + Frozen-DQN    ← Zuerst
BT104:       A/B-Validation, PPO > DQN bewiesen     ← Meilenstein
BT105:       Self-Play (Frozen Snapshot Pool)         ← DANN, wenn PPO stagniert
```

### 2.5 Wie Self-Play in BT105 konkret aussieht

**Einfachste Variante (Frozen Snapshot Pool):**

```python
# Pseudo-Konzept
opponent_pool = [
    "checkpoints/ppo_best_bt103.onnx",      # Bestes Modell aus BT103
    "checkpoints/dqn_champion.json",          # Alter DQN-Champion
    "rule-based",                              # Eingebaute Rule-Based-Policy
]

# Pro Episode: zufälligen Opponent aus Pool wählen
# Alle 50k Steps: aktuellen besten PPO-Snapshot dem Pool hinzufügen
# Pool wächst langsam: 3 → 5 → 10 → 20 Snapshots
```

- ❌ Kein ELO-System nötig
- ❌ Kein PFSP nötig
- ❌ Keine Population-Based Training nötig
- ✅ Funktioniert auf deiner Hardware
- ✅ Verhindert Mode Collapse (durch Pool-Diversität)
- ✅ 3-5 Tage Implementierungsaufwand

**Vollständiges League Play** (AlphaStar-Stil) käme erst bei BT110+ wenn der Frozen Pool ausgeschöpft ist.

---

## 3. ENDGÜLTIGE EMPFEHLUNG

### Rate ich dir komplett von Self-Play ab?

**Nein, nicht mehr.** Meine vorherige Analyse war zu pessimistisch, weil ich den In-Process-Bot-Mechanismus übersehen habe. Self-Play ist auf deiner Hardware **technisch machbar**.

Aber: **Reihenfolge ist entscheidend.**

```
FALSCH:  "Direkt Self-Play mit PPO" → scheitert, weil PPO noch nicht funktioniert
RICHTIG: "Erst PPO zum Laufen bringen → dann Self-Play als Boost"
```

### Konkreter Fahrplan:

| Phase | Block | Ziel | Dauer | Self-Play? |
|-------|-------|------|-------|------------|
| 1 | BT100 | Python + SB3 lauffähig | 5 MT | ❌ |
| 2 | BT101 | Custom Gym-Env + VecEnv | 8 MT | ❌ |
| 3 | BT102 | PPO Baseline (vs. Rule-Based) | 5 MT | ❌ |
| 4 | BT103 | Hyperparameter + Curriculum | 10 MT | ❌ |
| 5 | BT104 | A/B-Test: PPO > DQN | 8 MT | ❌ |
| 6 | **BT105** | **Self-Play (Frozen Pool)** | **10 MT** | **✅** |

### G20-Nutzung:

| Phase | G20-Rolle |
|-------|-----------|
| BT100-BT101 | `bot:validate`-Runner, TensorBoard |
| BT102-BT103 | Ablation-Runs (paralleler Trainingsknoten für Hyperparameter-Vergleiche) |
| BT104 | A/B-Validation-Server |
| BT105 | Zweiter Self-Play-Trainingsknoten (2-3 extra Envs) |

### Willst du den Masterplan jetzt starten?

Wenn ja, ist der nächste Schritt: **Masterplan-Rahmen erstellen** (`BT_PPO_Migration_Masterplan.md`), in dem Self-Play als BT105 eingeplant ist – nicht gestrichen, aber an der richtigen Stelle in der Kette.
