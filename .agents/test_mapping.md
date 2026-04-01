# Test Mapping

Use this table to choose the cheapest meaningful verification path for block-end `*.99` runs.

## Klassen

- `guard`: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- `node-contract`: `npm run test:contract`
- `playwright-smoke`: `npm run test:smoke`
- `playwright-targeted`: `npm run test:targeted`, `npm run test:physics`, `npm run test:editor-ui`
- `heavy-special`: `npm run test:heavy`, `npm run test:contract:targeted`, `npm run test:diagnostic`, `npm run smoke:selftrail`, `npm run smoke:roundstate`, `npm run smoke:arcade`

## Einsatzregel

- Standardreihenfolge: `guard` -> `node-contract` -> nur wenn echte Runtime/UI-Frage vorliegt `playwright-smoke`.
- Playwright nur fuer DOM-, Canvas-, Browser-API- oder Runtime-Integration einsetzen.
- `playwright-targeted` und `heavy-special` bleiben fuer passende Scopes oder das Abschluss-Gate reserviert.
- Waehrend normaler Blockphasen werden die zugeordneten Tests vorbereitet, aber ohne expliziten User-Wunsch nicht standardmaessig ausgefuehrt.

## Path -> Command

- `src/core/config/**` -> `npm run test:contract`
- `src/entities/ai/**` -> `npm run test:contract`
- `src/entities/player/**` -> `npm run test:contract`
- `src/hunt/**` -> `npm run test:contract` then `npm run test:physics`
- `src/modes/**` -> `npm run test:contract`
- `src/network/**` -> `npm run test:contract` then `npm run test:targeted`
- `src/shared/contracts/**` -> `npm run test:contract`
- `src/state/training/**` -> `npm run test:contract`
- `src/state/**` -> `npm run test:contract` then `npm run smoke:roundstate`
- `src/core/runtime/**` -> `npm run test:smoke` then `npm run test:targeted`
- `src/core/recording/**` -> `npm run test:smoke` then `npm run test:targeted`
- `src/core/Renderer.js` -> `npm run test:smoke` then `npm run test:heavy`
- `src/ui/**` -> `npm run test:smoke`
- `editor/**` -> `npm run test:editor-ui`
- `tests/*.contract.test.mjs` -> `npm run test:contract`
- `tests/core.spec.js` -> `npm run test:smoke`
- `tests/core-targeted.spec.js` -> `npm run test:targeted`
- `tests/physics-*.spec.js` -> `npm run test:physics`
- `tests/network-adapter.spec.js` -> `npm run test:targeted`
- `tests/training-automation.spec.js` -> `npm run test:targeted`
- `tests/gpu.spec.js` -> `npm run test:heavy`
- `tests/stress.spec.js` -> `npm run test:heavy`
- `tests/v28-regression.spec.js` -> `npm run test:heavy`
- `tests/tmp-shorts-diagnostic.spec.js` -> `npm run test:diagnostic`
- `scripts/self-trail-*.mjs` -> `npm run smoke:selftrail`
- `scripts/round-state-*.mjs` -> `npm run smoke:roundstate`
- Workflow-/Plan-/Rule-Aenderungen -> `npm run plan:check` and `npm run docs:check`

## Fallback

- If no mapping matches, start with `npm run test:contract`.
- If the change touches visible runtime flow and no narrower mapping exists, escalate to `npm run test:smoke`.
- Use `npm run test:core` only when you intentionally want the cheap default path (`contract + smoke`) in one command.

## Parallelisierung

For parallel Playwright runs isolate port and artifacts:

```
TEST_PORT=5174 PW_RUN_TAG=bot1 PW_OUTPUT_DIR=test-results/bot1 npm run test:smoke
TEST_PORT=5175 PW_RUN_TAG=bot2 PW_OUTPUT_DIR=test-results/bot2 npm run test:targeted
```

Wichtig: Keine parallelen Runs mit identischem `TEST_PORT` oder identischem `PW_OUTPUT_DIR`.
`npm run test:smoke` setzt `PW_PREWARM=0`, damit der kleine Default-Smoke ohne globalen Modul-Warmup laeuft.
