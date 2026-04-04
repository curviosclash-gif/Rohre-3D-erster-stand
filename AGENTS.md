# AGENTS.md

Repository-wide operating rules for all agents.

## Scope & Rule Sources

- Applies to the full repository. Higher-priority system/developer instructions win on conflict.
- Rules: `.agents/rules/` | Workflows: `.agents/workflows/` | Test mapping: `.agents/test_mapping.md`

## Default Behavior

- Apply rules from `.agents/rules/` first. Use concise, token-efficient output.
- Proceed proactively on non-destructive decisions with short rationale.
- Keep docs/workflows/rules in sync with code after each change.
- `docs/Umsetzungsplan.md` is the compact master index; block details live in `docs/plaene/aktiv/VXX.md`.
- Plan drafts: `docs/plaene/neu/`. Intake into master index is user-owned.
- Bot-training source of truth: `docs/bot-training/Bot_Trainingsplan.md`.

## Workflow Selection

| Task | Workflow |
|---|---|
| Feature planning | `.agents/workflows/plan.md` |
| Feature implementation | `.agents/workflows/code.md` |
| Bug fixing | `.agents/workflows/bugfix.md` |
| Phase execution | `.agents/workflows/fix-planung.md` |
| Bot training | `.agents/workflows/bot-training-plan.md` |
| Freshness check/sync | `.agents/workflows/aktualitaet-check.md` / `aktualitaet-sync.md` |
| Cleanup/refactor/release | matching workflow in `.agents/workflows/` |

## Verification Policy

- Tests are user-owned — run only on explicit request or at block gate `*.99`.
- Use `.agents/test_mapping.md` only when user requests test run or at `*.99` gate.
- For phase execution, `/code` is the single source of truth for DoD and verification.
- Closure gates: `npm run plan:check` → `npm run docs:sync` → `npm run docs:check`.

## Turbo Default

- Read-only commands (`git log`, `git status`, `rg`, `npm run docs:check`) are safe to auto-run.
- Workflows marked `// turbo-all` auto-run every `run_command` step.
