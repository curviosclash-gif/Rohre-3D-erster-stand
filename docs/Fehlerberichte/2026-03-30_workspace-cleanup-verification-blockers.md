# Fehlerbericht: Workspace-Cleanup Verifikation Blockiert

## Aufgabe/Kontext

- Task: konservativen Workspace-Cleanup nach erneuter Planpruefung sicher umsetzen
- Ziel: nur eindeutig unkritische Artefakte bereinigen, ohne Runtime, Editor, Recording oder laufende User-Runs zu stoeren
- Datum: 2026-03-30

## Fehlerbild

- Beobachtung: der Cleanup selbst lief sicher, aber die Vollverifikation war erst geloest und ist nach erneuten Gate-Reruns wieder blockiert
- Erwartetes Verhalten: `npm run build` und optional `npm run test:core` laufen als Safety-Gates gruen
- Tatsaechliches Verhalten:
  - der fruehere Architektur-Gate-Blocker ist geloest; `npm run build` laeuft inzwischen gruen
  - frische Playwright-Reruns fuer `test:core` und `tests/editor-vehicle.spec.js` brechen derzeit in `tests/playwright.global-setup.js` waehrend des Modul-Warmups mit `fetch failed` ab und haengen anschliessend bis zum Tool-Timeout

## Reproduktion

1. `npm run cleanup:workspace`
2. `npm run check:root:runtime`
3. `npm run build`
4. `$env:TEST_PORT='5339'; $env:PW_RUN_TAG='v71-core-close'; $env:PW_OUTPUT_DIR='test-results/v71-core-close'; npm run test:core`
5. `$env:TEST_PORT='5341'; $env:PW_RUN_TAG='v71-core-close-r2'; $env:PW_OUTPUT_DIR='test-results/v71-core-close-r2'; node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --timeout=240000 --reporter=line`
6. `$env:TEST_PORT='5342'; $env:PW_RUN_TAG='v71-editor-vehicle-close'; $env:PW_OUTPUT_DIR='test-results/v71-editor-vehicle-close'; node scripts/verify-lock.mjs --playwright -- npx playwright test tests/editor-vehicle.spec.js --timeout=240000 --reporter=line`

## Betroffene Dateien/Komponenten

- `scripts/workspace-cleanup.mjs`
- `package.json`
- `README.md`
- `tests/playwright.global-setup.js`
- `test-results/v71-core-close/playwright-startup-diagnostics.json`
- `test-results/v71-core-close-r2/playwright-startup-diagnostics.json`
- `test-results/v71-editor-vehicle-close/playwright-startup-diagnostics.json`
- `.playwright-suite.lock`

## Bereits getestete Ansaetze

- Ansatz: Cleanup nur auf konservativen Low-Risk-Scope begrenzen und aktive Artefakte per Lock/Tracking-Pruefung schuetzen
- Ergebnis: PASS, der Runner loescht keine versionierten oder aktiven Playwright-Ziele
- Ansatz: Root-Guard, Pfad-Guards und Build separat pruefen
- Ergebnis: `npm run cleanup:workspace`, `npm run check:editor:path-drift`, `npm run check:root:runtime`, `npm run build` PASS
- Ansatz: Vollstaendiger Build
- Ergebnis: PASS
- Ansatz: `test:core` auf frischen Ports (`5339`, `5341`) erneut starten
- Ergebnis: FAIL/HANG; nur `playwright-startup-diagnostics.json` wird geschrieben, danach Tool-Timeout
- Ansatz: direkt betroffene Vehicle-/Editor-Spec auf frischem Port (`5342`) erneut starten
- Ergebnis: FAIL/HANG; identisches Muster mit Warmup-Fehlern vor der eigentlichen Spec

## Evidence

- Logs:
  - `Root runtime invariant guard passed.`
  - `Editor/game-area path drift guard passed.`
  - `build` PASS
  - `test-results/v71-core-close/playwright-startup-diagnostics.json` enthaelt `message: "fetch failed"` fuer `/src/core/runtime/MenuRuntimePresetConfigService.js`
  - `test-results/v71-core-close-r2/playwright-startup-diagnostics.json` enthaelt `failedCount: 26`
  - `test-results/v71-editor-vehicle-close/playwright-startup-diagnostics.json` enthaelt `failedCount: 12`
  - `.playwright-suite.lock` zeigte nach dem Timeout nur noch tote PIDs (`9968`, `9128`) aus den abgebrochenen Reruns
- Screenshots/Artefakte:
  - `tmp/workspace-cleanup-report.json`
- Relevante Commits:
  - `9035863`
  - `4feab0e`

## Verlauf

- Status:
  - zwischenzeitlich geloest am 2026-03-30
  - erneut offen seit den Gate-Reruns am 2026-03-30
- Zwischenstand:
  - `npm run build` PASS
  - `TEST_PORT=5335 PW_RUN_TAG=v71-core-rerun PW_OUTPUT_DIR=test-results/v71-core-rerun node scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --timeout=240000 --reporter=line` -> `127 passed`, `4 skipped`
  - `TEST_PORT=5337 PW_RUN_TAG=v71-editor-vehicle-rerun PW_OUTPUT_DIR=test-results/v71-editor-vehicle-rerun node scripts/verify-lock.mjs --playwright -- npx playwright test tests/editor-vehicle.spec.js --timeout=240000 --reporter=line` -> `6 passed`
  - frische Reruns `v71-core-close`, `v71-core-close-r2`, `v71-editor-vehicle-close` sind aktuell nicht stabil abschliessbar
- Root-Cause-Stand:
  - Kein Hinweis auf 404s oder auf einen kaputten V71-Pfadvertrag
  - Der aktuelle Blocker sitzt in der Playwright-Global-Setup-/Warmup-Schiene und ist wahrscheinlich infra- oder flake-getrieben

## Naechster Schritt

- `tests/playwright.global-setup.js` bzw. den Dev-Server-Warmup fuer die haengenden Reruns untersuchen oder die Gates in sauberem Prozesszustand erneut ausfuehren
- Bis dahin bleibt V71 bei 71.99 offen; die Fachphasen 71.3 bis 71.5 sind umgesetzt
