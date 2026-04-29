# Audit-Umsetzungsplan (Delta zum Masterplan) B01-B13

Stand: 2026-04-29  
Basisabgleich: `docs/Umsetzungsplan.md` + `V99`/`V102`/`V104`/`V105`  
Status: Delta-Plan (nur nicht bereits im Master-Backlog verankerte Arbeit)

## 1. Zweck

Dieser Plan enthaelt ausschliesslich Audit-Folgearbeit, die im normalen Umsetzungsplan noch nicht klar ueber bestehende Bloecke (`V99`, `V102`, `V104`, `V105`) abgedeckt ist.

Nicht Teil dieses Delta-Plans:

- LAN-/Signaling-/Disconnect-Truthfulness (`B08/B09` Kernpunkte) -> `V99`
- Security-/XSS-/Body-Limit-/sync-I/O-Hardening -> `V102`
- UI-God-Object-/Ownership-Port-Schnitt -> `V104`
- Guard-/Typecheck-Recovery -> `V105`

## 2. Delta-Findings (verbleibend)

## 2.1 Runtime/Simulation/Determinismus

- `B02-F01` Sticky Input bei Fokuswechsel (`src/core/InputManager.js`)
- `B02-F02` Capture-Renderer-Leak im Fehlerpfad (`src/core/renderer/RecordingCapturePipeline.js`)
- `B02-F03` Hotkey-Repeat-Toggles (`src/core/RuntimeDiagnosticsSystem.js`, `src/core/Audio.js`)
- `B03-F03` `safeDt` nicht durchgaengig in Simulationssysteme (`src/entities/runtime/EntityTickPipeline.js`)
- `B03-F04` unseeded `Math.random` im Bounce-Resolve (`src/entities/systems/CollisionResponseSystem.js`)
- `B04-F1` Seed-Drift Arcade-Run (`src/core/arcade/ArcadeRunRuntime.js`)
- `B04-F3` Sudden-Death-State run-uebergreifend (`src/modes/ArcadeModeStrategy.js`)
- `B04-F4` Missionen ignorieren Map-/Sector-Kontext (`ArcadeRunRuntime` + `ArcadeMissionState`)
- `B04-F5` Hunt-Pickups ohne deterministische RNG-Injektion (`HuntModeStrategy`)
- `B04-F6` Retreat-Fallback laeuft gegen Gegner (`HuntBotPolicy`)

## 2.2 Arena/Content-Lifecycle

- `B03-F01` Portal-Pairing-Kollaps bei kleinen Slot-Mengen (`PortalLayoutBuilder`)
- `B03-F02` Checkpoint-Ring-Materialien ohne klaren Dispose-Pfad (`CheckpointRingMeshFactory`)

## 2.3 Settings/Profile/Persistenz

- `B07-F01` Phantomzustand bei fehlgeschlagenem Profil-Write (`ProfileManager`)
- `B07-F02` Unportable lokale/Developer-States in Profilen
- `B07-F03` Dedupe-Vertrag bricht `updatedAt`-Absicht
- `B07-F04` Future-Schema wird still als leerer Profilsatz behandelt

Hinweis: `V103` ist abgeschlossen und liefert Baseline, diese Delta-Punkte sind als post-`V103` Resthaertung zu behandeln.

## 2.4 Recording/Replay

- `B10-F01` Replay-Dauer driftet nach Stop/Reset (`ReplayRecorder`)
- `B10-F02` Dispose laesst asynchrone Finalisierung nachlaufen (`MediaRecorderSystem`)
- `B10-F03` Last-Round-Metrics nur shallow copy (mutierbar)
- `B10-F04` Partial-Export-Hinweis geht bis UI verloren
- `B10-F05` Export-Job klassifiziert Delivery-Write-Fehler als Transcode-Fallback

## 2.5 Editor/Authoring

- `B12-F01` Parcours-Topologie/Regelparameter gehen im Roundtrip verloren
- `B12-F02` zentrale Runtime-Mapfeatures nicht direkt im Editor authorbar
- `B12-F03` `authoringStatus.parcoursEnabled` unzuverlaessig

## 2.6 Test-Harness-Restpunkte (nur ausserhalb V105-Kern)

- `B13-F02` produktnahe Tests nutzen Runtime-/DOM-Bypaesse (`tests/helpers.js`)
- `B13-F03` Sonderkonfigurationen ausserhalb Run-Profile-System

## 3. Delta-Subphasen

### D1 Simulation/Determinismus-Hardening

- Ziel: reproduzierbare Runtime-Pfade und keine Sticky-/Drift-Zustaende
- Umfasst: B02-F01/F02/F03, B03-F03/F04, B04-F1/F3/F4/F5/F6

DoD D1:

- Kein Sticky-Input nach Fokuswechsel.
- Seed-identische Runs liefern gleiche Sequenz-/Missions-/Pickup-Ausgaenge.
- Kein unseeded Zufall im kritischen Kollisionspfad.

### D2 Arena-Lifecycle-Hardening

- Ziel: robuste Portal-/Ring-Laufzeit ohne Pairing-Kollaps oder Material-Leaks
- Umfasst: B03-F01/F02

DoD D2:

- Keine doppelten/kollabierten Portalpaarungen bei kleinen Slotmengen.
- Definierter Teardown fuer Ring-/Label-Materialien.

### D3 Profile/Persistenz-Resthaertung

- Ziel: atomare, portable und schemafeste Profilverarbeitung
- Umfasst: B07-F01/F02/F03/F04

DoD D3:

- Fehlgeschlagene Writes hinterlassen keinen Phantomzustand.
- Profilvertrag trennt portable Settings von lokalen/Developer-Zustaenden.
- Duplicate- und Future-Schema-Pfade sind explizit getestet.

### D4 Recording/Replay-Resthaertung

- Ziel: konsistenter Replay-/Export-Wahrheitswert bis UI
- Umfasst: B10-F01/F02/F03/F04/F05

DoD D4:

- Replay-Dauer ist stop-snapshot-stabil.
- Nach Dispose kein neuer Export-State.
- Partial-/Delivery-Fehler werden korrekt klassifiziert und kommuniziert.

### D5 Editor-Fidelity

- Ziel: Runtime-paritaetsnaher Editor-Roundtrip
- Umfasst: B12-F01/F02/F03

DoD D5:

- Parcours-Metadaten bleiben im Roundtrip erhalten.
- Fehlende Metadata-Authoring-Grenzen sind entweder implementiert oder klar als JSON-only guardrailed.
- `authoringStatus` spiegelt neue Checkpoints korrekt.

### D6 Harness-Qualitaet (Rest)

- Ziel: produktnahe Testpfade nicht durch Bypaesse maskieren
- Umfasst: B13-F02/F03

DoD D6:

- Produktnahe Suites verzichten auf Runtime-/DOM-Zwangsmanipulation.
- Repro-/Editor-Konfigs folgen denselben Artefakt-/Profilkonventionen.

## 4. Empfohlene Reihenfolge

1. D1 (Simulation/Determinismus)
2. D3 (Profile/Persistenz)
3. D4 (Recording/Replay)
4. D5 (Editor)
5. D2 (Arena-Lifecycle, falls nicht bereits in D1 mitgezogen)
6. D6 (Harness-Rest)

## 5. Explizit nicht doppeln

- `V99`: keine erneute Planung von P32-P38, P49-P52
- `V102`: keine erneute Planung von P41-P46 inkl. XSS/body-limit/sync-I/O
- `V104`: keine erneute Planung des God-Object-Sunsets (P14/P45-Ownership-Anteil)
- `V105`: keine erneute Planung der Guard-/Typecheck-Recovery (P47/P48)

## 6. Offene Bloecke ohne Delta

- B01: keine Findings
- B11: keine Findings