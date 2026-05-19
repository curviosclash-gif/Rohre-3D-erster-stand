# Curvios Repo Map

Read-only dashboard for repository topology, graph coverage, plan overlays and critical runtime flows.

## Export

```bash
node scripts/export-repo-map.mjs
```

Default output:

```text
tmp/repo-map/repo-map.json
```

The viewer reads existing sources only:

- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.coverage.json`
- `docs/generated/knowledge-graph.scorecard.json`
- `scripts/architecture/ArchitectureAnalysis.mjs`
- `git ls-files`

It does not write plan status, graph files, coverage files, source files or governance sources.

