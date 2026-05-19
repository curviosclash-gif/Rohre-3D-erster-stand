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
