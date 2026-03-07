# Feature: Runtime-Stabilisierung & Wartbarkeit (V30)

Stand: 2026-03-07
Status: Geplant
Owner: Single-Agent Umsetzung

## Ziel

Die nach V28.5 verbleibenden Restprobleme in Korrektheit, Lifecycle, Render-/Simulationskopplung und Wartbarkeit in einem zusammenhaengenden Durchlauf beheben, ohne bestehende Spielfunktionen oder die erreichten Performance-Zielwerte zu verlieren.

Kernziele:

1. Der GameLoop wird wieder strikt zeitkonsistent und FPS-unabhaengig.
2. Globale Listener, Timer und Runtime-Reste erhalten einen sauberen Dispose-/Teardown-Vertrag.
3. Trail-Simulation wird aus der View in den eigentlichen Simulationspfad verschoben.
4. Rest-Allokationen im Bot-/Observation-Hotpath werden reduziert und Bot-Tuning zentralisiert.
5. Recorder- und Fehlerpfade werden robuster und melden Support/Fallbacks korrekt.
6. `UIManager` und `GameRuntimeFacade` werden schrittweise von Monolithen zu Compose-Fassaden zurueckgebaut.
7. Match-/Runtime-State bleibt konsistent und klar ueber Transitionen gefuehrt.

## Kontext

Die Review-Nachvalidierung vom 2026-03-07 hat gezeigt:

- Die juengsten GPU-/Portal-/Lifecycle-Performance-Arbeiten aus V28.5 sind funktional weitgehend abgeschlossen.
- Die groessten Resthebel liegen nicht mehr primaer in Draw Calls, sondern in:
  - GameLoop-Korrektheit
  - Runtime-Lifecycle/Cleanup
  - Render-/Simulationskopplung beim Trail
  - verbleibenden Hotpath-Allokationen
  - erneuter Monolithisierung in `UIManager` und `GameRuntimeFacade`

Der Plan ist bewusst phasenbasiert, aber fuer einen One-Stop-Durchlauf ausgelegt: Jede Phase hat ein klares Zwischen-Gate, bevor die naechste beginnt.

## Nicht-Ziele

- Kein Gameplay-Balancing-Rework als eigenes Ziel.
- Kein neuer Multiplayer-Runtime-Ausbau.
- Kein UI-Redesign als Selbstzweck.
- Kein Big-Bang-Neubau von Renderer, Menu oder Match-Lifecycle ohne Zwischen-Gates.
- Kein Performance-Tuning auf Kosten der bereits erreichten Feature-Paritaet.

## Architektur-Check

Source-of-Truth fuer den aktiven Runtime-Schnitt:

- Core-Loop / Bootstrap / Lifecycle:
  - `src/core/GameLoop.js`
  - `src/core/GameBootstrap.js`
  - `src/core/main.js`
  - `src/core/GameRuntimeFacade.js`
  - `src/state/MatchLifecycleSessionOrchestrator.js`
- Rendering / Camera / Recorder:
  - `src/core/Renderer.js`
  - `src/core/MediaRecorderSystem.js`
  - `src/core/renderer/**`
- Entities / Trail / Player:
  - `src/entities/Player.js`
  - `src/entities/Trail.js`
  - `src/entities/player/PlayerView.js`
  - `src/entities/systems/PlayerLifecycleSystem.js`
  - `src/entities/runtime/EntityTickPipeline.js`
- Bot / Observation:
  - `src/entities/systems/PlayerInputSystem.js`
  - `src/entities/ai/observation/ObservationSystem.js`
  - `src/entities/ai/BotRuntimeContextFactory.js`
  - `src/entities/Bot.js`
- UI / Menu:
  - `src/ui/UIManager.js`
  - `src/ui/MenuController.js`
  - `src/ui/menu/**`

Reuse-vs-Neu Entscheidung:

- Bestehende Module bleiben der Default.
- Neue Hilfsdateien sind erlaubt, wenn sie klar Verantwortung aus `UIManager` oder `GameRuntimeFacade` herausziehen.
- Kein paralleler zweiter Runtime-Weg; neue Services/Fassaden muessen in den bestehenden Pfad integriert werden.

Risiko: hoch

- Grund: Der Plan greift in Tick, Lifecycle, Trail-Kollision, Recorder und UI-/Runtime-Orchestrierung ein.
- Hauptrisiken: versteckte Gameplay-Drift nach Loop-Fix, doppelte/fehlende Cleanup-Pfade, Trail-Regressions bei Kollision, Menu-/Settings-Regressions nach Split.
- Risikominderung: erst Korrektheit, dann Lifecycle, dann Entkopplung, dann Strukturabbau; nach jeder Phase gezielte Tests.

## Betroffene Dateien (geplant)

Bestehend:

- `src/core/GameLoop.js`
- `src/core/GameBootstrap.js`
- `src/core/main.js`
- `src/core/Renderer.js`
- `src/core/InputManager.js`
- `src/core/Audio.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/MediaRecorderSystem.js`
- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/entities/Player.js`
- `src/entities/Trail.js`
- `src/entities/player/PlayerView.js`
- `src/entities/systems/PlayerLifecycleSystem.js`
- `src/entities/systems/PlayerInputSystem.js`
- `src/entities/runtime/EntityTickPipeline.js`
- `src/entities/ai/observation/ObservationSystem.js`
- `src/entities/ai/BotRuntimeContextFactory.js`
- `src/entities/Bot.js`
- `src/ui/UIManager.js`
- `src/ui/MenuController.js`
- `src/ui/menu/MenuNavigationRuntime.js`
- `tests/core.spec.js`
- `tests/physics-core.spec.js`
- `tests/physics-hunt.spec.js`
- `tests/physics-policy.spec.js`
- `tests/gpu.spec.js`
- `tests/stress.spec.js`
- `docs/Analysebericht.md`
- `docs/Umsetzungsplan.md`

Optional neu, nur bei echtem Strukturgewinn:

- `src/core/runtime/RuntimeDisposalRegistry.js`
- `src/ui/start-setup/StartSetupController.js`
- `src/ui/menu/MenuDeveloperPanelController.js`
- `src/core/runtime/MenuRuntimeActionRouter.js`
- `src/core/runtime/MatchStartValidationService.js`

## Priorisierung nach Hebel

1. Zeitkonsistenz des Loops.
2. Runtime-Cleanup und Listener-/Timer-Lifecycle.
3. Trail-Simulation aus der View loesen.
4. Observation-Reuse und Bot-Konfigurationshygiene.
5. Recorder-/Fehlerpfade haerten.
6. `UIManager` und `GameRuntimeFacade` schrittweise verkleinern.
7. State-Kontrakte und Transitionen konsolidieren.

## Umsetzungsphasen

- [ ] 30.0 Baseline-Freeze und Revalidierung
  - Git-/Worktree-Status nur lesend pruefen; fremde Aenderungen nicht anfassen.
  - Review-Befunde gegen aktuellen Code revalidieren:
    - `GameLoop`-Zeitdoppelung
    - fehlende Dispose-Pfade
    - Trail-Update in `PlayerView`
    - Observation-Allokation
    - Recorder-Support-Erkennung
    - Monolithisierung in `UIManager` / `GameRuntimeFacade`
  - Phase-Gate:
    - reproduzierbare Istliste mit betroffenen Dateien und offenen Konflikten steht.
  - Verifikation:
    - `git status --short`
    - `npm run test:core`

- [ ] 30.1 GameLoop-Korrektheit und Timing-Regression absichern
  - Hybridpfad aus `accumulator` plus zusaetzlichem Direkt-Update aufraeumen.
  - `timeScale` nur einmal in die Simulationszeit einrechnen.
  - Falls noetig Render-Interpolation vorbereiten, aber nur wenn ohne Verhaltensbruch integrierbar.
  - Neue Regressionen fuer:
    - Sub-Step-Frames
    - grosse Delta-Clamps
    - Slow-Time / `timeScale`
  - Phase-Gate:
    - kein doppelt simulierter Zeitfortschritt mehr bei kurzen Frames.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`

- [ ] 30.2 Runtime-Dispose-Vertrag und Listener-/Timer-Cleanup
  - `dispose()` fuer `Game`, `Renderer`, `InputManager`, `AudioManager`, `UIManager`, `GameRuntimeFacade` und betroffene Hilfssysteme einfuehren/ergaenzen.
  - Anonyme globale Listener auf gebundene Handler umstellen.
  - `_startSetupDisposers` in `UIManager` real nutzen; Menue-Bindings und Timer sauber abmelden.
  - Prewarm-/Toast-/Recorder-/RAF-/Interval-Pfade auf kontrollierten Teardown ziehen.
  - Phase-Gate:
    - wiederholte Initialisierung oder kompletter Runtime-Abbau verdoppelt keine Handler mehr.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`

- [ ] 30.3 Trail-Simulation aus der View loesen
  - `trail.update(...)` aus `PlayerView.update()` entfernen.
  - Trail-Segment-Erzeugung in den eigentlichen Simulationspfad verlagern, vorzugsweise in `PlayerLifecycleSystem` direkt nach der Bewegungsaktualisierung.
  - `PlayerView` auf rein visuelle Verantwortung begrenzen.
  - Trail-/Kollisions-Regressionen fuer identisches Verhalten nach der Verschiebung ergaenzen.
  - Phase-Gate:
    - Trail-Kollision und Trail-Visual bleiben funktional, aber nicht mehr view-getrieben.
  - Verifikation:
    - `npm run test:physics`
    - `npm run test:core`
    - `npm run test:stress`

- [ ] 30.4 Bot-/Observation-Hotpath und Tuning-Konfiguration
  - Wiederverwendbaren Observation-Buffer pro Bot/Runtime-Context einfuehren.
  - `buildObservation(..., target)` konsequent mit Reuse nutzen.
  - `ITEM_RULES` und Fallback-Botprofilwerte aus `Bot.js` in Konfiguration oder dedizierte Tuning-Module ziehen.
  - Sicherstellen, dass Bridge-/Policy-Vertraege array-kompatibel bleiben.
  - Phase-Gate:
    - keine neue Observation-Array-Allokation pro KI-Update mehr.
  - Verifikation:
    - `npm run test:physics`
    - `npm run test:stress`
    - optional `npm run benchmark:baseline`

- [ ] 30.5 Recorder-Support, Fallbacks und Fehlerpfade haerten
  - Native Recorder-Capability klar von Test-/Noop-Shims trennen.
  - `getSupportState()` darf `canRecord` nur bei echtem Record-Pfad melden.
  - Recorder-Start/Stop-Resultate und Fallback-Meldungen vereinheitlichen.
  - Fehleroverlays in `main.js` auf sichere Textausgabe umstellen.
  - Phase-Gate:
    - Unsupported-Runtimes behaupten keine Recording-Faehigkeit mehr.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:gpu`

- [ ] 30.6 `UIManager` modularisieren
  - Start-Setup/Favoriten/Vorschau, Developer-/Preset-Panel und Menu-Context/Chrome in klarere Teilcontroller auslagern.
  - `UIManager` als Compose-/Sync-Fassade behalten, aber nicht mehr als Hauptlogik-Senke.
  - Event-Bindings und DOM-Rendering enger an den jeweiligen Teilbereich koppeln.
  - Phase-Gate:
    - `UIManager` ist deutlich kleiner, ohne Menue-/Sync-Regression.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`

- [ ] 30.7 `GameRuntimeFacade` und State-Kontrakte konsolidieren
  - Match-Start-Validierung, Preset-/Config-Aktionen, Multiplayer-Stub und Settings-Change-Orchestrierung aus `GameRuntimeFacade` herausziehen.
  - String-State-Zuweisungen auf klarere Konstanten/Transition-Helfer umstellen.
  - Match-/Menu-Lifecycle-Begriffe und Uebergaenge vereinheitlichen.
  - Phase-Gate:
    - `GameRuntimeFacade` ist auf Routing/Komposition reduziert; State-Uebergaenge sind zentraler und klarer.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`

- [ ] 30.8 Abschluss-Gate und Doku-Freeze
  - Gesamtstand gegen urspruengliche Befunde und bestehende Feature-Paritaet pruefen.
  - Dokumentation aktualisieren:
    - `docs/Analysebericht.md`
    - `docs/Umsetzungsplan.md`
    - ggf. `docs/ai_architecture_context.md`
  - Abschluss mit Doku-Gates.
  - Phase-Gate:
    - alle Kernprobleme aus dem Review sind geschlossen oder bewusst mit Restrisiko dokumentiert.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:gpu`
    - `npm run test:stress`
    - optional `npm run benchmark:baseline`
    - `npm run docs:sync`
    - `npm run docs:check`

## Rollout- und Sicherheitsregeln

- Keine grosse Strukturphase vor dem Fix des GameLoops.
- Keine Refactor-Phase ohne gruenes Zwischen-Gate der vorherigen Phase.
- Fremde Aenderungen im Worktree nicht anfassen oder zuruecksetzen.
- Selektiv stagen; keine unscoped Commits.
- Falls eine Phase durch fremde parallele Aenderungen blockiert wird, nur dann stoppen und sauber dokumentieren; ansonsten One-Stop weiterarbeiten.

## Dokumentations-Hook

Vor Abschluss der Implementierung:

- `npm run docs:sync`
- `npm run docs:check`
