# AI Architecture Context (Aktiv)

Stand: 2026-04-03

## 1. Architekturparadigma

- Engine: Three.js + Vanilla JavaScript (ES Modules)
- Struktur: Functional Core (`*Ops.js`) + Imperative Shell (Controller/Manager)
- Hauptverzeichnisse: `src/core`, `src/state`, `src/entities`, `src/ui`

## 2. Modul-Uebersicht

### 2.1 Core (`src/core`)

- `main.js`: App-Orchestrierung, Match-Lifecycle, Runtime-State-Anwendung
- `GameBootstrap.js`: baut `runtimeBundle`, verbindet Renderer/UI/Systeme und erzeugt ueber `shared/runtime/GameRuntimePorts.js` die schmale Port-Schicht zwischen Runtime und UI
- `GameRuntimeFacade.js`: oeffentliche Runtime-/Menue-/Session-Fassade; einziger Return-to-Menu-Entry-Point fuer Core/UI
- `runtime/GameRuntimeSessionHandler.js`, `runtime/MatchFinalizeFlowService.js`: kapseln Session-Init/Teardown/Return-to-Menu als oeffentliche Lifecycle-Adapter; trennen UI-Rueckbau von Session-Finalisierung
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
- `ai/observation/ObservationSchemaV2.js`, `ai/observation/RuntimeNearObservationAdapter.js`: runtime-nahe Observation-V2 mit Threat-/Exit-/Portal-/Gate-/Item-/Shield-/Memory-Signalen ueber dem eingefrorenen V1-Basissnapshot
- `ai/hybrid/HybridDecisionArchitecture.js`: gemeinsamer `Safety`-/`Intent`-/`Control`-Resolver fuer Runtime-, Inference- und Trainer-Pfade
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

### 2.6 Desktop Shell / Build

- `electron/main.cjs`: besitzt BrowserWindow-, Tray-, Static-Server-, LAN-Host-, Discovery- und Save-Lifecycle; keine Match-/UI-Domaenenlogik
- `electron/preload.cjs`: einzige Renderer-Bridge; exponiert kleine, eingefrorene Capability-Vertraege (`discovery`, `host`, `save`) ueber `window.curviosApp` und `__CURVIOS_APP__`
- `dev/vite/rendererShellConfig.js`, `vite.config.js`: kapseln Renderer-Einstiegspunkte, Warmup- und Chunking-Sonderfaelle; Plattform-/Build-Komposition bleibt ausserhalb der eigentlichen Runtime-Domaene

## 3. State-IDs (`GAME_STATE_IDS`)

- Quelle: `src/shared/contracts/GameStateIds.js`
- Menue: `MENU`
- Laufender Spielzustand: `PLAYING`
- Pause: `PAUSED`
- Rundenende: `ROUND_END`
- Matchende: `MATCH_END`

## 4. Runtime-Vertraege (V74/V83)

### 4.1 Zielgrenzen fuer V83

| Schicht | Besitz / Verantwortung | Direkte Partner | Kein direkter Zugriff |
| --- | --- | --- | --- |
| `Game` (`src/core/main.js`) | App-Lifetime, Bootstrap, Shutdown, globale Browser-Wiring und Shell-Glue fuer Settings/Profile | `GameRuntimeCoordinator`, Shell-Adapter, read-only Runtime-Projektionen | Session-/Match-/Finalize-State als Source of Truth, rohe Plattform-Capabilities, UI-Use-Cases |
| `SessionRuntime` (Zielschicht ab V83) | einzige Source of Truth fuer Session-, Match-, Finalize-, Lifecycle- und Runtime-Referenzzustand | Application-Layer, Shared Contracts, fachliche Runtime-Services | DOM, `window.curviosApp`, `ipcRenderer`, direkte UI-Controller |
| Application-Layer (`src/application/**`; aktuell noch Zielbereich) | Commands, Events, Session-Snapshots/Projektionen und Use-Case-Orchestrierung inkl. Capability-Komposition | `SessionRuntime`, Plattform-Capabilities, `src/shared/contracts/**` | direkte DOM-Manipulation, breite `game`-Mutation, rohe `runtimeBundle`-Rueckgriffe |
| UI (`src/ui/**`, `src/composition/core-ui/**`) | Rendering, Overlay-/Menue-State, Intent-Erfassung und Anzeige von Runtime-Projektionen | Application-Layer, read-only Snapshots/Events, benannte UI-Ports | `game.state`/`runtimeBundle.state` mutieren, Electron-/Storage-/LAN-Zugriffe |
| Plattform-Capabilities (`electron/main.cjs`, `electron/preload.cjs`, spaeter `src/platform/**`) | Host/Discovery/Save/Recording/Fallbacks, Availability-/Invoke-Vertraege und Desktop-vs-Browser-Degradation | Application-Layer, Shared Contracts, Desktop-Shell | Matchregeln, Session-Besitz, UI-Projektionen |

- `src/shared/contracts/**` bleibt die seiteneffektfreie Vertragsschicht fuer IDs, Payloads, Snapshots, Capability-Descriptoren und Contract-Versionen.
- Unter `src/application/**` und `src/platform/**` existieren aktuell noch keine tragenden Module; `83.1.1` fixiert deshalb zuerst Ownership und Zielgrenzen, die konkrete Schichtbildung folgt in `83.1.2` und `83.2+`.
- Uebergangsrolle aktueller Adapter:
  - `GameRuntimeCoordinator` bleibt Shell-/Kompositionsadapter zwischen `Game` und spaeterem Application-/Runtime-Kern.
  - `GameRuntimeFacade` bleibt nur ein Legacy-kompatibler Forwarding-Adapter fuer bestehende Menue-/Lifecycle-Aufrufer; neue Fachlogik soll dort nicht endgueltig landen.
  - `GameRuntimePorts` bleiben Migrationsnaehte fuer kleine UI-/Render-/Input-Ports und sind nicht der finale Commands-/Events-/Capabilities-Vertrag.

### 4.2 Aktuelle Mehrfach-Ownerships, die V83 abbauen muss

- `game`, `runtimeBundle.state` und `GameRuntimeFacade` teilen sich noch Besitz an Session-, Runtime- und Finalize-nahem Zustand.
- `GameRuntimeCoordinator`, `GameRuntimeFacade` und `GameRuntimePorts` ueberlappen sich derzeit bei Lifecycle-, Settings- und Menue-Entry-Points.
- `MatchFlowUiController` und `PauseOverlayController` konsumieren noch gemischt `game`, `runtimeFacade` und Ports statt ausschliesslich Application-Commands plus Snapshots.
- Desktop-Capabilities sind in `preload.cjs` bereits benannt, werden aber noch nicht zentral ueber einen Application-/Platform-Vertrag konsumiert.

### 4.3 Aktuelle Runtime-Vertraege aus V74

- Desktop-Shell-Vertrag:
  - Electron Main besitzt Fenster-, IPC- und Datei-/LAN-Faehigkeiten; Renderer-Code greift nicht direkt auf `ipcRenderer`, Node oder BrowserWindow-Lifecycle zu.
  - `preload.cjs` exponiert nur benannte Capability-Vertraege (`discovery`, `host`, `save`) plus Legacy-Aliasse auf `curviosApp`; fehlende Desktop-Shell muss im Browser-Demo-Scope degradierbar bleiben.
  - Desktop-Erkennung laeuft bewusst ueber `curviosApp.isApp` bzw. `__CURVIOS_APP__` (z. B. fuer Recorder-Praeferenzen), nicht ueber verstreute Electron-Sonderabfragen in Runtime- oder UI-Modulen.
- Session-Vertrag:
  - `RuntimeConfig.session` fuehrt `sessionType` und `multiplayerTransport` explizit.
  - `sessionType='multiplayer'` + `multiplayerTransport='storage-bridge'` ist Menue-Koordination, kein echter Runtime-Netzwerkadapter.
  - `RuntimeSessionContract` normalisiert diesen Sonderfall bewusst auf `adapterSessionType='single'` bzw. `runtimeTransportKind='menu-storage-bridge'`; nur `lan|online` gelten als echte Network-Sessions.
- Lifecycle-Vertrag:
  - `shared/runtime/GameRuntimePorts.js` stellt mit `lifecyclePort`, `matchUiPort`, `sessionPort`, `settingsPort`, `renderPort` und `inputPort` die schmalen Imperative-Schnittstellen zwischen Runtime, UI und Session-Services bereit.
  - `GameRuntimeFacade.returnToMenu(...)` bleibt der oeffentliche Exit fuer Pause-, Round-End-, Fehler- und Hotkey-Pfade, delegiert aber an `GameRuntimeSessionHandler` und `MatchFinalizeFlowService`.
  - `MatchFinalizeFlowService` trennt UI-Rueckbau (`matchUiPort.applyReturnToMenuUi`) von Session-Finalisierung (`sessionPort.finalizeMatchSession`) und merged konkurrierende Finalize-Requests kontrolliert.
  - `MatchLifecycleSessionOrchestrator` serialisiert asynchrone Session-Initialisierung, disposed stale Resultate aktiv, settled Recorder-/Teardown-Pfade deterministisch und emittiert `menu_opened` nur ueber den definierten Lifecycle-Vertrag.
  - `MatchFlowUiController`, `PauseOverlayController` und `RoundStateTickSystem` verlassen Matches ausschliesslich ueber `lifecyclePort`/`matchUiPort`, nicht ueber ad-hoc Disposals oder direkte Session-Manipulation.
- Entity-Runtime-Vertrag:
  - `MatchSessionFactory` erzeugt pro Match ein `entityRuntimeConfig` und reicht es an `EntityManager`, Trail-, Powerup-, Projectile-, Portal- und Hunt-Pfade durch.
  - `ActiveRuntimeConfigStore` ist fuer den migrierten Scope kein Standard-Einstieg mehr, sondern nur ein explizit verbleibender Uebergangsadapter ausserhalb der bereits umgestellten Hotpaths.
- Shared-Contract-Vertrag:
  - `src/shared/contracts/**` ist die autoritative, seiteneffektfreie Schicht fuer versionierte Konstanten, Normalizer und abgeleitete Payloads; Core, UI, Network und Recorder konsumieren diese Vertraege, ohne ihre Semantik lokal neu zu definieren.
  - `MatchLifecycleContract`, `MenuControllerContract`, `GameStateIds` und `MatchUiStateContract` definieren die gemeinsamen Lifecycle-, Menuevent-, State- und UI-Oberflaechenbegriffe fuer Menue, Matchflow und Recorder-Telemetrie.
  - `RuntimeSessionContract` und `MultiplayerSessionContract` trennen Menue-Sessions, Runtime-Adapter-Typen und Netzwerk-Nachrichten sauber; Session-/Netzwerkpfade entscheiden ueber diese Vertraege statt ueber rohe Settings oder Message-Shapes.
  - `RecordingCaptureContract` bleibt die gemeinsame Capture-/Export-Basis fuer Renderer, Recorder-System und Desktop-Save-Shell; Plattformdetails wie MIME-Praeferenzen bleiben in den Runtime-/Shell-Adaptern.
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

## 8. BT80B Runtime-Nahe Trainings- und Inference-Schicht (Stand 2026-04-02)

- Observation-V2:
  - `ObservationSchemaV2.js` erweitert den eingefrorenen V1-Snapshot von `40` auf `64` Features.
  - `RuntimeNearObservationAdapter.js` liftet V1-Observationen in runtime-nahe Kontexte mit Threat-Horizon, Dead-End-Risiko, Exit-Qualitaet, Gegnerdruck, Recovery-, Portal-, Gate-, Item- und Shield-Signalen.
  - `RuntimeNearObservationTracker` fuehrt temporale Trends und ein kleines Memory fuer Druck, Clearance, letzte Recovery und Intent-Prioren.
- Gemeinsame Entscheidungsarchitektur:
  - `HybridDecisionArchitecture.js` trennt `Safety`, `Intent` und `Control`.
  - Portal-, Item- und Combat-Aktionen laufen nur noch, wenn die harten Invarianten das zulassen; sonst wird deterministisch auf `evade`/`recover` korrigiert.
- Checkpoint-/Inference-Vertrag:
  - `DqnTrainer.mjs` exportiert jetzt `v36-dqn-checkpoint-v2` mit Observation-Schema `v2-runtime-near` und Action-Architektur-Version.
  - Legacy-Checkpoints mit `40` Eingangsfeatures werden fuer Resume/Inference in die neue Eingabebreite migriert, statt still zu brechen.
- Scope-Grenze:
  - BT80B haertet die Laufzeitnahe und Entscheidungsarchitektur.
  - Algorithmus-Ausbau, Champion/Challenger-Rollout und High-Util-Laufprofile bleiben explizit BT80C.

## 9. Runtime-Policy-Auswahl (Stand 2026-03-10)

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
