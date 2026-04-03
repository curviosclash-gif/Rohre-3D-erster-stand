# Umsetzungsplan (Master-Index)

Stand: 2026-04-02 (Logikfehler korrigiert: V71-Dep hard, V76-Dep V82 ergaenzt, V76-Dep V74 hard, V83/V84/V85 intake uebernommen)

Dieser Master ist der kompakte Index fuer aktive Arbeit.
Kanonische Blockdetails liegen in den jeweiligen Dateien unter `docs/plaene/aktiv/`.
Neue oder geaenderte Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
Archivierte oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
Inaktive bzw. zurueckgestellte Eintraege liegen in `docs/prozess/Backlog.md`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Master werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Lesereihenfolge

1. `docs/Umsetzungsplan.md` fuer aktive Bloecke, Abhaengigkeiten, Locks und Conflict-Log.
2. `docs/plaene/aktiv/VXX.md` fuer kanonische Blockdetails, DoD, Risiken, `scope_files`, Verifikation und Phasen.
3. `docs/plaene/neu/*.md` nur fuer neue oder ueberarbeitete Intake-Entwuerfe.
4. `docs/plaene/alt/*.md` nur fuer historische oder abgeloeste Planstaende.

## Aktive Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V71 | Repo-Aufraeumen Runtime-sicher | blocked | P1 | frei | V43-Strukturvertrag | 71.99 | `docs/plaene/aktiv/V71.md` |
| V72 | Gameplay-Powerups, Portale und Gates | active | P1 | Agent-B | V69.99 | 72.3 | `docs/plaene/aktiv/V72.md` |
| V74 | Architektur-Runtime-Entkopplung (Refresh) | done | P1 | frei | V58.99,V60.3 | 74.99 | `docs/plaene/aktiv/V74.md` |
| V83 | Architektur SessionRuntime und Plattform-Capabilities | done | P1 | frei | V74.99 | 83.99 | `docs/plaene/aktiv/V83.md` |
| V84 | Headless MatchKernel und einheitliche GameMode-API | active | P2 | frei | V83.99 | 84.4 | `docs/plaene/aktiv/V84.md` |
| V85 | Persistence-, Content-Contracts und Schema-Migrationen | planned | P2 | frei | V83.99 | 85.1 | `docs/plaene/aktiv/V85.md` |
| V77 | Desktop Vollversion Browser Demo Grenzen | planned | P2 | frei | V74.99 | 77.1 | `docs/plaene/aktiv/V77.md` |
| V64 | Desktop Hauptprodukt Multiplayer Online Offline Kompatibilitaet | planned | P2 | frei | V74.99,V77.99 | 64.1 | `docs/plaene/aktiv/V64.md` |
| V75 | Cinematic Recorder Desktop WebM-MP4 Stabilisierung | planned | P3 | frei | V74.99,V77.99,V64.99 | 75.1 | `docs/plaene/aktiv/V75.md` |
| V76 | Desktop Hangar Arcade Fight | planned | P3 | frei | V71.4,V74.99,V77.99,V64.99,V82.99 | 76.1 | `docs/plaene/aktiv/V76.md` |
| V82 | Arcade-Parcours Progression XP Flugzeug-Tuning | planned | P2 | frei | V72.99,V74.99 | 82.1 | `docs/plaene/aktiv/V82.md` |
| V81 | Developer Tuning Console (Steuerkonsole) | planned | P3 | frei | V74.99,V72.99 | 81.1 | `docs/plaene/aktiv/V81.md` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V64 | V74.99 | hard | ja | Desktop-Multiplayer muss Lifecycle-, Capability- und Composition-Grenzen aus V74 uebernehmen; keine neuen `game.*`- oder private-Facade-Backdoors |
| V64 | V50/V52 Netzwerk-Baseline | hard | ja | SessionAdapter-, Lobby-, Signaling- und `stateUpdate`-Grundvertraege bleiben verbindlich |
| V64 | V77.99 | hard | nein | Multiplayer darf das Verkaufsversprechen `Vollversion hostet, Demo joint` erst nach verankerter Surface-Policy umsetzen |
| V71 | V43-Strukturvertrag | hard | ja | Root-/Editor-Schutz und `EditorPathContract` bleiben bis nach 71.4 verbindlich; 71.4 ist abgeschlossen |
| V71 | Playwright-/Warmup-Entstoerung fuer Restgate | hard | nein | `71.99` Abschluss-Gate blockiert; `tests/playwright.global-setup.js` mit `fetch failed`/Warmup-Hang offen |
| V72 | V69.99 | hard | ja | Fight/Hunt-Item-, Rocket- und Shield-Baseline aus V69 bleibt Ausgangspunkt fuer Pickup-/Portal-/Gate-Vertraege |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | nein | Vor hartem Fail muessen sichtbare Warn-, Diagnose- oder Migrationspfade fuer bestehende Maps umgesetzt werden |
| V74 | V58.99 | hard | ja | Architektur-Guard- und Budget-Baseline aus V58 bleibt die verbindliche Ausgangsbasis |
| V74 | V60.3 | hard | ja | V60.3 dokumentiert das Zielbild fuer Rest-Orchestratoren und dient als Referenz fuer die Runtime-Entkopplung |
| V74 | V70.99 | soft | ja | Settings-/Preset-Pfade im Runtime-/Menue-Lifecycle muessen bei Refactors mitgeprueft werden |
| V74 | V67/V68 Abschlussstand | soft | ja | Multiplayer- und Arcade-Lifecycle aus V67/V68 liefern den Regression-Scope fuer Start-/Return-Pfade |
| V83 | V74.99 | hard | ja | SessionRuntime-, Command/Event- und Capability-Folgeschnitt setzt die Runtime-Entkopplung aus V74 als Baseline voraus |
| V83 | V77 Surface-Policy | soft | nein | Desktop-Vollversion und Browser-Demo sollen spaeter dieselben Capability-Grenzen nutzen; Policy kann parallel vorbereitet, aber vor 83.99 abgeglichen werden |
| V83 | V67/V68 Abschlussstand | soft | ja | Arcade- und Multiplayer-Lifecycle aus den Altbloecken liefern den Regression-Scope fuer Runtime-Kern, Lobby-Service und Finalize-Contracts |
| V84 | V83.99 | hard | nein | Headless MatchKernel und GameMode-API bauen auf dem SessionRuntime-, Command/Event- und Capability-Vertrag aus V83 auf |
| V84 | V72.99 | soft | nein | Powerup-, Portal- und Gate-Vertraege sollten vor der GameMode-Vereinheitlichung stabil sein |
| V84 | V82.99 | soft | nein | Arcade-Parcours-, XP- und Progressionsregeln liefern relevanten Scope fuer eine einheitliche GameMode-API |
| V85 | V83.99 | hard | nein | Versionierte Persistence- und Content-Vertraege sollen erst nach stabilisiertem Runtime-, Capability- und Legacy-Sunset-Vertrag aufsetzen |
| V85 | V84.99 | soft | nein | Headless Kernel und GameMode-API liefern spaeter den saubereren Verbrauchspfad fuer Replay-, Snapshot- und Content-Projektionen |
| V77 | V74.99 | hard | ja | Die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` darf erst auf der stabilisierten Runtime-/Capability-Basis aus V74 verankert werden |
| V75 | V74.99 | hard | ja | Recorder-Finalisierung muss denselben Lifecycle-/Dispose-Vertrag wie V74 nutzen; keine parallelen Sonderpfade fuer Stop, Return-to-Menu oder Shutdown |
| V75 | V77.99 | hard | nein | Export-, Download- und Browser-Fallbacks muessen der Demo-/Vollversions-Politik aus V77 folgen |
| V75 | V64.99 | hard | nein | Recorder-Polish folgt erst nach dem produktiven Host-/Join-Hauptpfad |
| V75 | V72 Recorder-/Telemetry-Result-Codes | soft | nein | Nur relevant, falls Export-Diagnostik gemeinsam mit Gameplay-Result-Codes vereinheitlicht wird |
| V76 | V71.4 | hard | ja | Vehicle-Lab- und Editor-Pfade sind seit `71.4` migrationssicher ueber Contracts/Guards abgesichert |
| V76 | V77.99 | hard | nein | Hangar, Werkstatt und Editoren muessen die in V77 definierte Vollversions-/Demo-Rollenlogik uebernehmen |
| V76 | V64.99 | hard | nein | Hangar-/Werkstatt-Flows starten erst nach dem festgezogenen Produktbild fuer Host/Join und Browser-Demo |
| V76 | V74.99 | hard | ja | Hangar darf `main.js`, `GameRuntimeFacade` oder breite Desktop-Backdoors nicht erneut aufblasen; Navigations-/Composition-Grenzen aus V74 sind verbindlich |
| V82 | V72.99 | hard | nein | Stabile Pickup-/Portal-/Gate-Vertraege als Basis fuer erweiterte Checkpoint-Logik und Parcours-Arcade-Vereinigung |
| V82 | V74.99 | hard | ja | Runtime-Entkopplung muss abgeschlossen sein fuer saubere State-Komposition (XP, Leaderboard, Ghost) |
| V76 | V82.99 | hard | nein | V76.3 Arcade-Hangar baut direkt auf V82-Contracts (XP, Upgrades, Leaderboard) auf; V82 muss vor V76.3 abgeschlossen sein |
| V81 | V74.99 | hard | ja | Tuning Console liest/schreibt CONFIG_BASE und nutzt ActiveRuntimeConfigStore; Runtime-Entkopplung muss abgeschlossen sein |
| V81 | V72.99 | hard | nein | Parameter-Registry muss auf stabiler Pickup-Registry und Config-Struktur aufbauen |
| V81 | V77 Surface-Policy | soft | nein | Console ist Dev-Only-Feature; sollte V77-Capability-Vertrag respektieren, blockiert aber nicht |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V64 | - | frei | Nach `V77.99` `64.1` Transportmatrix und Capability-Modell fuer `Host Vollversion / Join Demo` konkretisieren |
| - | V71 | - | frei | `71.99` nach Warmup-Entstoerung oder belastbarem Restgate schliessen |
| Agent-B | V72 | 2026-04-02 | active | `72.2` abgeschlossen; `72.3` Portal-/Gate-Vertraege haerten steht an |
| - | V74 | - | frei | Abgeschlossen 2026-04-03: `74.99` Gate gruen, Folgebloecke mit `V74.99` koennen anlaufen |
| - | V83 | - | closed | Abgeschlossen 2026-04-04: `83.99` Gate gruen; Folgebloecke V84/V85 mit `V83.99` koennen anlaufen |
| - | V84 | 2026-04-04 | active | `84.2` + `84.3` abgeschlossen; Replay/Training-Adapter eingefuehrt; GameMode-API vereinheitlicht; `84.4` Projektionen/Renderadapter steht an |
| - | V85 | - | frei | Nach `V83.99` mit `85.1` Dateninventar, Versionsmatrix und Migrationsrahmen starten |
| - | V77 | - | frei | Nach `V74.99` die Surface-Leitplanke fuer `Desktop Vollversion` vs `Browser Demo` und die itch.io-Produktrollen festziehen |
| - | V75 | - | frei | Exportstrategie/Finalize-Port erst nach `V64.99` auf denselben Lifecycle- und Surface-Vertrag heben |
| - | V76 | - | frei | Desktop-Hangar-Contract erst nach `V64.99` und unter `V77`-/`V74`-Leitplanken aufnehmen |
| - | V82 | - | frei | Nach `V72.99` und `V74.99` mit `82.1` Arcade-Parcours-Vereinigung starten; liefert Daten-Contracts fuer V76.3 |
| - | V81 | - | frei | Nach `V74.99` und `V72.99` mit `81.1` Registry und Bridge starten |

## Aufgeschobene Fixes (Code-Review 2026-04-03)

Identifiziert durch 24h-Commit-Review. Sofort-Fixes (P3, P5, P13) sind bereits committed.
Die folgenden Punkte werden nach Abschluss des jeweiligen Blocks adressiert.

### Nach V83-Abschluss (betrifft scope_files von V83)

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P1 | `MatchLifecycleSessionOrchestrator.js` | Race Condition: gleichzeitige `createMatchSession()`-Aufrufe koennen duplizierte Session-IDs erzeugen | kritisch |
| P2 | `MatchFlowUiController.js` | Race Condition: `applyStartMatchProjection()` Guard gegen Doppelklick ist nicht atomar | kritisch |
| P4 | `GameRuntimeSessionHandler.js` | Fire-and-forget Promise bei Game-Dispose; Finalize-Fehler hinterlassen inkonsistenten Zustand | kritisch |
| P8 | `SessionRuntimeCommandExecutor.js` | Doppelter Settings-Pfad (APPLY_SETTINGS vs. START_MATCH-Snapshot) kann inkonsistenten State erzeugen | hoch |
| P9 | `PauseOverlayController.js` | TOCTOU: Pause-State wird gelesen aber kann sich vor Resume-Ausfuehrung aendern | hoch |
| P10 | `ElectronPlatformBridge.js` | `createIntent()` gibt null zurueck, aber Adapter meldet `available: true` | hoch |
| P11 | `MatchLifecycleSessionOrchestrator.js` | Error-State geht nach Finalize-Fehler verloren (`_pendingFinalize` wird auf null gesetzt) | mittel |
| P15 | `SessionRuntimeCommandExecutor.js` | Async-Command-Fehler werden re-thrown ohne Garantie, dass Caller `.catch()` hat | mittel |
| P16 | `SessionRuntimeStateMachine.js` | Transition FINALIZING-MENU erlaubt Ressourcen-Cleanup zu umgehen | mittel |

### Nach V83 oder eigenstaendig (nicht in V83 scope_files)

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P6 | `PortalLayoutBuilder.js` | Portal-Slot-Modulo erzeugt identische Positionen bei `slots.length < 8` | hoch |
| P7 | `vulkan_odyssey.js` | Precision-Plattformen (4x2 Einheiten) vermutlich unspielbar | hoch |
| P12 | `CheckpointRingMeshFactory.js` | Material-Leak: jeder Checkpoint bekommt neues Material ohne Disposal | mittel |
| P14 | `UIStartSyncController.js` | Event-Listener-Duplikation bei Mehrfachaufruf von `setupStartSetupControls()` | mittel |
| P20 | `SessionRuntimeObservability.js` | Ineffizientes Array-Splicing statt `.slice(-LIMIT)` | niedrig |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Bot-Codex | Shared | `scripts/validate-umsetzungsplan.mjs` | Playwright-Verifikation fuer V74 scheiterte zusaetzlich an BOM+Shebang im Governance-Skript | UTF-8-no-BOM geschrieben; Parserblocker beseitigt, verbleibender Harness-Blocker separat dokumentiert | erledigt |
| 2026-04-02 | Agent-A | V72 (Agent-B lock) | `src/entities/player/PlayerInventoryOps.js` | Agent-A uebernimmt und erledigt 72.1.2 während Agent-B locked war | 72.1 komplett umgesetzt: PlayerInventoryOps validiert selfUsable, blockiert Rockets; Umsetzungsplan aktualisiert auf 72.2 | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/run-playwright-smoke.mjs` | Explizite V74-Nachverifikation brach unter Windows bereits vor Playwright mit `spawn EINVAL` ab | Smoke-Launcher auf lokale Playwright-CLI plus separator-neutrale Filter umgestellt; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `scripts/verify-lock.mjs` | Gezielte Playwright-Reruns trafen Windows-Dateifilter und CLI-Aufloesung nicht stabil | Playwright-Aufrufe auf lokale CLI gehoben und Spec-Filter separator-neutral normalisiert; verbleibender Dev-Server-Blocker separat dokumentiert | erledigt |
| 2026-04-03 | Bot-Codex | Shared | `playwright.config.js` | Browser-Runs luden `tests/*.test.mjs` mit `node:test` mit und endeten in `No tests found` statt echter Spec-Auswahl | Discovery auf `**/*.spec.js` begrenzt; verbliebener Vite-HTTP-Timeout in V74-Fehlerbericht festgehalten | erledigt |
