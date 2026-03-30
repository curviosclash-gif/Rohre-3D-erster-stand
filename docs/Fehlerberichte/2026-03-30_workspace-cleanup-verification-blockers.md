# Fehlerbericht: Workspace-Cleanup Verifikation Blockiert

## Aufgabe/Kontext

- Task: konservativen Workspace-Cleanup nach erneuter Planpruefung sicher umsetzen
- Ziel: nur eindeutig unkritische Artefakte bereinigen, ohne Runtime, Editor, Recording oder laufende User-Runs zu stoeren
- Datum: 2026-03-30

## Fehlerbild

- Beobachtung: der Cleanup selbst lief sicher, aber die Vollverifikation konnte nicht komplett abgeschlossen werden
- Erwartetes Verhalten: `npm run build` und optional `npm run test:core` laufen als Safety-Gates gruen
- Tatsaechliches Verhalten:
  - `npm run build` scheitert vor Vite im bestehenden Architektur-Gate
  - ein aktiver fremder Playwright-Lock blockiert eine saubere, stoerungsfreie `test:core`-Ausfuehrung waehrend des Tasks

## Reproduktion

1. `npm run cleanup:workspace`
2. `npm run cleanup:workspace:apply`
3. `npm run build`
4. Optionaler Lock-Check: `Get-Content .playwright-suite.lock`

## Betroffene Dateien/Komponenten

- `scripts/workspace-cleanup.mjs`
- `package.json`
- `README.md`
- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/UIManager.js`
- `src/core/config/SettingsRuntimeContract.js`
- `.playwright-suite.lock`

## Bereits getestete Ansaetze

- Ansatz: Cleanup nur auf konservativen Low-Risk-Scope begrenzen und aktive Artefakte per Lock/Tracking-Pruefung schuetzen
- Ergebnis: PASS, der Runner loescht keine versionierten oder aktiven Playwright-Ziele
- Ansatz: Root-Guard und Doku-Gates separat pruefen
- Ergebnis: `npm run check:root:runtime`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` PASS
- Ansatz: Vollstaendiger Build
- Ergebnis: FAIL im vorhandenen Architektur-Gate `ui -> core`
- Ansatz: `test:core` trotz aktivem Lock starten
- Ergebnis: bewusst nicht ausgefuehrt, um den laufenden User-Playwright-Run nicht zu beeinflussen

## Evidence

- Logs:
  - `Architecture boundary guard failed.`
  - `ui -> core import @ src/ui/menu/MenuGameplayBindings.js:2`
  - `ui -> core import @ src/ui/UIManager.js:9`
  - `.playwright-suite.lock` zeigte aktiven Run `runTag=v69-99-t10f-only-r2`, `outputDir=test-results/v69-99-t10f-only-r2`
- Screenshots/Artefakte:
  - `tmp/workspace-cleanup-report.json`
- Relevante Commits:
  - wird im Task-Commit referenziert

## Aktueller Stand

- Status: konservativer Cleanup umgesetzt; Vollverifikation teilweise blockiert
- Root-Cause-Stand:
  - Build-Blocker ist eine bereits vorhandene Architekturabweichung ausserhalb des Cleanup-Scopes
  - `test:core` wurde aus Ruecksicht auf den aktiven User-Run nicht parallel erzwungen

## Naechster Schritt

- Separaten Fix fuer die bestehenden `ui -> core`-Boundary-Verletzungen anlegen
- `test:core` nach Ende des aktiven Playwright-Locks erneut als Abschlussgate ausfuehren
