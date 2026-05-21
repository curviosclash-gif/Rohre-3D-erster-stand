# V132 Commit durch fremden Graph-/Staging-Zustand blockiert

Datum: 2026-05-21
Status: geschlossen fuer den Map-Tool-/Graph-Blocker; V132-Code bleibt separater Working-Tree-Scope

## Kontext

V132 erster Umsetzungsslice: separater `mobile-arcade` Target-Vertrag, Mobile-Arcade-Settings, Route-Allowlist und Contract-Test. Der Slice selbst ist durch gezielte Contracts und Plan-Gates abgesichert.

## Failure

`npm run gates:pre-commit` bricht bei `graph:check` ab:

- `knowledge-graph.json`, `knowledge-graph.coverage.json` und `knowledge-graph.scorecard.json` sind nicht byteidentisch zum Build-Output.
- Erwartete Graph-Kanten fehlen fuer `V133::V107`, `V133::V110`, `V133::V117`, `V130::V82`, `V130::V108`, `V130::V115`.
- Der Worktree enthaelt bereits fremde staged Map-Tool-/Repo-Map-Dateien; ein scoped V132-Commit wuerde diese nicht absorbieren duerfen.

## Reproduktion

```powershell
npm run gates:pre-commit
```

## Betroffene Dateien

V132-Scope:

- `src/mobile-arcade/MobileArcadeApp.js`
- `src/core/main.js`
- `dev/vite/rendererShellConfig.js`
- `tests/mobile-arcade-app.contract.test.mjs`
- `docs/plaene/aktiv/V132.md`

Externe Blocker-Flaechen:

- `docs/generated/knowledge-graph*.json`
- `docs/plaene/aktiv/V130.md`
- `docs/plaene/aktiv/V133.md`
- bereits staged Map-Tool-/Plan-Map-/Repo-Map-Dateien

## Attempted Fixes

- `node --test tests/mobile-arcade-app.contract.test.mjs` -> PASS.
- `node --test tests/mobile-classic-app.contract.test.mjs` -> PASS.
- `npm run plan:check` -> PASS.
- `npm run check:plan-evidence-claims` -> PASS.
- `npm run docs:check` -> PASS.
- Kein `npm run graph:build`, weil das fremde Graph-/Plan-Artefakte aktualisieren und in den V132-Slice ziehen wuerde.

## Abschluss

Der Map-Tool-/Graph-Blocker wurde im Intake-Layer-Abschluss separiert: Plan-Map-Intake, Graph-Mapping, `docs/Fehlerberichte/`-Coverage-Klassifikation und generierte Graph-Artefakte sind wieder konsistent. V132-Mobile-Codeaenderungen werden nicht durch diesen Report-Commit absorbiert und muessen weiter als eigener scoped Slice behandelt werden.
