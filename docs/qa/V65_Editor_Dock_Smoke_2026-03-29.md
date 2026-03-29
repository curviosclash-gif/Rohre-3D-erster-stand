# V65 Editor Dock Smoke 2026-03-29

## Scope

- Bottom-Dock rendering and placement flow
- Export JSON action
- Save-to-disk UX flow (prompt + success alert)
- Playtest launch flow

## Evidence Run

- Command: `TEST_PORT=5312 PW_RUN_TAG=v65-final-pass2 PW_OUTPUT_DIR=test-results/v65-final-pass2 V65_EVIDENCE_SCREENSHOT=docs/qa/V65_Editor_Build_Dock_2026-03-29.png node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/editor-map-ui.spec.js -c playwright.editor.config.mjs --timeout=240000`
- Result: `4 passed (3.3m)`
- Artifact: `docs/qa/V65_Editor_Build_Dock_2026-03-29.png`
- Artifact: `test-results/v65-final-pass2`

## Smoke Findings

- Export writes current map JSON into `#jsonOutput`.
- Save flow opens prompt, sends payload to `POST /api/editor/save-map-disk`, and shows success alert.
- Playtest opens `index.html` popup with `playtest=1` and `planar=0`.
- No unknown console/runtime errors in the editor run.

## Gate Add-ons

- `TEST_PORT=5314 PW_RUN_TAG=v65-core PW_OUTPUT_DIR=test-results/v65-core npm run test:core` -> `117 passed, 3 skipped`
- `npm run build` -> `PASS`
