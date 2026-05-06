---
description: Plan and execute bot-training work outside the general Umsetzungsplan.
---

## 0. Context

// turbo
- Read `docs/bot-training/Bot_Trainingsplan.md` (primary source).
- Read `docs/bot-training/Bot_Trainings_Roadmap.md` for long-horizon cycle targets.
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
- Use only `docs/bot-training/Bot_Trainingsplan.md` for block/phase tracking.
- If future windows/quarter targets change, update `docs/bot-training/Bot_Trainings_Roadmap.md` and mirror actionable status in `docs/bot-training/Bot_Trainingsplan.md`.

## 2. Claim block

- Find first free or explicitly claimable block/phase in `docs/bot-training/Bot_Trainingsplan.md`.
- Verify hard dependencies are completed.
- Operativer Lock-Wahrheitsraum bleibt `docs/lock-status/*.json`, nicht der reine Plantext.
- BT-Locks deshalb ueber `docs/lock-status/<person>.json` festhalten und danach `npm run lock:validate` ausfuehren.
- Lock-only Claim-Commits sind nicht Default; wenn moeglich Lock-Aenderung mit der ersten fachlichen Lieferung oder einem gezielten Sync-Commit buendeln.
- Falls der Team-Flow einen sofort publizierten Claim auf `main` braucht:

```bash
npm run guard:main
git add docs/lock-status/<person>.json
git commit -m "chore: claim BT block <BTXX phase>"
npm run snapshot:tag
git push
```

- Plantext in `docs/bot-training/Bot_Trainingsplan.md` nur anpassen, wenn sich Status, Evidence, Risiken oder Freigabe wirklich geaendert haben; kein Claim nur per Plan-Edit.

## 3. Plan execution

- Select first open phase in claimed block.
- Ensure each phase has at least 2 sub-phases.
- Track goals, risks, and verification commands in `implementation_plan.md`.

## 4. Execute and verify

- Implement with `/code` workflow.
- For each closed phase, run relevant training gates only after explicit user request. Otherwise record the recommended commands for the user: `npm run training:run`, `npm run training:eval`, `npm run training:gate`, `npm run bot:validate` when survival KPIs are affected.
- For completed phase items (`[x]`), append evidence metadata:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Keep artifact paths and KPI deltas documented in `docs/bot-training/Bot_Trainingsplan.md`.

## 5. Close and release

- Mark sub-phases and phase done with date + evidence.
- Keep gate invariant valid (`*.99` only after all earlier phases are done).
- Remove `implementation_plan.md`.
- Commit scoped changes im selben Turn, sobald der bearbeitete Trainings-Slice verifiziert abgeschlossen ist.
- Before push on `main`: `npm run snapshot:tag`.
- When block is complete, release the operational BT lock in `docs/lock-status/*.json` and keep the bot-training plan status/evidence aligned.

## 6. Mandatory closure checks

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
- `npm run build`

## Report

Standardformat verwenden. For next bot-training phase set `Next Step` to `/bot-training-plan` or `/fix-planung` with bot-training scope.
