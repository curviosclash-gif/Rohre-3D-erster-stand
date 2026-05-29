# V137 Abschluss durch Android-Update-Coverage-Drift blockiert

Datum: 2026-05-28
Status: geloest 2026-05-29; V137-Entscheidung bleibt `manual-only`

## Kontext

V137 137.99 Abschluss-Gate nach CodeGraph-Vergleich, MCP-Entscheidung und Go/No-Go. Der V137-Scope selbst aendert nur Plan-, Lock- und generierte Plan-Index-Dateien; keine Android-/Runtime-Dateien.

## Failure

`npm run graph:check` bricht im Coverage-Gate ab:

- `COVERAGE_GATE_FAILED`
- Rule `no-new-active-uncovered-files`
- neue uncovered Datei: `update_android_phone.bat`

## Reproduktion

```powershell
npm run graph:build
npm run graph:check
node scripts/query-knowledge-graph.mjs coverage-report --json
```

## Betroffene Dateien

V137-Scope:

- `docs/Umsetzungsplan.md`
- `docs/plaene/aktiv/V137.md`
- `docs/generated/plan-index.json`
- `docs/lock-status/codex.json`
- `docs/lock-status/_locks-registry.json`

Externer Coverage-Drift:

- `update_android_phone.bat`
- `scripts/update-android-phone.mjs`

## Attempted Fixes

- `npm run plan:check` -> PASS.
- `npm run plan:index:check` -> PASS.
- `npm run docs:check` -> PASS.
- `npm run graph:check` -> FAIL wegen `update_android_phone.bat`.
- Kein Mapping-/Klassifikationsfix fuer `update_android_phone.bat`, weil das ein Android-/Repo-Ops-Scope ausserhalb von V137 ist.

## Aktueller Stand

Der Abschluss-Blocker ist geloest. `update_android_phone.bat` ist als Root-Wrapper fuer `npm run android:update:phone` bewusst als `repo-ops` klassifiziert und bleibt damit ausserhalb der aktiven Produkt-/Code-Coverage. Der Zielpfad `scripts/update-android-phone.mjs` bleibt unveraendert als Graph-bekannter Skriptpfad sichtbar.

## Naechster Schritt

Kein offener Blocker fuer V137. Nachzug 2026-05-29: `node --test tests/knowledge-graph-build.contract.test.mjs`, `npm run graph:build`, `npm run graph:check` und `coverage-report` sind gruen; `no-new-active-uncovered-files` meldet violationCount 0.
