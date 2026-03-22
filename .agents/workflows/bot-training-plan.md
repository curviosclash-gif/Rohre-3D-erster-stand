---
description: Plan and execute bot-training work outside the general Umsetzungsplan.
---

## 0. Context

// turbo
- Read `docs/Bot_Trainingsplan.md` (primary source).
- Read `docs/Bot_Trainings_Roadmap.md` for long-horizon cycle targets.
- Read `docs/Umsetzungsplan.md` only for cross-plan dependencies.
- `git log -n 5 --oneline`.
- Review latest artifacts in `data/training/runs/` and `data/training/series/`.
- `npm run guard:main`.
- `npm run plan:check`.

## 1. Scope and ownership

- Confirm bot-training scope:
  - `scripts/training-*`
  - `src/entities/ai/training/**`
  - `trainer/**`
  - training tests/docs
- Keep bot-training phases out of `docs/Umsetzungsplan.md`.
- Use only `docs/Bot_Trainingsplan.md` for block/phase tracking.
- If future windows/quarter targets change, update `docs/Bot_Trainings_Roadmap.md` and mirror actionable status in `docs/Bot_Trainingsplan.md`.

## 2. Claim block

- Find first free lock in `docs/Bot_Trainingsplan.md`.
- Verify hard dependencies are completed.
- Atomically claim:

```bash
git pull --rebase
npm run guard:main
# lock setzen im Bot-Trainingsplan
git add docs/Bot_Trainingsplan.md
git commit -m "chore: Bot-X claims BT block"
git push
```

- On push failure: `git pull --rebase` and retry.

## 3. Plan execution

- Select first open phase in claimed block.
- Ensure each phase has at least 2 sub-phases.
- Track goals, risks, and verification commands in `implementation_plan.md`.

## 4. Execute and verify

- Implement with `/code` workflow.
- For each closed phase, run relevant training gates:
  - `npm run training:run`
  - `npm run training:eval`
  - `npm run training:gate`
  - `npm run bot:validate` when survival KPIs are affected
- For completed phase items (`[x]`), append evidence metadata:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Keep artifact paths and KPI deltas documented in `docs/Bot_Trainingsplan.md`.

## 5. Close and release

- Mark sub-phases and phase done with date + evidence.
- Keep gate invariant valid (`*.99` only after all earlier phases are done).
- Remove `implementation_plan.md`.
- Commit scoped changes.
- Before push on `main`: `npm run snapshot:tag`.
- When block is complete, release lock back to `frei`.

## 6. Mandatory closure checks

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
- `npm run build`

## Report

Standardformat verwenden. For next bot-training phase set `Next Step` to `/bot-training-plan` or `/fix-planung` with bot-training scope.
