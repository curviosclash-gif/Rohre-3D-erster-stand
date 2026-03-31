# Fehlerbericht: V74 Playwright-Global-Setup bleibt an Probe-Timeouts haengen

## Kontext

- Task: Block V74.2 Core/UI-Orchestrierungszyklus, Lifecycle-Port-Schnitt und Return-to-Menu-Konsolidierung
- Erwartetes Verhalten: gezielte Browser-Verifikation ueber `tests/runtime-facade.spec.js` und die beruehrten Core-Tests laeuft nach den Runtime-Port-Aenderungen deterministisch an

## Beobachtung

- `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:eslint:touched-strict` und `npm run build` sind fuer den V74.2-Scope gruen
- Ein erster gezielter Playwright-Rerun schlug nicht am Runtime-Port-Code, sondern an einem Parserproblem fehl: `tests/validate-umsetzungsplan.test.mjs` importierte `scripts/validate-umsetzungsplan.mjs` mit BOM+Shebang; das ist im Scope-Fix `f25a4db` durch UTF-8-no-BOM behoben
- Der anschliessende isolierte Rerun von `tests/runtime-facade.spec.js` lief erneut in das globale Timeout:
  - `TEST_PORT=5348`
  - `PW_RUN_TAG=v74-runtime-facade-spec`
  - `PW_OUTPUT_DIR=test-results/v74-runtime-facade-spec`
- Die Startup-Diagnose unter `test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json` zeigt weiterhin `probe-timeout` und `fetch failed` in `tests/playwright.global-setup.js` waehrend des Modul-Warmups
- Trotz der Probe-Timeouts startete der Run teilweise; die erzeugten Fehlerartefakte liegen in `test-results/v74-runtime-facade-spec/`, die fehlgeschlagenen Flow-Tests hingen jedoch weiter im Menu-/Matchstart-Pfad bis zum Harness-Timeout

## Reproduktion

1. `TEST_PORT=5347 PW_RUN_TAG=v74-rtports-runtime-facade PW_OUTPUT_DIR=test-results/v74-rtports-runtime-facade node scripts/verify-lock.mjs --playwright -- npx playwright test tests/runtime-facade.spec.js --grep "...runtime facade..." --reporter=line`
2. Parserfehler beobachten (`scripts/validate-umsetzungsplan.mjs` mit BOM); danach den BOM-Fix anwenden
3. `TEST_PORT=5348 PW_RUN_TAG=v74-runtime-facade-spec PW_OUTPUT_DIR=test-results/v74-runtime-facade-spec node scripts/verify-lock.mjs --playwright -- npx playwright test tests/runtime-facade.spec.js --reporter=line`
4. Auf Tool-Timeout warten und `Get-Content test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json` lesen

## Betroffene Komponenten

- `tests/playwright.global-setup.js`
- `scripts/validate-umsetzungsplan.mjs` (Parserblocker behoben in `f25a4db`)
- Browser-Verifikation fuer `tests/runtime-facade.spec.js`

## Versuchter Workaround

- isolierter Run mit eigenem `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`
- Parserblocker in `scripts/validate-umsetzungsplan.mjs` per UTF-8-no-BOM-Fix entfernt
- Build- und Guard-Gates separat geprueft (`npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:eslint:touched-strict`, `npm run build`)
- Runtime-Port-/Pause-Lifecycle-Regressionen ueber neue Browser-Tests in `tests/runtime-facade.spec.js` und `tests/core.spec.js` abgesichert, soweit der Harness startet

## Aktueller Status

- Produkt-Code fuer V74.2 ist auf Guard-/Build-Ebene verifiziert; technischer Stand liegt in `f25a4db`
- Der BOM-bezogene Parserblocker ist beseitigt
- Offener Restblocker bleibt der automatische Playwright-Harness ueber `tests/playwright.global-setup.js` (`probe-timeout`/`fetch failed` waehrend Modul-Warmup und spaeteres Harness-Timeout)

## Naechster konkreter Schritt

- `tests/playwright.global-setup.js` gezielt auf die Modul-Warmup-Probes mit `probe-timeout`/`fetch failed` untersuchen
- danach `tests/runtime-facade.spec.js` und die neuen `T20ae2`-/Runtime-Port-Smokes in sauberem Prozesszustand erneut laufen lassen
