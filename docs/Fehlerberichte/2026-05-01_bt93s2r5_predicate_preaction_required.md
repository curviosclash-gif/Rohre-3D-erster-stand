# Fehlerbericht: BT93S2R5 Predicate-/PreAction-Validity erforderlich

## Aufgabe/Kontext

- Task: `93S2R5.1`
- Ziel: die 33 roten `93S2R4.4`-Rows mit vollstaendigen Predicate-Operanden, Margins und PreAction-Metrics erneut schreiben.
- Datum: 2026-05-01

## Ergebnis

- Result: `resultClass=predicate-preaction-failure-ledger-written`, `ok=True`
- Failure-Ledger-Rows: `33`
- Unique Scenario/Seed/StartMetrics-Gruppen: `4`
- Replay-Attempts: `99`
- Predicate-Fail-Rows/Attempts: `33` / `99`
- MeasurementInvalidBeforeAction-Rows/Attempts: `33` / `99`
- Minimum-Window-Fails: `0`
- Warmup-Terminal-Before-Action: `0`
- Action-abhaengiger StartMetrics-Drift: `0`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

- `data/training/ppo/bt93s2r4/predicate_window_stable_replay_report.json`: resultClass=`predicate-window-required`, ok=`False`, reportHash=`330cdacc16cad14d6b7a3e467c85e305482d0c7e6c493084c94dc27a05532399`, gitSha=`d0e97d85843cc0a186e8a9723b063cd832c227fb`, sha256=`5977a6a0b60d6726a416eba73913f64879f4e041bdf8edb0fb390c655fbea1d5`
- `data/training/ppo/bt93s2r4/deterministic_reset_repair_report.json`: resultClass=`deterministic-reset-warmup-repair-green`, ok=`True`, reportHash=`8a7d79ac0064f927922159467da1f8b35abab18daf3ac7133dbb67f305d2aae7`, gitSha=`8c2f8b9017976e70df8bb95a8fcac53232aa5dca`, sha256=`67823c74d2ed82101923b2c17fdd80e65cb4ce8374efc9141aac32f659b1f498`
- `data/training/ppo/bt93s2r4/replay_identity_contract.json`: resultClass=`replay-identity-contract-green`, ok=`True`, reportHash=`32c77065344564c1ea02a0f748b4758f2fc5c99c552f1c64f7befd6f1405ddf2`, gitSha=`a736ffdaf284fedf3da43af9c6bf5d9ce2933e40`, sha256=`48f8fcf0312152d28f1a4d8de0beab67e2c317e9beb1bee8e71100ec49956547`
- `data/training/ppo/bt93s2r4/replay_root_cause_audit.json`: resultClass=`source-lock-root-cause-audit-written`, ok=`True`, reportHash=`d43a837e740aeeb69ac28e0873bc0e06c35a5b554c0f872266e5093574be03dd`, gitSha=`b16a4fb94bcde4daab95a19bfb1040f8eba22af7`, sha256=`462d3a0e56d5696f08ad62bd1f73f4e453db28c97d350f01694b9dd261d21582`
- `data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json`: resultClass=`replay-determinism-required`, ok=`True`, reportHash=`95d6d2314fd134e518c9f842c001b9bda74b97660707178584c07bf73c14cc05`, gitSha=`8ce1691c63a7cdff872e802303a9432306c2ad69`, sha256=`dc2b00c439b964cc2773e44452f60ea9e21bdc04591402ee3cae53ecb93e019b`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`: resultClass=`matrix-control-v3-contract-green`, ok=`True`, reportHash=`8baba49ca38aca05e8e5deee79164e41bf04ba56ee0d3dc21ab2073a922d1705`, gitSha=`62c600196ef2b1ffc11b590c738890f4363b5535`, sha256=`519a2197515b3faff378552e4c9b9538fe6ac4b7d63f3517738c8fa5d1f2b6ae`
- `python/envs/ppo_action_surface.py`: resultClass=`None`, ok=`None`, reportHash=`None`, gitSha=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
- `python/envs/curvios_env.py`: resultClass=`None`, ok=`None`, reportHash=`None`, gitSha=`None`, sha256=`2a12d75b327b10daef853cc242e6d81fb87c4ee838756d6cef1905d19de94d59`
- `scripts/training-headless-lane-runner.mjs`: resultClass=`None`, ok=`None`, reportHash=`None`, gitSha=`None`, sha256=`178bc721898fb3b853e17f9411035bc58aa9e224f603d6ec477751edc82c01bf`

## Befundmatrix

| Scenario | Seed | Rows | Actions | Min Margin | Action-Root-Cause | Hypothesen fuer 93S2R5.2 |
| --- | ---: | ---: | --- | ---: | --- | --- |
| `escape-right-open` | `930` | `8` | `boost, evade-right, pitch-up, roll-left, roll-right, shoot-mg, turn-right-boost, yaw-right` | `-0.05` | `disallowed-same-preaction-startmetrics` | `escape-right-fairness-predicate-required, predicate-expression-stale, seed-startstate-invalid` |
| `escape-right-open` | `1930` | `9` | `evade-left, evade-right, pitch-up, roll-left, roll-right, shoot-mg, turn-right-boost, yaw-left, yaw-right` | `-0.15` | `disallowed-same-preaction-startmetrics` | `escape-right-fairness-predicate-required, predicate-expression-stale, seed-startstate-invalid` |
| `narrowing-corridor` | `1934` | `3` | `evade-left, evade-right, pitch-up` | `-0.008571` | `disallowed-same-preaction-startmetrics` | `predicate-expression-stale, seed-startstate-invalid` |
| `no-danger-control` | `930` | `13` | `boost, evade-left, evade-right, noop, pitch-down, pitch-up, roll-left, roll-right, shoot-mg, turn-left-boost, turn-right-boost, yaw-left, yaw-right` | `-0.00978` | `disallowed-same-preaction-startmetrics` | `neutral-control-contract-required, predicate-expression-stale, seed-startstate-invalid` |

## Issues

- `measurement-invalid-before-action`: `33`
- `predicate-fail`: `33`

## No-Go-Status

`93S2R4.5`, `93S2R3.3-Reentry`, `BT93S2.3-Recheck`, `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben geschlossen. Action-Wirkung ist als Ursache in
S2R5.1 nicht erlaubt, weil die roten Gruppen nach Scenario/Seed stabile
PreAction-StartMetrics haben.

## Evidence

- `data/training/ppo/bt93s2r5/predicate_preaction_failure_ledger.json`
- Command: `python python/scripts/bt93s2r5_predicate_preaction_failure_ledger.py --write-report`

## Naechster Schritt

- Run 93S2R5.2 to choose exactly one repair class per unique Scenario/Seed/StartMetricsHash group and lock the repair contract.
- Do not start 93S2R4.5, 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.
