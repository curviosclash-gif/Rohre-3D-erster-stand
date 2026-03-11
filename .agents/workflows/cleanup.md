---
description: Detect and remove dead code/files with safe dry-run first.
---

## 0. Detect

// turbo
- Unused exports: `npx -y ts-unused-exports tsconfig.json` (if exists) or manual `rg` checks.
- Gather TODO/FIXME/HACK markers and large commented blocks.

## 1. Inventory

// turbo
- `git ls-files "src/**/*.js" "editor/js/**/*.js" "tests/**/*.js"`
- Cross-check with actual imports/references.

## 2. Security and deps

// turbo
- `npm outdated` and `npm audit`. Apply fixes selectively.

## 3. Dry-run report (mandatory)

- List candidate deletions/archives with per-item risk rating.
- No file deletion in dry-run.

## 4. Execute after confirmation

- Remove/archive approved items only.
- Re-run relevant tests.

## 5. Commit (see AGENTS.md §Commit Convention)

- `git add [approved-files]` → `chore: cleanup - remove dead code/files`
- Verify scope: `git diff --name-only`.

## Report

Standardformat verwenden.
