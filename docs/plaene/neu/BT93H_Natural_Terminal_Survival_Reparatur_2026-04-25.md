# BT93H Natural-Terminal- und Survival-Reparatur (Intake-Entwurf)

Status: Entwurf fuer User-Intake. Nicht aktiv, nicht claimbar, bis `docs/bot-training/Bot_Trainingsplan.md` manuell aktualisiert wurde.

## Ausgangslage

BT93G ist am 2026-04-25 korrekt mit `diagnose-blocked` geschlossen. `data/training/ppo/bt94a/no_start_gate.json` meldet fuer `94A.1` weiterhin `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.

Rote Claim-Checks:

- `bt93c_result_allows_bt94a`: observed `diagnose`, required `not diagnose`
- `handover_gate_ready`: observed `closed-diagnose-blocked-by-bt93g`, required `ready=true`
- `precomparison_not_regression`: observed `ppo-regression`, required `not ppo-regression`
- `no_open_bt94a_audit_blockers`: observed `4`, required `0`

Verbleibende BT94A-Startblocker:

- `F.05`: Survival-First bleibt blockiert; BT93G regressiert gegen den DQN-Anker.
- `F.19`: Terminal-/Death-Matrix bleibt leer oder nicht startfaehig.
- `F.27`: Vergleich bleibt `ppo-regression`.
- `F.31`: Natural-Terminal-/Death-Evidence bleibt unzureichend.

## Ziel

BT93H ist ein enger Folge-Reparaturblock vor `94A.1`. Ziel ist entweder ein artefaktbasiertes `BT94A-ready` oder ein erneutes, enger begruendetes `diagnose-blocked`. BT93H erzeugt keine Kandidatenlaeufe, keinen Freeze-Kandidaten, kein BT94B-Handover, kein Promote- oder Rollout-Signal.

## Scope

Erlaubte Scope-Dateien nach Intake:

- `python/train.py`
- `python/eval.py`
- `python/configs/**`
- `python/scripts/bt93h_*.py`
- `python/envs/**`
- `data/training/ppo/bt93h/**`
- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `docs/Fehlerberichte/**`
- `docs/bot-training/Bot_Trainingsplan.md` nur bei manueller Intake-Uebernahme

Training-nahe JS-Dateien bleiben nur dann im Scope, wenn der Befund ohne Harness-Korrektur nicht reproduzierbar ist:

- `scripts/training-headless-lane-runner.mjs`
- `src/state/training/EpisodeController.js`
- `src/state/training/RewardCalculator.js`
- `tests/training-*.mjs`

No-Go:

- Keine produktive Runtime-, Matchstart-, AI-Hub-, Policy-Registry- oder Strategy-Flag-Aenderung.
- Keine `94A.*`-Checkbox schliessen, solange `no_start_gate.json` rot ist.
- Kein Kandidatenlauf, kein Freeze-Kandidat, kein BT94B-Handover.
- Keine Umdeutung von `max-steps` oder `truncated` als Natural-Terminal-/Death-Qualitaet.
- Kein altes `data/bot_validation_report.json`, kein `plan:check` und kein Throughput-Report als PPO-Survival-Beweis.

## Vorgeschlagene Phasen

### 93H.1 Terminal-/Death-Root-Cause isolieren

- [ ] 93H.1.1 BT93G-Artefakte gegen Terminal-, Death-, Truncation- und Failure-Felder maschinenlesbar auditieren.
- [ ] 93H.1.2 Eine minimale Terminal-Provocation-Matrix definieren, die natuerliche Terminal-/Death-Cases erzeugen muss, ohne Runtime-Bypass.
- [ ] 93H.1.3 Headless- und Python-Eval-Pfade auf dieselbe Terminal-/Death-Semantik abgleichen; Drift wird Blocker, nicht Normalisierung.
- [ ] 93H.1.4 Ergebnis als `data/training/ppo/bt93h/terminal_root_cause_report.json` schreiben.

### 93H.2 Survival-Vergleichsbasis reparieren

- [ ] 93H.2.1 DQN-Anker, BT93C-Baseline, BT93G-Repair und Holdout-Matrix unveraendert referenzieren.
- [ ] 93H.2.2 Mindeststatistik vor Laufstart festlegen: Episodenanzahl, Median, Streuung, Survival-/Steps-Delta, Runtime-/Failure-Klassen.
- [ ] 93H.2.3 Regeln fuer `ppo-regression`, `hold`, `diagnose` und `BT94A-ready` vor dem Lauf fixieren.
- [ ] 93H.2.4 Ergebnis als `data/training/ppo/bt93h/survival_gate_contract.json` schreiben.

### 93H.3 Comparable Terminal Repair ausfuehren

- [ ] 93H.3.1 Nur `run-kind=comparable-terminal-repair` verwenden; nicht `candidate`, nicht `freeze`, nicht `promote`.
- [ ] 93H.3.2 Pre-Sampling-Masking beibehalten und Mask-/Veto-/Invalid-Raten getrennt von Post-Decode-Clamps berichten.
- [ ] 93H.3.3 Repair-Learner mit vorab fixiertem Budget laufen lassen und Modell-/Config-/Optimizer-/VecNormalize-Hashes pinnen.
- [ ] 93H.3.4 Eval und Holdout auf derselben Matrix ausfuehren; Natural-Terminal-/Death-Matrix muss nicht leer sein oder der Block endet `diagnose-blocked`.
- [ ] 93H.3.5 Ergebnis als `data/training/ppo/bt93h/repair_ladder_report.json` schreiben.

### 93H.4 Gate-Refresh und Handover-Entscheidung

- [ ] 93H.4.1 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93H-Artefakten neu schreiben.
- [ ] 93H.4.2 `bt94a_gate_check.py --write-report` erneut ausfuehren und unverfaelscht pinnen.
- [ ] 93H.4.3 Bei rotem Gate: `diagnose-blocked` mit Fehlerbericht, Folgegate und ohne `94A.*`-Closure dokumentieren.
- [ ] 93H.4.4 Bei gruenem Gate: `BT94A-ready` dokumentieren; Freeze bleibt bis `94A.3` verboten.

### 93H.99 Abschluss-Gate

- [ ] 93H.99.1 Alle Phasen 93H.1 bis 93H.4 sind mit versionierter Evidence dokumentiert.
- [ ] 93H.99.2 F.05/F.19/F.27/F.31 sind geschlossen, downgraded oder bleiben als konkrete Folgeblocker sichtbar.
- [ ] 93H.99.3 BT94A startet nur bei `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `bt94aBlockerCount=0`.
- [ ] 93H.99.4 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS oder als blockierend dokumentiert.

## Risiko-Register

| Risiko | Severity | Mitigation |
| --- | --- | --- |
| Terminal-Provocation wird zum Harness-Bypass | hoch | Nur training-nahe Semantik pruefen; produktive Runtime-/Matchstart-Surfaces bleiben read-only. |
| Survival-Regression wird durch Reward oder Max-Step kaschiert | hoch | Urteil basiert auf DQN-Anker, Median/Streuung, Terminal-/Death-Matrix und Failure-Klassen. |
| BT94A wird trotz rotem Gate vorbereitet | hoch | `94A.*` bleibt unangetastet; `no_start_gate.json` ist harte Claim-Grenze. |
| Reparaturblock wird zum neuen Kandidatenlauf | hoch | Run-Kind und Reports verbieten `candidate`, `freeze`, `promote`, `rollout-ready`. |

