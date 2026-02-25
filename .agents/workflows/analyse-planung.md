---
description: Führt tiefgehende Tests aus, erstellt einen Analysebericht und leitet einen priorisierten 3-Phasen-Plan (Wichtig, Mittel, Unwichtig/Backlog) inklusive finalem Review ab.
---

## 0. Kontext-Aufbau (immer zuerst!)

Lies `docs/Umsetzungsplan.md` und zeige die Statusübersicht (wie in `/fix-planung` Schritt 0).
Lies auch den letzten `docs/Analysebericht.md` (falls vorhanden), um zu wissen welche Probleme bereits bekannt sind.

---

1. **System- & Code-Integritätstests durchführen**: Führe nacheinander die folgenden 125 Testroutinen aus. Nutze dafür die aufgeteilten NPM-Skripte und beachte die Ausführungsumgebung (lokal vs. CI/CD):

   *Hinweis zur Automatisierung:* Nutze **Playwright/Puppeteer** für alle render- und UI-basierten Tests im Headless-Modus. Richte einen **Nightly Build (CI/CD)** ein, der alle 125 Tests durchführt. Lokal sollen via Pre-Commit-Hook nur die `[SMOKE]`-Tests laufen.

   - **`npm run test:core`** *(Test 1-20 - Core & Infrastruktur)*:
     1. `[SMOKE]` Linter (Statische Code-Analyse)
     2. `[SMOKE]` Build (Produktions-Build prüfen)
     3. `[SMOKE]` Unit-Tests (Kernkomponenten)
     4. Performance (Game-Loop Simulation)
     5. `[SMOKE]` Physics (Kollisionserkennung)
     6. AI-Logik (Bot-Entscheidungsbäume)
     7. Memory (Stresstest auf Leaks)
     8. `[SMOKE]` Data Integrity (LocalStorage Checksums)
     9. Rendering (Shader/Materialien)
     10. Modding/API (Sandbox-Schnittstellen)
     11. Network/Latency (Dispatch-Latenzen)
     12. Input/Steuerung (Responsibilität)
     13. Audio (Spacial-Audio/Limits)
     14. UI/UX (DOM/Canvas-Overlays)
     15. Garbage Collection (Profiling)
     16. Scene Graph (Frustum Culling)
     17. Kompatibilität (WebGL Fallbacks)
     18. Asset Loading (Stresstest)
     19. Error Handling (Graceful Degradation)
     20. `[SMOKE]` State Migration (Abwärtskompatibilität)

   - **`npm run test:gpu`** *(Test 21-40 - Erweitertes Rendering & GPU)*:
     21. Frustum Culling Edge Cases
     22. Occlusion Culling Effizienz
     23. Shadow Map Resolution Scaling
     24. Shadow Map Cascades Übergänge
     25. Bloom Thresholds & Bleeding
     26. Chromatic Aberration Intensity Limit
     27. Vignette Scaling auf Ultrawide
     28. Anti-Aliasing (MSAA/FXAA) Glitches
     29. Texture Filtering (Anisotropic) Ladefehler
     30. Mipmap Levels Transition
     31. Particle System Count Limits
     32. Particle Collision Boundaries
     33. Decal Projection Verzerrungen
     34. Instanced Mesh Culling Z-Fighting
     35. LOD Transitions Popping
     36. UI Canvas Resolution Scaling
     37. Font Rendering High-DPI
     38. WebGL Context Loss Recovery
     39. WebGL Context Restore State
     40. GPU VRAM Overhead Monitoring

   - **`npm run test:physics`** *(Test 41-60 - Erweiterte Physik & AI - je 100x Durchläufe für Stochastik)*:
     41. Raycast Precision bei High-Speed (x100 Random Vektoren)
     42. Spherecast Penetration Detection (x100 Random Spawns)
     43. Continuous Collision Detection (CCD) (x100 Fast Actors)
     44. Rigidbody Sleep State Trigger
     45. Physics Step Interpolation Jitter
     46. Kinematic vs Dynamic Rigidbodies
     47. Trigger Volume Edge-Crossing
     48. Friction Material Multipliers
     49. Restitution/Bounciness Stacking
     50. Spatial Hash Grid Rebuild Cost
     51. Pathfinding A* CPU-Spikes (x100 Random Wegpunkte)
     52. NavMesh Generation Dynamic
     53. NavMesh Dynamic Obstacle Carving
     54. Steering Behaviors (Crowd Avoidance)
     55. Swarm/Flocking Agent Separation
     56. Finite State Machine Deadlocks (x300 Transition Loops)
     57. Behavior Tree Fallback Nodes
     58. Target Acquisition Prioritization
     59. Line of Sight (LoS) Ray Queries (x1000 Queries)
     60. Sensorial Radius Masking

   - **`npm run test:stress`** *(Test 61-125 - Net/Mem Limits, I/O & Security)*:
     61. Websocket Connection Drop Handling (10x Drops)
     62. Websocket Reconnection Backoff
     63. WebRTC Datachannel Fallback
     64. Packet Loss Sim (20% Drop-Rate, x1000 Pakete)
     65. High Latency Sim (500ms Ping, 60 Sekunden Dauer)
     66. Jitter Buffer Overflow/Underflow
     67. Client-Side Prediction Drift
     68. Server Reconciliation Snapbacks
     69. Entity Interpolation Buffer
     70. Bandwidth Chunking Limits
     71. Frame Time Variance Detection
     72. Draw Call Batching Thresholds
     73. CPU Bound vs GPU Bound Toggle
     74. Script Execution Time per Frame
     75. Main Thread Blocking (16ms Limit)
     76. CSS Reflows in UI Updates
     77. DOM Node Count Leak Detection (5 Minuten Dauer-Loop)
     100. WebWorker Message Cloning Latency
     101. IndexedDB Bulk Write Time
     102. LocalStorage Quota Exceed Exception
     103. SharedArrayBuffer Fallbacks
     104. Audio Context Background Suspend
     105. Positional Audio Panning Curve
     106. Audio Buffer Concurrent Decodes
     107. Multiple Sound Overlaps (Voice Limit)
     108. Audio Device Switching Hot-Plug
     109. Input Device Polling Rate Jitter
     110. Gamepad Axis Deadzone Drift
     111. Gamepad Button Mapping Edge Cases
     112. Keyboard Ghosting Kombinationen
     113. Mouse Delta Smoothing Jump
     114. Touch Screen Multi-Touch Pinch
     115. Browser Tab Visibility Change Event
     116. Background Throttling Timer Rescue
     117. Power Saving Mode FPS Detect
     118. Device Pixel Ratio Hot-Swap
     119. Savegame Checksum Tampering
     120. Savegame Version Schema Validate
     121. Corrupt Savegame Recovery
     122. JSON Parsing Exception Trapping
     123. Binary Serialization Endianness
     124. Entity ID Generation Collisions
     125. Event Bus Infinite Loop Guard
     126. Event Listener Unmount Leaks
     127. Promise Rejection Global Handler
     128. XSS Vulnerability in Chat/Input
     129. Rate Limiting Command Spam
     130. Analytics/Telemetrie Opt-Out
     131. Error Reporting Payload Size
     132. Dependency Version Resolving
     133. Minification Variable Mangling
     134. Source Map Resolving in Prod
     135. Hot Module Replacement Status
     136. Localization Missing Keys Check
     137. Font Load Timeout Fallback
     138. Texture Fallback Images (Missing/404)
     139. CSS Variable Scope Bleeding
     140. CSS Animation GPU Acceleration
     141. Game Logic Determinism Check
     142. Final Memory Heap Snapshot Compare
     143. Arithmetic Robustness (NaN/Infinity Guards in Kern-Berechnungen)
     144. State Transition Validation (Prüfung illegaler Zustandsübergänge)
     145. Component Lifecycle Consistency (Initialisierungs- & Zerstörungslogik)
     146. Data Transform Integrity (Validierung von Input-zu-Output Mappings)
     147. Global Registry/Store Sync (Verhinderung von "Stale States" in Stores)

   - **`npm run smoke:roundstate`** *(Smoke: RoundStateController - reine Node.js-Logik, kein Server nötig)*
   - **`npm run smoke:selftrail`** *(Smoke: Trail-Kollision im Browser - baut und startet Dev-Server automatisch)*

2. **Testergebnisse persistieren**: Speichere die Roh-Ergebnisse in `docs/Testergebnisse_YYYY-MM-DD.md` mit Datum im Dateinamen. Format pro Test: `✅ PASS` / `❌ FAIL` / `⚠️ WARN` + Kurzbeschreibung.

3. **Analysebericht (Nur NEUE Funde)**: Analysiere die Ausgaben aller 125 Tests. Falls ein vorheriger `docs/Analysebericht.md` existiert, **vergleiche** die neuen Ergebnisse mit dem letzten Bericht und markiere was **neu**, **behoben** oder **verschlechtert** ist. Dokumentiere in `docs/Analysebericht.md` ausschließlich **neue** Probleme, Regressionsfehler oder bisher unentdeckte Engpässe.

4. **Planung & Triage (Update des Master-Plans)**: Aktualisiere den **`docs/Umsetzungsplan.md`**. Integriere die **neu** im Analysebericht identifizierten Punkte in das bestehende Prioritätensystem (Wichtig, Mittel, Unwichtig).
   *Hinweis: Behalte die Struktur des Master-Plans bei. Bereits erledigte Alt-Aufgaben [x] bleiben zur Dokumentation stehen.*

5. **Phasen-Definition & Master-Update**: Passe die bestehenden Phasen an oder erstelle neue (z.B. Phase 7+), falls die neuen Funde nicht in Phase 1-6 passen. Jede Phasen-Überschrift **muss** eine Checkbox enthalten: `## Phase X: [ ] Titel`. Definiere pro Phase:
   - Exakte Ziele & betroffene Dateien.
   - Ein klares Verifikationskriterium (Review-Test).

6. **Finaler Review**: Überprüfe `docs/Umsetzungsplan.md` gegen `docs/Analysebericht.md`. Stelle sicher, dass keine Aspekte aus den 125 Tests vergessen wurden und die `/fix-planung` Kompatibilität (Checkboxen in Headings) gewahrt bleibt.
