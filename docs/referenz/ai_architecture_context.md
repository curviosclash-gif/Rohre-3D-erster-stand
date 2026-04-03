# AI Architecture Context (Aktiv)

Stand: 2026-04-04

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

## 4. Runtime-Vertraege (V74/V83/V84)

### 4.1 Zielgrenzen fuer V83

| Schicht | Besitz / Verantwortung | Direkte Partner | Kein direkter Zugriff |
| --- | --- | --- | --- |
| `Game` (`src/core/main.js`) | App-Lifetime, Bootstrap, Shutdown, globale Browser-Wiring und Shell-Glue fuer Settings/Profile | `GameRuntimeCoordinator`, Shell-Adapter, read-only Runtime-Projektionen | Session-/Match-/Finalize-State als Source of Truth, rohe Plattform-Capabilities, UI-Use-Cases |
| `SessionRuntime` (Zielschicht ab V83) | einzige Source of Truth fuer Session-, Match-, Finalize-, Lifecycle- und Runtime-Referenzzustand | Application-Layer, Shared Contracts, fachliche Runtime-Services | DOM, `window.curviosApp`, `ipcRenderer`, direkte UI-Controller |
| Application-Layer (`src/application/**`; aktuell noch Zielbereich) | Commands, Events, Session-Snapshots/Projektionen und Use-Case-Orchestrierung inkl. Capability-Komposition | `SessionRuntime`, Plattform-Capabilities, `src/shared/contracts/**` | direkte DOM-Manipulation, breite `game`-Mutation, rohe `runtimeBundle`-Rueckgriffe |
| UI (`src/ui/**`, `src/composition/core-ui/**`) | Rendering, Overlay-/Menue-State, Intent-Erfassung und Anzeige von Runtime-Projektionen | Application-Layer, read-only Snapshots/Events, benannte UI-Ports | `game.state`/`runtimeBundle.state` mutieren, Electron-/Storage-/LAN-Zugriffe |
| Plattform-Capabilities (`electron/main.cjs`, `electron/preload.cjs`, spaeter `src/platform/**`) | Host/Discovery/Save/Recording/Fallbacks, Availability-/Invoke-Vertraege und Desktop-vs-Browser-Degradation | Application-Layer, Shared Contracts, Desktop-Shell | Matchregeln, Session-Besitz, UI-Projektionen |

- `src/shared/contracts/**` bleibt die seiteneffektfreie Vertragsschicht fuer IDs, Payloads, Snapshots, Capability-Descriptoren, die zentrale Capability-Registry und Contract-Versionen.
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

### 4.4 Kleiner Vertragskatalog fuer V83

- Kanonische Heimat fuer die folgenden Vertragsfamilien bleibt `src/shared/contracts/**`. Zielanker fuer die spaetere Umsetzung sind `SessionRuntimeCommandContract.js`, `SessionRuntimeEventContract.js`, `SessionRuntimeSnapshotContract.js`, `PlatformCapabilityContract.js` und `PlatformCapabilityRegistry.js`; bis zu ihrer Einfuehrung ist dieser Abschnitt die Referenz fuer IDs, Pflichtfelder und Ownership.
- Gemeinsame Regeln:
  - Commands sind imperative Intents in `snake_case` und laufen ausschliesslich von UI, Shell oder Legacy-Adaptern in Richtung Application-Layer bzw. `SessionRuntime`.
  - Events sind eingetretene Fakten in `snake_case`; sie informieren UI, Observability und Uebergangsadapter, mutieren aber keinen Zustand direkt.
  - Snapshots sind read-only Projektionen mit mindestens `contractVersion`, `sessionId` und `updatedAt`; sie ersetzen direkte Reads auf `game`, `runtimeBundle` oder Plattformobjekte.
  - Capabilities sind benannte Availability-/Invoke-Vertraege; rohe Electron-, Browser- oder Storage-Objekte verlassen die Plattformschicht nicht.

#### 4.4.1 Runtime-Commands

| Command-ID | Primaerer Ausloeser | Minimaler Payload-Kern | Erwartetes Ergebnis |
| --- | --- | --- | --- |
| `initialize_session` | `GameRuntimeCoordinator`, Matchstart-/Lobby-Flow | `sessionType`, `multiplayerTransport`, `source` | `session_initialized` oder `session_init_failed`, danach `session_runtime_snapshot` |
| `start_match` | Menue- und Quickstart-Flows | `sessionId`, `modeId`, `mapId`, `participantConfigRef` | `match_started`, `match_flow_snapshot` |
| `pause_match` | Pause-Overlay, Shell-Hotkeys | `sessionId`, `reason` | `match_paused`, `match_flow_snapshot` |
| `resume_match` | Pause-Overlay | `sessionId`, `reason` | `match_resumed`, `match_flow_snapshot` |
| `apply_settings` | Settings-/Profile-Flow | `sessionId`, `settingsPatch`, `origin` | `settings_applied`, `session_runtime_snapshot` |
| `finalize_match` | Finalize-Flow, Fehlerpfade, Runtime-State-Machine | `sessionId`, `trigger`, `reason` | `match_finalizing`, `match_finalized` |
| `return_to_menu` | Pause-, Round-End-, Error- und Shell-Pfade | `sessionId`, `trigger`, `preserveLobby` | `match_finalizing`, `menu_opened` |
| `host_lobby` | Menue-Multiplayer-Bridge | `sessionId`, `lobbyConfig`, `capabilityId` | `lobby_session_changed`, `platform_capability_snapshot` |
| `join_lobby` | Menue-Multiplayer-Bridge | `sessionId`, `joinTarget`, `capabilityId` | `lobby_session_changed` oder `session_init_failed` |

#### 4.4.2 Runtime-Events

| Event-ID | Emittiert von | Bedeutung | Mindestpayload |
| --- | --- | --- | --- |
| `session_initialized` | Application-Layer / `SessionRuntime` | Session wurde erfolgreich aufgebaut und besitzt gueltige Runtime-Handles | `sessionId`, `sessionType`, `runtimeTransportKind` |
| `session_init_failed` | Application-Layer / `SessionRuntime` | Session-Initialisierung ist fehlgeschlagen oder wurde stale verworfen | `sessionId`, `reason`, `source` |
| `match_started` | Runtime-Lifecycle | Match ist spielbereit gestartet; bestehende V74-ID bleibt erhalten | `sessionId`, `matchId`, `modeId` |
| `match_paused` | Runtime-State-Machine | Runtime ist in einen pausierten Zustand gewechselt | `sessionId`, `reason`, `state` |
| `match_resumed` | Runtime-State-Machine | Runtime hat den pausierten Zustand verlassen | `sessionId`, `reason`, `state` |
| `settings_applied` | Application-Layer | Runtime-relevante Settings wurden uebernommen | `sessionId`, `changedKeys`, `origin` |
| `match_ended` | Match-/Round-Logik | Fachliches Matchende wurde erkannt; bestehende V74-ID bleibt erhalten | `sessionId`, `matchId`, `winnerId` |
| `match_finalizing` | Finalize-Flow | Finalize-/Return-to-Menu-Pfad laeuft und blockiert konkurrierende Exits | `sessionId`, `trigger`, `finalizeState` |
| `match_finalized` | Finalize-Flow | Runtime- und Session-Ressourcen sind final bereinigt | `sessionId`, `trigger`, `finalizeState` |
| `menu_opened` | Lifecycle-Orchestrierung | Menue wurde ueber den offiziellen Exit-Pfad wieder geoeffnet | `sessionId`, `trigger`, `targetView` |
| `lobby_session_changed` | Lobby-Service / Plattformadapter | Host-/Join-/Ready-/Discovery-Status der Menue-Session hat sich geaendert | `sessionId`, `lobbyState`, `transportKind` |
| `capability_fallback_used` | Plattformschicht / Application-Layer | Desktop-spezifische Faehigkeit ist degradierend oder mit Fallback benutzt worden | `sessionId`, `capabilityId`, `providerKind`, `reason` |

#### 4.4.3 Session-Snapshots

| Snapshot-ID | Besitzer | Kernfelder | Primaere Konsumenten |
| --- | --- | --- | --- |
| `session_runtime_snapshot` | `SessionRuntime` | `contractVersion`, `sessionId`, `matchId`, `lifecycleState`, `finalizeState`, `sessionType`, `runtimeTransportKind`, `isNetworkSession` | Application-Layer, Legacy-Facade, Observability |
| `match_flow_snapshot` | Application-Layer ueber `SessionRuntime` | `contractVersion`, `sessionId`, `gameStateId`, `uiStateId`, `roundStateId`, `isPaused`, `canReturnToMenu`, `pendingFinalizeTrigger` | `MatchFlowUiController`, `PauseOverlayController`, Menue-Glue |
| `lobby_session_snapshot` | Lobby-Service | `contractVersion`, `sessionId`, `lobbyState`, `role`, `participantCount`, `discoveryState`, `transportKind` | Menue-Multiplayer-Bridges, Shell-Statusanzeigen |
| `platform_capability_snapshot` | Plattformschicht | `contractVersion`, `sessionId`, Capability-Descriptoren fuer `discovery`, `host`, `save`, `recording` | Application-Layer, UI-Gating, Diagnostics |

#### 4.4.4 Plattform-Capabilities

| Capability-ID | Zweck | Pflichtfelder des Descriptors | Vertragsregel |
| --- | --- | --- | --- |
| `discovery` | Sitzungen, Peers oder Hosts sichtbar machen | `available`, `providerKind`, `degradedReason`, `supportsSubscribe` | UI und Menue lesen nur Availability/Snapshot; konkrete Discovery-Calls laufen ueber Application-Commands |
| `host` | Hosting/Lobby-Besitz fuer Desktop-/LAN-Pfade | `available`, `providerKind`, `degradedReason`, `supportsSessionOwnership` | Browser-Demo darf sauber degradieren; Menue-Storage-Bridge gilt nicht als vollwertiger Runtime-Host |
| `save` | Datei-, Export- und Persistenzpfade | `available`, `providerKind`, `degradedReason`, `supportsBinaryExport` | Save-Details bleiben in Plattformadaptern; UI bekommt nur Capability-Status und Ergebnis-Events |
| `recording` | Capture-, Encode- und Export-Flows | `available`, `providerKind`, `degradedReason`, `supportsCapture` | Desktop bleibt Source of Truth; Browser-Fallbacks muessen explizit als degradiert markiert werden |

- Brueckenregel fuer die Migration:
  - Bestehende `MatchLifecycleContract`-IDs wie `match_started`, `match_ended` und `menu_opened` bleiben fuer V83 erhalten und werden spaeter vom Runtime-Event-Vertrag referenziert statt fruehzeitig umbenannt.
  - `GameRuntimeFacade` und `shared/runtime/GameRuntimePorts.js` duerfen diese Contracts in `83.2` und `83.3` noch tunneln, sind aber nicht Eigentuemer der IDs oder Payload-Shapes.
  - `platform_capability_snapshot` ist die einzige freigegebene UI-Sicht auf `discovery`, `host`, `save` und `recording`; UI-Code liest weder `window.curviosApp` noch rohe Preload-Objekte direkt.

### 4.5 Legacy-Entry-Point-, Altport- und Sunset-Inventar

- `83.1.3` inventarisiert nur die fuer V83 relevanten breiten Runtime-, Menue- und Plattformpfade.
- Neue Features duerfen keine neuen Aufrufer auf diese Legacy-Pfade setzen; verbleibende Nutzung ist bis `83.5.3` als expliziter Transition-Adapter zu behandeln.

| Legacy-Pfad | Derzeitiger Besitzer | Migrationsziel | Sunset-Kriterium |
| --- | --- | --- | --- |
| `GameRuntimeBundle-Legacy-Surface` (`src/core/runtime/GameRuntimeBundle.js`, `src/core/GameBootstrap.js`, `src/core/main.js`) | `runtimeBundle` plus `GameRuntimeCoordinator` halten Alias-/Wrapper-Inventar fuer `game.*`, `game.runtimeBundle.*`, `startMatch` und `_returnToMenu`; `GameBootstrap` schreibt breite Komponenten-/State-Referenzen zurueck ins `game`. | Commands `start_match`, `apply_settings`, `return_to_menu` plus read-only `session_runtime_snapshot`/`match_flow_snapshot`; Besitzer nach Migration: `SessionRuntime` + Application-Layer. | Sobald produktiver Code keine Slots aus `GAME_RUNTIME_LEGACY_ALIAS_SPECS`/`GAME_RUNTIME_LEGACY_WRAPPER_SPECS` mehr konsumiert und `game.runtimeBundle` nicht mehr als allgemeiner Runtime-Zugriffspfad gelesen wird. |
| `GameRuntimeFacade-/GAME_RUNTIME-Surface` (`src/core/runtime/GameRuntimeCoordinator.js`, `src/core/GameRuntimeFacade.js`, `src/core/AppInitializer.js`) | `GameRuntimeCoordinator` publiziert `GameRuntimeFacade` gleichzeitig auf `game.runtimeFacade`, `runtimeBundle.components.runtimeFacade` und `window.GAME_RUNTIME`; Core- und UI-Pfade nutzen die Fassade noch als breite Runtime-API. | `GameRuntimeCoordinator` bleibt Shell-Adapter, fachliche Aufrufe laufen ueber Application-Commands/Events und `SessionRuntime`-Snapshots; globale Debug-Handles werden auf read-only Diagnostics reduziert. | Sobald keine produktiven Aufrufer mehr `game.runtimeFacade.*` oder `window.GAME_RUNTIME` verwenden und die Fassade nur noch expliziter Legacy-Forwarder oder ganz entfernt ist. |
| `GameRuntimePorts-Altports` (`src/shared/runtime/GameRuntimePorts.js`) | `GameRuntimePorts` buendeln Lifecycle-, Session-, Render-, Input- und UI-Feedback-Zugriffe und fallen intern auf `game`, `runtimeFacade` und `runtimeCoordinator` zurueck; damit bleiben sie ein Altport-Mix statt klarer Vertragsgrenze. | Aufteilung in schmale Command-/Event-/Snapshot-Ports mit klarer Ownership: Lifecycle/Session bei `SessionRuntime`, UI-Projektionen im Application-Layer, Plattformzugriffe ueber Capability-Contracts. | Sobald migrierter Scope keine Fallbacks mehr auf `game`/`runtimeFacade`/`runtimeCoordinator` benoetigt und `GameRuntimePorts` nicht mehr als Sammelport fuer neue Features importiert wird. |
| `UI-runtimeFacade-Reach-Throughs` (`src/ui/MatchFlowUiController.js`, `src/ui/PauseOverlayController.js`, `src/ui/HudRuntimeSystem.js`, `src/state/RoundStateTickSystem.js`) | UI- und State-Controller lesen oder triggern noch direkte `runtimeFacade`-/Session-Pfade fuer Return-to-Menu, Session-Lookups, Arcade-Menue-State und Host/Network-Abfragen. | UI sendet nur noch Intents (`return_to_menu`, `pause_match`, `resume_match`, `host_lobby`, `join_lobby`) und konsumiert ausschliesslich `match_flow_snapshot`, `lobby_session_snapshot` und `platform_capability_snapshot`. | Sobald im migrierten UI-/State-Scope keine produktiven `runtimeFacade`-Zugriffe mehr existieren und alle Runtime-Entscheidungen ueber Commands/Snapshots laufen. |
| `MenuMultiplayerBridge-/LanMenuMultiplayerBridge-Uebergang` (`src/core/runtime/MenuRuntimeMultiplayerService.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/composition/core-ui/LanMenuMultiplayerBridge.js`, `src/core/GameRuntimeFacade.js`) | `GameRuntimeFacade.setupMenuListeners()` haelt `game.menuMultiplayerBridge`; `MenuRuntimeMultiplayerService` schaltet zwischen browsernaher Storage-Bridge und Desktop-LAN-Bridge um. Das ist aktuell ein Menue-/Transport-Uebergangsadapter statt eines klaren Lobby-Services. | Application-besessener `LobbyService` hinter `host_lobby`/`join_lobby` und `lobby_session_snapshot`; die Storage-Bridge bleibt nur noch als explizit degradierter Browser-Demo-Adapter hinter demselben Vertrag, und Produkt-/Provider-/Lobby-Defaults lesen denselben Registry-Vertrag. | Sobald kein produktiver Code mehr `game.menuMultiplayerBridge` liest/schreibt, UI keinen Bridge-Typ direkt instanziiert und die Transportwahl ausschliesslich ueber Capability-Registry + Lobby-Service erfolgt. |
| `curviosApp-/__CURVIOS_APP__-Preload-Aliasse` (`electron/preload.cjs`, `src/ui/menu/MenuRuntimeFeatureFlags.js`, `src/ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js`, `src/ui/menu/multiplayer/MenuMultiplayerHostIpResolver.js`, `src/composition/core-ui/LanMenuMultiplayerBridge.js`, `src/core/recording/DownloadService.js`, `src/core/replay/ReplayRecorder.js`) | `electron/preload.cjs` exponiert benannte Contracts, aber auch Legacy-Aliasfunktionen und das globale App-Flag; Renderer- und Runtime-Module lesen diese Globals direkt fuer Discovery, Host, Save, Replay und Feature-Gating. | `PlatformCapabilityContract` + dedizierte Adapter unter `src/platform/**`; Renderer bekommt nur Capability-Descriptoren, Invoke-Funktionen und Fallback-Status ueber Application-/Platform-Layer. | Sobald `curviosApp`/`__CURVIOS_APP__` ausserhalb der dedizierten Plattformadapter nicht mehr referenziert werden und Browser-/Desktop-Unterschiede nur noch ueber Capability-Snapshots sichtbar sind. |
| `ActiveRuntimeConfigStore-Adapter` (`src/core/runtime/GameRuntimeBundle.js`, `src/core/Config.js`, `src/core/settings/SettingsSanitizerOps.js`) | `runtimeBundle.metadata.runtimeConfigAdapter` markiert `ActiveRuntimeConfigStore` bereits als Transition-Adapter; einzelne Config-/Settings-Pfade lesen weiterhin den globalen aktiven Runtime-Config-Slot. | `SessionRuntime` wird alleiniger Besitzer des Runtime-Config-Snapshots; Config-/Settings-Consumer erhalten explizite Runtime-/Settings-Projektionen per Injection oder Snapshot. | Sobald `getActiveRuntimeConfig` ausserhalb explizit markierter Uebergangsadapter nicht mehr verwendet wird und `runtimeBundle.metadata.runtimeConfigAdapter` entfernt werden kann. |

### 4.6 Zielgrenzen fuer V84

| Schicht | Besitz / Verantwortung | Direkte Partner | Kein direkter Zugriff |
| --- | --- | --- | --- |
| `SessionRuntime` (aussere Runtime-/Lifecycle-Schicht aus V83) | besitzt Session-Lifecycle, Match-Bootstrap, Adapterkomposition, Match-/UI-/Capability-Projektionen und ist der einzige Einstiegspunkt fuer interaktive sowie headless Kernel-Laeufe | Application-Commands, `MatchKernel`, Plattformadapter, read-only Projektionen fuer UI und Renderer | Three-/Canvas-/DOM-Details, Renderer-Scenegraph als Source of Truth, fachliche Matchregeln im UI oder in Plattformadaptern verstecken |
| `MatchKernel` (Zielschicht ab V84) | kapselt deterministischen Tick-, Round-, Match- und GameMode-Ablauf; besitzt Match-State, Regelanwendung, Spawn-/Score-/Cleanup-Entscheidungen und emittiert nur headless-faehige Snapshots/Domain-Events | `SessionRuntime`, GameMode-API, Clock-/Input-/Seed-/Snapshot-Ports | DOM, `window`, `document`, Three.js, Electron-/Storage-/LAN-Capabilities, direkte HUD-/Menue-Controller |
| Renderer (`src/core/Renderer.js` plus Subsysteme) | setzt freigegebene Projektionen in Szene, Kameras, Effekte und Capture-Pipelines um; besitzt nur visuelle Ressourcen und Render-Timing | read-only Runtime-/Kernel-Projektionen, dedizierte Renderadapter, Session-Bootstrap waehrend der Migration | Matchregeln, Score-/Round-Entscheidungen, Session-Lifecycle-Besitz, Plattform-Invokes |
| UI (`src/ui/**`) | erfasst Spieler- und Menue-Intents, zeigt Match-/Session-/Capability-Projektionen an und haelt Overlay-/Menuezustand | Application-/SessionRuntime-Commands, read-only Snapshots/Events, benannte UI-Ports | direkte Mutation von Entity-/Arena-/Kernel-State, Renderer-/Platform-Interna, Match-Start-/Finalize-Logik als eigener Besitzer |
| Plattformadapter (`src/platform/**`, `electron/preload.cjs`, Browser-Fallbacks) | kapseln Save-, Discovery-, Host-, Recording- und Shell-Capabilities samt Availability, Invoke und Degradation | Application-Layer, `SessionRuntime`, Shared Contracts | Matchregeln, Tickablauf, Renderer-Scenegraph, UI-State als Source of Truth |

- Flussregel:
  - UI- und Shell-Intents laufen nur nach innen: `UI/Plattform -> SessionRuntime -> MatchKernel`.
  - Match-/Simulationsdaten laufen nur nach aussen: `MatchKernel -> SessionRuntime/Application -> UI/Renderer`.
  - Headless-Laeufe ersetzen Renderer/UI/Plattformadapter, booten aber denselben `MatchKernel` und dieselbe GameMode-API.

### 4.6.1 Tick-, Clock-, Seed-, Input- und Snapshot-Vertraege fuer V84

- `src/shared/contracts/MatchKernelRuntimeContract.js` ist der gemeinsame Vertragskatalog fuer `interactive` und `headless`.
- `src/shared/contracts/RuntimeClockContract.js`, `src/shared/contracts/RuntimeRngContract.js` und `src/shared/contracts/SessionRuntimeSnapshotContract.js` bleiben Basiskontrakte; der Kernelvertrag komponiert sie nur fuer V84.
- `src/core/GameLoop.js` bleibt im interaktiven Pfad Besitzer von Browser-`rAF`, Delta-Reset und Render-Interpolation, darf aber nur normalisierte Tick-Huellen nach innen geben.
- `src/core/DeveloperTrainingController.js` sowie spaetere Replay-, Netzwerk- und Testadapter liefern dieselben Seed- und Input-Huellen fuer headless Laeufe.

| Vertrag | Besitzer | Pflichtfelder | Interaktive Quelle | Headless-Quelle |
| --- | --- | --- | --- | --- |
| `run_profile` | `SessionRuntime` / Startadapter | `surface`, `tickDriver`, `clockMode`, `fixedStepSeconds`, `inputSource`, `snapshotTarget`, `deterministic` | Browser-Session ueber `GameLoop.js` | Trainings-, Replay-, Netzwerk- oder CLI-Runner |
| `clock_port` | Startadapter | `clock`, `clockMode`, `fixedStepSeconds`, `monotonic`, `wallClockOwnedByDriver` | `createRuntimeClock()` ueber `performance.now()` und `Date.now()` | synthetische oder testgesteuerte Uhr |
| `tick_envelope` | Treiber pro Lauf | `tickIndex`, `fixedStepSeconds`, `elapsedSeconds`, `wallClockMs`, `highResTimestampMs`, `timeScale`, `reset`, `resetReason` | Browser-`rAF` nach Jitter-Glattung und Reset-Normalisierung | manueller Step-Loop oder Replay-Framecursor |
| `seed_envelope` | Match- und Round-Bootstrap | `matchSeed`, `roundSeed`, `tickSeed`, `streamId`, `deterministic` | Settings-/Session-Boot plus Runtime-Seed fuer dieselbe Matchkonfiguration | Trainings-, Replay- oder Harness-Szenario |
| `input_frame` | Inputadapter | `tickIndex`, `sequence`, `capturedAtMs`, `inputSource`, `players[]`, `commands[]`, `deterministic` | `PlayerInputSource`-, UI- und Netzwerkadapter vor dem Tick | gepufferte Replay-, Training- oder Testaktionen |
| `snapshot_envelope` | `MatchKernel` / `SessionRuntime` | `snapshotTarget`, `tickIndex`, `sequence`, `capturedAtMs`, `sessionRuntimeSnapshot`, `gameStateSnapshot`, `simStateSnapshot`, `runtimeProjection`, `checksum` | HUD-/Renderer-/Recorder-Projektionen und Transport-Snapshots | Checkpoints, Observability und Rollback-nahe Diagnostik |

- Invarianten:
  - `fixedStepSeconds` bleibt waehrend eines Matches konstant; variable Browser-Delta-Werte werden vor dem Kernel auf `tick_envelope` normalisiert.
  - `wallClockMs` und `highResTimestampMs` sind Diagnostik- und Observability-Felder. Deterministische Matchentscheidungen duerfen nur `tickIndex`, `fixedStepSeconds`, Seeds und Input-Frames auswerten.
  - `input_frame` muss vor jedem Tick vollstaendig vorliegen; der Kernel liest weder `window`, `document`, `game.input` noch direkte `PlayerInputSource`-Instanzen.
  - `snapshot_envelope` bleibt serialisierbar. `sessionRuntimeSnapshot` deckt Ownership und Lifecycle ab, `gameStateSnapshot` Transport und Replay, `simStateSnapshot` Checkpoint- und Rollback-nahe Analyse und `runtimeProjection` Renderer- und UI-Leser.

### 4.7 Aktuelle Simulationskopplungen, die V84 abbauen muss

| Heutiger Uebergangspfad | Beobachtete Kopplung | Ziel fuer V84 |
| --- | --- | --- |
| `src/state/MatchSessionFactory.js` | erstellt Arena, `EntityManager`, `PowerupManager`, `ParticleSystem` und kombiniert Session-Aufbau noch direkt mit `renderer`-, Audio- und Recorder-Abhaengigkeiten | Session-Aufbau in einen headless-faehigen `MatchKernel` plus interaktive Adapter aufteilen; Renderer-/Audio-/Recorder-Wiring darf nur ausserhalb des Kernels passieren |
| `src/core/MatchSessionRuntimeBridge.js` | schreibt initialisierte Match-Referenzen direkt in `game`/`runtimeBundle` und koppelt Lifecycle-Ref-Management an die interaktive Runtime-Surface | als schmaler Uebergangsadapter nur noch Kernel-Handle und Projektionen an `SessionRuntime` binden; keine breite Match-Session-Ownership im `game` |
| `src/core/PlayingStateSystem.js` | mischt Pause-Intent, Simulations-Tick, Arena-/Powerup-/Particle-Update, HUD-Sync und Snapshot-Capture ueber das breite `game`-Objekt | auf einen Runtime-Adapter reduzieren, der Input/Zeit in den `MatchKernel` leitet und danach nur Projektionen an HUD/Renderer weiterreicht |
| `src/entities/EntityManager.js` | traegt heute Renderer-, Audio-, Recorder- und GameMode-Strategie-Bezug in derselben Runtime-Instanz | GameMode-/Tick-/Round-Logik hinter den Kernel- und GameMode-Vertrag ziehen; Render-, Audio- und Recording-Effekte nur ueber explizite Adapter einspeisen |
| `src/core/Renderer.js` | bleibt bewusst Window-/Canvas-/Three-spezifisch und darf deshalb kein Kernel-Besitzer werden | ausschliesslich visuelle Projektion und Capture; Match-/Mode-/Session-Entscheidungen bleiben ausserhalb |

- Migrationsleitplanke fuer V84:
  - Neue Features duerfen keine zusaetzlichen Direktzugriffe von UI, Renderer oder Plattformadaptern auf `EntityManager`, `Arena`, `PowerupManager` oder `game.state` einfuehren.
  - `SessionRuntime` bleibt Besitzer der interaktiven Runtime-Komposition; `MatchKernel` wird nicht zum neuen Service-Locator fuer Renderer-, UI- oder Plattformobjekte.

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
