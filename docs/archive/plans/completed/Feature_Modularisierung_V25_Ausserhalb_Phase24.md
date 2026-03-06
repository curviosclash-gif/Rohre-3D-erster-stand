# Feature: V25 - Weitere Modularisierung ausserhalb Phase 24 (Performance + Bearbeitbarkeit)

Stand: 2026-03-05  
Status: Abgeschlossen (2026-03-05)  
Owner: Single-Agent Umsetzung

## Ziel

Zusatzliche Modularisierungspunkte umsetzen, die **nicht** in `24.1` bis `24.6` enthalten sind, um:
- Laufzeitkosten in nicht adressierten Hotpaths zu senken.
- Kopplung in Orchestrierungs- und Konfigurationspfaden zu reduzieren.
- Aenderungen pro Folge-Task auf kleinere, besser testbare Module zu begrenzen.

## Abgrenzung zu Phase 24 (explizit ausgeschlossen)

Nicht Teil dieses Plans:
- Observation-Build on demand (`24.1`)
- Observation-Wall-Probing (`24.2`)
- Trail-Kollision deduplizieren (`24.3`)
- MG-Tracer Pooling + Hit-Sampling (`24.4`)
- Portal/Gate-Renderkosten (`24.5`)
- HUD/DOM Runtime-Updates (`24.6`)

## Treiber (Codebasis-Scan)

- Hohe Orchestrierungsdichte:
  - `src/entities/EntityManager.js` (Setup/Spawn/Tick/Teardown in einer Klasse)
  - `src/ui/MatchFlowUiController.js` (UI + Match-Lifecycle + Hunt-Feedback kombiniert)
- Komplexe Build-/Datenpfade:
  - `src/entities/arena/ArenaBuilder.js` (Map-Build, Material/Texture, Geometry-Merge)
  - `src/core/config/MapPresets.js` (grosser statischer Preset-Block)
  - `src/entities/MapSchema.js` (Migration + Normalisierung + Runtime-Konvertierung)
- Laufzeit- und Wartungskopplung:
  - `src/core/renderer/CameraRigSystem.js` (Mode-Logik, Shake, Collision in einem System)
  - `src/core/SettingsManager.js` + `src/core/RuntimeConfig.js` (duplizierte Sanitize/Clamp-Logik)
  - `tests/physics.spec.js` (monolithische Testdatei)

## Betroffene Dateien (geplant)

- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/MatchSessionRuntimeBridge.js`
- `src/state/MatchSessionFactory.js`
- `src/ui/MatchFlowUiController.js`
- `src/entities/EntityManager.js`
- `src/entities/runtime/EntityRuntimeAssembler.js`
- `src/entities/arena/ArenaBuilder.js`
- `src/entities/Arena.js`
- `src/core/config/MapPresets.js`
- `src/entities/MapSchema.js`
- `src/entities/CustomMapLoader.js`
- `src/core/renderer/CameraRigSystem.js`
- `src/core/Renderer.js`
- `src/core/SettingsManager.js`
- `src/core/RuntimeConfig.js`
- `tests/physics.spec.js`
- `tests/helpers.js`
- optional: `scripts/bot-benchmark-baseline.mjs` (nur wenn fuer Messbarkeit notwendig)

## Phasenplan (Single-Agent)

- [x] 25.0 Baseline + Non-Overlap-Freeze (abgeschlossen 2026-03-05)
  - Ziel:
    - V25 Scope gegen `24.x` festziehen (modulgenaue Ausschlussliste).
    - Startwerte fuer Start-/Init-Pfade, Match-Start-Latenz und Round-Transition erfassen.
  - Schritte:
    - Modulmatrix `24.x` vs. `25.x` erstellen (keine Datei-Ueberschneidung in aktiven Tasks).
    - Messprotokoll fuer `DOMContentLoaded -> GAME_INSTANCE`, `startMatch()` und `returnToMenu()` definieren.
  - Verifikation:
    - `npm run test:core`
  - Exit:
    - Mess- und Scope-Baseline dokumentiert; Ueberschneidungen zu `24.x` ausgeschlossen.
  - Kurznotiz 2026-03-05:
    - Non-Overlap-Freeze gesetzt: V25 bearbeitet nur `main/runtime/session/entity/arena/map/camera/settings/tests`-Module; ausgeschlossen bleiben `PlayerInputSystem`, `BotRuntimeContextFactory`, `ObservationSystem`, `EnvironmentSamplingOps`, `TrailCollisionQuery`, `PlayerCollisionPhase`, `MGTracerFx`, `MGHitResolver`, `PortalGateMeshFactory`, `PortalLayoutBuilder`, `HUD`, `HudRuntimeSystem` (24.1-24.6).
    - Messprotokoll fixiert: `DOMContentLoaded -> GAME_INSTANCE` ueber Navigation-Timing, `startMatch()`-Latenz via `state===PLAYING`, `_returnToMenu()`-Latenz via `state===MENU`.
    - Baseline erfasst (`tmp/perf_phase25_0_lifecycle_baseline.json`): `domToGameInstanceMs=320`, `startMatchLatencyMs=5179.20`, `returnToMenuLatencyMs=18.20`.

- [x] 25.1 Match-Lifecycle-Orchestrierung entkoppeln (abgeschlossen 2026-03-05)
  - Ziel:
    - Session-Lifecycle, UI-Transition und Feedback-Pipeline trennen.
  - Hauptpfade:
    - `src/core/main.js`
    - `src/core/GameRuntimeFacade.js`
    - `src/ui/MatchFlowUiController.js`
    - `src/state/MatchSessionFactory.js`
    - `src/core/MatchSessionRuntimeBridge.js`
  - Schritte:
    - Match-Start/Stop/Restart in dedizierte Orchestrator-Module aufteilen.
    - Feedback-Plan (Console/Toast) als separaten Adapter kapseln.
    - State-Transitions ohne UI-Nebenwirkungen modellieren.
  - Verifikation:
    - `npm run test:core`
    - `npm run smoke:roundstate`
    - `npm run test:stress`
  - Exit:
    - Lifecycle-Pfade isoliert, weniger Cross-Module-Abhaengigkeiten, keine UI-Regression.
  - Kurznotiz 2026-03-05:
    - Lifecycle gesplittet in `MatchLifecycleSessionOrchestrator` (Session-Wiring/Reset/Teardown), `MatchLifecycleStateTransitions` (zustandsseitige Transitionen) und `MatchFeedbackAdapter` (Console/Toast-Feedback).
    - `MatchFlowUiController` fuehrt jetzt nur noch UI-Anwendung + Orchestrierungsaufrufe aus; `main.js` routet `startMatch()`/`_returnToMenu()` ueber `GameRuntimeFacade`.
    - Verifikation: `npm run test:core`, `npm run smoke:roundstate`, `npm run test:stress`.

- [x] 25.2 EntityManager weiter in Setup/Spawn/Tick-Pipelines schneiden (abgeschlossen 2026-03-05)
  - Ziel:
    - Setup-Roster, Spawn, Runtime-Tick und Teardown modular trennen.
  - Hauptpfade:
    - `src/entities/EntityManager.js`
    - `src/entities/runtime/EntityRuntimeAssembler.js`
  - Schritte:
    - Setup-Logik (Human/Bot Konfiguration) in eigene Setup-Ops auslagern.
    - Spawn- und Kamera-Update-Pfade in dedizierte Services verschieben.
    - Tick-Pipeline als klaren Ablauf mit separaten Verantwortlichkeiten abbilden.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
  - Exit:
    - Kleinere Verantwortungscluster, stabile API-Flaeche, keine Gameplay-Aenderung.
  - Kurznotiz 2026-03-05:
    - `EntityManager` delegiert Setup/Spawn/Tick jetzt an `EntitySetupOps`, `EntitySpawnOps` und `EntityTickPipeline`; `EntityRuntimeAssembler` verdrahtet die neuen Runtime-Module zentral.
    - Bot-Policy- und Vehicle-Normalisierung verbleibt in Setup-Ops; Spawn- und Tick-Verhalten bleibt funktional identisch (nur Responsibility-Split).
    - Verifikation: `npm run test:core`, `npm run test:physics`.

- [x] 25.3 Arena-Build-Pipeline modularisieren (Cache + Compile-Stufen) (abgeschlossen 2026-03-05)
  - Ziel:
    - Arena-Build in kompilierbare Schritte mit wiederverwendbaren Ressourcen trennen.
  - Hauptpfade:
    - `src/entities/arena/ArenaBuilder.js`
    - `src/entities/Arena.js`
  - Schritte:
    - Material-/Texture-Erzeugung in Cache-Service auslagern.
    - Geometry-Build in klar getrennte Stufen (Walls, Obstacles, Edges, Particles) splitten.
    - Rebuild-Policy fuer identische Map/Scale-Ladungen definieren.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:gpu`
  - Exit:
    - Reduzierte Build-Kosten bei wiederholten Match-Starts, bessere Bearbeitbarkeit der Build-Stufen.
  - Kurznotiz 2026-03-05:
    - Arena-Build getrennt in Resource-Cache (`ArenaBuildResourceCache`) und Geometry-Compile-Stufen (`ArenaGeometryCompilePipeline` fuer Walls/Obstacles/Merge).
    - Rebuild-Policy eingefuehrt: identische `mapKey+scale+size`-Signatur wird pro Arena-Instanz als `reuse` erkannt; sonst `rebuild` mit Artefakt-Cleanup.
    - Verifikation: `npm run test:core`, `npm run test:physics`, `npm run test:gpu`.

- [x] 25.4 Map-Datenpfad modularisieren (Presets + Schema + Loader) (abgeschlossen 2026-03-05)
  - Ziel:
    - Preset- und Schema-Pfade in klar getrennte Daten-/Migrations-/Runtime-Module aufteilen.
  - Hauptpfade:
    - `src/core/config/MapPresets.js`
    - `src/entities/MapSchema.js`
    - `src/entities/CustomMapLoader.js`
  - Schritte:
    - Presets thematisch in mehrere Dateien aufteilen (Basis, Experten, generierte Maps).
    - Schema-Migration, Sanitizing und Runtime-Konvertierung in getrennte Module legen.
    - Loader-Rueckfallpfade und Warnungslogik als dedizierten Resolver kapseln.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
  - Exit:
    - Geringere Einstiegskomplexitaet fuer Map-Aenderungen, robustere Datenkonvertierung.
  - Kurznotiz 2026-03-05:
    - Preset-Pfade thematisch getrennt (`MapPresetsBase`, `MapPresetsExpert`, `MapPresetsGenerated`) mit zentralem statischem Katalog.
    - `MapSchema` als Fassade um `MapSchemaMigrationOps`, `MapSchemaSanitizeOps`, `MapSchemaRuntimeOps`; Migration/Sanitize/Runtime-Konvertierung klar separiert.
    - `CustomMapLoader` nutzt dedizierten `CustomMapSelectionResolver` fuer Unknown-/Fallback-/Custom-Error-Pfade und Warnungsweitergabe.
    - Verifikation: `npm run test:core`, `npm run test:physics`.

- [x] 25.5 CameraRigSystem in Strategien zerlegen (Mode/Collision/Shake) (abgeschlossen 2026-03-05)
  - Ziel:
    - Kamera-Update-Logik pro Modus trennen und Collision-Kosten kontrollieren.
  - Hauptpfade:
    - `src/core/renderer/CameraRigSystem.js`
    - `src/core/Renderer.js`
  - Schritte:
    - THIRD/FIRST/TOP-DOWN in eigene Strategie-Ops auslagern.
    - Camera-Collision als separaten Solver mit klaren Eingaben/Ausgaben trennen.
    - Collision-Pruefungen nur bei relevanter Bewegung/Mode-Aenderung triggern.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:gpu`
  - Exit:
    - Schlankerer Kamera-Hotpath, niedrigere Wartungskosten bei Kamera-Features.
  - Kurznotiz 2026-03-05:
    - Kamera aufgeteilt in `CameraModeStrategySet`, `CameraCollisionSolver`, `CameraShakeSolver`; `CameraRigSystem` ist nun primar Orchestrator der Teilstrategien.
    - Collision-Rechecks laufen nur bei relevanter Bewegung/Target-Aenderung pro Spielerindex oder bei Mode-/Arena-Wechsel; ansonsten Reuse des letzten Resolve-Ergebnisses.
    - Verifikation: `npm run test:core`, `npm run test:physics`, `npm run test:gpu`.

- [x] 25.6 Settings-/RuntimeConfig-Contracts vereinheitlichen (abgeschlossen 2026-03-05)
  - Ziel:
    - Duplizierte Sanitize/Clamp-Regeln zentralisieren und Drift verhindern.
  - Hauptpfade:
    - `src/core/SettingsManager.js`
    - `src/core/RuntimeConfig.js`
    - optional: `src/ui/UIManager.js` (nur falls Sync-Contracts angepasst werden)
  - Schritte:
    - Gemeinsame Coercion-/Validation-Layer fuer Settings und RuntimeConfig einziehen.
    - Profile-, Controls- und Gameplay-Defaults zentral referenzieren.
    - Delta-Logik fuer selektive UI-Syncs explizit dokumentieren.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:stress`
  - Exit:
    - Weniger Inkonsistenzrisiko zwischen Persistenz, Runtime und UI.
  - Kurznotiz 2026-03-05:
    - Gemeinsamer Contract-Layer eingefuehrt (`SettingsRuntimeContract`) fuer Limits, Clamp/Coercion und Controls-Normalisierung.
    - `SettingsManager` und `RuntimeConfig` nutzen jetzt dieselben Range-/Coercion-Regeln und denselben Controls-Snapshot-Builder.
    - Verifikation: `npm run test:core`, `npm run test:stress`.

- [x] 25.7 Test-Suite modularisieren (Physics/AI/Hunt getrennt) (abgeschlossen 2026-03-05)
  - Ziel:
    - Testlaufzeiten und Editierbarkeit durch kleinere, domaenenscharfe Spec-Dateien verbessern.
  - Hauptpfade:
    - `tests/physics-core.spec.js`
    - `tests/physics-hunt.spec.js`
    - `tests/physics-policy.spec.js`
    - `tests/helpers.js`
    - optional: `scripts/bot-benchmark-baseline.mjs` (nur fuer reproduzierbare Teilmessung)
  - Schritte:
    - `physics.spec.js` in mehrere Spezifikationsdateien nach Domane splitten.
    - Gemeinsame Setup-/Assertion-Hilfen konsolidieren.
    - Teil-spezifische Ausfuehrungspfade fuer schnellere lokalen Regressionen schaffen.
  - Verifikation:
    - betroffene Testkommandos direkt ausfuehren (neue/aufgesplittete Specs)
    - mindestens:
      - `npm run test:core`
      - `npm run test:physics`
  - Exit:
    - Schnellere gezielte Testlaeufe, klarere Ownership pro Testdomane.
  - Kurznotiz 2026-03-05:
    - `tests/physics.spec.js` in drei Domaenenspezifische Specs gesplittet: `physics-core`, `physics-hunt`, `physics-policy`.
    - Gemeinsame Start-/Mode-Helfer in `tests/helpers.js` konsolidiert; neue Teil-Kommandos: `test:physics:core`, `test:physics:hunt`, `test:physics:policy`.
    - Verifikation: `npm run test:physics:core`, `npm run test:physics:hunt`, `npm run test:physics:policy`, `npm run test:core`, `npm run test:physics`.

- [x] 25.8 Abschluss-Gate und Doku-Freeze (abgeschlossen 2026-03-05)
  - Schritte:
    - Vorher/Nachher fuer Init-, Match-Start- und Kamerapfade vergleichen.
    - Restrisiken + offene Schulden dokumentieren.
  - Verifikation:
    - `npm run test:core`
    - `npm run test:physics`
    - `npm run test:gpu` (falls Renderer/Kamera/Arena betroffen)
    - `npm run test:stress` (falls UI/Settings-Flows betroffen)
    - `npm run docs:sync`
    - `npm run docs:check`
  - Exit:
    - V25-Phasen abgeschlossen, Kennzahlen dokumentiert, Doku konsistent.
  - Kurznotiz 2026-03-05:
    - Abschluss-Gates gruen: `npm run test:core`, `npm run test:physics`, `npm run test:gpu`, `npm run test:stress`, `npm run docs:sync`, `npm run docs:check`.
    - Vorher/Nachher (Lifecycle-Messung, `tmp/perf_phase25_0_lifecycle_baseline.json` vs `tmp/perf_phase25_8_lifecycle_after.json`): `domToGameInstanceMs 320.00 -> 70.30 (-78.03%)`, `startMatchLatencyMs 5179.20 -> 1810.00 (-65.05%)`, `returnToMenuLatencyMs 18.20 -> 31.10 (+70.88%)`.
    - Kamera-Pfad (inferenzbasiert, statischer FIRST_PERSON-Probe): `resolveCalls=240`, `collisionChecks=1`, geschaetzte vermiedene Checks ggue. No-Cache-Pfad `239` (`~99.58%`).
    - Restrisiken: Messungen sind Headless-/Warmup-abhängig; `returnToMenu`-Latenz schwankt und sollte bei Bedarf mit mehrfachen Samples nachvalidiert werden.

## Risiken / Gegenmassnahmen

- Risiko: Ueberlappung mit laufender `24.x`-Abarbeitung.
  - Gegenmassnahme: harter Modulexclude-Check in `25.0`.
- Risiko: API-Brueche durch tiefen Orchestrierungs-Split.
  - Gegenmassnahme: Contract-Tests je Phase + Adapter statt Big-Bang-Umstellung.
- Risiko: Performance-Regression durch Refactor ohne Messung.
  - Gegenmassnahme: per-Phase Messpunkte (Init/Start/Camera) + Abschlussvergleich.

## Dokumentations-Hook

Bei Implementierungsabschluss verpflichtend:

- `npm run docs:sync`
- `npm run docs:check`
