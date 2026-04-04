# Fehlerbericht: V84 plan/docs-Checks durch bestehende V74/V83-plan_file-Validierung blockiert

## Aufgabe/Kontext

- Task: `V84` Subphase `84.4.1` umsetzen
- Ziel: UI- und HUD-Lesewege auf stabile Runtime-Projektionen ziehen, danach die Pflicht-Gates ausfuehren
- Datum: 2026-04-04

## Fehlerbild

- Beobachtung: `npm run plan:check` und dadurch auch `npm run docs:check` failen ausserhalb des V84-Scopes
- Erwartetes Verhalten: Pflicht-Checks laufen nach den V84.4.1-Aenderungen gruen durch
- Tatsaechliches Verhalten:
  - `npm run plan:check` bricht an bestehenden `plan_file`-Validatorfehlern fuer `V74` und `V83` in `docs/Umsetzungsplan.md` ab
  - `npm run docs:check` failt anschliessend nur deshalb, weil es intern erneut `npm run plan:check` startet

## Reproduktion

1. V84.4.1 Runtime-Projektionsaenderungen im UI-/HUD-Scope umsetzen
2. `npm run plan:check` ausfuehren
3. `npm run docs:check` ausfuehren

## Betroffene Dateien/Komponenten

- `docs/Umsetzungsplan.md`
- `scripts/validate-umsetzungsplan.mjs`
- `npm run docs:check`

## Bereits getestete Ansaetze

- Ansatz: `npm run build`
- Ergebnis: PASS
- Ansatz: `npm run docs:sync`
- Ergebnis: PASS; `docs/prozess/Dokumentationsstatus.md` blieb unveraendert
- Ansatz: `npm run plan:check`
- Ergebnis: FAIL ausserhalb des V84-Scopes
- Ansatz: `npm run docs:check`
- Ergebnis: FAIL ausserhalb des V84-Scopes, weil intern erneut `npm run plan:check` laeuft

## Evidence

- Logs:
  - `docs/Umsetzungsplan.md:29 plan_file fuer V74 muss unter docs/plaene/aktiv/ liegen.`
  - `docs/Umsetzungsplan.md:30 plan_file fuer V83 muss unter docs/plaene/aktiv/ liegen.`
- Screenshots/Artefakte:
  - keine separaten Artefakte erzeugt
- Relevante Commits:
  - noch offen im aktuellen V84.4.1-Task

## Aktueller Stand

- Status: V84.4.1-Codepfade und Build sind gruen; plan/docs-Abschlusschecks bleiben durch bestehende Master-Index-Validierung blockiert
- Root-Cause-Stand: Der Blocker liegt an bestehenden `docs/Umsetzungsplan.md`-Validatorfehlern fuer `V74` und `V83`, nicht an den Runtime-Projektionsaenderungen dieses Tasks

## Naechster Schritt

- User-owned Master-Index-Referenzen fuer `V74` und `V83` bereinigen und danach `npm run plan:check` sowie `npm run docs:check` erneut ausfuehren
