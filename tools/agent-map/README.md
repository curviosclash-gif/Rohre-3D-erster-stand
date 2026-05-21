# Curvios Agent Map

Read-only dashboard for the agent working path in this repository. It maps task
types to workflows, rules, skills and checks without becoming a governance
source of truth.

## Export

```bash
node scripts/export-agent-map.mjs
```

Default output:

```text
tmp/agent-map/agent-map.json
```

The viewer reads existing sources only:

- `AGENTS.md`
- `.agents/rules/*.md`
- `.agents/workflows/*.md`
- `data/contracts/knowledge-graph/agent-governance.v1.json`

It does not write plans, locks, rules, workflows, skills, graph artifacts or
source files.

## Purpose

Use the Agent Map for the question:

```text
Which workflow, rules, skills and checks should an agent use for this task?
```

Use the Plan Map for block dependencies. Use the Repo Map for file and coverage
navigation. The Agent Map only explains the operational route.

## Knowledge Graph

The Agent Map is anchored by:

```text
data/contracts/knowledge-graph/agent-governance.v1.json
```

That mapping connects the export script, viewer, generated dataset, AGENTS
entrypoint, core rules, common workflows, Curvios skills and the export test.

Useful checks:

```bash
node --test tests/agent-map-export.contract.test.mjs
npm run graph:build
npm run graph:check
```
