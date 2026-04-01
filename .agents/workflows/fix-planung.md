---
description: Execute the next open phase from master plan with dynamic N-bot parallel support.
---

## 0. Read status

// turbo
- `git pull --rebase`
- `npm run guard:main`
- Read `docs/Umsetzungsplan.md`.
- Read the linked `docs/plaene/aktiv/VXX.md` for the claimed block before execution.
- For bot-training scope also read `docs/bot-training/Bot_Trainingsplan.md` and treat it as selected master plan.
- `git log -n 5 --oneline`.
- `npm run plan:check`

## 1. Claim phase (parallel-safe)

- Identify your Bot-ID from the kickoff command (for example `/fix-planung Bot-1`).
- Select master plan file by scope:
  - Default: `docs/Umsetzungsplan.md`
  - Bot training (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs): `docs/bot-training/Bot_Trainingsplan.md`
- Execute only blocks already manually integrated by the user.
- Do not create new blocks or planning scopes directly in master plans.
- Find first block whose row in `## Lock-Status` is `frei` and whose hard dependencies are fulfilled.
- If a shared or sub-lock model is needed, document it in the linked block file and lock row before work starts.
- Atomic claim commit:

```bash
git pull --rebase
npm run guard:main
# Lock-Status-Zeile im ausgewaehlten Masterplan aktualisieren
git add [masterplan-datei]
git commit -m "chore: Bot-X claims Block VXX"
git push
# bei Push-Fehler: git pull --rebase und retry
```

- If no free block exists: report `Kein freier Block` and stop.
- Treat `scope_files` in `docs/plaene/aktiv/VXX.md` as canonical ownership for claimed scope.

## 2. Scope next phase

- Identify first open phase (`[ ]`) in claimed block.
- List open sub-phases and affected files.
- Check `scope_files` in the linked block file for conflicts.
- If phase has no sub-phases: create/update an external plan in `docs/plaene/neu/` and wait for manual intake by the user.

## 3. Execute

- Run `/code` workflow with `fix:` or `refactor:` prefix as fitting.
- `/code` remains source of truth for implementation verification.
- For non-`*.99` phases, adapt tests or smokes as needed but defer their execution to the block Abschluss-Gate unless the user explicitly asks otherwise.
- If the user explicitly requests Playwright validation, parallel runs require unique `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR` per bot.

## 4. Close phase

- Mark sub-phase and phase checkboxes done.
- Every `[x]` entry must include evidence format:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Keep gate invariant intact (`*.99` only when prior phases are `[x]`).
- For non-`*.99` phases, record the pending block-end verification scope instead of running mapped tests or smokes.
- `npm run plan:check`
- `npm run docs:sync && npm run docs:check`
- Commit scoped updates.
- Before push on `main`: `npm run snapshot:tag`

## 5. Release block

- Reset the matching row in `## Lock-Status` to `frei`.
- `npm run plan:check`
- Commit: `chore: Bot-X releases Block VXX` (update selected master plan file)
- Before push on `main`: `npm run snapshot:tag`

## Report

Standardformat verwenden. Set `Next Step` to `/fix-planung`.

