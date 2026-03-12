---
description: Execute the next open phase from master plan with dynamic N-bot parallel support.
---

## 0. Read status

// turbo
- `git pull --rebase`
- Read `docs/Umsetzungsplan.md`.
- `git log -n 5 --oneline`.

## 1. Claim phase (parallel-safe)

- Identify your Bot-ID from the kickoff command (e.g. `/fix-planung Bot-1`).
- Find the first block with `<!-- LOCK: frei -->` whose `DEPENDS-ON` are all fulfilled (`[x]`).
- If a `<!-- SUB-LOCK -->` is used, claim a specific top-level phase within a block instead.
- **Atomarer Claim-Commit:**

```bash
git pull --rebase
# Lock setzen im Umsetzungsplan
git add docs/Umsetzungsplan.md
git commit -m "chore: Bot-X claims Block VXX"
git push
# Bei Push-Fehler: git pull --rebase und retry
```

- If no free block exists → report `Kein freier Block` and stop.
- Update `Datei-Ownership`-Tabelle im Umsetzungsplan für den claimed Block.

## 2. Scope next phase

- Identify first `[ ]` phase inside the claimed block.
- List open sub-phases and affected files.
- Check `Datei-Ownership`-Tabelle → keine Konflikte mit anderen Bots.
- If phase has no sub-phases: split into at least 2 before starting.

## 3. Create execution plan

Create `implementation_plan.md`:
- Bot-ID, target block/phase, 2-3 goals max
- File-level changes, risk rating, verification commands
- Ordered list of remaining phases in own block

## 4. Execute

- Run `/code` workflow with `fix:` commit prefix.
- `/code` is the single source of truth for DoD, verification, and doc-freshness.
- For parallel-bot Playwright runs, enforce per-bot isolation:
  - unique `TEST_PORT`
  - unique `PW_RUN_TAG`
  - unique `PW_OUTPUT_DIR`
- Never run concurrent Playwright suites with shared defaults in the same workspace.
- Continue to next open phase in own block after each close.
- **Shared-File-Regel:** If a change touches a file owned by another block:
  - Keep change minimal
  - Add entry to `Conflict-Log` in Umsetzungsplan before committing
- Stop only on hard blockers or explicit user stop.

## 5. Close phase

- Mark sub-phase and phase checkboxes done, add completion date.
- Remove `implementation_plan.md`.
- Commit: `git add docs/Umsetzungsplan.md` → `chore: close phase [Name]`
- Repeat 2–5 until own block has no `[ ]` phases left.

## 6. Release block

- Remove `<!-- LOCK: Bot-X ... -->`, set back to `<!-- LOCK: frei -->`.
- Clear own rows from `Datei-Ownership`-Tabelle.
- Commit: `chore: Bot-X releases Block VXX`

## Report

Standardformat verwenden. Set `Next Step` to `/fix-planung`.
