# Bot Survival Trainingsplan (12h)

Stand: 2026-03-21

## Ziel

- Primaeres Ziel: maximale Bot-Ueberlebenszeit.
- Zielmetriken nach 12h:
  - `overall.averageBotSurvival` aus `bot:validate` mindestens `+20%` gegen Baseline.
  - `stuckPerMinute` mindestens `-30%`.
  - Keine Verschlechterung der Stabilitaet (`runtimeErrorCount = 0`, Gate bleibt gruen).

## Startkommando

```powershell
npm run training:12h:survival
```

Der Lauf erzeugt fortlaufend Artefakte unter `data/training/series/<series-stamp>/`.

## 12h Ablauf in 6 Bloecken

| Block | Stunde | Fokus | Pflicht-Checks |
| --- | --- | --- | --- |
| B1 | 0-2 | Warm-up + stabile Bridge + erste Checkpoints | `training-run`/`eval`/`gate` muessen ohne Abort durchlaufen |
| B2 | 2-4 | Survival-Lernen in engen Situationen | `averageBotSurvival` Trend steigend, `stuckEvents` fallend |
| B3 | 4-6 | Generalisierung ueber `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` | Keine einzelne Domain bricht signifikant ein |
| B4 | 6-8 | Mid-Run-Validierung gegen Drift | Quick-Validation + Gate-Report dokumentieren |
| B5 | 8-10 | Endgame-Stabilisierung (lange Episoden) | Kein Timeout-Anstieg, Bridge-Latenz stabil |
| B6 | 10-12 | Abschluss + Final-Validation + Artefakte | Finales `bot:validate` und `training:gate` gespeichert |

## Checkpoint-Rhythmus (alle 2h)

1. Kurzvalidierung fahren:

```powershell
$env:BOT_RUNNER_SCENARIO_COUNT='2'
$env:BOT_RUNNER_ROUNDS='3'
npm run bot:validate
Remove-Item Env:BOT_RUNNER_SCENARIO_COUNT -ErrorAction SilentlyContinue
Remove-Item Env:BOT_RUNNER_ROUNDS -ErrorAction SilentlyContinue
```

2. KPI-Werte notieren:
- `overall.averageBotSurvival`
- `overall.stuckPerMinute`
- `overall.wallHits` / `overall.trailHits`
- `gate.pass` aus dem aktuellen Gate-Artefakt

3. Abbruchregel:
- Wenn `averageBotSurvival` zwei Checkpoints in Folge faellt oder `runtimeErrorCount > 0`, Lauf stoppen und letzten stabilen Checkpoint pinnen.

## Abschluss-Gate (nach Stunde 12)

1. `npm run bot:validate`
2. `npm run training:gate -- --stamp <letzter-run-stamp>`
3. Artefakte fixieren:
- `data/training/series/<series-stamp>/loop.json`
- `data/training/runs/<run-stamp>/run.json`
- `data/training/runs/<run-stamp>/eval.json`
- `data/training/runs/<run-stamp>/gate.json`
