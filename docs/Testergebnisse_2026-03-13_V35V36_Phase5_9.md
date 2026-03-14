# Testergebnisse V35/V36 Phase 5/6/8/9 vom 2026-03-13

## Scope

- Phase 5: Kamera-Pacing vereinheitlichen
- Phase 6: Recording-Pfad unter Last entkoppeln
- Phase 8: Playwright-Test-Workflow haerten
- Phase 9: serielle Vollverifikation mit Perf-/GPU-Matrix

## Umgesetzte Aenderungen

### Phase 5

- `src/core/GameLoop.js`
  - gemeinsamer `renderTiming`-Kanal fuer `rawDt`, `stabilizedDt`, Frame-ID und Reset-Grund
  - expliziter Delta-Reset bei `start`, `blur`, `focus` und `visibilitychange`
- `src/core/PlayingStateSystem.js`
  - Renderpfad liest den gemeinsamen Timing-Kanal und reicht ihn einmal pro Frame an die Kamera weiter
- `src/core/renderer/CameraRigSystem.js`
  - Kamera-DT nutzt nun den gemeinsamen Frame-Timing-Pfad statt separater heuristischer Driftpfade

### Phase 6

- `src/core/MediaRecorderSystem.js`
  - aggressivere Capture-Load-Stufen (FPS/Resolution)
  - Backlog-Trim statt Catch-up-Schleifen im Capture-Pfad
  - Hard-Drops nur noch fuer den nicht-expliziten MediaRecorder-Pfad ohne `requestFrame`
  - Export-Zeitstempel werden normalisiert und mit `durationMs` / `timestampValidation` in die Export-Meta geschrieben
- Ergebnis:
  - leere 696-Byte-Referenzclips aus frueheren Laeufen wurden im finalen Lauf durch echte WebM-Exporte ersetzt
  - Frame-Interval-Stats sind jetzt im Matrix-Report und in den Export-Metas vorhanden

### Phase 8

- `scripts/verify-lock.mjs`
  - bestehende Umsetzungsplan-Lock-Pruefung erhalten
  - zusaetzlicher Start-Lock fuer lokale Playwright-/Browser-Laeufe
  - automatische Isolation von `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`, `PW_WORKERS`
- `package.json`
  - Playwright- und Jitter-Skripte laufen ueber den neuen Lock-/Isolation-Wrapper
- `playwright.config.js`
  - `workers=1` bleibt Default
  - `vite` startet mit `--strictPort`

### Phase 9

- `scripts/perf-jitter-matrix.mjs`
  - Referenzclips erhalten eindeutige `sessionId`-basierte Dateinamen
  - finaler Matrix-Report sammelt Referenzclip-Pfade
  - Anti-Background-Flags und `page.bringToFront()` im Runner ergaenzt

## Verifikation

### Pflichtlaeufe

1. `npm run build`
   - Ergebnis: `PASS`

2. `TEST_PORT=5225 PW_RUN_TAG=v35v36-core-final PW_OUTPUT_DIR=test-results/v35v36-core-final PW_WORKERS=1 npm run test:core`
   - Ergebnis: `FAIL`
   - Blocker: `T7: Spiel startet – HUD sichtbar` Timeout nach `30000ms`

3. `TEST_PORT=5226 PW_RUN_TAG=v35v36-physics-final PW_OUTPUT_DIR=test-results/v35v36-physics-final PW_WORKERS=1 npm run test:physics`
   - Ergebnis: `PASS`
   - Status: `53 passed`

### Zusatzchecks

4. `TEST_PORT=5227 PW_RUN_TAG=v35v36-gpu-final PW_OUTPUT_DIR=test-results/v35v36-gpu-final PW_WORKERS=1 npm run test:gpu`
   - Ergebnis: `PASS`
   - Status: `17 passed`

5. Isolierte Core-Diagnose
   - `TEST_PORT=5230 PW_RUN_TAG=v35v36-core-t7-final PW_OUTPUT_DIR=test-results/v35v36-core-t7-final PW_WORKERS=1 npx playwright test tests/core.spec.js -g "T7: Spiel startet" --workers=1 --reporter=line`
   - Ergebnis: `FAIL`
   - Befund: `T7` ist auf dem finalen Stand weiterhin reproduzierbar rot

6. Isolierte Prewarm-Diagnose
   - `TEST_PORT=5217 PW_RUN_TAG=v35v36-core-t10e PW_OUTPUT_DIR=test-results/v35v36-core-t10e PW_WORKERS=1 npx playwright test tests/core.spec.js -g "T10e:" --workers=1 --reporter=line`
   - Ergebnis: `PASS`

## Perf-Matrix

- Kommando:
  - `TEST_PORT=5228 PW_RUN_TAG=v35v36-jitter-final PW_OUTPUT_DIR=test-results/v35v36-jitter-final PW_WORKERS=1 PERF_RUCKLER_PORT=5229 PERF_RUCKLER_HEADED=1 PERF_RUCKLER_OUTPUT_PATH=tmp/perf_jitter_matrix_v35v36_phase9_final_20260312.json npm run benchmark:jitter`
- Ergebnis: `FAIL`

### Acceptance-Status

- `p95 < 22ms`: `FAIL`
  - Worst Case: `183.30ms`
- `p99 < 30ms`: `FAIL`
  - Worst Case: `366.60ms`
- `kein periodischer 1–2s-Spike-Rhythmus`: `PASS`
  - `periodicSpikeRuns = 0`
- `Recording stabil (frameInterval max <= 60ms)`: `FAIL`
  - `recordingGapViolations = 8`
  - finale Referenzclips zeigen `frameIntervalStats.max = 101.01ms`

### Matrix-Szenarien

- V1 classic, cinematic off, recording off: `p95=35.90`, `p99=83.20`
- V1 classic, cinematic on, recording off: `p95=66.60`, `p99=99.60`
- V1 classic, cinematic off, recording on: `p95=182.60`, `p99=366.60`, `frameMax=101.01`
- V1 classic, cinematic on, recording on: `p95=83.50`, `p99=149.80`, `frameMax=101.01`
- V2 classic, cinematic off, recording off: `p95=116.50`, `p99=366.60`
- V2 classic, cinematic on, recording off: `p95=100.00`, `p99=133.50`
- V2 classic, cinematic off, recording on: `p95=116.60`, `p99=248.70`, `frameMax=101.01`
- V2 classic, cinematic on, recording on: `p95=150.10`, `p99=299.90`, `frameMax=101.01`
- V3 hunt, cinematic off, recording off: `p95=100.10`, `p99=180.30`
- V3 hunt, cinematic on, recording off: `p95=83.30`, `p99=102.20`
- V3 hunt, cinematic off, recording on: `p95=117.10`, `p99=199.70`, `frameMax=101.01`
- V3 hunt, cinematic on, recording on: `p95=150.50`, `p99=199.90`, `frameMax=101.01`
- V4 hunt, cinematic off, recording off: `p95=116.40`, `p99=150.10`
- V4 hunt, cinematic on, recording off: `p95=116.30`, `p99=166.80`
- V4 hunt, cinematic off, recording on: `p95=83.20`, `p99=116.90`, `frameMax=101.01`
- V4 hunt, cinematic on, recording on: `p95=183.30`, `p99=248.50`, `frameMax=101.01`

## Artefakte

### Matrix-Report

- `tmp/perf_jitter_matrix_v35v36_phase9_final_20260312.json`

### Referenzclips

- `videos/aero-arena-classic-phase9-v1-plain-rec-20260312T235833Z-20260312T235850Z.webm`
- `videos/aero-arena-classic-phase9-v1-cin-rec-20260312T235852Z-20260312T235909Z.webm`
- `videos/aero-arena-classic-phase9-v2-plain-rec-20260312T235947Z-20260313T000003Z.webm`
- `videos/aero-arena-classic-phase9-v2-cin-rec-20260313T000005Z-20260313T000021Z.webm`
- `videos/aero-arena-hunt-phase9-v3-plain-rec-20260313T000057Z-20260313T000114Z.webm`
- `videos/aero-arena-hunt-phase9-v3-cin-rec-20260313T000116Z-20260313T000132Z.webm`
- `videos/aero-arena-hunt-phase9-v4-plain-rec-20260313T000208Z-20260313T000224Z.webm`
- `videos/aero-arena-hunt-phase9-v4-cin-rec-20260313T000225Z-20260313T000241Z.webm`

## Restrisiken / offene Punkte

- `T7` blockiert den finalen `test:core`-Vollgruenstand weiterhin reproduzierbar.
- Der Recorder liefert jetzt stabile, nicht-leere Clips mit Export-Meta, erreicht unter Last aber weiterhin nur etwa `9.9 FPS` (`frameIntervalStats.max = 101.01ms`).
- Die finale Jitter-Matrix zeigt kein periodisches 1-2s-Spike-Muster mehr, bleibt aber sowohl ohne Recording als auch mit Recording klar ueber dem Zielbudget.
- Weitere Arbeit sollte zuerst auf den reproduzierbaren `T7`-Startpfad und danach auf das allgemeine Renderbudget der Szenarien `V2` bis `V4` gehen.
