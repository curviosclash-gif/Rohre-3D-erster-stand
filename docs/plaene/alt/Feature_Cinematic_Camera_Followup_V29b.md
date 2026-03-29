# Feature: Cinematic Camera Follow-up + YouTube Shorts Capture (V29b)

Stand: 2026-03-22  
Status: Abgeschlossen  
Owner: Single-Agent Umsetzung

## Ziel

Erweiterung der Aufnahmefunktion fuer lokalen Splitscreen, ohne das normale Spielverhalten zu veraendern:

1. Separat waehlbarer Aufnahme-Modus im Menue fuer YouTube Shorts.
2. Aufnahme in vertikalem Layout mit fester Zuordnung:
   - Spieler 1 oben
   - Spieler 2 unten
3. Dynamische Aufloesung fuer den Shorts-Export (kein harter 1080x1920-Zwang).
4. Recording-spezifische Cinematic-Kameras, die um die Flugzeuge kreisen und interessante Perspektiven filmen.
5. HUD-Optionen bleiben verfuegbar (`mit HUD` und `clean`).

Nicht-Ziel:

- Kein Eingriff in die normale Live-Renderausgabe waehrend des Spielens.
- Kein Eingriff in Controls, Physics oder Match-Logik ausserhalb des Recording-Pfads.

## Betroffene Dateien (geplant)

- `src/core/MediaRecorderSystem.js`
- `src/core/Renderer.js`
- `src/core/renderer/RenderViewportSystem.js`
- `src/core/renderer/CameraRigSystem.js`
- `src/core/renderer/camera/CameraModeStrategySet.js`
- `src/core/config/ConfigSections.js`
- `src/core/config/SettingsRuntimeContract.js`
- `src/core/SettingsManager.js`
- `src/core/RuntimeConfig.js`
- `src/core/main.js`
- `src/ui/UIManager.js`
- `src/ui/dom/GameUiDomRefs.js`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/SettingsChangeKeys.js`
- `src/ui/UISettingsSyncMap.js`
- `tests/gpu.spec.js`
- `tests/core.spec.js`
- `tests/stress.spec.js`
- `docs/Umsetzungsplan.md`

## Architektur-Check

- Reuse vor Neubau: bestehende Renderer-/Recorder-Pfade bleiben die Basis.
- Recording-spezifische Kamera wird als separater Laufzeitmodus gefuehrt, nicht als Ersatz der Spielerkamera.
- Splitscreen-Liveansicht bleibt unveraendert; Shorts-Komposition wird nur im Aufnahme-Pfad aktiv.
- Settings bleiben ueber `SettingsManager` + `RuntimeConfig` als Single Source of Truth.
- HUD-Optionen werden als expliziter Recording-Contract modelliert, nicht implizit ueber UI-Zufall.

Risiko-Einstufung: **hoch** (Render-/Recorder-Hotpath, Layout-Komposition, Kamerawechsel waehrend Capture).

## Phasenplan

- [x] **29b.1 Scope- und Contract-Freeze** (abgeschlossen: 2026-03-22; evidence: `rg -n "RECORDING_CAPTURE_PROFILE|RECORDING_HUD_MODE|normalizeRecordingCaptureSettings" src/shared/contracts/RecordingCaptureContract.js src/core/SettingsManager.js src/core/RuntimeConfig.js` -> `src/shared/contracts/RecordingCaptureContract.js`)
  - [x] 29b.1.1 Aufnahme-Contract definieren (`standard` vs `youtube_short`, HUD-Optionen, dynamische Aufloesung). (abgeschlossen: 2026-03-22; evidence: `rg -n "RECORDING_CAPTURE_PROFILE|YOUTUBE_SHORT|RECORDING_HUD_MODE|WITH_HUD|normalizeRecordingCaptureSettings" src/shared/contracts/RecordingCaptureContract.js` -> `src/shared/contracts/RecordingCaptureContract.js`)
  - [x] 29b.1.2 Nicht-Ziel sauber abgrenzen: keine Live-Render-/Gameplay-Regressionen ausserhalb Recording. (abgeschlossen: 2026-03-22; evidence: `npm run test:gpu -- --grep T21a` -> `test-results/pid-13152-mn24ju3k`)

- [x] **29b.2 Recording-Renderpfad entkoppeln** (abgeschlossen: 2026-03-22; evidence: `rg -n "captureSourceResolver|getRecordingCaptureCanvas|prepareRecordingCaptureFrame|setRecordingCaptureSettings" src/core/GameBootstrap.js src/core/MediaRecorderSystem.js src/core/Renderer.js src/core/main.js` -> `src/core/MediaRecorderSystem.js`)
  - [x] 29b.2.1 Recorder so erweitern, dass Capture einen separaten, recording-spezifischen Viewport/Layout-Pfad nutzen kann. (abgeschlossen: 2026-03-22; evidence: `rg -n "captureSourceResolver|_resolveCaptureCanvas|getCaptureCanvas|getRecordingDiagnostics" src/core/MediaRecorderSystem.js` -> `src/core/MediaRecorderSystem.js`)
  - [x] 29b.2.2 Sicherstellen, dass normaler `Renderer.render()`-Pfad fuer Spieleransicht unveraendert bleibt. (abgeschlossen: 2026-03-22; evidence: `npm run test:gpu -- --grep T33c` -> `test-results/pid-19168-mn24533g`)

- [x] **29b.3 Shorts-Layout fuer Splitscreen** (abgeschlossen: 2026-03-22; evidence: `npm run test:core -- --grep T20m2` -> `test-results/pid-25508-mn254ods`)
  - [x] 29b.3.1 Portrait-Komposition implementieren (P1 oben, P2 unten) mit dynamischer Zielaufloesung. (abgeschlossen: 2026-03-22; evidence: `rg -n "_resolveShortsCaptureSize|shorts_vertical_split|P1 oben|P2 unten" src/core/renderer/RecordingCapturePipeline.js` -> `src/core/renderer/RecordingCapturePipeline.js`)
  - [x] 29b.3.2 Stabile Zuordnung bei Respawn/Match-Restart absichern (nie vertauschen). (abgeschlossen: 2026-03-22; evidence: `npm run test:stress -- --grep T80` -> `test-results/pid-25024-mn24abr5`)

- [x] **29b.4 Recording-Cinematic-Kamera** (abgeschlossen: 2026-03-22; evidence: `rg -n "RecordingOrbitCameraDirector|_updateShortsCamera|orbit|blend|fallback|_isWithinArenaBounds" src/core/renderer/camera/RecordingOrbitCameraDirector.js src/core/renderer/RecordingCapturePipeline.js` -> `src/core/renderer/camera/RecordingOrbitCameraDirector.js`)
  - [x] 29b.4.1 Recording-only Kamera-Director fuer Orbit/interesting shots um jedes Flugzeug einfuehren. (abgeschlossen: 2026-03-22; evidence: `rg -n "class RecordingOrbitCameraDirector|apply\\(" src/core/renderer/camera/RecordingOrbitCameraDirector.js` -> `src/core/renderer/camera/RecordingOrbitCameraDirector.js`)
  - [x] 29b.4.2 Blend-/Collision-/Fallback-Regeln absichern, damit keine harten Spruenge oder leeren Frames entstehen. (abgeschlossen: 2026-03-22; evidence: `npm run test:gpu -- --grep T33c` -> `test-results/pid-19168-mn24533g`)

- [x] **29b.5 Menue-Integration und Runtime-Steuerung** (abgeschlossen: 2026-03-22; evidence: `rg -n "recording-profile-select|recording-hud-mode-select|RECORDING_PROFILE|RECORDING_HUD_MODE|setRecordingCaptureSettings" index.html src/ui/menu/MenuGameplayBindings.js src/ui/UIManager.js src/core/runtime/RuntimeSettingsChangeOrchestrator.js` -> `src/ui/menu/MenuGameplayBindings.js`)
  - [x] 29b.5.1 Separate Menueauswahl fuer YouTube-Short-Aufnahmeprofil und Persistenz in Settings. (abgeschlossen: 2026-03-22; evidence: `npm run test:core -- --grep T20m1` -> `test-results/pid-12828-mn250j48`)
  - [x] 29b.5.2 HUD-Optionen (`mit HUD`, `clean`) im Recording-Profil integrieren inkl. Laufzeit-Feedback. (abgeschlossen: 2026-03-22; evidence: `npm run test:stress -- --grep T80` -> `test-results/pid-25024-mn24abr5`)

- [x] **29b.6 Regression, Performance, Qualitaet** (abgeschlossen: 2026-03-22; evidence: `npm run test:core && npm run test:gpu && npm run test:stress` -> `test-results/pid-13680-mn259urp`)
  - [x] 29b.6.1 Tests fuer Nicht-Regression der normalen Kamera- und Splitscreen-Ansicht erweitern. (abgeschlossen: 2026-03-22; evidence: `npm run test:gpu` -> `test-results/pid-13152-mn24ju3k`)
  - [x] 29b.6.2 Recording-Performance unter Last pruefen (Capture-Gaps, encode-load, downscale-verhalten). (abgeschlossen: 2026-03-22; evidence: `npm run test:stress` -> `test-results/pid-25024-mn24abr5`)

- [x] **29b.99 Abschluss-Gate** (abgeschlossen: 2026-03-22; evidence: `npm run test:core && npm run test:gpu && npm run test:stress && npm run build && npm run plan:check && npm run docs:sync && npm run docs:check` -> `test-results/pid-13680-mn259urp`)
  - [x] 29b.99.1 Relevante Tests + Build + Architektur-Guard sind gruen. (abgeschlossen: 2026-03-22; evidence: `npm run test:core && npm run test:gpu && npm run test:stress && npm run build` -> `test-results/pid-13680-mn259urp`)
  - [x] 29b.99.2 Dokumentations- und Governance-Gates (`plan:check`, `docs:sync`, `docs:check`) sind gruen. (abgeschlossen: 2026-03-22; evidence: `npm run plan:check && npm run docs:sync && npm run docs:check` -> `docs/plaene/alt/Feature_Cinematic_Camera_Followup_V29b.md`)

## Evidence-Format bei Abschluss

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Verifikation (geplant)

- Nach 29b.2 bis 29b.4:
  - `npm run test:core -- --grep "T20l1|T20af|T20aj"`
  - `npm run test:gpu -- -g "T33|T33b"`

- Nach 29b.5:
  - `npm run test:core`
  - `npm run test:stress`

- Abschluss-Gate:
  - `npm run test:core`
  - `npm run test:gpu`
  - `npm run build`
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`

