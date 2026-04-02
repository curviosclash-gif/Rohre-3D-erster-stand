# Fehlerbericht: BT80C plan/docs-Checks durch fremde V81/V82-Plan-Dateien blockiert

## Aufgabe/Kontext

- Task: `BT80C` im Scope `80.7` bis `80.9` repo-basiert umsetzen und `80.99` nur bei ehrlicher Abschlusslage schliessen
- Ziel: Lernalgorithmus-/Ablations-/Promotion-Haertung fertigziehen, Regressionstests fahren und die Pflicht-Verifikation fuer den Blockabschluss ausfuehren
- Datum: 2026-04-02

## Fehlerbild

- Beobachtung: `npm run plan:check` und dadurch auch `npm run docs:check` failen ausserhalb des BT80C-Scopes
- Erwartetes Verhalten: Pflicht-Checks laufen nach den BT80C-Aenderungen gruen durch
- Tatsaechliches Verhalten:
  - `npm run plan:check` bricht an user-owned Eintraegen in `docs/Umsetzungsplan.md` und den dazugehoerigen `docs/plaene/neu/`-Dateien ab
  - `npm run docs:check` failt anschliessend nur deshalb, weil es intern erneut `npm run plan:check` startet

## Reproduktion

1. BT80C-Training-/Gate-/Trainer- und Dokumentationsaenderungen umsetzen
2. `npm run plan:check` ausfuehren
3. `npm run docs:check` ausfuehren

## Betroffene Dateien/Komponenten

- `docs/Umsetzungsplan.md`
- `docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md`
- `docs/plaene/neu/Feature_Arcade_Parcours_Progression_V82.md`
- `scripts/validate-umsetzungsplan.mjs`
- `npm run docs:check`

## Bereits getestete Ansaetze

- Ansatz: `node --test tests/training-benchmark-artifacts.test.mjs`
- Ergebnis: PASS
- Ansatz: `node --test tests/training-gate.test.mjs`
- Ergebnis: PASS nach seriellem Re-Run; erster Parallelversuch kollidierte nur auf dem Test-Lock `tmp/test-latest-index.lock`
- Ansatz: `node --test tests/training-e2e.test.mjs`
- Ergebnis: PASS
- Ansatz: `node --test tests/trainer-v36-algorithm-profile.test.mjs`
- Ergebnis: PASS
- Ansatz: `node --test tests/training-automation-core.contract.test.mjs`
- Ergebnis: PASS
- Ansatz: `npm run docs:sync`
- Ergebnis: PASS
- Ansatz: `npm run build`
- Ergebnis: PASS
- Ansatz: `npm run plan:check`
- Ergebnis: FAIL ausserhalb des BT80C-Scopes
- Ansatz: `npm run docs:check`
- Ergebnis: FAIL ausserhalb des BT80C-Scopes

## Evidence

- Logs:
  - `docs/Umsetzungsplan.md:34 plan_file fuer V82 muss unter docs/plaene/aktiv/ liegen.`
  - `docs/plaene/neu/Feature_Arcade_Parcours_Progression_V82.md:1 Dateiname "Feature_Arcade_Parcours_Progression_V82.md" passt nicht zur Block-ID "V82".`
  - `docs/Umsetzungsplan.md:35 plan_file fuer V81 muss unter docs/plaene/aktiv/ liegen.`
  - `docs/plaene/neu/Feature_Developer_Tuning_Console_V81.md:1 Dateiname "Feature_Developer_Tuning_Console_V81.md" passt nicht zur Block-ID "V81".`
- Screenshots/Artefakte:
  - keine separaten Artefakte erzeugt
- Relevante Commits:
  - `37bfeb3` `feat: harden bt80c challenger promotion and algorithm profiles`

## Aktueller Stand

- Status: BT80C-Codepfade und Build sind gruen; plan/docs-Abschlusschecks bleiben durch user-owned Fremdplaene blockiert
- Root-Cause-Stand: Der Blocker liegt an nicht von BT80C bearbeitbaren V81/V82-Planreferenzen und nicht an den Training-/Trainer-/Gate-Aenderungen dieses Tasks

## Naechster Schritt

- V81/V82-Planreferenzen im user-owned Planbestand bereinigen und danach `npm run plan:check` sowie `npm run docs:check` erneut ausfuehren
