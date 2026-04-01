---
trigger: planning_or_phase_tracking_changes
description: Rule for strict governance across both master plans
---

- Both master plans are governed artifacts:
  - `docs/Umsetzungsplan.md`
  - `docs/bot-training/Bot_Trainingsplan.md`
- External implementation plans are first-class artifacts and must be authored in:
  - `docs/plaene/neu/`
- Canonical active block details for the general master plan live in:
  - `docs/plaene/aktiv/`
- Do not create or rewrite plan scopes directly in `docs/Umsetzungsplan.md`.
- Intake into `docs/Umsetzungsplan.md` is manual and user-owned.
- After manual intake, move the corresponding external plan to:
  - `docs/plaene/alt/`
- `docs/Umsetzungsplan.md` is an index only: one row per active block plus inline `Abhaengigkeiten`, `Lock-Status` and `Conflict-Log`.
- `plan_file` is required for every active block row in `docs/Umsetzungsplan.md`.
- `scope_files`/ownership for non-training blocks are canonical only in the linked `docs/plaene/aktiv/VXX.md`.
- Enforce gate invariant: a `*.99` phase may be `[x]` only when all earlier phases in the same block are `[x]`.
- Every completed checklist item (`[x]`) with phase ID must include evidence metadata:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Every active block row in `docs/Umsetzungsplan.md` must link to exactly one canonical block file.
- Every canonical block file under `docs/plaene/aktiv/` must include:
  - one `Definition of Done` section,
  - one `Nicht-Ziel` section,
  - one risk register section,
  - phased checklist content ending in `*.99`.
- Keep dependency metadata (`hard`/`soft`) and backlog prioritization current when block status changes.
- For any change to plans, workflows, process rules, or planning scripts, run:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
- Do not close a task if any governance/doc gate fails.

