# Test Mapping

Use this table to choose the cheapest meaningful verification path for block-end `*.99` runs.

## Klassen

- `guard`: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- `node-contract`: `npm run test:contract`
- `playwright-preview-smoke`: `npm run test:smoke`, `npm run test:playwright:preview-smoke`
- `playwright-dev-runtime`: `npm run test:targeted`, `npm run test:playwright:dev-runtime`, `npm run test:physics`, `npm run test:gpu`, `npm run test:stress`, `npm run test:heavy`, `npm run test:diagnostic`, `npm run test:v28:regression`
- `playwright-browser-contract`: `npm run test:playwright:browser-contract -- <spec-or-grep>`
- `heavy-special`: `npm run test:contract:targeted`, `npm run smoke:selftrail`, `npm run smoke:roundstate`, `npm run smoke:arcade`, `npm run test:editor-ui`

- `playwright-dev-runtime` deckt die breiten Runtime-Slices `tests/core-targeted.spec.js`, `tests/core-targeted-platform.spec.js`, `tests/core-targeted-surface.spec.js`, `tests/core-targeted-runtime.spec.js`, `tests/core-targeted-regressions.spec.js`, `tests/physics-core.spec.js`, `tests/physics-hunt.spec.js`, `tests/physics-policy.spec.js`, `tests/arcade-blueprint.spec.js` und `tests/bot-targeting.spec.js`.
- `playwright-browser-contract` deckt die fokussierten Browser-/Surface-Vertraege `tests/network-adapter.spec.js`, `tests/recording.spec.js`, `tests/training-automation.spec.js` und `tests/editor-vehicle.spec.js`.

## Einsatzregel

- Standardreihenfolge: `guard` -> `node-contract` -> nur wenn echte Runtime/UI-Frage vorliegt `playwright-preview-smoke`.
- Playwright nur fuer DOM-, Canvas-, Browser-API- oder Runtime-Integration einsetzen.
- `playwright-dev-runtime` ist der explizite Vite-Dev-Server-Pfad fuer breite Browser-Source-Imports und tiefere Runtime-Slices, nicht fuer fokussierte Browser-/Surface-Reruns.
- `playwright-browser-contract` bleibt fuer fokussierte browsernahe Vertragschecks mit expliziter Spec- oder `--grep`-Selektion reserviert.
- Vollflaechige Editor-Surfaces bleiben auf `npm run test:editor-ui` (`playwright.editor.config.mjs`) und werden nicht in die Runtime-Profile gezogen.
- `heavy-special` bleibt fuer passende Scopes oder das Abschluss-Gate reserviert.
- Waehrend normaler Blockphasen werden die zugeordneten Tests vorbereitet, aber ohne expliziten User-Wunsch nicht standardmaessig ausgefuehrt.

## Path -> Command

- `src/core/config/**` -> `npm run test:contract`
- `src/entities/ai/training/**` -> `npm run test:contract` then `npm run test:playwright:browser-contract -- tests/training-automation.spec.js`
- `src/entities/ai/**` -> `npm run test:contract`
- `src/entities/player/**` -> `npm run test:contract`
- `src/hunt/**` -> `npm run test:contract` then `npm run test:physics`
- `src/modes/**` -> `npm run test:contract`
- `src/network/**` -> `npm run test:contract` then `npm run test:playwright:browser-contract -- tests/network-adapter.spec.js`
- `src/shared/vehicle-lab/**` -> `npm run test:playwright:browser-contract -- tests/editor-vehicle.spec.js`
- `src/shared/contracts/**` -> `npm run test:contract`
- `src/state/training/**` -> `npm run test:contract` then `npm run test:playwright:browser-contract -- tests/training-automation.spec.js`
- `src/state/**` -> `npm run test:contract` then `npm run smoke:roundstate`
- `src/core/runtime/**` -> `npm run test:smoke` then `npm run test:targeted`
- `src/core/recording/**` -> `npm run test:smoke` then `npm run test:playwright:browser-contract -- tests/recording.spec.js`
- `src/core/Renderer.js` -> `npm run test:smoke` then `npm run test:heavy`
- `src/ui/**` -> `npm run test:smoke`
- `editor/js/EditorAssetLoader.js` -> `npm run test:playwright:browser-contract -- tests/editor-vehicle.spec.js`
- `editor/**` -> `npm run test:editor-ui`
- `tests/*.contract.test.mjs` -> `npm run test:contract`
- `tests/core.spec.js` -> `npm run test:playwright:preview-smoke`
- `tests/core-targeted.spec.js` -> `npm run test:playwright:dev-runtime`
- `tests/core-targeted-platform.spec.js` -> `npm run test:playwright:dev-runtime`
- `tests/core-targeted-surface.spec.js` -> `npm run test:playwright:dev-runtime`
- `tests/core-targeted-runtime.spec.js` -> `npm run test:playwright:dev-runtime`
- `tests/core-targeted-regressions.spec.js` -> `npm run test:playwright:dev-runtime`
- `tests/physics-*.spec.js` -> `npm run test:physics`
- `tests/network-adapter.spec.js` -> `npm run test:playwright:browser-contract -- tests/network-adapter.spec.js`
- `tests/recording.spec.js` -> `npm run test:playwright:browser-contract -- tests/recording.spec.js`
- `tests/training-automation.spec.js` -> `npm run test:playwright:browser-contract -- tests/training-automation.spec.js`
- `tests/editor-vehicle.spec.js` -> `npm run test:playwright:browser-contract -- tests/editor-vehicle.spec.js`
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
- Use `npm run test:playwright:browser-contract -- <spec-or-grep>` only with an explicit selector; the runner aborts bare invocations on purpose.

## Parallelisierung

For parallel Playwright runs isolate port and artifacts:

```
TEST_PORT=5174 PW_RUN_TAG=preview-smoke-bot1 PW_OUTPUT_DIR=test-results/preview-smoke-bot1 npm run test:playwright:preview-smoke
TEST_PORT=5175 PW_RUN_TAG=dev-runtime-bot2 PW_OUTPUT_DIR=test-results/dev-runtime-bot2 npm run test:playwright:dev-runtime
```

Wichtig: Keine parallelen Runs mit identischem `TEST_PORT` oder identischem `PW_OUTPUT_DIR`.
`preview-smoke` erzwingt Preview-Server plus `PW_PREWARM=0`; `dev-runtime` und `browser-contract` erzwingen den Vite-Dev-Server ohne Modul-Warmup.
