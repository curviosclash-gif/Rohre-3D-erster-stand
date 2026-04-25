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

## Verbindliche Evidence-Pfade

- `data/training/ppo/bt93i/start_truth.json`
- `data/training/ppo/bt93i/matrix_manifest.json`
- `data/training/ppo/bt93i/terminal_provocation_report.json`
- `data/training/ppo/bt93i/long_run_readiness_report.json`
- `data/training/ppo/bt93i/holdout_guard_report.json`
- `data/training/ppo/bt93i/matrix_green_report.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`

## Script-/Runner-Vertrag

- `bt94a_gate_check.py` muss BT93I als aktuellste Handover-Quelle konsumieren, sobald BT93I-Artefakte existieren.
- BT93I braucht einen episode-targeted Eval-/Holdout-Pfad; fixe `eval-steps` allein reichen nicht.
- Terminal-Provocation muss `player-dead`, nicht-toedliches Natural-Terminal und `max-steps` ohne Runtime-Bypass trennen.
- `longRunAllowed=true` darf nur aus einem maschinenlesbaren Readiness-Report kommen.

## Phasen

### 93I.1 Matrix-Truth und Terminal-Provocation

- BT93H/BT94A-Quellen mit Hashes zusammenfuehren.
- BT93I-Matrix mit Eval `>=15` Episoden und Holdout `>=8` Episoden definieren.
- Terminal-Provocation fuer `player-dead`, `match-ended` oder gleichwertiges nicht-toedliches Natural-Terminal und `max-steps` nachweisen.
- Bei fehlendem nicht-toedlichem Natural-Terminal vor jedem Repair-Lauf stoppen.

### 93I.2 Long-run-Readiness

- Eval-/Holdout-Runner fuer Ziel-Episodenzahl bauen oder konfigurieren.
- Budget pinnen: Smoke `2048`, Inkrement `4096`, Max `32768` Timesteps oder `14400s`, 2-Env.
- Early-Stop fuer Runtime-Fehler, leere Terminal-Matrix, Steps-Regression, Reward-Hacking, Collapse und Action-/Safety-Regression fixieren.
- `long_run_readiness_report.json` schreiben.

### 93I.3 Terminal-Curriculum-Repair

- Nur `run-kind=terminal-curriculum-repair`.
- Reparaturhypothese: death-only Terminal-Coverage und Steps-Regression gleichzeitig adressieren.
- Keine Candidate-, Freeze-, Promote- oder Runtime-Signale.
- Modellpaket, Optimizer, VecNormalize, Config, Hashes und Checkpoints versionieren.

### 93I.4 Matrix gruen pruefen

- Eval/Holdout mit Mindestepisoden ausfuehren.
- DQN-Schwellen pruefen: Steps `>=117.525`, Survival `>=48.590082`.
- Terminal-/Death-Matrix muss startfaehig sein.
- `matrix_green_report.json` schreiben.

### 93I.5 Gate-Refresh

- BT93C-Handover-/Precomparison-/Evidence-Reports aus BT93I-Artefakten neu schreiben.
- `bt94a_gate_check.py --write-report` unverfaelscht ausfuehren.
- Gruen oeffnet nur `BT94A.1`; rot endet `diagnose-blocked`.

## Harte Schwellen

- `invalidActionRate = 0`
- `sanitizerRate = 0`
- `preSamplingMaskRate = 1.0` oder gleichwertige Policy-Level-Maskierung
- `postDecodeClampRate = 0`
- `vetoRate < 0.25`
- `runtimeErrorCount = 0`
- keine Optimierung nach Holdout; Nachweis ueber Run-IDs, Seeds, Optimizer-Step und Optimizer-State-Hash

## Risiken

| Risiko | Umgang |
| --- | --- |
| Langer Lauf wiederholt rote Matrix | Langlauf erst mit `longRunAllowed=true`. |
| Terminal-Probe ist nur kuenstlicher Bypass | Nur normale Trainings-/Headless-Lifecycle-Regeln zaehlen. |
| Survival kaschiert Steps-Regression | Steps und Survival muessen beide in Eval und Holdout bestehen. |
| Holdout wird entwertet | `holdout_guard_report.json` ist Pflicht. |
| BT94A wird per Plantext geoeffnet | Nur `bt94a_gate_check.py` mit `claimable=true` zaehlt. |

## Startgate vs Qualitaetsziel

BT93I kann nur `BT94A.1` oeffnen. Non-Regression gegen den DQN-Anker ist kein Freeze-, Promotions- oder `fantastisch`-Beweis. Die globale +30%-Qualitaet bleibt BT94A/BT94B vorbehalten.
