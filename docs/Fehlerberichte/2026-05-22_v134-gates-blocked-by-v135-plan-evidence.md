# V134 Gate-Blocker: fremder V135-Planabschluss ohne Evidence

Datum: 2026-05-22
Kontext: V134 Plan-Map-Intake-Lanes und Kandidaten-Trennung
Status: blockerfest dokumentiert, nicht im V134-Scope behoben

## Fehlerbild

Nach Abschluss der V134-Aenderungen schlagen aktuelle Reruns von
`npm run plan:check`, `npm run docs:check` und damit `npm run gates:pre-commit`
fehl, weil `docs/plaene/aktiv/V135.md` ungestagte Abschlussmarkierungen ohne
Validator-Evidence-Format enthaelt.

Der V135-Diff liegt ausserhalb des V134-Scope und umfasst auch produktive
Mobile-Classic-/UI-Dateien. Diese Aenderungen wurden fuer V134 nicht geaendert,
nicht gestaged und nicht in den V134-Commit uebernommen.

## Reproduktion

```bash
npm run plan:check
```

Ergebnis: `Master plan validation failed` mit Meldungen wie:

```text
docs/plaene/aktiv/V135.md:142 Abgeschlossener Punkt ohne Evidence-Format
docs/plaene/aktiv/V135.md:245 Abgeschlossener Punkt ohne Evidence-Format
```

## V134-Signale

- `node --test tests/plan-map-export.contract.test.mjs` -> PASS.
- `node --test tests/map-tools-android.contract.test.mjs tests/map-tools-electron.contract.test.mjs` -> PASS.
- `node --check tools/plan-map/viewer.js` -> PASS.
- `npm run plan:context:check` -> PASS.
- `npm run check:plan-evidence-claims` -> PASS mit bekannten Warnungen fuer V96/V106/V113.
- `npm run plan:check` und `npm run docs:check` waren fuer V134 gruen, bevor der fremde V135-Diff sichtbar wurde.

## Naechster Schritt

V135 muss separat entschieden werden: entweder Evidence-Format fuer die dortigen
abgeschlossenen Punkte nachziehen oder die V135-Abschlussmarkierungen in ihrem
eigenen Scope zurueckstellen. V134 sollte diese fremden Mobile-/Plan-Aenderungen
nicht absorbieren.
