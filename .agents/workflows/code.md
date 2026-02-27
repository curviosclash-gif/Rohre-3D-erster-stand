---
description: Implement a planned change from coding to verification and commit.
---

## 0. Context

- Read `docs/Umsetzungsplan.md`.
- Read latest context: `git log -n 3 --oneline`.
- If available, use `docs/Feature_*.md` for scope.

## 1. Scope

- Define target files and expected behavior.
- If scope is clear, proceed directly.
- Ask only for critical missing constraints.

## 2. Implement

- Follow existing project patterns.
- Avoid hardcoded config values.
- Include cleanup/dispose for new runtime objects.

## 3. Self-check

- `rg -n "console\\.log" src tests`
- No open TODOs in changed code.
- Run relevant tests for touched area.

## 4. Definition of Done

- `npm run build` succeeds.
- Relevant tests pass (minimum `npm run test:core` when applicable).
- `git diff --name-only` matches planned scope.
- Add one-line risk rating: low/medium/high.

## 5. Commit

```bash
git add [scoped-files]
git commit -m "[type]: [name] - [short reason]"
```

- `type` must match workflow intent (`feat`, `fix`, `refactor`, `perf`, `chore`, `release`).
- Before push, show impacted files (`git diff --name-only`) and confirm scope if unrelated changes exist.
- Push only after scope confirmation.

## Report

Use standard output format from `.agents/rules/reporting_format.md`.



