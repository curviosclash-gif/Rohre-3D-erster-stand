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
- Commits folgen fachlichen Delivery-Slices: zusammengehoerige Aenderungen (`code + passende tests + minimale scope-doku`) duerfen und sollen in einem scoped Commit landen.
- Sobald eine Aufgabe, Subphase oder ein Workflow nach Verifikation fachlich abgeschlossen ist und geaenderte Repo-Dateien im Scope vorliegen, wird im selben Turn standardmaessig commitet.
- Kein bewusst offen gelassener eigener Worktree am Task-Ende, ausser der User fordert explizit nur Vorarbeit ohne Commit an, es fehlt noch notwendige Verifikation, oder mehrere Aenderungsstraenge sind noch nicht sauber trennbar.
- Bei mehreren unabhaengigen Liefer-Slices mehrere scoped Commits erstellen statt einen Sammelcommit.
- Keine kuenstlichen Mikro-Commits nur fuer Rule-Erfuellung; Split nur bei echtem Risiko (z. B. trennbare Migration, konflikttraechtiger Refactor, getrennte Verantwortungsbereiche).
- Umsetzungsplan-/Lock-Aenderungen sind kein eigener Pflicht-Commit mehr; separat nur bei reiner Governance-/Planpflege ohne Codewirkung.
- Commit-Preflight bleibt: eigene offenen Aenderungen vor neuem, unverbundenem Task sauber sichern oder bewusst im selben Delivery-Slice halten.
- Concise messages explaining *why*, not *what*. Types: `feat`, `fix`, `refactor`, `perf`, `chore`, `release`, `docs`.
- For immediate small corrections in the same delivery slice, use `git commit --amend`.
- Never use destructive history changes as default. Use `revert`/scoped restore first.

## Scope & Phase Validation

- Vor jedem Commit: `npm run scope:validate` empfohlen.
- Scope-Violations sind Hard-Fails (pre-commit Hook via lock-registry-merger).
- Lock-Status wird in `docs/lock-status/` verwaltet (distributed, pro Person).
- Phase-Sequenzierung wird von `phase:validate` unterstuetzt.
