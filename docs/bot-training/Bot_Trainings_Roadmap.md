# Bot Trainings Roadmap (Survival 2026-Q2)

Stand: 2026-03-22
Horizon: 2026-03-22 bis 2026-06-30
Quelle fuer operative Phase-Checks: `docs/bot-training/Bot_Trainingsplan.md`

## Status-Legende

- `[ ]` Offen
- `[/]` In Bearbeitung
- `[x]` Abgeschlossen

## Baseline Snapshot (2026-03-22)

Referenzlauf alt:
- Stamp: `20260321T180755Z-r01`
- `avgStepsPerEpisode`: `123.799`
- `invalidActionRate`: `0.247460`

Aktueller Laufstand:
- Stamp: `20260322T023812Z-r4344`
- `avgStepsPerEpisode`: `124.138` (`+0.274%` vs alt)
- `invalidActionRate`: `0.000000`
- `averageBotSurvival`: `null` (noch kein frischer bot-validation Report im Run-Ordner)

## Benchmark-First Freeze (BT80A Prep, 2026-04-01)

- Benchmark-Contract und Leistungsprofile liegen jetzt in `src/state/training/TrainingBenchmarkContract.js`.
- Eingefrorene Referenzen:
  - Legacy-Baseline: `20260321T180755Z-r01`
  - Champion: `BT11_FIGHT_20260324T014853-r4042`
  - BT20 bleibt nur Challenger-Referenz: `BT20_SURV_20260328T000841-r728` ist ohne eingefrorenen `bot:validate`-Runreport nicht champion-faehig.
- Pflichtartefakte fuer kuenftige Promotions: `benchmark-manifest.json`, `decision-trace.json`, `benchmark-report.json`, `bot-validation-report.json`, Resume-Health und Hardware-Telemetrie.
- Benannte Profile fuer lokale Hardware: `quick-benchmark`, `ablation`, `overnight-high-util`, `marathon`.
- Vergleichsregel: Promotion nur gegen denselben Benchmark-Vertrag und dasselbe Semantikfenster `pre-v72-runtime-freeze-2026-04-01`.

## Zielkorridor bis Q2-Ende

| Ziel | Baseline | Q2 Ziel | Delta |
| --- | --- | --- | --- |
| `avgStepsPerEpisode` | 123.799 | >= 185.000 | +49.4% |
| `averageBotSurvival` | 31.908458 | >= 44.000000 | +37.9% |
| `invalidActionRate` | 0.247460 | <= 0.010000 | -95.9% |
| `runtimeErrorCount` | >0 historisch | 0 stabil | hartes Gate |

## Trainingszyklen (konkret geplant)

| Zyklus | Zeitraum | Schwerpunkt | Zielkriterium |
| --- | --- | --- | --- |
| C1 | 2026-03-22 bis 2026-03-24 | Safety + Stabilitaet (laufend) | `runtimeErrorCount=0`, `invalidActionRate<=0.02` |
| C2 | 2026-03-24 bis 2026-03-27 | Reward-Shaping Survival-First | `avgStepsPerEpisode>=145` |
| C3 | 2026-03-27 bis 2026-03-31 | Safety-Policy + Risk-Gates | `avgStepsPerEpisode>=155`, no gate regressions |
| C4 | 2026-04-01 bis 2026-04-10 | Curriculum (einfach->mittel->voll) | `avgStepsPerEpisode>=165` |
| C5 | 2026-04-11 bis 2026-04-25 | Replay-Priorisierung + Hyperparameter | `avgStepsPerEpisode>=175`, `averageBotSurvival>=40` |
| C6 | 2026-04-26 bis 2026-06-30 | Haertung + Regression-Schutz | Q2 Zielkorridor erreicht |

## Roadmap-Phasen

### 1. Stabilitaet und Datenqualitaet (C1)

- [ ] 1.1 Reproduzierbare Baseline + Kontrolllauf
  - [ ] 1.1.1 Learn-Lauf und Ops-Kontrolllauf mit identischen Seeds dokumentieren
  - [ ] 1.1.2 KPI-Delta und Gate-Status in `docs/bot-training/Bot_Trainingsplan.md` festhalten
- [ ] 1.2 Bot-Validation in den Lauf integrieren
  - [ ] 1.2.1 Alle 2h `bot:validate` Report in Run-Ordner pinnen
  - [ ] 1.2.2 `averageBotSurvival` als nicht-null Pflichtfeld fuer Abschlusslaeufe erzwingen
- [ ] 1.9 Abschluss-Gate
  - [ ] 1.9.1 `run/eval/gate` + `bot:validate` fuer C1 vorhanden
  - [ ] 1.9.2 Keine Runtime- oder Restore-Fehler in C1

### 2. Survival-Optimierung Kern (C2-C3)

- [ ] 2.1 Safety-Layer und Risk-Gates
  - [ ] 2.1.1 Collision-Risk-Overrides in Action-Ausgabe umsetzen
  - [ ] 2.1.2 Risky-Action-Sperren bei hoher Bedrohung ausrollen
- [ ] 2.2 Reward-Shaping Survival-First
  - [ ] 2.2.1 Survival-Reward/Death-Penalty kalibrieren
  - [ ] 2.2.2 Risk-Proximity-Penalties gegen Wall/Trail/Opponent pruefen
- [ ] 2.9 Abschluss-Gate
  - [ ] 2.9.1 `avgStepsPerEpisode>=155` auf Seed/Mode-Matrix
  - [ ] 2.9.2 Kein Regression in `runtimeErrorCount`, `invalidActionRate`, Gate-Status

### 3. Curriculum + Replay + Hyperparameter (C4-C5)

- [ ] 3.1 Curriculum-Wellen
  - [ ] 3.1.1 Stufenplan (einfach->mittel->voll) in Training-Loop verankern
  - [ ] 3.1.2 Promotion/rollback Regeln pro Stufe aktivieren
- [ ] 3.2 Replay-Priorisierung und Tuning
  - [ ] 3.2.1 Near-death/death-leading Priorisierung einbauen
  - [ ] 3.2.2 Hyperparameter A/B Sweeps (gamma/epsilon/timeouts) standardisieren
- [ ] 3.9 Abschluss-Gate
  - [ ] 3.9.1 Gewinner-Setting reproduzierbar auf mindestens 3 Vergleichslaeufen
  - [ ] 3.9.2 `avgStepsPerEpisode>=175` und `averageBotSurvival>=40`

### 4. Haertung und Q2 Abschluss (C6)

- [ ] 4.1 Survival als First-Class Gate
  - [ ] 4.1.1 `averageBotSurvival` hard gate in `training-gate` verdrahten
  - [ ] 4.1.2 Rolling-Trend-Gates fuer Survival-Metriken absichern
- [ ] 4.2 Regression-Schutz + Runbook
  - [ ] 4.2.1 trainingsnahe Regressionstests erweitern
  - [ ] 4.2.2 Operator-Runbook fuer Start/Resume/Stop/Recovery finalisieren
- [ ] 4.9 Abschluss-Gate
  - [ ] 4.9.1 Q2 Zielkorridor erreicht
  - [ ] 4.9.2 Abschlussbericht + Handoff im Bot-Trainingsplan dokumentiert

## Promotion- und Rollback-Regeln

Promotion (neues Setting wird Standard), wenn alle Punkte wahr sind:
- 3 aufeinanderfolgende Runs mit `gate.ok=true`
- `avgStepsPerEpisode` mindestens +5% gegen aktuelle Produktions-Baseline
- `averageBotSurvival` nicht schlechter als Baseline (bei vorhandenem Report)

Rollback (auf letztes stabiles Setting), wenn ein Punkt wahr ist:
- 2 aufeinanderfolgende Runs mit `gate.ok=false`
- `runtimeErrorCount > 0` in einem Run
- `avgStepsPerEpisode` >= 7% unter aktueller Produktions-Baseline in 2 aufeinanderfolgenden Runs

## Standard-Zyklus pro Trainingsfenster

1. Learn-Lauf:
   - `npm run training:12h:survival`
2. Kontrolllauf:
   - `npm run training:12h:survival:ops`
3. Validierung:
   - `npm run training:eval -- --stamp <runStamp> --bot-validation-report <reportPath>`
   - `npm run training:gate -- --stamp <runStamp> --bot-validation-report <reportPath>`
4. Eintrag in `docs/bot-training/Bot_Trainingsplan.md`:
   - Artefaktpfade
   - KPI-Deltas
   - Promotion/rollback Entscheidung

