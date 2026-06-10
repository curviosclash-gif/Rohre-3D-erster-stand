---
description: Plan and execute bot-training work outside the general Umsetzungsplan.
decision_floor: D3
mutates: required
user_gate: required
commit_strategy: scoped
required_checks:
  - npm run plan:check
outputs:
  - repo-change
  - commands
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

- Find first open block/phase in `docs/bot-training/Bot_Trainingsplan.md`.
- Verify hard dependencies are completed.
- Single-Agent-Default: kein Lock-Claim noetig; der gewaehlte Block wird einfach bearbeitet.
- Lock-Tooling (`docs/lock-status/<person>.json`, `npm run lock:validate`) nur opt-in bei explizitem Multi-Agent-/Team-Betrieb verwenden (siehe `.agents/workflows/teamwork-coordination.md`).
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
- Zu jedem Abschluss-Commit kurze Trainings-Notiz mit Ziel, KPI-/Artefakt-Effekt oder Guardrail-Hintergrund festhalten.

## 5. Close and release

- Mark sub-phases and phase done with date + evidence.
- Keep gate invariant valid (`*.99` only after all earlier phases are done).
- Remove `implementation_plan.md`.
- Commit scoped changes im selben Turn, sobald der bearbeitete Trainings-Slice verifiziert abgeschlossen ist.
- Before push on `main`: `npm run snapshot:tag`.
- When block is complete, keep the bot-training plan status/evidence aligned; nur bei opt-in Team-Betrieb zusaetzlich den BT-Lock in `docs/lock-status/*.json` releasen.

## 6. Mandatory closure checks

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
- `npm run build`

## Report

Standardformat verwenden. For next bot-training phase set `Next Step` to `/bot-training-plan` or `/fix-planung` with bot-training scope.
