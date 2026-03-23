---
trigger: *_git_*
description: Rule for safe git operations
---

- Never run destructive git commands (`git reset --hard`, `git checkout --`, force-push) without explicit user approval in the same session.
- `main` is the default working branch; run `npm run guard:main` before commit/push operations (hooks also enforce this).
- Non-main work requires explicit user approval plus temporary `ALLOW_NON_MAIN=1` for the scoped command only.
- Prefer non-destructive alternatives first: `git restore --source`, `git revert`, new commit with fix.
- Before any rollback/push operation, show impacted commits/files and confirm scope.
- If unrelated uncommitted changes exist, ignore them completely. They belong to another agent.
- **Vor Arbeitsbeginn pullen** — `git pull --rebase origin main` ausfuehren, bevor Code geaendert wird.
- **Niemals `git stash` verwenden.** Keine Ausnahmen. Stash hat wiederholt zu Datenverlust und doppelter Arbeit gefuehrt.
- In parallel situations (second agent or user editing at the same time), leave foreign changes untouched unless the user explicitly asks to include them.
- Stage and commit only the files changed for the current task; a dirty worktree alone is not a reason to widen scope.
- Sofort committen nach jeder abgeschlossenen Teilaenderung, nicht Aenderungen ansammeln.
- Commit-Preflight ist Pflicht: Vor neuem Task, Kontextwechsel oder `git pull --rebase origin main` muessen eigene offene Aenderungen bereits per scoped Commit gesichert sein.
- Wenn `git pull --rebase origin main` wegen uncommitteter Dateien blockiert: zuerst nur eigene Task-Aenderungen committen; blockieren fremde Dateien den Pull weiterhin, User-Freigabe fuer "ohne Pull fortfahren" einholen.
- **Umsetzungsplan immer als eigener Commit** — `docs/Umsetzungsplan.md` nie zusammen mit Code-Aenderungen committen. Immer separater Commit am Ende: `chore(Umsetzungsplan): ...`. Der Pre-Commit Hook blockiert Misch-Commits.
- Keep `.husky/.bypass` local-only; never commit it.
