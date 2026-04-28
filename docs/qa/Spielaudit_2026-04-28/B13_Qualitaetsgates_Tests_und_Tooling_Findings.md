# B13 Qualitaetsgates, Tests und Tooling - Findings

Stand: 2026-04-29
Status: offen
Planquelle: [README.md](./README.md)

## Scope

Initiale Sichtung 2026-04-29:

- `package.json`
- `playwright.config.js`
- `playwright.editor.config.mjs`
- `playwright.local.repro.config.mjs`
- `scripts/playwright-run-profile.mjs`
- `scripts/playwright-preview-server.mjs`
- `scripts/dev-with-logs.mjs`
- `tests/helpers.js`
- `tests/helpers.desktop.js`

Recheck Wissensgraph 2026-04-29:

- `npm run graph:build`
- `npm run graph:check`
- `node scripts/query-knowledge-graph.mjs files-for-block B13`
- `node scripts/query-knowledge-graph.mjs uncovered-files tests/`
- `node scripts/query-knowledge-graph.mjs coverage-report`

Gesamtscope des Blocks:

- `tests/**`
- `playwright.config.js`
- `playwright.editor.config.mjs`
- `playwright.local.repro.config.mjs`
- `vite.config.js`
- `eslint.config.js`
- `tsconfig.architecture.json`
- `scripts/**`
- `dev/scripts/**`
- `package.json`

## Prueffokus

- Guard-, Typecheck- und Doku-Gates
- Playwright-Harness, Run-Profile und Reproduzierbarkeit
- Test-Helfer, Fallback-Pfade und Regressionsempfindlichkeit
- Build-, Vite-, Playwright- und Script-Drift

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B13-F01 | hoch | Editor-UI-Suite umgeht den kanonischen Playwright-Harness | `package.json`, `playwright.config.js`, `playwright.editor.config.mjs`, `scripts/playwright-run-profile.mjs`, `scripts/playwright-preview-server.mjs` | Die kanonischen Browser-/Desktop-Skripte laufen ueber `dev/scripts/verify-lock.mjs` plus Wrapper wie `scripts/run-playwright-smoke.mjs`, `scripts/run-playwright-targeted-clusters.mjs` und den Run-Profile-Pfad (`package.json:81-89`, `scripts/playwright-run-profile.mjs:5-10, 97-104`). `test:editor-ui` startet dagegen direkt `npx playwright test --config playwright.editor.config.mjs` (`package.json:97`). Gleichzeitig erzeugt die Hauptkonfiguration isolierte `PW_RUN_TAG`-/`PW_OUTPUT_DIR`-Werte, setzt `VITE_APP_MODE`, optionales Warmup und den Preview-Server-Wrapper (`playwright.config.js:10-16, 43-66, 86-88, 106-133`), waehrend `playwright.editor.config.mjs:5-27` nur einen rohen `npm run build && npx vite preview`-Pfad verwendet. | Die Editor-Suite entweder an denselben Lock-/Run-Profile-/Artefaktvertrag anbinden oder einen gleichwertigen dedizierten Wrapper mit denselben Invarianten, Logs und Diagnostik einziehen. | offen |
| B13-F02 | hoch | Browser-Testhelfer koennen UI-Regressionspfade durch Runtime- und DOM-Bypaesse verdecken | `tests/helpers.js` | Die Helper oeffnen Menuepanels ueber `window.GAME_INSTANCE?.uiManager?.menuNavigationRuntime.showPanel(...)` statt ausschliesslich ueber sichtbare UI-Einstiege (`tests/helpers.js:220-222`). Wenn das Oeffnen einer Start-Setup-Sektion ueber die UI scheitert, entfernt der Helper `.hidden` und setzt `element.open = true` direkt im DOM (`tests/helpers.js:309-310`). Weitere Hilfspfade greifen direkt auf Runtime-Interna wie `_returnToMenu`, `setLevel4Open(false)` und `menuExpertLoginRuntime.isUnlocked()` zu (`tests/helpers.js:58`, `372`, `406-411`). | Produktnahe Smoke-/E2E-Suites auf strikt oeffentliche UI-Pfade begrenzen; Diagnose-/Recovery-Helfer separat markieren und nur opt-in oder in explizit nicht-produktnahen Repro-Suites zulassen. | offen |
| B13-F03 | mittel | Playwright-Sonderkonfigurationen duplizieren Bootstrap- und Artefaktlogik ausserhalb des Run-Profile-Systems | `playwright.config.js`, `playwright.local.repro.config.mjs`, `scripts/dev-with-logs.mjs` | Die Hauptkonfiguration leitet `PW_RUN_PROFILE`, `VITE_APP_MODE`, `PW_RUN_TAG`, `TEST_PORT`, `PW_OUTPUT_DIR`, HTML-Report-Ordner und Server-Logpfade zentral ab (`playwright.config.js:10-16, 43-89`). `playwright.local.repro.config.mjs:3-24` definiert dagegen einen eigenen Dev-Server-Startpfad und konsumiert diese Ableitungen nicht; parallel schreibt `scripts/dev-with-logs.mjs:59-82` eigene Log-/Metadatenartefakte unter `tmp/dev-logs`, die nicht Teil des kanonischen Playwright-Artefaktvertrags sind. | `playwright.local.repro.config.mjs` als echten Unterfall des Run-Profile-Systems modellieren oder mindestens dieselben Env-, Log- und Output-Konventionen ueber einen gemeinsamen Wrapper konsumieren. | offen |

## Offene Fragen

- Soll `test:editor-ui` bewusst ausserhalb des kanonischen Playwright-Harnesses bleiben, oder soll die Suite denselben Lock-, Run-Profile- und Artefaktvertrag wie die anderen Browser-/Desktop-Suites bekommen?
- Welche Fallbacks in `tests/helpers.js` sind absichtliche Diagnosepfade, und welche werden heute still in produktnahen Smoke-/E2E-Suites mitbenutzt?

## Folgearbeit

- `tests/editor-map-ui.spec.js` und die produktnahen Specs mit `tests/helpers.js` gegen die neuen Findings kartieren: welche Suites konsumieren Runtime-/DOM-Bypaesse tatsaechlich?
- Delta zwischen `playwright.config.js`, `playwright.editor.config.mjs` und `playwright.local.repro.config.mjs` auf einen kleinen gemeinsamen Wrapper reduzieren oder explizit als getrennte Harness-Klassen dokumentieren.
- Der Wissensgraph ist nach dem Recheck aktuell und `graph:check` gruen; als naechstes B13 auf Guard-, Typecheck- und Coverage-Taxonomie-Fragen erweitern, statt den Graph-Stand nochmals nur mechanisch neu zu schreiben.
