# Playwright Stability Runbook (V55)

Stand: 2026-03-25

## Ziel

- `npm run test:fast` reproduzierbar ohne `global-setup` Timeout laufen lassen.
- Flake-Rate je Laufserie sichtbar machen und Infrastruktur-Stoerungen frueh eskalieren.

## Wiederholungsprotokoll

1. Fuer jede Serie eindeutige Isolation setzen:
   - `TEST_PORT`
   - `PW_RUN_TAG`
   - `PW_OUTPUT_DIR`
2. Mindestens 3 aufeinanderfolgende Durchlaeufe von `npm run test:fast`.
3. Pro Lauf erfassen:
   - Exit-Code
   - `passed`, `failed`, `flaky`, `skipped`
   - Pfad zur Datei `playwright-startup-diagnostics.json`

## Flake-Rate

- `flakeRate = flaky / (passed + failed + flaky)`
- Gate fuer V55:
  - keine `global-setup` Timeouts in der Serie
  - `flakeRate <= 0.02` (2 Prozent) ueber die komplette Serie

## Abbruchkriterien

- Sofortiger Abbruch der Serie bei:
  - 2 aufeinanderfolgenden `global-setup` Timeouts
  - 1 wiederholbaren `global-setup` Timeout trotz neuem `TEST_PORT`
  - dauerhaftem Webserver-Startfehler (`strictPort`/Bind/Crash) in 2 Runs

## Eskalationspfad (Infra vs Code)

1. `playwright-startup-diagnostics.json` plus `tmp-vite-*.log` auswerten.
2. Wenn Probe/Prewarm auf leere oder fehlerhafte HTTP-Antworten zeigt:
   - als Infrastrukturproblem markieren
   - Testserie stoppen und Port/Lock/Server-Prozess bereinigen
3. Wenn Probe stabil ist, aber einzelne Specs flaken:
   - als Test-/Code-Flake markieren
   - betroffene Spec isoliert wiederholen und fixen
4. Evidence im Umsetzungsplan hinterlegen (Command + Ergebnisdatei/Commit).
