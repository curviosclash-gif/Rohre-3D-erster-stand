---
description: Git safety, branch enforcement, and commit policy (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Git Safety

- Niemals destruktive Git-Kommandos ohne explizite User-Zustimmung: `git reset --hard`, `git checkout -- <pfad>`, `git clean -fd`/`-fdx`, Force-Push.
- Bevorzugte Alternativen: `git restore --source`, `git revert`, neuer Commit mit Fix.
- **Niemals `git stash` verwenden.** Keine Ausnahmen.
- Fremde uncommittete Aenderungen ignorieren - nicht stashen, committen oder verwerfen.
- Bei unvermeidbarem destruktivem Schritt: stoppen und User um explizite Backup-/Confirm-Freigabe bitten.
- `.husky/.bypass` bleibt local-only und untracked.

## Branch Enforcement

- `main` is the default working branch; run `npm run guard:main` before commit/push.
- Non-main work requires explicit user approval plus `ALLOW_NON_MAIN=1` scoped to that command.
- Before push on `main`, run `npm run snapshot:tag` for a local recovery tag.

## Commit Policy

- On Windows before staging, run `npm run git:acl:heal` once per commit cycle to clear recurring `.git/index.lock` ACL denies.
- Stage only scoped files (`git add [files]`); verify via `git diff --name-only`. Niemals `git add .` oder `git add -A`.
- Sofort committen nach jeder abgeschlossenen Teilaenderung — nicht Aenderungen ansammeln.
- **Ein Commit pro Subphase** — jede `VXX.Y.Z`-Subphase landet als eigener scoped Commit; keine Cross-Subphase-Bundles.
- Commit-Preflight: Vor neuem Task muessen eigene offene Aenderungen per scoped Commit gesichert sein.
- **Umsetzungsplan immer als eigener Commit** — nie zusammen mit Code-Aenderungen.
- Concise messages explaining *why*, not *what*. Types: `feat`, `fix`, `refactor`, `perf`, `chore`, `release`, `docs`.
- For immediate small corrections in the same task, use `git commit --amend`.
- Never use destructive history changes as default. Use `revert`/scoped restore first.

## Scope & Phase Validation

- Vor jedem Commit: `npm run scope:validate` empfohlen
- Scope-Violations sind Hard-Fails (pre-commit Hook via lock-registry-merger)
- Lock-Status wird in `docs/lock-status/` verwaltet (distributed, pro Person)
- Phase-Sequenzierung wird von `phase:validate` unterstuetzt
