# Open Findings (Kanonische Nebenablage)

Stand: 2026-05-18.
Diese Datei ist die kanonische Ablage fuer offene Findings, Review-Reste und Audit-Follow-ups ausserhalb des kompakten Master-Index.

## Zuordnung nach Zielblock

- `V90`: `P21`
- `V102`: `P41` bis `P46`
- `V104`: `P14` plus architektureller Zuschnitt aus `P45` fuer `UIStartSyncController`, `UIManager`-nahe Menuepfade und `ArcadeVehicleManager`
- `V105`: `P47` bis `P48`
- Delta-Folgearbeit Spielaudit B01-B13 (ohne Doppelung zu `V99`/`V102`/`V104`/`V105`): `docs/qa/Spielaudit_2026-04-28/Audit_Umsetzungsplan_B01-B13.md` (D1-D6)
- `V116`: keine offenen Findings; Repo-Kontext-Cleanup ist mit `116.99` abgeschlossen, Folgearbeit bleibt bei `V90`, `V118`/User-Intake und `V119`.

## Offene Findings

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P14 | `UIStartSyncController.js` | Event-Listener-Duplikation bei Mehrfachaufruf von `setupStartSetupControls()`; nachhaltige Behebung ueber Ownership-/Port-Zuschnitt in `V104` | mittel |
| P21 | `package.json`, `package-lock.json`, `electron/package.json`, `electron/package-lock.json` | `npm audit --audit-level=low` meldet Root-Reste fuer `vite`/`esbuild` plus `fast-uri` (high, non-force Fix-Kandidat); `npm --prefix electron audit --audit-level=low` meldet Major-gebundene `electron`-/`electron-builder`-Reste plus `ip-address` (moderate, non-force Fix-Kandidat). V90 haelt den separaten Fix-Gate und Major-Upgrade-Blocker; Build-/Typecheck-Gate ist seit 2026-05-18 gruen | hoch |
| P45 | `tests/audio.contract.test.mjs` | Test-Isolation fuer `MockAudioContext` in `afterEach` nicht konsistent (`global.AudioContext` reset fehlt) | niedrig |
| P45 | `src/ui/UIStartSyncController.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `vite.config.js` | Hohe Komplexitaet in Hotspots erhoeht Regressionsrisiko | mittel |
| P46 | `eslint.config.js`, `tsconfig.architecture.json` | Tooling-Gates decken nur engen Laufzeitpfad ab | mittel |
| P47 | `src/core/AppInitializer.js`, `src/core/TestApiBridge.js` | Test-/E2E-Modulregistries importieren `ui`-Module direkt aus `core` | hoch |
| P48 | `src/core/MediaRecorderSystem.js`, `src/core/recording/**/*`, `src/core/renderer/RecordingCapturePipeline.js`, `src/core/renderer/CameraRigSystem.js` | Recorder-/Capture-Vertraege driften in Teilpfaden auseinander; weitere Konsolidierung in `V105` | hoch |

## Pflegehinweis

- Diese Datei wird fortlaufend aktualisiert, wenn Findings neu aufgenommen, verschoben oder geschlossen werden.
- Der Master-Index verlinkt hierher, statt die gesamte Findings-Tabelle inline zu tragen.
