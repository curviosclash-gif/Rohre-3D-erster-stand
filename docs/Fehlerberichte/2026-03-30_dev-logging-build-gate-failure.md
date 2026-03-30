# Fehlerbericht: Build-Gate Fehlgeschlagen Nach Dev-Logging-Umstellung

## Aufgabe/Kontext

- Task: `npm run dev` standardmaessig auf geloggten Dev-Start umstellen
- Ziel: Dev-Logs automatisch aktivieren, ohne manuellen Zusatzbefehl
- Datum: 2026-03-30

## Fehlerbild

- Beobachtung: `npm run build` bricht im Architektur-Gate ab
- Erwartetes Verhalten: Build/Gates laufen grün nach der Dev-Script-Umstellung
- Tatsaechliches Verhalten:
  - Architektur-Guard meldet bestehende Boundary-Verletzungen `ui -> core`
  - Fehler liegt ausserhalb des geaenderten Scopes (`package.json`, `README.md`)

## Reproduktion

1. `npm run build`
2. Prebuild startet `npm run architecture:guard`
3. `check:architecture:boundaries` failt mit `ui -> core import`

## Betroffene Dateien/Komponenten

- `src/ui/menu/MenuGameplayBindings.js`
- `src/ui/UIManager.js`
- `src/core/config/SettingsRuntimeContract.js`
- `scripts/check-architecture-boundaries.mjs` (Gate-Ausfuehrung)

## Bereits getestete Ansaetze

- Ansatz: Pflicht-Gates ohne Build ausfuehren (`plan:check`, `docs:sync`, `docs:check`)
- Ergebnis: alle drei Kommandos PASS
- Ansatz: Vollstaendiger Buildlauf
- Ergebnis: FAIL an vorhandenem Architektur-Gate, nicht am neuen Dev-Logging

## Evidence

- Logs:
  - `Architecture boundary guard failed.`
  - `ui -> core import @ src/ui/menu/MenuGameplayBindings.js:2`
  - `ui -> core import @ src/ui/UIManager.js:9`
- Screenshots/Artefakte:
  - keine separaten Artefakte erzeugt
- Relevante Commits:
  - wird im Task-Commit referenziert

## Aktueller Stand

- Status: Dev-Logging-Umstellung funktional umgesetzt; Build-Gate blockiert durch vorhandene, fachfremde Boundary-Verletzungen
- Root-Cause-Stand: nicht durch diese Aenderung verursacht, sondern bestehende Architekturabweichung in `src/ui/**`

## Naechster Schritt

- Separaten Fix-Task fuer Boundary-Verletzungen anlegen und `ui -> core` Imports aufloesen
