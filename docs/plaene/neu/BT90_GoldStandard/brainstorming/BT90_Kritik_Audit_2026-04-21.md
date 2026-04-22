# BT90 "Gold Standard" – Harte Kritik und Handlungsempfehlungen

> [!CAUTION]
> **Gesamtnote: D+ (mangelhaft mit Ansätzen)**
> BT90 ist in seiner aktuellen Form **nicht bereit zur Aktivierung**. Die Architektur skizziert Richtiges auf hohem Abstraktionsniveau, lässt aber fast alles weg, was eine echte Implementierung braucht. Das Risikoregister ist ein Skelett. Die DoD ist unprüfbar. Der Name "Gold Standard" ist irreführend.

---

## TEIL 1: BEWERTUNG ARCHITEKTUR-MASTERPLAN

### 1.1 Vollständigkeit und Realismus der Phasendefinition

**Phasenstruktur:**

| Phase | Inhalt | Bewertung |
|-------|--------|-----------|
| Phase 1 | Hardware-Profiling, V92-Audit, Spezialistenentscheidung | Konzeptionell OK, aber vermischt Voraussetzungen (Hardware) mit Architekturentscheidungen (4 Netze) |
| Phase 2 | Bridge-Stresstest, VecEnv-Aufbau, Zombie-Bekämpfung, Worker-Sync | Schlechtest spezifizierte Phase – enthält den gesamten Python-Stack-Aufbau als Einzeiler |
| Phase 3 | Frame-Skipping, Multi-Discrete, VecNormalize | Technisch solide Auflistung, aber ohne Spezifikation |
| Phase 4 | Makro-Pipeline, League Play, A/B-Promotion | Ambitioniert bis unrealistisch |

**Zirkuläre Abhängigkeiten:** Keine explizit zirkulären, aber Phase 1.3 trifft eine harte Architekturentscheidung (4 Spezialistennetze), bevor Phase 2 überhaupt den Python-Stack aufbaut. Man kann nicht qualifiziert über Netzarchitektur entscheiden, ohne Python+SB3 lauffähig zu haben. Die Reihenfolge ist verkehrt.

**Am schlechtesten spezifiziert: Phase 2.** Der gesamte Python-Stack-Aufbau (SB3, Gymnasium, `requirements.txt`, Virtual Environments, CUDA-Setup, ONNX-Export-Pipeline) versteckt sich hinter dem Euphemismus "Bau des Python `SystemResourceGovernor`". Das ist kein Phasenschritt, das ist ein eigenes Projekt. `SystemResourceGovernor` existiert nirgendwo im Repo – nicht als Klasse, nicht als Konzept, nicht als Interface.

**Fehlende kritische Schritte:**

| Fehlendes Element | Warum kritisch |
|-------------------|----------------|
| **Observation-Space-Design** | Kein einziges Wort darüber, welche Features in den Obs-Vektor fließen. Das ist DIE zentrale Designentscheidung für RL. |
| **Hyperparameter-Tuning-Strategie** | PPO hat ~12 kritische Hyperparameter. Kein einziger wird erwähnt. |
| **Checkpoint-Strategie** | "best_model.onnx speichern" ist keine Strategie. Wie oft? Nach welcher Metrik? Rolling-Window? |
| **Logging/Monitoring (TensorBoard/WandB)** | Wird nie erwähnt. Blind trainieren ist das RL-Äquivalent von Debuggen ohne Logs. |
| **ONNX-Export-Pipeline** | Der Plan spricht von ONNX-Modellen, aber es gibt keine ONNX-Runtime im Repo, keinen Export-Schritt, keine ONNX-Inference-Integration. |
| **Curriculum-Learning** | Wird nur in Phase 4.2 (League Play) angedeutet, aber nicht als systematischer Ansatz behandelt. BT30 im Trainingsplan definiert Curriculum – BT90 ignoriert es. |
| **Python-Umgebungsmanagement** | Kein Wort zu `venv`, `conda`, `requirements.txt`, Versionspinning. |
| **Gym-Environment-Wrapper** | Kein Wort darüber, wie die Custom Gym-Environment aussehen soll. `gymnasium.AsyncVectorEnv` wird erwähnt, aber die Env-Klasse selbst fehlt. |
| **Seed-Management / Reproduzierbarkeit** | Null. |

### 1.2 Technische Tiefe vs. Oberflächlichkeit

**Reifegrad: Brainstorming-Niveau, kein Architektur-Dokument.**

- **Korrekt beschrieben:**
  - `done/truncated`-Semantik für Death Penalty (Leitplanke 4) ist fachlich richtig und zeigt Verständnis der Gymnasium-API.
  - Das Verbot von Zero-Padding bei Observation-Drift (Leitplanke 3) ist eine kluge Entscheidung.
  - Die Trennung 2D/3D wegen fundamentaler Obs-Space-Unterschiede ist valide.

- **Fachliche Ungenauigkeiten:**
  - "VecNormalize glättet Rewards auf `[-1, 1]`" – **Falsch.** VecNormalize normalisiert Rewards mit laufendem Mittelwert und Standardabweichung, clippt aber standardmäßig auf `[-10, 10]`, nicht `[-1, 1]`. Der Clip-Wert ist konfigurierbar (`clip_reward`). Diese Art von Oberflächlichkeit zeigt, dass die SB3-API nicht studiert wurde.
  - `gymnasium.AsyncVectorEnv` – Gymnasium bietet `AsyncVectorEnv` **nicht** direkt an. SB3 nutzt `SubprocVecEnv` (multiprocessing-basiert) oder `DummyVecEnv` (sequentiell). `AsyncVectorEnv` existiert als Konzept in neueren Gymnasium-Versionen, aber das API ist instabil und SB3 hat eigene Vec-Wrappers. Hier wurde Terminologie durcheinandergebracht.

- **Gefährlich naive Annahmen:**

  | Annahme | Problem |
  |---------|---------|
  | "12 concurrent Game-Clients" | Ein Electron-Game-Client pro Instanz frisst 200-500MB RAM + GPU-Kontext. 12 Instanzen bedeuten 2.4-6 GB RAM nur für Clients, plus Python-Training-Overhead. Auf einer typischen Indie-Workstation mit 16-32 GB RAM ist das ohne headless Modus kaum machbar. |
  | "Frame Skipping auf 100ms" | 100ms ist die Game-Tick-Latenz, nicht das Frame-Skipping. Frame-Skipping im RL-Kontext bedeutet "wie viele Frames zwischen Entscheidungen übersprungen werden". 4 Ticks bei 25ms = 100ms Entscheidungsrate. Das ist OK, aber die Formulierung zeigt Begriffsverwirrung. |
  | "Hardware-Profiling als erster Schritt" | Man kann Hardware erst sinnvoll profilen, wenn man weiß, was man lädt. Ohne Python-Stack, ohne Env, ohne Model ist Hardware-Profiling eine leere Übung. |

- **4 isolierte Spezialistennetze – Over-Engineering?**

  **Ja, mit hoher Wahrscheinlichkeit.** 4 Netze bedeuten:
  - 4× Trainingszeit
  - 4× Hyperparameter-Tuning
  - 4× Validierung
  - 4× ONNX-Export und Inference-Integration
  - 4× Maintenance bei Engine-Änderungen

  Für ein Indie-Spiel ist ein einzelnes Netz mit Modus-Conditioning (ein One-Hot-Vektor für den Spielmodus als Teil des Observation-Space) der industrieübliche Ansatz. Die Angst vor "Mode Confusion" ist berechtigt, aber die Lösung ist Feature-Engineering, nicht Netz-Multiplikation. Ein Multi-Task-Netz mit `[mode_classic_2d, mode_classic_3d, mode_hunt_2d, mode_hunt_3d]` als Input-Feature ist einfacher, schneller trainiert und besser wartbar. Die 4-Netz-Entscheidung gehört in Phase 3 nach empirischer Evidenz, nicht als Vorabentscheidung in Phase 1.

### 1.3 IPC-Architektur und WebSocketTrainerBridge

**WebSocket als IPC-Kanal: technisch akzeptabel, aber suboptimal.**

Die bestehende `WebSocketTrainerBridge.js` (700-Zeilen-Klasse mit Timeout/Retry/Telemetrie-Konzepten) ist als Trainings-IPC-Kanal grundsätzlich nutzbar. WebSocket bietet:
- ✅ Plattformunabhängigkeit
- ✅ Bestehende Implementierung im Repo
- ❌ Hoher Overhead pro Message (HTTP-Upgrade, Frame-Header, JSON-Serialisierung)
- ❌ Nicht für Hochfrequenz-Datentransfer optimiert
- ❌ TCP-basiert – Nagle's Algorithm kann Mikro-Latenzen erzeugen

**Bessere Alternativen:**

| Alternative | Vorteil | Nachteil |
|-------------|---------|----------|
| **ZMQ (ZeroMQ)** | Hochperformant, nachrichtenorientiert, kein HTTP-Overhead | Zusätzliche Dependency |
| **Named Pipes** | OS-nativ, kein Netzwerk-Stack | Nicht portabel |
| **Shared Memory + Semaphore** | Minimallatenz | Komplex, fehleranfällig |
| **gRPC** | Typsicher, bidirektional, Streaming | Overkill für lokales IPC |

Für 12 parallele Game-Clients ist die Empfehlung **ZMQ** – es ist der De-facto-Standard in RL-Frameworks (OpenAI Five, DeepMind) für Environment-Trainer-Kommunikation.

**"12 concurrent Game-Clients" in der Praxis:**

Jeder WebSocket-Client braucht eine TCP-Verbindung. Bei 12 Clients:
- 12 gleichzeitige TCP-Sockets auf dem localhost
- JSON-Parsing für jeden Step (Observations, Actions, Rewards, Done-Flags)
- Potentieller Head-of-Line-Blocking wenn ein Client langsam ist
- Port-Allokation für 12 Clients ohne Kollisionen

Das **echte Problem** aus BT12 ist dokumentiert: Multiple `app:game-instance` Timeouts, `bot:validate` kann `GAME_INSTANCE` nicht initialisieren, Port-Konflikte. Die BT12-Checkpoint-Tabelle zeigt eine lange Kette von Validate-Fehlschlägen genau bei Parallelisierung. Das ist kein Timeout-Problem – das ist ein **strukturelles Design-Problem** der Bridge, die nicht für parallele Instanzen konzipiert wurde.

Phase 2.1 als "isolierter Stresstest" reicht nicht. Der Stresstest muss:
1. Die Bridge unter Last profilieren (Latenz, Throughput, Memory)
2. Error-Recovery unter Load testen (was passiert bei Verlust eines Workers?)
3. Backpressure-Mechanismen validieren (die Bridge hat `bridge-backpressure-threshold` – funktioniert das bei 12 Clients?)
4. Headless-Konformität beweisen (Electron headless mit 12 Instanzen stabil?)

### 1.4 Reward-Design und RL-Correctness

**Was im Reward-Design komplett fehlt:**

1. **Kein Reward-Shape definiert.** Nirgendwo steht, welche Reward-Signale der Agent erhält. Es gibt im Repo einen `RewardCalculator.js` mit Survival-Reward, Risk-Proximity-Penalties und Death-Penalty aus BT20. BT90 ignoriert diesen vollständig und sagt nur "VecNormalize einschalten".

2. **Shaping-Risiken (Reward Hacking):** BT20 hat bereits Risk-Proximity-Penalties eingeführt. Wenn der Agent merkt, dass er Reward für "weit von Wänden entfernt bleiben" bekommt, kann er lernen, in der Mitte stehen zu bleiben und nichts zu tun. Das ist Reward Hacking. **BT90 adressiert dieses Problem nicht.**

3. **Episode-Shortening-Problem:** Die Death Penalty via `done=true` ist korrekt. Aber: Wenn der Agent negative Rewards pro Step bekommt (z.B. Risk-Proximity), kann er lernen, schnell zu sterben, um die Summe negativer Rewards zu minimieren. Die Lösung (Alive-Bonus, garantierter positiver Step-Reward) wird nicht diskutiert.

**Fehlende Hyperparameter-Sicherheitsnetze:**

| Parameter | Default (SB3) | Warum relevant | BT90-Spezifikation |
|-----------|---------------|----------------|---------------------|
| `clip_range` | 0.2 | Begrenzt Policy-Update-Größe | Nicht erwähnt |
| `ent_coef` | 0.0 | Entropy-Bonus gegen Collapse | Nicht erwähnt |
| `learning_rate` | 3e-4 | Zu hoch → Instabilität | Nicht erwähnt |
| `n_steps` | 2048 | Rollout-Länge pro Update | Nicht erwähnt |
| `batch_size` | 64 | Mini-Batch-Größe | Nicht erwähnt |
| `n_epochs` | 10 | Update-Iterationen | Nicht erwähnt |
| `gamma` | 0.99 | Discount-Factor | Nicht erwähnt |
| `gae_lambda` | 0.95 | GAE-Parameter | Nicht erwähnt |
| `max_grad_norm` | 0.5 | Gradient Clipping | Nicht erwähnt |
| LR-Schedule | constant | Annealing gegen Instabilität | Nicht erwähnt |

**Keiner dieser Parameter wird in BT90 erwähnt.** Das ist wie ein Bauplan für ein Haus ohne Maßangaben.

### 1.5 Self-Play (Phase 4.2 League Play)

**Unrealistisch für den Projektkontext.**

Self-Play (League Play im Stil von AlphaStar) erfordert:

1. **Snapshot-Management:** Alte Modellversionen müssen als Frozen Opponents verwaltet werden. Bei 4 Spezialisten × N Snapshots pro Trainingszyklus explodiert der Speicherbedarf.

2. **ELO/Rating-System:** Ohne Rating weiß man nicht, gegen welchen Snapshot man trainiert. "Versionen seiner eigenen Vortage" ist keine Strategie – das ist zufälliges Opponent-Sampling.

3. **Mode Collapse:** Wenn der Agent nur gegen eine kleine Menge alter Snapshots trainiert, kann er sich auf genau diese spezialisieren und gegen neue Strategien versagen. Das OpenAI-Five-Paper beschreibt explizit, wie sie dieses Problem mit einer Liga von ~500 historischen Agenten und gezieltem Matchmaking gelöst haben.

4. **Training Instability:** Self-Play erzeugt eine **nicht-stationäre Umgebung** (der Gegner ändert sich). PPO konvergiert in stationären Umgebungen. In nicht-stationären Umgebungen braucht man zusätzliche Stabilisierung (Population-Based Training, PFSP, etc.).

5. **Infrastruktur:** Für Hunt braucht man 4 Spieler (1 trainiert, 3 Opponents). Jeder Opponent braucht eine Inference-Instanz. Bei 12 parallelen Environments × 3 Opponents = 36 gleichzeitige Inference-Instanzen. Das ist auf Indie-Hardware nicht machbar.

**Empfehlung:** Self-Play streichen und durch einen einfacheren Opponent-Pool (scripted bots + frozen best model) ersetzen.

### 1.6 Bewertung: Ist "Gold Standard" der richtige Name?

**Note: D+**

**3 Dinge, die gut sind:**

1. **Die 5 Leitplanken (Kap. 0)** sind die stärkste Sektion. Sie zeigen echtes Verständnis des Projektkontexts: V92-Compliance, Veto-Layer-Respekt, Fail-Fast bei Observation-Drift. Das sind die richtigen Guardrails.

2. **Die Entscheidung für spezialisierte Netze statt Zero-Padding** ist methodisch korrekt, auch wenn die 4-Netz-Lösung zu weit geht. Das Grundprinzip "keine stummen Nullen" ist richtig.

3. **Die sequenzielle Makro-Pipeline (Phase 4.1)** zeigt Ressourcenbewusstsein. Nicht alles gleichzeitig trainieren ist die richtige Entscheidung für limitierte Hardware.

**5 strukturelle Schwächen:**

1. **Kein Observation-Space-Design.** Der zentrale RL-Baustein fehlt komplett. Ohne Definition des Input-Vektors ist alles Spekulation.

2. **Kein Hyperparameter-Management.** PPO hat ~12 kritische Parameter, keiner wird erwähnt. "VecNormalize einschalten" != RL-Architektur.

3. **Der Python-Stack existiert nicht und sein Aufbau wird als Trivialität behandelt.** "Bau des Python SystemResourceGovernor" ist ein Projekt, kein Bullet Point.

4. **Keine Metriken, keine KPIs, keine Schwellenwerte.** Was ist "intelligent"? Was ist "stabil"? Was ist "signifikant besser"? Der Plan ist bewertungsresistent.

5. **Self-Play ohne Infrastruktur ist Wunschdenken.** Phase 4.2 gehört frühestens in einen BT100+.

---

## TEIL 2: BEWERTUNG RISIKOREGISTER

### 2.1 Vollständigkeit und Abdeckung

Das Register enthält 7 Risiken. Für ein Projekt dieser Komplexität fehlen mindestens 10 weitere kritische Risiken:

| Fehlendes Risiko | Severity (geschätzt) | Warum kritisch |
|-------------------|---------------------|----------------|
| **Reproduzierbarkeit / Seeding** | hoch | Ohne deterministische Seeds sind Trainingsergebnisse nicht vergleichbar. BT12 dokumentiert bereits Probleme mit KPI-Schwankungen. |
| **Hyperparameter-Instabilität** | hoch | PPO ist notorisch sensitiv auf `learning_rate`, `clip_range`, `ent_coef`. Falsche Werte = kein Lernen. |
| **Versionsdrift SB3/Gymnasium** | mittel | SB3 und Gymnasium haben Breaking Changes zwischen Minor Versions. Ohne Pinning bricht der Stack nach `pip install --upgrade`. |
| **Overfitting auf Maps/Seeds** | hoch | Mit festen Seeds für 4 Modi gibt es einen kleinen Environment-Pool. Der Agent spezialisiert sich auf bekannte Karten. |
| **Observation-Normalisierung-Drift** | hoch | `VecNormalize` speichert laufende Statistiken. Wenn diese zwischen Training und Inference nicht identisch übertragen werden, verhält sich das Modell zur Laufzeit anders als im Training. |
| **Fehlende Rollback-Fähigkeit** | hoch | Wenn ein neues PPO-Modell schlechter ist als DQN – wie genau wird zurückgerollt? Der Plan nennt "A/B-Lane", aber keinen konkreten Rollback-Mechanismus. |
| **Windows-spezifische Python-Probleme** | mittel | CUDA-Treiber-Kompatibilität, DLL-Konflikte (`torch` + `onnxruntime`), lange Pfade, `multiprocessing` vs `spawn` auf Windows. |
| **ONNX-Export-Korrektheit** | hoch | PyTorch → ONNX → JavaScript-Inference ist nicht trivial. Operator-Kompatibilität, Dynamic Shapes, Quantisierung – alles potentielle Fehlerquellen. |
| **Training-/Inference-Semantik-Drift** | fatal | Das SB3-trainierte Modell benutzt PyTorch-Tensoren. Die Inference im Game benutzt (aktuell) `LocalDqnInference.js`. Die Brücke zwischen beiden (ONNX) existiert nicht einmal als Konzept. |
| **Zeitaufwand massiv unterschätzt** | hoch | Kein einziger Zeitschätzungswert im gesamten Plan. Für ein Einzelentwickler-Projekt ist das verantwortungslos. |
| **Hardware-Limitierung (kein dedizierter GPU-Server)** | mittel | PPO-Training profitiert stark von GPU. Wenn der Entwickler auf einer Consumer-GPU trainiert, sind Trainingszeiten lang und die GPU wird vom Game blockiert (Electron + GPU). |
| **Self-Play-Destabilisierung** | hoch | Phase 4.2 wird Self-Play einführen, das im Register nie als Risiko erscheint. |

### 2.2 Qualität der Mitigationsstrategien

| Risiko | Mitigation | Bewertung |
|--------|-----------|-----------|
| Python-Infra existiert nicht | "Python-Stack als allerersten Step aufsetzen" | Vage Absichtserklärung, kein Plan. Was genau aufsetzen? Welche Versions? Welche Tools? |
| Silent Degradation | "Fail-Fast bei Längenmismatch" | **Konkret und actionable.** Beste Mitigation im Register. |
| Gradient Explosion | "`done/truncated`-Flags statt Value-Overrides" | **Fachlich korrekt**, aber adressiert nur einen Aspekt. Gradients können auch durch andere Ursachen explodieren. |
| OS-Lockin | "`tree-kill` / `psutil`" | Konkret. Gut. |
| Action-Space Limitiert | "Multi-Discrete Action Space" | Das ist kein Risiko-Mitigation, das ist die Hauptfeature-Anforderung. Falsch kategorisiert. |
| OOM/CPU-Thrashing | "Sequenzielle Pipeline" | Konkret. Gut. |
| Port Collision | "Stresstest + feste Port-Ranges" | Teilweise actionable. Feste Ports sind eine Lösung. Stresstest ist ein Validierungsschritt, keine Mitigation. |
| Architektur-Bruch | "Striktes Einhalten" | Keine Mitigation. "Haltet euch an die Regeln" ist eine Policy, kein Mechanismus. |

**Ergebnis:** 2 von 7 Mitigations sind echte technische Maßnahmen (Fail-Fast, tree-kill). Der Rest sind entweder vage Absichten oder falsch kategorisierte Features.

### 2.3 Severity-Bewertung

| Risiko | Gegebene Severity | Korrekt? | Begründung |
|--------|-------------------|----------|------------|
| Python-Infra fehlend | fatal | **Ja** | Ohne Python geht gar nichts. |
| Observation Drift | hoch | **Ja** | Silent Degradation ist ein echtes Problem. |
| Gradient Explosion | hoch | **Zu hoch** | Mit `VecNormalize` und PPO-Standard-Parametern ist das selten ein Problem. Sollte `mittel` sein. |
| OS-Lockin | mittel | **Korrekt** | Richtig bewertet. |
| Zombie Bot | hoch | **Zu hoch als Risiko** | Das ist kein Risiko, das ist ein Feature-Gap. Es gehört nicht ins Risikoregister, sondern in die Architektur. |
| OOM | hoch | **Korrekt** | Realistische Bedrohung. |
| Port Collision | fatal | **Zu hoch** | Port-Kollisionen sind lösbar (dynamische Port-Allokation). `fatal` ist übertrieben. `hoch` wäre angemessen. |
| Architektur-Bruch | hoch | **Korrekt** | Integration ist immer ein Hochrisiko. |

**Reihenfolge:** Die Reihenfolge ist nicht nach Risk Score (`Wahrscheinlichkeit × Auswirkung`) sortiert, sondern willkürlich. Ein echtes Register sortiert nach Risk Score absteigend.

### 2.4 Struktur des Registers

**Fehlende Pflichtfelder für ein Risikoregister:**

| Feld | Vorhanden? | Kommentar |
|------|-----------|-----------|
| Risiko-ID | ❌ | Kein einziger Eintrag hat eine ID. Referenzierung unmöglich. |
| Eintrittswahrscheinlichkeit | ❌ | Nur Severity, keine Wahrscheinlichkeit. |
| Risk Score | ❌ | Ohne Wahrscheinlichkeit kein Score. |
| Residual Risk | ❌ | Kein Tracking des Restrisikos nach Mitigation. |
| Owner (Person, nicht Rolle) | ❌ | "Architektur", "Train-Ops", "RL-Dev" sind Rollen. Wer *genau* ist verantwortlich? |
| Eskalationspfad | ❌ | Was passiert bei "fatal"? Projekt-Stopp? Rollback auf DQN? Keine Aussage. |
| Review-Datum | ❌ | Wann wird das Register überprüft? |
| Status | ❌ | Offen/In Mitigation/Closed? |

**Fehlender Eskalationspfad:** Das Register definiert zwei "fatal"-Risiken (Python-Infra, Port Collision). Was passiert, wenn eines davon eintritt? Es gibt keinen Plan B. Kein "wenn der Python-Stack nach X Tagen nicht steht, evaluieren wir Alternative Y".

### 2.5 Gesamtbewertung Risikoregister

**Note: D**

**3 konkrete Verbesserungen:**

1. **Risiko-IDs einführen und nach Risk Score sortieren** (`Wahrscheinlichkeit × Impact`). Mindestens die 10 fehlenden Risiken aus 2.1 aufnehmen. Aktuell fehlen mehr Risiken als vorhanden sind.

2. **Eskalationspfade für "fatal"-Risiken definieren.** Konkret: "Wenn bis Tag X der Python-Stack nicht steht, wird BT90 zurückgestellt und die Ressourcen gehen an V76." Ohne Eskalation ist "fatal" nur ein Label.

3. **Jede Mitigation um ein konkretes Validierungskriterium ergänzen.** "Fail-Fast implementiert" → "Test `test:bridge-observation-drift` existiert und ist PASS mit mindestens 3 Szenarien (neues Feature, entferntes Feature, geänderter Typ)."

---

## TEIL 3: BEWERTUNG DEFINITION OF DONE

### 3.1 Prüfbarkeit der Gates

| Gate | Text | Messbar? | Prüfbar? | Problem |
|------|------|----------|----------|---------|
| DoD.1 | "alle Phasen mit gültigem Evidence-Eintrag" | ❌ | ⚠️ | Was ist ein "gültiger" Evidence-Eintrag? `(abgeschlossen: YYYY-MM-DD; evidence: )` ist ein Platzhalter, kein Kriterium. Wer validiert Evidence-Gültigkeit? Reicht ein Datum? Braucht es Commit-SHA? Test-Ergebnis? |
| DoD.2 | "4 spezialisierte intelligente ONNX-Modelle" | ❌ | ❌ | **"Intelligent" ist kein messbares Kriterium.** Welche Mindest-Win-Rate? Welche Mindest-Survival-Time? Gegen welche Baseline? Auf welchen Maps? "Intelligent" ist subjektiv und damit als Gate unbrauchbar. |
| DoD.3 | "Multi-Discrete Space, der Features aus V72/V82 abbilden kann" | ⚠️ | ⚠️ | "Abbilden kann" ist zu vage. Welche konkreten Actions? Der Plan nennt `[Lenkung, Schub/Bremse, Item-Einsatz]` – ist das die vollständige Action-Liste? Wo ist die formale Spezifikation? Wie wird Compliance geprüft? Ein Unit-Test "Action-Space enthält Dimensionen X, Y, Z"? |
| DoD.4 | "OS-Neutralität, kein Windows-taskkill" | ✅ | ✅ | **Einziges klar prüfbares Gate.** Grep nach `taskkill` im Code → Null Ergebnisse = Pass. |
| DoD.5 | "Fail-Fast wirft harten Bridge-Error" | ⚠️ | ⚠️ | Konzeptionell prüfbar, aber: Gibt es einen automatisierten Test? Welche Szenarien werden getestet? Nur Array-Länge, oder auch Typ-Mismatch? Nur beim Verbindungsaufbau, oder auch zur Laufzeit? |
| DoD.6 | "3-Run A/B-Lane gegen DQN-Champion gewonnen" | ⚠️ | ❌ | **"Gewonnen" ist nicht definiert.** Win-Rate >50%? >60%? >80%? Bei 3 Runs ist statistische Signifikanz unmöglich – 3 Runs liefern keine p-Werte. Braucht man 3/3 Siege? 2/3? Was bedeutet "Win" – Survival-Time höher? Punkte höher? Weniger Tode? |
| DoD.7 | "Bridge-Stresstest beweist stabile Last von 12 Sub-Prozessen" | ⚠️ | ❌ | **"Stabil" ist nicht definiert.** Kein Timeout in X Minuten? Latenz unter Y ms? Kein Paket-Verlust? Memory unter Z GB? Alle 12 Clients müssen gleichzeitig Rewards empfangen? "Stabil" ohne Metrik ist kein Gate. |
| DoD.8 | "Unit Tests absichern die ObservationBridgePolicy" | ⚠️ | ⚠️ | Keine Coverage-Ziele. Es existieren bereits Tests (`physics-policy.spec.js`, `observation-bridge-policy-runtime.test.mjs`). Was genau muss zusätzlich getestet werden? Welche neuen Szenarien? Mindest-Anzahl Tests? |

**Ergebnis: 1 von 8 Gates ist klar prüfbar (DoD.4). Der Rest ist in unterschiedlichem Maße vage.**

### 3.2 Fehlende Gates

| Fehlendes Gate | Warum notwendig |
|---------------|-----------------|
| **Performance-Benchmark** | "PPO-Bot ist besser als DQN auf allen 4 Spielmodi" mit definierten Metriken (Survival-Time, Win-Rate, invalide Aktionenrate). |
| **Inference-Latenz-Gate** | ONNX-Modell im Game darf nicht >Xms pro Decision brauchen (z.B. <10ms), sonst wird der Game-Loop blockiert. |
| **Reproduzierbarkeit-Gate** | Gleiche Seed → gleiche Trainingsergebnisse (innerhalb Toleranz). Mindestens 2 identische Runs mit <5% KPI-Abweichung. |
| **Rollback-Fähigkeit-Gate** | Promotion-Gate muss DQN-Champion sofort zurückladen können, wenn PPO schlechter ist. Konkreter Test mit Zeitmessung. |
| **Logging/Monitoring-Gate** | TensorBoard-Logs oder äquivalent werden geschrieben und sind auswertbar. Training ohne Monitoring ist blind. |
| **ONNX-Export-Korrektheit-Gate** | PyTorch-Modell und ONNX-Modell liefern identische Outputs für identische Inputs (Äquivalenztest). |
| **Hardware-Governor-Validation** | Der `SystemResourceGovernor` hält CPU/GPU unter definierten Limits. Kein OS-Freeze in 24h-Lauf. |
| **Python-Stack-Smoke-Gate** | `pip install -r requirements.txt && python train.py --smoke-test` auf Clean-Env erfolgreich. |

### 3.3 Verhältnis zur Architektur

**Lücken zwischen Architektur und DoD:**

| Architektur-Element | DoD-Gate vorhanden? |
|---------------------|---------------------|
| Hardware Governor (Phase 2.2) | ❌ Kein Gate prüft den Governor |
| League Play (Phase 4.2) | ❌ Kein Gate für Self-Play-Qualität |
| VecNormalize (Phase 3.3) | ❌ Kein Gate prüft Normalisierung |
| Worker-Recovery (Phase 2.4) | ❌ Kein Gate für Fault Tolerance |

**Phantom-Abhängigkeit `bot:validate`-Harness:**

DoD.6 referenziert den "in BT80C etablierten `bot:validate`-Validation-Harness". Die Realität:
- `bot:validate` existiert als npm-Script: `node dev/scripts/bot-validation-runner.mjs`
- **Aber:** BT80C Phase 80.9.3 ist **offen** und dokumentiert, dass `bot:validate` seit Wochen an nicht-terminierenden Runden scheitert. Die BT80C-Checkpoint-Tabelle zeigt: "V1 bleibt selbst bei 150000ms Aktivbudget in PLAYING und hält 80.9.3 weiter offen."
- **Konsequenz:** DoD.6 setzt einen Harness voraus, der Stand heute nicht funktioniert. Das ist eine harte, unbewältigte Vorbedingung.

### 3.4 Gesamtbewertung DoD

**Note: D-**

**3 konkrete Verbesserungen:**

1. **Jedes Gate mit messbaren Schwellenwerten versehen:**
   - DoD.2: "Win-Rate >60% gegen DQN auf allen 4 Modi, gemessen über 50 Episoden pro Modus"
   - DoD.6: "3/3 Runs mit Survival-Time-Delta >+20% auf Seed-Matrix [11,23,37,41,53]"
   - DoD.7: "12 Clients, 0 Timeouts, <200ms p99-Latenz über 30min Last"

2. **Fehlende Gates für ONNX-Korrektheit, Inference-Latenz, Rollback-Fähigkeit und Reproduzierbarkeit hinzufügen.** Ohne diese ist die Produktionsintegration ein Glücksspiel.

3. **Die `bot:validate`-Abhängigkeit ehrlich bewerten.** Wenn BT80C 80.9.3 offen ist und der Harness nicht terminiert, kann DoD.6 nicht geprüft werden. Entweder BT80C zuerst abschließen oder das Gate umschreiben.

---

## TEIL 4: KOHÄRENZ-ANALYSE

### Architektur → Risikoregister: Ignorierte Risiken

| Architektur-Aussage | Risiko im Register? |
|---------------------|---------------------|
| "12 concurrent Game-Clients" | ⚠️ Port Collision erwähnt, aber nicht RAM/GPU-Limits |
| "League Play Self-Play" | ❌ Mode Collapse, Training Instability nicht erwähnt |
| "VecNormalize einschalten" | ❌ Normalisierungs-Drift zwischen Train/Inference nicht erwähnt |
| "ONNX-Modelle exportieren" | ❌ Export-Korrektheit, Inference-Integration nicht erwähnt |
| "SystemResourceGovernor" | ❌ Governor-Fehlverhalten nicht erwähnt |
| "Hardware-Profiling als Phase 1" | ❌ Hardware-Limitierung nicht als Risiko |

### DoD → Architektur: Gates ohne Implementierungsphase

| DoD-Gate | Zugehörige Architektur-Phase? |
|----------|-------------------------------|
| DoD.1 (Phasen-Abschluss) | ✅ Meta-Gate |
| DoD.4 (OS-Neutralität) | ✅ Phase 2.3 |
| DoD.8 (Unit Tests) | ❌ Keine Phase beschreibt Testentwicklung |

### Risiken → Architektur/DoD: Ungedeckte Risiken

| Risiko | Mitigation in Architektur? | Prüfung in DoD? |
|--------|--------------------------|-----------------|
| "Python-Infra existiert nicht" | ❌ Keine Architektur-Phase explizit für Python-Setup | ❌ Kein Gate für lauffähigen Python-Stack |
| "Gradient Explosion" | ⚠️ VecNormalize erwähnt | ❌ Kein Gate für Trainingsstabilität |
| "Architektur-Bruch V92/BT73" | ✅ Leitplanken 1-2 | ✅ DoD.6 |

### Explizite Widersprüche

1. **BT90 Architektur Phase 3.2:** "Multi-Discrete Action Translation: `[Lenkung (-1,0,1), Schub/Bremse (-1,0,1), Item-Einsatz (0,1)]`"
   **vs. bestehendes System:** Der aktuelle `LocalDqnInference.js` verwendet ein diskretes Action-Vocabulary mit Intent-Typen (`HYBRID_INTENT_TYPES`), die über `HybridDecisionArchitecture.js` resolved werden. BT90 definiert einen neuen Action-Space, ohne den bestehenden Intent-Flow zu adressieren. **Der neue Multi-Discrete-Space muss mit der HybridDecisionArchitecture kompatibel sein** – das wird weder spezifiziert noch als Problem erkannt.

2. **BT90 Architektur:** Spricht von "Ablösung der Alt-Pläne in `docs/bot-training/`"
   **vs. Bot-Trainingsplan:** BT20, BT30, BT40, BT73 sind offene Blöcke mit eigenen DoDs, Phasen und Risiken, die teils aufeinander aufbauen. BT90 sagt implicit: "Alles was in BT20-BT73 steht, machen wir anders." **Aber:** BT90 baut auf keiner der dort geleisteten Vorarbeiten auf und ignoriert die dort definierten Reward-Shaping-Ergebnisse, Safety-Layer-Konzepte und Curriculum-Struktur.

3. **BT90 DoD.6:** Referenziert "BT80C `bot:validate`-Harness"
   **vs. BT80C Phase 80.9.3:** Harness ist **offen und nicht funktionsfähig**. Die BT90-DoD setzt einen broken Harness als Gate-Kriterium voraus.

---

## TEIL 5: EINORDNUNG IN DEN UMSETZUNGSPLAN

### 5.1 Strategische Positionierung

**BT90 verletzt die eigene Governance.** Zweifach.

1. **Der Umsetzungsplan (Zeile 15-16) ist explizit:**
   > "Bot-Training wird ausschließlich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt. In diesem Master werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Einträge gepflegt."

   BT90 liegt unter `docs/plaene/neu/` – dem Intake-Verzeichnis des **Haupt-Umsetzungsplans**, nicht des Bot-Trainingsplans. Damit sitzt BT90 im falschen Verzeichnis und unter der falschen Governance. Es müsste als Intake im Bot-Trainingsplan geführt werden.

2. **BT90 deklariert sich als "Ablösung der Alt-Pläne in `docs/bot-training/`"** – aber die Alt-Pläne (BT20, BT30, BT40, BT73) sind **keine Alt-Pläne, sondern aktive Blöcke** im Bot-Trainingsplan. BT20 hat offene Phasen und einen aktiven Lock. BT73 hat 7 Phasen mit detaillierten Teilschritten. BT90 kann sie nicht ablösen, weil BT90 weniger definiert als sie.

**Warum ist das ein Problem?** Weil die Governance-Struktur existiert, um genau solche Situationen zu verhindern: Ein glänzend benannter Plan überschreibt laufende, detailliert ausgearbeitete Arbeit. Die korrekte Einordnung wäre: BT90 als Backlog-Item `BT90` im Bot-Trainingsplan, `DEPENDS-ON: BT73.99`, mit dem Status "Konzept – erfordert Feasibility-Analyse".

**Strategische Sinnhaftigkeit:**

| Pro BT90 jetzt | Contra BT90 jetzt |
|----------------|-------------------|
| PPO ist algorithmisch überlegen gegenüber DQN | V76 (Desktop Hangar Arcade Fight) ist aktiv, hat P3 und braucht einen funktionierenden Bot |
| Hardware-Maximierung spart langfristig Trainingszeit | BT20/BT30/BT40/BT73 sind offene Blöcke, die DQN-basiert Fortschritt machen können |
| ONNX-Export ermöglicht plattformübergreifende Inference | P24 (`spawn EPERM` blockiert Test-Harness) ist seit Wochen offen – Tests laufen nicht |
| Zukunftssicherheit | P21 (`npm audit` 2 high, 3 moderate) – Security-Debt wächst |
| – | `bot:validate` (BT80C 80.9.3) funktioniert nicht – BT90 setzt es als Gate voraus |
| – | Kein Python-Wissen dokumentiert, kein RL-Infra-Erfahrung im Projekt |

**Harte Empfehlung: BT90 ist jetzt der falsche Fokus.** V76 ist active mit offenen Phasen, P24 blockiert den gesamten Test-Harness, P21 ist ein Security-Risiko. BT90 verdrängt konkrete Produktarbeit für ein spekulatives Infrastrukturprojekt.

### 5.2 Ressourcen-Realismus

**Zeitschätzung für Phasen 1-4 (Ein Entwickler mit begrenzter RL-Erfahrung):**

| Phase | Optimistisch | Realistisch | Pessimistisch | Begründung |
|-------|-------------|-------------|---------------|------------|
| Phase 1 | 3 MT | 5 MT | 8 MT | Python-Stack from scratch, SB3/Gym-Learning-Curve, Hardware-Profiling |
| Phase 2 | 8 MT | 15 MT | 25 MT | Custom Gym-Env, WebSocket-IPC-Integration, VecEnv mit Electron-Clients, Stresstest |
| Phase 3 | 5 MT | 10 MT | 15 MT | Action-Space-Design, Reward-Engineering, Hyperparameter-Tuning (Iterativ!) |
| Phase 4 | 10 MT | 20 MT | 40+ MT | 4 Spezialisten trainieren, Self-Play, A/B-Validation, ONNX-Export+Integration |
| **Gesamt** | **26 MT** | **50 MT** | **88+ MT** |  |

**50 Manntage = 10 Wochen Vollzeit** ist die realistische Schätzung. Für einen Einzelentwickler, der gleichzeitig an V76 und dem Spiel arbeitet, bedeutet das **3-6 Monate bei 50% Auslastung**. Der Plan enthält keinerlei Zeitschätzung – das allein disqualifiziert ihn als "Gold Standard".

### 5.3 Opportunity Cost

**Was BT90 verdrängt:**

| Block | Status | Hebel für Nutzer | Durch BT90 blockiert? |
|-------|--------|-------------------|----------------------|
| V76 (Desktop Hangar Arcade Fight) | active, Phase 76.2 | Direkte Spieler-Experience: neuer Spielmodus | Ja – Entwickler-Fokus und Bot-Abhängigkeit |
| V75 (Cinematic Recorder) | planned | Feature-Differenzierung, Marketing-Material | Indirekt – Ressourcen-Konkurrenz |
| P21 (npm audit Security) | offen, hoch | Sicherheit der Spieler-Installation | Ja – wird weiter verschoben |
| P24 (Test-Harness spawn EPERM) | offen, hoch | Test-Pipeline, CI-Stabilität | Ja – wird weiter verschoben |
| V81 (Developer Tuning Console) | planned | Entwickler-Effizienz | Indirekt |

**Ein "Gold Standard" PPO-Bot ist zur aktuellen Projektrife ein prematures Optimierungsprojekt.** Der aktuelle DQN-Bot funktioniert. Er ist nicht perfekt (BT12 zeigt `averageBotSurvival` von ~40s), aber er spielt. Die Nutzer sehen eine funktionierende KI. Eine PPO-Migration bringt keinen sichtbaren Mehrwert für den Spieler, solange die Basisfunktionalität (Hangar, Recorder, Security) nicht steht.

### 5.4 Impact auf Produktstabilität

**Destabilisierungsrisiko: hoch.**

1. Die `WebSocketTrainerBridge` muss für 12 parallele Clients umgebaut werden. Die Bridge ist in `ObservationBridgePolicy.js` verdrahtet, welche von `ClassicBridgePolicy` und `HuntBridgePolicy` geerbt wird. Änderungen an der Bridge betreffen die Runtime-KI im laufenden Spiel (V76).

2. Die `HybridDecisionArchitecture.js` ist die Safety-Schicht. BT90 verspricht, sie zu respektieren (Leitplanke 2), muss aber einen neuen Multi-Discrete Action-Space durch sie hindurchleiten. Das erfordert Änderungen am `resolveHybridDecision()`-Pfad – direkt im Herzen der Runtime-AI.

3. `ObservationBridgePolicy.js` ist die zentrale Policy-Klasse (31 Zeilen Klasse + umfangreiche Helpers). Jede Änderung am Observation-/Action-Format zieht Änderungen in `ClassicBridgePolicy`, `HuntBridgePolicy`, `ObservationBridgePolicyHelpers.js`, `LocalDqnInference.js` und dem Trainer nach sich.

**Was fehlt:**

- **Kein Feature-Flag.** BT90 definiert keinen Mechanismus, um PPO-Code hinter einem Flag zu entwickeln, ohne DQN zu brechen. Die minimale Strategie wäre: `BOT_STRATEGY=dqn|ppo` als Runtime-Switch, der zwischen `LocalDqnInference` und `LocalPpoInference` umschaltet.

- **Keine Branch-Strategie.** BT90 sagt nicht, ob die Entwicklung auf einem Feature-Branch stattfindet. Wenn auf `main` entwickelt wird, blockiert jeder Breaking Change V76.

- **Keine Rollback-Definition.** Was passiert, wenn PPO nach 4 Wochen Training schlechter ist als DQN? "A/B-Lane" ist keine Rollback-Strategie. Rollback heißt: DQN-Checkpoint laden, alle PPO-Änderungen reverten, weitermachen. Ist das vorbereitet? Nein.

---

## TEIL 6: HANDLUNGSEMPFEHLUNGEN (PRIORISIERT)

### [KRITISCH] 1. BT90 NICHT als aktiven Block übernehmen.

**Was:** BT90 bleibt als Intake-Draft unter `docs/plaene/neu/`. Keine Aktivierung im Bot-Trainingsplan bis die offenen Vorbedingungen erfüllt sind.

**Warum:** BT90 setzt `bot:validate` voraus (BT80C 80.9.3 – offen), hat keine Zeitschätzung, keine messbaren Gates, und verdrängt V76 und P24.

**Abhängig:** V76, P21, P24, BT80C.

**Risiko bei Ignorierung:** 3-6 Monate Ressourcenbindung für ein Infrastrukturprojekt, während das Spiel keine neuen Features bekommt und Security-Debt wächst.

---

### [KRITISCH] 2. `bot:validate` Harness reparieren (BT80C 80.9.3).

**Was:** Den Validation-Harness zum Laufen bringen, bevor irgendein neuer Training-Block geplant wird. Die nicht-terminierenden Runden in Classic-3D fixen.

**Warum:** `bot:validate` ist die einzige quantitative Bewertungsmethode für Bot-Qualität. Ohne funktionierende Validation kann kein Block (BT20, BT73, BT90) jemals sein Abschluss-Gate erfüllen.

**Abhängig:** Jeder Bot-Training-Block. BT90 DoD.6 direkt.

**Risiko bei Ignorierung:** Ewiges "Gate offen" bei jedem Trainingsblock. Keine Evidence-basierte Bot-Bewertung möglich.

---

### [KRITISCH] 3. Observation-Space formal spezifizieren.

**Was:** Ein Dokument erstellen, das exakt definiert, welche Features für jeden Spielmodus (classic-2d, classic-3d, hunt-2d, hunt-3d) in den Observation-Vektor fließen. Datentypen, Wertebereiche, Dimensionen, Feature-Namen.

**Warum:** Der Observation-Space ist die Grundlage für jede RL-Entscheidung. Ohne ihn ist der gesamte Rest (Netzarchitektur, Training, Inference) undefiniert.

**Abhängig:** BT90 Phase 2/3, jede Netz-Architektur-Entscheidung.

**Risiko bei Ignorierung:** Architektur auf Sand gebaut. Nachträgliche Obs-Space-Änderungen erfordern komplettes Retraining.

---

### [HOCH] 4. Feasibility-Proof vor Plan-Aktivierung.

**Was:** Einen minimalen PoC bauen: Python + SB3 + Gymnasium, ein einfaches CartPole-Env das via WebSocket mit dem Game kommuniziert, 1 Client, 1000 Steps. Zeitmessung: Latenz, Durchsatz, Stabilität.

**Warum:** Bevor 50 Manntage in BT90 investiert werden, muss bewiesen sein, dass die WebSocket-IPC-Architektur mit SB3 überhaupt funktioniert. Das kostet 2-3 Tage und kann den gesamten Plan bestätigen oder kippen.

**Abhängig:** BT90 Aktivierung.

**Risiko bei Ignorierung:** Man merkt erst nach 4 Wochen, dass WebSocket-Latenz für VecEnv-Parallelisierung zu hoch ist.

---

### [HOCH] 5. DoD-Gates quantifizieren.

**Was:** Jedes DoD-Gate mit konkreten Zahlen versehen (siehe 3.4 Verbesserungen). Insbesondere:
- DoD.2: Win-Rate und Survival-Schwellenwerte definieren
- DoD.6: "Gewonnen" quantifizieren (Metrik, Schwellenwert, statistische Signifikanz)
- DoD.7: Latenz/Stabilität/Memory-Grenzen definieren

**Warum:** Unprüfbare Gates sind nutzlos. Aktuell kann man BT90 nicht abschließen, weil man nicht weiß, wann "fertig" ist.

**Abhängig:** Jede Abnahme.

**Risiko bei Ignorierung:** Scope Creep ohne Ende. "Ist das intelligent genug?" wird zum ewigen Streitpunkt.

---

### [HOCH] 6. Feature-Flag und Isolation-Strategie definieren.

**Was:** `BOT_STRATEGY=dqn|ppo` als Runtime-Switch. Alle PPO-Änderungen auf einem Feature-Branch. `LocalDqnInference.js` bleibt unangetastet bis PPO bewiesen besser ist.

**Warum:** V76 ist aktiv und braucht einen funktionierenden Bot. PPO-Entwicklung darf DQN nicht brechen.

**Abhängig:** V76, Runtime-Stabilität.

**Risiko bei Ignorierung:** Bot bricht während V76-Entwicklung. Desktop Hangar ist unspielbar.

---

### [MITTEL] 7. 4-Spezialisten-Entscheidung auf empirische Basis stellen.

**Was:** Zuerst ein einzelnes Multi-Task-Netz mit Mode-Conditioning trainieren. Nur wenn empirisch bewiesen wird, dass Mode Confusion ein Problem ist, zu spezialisierten Netzen wechseln.

**Warum:** 4 Netze bedeuten 4× Aufwand bei Training, Tuning, Validation und Maintenance. Ein Indie-Projekt sollte den einfachsten Ansatz zuerst versuchen.

**Abhängig:** BT90 Phase 1.3, Phase 4.1.

**Risiko bei Ignorierung:** 4× Aufwand ohne nachgewiesenen Nutzen.

---

### [MITTEL] 8. Self-Play streichen.

**Was:** Phase 4.2 (League Play) aus BT90 entfernen. Stattdessen: scripted opponents + frozen best model als Gegner im Hunt-Modus.

**Warum:** Self-Play erfordert Infrastruktur (ELO, Snapshot-Management, PFSP), die für ein Indie-Projekt weder vorhanden noch nötig ist. Die Komplexität ist unverhältnismäßig.

**Abhängig:** BT90 Phase 4.

**Risiko bei Ignorierung:** 2-4 Wochen verschwendet auf ein System das nicht konvergiert (Mode Collapse).

---

## TEIL 7: SCHLUSSBEWERTUNG

**Gesamtnote: D+**

**Ist BT90 in seiner aktuellen Form bereit zur Aktivierung als Planblock?**
Nein. BT90 ist ein Wunschzettel mit guten Leitplanken, aber ohne die technische Substanz, die eine Aktivierung rechtfertigt. Es fehlen: Observation-Space-Definition, Hyperparameter-Strategie, messbare Gates, Zeitschätzungen, ein funktionierender Validation-Harness, Python-Umgebungsmanagement und eine Isolation-Strategie. Die 5 Leitplanken in Kapitel 0 sind die einzige Sektion mit Produktionsqualität.

**Was ist der eine kritischste Schritt, ohne den alle anderen Schritte auf Sand gebaut sind?**
Die formale Spezifikation des Observation-Space für jeden Spielmodus. Ohne definierte Inputs gibt es keine sinnvolle Netzarchitektur, kein korrektes Training, keine valide Evaluation. Alles andere (VecEnv, Bridge-Stresstest, ONNX-Export) baut darauf auf.

**Ist "Gold Standard" ein realistisches Label für diesen Plan in diesem Projektkontext?**
Nein. "Gold Standard" impliziert Best Practice, Vollständigkeit und Produktionsreife. BT90 ist davon weit entfernt. Es ist ein Konzeptpapier mit der Ambition eines Gold Standard, aber der Substanz eines ersten Brainstormings. Ein ehrlicherer Name wäre "BT90: PPO-Machbarkeitsstudie" oder "BT90: Python-RL-Infrastruktur-Konzept".
