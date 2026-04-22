# Masterplan: BT90 – Goldstandard Bot-Training (PPO & Hardware-Maximierung)

> [!IMPORTANT]
> **PLAN – NOCH NICHT UMGESETZT**
> Dieses Dokument beschreibt den **angestrebten Zielzustand** der Bot-Trainingsinfrastruktur.
> Kein einziger Schritt ist implementiert. Die Python-Infrastruktur (PPO, Gymnasium, SB3) existiert noch nicht im Repository.
> Ziel ist es, genau das hier zu erreichen.

**Status:** `PLAN` — Zieldefinition für BT90. Ablösung der Alt-Pläne in `docs/bot-training/` nach vollständiger Umsetzung.  
**Aktueller Ist-Stand:** DQN via `LocalDqnInference.js`, kein Python-Stack, keine VectorEnvs.  
**Ziel:** Professioneller Umbau auf eine hochgradig parallele PPO-Infrastruktur (GPU/CPU-Maximierung), 4 isolierte Spezialisten-Netze, Multi-Discrete Action Space. Behebt Architektur-Schulden aus BT12/BT20.

---

## 0. Architektur-Leitplanken & V92-Compliance
*Vorabprüfung: Was wir zwingend vermeiden müssen ("Dumb Mistakes").*

1. **V92-Ownership & Application-Grenzen wahren:** Die `WebSocketTrainerBridge` darf keine globalen State-Bypässe aus der Engine nutzen. Die API-Kommunikation muss strikt den in V92 definierten Fassaden-Schnittstellen entsprechen.
2. **Den Veto-Layer umgehen:** Das neue PPO liefert Aktionen, **MUSS** aber zwingend weiterhin durch den bestehenden `HybridDecisionArchitecture` (Safety-Layer aus BT73) gefiltert werden. Intents und Recovery-Verhalten bleiben.
3. **Fail-Fast bei Observation Drifts:** Wenn die Engine durch Gameplay-Updates (wie in V72) neue Sensordaten sendet, darf die Bridge **kein** Zero-Padding vornehmen! Ein Längen-Mismatch muss zwingend zu einem harten Trainings-Abbruch (Fail-Fast) führen, damit veraltete Netze nicht blind weiterlernen.
4. **Reward-Clipping & Death-Penalty:** `Stable-Baselines3 VecNormalize` glättet Rewards auf `[-1, 1]`. Tode und Abstürze werden **nicht** post-normalisiert hart im Wert überschrieben. Stattdessen triggern sie `done/truncated = true` in der Gym-Umgebung, womit PPO den Episode Return regulär abschließt und Bootstrapping abbricht. Die Varianz der Advantage-Estimation bleibt intakt.
5. **Overfitting:** Der Python-Trainer muss durch asynchrone Evaluierungs-Runden regelmäßig ein `best_model.onnx` speichern.

---

## Phase 1: Voraussetzungen & Generalist-Ansatz

- [ ] 1.1 **Hardware-Profiling durchführen:** Ein Test-Skript ermittelt die absolut reellen Limits des PCs. Diese Konstanten (z.B. `cpu_workers_limit = 12`) sichern. `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 1.2 **V92 Schnittstellen-Audit:** Prüfung der `WebSocketTrainerBridge.js` auf Konformität mit dem V92 Runtime-Vertrag. Welche JSON-Daten fliegen exakt hin und her? Keine illegalen Property-Hooks. `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 1.3 **Getrennte spezialisierte Netze für 2D und 3D:** Keine künstliche Vereinigung! Da 2D und 3D über fundamentale Unterschiede im Observation-Space (z.B. Z-Achse, Höhen-Raycasts) verfügen und Zero-Padding verboten bleibt (Leitplanke 3), trainieren wir vollständig isolierte Spezialisten (`classic-2d`, `classic-3d`, `hunt-2d`, `hunt-3d`). Dies verhindert "Observation Drift" und Mode-Confusion effektiv. `(abgeschlossen: YYYY-MM-DD; evidence: )`

---

## Phase 2: Infrastruktur-Aufbau (Hardware Governor & OS-Neutralität)

- [ ] 2.1 **Bridge Stresstest & IPC Scaling:** Vor der Vektorisierung wird die `WebSocketTrainerBridge` auf Parallelzustände gestresstestet. Kapazität für 12 concurrent Game-Clients muss über stabile Port-Distribution und IPC bewiesen werden. Es darf keine `app:game-instance` Timeouts geben (Lektion aus BT12). `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 2.2 **Datensammlung via Vectorized Environments (Parallel):** Bau des Python `SystemResourceGovernor`. Sammelt asynchron und hochparallel Daten über Sub-Prozesse via `gymnasium.AsyncVectorEnv`. Voraussetzung ist der erfolgreiche Testzyklus aus 2.1. `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 2.3 **OS-Neutrale Zombie-Prozess Bekämpfung:** Implementierung harter `atexit` (Python) und Tötungsprozesse via `tree-kill` (Node) oder `psutil` (Python). **Kein hartes Windows `taskkill`!** `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 2.4 **Synchronisierung:** Fällt ein Worker-Node im Vektor aus, setzt er sich via Hub-Architektur selbst zurück, ohne die Episode der anderen parallel-laufenden Nodes zu sprengen. `(abgeschlossen: YYYY-MM-DD; evidence: )`

---

## Phase 3: PPO-Umbau & Game-Engine Optimierungen

- [ ] 3.1 **Action-Repetition (Frame Skipping):** Das Netz darf nur noch jeden 4. Game-Tick aufgerufen werden (100ms Latenz). `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 3.2 **Multi-Discrete Action Translation:** Python-Output wird auf einen mehrdimensionalen diskreten Raum geändert (z.B. `[Lenkung (-1,0,1), Schub/Bremse (-1,0,1), Item-Einsatz (0,1)]`). Ein reines "nur Lenken"-PPO kann aktuelle Enginefeatures (V72/V82) nicht operieren. Die `ObservationBridgePolicy` mappt diese Indizes zurück in die Engine. `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 3.3 **Reward Normalization:** Einschalten des `VecNormalize` Wrappers. Verzicht auf manuelle Penalty-Value-Hacks (siehe Leitplanke 4). `(abgeschlossen: YYYY-MM-DD; evidence: )`

---

## Phase 4: Makro-Pipeline & Evaluierung (Der Cluster läuft an)

- [ ] 4.1 **Sequenzielle Makro-Pipeline:** Bau eines Master-Scripts (z.B. `npm run training:pipeline`), welches das Ressourcen-Problem löst, indem die Spezial-Modelle (`classic-2d`, `classic-3d`, `hunt-2d`, `hunt-3d`) **stur nacheinander** ausgebildet werden. Die *Datensammlung pro Modell* (Phase 2.2) bleibt intern parallel, aber es konkurrieren niemals 2 PPO-Netzwerke gleichzeitig um CPU-Ressourcen. `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 4.2 **League Play (Self-Play) für Hunt:** In Hunt-Matches lernt das Modell aktiv im 1. Slot gegen Versionen seiner eigenen Vortage in den Slots 2-4 (Self-Play). `(abgeschlossen: YYYY-MM-DD; evidence: )`
- [ ] 4.3 **Kandidaten-Promotion (A/B Test über Validation-Harness):** Vor dem Merge ins Release muss jeder PPO-Spezialist gegen den alten DQN-Champion antreten und signifikant besser abschneiden. Hierbei ist **zwingend** der in BT80C etablierte `bot:validate`-Validation-Harness mit einer fest definierten 3-Run-A/B-Lane zu nutzen. `(abgeschlossen: YYYY-MM-DD; evidence: )`
