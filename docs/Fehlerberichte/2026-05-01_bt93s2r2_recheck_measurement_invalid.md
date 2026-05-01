# Fehlerbericht: BT93S2R2 Source-Lock und Failure-Taxonomie

## Aufgabe/Kontext

- Task: `BT93S2R2.1` nach rotem `BT93S2.3-Recheck`
- Ziel: Quellen locken und Recheck-Failures pro Szenario, Seed und Action mit genau einer Primaerklasse klassifizieren.
- Datum: 2026-05-01

## Quellen-Lock

- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`: role=`red BT93S2.3-Recheck source`, resultClass=`measurement-invalid`, ok=`False`, sha256=`b7f2f74def84beb958c6164e7084aadfd528237760ee7fb8b41660a2ba698537`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`: role=`matrix/control-v3 source contract`, resultClass=`matrix-control-v3-contract-green`, ok=`True`, sha256=`519a2197515b3faff378552e4c9b9538fe6ac4b7d63f3517738c8fa5d1f2b6ae`
- `data/training/ppo/bt93s2r/matrix_control_reentry_gate_report.json`: role=`BT93S2R empirical reentry gate`, resultClass=`matrix-control-reentry-green`, ok=`True`, sha256=`100f4da28f572b1905a42e77ddbd6a3e304807904f7daa7a6ce79fb37a21208f`
- `data/training/ppo/bt93s2r/bt93s2r_closure_gate_report.json`: role=`BT93S2R closure gate`, resultClass=`matrix-control-reentry-green`, ok=`True`, sha256=`f75d93a843dac054a676ed9f622e5739a4e79828acbbfd651558a8315aa73a15`
- `python/envs/ppo_action_surface.py`: role=`read-only PPO action-surface decoder source`, resultClass=`None`, ok=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
- `python/scripts/bt93s2r2_failure_taxonomy.py`: role=`BT93S2R2.1 taxonomy generator`, resultClass=`None`, ok=`None`, sha256=`081c9cbb39ebc4a49036736433ee7b60a9eecfc5b31b802e81724e6c5f47ea71`

Git-SHA: `f6dae7b795ac66454e007ce97390aefbc8fa5a6c`
MatrixId: `bt93s2r-walltrail-action-effect-matrix-v3`
ContractId: `bt93s2r-walltrail-action-effect-window-v3`
ActionSurfaceId: `bt93q-walltrail-semantic-action-v1`
Decoder-Hash: `970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`

## Roter Ausgangsbefund

- Source-Result: `resultClass=measurement-invalid`, `ok=False`
- ProbeCount: `338`
- Predicate-Fails: `36`
- Minimum-Window-Fails: `8`
- Taxonomy-Failure-Rows: `103`

## Root-Cause-Verteilung

- `direction-contract-mismatch`: `21`
- `env-measurement-drift`: `11`
- `minimum-window-fail`: `7`
- `negative-control-fail`: `1`
- `neutral-control-unstable`: `26`
- `start-metrics-drift`: `36`
- `warmup-seed-drift`: `1`

## Szenario-Verteilung

- `escape-left-open`: `20`
- `escape-right-open`: `22`
- `frontal-near-wall`: `6`
- `narrowing-corridor`: `9`
- `no-danger-control`: `26`
- `side-wall-left`: `3`
- `side-wall-right`: `1`
- `trail-ahead`: `8`
- `trail-side`: `8`

## Bewertung

`BT93S2R2.1` ist als Source-Lock/Taxonomie abgeschlossen. Der rote Status bleibt
fachlich blockierend: `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/failure_taxonomy_report.json`
- Command: `python python/scripts/bt93s2r2_failure_taxonomy.py --write-report`

## Naechster Schritt

`93S2R2.2` muss Predicate-Ausdruck, Predicate-Funktion, StartMetrics, Warmup,
Seeds, Session-ID und Minimum-Window gegen echte StartMetrics abgleichen und
nur belegte Matrix-/Control-Reparaturen schreiben.
