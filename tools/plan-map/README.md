# Curvios Plan Map

Read-only dashboard for the implementation plan.

## Export

```bash
node scripts/export-plan-map.mjs
```

Default output:

```text
tmp/plan-map/plan-map.json
```

The viewer reads existing sources only:

- `docs/Umsetzungsplan.md`
- `docs/plaene/aktiv/VXX.md`
- `docs/generated/knowledge-graph*.json`
- `docs/lock-status/_locks-registry.json`
- `docs/prozess/Open_Findings.md`

It does not write plan status, locks, graph files, or governance sources.

## Views

- Map: dependency graph with focus mode, legend, layer toggles, readiness badges, edge tooltips, and block details.
- Kollisionen: clickable scope-collision matrix; file clicks focus the map on affected blocks.
- Health: graph score, coverage, active locks, and open findings.

## Detail Model

The right panel keeps dense data behind tabs:

- Ueberblick: start signal, progress, collisions, impact, source path.
- Erklaerung: short narrative, goals, implemented highlights, open next steps, and non-goals.
- Start: dependency/consumer context and the compact "Warum?" explanation.
- Scope: impact breakdown, shared files, scope files, and references.
- Phasen: current phase progress and phase list.
- Risiken: dependency, governance, package, finding, and verification hints.
