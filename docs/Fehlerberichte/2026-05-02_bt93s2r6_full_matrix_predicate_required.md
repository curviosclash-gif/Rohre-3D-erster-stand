# Fehlerbericht: BT93S2R6 Full-Matrix Predicate Required

## Kontext

- Task: `93S2R6.1`
- Quelle: rotes `93S2R3.4=predicate-window-required`
- Ziel: Full-Matrix Failure-Ledger und Non-Coverage-Audit nach S2R5-Gruen.

## Ergebnis

- Result: `resultClass=full-matrix-failure-ledger-written`, `ok=True`
- Failure-Ledger-Rows: `20`
- Predicate-Fails: `19`
- MeasurementInvalidBeforeAction: `19`
- Minimum-Window-Fails: `1`
- Retained-v2 MeasurementInvalid: `10`
- StartState-Gruppen: `4`
- SiblingExpansionCount: `52`
- S2R5-covered current red rows: `0`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

- `data/training/ppo/bt93s2r3/empirical_zero_gate_report.json`: resultClass=`predicate-window-required`, ok=`False`, reportHash=`11726cf75018cc9441fcc07756e82af29a029ce5ba11c8243587ba0198d3d6a0`, sha256=`1fc9d3fed82cb002078edb20078fdc8bc8e23fa3080d417fd891925015077036`
- `data/training/ppo/bt93s2r3/direction_fairness_neutral_contract.json`: resultClass=`direction-fairness-neutral-contract-green`, ok=`True`, reportHash=`a7b45f77db3e6de9b1738496dcd717394450fb9af1e8f3bd665dd021a9dede85`, sha256=`e921aad747d53d835f2aef3843ef6fcf1fdb0d8b5a0d6fcaf3f5b7b2428ffdb9`
- `data/training/ppo/bt93s2r5/predicate_preaction_repair_contract.json`: resultClass=`predicate-preaction-repair-contract-written`, ok=`True`, reportHash=`2b57a10268cf51d5aec64ecaa2f196374bfdc30ec7a13e36b8532182720481d0`, sha256=`1920d366fb4ee58f13a97267ad503949336d4cd4974a38e6bb142c90e1707872`
- `data/training/ppo/bt93s2r5/bt93s2r5_closure_gate_report.json`: resultClass=`predicate-window-repair-green`, ok=`True`, reportHash=`8db2b8d5ac673a01fed8d3ff42e9fced78ff7d6e7498ceec11c92243759f0b4c`, sha256=`ecbacc356dc1c821fbcdb0fe4b2400a44f6377e251214b4964d043aec12bcc01`
- `data/training/ppo/bt93s2r4/full_replay_preflight_gate.json`: resultClass=`replay-startstate-green`, ok=`True`, reportHash=`d8d85389b0fb9e5f672723277344d5b48bcc6ee603f7d748dc44e6cdd19104f2`, sha256=`83e30c94f28d9167ac5ab36630175a6106d84ba39d018ebba90b5de668f6197e`
- `data/training/ppo/bt93s2r4/bt93s2r4_closure_gate_report.json`: resultClass=`replay-startstate-green`, ok=`True`, reportHash=`a9d54e34718a9dcc05e65e075231d7e36139598898681f37694572653e5bf997`, sha256=`e905b6fc9fb94b0aece0504ea8eafbf88bbf0796a5edda55e5ecc955697e8328`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`: resultClass=`matrix-control-v3-contract-green`, ok=`True`, reportHash=`8baba49ca38aca05e8e5deee79164e41bf04ba56ee0d3dc21ab2073a922d1705`, sha256=`519a2197515b3faff378552e4c9b9538fe6ac4b7d63f3517738c8fa5d1f2b6ae`
- `python/envs/ppo_action_surface.py`: resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`

## Befundmatrix und S2R5-Coverage-Gap

| Scenario | Seed | Aktuelle rote Actions | Sibling-Actions | S2R5-covered Actions | Uncovered aktuelle rote Actions | Root-Cause-Hypothesen |
| --- | ---: | --- | ---: | --- | --- | --- |
| `escape-right-open` | `1930` | `boost, noop, pitch-down, turn-left-boost` | `13` | `evade-left, evade-right, pitch-up, roll-left, roll-right, shoot-mg, turn-right-boost, yaw-left, yaw-right` | `boost, noop, pitch-down, turn-left-boost` | `full-matrix-seed-startstate-required, predicate-contract-required` |
| `escape-right-open` | `930` | `evade-left, noop, pitch-down, turn-left-boost, yaw-left` | `13` | `boost, evade-right, pitch-up, roll-left, roll-right, shoot-mg, turn-right-boost, yaw-right` | `evade-left, noop, pitch-down, turn-left-boost, yaw-left` | `full-matrix-seed-startstate-required, predicate-contract-required` |
| `narrowing-corridor` | `1934` | `boost, noop, pitch-down, roll-left, roll-right, shoot-mg, turn-left-boost, turn-right-boost, yaw-left, yaw-right` | `13` | `evade-left, evade-right, pitch-up` | `boost, noop, pitch-down, roll-left, roll-right, shoot-mg, turn-left-boost, turn-right-boost, yaw-left, yaw-right` | `retained-v2-seed-startstate-required, predicate-contract-required` |
| `narrowing-corridor` | `2934` | `pitch-up` | `13` | `-` | `pitch-up` | `minimum-window-contract-required, metric-sampling-contract-required` |

## No-Go-Status

`93S2R3.99`, `BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate,
Freeze, Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.
S2R5-Gruen ist nur 103-Row-Subset-Evidence und kein 338-Probe-Full-Matrix-Gruen.

## Evidence

- `data/training/ppo/bt93s2r6/full_matrix_failure_ledger.json`
- Command: `python python/scripts/bt93s2r6_full_matrix_failure_ledger.py --write-report`

## Naechster Schritt

- Run 93S2R6.2 to classify each unique red Scenario/Seed/StartState group with exactly one primary repair class and lock the repair contract.
- Do not start 93S2R6.3/4/99, 93S2R3.4-Recheck, 93S2R3.99, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95 yet.
