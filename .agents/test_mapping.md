# Test Mapping

Use this table to select verification commands from changed paths.

## Path -> Command

- `src/entities/**` -> `npm run test:core` and `npm run test:physics`
- `src/state/**` -> `npm run test:core` and `npm run smoke:roundstate`
- `src/ui/**` -> `npm run test:core` and `npm run test:stress`
- `src/core/**` -> `npm run test:core`
- `tests/**` -> run the directly affected test command(s)
- `scripts/**` -> run matching smoke script only (no Playwright tests)
- `scripts/self-trail-*.mjs` -> `npm run smoke:selftrail`
- `scripts/round-state-*.mjs` -> `npm run smoke:roundstate`
- `editor/**` -> `npm run test:core`

## Fallback

- If no mapping matches, run `npm run test:core`.
- For multi-area changes, use `npm run test:fast` (core + physics:core combined).

## Schnellpfad (nur bei kleinen Aenderungen)

- `src/ui/**` nur visuell -> `npm run test:core` reicht, `test:stress` entfaellt
- `src/entities/Bot*.js` -> `npm run test:physics:core` reicht, `test:physics:hunt` und `test:physics:policy` entfallen
- `src/core/MediaRecorderSystem.js` -> nur T20a/T20af/T20n aus `test:core`
- Workflow-/Plan-/Rule-Aenderungen -> `npm run plan:check` und `npm run docs:check`

## Parallelisierung

Bei parallelen Playwright-Runs pro Bot isolieren (Port + Artefakte):

```
TEST_PORT=5174 PW_RUN_TAG=bot1 PW_OUTPUT_DIR=test-results/bot1 npm run test:core
TEST_PORT=5175 PW_RUN_TAG=bot2 PW_OUTPUT_DIR=test-results/bot2 npm run test:physics
```

Wichtig: Keine parallelen Runs mit identischem `TEST_PORT` oder identischem `PW_OUTPUT_DIR`.
Default-Config laeuft lokal mit `workers=1` fuer geringere Last; optional per `PW_WORKERS` erhoehbar.
