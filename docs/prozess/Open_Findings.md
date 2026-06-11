# Open Findings (Kanonische Nebenablage)

Stand: 2026-06-11.
Diese Datei ist die kanonische Ablage fuer offene Findings, Review-Reste und Audit-Follow-ups ausserhalb des kompakten Master-Index.

## Zuordnung nach Zielblock

- `V90`: `P21` (dokumentierte Security-Ausnahme mit Wiedervorlage)
- `V102`: `P41` bis `P46`
- `V104`: `P14` plus architektureller Zuschnitt aus `P45` fuer `UIStartSyncController`, `UIManager`-nahe Menuepfade und `ArcadeVehicleManager`
- `V105`: `P47` bis `P48`
- Delta-Folgearbeit Spielaudit B01-B13 (ohne Doppelung zu `V99`/`V102`/`V104`/`V105`): `docs/qa/Spielaudit_2026-04-28/Audit_Umsetzungsplan_B01-B13.md` (D1-D6; V112 erledigt B02-F01, B03-F04, B04-F1/F3, B05-F03 und P42)
- `V116`: keine offenen Findings; Repo-Kontext-Cleanup ist mit `116.99` abgeschlossen, Folgearbeit bleibt bei `V90`/P21 als dokumentierter Security-Ausnahme, `V118`/User-Intake und `V119`.

## Offene Findings

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P14 | `UIStartSyncController.js` | Event-Listener-Duplikation bei Mehrfachaufruf von `setupStartSetupControls()`; nachhaltige Behebung ueber Ownership-/Port-Zuschnitt in `V104` | mittel |
| P21 | `electron/package.json`, `electron/package-lock.json` | Wiedervorlage 2026-06-11 ausgefuehrt: Root ist nach non-force-Fixes plus `vite@6.4.2` (90.3.1 Option A) gruen, Server nach `ws@8.20.1` gruen. Offen bleiben 10 Major-gebundene Electron-Reste (`electron@33.4.11` -> `electron@42.4.0`, `electron-builder@25.1.8` -> `electron-builder@26.15.2`; Runtime-Anteil Electron-Shell-Advisories, Build-time-Anteil `tar`-Kette der Packaging-Toolchain, Details im V90-Snapshot 2026-06-11). Kein non-force-Kandidat offen; dokumentierte Security-Ausnahme mit Wiedervorlage 2026-07-11 oder frueher bei non-force Fix-Verfuegbarkeit bzw. eingeplantem Electron-Major-Slice | hoch |
| P45 | `tests/audio.contract.test.mjs` | Test-Isolation fuer `MockAudioContext` in `afterEach` nicht konsistent (`global.AudioContext` reset fehlt) | niedrig |
| P45 | `src/ui/UIStartSyncController.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `vite.config.js` | Hohe Komplexitaet in Hotspots erhoeht Regressionsrisiko | mittel |
| P46 | `eslint.config.js`, `tsconfig.architecture.json` | Tooling-Gates decken nur engen Laufzeitpfad ab | mittel |
| P47 | `src/core/AppInitializer.js`, `src/core/TestApiBridge.js` | Test-/E2E-Modulregistries importieren `ui`-Module direkt aus `core` | hoch |
| P48 | `src/core/MediaRecorderSystem.js`, `src/core/recording/**/*`, `src/core/renderer/RecordingCapturePipeline.js`, `src/core/renderer/CameraRigSystem.js` | Recorder-/Capture-Vertraege driften in Teilpfaden auseinander; weitere Konsolidierung in `V105` | hoch |

## Pflegehinweis

- Diese Datei wird fortlaufend aktualisiert, wenn Findings neu aufgenommen, verschoben oder geschlossen werden.
- Der Master-Index verlinkt hierher, statt die gesamte Findings-Tabelle inline zu tragen.
