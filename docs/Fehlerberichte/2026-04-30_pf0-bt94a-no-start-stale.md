# PF.0 bt94a-no-start-stale

Datum: 2026-04-30

## Kontext

PF.0 wurde als R-X Preflight nach `BT93Q.99=policy-collapse-active` ausgefuehrt.
Ziel war Branch-/Plan-/Graph-/No-Start-/Roadmap-/Terminal-Sanity vor `BT93R.1` und `93X.0`.

## Befund

`data/training/ppo/bt93r/bt93r_preflight_gate_sync_report.json` meldet `resultClass=bt94a-no-start-stale`.
Branch, Plan-/Docs-Gates, Knowledge-Graph, Roadmap und Terminal-Raw-Sanity sind gruen.
`data/training/ppo/bt94a/no_start_gate.json` bleibt rot, ist aber fuer R-X stale: beobachtete Quelle `BT93M`, erwartete frische Quelle `BT93Q`.

## Reproduktion

- `python python/scripts/bt93r_preflight_gate_sync.py --write-report`
- `npm.cmd run gates:pre-commit`

## Betroffene Dateien

- `python/scripts/bt93r_preflight_gate_sync.py`
- `data/training/ppo/bt93r/bt93r_preflight_gate_sync_report.json`
- `python/scripts/bt94a_gate_check.py`
- `data/training/ppo/bt94a/no_start_gate.json`
- `docs/bot-training/Bot_Trainingsplan.md`

## Versuchte Fixes

- Knowledge-Graph per `npm.cmd run graph:build` aktualisiert.
- BT94A-Self-Dependency im Plan entfernt.
- `BT93W` um `93W.99` Abschluss-Gate ergaenzt.
- `npm.cmd run gates:pre-commit` danach erfolgreich.

## Status

PF.0 ist rot abgeschlossen. `BT93R.1` und `93X.0` bleiben blockiert, bis `bt94a_gate_check.py` die R-X-Source-Prioritaet abbildet: `BT93P -> BT93X -> BT93O -> BT93W -> BT93Q`; BT93M/BT93I/BT93C duerfen nur Kontext sein.

## Naechste Handlungsempfehlungen

1. `python/scripts/bt94a_gate_check.py` um R-X-Source-Prioritaet erweitern, weil PF.0 nur an stale No-Start-Freshness scheitert.
2. Danach `bt94a_gate_check.py --write-report` und `bt93r_preflight_gate_sync.py --write-report` erneut ausfuehren, weil nur ein frischer No-Start-Report `preflight-green` oder den naechsten echten Blocker erzeugen darf.
3. Erst bei `PF.0=preflight-green` `BT93R.1` claimen; der naechste Bot-Training-Fix muss Policy-Collapse/Modell-/Logit-/Normalize-Evidence bearbeiten, keine PPO-Langlaeufe starten.

Next Step: `/fix-planung`
