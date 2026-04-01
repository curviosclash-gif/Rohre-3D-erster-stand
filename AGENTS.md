# AGENTS.md

This file defines repository-specific operating rules for Codex.

## Scope

- Applies to the full repository.
- If this file conflicts with higher-priority system/developer instructions, higher-priority instructions win.

## Rule Sources

- Global rules folder: `.agents/rules/`
- Workflow folder: `.agents/workflows/`
- Test mapping: `.agents/test_mapping.md`

## Default Behavior

- Always apply rules from `.agents/rules/` first.
- Use concise, token-efficient output by default.
- Ask questions only when critical information is missing.
- For non-destructive design decisions, proceed proactively with a short rationale.
- Desktop app is the primary product target and source of truth for feature completeness.
- Treat the online/browser version as a demo with reduced functionality unless the user explicitly requests demo-specific work.
- Keep docs/workflows/rules in sync with code and user-confirmed test reality after each change.
- Create and revise implementation plans only in external docs under `docs/plaene/neu/`.
- Do not create or restructure planning content directly inside `docs/Umsetzungsplan.md`.
- Manual intake into `docs/Umsetzungsplan.md` and subsequent archival to `docs/plaene/alt/` is user-owned.
- When implementation problems or blockers occur, create or update a task-scoped error report in `docs/Fehlerberichte/` before handoff or task close.
- Bot training planning source of truth is `docs/bot-training/Bot_Trainingsplan.md` (not `docs/Umsetzungsplan.md`).
- Future bot-training windows and KPI corridor are maintained in `docs/bot-training/Bot_Trainings_Roadmap.md` and referenced from `docs/bot-training/Bot_Trainingsplan.md`.

## Token-Effizienz (KRITISCH!)

**Ziel: Minimaler Token-Verbrauch bei maximaler Produktivitaet.**

- **Keine wiederholten Reads:** Gleiche Datei zweimal lesen = Token verschwenden. Info aus vorherigem Read verwenden.
- **Teilweise lesen:** Nur relevante Teile von grossen Dateien lesen (z.B. Umsetzungsplan nur den relevanten Block, nicht alles).
- **Keine grossen Kontexte:** Grosse Dateien oder Ergebnisse nicht komplett in den Kontext laden.
- **Keine redundanten Tool-Calls:** Wenn ein Read/Search-Ergebnis schon im Kontext ist, nicht nochmal ausfuehren.
- **Parallele Tool-Calls erzwingen:** 2+ unabhaengige Reads/Searches IMMER parallel, niemals sequenziell.
- **Antworten kurz halten:** Keine langen Zusammenfassungen nach Aktionen. Der User sieht den Diff.
- **Kein Plan-Mode fuer kleine Tasks:** Nur bei 5+ betroffenen Dateien planen. Kleine Fixes direkt umsetzen.
- **Agent-Explore sparsam:** Default `quick` oder `medium` Tiefe. Nur `very thorough` wenn der User explizit tiefe Suche anfordert.

**Anti-Patterns:**
- NICHT gleiche Datei mehrfach lesen
- NICHT ganze Umsetzungsplan lesen wenn nur ein Block relevant ist
- NICHT grosse Dateien ohne Zeilenbegrenzung auslesen
- NICHT lange Zusammenfassungen nach jeder Aktion
- NICHT Tool-Calls wiederholen deren Ergebnis schon im Kontext ist
- NICHT mehrere Agents sequenziell starten (parallel nutzen)

## Workflow Selection

- Feature planning: use `.agents/workflows/plan.md`
- Feature implementation: use `.agents/workflows/code.md`
- Bug fixing: use `.agents/workflows/bugfix.md`
- Phase execution from master plan: use `.agents/workflows/fix-planung.md`
- Bot training planning/execution: use `.agents/workflows/bot-training-plan.md`
- Documentation/process freshness check: use `.agents/workflows/aktualitaet-check.md`
- Documentation/process freshness sync: use `.agents/workflows/aktualitaet-sync.md`
- Cleanup/refactor/release/status/rollback: use matching workflow in `.agents/workflows/`

## Verification Policy

- Automated tests are user-owned and run only after explicit user request.
- Use `.agents/test_mapping.md` only when the user explicitly requests a test run.
- If no mapping matches for a requested test run, recommend `npm run test:core` to the user instead of auto-running it.
- When no tests were requested, report test status as pending/user-owned.
- For phase execution via `/fix-planung`, `/code` is the single source of truth for DoD and verification checks.
- For bot-training phase execution via `/bot-training-plan`, `/code` remains the single source of truth for implementation checks.
- For any code/process update, run:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`

## Git Safety

- Never use destructive git operations without explicit user approval.
- `main` is the default working branch; run `npm run guard:main` before commits/pushes (hooks enforce this too).
- Non-main work needs explicit user approval and temporary `ALLOW_NON_MAIN=1` for that scoped command.
- Use scoped staging (`git add [scoped-files]`) and verify scope via `git diff --name-only` before push. Niemals `git add .` oder `git add -A`.
- **Niemals `git stash` verwenden.** Keine Ausnahmen. Stash hat wiederholt zu Datenverlust und doppelter Arbeit gefuehrt.
- Fremde uncommittete Aenderungen ignorieren - nicht stashen, nicht committen, nicht verwerfen. Sie gehoeren einem anderen Agent.
- **Zwingende Regel nach jeder Aenderung:** Jede abgeschlossene Aenderung sofort per scoped Commit sichern (kein Sammeln von Aenderungen).
- Sofort committen nach jeder abgeschlossenen Teilaenderung, nicht Aenderungen ansammeln.
- Commit-Preflight ist Pflicht: Vor neuem Task oder Kontextwechsel muessen eigene offene Aenderungen bereits per scoped Commit gesichert sein.
- **Umsetzungsplan immer als eigener Commit** - `docs/Umsetzungsplan.md` nie zusammen mit Code-Aenderungen committen. Immer separater Commit am Ende: `chore(Umsetzungsplan): ...`.
- Keep `.husky/.bypass` local-only and untracked.
- Create a local recovery tag via `npm run snapshot:tag` before push on `main`.
- Keep commits atomic and use `git commit --amend` for immediate small corrections in the same task.

## UI Changes

- Do not generate full walkthrough artifacts unless requested.
- Prioritize layout, flows, and UX for the desktop app first; online/browser UI may remain intentionally reduced for demo scope.
- For UI changes, provide lightweight visual verification evidence when available.

## Commit Convention

All workflows follow this pattern unless stated otherwise:

1. Stage only scoped files: `git add [scoped-files]`
2. Verify scope: `git diff --name-only`
3. Commit: `git commit -m "[type]: [short reason]"` - type matches workflow intent (`feat`, `fix`, `refactor`, `perf`, `chore`, `release`, `docs`)
4. Push only after scope confirmation. In parallel-agent scenarios, never stage unrelated files.
5. For immediate small corrections in the same task, use `git commit --amend`.

## Turbo Default

- Read-only commands (`git log`, `git status`, `rg`, `npm run docs:check`) are safe to auto-run (`// turbo`).
- Workflows marked `// turbo-all` auto-run every `run_command` step.

## Parallel Bots

Multiple bots can work on different blocks in `docs/Umsetzungsplan.md` simultaneously.
For bot-training-only work, use the same lock protocol in `docs/bot-training/Bot_Trainingsplan.md`.

### Lock-Protokoll

- Each block has a `<!-- LOCK: frei -->` or `<!-- LOCK: Bot-X seit YYYY-MM-DD -->` header.
- A bot claims a free block via atomic commit: `git pull --rebase` -> set lock -> `git push`. On push failure: retry.
- A bot releases a block after completing all phases: set lock back to `frei`.
- Stale-lock: If lock is >24h old without commits in that block, another bot may take over after user confirmation.
- Sub-locks: Optionally, 2 bots can work on the same block if they claim different top-level phases via `<!-- SUB-LOCK: Bot-X -->`.

### Datei-Ownership

- `docs/Umsetzungsplan.md` contains the ownership table for non-training paths.
- `docs/bot-training/Bot_Trainingsplan.md` contains the ownership table for training paths (`scripts/training-*`, `src/entities/ai/training/**`, `trainer/**`, training tests/docs).
- A bot must not modify files owned by another bot's block unless absolutely necessary.
- `tests/**` and `docs/**` are shared (append-only or own sections).

### Conflict-Log

- Any cross-block file change must be logged in the matching master plan's `Conflict-Log` section before commit.
- Format: date, bot, foreign block, file, reason, risk rating.

### Dependencies

- Blocks can declare `<!-- DEPENDS-ON: VXX.Y -->`. A bot must verify dependencies are fulfilled (`[x]`) before claiming.

## Phasen-Schema

All master plans (`docs/Umsetzungsplan.md` and `docs/bot-training/Bot_Trainingsplan.md`) must follow this structure:

- Every block contains top-level phases (for example `26.1`, `26.2`).
- Every phase must have at least 2 sub-phases (for example `26.1.1`, `26.1.2`).
- Every block ends with an Abschluss-Gate phase (`*.99`).
- Single-step items are modeled as sub-phases, never as standalone phases.
- A completed checkbox (`[x]`) must carry evidence metadata in the agreed format.

