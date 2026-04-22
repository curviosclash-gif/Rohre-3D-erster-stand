# Definition of Done (DoD) – BT90 Goldstandard

> [!IMPORTANT]
> **PLAN – NOCH NICHT UMGESETZT**
> Diese Gates beschreiben den **angestrebten Abschluss-Zustand** von BT90.
> Kein einziges Gate ist bisher erfüllt. Erst wenn alle Gates grün sind, gilt BT90 als fertig.

**Zielblock:** BT90 (Trainer-Architektur-Umbau auf PPO & Ablösung Alt-Pläne)  
**Ist-Stand:** Alle Checkboxen offen. DQN läuft, Python-Stack existiert nicht.

- [ ] **DoD.1 Phasen-Abschluss:** Alle Phasen (1.X bis 4.X) des Architektur-Masterplans sind mit gültigem Evidence-Eintrag abgeschlossen.
- [ ] **DoD.2 Specialized Models:** Es werden am Ende eines Pipeline-Laufs 4 spezialisierte intelligente ONNX-Modelle exportiert (`classic-2d`, `classic-3d`, `hunt-2d`, `hunt-3d`), um Dimensions-Konflikte (Observation Drift) strikt zu vermeiden.
- [ ] **DoD.3 Multi-Discrete Actions:** Das Modell steuert das Spiel über einen Multi-Discrete Space, der Features aus aktuellen Blöcken (V72, V82) abbilden kann (nicht nur simplifiziertes Links/Rechts).
- [ ] **DoD.4 OS-Neutralität:** Das Beenden von Zombie-Prozessen funktioniert plattformunabhängig (Verzicht auf Windows-spezifisches `taskkill`).
- [ ] **DoD.5 Fail-Fast Architektur (Observation Drift):** Hinzugefügte Sensoren aus der Engine füttern das Netz nicht lautlos mit Nullen (Zero-Padding), sondern werfen einen harten Bridge-Error beim Verbindungsaufbau, der ein neues Training initiiert.
- [ ] **DoD.6 V92- & A/B-Promotion-Compliance:** Jeder Modelldurchlauf nutzt die etablierten V92-Application-Fassaden (keine Bypass-Hacks). Die Modell-Kandidaten haben über den `bot:validate`-Validation-Harness (BT80C) in einer 3-Run A/B-Lane gegen den alten DQN-Champion gewonnen.
- [ ] **DoD.7 Sequenzielle Auslastung & IPC Scaling:** Ein Bridge-Stresstest beweist, dass die `WebSocketTrainerBridge` die parallele Last von z.B. 12 Sub-Prozessen (VectorEnvs) stabil ohne Port-Collisions oder Timeouts managen kann. Das Makro-Trainingsscript lastet CPU/GPU dann intern 100% aus, reiht aber die Meta-Trainings (`classic-2d -> classic-3d -> hunt-2d -> hunt-3d`) strikt nacheinander auf, ohne Kontext-Switching-Staus.
- [ ] **DoD.8 Unit & Validation Tests:** Die überarbeitete `ObservationBridgePolicy` ist durch Unit Tests abgesichert.
