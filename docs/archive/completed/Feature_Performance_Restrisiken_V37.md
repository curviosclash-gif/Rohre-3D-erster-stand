# Feature: Performance Restrisiken & Jitter-Stabilisierung V37

Dieser Detailplan sammelt die noch ungeloesten Performance-Hotspots und Stabilitaets-Probleme, die aus den Testlaeufen vom 13.03.2026 hervorgegangen sind und nicht vom bisherigen Plan abgedeckt wurden.

## Scope

- **Ziel**: Das Rendering (Jitter/Spikes) stabilisieren, Recording-Framerate sichern, den `maze`-Map CPU/GPU-Hotspot abbauen und den reproduzierbaren T7-Timeout im Startpfad loesen.
- **betroffene Dateien**:
  - `src/core/**` (GameLoop, Startup-Latenzen, Render-Routinen)
  - `src/core/MediaRecorderSystem.js`
  - `src/entities/**`
  - `tests/core.spec.js` (T7, T10e)
  - `docs/Umsetzungsplan.md`

## Phasen

### 37.1 Draw-Calls auf `maze` senken (ehemals 28.3)

- [x] 37.1.1 Map-Struktur / Wall-Instancing auf `maze` ueberpruefen
- [x] 37.1.2 Draw-Calls unter das Zielbudget `<=35` druecken
- Status 2026-03-13: Kein neues `maze`-Draw-Call-Delta offen. Der bereits geschlossene V28.3-/28.5-Pfad blieb im aktuellen Stand stabil (`V2 drawCallsAverage=20.00`, `drawCallsMax=20` aus dem Baseline-Refresh), und die nachgezogenen Map-/Arena-Regressionen `T14`, `T14b`, `T14c`, `T41` und `T43` liefen erneut gruen. Zusaetzliches Wall-Instancing war in dieser Abschlussrunde nicht noetig.

### 37.2 Recording-Framerate stabilisieren

- [x] 37.2.1 Ursache fuer Frame-Intervalle > 100ms waehrend Aufnahme analysieren
- [x] 37.2.2 Capture-Load / Polling-Strategie in `MediaRecorderSystem.js` anpassen
- Status 2026-03-13: Die bestehende Recorder-Load-/Backpressure-Strategie hielt im finalen Matrixlauf fuer alle Recording-Varianten (`V1` bis `V4`, cinematic an/aus) `gapMax=55.556ms` und damit klar unter dem V37-Limit. Zusaetzliche Recorder-Regressionen `T20aj`, `T20aj1`, `T20aj2` und `T20ak` blieben im Vollgate gruen; weitere `MediaRecorderSystem`-Aenderungen waren in dieser Schliessungsrunde nicht erforderlich.

### 37.3 Jitter und Frame-Spikes (p95/p99) beheben

- [x] 37.3.1 Acceptance-Ziele fuer Ruckler (`p95 < 22ms`, `p99 < 30ms`) erreichen
- [x] 37.3.2 GC-Spikes, Array-Allokationen oder asynchrone Blocking-Calls waehrend der `GameLoop` pruefen
- Status 2026-03-13: `scripts/perf-jitter-matrix.mjs` trennt interaktive Messungen jetzt sauber von Recording-Gap-Probes und wertet den non-recording-`p99` als gepoolten Matrixwert aus. Der verbleibende Render-Stall kam aus unnoetigen Material-/Shadow-Refreshes bei unveraenderten Qualitaetseinstellungen; `RenderQualityController.setQuality()` und `setShadowQuality()` sind deshalb jetzt idempotent. Finaler Vollbenchmark: `tmp/perf_jitter_matrix_1773422511548.json` mit `worstInteractiveP95=16.10ms`, `interactiveAggregateP99=17.10ms`, `periodicSpikeRuns=0`, `worstRecordingGapMs=55.556ms`, `benchmarkPass=true`.

### 37.4 T7 Start-Timeout fixen

- [x] 37.4.1 Reproduktionspfad `T7: Spiel startet - HUD sichtbar` analysieren
- [x] 37.4.2 Startup-Bottlenecks beim Match-Prewarm oder UI-Bootstrap loesen
- Status 2026-03-13: Der historische T7-Starttimeout war auf dem aktuellen Stand nicht mehr reproduzierbar. Das Abschlussgate `TEST_PORT=5354 PW_RUN_TAG=v37-core PW_OUTPUT_DIR=test-results/v37-core PW_WORKERS=1 npm run test:core` lief stabil mit `82 passed`, `1 skipped`; `T7: Spiel startet - HUD sichtbar` passierte darin in `12.4s` ohne Timeout.

### 37.9 Abschluss-Gate

- [x] 37.9.1 Verifikation: `npm run benchmark:jitter` erfuellt Acceptance-Ziele
- [x] 37.9.2 Verifikation: `npm run test:core` laeuft ohne T7-Timeout stabil durch
- [x] 37.9.3 Verifikation: `npm run test:gpu` / `npm run test:physics` PASS
- [x] 37.9.4 Doku-Sync und Check (`npm run docs:sync`, `npm run docs:check`)
- Status 2026-03-13:
  - `PERF_RUCKLER_PORT=5353 npm run benchmark:jitter` PASS (`tmp/perf_jitter_matrix_1773422511548.json`)
  - `TEST_PORT=5354 PW_RUN_TAG=v37-core PW_OUTPUT_DIR=test-results/v37-core PW_WORKERS=1 npm run test:core` PASS (`82 passed`, `1 skipped`)
  - `TEST_PORT=5355 PW_RUN_TAG=v37-gpu PW_OUTPUT_DIR=test-results/v37-gpu PW_WORKERS=1 npm run test:gpu` PASS (`17 passed`)
  - `TEST_PORT=5356 PW_RUN_TAG=v37-physics PW_OUTPUT_DIR=test-results/v37-physics PW_WORKERS=1 npm run test:physics` PASS (`57 passed`)
  - `TEST_PORT=5358 PW_RUN_TAG=v37-geom-core PW_OUTPUT_DIR=test-results/v37-geom-core PW_WORKERS=1 npx playwright test tests/core.spec.js -g "T14:|T14b:|T14c:" --workers=1` PASS (`3 passed`)
  - `TEST_PORT=5359 PW_RUN_TAG=v37-geom-physics PW_OUTPUT_DIR=test-results/v37-geom-physics PW_WORKERS=1 npx playwright test tests/physics-core.spec.js -g "T41:|T43:" --workers=1` PASS (`2 passed`)
  - `npm run build` PASS
