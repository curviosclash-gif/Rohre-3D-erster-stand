# BT93Q DeathBefore60 Wall/Trail Policy Repair Intake

Datum: 2026-04-30

Status: Intake-Vorschlag fuer user-owned Aufnahme in `docs/bot-training/Bot_Trainingsplan.md`.

Dieser Intake ist eine gezielte Reparatur nach `BT93N.99`. Er ersetzt keinen
aktiven Master-Eintrag automatisch. Er soll vor `BT93O` eingeschoben werden,
weil `BT93O` laut aktivem Plan nur nach gruenem `BT93N.99` starten darf und
`BT93N.99` ausdruecklich `death-before60-still-blocking` meldet.

## Kurzurteil

`BT93N` ist governance-sauber abgeschlossen, aber fachlich rot. Die bisherige
Reward-Reparatur hat den direkten Control-Matrix-Befund verbessert, aber die
trainierte PPO-Policy nicht stabilisiert. Der naechste Block darf deshalb kein
Action-/Objective-Quality-Block im Sinne von `BT93O`, kein 50k-/100k-Run und
kein BT94A-Reentry sein. Der naechste sinnvolle Schritt ist ein enger
Wall-/Trail-Policy-Repair mit folgenden Schwerpunkten:

1. Deterministische Eval-Policy kollabiert auf `yaw-right` (`actionToken=2`).
2. Fruehe Tode bleiben trotz staerkerem Early-Death-/Wall-Reward aktiv.
3. Wand-/Trail-Gefahr wird in Diagnostik gesehen, aber nicht sicher in
   wirksame Ausweichaktionen umgesetzt.
4. Aktuelle Traces liefern nur Proxy-Pose (`rawPoseAvailable=false`) und muessen
   fuer eine belastbare Reparatur ergaenzt werden.
5. Same-Matrix-DQN bleibt separat blockierend (`dqn-anchor-blocked`) und darf
   durch diesen Repair nicht still uebersprungen werden.

## Harte Ausgangslage

| Quelle | Feld | Befund | Konsequenz |
| --- | --- | --- | --- |
| `data/training/ppo/bt93n/closure_gate_report.json` | `resultClass` | `diagnose-loop-required` | BT93N ist kein Gruensignal. |
| `data/training/ppo/bt93n/closure_gate_report.json` | `gateClass` | `death-before60-still-blocking` | BT93O/BT93P/BT94A bleiben blockiert. |
| `data/training/ppo/bt93n/closure_gate_report.json` | `rootCause` | `wall/trail` | Folgearbeit muss Wand-/Trail-Verhalten fokussieren. |
| `data/training/ppo/bt93n/closure_gate_report.json` | `selectedFixClass` | `Reward` | Bisherige Reparatur war bewusst nur eine Fix-Klasse. |
| `data/training/ppo/bt93n/closure_gate_report.json` | `summary.trainDeathBefore60Count` | `27` | 10k-Train bleibt rot. |
| `data/training/ppo/bt93n/closure_gate_report.json` | `summary.evalDeathBefore60Count` | `11` | Eval bleibt rot. |
| `data/training/ppo/bt93n/closure_gate_report.json` | `summary.blocksNext` | `BT93O,BT93P,BT94A` | Kein Claim dieser Bloecke aus BT93N heraus. |
| `data/training/ppo/bt93n/stability_ladder_report.json` | `executedStages` | `0` | 50k/100k wurden korrekt nicht gestartet. |
| `data/training/ppo/bt93m/comparison_policy_decision.json` | `comparisonPolicyDecision` | `dqn-anchor-blocked` | Positiver Reentry bleibt auch nach BT93Q ohne DQN-/Ersatzpolitik blockiert. |
| `data/training/ppo/bt94a/no_start_gate.json` | `claimable` | `false` | BT94A bleibt geschlossen. |
| `data/training/ppo/bt94a/no_start_gate.json` | `candidateRunsAllowed` | `false` | Kein Candidate-Lauf. |
| `data/training/ppo/bt94a/no_start_gate.json` | `matrixDefinitionAllowed` | `false` | Keine BT94A-Matrixdefinition. |

## Befundregister

### B.01 Reward-Fix war wirksam, aber nicht ausreichend

Beleg: `data/training/ppo/bt93n/reward_terminal_delta_report.json`

| Metrik | Vor Fix | Nach Fix | Bewertung |
| --- | ---: | ---: | --- |
| `deathBefore60Count` | 6 | 3 | verbessert, aber nicht geloest |
| `deathBefore60Share` | 0.10 | 0.05 | verbessert, aber nicht null |
| `positiveEarlyDeathCount` | 4 | 0 | direkte Fehlbelohnung frueher Tode repariert |
| `avgStepsPerEpisode` | 75.75 | 77.633333 | leichte Verbesserung |
| `progressSignalReachableTailCount` | 14 | 15 | Signal bleibt vorhanden |
| `objectiveSignalReachableTailCount` | 14 | 15 | Signal bleibt vorhanden |
| `maxStepPlateauCount` | 0 | 0 | MaxStep-Plateau ist nicht der primaere Fehler |
| `runtimeErrorCount` | 0 | 0 | keine Runtime-Regression |

Interpretation: Der terminale Early-Death-Reward war ein echtes Problem, aber
das PPO-Verhalten blieb nach dem Fix nicht stabil. Ein weiterer reiner
Reward-Fix ist nur zulaessig, wenn `BT93Q` belegt, dass die aktuelle
Reward-/Advantage-Ordnung unter Wall-/Trail-Druck weiterhin falsch ist.

### B.02 10k-PPO bleibt klar rot

Beleg: `data/training/ppo/bt93n/micro_ppo_repeat_report.json`

| Bereich | Wert |
| --- | --- |
| `actualModelTimesteps` | 10112 |
| Train completed episodes | 134 |
| Train `deathBefore60Count` | 27 |
| Train `avgStepsPerEpisode` | 75.074627 |
| Train `playerDeadShare` | 1.0 |
| Eval completed episodes | 79 |
| Eval `deathBefore60Count` | 11 |
| Eval `playerDeadShare` | 1.0 |
| Eval `maxStepShare` | 0.0 |
| Runtime errors | 0 |
| Invalid/postDecodeClamp/sanitizer | 0/0/0 |
| Progress/Objectives | nonzero in Train and Eval |

Interpretation: Das Problem ist nicht "Env bricht", nicht Invalid-Action und
nicht MaxStep-Plateau. Der Bot produziert echte Progress-/Objective-Signale,
endet aber weiter ausschliesslich `player-dead`. Damit ist die naechste
Reparatur eine Policy-/Gefahr-/Wirkungsfrage, keine Governance- oder
Durchsatzfrage.

### B.03 Deterministische Eval-Policy kollabiert auf eine Action

Beleg: `data/training/ppo/bt93n/micro_ppo_repeat_report.json`

Eval-Seeds:

| Seed-Label | ActionCounts | DeathBefore60 | AvgSteps |
| --- | --- | ---: | ---: |
| `eval-944` | `{"2": 2700}` | 2 | 106.52 |
| `eval-945` | `{"2": 2700}` | 7 | 92.827586 |
| `eval-946` | `{"2": 2700}` | 2 | 107.08 |

Action-Mapping aus `python/envs/ppo_action_surface.py`:

| Token | Semantic Action |
| ---: | --- |
| 0 | `noop` |
| 1 | `yaw-left` |
| 2 | `yaw-right` |
| 3 | `pitch-up` |
| 4 | `pitch-down` |
| 5 | `roll-left` |
| 6 | `roll-right` |
| 7 | `boost` |
| 8 | `shoot-mg` |

Interpretation: Stochastisches Training nutzt mehrere Actions, aber die
deterministische Eval-Policy waehlt auf allen drei Seeds ausschliesslich
`yaw-right`. Das ist kein Safety-Fehler, sondern ein Policy-Collapse- oder
Action-Wirkungsproblem. BT93Q muss klaeren, ob dies aus Logit-/Entropy-Verhalten,
Reward-Gradient, fehlendem Szenariodruck, Action-Surface-Armut oder
Beobachtungsblindheit entsteht.

### B.04 Wall-/Trail-Gefahr ist sichtbar, aber nicht beherrscht

Beleg: `data/training/ppo/bt93n/death_before60_trace_report.json` und
`data/training/ppo/bt93n/death_before60_trace_samples.jsonl`

Trace-Zusammenfassung:

| Metrik | Wert |
| --- | ---: |
| Diagnose-Episoden | 60 |
| Early-death Samples | 6 |
| Death classes | 4 `wall/trail`, 2 `unclassified` |
| Terminal reason | `player-dead` |
| MaxStep plateau count | 0 |
| Runtime errors | 0 |

Sample-Reanalyse:

- In den letzten Trace-Zeilen liegen bei 16 von 18 Samples `wallDistanceFront <= 0.05`.
- Viele letzte Schritte zeigen `collisionRisk` nahe `0.95` und `deadEndRisk=1`.
- Selbst die scripted positive controls enden spaeter oft mit `player-dead`;
  sie sind nicht early-death Samples, aber zeigen terminale Wand-/Trail-Gefahr
  im gleichen Szenarioraum.
- `rawPoseAvailable=false`; die Traces nutzen Observation-/Target-/Heading-
  Proxies statt roher Pose/Heading/Velocity.

Interpretation: Die Policy bekommt Gefahrensignale oder zumindest Proxy-Signale,
aber der aktuelle Pfad beweist nicht, dass sie rechtzeitig in eine rettende
Aktion uebersetzt werden koennen. Zudem reicht die Trace-Qualitaet fuer eine
geometrisch saubere Reparatur noch nicht aus.

### B.05 Diagnostic Safety sieht Risiko, greift aber nicht erkennbar ein

Beleg: Trace-Samples in `data/training/ppo/bt93n/death_before60_trace_samples.jsonl`

In gefaehrlichen Tail-Schritten stehen Felder wie:

- `hybridSafety.vetoActive=true`
- `hybridSafety.collisionRisk` nahe `0.90` bis `1.0`
- `hybridSafety.deadEndRisk=1`
- gleichzeitig `vetoEvents=[]` und `vetoRate=0.0`

Interpretation: Diese Felder duerfen nicht als Runtime-Safety-Regression gelesen
werden, weil der Trainingspfad weiter `invalidActionRate=0` usw. zeigt. Sie
belegen aber ein wichtiges Diagnose-Risiko: Safety-Diagnostik erkennt Gefahr,
aber der PPO-Action-Pfad nutzt sie offenbar nicht als Notfall-Policy,
Pre-sampling-Maske oder Verlustsignal. BT93Q muss diese Trennung explizit
testen, bevor eine Action- oder Safety-Fixklasse erlaubt ist.

### B.06 Aktuelle Action-Surface hat nur atomare Einzelschritte

Beleg: `python/envs/ppo_action_surface.py`

Die maskierte semantische Surface enthaelt nur:

- `noop`
- `yaw-left`
- `yaw-right`
- `pitch-up`
- `pitch-down`
- `roll-left`
- `roll-right`
- `boost`
- `shoot-mg`

Interpretation: Es gibt keine zusammengesetzten Escape-Actions wie
`turn-left-boost`, `turn-right-boost`, `brake`, `evade-left`, `evade-right` oder
`danger-turn-away`. BT93Q darf diese Actions nicht spekulativ einfuehren, muss
aber in Stresstests nachweisen, ob atomare Actions unter Wand-/Trail-Druck
ausreichen.

### B.07 Reward-Ordering bleibt unter Gefahr verdachtig

Beleg: `data/training/ppo/bt93n/micro_ppo_repeat_report.json`

Train Reward Breakdown:

- `checkpointReached=957.6`
- `survival=99.78`
- `survivalPressureBonus=17.424596`
- `earlyDeath=-524.800002`
- `loss=-737.0`
- `wallRisk=-512.610557`

Eval Reward Breakdown:

- `checkpointReached=1592.64`
- `survival=80.21`
- `survivalPressureBonus=8.99144`
- `earlyDeath=-248.266666`
- `loss=-434.5`
- `wallRisk=-230.708759`

Interpretation: Negative Terminal-/Wall-Komponenten sind vorhanden und
substanziell. Trotzdem kann kurzfristiger Progress/Checkpoint-Ertrag
gefaehrliche Bahnen weiterhin attraktiv machen, wenn die Policy keine
rechtzeitige Escape-Wirkung lernt. BT93Q muss deshalb Reward nicht pauschal
erhoehen, sondern `danger-aware progress ordering` pruefen: Progress nahe
lethaler Wand/Trail-Gefahr darf nicht die falsche Richtung verstaerken.

### B.08 DQN-Anker bleibt ein separater harter Blocker

Beleg: `data/training/ppo/bt93m/comparison_policy_decision.json`

- `comparisonPolicyDecision=dqn-anchor-blocked`
- `sameMatrixDqnAnchorPresent=false`
- `nonBlockingForPositiveReentry=false`

Interpretation: BT93Q darf Wall-/Trail-Reparatur liefern, aber keinen
positiven BT93P-/BT94A-Reentry erzeugen, solange DQN-Anker oder explizite
User-Ersatzvergleichspolitik fehlen.

### B.09 BT94A bleibt hart geschlossen

Beleg: `data/training/ppo/bt94a/no_start_gate.json`

- `claimable=false`
- `candidateRunsAllowed=false`
- `matrixDefinitionAllowed=false`

Interpretation: Kein Candidate, kein Freeze, kein Holdout, kein Promote, kein
Rollout, kein BT95-Handoff. BT93Q darf nur Diagnose-/Repair-Evidence erzeugen.

## Kausale Arbeitshypothesen

BT93Q muss die folgenden Hypothesen trennen. Ein Fix darf erst nach belegter
Ursache erfolgen.

| Hypothese | Beleglage heute | Erlaubte Konsequenz, falls belegt |
| --- | --- | --- |
| H1: Deterministic Policy Collapse | Eval waehlt `yaw-right` auf allen Seeds | Policy-/Entropy-/Eval-Mode-Fix oder Training-Signal-Repair |
| H2: Atomare Actions reichen nicht fuer Escape | Surface hat keine Compound Escape-Actions | Sidecar-only Action-Erweiterung mit realem Effektbeweis |
| H3: Observation/Trace ist geometrisch zu schwach | `rawPoseAvailable=false`, nur Proxies | Telemetrie-/Observation-Erweiterung im Trainingspfad |
| H4: Safety-Diagnostik wird nicht handlungswirksam | `vetoActive=true`, aber `vetoRate=0` | Pre-sampling danger mask oder emergency-action test, nur Sidecar |
| H5: Reward-Ordering belohnt Progress in Gefahr | Positive Checkpoint-/Progress-Komponenten bleiben hoch | Danger-aware Progress-/Reward-Gating, falls Stresstest es belegt |
| H6: Runner/Terminal klassifiziert falsch | `playerDeadShare=1.0`, aber Runtime ok | Terminal-/Runner-Fix nur bei Widerspruch in Raw-Trace |
| H7: DQN-Anker fehlt unabhaengig | `dqn-anchor-blocked` | Separater DQN-Loader-Fix oder User-Ersatzpolitik |

## Vorgeschlagener Block

### Block BT93Q: DeathBefore60 Wall/Trail Policy Repair

Position im PPO-Pfad: nach `BT93N.99=diagnose-loop-required`, vor `BT93O`.

Dependency:

- `BT93N.99` abgeschlossen mit `gateClass=death-before60-still-blocking`.
- `BT93O` bleibt gesperrt, bis `BT93Q.99` DeathBefore60 non-blocking macht.
- `BT93P` und `BT94A` bleiben zusaetzlich durch DQN-Anker/BT93M-Policy blockiert.

Nicht-Ziele:

- kein BT93O-Claim,
- kein 50k-/100k-Lauf,
- kein Candidate,
- kein Freeze,
- kein Holdout-Verbrauch,
- kein Promote,
- kein Rollout,
- keine produktive Runtime-/AI-Hub-/Strategy-/Registry-Aenderung,
- kein DQN-Phantomanker.

Primary scope:

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `docs/plaene/neu/BT93Q_*.md` | write | Intake/Handoff |
| `data/training/ppo/bt93q/**` | write | neue Diagnose- und Repair-Artefakte |
| `python/scripts/bt93q_*.py` | write | Reanalyse, Stress-Matrix, Closure-Gate |
| `python/configs/ppo_bt93q*.json` | write | kleine Recheck-Konfigurationen |
| `python/envs/ppo_action_surface.py` | eng write | nur bei belegter Action-Surface-Ursache |
| `python/envs/curvios_env.py` | eng write | nur fuer Trainings-Telemetrie/Raw-State, keine Produktiv-Runtime |
| `scripts/training-headless-lane-runner.mjs` | eng write | nur fuer Trace-/Scenario-/Reward-Telemetrie |
| `src/state/training/RewardCalculator.js` | eng write | nur bei belegtem Reward-Ordering-Problem |
| `src/state/training/EpisodeController.js` | eng write | nur bei belegtem Terminal-/Runner-Problem |
| `tests/training-*.mjs` | write | focused Reward-/Terminal-/Scenario-Smokes |
| `python/tests/test_ppo_action_surface.py`, `python/tests/test_curvios_env.py` | write | action/observation contract smokes |
| produktive Runtime-/AI-Hub-/Strategy-/Registry-/Rollout-Surfaces | read-only | Layer-Grenzen |

## Definition of Done

- [ ] DoD.1 `finding_register.json` uebernimmt alle Befunde B.01 bis B.09 mit
  Quelle, Feldwert, Blockwirkung und erlaubter naechster Aktion.
- [ ] DoD.2 `trace_reanalysis_report.json` trennt Early-Death, spaete
  Player-Dead-Controls, Wall-/Trail-Naehesignale, Safety-Diagnostik,
  Action-Tails und Reward-Tails.
- [ ] DoD.3 `policy_collapse_report.json` beweist oder widerlegt den
  deterministischen `yaw-right`-Collapse gegen Stochastic-/Eval-Mode,
  Logit-/Entropy-Snapshot und Action-Distribution.
- [ ] DoD.4 `walltrail_scenario_manifest.json` pinnt mehrere kleine
  Szenarioklassen mit Seeds, Startzustand, erwarteter Escape-Wirkung,
  Abbruchkriterium, Positiv- und Negativkontrolle.
- [ ] DoD.5 `action_effect_stress_report.json` beweist fuer vorhandene Actions,
  ob sie Wand-/Trail-Gefahr real reduzieren koennen: WallDistance, LocalOpenness,
  ThreatHorizon, CollisionRisk, Heading-/Target-Delta und TerminalRisk.
- [ ] DoD.6 Neue Sidecar-Actions sind nur erlaubt, wenn DoD.5 eine konkrete
  Action-Wirkungsluecke belegt; jede neue Action braucht Safety-Raten 0/0/0 und
  realen Zustandsgewinn.
- [ ] DoD.7 `observation_telemetry_gap_report.json` nennt, ob Raw-Pose,
  Heading, Velocity, Trail-Distance oder Escape-Lane-Felder fehlen; fehlende
  Felder sind ein Blocker oder ein enger Trainings-Telemetrie-Fix.
- [ ] DoD.8 `safety_action_contract_report.json` klaert, ob
  `vetoActive=true` nur Diagnose ist oder eine handlungswirksame Maske/Policy
  braucht; keine produktive Runtime-Safety-Umschaltung in BT93Q.
- [ ] DoD.9 `reward_pressure_ordering_report.json` beweist oder widerlegt, dass
  Progress-/Checkpoint-Reward nahe lethalem Wall-/Trail-Druck falsch ordnet.
- [ ] DoD.10 Nur eine Fix-Klasse pro Subphase: Action, Observation/Telemetry,
  Reward, Safety-Mask oder Terminal/Runner. Gemischte Fixes brauchen getrennte
  Teilphasen und getrennte Reports.
- [ ] DoD.11 `micro_ppo_recheck_report.json` laeuft maximal 10k Timesteps und
  nur nach gruener Stress-/Fix-Evidence. Keine 50k/100k in BT93Q.
- [ ] DoD.12 Recheck-Gate bleibt hart: Train und Eval `deathBefore60Count=0`
  oder vorher gepinnter, statistisch begruendeter Korridor; nachtraegliche
  Toleranzen sind ungueltig.
- [ ] DoD.13 `handover_package.json` klassifiziert ehrlich:
  `walltrail-policy-green`, `death-before60-still-blocking`,
  `action-space-required`, `observation-telemetry-required`,
  `reward-redesign-required`, `terminal-semantics-required` oder
  `measurement-invalid`.
- [ ] DoD.14 BT93Q erzeugt kein `BT94A-ready`, solange DQN-Anker/Ersatzpolitik,
  BT93O, BT93P und `bt94a_gate_check.py` nicht gruen sind.
- [ ] DoD.15 `closure_gate_report.json` belegt, dass kein Candidate, Freeze,
  Holdout, Promote, Rollout, PPO-Validate- oder Runtime-Handoff-Signal erzeugt
  wurde.

## Phasen

### 93Q.1 Befundregister und Hypothesen-Lock

- [ ] 93Q.1.1 `bt93q_finding_register.py` erstellt
  `data/training/ppo/bt93q/finding_register.json` aus BT93L/BT93M/BT93N/BT94A-
  Artefakten.
- [ ] 93Q.1.2 Jeder Befund B.01 bis B.09 bekommt `sourcePath`, `field`,
  `observedValue`, `blockEffect`, `allowedFixClasses`, `forbiddenActions`.
- [ ] 93Q.1.3 `hypothesis_lock.json` pinnt H1-H7 vor jedem Fix; BT93Q darf
  keine Hypothese nachtraeglich umdeuten.
- [ ] 93Q.1.4 `next_allowed_actions` nennt nur Diagnose-/Repair-Aktionen und
  blockiert `BT93O`, `BT93P`, `BT94A`, Candidate, Freeze, Holdout, Promote,
  Rollout.

Evidence:

- `data/training/ppo/bt93q/finding_register.json`
- `data/training/ppo/bt93q/hypothesis_lock.json`

### 93Q.2 Trace-Reanalyse und Telemetrie-Vollstaendigkeit

- [ ] 93Q.2.1 `trace_reanalysis_report.json` wertet BT93N-Rohsamples erneut aus:
  Early-Death vs. non-event-control, Action-Tails, WallDistance, LocalOpenness,
  CollisionRisk, DeadEndRisk, Reward-Tails, TerminalReason.
- [ ] 93Q.2.2 `player_dead_control_report.json` trennt fruehe Tode von spaeteren
  Player-Dead-Kontrollen; spaete positive-control Tode duerfen nicht ignoriert
  werden.
- [ ] 93Q.2.3 `observation_telemetry_gap_report.json` bewertet
  `rawPoseAvailable=false` und entscheidet, ob Raw-Pose/Heading/Velocity oder
  Trail-/Escape-Lane-Felder fuer die naechste Diagnose zwingend sind.
- [ ] 93Q.2.4 Kein Action-, Reward- oder Safety-Fix vor Abschluss von 93Q.2.

Evidence:

- `data/training/ppo/bt93q/trace_reanalysis_report.json`
- `data/training/ppo/bt93q/player_dead_control_report.json`
- `data/training/ppo/bt93q/observation_telemetry_gap_report.json`

### 93Q.3 Deterministic-Policy-Collapse Diagnose

- [ ] 93Q.3.1 `policy_collapse_report.json` prueft Stochastic-Train,
  Deterministic-Eval und mindestens eine Temperature-/Top-2-Diagnose ohne
  Qualitaetsclaim.
- [ ] 93Q.3.2 Report schreibt Action-Distribution, repeated-action streaks,
  Entropy/Logit-Snapshot, `argmaxAction`, `secondBestAction`, Margin und
  Szenariokontext.
- [ ] 93Q.3.3 Wenn deterministische Eval weiter `yaw-right` dominiert, endet die
  Subphase `policy-collapse-active` und blockiert jeden 10k-Recheck.
- [ ] 93Q.3.4 Wenn Collapse nur Eval-Mode-Artefakt ist, muss der Report
  belegen, dass Stochastic-/Deterministic-Urteile getrennt bleiben und welches
  Urteil fuer Gate-Evidence gilt.

Evidence:

- `data/training/ppo/bt93q/policy_collapse_report.json`

### 93Q.4 Wall-/Trail Action-Effekt-Stressmatrix

- [ ] 93Q.4.1 `walltrail_scenario_manifest.json` definiert mindestens diese
  Szenarioklassen: frontal-near-wall, side-wall-left, side-wall-right,
  narrowing-corridor, trail-ahead, trail-side, escape-left-open,
  escape-right-open, no-danger-control.
- [ ] 93Q.4.2 Jede Klasse hat Seed, Startfenster, maxSteps, expectedSafeAction,
  forbiddenSuccessProxy und Negativkontrolle.
- [ ] 93Q.4.3 `action_effect_stress_report.json` testet alle bestehenden
  semantischen Actions gegen diese Klassen ohne PPO-Training.
- [ ] 93Q.4.4 Success braucht reale Zustandswirkung: WallDistance steigt,
  LocalOpenness steigt oder stabilisiert, CollisionRisk sinkt, TerminalRisk
  sinkt. Reward allein reicht nicht.
- [ ] 93Q.4.5 Wenn keine bestehende Action eine Klasse rettet, endet die Klasse
  `action-space-required`.

Evidence:

- `data/training/ppo/bt93q/walltrail_scenario_manifest.json`
- `data/training/ppo/bt93q/action_effect_stress_report.json`

### 93Q.5 Fix nach belegter Ursache

- [ ] 93Q.5.1 Action-Fix nur bei `action-space-required`: Sidecar-only
  Compound-Actions wie `turn-left-boost`, `turn-right-boost`, `brake`,
  `evade-left`, `evade-right` oder `danger-turn-away` einfuehren und testen.
- [ ] 93Q.5.2 Observation-/Telemetry-Fix nur bei `observation-telemetry-required`:
  Raw-Pose/Heading/Velocity/TrailDistance/EscapeLane-Felder in Trainingsreports
  sichtbar machen, ohne produktive Runtime-API zu erweitern.
- [ ] 93Q.5.3 Reward-Fix nur bei `reward-redesign-required`: danger-aware
  Progress-/Checkpoint-Ordering reparieren, ohne Noop/MaxStep zu belohnen.
- [ ] 93Q.5.4 Safety-Mask-Fix nur bei belegter Safety-Wirkungsluecke:
  trainingsseitige Pre-sampling-Danger-Mask oder Emergency-Action-Policy
  dokumentieren; keine produktive Runtime-Umschaltung.
- [ ] 93Q.5.5 Terminal-/Runner-Fix nur bei echter Klassifikationsdrift:
  `player-dead`, `truncated`, `max-steps`, `match-ended` muessen im Raw-Trace
  widerspruechlich sein.
- [ ] 93Q.5.6 `fix_manifest.json` pinnt genau eine Fix-Klasse, geaenderte
  Dateien, erwartete Metrikrichtung und Falsifikationsregeln vor Recheck.

Evidence:

- `data/training/ppo/bt93q/fix_manifest.json`
- `data/training/ppo/bt93q/fix_delta_report.json`

### 93Q.6 10k Micro-PPO Recheck

- [ ] 93Q.6.1 Recheck startet nur, wenn 93Q.4/93Q.5 eine konkrete Ursache und
  einen engen Fix belegen.
- [ ] 93Q.6.2 `micro_ppo_recheck_contract.json` pinnt Matrix, Reward-Profil,
  Action-Surface, Seeds, Eval-Seeds, maxSteps, Statistik-Korridor und
  verbotene nachtraegliche Schwellenanpassung.
- [ ] 93Q.6.3 Maximal 10k Timesteps; keine 50k/100k-Erweiterung im selben Block.
- [ ] 93Q.6.4 Report schreibt Train/Eval DeathBefore60, PlayerDeadShare,
  Action-Distribution, repeated-action streaks, Entropy/Logit-Snapshot,
  Progress-/Objective-Raten, RewardBreakdown, Safety-Raten und Runtime Errors.
- [ ] 93Q.6.5 Gruen nur bei `deathBefore60Train=0`, `deathBefore60Eval=0`,
  nicht-kollabierter Deterministic-Eval-Action-Distribution oder vorher
  gepinntem, begruendetem Korridor, plus Progress/Objectives nonzero.

Evidence:

- `data/training/ppo/bt93q/micro_ppo_recheck_contract.json`
- `data/training/ppo/bt93q/micro_ppo_recheck_report.json`

### 93Q.99 Abschluss-Gate

- [ ] 93Q.99.1 Alle Phasen 93Q.1 bis 93Q.6 sind mit versionierter Evidence
  dokumentiert oder als bewusst nicht gestartet begruendet.
- [ ] 93Q.99.2 Ergebnis ist ehrlich klassifiziert:
  `walltrail-policy-green`, `death-before60-still-blocking`,
  `policy-collapse-active`, `action-space-required`,
  `observation-telemetry-required`, `reward-redesign-required`,
  `terminal-semantics-required` oder `measurement-invalid`.
- [ ] 93Q.99.3 BT93O startet nur, wenn DeathBefore60 non-blocking,
  deterministic policy non-collapsed oder erklaert, Action-/Observation-/Reward-
  Stress gruen und Safety-/Runtime-Raten 0/0/0 sind.
- [ ] 93Q.99.4 BT93P und BT94A bleiben geschlossen, solange DQN-/Ersatzpolitik,
  BT93O und BT93P nicht gruen sind.
- [ ] 93Q.99.5 Kein Candidate-, Freeze-, Holdout-, Promote-, Rollout-,
  PPO-Validate- oder BT95-Handoff-Signal wurde erzeugt.

Evidence:

- `data/training/ppo/bt93q/handover_package.json`
- `data/training/ppo/bt93q/closure_gate_report.json`

## Result Classes

| ResultClass | Bedeutung | Oeffnet |
| --- | --- | --- |
| `walltrail-policy-green` | DeathBefore60 non-blocking, no collapse, stress matrix gruen | nur BT93O-Claim-Pruefung |
| `death-before60-still-blocking` | 10k oder Stressmatrix bleibt rot | enger Folgeblock, kein BT93O |
| `policy-collapse-active` | Deterministic Eval bleibt single-action dominated | Policy-/Training-Signal-Folgeblock |
| `action-space-required` | bestehende Actions koennen Escape nicht leisten | Action-Surface-Fixblock |
| `observation-telemetry-required` | relevante State-/Trace-Felder fehlen | Telemetrie-/Observation-Fixblock |
| `reward-redesign-required` | Gefahrnahe Progress-/Reward-Ordnung ist falsch | Reward-Fixblock |
| `terminal-semantics-required` | Terminal-/Runner-Klassifikation widerspricht Raw-Trace | Terminal-/Runner-Fixblock |
| `measurement-invalid` | Sample, Matrix oder Trace reicht nicht | Messpfad reparieren |

## Stop-Regeln

- Kein BT93O-Start, solange `death-before60-still-blocking` aktiv ist.
- Kein 50k-/100k-/200k-Lauf in BT93Q.
- Kein `BT94A-ready`, auch wenn BT93Q gruen endet.
- Kein Candidate, Freeze, Holdout, Promote, Rollout oder BT95-Handoff.
- Kein DQN-Phantomanker; `dqn-anchor-blocked` bleibt separater Blocker.
- Kein Reward-Fix ohne `reward_pressure_ordering_report.json`.
- Keine Action-Erweiterung ohne `action_effect_stress_report.json`.
- Keine Telemetrie-Erweiterung ohne `observation_telemetry_gap_report.json`.
- Kein `latest_*`, `tmp/**`, Throughput, CUDA oder Plan-Gruen als
  Survival-/Qualitaetsbeweis.
- Keine produktive Runtime-, Matchstart-, AI-Hub-, Strategy-, Registry-,
  Rollback- oder JS-Inference-Aenderung.

## Empfohlene Master-Aufnahme

In `docs/bot-training/Bot_Trainingsplan.md` waere dieser Block als neuer
Reparaturblock vor `BT93O` aufzunehmen:

| id | titel | status | prio | depends_on | current_phase | quelle |
| --- | --- | --- | --- | --- | --- | --- |
| BT93Q | DeathBefore60 Wall/Trail Policy Repair | planned | P1 | BT93N.99 (`diagnose-loop-required`, `death-before60-still-blocking`) | 93Q.1 | `docs/plaene/neu/BT93Q_DeathBefore60_WallTrail_Policy_Repair_Intake_2026-04-30.md` |

Abhaengigkeitsschaerfung:

- `BT93O` sollte bis `BT93Q.99=walltrail-policy-green` gesperrt bleiben.
- `BT93P` bleibt bis `BT93O.99` gesperrt.
- `BT94A` bleibt bis `BT93P.4=BT94A-ready` plus gruenem
  `bt94a_gate_check.py` gesperrt.
- DQN-Anker oder explizite User-Ersatzvergleichspolitik bleibt separate
  positive-Reentry-Bedingung.

## Erste konkrete Aktion nach Aufnahme

Nach manueller Aufnahme in den aktiven Master:

1. `/fix-planung` claimt `BT93Q`.
2. Erste Subphase ist `93Q.1 Befundregister und Hypothesen-Lock`.
3. Erste Artefakte:
   - `python/scripts/bt93q_finding_register.py`
   - `data/training/ppo/bt93q/finding_register.json`
   - `data/training/ppo/bt93q/hypothesis_lock.json`
4. Noch kein PPO-Lauf in 93Q.1.
5. Abschluss nur mit `npm.cmd run gates:pre-commit` und versionierter Evidence.
