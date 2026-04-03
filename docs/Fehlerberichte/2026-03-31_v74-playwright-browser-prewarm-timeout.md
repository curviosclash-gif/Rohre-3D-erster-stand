# Fehlerbericht: V74 Playwright-Harness bleibt an Warmup- und Dev-Server-Timeouts haengen

## Kontext

- Task: Block V74 Runtime-Entkopplung Abschlussverifikation
- Erwartetes Verhalten: Playwright-Gates (`npm run test:core`, `npm run test:physics` und gezielte V74-Greps) laufen nach den Runtime-/Lifecycle-/Entity-Vertragsaenderungen deterministisch an

## Beobachtung

- Guard- und Build-Gates fuer den V74-Scope bleiben gruen:
  - `npm run architecture:report` PASS
  - `npm run build` PASS
  - `npm run test:contract` PASS
  - `npm run smoke:roundstate` PASS
- Historischer Parserblocker ist beseitigt:
  - `tests/validate-umsetzungsplan.test.mjs` importierte `scripts/validate-umsetzungsplan.mjs` frueher mit BOM+Shebang
  - der Fix `f25a4db` entfernte diesen Blocker bereits vor dem aktuellen Lauf
- Alter Restblocker aus dem V74-Abschlusslauf blieb bestehen:
  - `tests/playwright.global-setup.js` zeigte in `test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json` weiterhin `probe-timeout` und `fetch failed` waehrend des Modul-Warmups
  - `npm run test:core`, `npm run test:physics`, `npm run test:physics:core` und ein gezielter V74-Core-Run liefen damals nur in Tool-Timeouts
- Neuer Verifikationsstand vom `2026-04-03`:
  - `npm run test:smoke` scheiterte zunaechst noch vor dem Browserstart in `scripts/run-playwright-smoke.mjs` mit `spawn EINVAL` unter Windows
  - danach wurden drei Harness-Fixes umgesetzt:
    - `scripts/run-playwright-smoke.mjs` startet Playwright direkt ueber die lokale CLI statt ueber `npx.cmd`
    - `scripts/verify-lock.mjs` normalisiert Playwright-Dateifilter separator-neutral und startet die lokale Playwright-CLI direkt
    - `playwright.config.js` begrenzt Discovery auf `**/*.spec.js`, damit `tests/*.test.mjs` nicht mehr in Browser-Runs geladen werden
  - ein isolierter Core-Smoke (`tests/core.spec.js`, `PW_PREWARM=0`) erreicht damit erstmals den eigentlichen Browser-Test, kippt aber nun reproduzierbar in `loadGame()`:
    - erster `page.goto('/')`-Versuch laeuft 45s in Timeout
    - der Retry endet beim Aufraeumen mit `page.goto: net::ERR_ABORTED; maybe frame was detached?`
    - das Trace-Artefakt `test-results/v74-core-load-trace/core-Core-Smoke-loads-the--7b4d5-out-uncaught-startup-errors-chromium/trace.zip` zeigt fuer `GET /` keine HTTP-Antwort (`status: -1`, `_failureText: net::ERR_ABORTED`)
  - der lokale Vite-Repro bestaetigt das Muster aus dem frueheren V65-Blocker:
    - Port lauscht
    - Requests auf `/` liefern in diesem Lauf 0 Bytes bis zum Timeout

## Reproduktion

1. `TEST_PORT=5347 PW_RUN_TAG=v74-rtports-runtime-facade PW_OUTPUT_DIR=test-results/v74-rtports-runtime-facade node scripts/verify-lock.mjs --playwright -- npx playwright test tests/runtime-facade.spec.js --grep "...runtime facade..." --reporter=line`
2. Parserfehler beobachten (`scripts/validate-umsetzungsplan.mjs` mit BOM); danach den BOM-Fix anwenden
3. `TEST_PORT=5348 PW_RUN_TAG=v74-runtime-facade-spec PW_OUTPUT_DIR=test-results/v74-runtime-facade-spec node scripts/verify-lock.mjs --playwright -- npx playwright test tests/runtime-facade.spec.js --reporter=line`
4. Auf Tool-Timeout warten und `Get-Content test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json` lesen
5. `npm run test:contract`
6. `npm run smoke:roundstate`
7. `$env:TEST_PORT='5382'; $env:PW_RUN_TAG='v74-core-load'; $env:PW_OUTPUT_DIR='test-results/v74-core-load'; $env:PW_PREWARM='0'; node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "loads the desktop runtime without uncaught startup errors" --reporter=line --timeout=60000`
8. Fuer das detailierte Artefakt denselben Run mit Trace wiederholen:
   - `$env:TEST_PORT='5386'; $env:PW_RUN_TAG='v74-core-load-trace'; $env:PW_OUTPUT_DIR='test-results/v74-core-load-trace'; $env:PW_PREWARM='0'; $env:PW_TRACE='1'; node dev/scripts/verify-lock.mjs --playwright -- npx playwright test tests/core.spec.js --grep "loads the desktop runtime without uncaught startup errors" --reporter=line --timeout=60000`
9. Optionaler Vite-Repro ausserhalb von Playwright:
   - `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5389 --strictPort`
   - danach `curl.exe --max-time 10 http://127.0.0.1:5389/`

## Betroffene Komponenten

- `tests/playwright.global-setup.js`
- `scripts/validate-umsetzungsplan.mjs` (historischer Parserblocker, bereits behoben)
- `scripts/run-playwright-smoke.mjs`
- `scripts/verify-lock.mjs`
- `playwright.config.js`
- Browser-Verifikation fuer `tests/runtime-facade.spec.js`, `tests/core.spec.js` und `tests/physics-*.spec.js`
- lokaler Vite-Dev-Server-HTTP-Pfad (`/`, analog zum bekannten V65-Muster)

## Bereits getestete Ansaetze

- Ansatz: isolierter Run mit eigenem `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`
- Ergebnis: reproduzierbar, aber weiter blockiert
- Ansatz: Parserblocker in `scripts/validate-umsetzungsplan.mjs` per UTF-8-no-BOM-Fix entfernen
- Ergebnis: PASS, alter BOM-Fehler kommt nicht mehr vor
- Ansatz: Windows-Launcher fuer `npm run test:smoke` von `npx.cmd` auf lokale Playwright-CLI umstellen
- Ergebnis: PASS, `spawn EINVAL` ist beseitigt
- Ansatz: Playwright-Discovery auf `**/*.spec.js` begrenzen
- Ergebnis: PASS, `tests/*.test.mjs` vergiften Browser-Runs nicht mehr
- Ansatz: Playwright-Dateifilter fuer Windows separator-neutral normalisieren
- Ergebnis: PASS, gezielte Browser-Specs werden wieder als echte Playwright-Specs aufgeloest
- Ansatz: Build- und Guard-Gates separat pruefen (`npm run architecture:report`, `npm run build`)
- Ergebnis: PASS
- Ansatz: Round-State-Smoke separat pruefen (`npm run smoke:roundstate`)
- Ergebnis: PASS
- Ansatz: lokaler Vite-Repro ausserhalb von Playwright
- Ergebnis: Port lauscht, aber `/` liefert in diesem Lauf ebenfalls 0 Bytes bis zum Timeout

## Evidence

- Logs:
  - `scripts/run-playwright-smoke.mjs` zuvor: `Error: spawn EINVAL`
  - isolierter Core-Smoke: `Test timeout of 60000ms exceeded`
  - `loadGame failed after 2 attempts: page.goto: net::ERR_ABORTED; maybe frame was detached?`
  - Vite-Repro analog V65: `curl.exe --max-time 10 http://127.0.0.1:5389/` -> `0 bytes received`
- Screenshots/Artefakte:
  - `test-results/v74-runtime-facade-spec/playwright-startup-diagnostics.json`
  - `test-results/v74-core-load/.last-run.json`
  - `test-results/v74-core-load-trace/core-Core-Smoke-loads-the--7b4d5-out-uncaught-startup-errors-chromium/trace.zip`
  - `test-results/v74-core-load-trace/core-Core-Smoke-loads-the--7b4d5-out-uncaught-startup-errors-chromium-retry1/trace.zip`
- Relevante Commits:
  - historischer Parser-Fix: `f25a4db`
  - aktuelle Harness-Fixes werden nach Abschluss dieses Tasks commit-referenziert

## Aktueller Stand

- Produkt-Code fuer V74 ist auf Guard-/Build-/Node-Contract-/RoundState-Smoke-Ebene verifiziert
- Die offensichtlichen Windows-/Discovery-Harnessfehler (`spawn EINVAL`, falsche `node:test`-Discovery, unpassende Dateifilter) sind behoben
- Offener Restblocker bleibt die Browser-Verifikation selbst:
  - mit globalem Playwright-Setup haengt der Warmup-Pfad weiter
  - ohne globales Setup (`PW_PREWARM=0`) haengt in diesem Lauf bereits der lokale Dev-Server-HTTP-Pfad auf `127.0.0.1:<port>` ohne HTTP-Body/Commit

## Naechster Schritt

- den nicht antwortenden lokalen Vite-Dev-Server-HTTP-Pfad gegen den bereits dokumentierten V65-Blocker abgleichen (`/`, `/@vite/client`, Editor-Route)
- danach `tests/playwright.global-setup.js` nur noch fuer den verbleibenden Prewarm-Anteil untersuchen, nicht mehr fuer die inzwischen behobenen Launcher-/Discovery-Probleme
- anschliessend `tests/runtime-facade.spec.js`, `tests/core.spec.js` und die V74-relevanten `T20ae2`-/`T20aj4a`-Reruns in sauberem Prozesszustand erneut laufen lassen
