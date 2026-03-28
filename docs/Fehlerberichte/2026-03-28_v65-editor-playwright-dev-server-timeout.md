# Fehlerbericht: V65 Editor-Playwright Blockiert Durch Lokalen Dev-Server Timeout

## Aufgabe/Kontext

- Task: V65 Map-Editor UX Slice (`65.1.x`, `65.2.x`, `65.4.1`) umsetzen und browserseitig verifizieren
- Ziel: Bottom-Dock mit Build-Katalog, persistenter Auswahl und Editor-UI-Tests fuer Kartenwahl und Platzierung
- Datum: 2026-03-28

## Fehlerbild

- Beobachtung: Browser-Verifikation fuer `tests/editor-map-ui.spec.js` haengt bereits bei `page.goto('/editor/map-editor-3d.html', { waitUntil: 'domcontentloaded' })`
- Erwartetes Verhalten: Vite-Dev-Server liefert Editor-HTML und Module schnell genug fuer gezielte Playwright-Specs
- Tatsaechliches Verhalten:
  - Standard-Playwright-Konfiguration blockiert zusaetzlich am repo-weiten `.playwright-suite.lock`, solange ein fremder `test:core`-Run aktiv ist
  - Lock-freie Lokal-Konfiguration (`tmp.playwright.local.config.mjs`) startet zwar Vite, aber HTTP-Requests auf `127.0.0.1:<port>` liefern in diesem Lauf 0 Bytes bis zum Timeout

## Reproduktion

1. `TEST_PORT=5291 npx playwright test --config tmp.playwright.local.config.mjs tests/editor-map-ui.spec.js`
2. Playwright startet den lokalen Vite-Server und beginnt den Editor-Run
3. `page.goto('/editor/map-editor-3d.html')` timed out nach 45s, obwohl `npm run build` fuer denselben Code gruen ist

## Betroffene Dateien/Komponenten

- `tests/editor-map-ui.spec.js`
- `tmp.playwright.local.config.mjs`
- `tests/playwright.global-setup.js`
- `.playwright-suite.lock`
- `test-results/v65-editor-ui/playwright-startup-diagnostics.json`

## Bereits getestete Ansaetze

- Ansatz: Standard-Playwright-Lauf mit eigenem `TEST_PORT`/`PW_RUN_TAG`/`PW_OUTPUT_DIR`
- Ergebnis: global setup wartet auf fremden `.playwright-suite.lock` und blockiert
- Ansatz: Lock-freier Lauf ueber `tmp.playwright.local.config.mjs`
- Ergebnis: Suite startet, aber `page.goto()` auf die Editor-Route laeuft in Timeout
- Ansatz: Vite-Server manuell auf separatem Port starten und per `curl` pruefen
- Ergebnis: Port lauscht laut `netstat`, aber Requests auf `/`, `/editor/map-editor-3d.html` und `/@vite/client` liefern in diesem Lauf ebenfalls 0 Bytes bis zum Timeout
- Ansatz: statische Verifikation via `npm run build` und Node-Smoke fuer Katalog-/Dock-State
- Ergebnis: `npm run build` PASS; `node --input-type=module` Smoke fuer `EditorBuildCatalog.js` + `EditorToolDockState.js` PASS

## Evidence

- Logs:
  - Playwright-Fehler: `page.goto: Timeout 45000ms exceeded` in `tests/editor-map-ui.spec.js`
  - `curl.exe --max-time 15 http://127.0.0.1:5293/@vite/client` -> `0 bytes received`
- Screenshots/Artefakte:
  - `test-results/v65-editor-ui/playwright-startup-diagnostics.json`
  - `tmp-v65-vite.out.log`
- Relevante Commits:
  - offen bis nach finaler Verifikation

## Aktueller Stand

- Status: Bottom-Dock, Katalog, persistenter Dock-State, Runtime-Hooks und Editor-Spec sind implementiert; `npm run build` PASS; Node-Smoke PASS
- Root-Cause-Stand: kein nachgewiesener Syntax-/Build-Fehler im Editor-Slice; Blocker sitzt aktuell in der lokalen Browser-Verifikation (fremder Playwright-Lock plus nicht antwortender Dev-Server-HTTP-Pfad in diesem Lauf)

## Naechster Schritt

- Nach Ende des fremden `test:core`-Runs `.playwright-suite.lock` erneut pruefen
- Editor-Spec erneut via `tmp.playwright.local.config.mjs` oder stabilem vorhandenen Dev-Server laufen lassen
- Danach `npm run test:core` und visuelle Smoke-Pruefung fuer das Dock nachziehen
