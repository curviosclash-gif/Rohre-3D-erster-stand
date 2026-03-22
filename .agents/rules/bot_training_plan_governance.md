---
trigger: bot_training_planning_or_execution
description: Keep bot training planning in Bot_Trainingsplan with same governance level
---

- Bot-training phase tracking, locks, DoD, risks, and completion status must live in `docs/Bot_Trainingsplan.md`.
- Long-horizon planning for future training windows is documented in `docs/Bot_Trainings_Roadmap.md`, but execution status remains in `docs/Bot_Trainingsplan.md`.
- Do not create or update bot-training phases/locks in `docs/Umsetzungsplan.md`.
- If task scope touches training paths (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs), update planning status in `docs/Bot_Trainingsplan.md`.
- Keep cross-plan dependencies explicit: training and non-training work must be linked in both plans when coupled.
- Apply the same governance constraints as in the general master plan:
  - `*.99` gate invariant,
  - evidence metadata on completed phase items,
  - DoD and risk register per active block.
- Before closing a bot-training phase, document artifact paths and KPI deltas in `docs/Bot_Trainingsplan.md`.
- Mandatory closure gates for bot-training plan/process updates:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
