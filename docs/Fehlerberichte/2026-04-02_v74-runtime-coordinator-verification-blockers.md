# Fehlerbericht: V74 Verifikation durch fremde Planinkonsistenzen blockiert

## Aufgabe/Kontext

- Task: `74.4.3` aus `V74 Architektur-Runtime-Entkopplung (Refresh)` umsetzen
- Ziel: `GameRuntimeFacade` entlang kleinerer Handler fuer Menu-Aktionen, Settings/Multiplayer-State und Session-/Finalize-Flows entlasten
- Datum: 2026-04-02

## Fehlerbild

- Beobachtung: Die eigentliche V74-Refaktorierung ist lokal verifiziert, aber die repoweiten Plan-/Doku-Gates bleiben an bereits vorhandenen V81/V82-Planinkonsistenzen haengen
- Erwartetes Verhalten: `npm run plan:check` und `npm run docs:check` laufen nach Abschluss von `74.4.3` erfolgreich durch
- Tatsaechliches Verhalten:
  - `npm run plan:check` failt an bereits vorhandenen `V81`/`V82`-Eintraegen ausserhalb des V74-Scope
  - `npm run docs:check` failt nur deshalb, weil es intern erneut `npm run plan:check` ausfuehrt

## Reproduktion

1. V74-Refaktorierung fuer `74.4.3` in `src/core/**`, `src/core/runtime/**` und `docs/plaene/aktiv/V74.md` umsetzen
2. `npm run plan:check` ausfuehren
3. `npm run docs:check` ausfuehren

## Betroffene Dateien/Komponenten

- `docs/Umsetzungsplan.md`
- `docs/plaene/neu/Feature_Arcade_Parcours_Progression_V82.md`
- `docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md`
- `npm run plan:check`
- `npm run docs:check`

## Bereits getestete Ansaetze

- Ansatz: `npm exec eslint -- src/core/GameRuntimeFacade.js src/core/runtime/GameRuntimeMenuActionHandler.js src/core/runtime/GameRuntimeSettingsHandler.js src/core/runtime/GameRuntimeSessionHandler.js`
- Ergebnis: PASS
- Ansatz: `npm run docs:sync`
- Ergebnis: PASS
- Ansatz: `npm run build`
- Ergebnis: PASS
- Ansatz: `npm run plan:check`
- Ergebnis: FAIL an vorhandenem `V81`/`V82`-Plan-/Dateinamenkonflikt
- Ansatz: `npm run docs:check`
- Ergebnis: FAIL nur wegen nachgelagertem `plan:check`

## Evidence

- Logs:
  - `docs/Umsetzungsplan.md:34 plan_file fuer V82 muss unter docs/plaene/aktiv/ liegen.`
  - `docs/plaene/neu/Feature_Arcade_Parcours_Progression_V82.md:1 Dateiname "Feature_Arcade_Parcours_Progression_V82.md" passt nicht zur Block-ID "V82".`
  - `docs/Umsetzungsplan.md:35 plan_file fuer V81 muss unter docs/plaene/aktiv/ liegen.`
  - `docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md:1 Dateiname "Feature_Developer_Tuning_Console_V81.md" passt nicht zur Block-ID "V81".`
- Screenshots/Artefakte:
  - kein separates Artefakt; die lokalen Runtime-/Build-Gates liefen erfolgreich durch
- Relevante Commits:
  - wird im V74-Task-Commit referenziert

## Aktueller Stand

- Status: V74-Implementierung fuer `74.4.3` ist umgesetzt; `74.4` ist im Blockfile abgeschlossen; repoweite Plan-/Doku-Gates bleiben fachfremd blockiert
- Root-Cause-Stand: Die Blocker stammen aus bereits vorhandenen Plan-/Dateinameninkonsistenzen in `V81`/`V82`, nicht aus dem Runtime-Facade-Schnitt

## Naechster Schritt

- `V81`- und `V82`-Planinkonsistenzen bereinigen; danach `npm run plan:check` und `npm run docs:check` erneut ausfuehren
