# AI Architecture Context (Aktiv)

Stand: 2026-04-02

## 1. Architekturparadigma

- Engine: Three.js + Vanilla JavaScript (ES Modules)
- Struktur: Functional Core (`*Ops.js`) + Imperative Shell (Controller/Manager)
- Hauptverzeichnisse: `src/core`, `src/state`, `src/entities`, `src/ui`

## 2. Modul-Uebersicht

### 2.1 Core (`src/core`)

- `main.js`: App-Orchestrierung, Match-Lifecycle, Runtime-State-Anwendung
- `GameRuntimeFacade.js`: oeffentliche Runtime-/Menue-/Session-Fassade; einziger Return-to-Menu-Entry-Point fuer Core/UI
- `PlayingStateSystem.js`: kapselt den PLAYING-Updateablauf als eigenes System
- `RuntimeDiagnosticsSystem.js`: expliziter Runtime-Debug-Adapter fuer FPS/Quality/Stats-Overlay
- `Config.js`: zentrale Spielkonfiguration
- `RuntimeConfig.js`: baut `runtimeConfig` inkl. Session-/Transport-Vertrag und Kompatibilitaets-Snapshot
- `GameLoop.js`: Update-/Render-Takt; delegiert fatale Runtime-Overlays an `RuntimeErrorOverlay.js`
- `RuntimeErrorOverlay.js`: fataler Fehler-Overlay-Adapter fuer Runtime-/Bootstrap-Fehler
- `Renderer.js`: Render-Fassade mit Subsystemen (`renderer/CameraRigSystem.js`, `RenderViewportSystem.js`, `SceneRootManager.js`, `RenderQualityController.js`)
- `InputManager.js`, `Audio.js`, `three-disposal.js`

### 2.2 State (`src/state`)

- `MatchSessionFactory.js`: Match-Initialisierung und Session-Assembly; trennt `prepareInitializedMatchSession(...)` von `wireInitializedMatchRuntime(...)`
- `MatchLifecycleSessionOrchestrator.js`: kleiner Lifecycle-Port fuer Session-Init, Stale-Disposal, Recorder-Settlement und Match-Teardown
- `RoundStateController.js` + `RoundStateControllerOps.js`: Tick-/Transition-Entscheidungen
- `RoundStateOps.js`: Pure Round/Match-End-Ableitung
- `RoundEndCoordinator.js`, `RoundRecorder.js` (Store-Fassade auf `recorder/RoundEventStore.js`, `RoundMetricsStore.js`, `RoundSnapshotStore.js`)
- `validation/BotValidationService.js`, `validation/BotValidationMatrix.js`: entkoppelte Baseline-/Validation-Pfade fuer Debug-Workflows
- `training/TrainingDomain.js`, `training/EpisodeController.js`, `training/RewardCalculator.js`: additive Trainings-Domaene, Episoden-Lifecycle und Reward-Shaping

### 2.3 Entities (`src/entities`)

- `Arena.js`: Bounds/Kollisionen, Fast-Collision-Pfade; dispose-faehig fuer stale oder ersetzte Session-Initialisierungen
- `EntityManager.js`: Runtime-Orchestrierung auf Basis von `runtime/EntityRuntimeAssembler.js` und explizitem `EntityRuntimeConfig`-Vertrag
- `systems/ProjectileSystem.js`, `systems/TrailSpatialIndex.js`: modulare Projectile-/Trail-Hotpaths
- `systems/trails/TrailSegmentRegistry.js`, `TrailCollisionQuery.js`, `TrailCollisionDebugTelemetry.js`: Trail-Registry/Query/Debug intern getrennt
- `systems/PlayerInputSystem.js`: Human/Bot-Input-Aufloesung
- `systems/PlayerLifecycleSystem.js`: Spieler-Tick, Arena-/Trail-/Portal-/Powerup-Lifecycle
- `arena/PortalGateSystem.js`: Orchestrator-Fassade auf `arena/portal/PortalLayoutBuilder.js`, `PortalRuntimeSystem.js`, `SpecialGateRuntime.js`
- `ai/BotPolicyTypes.js`, `ai/BotPolicyRegistry.js`: Policy-Vertrag und Registry-Fabrik
- `ai/RuleBasedBotPolicy.js`: Default-Policy-Adapter auf `Bot.js`
- `hunt/HuntBotPolicy.js`: Hunt-spezifische Bot-Policy (MG/Rocket/HP-Verhalten)
- `ai/BotSensingOps.js`, `ai/BotDecisionOps.js`, `ai/BotActionOps.js`: modulare KI-Ops
- `ai/training/TrainingContractV1.js`, `DeterministicTrainingStepRunner.js`, `TrainerPayloadAdapter.js`, `TrainingTransportFacade.js`, `WebSocketTrainerBridge.js`: additive Trainings-/Transport-Schicht ohne Breaking Change am Bot-Bridge-V1-Vertrag
- `Player.js`, `Bot.js`, `Trail.js`, `Powerup.js`, `Particles.js`
- `vehicle-registry.js` + Fahrzeug-Mesh-Module
- `MapSchema.js`, `CustomMapLoader.js`, `GeneratedLocalMaps.js`

### 2.4 UI (`src/ui`)

- `UIManager.js`: Menues, selektive Settings-Sync (`syncByChangeKeys`), Menu-Context und Status-Toast
- `HUD.js`, `HuntHUD.js`: Ingame-Overlay
- `MatchFlowUiController.js`, `PauseOverlayController.js`, `KeybindEditorController.js`: UI-Flow/Settings-Controller-Splits; Match-/Pause-Exit nur ueber `lifecyclePort`/`matchUiPort`
- `UISettingsSyncMap.js`: Zuordnung `changedKey -> UI-Sync-Teilfunktion`
- `SettingsChangeKeys.js`, `SettingsChangeSetOps.js`: stabiler Key-Vertrag und Set-Operationen fuer Event-Coalescing
- `MenuController.js`: emittiert typisierte `SETTINGS_CHANGED`-Payloads und coalesct `input`-Storms pro Frame
- `menu/MenuDefaultsEditorConfig.js`: zentrale Datenquelle fuer Menue-Basisdefaults, Local-UI-Defaults, Level-3-Reset und Fixed-Preset-Seeds
- `SettingsStore.js`, `Profile*Ops.js`, `MatchUiStateOps.js`

### 2.5 Hunt (`src/hunt`)

- `HuntMode.js`, `HuntConfig.js`, `HealthSystem.js`: Game-Mode + HP/Shield-Logik
- `OverheatGunSystem.js`, `RocketPickupSystem.js`, `DestructibleTrail.js`: Hunt-Kampfpfade
- `ScreenShake.js`: Hunt-Feedback
- `RespawnSystem.js`, `HuntScoring.js`: Respawn + erweitertes Hunt-Scoring

## 3. State-IDs (`GAME_STATE_IDS`)

- Quelle: `src/shared/contracts/GameStateIds.js`
- Menue: `MENU`
- Laufender Spielzustand: `PLAYING`
- Pause: `PAUSED`
- Rundenende: `ROUND_END`
- Matchende: `MATCH_END`

## 4. Runtime-Vertraege (V74)

- Session-Vertrag:
  - `RuntimeConfig.session` fuehrt `sessionType` und `multiplayerTransport` explizit.
  - `sessionType='multiplayer'` + `multiplayerTransport='storage-bridge'` ist Menue-Koordination, kein echter Runtime-Netzwerkadapter.
  - Die Match-Runtime loest diesen Sonderfall bewusst auf `LocalSessionAdapter` auf; nur `lan|online` gelten als echte Network-Sessions.
- Lifecycle-Vertrag:
  - `GameRuntimeFacade.returnToMenu(...)` ist der oeffentliche Exit fuer Pause-, Round-End-, Fehler- und Hotkey-Pfade.
  - `MatchLifecycleSessionOrchestrator` serialisiert asynchrone Session-Initialisierung, disposed stale Resultate aktiv und settled Recorder-/Teardown-Pfade deterministisch.
- Entity-Runtime-Vertrag:
  - `MatchSessionFactory` erzeugt pro Match ein `entityRuntimeConfig` und reicht es an `EntityManager`, Trail-, Powerup-, Projectile-, Portal- und Hunt-Pfade durch.
  - `ActiveRuntimeConfigStore` ist fuer den migrierten Scope kein Standard-Einstieg mehr, sondern nur ein explizit verbleibender Uebergangsadapter ausserhalb der bereits umgestellten Hotpaths.
- Debug-/Overlay-Vertrag:
  - `GameLoop` nutzt `RuntimeErrorOverlay` fuer fatale Fehler.
  - `RuntimeDiagnosticsSystem` bleibt als bewusst markierter Runtime-Debug-Adapter fuer das optionale Stats-Overlay bestehen.

## 5. Entwicklungsregeln

1. `*Ops.js` als pure Logik behandeln (keine versteckten Side Effects).
2. Keine Magic Numbers statt `Config`.
3. Lifecycle-Disposal immer vollstaendig ausfuehren.
4. Kollision/Trail/Bot-Hotpaths auf Performance und geringe Allocation optimieren.
5. Bot-KI nur ueber Policy-Schnittstelle anbinden; keine direkte Runtime-Kopplung von `EntityManager` auf konkrete KI-Klassen.

## 6. Verifikation

- Testauswahl ueber `.agents/test_mapping.md`
- Danach immer Doku-/Prozess-Check ueber `npm run docs:sync` und `npm run docs:check`

## 7. Bot-Bridge Vertrag V1 (eingefroren am 2026-03-03)

- Observation:
  - `schemaVersion`: `v1`
  - `length`: `40`
  - `0..19`: Core-Features (u. a. `WALL_DISTANCE_FRONT=3`, `MODE_ID=18`)
  - `20..39`: feste Item-Slots (`ITEM_SLOT_00..ITEM_SLOT_19`)
- Wertebereiche:
  - Ratio: `0..1`
  - Signed: `-1..1`
  - Bool: `0|1`
  - `MODE_ID`: `0=classic`, `1=hunt`
- Action-Contract V1:
  - Bool-Flags: `pitchUp`, `pitchDown`, `yawLeft`, `yawRight`, `boost`, `shootItem`, `shootMG`
  - Index-Felder: `useItem`, `shootItemIndex` im Bereich `-1..19`
- Sicherheitsregel:
  - Bei Observation-/Action-Contract-Verletzung wird die Ausgabe neutralisiert und auf `rule-based` zurueckgefallen.
- V1 Nicht-Ziele:
  - keine History-Frames, keine Reward-/Telemetriefelder im Runtime-Vektor, keine verpflichtende Netzwerk-Bridge.

## 8. Runtime-Policy-Auswahl (Stand 2026-03-10)

- `SettingsManager` fuehrt `botPolicyStrategy` mit Default `auto`.
- `RuntimeConfig` normalisiert Strategie (`rule-based|bridge|auto`) und loest bei `auto` deterministisch `bot.policyType` aus `gameMode + planarMode`.
- Match-Resolver (V31):
  - `CLASSIC + 3d` -> `classic-3d`
  - `CLASSIC + planar` -> `classic-2d`
  - `HUNT + 3d` -> `hunt-3d`
  - `HUNT + planar` -> `hunt-2d`
- Legacy-Kompatibilitaet bleibt erhalten:
  - `bridge` -> `classic-bridge|hunt-bridge`
  - `rule-based` -> `rule-based`
- `MatchSessionFactory` gibt `runtimeConfig` plus aufgeloesten `botPolicyType` an `EntityManager.setup(...)` weiter.
- `EntityManager` nutzt einen klaren Resolver (`requested > runtime > mode+planar-fallback`) statt Hunt-Health-Hack.
