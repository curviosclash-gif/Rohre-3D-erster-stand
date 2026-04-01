# Fehlerbericht: Build-Blocker bei Vehicle-Manager-Entfernung

## Aufgabe/Kontext

- Task: aktuellen Vehicle Manager aus dem Arcade-Menue entfernen
- Ziel: das bestehende Vehicle-Manager-Panel komplett aus der Match-Vorbereitung ausblenden, damit spaeter ein neues Konzept eingebaut werden kann
- Datum: 2026-04-01

## Fehlerbild

- Beobachtung: `npm run build` bricht waehrend der Pflicht-Verifikation ab
- Erwartetes Verhalten: Build/Gates laufen nach der UI-Entfernung erfolgreich durch
- Tatsaechliches Verhalten:
  - `prebuild` startet `npm run architecture:guard`
  - `check-eslint-touched-strict` failt an einer bereits vorhandenen Fremdaenderung ausserhalb des Scopes

## Reproduktion

1. Arcade-UI-Aenderung in `src/ui/arcade/ArcadeMenuSurface.js` umsetzen
2. `npm run build` ausfuehren
3. Build bricht in `check:eslint:touched-strict` mit einem Baseline-Limit fuer `src/core/MediaRecorderSystem.js` ab

## Betroffene Dateien/Komponenten

- `src/ui/arcade/ArcadeMenuSurface.js`
- `src/core/MediaRecorderSystem.js`
- `scripts/check-eslint-touched-strict.mjs` (Gate-Ausfuehrung)

## Bereits getestete Ansaetze

- Ansatz: Pflicht-Gates `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` ausfuehren
- Ergebnis: PASS
- Ansatz: Vollstaendigen Buildlauf ausfuehren
- Ergebnis: FAIL ausserhalb des geaenderten Arcade-Scopes

## Evidence

- Logs:
  - `ESLint touched-file strict mode failed.`
  - `src/core/MediaRecorderSystem.js: 1345 lines exceeds touched baseline 1329 + budget 8 (legacy 1225)`
- Screenshots/Artefakte:
  - keine separaten Artefakte erzeugt
- Relevante Commits:
  - wird im Task-Commit referenziert

## Aktueller Stand

- Status: Vehicle-Manager-Einhaengung erfolgreich entfernt; Voll-Build weiter blockiert
- Root-Cause-Stand: Build-Fehler wird durch vorhandene, fachfremde Worktree-Aenderungen in `src/core/MediaRecorderSystem.js` verursacht, nicht durch die Arcade-Menue-Aenderung

## Naechster Schritt

- Separaten Fix- oder Bereinigungs-Task fuer den `MediaRecorderSystem`-Touched-Strict-Blocker durchfuehren und danach `npm run build` erneut laufen lassen
