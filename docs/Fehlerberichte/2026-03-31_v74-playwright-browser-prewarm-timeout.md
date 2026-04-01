# Fehlerbericht: V74 Playwright-Global-Setup bleibt an Probe-Timeouts haengen

## Kontext

- Task: Block V74 Runtime-Entkopplung Abschlussverifikation
- Erwartetes Verhalten: Playwright-Gates (`npm run test:core`, `npm run test:physics` und gezielte V74-Greps) laufen nach den Runtime-/Lifecycle-/Entity-Vertragsaenderungen deterministisch an

## Beobachtung

- `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:eslint:touched-strict` und `npm run build` sind fuer den V74.2-Scope gruen
- Ein erster gezielter Playwright-Rerun schlug nicht am Runtime-Port-Code, sondern an einem Parserproblem fehl: `tests/validate-umsetzungsplan.test.mjs` importierte `scripts/validate-umsetzungsplan.mjs` mit BOM+Shebang; das ist im Scope-Fix `f25a4db` durch UTF-8-no-BOM behoben
- Der anschliessende isolierte Rerun von `tests/runtime-facade.spec.js` lief erneut in das globale Timeout:
  - `TEST_PORT=5348`
  - `PW_RUN_TAG=v74-runtime-facade-spec`
  - `PW_OUTPUT_DIR=test-results/v74-runtime-facade-spec`
- Die Startup-Diagnose unter `test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json` zeigt weiterhin `probe-timeout` und `fetch failed` in `tests/playwright.global-setup.js` waehrend des Modul-Warmups
- Trotz der Probe-Timeouts startete der Run teilweise; die erzeugten Fehlerartefakte liegen in `test-results/v74-runtime-facade-spec/`, die fehlgeschlagenen Flow-Tests hingen jedoch weiter im Menu-/Matchstart-Pfad bis zum Harness-Timeout
- Neuer Verifikationsstand vom `2026-03-31T04:26:28+02:00`:
  - `npm run build` lief komplett gruen inklusive `check:architecture:boundaries`, `check:architecture:metrics`, `check:root:runtime` und `typecheck:architecture`
  - `npm run architecture:report` und `npm run smoke:roundstate` sind gruen
  - `npm run test:core` lief im Tool zwei Mal in Timeout (`124s` und `304s`), ohne vor dem Timeout einen regulären Playwright-Abschluss zu liefern
  - `npm run test:physics`, `npm run test:physics:core` und ein gezielter V74-Core-Run via `node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "T20aj4a|T20ae4|V74\\.3" --reporter=line --timeout=240000` liefen ebenfalls nur in Tool-Timeouts (`~184s`)

## Reproduktion

1. `TEST_PORT=5347 PW_RUN_TAG=v74-rtports-runtime-facade PW_OUTPUT_DIR=test-results/v74-rtports-runtime-facade node scripts/verify-lock.mjs --playwright -- npx playwright test tests/runtime-facade.spec.js --grep "...runtime facade..." --reporter=line`
2. Parserfehler beobachten (`scripts/validate-umsetzungsplan.mjs` mit BOM); danach den BOM-Fix anwenden
3. `TEST_PORT=5348 PW_RUN_TAG=v74-runtime-facade-spec PW_OUTPUT_DIR=test-results/v74-runtime-facade-spec node scripts/verify-lock.mjs --playwright -- npx playwright test tests/runtime-facade.spec.js --reporter=line`
4. Auf Tool-Timeout warten und `Get-Content test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json` lesen
5. `npm run test:core`
6. `npm run test:physics`
7. `npm run test:physics:core`
8. `node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "T20aj4a|T20ae4|V74\.3" --reporter=line --timeout=240000`

## Betroffene Komponenten

- `tests/playwright.global-setup.js`
- `scripts/validate-umsetzungsplan.mjs` (Parserblocker behoben in `f25a4db`)
- Browser-Verifikation fuer `tests/runtime-facade.spec.js`, `tests/core.spec.js` und `tests/physics-*.spec.js`

## Versuchter Workaround

- isolierter Run mit eigenem `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`
- Parserblocker in `scripts/validate-umsetzungsplan.mjs` per UTF-8-no-BOM-Fix entfernt
- Build- und Guard-Gates separat geprueft (`npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:eslint:touched-strict`, `npm run build`)
- Round-State-Smoke separat geprueft (`npm run smoke:roundstate`)
- Runtime-Port-/Pause-Lifecycle-Regressionen ueber neue Browser-Tests in `tests/runtime-facade.spec.js` und `tests/core.spec.js` abgesichert, soweit der Harness startet

## Aktueller Status

- Produkt-Code fuer V74 ist auf Guard-/Build-/RoundState-Smoke-Ebene verifiziert
- Der BOM-bezogene Parserblocker ist beseitigt
- Offener Restblocker bleibt der automatische Playwright-Harness ueber `tests/playwright.global-setup.js` (`probe-timeout`/`fetch failed` waehrend Modul-Warmup bzw. spaetere suiteweite Timeouts ohne regulären Abschluss)

## Naechster konkreter Schritt

- `tests/playwright.global-setup.js` gezielt auf die Modul-Warmup-Probes mit `probe-timeout`/`fetch failed` untersuchen
- danach `tests/runtime-facade.spec.js` und die neuen `T20ae2`-/Runtime-Port-Smokes in sauberem Prozesszustand erneut laufen lassen
