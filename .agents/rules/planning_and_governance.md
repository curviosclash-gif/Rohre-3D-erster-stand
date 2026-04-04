---
trigger: planning_or_phase_tracking_changes
description: Plan governance, bot-training governance, and blocker reporting (consolidated)
---

## Master Plans

- `docs/Umsetzungsplan.md` — compact index only (one row per active block + Abhaengigkeiten, Lock-Status, Conflict-Log).
- `docs/bot-training/Bot_Trainingsplan.md` — sole source for bot-training phases, locks, DoD, risks.
- Do not create plan scopes directly in either master plan. Intake is user-owned.

## Plan Files

- New/revised drafts: `docs/plaene/neu/`
- Canonical active blocks: `docs/plaene/aktiv/VXX.md` (must include DoD, Nicht-Ziel, risk register, phased checklist ending `*.99`)
- Archived plans: `docs/plaene/alt/`
- Every active block row must link to exactly one canonical block file with `scope_files`.

## Phase & Gate Rules

- `*.99` gate may be `[x]` only when all earlier phases are `[x]`.
- Every `[x]` item needs evidence: `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result>)`
- Every block has at least 2 sub-phases per top-level phase.

## Blocker Reporting

- If implementation hits a blocker or repeated failure, create/update a report in `docs/Fehlerberichte/` before stopping.
- Reports: task context, failure, reproduction path, affected files, attempted fixes, status, next step.

## Closure Gates

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
