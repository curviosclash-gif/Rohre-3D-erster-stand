---
description: Implement a planned change from coding to verification and commit.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- For bot-training scope also read `docs/Bot_Trainingsplan.md` and keep training planning there.
- `git log -n 3 --oneline`.
- `npm run guard:main`.
- If available, use `docs/Feature_*.md` for scope.

## 1. Scope

- Define target files and expected behavior.
- If scope is clear, proceed directly.
- Ask only for critical missing constraints.
- If unrelated worktree changes exist, do not absorb them; commit only scoped files.

## 2. Implement

- Follow existing project patterns.
- Avoid hardcoded config values.
- Include cleanup/dispose for new runtime objects.
- If task scope is bot training (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs), update phase/status only in `docs/Bot_Trainingsplan.md`.

## 3. Self-check

// turbo
- `rg -n "(console\.log|TODO:|FIXME:|HACK:)" src tests`
- No open TODOs in changed code.
- Multi-agent Playwright safety: never run multiple suites concurrently on same repo/port/output directory.
- If parallel bots test at same time, each bot must use unique `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`.
- Select tests via `.agents/test_mapping.md`; fallback `npm run test:core`.

## 4. Governance + doc gates

// turbo
- If `docs/Umsetzungsplan.md`, `docs/Feature_*.md`, `.agents/workflows/**` or `.agents/rules/**` changed:
  - `npm run plan:check`
- If `docs/Bot_Trainingsplan.md` changed:
  - `npm run plan:check`
- `npm run docs:sync && npm run docs:check`
- `npm run build`

## 5. Commit (see AGENTS.md section Commit Convention)

- `npm run guard:main`
- `git add [scoped-files]` -> `git commit -m "[type]: [name] - [short reason]"`
- Verify scope: `git diff --name-only`.
- Before push on `main`: `npm run snapshot:tag`.
- In parallel-agent scenarios, never stage unrelated files.

## Report

Standardformat verwenden.
