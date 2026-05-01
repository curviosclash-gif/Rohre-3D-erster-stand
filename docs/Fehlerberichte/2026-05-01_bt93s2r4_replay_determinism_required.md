# Fehlerbericht: BT93S2R4 Replay-Determinismus erforderlich

## Aufgabe/Kontext

- Task: `93S2R4.1`
- Quelle: `93S2R3.2=replay-determinism-required`, `preflightGreen=false`, `opensNext=[]`
- Ziel: Source-Lock und Root-Cause-Audit fuer alle 103 roten Replay-Preflight-Rows.

## Ergebnis

- Result: `resultClass=source-lock-root-cause-audit-written`, `ok=True`
- Audit-Rows: `103`
- Replay-Attempts Quelle: `206`
- Source-Mismatch: `103`
- Repeat-Mismatch: `103`
- StartState/StartMetrics-Drift: `103`
- EnvReset-Verdacht: `103`
- Seed/RNG-Verdacht: `103`
- Metric-Sampling-Verdacht: `103`
- Hash-Rezept-/Session-ID-Drift: `103` / `103`
- Predicate-Fails nach Replay: `25`
- Minimum-Window-Fails nach Replay: `3`
- Measurement-Invalid-Before-Action: `27`
- Action-Effect-Overrides: `0`
- Training/Holdout/Optimizer: `0/0/0`

## Source-Lock

- `data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json`: role=`red BT93S2R3.2 replay/predicate/window preflight`, resultClass=`replay-determinism-required`, ok=`True`, reportHash=`95d6d2314fd134e518c9f842c001b9bda74b97660707178584c07bf73c14cc05`, sha256=`dc2b00c439b964cc2773e44452f60ea9e21bdc04591402ee3cae53ecb93e019b`
- `data/training/ppo/bt93s2r3/failure_ledger_report.json`: role=`BT93S2R3.1 source-lock and failure ledger`, resultClass=`source-lock-failure-ledger-written`, ok=`True`, reportHash=`1fba6d7ff3c348176d8ab80db4b0a03a35fa20c7a8b3902de8cc07fd4503cce4`, sha256=`901adc50c2a2d9eb33be2d934452656f660c2849c0e2b89f429479f825c12e3b`
- `data/training/ppo/bt93s2r2/bt93s2r2_closure_gate_report.json`: role=`BT93S2R2.99 red closure`, resultClass=`measurement-invalid`, ok=`True`, reportHash=`496b59812edebb85d613c4ff37de8a048f228dcf80aaaae17abf1268b30b57c1`, sha256=`9465bd6a6061c0b81022cb885b8d5d485d8e675fceea23add06d5ed31f01fdb1`
- `data/training/ppo/bt93s2r2/empirical_reentry_gate_report.json`: role=`BT93S2R2.3 empirical red gate`, resultClass=`measurement-invalid`, ok=`False`, reportHash=`df275a60bc8b73434fc716f6146fbb34e417bf20f5e8c0901436307e0b9e73a4`, sha256=`0ba311bf779ed66b7bfa2706b3431d8a1c2edbc35b77cd9247dd32aed31de177`
- `data/training/ppo/bt93s2r2/predicate_window_repair_contract.json`: role=`BT93S2R2.2 predicate/window repair contract`, resultClass=`predicate-window-repair-contract-green`, ok=`True`, reportHash=`f77d357703a5afe5f8710f48ef5e28869624cc3c0b9ba21329c61f8b22c44701`, sha256=`1347893998c73af94e8171584e24b8c0a7347cdd216670db113a77dd58d4109e`
- `data/training/ppo/bt93s2r2/failure_taxonomy_report.json`: role=`BT93S2R2.1 failure taxonomy`, resultClass=`failure-taxonomy-source-lock-red-status-written`, ok=`True`, reportHash=`219f36940b4420bcd4cfff65f4b5f6bb9379d0353df0d9ae1c183c8f7c88792c`, sha256=`846abd86692a08407c6354e1038f8650d0e1f280bfdaf8a80aca2c77e519f647`
- `data/training/ppo/bt93s2r/bt93s2r_closure_gate_report.json`: role=`BT93S2R green closure`, resultClass=`matrix-control-reentry-green`, ok=`True`, reportHash=`49eac711c432d17da6d3bd63766664267e773edd9c1403b190eb3ed45cda01ee`, sha256=`f75d93a843dac054a676ed9f622e5739a4e79828acbbfd651558a8315aa73a15`
- `data/training/ppo/bt93s2r/matrix_control_reentry_gate_report.json`: role=`BT93S2R.4 matrix/control reentry gate`, resultClass=`matrix-control-reentry-green`, ok=`True`, reportHash=`6888cc6ceb69b3138d2d8f6a9a73fd8d0acd7ca0efddcb6f69e4064603a74f71`, sha256=`100f4da28f572b1905a42e77ddbd6a3e304807904f7daa7a6ce79fb37a21208f`
- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`: role=`BT93S2R.3 matrix/control-v3 contract`, resultClass=`matrix-control-v3-contract-green`, ok=`True`, reportHash=`8baba49ca38aca05e8e5deee79164e41bf04ba56ee0d3dc21ab2073a922d1705`, sha256=`519a2197515b3faff378552e4c9b9538fe6ac4b7d63f3517738c8fa5d1f2b6ae`
- `data/training/ppo/bt93s2/existing_action_effect_v3_recheck_report.json`: role=`red BT93S2.3-Recheck source`, resultClass=`measurement-invalid`, ok=`False`, reportHash=`a0f095630eabab7d0bc31f8cf47422ce5e028c8ada847a6508009df0a7d01e6f`, sha256=`b7f2f74def84beb958c6164e7084aadfd528237760ee7fb8b41660a2ba698537`
- `python/envs/ppo_action_surface.py`: role=`read-only PPO action-surface decoder`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
- `python/scripts/bt93s2r3_failure_ledger.py`: role=`BT93S2R3.1 generator`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`1655dd6bce60c1449eec0b3d01f3de08143b2653432662647d5223669e003fc9`
- `python/scripts/bt93s2r3_replay_predicate_window_preflight.py`: role=`BT93S2R3.2 generator`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`918840775543308df583d55da2a05b153cbff337696668c9adae3dca26516e18`
- `python/scripts/bt93s2r2_failure_taxonomy.py`: role=`BT93S2R2.1 generator`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`081c9cbb39ebc4a49036736433ee7b60a9eecfc5b31b802e81724e6c5f47ea71`
- `python/scripts/bt93s2r2_predicate_window_repair.py`: role=`BT93S2R2.2 generator`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`a28b9972b4967256b93d265f5d7921caee7aa5c2a01650fd8c506a20cb9fe992`
- `python/scripts/bt93s2r2_empirical_reentry_gate.py`: role=`BT93S2R2.3 generator`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`d774761f97f7b9c1c0b3b7a70c3c3c17cf8dfcd785f532f59d327177f95f1b83`
- `python/scripts/bt93s2r4_replay_root_cause_audit.py`: role=`BT93S2R4.1 generator`, resultClass=`None`, ok=`None`, reportHash=`None`, sha256=`df89cdf957c06f038e0b1c880a7ba91c3975174f10efa2be51be630589614559`

Git-SHA: `b16a4fb94bcde4daab95a19bfb1040f8eba22af7`
MatrixId: `bt93s2r-walltrail-action-effect-matrix-v3`
ContractId: `bt93s2r-walltrail-action-effect-window-v3`
ActionSurfaceId: `bt93q-walltrail-semantic-action-v1`
Decoder-Hash: `970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`

## Audit-Klassen

Primaer:

- `start-metrics-repeat-drift`: `103`

Sekundaer:

- `env-reset-suspect`: `103`
- `measurement-invalid-before-action`: `27`
- `metric-sampling-suspect`: `103`
- `minimum-window-after-replay-fail`: `3`
- `predicate-after-replay-drift`: `25`
- `seed-rng-suspect`: `103`
- `session-id-derived-from-drifting-metrics`: `103`
- `source-start-metrics-drift`: `103`

## Bewertung

Alle 103 Rows bleiben Replay-/StartMetrics-rot. Der Audit trennt die
beobachteten Klassen, beweist aber noch keinen konkreten Env- oder Runner-Fix.
`python/envs/curvios_env.py` und `scripts/training-headless-lane-runner.mjs`
bleiben deshalb read-only bis `93S2R4.3` eine Minimal-Repro-Ursache belegt.

## No-Go

Kein `93S2R3.3-Reentry`, kein `BT93S2.3-Recheck`, kein `93S2.4`, kein
`BT93T/U/W/O/P/94A`, kein Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate oder BT95. Keine Reward-, Telemetry-, ActionSurface- oder
produktive Runtime-Aenderung.

## Evidence

- `data/training/ppo/bt93s2r4/replay_root_cause_audit.json`
- Command: `python python/scripts/bt93s2r4_replay_root_cause_audit.py --write-report`

## Naechster Schritt

- Run 93S2R4.2 to define replaySpecId from immutable inputs and keep startMetricsHash as separate observation.
- Do not edit python/envs/curvios_env.py or scripts/training-headless-lane-runner.mjs until 93S2R4.3 has minimal-repro evidence.
- Do not start 93S2R3.3-Reentry, BT93S2.3-Recheck, 93S2.4, BT93T/U/W/O/P/94A, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate or BT95.
