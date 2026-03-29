# Bot Survival Trainingsplan (BT12, 10h Folgefenster)

Stand: 2026-03-25

## Ziel

- Primaeres Ziel: weiteres 10h-Training zur Bot-Stabilisierung ueber Classic- und Fight-Modi.
- Priorisierung: Ueberlebenszeit (`avgStepsPerEpisode`, `averageBotSurvival`) ist das Leitziel, Rest-KPIs sind nachrangig solange Gates stabil bleiben.
- Modus-Matrix: `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`.
- Referenz aus BT11-Final:
  - `avgStepsPerEpisode`: `117.525`
  - `averageBotSurvival`: `37.376986`

## Startkommando (10h Matrix)

```powershell
$seriesStamp = "BT12_SURV_$(Get-Date -Format 'yyyyMMddTHHmmss')"
npm run training:10h -- --series-stamp $seriesStamp --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true
```

## Startkommando (Hintergrund mit Log)

```powershell
$seriesStamp = "BT12_SURV_$(Get-Date -Format 'yyyyMMddTHHmmss')"
$logPath = "output/training/$seriesStamp-10h.log"
New-Item -ItemType Directory -Path output/training -Force | Out-Null
$cmd = "npm run training:10h -- --series-stamp $seriesStamp --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true"
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList @('/c', "$cmd > `"$logPath`" 2>&1") -WorkingDirectory "." -PassThru
"PID=$($proc.Id) seriesStamp=$seriesStamp log=$logPath"
```

## Aktiver Lauf (Operator-Status)

- Start: `2026-03-25 03:09:52` (Europe/Berlin)
- SeriesStamp: `BT12_SURV_20260325T030951`
- Log: `output/training/BT12_SURV_20260325T030951-10h.log`
- PID (node): `5856`
- Warm-up Evidence: `data/training/runs/BT12_SURV_20260325T030951-r37/{run,eval,gate}.json`
- Warm-up KPI: `avgStepsPerEpisode=135.368750`, `invalidActionRate=0.000000`, Delta Steps `+15.183%` vs BT11-Final
- Vorlauf-Hinweis: vorheriges BT12-Fenster (`BT12_20260324T152103`) blieb bei Checkpoint-Validate mehrfach in `phase=app:game-instance` haengen.
- Checkpoint Validate C1:
  - `output/training/BT12_SURV_20260325T030951-botvalidate-cp01.log` -> FAIL (`BOT_RUNNER_FORCE_KILL_PORT=false`, `phase=app:game-instance`)
  - `output/training/BT12_SURV_20260325T030951-botvalidate-cp01-retry.log` -> FAIL (`BOT_RUNNER_PORT=4275`, `BOT_RUNNER_BOOT_TIMEOUT=300000`, `phase=app:game-instance`)
- Checkpoint Validate C2:
  - `output/training/BT12_SURV_20260325T030951-botvalidate-cp02.log` -> FAIL (`BOT_RUNNER_BOOT_TIMEOUT=240000`, `phase=app:game-instance`)
- Checkpoint Validate C3:
  - `output/training/BT12_SURV_20260325T030951-botvalidate-cp03-preview.log` -> PASS (`BOT_RUNNER_SERVER_MODE=preview`, `BOT_RUNNER_PREVIEW_BUILD=true`)
  - KPI: `averageBotSurvival=38.770150` (`+3.727%` vs BT11-Final), forced-round-rate `83.3%`

## 10h Ablauf

| Block | Stunde | Fokus | Pflicht-Checks |
| --- | --- | --- | --- |
| B1 | 0-2 | Warm-up, Resume-Integritaet, erster Zyklus | `run/eval/gate` ohne Runtime-Error |
| B2 | 2-4 | Classic-Modes stabilisieren | keine Step-/Episode-Timeout-Cluster |
| B3 | 4-6 | Fight-Modes stabilisieren | `invalidActionRate` stabil, keine Stage-Fails |
| B4 | 6-8 | Matrix-Ausgleich | KPI-Drift je Modus beobachten |
| B5 | 8-10 | Abschlusslauf + KPI-Snapshot | finales `bot:validate` + Gate-Evidence |

## 2h Checkpoint-Rhythmus

1. Training-Status pruefen:

```powershell
Get-Content "output/training/<series-stamp>-10h.log" -Tail 120
```

2. Validation ausfuehren:

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

3. KPI-Eintrag in `docs/bot-training/Bot_Trainingsplan.md` (BT12 Checkpoint-Log):
- `avgStepsPerEpisode`
- `averageBotSurvival`
- `invalidActionRate`
- Delta gegen BT11-Final

## Abschluss-Gate

1. `npm run training:eval -- --stamp <letzter-run-stamp>`
2. `npm run training:gate -- --stamp <letzter-run-stamp>`
3. `npm run bot:validate` (mit `BOT_RUNNER_SCENARIO_COUNT=2`, `BOT_RUNNER_ROUNDS=3`, `BOT_RUNNER_TOTAL_TIMEOUT=600000`)
4. Artefakte dokumentieren:
- `data/training/series/<series-stamp>/loop.json`
- `data/training/runs/<run-stamp>/run.json`
- `data/training/runs/<run-stamp>/eval.json`
- `data/training/runs/<run-stamp>/gate.json`
- `data/bot_validation_report.json`

