---
trigger: "*_git_*"
description: Git safety, branch enforcement, and commit policy (consolidated)
---

## Git Safety

- Never run destructive git commands (`git reset --hard`, `git checkout --`, force-push) without explicit user approval.
- Prefer non-destructive alternatives: `git restore --source`, `git revert`, new commit with fix.
- **Niemals `git stash` verwenden.** Keine Ausnahmen.
- Fremde uncommittete Aenderungen ignorieren — nicht stashen, committen oder verwerfen.
- Keep `.husky/.bypass` local-only and untracked.

## Branch Enforcement

- `main` is the default working branch; run `npm run guard:main` before commit/push.
- Non-main work requires explicit user approval plus `ALLOW_NON_MAIN=1` scoped to that command.
- Before push on `main`, run `npm run snapshot:tag` for a local recovery tag.

## Commit Policy

- On Windows before staging, run `npm run git:acl:heal` once per commit cycle to clear recurring `.git/index.lock` ACL denies.
- Stage only scoped files (`git add [files]`); verify via `git diff --name-only`. Niemals `git add .` oder `git add -A`.
- Sofort committen nach jeder abgeschlossenen Teilaenderung — nicht Aenderungen ansammeln.
- Commit-Preflight: Vor neuem Task muessen eigene offene Aenderungen per scoped Commit gesichert sein.
- **Umsetzungsplan immer als eigener Commit** — nie zusammen mit Code-Aenderungen.
- Concise messages explaining *why*, not *what*. Types: `feat`, `fix`, `refactor`, `perf`, `chore`, `release`, `docs`.
- For immediate small corrections in the same task, use `git commit --amend`.
- Never use destructive history changes as default. Use `revert`/scoped restore first.
