# BT93S2R3 Predicate-/Window-/Env-Measurement Reentry Intake

Status: fuer `docs/bot-training/Bot_Trainingsplan.md` aufgenommen.
Quelle: `BT93S2R2.99=measurement-invalid` vom 2026-05-01.

## Anlass

`BT93S2R2` hat den roten Recheck nicht repariert. Der Abschluss
`data/training/ppo/bt93s2r2/bt93s2r2_closure_gate_report.json` schreibt:

- `resultClass=measurement-invalid`
- `opensNext=[]`
- `predicateFailureCount=39`
- `minimumWindowFailureCount=11`
- `measurementInvalidCount=49`
- `directionMismatchCount=24`
- `escapeRightFairnessFailureCount=1`
- `retainedV2MeasurementInvalidCount=28`
- `neutralControlRequiredCount=1`
- `negativeControlFailedCount=0`
- `newTrainingEpisodes=0`, `holdoutEpisodes=0`

Damit ist kein frischer `BT93S2.3-Recheck` erlaubt. `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben geschlossen.

## Harte Selbstkritik an BT93S2R2

BT93S2R2 war zu optimistisch im Contract-Layer. `93S2R2.2` wurde gruen, aber
`93S2R2.3` blieb empirisch rot. Das beweist: der Repair-Vertrag hat zwar
Ausdruck/Funktion/StartMetrics formal abgeglichen, aber nicht hart genug
erzwungen, dass jede Seed/Action/Scenario-Probe vor der Action-Wirkung dieselbe
Replay-Wahrheit hat.

Die groessten Fehler:

- Predicate-/Window-Reparatur wurde nicht als fail-fast Preflight vor jeder
  Action-Wirkung modelliert; dadurch konnten 39 Predicate-Fails und 11
  Window-Fails erst im empirischen Gate sichtbar werden.
- Direction-Contract war nicht eigenstaendig genug. 24 Direction-Mismatches
  zeigen, dass "existing-action-effect-observed" falsch positiv sein kann, wenn
  die erwartete Wirkungsrichtung nicht pro Szenario/Action/Seed hart gepinnt ist.
- Retained-v2-Szenarien wurden nicht hart quarantiniert. 28 retained-v2
  Measurement-Invalids duerfen nie Kontext-Gruen oder Telemetry-Fortsetzung
  erzeugen.
- `escape-right-open` wurde weiterhin an Action-Space/Action-Effect angenaehert,
  obwohl `escapeRightFairnessFailureCount=1` zeigt, dass das Fairness-Fenster
  noch nicht urteilsfaehig ist.
- `no-danger-control` wurde nicht ausreichend stabilisiert; ein
  Neutral-Control-Fail darf kein Action-Gruen und keinen Recheck oeffnen.
- Der rote Abschluss hat zwar sauber gestoppt, aber der Folge-Replan muss jetzt
  enger sein als S2R2: keine neuen Matrix-/Action-Surface-Ambitionen, sondern
  zuerst reine Messgueltigkeit.

Nachschaerfung: BT93S2R3 muss alle roten Count-Klassen als eigene Gates fuehren.
Gruen ist nur erlaubt, wenn jeder Count auf 0 steht und das maschinenlesbar mit
echten Env-Proben belegt ist.

## Ziel

BT93S2R3 repariert die Messvoraussetzungen fuer einen spaeteren frischen
`BT93S2.3-Recheck`. Der Block schafft nur die Preconditions zum Weiterarbeiten:

1. deterministische Replay-Identitaet je Scenario/Seed/Action,
2. Predicate-/Window-Fail-Fast vor Action-Wirkung,
3. Direction-Contract mit erwarteter Zustandswirkung,
4. Escape-Right-Fairness vor Action-Space-Urteil,
5. Retained-v2-Quarantaene bis Null-Counts,
6. stabile Neutral-Control ohne falsches Action-Gruen,
7. Closure mit `opensNext=[]` bei rot oder genau `BT93S2.3-Recheck` bei gruen.

## Nicht-Ziele

- Kein PPO-Training.
- Kein Holdout.
- Keine ActionSurface-Aenderung.
- Kein Reward-Fix.
- Kein Telemetry-Fix.
- Kein Runtime-, AI-Hub-, Registry-, Strategy-, Matchstart- oder Produktpfad.
- Kein `93S2.4`, kein `BT93T/U/W/O/P/94A`.
- Kein Candidate, Freeze, Promote, Rollout, PPO-Validate oder BT95-Signal.

## Harte Startbedingungen

- `BT93S2R2.99=measurement-invalid` liegt versioniert vor.
- `BT93S2R2` oeffnet nichts: `opensNext=[]`.
- Alle S2R2-Quellen bleiben read-only Evidence; S2R3 schreibt eigene Artefakte.
- Bestehende ActionSurfaceId und Decoder-Hash werden gepinnt; Drift endet als
  `action-surface-lineage-invalidated` oder `measurement-invalid`.
- Jede neue Messung schreibt `newTrainingEpisodes=0`, `holdoutEpisodes=0`,
  `newOptimizerUpdates=0`.

## Failure-Matrix

| Szenario | Predicate | Window | Invalid | Direction | Fairness | Retained-v2 | Neutral | Reparaturpflicht |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `escape-left-open` | 13 | 1 | 13 | 7 | 0 | 0 | 0 | Predicate/Window vor Escape, Direction-Contract, Negative-Control bleibt first-class. |
| `escape-right-open` | 6 | 0 | 6 | 0 | 1 | 0 | 0 | Fairness-Fenster vor Action-Space-Urteil; Positive Controls muessen messbar sein. |
| `frontal-near-wall` | 2 | 4 | 6 | 3 | 0 | 6 | 0 | Retained-v2-Quarantaene und Direction-Erwartung. |
| `narrowing-corridor` | 5 | 1 | 6 | 2 | 0 | 6 | 0 | Predicate-/Window-Fail-Fast und Direction-Erwartung. |
| `no-danger-control` | 2 | 0 | 2 | 0 | 0 | 0 | 1 | Neutral-Control darf kein Action-Gruen erzeugen. |
| `side-wall-left` | 0 | 0 | 0 | 1 | 0 | 0 | 0 | Direction-Falschpositiv isolieren. |
| `side-wall-right` | 2 | 0 | 2 | 2 | 0 | 2 | 0 | Predicate und Direction nicht aus retained-v2 uebernehmen. |
| `trail-ahead` | 4 | 4 | 8 | 4 | 0 | 8 | 0 | Trail bleibt Messblocker, nicht Telemetry-Gruen. |
| `trail-side` | 5 | 1 | 6 | 5 | 0 | 6 | 0 | Trail bleibt Messblocker, nicht Telemetry-Gruen. |

Root-Cause-Pflichtfelder aus S2R2:

- `start-metrics-drift=36`
- `neutral-control-unstable=26`
- `direction-contract-mismatch=21`
- `env-measurement-drift=11`
- `minimum-window-fail=7`
- `negative-control-fail=1`
- `warmup-seed-drift=1`

## Scope-Dateien

| Pfad | Modus | Zweck |
| --- | --- | --- |
| `python/scripts/bt93s2r3_*.py` | write | Failure-Ledger, Replay-Preflight, Predicate-/Window-Fail-Fast, Direction/Fairness/Neutral-Gate, Closure |
| `data/training/ppo/bt93s2r3/**` | write | versionierte S2R3-Evidence |
| `docs/bot-training/Bot_Trainingsplan.md` | write | Status, Evidence, Gate-Result |
| `docs/Fehlerberichte/2026-05-01_bt93s2r3_measurement_reentry_required.md` | write | Blocker-/Root-Cause-Status |
| `data/training/ppo/bt93s2r2/**` | read | rote S2R2-Quelle und Hashes |
| `data/training/ppo/bt93s2/**`, `data/training/ppo/bt93s2r/**` | read | S2/S2R Source-Artefakte |
| `python/scripts/bt93s2_existing_action_effect_v3_recheck.py`, `python/scripts/bt93s2r2_*.py` | read | Referenzlogik; keine Rueckschreib-Reparatur in alten Artefakten |
| `python/envs/ppo_action_surface.py` | read-only | ActionSurfaceId/Decoder-Hash pinnen |
| produktive Runtime-/AI-Hub-/Matchstart-/Strategy-/Registry-Surfaces | read-only | Layer-Grenze |

## Definition of Done

- [ ] DoD.S2R3-1 Source-Lock pinnt S2R2-Closure, S2R2-Empirical-Gate,
  S2R2-Failure-Taxonomie, S2R2-Repair-Contract, S2R-Closure, MatrixId,
  ContractId, ActionSurfaceId, Decoder-Hash, Git-SHA und SampleCounts.
- [ ] DoD.S2R3-2 Failure-Ledger schreibt jede rote Scenario/Seed/Action-Zeile
  mit Primaerklasse, Sekundaerklassen, StartMetrics-Hash, Warmup-Key,
  SessionReplayId, ExpectedDirection und Retained-v2-Status.
- [ ] DoD.S2R3-3 Replay-Preflight beweist deterministische StartMetrics und
  Warmup-Wahrheit vor Action-Wirkung; jede Drift endet vor Action-Messung.
- [ ] DoD.S2R3-4 Predicate-/Window-Fail-Fast verlangt vor jeder Action:
  `predicatePass=true`, `completedMinimumWindow=true`,
  `warmupTerminalBeforeAction=false`, `measurementInvalidBeforeAction=false`.
- [ ] DoD.S2R3-5 Direction-Contract pinnt pro Scenario/Action die erwartete
  Zustandswirkung und zaehlt Wrong-Direction-Success als Failure, auch wenn
  Reward oder Command-Flags positiv sind.
- [ ] DoD.S2R3-6 Escape-Right-Fairness blockiert jedes Action-Space-Urteil, bis
  positive Controls im gueltigen Fenster messbar sind.
- [ ] DoD.S2R3-7 Retained-v2-Szenarien bleiben quarantiniert, bis
  `retainedV2MeasurementInvalidCount=0` fuer alle retained Szenarien gilt.
- [ ] DoD.S2R3-8 `no-danger-control` schreibt `neutralControlRequiredCount=0`
  und darf kein Action-Gruen oder Direction-Gruen erzeugen.
- [ ] DoD.S2R3-9 Empirical-Zero-Gate schreibt echte Env-Proben mit
  `predicateFailureCount=0`, `minimumWindowFailureCount=0`,
  `measurementInvalidCount=0`, `directionMismatchCount=0`,
  `escapeRightFairnessFailureCount=0`, `retainedV2MeasurementInvalidCount=0`,
  `neutralControlRequiredCount=0`, `negativeControlFailedCount=0`,
  `newTrainingEpisodes=0`, `holdoutEpisodes=0`.
- [ ] DoD.S2R3-10 Closure schreibt genau eine erlaubte Resultklasse,
  `allowNext[]`, `opensNext[]`, `blocksNext[]`, ClaimFlags, SourceArtifacts,
  SampleCounts, Invalidations und klare NextAllowedActions.
- [ ] DoD.S2R3-11 Gruen oeffnet nur `BT93S2.3-Recheck`; rot oeffnet nichts.
- [ ] DoD.S2R3-12 `npm.cmd run gates:pre-commit` ist gruen oder ein exakter
  Gate-Blocker ist dokumentiert.

## Phasen

### 93S2R3.1 Source-Lock und Failure-Ledger

- [ ] 93S2R3.1.1 Alle S2R2/S2R/S2-Quellen mit Hash, ResultClass,
  Count-Snapshot, Git-SHA und Lineage-Feldern locken.
- [ ] 93S2R3.1.2 Jede der 103 Taxonomy-Failure-Rows in ein Ledger mit
  Scenario, Seed, Action, Primaerklasse, Sekundaerklasse, Retained-v2-Status,
  Direction-Erwartung und Replay-Key normalisieren.
- [ ] 93S2R3.1.3 Fehlerbericht
  `docs/Fehlerberichte/2026-05-01_bt93s2r3_measurement_reentry_required.md`
  mit Befundmatrix und No-Go-Status schreiben.

Evidence:

- `data/training/ppo/bt93s2r3/failure_ledger_report.json`
- `docs/Fehlerberichte/2026-05-01_bt93s2r3_measurement_reentry_required.md`

### 93S2R3.2 Replay-Determinismus und Predicate-/Window-Fail-Fast

- [ ] 93S2R3.2.1 Pro Scenario/Seed/Action einen reproduzierbaren
  SessionReplayId aus MatrixId, ScenarioId, Seed, Action, Warmup, StartMetrics
  und ActionSurfaceHash schreiben.
- [ ] 93S2R3.2.2 StartMetrics, Warmup, Predicate-Ausdruck,
  Predicate-Funktion und Minimum-Window vor Action-Wirkung neu messen.
- [ ] 93S2R3.2.3 Jede Abweichung erzeugt `replay-determinism-required`,
  `predicate-window-required` oder `measurement-invalid`; keine spaetere
  Action-Wirkung darf diese Preflight-Failures ueberstimmen.

Evidence:

- `data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json`

### 93S2R3.3 Direction-, Escape-Fairness- und Neutral-Control-Contract

- [ ] 93S2R3.3.1 Pro Scenario/Action ExpectedDirection, verbotene Gegenrichtung,
  erlaubte StateEffect-Signale und Reward-/Command-Flag-Ausschluss pinnen.
- [ ] 93S2R3.3.2 `escape-right-open` Fairness-First messen: positive Controls
  muessen im gueltigen Fenster messbar sein, bevor `action-space-required`
  ueberhaupt erlaubt ist.
- [ ] 93S2R3.3.3 `no-danger-control` stabilisieren: Neutral-Control darf weder
  Success noch Direction-Gruen noch Action-Gruen erzeugen.

Evidence:

- `data/training/ppo/bt93s2r3/direction_fairness_neutral_contract.json`

### 93S2R3.4 Retained-v2-Quarantaene und Full-Scenario Empirical Gate

- [ ] 93S2R3.4.1 Alle retained-v2 Szenarien separat gegen die neuen
  Preflight- und Direction-Vertraege messen.
- [ ] 93S2R3.4.2 Full-Scenario-Gate laeuft auf mindestens derselben
  9-Szenario/13-Action/338-Probe-Matrix; niedrigere SampleCounts sind
  `measurement-invalid`.
- [ ] 93S2R3.4.3 Null-Count-Gate verlangt alle S2R3-DoD-9 Counts exakt 0.

Evidence:

- `data/training/ppo/bt93s2r3/empirical_zero_gate_report.json`

### 93S2R3.99 Closure

- [ ] 93S2R3.99.1 Closure schreibt genau eine Resultklasse:
  `matrix-control-reentry-green`, `replay-determinism-required`,
  `predicate-window-required`, `direction-contract-required`,
  `escape-right-fairness-required`, `retained-v2-measurement-required`,
  `neutral-control-required`, `action-surface-lineage-invalidated` oder
  `measurement-invalid`.
- [ ] 93S2R3.99.2 Closure schreibt `allowNext[]`, `opensNext[]`,
  `blocksNext[]`, ClaimFlags, SampleCounts, SourceArtifacts und Invalidations.
- [ ] 93S2R3.99.3 Gruen oeffnet nur `BT93S2.3-Recheck`; jede rote Resultklasse
  oeffnet nichts und benennt den naechsten engen Reparaturbedarf.
- [ ] 93S2R3.99.4 Abschluss-Gate: `npm.cmd run gates:pre-commit`.

Evidence:

- `data/training/ppo/bt93s2r3/bt93s2r3_closure_gate_report.json`

## Result-Class-Vertrag

| ResultClass | Bedeutung | Erlaubt |
| --- | --- | --- |
| `matrix-control-reentry-green` | alle S2R3 Null-Count-Gates empirisch gruen | nur frischer `BT93S2.3-Recheck` |
| `replay-determinism-required` | StartMetrics/Warmup/SessionReplay driftet | enger S2R3-Folgefix, kein Recheck |
| `predicate-window-required` | Predicate oder Minimum-Window bleibt rot | enger S2R3-Folgefix, kein Recheck |
| `direction-contract-required` | Wrong-Direction-Success oder Direction-Drift bleibt rot | enger S2R3-Folgefix, kein Recheck |
| `escape-right-fairness-required` | positive Controls sind nicht fair messbar | enger S2R3-Folgefix, kein Recheck |
| `retained-v2-measurement-required` | retained-v2 Szenarien bleiben measurement-invalid | enger S2R3-Folgefix, kein Recheck |
| `neutral-control-required` | no-danger-control bleibt instabil oder erzeugt Gruen | enger S2R3-Folgefix, kein Recheck |
| `action-surface-lineage-invalidated` | ActionSurface/Decoder driftet | Stop, neuer Lineage-Entscheid |
| `measurement-invalid` | Quellen, Versionierung, SampleCounts oder Messung ungueltig | nichts |

## Risiken

| Risiko | Severity | Mitigation | Trigger |
| --- | --- | --- | --- |
| Report-only-Gruen statt Env-Gruen | kritisch | Full empirical zero gate mit echten Proben und SampleCount-Untergrenze | Contract gruen ohne 338+ Proben |
| Direction-Falschpositive bleiben als Action-Gruen stehen | kritisch | ExpectedDirection pro Scenario/Action/Seed und Wrong-Direction-Success-Fail | `directionMismatchCount > 0` |
| Retained-v2 kontaminiert Folgeentscheidungen | hoch | Retained-v2-Quarantaene als eigenes Null-Count-Gate | `retainedV2MeasurementInvalidCount > 0` |
| Escape-right wird zu frueh Action-Space-Thema | hoch | Fairness-First vor Action-Space-Urteil | `escapeRightFairnessFailureCount > 0` |
| Neutral-Control erzeugt falsches Gruen | hoch | neutral-control-required blockiert jedes Folge-Gruen | `neutralControlRequiredCount > 0` |
| Replay ist nicht deterministisch | kritisch | SessionReplayId und StartMetrics-Hash als Preflight | StartMetrics/Warmup-Hash driftet |
| Scope driftet in Training/Reward/Telemetry/Runtime | kritisch | Nicht-Ziele, ClaimFlags, Diff-Grenzen | PPO-, Reward-, Telemetry- oder Runtime-Datei im Diff |
| ActionSurface driftet unbemerkt | hoch | ActionSurfaceId/Decoder-Hash vor jeder Probe pinnen | Hash mismatch |

## Harte Selbstpruefung dieses Replans

- Der Replan darf nicht behaupten, dass BT93S2R3 Action-Qualitaet beweist.
  Nachschaerfung: selbst gruen oeffnet nur einen Recheck.
- Der Replan darf nicht nur Predicate/Window reparieren und Direction vergessen.
  Nachschaerfung: Direction hat eigene DoD, Phase und ResultClass.
- Der Replan darf retained-v2 nicht als Kontext behandeln.
  Nachschaerfung: retained-v2 ist ein Null-Count-Gate.
- Der Replan darf `no-danger-control` nicht als Nebensache fuehren.
  Nachschaerfung: Neutral-Control hat eigene DoD und ResultClass.
- Der Replan darf keine PPO-/Reward-/Telemetry-Arbeit vorbereiten.
  Nachschaerfung: Scope-Dateien und Nicht-Ziele schliessen diese Pfade aus.
- Der Replan darf keinen Fix-Planning-Go vortaeuschen, wenn rot bleibt.
  Nachschaerfung: nur der neue Block selbst wird claimbar; alle Downstream-Bloecke bleiben geschlossen.
