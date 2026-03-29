# Bot Survival Trainingsplan (BT20, Survival-First Resume Window)

Stand: 2026-03-28

## Ziel

- Deutlich laengere Bot-Ueberlebenszeiten gegenueber der BT10-Baseline und ohne BT12-Regression.
- Resume nicht vom aktuellen `latest`, sondern vom letzten stabil validierten BT11-Checkpoint.
- Trainingsfenster bleibt als 4-Mode-Matrix (`classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`) aufgesetzt, damit Survival nicht nur in Hunt stabilisiert wird.

## Hypothese

- BT12 ist am 2026-03-27 nicht mehr durch Forced-/Timeout-Rounds blockiert, scheitert aber hart auf echter Survival-Metrik (`averageBotSurvival=6.132433`).
- Der letzte belastbare Resume-Punkt ist `BT11_FIGHT_20260324T014853-r4042` mit `averageBotSurvival=37.376986`.
- Ein neues 10h-Fenster soll deshalb vom BT11-Checkpoint starten und die BT12-Matrix mit Survival-First-Laufparametern neu aufbauen.

## Startkommando (10h Resume Window)

```powershell
$seriesStamp = "BT20_SURV_$(Get-Date -Format 'yyyyMMddTHHmmss')"
$resumeCheckpoint = "data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json"
npm run training:10h -- --series-stamp $seriesStamp --resume-checkpoint $resumeCheckpoint --resume-strict true --stop-on-fail false --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true
```

## Startkommando (Hintergrund mit Log)

```powershell
$seriesStamp = "BT20_SURV_$(Get-Date -Format 'yyyyMMddTHHmmss')"
$resumeCheckpoint = "data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json"
$logPath = "output/training/$seriesStamp-10h.log"
New-Item -ItemType Directory -Path output/training -Force | Out-Null
$cmd = "npm run training:10h -- --series-stamp $seriesStamp --resume-checkpoint $resumeCheckpoint --resume-strict true --stop-on-fail false --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true"
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList @('/c', "$cmd > `"$logPath`" 2>&1") -WorkingDirectory "." -PassThru
"PID=$($proc.Id) seriesStamp=$seriesStamp log=$logPath resume=$resumeCheckpoint"
```

## Checkpoint-Rhythmus (2h)

1. Log pruefen:

```powershell
Get-Content "output/training/<series-stamp>-10h.log" -Tail 120
```

2. Preview-Validate fuer Survival-Snapshot:

```powershell
$env:BOT_RUNNER_SERVER_MODE='preview'
$env:BOT_RUNNER_PREVIEW_BUILD='true'
$env:BOT_RUNNER_SCENARIO_COUNT='2'
$env:BOT_RUNNER_ROUNDS='3'
$env:BOT_RUNNER_TOTAL_TIMEOUT='600000'
npm run bot:validate
Remove-Item Env:BOT_RUNNER_SERVER_MODE -ErrorAction SilentlyContinue
Remove-Item Env:BOT_RUNNER_PREVIEW_BUILD -ErrorAction SilentlyContinue
Remove-Item Env:BOT_RUNNER_SCENARIO_COUNT -ErrorAction SilentlyContinue
Remove-Item Env:BOT_RUNNER_ROUNDS -ErrorAction SilentlyContinue
Remove-Item Env:BOT_RUNNER_TOTAL_TIMEOUT -ErrorAction SilentlyContinue
```

3. Im BT20-Checkpoint-Log dokumentieren:

- `avgStepsPerEpisode`
- `averageBotSurvival`
- Resume-Quelle
- Delta gegen BT10-Baseline und BT11-Final

## Abschluss-Gate

1. `npm run training:eval -- --stamp <letzter-run-stamp>`
2. `npm run training:gate -- --stamp <letzter-run-stamp>`
3. `npm run bot:validate` mit Preview-Parametern fuer Evidence
4. Artefakte pinnen:

- `data/training/series/<series-stamp>/loop.json`
- `data/training/runs/<run-stamp>/run.json`
- `data/training/runs/<run-stamp>/eval.json`
- `data/training/runs/<run-stamp>/gate.json`
- `data/bot_validation_report.json`

## Aktiver Lauf (Operator-Status)

- Start: `2026-03-28 00:08:41` (Europe/Berlin)
- SeriesStamp: `BT20_SURV_20260328T000841`
- Log: `output/training/BT20_SURV_20260328T000841-10h.log`
- PID (cmd wrapper): `12424`
- Warm-up Evidence:
  - `data/training/runs/BT20_SURV_20260328T000841-r01/run.json`
  - `data/training/runs/BT20_SURV_20260328T000841-r01/trainer.json`
  - `data/training/runs/BT20_SURV_20260328T000841-r01/eval.json`
  - `data/training/runs/BT20_SURV_20260328T000841-r01/gate.json`
- Resume-Evidence:
  - `resumeSource=data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json`
  - `checkpointLoads=1`
  - `optimizerSteps=1588329` und `envSteps=10979007` nach Run `r01`
- Aktueller Hinweis:
  - Der nachgelagerte `trainer-checkpoint-load` Command timed out weiterhin im Bridge-Pfad (`commandResponses=0`), der Startup-Resume im Trainer-Server greift aber nachweislich. Details stehen in `docs/Fehlerberichte/2026-03-28_training_resume-command-timeout.md`.
