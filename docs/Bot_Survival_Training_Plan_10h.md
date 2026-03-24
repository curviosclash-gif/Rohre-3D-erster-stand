# Bot Survival Trainingsplan (10h Folgefenster)

Stand: 2026-03-24

## Ziel

- Primaeres Ziel: 10h Survival-Training als Folgefenster zu BT10 ausfuehren.
- Fokus fuer dieses Fenster: Fight-Profil (`hunt-3d`, `hunt-2d`) priorisieren.
- Zielmetriken:
  - `avgStepsPerEpisode` darf nicht unter BT10-Baseline (`123.799`) fallen.
  - `averageBotSurvival` muss ueber frische `bot:validate` Reports messbar sein (nicht `null` im Abschlusslauf).
  - Stabilitaet bleibt hart: `runtimeErrorCount = 0`, Gate bleibt gruen.

## Startkommando (10h Fight-Profil)

```powershell
$seriesStamp = "BT11_FIGHT_$(Get-Date -Format 'yyyyMMddTHHmmss')"
npm run training:10h -- --series-stamp $seriesStamp --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes hunt-3d,hunt-2d --max-steps 220 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true
```

## Startkommando (Hintergrund mit Log, Fight-Profil)

```powershell
$seriesStamp = "BT11_FIGHT_$(Get-Date -Format 'yyyyMMddTHHmmss')"
$logPath = "output/training/$seriesStamp-10h.log"
New-Item -ItemType Directory -Path output/training -Force | Out-Null
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run training:10h -- --series-stamp $seriesStamp --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes hunt-3d,hunt-2d --max-steps 220 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true > `"$logPath`" 2>&1" -WorkingDirectory "." -PassThru
"PID=$($proc.Id) seriesStamp=$seriesStamp log=$logPath"
```

## Aktiver Lauf (2026-03-24)

- `seriesStamp`: `BT11_FIGHT_20260324T014853`
- `logPath`: `output/training/BT11_FIGHT_20260324T014853-10h.log`
- `PID`: `2772`
- Status beim Start: Trainer-Server auf `ws://127.0.0.1:8765` online, erster Run `BT11_FIGHT_20260324T014853-r01` gestartet.

## 10h Ablauf in 5 Bloecken

| Block | Stunde | Fokus | Pflicht-Checks |
| --- | --- | --- | --- |
| B1 | 0-2 | Warm-up + Bridge-Stabilitaet + erster Run-Zyklus | `run/eval/gate` ohne Runtime-Error |
| B2 | 2-4 | Survival-Stabilisierung auf Seed-/Mode-Matrix | `invalidActionRate` bleibt niedrig |
| B3 | 4-6 | Mid-Run-Kontrolle gegen KPI-Drift | 2h-`bot:validate` dokumentiert |
| B4 | 6-8 | Laengere Episoden unter Last | kein Timeout-Cluster, keine Resume-Fehler |
| B5 | 8-10 | Abschlusslauf + KPI-Snapshot | Finales `bot:validate` + `training:gate` referenziert |

## Checkpoint-Rhythmus (alle 2h)

1. Validation ausfuehren:

```powershell
$env:BOT_RUNNER_SCENARIO_COUNT='2'
$env:BOT_RUNNER_ROUNDS='3'
npm run bot:validate
Remove-Item Env:BOT_RUNNER_SCENARIO_COUNT -ErrorAction SilentlyContinue
Remove-Item Env:BOT_RUNNER_ROUNDS -ErrorAction SilentlyContinue
```

2. KPI-Eintrag in `docs/Bot_Trainingsplan.md` (BT11 Checkpoint-Log):
- `avgStepsPerEpisode`
- `averageBotSurvival`
- `invalidActionRate`
- Delta gegen BT10-Baseline

3. Eskalationsregel:
- Wenn `runtimeErrorCount > 0` oder zwei Gate-Fails in Folge auftreten, Lauf stoppen und letzten stabilen RunStamp als Resume-Basis pinnen.

## Abschluss-Gate (nach 10h)

1. `npm run training:eval -- --stamp <letzter-run-stamp>`
2. `npm run training:gate -- --stamp <letzter-run-stamp>`
3. `npm run bot:validate`
4. Artefakte dokumentieren:
- `data/training/series/<series-stamp>/loop.json`
- `data/training/runs/<run-stamp>/run.json`
- `data/training/runs/<run-stamp>/eval.json`
- `data/training/runs/<run-stamp>/gate.json`
