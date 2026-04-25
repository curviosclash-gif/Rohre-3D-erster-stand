# BT93I Terminal-Curriculum und Steps-Non-Regression Repair

User-Intake: 2026-04-25

## Ziel

BT93I ist ein enger Reparaturblock vor BT94A. Er oeffnet kein Candidate-, Freeze-, Promotion- oder Rollout-Gate, sondern stellt die Voraussetzungen her, damit ein laengerer PPO-Repair-Lauf fachlich sinnvoll wird und `BT94A.1` ohne Governance-Bruch claimbar werden kann.

## Blockierende Ausgangslage

- `data/training/ppo/bt94a/no_start_gate.json` meldet `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`.
- Offen bleiben `F.05`, `F.19`, `F.27`, `F.31`.
- BT93H Eval/Holdout erreichen zwar mehr interne Survival-Zeit, regressieren aber bei `avgStepsPerEpisode` gegen den DQN-Anker.
- Eval/Holdout sehen nur `player-dead`, keine nicht-toedliche Natural-Terminal-Klasse.
- Mindestepisoden wurden verfehlt: Eval `11/15`, Holdout `7/8`.

## Zielkriterien fuer ein gruenes Startgate

- Eval und Holdout erreichen mindestens `15` bzw. `8` abgeschlossene Episoden.
- Eval und Holdout enthalten getrennt `player-dead`, nicht-toedliches Natural-Terminal wie `match-ended` und `max-steps`/Truncation-Kontrolle.
- `avgStepsPerEpisode >= 117.525` in Eval und Holdout.
- `averageBotSurvival >= 48.590082` in Eval und Holdout.
- `runtimeErrorCount=0`, keine Crash-/Timeout-/Forced-Round-Regression.
- `invalidActionRate=0`, `sanitizerRate=0`, `preSamplingMaskRate=1.0`, keine Policy-Qualitaet durch Clamp/Veto verdeckt.
- Keine Optimierung nach Holdout.

## Grenzen

- Keine BT94A-Kandidatenlaeufe.
- Kein Freeze-Kandidat.
- Kein BT94B-Handover.
- Kein `promote`, `rollout-ready` oder Runtime-Signal.
- Produktive Runtime-, Matchstart-, AI-Hub-, Strategy-Flag-, Registry-, Rollback- und JS-Inference-Surfaces bleiben read-only.

## Arbeitszuschnitt

1. Matrix-Truth und Terminal-Provocation reparieren.
2. Episode-targeted Eval/Holdout und Long-run-Readiness bauen.
3. Erst nach gruener Readiness einen begrenzten Terminal-Curriculum-Repair-Lauf starten.
4. Eval/Holdout gegen DQN-Anker und BT93H-Matrix auswerten.
5. BT94A-Gate nur ueber Artefakte und `bt94a_gate_check.py` oeffnen.
