# Feature: Runtime-Stabilisierung & Wartbarkeit (V30)

Stand: 2026-03-07
Status: Abgeschlossen
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

- [x] 30.0 Baseline-Freeze und Revalidierung
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
  - Status 2026-03-08:
    - `src/core/GameLoop.js`: `accumulator += dt * timeScale`, danach Fixed-Step-Loop plus Fallback `updateFn(dt * timeScale)`; kurze Frames koennen Simulationszeit doppelt anwenden.
    - `src/ui/UIManager.js`: `_startSetupDisposers` existiert, wird aber nicht befuellt oder als echter Teardown-Pfad genutzt; Start-Setup-/Level4-/Developer-Listener bleiben anonym am DOM.
    - `src/entities/player/PlayerView.js`: `update(dt)` ruft weiterhin `this.player.trail.update(...)` auf; Trail-Simulation ist damit view-getrieben.
    - `src/entities/ai/observation/ObservationSystem.js` + `src/entities/systems/PlayerInputSystem.js`: ohne Reuse-Target erzeugt `buildObservation(...)` ein neues Array; der Bot-Pfad uebergibt aktuell kein Observation-Reuse-Target.
    - `src/core/MediaRecorderSystem.js`: Support-Probe ist zu optimistisch, weil ein globaler `VideoEncoder`-Shim gesetzt wird und `getSupportState()` danach `hasRecorder/canRecord` positiv meldet.
    - `src/ui/UIManager.js` und `src/core/GameRuntimeFacade.js` bleiben grosse Mehrzweck-Fassaden; Split/Compose bleibt fuer spaetere Phasen offen.
    - Baseline-Gate: `npx playwright test tests/core.spec.js --reporter=line --workers=1` PASS (`53 passed`, `1 skipped`).

- [x] 30.1 GameLoop-Korrektheit und Timing-Regression absichern
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
  - Status 2026-03-08:
    - `src/core/GameLoop.js`: Fallback-Direktupdate entfernt; die Simulation laeuft jetzt ausschliesslich ueber akkumulierte Fixed-Steps mit einmalig angewendeter `timeScale`.
    - `src/core/GameLoop.js`: `start()` setzt den Accumulator sauber zurueck; ungueltige `timeScale`-Werte werden auf einen sicheren Bereich normalisiert.
    - `tests/core.spec.js`: neue Regressionen `T20ab`, `T20ac`, `T20ad` decken Sub-Step-Frames, Delta-Clamp und Slow-Time ohne Doppelskalierung ab.
    - Gate: `npm run test:core` PASS (`56 passed`, `1 skipped`).
    - Gate: `npx playwright test tests/physics-core.spec.js tests/physics-hunt.spec.js tests/physics-policy.spec.js --reporter=line --workers=1` PASS (`47 passed`).

- [x] 30.2 Runtime-Dispose-Vertrag und Listener-/Timer-Cleanup
  - `dispose()` fuer `Game`, `Renderer`, `InputManager`, `AudioManager`, `UIManager`, `GameRuntimeFacade` und betroffene Hilfssysteme einfuehren/ergaenzen.
  - Anonyme globale Listener auf gebundene Handler umstellen.
  - `_startSetupDisposers` in `UIManager` real nutzen; Menue-Bindings und Timer sauber abmelden.
  - Prewarm-/Toast-/Recorder-/RAF-/Interval-Pfade auf kontrollierten Teardown ziehen.
  - Phase-Gate:
    - wiederholte Initialisierung oder kompletter Runtime-Abbau verdoppelt keine Handler mehr.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`
  - Status 2026-03-08:
    - `src/core/main.js`: `Game.dispose()` eingefuehrt; entfernt globalen Key-Capture-Listener, stoppt Playtest-Timer und faehrt Match-/UI-/Core-Subsysteme kontrolliert herunter.
    - `src/core/Renderer.js`, `src/core/InputManager.js`, `src/core/Audio.js`, `src/core/GameRuntimeFacade.js`: gebundene Handler plus echte `dispose()`-Pfade fuer Resize-, Keyboard-, Init-/Mute- und Menu-Listener.
    - `src/ui/MenuController.js` + `src/ui/menu/Menu*Bindings.js`: Binding-Pfad auf registrierte Disposer umgestellt; Reinit stapelt keine Menu-Handler mehr.
    - `src/ui/UIManager.js`: `_startSetupDisposers` wird jetzt real befuellt und mit weiteren UI-Disposern in `dispose()` abgearbeitet; Toast-Timer und Level4-/Developer-Bindings werden sauber geloest.
    - `tests/core.spec.js`: neue Regression `T20ae` validiert Dispose + Reinit ueber Key-Capture-, Resize-, Input- und Start-Button-Pfade.
    - Gate: `npm run test:core` PASS (`57 passed`, `1 skipped`).
    - Gate: `npm run test:stress` PASS (`19 passed`).

- [x] 30.3 Trail-Simulation aus der View loesen
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
  - Status 2026-03-08:
    - `src/entities/player/PlayerView.js`: Trail-Tick aus `update(dt)` entfernt; View bleibt visuell verantwortlich.
    - `src/entities/systems/PlayerLifecycleSystem.js`: Trail-Tick direkt nach `player.update(dt, input)` in den Simulationspfad verschoben.
    - `tests/physics-core.spec.js`: neue Regression `T45b` stellt sicher, dass Trail-Updates ueber `PlayerLifecycleSystem` laufen und nicht aus `PlayerView.update()` ausgeloest werden.
    - Zusatzhaertung aus Review: `tests/helpers.js` `returnToMenu()` mit Retry/Fallback stabilisiert, um Escape-Return-Flakes im Stresslauf zu vermeiden.
    - Gate: `npm run test:physics` PASS (`48 passed`).
    - Gate: `npm run test:core` PASS (`57 passed`, `1 skipped`).
    - Gate: `npm run test:stress` PASS (`19 passed`).

- [x] 30.4 Bot-/Observation-Hotpath und Tuning-Konfiguration
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
  - Status 2026-03-08:
    - `src/entities/ai/BotRuntimeContextFactory.js`: pro Bot-Runtime-Context wird ein persistenter Observation-Buffer gehalten und ueber Ticks wiederverwendet.
    - `src/entities/systems/PlayerInputSystem.js`: `buildObservation(player, context, target)` nutzt den Runtime-Buffer konsequent statt neuer Arrays.
    - `src/entities/ai/BotTuningConfig.js` neu: zentrale `BOT_ITEM_RULES` und `BOT_FALLBACK_DIFFICULTY_PROFILE`; `src/entities/Bot.js` nutzt nur noch das dedizierte Tuning-Modul.
    - `tests/physics-policy.spec.js`: neue Regression `T71b` sichert Observation-Referenz-Reuse ueber mehrere Bot-Ticks.
    - Gate: `npm run test:physics` PASS (`49 passed`).
    - Gate: `npm run test:stress` PASS (`19 passed`).

- [x] 30.5 Recorder-Support, Fallbacks und Fehlerpfade haerten
  - Native Recorder-Capability klar von Test-/Noop-Shims trennen.
  - `getSupportState()` darf `canRecord` nur bei echtem Record-Pfad melden.
  - Recorder-Start/Stop-Resultate und Fallback-Meldungen vereinheitlichen.
  - Fehleroverlays in `main.js` auf sichere Textausgabe umstellen.
  - Phase-Gate:
    - Unsupported-Runtimes behaupten keine Recording-Faehigkeit mehr.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:gpu`
  - Status 2026-03-08:
    - `src/core/MediaRecorderSystem.js`: globale `VideoEncoder`/`VideoFrame`-Shims entfernt; native Capability-Probe meldet Recorder-Support jetzt konservativ und explizit.
    - `src/core/MediaRecorderSystem.js`: Start-/Stop-Ergebnisse vereinheitlicht (`action`, `ok`, `reason`) und Auto-Download/API-Fallback-Meldungen zentralisiert.
    - `src/core/main.js`: Fehleroverlays auf sichere DOM-Textausgabe (`textContent`) umgestellt, kein `innerHTML` mehr fuer Runtime-/Init-Errors.
    - `tests/core.spec.js`: neue Regression `T20af` prueft Shim-getrennte Support-Erkennung sowie konsistente Start-/Stop-Resultate.
    - Gate: `npm run test:core` PASS (`58 passed`, `1 skipped`).
    - Gate: `npm run test:gpu` PASS (`16 passed`).
    - Gate: `npm run build` PASS.
    - Gate: `npm run docs:sync` PASS, `npm run docs:check` PASS.

- [x] 30.6 `UIManager` modularisieren
  - Start-Setup/Favoriten/Vorschau, Developer-/Preset-Panel und Menu-Context/Chrome in klarere Teilcontroller auslagern.
  - `UIManager` als Compose-/Sync-Fassade behalten, aber nicht mehr als Hauptlogik-Senke.
  - Event-Bindings und DOM-Rendering enger an den jeweiligen Teilbereich koppeln.
  - Phase-Gate:
    - `UIManager` ist deutlich kleiner, ohne Menue-/Sync-Regression.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`
  - Status 2026-03-08:
    - `src/ui/start-setup/StartSetupUiOps.js` neu: Start-Setup-State, Favoriten/Recent-Listen und Vorschau-Rendering aus `UIManager` ausgelagert.
    - `src/ui/menu/MenuPresetStateSync.js` neu: Preset-UI-Sync (Select, Quickstart-Buttons, Status) in dediziertes Sync-Modul verschoben.
    - `src/ui/menu/MenuDeveloperStateSync.js` neu: Developer-Panel-Sync (Theme/Release/Controls/Telemetry) aus `UIManager` herausgezogen.
    - `src/ui/UIManager.js`: auf Compose-Delegation umgestellt; Dateigroesse von ca. 1280 auf ca. 1080 Zeilen reduziert.
    - Gate: `npm run test:core` PASS (`58 passed`, `1 skipped`).
    - Gate: `npm run test:stress` PASS (`19 passed`).
    - Gate: `npm run build` PASS.
    - Gate: `npm run docs:sync` PASS, `npm run docs:check` PASS.

- [x] 30.7 `GameRuntimeFacade` und State-Kontrakte konsolidieren
  - Match-Start-Validierung, Preset-/Config-Aktionen, Multiplayer-Stub und Settings-Change-Orchestrierung aus `GameRuntimeFacade` herausziehen.
  - String-State-Zuweisungen auf klarere Konstanten/Transition-Helfer umstellen.
  - Match-/Menu-Lifecycle-Begriffe und Uebergaenge vereinheitlichen.
  - Phase-Gate:
    - `GameRuntimeFacade` ist auf Routing/Komposition reduziert; State-Uebergaenge sind zentraler und klarer.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`
  - Status 2026-03-08:
    - Neue Runtime-Services:
      - `src/core/runtime/MatchStartValidationService.js`
      - `src/core/runtime/MenuRuntimePresetConfigService.js`
      - `src/core/runtime/MenuRuntimeMultiplayerService.js`
      - `src/core/runtime/RuntimeSettingsChangeOrchestrator.js`
    - `src/core/GameRuntimeFacade.js`: delegiert Match-Validation, Preset/Config-, Multiplayer- und Settings-Change-Flows an Services statt Inline-Monolith.
    - `src/core/runtime/GameStateIds.js` neu und in `src/core/main.js`/`src/core/GameRuntimeFacade.js` fuer klare State-IDs eingebunden.
    - Gate: `npm run test:core` PASS (`58 passed`, `1 skipped`).
    - Gate: `npm run test:stress` PASS (`19 passed`).
    - Gate: `npm run build` PASS.
    - Gate: `npm run docs:sync` PASS, `npm run docs:check` PASS.

- [x] 30.8 Abschluss-Gate und Doku-Freeze
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
  - Status 2026-03-08:
    - Alle V30-Phasen 30.0 bis 30.8 abgeschlossen; Kernbefunde (Loop-Korrektheit, Cleanup-Vertrag, Trail-Sim-Pfad, Observation-Reuse, Recorder-Support, UI-/Runtime-Monolithdruck) sind geschlossen.
    - Finale Gates:
      - `npm run test:core` PASS (`58 passed`, `1 skipped`)
      - `npm run test:physics` PASS (`49 passed`)
      - `npm run test:gpu` PASS (`16 passed`)
      - `npm run test:stress` PASS (`19 passed`)
      - `npm run build` PASS
      - `npm run docs:sync` PASS
      - `npm run docs:check` PASS
    - Optionaler Lauf `npm run benchmark:baseline` wurde in dieser Abschlussphase nicht erneut gefahren (kein neues Performance-Delta aus den Struktur-/Lifecycle-Änderungen erkennbar).

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
