# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-19

Dieser Masterplan ist die einzige aktive Planquelle fuer offene Arbeit.
Abgeschlossene Plaene und historische Dokumente liegen unter `docs/archive/`.

## Status-Legende

- [ ] Offen
- [/] In Bearbeitung
- [x] Abgeschlossen

## Parallelmodus fuer 3 Agenten

- Maximal 3 aktive Agenten gleichzeitig.
- Priorisierte Startbelegung: `Bot-1 -> V45 / 45.1`, `Bot-2 -> V45 / 45.2`, `Bot-3 -> V45 / 45.3`.
- V46 wird erst nach `45.9` geclaimt, damit `src/core/**`, `src/state/**`, `src/ui/**` und `prototypes/vehicle-lab/**` nicht blockuebergreifend kollidieren.
- Gemeinsame Pfade (`docs/**`, `tests/**`) bleiben shared; Fremdpfad-Aenderungen muessen vor dem Commit im `Conflict-Log` stehen.

## Datei-Ownership

| Pfadmuster | Block / Stream | Claim-Status | Hinweise |
| --- | --- | --- | --- |
| `src/network/**`, `server/**`, `electron/**` | V41 Abschluss-Gate | reserviert | Nicht in V45/V46 anfassen |
| `docs/Feature_Arcade_Modus_V45.md`, `src/ui/menu/**`, `src/ui/arcade/**`, `style.css` | V45 / 45.1 | Bot-A seit 2026-03-19 | Produkt-Freeze, Menue, HUD, Post-Run-Flaechen |
| `src/core/GameRuntimeFacade.js`, `src/core/runtime/MenuRuntimeSessionService.js`, `src/core/RuntimeConfig.js`, `src/core/SettingsManager.js`, `src/core/arcade/**`, `src/state/arcade/**` | V45 / 45.2 | Bot-B seit 2026-03-19 | Run-State, Runtime-Hooks, Score/Persistenz |
| `src/entities/arcade/**`, `src/entities/directors/**`, `prototypes/vehicle-lab/**`, `data/vehicles/**` | V45 / 45.3 | frei | Encounter Director, Mastery, Blueprints |
| `src/utils/MathOps.js`, `src/shared/contracts/**`, `scripts/architecture/ArchitectureConfig.mjs` | V46 / 46.1 | blockiert bis `45.9` | Shared Foundations und Boundary-Regeln |
| `src/core/MediaRecorderSystem.js`, `src/core/recorder/**`, `src/core/GameRuntimeFacade.js`, `src/core/runtime/**`, `src/core/PlayingStateSystem.js`, `src/state/RoundStateTickSystem.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/ui/menu/multiplayer/**`, `eslint.config.js` | V46 / 46.2 | blockiert bis `45.9` | Core-/UI-Aufspaltung, DI, Legacy-Ceilings |
| `src/hunt/**`, `src/entities/systems/ProjectileSystem.js`, `src/entities/ai/**`, `src/ui/HuntHUD.js` | V46 / 46.3 | blockiert bis `45.9` | Hunt-, AI- und Modulgrenzen |
| `docs/**`, `tests/**` | Shared | shared | Append-only oder eigener Abschnitt; Konflikte loggen |

## Conflict-Log

| Datum | Bot | Fremder Block/Stream | Datei | Grund | Risiko |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | Noch leer | niedrig |

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

<!-- LOCK: Bot-A seit 2026-03-19 -->

**Scope**

- `Arcade` von einem reinen Preset zu einem echten Modus mit eigenem Run-Lifecycle ausbauen
- V1: Singleplayer-first, kurzer Survival-Gauntlet, Score-/Combo-System, Sektor-/Wellenstruktur
- Folgeausbau: Flugzeug-Leveling, Vehicle-Editor-Blueprints, Seeds, Daily Challenge, lokale Bestenliste, Replay-Anbindung

**Parallelregel**

- V45 ist der primare 3-Agenten-Startblock.
- Die Streams `45.1`, `45.2` und `45.3` koennen sofort parallel gestartet werden.
- Integrationsdateien ausserhalb des eigenen Stream-Scopes werden erst in `45.9` oder mit `Conflict-Log`-Eintrag angefasst.
- Kein V45-Stream fuehrt einen dritten technischen `GAME_MODE_TYPE` ein; Arcade bleibt ein Run-Layer auf bestehender Runtime.

---

### 45.1 Agenten-Stream A: Produkt-Freeze, Menue und HUD

<!-- SUB-LOCK: Bot-A seit 2026-03-19 -->

**Owner-Scope**

- `docs/Feature_Arcade_Modus_V45.md`
- `src/ui/menu/**`
- `src/ui/arcade/**`
- `style.css`

- [x] 45.1.1 Zielbild, Nicht-Ziele, UX-Fluss und Seed-/Challenge-Anker fuer Arcade finalisieren, ohne die Runtime-Grundentscheidung zu oeffnen (Bot-A, 2026-03-19)
- [x] 45.1.2 Menue-Einstieg, HUD-Shell, Post-Run-Feedback, Replay-/Daily-Platzhalter und Vehicle-Mastery-Anker an vorhandene Runtime-Hooks anbinden (Bot-A, 2026-03-19)

---

### 45.2 Agenten-Stream B: Run-Lifecycle und Score-System

<!-- SUB-LOCK: Bot-B seit 2026-03-19 -->

**Owner-Scope**

- `src/core/GameRuntimeFacade.js`
- `src/core/runtime/MenuRuntimeSessionService.js`
- `src/core/RuntimeConfig.js`
- `src/core/SettingsManager.js`
- `src/core/arcade/**`
- `src/state/arcade/**`

- [x] 45.2.1 Separaten Arcade-Run-State, Sektor-/Intermission-Fluss und Match-Flow ohne klassischen Rundensieg-Zyklus in Runtime und State verankern (Bot-B, 2026-03-19)
- [x] 45.2.2 Score, Multiplikator, Combo-Decay, Breakdown, Rekorde sowie Persistenz-/Replay-Hooks als eigenen Run-Layer aufbauen (Bot-B, 2026-03-19)
- Verifikation (Bot-B, 2026-03-19): `npm run smoke:roundstate` PASS, gezielte Core-Arcade-Cases PASS (`T20bb`, `T20q`, `T20v`, `T20x`), `npm run docs:sync` PASS, `npm run docs:check` PASS, `npm run build` BLOCKIERT durch vorbestehenden Boundary-Fehler in `src/entities/systems/projectile/ProjectileHitResolver.js -> src/core/Config.js`.

---

### 45.3 Agenten-Stream C: Encounter Director, Mastery und Blueprints

<!-- SUB-LOCK: frei -->

**Owner-Scope**

- `src/entities/arcade/**`
- `src/entities/directors/**`
- `prototypes/vehicle-lab/**`
- `data/vehicles/**`

- [x] 45.3.1 Wellen-/Sektorkatalog fuer Bot-Squads, Ziele, Modifikatoren und run-temporaere Flugzeug-Levelups definieren (abgeschlossen: 2026-03-19)
- [x] 45.3.2 Persistente Airframe-Mastery, Blueprint-Schema und Vehicle-Editor-Integration mit Budget-/Hitbox-Guards ausarbeiten (abgeschlossen: 2026-03-19)

---

### Phase 45.9: Integrations- und Abschluss-Gate

- [/] 45.9.1 V45-A, V45-B und V45-C zusammenfuehren; Menue -> Run -> Post-Run -> Replay-/Seed-Handoff manuell und automatisiert verifizieren (Bot-A, 2026-03-19, in Umsetzung: `smoke:roundstate` + neuer `smoke:arcade` gruen; restliche Playwright-Gates und finaler Handoff warten auf freien Suite-Lock)
- [/] 45.9.2 Tests, `docs:sync`, `docs:check`, Doku-Freeze sowie Lock-/Ownership-Bereinigung abschliessen (Bot-A, 2026-03-19, in Umsetzung: `docs:sync`, `docs:check`, `build` gruen; Lock-/Ownership-Cleanup nach vollstaendigem 45.9-Gate)

---

## Block V46: Architektur-Verbesserungen - Deduplizierung, Contracts, God Objects

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V45.9 -->

**Scope**

- Duplizierte Utility-Funktionen zentralisieren
- Shared Contracts fuer moduluebergreifende Kommunikation einfuehren
- Bidirektionale Abhaengigkeiten (core<>entities, ui<>state, state<>core) aufloesen
- God Objects (MediaRecorderSystem, GameRuntimeFacade, MenuMultiplayerBridge) aufbrechen
- Magic Numbers in Hunt/Projectile/AI konsolidieren
- Service-Locator-Pattern schrittweise durch Dependency Injection ersetzen
- Event-Pattern vereinheitlichen
- Modul-Grenzen korrigieren (HuntHUD, AI Sensing)

**Parallelregel**

- V46 startet erst nach `45.9`, damit die verbleibenden Runtime-/UI-Pfade konfliktfrei freiwerden.
- Ab `45.9` koennen die Streams `46.1`, `46.2` und `46.3` parallel laufen.
- `46.99` ist der einzige gemeinsame Integrationspunkt fuer shared Tests, Docs und Lock-Bereinigung.
- Kein V46-Stream aendert Spielmechanik oder Balance-Werte; erlaubt sind nur strukturelle Verschiebungen und Konfig-Konsolidierung.

---

### 46.1 Agenten-Stream A: Shared Foundations und Boundary Contracts

<!-- SUB-LOCK: frei -->

**Owner-Scope**

- `src/utils/MathOps.js`
- `src/shared/contracts/**`
- `scripts/architecture/ArchitectureConfig.mjs`

- [ ] 46.1.1 Utility-Deduplizierung und Shared Contracts extrahieren (`toFiniteNumber`, `clamp01`, Config/Entity/Hunt/Training/MatchLifecycle)
- [ ] 46.1.2 Bidirektionale Import-Kanten ueber die neuen Contracts aufloesen und Boundary-Regeln/Allowlists im Architektur-Check verschaerfen

---

### 46.2 Agenten-Stream B: Core- und Menu-Decomposition

<!-- SUB-LOCK: frei -->

**Owner-Scope**

- `src/core/MediaRecorderSystem.js`
- `src/core/recorder/**`
- `src/core/GameRuntimeFacade.js`
- `src/core/runtime/**`
- `src/core/PlayingStateSystem.js`
- `src/state/RoundStateTickSystem.js`
- `src/ui/menu/MenuMultiplayerBridge.js`
- `src/ui/menu/multiplayer/**`
- `eslint.config.js`

- [ ] 46.2.1 `MediaRecorderSystem` und `GameRuntimeFacade` in kleinere Module mit klaren Facades zerlegen
- [ ] 46.2.2 `MenuMultiplayerBridge` entkoppeln, neue Module direkt per Dependency Injection bauen, Legacy-Ceilings senken und `window.GAME_INSTANCE`/`constructor(game)`-Altlasten reduzieren

---

### 46.3 Agenten-Stream C: Hunt/AI-Cleanups und Modulgrenzen

<!-- SUB-LOCK: frei -->

**Owner-Scope**

- `src/hunt/**`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/ai/**`
- `src/ui/HuntHUD.js`

- [ ] 46.3.1 Magic Numbers in Hunt, Projectile und AI in Konfig-Objekte ueberfuehren und Sensing-Primitives fuer AI-Perception extrahieren
- [ ] 46.3.2 HuntHUD nach `src/ui/` verschieben, DOM-/Constructor-Legacy abbauen und Event-/Lifecycle-Migration fuer die beruehrten Pfade abschliessen

---

### Phase 46.99: Integrations- und Abschluss-Gate

- [ ] 46.99.1 `npm run lint`, `npm run check:architecture` und `npx playwright test` gruen; keine verbotenen Import-Zyklen mehr
- [ ] 46.99.2 Manuelle Smoke-Tests, `docs:sync`, `docs:check`, `Conflict-Log`-Abgleich und Lock-/Ownership-Bereinigung abschliessen

---

## Block V47: Strategy Pattern — Game-Mode if/else eliminieren

Plan-Datei: `docs/Feature_Strategy_Pattern_V47.md`

<!-- LOCK: frei -->

**Scope**

- ~20 Dateien enthalten `if (isHuntHealthActive())` / `if (huntModeActive)` Checks
- Jeder neue Modus (Arcade etc.) wuerde Aenderungen in all diesen Dateien erfordern
- Ziel: Strategy Pattern einfuehren, sodass ein neuer Modus nur eine neue Strategy-Klasse braucht
- 4 neue Dateien (`src/modes/`), 1 neue Test-Datei, 12 bestehende Dateien migrieren

**Hauptpfade**

- `src/modes/**` (NEU)
- `src/entities/EntityManager.js`
- `src/entities/runtime/EntitySetupOps.js`
- `src/entities/systems/PlayerLifecycleSystem.js`
- `src/entities/systems/lifecycle/PlayerCollisionPhase.js`
- `src/entities/systems/lifecycle/PlayerActionPhase.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/systems/projectile/ProjectileHitResolver.js`
- `src/entities/systems/HuntCombatSystem.js`
- `src/entities/Powerup.js`
- `src/hunt/HealthSystem.js`
- `src/hunt/DestructibleTrail.js`
- `src/hunt/OverheatGunSystem.js`
- `src/hunt/RespawnSystem.js`
- `tests/game-mode-strategy.spec.js` (NEU)

**Konfliktregel**

- Kein V47-Block aendert `src/network/**`, `server/**` oder `electron/**`
- V47 fuehrt keinen neuen `GAME_MODE_TYPE` ein — nur das Strategy-Interface + 2 Implementierungen (Classic, Hunt)
- `isHuntHealthActive()` bleibt als deprecated erhalten fuer nicht-migrierte Call-Sites

**Phasen**

- [x] 47.0 Foundation (rein additiv, keine Verhaltensaenderung)
  - [x] 47.0.1 `src/modes/GameModeContract.js` — abstrakte Basis-Klasse
  - [x] 47.0.2 `src/modes/ClassicModeStrategy.js` — Classic-Modus-Implementierung
  - [x] 47.0.3 `src/modes/HuntModeStrategy.js` — Hunt-Modus-Implementierung
  - [x] 47.0.4 `src/modes/GameModeRegistry.js` — Factory + Fallback auf Classic
  - [x] 47.0.5 Strategy in EntityManager + EntitySetupOps verdrahten
  - [x] 47.0.6 `tests/game-mode-strategy.spec.js` — Unit-Tests

- [x] 47.1 Core Gameplay migrieren (hoechster Impact)
  - [x] 47.1.1 `PlayerLifecycleSystem.js` — Strategy statt boolean weiterreichen
  - [x] 47.1.2 `PlayerCollisionPhase.js` — Wall/Trail if/else durch Strategy-Calls ersetzen
  - [x] 47.1.3 `PlayerActionPhase.js` — Shoot/MG Guards auf Strategy umstellen
  - [x] 47.1.4 `HealthSystem.js` — Deprecation-Marker setzen

- [x] 47.2 Projectile-Systeme migrieren
  - [x] 47.2.1 `ProjectileSystem.js` — Rocket-Params via Strategy
  - [x] 47.2.2 `ProjectileHitResolver.js` — Hit-Resolution via Strategy
  - [x] 47.2.3 `DestructibleTrail.js` — Guard auf Strategy

- [x] 47.3 EntityManager-Interna migrieren
  - [x] 47.3.1 Respawn/DamageEvent/Scoring Guards auf Strategy

- [x] 47.4 Combat/Gun/Respawn migrieren
  - [x] 47.4.1 `HuntCombatSystem.js` — Lock-On via Strategy
  - [x] 47.4.2 `OverheatGunSystem.js` — Guard auf Strategy
  - [x] 47.4.3 `RespawnSystem.js` — Guard auf Strategy

- [x] 47.5 Powerup-Spawning migrieren
  - [x] 47.5.1 `Powerup.js` — Spawn-Logik via Strategy

- [x] 47.6 Cleanup
  - [x] 47.6.1 `isHuntHealthActive` Imports entfernen, tote Branches loeschen

- [/] 47.99 Abschluss-Gate
  - [/] 47.99.1 Alle bestehenden Tests gruen
  - [x] 47.99.2 Leere `ArcadeModeStrategy` registrieren — Spiel startet fehlerfrei (abgeschlossen: 2026-03-20)
  - [ ] 47.99.3 Classic + Hunt Playtest: Kollision, Shield, Tod, MG, Rocket, Respawn

---

## Block V48: Fight-Modus Qualitaet und Hunt-Targeting-Hotpath

Plan-Datei: `docs/Feature_Fight_Modus_Qualitaet_V48.md`

<!-- LOCK: frei -->

- [x] 48.1 Modus-Konsistenz und Startvalidierung
  - [x] 48.1.1 `modePath`/`gameMode` bidirektional synchronisieren
  - [x] 48.1.2 Startvalidierung + Feature-Flag-UI-Guard angleichen

- [x] 48.2 Schaden-/Feed-Semantik praezisieren
  - [x] 48.2.1 `hpApplied`/Shield-Absorption sauber trennen
  - [x] 48.2.2 Feed/Scoring auf HP-Schaden ausrichten, Shield separat ausweisen

- [x] 48.3 HUD und Splitscreen-Feedback
  - [x] 48.3.1 Damage-Indicator pro Human-Player im Hunt-HUD
  - [x] 48.3.2 Sichtbarkeit/Update fuer Single und Splitscreen verifiziert

- [x] 48.4 Hunt-Targeting-Hotpath
  - [x] 48.4.1 Baseline + Profiling-Grenzen dokumentiert (`hunt_targeting`-Profiler + Probe-Query-Telemetrie)
  - [x] 48.4.2 Adaptive Scan-Strategie unter Guard in Targeting-Ops implementiert
  - Verifikation: `T61`, `T64`, `T89c` PASS

- [/] 48.99 Abschluss-Gate
  - [ ] 48.99.1 `test:core`, `test:physics:hunt`, `test:stress`, `build` komplett gruen
    - Stand 2026-03-19: `build` PASS; `test:core` FAIL (`T14b`), `test:physics:hunt` FAIL (`T89b`, `T89d`), `test:stress` FAIL (`T71b`)
  - [x] 48.99.2 `docs:sync` + `docs:check` PASS, Lock/Ownership/Conflict-Log geprueft

---

## Block N4-N7: Performance-Optimierung und Telemetrie (Neu-Implementierung)

<!-- LOCK: frei -->

> **Hintergrund:** Diese Features waren auf dem veralteten Branch `claude/optimistic-allen` implementiert,
> konnten aber nicht gemergt werden, da der Branch zu weit hinter `main` lag.
> Die folgenden Aufgaben muessen auf dem aktuellen `main`-Stand neu implementiert werden.
> Die alten Commits (c7c6aa9, 17a39e8, c58cea0, 6d58fea, c11f216) sind im Reflog als Referenz verfuegbar.

**Scope**

- GC-Hotspots in per-Frame-Loops eliminieren
- Allocation-Hotspots im Replay-Snapshot-System eliminieren
- Deterministische State-Snapshot-Infrastruktur fuer kuenftigen Rollback
- IndexedDB-basierte Telemetrie-History fuer Cross-Session-Vergleich
- Bundle-Splitting und ESLint-max-lines-Fix fuer MapPresetCatalog

---

### N4: GC-Hotspot-Eliminierung in per-Frame Entity-Loops

<!-- SUB-LOCK: frei -->

**Betroffene Dateien:**
- `src/hunt/mg/MGTracerFx.js` — `splice()` durch O(n)-Compaction ersetzen
- `src/entities/player/PlayerEffectOps.js` — Swap-and-Pop statt splice
- `src/entities/player/PlayerInventoryOps.js` — Swap-and-Pop statt splice
- `src/entities/systems/HuntCombatSystem.js` — Swap-and-Pop statt splice
- `src/entities/systems/trails/TrailSegmentRegistry.js` — Key-Array-Pool statt keys.slice()

- [x] N4.1 `MGTracerFx.js`: splice() durch index-basierte Compaction ersetzen (abgeschlossen: 2026-03-20)
- [x] N4.2 `PlayerEffectOps.js`, `PlayerInventoryOps.js`: Swap-and-Pop Pattern (abgeschlossen: 2026-03-20)
- [x] N4.3 `HuntCombatSystem.js`: Swap-and-Pop fuer aktive Combats (abgeschlossen: 2026-03-20)
- [x] N4.4 `TrailSegmentRegistry.js`: vorallokierten Key-Array-Pool einfuehren (abgeschlossen: 2026-03-20)
- [x] N4.5 Verifikation: `test:physics:hunt`, `test:physics:core`, `docs:sync` PASS (abgeschlossen: 2026-03-20; T89b/T89d vorbestehende Failures)

---

### N5: Allocation-Hotspots im Replay-Snapshot-System eliminieren

<!-- SUB-LOCK: frei -->

**Betroffene Dateien:**
- `src/state/RoundRecorder.js` — `Math.round()` statt `.toFixed()` String-Roundtrip
- `src/state/recorder/RoundSnapshotStore.js` — vorallokierte Arrays statt `.slice().map()` und Spread

- [x] N5.1 `RoundRecorder.js`: toFixed()-String-Roundtrip durch Math.round() ersetzen (abgeschlossen: 2026-03-20)
- [x] N5.2 `RoundSnapshotStore.js`: getOrderedSnapshots() und getLastRoundGhostClip() mit vorallokierten Arrays (abgeschlossen: 2026-03-20)
- [x] N5.3 Verifikation: `smoke:roundstate` PASS, Ghost-Replay funktional (abgeschlossen: 2026-03-20)

---

### N6: Deterministische State-Snapshot-Infrastruktur

<!-- SUB-LOCK: frei -->

**Neue Dateien:**
- `src/core/SimStateSnapshot.js` (NEU) — Ring-Buffer (30 Ticks, zero-alloc Capture)

**Betroffene Dateien:**
- `src/core/PlayingStateSystem.js` — opt-in `enableSimSnapshots()` Hook

**Capture-Felder:**
- Player: Transforms, Velocities, Boost, Health, Effects, Inventory
- Trail-Metadata, Projectile-State

- [ ] N6.1 `SimStateSnapshot.js`: Ring-Buffer mit vorallokierten Slots (30 Ticks)
- [ ] N6.2 `PlayingStateSystem.js`: opt-in Capture-Hook, kein Performance-Impact wenn deaktiviert
- [ ] N6.3 Verifikation: `test:core`, `test:physics:core` PASS

---

### N7: Persistente Telemetrie (IndexedDB) fuer Cross-Session-Vergleich

<!-- SUB-LOCK: frei -->

**Neue Dateien:**
- `src/state/TelemetryHistoryStore.js` (NEU) — IndexedDB Store (max 500 Eintraege, Auto-Pruning)

**Betroffene Dateien:**
- `src/core/SettingsManager.js` — Telemetrie-Init-Hook
- `src/ui/menu/MenuTelemetryDashboard.js` — History-Summary laden (Runden, Winrates, Avg-Dauer)
- `src/ui/menu/MenuTelemetryStore.js` — Integration mit History-Store

- [x] N7.1 `TelemetryHistoryStore.js`: IndexedDB `cuviosclash-telemetry`, round_end Events persistieren (abgeschlossen: 2026-03-20)
- [x] N7.2 Auto-Pruning bei >500 Eintraegen, aelteste zuerst (abgeschlossen: 2026-03-20)
- [x] N7.3 Dashboard-Integration: Summary-Daten async laden und anzeigen (abgeschlossen: 2026-03-20)
- [x] N7.4 Verifikation: Funktionaltest, `docs:sync` PASS (abgeschlossen: 2026-03-20)

---

### MapPresetCatalog Bundle-Split

<!-- SUB-LOCK: frei -->

**Betroffene Dateien:**
- `src/core/config/maps/MapPresetCatalog.js` — grosse Presets auslagern
- `src/core/config/maps/MapPresetCatalogLarge.js` (NEU) — die_festung, mega_maze_xl
- `vite.config.js` — manualChunks fuer Training, Validation, Map-Presets, Developer-UI

- [ ] Split.1 Grosse Map-Presets in `MapPresetCatalogLarge.js` auslagern (ESLint max-lines)
- [ ] Split.2 Vite manualChunks konfigurieren fuer besseres Bundle-Splitting
- [ ] Split.3 Verifikation: `build` PASS, Bundle-Groesse pruefen

---

## Block V49: Neon Abyss Arcade-Map und modulare Map-Presets (Neu-Implementierung)

<!-- LOCK: frei -->

> **Hintergrund:** Dieses Feature war auf dem veralteten Branch `claude/vigorous-ritchie` implementiert.
> Der alte Commit (b1bf0c8) ist im Reflog als Referenz verfuegbar.

**Scope**

- Neue vertikale Arcade-Map "Neon Abyss" (160x75x160) mit 5 Zonen
- Map-Presets aus monolithischem `MapPresetCatalog.js` in modulares `presets/`-Verzeichnis extrahieren

**Map-Zonen (Neon Abyss):**
1. Foam Pit — offener Einstiegsbereich
2. Bridge Network — Brueckengeflecht
3. Cage Labyrinth — enge Kaefig-Gaenge
4. Tower Zone — vertikale Turmstrukturen
5. Crown Arena — finale Arena

**Neue Dateien:**
- `src/core/config/maps/presets/standard.js`
- `src/core/config/maps/presets/arena_maps.js`
- `src/core/config/maps/presets/themed_maps.js`
- `src/core/config/maps/presets/showcase_maps.js`
- `src/core/config/maps/presets/expert_maps.js`
- `src/core/config/maps/presets/neon_abyss.js` (NEU)

**Betroffene Dateien:**
- `src/core/config/maps/MapPresetCatalog.js` — wird zum Aggregator (nur Imports + Spread)

---

- [ ] 49.1 Map-Presets modularisieren: bestehende Presets in `presets/`-Unterverzeichnis extrahieren
- [ ] 49.2 `MapPresetCatalog.js` zum reinen Aggregator umbauen (Import + Spread aller Module)
- [ ] 49.3 Neon Abyss Map-Definition in `presets/neon_abyss.js` erstellen (5 Zonen, Geometrie, Spawns)
- [ ] 49.4 Verifikation: alle bestehenden Map-Presets laden korrekt, Neon Abyss spielbar
- [ ] 49.5 `test:core`, `build`, `docs:sync` PASS

---

## Block V41-D: LAN Auto-Discovery und Multiplayer-UI Vervollstaendigung (Neu-Implementierung)

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V41 Workstreams A-C (abgeschlossen) -->

> **Hintergrund:** Dieses Feature war auf dem veralteten Branch `claude/v41-workstream-a-completion` implementiert.
> Die alten Commits (580722e, b851ab4) sind im Reflog als Referenz verfuegbar.

**Scope**

- UDP-Broadcast LAN-Discovery: Host annonciert, Clients sehen verfuegbare Spiele als klickbare Liste
- TURN-Server-Konfiguration via Env-Variablen
- Signaling-URL konfigurierbar
- Host-IP-Anzeige in Lobby fuer manuellen Join-Fallback
- Discovery-Endpoint auf LAN-Signaling-Server
- Multiplayer-Panel: Discovery-Flow, canHost-Guard, BroadcastChannel-Updates
- LobbyRenderer: Spieler-Karten mit Ready-Status und Settings-Anzeige
- Multiplayer CSS-Styles (Lobby, Spieler-Karten, Discovery)

---

### V41-D.1: LAN Auto-Discovery und Server-Konfiguration

**Betroffene Dateien:**
- `server/lan-signaling.js` — `/discovery/info` Endpoint hinzufuegen
- `src/network/PeerConnectionManager.js` — TURN-Server-Config aus Env-Variablen
- `src/network/OnlineSessionAdapter.js` — Signaling-URL konfigurierbar
- `electron/main.js` — UDP-Broadcast Discovery integrieren
- `electron/preload.js` — Discovery-API exponieren
- `vite.config.js` — `VITE_TURN_URL`, `VITE_SIGNALING_URL` Env-Variablen
- `.env.app`, `.env.web` — Default-Werte fuer Env-Variablen

- [ ] D.1.1 `/discovery/info` Endpoint auf LAN-Signaling-Server
- [ ] D.1.2 TURN-Server-Config via `VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_CREDENTIAL`
- [ ] D.1.3 Signaling-URL via `VITE_SIGNALING_URL` konfigurierbar
- [ ] D.1.4 Electron: UDP-Broadcast Advertise + Discovery-Listener
- [ ] D.1.5 Host-IP-Anzeige im Lobby-View

---

### V41-D.2: Multiplayer-Panel und Lobby-UI vervollstaendigen

**Betroffene Dateien:**
- `src/ui/menu/MenuMultiplayerPanel.js` — Discovery-Flow, canHost-Guard, BroadcastChannel
- `src/ui/menu/MenuLobbyRenderer.js` — Spieler-Karten, Ready-Status, Settings
- `style.css` — Multiplayer-Styles (Lobby, Discovery, Spieler-Karten)
- `tests/core.spec.js` — T41a (Schema canHost), T41b (Panel canHost-Flag)

- [ ] D.2.1 `MenuMultiplayerPanel.js`: Discovery-Liste mit verfuegbaren Spielen
- [ ] D.2.2 `MenuLobbyRenderer.js`: Spieler-Karten mit Ready-Zusammenfassung und Settings
- [ ] D.2.3 `style.css`: Lobby-Layout, Spieler-Karten, Discovery-Liste, Responsive
- [ ] D.2.4 Tests: T41a, T41b fuer canHost-Visibility und Panel-Logik
- [ ] D.2.5 Verifikation: `test:core` PASS, manueller Lobby-Test

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
| V47 | Strategy Pattern Refactoring | `docs/Feature_Strategy_Pattern_V47.md` | Offen |
| V48 | Fight-Modus Qualitaet | `docs/Feature_Fight_Modus_Qualitaet_V48.md` | In Bearbeitung |
| V26.3c | Menu UX Follow-up | `docs/Feature_Menu_UX_Followup_V26_3c.md` | Offen |
| V29b | Cinematic Camera Follow-up | `docs/Feature_Cinematic_Camera_Followup_V29b.md` | Offen |
| N2 | Recording-UI / manueller Trigger | — | Offen |
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
