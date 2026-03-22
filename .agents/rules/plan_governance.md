---
trigger: planning_or_phase_tracking_changes
description: Rule for strict governance across both master plans
---

- Both master plans are governed artifacts:
  - `docs/Umsetzungsplan.md`
  - `docs/Bot_Trainingsplan.md`
- Enforce gate invariant: a `*.99` phase may be `[x]` only when all earlier phases in the same block are `[x]`.
- Every completed checklist item (`[x]`) with phase ID must include evidence metadata:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Every active block must include:
  - one valid `<!-- LOCK: ... -->` header,
  - one `Definition of Done (DoD)` section,
  - one risk register section.
- Keep dependency metadata (`hard`/`soft`) and backlog prioritization current when block status changes.
- For any change to plans, workflows, process rules, or planning scripts, run:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
- Do not close a task if any governance/doc gate fails.
