# Fehlerbericht: Main-Push durch DownloadService-Max-Lines blockiert

- Datum: 2026-05-16
- Block: repo-git/push
- Phase: nach scoped Commit-Sicherung
- Status: offen

## Aufgabe/Kontext

Der User bat darum, alle offenen Aenderungen sinnvoll scoped zu committen und danach, wenn gefahrlos moeglich, auf `main` zu pushen.

Die offenen Aenderungen wurden in drei scoped Commits gesichert:

- `a126e7ea` `chore: add agent context gate - clarify review scopes`
- `01b288eb` `docs: intake plan blocks - sync graph scope`
- `2e2a0de5` `docs: add agent memory orchestration draft`

Vor dem Push wurde regelkonform ein lokaler Snapshot-Tag erstellt: `snapshot/main-20260516-150805-2e2a0de`.

## Fehlerbild

`git push origin main` wird lokal durch den `pre-push`-Hook blockiert. Plan- und Docs-Gates laufen gruen, danach scheitert `npm run lint:architecture` an einem bestehenden `max-lines`-Fehler.

Erwartetes Verhalten:

- Push laeuft nach gruenen lokalen Gates durch, solange `origin/main` nicht voraus ist.

Tatsaechliches Verhalten:

- Push bricht vor der Uebertragung ab.
- `main` bleibt lokal `ahead 99`; Remote ist nicht aktualisiert.

## Reproduktion

1. Auf `main` im Repo `C:\Users\gunda\Desktop\CurviosCLash` stehen.
2. `git push origin main` ausfuehren.
3. Der lokale `pre-push`-Hook laeuft ueber `guard:main`, `plan:check`, `docs:check` und `lint:architecture`.
4. `lint:architecture` meldet den `max-lines`-Fehler in `src/core/recording/DownloadService.js`.

## Betroffene Dateien/Komponenten

- `src/core/recording/DownloadService.js`
- `.husky/pre-push`
- `npm run lint:architecture`

## Bereits getestete Ansaetze

- `git fetch --prune`: Remote-Pruefung erfolgreich.
- `git rev-list --left-right --count origin/main...HEAD`: Ergebnis `0 99`, also kein Remote-Vorsprung und keine Divergenz.
- `npm run gates:pre-commit`: PASS vor den Commits.
- `npm run snapshot:tag`: Snapshot-Tag erfolgreich erstellt.
- Kein Hook-Bypass und kein Force-Push ausgefuehrt.

## Evidence

- Push-Blocker: `src/core/recording/DownloadService.js` hat 503 Zeilen, ESLint-Limit ist 500.
- `lint:architecture` meldet: `File has too many lines (503). Maximum allowed is 500`.
- Zusaetzliche Warnungen: 29 `innerHTML`-Warnungen, aber der Push-Blocker ist der einzelne `max-lines`-Error.
- Remote-Pruefung nach Push-Abbruch: `origin/main` zeigt weiter auf `cf1381504be4faab2f8f38049d2ec991563ac160`; lokaler `HEAD` ist `2e2a0de5d27949d81837913399a2c1a2bd21c48f`.

## Aktueller Stand

- Status: offen.
- Worktree war nach den scoped Commits sauber.
- Push wurde nicht durchgefuehrt, weil der lokale Hook rot ist.
- Root-Cause-Stand: `DownloadService.js` ueberschreitet das Architektur-Lint-Limit knapp um 3 Zeilen. Der Fehler liegt ausserhalb der gerade committeden Plan-/Governance-Aenderungen.

## Naechster Schritt

- Kleinen, separaten Scope fuer `src/core/recording/DownloadService.js` freigeben oder planen.
- Ziel: Datei unter das 500-Zeilen-Limit bringen, ohne Recording-Verhalten zu aendern.
- Danach `npm run lint:architecture` und anschliessend `git push origin main` erneut ausfuehren.
