# Open Findings (Kanonische Nebenablage)

Stand: 2026-05-04.
Diese Datei ist die kanonische Ablage fuer offene Findings, Review-Reste und Audit-Follow-ups ausserhalb des kompakten Master-Index.

## Zuordnung nach Zielblock

- `V90`: `P21`
- `V102`: `P41` bis `P46`
- `V104`: `P14` plus architektureller Zuschnitt aus `P45` fuer `UIStartSyncController`, `UIManager`-nahe Menuepfade und `ArcadeVehicleManager`
- `V105`: `P47` bis `P48`
- Eigenstaendig oder spaeterer Produkt-/Infra-Follow-up: `P6`, `P7`, `P12`, `P22` bis `P31`
- Delta-Folgearbeit Spielaudit B01-B13 (ohne Doppelung zu `V99`/`V102`/`V104`/`V105`): `docs/qa/Spielaudit_2026-04-28/Audit_Umsetzungsplan_B01-B13.md` (D1-D6)

## Offene Findings

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P6 | `PortalLayoutBuilder.js` | Portal-Slot-Modulo erzeugt identische Positionen bei `slots.length < 8` | hoch |
| P7 | `vulkan_odyssey.js` | Precision-Plattformen (4x2 Einheiten) vermutlich unspielbar | hoch |
| P12 | `CheckpointRingMeshFactory.js` | Material-Leak: jeder Checkpoint bekommt neues Material ohne Disposal | mittel |
| P14 | `UIStartSyncController.js` | Event-Listener-Duplikation bei Mehrfachaufruf von `setupStartSetupControls()`; nachhaltige Behebung ueber Ownership-/Port-Zuschnitt in `V104` | mittel |
| P21 | `package.json`, `package-lock.json` | `npm audit` meldet 5 Befunde (2 high, 3 moderate); Dependency-Security als Draft `V90` vorbereitet | hoch |
| P22 | `tmp/`, `.codex_tmp/`, `assets/models/jets/cc0/spaceship_pack/dist/*` | Repo-Hygiene/Retention fuer gewichtige Artefakte offen | mittel |
| P23 | `src/ui/menu/MenuExpertLoginRuntime.js` | Hartcodiertes Expertenpasswort `1307` darf nicht als Sicherheitsbarriere gelten | mittel |
| P24 | `tests/playwright.global-setup.js`, `dev/scripts/verify-lock.mjs`, `scripts/run-playwright-*.mjs` | `spawn EPERM` blockiert weiter `test:contract`, `test:smoke`, `test:targeted` | hoch |
| P25 | `scripts/run-playwright-targeted-clusters.mjs` | Cluster laufen sequentiell ohne abgestufte Degradation | mittel |
| P26 | `tests/core-targeted.shared.js` | Test-Barrel exportiert sehr breit; Abhaengigkeiten bleiben opak | mittel |
| P27 | `docs/plaene/aktiv/*.md`, `docs/Umsetzungsplan.md` | Evidence-Strings teils laenger als eigentlicher Arbeitsnachweis | niedrig |
| P28 | `src/shared/contracts/MatchRuntimeProjectionContract.js` | Traversal-Felder ohne Versions-Bump (`match-runtime-projection.v1`) | mittel |
| P29 | `src/core/recording/DownloadService.js` | Fehlender Null-Guard fuer `downloadHandler`; inkonsistente Warning-Akkumulation | mittel |
| P30 | `src/shared/contracts/ArcadeMissionContract.js` | `getArcadeMissionRegistryDescriptor()` nur in Tests genutzt; Runtime-API-Surface klaeren | niedrig |
| P31 | `tests/content-descriptor-registries.contract.test.mjs`, `tests/platform-capabilities.contract.test.mjs` | Keine Immutability-Tests fuer `Object.freeze()`-gesicherte Registries | niedrig |
| P37 | `electron/preload.cjs` | `ipcRenderer.sendSync('settings-defaults:read-override-sync')` blockiert den Renderer-Thread | mittel |
| P41 | `vite.config.js` | Editor-Video-Save mit unzureichend eingeschraenkten Zielpfaden | hoch |
| P42 | `src/ui/start-setup/StartSetupUiOps.js`, `src/ui/MatchFlowArcadeOverlayController.js` | UI rendert datennahe Inhalte per `innerHTML`; XSS-Risiko | hoch |
| P43 | `src/shared/contracts/PlatformCapabilityRegistry.js` | Browser-Demo-Override liest Build-Artefakt per synchronem XHR | mittel |
| P44 | `server/lan-signaling.js` | Request-Body-Reader ohne feste Size-Limits; Memory-/DoS-Risiko | hoch |
| P45 | `src/ui/UIStartSyncController.js`, `src/ui/menu/MenuGameplayBindings.js`, `src/ui/arcade/ArcadeVehicleManager.js`, `vite.config.js` | Hohe Komplexitaet in Hotspots erhoeht Regressionsrisiko | mittel |
| P46 | `eslint.config.js`, `tsconfig.architecture.json` | Tooling-Gates decken nur engen Laufzeitpfad ab | mittel |
| P47 | `src/core/AppInitializer.js`, `src/core/TestApiBridge.js` | Test-/E2E-Modulregistries importieren `ui`-Module direkt aus `core` | hoch |
| P48 | `src/core/MediaRecorderSystem.js`, `src/core/recording/**/*`, `src/core/renderer/RecordingCapturePipeline.js`, `src/core/renderer/CameraRigSystem.js` | Recorder-/Capture-Vertraege driften in Teilpfaden auseinander; weitere Konsolidierung in `V105` | hoch |

## Pflegehinweis

- Diese Datei wird fortlaufend aktualisiert, wenn Findings neu aufgenommen, verschoben oder geschlossen werden.
- Der Master-Index verlinkt hierher, statt die gesamte Findings-Tabelle inline zu tragen.
