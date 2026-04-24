# AI Architecture Context (Aktiv)

Stand: 2026-04-25

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
  - `MatchLifecycleSessionOrchestrator` serialisiert asynchrone Session-Initialisierung, disposed stale Resultate aktiv, settled Recorder-/Teardown-Pfade deterministisch, emittiert `match_finalized` vor `menu_opened` und oeffnet das Menue nur ueber den definierten Lifecycle-Vertrag.
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
| `return_to_menu` | Pause-, Round-End-, Error- und Shell-Pfade | `sessionId`, `trigger`, `preserveLobby` | `match_finalizing`, `match_finalized`, `menu_opened` |
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
| `match_finalizing` | Finalize-Flow | Finalize-/Return-to-Menu-Pfad laeuft, blockiert konkurrierende Exits und bleibt aktiv, bis der explizite Abschluss ueber `match_finalized` und danach `menu_opened` erreicht ist | `sessionId`, `trigger`, `finalizeState` |
| `match_finalized` | Finalize-Flow | Runtime- und Session-Ressourcen sind final bereinigt; erst danach darf der offizielle Menueabschluss folgen | `sessionId`, `trigger`, `finalizeState` |
| `menu_opened` | Lifecycle-Orchestrierung | Menue wurde nach explizitem `match_finalized`-Abschluss ueber den offiziellen Exit-Pfad wieder geoeffnet | `sessionId`, `trigger`, `targetView` |
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

#### 4.5.1 Ist-Aufrufer-Snapshot (`V91 91.1.1`, Recheck 2026-04-17)

| Surface | Ist-Aufrufer (produktiver Code) | Erlaubter Uebergangsadapter |
| --- | --- | --- |
| `game.runtimeBundle` | `src/core/MatchSessionRuntimeBridge.js`, `src/state/RoundStateTickSystem.js` | `GameRuntimeBundle` als Legacy-Container bis zur Snapshot-/Command-Migration |
| `game.runtimeFacade` und `window.GAME_RUNTIME` | Publish/Cleanup in `src/core/AppInitializer.js` und `src/core/main.js`, Runtime-Handle-Wiring in `src/core/runtime/GameRuntimeBundle.js`/`src/core/runtime/GameRuntimeCoordinator.js`, expliziter Legacy-Fallback nur in `src/shared/runtime/GameRuntimePorts.js` | `GameRuntimeCoordinator`/`AppInitializer` als Legacy-Publish-Adapter; keine neuen Fachaufrufer |
| `GameRuntimePorts`-Fallbacks | Port-Einstieg in `src/core/GameBootstrap.js`, interne Fallback-Helfer ausschliesslich in `src/shared/runtime/GameRuntimePorts.js` | `createRuntimePorts()` bleibt Uebergangsnaht; neue Features laufen ueber Commands/Snapshots |
| `curviosApp` und `__CURVIOS_APP__` | direkte Reads in `src/entities/ai/ObservationBridgePolicy.js` und `src/shared/contracts/PlatformCapabilityRegistry.js`; Adapterzugriff in `src/platform/electron/ElectronPlatformBridge.js` | langfristig nur `src/platform/electron/**`; direkte Reads sind Migrationsschuld bis 91.3 |
| `ActiveRuntimeConfigStore`-Globalslot | Reads in `src/core/Config.js` und `src/core/settings/SettingsSanitizerOps.js`; Adapter-Metadaten in `src/core/runtime/GameRuntimeBundle.js` | als markierter Uebergangsadapter bis Runtime-Config per Snapshot/Injection geliefert wird |

#### 4.5.2 Maschinenlesbare Guard-Matrix (`V91 91.1.2`, 2026-04-14)

Die vollstaendige, maschinenlesbare Guard-Matrix liegt unter `scripts/architecture/legacy-surface-guard-matrix.json`. Sie beschreibt fuer jede Legacy-Surface:

- `patterns`: Regulaere Ausdrucksstring-Muster zum Erkennen von Aufrufen
- `status`: `legacy-transition` (erlaubter Restadapter) oder `migration-debt` (explizite Migrationsschuld)
- `forbiddenForNewWork`: ob neue Features diese Surface nutzen duerfen
- `allowedAdapters`: exklusive Adapter-Dateien mit Schreibrecht auf diese Surface
- `allowedCallers`: bekannte Bestandsaufrufer bis zur Migration
- `migrationTarget`: Zielpfad (Commands/Snapshots/Capabilities)
- `sunsetPhase`: geplante Phase fuer den Sunset
- `sunsetCriteria`: pruefbare Bedingung fuer vollstaendigen Abbau

Kurzregeln fuer neue Feature-Arbeit (konsistenter Einstieg):

| Verboten fuer neue Aufrufer | Erlaubt als Zielpfad |
| --- | --- |
| `game.runtimeBundle` (als Fachpfad) | Commands: `initialize_session`, `start_match`, `return_to_menu` |
| `game.runtimeFacade` (als Fachpfad) | Snapshots: `session_runtime_snapshot`, `match_flow_snapshot` |
| `window.GAME_RUNTIME` | Capabilities: `platform_capability_snapshot` per Application-Layer |
| `curviosApp`/`__CURVIOS_APP__` ausserhalb `src/platform/electron/**` | Plattformzugriff: nur ueber `src/platform/**`-Adapter |
| `getActiveRuntimeConfig` ausserhalb Config/Settings-Uebergangsadapter | Runtime-Config: explizite Injection oder SessionRuntime-Snapshot |

#### 4.5.3 Runtime-Adapterzuschnitt (`V91 91.3.1`, 2026-04-14)

- `src/shared/runtime/GameRuntimePorts.js` liest Runtime-Intents jetzt in einer expliziten Reihenfolge: zuerst Bundle-Handles (`runtimeCoordinator`, `runtimeFacade`), danach nur noch markierte Legacy-Restadapter (`game.runtimeCoordinator`, `game.runtimeFacade`).
- `createLifecyclePort()` konsumiert denselben Resolver und fuehrt damit keinen separaten ad-hoc-Fallback-Pfad mehr.
- `src/core/runtime/GameRuntimeCoordinator.js` nutzt fuer Ports/Fassade/UI nur noch Runtime-Bundle-Handles; rohe Slot-Fallbacks auf `runtime.runtimePorts`, `runtime.runtimeFacade` und `runtime.uiManager` sind entfernt.
- `src/core/GameRuntimeFacade.js` liest `uiManager` nur noch ueber den Runtime-Bundle-Handle.

#### 4.5.4 UI-Kontext als expliziter Snapshot-Vertrag (`V91 91.3.4`, 2026-04-14)

- `src/ui/menu/MenuUiSyncContext.js` ist die zentrale Quelle fuer Access-, Release- und Surface-Kontext im Menue (`resolveMenuUiSyncContext`, `resolveDeveloperReleaseState`).
- `src/ui/UIManager.js` berechnet den Menue-Kontext einmal pro Sync-Zyklus und reicht ihn explizit an Session-, Mode-, Preset-, Multiplayer- und Developer-Sync weiter.
- `src/ui/UINavigationLifecycleController.js` berechnet Access-/Release-Kontext nicht mehr selbst neu; `updateContext()` und `syncDeveloperReleaseCutVisibility()` konsumieren denselben Snapshot.
- `src/ui/menu/MenuDeveloperStateSync.js` nutzt keinen impliziten Callback mehr, der den Release-Cut-Sync versteckt triggert; der Aufrufpfad ist jetzt explizit `UIManager -> NavigationLifecycle`.
- `src/ui/UIStartSyncController.js` liest Surface-Policy ueber `UIManager.resolveSurfacePolicy()` statt ueber private Manager-Felder.

#### 4.5.5 Lifecycle-, Finalize- und Capability-Contract-Regressionspfad (`V91 91.4.2`, 2026-04-14)

- `tests/lifecycle-capability.contract.test.mjs` ist der kanonische 91.4-Testpfad; Lifecycle-/Capability-Gating ist dort konsolidiert statt parallel in mehreren Contract-Dateien.
- Der Scope sichert `return_to_menu` ueber `UiIntentAtomicity` als Lease-Vertrag ab und blockiert Ausfuehrung explizit bei `finalizing` oder stale Snapshot-Timestamps.
- `SessionRuntimeStateMachine` bleibt gegen den kritischen Finalize-Korridor abgesichert: `finalizing -> menu` bleibt gesperrt, bis `finalize.status === finalized` und ein Abschluss-Event (`match_finalized` oder `menu_opened`) vorliegt.
- `SessionRuntimeEventContract` und `SessionRuntimeSnapshotContract` sichern im selben Test die Event-Klasse `capability_fallback_used` und die Reihenfolge `match_finalized -> menu_opened` im Observability-Snapshot.
- Snapshot-/Surface-Gating fuer neue UI-Arbeit ist im gleichen Scope abgedeckt (`createSessionRuntimeSnapshot`, `createMatchFlowSnapshot`, `createPlatformCapabilitySnapshot`, `resolveSurfaceBlockedFeatureFeedback`, `resolveSurfaceFeatureLaunchGuard`, `resolveSurfaceMultiplayerGateAccess`, `resolveSurfaceFeatureClassification`).

#### 4.5.6 Feature-Start-Checkliste fuer neue Produktarbeit (`V91 91.5.1`, 2026-04-14)

Jede neue produktive Datei im Scope der aktiven Blocks (`V64`, `V81`, `V82`, `V86`) folgt vor dem ersten Commit denselben Architekturpfaden:

| Dimension | Bevorzugter Pfad | Verbotener Legacy-Pfad |
| --- | --- | --- |
| **Contract** | Shared-Contract-Datei in `src/shared/contracts/` anlegen oder erweitern; Versionierung und Normalize-Utils aus `ContractNormalizeUtils.js` nutzen | Inline-Normalisierung oder -Validierung in Fach-Datei |
| **Command/Event** | `SessionRuntimeCommandContract.js` oder `SessionRuntimeEventContract.js` als Typ-Quelle; Dispatch ueber bestehende Ports | Direktaufruf auf `game.*`- oder `runtimeFacade`-Methoden fuer neue Fachpfade |
| **Snapshot** | `session_runtime_snapshot`, `match_flow_snapshot` oder `platform_capability_snapshot` als read-only Input | `getActiveRuntimeConfig()` oder `window.GAME_RUNTIME` als Fachpfad |
| **Capability** | `resolveSurfaceCapabilityAccess()`, `resolveSurfacePolicy()` oder `resolveSurfaceFeatureLaunchGuard()` aus `PlatformCapabilityRegistry.js` bzw. `PlatformSurfacePolicyOps.js` | Direktlesen von `curviosApp`, `__CURVIOS_APP__` oder rohen Preload-Feldern ausserhalb `src/platform/**` |
| **Sunset alter Pfade** | Bei jedem neuen Fachimport pruefen, ob ein Guard-Matrix-Eintrag fuer diesen Legacy-Pfad existiert; existiert er, ist nur der gelistete `allowedAdapter` erlaubt. `window.GAME_RUNTIME`, `window.GAME_INSTANCE` und explizite `GameRuntimePorts`-Fallback-Helfer (`getLegacyRuntime*`, `getRuntimeFeatureTransition*`, `allowLegacyFallback=true`) bleiben ausserhalb der dokumentierten Restadapter tabu. | Neue Aufrufer auf `game.runtimeBundle`, `game.runtimeFacade`, `window.GAME_RUNTIME`, `window.GAME_INSTANCE`, `curviosApp`/`__CURVIOS_APP__` (ausserhalb `src/platform/**`), `getActiveRuntimeConfig` (ausserhalb Config/Settings) oder direkte Legacy-Fallback-Helfer aus `GameRuntimePorts` einbauen |
| **Desktop-vs-Demo** | Surface-Policy immer ueber `resolveSurfacePolicy({ productSurfaceId })` bestimmen; Desktop-only-Features mit `resolveSurfaceFeatureLaunchGuard()` schraenken | Direktvergleich auf `runtimeKind === 'electron'` oder Feature-Flags ausserhalb der Surface-Policy-Kontrakte |

**Pflicht-Gates vor jedem Block-Merge:**

```
npm run check:architecture:boundaries
npm run check:architecture:touched-strict
npm run check:architecture:metrics
npm run check:architecture:ratchet
npm run plan:check
npm run docs:sync
npm run docs:check
```

#### 4.5.7 Hotspot-Zielpfad-Matrix (`V92 92.1.2`, 2026-04-15)

`V92` setzt auf dem `V91`-Ratchet auf und schneidet die verbliebenen Hotspots gegen denselben Vertragsraum (`SessionRuntimeCommandContract`, `SessionRuntimeSnapshotContract`, `PlatformCapabilityContract`) statt neue Paralleladapter einzuziehen.

| Hotspot | Zielpfad ab `92.2+` | Explizite Ownership | Sunset-/Guard-Kriterium |
| --- | --- | --- | --- |
| `GameRuntimeFacade` | `SessionRuntimeCommandExecutor` delegiert nur noch auf kleine Application-Use-Cases (`start_match`, `return_to_menu`, `host_lobby`, `join_lobby`, `apply_settings`); UI liest Runtime-Status ueber Snapshots/Ports statt direkter Facade-Aufrufe | Runtime-Fachlogik liegt im Application-Layer und in dedizierten Runtime-Services; Fassade bleibt nur Legacy-Forwarder | Neue Facade-Aufrufer ausserhalb erlaubter Adapter gelten als Guard-Verstoss; bestehende Aufrufer werden pro Subphase auf Commands/Snapshots migriert |
| `MatchFlowUiController` | Aufteilung in Controller-Port plus spezialisierte Adapter (`LifecycleIntent`, `ArcadeOverlayProjection`, `TelemetryFeedback`), konsumiert ueber `UiControllerRuntimePorts` | UI-Orchestrierung bleibt im UI-Layer; Runtime-Entscheidungen laufen ueber Command- und Snapshot-Vertraege | Keine neuen Featurezweige mehr in der Sammelklasse; neue Methoden muessen einem bestehenden Teiladapter zuordenbar sein |
| `GameRuntimePorts` | Ports bleiben schmale Naht (`runtimeIntentPort`, `lifecyclePort`, `matchUiPort`, `runtimeProjectionPort`) ohne produktive Fallbacks auf `game.runtimeFacade`/`game.runtimeCoordinator` im migrierten Scope | Command-/Snapshot-Semantik liegt in Shared Contracts + Application-Layer, nicht in Port-Fallback-Logik | Port-Fallback-Zaehler fuer `runtimeFacade`/`runtimeCoordinator` werden als Ratchet gefuehrt und duerfen fuer neue Arbeit nicht steigen |
| `window.GAME_RUNTIME` + `GAME_INSTANCE` | Nur noch read-only Diagnostics-Surface (expliziter `debugRuntimeSnapshot`) oder kompletter Publish-Stopp; produktive UI-/Runtime-Leser laufen ueber Ports/Snapshots | Runtime-Laufzeitbesitz liegt bei `SessionRuntime`/Application-Layer; Globals sind kein Fach-API | Guard-Matrix erlaubt nur Diagnoseadapter als Caller; produktive Reads in `src/ui/**`, `src/state/**` oder `src/core/**` schlagen als Legacy-Surface-Verstoss fehl |

#### 4.5.8 Application-Command-Use-Cases (`V92 92.2.1`, 2026-04-15)

- `src/application/session-runtime/SessionRuntimeCommandUseCases.js` kapselt fuer den migrierten Scope die Runtime-Commands `apply_settings`, `start_match`, `return_to_menu`, `host_lobby` und `join_lobby` als kleine Application-Services.
- `src/application/session-runtime/SessionRuntimeCommandExecutor.js` bleibt damit schmal: Command-Normalisierung und Use-Case-Auswahl bleiben im Executor; die direkte Kopplung an Settings-, Session- und Multiplayer-Implementierungen liegt im Use-Case-Layer.
- Der Vertragsraum bleibt unveraendert: keine neuen Command-IDs, keine parallelen Dispatch-Wege und keine neuen UI- oder Global-Surface-Bypaesse.

#### 4.5.9 Command-Result- und Failure-Schnitt (`V92 92.2.2`, 2026-04-15)

- `src/application/session-runtime/SessionRuntimeCommandUseCases.js` fuehrt fuer den Runtime-Command-Katalog jetzt die gemeinsame Execution-Huelle fuer `received`/`completed`/`failed`-Observability, Settled-Results und Failure-Vertraege.
- `src/application/session-runtime/SessionRuntimeCommandExecutor.js` ist dadurch auf Command-Normalisierung plus Use-Case-Auswahl reduziert; `executeSessionRuntimeCommandResult()` fuehrt keinen zweiten Result-Pfad mehr neben dem Use-Case-Schnitt.
- `tests/runtime-regressions.contract.test.mjs` spiegelt denselben Vertrag fuer asynchrone Rejections und `invalid_command`: die Observability-Events kommen aus dem Use-Case-Schnitt, waehrend der rohe `execute()`-Pfad kompatibel bleibt.

#### 4.5.10 Port-Sunset fuer migrierten Scope (`V92 92.3.1`, 2026-04-15)

- `src/shared/runtime/GameRuntimePorts.js` nutzt fuer migrierte Runtime-Intents und Lifecycle-Pfade jetzt nur noch Bundle-Handles (`runtimeCoordinator`, `runtimeFacade`). Produktive Fallbacks auf `game.runtimeCoordinator` oder `game.runtimeFacade` sind fuer `runtimeIntentPort` und `lifecyclePort` entfernt.
- Der Session-Snapshot liest `sessionType`, `runtimeTransportKind`, `isNetworkSession` und `isHost` ueber `RuntimeSessionContract`, `game.session` und den Bundle-State statt ueber Legacy-Facade-Reads. Damit bleibt derselbe Ownership-Schnitt auch fuer UI-Gating und Flow-Snapshots erhalten.
- Nicht migrierte Restnischen bleiben explizit benannt: Arcade- und Recording-Ports nutzen nur noch als Uebergang markierte Transition-Adapter (`getRuntimeFeatureTransitionCoordinator()` / `getRuntimeFeatureTransitionFacade()`) und sind damit klar vom produktiven Command-/Lifecycle-Scope getrennt.
- `tests/runtime-regressions.contract.test.mjs` fuehrt den Ratchet dazu jetzt auch negativ: Legacy-only `runtimeFacade`-Pfad reicht fuer `returnToMenu()` oder `initializeSession()` nicht mehr aus, waehrend der Session-Snapshot denselben Sunset ohne Legacy-Fassade abbildet.

#### 4.5.11 Global-Surface-Sunset im Menu-Consumer (`V92 92.3.2`, 2026-04-15)

- `src/core/GameRuntimeFacade.js` exponiert fuer den Menuepfad einen expliziten `runtimeAccess`-Schnitt (`getArcadeMenuSurfaceState`, `requestArcadeReplayPlayback`, `showStatusToast`, `getSettingsStore`) statt impliziter Global-Reads.
- `src/ui/MenuController.js` reicht diesen Runtime-Access kontrolliert in den Binding-Context durch; `src/ui/menu/MenuGameplayBindings.js` und `src/ui/arcade/ArcadeMenuSurface.js` konsumieren denselben Pfad.
- `src/ui/arcade/ArcadeMenuSurface.js` liest Runtime-State, Replay-Fallback und Settings-Store dadurch nicht mehr aus `window.GAME_INSTANCE` oder `window.GAME_RUNTIME`; globale Surfaces bleiben damit auf Diagnostics-/Debug-Kompatibilitaet begrenzt statt produktivem UI-Einstieg.
- `tests/runtime-regressions.contract.test.mjs` verankert einen einfachen Ratchet gegen direkte produktive `GAME_INSTANCE`-/`GAME_RUNTIME`-Reads in der Arcade-Surface.

#### 4.5.12 MatchFlow-Controller-Split (`V92 92.4.1`, 2026-04-15)

- `src/ui/MatchFlowUiController.js` bleibt die oeffentliche UI-Fassade und der bestehende Einstieg fuer `matchUiPort`, Pause-Overlay und Legacy-Call-Sites, traegt aber keine weiteren Round-End-, Overlay- oder Telemetrie-Unterpfade mehr selbst aus.
- `src/ui/MatchFlowLifecycleController.js` besitzt jetzt die Lifecycle-Intents fuer `startRound`, `onRoundEnd`, Round-End-Plan-Anwendung und `returnToMenu`; `MatchFlowUiController` delegiert dorthin statt weitere Lifecycle-Verzweigungen in derselben Klasse anzusammeln.
- `src/ui/MatchFlowArcadeOverlayController.js` kapselt Message-Stats sowie Arcade-Intermission-/Post-Run-Overlay-Rendering inklusive Replay-Fallback-Button und Choice-/Reward-Wahl.
- `src/ui/MatchFlowTelemetryController.js` kapselt Hunt-Feedback, Damage-Indikatoren, Round-End-Telemetrie-Payloads und den Callback-Bindungspfad an `MatchLifecycleSessionOrchestrator`.
- `tests/runtime-regressions.contract.test.mjs` spiegelt den Split mit kleinen Node-Contracts fuer Lifecycle-Port-Delegation und den extrahierten Hunt-Feedback-Seam; breite Desktop-/Playwright-Verifikation bleibt weiter dem spaeteren Gate ueberlassen.

#### 4.5.13 Facade-Service-Split (`V92 92.4.2`, 2026-04-15)

- `src/core/GameRuntimeFacade.js` behaelt die oeffentliche Legacy-Surface fuer bestehende Runtime-/Coordinator-Aufrufer, schuettet aber keine neue Arcade- oder Recording-Fachlogik mehr in dieselbe Klasse.
- `src/core/runtime/GameRuntimeArcadeSupport.js` besitzt Arcade-Run-State, Round-State-Controller-Aktivierung, Replay-/Reward-/Intermission-Pfade, Sudden-Death-Ticks und die Round-/Match-End-Telemetrie fuer den migrierten Scope.
- `src/core/runtime/GameRuntimeRecordingSupport.js` kapselt ueber `createGameRuntimeRecordingFacadeSupport()` den Cinematic-Recording-Hotkey, Recorder-Dump, Metrics und Ghost-Clip-Zugriff als expliziten Facade-Dienst statt als weitere Inline-Unterfluesse.
- `src/ui/MatchFlowLifecycleTransitions.js` und `src/ui/MatchFlowRoundEndCoordinator.js` liefern die fuer `MatchFlowUiController` und `PauseOverlayController` benoetigten Lifecycle-/Round-End-Helfer als UI-Seam, damit der zuvor offene `ui -> state`-Rest nicht als neue Guard-Ausnahme bestehen bleibt.
- `GameRuntimeFacade` bleibt dadurch Composition-/Forwarding-Seam: Menu-Runtime-Access, Settings-/Session-/Menu-Handler und Legacy-kompatible Methoden verdrahten nur noch dedizierte Services.
- `tests/runtime-regressions.contract.test.mjs` verankert den Delegationspfad fuer Match-End-Telemetrie, sodass neue Arcade-/Recording-Unterfluesse nicht unbemerkt wieder direkt in die Facade rueckwandern.

#### 4.5.14 Ratchet-Baseline fuer Folgeblocks (`V92 92.5.2`, 2026-04-15)

- `scripts/architecture/legacy-surface-guard-matrix.json` und `scripts/architecture/architecture-budget-ratchet.json` sind fuer Folgearbeit jetzt die verbindliche Ownership-/Sunset-Baseline: `window.GAME_INSTANCE` bleibt auf Diagnostics-only beschraenkt, und explizite `GameRuntimePorts`-Fallback-Helfer (`getLegacyRuntime*`, `getRuntimeFeatureTransition*`, `allowLegacyFallback=true`) sind nur noch als dokumentierte Restadapter zulaessig.
- Das eingefrorene Budget ist absichtlich klein: `window.GAME_INSTANCE` darf nur noch in `src/core/AppInitializer.js` und `src/core/main.js` auftauchen; `GameRuntimePorts`-Fallbacks sind nur noch in `src/shared/runtime/GameRuntimePorts.js` erlaubt.
- Folgeblocks `V64`, `V81`, `V82` und `V86` konsumieren deshalb denselben Ratchet vor jeder Produktarbeit: neue Multiplayer-, Tooling-, HUD-/Overlay- oder Authoring-Pfade laufen ueber Commands, Snapshots, Capability-Resolver und die schmale Port-Schnittstelle statt ueber Runtime-Globals oder direkte Fallback-Helfer.
- `architecture-guard` ist fuer diese Bloecke nicht nur ein generisches Gate, sondern die konkrete Sperre gegen Budget-Aufweitung: neue `GAME_INSTANCE`-Reads ausserhalb der beiden Bootstrap-Dateien oder neue `GameRuntimePorts`-Fallback-Caller ausserhalb von `src/shared/runtime/GameRuntimePorts.js` gelten als Guard- und Ratchet-Verstoss.

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

### 4.6.2 Folgeverbrauch fuer Replay, Training und Netzwerk

| Verbrauchspfad | V84-Baseline | Zulaessige Kernel-Inputs/-Outputs | Verankerung fuer Folgearbeit |
| --- | --- | --- | --- |
| Replay / Recording / Ghosts | `MatchKernelReplayAdapter` konsumiert denselben `MatchKernel` wie interactive/headless und liest serialisierbare `snapshot_envelope`-Pakete statt Entity- oder Renderer-Interna. | Replay-Leser und Recorder duerfen `run_profile`, `seed_envelope`, `input_frame` und `snapshot_envelope` weiterreichen; Persistenz oder Playback arbeitet auf `gameStateSnapshot`, `simStateSnapshot` und freigegebenen Projektionen. | `V85` versioniert Replay-/Snapshot-Artefakte und Migrationspfade; `V82.4` bleibt fuer kompakte Ghost-Replays auf dieselbe Snapshot-Basis beschraenkt. |
| Training / Validate / Benchmark | `MatchKernelTrainingAdapter`, `TrainerPayloadAdapter` und `TrainingTransportFacade` bilden den gemeinsamen Kopf fuer Preview-, Resume-, Eval- und spaetere CLI-Laeufe. | Trainings- und Validate-Lanes booten ueber denselben `run_profile`-, `clock_port`-, `seed_envelope`-, `input_frame`- und `snapshot_envelope`-Vertrag; Reward-, Eval- und Resume-Evidence liest serialisierbare Artefakte statt interaktive Sonderhooks. | `BT73` und `BT80C` haerten ihre festen Matrizen, Replay-Priorisierung und Kandidaten-Validation auf diesem Kernelpfad; neue Trainings-Harnesses duplizieren keinen separaten Matchstart ausserhalb von `SessionRuntime` plus Adapter. |
| Netzwerk / Host-Autoritaet | Kuenftige LAN-/Online-Adapter bleiben ausserhalb des `MatchKernel`; `SessionRuntime` besitzt Transport, Lifecycle, Capability-Gates und uebersetzt Netzwerknachrichten in Kernel-kompatible Huellen. | Host-/Client-Pfade duerfen nur normalisierte `input_frame`-Sequenzen nach innen geben und serialisierbare `snapshot_envelope`-/`gameStateSnapshot`-Daten nach aussen spiegeln. | `V64` baut Matchstart, Reconciliation und Disconnect auf demselben Kernelvertrag auf; Transportcode greift weder direkt auf Renderer noch auf UI- oder Entity-Interna zu. |

### 4.6.3 Headless-Boot, GameMode-API und Runtime-Projektionsvertrag

| Schnitt | Einstiegspunkt / Besitzer | Verbindlicher Ablauf | Freigegebene Outputs fuer Folgearbeit |
| --- | --- | --- | --- |
| Interaktiver Matchstart | `SessionRuntimeCommandExecutor`, `GameRuntimeSessionHandler`, `RuntimeCommandSettingsService` plus `GameRuntimeFacade` | `START_MATCH` laeuft seit `V87 87.2.1/87.3.1` immer ueber `sessionHandler.startMatch()`: derselbe Inflight-Guard wartet nicht-terminale Pending-Finalizes ab, routed `settingsSnapshot` und regulaeres `APPLY_SETTINGS` ueber denselben `RuntimeCommandSettingsService`-Pfad und loest erst danach `matchUiPort.applyStartMatchProjection()` aus. Async-Caller koennen ueber `executeSessionRuntimeCommandResult()` einen expliziten `{ ok, resultStatus, errorMessage }`-Vertrag konsumieren; ungueltige Commands liefern dort jetzt `resultStatus = invalid_command` statt `undefined`, waehrend der rohe `execute()`-Pfad kompatibel bleibt und Rejections intern an einen Catch bindet. | `matchUiPort`, `sessionHandler`, `executeSessionRuntimeCommandResult()`, `getPorts()`; Folgeblocks haengen neue Startlogik an Runtime-Commands statt an direkte `game`- oder UI-Zugriffe. |
| Interaktive Kernel-Bindung | `MatchSessionRuntimeBridge.applyInitializedMatchSession()` | Nach erfolgreichem Session-Boot werden `matchKernel`, `matchKernelAdapter` und `matchKernelConsumers` als Runtime-Handles gesetzt. `playingStateSystem` bekommt nur den interaktiven Adapter; Replay-, Training- und Netzwerk-Leser laufen ueber dieselbe Consumer-Registry. | `getCurrentMatchKernel()`, `getCurrentMatchKernelConsumer()`, `getCurrentMatchKernelConsumers().getDescriptors()` als lesbare Vertragskante fuer Debug-, Replay- und Folgeadapter. |
| Headless-Boot | `createHeadlessMatchKernelRuntime()` | Headless-Laeufe erzeugen Session und Kernel ueber `createHeadlessMatchKernelRunProfile()`, booten denselben `MatchKernel` und geben nur `step()`, `signalRoundEnd()`, `signalMatchEnd()`, `restartRound()` und `dispose()` frei. Der headless Renderer bleibt Stub; UI-, DOM- und Plattformobjekte gehoeren nicht in diesen Pfad. | `getConsumerAdapter()` und `getConsumerDescriptors()` liefern denselben Consumer-Vertrag wie interaktive Laeufe; Headless darf im Gegensatz zur interaktiven Runtime den Kernel direkt ticken. |

| GameMode-Hook | Vertrag | Zweck | Guardrail fuer Folgearbeit |
| --- | --- | --- | --- |
| `bootstrap(context)` | `GameModeContract` | initialisiert modus-spezifischen State nach Kernel-Boot und vor dem ersten produktiven Tick | kein DOM, kein UI-Controller, keine Renderer- oder Plattform-Objekte im Hook-Kontext |
| `computeRoundResult(players, context)` | `GameModeContract` | erzeugt die serialisierbare Round-Zusammenfassung fuer Kernel-/SessionRuntime-Ausgabe | Ergebnis bleibt Plain Object; keine versteckten Side Effects fuer HUD, Recorder oder Transport |
| `computeMatchResult(players, roundResults, context)` | `GameModeContract` | verdichtet Round-Ergebnisse zum Match-Ergebnis fuer Runtime-, Replay- und Persistenzpfade | Sieger-, Score- und Summary-Logik bleibt am Modusvertrag statt in UI- oder Port-Sonderfaellen |
| `cleanup(context)` | `GameModeContract` | gibt modus-spezifischen State vor Kernel-Dispose frei | Cleanup laeuft vor Adapter-/Renderer-Dispose und ist der einzige zulaessige Exit-Hook auf Modusebene |

| Snapshot-/Projektionspfad | Besitzer | Erwarteter Payload | Leser |
| --- | --- | --- | --- |
| `interactive` Consumer | `MatchKernelConsumerRegistry` | `snapshotTarget = projection`, optional `runtimeProjection`, kein direkter Kernel-Tick im interaktiven Runtime-Besitz | HUD, Match-UI, Renderports und Recorder-Overlays lesen Projektionen ueber Runtime-Ports statt ueber `EntityManager` |
| `replay` Consumer | `MatchKernelConsumerRegistry` | `snapshotTarget = checkpoint`, serialisierbare Session-/GameState-Snapshots fuer Playback und Ghosts | Replay- und Persistenzpfade aus `V85` oder `V82` |
| `training` Consumer | `MatchKernelConsumerRegistry` | `snapshotTarget = observability`, deterministische Input-/Snapshot-Huellen fuer Reward, Eval und Benchmark | Trainings- und Validate-Pipelines |
| `network` Consumer | `MatchKernelConsumerRegistry` | `snapshotTarget = transport`, serialisierbare Payloads fuer kuenftige Host-/Client-Projektion | `V64` Transport, Reconciliation und Disconnect-Handling |

- Runtime-Projektionsregel:
  - `buildMatchRuntimeProjection()` ist der einzige freigegebene Builder fuer HUD-, MatchFlow- und andere UI-nahe Runtime-Zusammenfassungen.
  - UI-Controller lesen diese Daten ausschliesslich ueber `GameRuntimePorts.matchUiPort.getMatchRuntimeProjection()` oder weitergereichte UI-Ports.
  - Folgeblocks erweitern Projektionen und Snapshot-Envelopes ueber Contracts und Consumer-Deskriptoren, nicht ueber neue Direktzugriffe auf `game`, `EntityManager`, `Arena` oder Modusinstanzen.

### 4.6.4 Runtime-Hardening-Inventar fuer V87

| V87-Stream | Review-Punkte nach Abgleich 2026-04-05 | Aktuelle Besitzerpfade | Geplanter Zielpfad |
| --- | --- | --- | --- |
| Lifecycle und Finalize | `P4` und `P11` sind seit `87.2.2` gehaertet; `P1` ist im Ist-Stand bereits guardiert und bleibt nur als dokumentierter Review-Hinweis bestehen | `MatchLifecycleSessionOrchestrator`, `GameRuntimeSessionHandler`, angrenzend `GameRuntimeFacade` fuer Return-/Dispose-Wiring | `87.2.1`, `87.2.2` und der nachgezogene Verbrauchssync aus `87.5.1` sind abgeschlossen: Start-/Session-/Finalize-Rennen, error-gelatchte Snapshots, awaitbares Dispose und dokumentierte Folgeleitplanken stehen; Restarbeit im Gesamtblock liegt nur noch bei `87.99` |
| Commands und Capabilities | `P8`, `P10` und `P15` sind seit `87.3.1/87.3.2` gehaertet | `SessionRuntimeCommandExecutor`, `RuntimeCommandSettingsService`, `GameRuntimeFacade`, `ElectronPlatformBridge`, Browser-/Capability-Ports an der Runtime-Fassade | `87.3.1`, `87.3.2` und der nachgezogene Verbrauchssync aus `87.5.1` sind abgeschlossen: Settings-/Snapshot-Semantik, Async-Command-Errors, explizite Invalid-Command-Results, wahrheitsgetreue Capability-Verfuegbarkeit und die Folgeleitplanken fuer V64/V75 sind verankert; Restarbeit im Gesamtblock liegt nur noch bei `87.99` |
| UI-, Pause- und State-Uebergaenge | `P2`, `P9`, `P16` und `P20` sind seit `87.4.1/87.4.2` gehaertet | `MatchFlowUiController`, `PauseOverlayController`, `SessionRuntimeStateMachine`, `SessionRuntimeObservability` | `87.4.1`, `87.4.2` und der nachgezogene Verbrauchssync aus `87.5.1` sind abgeschlossen: atomare Start-/Pause-Intents, expliziter `FINALIZING -> match_finalized -> menu_opened`-Abschluss, bounded Observability und konsumierbare Folgeleitplanken stehen; Restarbeit im Gesamtblock liegt nur noch bei `87.99` |

#### 4.6.4.1 Ownership- und Sunset-Matrix (V87 87.1.2)

| Review-Punkt | Zielmodul | Besitzerpfad | Sunset-Kriterium |
| --- | --- | --- | --- |
| `P2` | Atomarer Start-Match-Intent-Guard um `applyStartMatchProjection()` | `src/ui/MatchFlowUiController.js` | Doppelte `applyStartMatchProjection()`-Aufrufe teilen sich denselben Inflight-Guard vor `_startMatchInternal()`; kein zweiter Startpfad kann zwischen Guard-Check und Promise-Assignment durchrutschen. |
| `P4` | Dispose-/Finalize-Handshake fuer `GameRuntimeSessionHandler.dispose()` | `src/core/runtime/GameRuntimeSessionHandler.js` | `dispose()` gibt einen beobachtbaren oder awaitbaren Finalize-Abschluss zurueck und raeumt Menu-Refs erst nach terminalem Finalize-Result oder explizit gelatchtem Fehlerzustand ab. |
| `P8` | Autoritativer Settings-Snapshot fuer `START_MATCH` und `APPLY_SETTINGS` | `src/application/session-runtime/SessionRuntimeCommandExecutor.js` | Matchstart und Settings-Aenderungen nutzen denselben autoritativen Apply-Pfad; `START_MATCH(settingsSnapshot)` mutiert Runtime-Settings nicht mehr implizit an einem zweiten Ort. |
| `P9` | Pause-Intent-Revalidierung fuer Resume und Return-to-Menu | `src/ui/PauseOverlayController.js` | Resume- und Return-Intents pruefen den aktuellen Pause-/Lifecycle-Snapshot direkt vor Ausfuehrung erneut und ignorieren stale Mehrfachklicks deterministisch. |
| `P10` | Wahrheitsgetreuer Capability-Descriptor pro Electron-Adapter | `src/platform/electron/ElectronPlatformBridge.js` | `available`, Intent-Funktionen und `degradedReason` werden aus derselben Invoke-Basis abgeleitet; kein Descriptor darf `available: true` melden, wenn der zugehoerige Intent `null` ist. |
| `P11` | Finalize-Fehlerlatch in `finalizeMatchSession()` | `src/state/MatchLifecycleSessionOrchestrator.js` | Ein Finalize-Fehler bleibt ueber Snapshot, Event oder Guard sichtbar, bis ein definierter Reset folgt; `_pendingFinalize` oder ein Nachfolger-Guard verschwindet nicht mehr lautlos im `finally`. |
| `P15` | Command-Result-/Catch-Vertrag fuer asynchrone Runtime-Commands | `src/application/session-runtime/SessionRuntimeCommandExecutor.js` | Jeder Promise-basierte Command endet in einem explizit konsumierbaren Success-/Error-Vertrag; nach Observability-Logging bleiben keine ungebundenen Rejections an UI- oder Facade-Callsites uebrig. |
| `P16` | FINALIZING-Transition-Guard im State-Machine-Contract | `src/shared/contracts/SessionRuntimeStateMachine.js` | Direkte `FINALIZING -> MENU`-Rueckgaenge sind nur noch ueber einen expliziten `match_finalized`/`menu_opened`-Abschluss erlaubt oder komplett verboten; Cleanup kann nicht per Lifecycle-Sprung umgangen werden. |
| `P20` | Bounded Event-History im Observability-Store | `src/shared/runtime/SessionRuntimeObservability.js` | Die Event-History bleibt auf `SESSION_RUNTIME_OBSERVABILITY_HISTORY_LIMIT` begrenzt, ohne per `splice()` auf jedem Append den Hotpath mutierend zu trimmen. |

- Review-Delta 2026-04-05 bis 2026-04-07:
  - `MatchLifecycleSessionOrchestrator.createMatchSession()` vergibt Session-IDs vor dem asynchronen Match-Boot und serialisiert Folge-Initialisierungen ueber `_pendingSessionInit`; deshalb ist `P1` aktuell kein akuter Blocker mehr.
  - Die kanonische Einzelfall-Zuordnung mit Datei-/Commit-Evidence lebt in `docs/plaene/aktiv/V87.md` unter `87.1.1`; die punktgenaue Ownership-/Sunset-Ableitung fuer die Folgephasen ist in `87.1.2` und in `4.6.4.1` gespiegelt.
  - `V87 87.2.1` merged konkurrierende Pending-Finalizes in `MatchLifecycleSessionOrchestrator`, promoted ueberholende `return_to_menu`-/Shutdown-Gruende ueber interne `new_match_session`-Finalizes und blockiert wartende Starts deterministisch, wenn deren Vorbereitungs-Finalize durch einen staerkeren Exit ueberholt wurde.
  - `GameRuntimeSessionHandler.startMatch()` ist jetzt der autoritative Start-Inflight-Guard fuer normale und Snapshot-basierte Starts; `SessionRuntimeCommandExecutor.START_MATCH` fuehrt keinen zweiten Snapshot-Bypass mehr, sondern delegiert denselben Vertrag.
  - `V87 87.2.2` latcht `finalize.errorMessage` in Session-Runtime-Snapshots, blockiert Folgepfade ueber den sichtbaren Error-State, macht `dispose()` awaitbar und unterdrueckt `scheduleMatchPrewarm()` nach fehlgeschlagenem Session-Finalize.
  - `V87 87.3.1` fuehrt `RuntimeCommandSettingsService` als gemeinsamen Apply-Pfad fuer `APPLY_SETTINGS` und `START_MATCH(settingsSnapshot)` ein, entfernt den zweiten Settings-Apply aus `MatchFlowUiController` und ergaenzt `executeSessionRuntimeCommandResult()` plus intern gebundene Rejection-Catches fuer Promise-basierte Commands; ungueltige Commands liefern im Settled-API-Pfad jetzt ebenfalls einen expliziten `invalid_command`-Fehlervertrag.
  - `V87 87.3.2` fuehrt `PlatformCapabilityAdapterSupport` als gemeinsamen Helper fuer Capability-Adapter ein: Electron- und Browser-Adapter leiten `available`, Support-Flags und `degradedReason` jetzt aus derselben Invoke-Basis ab; Browser-Noop-Fallbacks fuer Desktop-only-Capabilities entfallen.
  - `V87 87.4.1` setzt den Start-Inflight-Guard vor die eigentliche Startarbeit und fuehrt fuer Resume sowie `pause_menu_return` denselben `pauseLease`-/Snapshot-Revalidierungsvertrag ein; stale UI-Intents koennen Resume oder Return-to-Menu nicht mehr ueberholen.
  - `V87 87.4.2` entfernt die allgemeine Rueckkante `FINALIZING -> MENU`, haelt Cleanup deterministisch in `finalizing` bis `match_finalized` und trimmt `SessionRuntimeObservability` ueber bounded-copy statt `splice()`.
  - `V87 87.5.1` spiegelt diesen Vertrag in `V64`, `V75` und den Referenzleitplanken: Folgeblocks konsumieren FINALIZING, MENU-Abschluss, Cleanup und Observability nur noch ueber Runtime-Commands, Snapshots, Events und Capability-Ports statt ueber neue Sonderpfade oder Legacy-Backdoors.

#### 4.6.4.2 Verbrauchsleitplanken fuer V64 und V75 (V87 87.5.1)

- `return_to_menu` bleibt fuer Multiplayer- und Recorder-Folgearbeit ein Intent oder Command, kein Direktzugriff auf Menue-, Lobby-, Shell- oder Session-Refs.
- Solange `SessionRuntime` im Lifecycle `finalizing` liegt, reagieren Folgeblocks auf gelatchten `finalizeState` und auf den expliziten Abschluss ueber `match_finalized`; ein sichtbarer Menueabschluss gilt erst nach `menu_opened`.
- Recorder-Settlement, Session-Dispose und Ref-Cleanup teilen dasselbe `finalizing`-Fenster. Weder `V64` noch `V75` fuehren transport-, recorder- oder shell-spezifische Dispose-, Menu-Reopen- oder Cleanup-Sonderpfade ein, die diesen Abschluss ueberspringen.
- Observability bleibt bounded und copy-based im Shared-Store. Folgeblocks konsumieren Runtime-Snapshots oder Runtime-Events statt lokaler unbounded Histories, `splice()`-basierter Shadow-Queues oder aehnlicher Debug-Backdoors.
- Desktop-/Browser-Unterschiede bleiben capability-getrieben: Host-, Discovery-, Save- und Recording-Logik liest `platform_capability_snapshot` oder benannte Adapter-Contracts und fuehrt keine neuen `game.*`, `runtimeFacade.*`, `curviosApp`- oder privaten Shell-Bypaesse ein.

#### 4.6.4.3 Surface-Produktvertrag fuer V77 (`V77 77.1.1`)

- `src/shared/contracts/PlatformCapabilityRegistry.js` ist die kanonische ID-Schicht fuer Produktoberflaechen. `desktop-app` und `browser-demo` sind die einzigen aktuell gueltigen Produktrollen; neue Feature-Arbeit fuehrt keine Parallelbegriffe oder dritte Surface-Rolle ausserhalb dieses Registry-Vertrags ein.
- `desktop-app` ist die bezahlte Vollversion und die autoritative Produktoberflaeche. Sie traegt den produktiven Hauptpfad fuer `single`, `splitscreen`, `lan` und spaeter `online`, inklusive Shell-, Datei-, Export-, Replay-, Editor-, Diagnostics- und Tooling-Faehigkeiten.
- `browser-demo` ist eine kostenlose, bewusst begrenzte Web-Oberflaeche fuer Showcase, Einstieg und kuratierte Demo-Flows. Sie liest dieselben Shared Contracts und Capability-Begriffe, verspricht aber keine Vollversions-Paritaet.
- Fuer `desktop-app` gilt produktisch `default full`: Neue Features sind dort grundsaetzlich erlaubt, solange kein expliziter Capability-, Lifecycle- oder Rollout-Vertrag sie begrenzt.
- Fuer `browser-demo` gilt produktisch `default deny`: Sichtbarkeit, Startbarkeit und CTA-Freigaben muessen ausdruecklich ueber Surface-/Capability-Regeln, Allowlist oder degradierte Demo-Pfade freigegeben werden.
- Host-, Editor-, Datei-, Export- und andere Shell-nahe Produktpfade bleiben primaer Vollversions-Flaechen. Browser-Fallbacks sind nur zulaessig, wenn sie echten Demo-Wert stiften und nicht als Produktiv-Paritaet oder verdeckte Vollversion gelesen werden koennen.
- Dev- und Diagnosezugaenge sind nicht Teil des Produktversprechens: Das hartcodierte Passwort in `src/ui/menu/MenuExpertLoginRuntime.js` ist nur ein lokaler Dev-/UX-Schalter und weder Lizenz- noch Sicherheitsgrenze fuer Demo oder Vollversion.

#### 4.6.4.4 Allowlist-/Denylist-Matrix fuer `desktop-app` und `browser-demo` (`V77 77.1.2`)

| Domaene | `PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP` (`desktop-app`) | `PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO` (`browser-demo`) |
| --- | --- | --- |
| Spiel- und Map-Scope | `default full`: produktive Hauptpfade fuer `single`, `splitscreen`, `lan`, spaeter `online`, plus voller Produkt-Katalog. | `default deny`: nur `Arcade`, ein `Parcours`-Tutorialpfad, `Fight` sowie `Normal` oder `Classic` auf kuratierter Map-Auswahl. Keine freie Map-Wahl, keine Custom-Maps, kein unkuratierter Vollversions-Katalog. |
| Multiplayer-Rolle | `host` und `join`; `desktop-app` bleibt die autoritative Host-Oberflaeche. | `join only`; kein `host`, kein Session-Besitz, keine Lobby-Erstellung und keine Browser-Host-Paritaet. |
| `PLATFORM_CAPABILITY_IDS.DISCOVERY` | Produktiv verfuegbar ueber `PLATFORM_PROVIDER_KINDS.ELECTRON_IPC`. | Nur fuer Demo-geeignete Discovery- und `join only`-Einstiege ueber `PLATFORM_PROVIDER_KINDS.BROWSER_DEMO`; darf keinen Host-Besitz andeuten. |
| `PLATFORM_CAPABILITY_IDS.HOST` | Produktiv verfuegbar ueber `PLATFORM_PROVIDER_KINDS.ELECTRON_IPC`. | Produktisch denylisted. Bis `V77 77.2` gilt jeder Browser-Host-Hinweis nur als `nicht verfuegbar` oder `join only`, auch wenn die aktuelle Registry den Provider-Kind noch nicht als explizit unavailable modelliert. |
| `PLATFORM_CAPABILITY_IDS.SAVE` / `PLATFORM_CAPABILITY_IDS.RECORDING` | Desktop-Hauptpfad ueber `PLATFORM_PROVIDER_KINDS.ELECTRON_IPC` bzw. `PLATFORM_PROVIDER_KINDS.ELECTRON_RENDERER`. | Keine produktische Save- oder Recording-Freigabe; spaetere Browser-Fallbacks sind nur als explizit degradierte Demo-Pfade ueber `PLATFORM_PROVIDER_KINDS.BROWSER_DOWNLOAD` bzw. `PLATFORM_PROVIDER_KINDS.BROWSER_NATIVE` zulaessig. |
| Editoren, Tooling, Diagnostics, Dev-Zugaenge | Vollversions- oder lokale Dev-Flaechen; nicht als Sicherheitsgrenze kommunizieren. | Ausserhalb des Demo-Scope; `MenuExpertLoginRuntime` und aehnliche Schalter sind weder Demo-Feature noch Sicherheits- oder Lizenzbarriere. |

- Alles, was fuer `browser-demo` nicht explizit in der Matrix freigegeben ist, bleibt denylisted.
- `V64`, `V75` und `V76` konsumieren dieselbe Matrix fuer Host-/Join-, Save-/Export-, Recording- und Editor-Entscheide, statt neue Surface-Begriffe einzufuehren.

#### 4.6.4.5 Terminologie-Normierung fuer UI- und Doku-Sprache (`V77 77.1.3`)

| Begriff fuer UI und Doku | Kanonische Zuordnung | Normierte Verwendung |
| --- | --- | --- |
| `Demo` | `PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO` (`browser-demo`) | `Demo` bleibt das kurze UI-Label fuer die kostenlose Web-Oberflaeche. In Architektur- und Folgeblock-Doku steht bei der ersten Nennung immer `browser-demo`; `Demo` ist danach nur Kurzform derselben Surface. |
| `Nur Desktop` | `PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP` (`desktop-app`) | `Nur Desktop` ist die nutzernahe UI-Bezeichnung fuer Vollversions-Features. In Plan- und Architekturtexten beschreibt dieselbe Grenze `desktop-only` bzw. `desktop-app only`; gemeint ist immer die autoritative Vollversions-Surface und kein allgemeiner Plattform-Hinweis. |
| `Join only` | `browser-demo` ohne `PLATFORM_CAPABILITY_IDS.HOST` | `Join only` ist die feste Rollenbezeichnung fuer Demo-Multiplayer: Beitritt darf explizit erlaubt sein, Host-Besitz, Lobby-Erstellung und Session-Ownership bleiben ausgeschlossen. |
| `Host` | `PLATFORM_CAPABILITY_IDS.HOST` und Session-Besitz | `Host` bezeichnet nur Hosting, Lobby-Erstellung und die autoritative Multiplayer-Rolle. Der Begriff ersetzt nicht `discovery` oder `join`, und `browser-demo` fuehrt `Host` nicht als Produktversprechen, solange keine spaetere Freigabe das explizit aendert. |
| `Nicht verfuegbar` | `available: false` und bevorzugt `PLATFORM_PROVIDER_KINDS.UNAVAILABLE` | `Nicht verfuegbar` ist die kanonische Aussage fuer aktuell nicht nutzbare Surface-Funktionen. Wo der Capability-Layer es bereits ausdrueckt, spiegelt die Doku denselben Zustand ueber `available: false` und `PLATFORM_PROVIDER_KINDS.UNAVAILABLE`; dieselbe Semantik gilt bis `V77 77.2` auch fuer Browser-Host-Hinweise, selbst wenn die aktuelle Registry den Provider-Kind dort noch nicht explizit als `unavailable` modelliert. |

- Surface-Doku nennt zuerst `desktop-app` oder `browser-demo` und leitet daraus UI-Labels wie `Demo` oder `Nur Desktop` ab.
- Browser-Join-Grenzen verwenden bevorzugt `Join only`; freie Umschreibungen gelten nicht als eigener Vertragsbegriff.
- Produktisch denylistete Demo-Funktionen erscheinen als `Nicht verfuegbar` oder `Nur Desktop`, nicht als Sicherheitsbarriere, versteckter Unlock oder stilles Vollversionsversprechen.

#### 4.6.4.6 Zentraler Surface-Policy-Vertrag (`V77 77.2.1`)

- `src/shared/contracts/PlatformCapabilityRegistry.js` fuehrt pro Produktrolle einen expliziten `surfacePolicy`-Block (`defaultAccessMode`, `multiplayerRole`, `allowedGameModes`, `requiresCuratedMaps`) und exportiert den konsumierbaren Resolver `resolveSurfacePolicy()`.
- `desktop-app` bleibt im Vertrag `default-full` mit Rolle `host-and-join`; `browser-demo` bleibt `default-deny` mit Rolle `join-only` und kuratiertem Map-/Mode-Scope.
- Browser-`HOST` ist im Registry-Providervertrag explizit als deaktivierter Capability-Pfad modelliert (`enabled: false`) und wird dadurch deterministisch auf `PLATFORM_PROVIDER_KINDS.UNAVAILABLE` aufgeloest; der zuvor nur dokumentierte `Nicht verfuegbar`-Pfad bleibt damit technisch und dokumentarisch deckungsgleich.
- `tests/platform-capabilities.contract.test.mjs` prueft den Surface-Policy-Resolver sowie die Browser-`HOST`-Aufloesung, damit Folgearbeit denselben Vertragskern nutzt statt neue Ad-hoc-Flags einzufuehren.

#### 4.6.4.7 Surface-Capability-Verbrauch und Default-Regel (`V77 77.2.2` / `77.2.3`)

- Menue-, Discovery-, Host-IP-, Recording- und Replay-Gates lesen denselben Resolver `resolveSurfaceCapabilityAccess()` statt separater Runtime-/Umgebungspruefungen (`MenuRuntimeFeatureFlags`, `MenuMultiplayerDiscoveryPort`, `MenuMultiplayerHostIpResolver`, `DownloadService`, `ReplayRecorder`).
- `resolveSurfaceCapabilityAccess()` unterscheidet explizite Capability-Mappings von policy-basierten Fallbacks: explizite Eintraege (z. B. Browser-`SAVE`) bleiben Opt-in, deaktivierte Eintraege (z. B. Browser-`HOST` mit `enabled: false`) bleiben hart denylisted.
- Fuer unbekannte Capabilities greift jetzt dieselbe Surface-Regel zentral: `desktop-app` erbt `default-full`, `browser-demo` erbt `default-deny`; das Ergebnis wird als `resolvedByDefaultPolicy` markiert, damit Folgearbeit Default-Freigaben gegen explizite Provider-Mappings trennen kann.

#### 4.6.4.8 Dev-only-Surface-Vertrag fuer Expert-, Debug- und Trainingspfade (`V77 77.2.4`)

- `src/shared/contracts/PlatformCapabilityRegistry.js` fuehrt mit `resolveSurfaceDeveloperAccess()` eine zweite, explizit produktnahe Lesekante neben den Capability-Resolvern ein. Sie beschreibt den Zugang zu lokalen Dev-/Diagnosepfaden, ohne daraus eine Feature-, Lizenz- oder Sicherheitsaussage fuer die Produktoberflaeche abzuleiten.
- `desktop-app` fuehrt den Expert-/Developer-Zugang bewusst als lokalen Diagnosepfad ausserhalb des Vollversions-Versprechens. Auch dort gilt: Der Schalter ist kein Verkaufsargument und keine Sicherheitsgrenze, sondern nur lokaler Dev-/UX-Zugang.
- `browser-demo` fuehrt denselben Zugang ebenfalls nur lokal-diagnostisch. Die kanonische Botschaft lautet jetzt explizit: kein Demo-Unlock, keine Lizenzgrenze, keine Sicherheitsbarriere.
- `src/ui/menu/MenuExpertLoginRuntime.js`, `src/ui/menu/MenuAccessPolicy.js`, `src/ui/UINavigationLifecycleController.js` und `src/ui/menu/MenuDeveloperStateSync.js` konsumieren dieselbe Surface-Semantik produktiv. Expert-/Developer-/Debug-Flows lesen damit denselben Vertrag wie spaetere Dev-only-Schalter, statt freie Texte oder Surface-Sonderfaelle aufzubauen.

#### 4.6.4.9 Einheitlicher UX-Pfad fuer deaktivierte Demo-Funktionen (`V77 77.3.2`)

- `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `resolveSurfaceBlockedFeatureFeedback()` einen kleinen, zentralen UX-Vertrag fuer gesperrte Surface-Aktionen ein: `reason: surface_policy_blocked`, `tone: warning`, `durationMs: 1600` plus surface-spezifische Meldung (`... in dieser Demo ...` vs `... in dieser Surface ...`).
- `src/core/runtime/MenuRuntimeSessionService.js` nutzt denselben Resolver fuer gesperrte Mode- und Quickstart-Aktionen (`Direktstart`, `Event-Playlist`, `Random-Start`), statt getrennte Ad-hoc-Texte zu pflegen.
- `src/core/runtime/MenuRuntimePresetConfigService.js` nutzt denselben Resolver fuer gesperrte Preset-Aktionen; Preset- und Quickstart-Pfade bleiben damit textlich und tonal deckungsgleich.
- `tests/platform-capabilities.contract.test.mjs` verifiziert den gemeinsamen Feedback-Vertrag fuer Browser-Demo und Desktop-Surface, damit Folgearbeit neue Sperrpfade auf denselben UX-Standard zieht.

#### 4.6.4.10 Explizite Einstiegsschnitte fuer Showcase, Join-only und Desktop-Host (`V77 77.3.3`)

- `src/shared/contracts/PlatformCapabilityRegistry.js` erweitert den Surface-Vertrag um `allowedSessionTypes`: `desktop-app` fuehrt `single`, `multiplayer` und `splitscreen`, `browser-demo` bleibt bewusst auf `single` plus `multiplayer`.
- `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `resolveSurfaceEntryCopy()` den kleinen UI-Vertrag fuer Einstiege zusammen: Session-Labels, Start-CTA, Lobby-Titel, Host-/Join-Buttons, Status-Texte und Placeholder lesen denselben Surface-Schnitt statt verstreuter Demo-Sondertexte.
- `browser-demo` kommuniziert denselben Einstieg jetzt explizit als kuratierten `Showcase`-Pfad fuer Offline-Solo und als `Join only` fuer Multiplayer; `Host` bleibt sichtbar als `Nur Desktop`, nicht als versteckter, degradiert-paritaetischer Browser-Host.
- `src/ui/menu/MenuSurfacePolicyUiSync.js`, `src/ui/UIManager.js` und `src/ui/UIStartSyncController.js` konsumieren denselben Einstiegstextvertrag produktiv. Session-Umschalter, Summary, Start-Button und Lobby-UI bleiben damit zwischen Browser und Desktop deckungsgleich zum Shared Surface-Contract.
- `src/core/runtime/MenuRuntimeSessionService.js` faellt disallowte Session-Einstiege sichtbar auf den Surface-Fallback zurueck, und `src/core/runtime/MatchStartValidationService.js` benennt Browser-Multiplayer explizit als Desktop-Host-Join-Pfad statt als generischen Host-/Join-CTA.
- `tests/platform-capabilities.contract.test.mjs` und `tests/core-targeted-runtime.spec.js` pruefen denselben Einstiegsschnitt fuer Folgearbeit, damit spaetere Surface-Features keine neuen Ad-hoc-Labels oder impliziten Browser-Host-Hinweise einfuehren.

#### 4.6.4.11 Surface-Transportmatrix als V64-Vorvertrag (`V77 77.4.1`)

- `src/shared/contracts/PlatformCapabilityRegistry.js` fuehrt fuer `desktop-app` und `browser-demo` jetzt explizite Multiplayer-Transportfelder im `surfacePolicy`: `defaultMultiplayerTransport`, `allowedMultiplayerTransports`, `hostMultiplayerTransports`, `joinMultiplayerTransports` und `legacyMultiplayerTransports`.
- `desktop-app` bleibt produktisch auf echten V64-Transporten `lan` und spaeter `online`; der gemeinsame Default bleibt `lan`, und Host oder Join duerfen auf beiden Pfaden liegen.
- `browser-demo` koppelt denselben Transportvertrag bewusst an die Produktrolle `join only`: Produktisch freigegeben bleibt nur `lan` als Join-Pfad zu einer Desktop-Lobby; `storage-bridge` ist nur noch als expliziter Legacy-Eintrag dokumentiert und nicht mehr der implizite Surface-Default.
- `resolveDefaultLobbyTransport()` und `MenuRuntimeMultiplayerService` lesen diese Matrix produktiv fuer neue Multiplayer-Defaults und Snapshot-Fallbacks, damit V64-Folgearbeit nicht erneut ueber einen browserinternen Behelfsweg startet, wenn fachlich echter Multiplayer gemeint ist.
- `docs/plaene/aktiv/V64.md` referenziert denselben Vorvertrag jetzt explizit; Produkt-, Session- und Transportarbeit in `V64` baut auf dieser Surface-Matrix auf, statt eine parallele Host-/Join-/Transport-Terminologie einzufuehren.

#### 4.6.4.12 Expliziter Surface-Migrationspfad statt UI-Seiteneffekten (`V77 77.4.4`)

- `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `resolveSurfaceMenuState()` einen reinen Resolver fuer Demo-Fallbacks ein: `sessionType`, `modePath` und kuratierte `mapKey`-Defaults werden zentral berechnet, ohne dabei Settings zu mutieren.
- `applySurfaceMenuState()` bleibt derselbe Resolver als expliziter Runtime-Mutationspfad. Folgearbeit darf Surface-Fallbacks damit nur bewusst im Runtime- oder Session-Start anwenden, nicht mehr nebenbei im UI-Sync.
- `src/ui/menu/MenuSurfacePolicyUiSync.js`, `src/ui/UIManager.js` und `src/ui/UIStartSyncController.js` lesen diese Surface-Matrix jetzt ausschliesslich fuer Labels, Button-Sichtbarkeit, Summary, Lobbytexte und kuratierte Select-Optionen. Versteckte Nutzerpraeferenz-Mutationen ueber `sync*`-Methoden sind dort nicht mehr zulaessig.
- `src/core/runtime/GameRuntimeSettingsHandler.js` fuehrt `applySurfacePolicyStartDefaults()` als expliziten Session-Start-Pfad ein. Vor Matchstart werden unzulaessige Browser-Demo-Zustaende wie `splitscreen`, `quick_action` oder nicht kuratierte Maps bewusst auf erlaubte Surface-Werte migriert und anschliessend ueber die bestehenden Compatibility-Regeln nachgezogen.
- `src/core/runtime/GameRuntimeSessionHandler.js` ruft diesen Pfad direkt vor Telemetrie und Start-Validierung auf, sodass Matchstart, Runtime-Snapshot und UI denselben effektiven Surface-Zustand lesen.
- `tests/platform-capabilities.contract.test.mjs` und `tests/core-targeted-runtime.spec.js` pruefen sowohl den reinen Resolver als auch den expliziten Startpfad, damit spaetere Surface-Arbeit keine stillen UI-Nebenwirkungen zurueckschiebt.

#### 4.6.4.13 Surface-Klassen fuer Export-, Datei- und Tooling-Pfade (`V77 77.5.1`)

- `src/shared/contracts/PlatformSurfacePolicyOps.js` fuehrt mit `PLATFORM_SURFACE_FEATURE_IDS`, `PLATFORM_SURFACE_FEATURE_CLASSIFICATIONS` und `resolveSurfaceFeatureClassification()` den zentralen Klassifizierungsvertrag fuer Replay, Video-Export, Dateioperationen, Diagnostics und Tooling ein.
- Der Vertrag trennt produktive und degradierte Surface-Pfade explizit: `replay-export` ist in `browser-demo` `demo-safe`, `video-export`/`diagnostics` bleiben dort `future opt-in`, `file-io` bleibt `desktop-only`, und Tooling bleibt als lokaler Dev-/Diagnosepfad unter `legacy`.
- `src/core/replay/ReplayRecorder.js` konsumiert die Replay-Klassifizierung direkt und erlaubt Browser-Persistenz nur ueber den expliziten `demo-safe`-Pfad, statt impliziter Save-Availability-Paritaet.
- `src/core/recording/DownloadService.js` haengt die Video-Klassifizierung als `surfaceClassification` in den strukturierten Export-Status und blockiert Browser-Demo-Exports jetzt frueh ueber `surface_policy_blocked`, solange `video-export` nicht explizit `demo-safe` ist; Disk-API- und Browser-Download-Fallbacks bleiben damit ausserhalb des aktiven Demo-Korridors.
- `map-editor` und `vehicle-editor` sind im selben Vertrag jetzt explizit `desktop-only`; `src/ui/menu/MenuSurfacePolicyUiSync.js` markiert beide Menue-Buttons in `browser-demo` sichtbar als `Nur Desktop`, und `src/ui/menu/MenuGameplayBindings.js` blockiert direkte `window.open(...)`-Starts ueber dieselbe Surface-Botschaft statt stiller Browser-Opens.
- `tests/platform-capabilities.contract.test.mjs` haelt die Klassifizierungs-Matrix als Contract fest und schuetzt den Browser-Demo-Fallback zusaetzlich gegen nicht-kuratierte Map-Ausweichpfade.

#### 4.6.4.14 Folgeblock-Spiegelvertrag fuer V64, V75 und V76 (`V77 77.6.1`)

- `V64` konsumiert fuer Multiplayer denselben Surface-Layer wie V77: Produktrollen und Host-/Join-Gates kommen aus `resolveSurfacePolicy` und `resolveSurfaceMultiplayerGateAccess`; `browser-demo` bleibt `join-only`, ohne Browser-Host-Paritaet.
- `V75` konsumiert fuer Recorder-Exports denselben Klassifizierungsvertrag: `video-export` bleibt in der Demo `future opt-in`; Browser-Fallbacks bleiben bis zu einem expliziten Demo-Mehrwert bewusst gesperrt.
- `V76` konsumiert denselben Authoring-Vertrag: `map-editor` und `vehicle-editor` bleiben `desktop-only`; Hangar-/Werkstatt-Folgearbeit fuehrt keine browserseitigen `window.open(...)`-Paritaetspfade fuer Authoring ein.
- Folgeblocks duerfen keine zweite Produktsprache neben `desktop-app` und `browser-demo` einfuehren; neue CTA-, Capability- und Fallback-Entscheide laufen ueber denselben Surface-Vertrag statt ueber blocklokale Sonderbegriffe.

#### 4.6.4.15 Entscheidungsraster fuer neue Features (`V77 77.6.2`)

Jedes neue Feature durchlaeuft dieselben drei Fragen, bevor es in Code oder Plan landet:

**1. Ist das Feature gameplay-nah oder shell-nah?**
- Gameplay-nah (Spielmodus, Map-Mechanic, Kollision, Powerup, HUD): Kein Feature-ID-Eintrag noetig; das Feature folgt der Mode-/Preset-Allowlist des Surface-Policy-Vertrags (`isSurfaceModePathAllowed`, `isSurfacePresetAllowed`) und braucht keinen eigenen Klassifizierungsknoten.
- Shell-nah (Export, Datei-I/O, Editor, Diagnostics, Tooling, Recorder, externe API): Feature-ID in `PLATFORM_SURFACE_FEATURE_IDS` registrieren und `resolveSurfaceFeatureClassification()` konsumieren.

**2. Wie ist das Feature fuer `browser-demo` einzustufen?**

| Klassifizierung | Bedeutung | Typische Beispiele |
| --- | --- | --- |
| `desktop-only` | Funktion ist ausschliesslich Vollversions-Flaeche; Browser-Demo zeigt `Nur Desktop`. | Map-Editor, Vehicle-Editor, Datei-I/O, Shell-nahe Tooling-Pfade |
| `demo-safe` | Funktion ist in der Demo ausdruecklich freigegeben, ggf. in degradierter Form. | Replay-JSON-Download (begrenzt), kuratierter Tutorial-Parcours |
| `future opt-in` | Funktion ist noch nicht freigegeben; expliziter Opt-in-Schritt noetig, bevor sie in der Demo erscheint. | Video-Export, Demo-Diagnostics, externe Service-Integrationen |
| `legacy` | Funktion existiert als lokaler Dev- oder Diagnosepfad, kein Produktversprechen. | Tooling-Schalter, Debug-Overlays, lokale Dev-Konsole |

Faustregel: Wenn unklar, startet jede neue Shell-/Export-Funktion als `future opt-in`. Das verhindert stilles Demo-Scope-Creep, ohne den Vollversions-Pfad zu sperren.

**3. Welchen Resolver nutzt der Consumer?**

| Anwendungsfall | Empfohlener Resolver |
| --- | --- |
| Modus, Session-Typ oder Map erlaubt? | `isSurfaceModePathAllowed`, `isSurfaceSessionTypeAllowed`, `isSurfaceMapKeyAllowedForModePath` |
| Shell-nahe Feature (Editor, Export, Diagnostics) erlaubt? | `resolveSurfaceFeatureClassification` + `resolveSurfaceFeatureLaunchGuard` |
| Multiplayer-Rolle (Host, Join, Discovery)? | `resolveSurfaceMultiplayerGateAccess` |
| UX-Feedback fuer gesperrte Demo-Funktion | `resolveSurfaceBlockedFeatureFeedback` |
| Vollstaendigen Surface-Policy-Snapshot lesen | `resolveSurfacePolicy` |
| Developer-/Diagnose-Zugang pruefen | `resolveSurfaceDeveloperAccess` |

- Keiner dieser Resolver darf durch blocklokale `if (isDesktop)` / `if (isBrowser)` Pruefungen ersetzt werden; Folgearbeit liest denselben Shared-Contract-Layer.
- Neue Feature-IDs werden in `src/shared/contracts/PlatformSurfacePolicyOps.js` unter `PLATFORM_SURFACE_FEATURE_IDS` eingetragen und mit einer Klassifizierung in `resolveSurfaceFeatureClassification()` versehen.
- `tests/platform-capabilities.contract.test.mjs` haelt die Klassifizierungs-Matrix als Contract; neue Feature-IDs erhalten dort einen Testfall.

#### 4.6.4.16 Surface-Leseweg fuer neue Feature-Arbeit (`V77 77.6.4`)

Der vollstaendige Leseweg fuer neue Feature-Arbeit unter dem Surface-Policy-Vertrag:

1. **Policy lesen**: `resolveSurfacePolicy({ productSurfaceId })` liefert `defaultAccessMode`, `multiplayerRole`, `allowedModePaths`, `allowedSessionTypes`, `requiresCuratedMaps` und Transportfelder. Dies ist der Ausgangspunkt fuer alle Surface-Entscheide.
2. **Capability pruefen**: `resolveSurfaceCapabilityAccess(capabilityId, { productSurfaceId })` prueft ob eine Plattform-Capability (`HOST`, `DISCOVERY`, `SAVE`, `RECORDING`) verfuegbar ist. Unbekannte Capabilities folgen automatisch `default-full` fuer Desktop und `default-deny` fuer Browser.
3. **Feature klassifizieren**: Shell-nahe Features (`PLATFORM_SURFACE_FEATURE_IDS`) werden ueber `resolveSurfaceFeatureClassification(featureId, { productSurfaceId })` eingestuft. Der Launch-Guard `resolveSurfaceFeatureLaunchGuard(surfacePolicy, featureId, featureLabel)` liefert `{ allowed, message, tone, durationMs }` direkt als UX-Entscheidungsgrundlage.
4. **UX-Feedback erzeugen**: Gesperrte Aktionen melden sich ueber `resolveSurfaceBlockedFeatureFeedback(featureLabel, { productSurfaceId })` mit einheitlichem `reason: surface_policy_blocked`, `tone: warning`, `durationMs: 1600`.
5. **Multiplayer-Rollen absichern**: `resolveSurfaceMultiplayerGateAccess(action, { productSurfaceId })` prueft `host`, `join` und `discover` gegen die Transportmatrix und die Capability-Availability.
6. **Fallbacks und Defaults**: `resolveSurfaceFallbackModePath`, `resolveSurfaceFallbackSessionType` und `resolveSurfaceMenuState` liefern sichere Startwerte, die den Demo-Korridor einhalten.
7. **Dev-Pfade trennen**: `resolveSurfaceDeveloperAccess({ productSurfaceId })` markiert lokale Dev-/Diagnosepfade explizit. Kein Consumer darf Dev-Zugaenge als Produktversprechen, Sicherheitsbarriere oder Demo-Unlock kommunizieren.

Architekturprinzip: Alle Surface-Entscheide laufen ueber die obigen Resolver aus `PlatformCapabilityRegistry.js` und `PlatformSurfacePolicyOps.js`. Code, der stattdessen auf `__APP_MODE__`, `window.curviosApp.isApp` oder freie `env`-Flags prueft, um Surface-Logik zu steuern, stellt einen Guard-Bruch dar und ist in Folgearbeit durch den richtigen Resolver zu ersetzen.

#### 4.6.4.17 Expert-Login als expliziter Dev-only-Pfad (`V77 77.6.5`)

- `src/ui/menu/MenuExpertLoginRuntime.js` fuehrt `EXPERT_PASSWORD` als lokalen Dev-only-Diagnoseschluessel. Er ist kein Produktfeature, keine Lizenz- und keine Sicherheitsbarriere; er schuetzt keinen produktiven Datenpfad und ist nicht als geheimes Feature-Unlock gedacht.
- `resolveSurfaceDeveloperAccess()` ist der kanonische Vertragspfad, der fuer beide Surfaces denselben lokalen Dev-Charakter ausdrueckt. `MenuExpertLoginRuntime` konsumiert ihn, damit die Surface-Policy die `available`-Aussage steuert, nicht der Passwort-Vergleich allein.
- Der Expert-State (`unlocked`, `available`, `accessMode`, `reason`, `message`, `productSurfaceId`) wird im `MenuExpertLoginRuntime`-Objekt self-contained gehalten; `attachMenuExpertState(settings, state)` ist eine optionale Lookup-Bruecke fuer `MenuAccessPolicy` und andere Consumers, die den State ueber das Settings-Objekt lesen muessen.
- Entscheidung 2026-04-15: Das hartcodierte Passwort bleibt als lokaler Dev-only-Schalter erhalten. Es wird nicht durch einen echten Authentifizierungspfad ersetzt, da es kein Sicherheits- oder Produktversprechen traegt. Folgearbeit, die den Expert-State aus Settings-Anhaengseln befreien moechte, soll `resolveMenuExpertState(settings)` durch einen direkten `MenuExpertLoginRuntime`-Handle-Zugriff ersetzen, sobald der Bootstrap-Kontext es erlaubt.

#### 4.6.4.18 Browser-Demo-Policy-Leseweg und Guardrails (`V98 98.4.3` / `98.5.x`)

- `electron/settings-studio/services/SettingsBrowserDemoPolicyService.cjs` fuehrt den dedizierten Desktop-Writer fuer Demo-Grenzen: Override-Quelle ist `browser-demo-surface-policy.override.json` unter `userData`; der Browser konsumiert nicht direkt aus dieser Datei.
- Der read-only Auslieferungspfad ist das versionierte Build-Artefakt `data/contracts/browser-demo-surface-policy.export.v1.json` (`contractVersion: browser-demo-surface-policy-export.v1`), geschrieben durch das Settings Studio beim Speichern.
- `src/shared/contracts/PlatformCapabilityRegistry.js` liest im Browser den Export-Snapshot nur ueber den zentralen Resolverpfad und merged ihn mit der Basis-Policy aus `PlatformCapabilityData`; Consumer bleiben auf `resolveSurfacePolicy()` und `resolveSurfaceCapabilityAccess()` ohne eigene Override-Sonderzweige.
- Das Merge bleibt monotone Begrenzung: Override-Daten duerfen Session-/Mode-/Preset-/Transport- und Capability-Freigaben nur einschraenken, nie erweitern. Ueberhoehte oder ungueltige Felder werden geclamped oder rejected.
- Fail-safe bleibt verpflichtend: fehlendes, korruptes oder versionsfremdes Export-Artefakt faellt deterministisch auf die Basis-Policy zurueck; der Resolver liefert strukturierte Diagnostics (`status`, `reasonCode`, `migrationCode`, `errorCodes`, `warningCodes`) fuer UI, Tests und Gate-Nachweise.
- Der Desktop-Editor bleibt strikt desktop-only; Browser-Demo bleibt read-only Consumer derselben Shared Contracts. Ein Browser-Schreibpfad fuer Demo-Grenzen ist weiterhin ausgeschlossen.
- Contract-Haertung: `tests/settings-studio-override.contract.test.mjs` deckt UI-/IPC-Pfade fuer Browser-Demo-Section, Save-/Validation-Fehler und Restore-Hygiene; `tests/platform-capabilities.contract.test.mjs` deckt Build-Artefakt-Lesepfad, Fallback und monotones Clamp-Merge im Runtime-Resolver.

### 4.6.5 Persistence-, Export- und Content-Versionierungsleitplanke fuer V85

- Feldkonvention:
  - Persistierte Store-Payloads verwenden `schemaVersion`.
  - Import-/Export-, Transfer- und Snapshot-Huellen verwenden `contractVersion`; bestehende Replay-Huellen mit `version` werden im V85-Migrationsrahmen als kompatible Alt-Schreibweise behandelt.
  - Runtime-, Editor- und Template-Kataloge verwenden kuenftig `descriptorVersion`.
  - Authored Maps bleiben die bewusste Ausnahme und fuehren weiter das numerische `schemaVersion` aus `MAP_SCHEMA_VERSION`.
- Vertragsgrenzen:
  - Store-Key-Suffixe wie `*.v1` markieren primaer die Persistenzfamilie, nicht automatisch die fachliche Payload-Version.
  - Replay-/Recording-Pakete bleiben nur der aeussere Transport-Umschlag; verschachtelte `snapshot_envelope`-, `gameStateSnapshot`-, `simStateSnapshot`- und `runtimeProjection`-Familien behalten ihre eigene Contract-Ownership aus dem MatchKernel-/Consumer-Pfad.
  - Runtime-Map-Presets, Editor-Build-Kataloge und kuenftige Templates werden als ein gemeinsamer Content-Familienbaum behandelt; schema-lose JS-Objekte sind dort nur Migrationsquelle, nicht Zielvertrag.

| Familie | Autoritatives Versionssignal | Architekturregel fuer Folgearbeit |
| --- | --- | --- |
| Settings, Menu-Stores, Arcade-Progress | `schemaVersion` im Payload; bei Settings zusaetzlich inneres `settingsVersion` | Additive Felder laufen ueber Payload-Migrationen; Key-Rollover erst bei echtem Store-Schnitt. |
| Profil- und kuenftige Meta-Transfers | `contractVersion` plus expliziter `artifactType`/Exporttyp | Unbekannte Zukunftsversionen werden nicht still geschluckt; Legacy-Fallbacks brauchen einen dokumentierten Sunset. |
| Replay und Snapshot-Verbrauch | aeusserer Replay-Contract plus innere Snapshot-Vertraege | Keine ad-hoc Replay-Sondershapes ausserhalb von `snapshot_envelope`/Projektionen. |
| Content-Registries fuer Maps, Build-Katalog, Templates | `descriptorVersion` | Runtime, Editor und Import/Export lesen spaeter denselben Descriptor-Vertrag statt separater Sonderlisten. |

#### 4.6.5.1 Kleiner Migrationsrahmen (`V85 85.2.1`)

- `src/shared/contracts/ArtifactVersionMigrationContract.js` ist der gemeinsame Minimalvertrag fuer Load-/Upgrade-/Fallback-/Reject-Entscheide. Der Resolver liefert pro Artefakt genau eine Entscheidung: `current`, `upgrade`, `fallback` oder `reject`.
- Profile-Transfer (`src/ui/ProfileTransferOps.js`) rejectet unbekannte `contractVersion` explizit; huellenlose Legacy-Profile bleiben als bewusst dokumentierter Fallback erhalten.
- Map-Migration (`src/entities/mapSchema/MapSchemaMigrationOps.js`) klassifiziert `schemaVersion` jetzt ueber denselben Resolver: Legacy/fehlende Versionen laufen ueber Fallback, bekannte Altversionen ueber Upgrade, Zukunftsversionen ueber harten Reject.
- Replay-Export (`src/core/replay/ReplayRecorder.js`) schreibt parallel `contractVersion` und die Legacy-Schreibweise `version` (`replay.v1`), damit kuenftige Import-/Migrationspfade additive Umstellung ohne Shape-Bruch fahren koennen.

#### 4.6.5.2 Store- und Preset-Verbrauch auf gemeinsamen Resolver ziehen (`V85 85.2.2`)

- Settings-/Menu-/Arcade-Store-Lesewege (`SettingsStore`, `MenuPresetStore`, `MenuDraftStore`, `MenuTextOverrideStore`, `MenuTelemetryStore`, `ArcadeVehicleProfile`, `VehicleManagerLoadoutPresets`) klassifizieren Persistenzdaten jetzt konsistent ueber `resolveArtifactVersionState()` statt impliziter Shape-Checks.
- Schema-lose oder Legacy-Payloads bleiben lesbar, werden aber beim Laden auf den kanonischen Envelope zurueckgeschrieben (`settings-profiles.v1`, `menu-draft-store.v1`, `menu-text-overrides.v1`, `menu-telemetry.v1`, `arcade-vehicle-loadouts.v1`), damit Folgefeatures nur noch gegen den aktuellen Vertrag schreiben muessen.
- Zukunftsschemata werden nicht still akzeptiert: `ArcadeVehicleProfile` verwirft ungueltige Zukunftseintraege beim Laden und persistiert den bereinigten Bestand erneut.
- Profil-Import rejectet zusaetzlich explizit gesetzte, aber ungueltige `contractVersion`; dadurch kann ein fehlerhafter Envelope nicht mehr als Legacy-Missing-Version durchrutschen.

#### 4.6.5.3 Content-Descriptor-Registries verankern (`V85 85.3.1`)

- `src/shared/contracts/ContentDescriptorContract.js` ist der gemeinsame Descriptor-Rahmen fuer Content-Familien (`content-descriptor.v1`) mit einheitlichem Envelope (`descriptorType`, `source`, `status`, `entries`, `metadata`).
- Runtime-Map-Presets laufen ueber `getRuntimeMapPresetRegistryDescriptor()` aus `RuntimeMapCatalogContract`; dadurch bleiben `runtime-config.MAPS` und abgeleitete Map-Features (Portale, Gates, Missionen, Items, GLB, Parcours) in einem stabilen Registry-Leseweg.
- Der editornahe Build-Katalog exportiert denselben Envelope (`getEditorBuildCatalogDescriptor()`), waehrend `getEditorTemplateRegistryDescriptor()` den aktuell fehlenden Pfad `editor/templates/**` explizit als `status: missing` markiert statt implizit zu ignorieren.
- Mission-, Reward- und Modifier-Kataloge liefern descriptorbasierte Registry-Ausgaben ueber ihre Shared Contracts; `vehicle-registry.js` spiegelt dasselbe Muster fuer Fahrzeugkataloge.
- Arcade-Sektorpools und Runtime-Map-Keyspace bleiben synchron: `expert_gauntlet` ist als expliziter Expert-Preset-Key verankert, sodass Descriptor-Registries und Arcade-Map-Pools denselben Satz gueltiger IDs verwenden.

#### 4.6.5.4 Descriptor-Registry-Verbrauch in Runtime/Editor/Import vereinheitlichen (`V85 85.3.2`)

- `ArcadeRunRuntime` liest Runtime-Map-Keyspace und Labels jetzt ueber `RuntimeMapCatalogContract` statt ueber einen separaten `MapPresetCatalog`-Import; Intermission-/Map-Choice und Encounter-Map-Sequenzierung verwenden damit denselben Registry-Leseweg wie die Contracts.
- Reward-/Modifier-Verbrauch im Arcade-Intermission-Pfad nutzt die Descriptor-Registries (`getArcadeRewardRegistryDescriptor()`, `getArcadeModifierRegistryDescriptor()`) als kanonische ID-Quelle; verbleibende Encounter-Score-Boni bleiben bewusst im Encounter-Katalog verankert.
- `EditorBuildCatalog` behandelt den Descriptor-Envelope als kanonische Leseflaeche fuer Build-Getter (`get/find/list/default`); Kategorie-Metadaten (`accentColor`, Beschreibung) leben im Registry-Metadatenfeld statt in parallelen Consumer-Sonderlisten.
- `CustomMapLoader` plus `CustomMapSelectionResolver` validieren bekannte Runtime-Map-Keys und Fallback (`standard` bevorzugt) ueber denselben Runtime-Descriptor-Satz, sodass Import-/Selection-Fallbacks und Runtime-Katalog denselben Keyraum erzwingen.
- `ArcadeMissionState` und `vehicle-registry` lesen zulaessige Missions- bzw. Vehicle-IDs aus den Descriptor-Registries statt aus lokalen Objekt-Keylisten, wodurch Folgearbeit auf derselben Vertragskante erweitert werden kann.

#### 4.6.5.5 Import-/Capability-Grenzen fuer Datei, Browser, Desktop, Editor und Templates haerten (`V85 85.4.1`)

- Menu-Config-Transfer fuehrt jetzt einen expliziten Envelope `menu-config-share.v1` (`contractVersion`, `payload`, `exportedAt`) ein; Imports ohne Envelope bleiben als Legacy-Fallback lesbar, waehrend unbekannte Zukunftsversionen bewusst rejected werden.
- Editor-Disk-API (`/api/editor/*`) arbeitet jetzt auf einem gemeinsamen Datei-/Import-Vertrag `editor-disk-io.v1`: Renderer sendet die Contract-Version bei Save-Requests, API validiert sie bei expliziter Angabe und liefert dieselbe Contract-Version in Antworten zurueck.
- Browserseitige Custom-Map-Imports liefern einen expliziten Capability-Descriptor `custom-map-storage-capability.v1` (`providerKind`, `available`, `degradedReason`) statt impliziter Nullpfade bei fehlender Storage-Verfuegbarkeit.
- Desktop-Recording-Exports pruefen die Contract-Version des Electron-Save-Adapters vor App-Save-Versuchen; ungueltige oder unbekannte Adapter-Vertraege werden nicht implizit genutzt und fallen sauber auf Browser-Download/API-Fallback zurueck.
- Template-Pfade bleiben ueber den Descriptorvertrag explizit sichtbar: `resolveEditorTemplateImportCapability()` liefert fuer den weiterhin fehlenden Pfad `editor/templates/**` einen expliziten `available=false`-Status mit `degradedReason` statt stiller Ignorierung.

#### 4.6.5.6 Feedback-, Warn- und Migrationsmeldungen an denselben Vertraegen ausrichten (`V85 85.4.2`)

- Version-, Capability- und Descriptor-Vertraege bleiben nicht auf boolesche `success/error`-Flags beschraenkt: Import-/Export-Helfer sollen zusaetzlich lesbare `message`-/`warnings`-Felder und, wenn relevant, einen expliziten `migration`-Hinweis liefern.
- Legacy-Fallbacks duerfen nicht wie normale Erfolgspfade aussehen. Beispiel: `menu-config-share.v1`-Imports ohne Envelope bleiben lesbar, muessen aber im Consumer sichtbar als normalisierter Legacy-Import markiert werden.
- Capability-Fallbacks muessen fuer Nutzer und Folge-Consumer denselben Sachverhalt ausdruecken wie der technische Vertrag: fehlender Browser-Storage, veralteter Desktop-Save-Adapter, unerreichbare Disk-API oder fehlender `editor/templates/**`-Pfad werden als bewusst formulierte Meldungen transportiert statt nur in Logs oder impliziten Nullpfaden zu verschwinden.
- Match-/UI-nahe Verbraucher wie Config-Import-Status, Matchstart-Feedback fuer Custom-Maps oder spaetere Authoring-Consumer sollen dieselben strukturierten Meldungen direkt aus den Artefakt-/Capability-Helfern beziehen, statt eigene freie Text-Sonderfaelle neben dem Vertrag aufzubauen.

#### 4.6.5.7 Sunset-Regeln fuer Legacy-, Shadow-Write- und Adapterpfade (`V85 85.5.1`)

- V85 fuehrt keine neuen Legacy-Schreibpfade mehr ein: erstparteiliche Writer bleiben envelope-/schema-konform; Kompatibilitaet bleibt auf kontrollierte Read-/Import-Pfade beschraenkt.
- Jeder verbleibende Fallback bekommt ein explizites Exit-Kriterium. Ohne dokumentierten Sunset-Trigger gilt der Pfad als unzulaessig fuer neue Arbeit.
- Structured feedback bleibt verpflichtend bis zum Sunset: Legacy-/Capability-Fallbacks liefern weiter `reason`, `message`, `warnings` und optional `migration`, damit ein spaeteres Abschalten ohne stille Semantikbrueche moeglich bleibt.

| Vertragsfamilie | Heutiger Uebergang | Sunset-Trigger |
| --- | --- | --- |
| Profile-Transfer (`profile-export.v1`) | Legacy-Import ohne `contractVersion` bleibt lesbar. | Deaktivieren, sobald UI/Tools/Doku envelope-only sind (`allowMissingVersion=false`). |
| Replay-Export (`replay.v1`) | Shadow-Write mit `contractVersion` + Legacy-`version`. | Legacy-`version` erst entfernen, wenn alle bekannten Verbraucher `contractVersion`-only lesen. |
| Settings-/Menu-/Arcade-Store-Migration | Legacy-Shapes werden gelesen und beim Laden auf Envelope rewritet. | Fallback nur solange externe Altbestaende erwartet sind; keine neuen Legacy-Writer. |
| Editor-Disk-I/O (`editor-disk-io.v1`) | Missing `contractVersion` in Responses noch toleriert. | Nach durchgaengiger Renderer/API-Versionierung Missing-Version als Stand-Mismatch rejecten. |
| Desktop-Save-Adapter (`preload.save.v1`) | Missing `contractVersion` aktuell kompatibel, explizit ungueltige Versionen rejecten. | Nach verbindlicher Preload-Contract-Auslieferung Missing-Version als inkompatibel behandeln. |
| Map-Schema-Migration (`MAP_SCHEMA_VERSION`) | Legacy/schema v1-v3 Upgrade bleibt aktiv, Zukunftsversionen rejecten. | Nur nach dokumentiertem Authoring-Sunset fuer Alt-Maps weiter verengen; keine neuen Legacy-Sondershapes. |

#### 4.6.5.8 Folgeverbrauch und Folgeblocks auf denselben Leseweg halten (`V85 85.5.2`)

- Profil-Transfer bleibt bis zum Sunset ein strukturierter Envelope-Verbraucher: `ProfileTransferOps`, `ProfileManager` und `ProfileUiController` transportieren Legacy-Fallback nicht nur fachlich, sondern auch sichtbar ueber `reason`, `message`, `tone`, `warnings`, `usedLegacyFallback` und `migration`. Folgearbeit an UI-, Tooling- oder Doku-Pfaden benutzt diesen Vertrag statt freier Importtexte.
- UI-nahe Arcade-Consumer lesen Persistenz nicht roh aus `localStorage`, wenn fuer dieselbe Familie bereits ein V85-Store-/Migrationspfad existiert. Beispiel: `ArcadeMenuSurface` liest Vehicle-Mastery ueber `SettingsStore.loadJsonRecord()` plus `ArcadeVehicleProfileContract` (`readArcadeVehicleProfileRecord()` / `getArcadeVehicleProfileRecord()`), statt ueber ad-hoc JSON-Parsing.
- Editor-/Authoring-Folgearbeit (`V86`) baut auf denselben Content-Signalen auf, die `V85` bereits exponiert: `EditorBuildCatalog` bleibt der gemeinsame Descriptor-Leseweg (`descriptorVersion`, Entry-Count), `resolveEditorTemplateImportCapability()` der kanonische Template-Capability-Vertrag, und `editor/js/main.js` haelt diese Informationen im Editor-Runtime-Snapshot fuer Tools und spaetere Checks sichtbar.
- Neue Folgeblocks duerfen fuer Persistenz-, Import-, Template- und Descriptor-Scope keine parallelen Lesewege aufziehen, wenn ein autoritativer Shared-Contract oder Store-Adapter bereits existiert. Die Standardfrage ist: "welcher V85-Reader ist fuer diese Familie schon kanonisch?", nicht "welches JSON koennen wir hier schnell selbst parsen?".

#### 4.6.5.9 Abschlussregel fuer additive Folgefeatures (`V85 85.99.2`)

- Additive Folgefeatures erweitern bestehende Vertraege zuerst ueber die vorhandenen Reader und Envelopes; Version-Bumps sind nur fuer echte Contract-Brueche zulaessig, nicht fuer rein additive Felder.
- Neue Persistenz-/Transfer-/Descriptor-Familien brauchen vor dem ersten Writer ein explizites Versionssignal (`schemaVersion`, `contractVersion` oder `descriptorVersion`) plus benannten Reader-/Migrationspfad; keine schema-losen "temporaren" Sidecars.
- Capability-Fallbacks bleiben bis zu ihrem Sunset sichtbar und strukturiert (`reason`, `message`, `warnings`, optional `migration`) und duerfen nicht als stiller Erfolgspfad auftreten.
- Dokumentationskonsistenz ist Teil des Abschlusses: Plan (`V85`), Referenzkontext und Onboarding muessen denselben Versionierungs- und Verbrauchsvertrag spiegeln, bevor ein Folgeblock darauf aufsetzt.

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
- Neue Feature-Arbeit waehlt immer den leichtesten passenden Layer: `node-contract` vor `desktop-smoke`, `desktop-e2e` nur fuer produktnahe Integrationen ueber den Smoke-Kern hinaus, `browser-compat` nur fuer Browser-Demo/Web-API-/Fallback-Scope und `heavy-diagnostic` nur fuer bestehende schwere Cluster oder Diagnosebedarf.
- `desktop-smoke` ist das primaere Produktsignal fuer die Desktop-App; es deckt App-Boot, Menu, Matchstart, Input-Ankunft und Return-to-Menu ueber die echte Electron-Shell ab.
- `desktop-e2e`-Reruns laufen bevorzugt ueber `node scripts/run-playwright-targeted-clusters.mjs <cluster-id...>`; standardmaessig bleiben nur `core-shell`, `core-platform`, `core-surface` und `core-runtime` im produktnahen Hauptpfad, waehrend `core-regressions` und `physics-*` bewusst `heavy-diagnostic` bleiben.
- `browser-compat` wird nur mit expliziter Spec- oder `--grep`-Selektion gefahren und bleibt auf Browser-Demo-, Web-API-, Editor- und degradierte Web-Fallback-Pfade beschraenkt.
- Failure-Klassifikation trennt jetzt Browser und Desktop: Browser-Readiness nutzt weiter `startup|readiness|contract|runtime-regression|flake` (`tests/playwright-readiness.js`), Desktop-Laeufe klassifizieren ueber `desktop-startup|desktop-readiness|desktop-runtime-regression|desktop-flake` in `desktop-startup-diagnostics.json`.
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
