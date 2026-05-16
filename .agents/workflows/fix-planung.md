---
description: Execute the next open phase from master plan with dynamic N-bot parallel support.
---

## 0. Read status

// turbo
- Optional: `git pull --rebase`.
- `npm run guard:main`.
- Read `docs/Umsetzungsplan.md`.
- Read the linked `docs/plaene/aktiv/VXX.md` for the claimed block before execution.
- If the requested scope is bot-training, stop here and switch to `/bot-training-plan`; `/fix-planung` is only for `VXX` blocks backed by `docs/plaene/aktiv/`.
- `git log -n 5 --oneline`.
- `npm run plan:check`.

## 1. Claim phase (parallel-safe)

- Identify your Bot-ID from the kickoff command (for example `/fix-planung Bot-1`).
- Select the claimed `VXX` block from `docs/Umsetzungsplan.md`.
- Execute only blocks already manually integrated by the user.
- Do not create new blocks or planning scopes directly in master plans.
- Find first block whose lock status is `frei` and whose hard dependencies are fulfilled.
- Operativer Lock-Wahrheitsraum ist `docs/lock-status/*.json`.
- Claim ueber Lock-Tooling statt Masterplan-Edit:
  - `npm run lock:claim VXX <person> -- --phase=<VXX.Y.Z> --target="YYYY-MM-DD"`
  - danach `npm run lock:validate`
- Bot-training-Claims laufen nicht ueber diesen Pfad; dafuer `/bot-training-plan` verwenden.
- Lock-only Claim-Commits sind nicht mehr Default; Lock-Aenderungen werden mit der ersten fachlichen Lieferung oder einem gezielten Sync-Commit gebuendelt.
- If no free block exists: report `Kein freier Block` and stop.
- Treat `scope_files` in `docs/plaene/aktiv/VXX.md` as canonical ownership for claimed scope.

## 2. Scope next phase

- Identify first open phase (`[ ]`) in claimed block.
- List open sub-phases and affected files.
- Check `scope_files` in the linked block file for conflicts.
- For `[REVIEW]` or `[USER-GATE]` phases, classify affected files/surfaces before asking or using a User-Gate: `no-op`, `read-only evidence`, `optional`, `edit required`. Continue only with the `edit required` scope that is covered by the gate.
- If the phase touches suspected dead code or legacy paths, require candidate classification plus successor/delete criteria before execution.
- If phase has no sub-phases: create/update an external plan in `docs/plaene/neu/` and wait for manual intake by the user.

## 3. Execute

- Run `/code` workflow with `fix:` or `refactor:` prefix as fitting.
- `/code` remains source of truth for implementation verification.
- For non-`*.99` phases, adapt tests or smokes as needed but defer broad suite execution unless user explicitly asks.
- Kleine risikoadjustierte Checks vor `*.99` sind erlaubt.
- Remove old code in phase work only when a newer productive path or exact duplicate-/shim-replacement is evidenced; otherwise keep and mark the path explicitly.
- If the user explicitly requests Playwright validation, parallel runs require unique `TEST_PORT`, `PW_RUN_TAG`, `PW_OUTPUT_DIR` per bot.

## 4. Close phase

- Mark sub-phase and phase checkboxes done.
- Every `[x]` entry must include evidence format:
  - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
- Keep gate invariant intact (`*.99` only when prior phases are `[x]`).
- For non-`*.99` phases, record pending block-end verification scope when full suite execution is deferred.
- If the phase handled dead code or legacy paths, record replacement proof or explicit retention reason in the block evidence before closing.
- Abgeschlossene Phasenarbeit mit Repo-Aenderungen nicht uncommitted lassen: nach Gate/Evidence folgt ein scoped Commit im selben Turn.
- Erklaerende Commit-Notizen sind Pflicht: kurz festhalten, warum der Slice noetig war und welcher beobachtbare Effekt erreicht wurde.
- Gate-Strategie:
  - `*.99` oder Docs-/Governance-/Graph-Scope: `npm run gates:pre-commit`
  - sonst mindestens `npm run plan:check` plus kleinste sinnvolle Zusatzchecks.

## 5. Release block

- Lock erst releasen, nachdem der zugehoerige Delivery-Slice commitet oder ein expliziter Abschluss-Blocker dokumentiert wurde.
- Lock ueber `npm run lock:release VXX <person>` freigeben und `npm run lock:validate` laufen lassen.
- Master-Lock-Tabelle ist ein synchronisierter Index, nicht der operative Claim-/Release-Mechanismus.
- Lock-only Release-Commits sind nicht verpflichtend.

## Report

Standardformat verwenden. Set `Next Step` to `/fix-planung`.
