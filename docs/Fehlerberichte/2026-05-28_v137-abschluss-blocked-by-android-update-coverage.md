# V137 Abschluss durch Android-Update-Coverage-Drift blockiert

Datum: 2026-05-28
Status: offen fuer Graph-Coverage-Scope; V137-Entscheidung bleibt `manual-only`

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

V137 kann bis `137.99` vorbereitet werden, aber der Abschluss bleibt blockiert, bis `update_android_phone.bat` entweder einem passenden Graph-Scope zugeordnet oder bewusst klassifiziert/exkludiert ist.

## Naechster Schritt

Android-/Repo-Ops-Scope klaeren: `update_android_phone.bat` als Wrapper zu `scripts/update-android-phone.mjs` in den passenden Graph-Scope aufnehmen oder als ausgeschlossenen Repo-Ops-Pfad klassifizieren; danach `npm run graph:build`, `npm run graph:check` und V137 137.99 erneut abschliessen.
