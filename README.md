# CuviosClash

CuviosClash ist ein 3D-Arcade-Flugspiel auf Basis von Three.js.
Dieses Repository enthaelt Runtime, Editor, Tests und Bot-Training.

## Schnellstart

```bash
npm install
npm run dev
```

## Wichtige Befehle

```bash
npm run build
npm run dev
npm run dev:logged
npm run dev:raw
npm run logs:clean
npm run cleanup:workspace
npm run cleanup:workspace:apply
npm run test:core
npm run docs:sync
npm run docs:check
```

`cleanup:workspace` erzeugt zuerst einen Dry-Run-Bericht unter `tmp/workspace-cleanup-report.json`.
`cleanup:workspace:apply` entfernt nur konservativ freigegebene Artefakte und schuetzt aktive Playwright-/Dev-Spuren.

## Einstieg fuer AI und Dev

1. `docs/referenz/ai_project_onboarding.md`
2. `docs/referenz/ai_architecture_context.md`
3. `docs/Umsetzungsplan.md`
4. `docs/release/Releaseplan_Spiel_2026.md`
5. `docs/INDEX.md`

## Verbindliche Regeln

- Agent-Governance: `AGENTS.md`
- Repository-Regeln: `.agents/rules/*`
- Workflows: `.agents/workflows/*`
