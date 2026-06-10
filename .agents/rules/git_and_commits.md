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
- Stage only scoped files (`git add [files]`); verify staged scope via `git diff --cached --name-only` and remaining worktree changes via `git status --short`. Niemals `git add .` oder `git add -A`.
- Agent-Commits laufen ueber `npm run agent:commit -- --message="..." --workflow=<name> --decision=<D0-D4> --evidence="<command> -> PASS" ...`; der Wrapper leitet `Scope` und `Known-uncommitted` aus dem Git-Index ab, validiert denselben Envelope wie der Commit-Hook und staged keine Dateien selbst.
- Der V138-Diff-Audit (`scripts/check-ai-diff-audit.mjs`) ist Teil des `agent:commit`-Preflights und blockiert bei Violations (Exit 1). Er ist damit fuer alle Agent-Commits durchgesetzt; manuelle User-Commits sind bewusst ausgenommen (kein Envelope vorhanden). Manueller Lauf: `npm run check:ai-diff-audit`.
- Commits folgen fachlichen Delivery-Slices: zusammengehoerige Aenderungen (`code + passende tests + minimale scope-doku`) duerfen und sollen in einem scoped Commit landen.
- Sobald eine Aufgabe, Subphase oder ein Workflow nach Verifikation fachlich abgeschlossen ist und geaenderte Repo-Dateien im Scope vorliegen, wird im selben Turn standardmaessig commitet.
- Kein bewusst offen gelassener eigener Worktree am Task-Ende, ausser der User fordert explizit nur Vorarbeit ohne Commit an, es fehlt noch notwendige Verifikation, oder mehrere Aenderungsstraenge sind noch nicht sauber trennbar.
- Bei mehreren unabhaengigen Liefer-Slices mehrere scoped Commits erstellen statt einen Sammelcommit.
- Keine kuenstlichen Mikro-Commits nur fuer Rule-Erfuellung; Split nur bei echtem Risiko (z. B. trennbare Migration, konflikttraechtiger Refactor, getrennte Verantwortungsbereiche).
- Umsetzungsplan-/Lock-Aenderungen sind kein eigener Pflicht-Commit mehr; separat nur bei reiner Governance-/Planpflege ohne Codewirkung.
- Commit-Preflight bleibt: eigene offenen Aenderungen vor neuem, unverbundenem Task sauber sichern oder bewusst im selben Delivery-Slice halten.
- Concise messages explaining *why*, not *what*. Types: `feat`, `fix`, `refactor`, `perf`, `chore`, `release`, `docs`.
- Jeder eigene Abschluss-Commit braucht zusaetzlich kurze erklaerende Notizen zum Zweck, Risiko oder Nutzer-/Workflow-Effekt.
- Plangebundene Arbeit dokumentiert diese Notizen im aktiven Block und/oder in `docs/plaene/CHANGELOG.md`; nicht plangebundene Repo-Arbeit hinterlaesst sie im naechstliegenden Governance-/Status-Kontext.
- For immediate small corrections in the same delivery slice, use `git commit --amend`.
- Never use destructive history changes as default. Use `revert`/scoped restore first.

## Scope & Phase Validation

- Default ist Single-Agent-Betrieb: kein Claiming, kein Locking, keine Lock-Pflege-Commits.
- Das Lock-Tooling (`lock:claim`, `lock:release`, `lock:advance`, `lock:validate`, `docs/lock-status/`) ist opt-in und nur fuer expliziten Multi-Agent-/Team-Betrieb gedacht (siehe `.agents/workflows/teamwork-coordination.md`).
- Der pre-commit Hook validiert Locks nur noch, wenn `docs/lock-status/`-Dateien selbst staged sind.
- Scope-Disziplin bleibt: nur Dateien aus dem aktiven Block-/Task-Scope anfassen; `scope_files` in `docs/plaene/aktiv/VXX.md` sind die kanonische Ownership-Quelle.
- Phase-Sequenzierung wird von `phase:validate` unterstuetzt.
