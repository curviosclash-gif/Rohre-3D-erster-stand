# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-18

Dieser Masterplan ist die einzige aktive Planquelle fuer offene Arbeit.
Abgeschlossene Plaene und historische Dokumente liegen unter `docs/archive/`.

## Status-Legende

- [ ] Offen
- [/] In Bearbeitung
- [x] Abgeschlossen

## Abgeschlossene Bloecke (archiviert)

Folgende Bloecke sind abgeschlossen und in `docs/archive/completed/` archiviert:

V26, V27, V28 (inkl. 28.5), V29b, V30, V31, V32, V33, V34, V35, V36, V37, V38, V44.

---

## Block V41: Multiplayer — LAN + Internet, bis 10 Spieler

Plan-Datei: `docs/Feature_Lokaler_Multiplayer_V41.md`

### Bereits implementiert (Scaffolds + vollstaendige Implementierungen)

Die folgenden Dateien existieren als vollstaendige Implementierungen:

- [x] `src/core/ActionDispatcher.js` — zentraler State-Change-Dispatcher
- [x] `src/core/GameStateSnapshot.js` + `crc32` — serialisierbarer State
- [x] `src/core/session/SessionAdapter.js` — Interface
- [x] `src/core/session/LocalSessionAdapter.js` — Splitscreen-Adapter
- [x] `src/core/input/PlayerInputSource.js` — Interface
- [x] `src/core/input/KeyboardInputSource.js` — Keyboard-Adapter
- [x] `src/core/input/GamepadInputSource.js` — Gamepad API + Hot-plug
- [x] `src/core/lobby/MatchLobby.js` — Interface
- [x] `src/core/lobby/LocalMatchLobby.js` — Splitscreen-Lobby
- [x] `src/core/player/PlayerRole.js` — Enum (ACTIVE, SPECTATOR, BOT)
- [x] `src/core/replay/ReplayRecorder.js` — Match-Aufzeichnung
- [x] `src/core/replay/ReplayPlayer.js` — Playback mit Speed-Control
- [x] `src/network/PeerConnectionManager.js` — WebRTC Star-Topologie
- [x] `src/network/DataChannelManager.js` — inputs (unreliable) + state (reliable)
- [x] `src/network/LANSessionAdapter.js` — LAN-Play via HTTP-Signaling
- [x] `src/network/OnlineSessionAdapter.js` — Internet-Play via WebSocket
- [x] `src/network/LANMatchLobby.js` — Lobby via HTTP
- [x] `src/network/OnlineMatchLobby.js` — Lobby via WebSocket
- [x] `src/network/LatencyMonitor.js` — RTT/Jitter pro Peer
- [x] `src/network/InputDelayBuffer.js` — adaptiv 1-12 Frames
- [x] `src/network/RemoteInputSource.js` — Netzwerk-Input-Buffer
- [x] `src/network/StateReconciler.js` — Client-seitige State-Korrektur
- [x] `src/ui/NetworkHud.js` — Ping, Spieleranzahl, Status
- [x] `src/ui/TouchInputSource.js` — virtueller Joystick + Touch-Buttons
- [x] `server/lan-signaling.js` — HTTP LAN-Server
- [x] `server/signaling-server.js` — WebSocket Internet-Server
- [x] `server/package.json` + `server/Dockerfile`
- [x] `electron/main.js` + `electron/preload.js` + `electron/package.json`
- [x] `src/ui/menu/MenuMultiplayerBridge.js` — Lobby-State via localStorage+BroadcastChannel
- [x] `src/ui/menu/MenuStateMachine.js` — MULTIPLAYER State-ID definiert
- [x] `src/ui/menu/MenuSchema.js` — submenu-multiplayer Panel (hinter Feature-Flag)
- [x] `src/ui/HudRuntimeSystem.js` — N-Player-flexibel (localHumans >= 2)
- [x] `src/ui/CrosshairSystem.js` — networkEnabled-aware
- [x] `src/ui/PauseOverlayController.js` — ActionDispatcher-Fallback
- [x] `src/core/RuntimeConfig.js` — networkEnabled, maxPlayers, sessionType
- [x] `src/ui/menu/MenuStateContracts.js` — LAN/ONLINE Session-Typen

---

### Offene Arbeit — 3 parallele Workstreams

> **WICHTIG: Jeder Workstream hat exklusive Datei-Ownership.**
> Kein Agent darf Dateien ausserhalb seines Scopes aendern.
> Gemeinsame Schnittstellen sind durch Interfaces definiert.

---

### Workstream A: Menu & Lobby UI

**Owner:** Agent A
**Datei-Scope (exklusiv):**
- `src/ui/menu/MenuTextCatalog.js` (neue Multiplayer-Texte)
- `src/ui/menu/MenuSchema.js` (Multiplayer-Panel aktivieren, Items erweitern)
- `src/ui/menu/MenuGameplayBindings.js` (Multiplayer-Events binden)
- `src/ui/menu/MenuMultiplayerPanel.js` (NEU: Host/Join UI-Komponente)
- `src/ui/menu/MenuLobbyRenderer.js` (NEU: Lobby-Darstellung)
- `style.css` (Multiplayer-spezifische Styles)

**Aufgaben:**

- [x] A.1 `MenuTextCatalog.js` erweitern: alle Multiplayer-Texte
  - `menu.multiplayer.title`, `menu.multiplayer.host.label`, `menu.multiplayer.join.label`
  - `menu.multiplayer.lobby.code`, `menu.multiplayer.lobby.players`, `menu.multiplayer.lobby.ready`
  - `menu.multiplayer.lobby.start`, `menu.multiplayer.lobby.waiting`
  - `menu.multiplayer.error.full`, `menu.multiplayer.error.connection`

- [x] A.2 `MenuSchema.js`: `multiplayerStubEnabled` auf `true` setzen, Panel-Items definieren
  - "Spiel erstellen" (nur wenn `canHost === true`)
  - "Spiel beitreten"
  - Zurueck zum Hauptmenue

- [x] A.3 `MenuMultiplayerPanel.js` (NEU): Host/Join UI
  - Host-Ansicht: IP-Anzeige, Lobby-Code, Spieler-Liste (bis 10), Settings, "Match starten"
  - Join-Ansicht: Code-Eingabe, Verbindungsstatus, Fehler-Feedback
  - Nutzt `MenuMultiplayerBridge` fuer State-Management
  - Nutzt `MenuTextCatalog` fuer alle Texte

- [x] A.4 `MenuGameplayBindings.js`: Multiplayer-Events verdrahten
  - HOST_GAME, JOIN_GAME, LEAVE_LOBBY, TOGGLE_READY, START_MATCH Events
  - Feature-Flag `canHost` pruefen bei Host-Aktion

- [x] A.5 `MenuLobbyRenderer.js` (NEU): Lobby-Darstellung
  - Spieler-Liste mit Ready-Status, Ping-Anzeige
  - Settings-Zusammenfassung (Map, Modus, Rundenanzahl)
  - Dynamische Updates via BroadcastChannel Events

- [x] A.6 `style.css`: Multiplayer-Styles
  - Lobby-Layout, Spieler-Karten, Ready-Indikator
  - Responsive fuer Touch/Tablet

- [x] A.7 Test: Menue-Navigation Multiplayer, Feature-Flag canHost

**Schnittstelle zu B:** Agent A ruft `MenuMultiplayerBridge.requestMatchStart()` auf.
Agent B verdrahtet den Callback in `GameRuntimeFacade`.

**Schnittstelle zu C:** Keine direkte. Agent A nutzt nur bereits implementierte Bridge-APIs.

---

### Workstream B: Core Runtime Integration

**Owner:** Agent B
**Datei-Scope (exklusiv):**
- `src/core/GameRuntimeFacade.js` (SessionAdapter-Integration)
- `src/core/main.js` (Initialisierung erweitern)
- `src/core/InputManager.js` (PlayerInputSource-Integration)
- `src/ui/MatchFlowUiController.js` (Multiplayer Match-Flow)
- `src/ui/HudRuntimeSystem.js` (N-Player Scoreboard)
- `src/ui/CrosshairSystem.js` (Vollbild bei Netzwerk)
- `src/ui/PauseOverlayController.js` (Netzwerk-Pause-Logik)
- `src/ui/RenderViewportSystem.js` (Viewport-Modi)

**Aufgaben:**

- [x] B.1 `GameRuntimeFacade.js`: SessionAdapter-Integration
  - Bei `startMatch()`: SessionAdapter basierend auf `sessionType` waehlen (Local/LAN/Online)
  - Host: State-Snapshots (10/s) via `session.broadcastState()` senden
  - Client: `session.onStateUpdate()` an `StateReconciler` weiterleiten
  - Arena-Load-Gate: alle Spieler signalisieren "loaded" vor Tick 0

- [x] B.2 `InputManager.js`: PlayerInputSource-Architektur
  - Jeder Spieler bekommt `PlayerInputSource`-Instanz (Keyboard/Gamepad/Touch/Remote)
  - `getPlayerInput(index)` delegiert an zugewiesene Source
  - Auto-Detection: Keyboard als Default, Gamepad bei Verbindung

- [x] B.3 `MatchFlowUiController.js`: Multiplayer Match-Lifecycle
  - Netzwerk-Match: kein lokaler Pause (nur Host kann pausieren)
  - Round-Lifecycle synchron: `round_start`/`round_end`/`match_end` ueber alle Peers
  - Nach-Match: Rematch, Return-to-Lobby, Spieler-Slot-Verwaltung

- [x] B.4 `HudRuntimeSystem.js`: N-Player Scoreboard
  - Dynamisches Scoreboard fuer bis zu 10 Spieler
  - Zeigt nur lokale HUD-Elemente (Items, Health) fuer eigenen Spieler
  - Scoreboard zeigt alle Spieler mit Ping-Indikator

- [x] B.5 `RenderViewportSystem.js`: Viewport-Modi
  - Vollbild fuer Netzwerk-Sessions (`networkEnabled === true`)
  - Splitscreen nur bei `sessionType='splitscreen'` (lokal 2P)
  - Kamera folgt nur eigenem Spieler bei Netzwerk

- [x] B.6 `PauseOverlayController.js`: Netzwerk-Pause
  - Bei Netzwerk: Pause nur durch Host, Clients bekommen "Host hat pausiert" Overlay
  - ESC bei Client: Disconnect-Bestaetigung statt Pause

- [x] B.7 Test: bestehende `test:core` + `test:physics` muessen gruen bleiben

**Schnittstelle zu A:** Agent B implementiert den `onMatchStart` Callback in GameRuntimeFacade,
der von MenuMultiplayerBridge.requestMatchStart() getriggert wird.

**Schnittstelle zu C:** Agent B ruft `SessionAdapter.connect()`, `.sendInput()`, `.broadcastState()`,
`.onStateUpdate()` auf — Interfaces die Agent C's Netzwerk-Code implementiert.

---

### Workstream C: Network Robustness, Build & Replay

**Owner:** Agent C
**Datei-Scope (exklusiv):**
- `src/network/*` (alle Netzwerk-Dateien)
- `src/ui/NetworkHud.js` (Netzwerk-HUD erweitern)
- `src/ui/TouchInputSource.js` (Touch-Integration)
- `src/core/replay/*` (Replay-System)
- `server/*` (Signaling-Server)
- `electron/*` (Electron App)
- `index.html` (Touch-Controls Markup)
- `package.json` (Build-Skripte hinzufuegen)

**Aufgaben:**

- [x] C.1 Netzwerk-Robustheit
  - Disconnect-Detection: Data Channel close + Heartbeat (5s Timeout)
  - Client-Disconnect: Bot-Uebernahme oder leerer Slot, andere Clients informiert
  - Host-Disconnect: "Host getrennt" Dialog, Match beendet
  - Reconnect: 30s Fenster, Full State Sync bei Wiedereintritt
  - Graceful Leave: `beforeunload` sendet Leave-Nachricht

- [x] C.2 `NetworkHud.js` erweitern
  - Disconnect-Warning Overlay
  - Reconnect-Countdown
  - Bandbreiten-Anzeige (optional)

- [x] C.3 Build-Skripte
  - `npm run build:web` — statische Website, `canHost=false`, nur Join
  - `npm run build:app` — Electron-App mit eingebettetem LAN-Server
  - Vite-Config: Env-Variable `VITE_APP_MODE=web|app`

- [x] C.4 Touch-Integration
  - `index.html`: Touch-Control Container Markup
  - `TouchInputSource.js`: Auto-Show bei Touch-Geraet, Auto-Hide bei Desktop
  - Touch-Controls nur im Match sichtbar, nicht im Menue

- [x] C.5 Replay-Integration
  - `ReplayRecorder`: in GameRuntimeFacade einklinken (Start/Stop bei Match)
  - Replay-Persistenz: JSON-Export (App: Dateisystem via IPC, Demo: Download)
  - Spectator-Stub: `SpectatorInputSource` + `PlayerRole.SPECTATOR`

- [x] C.6 Electron App finalisieren
  - Build-Config: `electron-builder` oder `electron-forge`
  - Auto-Start LAN-Server beim App-Start
  - Tray-Icon mit Server-Status (optional)

- [x] C.7 Test: Disconnect-Simulation, Reconnect, Build-Skripte

**Schnittstelle zu B:** Agent C implementiert `SessionAdapter`-Interface Methoden.
Agent B ruft diese auf. Kein direkter Datei-Overlap.

---

### Phase 41.99: Abschluss-Gate (nach allen Workstreams)

- [ ] 41.99.1 LAN-Match: 2+ Rechner, stabiles Match, App hostet, Website joint
- [ ] 41.99.2 Internet-Match: 2+ Rechner ueber Internet via Signaling-Server
- [ ] 41.99.3 Gamepad + Touch: funktional, konfigurierbar
- [/] 41.99.4 Alle Tests gruen (core/physics gruen; T14b, T82, T82b vorbestehende Fehler, nicht V41-bezogen)
- [ ] 41.99.5 Performance: Host-CPU <30% Overhead bei 10 Spielern

---

## Block V45: Arcade-Modus als echter Run- und Score-Layer

Plan-Datei: `docs/Feature_Arcade_Modus_V45.md`

<!-- LOCK: frei -->

**Scope**

- `Arcade` von einem reinen Preset zu einem echten Modus mit eigenem Run-Lifecycle ausbauen
- V1: Singleplayer-first, kurzer Survival-Gauntlet, Score-/Combo-System, Sektor-/Wellenstruktur
- Folgeausbau: Flugzeug-Leveling, Vehicle-Editor-Blueprints, Seeds, Daily Challenge, lokale Bestenliste, Replay-Anbindung

**Hauptpfade**

- `src/ui/menu/MenuDefaultsEditorConfig.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/core/SettingsManager.js`
- `src/core/RuntimeConfig.js`
- `src/core/GameRuntimeFacade.js`
- `src/state/**`
- `src/entities/**`
- `src/ui/**`
- `prototypes/vehicle-lab/**`
- `data/vehicles/**`
- `tests/**`

**Konfliktregel**

- Kein V45-Block aendert `src/network/**`, `server/**` oder `electron/**`; diese Pfade gehoeren weiter zu V41.
- Kein V45-Block fuehrt in V1 einen dritten technischen `GAME_MODE_TYPE` ein; Arcade bleibt ein Run-Layer auf bestehender Runtime.
- Eingefrorene Bot-/Training-Vertraege (`classic|hunt`) werden nur per Folgeplan erweitert, nicht in diesem Block.

- [ ] 45.1 Produkt- und Architektur-Freeze
  - [ ] 45.1.1 Zielbild und harte Nicht-Ziele fuer den Arcade-Modus festziehen
  - [ ] 45.1.2 Runtime-Entscheidung absichern: Arcade als Session-/Run-Layer statt neuem `GAME_MODE_TYPE`

- [ ] 45.2 Arcade-Run-Lifecycle
  - [ ] 45.2.1 Separaten Arcade-Run-State und Sektor-/Intermission-Fluss definieren
  - [ ] 45.2.2 Match-Flow ohne klassischen Rundensieg-Zyklus in die Runtime integrieren

- [ ] 45.3 Score- und Risiko-System
  - [ ] 45.3.1 Separates Run-Score-Modell mit Multiplikator und Combo-Decay aufbauen
  - [ ] 45.3.2 Post-Run-Ranking, Rekorde und Breakdown definieren

- [ ] 45.4 Encounter Director, Flugzeug-Leveling und Vehicle-Editor
  - [ ] 45.4.1 Wellen-/Sektorkatalog fuer Bot-Squads, Ziele, Modifikatoren und run-temporare Flugzeug-Levelups bauen
  - [ ] 45.4.2 Persistente Airframe-Mastery, Blueprint-Schema und Vehicle-Editor-Integration mit Budget-/Hitbox-Guards definieren

- [ ] 45.5 UI, Replayability und Abschluss-Gate
  - [ ] 45.5.1 Menue, HUD, Vehicle-Mastery-/Blueprint-Anker, Replay-/Seed-Anker und lokale Challenge-Pfade anbinden
  - [ ] 45.5.2 Tests, `docs:sync`, `docs:check` und Doku-Freeze abschliessen

---

## Block V46: Architektur-Verbesserungen — Deduplizierung, Contracts, God Objects

<!-- LOCK: frei -->

**Scope**

- Duplizierte Utility-Funktionen zentralisieren
- Shared Contracts fuer moduluebergreifende Kommunikation einfuehren
- Bidirektionale Abhaengigkeiten (core<>entities, ui<>state, state<>core) aufloesen
- God Objects (MediaRecorderSystem, GameRuntimeFacade, MenuMultiplayerBridge) aufbrechen
- Magic Numbers in Hunt/Projectile/AI konsolidieren
- Service-Locator-Pattern schrittweise durch Dependency Injection ersetzen
- Event-Pattern vereinheitlichen
- Modul-Grenzen korrigieren (HuntHUD, AI Sensing)

**Konfliktregel**

- Kein V46-Block aendert `src/network/**`, `server/**` oder `electron/**`; diese Pfade gehoeren zu V41.
- Kein V46-Block aendert Spielmechanik oder Balance-Werte — nur strukturelle Verschiebungen.
- Training-Contract-Versionen (v33, v36) werden nicht geaendert, nur Import-Pfade umgeleitet.

**Hauptpfade**

- `src/utils/MathOps.js`
- `src/shared/contracts/**`
- `src/core/MediaRecorderSystem.js` → `src/core/recorder/**`
- `src/core/GameRuntimeFacade.js` → `src/core/runtime/**`
- `src/ui/menu/MenuMultiplayerBridge.js` → `src/ui/menu/multiplayer/**`
- `src/hunt/HuntConfig.js`, `src/hunt/HuntTargetingOps.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/ai/BotDecisionOps.js`
- `scripts/architecture/ArchitectureConfig.mjs`
- `eslint.config.js`

---

### 46.1 Utility-Deduplizierung

- [ ] 46.1.1 `toFiniteNumber` zu `src/utils/MathOps.js` hinzufuegen (exportieren)
- [ ] 46.1.2 Lokale `toFiniteNumber`-Definitionen in 12 Dateien entfernen, durch Import ersetzen:
  - `src/core/config/SettingsRuntimeContract.js` (Z27)
  - `src/core/DeveloperTrainingController.js` (Z31)
  - `src/core/GameDebugApi.js` (Z24)
  - `src/core/MediaRecorderSystem.js` (Z94)
  - `src/core/perf/RuntimePerfProfiler.js` (Z29)
  - `src/entities/ai/training/TrainerPayloadAdapter.js` (Z12)
  - `src/entities/ai/training/TrainingAutomationContractV33.js` (Z31)
  - `src/entities/ai/training/TrainingContractV1.js` (Z15)
  - `src/hunt/HuntTargetingOps.js` (Z15)
  - `src/state/training/RewardCalculator.js` (Z43)
  - `src/state/training/TrainingGateEvaluator.js` (Z13)
  - `src/state/training/TrainingOpsKpiContractV36.js` (Z7)
- [ ] 46.1.3 `toSafeNumber` in `src/hunt/HealthSystem.js` (Z5) durch `toFiniteNumber`-Import ersetzen, Aufrufe umbenennen
- [ ] 46.1.4 Lokale `clamp01`-Definitionen in 3 Dateien durch Import aus `MathOps.js` ersetzen:
  - `src/hunt/HuntHUD.js` (Z4)
  - `src/entities/ai/BotSensors.js` (Z31)
  - `src/entities/ai/training/TrainingAutomationRunner.js` (Z30)

---

### 46.2 Shared Contracts ausbauen

- [ ] 46.2.1 `src/shared/contracts/ConfigContract.js` erstellen: CONFIG-Interface, `getActiveRuntimeConfig()`-Signatur exportieren
- [ ] 46.2.2 `src/shared/contracts/EntityContract.js` erstellen: `CUSTOM_MAP_KEY`, `VEHICLE_DEFINITIONS`, `resolveArenaMapSelection`
- [ ] 46.2.3 `src/shared/contracts/HuntContract.js` erstellen: Hunt-State-Interfaces, Projectile-Event-Types
- [ ] 46.2.4 `src/shared/contracts/MatchLifecycleContract.js` erstellen: `LIFECYCLE_EVENT_TYPES` (aus MediaRecorderSystem verschieben), RoundEnd-UI-State-Interfaces
- [ ] 46.2.5 `src/shared/contracts/TrainingContract.js` erstellen: `BOT_POLICY_TYPES`, `resolveMatchBotPolicyType`, `ObservationSchema`

---

### 46.3 Bidirektionale Abhaengigkeiten aufloesen

Abhaengig von: 46.2

- [ ] 46.3.1 core→entities aufloesen (4 Import-Kanten):
  - `RuntimeConfig.js:5` → Import `BOT_POLICY_TYPES` aus `shared/contracts/TrainingContract.js`
  - `SettingsManager.js:11` → Import `CUSTOM_MAP_KEY` aus `shared/contracts/EntityContract.js`
  - `DeveloperTrainingController.js:1-2` → Import aus `shared/contracts/TrainingContract.js`
  - `main.js:5` → Import `CUSTOM_MAP_KEY` aus `shared/contracts/EntityContract.js`
- [ ] 46.3.2 state→ui aufloesen (2 Import-Kanten):
  - `state/RoundEndCoordinator.js:1` → `deriveRoundEndOverlayUiState` nach `shared/contracts/MatchLifecycleContract.js` verschieben
  - `state/RoundStateTickSystem.js:1` → `deriveRoundEndCountdownUiState` nach `shared/contracts/MatchLifecycleContract.js` verschieben
- [ ] 46.3.3 state→core aufloesen (2 Import-Kanten):
  - `state/MatchLifecycleSessionOrchestrator.js:1` → `LIFECYCLE_EVENT_TYPES` aus `shared/contracts/MatchLifecycleContract.js`
  - `state/match-session/MatchSessionMapOps.js:1` → `CONFIG` aus `shared/contracts/ConfigContract.js`
- [ ] 46.3.4 `scripts/architecture/ArchitectureConfig.mjs` aktualisieren: Allowlists reduzieren, neue Regeln `state/ darf nicht aus ui/ importieren`, `core/ darf nicht aus entities/ importieren`

---

### 46.4 God Objects aufbrechen

Abhaengig von: 46.2

- [ ] 46.4.1 `MediaRecorderSystem.js` (1335 Zeilen) aufteilen:
  - `src/core/recorder/RecorderEngineSelector.js` — Codec-Detection, MIME-Type-Auswahl (~150Z)
  - `src/core/recorder/FrameCaptureEngine.js` — WebCodecs/MediaRecorder Frame-Capture, Encoding-Queue (~400Z)
  - `src/core/recorder/RecordingExporter.js` — mp4-muxer, Blob-Assembly, Download (~200Z)
  - `src/core/recorder/RecorderLifecycleAdapter.js` — Match-Events, Load-Level-Management (~150Z)
  - `src/utils/RecorderUtils.js` — `toSafeDatePart`, `sanitizeFileToken`, `defaultDownload`, `resolveGlobalScope`, `resolvePerfNow`, `toPositiveInt`
  - `MediaRecorderSystem.js` verbleibt als Facade (~200Z)
- [ ] 46.4.2 `GameRuntimeFacade.js` (872 Zeilen) aufteilen:
  - `src/core/runtime/SessionNetworkManager.js` — Session-Init, State-Broadcast, Teardown (~135Z)
  - `src/core/runtime/MultiplayerCoordinator.js` — Bridge-Setup, UI-Sync, Ready-Invalidation (~120Z)
  - `src/core/runtime/SettingsOrchestrator.js` — Settings-Apply, Dirty-Tracking (~60Z)
  - `src/core/runtime/ProfileHandler.js` — Profile CRUD, Export/Import (~55Z)
  - `GameRuntimeFacade.js` verbleibt als Event-Router (~350Z)
- [ ] 46.4.3 `MenuMultiplayerBridge.js` (828 Zeilen) aufteilen:
  - `src/ui/menu/multiplayer/LobbySnapshotStore.js` — Persistence, Storage-Events, BroadcastChannel (~200Z)
  - `src/ui/menu/multiplayer/HeartbeatManager.js` — Heartbeat, Expiration, Stale-Member-Cleanup (~80Z)
  - `src/ui/menu/multiplayer/MatchCommandValidator.js` — Command-Age-Validation (~60Z)
  - `MenuMultiplayerBridge.js` verbleibt als Public API (~350Z)
- [ ] 46.4.4 `eslint.config.js` Legacy-Ceilings senken: MediaRecorderSystem 1225→300, GameRuntimeFacade 1050→400, MenuMultiplayerBridge 760→400

---

### 46.5 Magic Numbers konsolidieren

- [ ] 46.5.1 `src/hunt/HuntConfig.js` erweitern: `TARGETING.MIN_HITBOX_RADIUS` (0.2), `TARGETING.MIN_PROBE_RADIUS` (0.12), `TARGETING.MIN_SAMPLE_STEP` (0.2)
- [ ] 46.5.2 `src/hunt/HuntTargetingOps.js` bereinigen: Inline-Fallbacks (0.45, 0.78, 0.2, 0.12) durch `HUNT_CONFIG.*` ersetzen
- [ ] 46.5.3 `src/entities/systems/ProjectileSystem.js` bereinigen: Hardcodierte Rocket-Werte (1.65, 6.2, 32, 130, 0.12) durch `HUNT_CONFIG.ROCKET.*` ersetzen
- [ ] 46.5.4 `src/entities/ai/BotDecisionOps.js` bereinigen: `BOT_DECISION_CONFIG = Object.freeze({...})` am Dateianfang mit allen ~20 Schwellwerten

---

### 46.6 Service-Locator schrittweise ersetzen

Abhaengig von: 46.4

- [ ] 46.6.1 Neue Module aus 46.4 direkt mit Dependency Injection bauen (kein `constructor(game)`)
- [ ] 46.6.2 `PlayingStateSystem` refactoren: statt `game` nur `{ entityManager, arena, config, input }` uebergeben
- [ ] 46.6.3 `RoundStateTickSystem` refactoren: statt `game` nur `{ roundStateController, matchFlowUi, config }` uebergeben
- [ ] 46.6.4 `LEGACY_CONSTRUCTOR_GAME_ALLOWLIST` in ArchitectureConfig nach jedem Refactor reduzieren (Ziel: 11→5)
- [ ] 46.6.5 `window.GAME_INSTANCE` global entfernen, Debug-API via explizite Referenz uebergeben

---

### 46.7 Event-Pattern vereinheitlichen

Abhaengig von: 46.4

- [ ] 46.7.1 Konvention dokumentieren: ActionDispatcher fuer Cross-Modul-Events, Callback-Injection fuer System-interne Events, direkte Aufrufe nur intra-Modul
- [ ] 46.7.2 Architecture-Boundary-Check um Event-Konventions-Regel erweitern
- [ ] 46.7.3 `LIFECYCLE_EVENT_TYPES` auf ActionDispatcher oder dedizierten LifecycleEventBus migrieren

---

### 46.8 Modul-Grenzen korrigieren

Abhaengig von: 46.1

- [ ] 46.8.1 `src/hunt/HuntHUD.js` nach `src/ui/HuntHUD.js` verschieben, Import-Pfade in Konsumenten anpassen
- [ ] 46.8.2 HuntHUD DOM-Refs ueber `GameUiDomRefs.js` injizieren (Constructor-Injection statt getElementById)
- [ ] 46.8.3 `LEGACY_DOM_ACCESS_ALLOWLIST` um HuntHUD-Eintrag reduzieren
- [ ] 46.8.4 AI Sensing-Primitives (Raycasts, Distanzen) aus ObservationSystem + EnvironmentSamplingOps extrahieren nach `src/entities/ai/perception/SensingPrimitives.js`

---

### Phase 46.99: Abschluss-Gate

- [ ] 46.99.1 `npm run lint` — keine Fehler, alle max-lines Ceilings eingehalten
- [ ] 46.99.2 `npm run check:architecture` — Boundary-Checks bestanden, Allowlists reduziert
- [ ] 46.99.3 `npx playwright test` — alle E2E-Tests gruen
- [ ] 46.99.4 Manuell: Classic-Match + Hunt-Match + Multiplayer-Lobby funktional
- [ ] 46.99.5 Keine bidirektionalen Imports zwischen core/entities, state/ui, state/core

---

### Backlog (nach V41)

| ID | Titel | Plan-Datei | Status |
|----|-------|-----------|--------|
| V39 | Komplexe Showcase-Map | `docs/Feature_Komplexe_Showcase_Map_V39.md` | In Bearbeitung |
| V40 | Hunt Rocket Trail Targeting | `docs/Feature_Hunt_Rocket_Trail_Targeting_V40.md` | Offen |
| V42 | Menu Default Editor | `docs/Feature_Menu_Default_Editor_V42.md` | In Bearbeitung |
| V43 | Projektstruktur Spiel/Dev-Ordner | `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md` | Offen |
| V45 | Arcade-Modus | `docs/Feature_Arcade_Modus_V45.md` | Planung |
| V46 | Architektur-Verbesserungen | `docs/Umsetzungsplan.md` (Block V46) | Offen |
| V26.3c | Menu UX Follow-up | `docs/Feature_Menu_UX_Followup_V26_3c.md` | Offen |
| V29b | Cinematic Camera Follow-up | `docs/Feature_Cinematic_Camera_Followup_V29b.md` | Offen |
| N2 | Recording-UI / manueller Trigger | — | Offen |
| N4 | Object-Pooling Partikel & Projektile | — | Offen |
| N5 | Delta-Kompression Replay-System | — | Offen |
| N7 | Persistente Telemetrie (IndexedDB) | — | Offen |
| N8 | Bot-Dynamikprofile als UI-Gegnerklassen | — | Offen |
| T1 | Dummy-Tests durch echte ersetzen | — | Offen |
| V2 | Test-Performance-Optimierung | `docs/Feature_TestPerformance_V2.md` | Offen |

---

## Archivierte Referenzen

- Abgeschlossene Feature-Docs: `docs/archive/completed/`
- Abgeschlossene Plaene: `docs/archive/plans/completed/`
- Abgeloeste Plaene: `docs/archive/plans/superseded/`
- Testergebnisse: `docs/archive/testergebnisse/`
- Agent-Prompts: `docs/archive/agent-prompts/`
- Historische Altarchive: `docs/archive/`

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run docs:sync`
- `npm run docs:check`
