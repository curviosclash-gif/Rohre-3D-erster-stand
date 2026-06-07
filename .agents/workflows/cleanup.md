---
description: Detect and retire dead code/files with replacement-proof and safe dry-run first.
---

## 0. Detect

// turbo
- If `knip` is configured (`knip.json` or package script), run it first and treat findings as hints, not delete-proof.
- Unused exports: `npx -y ts-unused-exports tsconfig.json` (if exists) or manual `rg` checks.
- Gather TODO/FIXME/HACK markers and large commented blocks.

## 1. Inventory

// turbo
- Decision-Klasse nach `.agents/rules/planning_and_governance.md` bestimmen; Cleanup-, Archivierungs-, Move-/Delete- und breite Refactor-Schritte sind D3/D4-nahe und brauchen User-Gate vor Umsetzung.
- Jede Freigabefrage nach dem Erklaerformat aus `.agents/rules/planning_and_governance.md` stellen: Entscheidung, Gate-Grund, konkrete Removes/Archives, erwarteter Effekt, ausgeschlossener Scope, Blast-Radius, Recovery-Pfad und passende Kurzantwort.
- Neue Reports, Ablagen oder Archiv-Indizes vorab nach Zweckklasse (`transient`, `evidence`, `reference`, `governance`, `plan`, `archive-index`) einordnen und bestehende kanonische Zielquellen bevorzugen.
- `git ls-files "src/**/*.js" "editor/js/**/*.js" "tests/**/*.js" "tests/**/*.mjs"`
- Cross-check with actual imports/references.
- Classify each candidate as `duplicate-backed`, `legacy-with-replacement`, `contract-first/plan-drift`, or `unverified-altpath`.
- Record per candidate: newer path, real consumers, test-/harness-only consumers, and delete criterion.

## 2. Security and deps

// turbo
- `npm outdated` and `npm audit`. Apply fixes selectively.

## 3. Dry-run report (mandatory)

- List candidate deletions/archives with per-item risk rating.
- Mark which items are safe removes, which need replacement wiring, and which are only plan/runtime drift.
- No file deletion in dry-run.

## 4. Execute after confirmation

- Remove/archive approved items only.
- Delete only `duplicate-backed` items or paths with proven productive replacement; keep or mark everything else as `legacy`, `compatibility path`, `shim`, or `plan-drift`.
- Re-run relevant tests only after explicit user request; otherwise list the recommended manual test command for the user.

## 5. Commit

- Git-Policy: `.agents/rules/git_and_commits.md`.

- Wenn die freigegebenen Cleanup-Aenderungen umgesetzt und nachvollziehbar eingegrenzt sind, Commit im selben Turn erstellen.
- `git add [approved-files]` -> `chore: cleanup - remove dead code/files`
- Verify staged scope: `git diff --cached --name-only`; remaining worktree changes via `git status --short`.

## Report

Standardformat verwenden.
