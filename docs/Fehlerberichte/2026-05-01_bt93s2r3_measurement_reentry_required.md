# Fehlerbericht: BT93S2R3 Measurement-Reentry erforderlich

## Aufgabe/Kontext

- Task: `93S2R3.1`
- Quelle: `BT93S2R2.99=measurement-invalid`, `opensNext=[]`
- Ziel: Source-Lock und eigenes Failure-Ledger fuer den engen S2R3-Messgueltigkeits-Reentry.

## Source-Lock

- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`: role=`red BT93S2.3-Recheck source`, resultClass=`measurement-invalid`, ok=`False`, sha256=`b7f2f74def84beb958c6164e7084aadfd528237760ee7fb8b41660a2ba698537`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`: role=`BT93S2R matrix/control-v3 contract`, resultClass=`matrix-control-v3-contract-green`, ok=`True`, sha256=`519a2197515b3faff378552e4c9b9538fe6ac4b7d63f3517738c8fa5d1f2b6ae`
- `data/training/ppo/bt93s2r/bt93s2r_closure_gate_report.json`: role=`BT93S2R green closure`, resultClass=`matrix-control-reentry-green`, ok=`True`, sha256=`f75d93a843dac054a676ed9f622e5739a4e79828acbbfd651558a8315aa73a15`
- `data/training/ppo/bt93s2r2/failure_taxonomy_report.json`: role=`BT93S2R2.1 failure taxonomy`, resultClass=`failure-taxonomy-source-lock-red-status-written`, ok=`True`, sha256=`846abd86692a08407c6354e1038f8650d0e1f280bfdaf8a80aca2c77e519f647`
- `data/training/ppo/bt93s2r2/predicate_window_repair_contract.json`: role=`BT93S2R2.2 predicate/window repair contract`, resultClass=`predicate-window-repair-contract-green`, ok=`True`, sha256=`1347893998c73af94e8171584e24b8c0a7347cdd216670db113a77dd58d4109e`
- `data/training/ppo/bt93s2r2/empirical_reentry_gate_report.json`: role=`BT93S2R2.3 empirical reentry gate`, resultClass=`measurement-invalid`, ok=`False`, sha256=`0ba311bf779ed66b7bfa2706b3431d8a1c2edbc35b77cd9247dd32aed31de177`
- `data/training/ppo/bt93s2r2/bt93s2r2_closure_gate_report.json`: role=`BT93S2R2.99 red closure`, resultClass=`measurement-invalid`, ok=`True`, sha256=`9465bd6a6061c0b81022cb885b8d5d485d8e675fceea23add06d5ed31f01fdb1`
- `python/envs/ppo_action_surface.py`: role=`read-only PPO action-surface decoder`, resultClass=`None`, ok=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
- `python/scripts/bt93s2r3_failure_ledger.py`: role=`BT93S2R3.1 failure ledger generator`, resultClass=`None`, ok=`None`, sha256=`1655dd6bce60c1449eec0b3d01f3de08143b2653432662647d5223669e003fc9`

Git-SHA: `8464cc085fc4b1d4bba98e5abe7ec8c86e205b40`
MatrixId: `bt93s2r-walltrail-action-effect-matrix-v3`
ContractId: `bt93s2r-walltrail-action-effect-window-v3`
ActionSurfaceId: `bt93q-walltrail-semantic-action-v1`
Decoder-Hash: `970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`

## Ledger-Befund

- Failure-Ledger-Rows: `103`
- Probes: `338`
- Predicate-Fails: `39`
- Minimum-Window-Fails: `11`
- Measurement-Invalid: `49`
- Direction-Mismatches: `24`
- Escape-Right-Fairness-Fails: `1`
- Retained-v2-Measurement-Invalid: `28`
- Neutral-Control-Required: `1`
- Training/Holdout/Optimizer: `0/0/0`

## Primaerklassen

- `direction-contract-mismatch`: `21`
- `env-measurement-drift`: `11`
- `minimum-window-fail`: `7`
- `negative-control-fail`: `1`
- `neutral-control-unstable`: `26`
- `start-metrics-drift`: `36`
- `warmup-seed-drift`: `1`

## Sekundaerklassen

- `direction-contract-required`: `7`
- `escape-right-fairness-required`: `2`
- `measurement-invalid`: `30`
- `negative-control-source-history`: `1`
- `neutral-control-required`: `26`
- `predicate-window-required`: `55`
- `replay-determinism-required`: `37`
- `retained-v2-measurement-required`: `7`

## Bewertung

`93S2R3.1` ist nur Source-Lock und Ledger. Der Blocker ist nicht geloest:
`BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate, BT95 und Runtime bleiben geschlossen.

## Evidence

- `data/training/ppo/bt93s2r3/failure_ledger_report.json`
- Command: `python python/scripts/bt93s2r3_failure_ledger.py --write-report`

## Naechster Schritt

`93S2R3.2` muss Replay-Determinismus, StartMetrics, Warmup, Predicate und
Minimum-Window vor jeder Action-Wirkung fail-fast pruefen. Erst ein spaeteres
gruener `93S2R3.99` darf maximal einen frischen `BT93S2.3-Recheck` oeffnen.
