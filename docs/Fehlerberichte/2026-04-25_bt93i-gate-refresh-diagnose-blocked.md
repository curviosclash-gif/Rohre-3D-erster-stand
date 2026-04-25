# Fehlerbericht: BT93I 93I.5 Gate-Refresh bleibt diagnose-blocked

Datum: 2026-04-25

## Task Context

BT93I.5 sollte `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93I-Artefakten neu schreiben und danach den BT94A-Startstatus hart ableiten.

## Failure

`bt94a_gate_check.py --write-report` bleibt rot: `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.

Rote Claim-Checks: bt93c_result_allows_bt94a, handover_gate_ready, precomparison_not_regression, no_open_bt94a_audit_blockers.

Verbleibende BT94A-Gates: F.05, F.19, F.27, F.31.

BT93I-Hard-Rules: eval avgStepsPerEpisode below DQN anchor; holdout avgStepsPerEpisode below DQN anchor; terminal/death matrix is not start-capable; terminal matrix is player-dead-only.

## Reproduction Path

1. `python\.venv\Scripts\python.exe python\scripts\bt93i_gate_refresh_handover.py --write-upstream-reports`
2. `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report`
3. `python\.venv\Scripts\python.exe python\scripts\bt93i_gate_refresh_handover.py --write-package --write-followup-report --write-error-report`

## Affected Files

- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93i/handover_package.json`
- `data/training/ppo/bt93i/followup_gate_report.json`

## Attempted Fixes

BT93I.1 bis BT93I.4 lieferten Matrix-Truth, Terminal-Provocation, Long-run-Readiness, einen Terminal-Curriculum-Repair-Lauf sowie Eval/Holdout mit Mindestepisoden. Diese Evidence reicht nicht fuer BT94A.1, weil Steps gegen den DQN-Anker regressieren und die Terminal-/Death-Matrix nicht startfaehig bleibt.

## Status

`diagnose-blocked`. Keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze-Kandidat, kein BT94B-Handover, kein Promote und kein Rollout-Signal.

## Next Step

User-owned Replan oder enger Folgeblock fuer F.05/F.19/F.27/F.31.
