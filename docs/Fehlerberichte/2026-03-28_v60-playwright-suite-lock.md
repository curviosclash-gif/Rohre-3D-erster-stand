# Fehlerbericht: V60 Playwright Suite Lock Blockiert Finale Browser-Verifikation

## Aufgabe/Kontext

- Task: `60.4.3` aus `docs/Umsetzungsplan.md` umsetzen und verifizieren
- Ziel: Presence-/Heartbeat-Logik der `MenuMultiplayerBridge` gegen Browser-Timer-Throttling haerten und Host-Promotion nach reinem Stale-Pruning verhindern
- Datum: 2026-03-28

## Fehlerbild

- Beobachtung: Mehrere gezielte Playwright-Reruns fuer `T41c4`/`T41c5` blockieren im global setup an `.playwright-suite.lock`
- Erwartetes Verhalten: isolierte `tests/core.spec.js`-Runs koennen nacheinander starten
- Tatsaechliches Verhalten: fremde laufende Suite-Runs halten den Repo-weiten Lock ueber mehrere Minuten; neue Runs brechen mit Timeout im Setup ab

## Reproduktion

1. `TEST_PORT=5247 PW_RUN_TAG=v60-t41c4-r4 PW_OUTPUT_DIR=test-results/v60-t41c4-r4 PW_WORKERS=1 npx playwright test tests/core.spec.js --grep T41c4 --timeout=240000`
2. Playwright global setup wartet auf `.playwright-suite.lock`
3. Nach `waitMs=300000` bricht der Run mit Lock-Timeout ab; Diagnostics zeigen einen fremden `runTag`

## Betroffene Dateien/Komponenten

- `tests/playwright.global-setup.js`
- `.playwright-suite.lock`
- `test-results/v60-t41c4-r4/playwright-startup-diagnostics.json`
- `test-results/v60-t41c5-r2/playwright-startup-diagnostics.json`

## Bereits getestete Ansaetze

- Ansatz: isolierte Runs mit eigenem `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`
- Ergebnis: korrekt isolierte Artefaktpfade, aber weiterhin Blockade am globalen Suite-Lock
- Ansatz: verwaiste lokale Lock-Dateien entfernen, nachdem der eigene Prozess beendet war
- Ergebnis: eigene stale locks entfernt; kurz darauf erneut durch fremden Run blockiert
- Ansatz: Semantik zusaetzlich per Node-Smoke ausserhalb von Playwright pruefen
- Ergebnis: `node --input-type=module` stale smoke PASS; Browser-Rerun bleibt trotzdem offen

## Evidence

- Logs: Playwright-Fehler `global setup failed ... Timed out waiting for lock`
- Screenshots/Artefakte:
  - `test-results/v60-t41c4/playwright-startup-diagnostics.json`
  - `test-results/v60-t41c5/playwright-startup-diagnostics.json`
  - `test-results/v60-t41c5-r2/playwright-startup-diagnostics.json`
  - `test-results/v60-t41c4-r4/playwright-startup-diagnostics.json`
- Relevante Commits: noch offen, solange finale Verifikation nicht abgeschlossen ist

## Aktueller Stand

- Status: Code fuer `60.4.3` implementiert; `npm run build` PASS; `T41c4` PASS; Node-Smoke fuer Stale-/Rehost-Semantik PASS
- Root-Cause-Stand: kein Produktfehler in der Bridge festgestellt; Blocker ist ein externer Repo-weiten Playwright-Lock durch parallele Suite-Laeufe

## Naechster Schritt

- Nach Freigabe des `.playwright-suite.lock` gezielt `T41c5` und idealerweise `T41c4` erneut laufen lassen
- Anschliessend `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`
- Erst danach `60.4.3` im Plan auf `[x]` setzen oder direkt `60.4.4` anhaengen
