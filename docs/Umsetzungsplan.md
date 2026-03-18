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

## Offene Arbeit

### Block V41: Multiplayer — LAN + Internet, bis 10 Spieler

Plan-Datei: `docs/Feature_Lokaler_Multiplayer_V41.md`
Datei-Scope: `src/**`, `server/**`, `electron/**`, `index.html`, `style.css`, `tests/**`

#### Phase 0: Architektur-Vorbereitung

Voraussetzung fuer stabilen Multiplayer. Jede Unterphase ist eigenstaendig ausfuehrbar.

- [ ] 0.1 Player-Array-Migration
  - [ ] 0.1.1 `InputManager`: `PLAYER_1`/`PLAYER_2` Bindings durch `players[i]`-Array ersetzen; `getPlayerInput(index)` beibehalten
  - [ ] 0.1.2 `RuntimeConfig`: `vehicles.PLAYER_1`/`PLAYER_2` durch `vehicles[i]`-Array ersetzen; `numHumans` als dynamischen Wert statt Hardcode
  - [ ] 0.1.3 `HudRuntimeSystem`: `numHumans === 2` Check durch `players.length`-Schleife ersetzen
  - [ ] 0.1.4 `CrosshairSystem`: `players[0]`/`players[1]` Hardcode durch Schleife ueber lokale Spieler ersetzen
  - [ ] 0.1.5 `PauseOverlayController`: `PLAYER_1`/`PLAYER_2` invertPitch durch `players[i]`-Schleife ersetzen
  - [ ] 0.1.6 Test: bestehende `test:core`, `test:physics` muessen gruen bleiben

- [ ] 0.2 State-Mutation durch Dispatcher ersetzen
  - [ ] 0.2.1 `ActionDispatcher` einfuehren: `dispatch({ type, payload, playerId })` — zentrale Stelle fuer State-Aenderungen
  - [ ] 0.2.2 `PauseOverlayController`: direkte `game.settings.invertPitch` Mutation durch Dispatcher-Call ersetzen
  - [ ] 0.2.3 `MatchFlowUiController`: `game._applySettingsToRuntime()` durch Dispatcher ersetzen
  - [ ] 0.2.4 Test: bestehende Tests gruen

- [ ] 0.3 God-Object `game` in UI-Controllern reduzieren
  - [ ] 0.3.1 `MatchFlowUiController`: statt `game`-Objekt nur noch benoetigte Ports/Interfaces injizieren
  - [ ] 0.3.2 `PauseOverlayController`: `game`-Referenz durch Ports ersetzen (Settings-Dispatcher, Player-Liste, UI-Elemente)
  - [ ] 0.3.3 `HudRuntimeSystem`: `game`-Referenz durch Ports ersetzen (Players, UI-Elemente, Match-State)
  - [ ] 0.3.4 Test: bestehende Tests gruen

- [ ] 0.4 State-Serialisierung vorbereiten
  - [ ] 0.4.1 Player-State von THREE.js trennen: `getSerializableState()` Methode auf Player/Bot, gibt `{ pos: [x,y,z], rot: [x,y,z,w], health, score }` zurueck
  - [ ] 0.4.2 `GameStateSnapshot` Klasse: sammelt serialisierbaren State aller Entities fuer Netzwerk-Transport
  - [ ] 0.4.3 Test: Snapshot erstellen, JSON.stringify/parse roundtrip, Werte pruefen

#### Phase 41.1: Interfaces und Grundstruktur

- [ ] 41.1.1 `src/core/session/SessionAdapter.js` — Interface mit Methoden: `connect()`, `disconnect()`, `sendInput()`, `onStateUpdate()`, `getPlayers()`
- [ ] 41.1.2 `src/core/input/PlayerInputSource.js` — Interface: `poll()` gibt `{ pitch, yaw, roll, throttle, firing, boost }` zurueck
- [ ] 41.1.3 `src/core/lobby/MatchLobby.js` — Interface: `create()`, `join(code)`, `leave()`, `onPlayersChanged()`, `startMatch()`
- [ ] 41.1.4 `src/core/player/PlayerRole.js` — Enum: `ACTIVE`, `SPECTATOR`, `BOT`
- [ ] 41.1.5 `LocalSessionAdapter` implementieren (Splitscreen, shared memory, kein Netzwerk)
- [ ] 41.1.6 `KeyboardInputSource` implementieren (bestehenden Keyboard-Code auf Interface refactoren)
- [ ] 41.1.7 `LocalMatchLobby` implementieren (Splitscreen-Lobby, sofort-start)
- [ ] 41.1.8 Bestehenden Spielfluss auf neue Interfaces umverdrahten; Tests gruen

#### Phase 41.2: Menue und Lobby-UI

- [ ] 41.2.1 `MenuSchema`/`MenuTextCatalog`: Multiplayer-Submenue mit "Spiel erstellen" (nur wenn `canHost`) und "Spiel beitreten"
- [ ] 41.2.2 Feature-Flag `canHost`: `window.__CURVIOS_APP__ === true` (App) vs. `false` (Website)
- [ ] 41.2.3 Host-UI: IP-Anzeige, Lobby-Code, Spieler-Liste (bis 10), Settings, "Match starten" Button
- [ ] 41.2.4 Client-UI: IP/Code-Eingabe, Verbindungsstatus, Fehler-Feedback
- [ ] 41.2.5 `RuntimeConfig` erweitern: `sessionType='lan'`/`'online'`, `networkEnabled`, `maxPlayers`
- [ ] 41.2.6 Test: Menue-Navigation, Feature-Flag-Steuerung

#### Phase 41.3: WebRTC-Stack

- [ ] 41.3.1 `src/network/PeerConnectionManager.js`: WebRTC Lifecycle, Star-Topologie (Host haelt N-1 Connections)
- [ ] 41.3.2 `src/network/DataChannelManager.js`: pro-Client "inputs" (unreliable) + "state" (reliable) Channels
- [ ] 41.3.3 `src/network/LANSignalingClient.js`: HTTP fetch-basierter Client fuer LAN-Signaling
- [ ] 41.3.4 `src/network/WebSocketSignalingClient.js`: WS-Client fuer Internet-Signaling
- [ ] 41.3.5 `src/network/LatencyMonitor.js`: RTT pro Client, Jitter-Tracking
- [ ] 41.3.6 STUN/TURN-Konfiguration: Google STUN + coturn Config
- [ ] 41.3.7 Test: 2 PeerConnections im selben Browser verbinden, Nachrichten tauschen

#### Phase 41.4: Signaling-Server

- [ ] 41.4.1 `server/lan-signaling.js`: HTTP-basierter LAN-Server (~100 Zeilen): Lobby CRUD, SDP/ICE Forwarding
- [ ] 41.4.2 `server/signaling-server.js`: WebSocket-Server (~200 Zeilen): Lobby CRUD, SDP/ICE, Heartbeat, Cleanup
- [ ] 41.4.3 `server/package.json`: Abhaengigkeit `ws`
- [ ] 41.4.4 `server/Dockerfile`: fuer VPS-Deployment
- [ ] 41.4.5 Test: Server starten, Lobby erstellen/joinen, SDP austauschen (Node.js Unit-Test)

#### Phase 41.5: Input-System erweitern

- [ ] 41.5.1 `src/core/input/GamepadInputSource.js`: Gamepad API, konfigurierbares Mapping, Hot-plug, Multi-Gamepad
- [ ] 41.5.2 `src/core/input/TouchInputSource.js`: virtueller Joystick + Touch-Buttons, Auto-Detection (`'ontouchstart' in window`)
- [ ] 41.5.3 `src/network/RemoteInputSource.js`: deserialisiert Netzwerk-Inputs, Input-Buffer
- [ ] 41.5.4 `InputManager` refactoren: jeder Spieler bekommt eine `PlayerInputSource`-Instanz zugewiesen
- [ ] 41.5.5 `src/network/InputDelayBuffer.js`: 1-12 Frames Delay, adaptiv basierend auf RTT
- [ ] 41.5.6 Input-Source-Auswahl im Menue: Auto-Detect als Default, manuell ueberschreibbar
- [ ] 41.5.7 Touch-Controls in `index.html`/`style.css`: virtueller Joystick (links), Buttons (rechts)
- [ ] 41.5.8 Test: Gamepad-Mock, Touch-Event-Mock, RemoteInput Roundtrip

#### Phase 41.6: Session-Adapter und State-Sync

- [ ] 41.6.1 `src/network/LANSessionAdapter.js`: verbindet via LAN-Signaling, WebRTC aufbauen, Input/State tauschen
- [ ] 41.6.2 `src/network/OnlineSessionAdapter.js`: verbindet via WS-Signaling, STUN/TURN, WebRTC
- [ ] 41.6.3 `src/network/LANMatchLobby.js` + `src/network/OnlineMatchLobby.js`
- [ ] 41.6.4 Host: State-Snapshots (10/s) an alle Clients senden, CRC32 Checksums
- [ ] 41.6.5 Client: Prediction + State-Korrektur via Interpolation
- [ ] 41.6.6 Arena-Load-Gate: alle Spieler signalisieren "loaded" vor Tick 0
- [ ] 41.6.7 `GameRuntimeFacade` auf SessionAdapter-Integration umbauen
- [ ] 41.6.8 Test: Host + Client Session aufbauen, State-Snapshot senden/empfangen

#### Phase 41.7: Runtime und HUD fuer N Spieler

- [ ] 41.7.1 N-Player HUD: dynamisches Scoreboard fuer bis zu 10 Spieler
- [ ] 41.7.2 N-Player Kamera: nur eigener Spieler lokal gerendert (Vollbild statt Splitscreen bei Netzwerk)
- [ ] 41.7.3 `RenderViewportSystem`: Vollbild fuer Netzwerk-Sessions, Splitscreen nur bei `sessionType='splitscreen'`
- [ ] 41.7.4 Round-Lifecycle synchron: `round_start`/`round_end`/`match_end` ueber alle Peers
- [ ] 41.7.5 Nach-Match: Rematch, Return-to-Lobby, Spieler-Slot-Verwaltung
- [ ] 41.7.6 Test: Scoreboard mit 5+ Spielern rendern, Viewport-Modi pruefen

#### Phase 41.8: Netzwerk-Robustheit

- [ ] 41.8.1 Netzwerk-HUD: Ping-Anzeige, Spieleranzahl, Verbindungsstatus (gruen/gelb/rot)
- [ ] 41.8.2 Disconnect-Detection: Data Channel close + Heartbeat (5s Timeout)
- [ ] 41.8.3 Client-Disconnect: Bot-Uebernahme oder leerer Slot, andere Clients informiert
- [ ] 41.8.4 Host-Disconnect: "Host getrennt" Dialog, Match beendet
- [ ] 41.8.5 Reconnect: 30s Fenster, Full State Sync bei Wiedereintritt
- [ ] 41.8.6 Graceful Leave: `beforeunload` sendet Leave-Nachricht
- [ ] 41.8.7 Test: Disconnect simulieren, Reconnect pruefen

#### Phase 41.9: App-Build

- [ ] 41.9.1 Electron Projekt-Setup: `electron/main.js`, `electron/preload.js`, `electron/package.json`
- [ ] 41.9.2 Main Process: LAN-Signaling-Server als Child-Process starten
- [ ] 41.9.3 IPC Bridge: `window.__CURVIOS_APP__ = true` setzen, LAN-Server-Status kommunizieren
- [ ] 41.9.4 Web-Build: statische Website, `canHost=false`, nur Join
- [ ] 41.9.5 Build-Skripte: `npm run build:web` und `npm run build:app`
- [ ] 41.9.6 Test: App kann hosten+joinen, Website kann nur joinen

#### Phase 41.10: Replay und Spectator-Vorbereitung

- [ ] 41.10.1 `src/core/replay/ReplayRecorder.js`: `{ initialState, actions[], playerCount }` aufzeichnen
- [ ] 41.10.2 `src/core/replay/ReplayPlayer.js`: Playback mit Play/Pause/Speed
- [ ] 41.10.3 Replay-Persistenz: JSON-Export (App: Dateisystem, Demo: Download)
- [ ] 41.10.4 Spectator-Interface: `SpectatorInputSource`-Stub + `PlayerRole.SPECTATOR`
- [ ] 41.10.5 Test: Record + Playback = identischer Endstate

#### Phase 41.99: Abschluss-Gate

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
