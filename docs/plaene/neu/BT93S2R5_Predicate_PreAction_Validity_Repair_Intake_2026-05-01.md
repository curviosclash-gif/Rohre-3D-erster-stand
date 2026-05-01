# BT93S2R5 Predicate-/PreAction-Validity Repair Intake

Status: in `docs/bot-training/Bot_Trainingsplan.md` aufgenommen.
Quelle: `93S2R4.4=predicate-window-required` vom 2026-05-01.

## Anlass

`BT93S2R4.4` hat den Replay-Blocker erfolgreich getrennt: die Replay-/Reset-/
Warmup-/Session-Wahrheit ist stabil, aber Predicate-/PreAction-Validity bleibt
rot. Der Report
`data/training/ppo/bt93s2r4/predicate_window_stable_replay_report.json`
schreibt:

- `resultClass=predicate-window-required`
- `ok=false`
- `opensNext=[]`
- `replayAttemptCount=309` (`103` Rows x `3` Repeats)
- `replaySpecIdRepeatMismatchCount=0`
- `startMetricsHashRepeatMismatchCount=0`
- `warmupKeyRepeatMismatchCount=0`
- `sessionIdDriftCount=0`
- `predicateFailureCount=33`
- `measurementInvalidBeforeActionCount=33`
- `minimumWindowFailureCount=0`
- `warmupTerminalBeforeActionCount=0`
- `actionEffectOverrideCount=0`
- `newTrainingEpisodes=0`, `holdoutEpisodes=0`, `newOptimizerUpdates=0`

Rote Row-Gruppen:

| Scenario | Seed | Row-Count | Befund |
| --- | ---: | ---: | --- |
| `narrowing-corridor` | `1934` | `3` | Predicate-Fail erzeugt PreAction-Invalid. |
| `escape-right-open` | `930` | `8` | Predicate-Fail erzeugt PreAction-Invalid. |
| `escape-right-open` | `1930` | `9` | Predicate-Fail erzeugt PreAction-Invalid. |
| `no-danger-control` | `930` | `13` | Predicate-Fail erzeugt PreAction-Invalid fuer alle Action-Rows. |

Damit darf `93S2R4.5` nicht starten. `93S2R3.3/4/99`,
`BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A`, Candidate, Freeze,
Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben geschlossen.

## Harte Selbstkritik an BT93S2R4.4

BT93S2R4.4 war als Stop-Gate korrekt, aber als Reparaturvorbereitung noch zu
duenn. Diese Fehler muessen im Folgeblock behoben werden:

- Der Report zaehlt 33 rote Rows, speichert aber keine vollstaendigen
  Predicate-Operanden/Margins pro Repeat. Dadurch ist die naechste Reparatur
  ohne neue Metric-Ledger-Runde zu blind.
- Die roten Rows sind Action-Rows, aber der Fail ist pre-action. Actions duerfen
  nicht vorschnell als Ursache gelesen werden. BT93S2R5 muss nach
  Scenario/Seed/StartMetricsHash deduplizieren und nur dann Action-Spezifik
  behaupten, wenn StartMetrics vor Action wirklich actionabhaengig variieren.
- `measurementInvalidBeforeActionCount=33` ist hier eine Folge von
  `predicateFailureCount=33`, nicht ein Minimum-Window-, Warmup-Terminal- oder
  Replay-Problem. Der Folgeblock muss diese Ursache maschinenlesbar trennen.
- `no-danger-control` ist eine Neutral-Control, kein einfacher Predicate-Fix.
  Jede Reparatur muss verhindern, dass Neutral-Control spaeter Action-Gruen,
  Direction-Gruen oder Reward-Gruen erzeugt.
- `escape-right-open` hatte schon vorher Fairness-Risiko. Ein Predicate-Fix darf
  kein Action-Space-Urteil vorwegnehmen und muss positive Controls weiter
  messbar halten.
- Ein gruener Predicate-Fix darf nicht direkt `93S2R3.3` oder einen S2-Recheck
  oeffnen. Er oeffnet hoechstens `93S2R4.5`; dort muss der Full-Gate-Check
  weiter alle S2R4-Null-Counts beweisen.

## Ziel

BT93S2R5 repariert den verbleibenden Predicate-/PreAction-Validity-Blocker
professionell und eng. Der Block schafft genau die Voraussetzungen, damit
`93S2R4.5` wieder sinnvoll starten kann:

1. rote S2R4.4-Rows mit vollstaendigen Metrics, Predicate-Operanden,
   Schwellenabstaenden, Warmup-Plan, StartMetricsHash und Action-Grouping
   rekonstruieren,
2. pro unique Scenario/Seed/StartMetrics-Zustand genau eine primaere Ursache
   klassifizieren,
3. eine vorab gelockte Reparaturentscheidung fuer Predicate, Warmup, Seed oder
   Scenario-Contract treffen,
4. nur den eng begruendeten Vertrag reparieren, ohne ActionSurface, Reward,
   Telemetry, PPO-Training oder produktive Runtime zu beruehren,
5. die 103 Rows x 3 Repeats erneut messen,
6. bei Gruen nur `93S2R4.5` oeffnen; bei Rot `opensNext=[]` und exakte
   Folgeklasse schreiben.

## Nicht-Ziele

- Kein PPO-Training.
- Kein Holdout.
- Kein Reward-Fix.
- Kein Telemetry-Fix.
- Keine ActionSurface-Semantik-Aenderung.
- Keine Direction-, Fairness-, Retained-v2- oder Action-Quality-Bewertung vor
  reparierter PreAction-Validity.
- Keine produktive Runtime-, AI-Hub-, Strategy-, Registry- oder Matchstart-
  Aenderung.
- Kein `93S2R3.3-Reentry`, kein `BT93S2.3-Recheck`, kein `93S2.4`, kein
  `BT93T/U/W/O/P/94A`.
- Kein Candidate, Freeze, Promote, Rollout, PPO-Validate oder BT95-Signal.

## Harte Startbedingungen

- `93S2R4.3=deterministic-reset-warmup-repair-green` liegt versioniert vor.
- `93S2R4.4=predicate-window-required` liegt versioniert vor und schreibt
  `opensNext=[]`.
- S2R4.4-Drift-Counts bleiben Null:
  `replaySpecIdRepeatMismatchCount=0`,
  `startMetricsHashRepeatMismatchCount=0`,
  `warmupKeyRepeatMismatchCount=0`,
  `sessionIdDriftCount=0`.
- S2R4.4-Window-Counts bleiben Null:
  `minimumWindowFailureCount=0`,
  `warmupTerminalBeforeActionCount=0`.
- Bestehende `ActionSurfaceId=bt93q-walltrail-semantic-action-v1` und
  `decoderHash=970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
  bleiben gepinnt. Jede Drift endet als `action-surface-lineage-invalidated`.
- Jede neue Messung schreibt `newTrainingEpisodes=0`, `holdoutEpisodes=0`,
  `newOptimizerUpdates=0`.

## Repair-Klassen

| Klasse | Bedeutung | Erlaubte Reparatur |
| --- | --- | --- |
| `predicate-expression-stale` | Predicate-Ausdruck passt nicht mehr zum stabilen Startzustand, aber Controls bleiben fachlich korrekt. | Predicate-Vertrag anpassen, mit Margin-Begruendung und Kontrollschutz. |
| `seed-startstate-invalid` | Gepinnter Seed liefert nach deterministischem Reset keinen gueltigen Scenario-Start. | Nur Trainings-/Diagnose-Seed im Scenario-Contract ersetzen, Holdout bleibt unberuehrt. |
| `warmup-contract-required` | WarmupAction/WarmupSteps bewegen den Zustand aus dem Predicate-Fenster. | Warmup-Vertrag fuer betroffenes Scenario anpassen und neu locken. |
| `neutral-control-contract-required` | `no-danger-control` ist nicht neutral genug oder erzeugt spaeter falsches Gruen. | Neutral-Control-StartState/Predicate reparieren; Action-Gruen bleibt verboten. |
| `escape-right-fairness-predicate-required` | `escape-right-open` Predicate blockiert gueltige Fairness-/Positive-Control-Messung. | Predicate/Warmup/Seed reparieren, ohne Action-Space-Urteil zu oeffnen. |
| `metric-sampling-contract-required` | Predicate-Operanden sind nicht vollstaendig oder falsch gesampelt. | Metric-Sampling im Diagnose-Harness reparieren; Runtime bleibt read-only. |
| `scenario-contract-unrepairable` | Kein enger Fix im erlaubten Scope beweisbar. | Rot schliessen, `opensNext=[]`, neuer User-Entscheid/Replan. |

## Scope-Dateien

| Pfad | Modus | Zweck |
| --- | --- | --- |
| `python/scripts/bt93s2r5_*.py` | write | Failure-Ledger, Root-Cause, Repair-Contract, Empirical-Gate, Closure |
| `data/training/ppo/bt93s2r5/**` | write | versionierte S2R5-Evidence |
| `docs/bot-training/Bot_Trainingsplan.md` | write | Status, Evidence, Gate-Result |
| `docs/Fehlerberichte/2026-05-01_bt93s2r5_predicate_preaction_required.md` | write | Blocker- und Reparaturstatus |
| `data/training/ppo/bt93s2r4/**` | read | S2R4.1-4.4 Quellen, rote S2R4.4 Wahrheit |
| `data/training/ppo/bt93s2r3/**`, `data/training/ppo/bt93s2r2/**`, `data/training/ppo/bt93s2/**`, `data/training/ppo/bt93s2r/**` | read | historische Mess- und Vertragsquellen |
| `python/scripts/bt93s2r4_predicate_window_stable_replay.py` | conditional write | nur um S2R5-Repaired-Contract als explizite Recheck-Quelle zu akzeptieren |
| `python/scripts/bt93s2_scenario_matrix_v2.py` | conditional write | nur falls Root-Cause den Scenario-/Predicate-/Warmup-Vertrag dort eindeutig belegt |
| `python/envs/curvios_env.py` | conditional write | nur bei `metric-sampling-contract-required` oder nachgewiesener Diagnose-Env-Messursache |
| `python/envs/ppo_action_surface.py` | read-only | ActionSurfaceId/Decoder-Hash pinnen, keine Semantik-Aenderung |
| `scripts/training-headless-lane-runner.mjs` | read-only | Runner-Hash pinnen; S2R5 ist kein neuer Runner-Fix |
| produktive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart-Surfaces | read-only | Layer-Grenze |

Conditional-write-Regel: Jede Aenderung ausserhalb `python/scripts/bt93s2r5_*.py`
braucht vorher maschinenlesbare Root-Cause-Evidence aus `93S2R5.1/93S2R5.2`.
Keine ActionSurface-, Reward-, Telemetry-, PPO-Training- oder produktive
Runtime-Semantik darf in diesem Block geaendert werden.

## Definition of Done

- [ ] DoD.S2R5-1 Source-Lock pinnt S2R4.4, S2R4.3, S2R4.2, S2R4.1,
  S2R3.2, MatrixId, ContractId, ActionSurfaceId, Decoder-Hash, Git-SHA,
  ReportHashes, SampleCounts und die 33 roten Row-IDs.
- [ ] DoD.S2R5-2 Failure-Ledger schreibt fuer alle 33 roten Rows und alle
  unique Scenario/Seed/StartMetrics-Zustaende: Predicate-Operanden, Predicate-
  Ausdruck, Predicate-Funktion, Schwellenabstand, StartMetricsHash,
  WarmupKey, replaySpecId, sessionReplayId, Action-Liste und Repeat-Stabilitaet.
- [ ] DoD.S2R5-3 Root-Cause-Report klassifiziert jede unique rote
  Scenario/Seed/StartMetrics-Gruppe mit genau einer Primaerklasse aus der
  Repair-Klassen-Allowlist und zaehlt `unknownRootCauseCount=0`.
- [ ] DoD.S2R5-4 Vor jeder Reparatur liegt ein gelockter Repair-Contract mit
  Grenzwerten, Kontrollschutz, betroffenen Szenarien, erlaubten Dateien,
  Invalidation-Regeln und `no-post-hoc-threshold-change=true` vor.
- [ ] DoD.S2R5-5 Die Reparatur ist eng: nur Predicate-/Warmup-/Seed-/
  Scenario-Contract oder Diagnose-Metric-Sampling nach Root-Cause. Keine
  ActionSurface-, Reward-, Telemetry-, PPO- oder Runtime-Semantik.
- [ ] DoD.S2R5-6 Empirical-Gate laeuft mindestens auf denselben 103 S2R4-Rows
  x 3 Repeats (`replayAttemptCount>=309`) und schreibt:
  `predicateFailureCount=0`,
  `measurementInvalidBeforeActionCount=0`,
  `minimumWindowFailureCount=0`,
  `warmupTerminalBeforeActionCount=0`,
  `replaySpecIdRepeatMismatchCount=0`,
  `startMetricsHashRepeatMismatchCount=0`,
  `warmupKeyRepeatMismatchCount=0`,
  `sessionIdDriftCount=0`.
- [ ] DoD.S2R5-7 `no-danger-control` bleibt neutral: `neutralControlActionGreenAllowed=false`,
  `neutralControlActionGreenProduced=false`, `neutralControlRequiredCount=0`.
- [ ] DoD.S2R5-8 `escape-right-open` bleibt Fairness-first: kein
  `action-space-required` oder Action-Quality-Urteil aus S2R5; positive
  Controls bleiben im gueltigen Predicate-Fenster messbar.
- [ ] DoD.S2R5-9 Action-Row-Korrelation wird nicht als Ursache gewertet, wenn
  gleiche Scenario/Seed/StartMetricsHash ueber mehrere Actions identisch ist.
- [ ] DoD.S2R5-10 Closure schreibt genau eine erlaubte Resultklasse,
  `allowNext[]`, `opensNext[]`, `blocksNext[]`, ClaimFlags, SourceArtifacts,
  SampleCounts, Invalidations und klare NextAllowedActions.
- [ ] DoD.S2R5-11 Gruen oeffnet nur `93S2R4.5`; jede rote Resultklasse oeffnet
  nichts.
- [ ] DoD.S2R5-12 `npm.cmd run gates:pre-commit` ist gruen oder ein exakter
  Gate-Blocker ist dokumentiert.

## Phasen

### 93S2R5.1 Failure-Ledger und Metric-Margin-Audit

- [ ] 93S2R5.1.1 S2R4.4/S2R4.3/S2R4.2/S2R4.1/S2R3.2 Quellen mit Hash,
  ResultClass, ReportHash, Git-SHA und Count-Snapshot locken.
- [ ] 93S2R5.1.2 Alle 33 roten Rows erneut mit Metrics pro Repeat schreiben:
  Predicate-Operanden, Predicate-Margin, StartMetricsHash, WarmupKey,
  replaySpecId, sessionReplayId, ActionName und ActionToken.
- [ ] 93S2R5.1.3 Rote Rows nach Scenario/Seed/StartMetricsHash deduplizieren;
  Action darf nur dann Root-Cause sein, wenn StartMetrics vor Action
  actionabhaengig driften.
- [ ] 93S2R5.1.4 Fehlerbericht
  `docs/Fehlerberichte/2026-05-01_bt93s2r5_predicate_preaction_required.md`
  mit Befundmatrix, No-Go-Status und Root-Cause-Hypothesen schreiben.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_failure_ledger.json`
- `docs/Fehlerberichte/2026-05-01_bt93s2r5_predicate_preaction_required.md`

### 93S2R5.2 Root-Cause-Entscheid und Repair-Contract

- [ ] 93S2R5.2.1 Pro unique rote Gruppe genau eine Repair-Klasse waehlen:
  `predicate-expression-stale`, `seed-startstate-invalid`,
  `warmup-contract-required`, `neutral-control-contract-required`,
  `escape-right-fairness-predicate-required`,
  `metric-sampling-contract-required` oder `scenario-contract-unrepairable`.
- [ ] 93S2R5.2.2 Repair-Contract pinnt vor Umsetzung: alte und neue
  Predicate-Ausdruecke, alte und neue Warmup-/Seed-Werte, Kontrollschutz,
  Threshold-Margins, SourceHashes und Invalidations.
- [ ] 93S2R5.2.3 Wenn mehr als eine plausible Ursache ohne klare Primaerklasse
  bleibt, endet die Phase `measurement-invalid` und oeffnet nichts.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_repair_contract.json`

### 93S2R5.3 Enger Predicate-/StartState-/Warmup-Repair

- [ ] 93S2R5.3.1 Reparatur exakt gemaess Repair-Contract anwenden; keine
  weitere Datei ausserhalb der erlaubten Scope-Liste beruehren.
- [ ] 93S2R5.3.2 `no-danger-control` als Neutral-Control sichern:
  kein Action-Gruen, kein Direction-Gruen, kein Reward-Gruen.
- [ ] 93S2R5.3.3 `escape-right-open` Fairness sichern:
  gueltiges Predicate-Fenster fuer Positive Controls, aber kein Action-Space-
  oder Action-Quality-Urteil.
- [ ] 93S2R5.3.4 Repaired-Contract schreibt Lineage zu S2R4.4 und markiert
  alte rote Reports als Kontext, nicht als Gruen.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_repair_report.json`

### 93S2R5.4 Empirical Recheck auf repariertem Vertrag

- [ ] 93S2R5.4.1 Recheck laeuft auf mindestens 103 Rows x 3 Repeats und nutzt
  den in `93S2R5.2` gelockten Repair-Contract.
- [ ] 93S2R5.4.2 Gruen verlangt alle S2R5-DoD-6 Counts exakt 0.
- [ ] 93S2R5.4.3 Bei Rot schreibt der Report exakt die naechste enge
  Reparaturklasse und `opensNext=[]`.

Evidence:

- `data/training/ppo/bt93s2r5/predicate_preaction_empirical_gate.json`

### 93S2R5.99 Closure

- [ ] 93S2R5.99.1 Closure schreibt genau eine Resultklasse:
  `predicate-window-repair-green`, `predicate-contract-required`,
  `seed-startstate-required`, `warmup-contract-required`,
  `neutral-control-contract-required`,
  `escape-right-fairness-predicate-required`,
  `metric-sampling-contract-required`,
  `scenario-contract-unrepairable`,
  `action-surface-lineage-invalidated` oder `measurement-invalid`.
- [ ] 93S2R5.99.2 Closure schreibt `allowNext[]`, `opensNext[]`,
  `blocksNext[]`, ClaimFlags, SourceArtifacts, SampleCounts, Invalidations und
  klare NextAllowedActions.
- [ ] 93S2R5.99.3 Gruen oeffnet nur `93S2R4.5`; jede rote Resultklasse oeffnet
  nichts.
- [ ] 93S2R5.99.4 Abschluss-Gate: `npm.cmd run gates:pre-commit`.

Evidence:

- `data/training/ppo/bt93s2r5/bt93s2r5_closure_gate_report.json`

## Result-Class-Vertrag

| ResultClass | Bedeutung | Erlaubt |
| --- | --- | --- |
| `predicate-window-repair-green` | Predicate-/PreAction-Validity ist nach Reparatur auf 103 Rows x 3 Repeats gruen | nur `93S2R4.5` |
| `predicate-contract-required` | Predicate-Ausdruck/Schwellen/Margins bleiben ungueltig | enger Folgefix, kein Next |
| `seed-startstate-required` | gepinnter Seed/StartState bleibt ungueltig | enger Seed-/StartState-Fix, kein Next |
| `warmup-contract-required` | Warmup bewegt State aus dem gueltigen Fenster | enger Warmup-Fix, kein Next |
| `neutral-control-contract-required` | no-danger-control ist nicht neutral oder erzeugt falsches Gruen | enger Neutral-Control-Fix, kein Next |
| `escape-right-fairness-predicate-required` | escape-right Predicate/Fairness bleibt nicht urteilsfaehig | enger Fairness-/Predicate-Fix, kein Next |
| `metric-sampling-contract-required` | Predicate-Operanden/Metrics sind nicht beweisfaehig | enger Diagnose-Harness-Fix, kein Next |
| `scenario-contract-unrepairable` | kein enger Repair im erlaubten Scope beweisbar | User-Entscheid/Replan, kein Next |
| `action-surface-lineage-invalidated` | ActionSurfaceId oder Decoder-Hash driftet | Stop, neuer Lineage-Entscheid |
| `measurement-invalid` | Quellen, Versionierung, SampleCounts oder Messung ungueltig | nichts |

## Risiko-Register

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Row-Count wird mit StartState-Count verwechselt | kritisch | RL/QA | Dedupe nach Scenario/Seed/StartMetricsHash und Action-Korrelation getrennt reporten | Action wird als Ursache genannt, obwohl StartMetrics identisch sind |
| Predicate wird kosmetisch gelockert | kritisch | RL | Repair-Contract mit Margins, Controls und `no-post-hoc-threshold-change=true` | Predicate-Gruen ohne Kontrollschutz |
| no-danger-control erzeugt spaeter falsches Gruen | kritisch | QA | Neutral-Control als eigenes Null-Count-Gate | `neutralControlActionGreenProduced=true` |
| escape-right wird zu frueh Action-Space | hoch | RL | Fairness-first, kein Action-Space-Urteil in S2R5 | `action-space-required` aus S2R5 |
| Seed-Reparatur verbraucht Holdout | kritisch | Governance | nur Diagnose-/Repair-Seeds; `holdoutEpisodes=0` | Holdout-Seed im Repair-Contract |
| ActionSurface-/Reward-/Telemetry-Drift | kritisch | Governance | Scope-Dateien und SourceHashes pinnen | ActionSurface/Reward/Telemetry-Datei im Diff |
| Full-Gate wird uebersprungen | kritisch | Governance | S2R5-Gruen oeffnet nur `93S2R4.5`, nicht S2R3 oder S2-Recheck | `93S2R3.3` oder S2-Recheck claimbar |
| Alte rote Reports werden als neue Evidence gelesen | hoch | QA | S2R5 schreibt eigene Artefakte und markiert alte Reports nur als Quellen | S2R4.4-Report als Gruen |

## Harte Selbstpruefung dieses Replans

- Fehler im ersten Entwurf waere, `93S2R4.5` direkt aus dem roten S2R4.4 zu
  starten. Korrektur: S2R5 ist ein P0-Interposer; `93S2R4.5` oeffnet nur bei
  `predicate-window-repair-green`.
- Fehler waere, die 33 roten Rows als 33 unabhaengige Ursachen zu behandeln.
  Korrektur: S2R5 dedupliziert nach Scenario/Seed/StartMetricsHash und prueft
  Action-Korrelation separat.
- Fehler waere, Predicate-Schwellen ohne Kontrollschutz zu lockern. Korrektur:
  Repair-Contract pinnt Margins, positive/negative/neutral Controls und
  verbietet nachtraegliche Threshold-Aenderung.
- Fehler waere, `no-danger-control` wie ein normales Scenario zu behandeln.
  Korrektur: Neutral-Control hat eigene DoD, Risiko und ResultClass.
- Fehler waere, `escape-right-open` als Action-Space-Problem zu lesen.
  Korrektur: S2R5 repariert nur Predicate/Fairness-Voraussetzungen und erzeugt
  kein Action-Quality-Urteil.
- Fehler waere, nach gruenem S2R5 Bot-Qualitaet zu behaupten. Korrektur: Gruen
  oeffnet nur `93S2R4.5`; S2R4.99, S2R3-Reentry, S2-Recheck und alle
  Trainings-/Candidate-Pfade bleiben geschlossen.
