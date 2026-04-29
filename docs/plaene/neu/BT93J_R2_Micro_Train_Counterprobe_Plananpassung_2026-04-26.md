# BT93J Plananpassung: R2 Micro-Train Counterprobe

Datum: 2026-04-26

Status: Vorschlag fuer User-owned Intake in `docs/bot-training/Bot_Trainingsplan.md`.

Dieser Vorschlag oeffnet BT94A nicht. Er erlaubt keinen Candidate, keinen Freeze,
keinen Promote, keinen Holdout und keinen Long-run.

## Kurzantwort

Mit der aktuellen Planform wird `/fix-planung` den noetigen Trainingsbeweis
nicht ausfuehren.

Grund: `93J.5` hat `readyForTraining=false` geschrieben und `93J.6` ist im
Master nur als Pilot/Holdout-Schutz-Phase formuliert. Ein regelkonformer Agent
muss deshalb `93J.6` blockieren, statt einen Trainingslauf zu starten.

## Aktuelle Evidenz

Quelle:

- `data/training/ppo/bt93j/pilot_readiness_report.json`
- `data/training/ppo/bt93j/r1_micro_test_report.json`
- `data/training/ppo/bt93j/reward_curriculum_diagnostics.json`
- `data/training/ppo/bt93j/terminal_semantics_report.json`

Aktueller Zustand:

| Feld | Wert |
| --- | --- |
| `pilot_readiness_report.resultClass` | `pilot-readiness-blocked` |
| `readyForTraining` | `false` |
| Blockierende Checks | `terminal_matrix_start_capable`, `not_player_dead_only`, `micro_test_trend_improvement` |
| R1-Entscheidung | `cause-confirmed` |
| R1-Grenze | Reward-Signal-Micro-Test, kein Policy-/Trainingsbeweis |

Fachliche Lesart:

- R1 hat bewiesen, dass der Reward-Signal-Fix technisch wirkt.
- R1 hat nicht bewiesen, dass erneutes PPO-Lernen die Policy verbessert.
- Ohne kurzen Trainings-Gegenbeweis bleibt offen, ob der Fix gegen `player-dead-only`
  und Steps-Regression wirkt.
- Der Plan verlangt fuer `93J.6` bereits `readyForTraining=true`, aber genau dieses
  Signal kann nach R1 ohne Micro-Train-Counterprobe nicht entstehen.

## Problem im aktuellen Plan

Der Plan trennt korrekt zwischen Diagnose, Repair und Pilot. Er hat aber eine
Luecke zwischen:

1. `R1 green`: Der minimale Reward-Signal-Fix ist technisch bestaetigt.
2. `readyForTraining=true`: Pilot/Long-run duerfen starten.

Dazwischen fehlt eine sehr kleine, eng begrenzte Trainings-Gegenprobe.

Ohne diese Zwischenphase bleibt der Loop in einem formalen Widerspruch:

- Kein Pilot ohne Trendverbesserung.
- Keine Trendverbesserung ohne minimalen Trainingslauf nach R1.

## Vorgeschlagene Planregel

Zwischen `93J.5` und `93J.6` wird eine neue Micro-Phase eingefuegt:

### 93J.5a R2 Micro-Train Counterprobe

Zweck:

- Nur pruefen, ob der R1-Reward-Signal-Fix nach einem sehr kleinen PPO-Update eine
  messbare Trendverbesserung erzeugt.
- Nicht als Pilot, Candidate, Freeze, Holdout, Promote oder Rollout werten.

Erlaubt nur, wenn alle Bedingungen gelten:

- `r1_micro_test_report.json.resultClass=green`
- `pilot_readiness_report.json.readyForTraining=false`
- Blockierende Checks sind exakt:
  - `terminal_matrix_start_capable`
  - `not_player_dead_only`
  - `micro_test_trend_improvement`
- Observation ist gruen.
- Terminal-Mapping ist gruen.
- Matrix-Vertrag ist gruen/reproduzierbar.
- Action-Safety ist gruen.
- `runtimeErrorCount=0`.
- Kein Contract-/Runtime-/AI-Hub-/Matchstart-Touch.

Weiterhin verboten:

- kein BT94A-Claim
- kein Candidate-Run
- kein Freeze-Kandidat
- kein Promote
- kein Rollout-Signal
- kein Holdout
- kein Long-run
- kein Gate-Refresh nach BT94A
- keine produktive Runtime-, Matchstart-, AI-Hub-, Strategy-, Registry-, Rollback-,
  Rollout-, Authority- oder Bridge-Aenderung

## Konkrete neue Checkboxen

Vorschlag fuer Einfuegung nach `93J.5`:

```markdown
### 93J.5a R2 Micro-Train Counterprobe

- [ ] 93J.5a.1 R2 startet nur, wenn R1 `green` ist, `readyForTraining=false` aus
  `pilot_readiness_report.json` kommt und die Blocker exakt
  `terminal_matrix_start_capable`, `not_player_dead_only` und
  `micro_test_trend_improvement` sind.
- [ ] 93J.5a.2 Einen begrenzten Micro-Train mit `run-kind=bt93j-r2-micro-train-counterprobe`
  ausfuehren; kein Candidate, kein Freeze, kein Promote, kein Holdout, kein Long-run.
- [ ] 93J.5a.3 `r2_micro_train_counterprobe_report.json` schreiben mit
  Run-ID, Timesteps, Seeds, Modellhash, Config-Hash, Normalize-State-Hash,
  Optimizer-State-Hash, `runtimeErrorCount`, Terminal-Matrix, avgSteps-Trend,
  Natural-Terminal-Anteil, Reward-Breakdown und Action-Safety-Telemetrie.
- [ ] 93J.5a.4 R2 klassifiziert `trend-green`, `same-red`, `new-red` oder
  `measurement-invalid`; nur `trend-green` darf `pilot_readiness_report.json`
  neu bewerten, alle anderen Ergebnisse blockieren `93J.6`.
- [ ] 93J.5a.5 Holdout bleibt unbenutzt; bei `trend-green` darf nur Eval-/Pilot-Readiness,
  nicht BT94A oder Freeze, refreshed werden.
```

## Neue Artefakte

| Artefakt | Zweck |
| --- | --- |
| `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` | Minimaler Trainings-Gegenbeweis nach R1 |
| `data/training/ppo/bt93j/r2_eval_trend_report.json` | Eval-Trend ohne Holdout und ohne Candidate-Semantik |
| `data/training/ppo/bt93j/pilot_readiness_report.json` | Refresh nur bei `trend-green`, sonst weiter `readyForTraining=false` |

## Erfolgskriterien fuer `trend-green`

R2 darf nur `trend-green` schreiben, wenn alle folgenden Punkte zutreffen:

- `runtimeErrorCount=0`
- Action-Safety bleibt gruen:
  - `invalidActionRate=0`
  - `sanitizerRate=0`
  - `preSamplingMaskRate=1.0`
  - `postDecodeClampRate=0`
  - `vetoRate <0.25`
- avgSteps zeigt eine echte Verbesserung gegen BT93I/BT93J-R1-Ausgangslage.
- `player-dead-only` wird reduziert oder nicht-toedliche Natural-Terminals tauchen
  in echter Eval auf.
- Reward-Breakdown zeigt nicht nur mehr Survival-Reward ohne Terminal-/Steps-Effekt.
- Keine neuen roten Symptome entstehen.

Nicht ausreichend:

- nur Governance-Gates gruen
- nur R1-Signaltest gruen
- nur hoehere Reward-Summe
- nur `averageBotSurvival` gruen, wenn Steps/Terminal-Matrix rot bleiben

## Konsequenz fuer `/fix-planung`

Nach Intake dieser Plananpassung waere die naechste offene Phase nicht `93J.6`,
sondern `93J.5a`.

Dann wuerde `/fix-planung` den Trainingsbeweis als engen R2-Micro-Train ausfuehren,
ohne BT94A zu oeffnen und ohne den geplanten Safety-Rahmen zu brechen.

Ohne diese Anpassung muss `/fix-planung` korrekt blockieren.

## Vorgeschlagene Master-Aenderungen

1. In der BT93J-Artefaktliste ergaenzen:

```markdown
| `data/training/ppo/bt93j/r2_micro_train_counterprobe_report.json` | enger R2-Trainings-Gegenbeweis nach R1, kein Pilot/Candidate/Holdout |
| `data/training/ppo/bt93j/r2_eval_trend_report.json` | Eval-Trend nach R2 ohne Holdout- oder Candidate-Semantik |
```

2. Zwischen `93J.5` und `93J.6` die Phase `93J.5a` einfuegen.

3. Lock-/Statuszeilen auf folgenden naechsten Claim setzen:

```markdown
BT93J: `93J.5a` offen; enger R2-Micro-Train-Counterprobe nach R1; kein BT94A-Claim.
```

4. `Naechste Trainingshandlung` aktualisieren:

```markdown
BT93J nach 93J.5: zuerst `93J.5a R2 Micro-Train Counterprobe`; `93J.6` nur bei `trend-green`.
```

## Entscheidungsbedarf

User-Entscheid:

- Plananpassung in `docs/bot-training/Bot_Trainingsplan.md` aufnehmen.
- Danach `/fix-planung` erneut starten.

Empfehlung:

- Ja, aufnehmen. Das ist kein Replan im Sinne eines neuen grossen Blocks, sondern
  eine fehlende Zwischenphase innerhalb BT93J, damit der bereits bestaetigte R1-Fix
  endlich gegen echtes Lernen geprueft werden kann.
