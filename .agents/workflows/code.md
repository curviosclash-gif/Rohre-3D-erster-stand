---
description: Implement a planned change from coding to verification and commit.
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`.
- For bot-training scope also read `docs/bot-training/Bot_Trainingsplan.md` and keep training planning there.
- `git log -n 3 --oneline`.
- `npm run guard:main`.
- If available, use external plan docs in `docs/plaene/neu/*.md` or `docs/plaene/alt/*.md` for scope.

## 1. Scope

- Define target files and expected behavior.
- Confirm desktop app outcome first; keep online/browser parity in scope only when explicitly requested or very low-cost.
- If scope is clear, proceed directly.
- Ask only for critical missing constraints.
- If unrelated worktree changes exist, do not absorb them; commit only scoped files.

## 2. Implement

- Follow existing project patterns.
- Prefer desktop-app UX and feature completeness over online-demo parity.
- Avoid hardcoded config values.
- Include cleanup/dispose for new runtime objects.
- Do not create or rewrite planning scopes directly in `docs/Umsetzungsplan.md`; keep plan drafting in `docs/plaene/neu/`.
- If task scope is bot training (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs), update phase/status only in `docs/bot-training/Bot_Trainingsplan.md`.

## 3. Self-check

// turbo
- `rg -n "(console\.log|TODO:|FIXME:|HACK:)" src tests`
- No open TODOs in changed code.
- If the user explicitly requests Playwright validation, never run multiple suites concurrently on same repo/port/output directory.
- If the user explicitly requests parallel bot testing, each bot must use unique `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR`.
- Run tests via `.agents/test_mapping.md` only after explicit user request. Without that request, leave tests unrun and note that verification stays user-owned.

## 4. Governance + doc gates

// turbo
- If `docs/Umsetzungsplan.md`, `docs/plaene/**/*.md`, `.agents/workflows/**` or `.agents/rules/**` changed:
  - `npm run plan:check`
- If `docs/bot-training/Bot_Trainingsplan.md` changed:
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

