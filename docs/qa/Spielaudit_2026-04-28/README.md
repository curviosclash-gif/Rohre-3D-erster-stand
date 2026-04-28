# Spielaudit 2026-04-28

Stand: 2026-04-28
Status: offen
Typ: externer Analyseplan

## Ziel

Dieser Audit-Arbeitsbereich dient der vollstaendigen Spielpruefung ausserhalb von `docs/Umsetzungsplan.md` und ausserhalb von `docs/bot-training/Bot_Trainingsplan.md`.

Jeder Scope wird als eigener Audit-Block gefuehrt. Findings werden nicht in den Blockplan gemischt, sondern im jeweils verlinkten Findings-Dokument des Blocks gespeichert.

## Abgrenzung

- Kein Intake in den Masterplan.
- Keine VXX-Blockpflege.
- Keine Bot-Training-Planpflege.
- Keine implizite Testausfuehrung; Tests bleiben user-owned, solange sie nicht explizit angefordert werden.

## Arbeitsregeln fuer Findings

- Pro Block ein eigenes Findings-Dokument.
- Befunde priorisiert nach `kritisch`, `hoch`, `mittel`, `niedrig`.
- Jeder Befund soll mindestens Problem, Risiko, Evidenz, betroffene Dateien und Empfehlung enthalten.
- Cross-Block-Funde werden im primaer betroffenen Block erfasst und in anderen Bloecken nur referenziert.

## Blockuebersicht

| Block | Bereich | Kernpfade | Findings-Dokument |
| --- | --- | --- | --- |
| B01 | Runtime-Lifecycle und Session-Orchestrierung | `src/core/main.js`, `src/core/GameBootstrap.js`, `src/core/runtime/**`, `src/application/session-runtime/**`, `src/state/Match*`, `src/composition/core-ui/**` | [B01_Runtime_Lifecycle_und_Session_Orchestrierung_Findings.md](./B01_Runtime_Lifecycle_und_Session_Orchestrierung_Findings.md) |
| B02 | Render-Loop, Input, Audio und Diagnostics | `src/core/GameLoop.js`, `src/core/Renderer.js`, `src/core/renderer/**`, `src/core/InputManager.js`, `src/core/Audio.js`, `src/core/RuntimeDiagnosticsSystem.js`, `src/core/perf/**`, `src/core/three-disposal.js` | [B02_Render_Loop_Input_Audio_und_Diagnostics_Findings.md](./B02_Render_Loop_Input_Audio_und_Diagnostics_Findings.md) |
| B03 | Kernsimulation, Arena und Entity-Systems | `src/entities/EntityManager.js`, `src/entities/runtime/**`, `src/entities/arena/**`, `src/entities/systems/**`, `src/entities/player/**`, `src/entities/directors/**` | [B03_Kernsimulation_Arena_und_Entity_Systems_Findings.md](./B03_Kernsimulation_Arena_und_Entity_Systems_Findings.md) |
| B04 | Modi, Hunt und Arcade-Fortschritt | `src/modes/**`, `src/hunt/**`, `src/core/arcade/**`, `src/state/arcade/**`, `src/entities/arcade/**`, `src/ui/arcade/**`, `src/ui/hangar/**` | [B04_Modi_Hunt_und_Arcade_Fortschritt_Findings.md](./B04_Modi_Hunt_und_Arcade_Fortschritt_Findings.md) |
| B05 | Menue, Start-Setup und UI-Orchestrierung | `src/ui/UIManager.js`, `src/ui/UINavigationLifecycleController.js`, `src/ui/UIStartSyncController.js`, `src/ui/menu/**`, `src/ui/start-setup/**`, `src/ui/dom/**`, `src/ui/base/**` | [B05_Menue_Start_Setup_und_UI_Orchestrierung_Findings.md](./B05_Menue_Start_Setup_und_UI_Orchestrierung_Findings.md) |
| B06 | Ingame-HUD, Matchflow und Overlays | `src/ui/HUD.js`, `src/ui/HuntHUD.js`, `src/ui/HudRuntimeSystem.js`, `src/ui/MatchFlowUiController.js`, `src/ui/PauseOverlayController.js`, `src/ui/MatchFlowArcadeOverlayController.js`, `src/ui/KeybindEditorController.js` | [B06_Ingame_HUD_Matchflow_und_Overlays_Findings.md](./B06_Ingame_HUD_Matchflow_und_Overlays_Findings.md) |
| B07 | Settings, Profile, Persistenz und Migration | `src/core/settings/**`, `src/ui/SettingsStore.js`, `src/ui/UISettingsSyncMap.js`, `src/ui/SettingsChange*`, `src/ui/Profile*`, `src/state/storage/**`, `src/core/ProfileManager.js`, `src/shared/contracts/*Settings*`, `src/shared/runtime/BrowserStoragePorts.js` | [B07_Settings_Profile_Persistenz_und_Migration_Findings.md](./B07_Settings_Profile_Persistenz_und_Migration_Findings.md) |
| B08 | Multiplayer-Client, Lobby und Discovery | `src/network/**`, `src/application/session-runtime/MenuLobbyServiceFactory.js`, `src/application/session-runtime/Network*`, `src/application/session-runtime/OnlineLobbyService.js`, `src/composition/core-ui/LanMenuMultiplayerBridge.js`, `src/ui/menu/testing/MenuMultiplayerPanel.js` | [B08_Multiplayer_Client_Lobby_und_Discovery_Findings.md](./B08_Multiplayer_Client_Lobby_und_Discovery_Findings.md) |
| B09 | Server, Signaling und Desktop-Shell | `server/lan-signaling.js`, `server/signaling-server.js`, `electron/main.cjs`, `electron/preload.cjs`, `electron/session-data-runtime.cjs`, `electron/static-server.cjs`, `electron/tuning-*.cjs`, `src/platform/**` | [B09_Server_Signaling_und_Desktop_Shell_Findings.md](./B09_Server_Signaling_und_Desktop_Shell_Findings.md) |
| B10 | Recording, Replay und Export | `src/core/MediaRecorderSystem.js`, `src/core/recording/**`, `src/core/replay/**`, `src/core/renderer/RecordingCapturePipeline.js`, `src/core/renderer/camera/RecordingOrbitCameraDirector.js`, `src/state/recorder/**`, `electron/recording-video-export-job.cjs` | [B10_Recording_Replay_und_Export_Findings.md](./B10_Recording_Replay_und_Export_Findings.md) |
| B11 | Shared Contracts, Snapshots und Port-Schicht | `src/shared/contracts/**`, `src/shared/runtime/**`, `src/composition/core-ui/Core*Ports.js`, `src/platform/PlatformCapabilityAdapterSupport.js` | [B11_Shared_Contracts_Snapshots_und_Port_Schicht_Findings.md](./B11_Shared_Contracts_Snapshots_und_Port_Schicht_Findings.md) |
| B12 | Editor, Content und Authoring | `editor/js/**`, `src/entities/mapSchema/**`, `src/entities/CustomMapLoader.js`, `src/entities/GeneratedLocalMaps.js`, `src/core/config/MapPresets.js`, `src/shared/vehicle-lab/**` | [B12_Editor_Content_und_Authoring_Findings.md](./B12_Editor_Content_und_Authoring_Findings.md) |
| B13 | Qualitaetsgates, Tests und Tooling | `tests/**`, `playwright*.js`, `vite.config.js`, `eslint.config.js`, `tsconfig.architecture.json`, `scripts/**`, `dev/scripts/**`, `package.json` | [B13_Qualitaetsgates_Tests_und_Tooling_Findings.md](./B13_Qualitaetsgates_Tests_und_Tooling_Findings.md) |

## Empfohlene Reihenfolge

1. B01
2. B05
3. B09
4. B11
5. B03
6. B04
7. B08
8. B10
9. B07
10. B12
11. B06
12. B02
13. B13

## Mindestinhalt je Findings-Dokument

| Feld | Erwartung |
| --- | --- |
| Scope | Welche Dateien und Subsysteme wirklich geprueft wurden |
| Befunde | Priorisierte Liste der Findings mit Evidenz |
| Offene Fragen | Ungeklaerte Architektur-, Produkt- oder Ownership-Punkte |
| Folgearbeit | Konkrete naechste Schritte fuer Fix, Refactor oder Verifikation |

