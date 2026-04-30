# BT93S2R Matrix-/Control-Reentry Replan nach BT93S2.3 measurement-invalid

Datum: 2026-04-30

Status: User-beauftragter Intake/Replan; direkte Aufnahme in
`docs/bot-training/Bot_Trainingsplan.md` ist vom User beauftragt.

Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`

Geplanter Platz: direkter P0-Interposer nach
`BT93S2.3=resultClass=measurement-invalid` und vor jeder normalen
`BT93S2.4`-, `BT93T`-, `BT93U`-, `BT93W`-, `BT93O`-, `BT93P`- oder
`BT94A`-Fortsetzung.

## Kurzurteil

`BT93S2.3` hat die bestehende Action-Surface gegen die Matrix-v2 gemessen,
aber nicht closure-faehig gemacht:

- `data/training/ppo/bt93s2/existing_action_effect_v2_report.json`
  schreibt `ok=false`, `resultClass=measurement-invalid`, `opensNext=[]`.
- `probeCount=338`, `scenarioCount=9`, `actionCount=13`,
  `newTrainingEpisodes=0`, `holdoutEpisodes=0`.
- `escape-left-open` ist `measurement-invalid`, weil die Negative-Control
  `noop` als erfolgreiche Action zaehlt.
- `escape-right-open` bleibt `action-effect-weak` /
  `actionSpaceRequiredScenarioIds=[escape-right-open]`.
- `no-danger-control` erzeugt keine Action-Gruen-Evidence, ist aber
  `neutral-control-unstable`.
- `side-wall-left` zeigt eine Direction-/Control-Drift: einzig erfolgreiche
  Action ist `yaw-right`, waehrend die positiven Controls
  `yaw-left`, `roll-left`, `evade-left` nicht passen.
- Der Full-Run meldet `predicateFailureCount=48` und
  `minimumWindowFailureCount=12`; diese Werte duerfen im Reentry nicht als
  harmloser Nebeneffekt ignoriert werden.
- Proxy-Hygiene ist belegt und muss erhalten bleiben:
  `commandFlagWithoutStateEffectCount=118`,
  `rewardOnlyRejectedCount=77`,
  `terminalOrMaxStepsOnlySuccessCount=0`.

Darum darf der naechste Schritt kein Action-Surface-Repair-Decision-Block,
kein Reward-Block und kein Telemetry-Block sein. Erst muss die Matrix- und
Control-Evidence wieder urteilsfaehig werden.

## Ziel

BT93S2R stellt die Voraussetzungen her, damit BT93S2 sinnvoll weiterarbeiten
kann:

1. Alle roten und widerspruechlichen S2.3-Befunde maschinenlesbar taxonomieren.
2. Per gezielter Trace-Reproduktion klaeren, ob die Fehler aus Predicate,
   Seed/Warmup, Success-Definition, Direction-Label, Decoder/Mapping oder
   echter Action-Space-Luecke kommen.
3. Matrix-/Control-v3 nur dort reparieren, wo die Trace-Evidence die Ursache
   belegt.
4. Negative-Controls so haerten, dass `noop`/passive Drift nie Escape-Erfolg
   erzeugt.
5. `no-danger-control` als stabilen Neutral-Control herstellen, ohne Action-
   Gruen-Evidence zu erzeugen.
6. `side-wall-left` Direction-/Control-Vertrag klaeren, bevor Policy-Selection
   oder Action-Surface beurteilt werden.
7. Danach nur einen frischen `BT93S2.3-Recheck` oeffnen; `93S2.4` bleibt bis zu
   einem gueltigen Recheck geschlossen.

## Nicht-Ziele

- Kein PPO-Training, kein 10k/50k/100k/200k/500k/1M-Lauf.
- Kein Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate oder BT95.
- Keine produktive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart-Aenderung.
- Keine Reward-, Telemetry- oder Safety-Reparatur.
- Keine Action-Surface-Aenderung und keine neue Compound-Action.
- Keine DQN-/Comparator-Reparatur.
- Kein Direktstart von `93S2.4`, `BT93T`, `BT93U`, `BT93W`, `BT93O`, `BT93P`
  oder `BT94A`.

## Scope Files

Read/Write:

- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/plaene/neu/BT93S2R_Matrix_Control_Reentry_Replan_2026-04-30.md`
- `python/scripts/bt93s2r_*.py`
- `data/training/ppo/bt93s2r/**`

Conditional Read/Write:

- `python/scripts/bt93s2_scenario_matrix_v2.py` nur fuer eine eng belegte
  Matrix-v3-Erweiterung oder als Vorlage.
- `python/scripts/bt93s2_existing_action_effect_v2.py` nur fuer Recheck-
  Kompatibilitaet; keine Umdeutung des roten S2.3-Reports.
- `data/training/ppo/bt93s2/**` nur fuer neue v3-/Reentry-Artefakte, nicht zum
  Ueberschreiben der roten S2.3-Wahrheit.

Read-only:

- `data/training/ppo/bt93s2/existing_action_effect_v2_report.json`
- `data/training/ppo/bt93s2/scenario_matrix_v2_contract.json`
- `data/training/ppo/bt93s2/scenario_search_report.json`
- `data/training/ppo/bt93s2/start_contract.json`
- `data/training/ppo/bt93s/**`
- `data/training/ppo/bt93r_reentry/**`
- `data/training/ppo/bt93y/**`
- `python/envs/ppo_action_surface.py`
- `python/envs/curvios_env.py`
- `scripts/training-headless-lane-runner.mjs`
- produktive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart-Surfaces

## Result-Class-Vertrag

| Resultklasse | Bedeutung | Oeffnet |
| --- | --- | --- |
| `matrix-control-reentry-green` | Matrix-/Control-v3 ist urteilsfaehig: keine `measurement-invalid`-Klasse, `predicateFailureCount=0`, `minimumWindowFailureCount=0`, keine fehlschlagende Negative-Control, kein Direction-Mismatch, `no-danger-control` stabil und nicht action-green | nur `BT93S2.3-Recheck` |
| `escape-left-control-required` | `escape-left-open` laesst `noop`/passive Drift weiter als Erfolg zu oder Positive-/Negative-Control ist untrennbar | nichts |
| `escape-right-scenario-required` | `escape-right-open` ist wegen Predicate/Warmup/Seed/Window nicht fair messbar; Action-Space darf noch nicht beurteilt werden | nichts |
| `side-wall-direction-contract-required` | Side-Wall-Label, Koordinaten, positive Controls oder erfolgreiche Actions widersprechen sich | nichts |
| `neutral-control-required` | `no-danger-control` ist nicht stabil oder negative Controls sind nicht sauber rot | nichts |
| `predicate-window-required` | Predicate-Revalidation oder Minimum-Window scheitert erneut | nichts |
| `measurement-invalid` | Quellen, Hashes, Counts, Scripts, Schema oder Reports sind nicht urteilsfaehig | nichts |

Jede Resultklasse schreibt `allowNext[]`, `opensNext[]`, `blocksNext[]`,
`claimFlags`, `sampleCounts`, `sourceArtifacts[]`, `invalidations[]`,
`rootCauseClasses[]` und `guardrails`.

## Definition of Done

- [ ] DoD.S2R-R1 Alle Quellen aus S2.1-S2.3 sind mit Hash, Git-SHA,
  Resultklassen, SampleCounts, Matrix-ID, ActionSurfaceId, Decoder-Hash und
  ClaimFlags gelockt.
- [ ] DoD.S2R-R2 Failure-Taxonomie enthaelt mindestens:
  `escape-left-open negative-control-failed`,
  `escape-right-open action-space-required candidate`,
  `no-danger-control neutral-control-unstable`,
  `side-wall-left direction/control mismatch`,
  `predicateFailureCount=48`, `minimumWindowFailureCount=12`,
  `commandFlagWithoutStateEffectCount=118` und `rewardOnlyRejectedCount=77`.
- [ ] DoD.S2R-R3 Trace-Audit reproduziert die roten Seeds/Actions und nennt pro
  Befund genau eine primaere Root-Cause-Klasse oder `measurement-invalid`.
- [ ] DoD.S2R-R4 Matrix-/Control-v3 trennt fuer Escape links/rechts passive
  Drift von echter gerichteter Zustandswirkung; `noop` darf nie Escape-Erfolg
  sein.
- [ ] DoD.S2R-R5 `escape-right-open` darf erst als echte Action-Space-Luecke
  klassifiziert werden, wenn v3-Predicate, Warmup, Positive-Control,
  Negative-Control und Minimum-Window gruen sind.
- [ ] DoD.S2R-R6 `side-wall-left` hat einen konsistenten Direction-/Control-
  Vertrag: Label, erwartete Richtung, positive Controls und erfolgreiche
  Actions duerfen sich nicht widersprechen.
- [ ] DoD.S2R-R7 `no-danger-control` ist ein stabiler Neutral-Control:
  `noop` ist neutral-stable, negative Controls sind nicht erfolgreich, und
  `actionGreenEvidenceProduced=false`.
- [ ] DoD.S2R-R8 Reentry-Report schreibt
  `predicateFailureCount=0`, `minimumWindowFailureCount=0`,
  `measurementInvalidCount=0`, `negativeControlFailedCount=0` oder endet rot.
- [ ] DoD.S2R-R9 Proxy-Hygiene bleibt erhalten: Reward-only, command-flag-only,
  target-distance-only, single-step und maxSteps-only werden weiterhin
  maschinenlesbar abgelehnt.
- [ ] DoD.S2R-R10 Closure oeffnet nur `BT93S2.3-Recheck`. `93S2.4`, `BT93T`,
  `BT93U`, `BT93W`, `BT93O`, `BT93P`, `BT94A`, Candidate, Freeze, Holdout,
  Promote, Rollout, PPO-Validate und BT95 bleiben immer geschlossen.
- [ ] DoD.S2R-R11 Meta-Gate `npm.cmd run gates:pre-commit` ist gruen; Tests
  und Trainingslaeufe bleiben user-owned ausser fuer die noetigen
  Diagnose-/Reentry-Skripte.

## Phasen

### 93S2R.1 Failure-Taxonomy und Source Lock

- [ ] 93S2R.1.1 `bt93s2r_failure_taxonomy.py` liest S2.1-S2.3, BT93S.99,
  BT93RR.99, ActionSurface-Hash und Script-Hashes.
- [ ] 93S2R.1.2 Report schreibt alle S2.3-Befunde, Scenario-IDs,
  Control-/Predicate-/Window-Failures, verbotene Folgeaktionen und erlaubte
  Resultklassen.
- [ ] 93S2R.1.3 Wenn eine Quelle fehlt, untracked ist, nicht zu S2.3
  `measurement-invalid` passt oder bereits ueberschrieben wurde, endet die
  Phase `measurement-invalid`.

Evidence:

- `data/training/ppo/bt93s2r/failure_taxonomy_report.json`

### 93S2R.2 Targeted Trace Audit

- [ ] 93S2R.2.1 Reproduziere `escape-left-open` fuer `noop` und die positiven
  Controls mit Start-, Step-, Risk-, Wall-, Heading-, Reward- und Command-Trace.
- [ ] 93S2R.2.2 Reproduziere `escape-right-open` fuer alle positiven Controls
  und trenne `predicate/window unfair` von echter Action-Space-Luecke.
- [ ] 93S2R.2.3 Reproduziere `no-danger-control` fuer `noop`, `boost` und
  `shoot-mg`; klaere, warum `noop` nicht neutral-stable wurde.
- [ ] 93S2R.2.4 Reproduziere `side-wall-left` fuer positive Controls und
  `yaw-right`; klaere Direction-/Koordinaten-/Label-Drift.
- [ ] 93S2R.2.5 Reproduziere Predicate-/Minimum-Window-Failures und pruefe
  Session-ID, Warmup, MaxSteps, Seed-Split und Revalidation-Paritaet zwischen
  S2.2 und S2.3.

Evidence:

- `data/training/ppo/bt93s2r/targeted_trace_audit_report.json`

### 93S2R.3 Matrix-/Control-v3 Contract Repair

- [ ] 93S2R.3.1 `bt93s2r_matrix_control_v3.py` schreibt einen v3-Contract nur
  fuer die belegten Matrix-/Control-Fixes.
- [ ] 93S2R.3.2 Escape-Erfolg verlangt gerichtete Zustandswirkung gegen
  passive Baseline, Risk-/Terminal-Non-Regression und Negative-Control-Fail
  fuer `noop`.
- [ ] 93S2R.3.3 `escape-right-open` bekommt ein faires Predicate/Warmup/Seed-
  Fenster, bevor Action-Space beurteilt wird.
- [ ] 93S2R.3.4 `side-wall-left` bekommt konsistente positive Controls oder
  wird als Direction-Contract-rot gestoppt.
- [ ] 93S2R.3.5 `no-danger-control` bekommt ein stabiles Neutralfenster, in
  dem `noop` neutral bleibt, aber keine Action-Gruen-Evidence liefert.
- [ ] 93S2R.3.6 Discovery-/Validation-Seeds bleiben getrennt; keine Holdouts,
  keine Trainingsepisoden, keine Action-Surface-Aenderung.

Evidence:

- `data/training/ppo/bt93s2r/scenario_matrix_v3_contract.json`

### 93S2R.4 Matrix-Control Reentry Gate

- [ ] 93S2R.4.1 `bt93s2r_matrix_control_reentry_gate.py` misst nur die
  reparierten Control-/Predicate-/Window-Gates gegen v3.
- [ ] 93S2R.4.2 Gruen verlangt:
  `predicateFailureCount=0`, `minimumWindowFailureCount=0`,
  `measurementInvalidCount=0`, `negativeControlFailedCount=0`,
  `directionMismatchCount=0`, `noDangerControl.actionGreenEvidenceProduced=false`.
- [ ] 93S2R.4.3 Wenn `escape-right-open` nach validem v3 weiter keine
  bestehende Action zeigt, wird dies nur als Input fuer den spaeteren frischen
  `BT93S2.3-Recheck` festgehalten, nicht als Direkt-GO fuer Action-Surface.
- [ ] 93S2R.4.4 Rote Ergebnisse nennen genau den naechsten engen Reparaturbedarf
  und oeffnen nichts.

Evidence:

- `data/training/ppo/bt93s2r/matrix_control_reentry_gate_report.json`

### 93S2R.99 Closure

- [ ] 93S2R.99.1 Closure liest alle S2R-Reports, schreibt genau eine erlaubte
  Resultklasse, `allowNext[]`, `opensNext[]`, `blocksNext[]`, ClaimFlags,
  SampleCounts, SourceArtifacts und Invalidations.
- [ ] 93S2R.99.2 Nur `matrix-control-reentry-green` oeffnet
  `BT93S2.3-Recheck`.
- [ ] 93S2R.99.3 Jeder rote Ausgang oeffnet keinen bestehenden Folgeblock und
  schreibt den naechsten engen Reparaturbedarf.
- [ ] 93S2R.99.4 Abschluss-Gate: `npm.cmd run gates:pre-commit`.

Evidence:

- `data/training/ppo/bt93s2r/bt93s2r_closure_gate_report.json`

## Risiko-Register

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Replan repariert nur Report-Symptome statt Matrix-Ursachen | kritisch | Governance/RL | Trace-Audit muss Root-Cause-Klasse pro Befund schreiben; kein Fix ohne Ursache | v3-Contract wird ohne Trace-Beleg geaendert |
| `noop` bleibt Escape-Erfolg durch passive Drift | kritisch | RL/QA | Escape-Erfolg gegen passive Baseline und Negative-Control-Fail erzwingen | `noop.successCount > 0` in Escape |
| `no-danger-control` wird als Action-Gruen gelesen | kritisch | Governance | `actionGreenEvidenceAllowed=false`, `actionGreenEvidenceProduced=false` als Gate | Control liefert `successfulActions` |
| Side-Wall-Label ist invertiert oder Controls sind falsch | hoch | RL/QA | Direction-Audit und Label-/Control-Konsistenz vor Recheck | `side-wall-left` nur mit `yaw-right` gruen |
| `escape-right-open` wird zu frueh als Action-Space-Luecke gelesen | hoch | RL | Erst Predicate/Warmup/Window validieren, dann Recheck; keine direkte Surface-Aenderung | Positive Controls scheitern bei invalidem Fenster |
| Predicate-/Minimum-Window-Failures werden erneut ignoriert | hoch | QA | `predicateFailureCount=0` und `minimumWindowFailureCount=0` als harte Green-Bedingung | Counts > 0 im Reentry-Gate |
| Proxy-Hygiene wird aufgeweicht | hoch | RL/QA | Verbotene Success-Proxies im Contract und Report wiederholen | Reward-/Command-only wird Erfolg |
| Seed-Overfitting | hoch | QA | Discovery-/Validation-Seeds getrennt, no-holdout, Seed-Liste vor Messung locken | v3 nur auf alten Seeds gruen |
| Action-Surface-Aenderung invalidiert Lineage | kritisch | Governance/RL | S2R verbietet Action-Surface-Write; Surface-Entscheid erst nach gueltigem S2.3-Recheck | neue `actionSurfaceId` im S2R-Diff |
| Runtime-Grenze wird verletzt | kritisch | Architektur | produktive Surfaces read-only; Guardrails im Report | Runtime-/AI-Hub-Datei im Diff |
| Reports werden gross und unlesbar | mittel | QA | Raw Traces begrenzen, Summaries maschinenlesbar; volle Probes nur wenn noetig | Artefakte verdecken Entscheidungsfelder |

## Harte Selbstkritik des Replans

- Fehlergefahr: Der Plan koennte `escape-right-open` als Action-Space-Luecke
  behandeln, obwohl Matrix/Predicate noch invalid ist. Korrektur:
  `escape-right-open` darf nur nach gruener v3-Matrix und frischem S2.3-Recheck
  in `93S2.4` ein Surface-Thema werden.
- Fehlergefahr: `side-wall-left` koennte trotz falscher Richtung als gruen
  durchrutschen, weil irgendeine Action wirkt. Korrektur:
  Direction-/Control-Konsistenz ist eigenes DoD und eigener roter Ausgang.
- Fehlergefahr: `no-danger-control` koennte als unwichtig gelten, weil es keine
  Action-Gruen-Evidence erzeugt. Korrektur: Neutral-Stabilitaet ist harte
  Voraussetzung; ohne sie bleibt S2R rot.
- Fehlergefahr: Predicate-/Minimum-Window-Failures koennten als Messrauschen
  gelesen werden. Korrektur: beide Counts muessen im Reentry-Gate exakt 0 sein.
- Fehlergefahr: Der Replan koennte zu breit werden und Reward/Telemetry/Surface
  mitreparieren. Korrektur: S2R ist Matrix-/Control-only; alle anderen Pfade
  bleiben durch Resultklassen und Scope Files gesperrt.
- Fehlergefahr: Der Replan koennte nach Plan-Gruen direkt `93S2.4` oeffnen.
  Korrektur: Einziger gruener Ausgang ist `BT93S2.3-Recheck`; erst dessen
  frischer Report darf normale S2-Fortsetzung beurteilen.
