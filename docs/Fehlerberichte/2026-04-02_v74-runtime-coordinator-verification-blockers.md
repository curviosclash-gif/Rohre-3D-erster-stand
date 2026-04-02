# Fehlerbericht: V74 Runtime-Coordinator Verifikation durch Fremdaenderungen blockiert

## Aufgabe/Kontext

- Task: `74.4.2` aus `V74 Architektur-Runtime-Entkopplung (Refresh)` umsetzen
- Ziel: `main.js` und `GameRuntimePorts` ausduennen und Lifecycle-/Startup-Flows in einen dedizierten Coordinator schneiden
- Datum: 2026-04-02

## Fehlerbild

- Beobachtung: Die eigentliche V74-Refaktorierung laesst sich lokal verifizieren, aber die repoweiten Pflicht-Gates schlagen an bereits vorhandenen fachfremden Aenderungen fehl
- Erwartetes Verhalten: `npm run plan:check`, `npm run docs:check` und `npm run build` laufen nach der V74-Aenderung erfolgreich durch
- Tatsaechliches Verhalten:
  - `npm run plan:check` failt an einem bereits vorhandenen `V81`-Planstand
  - `npm run docs:check` failt nur deshalb, weil es intern erneut `npm run plan:check` ausfuehrt
  - `npm run build` failt im `prebuild`-Schritt an einer fremd geaenderten Training-Datei ausserhalb des V74-Scopes

## Reproduktion

1. V74-Refaktorierung fuer `74.4.2` in `src/core/**` und `src/shared/runtime/**` umsetzen
2. `npm run plan:check` ausfuehren
3. `npm run docs:check` ausfuehren
4. `npm run build` ausfuehren

## Betroffene Dateien/Komponenten

- `docs/Umsetzungsplan.md`
- `docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md`
- `src/state/training/TrainingBenchmarkContract.js`
- `npm run plan:check`
- `npm run docs:check`
- `npm run build`

## Bereits getestete Ansaetze

- Ansatz: `npm run check:architecture:boundaries`
- Ergebnis: PASS
- Ansatz: `npm run check:architecture:metrics`
- Ergebnis: PASS
- Ansatz: `npm exec eslint -- src/core/main.js src/shared/runtime/GameRuntimePorts.js src/core/runtime/GameRuntimeCoordinator.js`
- Ergebnis: PASS
- Ansatz: `npm exec vite build`
- Ergebnis: PASS
- Ansatz: `npm run plan:check`
- Ergebnis: FAIL an vorhandenem `V81`-Plan-/Dateinamenkonflikt
- Ansatz: `npm run docs:check`
- Ergebnis: FAIL nur wegen nachgelagertem `plan:check`
- Ansatz: `npm run build`
- Ergebnis: FAIL im `prebuild` an `src/state/training/TrainingBenchmarkContract.js` (`max-lines`)

## Evidence

- Logs:
  - `docs/Umsetzungsplan.md:34 plan_file fuer V81 muss unter docs/plaene/aktiv/ liegen.`
  - `docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md:1 Dateiname "Feature_Developer_Tuning_Console_V81.md" passt nicht zur Block-ID "V81".`
  - `src/state/training/TrainingBenchmarkContract.js 528:1 error File has too many lines (535). Maximum allowed is 500`
- Screenshots/Artefakte:
  - kein separates Artefakt; Vite-Kompilation lief lokal mit `npm exec vite build` erfolgreich durch
- Relevante Commits:
  - wird im V74-Task-Commit referenziert

## Aktueller Stand

- Status: V74-Implementierung fuer `74.4.2` ist umgesetzt; repoweite Plan-/Build-Gates bleiben fachfremd blockiert
- Root-Cause-Stand: Die Blocker stammen aus bereits vorhandenen Aenderungen in Plan-/Training-Dateien ausserhalb des V74-Scope, nicht aus dem neuen Runtime-Coordinator-Schnitt

## Naechster Schritt

- `V81`-Planinkonsistenz und den Training-`max-lines`-Verstoss separat bereinigen; danach `npm run plan:check`, `npm run docs:check` und `npm run build` erneut ausfuehren
