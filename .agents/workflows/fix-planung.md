---
description: Execute the next open phase from master plan with dynamic N-bot parallel support.
---

## 0. Read status

// turbo
- `git pull --rebase`
- `npm run guard:main`
- Read `docs/Umsetzungsplan.md`.
- For bot-training scope also read `docs/Bot_Trainingsplan.md` and treat it as selected master plan.
- `git log -n 5 --oneline`.
- `npm run plan:check`

## 1. Claim phase (parallel-safe)

- Identify your Bot-ID from the kickoff command (for example `/fix-planung Bot-1`).
- Select master plan file by scope:
  - Default: `docs/Umsetzungsplan.md`
  - Bot training (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs): `docs/Bot_Trainingsplan.md`
- Find first block with `<!-- LOCK: frei -->` and fulfilled hard dependencies.
- If `<!-- SUB-LOCK -->` exists, claim a specific top-level phase.
- Atomic claim commit:

```bash
git pull --rebase
npm run guard:main
# lock setzen im ausgewaehlten Masterplan
git add [masterplan-datei]
git commit -m "chore: Bot-X claims Block VXX"
git push
# bei Push-Fehler: git pull --rebase und retry
```

- If no free block exists: report `Kein freier Block` and stop.
- Update `Datei-Ownership` rows for claimed scope.

## 2. Scope next phase

- Identify first open phase (`[ ]`) in claimed block.
- List open sub-phases and affected files.
- Check `Datei-Ownership` table for conflicts.
- If phase has no sub-phases: split into at least 2 before starting.

## 3. Execute

- Run `/code` workflow with `fix:` or `refactor:` prefix as fitting.
- `/code` remains source of truth for implementation verification.
- Parallel Playwright runs require unique `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR` per bot.

## 4. Close phase

- Mark sub-phase and phase checkboxes done.
- Every `[x]` entry must include evidence format:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Keep gate invariant intact (`*.99` only when prior phases are `[x]`).
- `npm run plan:check`
- `npm run docs:sync && npm run docs:check`
- Commit scoped updates.
- Before push on `main`: `npm run snapshot:tag`

## 5. Release block

- Reset lock to `<!-- LOCK: frei -->` after block completion.
- Clear own ownership rows if no longer needed.
- `npm run plan:check`
- Commit: `chore: Bot-X releases Block VXX` (update selected master plan file)
- Before push on `main`: `npm run snapshot:tag`

## Report

Standardformat verwenden. Set `Next Step` to `/fix-planung`.
