---
description: Check and auto-update docs/workflows/rules to current repository reality.
decision_floor: D3
mutates: required
user_gate: required
commit_strategy: scoped
required_checks:
  - npm run docs:check
  - npm run plan:check
outputs:
  - repo-change
  - report
---

## 0. Context

// turbo
- Read `docs/Umsetzungsplan.md`, `docs/bot-training/Bot_Trainingsplan.md`, optional historical baseline `docs/archive/Analysebericht.md`, latest `docs/tests/Testergebnisse_*.md` where relevant.
- Sample linked files in `docs/plaene/aktiv/` when syncing active-block wording or ownership.
- `git log -n 5 --oneline`.
- `npm run guard:main`.

## 1. Auto-sync

// turbo
- `npm run docs:sync`
- Review findings in `docs/prozess/Dokumentationsstatus.md`; der Sync aktualisiert nur diesen Report und datiert keine Referenzdokumente automatisch um.

## 2. Resolve remaining drift

- Nur reale Drift korrigieren (Legacy-Pfad-Funde, fehlende Pflichtdateien, veraltete Aussagen).
- Keine kosmetische Meta-Produktion ohne Produkt- oder Governance-Nutzen.
- Nach inhaltlichen Korrekturen `npm run docs:sync` erneut laufen lassen.

## 3. Validate governance + docs

// turbo
- `npm run plan:check`
- `npm run docs:check`

## 4. Commit

- `npm run guard:main`
- Nur geaenderte Scope-Dateien stagen (kein pauschales `docs/`-Bulk-Add).
- Wenn der Sync-Lauf abgeschlossen ist und Drift behoben wurde, den scoped Commit direkt im selben Turn erstellen.
- Ergaenze eine kurze Sync-Notiz im passenden Doku-Kontext, die die relevante Drift und den Grund fuer den Commit benennt.
- `npm run agent:commit -- --message="docs: sync documentation and plan governance" --workflow=aktualitaet-sync --decision=D3 --evidence="npm run docs:check -> PASS" --gate="<explizite User-Freigabe>" --residual-risk="<Restrisiko>" --not-checked="<nicht geprueft>"`
- Before push on `main`: `npm run snapshot:tag`

## 5. Optional reality checks

// turbo
- `npm run smoke:roundstate` und `npm run smoke:selftrail` nur wenn Claims explizit auf diese Runtime-Signale referenzieren.

## Gate

- `npm run plan:check` PASS.
- `npm run docs:check` PASS.
- `docs/prozess/Dokumentationsstatus.md` reflects current date.

## Report

Standardformat verwenden.
