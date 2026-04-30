# BT93S2 Matrix-/Action-Effect Repair Replan Intake

Datum: 2026-04-30

Status: User-beauftragter Intake/Replan; direkte Aufnahme in
`docs/bot-training/Bot_Trainingsplan.md` ist vom User beauftragt.

Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`

Geplanter Platz: direkt nach `BT93S.99=matrix-redesign-required` und vor
`BT93T`. `BT93T`, `BT93U`, `BT93V`, `BT93W`, `BT93O`, `BT93P`, `BT94A`,
Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate und BT95 bleiben
geschlossen, bis `BT93S2.99` eine erlaubte Oeffnung schreibt.

## Kurzurteil

`BT93S` hat die deterministische Eval-Collapse-Ursache aus `BT93RR` nicht
wieder geoeffnet, aber die Wall-/Trail-Leiter fachlich rot gestoppt:

- `BT93S.99=resultClass=matrix-redesign-required`, `opensNext=[]`.
- Aktive Blocker: `matrix-redesign-required`, `action-space-required`,
  `action-selection-required`, `observation-telemetry-required`.
- `no-danger-control` ist als Matrix-/Control-Problem rot: keine erfolgreiche
  Positive-Control, `positiveControlPass=false`, `existingActionCanRescue=false`.
- `escape-right-open` hat keine erfolgreiche bestehende Action:
  `action-effect-weak`, `successfulActions=[]`.
- Die Policy waehlt auf drei Szenarien wirksame Actions nicht stabil genug:
  `narrowing-corridor`, `side-wall-left`, `side-wall-right`.
- `trail-ahead` und `trail-side` bleiben telemetry-limited, aber diese Luecke
  darf erst nach reparierter Matrix und Action-Wirkung nach `BT93T` routen.

Darum ist der naechste Block kein Telemetry-Block und kein Reward-Block. Der
naechste sinnvolle Scope ist ein enger Matrix-/Action-Effect-Repair mit frischer
S-Recheck-Closure.

## Startbefunde und Konsequenzen

| Quelle | Befund | Konsequenz fuer BT93S2 |
| --- | --- | --- |
| `data/training/ppo/bt93s/bt93s_closure_gate_report.json` | `resultClass=matrix-redesign-required`, `opensNext=[]`, alle ClaimFlags false | neuer Zwischenblock vor `BT93T/U/W/O/P/94A` |
| `scenarioBlockers.matrixRedesignScenarioIds` | `no-danger-control` | Control-Semantik und Positive-/Negative-Control muessen v2 werden |
| `scenarioBlockers.actionEffectGapScenarioIds` | `escape-right-open` | nach v2-Matrix echte Zustandswirkung beweisen oder `action-space-required` behalten |
| `scenarioBlockers.selectionBlockers` | `narrowing-corridor`, `side-wall-left`, `side-wall-right` | Policy-Selection erst nach valider Matrix/Action-Wirkung beurteilen |
| `scenarioBlockers.telemetryLimitedScenarioIds` | `trail-ahead`, `trail-side` | darf nur dann `BT93T` oeffnen, wenn keine Matrix-/Action-/Selection-Blocker mehr offen sind |
| `existing_action_effect_report.json` | `probeCount=351`, bestehende Actions mit 0 Success fuer `escape-right-open` | Action-Surface-Entscheidung braucht v2-Matrix-Beweis, keine Command-Flag-Proxies |
| `action_surface_decision.json` | `newActionIntroduced=false`, `decision=defer-action-surface-change-until-matrix-redesign` | keine neue Action vor v2-Control-Gruen |
| `policy_selection_report.json` | `selectionStepCount=607`, `newTrainingEpisodes=0`, `holdoutEpisodes=0` | S2-Recheck bleibt diagnostic-only; kein PPO-Langlauf |
| `BT93RR.99` | `eval-mode-bug-fixed-counterprobe-green`, aber `deathBefore60Count=2` nur Diagnose | BT93S2 darf keinen Survival-/Qualitaetsclaim erzeugen |
| R-X-Governance | Plantext loest keinen Blocker | jede Phase braucht maschinenlesbares Artefakt mit Resultklasse und ClaimFlags |

## Ziel

BT93S2 schafft die Voraussetzungen, damit die R-X-Leiter wieder ehrlich
weiterarbeiten kann:

1. Matrix-/Control-Vertrag v2 reparieren, statt `no-danger-control` als
   Action-Erfolgsszenario zu missbrauchen.
2. `escape-right-open` auf einer validen v2-Matrix erneut messen und nur echte
   Zustandswirkung als Action-Erfolg zaehlen.
3. Action-Surface-Aenderungen nur bei belegter v2-Action-Luecke erlauben; bei
   Action-Surface-Drift wird die aktuelle Policy-Lineage invalidiert und kein
   S-Gruen erzeugt.
4. Policy-Selection erst nach valider Matrix und Action-Wirkung rechecken.
5. `BT93T` nur oeffnen, wenn ausschliesslich Telemetrie fehlt.
6. `BT93U` nur oeffnen, wenn `action-selection-green` ohne Telemetry-/Matrix-/
   Action-Space-Blocker vorliegt.

## Nicht-Ziele

- Kein PPO-Training, kein 10k/50k/100k/200k/500k/1M-Lauf.
- Kein Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate oder BT95.
- Kein produktiver Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart-Scope.
- Kein Reward-Fix; Reward-Ordering bleibt `BT93U` und startet nur nach
  Action-/Telemetry-Gruen.
- Keine DQN-/Comparator-Reparatur; das bleibt voller `BT93X` nach `BT93O`.
- Keine Action-Surface-Erweiterung, solange die v2-Matrix nicht gruen ist.

## Scope Files

Read/Write:

- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/plaene/neu/BT93S2_Matrix_Action_Effect_Repair_Replan_2026-04-30.md`
- `python/scripts/bt93s2_*.py`
- `data/training/ppo/bt93s2/**`

Conditional Read/Write:

- `python/scripts/bt93s_*.py` nur als Vorlage oder gezielte v2-Erweiterung.
- `python/envs/ppo_action_surface.py` nur wenn v2-Evidence eine echte
  Action-Surface-Luecke belegt; dann neue `actionSurfaceId`, Decoder-Hash,
  invalidierte Reports und Policy-Lineage-Invalidierung schreiben.

Read-only:

- `data/training/ppo/bt93s/**`
- `data/training/ppo/bt93r_reentry/**`
- `data/training/ppo/bt93y/**`
- `scripts/training-headless-lane-runner.mjs`
- produktive Runtime-/AI-Hub-/Strategy-/Registry-/Matchstart-Surfaces

## Result-Class-Vertrag

| Resultklasse | Bedeutung | Oeffnet |
| --- | --- | --- |
| `action-selection-green` | v2-Matrix gruen, Action-Effekt gruen, Policy waehlt wirksame Actions, keine Telemetry-/Matrix-/Action-Space-Blocker | `BT93U` |
| `observation-telemetry-required` | v2-Matrix und Action-/Selection-Gates sind urteilsfaehig, aber Trail-/Escape-Attribution braucht Raw-/Trail-Telemetrie | `BT93T` |
| `matrix-redesign-required` | Matrix/Control v2 bleibt ungueltig oder Positive-/Negative-Control scheitert | nichts |
| `action-space-required` | v2-Matrix ist gruen, aber vorhandene Actions haben keine echte Zustandswirkung | nichts; enger Action-Surface-/Lineage-Replan |
| `action-selection-required` | wirksame Actions existieren, aber Policy waehlt sie nicht ausreichend | nichts; enger Policy-Selection-/Training-Replan |
| `action-surface-lineage-invalidated` | Action-Surface wurde geaendert; alte Policy/Normalize-Lineage darf nicht als Selection-Gruen zaehlen | nichts; neuer Lineage/Reentry-Block erforderlich |
| `measurement-invalid` | Quellen, Hashes, Counts, Schema oder Reports sind nicht urteilsfaehig | nichts |

Jede Resultklasse schreibt `allowNext[]`, `opensNext[]`, `blocksNext[]`,
`claimFlags`, `sampleCounts`, `sourceArtifacts[]`, `invalidations[]` und
`guardrails`.

## Definition of Done

- [ ] DoD.S2R1 Startvertrag lockt alle BT93S-/BT93RR-Quellen mit Hashes,
  Resultklassen, SampleCounts, Matrix-ID, ActionSurfaceId, Policy-Lineage,
  ClaimFlags und aktiven Blockern.
- [ ] DoD.S2R2 Matrix v2 trennt Control-Semantik sauber: `no-danger-control`
  ist ein Stabilitaets-/Non-Success-Control, kein Escape-Erfolgsszenario.
- [ ] DoD.S2R3 Matrix v2 hat fuer jede Action-Effect-Szenarioklasse eine
  Positive-Control mit echter Zustandswirkung und eine Negative-Control, die
  nicht versehentlich Erfolg zaehlt.
- [ ] DoD.S2R4 `escape-right-open` wird auf v2 mit mindestens einer real
  wirksamen bestehenden oder kontrolliert neu begruendeten Action belegt; sonst
  endet der Block `action-space-required`.
- [ ] DoD.S2R5 Success-Definition bleibt zustandsbasiert:
  WallDistance/LocalOpenness/CollisionRisk/TerminalRisk/Heading-/Target-Delta
  und Trail-Druck; Reward-only, command-flag-only, target-distance-only,
  single-step und maxSteps-only bleiben verboten.
- [ ] DoD.S2R6 Action-Surface-Aenderungen sind nur nach v2-Action-Gap erlaubt;
  jede Aenderung invalidiert alte Policy-Selection/Comparator-Artefakte und
  darf nicht `action-selection-green` oeffnen.
- [ ] DoD.S2R7 Policy-Selection-Recheck nutzt dieselbe v2-Matrix, dieselbe
  Retrain-Lineage, gepinnte Seeds, keine Trainingsepisoden, keine Holdouts und
  feste Schwellen (`effectiveSelectionShare >= 0.25`,
  `top2EffectiveShare >= 0.50`) pro relevanter Szenariofamilie.
- [ ] DoD.S2R8 Telemetrie darf `BT93T` nur oeffnen, wenn Matrix-/Action-Space-/
  Selection-Blocker geschlossen sind und nur Trail-/Escape-Attribution fehlt.
- [ ] DoD.S2R9 Closure-Gate schreibt genau eine erlaubte Resultklasse und haelt
  `BT93W/O/P/94A`, Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate
  und BT95 immer geschlossen.
- [ ] DoD.S2R10 Meta-Gate `npm.cmd run gates:pre-commit` ist gruen; Tests und
  Trainingslaeufe bleiben user-owned ausser fuer `*.99` noetige Diagnose-Skripte.

## Phasen

### 93S2.1 Startvertrag und Invalidation Lock

- [ ] 93S2.1.1 `bt93s2_start_contract.py` liest `BT93S.99`, `93S.1-93S.4`,
  `BT93RR.99`, Policy-Lineage und ActionSurface-Hash.
- [ ] 93S2.1.2 Report schreibt alle aktiven Blocker, Szenario-IDs,
  invalidierte BT93S-Reports, verbotene Folgeaktionen und erlaubte
  Resultklassen.
- [ ] 93S2.1.3 Wenn eine Quelle fehlt, untracked ist oder nicht zu
  `BT93S.99=matrix-redesign-required` passt, endet die Phase
  `measurement-invalid`.

Evidence:

- `data/training/ppo/bt93s2/start_contract.json`

### 93S2.2 Matrix-v2 Contract und Scenario Search

- [ ] 93S2.2.1 `no-danger-control` in `controlKind=neutral-stability-control`
  umstellen: Erfolg ist Stabilitaet/keine Risikoerhoehung, nicht Escape.
- [ ] 93S2.2.2 `escape-right-open` per deterministischer Scenario-Search
  reparieren: Predicate, Warmup, Seeds und Positive-Control muessen vor Messung
  validiert sein.
- [ ] 93S2.2.3 Alle Wall-/Trail-/Escape-Szenarien bekommen Positive-Control,
  Negative-Control, Mindestfenster, Revalidation-Predicate, Seed-Plan,
  verbotene Success-Proxies und Drift-/Invalidation-Liste.
- [ ] 93S2.2.4 Scenario-Search trennt Discovery-Seeds und Validation-Seeds,
  damit der Matrix-Fix nicht nur auf bekannte Seeds ueberfitten kann.

Evidence:

- `data/training/ppo/bt93s2/scenario_search_report.json`
- `data/training/ppo/bt93s2/scenario_matrix_v2_contract.json`

### 93S2.3 Existing-Action Effect v2

- [ ] 93S2.3.1 Bestehende Actions ohne PPO-Training gegen v2 messen.
- [ ] 93S2.3.2 `escape-right-open`, Side-Wall und Narrowing-Szenarien muessen
  echte Zustandswirkung zeigen oder exakt als `action-space-required`
  klassifiziert werden.
- [ ] 93S2.3.3 `no-danger-control` darf keine Action-Gruen-Evidence liefern;
  es prueft nur, dass Controls nicht faelschlich Erfolg erzeugen.
- [ ] 93S2.3.4 Command-Flag-Only, Reward-Only und MaxStep-Proxies werden
  maschinenlesbar abgelehnt.

Evidence:

- `data/training/ppo/bt93s2/existing_action_effect_v2_report.json`

### 93S2.4 Action-Surface Repair Decision

- [ ] 93S2.4.1 Wenn v2 noch `action-space-required` meldet, Root-Cause trennen:
  Matrix bleibt falsch, bestehende Action-Semantik ist zu schwach, Decoder/
  Mapping ist falsch, oder neue Compound-Action ist wirklich erforderlich.
- [ ] 93S2.4.2 Jede erlaubte Action-Surface-Aenderung bekommt neue
  `actionSurfaceId`, Decoder-Hash, Safety-Raten, Compatibility-Statement,
  invalidierte Reports und Policy-Lineage-Invalidierung.
- [ ] 93S2.4.3 Wenn Action-Surface geaendert wird, endet BT93S2 nicht gruen,
  sondern `action-surface-lineage-invalidated`.
- [ ] 93S2.4.4 Wenn keine Aenderung noetig ist, wird die unveraenderte
  ActionSurfaceId als Recheck-Basis gepinnt.

Evidence:

- `data/training/ppo/bt93s2/action_surface_repair_decision.json`

### 93S2.5 Policy-Selection Recheck v2

- [ ] 93S2.5.1 Nur starten, wenn v2-Matrix und Action-Effect urteilsfaehig sind
  und die ActionSurface-Lineage nicht invalidiert wurde.
- [ ] 93S2.5.2 Recheck misst `narrowing-corridor`, `side-wall-left`,
  `side-wall-right`, `escape-left/right`, `frontal-near-wall`, Trail-Szenarien
  und Controls getrennt.
- [ ] 93S2.5.3 Pro Szenariofamilie muessen effektive Actions als Top2 und in
  realer Auswahl ausreichend erscheinen; Aggregat-Gruen allein ist ungueltig.
- [ ] 93S2.5.4 `trail-ahead`/`trail-side` duerfen nur dann
  `observation-telemetry-required` erzeugen, wenn alle nicht-telemetry Blocker
  gruen sind.

Evidence:

- `data/training/ppo/bt93s2/policy_selection_v2_report.json`

### 93S2.99 Closure

- [ ] 93S2.99.1 Closure liest alle S2-Reports, schreibt eine erlaubte
  Resultklasse, `allowNext[]`, `opensNext[]`, `blocksNext[]`, ClaimFlags,
  SampleCounts, SourceArtifacts und Invalidations.
- [ ] 93S2.99.2 `BT93T` oeffnet nur bei `observation-telemetry-required`;
  `BT93U` oeffnet nur bei `action-selection-green`.
- [ ] 93S2.99.3 Jedes rote Ergebnis oeffnet keinen bestehenden Folgeblock und
  schreibt den naechsten engen Reparaturbedarf.
- [ ] 93S2.99.4 Abschluss-Gate: `npm.cmd run gates:pre-commit`.

Evidence:

- `data/training/ppo/bt93s2/bt93s2_closure_gate_report.json`

## Risiko-Register

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Matrix wird auf bekannte Seeds ueberfitten | kritisch | RL/QA | Discovery-/Validation-Seeds trennen, Seed-Plan vor Messung locken | v2-Gruen nur auf alten 930/934/942-Fenstern |
| `no-danger-control` wird erneut als Action-Erfolg gelesen | kritisch | Governance/RL | `controlKind=neutral-stability-control`, keine Action-Gruen-Evidence aus Control | Control liefert `successfulActions` |
| Action-Surface-Aenderung macht alte Policy-Evidence ungueltig | kritisch | RL/Governance | `action-surface-lineage-invalidated`, kein Selection-Gruen nach Surface-Drift | neue ActionSurfaceId ohne Reentry |
| Telemetriebedarf ueberdeckt Matrix-/Action-Fehler | hoch | QA | Telemetry darf nur oeffnen, wenn andere Blocker gruen sind | `BT93T` trotz `matrix-redesign-required` |
| Policy-Selection wird aggregiert schoengerechnet | hoch | QA | Per-Szenariofamilie Schwellen; Aggregat reicht nicht | Top2/EffectiveShare nur global gruen |
| Reward-/MaxStep-Proxies werden als Action-Wirkung gelesen | hoch | RL | verbotene Proxies in jedem Report, State-Effect-Pflicht | Reward steigt ohne Risk-/Wall-/Trail-Verbesserung |
| Runtime-Grenze wird verletzt | kritisch | Architektur | produktive Surfaces read-only, Scope-Report und Guardrails | Runtime-/AI-Hub-Datei im Diff |
| Der Block wird zu breit und mischt Reward/Training hinein | hoch | Governance | Nicht-Ziele, Resultklassen und Closure-Gate blockieren Training/Reward | Reward-Fix oder PPO-Lauf im S2-Diff |

## Harte Selbstkritik des Replans

- Fehlergefahr: Der Plan koennte `observation-telemetry-required` zu frueh
  oeffnen, weil Trail-Szenarien sichtbar rot sind. Korrektur: BT93T oeffnet nur
  wenn Matrix, Action-Space und Selection nicht mehr rot sind.
- Fehlergefahr: Eine neue Action koennte den alten Policy-Recheck entwerten.
  Korrektur: Jede ActionSurface-Aenderung endet
  `action-surface-lineage-invalidated`, nicht `action-selection-green`.
- Fehlergefahr: `no-danger-control` koennte weiter als fehlende Action gelesen
  werden. Korrektur: Control wird explizit in neutralen Stabilitaetscheck
  umklassifiziert.
- Fehlergefahr: Matrix v2 koennte auf alte Seeds optimieren. Korrektur:
  Discovery-/Validation-Seeds werden Pflicht.
- Fehlergefahr: Der Block koennte BT93O/P/94A aus Plan-Gruen oeffnen.
  Korrektur: ClaimFlags fuer diese Ziele bleiben in jeder Resultklasse false.
