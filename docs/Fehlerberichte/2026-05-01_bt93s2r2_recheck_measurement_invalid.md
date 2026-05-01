# Fehlerbericht: BT93S2R2 Predicate-/Window-Reentry

## Aufgabe/Kontext

- Task: `BT93S2R2.2` nach rotem `BT93S2.3-Recheck`
- Ziel: Predicate-Ausdruck, Predicate-Funktion, StartMetrics, Warmup, Seeds, Session-ID und Minimum-Window gegen echte Recheck-StartMetrics abgleichen.
- Datum: 2026-05-01

## Quellen-Lock

- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`: role=`red BT93S2.3-Recheck source`, resultClass=`measurement-invalid`, ok=`False`, sha256=`b7f2f74def84beb958c6164e7084aadfd528237760ee7fb8b41660a2ba698537`
- `data/training/ppo/bt93s2r2/failure_taxonomy_report.json`: role=`BT93S2R2.1 source-lock taxonomy`, resultClass=`failure-taxonomy-source-lock-red-status-written`, ok=`True`, sha256=`846abd86692a08407c6354e1038f8650d0e1f280bfdaf8a80aca2c77e519f647`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`: role=`BT93S2R matrix/control-v3 contract`, resultClass=`matrix-control-v3-contract-green`, ok=`True`, sha256=`519a2197515b3faff378552e4c9b9538fe6ac4b7d63f3517738c8fa5d1f2b6ae`
- `data/training/ppo/bt93s2r/matrix_control_reentry_gate_report.json`: role=`BT93S2R empirical reentry gate`, resultClass=`matrix-control-reentry-green`, ok=`True`, sha256=`100f4da28f572b1905a42e77ddbd6a3e304807904f7daa7a6ce79fb37a21208f`
- `data/training/ppo/bt93s2r/bt93s2r_closure_gate_report.json`: role=`BT93S2R closure gate`, resultClass=`matrix-control-reentry-green`, ok=`True`, sha256=`f75d93a843dac054a676ed9f622e5739a4e79828acbbfd651558a8315aa73a15`
- `python/envs/ppo_action_surface.py`: role=`read-only PPO action-surface decoder`, resultClass=`None`, ok=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
- `python/scripts/bt93s2r2_predicate_window_repair.py`: role=`BT93S2R2.2 repair-contract generator`, resultClass=`None`, ok=`None`, sha256=`a28b9972b4967256b93d265f5d7921caee7aa5c2a01650fd8c506a20cb9fe992`

Git-SHA: `cb7074f1e4ad668f294feb747f9f24ac9235a9a4`
MatrixId: `bt93s2r-walltrail-action-effect-matrix-v3`
ContractId: `bt93s2r-walltrail-action-effect-window-v3`
RepairContractId: `bt93s2r2-predicate-window-repair-contract-v1`
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

## Predicate-/Window-Repair

- Result: `resultClass=predicate-window-repair-contract-green`, `ok=True`
- RepairContract: `bt93s2r2-predicate-window-repair-contract-v1`
- Expression/Function-Disagreements: `0`
- Expression-Eval-Errors: `0`
- Repaired Scenarios: `9`
- ActionSurface-/Reward-/Telemetry-/Runtime-/Training-Aenderungen: `0`

Phase-Coverage:

- `93S2R2.2.1`: `True`
- `93S2R2.2.2`: `True`
- `93S2R2.2.3`: `True`

Contract-Blocker:

- `expressionFunctionDisagreementCount`: `0`
- `expressionEvalErrorCount`: `0`
- `missingSourceScenarioCount`: `0`

## Bewertung

`BT93S2R2.2` schreibt nur einen Predicate-/Window-/Control-Repair-Vertrag. Der
rote Recheck-Status bleibt blockierend, bis `93S2R2.3` echte Env-Proben mit
Null-Counts schreibt und danach ein neuer `BT93S2.3-Recheck` `measurementValid=true`
belegt. `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote,
Rollout, PPO-Validate und BT95 bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r2/predicate_window_repair_contract.json`
- Command: `python python/scripts/bt93s2r2_predicate_window_repair.py --write-report`

## Naechster Schritt

`93S2R2.3` muss den Repair-Vertrag gegen echte Env-Proben validieren und
`predicateFailureCount=0`, `minimumWindowFailureCount=0`,
`measurementInvalidCount=0`, `negativeControlFailedCount=0` und
`directionMismatchCount=0` schreiben. Kein `93S2.4` vor dem spaeteren frischen
S2.3-Recheck.
