# Feature: Multiplayer — LAN + Internet, bis 10 Spieler (V41)

Stand: 2026-03-23
Status: In Umsetzung
Owner: Single-Agent

## Ziel

Bis zu **10 Spieler** auf verschiedenen Computern (oder Tablets) spielen ueber **LAN** oder **Internet** gegeneinander — jeder mit eigenem Vollbild. Das Spiel wird in zwei Varianten ausgeliefert:

- **Demo (Website):** Kann nur Spielen **beitreten** (Join). Kein Hosting moeglich.
- **Vollversion (Electron/Tauri-App):** Kann Spiele **hosten** und beitreten. Bettet den LAN-Signaling-Server ein.

## Architektur

- **Star-Topologie:** Host haelt N-1 PeerConnections (bis 9 Clients). Kein Mesh.
- **Host-autoritativ:** Host berechnet Physik, Kollisionen, Scoring. Clients senden Inputs, empfangen State.
- **WebRTC Data Channels:** 2 pro Client — "inputs" (unreliable/unordered) + "state" (reliable/ordered).
- **Fixed Timestep 60Hz:** Deterministisch, Rendering variabel + Interpolation.
- **Input-Delay Netcode:** 1-12 Frames adaptiv basierend auf RTT.

## Implementierungsstand

### Umgesetzt (Phase 0 + 41.1-41.9)

- [x] `ActionDispatcher` — zentraler State-Change-Dispatcher
- [x] `GameStateSnapshot` + `crc32` — serialisierbarer State fuer Netzwerk
- [x] `PauseOverlayController` — nutzt Dispatcher statt direkter Mutation
- [x] `HudRuntimeSystem` + `CrosshairSystem` — N-Player-flexibel
- [x] `RuntimeConfig` — `networkEnabled`, `maxPlayers`, `sessionType='lan'|'online'`
- [x] `MenuStateContracts` — `LAN` und `ONLINE` Session-Typen
- [x] `SessionAdapter` Interface + `LocalSessionAdapter`
- [x] `PlayerInputSource` Interface + `KeyboardInputSource`
- [x] `GamepadInputSource` — Gamepad API mit Hot-plug
- [x] `TouchInputSource` — virtueller Joystick + Touch-Buttons
- [x] `MatchLobby` Interface + `LocalMatchLobby`
- [x] `PlayerRole` Enum
- [x] `PeerConnectionManager` — WebRTC Lifecycle, Star-Topologie
- [x] `DataChannelManager` — pro-Client Channel-Routing
- [x] `LatencyMonitor` — RTT/Jitter pro Peer
- [x] `InputDelayBuffer` — adaptiv 1-12 Frames
- [x] `RemoteInputSource` — deserialisierte Netzwerk-Inputs
- [x] `LANSessionAdapter` + `OnlineSessionAdapter`
- [x] `LANMatchLobby` + `OnlineMatchLobby`
- [x] `StateReconciler` — Client-seitige State-Korrektur
- [x] `NetworkHud` — Ping, Spieleranzahl, Status
- [x] `ReplayRecorder` + `ReplayPlayer`
- [x] `server/lan-signaling.js` — HTTP-basierter LAN-Server
- [x] `server/signaling-server.js` — WebSocket-Server fuer Internet
- [x] `server/Dockerfile` + `server/package.json`
- [x] `electron/main.js` + `electron/preload.js` — App-Skeleton

### Noch offen

- [ ] Menue-Integration: Multiplayer-Submenue, Host/Join UI
- [ ] WebRTC End-to-End Integration in GameRuntimeFacade
- [ ] LAN-Signaling in Electron einbetten und testen
- [ ] Internet-Signaling deployed + getestet
- [ ] Gamepad/Touch im Match getestet
- [x] 10-Spieler-Stresstest (abgeschlossen: 2026-03-23; evidence: node scripts/perf-host-budget-v41.mjs -> tmp/perf-host-budget-report-v41.json)
- [ ] Replay-Verifikation
- [ ] Abschluss-Gate

## Dateistruktur

```
src/core/ActionDispatcher.js
src/core/GameStateSnapshot.js
src/core/session/SessionAdapter.js
src/core/session/LocalSessionAdapter.js
src/core/input/PlayerInputSource.js
src/core/input/KeyboardInputSource.js
src/core/input/GamepadInputSource.js
src/core/lobby/MatchLobby.js
src/core/lobby/LocalMatchLobby.js
src/core/player/PlayerRole.js
src/core/replay/ReplayRecorder.js
src/core/replay/ReplayPlayer.js
src/ui/TouchInputSource.js
src/ui/NetworkHud.js
src/network/PeerConnectionManager.js
src/network/DataChannelManager.js
src/network/LANSessionAdapter.js
src/network/OnlineSessionAdapter.js
src/network/LANMatchLobby.js
src/network/OnlineMatchLobby.js
src/network/RemoteInputSource.js
src/network/InputDelayBuffer.js
src/network/LatencyMonitor.js
src/network/StateReconciler.js
server/lan-signaling.js
server/signaling-server.js
server/package.json
server/Dockerfile
electron/main.js
electron/preload.js
electron/package.json
```

## Referenzen

- Vollstaendiger Plan: `docs/Umsetzungsplan.md` (Block V41)
- Post-V41 Erweiterungen: N2 Matchmaking, N3 Ranked, N4 Dedicated Server, N5 Spectator, N6 Rollback, N7 Host-Migration, N8 Anti-Cheat
