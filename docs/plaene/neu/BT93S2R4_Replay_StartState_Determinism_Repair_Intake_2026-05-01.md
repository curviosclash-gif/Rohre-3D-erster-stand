# BT93S2R4 Replay-/StartState-Determinism Repair Intake

Status: in `docs/bot-training/Bot_Trainingsplan.md` aufgenommen.
Quelle: `93S2R3.2=replay-determinism-required` vom 2026-05-01.

## Anlass

`BT93S2R3.2` hat die Messkette korrekt gestoppt. Der Report
`data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json` schreibt:

- `resultClass=replay-determinism-required`
- `preflightGreen=false`
- `opensNext=[]`
- `failureLedgerRowCount=103`
- `preflightRowCount=103`
- `replayAttemptCount=206`
- `repeatCount=2`
- `replayDeterminismFailureCount=103`
- `predicateFailureCount=25`
- `minimumWindowFailureCount=3`
- `measurementInvalidBeforeActionCount=27`
- `preActionFailFastCount=103`
- `session-replay-id-source-mismatch=103`
- `sessionReplayId-repeat-mismatch=103`
- `start-metrics-source-mismatch=103`
- `startMetricsHash-repeat-mismatch=103`
- `actionEffectOverrideCount=0`
- `newTrainingEpisodes=0`, `holdoutEpisodes=0`, `newOptimizerUpdates=0`

Damit darf `93S2R3.3` nicht starten. `BT93S2.3-Recheck`, `93S2.4`,
`BT93T/U/W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout,
PPO-Validate und BT95 bleiben geschlossen.

## Harte Selbstkritik an BT93S2R3

BT93S2R3 war als Stop-Gate wertvoll, aber nicht reparierend genug. Die
entscheidenden Fehler:

- Der `sessionReplayId` wurde aus beobachteten StartMetrics abgeleitet. Das ist
  als Drift-Sensor nuetzlich, aber als Replay-Identitaet falsch: wenn
  StartMetrics driften, driftet automatisch die ID. BT93S2R4 muss deshalb
  `replaySpecId` aus unveraenderlichen Inputs und `startMetricsHash` als
  separates Beobachtungssignal fuehren.
- `93S2R3.2` hat alle 103 Drift-Faelle sichtbar gemacht, aber nicht isoliert,
  ob die Ursache in Scenario-StartState, Env-Reset, Warmup, Seed/RNG,
  Session-ID, Headless-Runner, Metric-Sampling oder Hash-Rezept liegt.
- Der Vergleich gegen das S2R3.1-Ledger vermischt alte Source-Drift und frische
  Repeat-Drift. BT93S2R4 muss beide Klassen getrennt zaehlen:
  `sourceMismatchCount` und `repeatMismatchCount`.
- Predicate-/Window-Fails wurden korrekt fail-fast gemeldet, aber noch nicht
  nach Ursache getrennt. Erst nach stabiler Replay-Wahrheit darf zwischen
  echter Predicate-Drift, Minimum-Window-Konfiguration und Env-Terminalisierung
  entschieden werden.
- Die vorhandenen Direction-, Fairness-, Retained-v2- und Neutral-Control-Gates
  aus S2R3 duerfen nicht weiterlaufen, solange der Startzustand nicht
  deterministisch ist. Sonst wuerden sie wieder Symptomdaten bewerten.
- BT93S2R3.2 hat bewusst keine Action-Wirkung ueber Preflight-Rot gestellt.
  Diese gute Stop-Regel bleibt erhalten und wird in BT93S2R4 als harte
  Nicht-Ueberstimmungsregel fortgefuehrt.

Nachschaerfung: BT93S2R4 repariert zuerst die Replay-/StartState-Wahrheit.
Gruen ist erst erlaubt, wenn wiederholte Proben denselben `replaySpecId`,
denselben Warmup-Key, denselben StartMetrics-Hash und gueltige
Predicate-/Window-Vorbedingungen liefern.

## Ziel

BT93S2R4 schafft die Voraussetzungen, um S2R3 fachlich fortzusetzen. Der Block
repariert oder blockierend klassifiziert:

1. stabile Replay-Identitaet getrennt von beobachteten StartMetrics,
2. deterministische StartState-/Env-Reset-/Warmup-Wahrheit,
3. reproduzierbare StartMetrics ueber wiederholte Proben,
4. Predicate-/Window-Fail-Fast auf stabiler Replay-Basis,
5. Messvaliditaet vor jeder Direction-/Fairness-/Neutral-Control-Bewertung,
6. klare Stop-/Go-Resultklasse fuer den naechsten erlaubten Claim.

## Nicht-Ziele

- Kein PPO-Training.
- Kein Holdout.
- Kein Reward-Fix.
- Kein Telemetry-Fix.
- Keine ActionSurface-Semantik-Aenderung.
- Keine produktive Runtime-, AI-Hub-, Strategy-, Registry- oder Matchstart-
  Aenderung.
- Kein `BT93S2.3-Recheck`, kein `93S2.4`, kein `BT93T/U/W/O/P/94A`.
- Kein Candidate, Freeze, Promote, Rollout, PPO-Validate oder BT95-Signal.

## Harte Startbedingungen

- `data/training/ppo/bt93s2r3/replay_predicate_window_preflight.json` ist
  versioniert und schreibt `resultClass=replay-determinism-required`.
- `93S2R3.2` oeffnet nichts: `opensNext=[]`, `allowNext=[]`.
- `BT93S2R3.1` und `BT93S2R3.2` bleiben rote Quellen; BT93S2R4 schreibt eigene
  Artefakte unter `data/training/ppo/bt93s2r4/**`.
- Bestehende `ActionSurfaceId=bt93q-walltrail-semantic-action-v1` und
  `decoderHash=970cdbb342541554bc5a9222aeb58ee61f88634c3f89ff715a2d369af380c0a9`
  bleiben gepinnt. Jede Drift endet als `action-surface-lineage-invalidated`.
- Jede neue Messung schreibt `newTrainingEpisodes=0`, `holdoutEpisodes=0`,
  `newOptimizerUpdates=0`.

## Befundmatrix aus BT93S2R3.2

| Befund | Count | Konsequenz fuer BT93S2R4 |
| --- | ---: | --- |
| `replayDeterminismFailureCount` | 103 | Replay-Identitaet und StartMetrics muessen vor jedem weiteren Gate stabilisiert werden. |
| `session-replay-id-source-mismatch` | 103 | Source-Ledger und frische Replay-ID sind nicht vergleichbar oder StartMetrics driften bereits gegen Quelle. |
| `sessionReplayId-repeat-mismatch` | 103 | Wiederholte frische Proben sind nicht stabil genug fuer Direction/Fairness-Urteile. |
| `start-metrics-source-mismatch` | 103 | S2R3.1 StartMetricsHash kann nicht als stabile Wahrheit weitergenutzt werden. |
| `startMetricsHash-repeat-mismatch` | 103 | Env-Reset/Warmup/Seed/Session oder Metric-Sampling ist nondeterministisch. |
| `predicateFailureCount` | 25 | Predicate-Ausdruck/Funktion erst nach stabilen StartMetrics reparieren oder blockieren. |
| `minimumWindowFailureCount` | 3 | Minimum-Window muss nach Replay-Fix erneut gezaehlt werden. |
| `measurementInvalidBeforeActionCount` | 27 | Action-Wirkung bleibt verboten, solange Pre-Action ungueltig ist. |
| `warmupTerminalBeforeActionCount` | 0 | Warmup-Terminal ist aktuell nicht primaere Ursache, bleibt aber Gate-Feld. |
| `actionEffectOverrideCount` | 0 | Gute Stop-Regel beibehalten: Action-Effekt darf Preflight-Rot nie ueberstimmen. |

## Scope-Dateien

| Pfad | Modus | Zweck |
| --- | --- | --- |
| `python/scripts/bt93s2r4_*.py` | write | Source-Lock, Replay-Identity-Contract, Determinism-Audit, Predicate-/Window-Recheck, Closure |
| `data/training/ppo/bt93s2r4/**` | write | versionierte S2R4-Evidence |
| `docs/bot-training/Bot_Trainingsplan.md` | write | Status, Evidence, Gate-Result |
| `docs/Fehlerberichte/2026-05-01_bt93s2r4_replay_determinism_required.md` | write | Root-Cause-/Blocker-Status |
| `data/training/ppo/bt93s2r3/**` | read | rote S2R3-Quelle und Hashes |
| `data/training/ppo/bt93s2r2/**`, `data/training/ppo/bt93s2/**`, `data/training/ppo/bt93s2r/**` | read | historische Mess- und Vertragsquellen |
| `python/scripts/bt93s2r3_*.py`, `python/scripts/bt93s2r2_*.py`, `python/scripts/bt93s2_existing_action_effect_v3_recheck.py` | read | Referenzlogik, keine Rueckschreib-Reparatur in alten Reports |
| `python/envs/curvios_env.py` | conditional write | nur falls der Root-Cause-Report eine Python-Env-Reset-/Seed-/Warmup-Ursache beweist |
| `scripts/training-headless-lane-runner.mjs` | conditional write | nur falls der Root-Cause-Report eine Headless-Runner-Session-/Seed-Ursache beweist |
| `python/envs/ppo_action_surface.py` | read-only | ActionSurfaceId/Decoder-Hash pinnen, keine Semantik-Aenderung |
| produktive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart-Surfaces | read-only | Layer-Grenze |

Conditional-write-Regel: `python/envs/curvios_env.py` oder
`scripts/training-headless-lane-runner.mjs` duerfen nur geaendert werden, wenn
`93S2R4.1` maschinenlesbar eine konkrete Ursache dort nachweist. Jede
Semantik-Aenderung an ActionSurface, Reward, Telemetry oder produktiver Runtime
ist ausserhalb dieses Blocks.

## Definition of Done

- [ ] DoD.S2R4-1 Source-Lock pinnt S2R3.2-Preflight, S2R3.1-Ledger,
  S2R2-Closure, S2R2-Empirical-Gate, MatrixId, ContractId, ActionSurfaceId,
  Decoder-Hash, Git-SHA, ReportHash und SampleCounts.
- [ ] DoD.S2R4-2 Root-Cause-Audit trennt fuer alle 103 Rows:
  `sourceMismatch`, `repeatMismatch`, `startStateDrift`, `envResetDrift`,
  `warmupDrift`, `seedRngDrift`, `sessionIdDrift`, `metricSamplingDrift`,
  `hashRecipeDrift`, `predicateAfterReplayDrift`,
  `minimumWindowAfterReplayFail`, `measurementInvalidBeforeAction`.
- [ ] DoD.S2R4-3 `replaySpecId` ist von beobachteten StartMetrics getrennt und
  nur aus unveraenderlichen Inputs gebaut: MatrixId, ContractId, ScenarioId,
  Seed, Action, ActionToken, StartStateHash, WarmupPlanHash, EnvConfigHash,
  ActionSurfaceHash und RunnerHash.
- [ ] DoD.S2R4-4 `startMetricsHash` bleibt separates Beobachtungsfeld und muss
  ueber mindestens drei Wiederholungen je Failure-Ledger-Row stabil sein.
- [ ] DoD.S2R4-5 Falls der Root Cause im Python-Env-Reset, Warmup oder
  Headless-Runner liegt, repariert der Block genau diese Ursache und beweist
  danach `repeatMismatchCount=0`.
- [ ] DoD.S2R4-6 Falls die Ursache nicht in erlaubtem Scope reparierbar ist,
  endet der Block rot mit exakter Resultklasse und oeffnet nichts.
- [ ] DoD.S2R4-7 Predicate-/Window-Recheck laeuft erst nach
  `repeatMismatchCount=0`; danach muessen `predicateFailureCount=0`,
  `minimumWindowFailureCount=0` und `measurementInvalidBeforeActionCount=0`
  oder eine blockierende Resultklasse stehen.
- [ ] DoD.S2R4-8 Full-Gate laeuft mindestens auf den 103 roten S2R3.2-Rows mit
  mindestens drei Wiederholungen je Row (`replayAttemptCount>=309`).
- [ ] DoD.S2R4-9 Keine Action-Wirkung, Direction-, Fairness-, Retained-v2- oder
  Neutral-Control-Bewertung darf einen roten Replay-/Predicate-Preflight
  ueberstimmen.
- [ ] DoD.S2R4-10 Closure schreibt genau eine erlaubte Resultklasse,
  `allowNext[]`, `opensNext[]`, `blocksNext[]`, ClaimFlags, SourceArtifacts,
  SampleCounts, Invalidations und klare NextAllowedActions.
- [ ] DoD.S2R4-11 Gruen oeffnet nur `93S2R3.3-Reentry` innerhalb des
  bestehenden S2R3-Messblocks. Rot oeffnet nichts.
- [ ] DoD.S2R4-12 `npm.cmd run gates:pre-commit` ist gruen oder ein exakter
  Gate-Blocker ist dokumentiert.

## Phasen

### 93S2R4.1 Source-Lock und Root-Cause-Audit

- [ ] 93S2R4.1.1 Alle S2R3.2/S2R3.1/S2R2/S2R/S2-Quellen mit Hash,
  ResultClass, Count-Snapshot, Git-SHA, ReportHash und Lineage-Feldern locken.
- [ ] 93S2R4.1.2 Jede der 103 roten Rows nach Source-Drift, Repeat-Drift,
  StartState-, EnvReset-, Warmup-, Seed/RNG-, Session-, Metric- und Hash-Rezept-
  Ursache klassifizieren.
- [ ] 93S2R4.1.3 Fehlerbericht
  `docs/Fehlerberichte/2026-05-01_bt93s2r4_replay_determinism_required.md`
  mit Befundmatrix, erlaubtem Repair-Scope und No-Go-Status schreiben.

Evidence:

- `data/training/ppo/bt93s2r4/replay_root_cause_audit.json`
- `docs/Fehlerberichte/2026-05-01_bt93s2r4_replay_determinism_required.md`

### 93S2R4.2 Replay-Identity-Contract und Hash-Rezept-Reparatur

- [ ] 93S2R4.2.1 `replaySpecId` aus unveraenderlichen Inputs definieren und
  `startMetricsHash`/`warmupObservedHash` getrennt reporten.
- [ ] 93S2R4.2.2 Hash-Rezept gegen S2R3.2 validieren: ID-Stabilitaet darf
  StartMetrics-Drift nicht verstecken, sondern muss sie als eigenes Feld
  zaehlen.
- [ ] 93S2R4.2.3 `thresholdsLockedBeforeRun` pinnt RepeatCount, RowCount,
  SourceHashes, Min-Window, Predicate-Funktion, EnvConfigHash und RunnerHash
  vor dem ersten Reparaturlauf.

Evidence:

- `data/training/ppo/bt93s2r4/replay_identity_contract.json`

### 93S2R4.3 Deterministic-Reset-/Warmup-Repair

- [ ] 93S2R4.3.1 Minimal-Repro fuer mindestens eine Row je roter Klasse
  schreiben: StartState vor Reset, nach Reset, nach Warmup und vor Action.
- [ ] 93S2R4.3.2 Falls Ursache in `python/envs/curvios_env.py` oder
  `scripts/training-headless-lane-runner.mjs` liegt, genau diese Ursache
  reparieren und keine ActionSurface-/Reward-/Telemetry-/Runtime-Semantik
  aendern.
- [ ] 93S2R4.3.3 Repair-Gate beweist auf allen 103 Rows:
  `replaySpecIdRepeatMismatchCount=0`,
  `startMetricsHashRepeatMismatchCount=0`,
  `warmupKeyRepeatMismatchCount=0`,
  `sessionIdDriftCount=0`.

Evidence:

- `data/training/ppo/bt93s2r4/deterministic_reset_repair_report.json`

### 93S2R4.4 Predicate-/Window-Recheck auf stabiler Replay-Basis

- [ ] 93S2R4.4.1 Predicate-Ausdruck und Predicate-Funktion erst nach gruenem
  Replay-Repeat-Gate neu messen.
- [ ] 93S2R4.4.2 Minimum-Window und `measurementInvalidBeforeAction` auf allen
  103 Rows neu zaehlen.
- [ ] 93S2R4.4.3 Gruen verlangt:
  `predicateFailureCount=0`, `minimumWindowFailureCount=0`,
  `measurementInvalidBeforeActionCount=0`,
  `warmupTerminalBeforeActionCount=0`.

Evidence:

- `data/training/ppo/bt93s2r4/predicate_window_stable_replay_report.json`

### 93S2R4.5 Full Replacement Preflight und S2R3-Reentry-Entscheid

- [ ] 93S2R4.5.1 Full-Gate laeuft auf mindestens 103 Rows x 3 Repeats
  (`replayAttemptCount>=309`) und schreibt alle S2R4-Null-Counts.
- [ ] 93S2R4.5.2 Wenn gruen, oeffnet der Block nur `93S2R3.3-Reentry`;
  `BT93S2.3-Recheck`, `93S2.4`, `BT93T/U/W/O/P/94A` bleiben geschlossen.
- [ ] 93S2R4.5.3 Wenn rot, schreibt der Block exakt den naechsten engen
  Reparaturbedarf und `opensNext=[]`.

Evidence:

- `data/training/ppo/bt93s2r4/full_replay_preflight_gate.json`

### 93S2R4.99 Closure

- [ ] 93S2R4.99.1 Closure schreibt genau eine Resultklasse:
  `replay-startstate-green`, `replay-determinism-required`,
  `env-reset-required`, `warmup-contract-required`,
  `seed-rng-required`, `headless-runner-required`,
  `hash-recipe-required`, `predicate-window-required`,
  `action-surface-lineage-invalidated` oder `measurement-invalid`.
- [ ] 93S2R4.99.2 Closure schreibt `allowNext[]`, `opensNext[]`,
  `blocksNext[]`, ClaimFlags, SampleCounts, SourceArtifacts und Invalidations.
- [ ] 93S2R4.99.3 Gruen oeffnet nur `93S2R3.3-Reentry`; jede rote
  Resultklasse oeffnet nichts.
- [ ] 93S2R4.99.4 Abschluss-Gate: `npm.cmd run gates:pre-commit`.

Evidence:

- `data/training/ppo/bt93s2r4/bt93s2r4_closure_gate_report.json`

## Result-Class-Vertrag

| ResultClass | Bedeutung | Erlaubt |
| --- | --- | --- |
| `replay-startstate-green` | ReplaySpec, StartMetrics, Warmup, Predicate und Window sind stabil und vor Action gueltig | nur `93S2R3.3-Reentry` |
| `replay-determinism-required` | Repeat-Drift bleibt ohne engere Klasse rot | enger Folgefix, kein Reentry |
| `env-reset-required` | Python-Env-Reset erzeugt Drift | enger Env-Repair, kein Reentry |
| `warmup-contract-required` | Warmup-Plan oder Warmup-Metriken driften | enger Warmup-Repair, kein Reentry |
| `seed-rng-required` | Seed/RNG/Session-Seeding ist nicht stabil | enger Seed-Repair, kein Reentry |
| `headless-runner-required` | Runner/Sidecar-Session erzeugt Drift | enger Runner-Repair, kein Reentry |
| `hash-recipe-required` | Replay-ID/Hash-Rezept ist falsch oder unvollstaendig | enger Contract-Repair, kein Reentry |
| `predicate-window-required` | Predicate/Window bleibt nach Replay-Fix rot | enger Predicate-/Window-Repair, kein Reentry |
| `action-surface-lineage-invalidated` | ActionSurfaceId oder Decoder-Hash driftet | Stop, neuer Lineage-Entscheid |
| `measurement-invalid` | Quellen, Versionierung, SampleCounts oder Messung ungueltig | nichts |

## Risiko-Register

| Risiko | Severity | Mitigation | Trigger |
| --- | --- | --- | --- |
| Replay-ID wird durch beobachtete Metrics instabil | kritisch | `replaySpecId` und `startMetricsHash` getrennt fuehren | ID enthaelt `startMetricsHash` als einzige Stabilitaetsquelle |
| StartMetrics-Drift wird durch neues Hash-Rezept versteckt | kritisch | StartMetrics bleibt eigenes Null-Count-Gate | `startMetricsHashRepeatMismatchCount > 0` |
| Root Cause bleibt zu grob | hoch | Taxonomie pro Row und pro Driftklasse | mehr als eine Klasse landet in `unknown` |
| Env-/Runner-Fix verletzt Layer-Grenzen | kritisch | conditional-write nur nach Audit-Evidence, Runtime read-only | produktive Runtime-/AI-Hub-Datei im Diff |
| Predicate wird vor Replay-Stabilitaet repariert | hoch | `93S2R4.4` startet erst nach Repeat-Gate gruen | Predicate-Fix ohne `repeatMismatchCount=0` |
| Action-Effekt ueberstimmt Preflight-Rot | kritisch | `actionEffectOverrideCount` muss 0 bleiben | Action-/Direction-/Fairness-Auswertung trotz rotem Preflight |
| SampleCount wird verkleinert | hoch | Full-Gate verlangt `replayAttemptCount>=309` | weniger als 103 Rows x 3 Repeats |
| Downstream wird zu frueh geoeffnet | kritisch | ClaimFlags und `opensNext=[]` bei jedem roten Result | BT93S2-Recheck/93S2.4/T/U/W/O/P/94A claimbar |
| Alte Reports werden als Gruen wiederverwendet | hoch | Source-Artefakte nur als rote Quellen, S2R4 schreibt eigene Evidence | `latest_*`, `tmp/**` oder alte S2R3.2-Only-Evidence als Gruen |

## Harte Selbstpruefung dieses Replans

- Fehler: Der Plan koennte zu technisch auf Hashes schauen und den eigentlichen
  Env-Zustand verpassen. Korrektur: `93S2R4.3` verlangt StartState vor Reset,
  nach Reset, nach Warmup und vor Action.
- Fehler: Die Trennung von `replaySpecId` und `startMetricsHash` koennte Drift
  kosmetisch kaschieren. Korrektur: StartMetricsHash ist eigenes Null-Count-Gate
  und blockiert Gruen.
- Fehler: Der Plan koennte wieder zu spaet stoppen. Korrektur: Predicate,
  Direction, Fairness und Action-Wirkung bleiben bis Replay-Gruen verboten.
- Fehler: Conditional-write auf Env/Runner koennte zu breit werden. Korrektur:
  jede Aenderung braucht vorher `93S2R4.1`-Root-Cause-Evidence und bleibt
  trainingsharness-/environment-scoped, nicht produktive Runtime.
- Fehler: Der Plan koennte `93S2R3.3-Reentry` als Bot-Qualitaet missverstehen.
  Korrektur: selbst gruener S2R4 oeffnet nur die naechste S2R3-Messphase,
  keinen Recheck, keinen Action-Surface-Entscheid und keinen Trainingsblock.
