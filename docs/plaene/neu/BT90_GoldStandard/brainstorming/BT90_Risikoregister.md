# Risiko-Register – BT90 Goldstandard

> [!IMPORTANT]
> **PLAN – NOCH NICHT UMGESETZT**
> Dieses Register dokumentiert die Risiken des **angestrebten Zielzustands**.
> Kein Risiko ist bisher gegengesteuert worden, da die Implementierung noch nicht begonnen hat.

**Zielblock:** BT90 (Trainer-Architektur-Umbau auf PPO & Ablösung Alt-Pläne)  
**Ist-Stand:** DQN-Baseline aktiv, Python-Stack nicht vorhanden.

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| **Python-Infrastruktur existiert nicht** <br> Kein `train.py`, kein `requirements.txt`, kein SB3/Gymnasium im Repo. Alle Phasen ab 2.2 sind blockiert. | **fatal** | Architektur | Python-Stack als allerersten step in Phase 1 aufsetzen, bevor irgendwelche Netz-Entscheidungen getroffen werden. | Keine `.py`-Datei im Repo bei Phase-2-Start. |
| --- | --- | --- | --- | --- |
| **Silent Degradation durch Observation Drift** <br> Neue Items/Sensoren verändern die Engine-Daten, das Netz spielt "blind". | hoch | Integration | Striktes **Fail-Fast** in der Bridge. Bei einem Längenmismatch von Arrays crasht das System hart, um ein Re-Training zu erzwingen. | Längen-Mismatch Array beim Start. |
| **Gradients Explodieren durch Reward Normalization** <br> Manueller Override der Death Penalty nach VecNormalize. | hoch | RL-Dev | "Death Penalty" triggert saubere `done/truncated`-Flags der Gym-Umgebung statt Value-Overrides, um PPO-Bootstrapping korrekt zu cutten. | Unerklärliche Agent-Destabilisierung. |
| **OS-Lockin durch Zombie-Scripts** <br> `taskkill` bricht auf Linux/Docker oder CI-Pipelines. | mittel | Train-Ops | Libraries wie `tree-kill` (Node) oder `psutil` (Python) für Prozessbäume nutzen. | `spawn ENOTFOUND` auf Nicht-Windows Systemen. |
| **Action-Space Limitiert (Zombie Bot)** <br> Netz lernt nur Lenken und ignoriert Gameplay (V72/V82). | hoch | RL-Dev | PPO auf **Multi-Discrete** Action Space ausweiten, um Lenken, Schub und Items über mehrere Dimensionen korrekt ans Spiel zu binden. | Bot kollidiert absichtlich, um Game-Loop zu beenden, oder weicht passiv aus. |
| **Out-of-Memory / CPU-Thrashing** <br> Makro-Loop startet alle 4 Spezialisten gleichzeitig. | hoch | Train-Ops | Harte **sequenzielle** Makro-Pipeline bauen (Classic-2D, dann Classic-3D, etc.). Die Vector-Umgebungen bleiben intern parallel. | Totaler OS-Freeze. |
| **Port Collision / Runner Timeout (IPC)** <br> VectorEnvs starten massiv parallele Game-Clients, was die `WebSocketTrainerBridge` überlastet oder Port-Zuweisung blockiert. | fatal | Train-Ops / Architektur | **Vor** dem Vektor-Training wird ein isolierter Stresstest der Bridge mit 12 Clients gefahren. Feste Sub-Prozess Port-Ranges erzwingen. | `app:game-instance` Timeouts oder Socket-Crashes. |
| **Bruch der Architektur-Verträge (V92/BT73/BT80C)** <br> Neue Architektur bricht Application-Ownership, ignoriert Veto-Regeln oder bricht `bot:validate`. | hoch | Integration | Striktes Einhalten der V92 API-Gaps, der Veto-Layer aus BT73 und Nutzung des BT80C Validation-Harness für alle A/B-Tests. | A/B Benchmark-Skript ist inkompatibel / Dev-Bypässe greifen tief in Laufzeit ein. |
