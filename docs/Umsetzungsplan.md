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

- [ ] A.1 `MenuTextCatalog.js` erweitern: alle Multiplayer-Texte
  - `menu.multiplayer.title`, `menu.multiplayer.host.label`, `menu.multiplayer.join.label`
  - `menu.multiplayer.lobby.code`, `menu.multiplayer.lobby.players`, `menu.multiplayer.lobby.ready`
  - `menu.multiplayer.lobby.start`, `menu.multiplayer.lobby.waiting`
  - `menu.multiplayer.error.full`, `menu.multiplayer.error.connection`

- [ ] A.2 `MenuSchema.js`: `multiplayerStubEnabled` auf `true` setzen, Panel-Items definieren
  - "Spiel erstellen" (nur wenn `canHost === true`)
  - "Spiel beitreten"
  - Zurueck zum Hauptmenue

- [ ] A.3 `MenuMultiplayerPanel.js` (NEU): Host/Join UI
  - Host-Ansicht: IP-Anzeige, Lobby-Code, Spieler-Liste (bis 10), Settings, "Match starten"
  - Join-Ansicht: Code-Eingabe, Verbindungsstatus, Fehler-Feedback
  - Nutzt `MenuMultiplayerBridge` fuer State-Management
  - Nutzt `MenuTextCatalog` fuer alle Texte

- [ ] A.4 `MenuGameplayBindings.js`: Multiplayer-Events verdrahten
  - HOST_GAME, JOIN_GAME, LEAVE_LOBBY, TOGGLE_READY, START_MATCH Events
  - Feature-Flag `canHost` pruefen bei Host-Aktion

- [ ] A.5 `MenuLobbyRenderer.js` (NEU): Lobby-Darstellung
  - Spieler-Liste mit Ready-Status, Ping-Anzeige
  - Settings-Zusammenfassung (Map, Modus, Rundenanzahl)
  - Dynamische Updates via BroadcastChannel Events

- [ ] A.6 `style.css`: Multiplayer-Styles
  - Lobby-Layout, Spieler-Karten, Ready-Indikator
  - Responsive fuer Touch/Tablet

- [ ] A.7 Test: Menue-Navigation Multiplayer, Feature-Flag canHost

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

- [ ] B.1 `GameRuntimeFacade.js`: SessionAdapter-Integration
  - Bei `startMatch()`: SessionAdapter basierend auf `sessionType` waehlen (Local/LAN/Online)
  - Host: State-Snapshots (10/s) via `session.broadcastState()` senden
  - Client: `session.onStateUpdate()` an `StateReconciler` weiterleiten
  - Arena-Load-Gate: alle Spieler signalisieren "loaded" vor Tick 0

- [ ] B.2 `InputManager.js`: PlayerInputSource-Architektur
  - Jeder Spieler bekommt `PlayerInputSource`-Instanz (Keyboard/Gamepad/Touch/Remote)
  - `getPlayerInput(index)` delegiert an zugewiesene Source
  - Auto-Detection: Keyboard als Default, Gamepad bei Verbindung

- [ ] B.3 `MatchFlowUiController.js`: Multiplayer Match-Lifecycle
  - Netzwerk-Match: kein lokaler Pause (nur Host kann pausieren)
  - Round-Lifecycle synchron: `round_start`/`round_end`/`match_end` ueber alle Peers
  - Nach-Match: Rematch, Return-to-Lobby, Spieler-Slot-Verwaltung

- [ ] B.4 `HudRuntimeSystem.js`: N-Player Scoreboard
  - Dynamisches Scoreboard fuer bis zu 10 Spieler
  - Zeigt nur lokale HUD-Elemente (Items, Health) fuer eigenen Spieler
  - Scoreboard zeigt alle Spieler mit Ping-Indikator

- [ ] B.5 `RenderViewportSystem.js`: Viewport-Modi
  - Vollbild fuer Netzwerk-Sessions (`networkEnabled === true`)
  - Splitscreen nur bei `sessionType='splitscreen'` (lokal 2P)
  - Kamera folgt nur eigenem Spieler bei Netzwerk

- [ ] B.6 `PauseOverlayController.js`: Netzwerk-Pause
  - Bei Netzwerk: Pause nur durch Host, Clients bekommen "Host hat pausiert" Overlay
  - ESC bei Client: Disconnect-Bestaetigung statt Pause

- [ ] B.7 Test: bestehende `test:core` + `test:physics` muessen gruen bleiben

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

- [ ] C.1 Netzwerk-Robustheit
  - Disconnect-Detection: Data Channel close + Heartbeat (5s Timeout)
  - Client-Disconnect: Bot-Uebernahme oder leerer Slot, andere Clients informiert
  - Host-Disconnect: "Host getrennt" Dialog, Match beendet
  - Reconnect: 30s Fenster, Full State Sync bei Wiedereintritt
  - Graceful Leave: `beforeunload` sendet Leave-Nachricht

- [ ] C.2 `NetworkHud.js` erweitern
  - Disconnect-Warning Overlay
  - Reconnect-Countdown
  - Bandbreiten-Anzeige (optional)

- [ ] C.3 Build-Skripte
  - `npm run build:web` — statische Website, `canHost=false`, nur Join
  - `npm run build:app` — Electron-App mit eingebettetem LAN-Server
  - Vite-Config: Env-Variable `VITE_APP_MODE=web|app`

- [ ] C.4 Touch-Integration
  - `index.html`: Touch-Control Container Markup
  - `TouchInputSource.js`: Auto-Show bei Touch-Geraet, Auto-Hide bei Desktop
  - Touch-Controls nur im Match sichtbar, nicht im Menue

- [ ] C.5 Replay-Integration
  - `ReplayRecorder`: in GameRuntimeFacade einklinken (Start/Stop bei Match)
  - Replay-Persistenz: JSON-Export (App: Dateisystem via IPC, Demo: Download)
  - Spectator-Stub: `SpectatorInputSource` + `PlayerRole.SPECTATOR`

- [ ] C.6 Electron App finalisieren
  - Build-Config: `electron-builder` oder `electron-forge`
  - Auto-Start LAN-Server beim App-Start
  - Tray-Icon mit Server-Status (optional)

- [ ] C.7 Test: Disconnect-Simulation, Reconnect, Build-Skripte

**Schnittstelle zu B:** Agent C implementiert `SessionAdapter`-Interface Methoden.
Agent B ruft diese auf. Kein direkter Datei-Overlap.

---

### Phase 41.99: Abschluss-Gate (nach allen Workstreams)

- [ ] 41.99.1 LAN-Match: 2+ Rechner, stabiles Match, App hostet, Website joint
- [ ] 41.99.2 Internet-Match: 2+ Rechner ueber Internet via Signaling-Server
- [ ] 41.99.3 Gamepad + Touch: funktional, konfigurierbar
- [ ] 41.99.4 Alle Tests gruen
- [ ] 41.99.5 Performance: Host-CPU <30% Overhead bei 10 Spielern

---

### Backlog (nach V41)

| ID | Titel | Plan-Datei | Status |
|----|-------|-----------|--------|
| V39 | Komplexe Showcase-Map | `docs/Feature_Komplexe_Showcase_Map_V39.md` | In Bearbeitung |
| V40 | Hunt Rocket Trail Targeting | `docs/Feature_Hunt_Rocket_Trail_Targeting_V40.md` | Offen |
| V42 | Menu Default Editor | `docs/Feature_Menu_Default_Editor_V42.md` | In Bearbeitung |
| V43 | Projektstruktur Spiel/Dev-Ordner | `docs/Feature_Projektstruktur_Spiel_Dev_Ordner_V43.md` | Offen |
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
