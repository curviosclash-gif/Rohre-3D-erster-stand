---
description: Implement a planned change from coding to verification and commit.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- `git log -n 3 --oneline`.
- If available, use `docs/Feature_*.md` for scope.

## 1. Scope

- Define target files and expected behavior.
- If scope is clear, proceed directly.
- Ask only for critical missing constraints.
- If unrelated worktree changes exist, do not absorb them – commit only scoped files.

## 2. Implement

- Follow existing project patterns.
- Avoid hardcoded config values.
- Include cleanup/dispose for new runtime objects.

## 3. Self-check

// turbo
- `rg -n "(console\.log|TODO:|FIXME:|HACK:)" src tests`
- No open TODOs in changed code.
- Select tests via `.agents/test_mapping.md`. Focus on meaningful tests for the change, not the full suite.
- Fallback: `npm run test:core`.

## 4. Doc-freshness + build gate

// turbo
- `npm run docs:sync && npm run docs:check`
- `npm run build`

## 5. Commit (see AGENTS.md §Commit Convention)

- `git add [scoped-files]` → `git commit -m "[type]: [name] - [short reason]"`
- Verify scope: `git diff --name-only`. Push only after confirmation.
- In parallel-agent scenarios, never stage unrelated files.

## Report

Standardformat verwenden.
