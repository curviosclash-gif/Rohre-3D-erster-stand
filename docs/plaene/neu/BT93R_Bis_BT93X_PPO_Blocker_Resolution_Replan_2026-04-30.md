# BT93R bis BT93X PPO Blocker Resolution Replan Intake

Datum: 2026-04-30

Status: neuer Intake-Draft; R2-haertet; manuelle Uebernahme in
`docs/bot-training/Bot_Trainingsplan.md` erforderlich.

Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`

Geplanter Platz:

- `PF.0` direkt nach `BT93Q.99` als Aufnahme-/Gate-Sync
- `BT93R` bis `BT93W` nach PF.0 und vor `BT93O`
- `BT93X.0` read-only frueh nach PF.0; voller `BT93X` nach
  `BT93O.99=bt93o-quality-green` und vor `BT93P`
- `BT93P`, `BT94A`, `BT94B`, `BT95` bleiben geschlossen, bis ihre neuen
  Startgates gruen sind

## Kurzurteil

`BT93Q` ist sauber abgeschlossen, aber fachlich rot:
`resultClass=policy-collapse-active`, `bt93oClaimAllowed=false`, kein
BT93P-/BT94A-Signal. Die aktive Blockergruppe ist nicht ein einzelner Bug,
sondern eine Kette:

1. deterministic eval ist auf `yaw-right` kollabiert.
2. Action-Effekt und Action-Selection sind fuer Wall-/Trail-Escape nicht
   hinreichend belegt; `escape-right-open` bleibt rot.
3. Raw-/Trail-/Escape-Lane-Telemetrie fehlt fuer saubere Geometrie-Attribution.
4. Reward-Ordering belohnt riskante Action-Reihen weiter positiv.
5. Safety-Felder sind Diagnose-only; `vetoActive` greift nicht als Maske.
6. DeathBefore60 und spaete `player-dead`-Kontrollen bleiben blockierend.
7. Same-Matrix-DQN oder explizite Ersatzvergleichspolitik fehlt weiter.
8. BT94A-No-Start bleibt hart rot.

Darum wird `BT93O` nicht direkt gestartet. Die Reparaturkette muss die
Blocker einzeln beseitigen und bei jedem roten Ende einen engen Folgeblocker
melden statt Training zu verlaengern.

R2-Korrektur: Dieser Plan loest durch Text keinen einzigen Blocker. Er ist erst
dann ein Reparaturplan, wenn jeder Block einen maschinenlesbaren Startvertrag,
einen echten Fixpfad, feste Ergebnis-Enums, Artefakt-Lineage, Kill-Kriterien und
Closure-Gates hat. Gruen ist nur ein geschriebenes Artefakt mit passender
Resultklasse, nicht ein Planabschnitt, Gate-Run oder laengerer PPO-Lauf.

## Befundabgleich

### Block- und Gate-Befunde

| Quelle | Befund | Konsequenz |
| --- | --- | --- |
| `BT93L` | `diagnose-loop-required`; Baseline-Matrix zeigt `random` und `semantic-cycle` mit Objective-/Progress-Signalen, teils staerker als `scripted` | Reward-/Matrix-Ordering ist offen; keine PPO-Freigabe aus Reward allein |
| `BT93L baseline_matrix_report.json` | `sameMatrixDqnAnchorPresent=false`; historische DQN-Reports nicht same-matrix | DQN-Anker bleibt harter positiver Reentry-Blocker |
| `BT93M` | `gate-fresh-dqn-anchor-blocked` | Gate-Quelle frisch, aber kein positiver Vergleichsanker |
| `BT93N` | `gateClass=death-before60-still-blocking`, `rootCause=wall/trail` | kein BT93O/BT93P/BT94A aus BT93N |
| `BT93N micro_ppo_repeat_report.json` | 10k: Train `deathBefore60Count=27`, Eval `deathBefore60Count=11`, `playerDeadShare=1.0` | kein 50k/100k/200k; DeathBefore60 bleibt hart |
| `BT93N death_before60_trace_report.json` | 60/60 Terminal `player-dead`, 4/6 Early Deaths `wall/trail`, keine Runtime Errors | Terminal ist plausibel, nicht als Runner-Fehler bewiesen |
| `BT93Q closure_gate_report.json` | `policy-collapse-active`; aktive Blocker 5 | BT93O bleibt gesperrt |
| `BT93Q policy_collapse_report.json` | deterministic eval `yaw-right` 8100/8100, entropy 0.0; stochastic train normalized entropy 0.990638 | Eval/Policy-Collapse ist primaerer Startblocker |
| `BT93Q policy_collapse_report.json` | echte Modell-Logits fehlen; Proxy aus Counts | Modell-/Logit-/Normalize-Artefakte muessen in den Reparaturpfad |
| `BT93Q action_effect_stress_report.json` | `action-space-required`; `escape-right-open` ohne erfolgreiche Action | Action-Surface/Selection bleibt blockierend |
| `BT93Q fix_delta_report.json` | Action-Fix `action-fix-insufficient`; neue Actions safety 0/0/0, aber Zielklasse nicht repariert | Sidecar-Actions allein reichen nicht |
| `BT93Q observation_telemetry_gap_report.json` | `rawPose`, `heading`, `velocity`, `trailDistance`, `escapeLane` fehlen | Telemetrie muss training-only nachgeruestet werden |
| `BT93Q reward_pressure_ordering_report.json` | `positiveRiskyRewardActionRowCount=29` | Reward-Ordering separat reparieren |
| `BT93Q safety_action_contract_report.json` | `vetoActiveRows=173`, `vetoEventRows=0`, `maxVetoRate=0.0` | Safety ist Diagnose-only; keine Runtime-Umschaltung |
| `BT93Q player_dead_control_report.json` | keine Terminal-Label-Widersprueche; spaete positive controls bleiben relevant | Terminal-Fix nur bei neuer Raw-Trace-Kontradiktion |
| `BT93Q micro_ppo_recheck_report.json` | Recheck nicht gestartet; Startgate blockiert durch Policy, Action, Telemetry, Fix-Delta | erst Blocker reparieren, dann maximal 10k |
| `BT94A no_start_gate.json` | `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false` | kein Candidate, Freeze, Holdout, Promote, Rollout |

### B.01 bis B.09

| ID | Status nach BT93Q | Muss im Replan passieren |
| --- | --- | --- |
| B.01 Reward-only Repair verbessert, aber reicht nicht | offen | Reward-Fix erst nach Policy/Action/Telemetry; Danger-Ordering beweisen |
| B.02 DeathBefore60 bleibt blockierend | offen | integrierter 10k-Recheck erst nach allen Vor-Gates |
| B.03 deterministic eval kollabiert | offen | echter Policy-/Logit-/Artefaktblock vor allem anderen |
| B.04 Wall-/Trail-Gefahr sichtbar, aber Geometrie/Action-Effekt unvollstaendig | offen | Action- und Telemetry-Bloecke trennen |
| B.05 Safety-Diagnostik nicht handlungswirksam | offen | Diagnose-only Vertrag oder separater Sidecar-Mask-Blocker |
| B.06 atomare Action-Surface zu schwach moeglich | offen | bestehende Actions, Compound-Actions und Selection getrennt bewerten |
| B.07 Reward-Ordering unter Gefahr verdaechtig | offen | Noop/Random/Semantic/Scripted/Policy Ordering reparieren |
| B.08 DQN-Anker fehlt | offen | nach BT93O eigener BT93X-Comparator-/DQN-Block vor BT93P |
| B.09 BT94A-No-Start rot | offen | No-Start erst nach BT93P.4 frisch oeffnen |

### Hypothesen H1 bis H7

| Hypothese | Routing |
| --- | --- |
| H1 Deterministic Policy Collapse | `BT93R` |
| H2 Atomic Actions may be insufficient | `BT93S` |
| H3 Observation/trace geometry too weak | `BT93T` |
| H4 Safety diagnostics not action-effective | `BT93V` |
| H5 Reward ordering rewards progress in danger | `BT93U` |
| H6 Runner/terminal classification may be wrong | `BT93V`, nur bei Raw-Kontradiktion |
| H7 DQN anchor missing independently | `BT93X`, vor BT93P/BT94A |

## Grundstrategie

- Eine Fixklasse pro Block.
- Keine laengeren PPO-Laeufe vor nicht-blockierenden Diagnose- und Repair-Gates.
- Kein Reward-Fix, solange Policy-Collapse oder Action-/Telemetry-Luecken offen
  sind.
- Keine Runtime-Safety-Umschaltung; Safety bleibt Diagnose oder training-only
  Sidecar-Entscheid.
- Jeder Block endet mit einem ehrlichen Result: gruen, konkreter Folgeblocker
  oder measurement-invalid.
- `BT93O` wird zu einem Qualitaetsblock, nicht zu einem Root-Cause-Mischblock.
- DQN-/Ersatzvergleichspolitik wird separat vor BT93P/BT94A geloest.

## R2-Haertung: Verbindliche Reparaturvertraege

Diese Haertung ist Teil des Intakes. Bei Aufnahme in
`docs/bot-training/Bot_Trainingsplan.md` muessen die folgenden Punkte
maschinenlesbar bleiben; sie duerfen nicht in Fliesstext aufgeloest werden.

### PF.0 Plan-, Branch-, Graph- und No-Start-Preflight

Vor `BT93R.1` gibt es einen Preflight. Er erzeugt keine Bot-Qualitaet, aber er
verhindert stale Gates und falsche Aufnahme.

- [ ] PF.0.1 Branch-/Main-Guard pruefen: `npm.cmd run guard:main`. Wenn der
  Branch nicht `main` ist, endet der Preflight `branch-guard-blocked`, ausser
  der User erlaubt ausdruecklich eine dokumentierte Ausnahme.
- [ ] PF.0.2 Plan-/Docs-Gates pruefen: `npm.cmd run plan:check`,
  `npm.cmd run docs:sync`, `npm.cmd run docs:check`.
- [ ] PF.0.3 Knowledge-Graph-Open-Deps fuer `BT93O`, `BT93P`, `BT94A` pruefen.
  Stale Abhaengigkeiten wie ein offenes `BT93N` trotz geschlossenem
  Bot-Plan-Block muessen vor Claim als Plan-/Graph-Drift gemeldet werden.
- [ ] PF.0.4 `bt94a_gate_check.py --write-report` frisch laufen lassen oder
  ehrlich blockieren. `no_start_gate.json` darf nicht weiter nur BT93M/BT93I als
  aktuelle Wahrheit tragen, wenn BT93Q/R-X bereits neuer sind.
- [ ] PF.0.5 Roadmap-Sync pruefen: `docs/bot-training/Bot_Trainings_Roadmap.md`
  darf alte `BT93M-P`-Kurzformeln nicht als Freigabe gegen diesen R-X-Plan
  lesbar lassen.
- [ ] PF.0.6 Minimalen Terminal-Raw-Sanity aus BT93Q/BT93N-Quellen pruefen.
  Eine bereits sichtbare Terminal-Kontradiktion blockiert Reward- und
  Action-Fixes, bis ein Terminal-/Runner-Fixblock geplant ist.
- [ ] PF.0.7 Preflight-Report schreibt `branch`, `guardMain`, `planCheck`,
  `docsSync`, `docsCheck`, `graphOpenDeps`, `bt94aNoStartFreshness`,
  `roadmapSyncRequired`, `terminalRawSanity` und `nextAllowedAction`.

Evidence:

- `data/training/ppo/bt93r/bt93r_preflight_gate_sync_report.json`

### Result-Class- und Dependency-Vertrag

`non-blocking` ist kein gueltiger Depends-On-Wert. Jeder Block bekommt eine
Allowlist. Alles ausserhalb der Allowlist blockiert die naechste Stufe.

| Uebergang | Oeffnet nur bei | Blockiert bei |
| --- | --- | --- |
| PF.0 -> BT93R.1 | `preflight-green` oder dokumentierte User-Ausnahme fuer Branch | `branch-guard-blocked`, `plan-graph-drift`, `bt94a-no-start-stale`, `roadmap-sync-required` |
| BT93R -> BT93S | `policy-collapse-green`, `decoder-fix-counterprobe-green`, `normalize-fix-counterprobe-green`, `eval-mode-bug-fixed-counterprobe-green` | `policy-collapse-active`, `policy-evidence-invalid`, `model-artifact-missing`, `normalize-mismatch`, `measurement-invalid` |
| BT93S -> BT93T | nur bei `observation-telemetry-required` als Messpfad | alle Action-/Selection-Fixblocker bleiben fuer U/W/O rot |
| BT93S -> BT93U | `action-selection-green` und kein offener Telemetry-Blocker | `action-selection-required`, `action-space-required`, `matrix-redesign-required`, `observation-telemetry-required`, `measurement-invalid` |
| BT93T -> BT93S-Recheck | `telemetry-green` und vorheriger S-Blocker war Telemetry | jeder rote T-Ausgang |
| BT93T -> BT93U | `telemetry-green` plus frischer S-Recheck `action-selection-green` | `observation-telemetry-required`, `telemetry-layer-drift`, `scenario-matrix-invalid`, `measurement-invalid` |
| BT93U -> BT93V | `reward-ordering-green` | `reward-redesign-required`, `matrix-redesign-required`, `objective-contract-required`, `measurement-invalid` |
| BT93V -> BT93W | `safety-diagnostic-nonblocking` und `terminal-nonblocking` | `safety-sidecar-mask-required`, `terminal-semantics-required`, `runtime-safety-drift-blocked`, `measurement-invalid` |
| BT93W -> BT93O | `bt93o-precondition-green` | jeder andere W-Result |
| BT93O -> BT93X full | `bt93o-quality-green` | `action-quality-required`, `objective-quality-required`, `anti-plateau-required`, `reward-redesign-required`, `matrix-redesign-required`, `measurement-invalid` |
| BT93X -> BT93P | `bt93p-starttruth-green` | `dqn-loader-fix-required`, `replacement-policy-user-decision-required`, `comparison-policy-not-ready`, `bt93p-start-blocked`, `measurement-invalid` |

Legacy-Mapping:

- `safety-action-contract-diagnostic-only` und `safety-diagnostic-only` sind
  historische Eingangswerte. Fuer neue R-X-Gates muss daraus entweder
  `safety-diagnostic-nonblocking` oder `safety-sidecar-mask-required` werden.
- `comparison-policy-blocks-positive-reentry` und `dqn-anchor-blocked` sind
  historische Eingangswerte. Fuer `BT93X.99` sind nur
  `bt93p-starttruth-green`, `dqn-loader-fix-required`,
  `replacement-policy-user-decision-required`, `comparison-policy-not-ready`,
  `bt93p-start-blocked` oder `measurement-invalid` erlaubt.
- `objective-quality-green`, `no-extension-required` oder
  `action-vocabulary-extended` aus altem BT93O-Text sind ohne neues
  `bt93o-quality-green` kein BT93X-/BT93P-Startsignal.

### Report-Schema-Mindestvertrag

Jeder neue JSON-Report in R-X muss mindestens diese Felder schreiben:

- `schemaVersion`, `blockId`, `phaseId`, `resultClass`, `ok`, `generatedAt`,
  `generatedBy`, `git.sha`, `branch`.
- `matrixId`, `semanticWindow`, `actionSurfaceId`, `rewardProfileId`,
  `telemetryContractId` oder explizit `notApplicableReason`.
- `sourceArtifacts[]` mit `path`, `sha256`, `blockId`, `phaseId`,
  `resultClass`, `fresh`, `tracked`.
- `thresholdsLockedBeforeRun=true` fuer jede Messung mit Schwellen.
- `sampleCounts` mit Seeds, Episoden, Steps und Missing-Raten; Aggregat-only ist
  ungueltig.
- `allowNext[]`, `blocksNext[]`, `qualityClaimAllowed=false/true`,
  `bt93oClaimAllowed`, `bt93pClaimAllowed`, `bt94aClaimAllowed`.
- `candidateRun=false`, `freezeCandidate=false`, `holdoutUsed=false`,
  `promotionAllowed=false`, `rolloutAllowed=false`, solange nicht ausdruecklich
  in spaeteren Bloecken erlaubt.
- `runtimeSurfacesTouched[]`; produktive Runtime-Touches in R-X erzeugen
  `runtime-safety-drift-blocked` oder `measurement-invalid`.

### Fixpflicht, Kill-Kriterien und Fehlerberichte

- Jeder Block muss mindestens eine echte Fixentscheidung enthalten. Reine
  Report-Erzeugung ohne Folgekonsequenz endet `measurement-invalid` oder
  `*-required`, nicht gruen.
- Jeder Fix pinnt vor Code-Aenderung: Fixklasse, erwartete Metrikrichtung,
  Revert-Kriterium, betroffene Dateien, verbotene Dateien und naechste erlaubte
  Aktion.
- Wenn derselbe rote Result zweimal hintereinander aus derselben Ursache
  entsteht, wird `docs/Fehlerberichte/` aktualisiert, bevor ein weiterer
  Reparaturblock geplant wird.
- Jeder Block hat ein Iterationslimit: ein Hauptfix plus ein enger Recheck. Mehr
  braucht neuen User-Intake oder Fehlerbericht.
- Jede Aenderung an Action-Surface, Reward-Profil, Observation-/Telemetry-
  Vertrag, Terminal-Semantik oder Matrix erzeugt neue IDs und invalidiert alte
  Vergleichsartefakte, bis sie explizit neu bewertet sind.
- Closure pro `*.99`: `npm.cmd run plan:check`, `npm.cmd run docs:sync`,
  `npm.cmd run docs:check`, `npm.cmd run build`. Tests bleiben user-owned,
  ausser sie sind als Abschluss-Gate oder Focused-Smoke im Block explizit
  genannt.

### R2-Befundabdeckung

| R2 | Befund | Eingebaut als |
| --- | --- | --- |
| R2.01 | Schlusssatz war zu optimistisch | Kurzurteil und Bericht sagen nur noch Reparatur-/Stop-Gates, keine geloesten Blocker |
| R2.02 | Zu viel Diagnose, zu wenig Reparatur | Fixpflicht, echte Fixentscheidung, Revert-Kriterium und Iterationslimit pro Block |
| R2.03 | `non-blocking` war nicht maschinenlesbar | Result-Class- und Dependency-Vertrag mit Allowlists |
| R2.04 | Resultklassen waren uneinheitlich | Legacy-Mapping fuer Safety, Comparator und BT93O-Ergebnisse |
| R2.05 | BT93X-Resultklassen widersprachen sich | `BT93X.99` nutzt nur `bt93p-starttruth-green`; Comparator-ready ist Subfeld |
| R2.06 | Plan/Graph koennen stale sein | PF.0 Graph-Open-Deps und `plan-graph-drift` |
| R2.07 | `guard:main` blockiert auf falschem Branch | PF.0 Branch-Guard mit `branch-guard-blocked` |
| R2.08 | BT94A-No-Start kann stale bleiben | PF.0 und BT93X erzwingen frischen No-Start-Refresh |
| R2.09 | DQN/Ersatzvergleich kam zu spaet | `93X.0 Early Comparator Preflight` vor/parallel zu R-W |
| R2.10 | Ersatzpolitik konnte weich umgehen | `replacement-policy-user-decision-required` und `replacementPolicyOwner=user` |
| R2.11 | BT93R konnte fehlendes Modell nur reporten | frischer Mini-Repro mit Modell/Config/VecNormalize/Logits als Pflicht |
| R2.12 | BT93R-1k-Limit war zu starr | gestuftes Diagnosebudget; >1k nur User-/Gate-Entscheid |
| R2.13 | `eval-mode-fix` war Schlupfloch | nur konkreter Eval-Bug plus Counterprobe, sonst deterministic Gate bindend |
| R2.14 | Collapse-Taxonomie war unvollstaendig | R.3 erweitert um Entropy, Reward-Scale, Bootstrap, Action-Repeat, Seed, Truncation |
| R2.15 | S vor T war logisch wacklig | Telemetry-Ausgang erzwingt BT93T und danach S-Recheck vor U |
| R2.16 | Action-Liste konnte driften | Action-Vocabulary aus Code mit `actionSurfaceId`/Decoder-Hash |
| R2.17 | Neue Actions invalidieren Vergleichbarkeit | Surface-Aenderung invalidiert Matrix/Baseline/Comparator |
| R2.18 | Safety 0/0/0 ohne Nenner wertlos | Nenner, Eventcount und Missing-Rate Pflicht |
| R2.19 | Telemetry durfte Observation-Breite gefaehrden | Observation-Length-/VecNormalize-/Schema-Smokes in BT93T |
| R2.20 | Reward-Schwellen waren zu vage | Median/IQR/Effektgroesse/Mindestabstand vor Fix pinnen |
| R2.21 | Reward-Fix ohne Re-Learning-Beweis | `93U.5 Reward-Sensitivity-Probe` |
| R2.22 | Safety konnte nur Entscheid bleiben | `safety-sidecar-mask-required` oeffnet separaten Sidecar-Fixblock, nicht W |
| R2.23 | Terminal-Sanity kam zu spaet | PF.0 Minimal-Terminal-Raw-Sanity und V.2.5 Konsum aus R/S/T/U |
| R2.24 | W-Schwellen waren unpraezise | Default `deathBefore60TrainMax=0`, `deathBefore60EvalMax=0` |
| R2.25 | W konnte als Qualitaet missverstanden werden | `qualityClaimAllowed=false`; W oeffnet nur BT93O-Pruefung |
| R2.26 | BT93O-Update war zu duenn | konkrete Depends-On-Ersetzung und `bt93o-quality-green` |
| R2.27 | BT93P/BT94A-Feldmapping fehlte | Starttruth- und Gate-Checker-Source-Mapping |
| R2.28 | Report-Schemas fehlten | Report-Schema-Mindestvertrag |
| R2.29 | Closure-Checks fehlten je Block | `*.99` Closure-Commands im R2-Vertrag |
| R2.30 | Fehlerbericht-Regel fehlte | `docs/Fehlerberichte/` bei wiederholtem roten Result |
| R2.31 | Scope-Ownership war zu weich | Fixmanifest mit betroffenen und verbotenen Dateien; Runtime-Touch blockiert |
| R2.32 | Rollback fehlte ausserhalb U | Revert-Kriterium fuer jeden Fix im R2-Vertrag |
| R2.33 | Artifact-Lineage war zu schwach | `sourceArtifacts[]`, IDs und Freshness im Report-Schema |
| R2.34 | Roadmap blieb stale | PF.0 Roadmap-Sync und Aufnahme-Edit fuer `Aktiver PPO-Fokus` |
| R2.35 | Plan konnte endlos weiterdrehen | Iterationslimit: ein Hauptfix plus enger Recheck |
| R2.36 | Terminologie/Tippfehler senkten Vertrauen | feste Enums, Legacy-Mapping und Terminologie-Pass |

## Vorgeschlagene Blockkette

| id | Titel | Status | Prio | Depends-On | Current Phase | Zweck |
| --- | --- | --- | --- | --- | --- | --- |
| PF.0 | R-X Plan-, Branch-, Graph- und No-Start-Preflight | planned | P0 | BT93Q.99 `policy-collapse-active` | PF.0 | stale Gates, Branch-Guard, Graph-Drift und BT94A-No-Start vor Claim klaeren |
| BT93R | Policy-Artefakt und deterministic-collapse Repair | planned | P1 | PF.0 `preflight-green` oder User-Ausnahme | 93R.1 | Collapse und Modell-/Logit-Evidence |
| BT93S | Wall-/Trail Action-Effekt und Action-Selection Repair | planned | P1 | BT93R.99 in R-Allowlist | 93S.1 | Action-Effekt, `escape-right-open`, Selection |
| BT93T | Training-only Raw-/Trail-/Escape-Lane Telemetry Repair | planned | P1 | BT93S.99=`observation-telemetry-required` oder eigener Telemetry-Start | 93T.1 | Rohgeometrie und Szenariomatrix |
| BT93U | Danger-aware Reward- und Objective-Ordering Repair | planned | P1 | BT93T.99=`telemetry-green` + S-Recheck `action-selection-green` | 93U.1 | Reward-/Matrix-/Baseline-Ordering |
| BT93V | Safety-Diagnostic, Terminal-Sanity und Sidecar-Mask Decision | planned | P1 | BT93U.99=`reward-ordering-green` | 93V.1 | Safety/Terminal nicht verwechseln |
| BT93W | Integrierter WallTrail 10k Recheck und BT93O-Startgate | planned | P1 | BT93V.99=`safety-diagnostic-nonblocking` + `terminal-nonblocking` | 93W.1 | DeathBefore60, Collapse, Action, Reward zusammen pruefen |
| BT93O | Action-/Objective-Quality und Anti-Plateau | planned | P2 | BT93W.99 `bt93o-precondition-green` | 93O.1 | breitere Qualitaet, nicht Root-Cause |
| BT93X | Same-Matrix-DQN oder Ersatzvergleich + BT93P Starttruth | planned | P1 | BT93O.99 `bt93o-quality-green` plus frueher Read-only Comparator-Preflight | 93X.0/93X.1 | positiver Reentry-Vergleich vor BT93P |
| BT93P | PPO Trainingsleiter und BT94A-Reentry-Gate | planned | P2 | BT93X.99=`bt93p-starttruth-green` + BT93O.99=`bt93o-quality-green` | 93P.1 | 200k/500k/1M nur nach gruener Basis |

## Gemeinsame Stop-Regeln

- Kein `BT93R.1`, solange PF.0 nicht `preflight-green` schreibt oder eine
  User-Ausnahme fuer Branch/Guard explizit im Preflight-Report steht.
- Kein BT93O ohne `BT93W.99=bt93o-precondition-green`.
- Kein BT93P ohne `BT93O.99=bt93o-quality-green` und
  `BT93X.99=bt93p-starttruth-green`.
- Kein BT94A ohne `BT93P.4=BT94A-ready` und frisches
  `bt94a_gate_check.py` mit `claimable=true`.
- Kein Candidate, Freeze, Holdout, Promote, Rollout, PPO-Validate oder BT95 in
  BT93R bis BT93X.
- Kein 50k/100k/200k/500k/1M in BT93R bis BT93W.
- Keine produktive Runtime-, Matchstart-, AI-Hub-, Strategy-, Registry-,
  Rollback- oder JS-Inference-Aenderung.
- Keine Runtime-Safety-Umschaltung.
- Kein `latest_*`, `tmp/**`, Throughput, CUDA oder Plan-Gruen als
  Survival-/Qualitaetsbeweis.
- Kein DQN-Phantomanker; historische DQN-Reports sind nicht same-matrix.
- Keine Ersatzvergleichspolitik ohne expliziten User-Entscheid oder
  maschinenlesbaren Planentscheid mit `replacementPolicyOwner=user`.
- Keine neue Action-Surface, Reward- oder Telemetry-ID ohne Comparator- und
  Baseline-Invalidierung.
- Kein Block darf bei fehlenden Nennern, Missing-Raten oder Aggregat-only
  Reports gruen enden.

---

## Block BT93R: Policy-Artefakt und deterministic-collapse Repair

### Ziel

BT93R beseitigt oder falsifiziert den primaeren Startblocker:
deterministic eval kollabiert auf `yaw-right`. Der Block klaert zuerst, ob die
Evidence ueberhaupt urteilsfaehig ist. Ohne echtes Modell-/Config-/Normalize-,
Logit- oder deterministisches Eval-Artefakt gibt es kein Qualitaetsurteil.

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93r/**` | write | Policy-Artefakte, Reports, Handover |
| `python/scripts/bt93r_*.py` | write | Handover-Lock, Model-Manifest, Collapse-Diagnose, Closure |
| `python/configs/ppo_bt93r*.json` | write | kleine Diagnose-Configs |
| `python/train.py`, `python/eval.py` | eng write | nur Artefakt-/Logit-/Eval-Persistenz, kein Lernziel-Refactor |
| `python/envs/ppo_action_surface.py` | read/eng write | nur Decoder-/Action-Mapping-Pruefung |
| produktive Runtime | read-only | Layer-Grenze |

### DoD

- [ ] DoD.R0 `bt93r_preflight_gate_sync_report.json` ist gruen oder blockiert
  vor `93R.1` mit konkreter Branch-/Graph-/BT94A-No-Start-/Roadmap-Ursache.
- [ ] DoD.R1 `bt93r_handover_lock_report.json` uebernimmt BT93Q-Result,
  Matrix-ID, Semantic-Window, aktive Blocker und verbotene Signale.
- [ ] DoD.R2 `policy_artifact_manifest.json` schreibt ModelHash, ConfigHash,
  VecNormalizeHash, OptimizerHash oder klassifiziert fehlende Artefakte als
  `policy-evidence-invalid`.
- [ ] DoD.R3 `policy_collapse_root_cause_report.json` trennt deterministic
  eval, stochastic eval, train sampling, decoder/argmax, entropy/logits,
  action mapping und reward pressure.
- [ ] DoD.R4 `policy_collapse_fix_manifest.json` waehlt genau eine Fixklasse.
- [ ] DoD.R5 `policy_collapse_counterprobe_report.json` zeigt non-collapsed
  deterministic eval oder endet `policy-collapse-active`.
- [ ] DoD.R6 Kein Action-, Telemetry-, Reward- oder Safety-Fix in BT93R.
- [ ] DoD.R7 Diagnose-Budget ist gestuft: 0 Timesteps fuer reine Load-/Logit-
  Checks; maximal 1k nur fuer frische Artefakt-/Normalize-/Eval-Repro; mehr als
  1k braucht neuen User-Entscheid und darf kein Qualitaetsclaim sein.

### PF.0 Plan-/Gate-Sync-Preflight

- [ ] PF.0.1 `guard:main`, Plan-/Docs-Gates, Graph-Open-Deps und frisches
  BT94A-No-Start-Gate werden nach R2-Vertrag geprueft.
- [ ] PF.0.2 Wenn `guard:main` wegen Branch blockiert, wird das als
  `branch-guard-blocked` dokumentiert; keine stille Aufnahme auf falschem
  Branch.
- [ ] PF.0.3 Wenn Knowledge-Graph oder Bot-Plan einen geschlossenen Block als
  offen fuehrt, endet der Preflight `plan-graph-drift`.
- [ ] PF.0.4 Wenn `no_start_gate.json` nicht die neueste Handover-Quelle
  referenziert, endet der Preflight `bt94a-no-start-stale` oder startet nur den
  Gate-Refresh, nicht BT93R.

Evidence:

- `data/training/ppo/bt93r/bt93r_preflight_gate_sync_report.json`

### 93R.1 Handover- und Hypothesen-Lock

- [ ] 93R.1.1 `bt93r_handover_lock.py` liest BT93L/M/N/Q/BT94A-Artefakte und
  schreibt eine unveraenderliche Befundliste.
- [ ] 93R.1.2 B.01 bis B.09 und H1 bis H7 werden mit Quelle, Feld, Wert,
  Blockwirkung, erlaubter Fixklasse und verbotener Folgeaktion uebernommen.
- [ ] 93R.1.3 `bt93r_hypothesis_lock.json` legt fest: zuerst H1, keine
  Vermischung mit Action/Reward/Telemetry.
- [ ] 93R.1.4 Wenn eine Quelle fehlt oder nicht versioniert ist, endet die
  Phase `measurement-invalid`.

Evidence:

- `data/training/ppo/bt93r/bt93r_handover_lock_report.json`
- `data/training/ppo/bt93r/bt93r_hypothesis_lock.json`

### 93R.2 Model-/Logit-/Normalize-Artefaktfaehigkeit

- [ ] 93R.2.1 Report findet das konkrete Modellpaket aus BT93N/Q oder belegt,
  dass kein verwertbares Modellpaket persistiert wurde.
- [ ] 93R.2.2 Wenn kein Modellpaket existiert: enger Artefakt-Fix nur fuer
  zukuenftige Runs; keine nachtraegliche Rekonstruktion als Evidence. Danach ist
  ein frischer Mini-Repro-Run mit Modell-, Config-, VecNormalize-, Optimizer-
  und Logit-Persistenz Pflicht, bevor S starten darf.
- [ ] 93R.2.3 Wenn Modellpaket existiert: Load-Smoke mit Hashes, Action-Surface
  ID, Observation-Length, Normalize-State und Config.
- [ ] 93R.2.4 Echte Logits/Action-Probs fuer gepinnte Observation-Samples
  schreiben; Count-Proxies bleiben nur Diagnose.
- [ ] 93R.2.5 Decoder-/Argmax-Mapping pruefen: Token `2` muss eindeutig
  `yaw-right` sein, keine Off-by-one- oder MultiDiscrete-Verwechslung.

Evidence:

- `data/training/ppo/bt93r/policy_artifact_manifest.json`
- `data/training/ppo/bt93r/model_load_smoke.json`
- `data/training/ppo/bt93r/logit_snapshot_report.json`

### 93R.3 Collapse-Root-Cause

- [ ] 93R.3.1 Deterministic eval, stochastic eval und train sampling auf
  identischen Seeds und identischer Matrix ausfuehren.
- [ ] 93R.3.2 Entropy, KL, value loss, advantage distribution, action probs,
  argmax margin und repeated-action streaks reporten.
- [ ] 93R.3.3 Root cause genau klassifizieren:
  `eval-argmax-collapse`, `model-artifact-missing`, `decoder-bug`,
  `normalize-mismatch`, `reward-pressure-collapse`,
  `action-selection-blindness`, `entropy-config-collapse`,
  `reward-scale-collapse`, `rollout-bootstrap-drift`,
  `action-repeat-or-seed-correlation`, `truncation-terminal-bias`,
  `measurement-invalid`.
- [ ] 93R.3.4 Wenn deterministic collapse nur ein Eval-Mode-Artefakt ist,
  muss ein konkreter Eval-Bug mit Codepfad, Counterprobe und User-/Plan-
  Freigabe belegt werden; sonst bleibt deterministic eval bindend.
- [ ] 93R.3.5 Wenn Normalize-/Config-Drift vorliegt, wird zuerst diese Drift
  repariert; kein Action-/Reward-Fix.

Evidence:

- `data/training/ppo/bt93r/policy_collapse_root_cause_report.json`

### 93R.4 Enger Collapse-Fix

- [ ] 93R.4.1 Fixklasse vor Code-Aenderung pinnen:
  `artifact-persist`, `decoder-fix`, `normalize-fix`,
  `eval-mode-fix`, `entropy-config-diagnostic` oder
  `policy-selection-diagnostic`.
- [ ] 93R.4.2 `artifact-persist`: zukuenftige Runs schreiben immer ModelHash,
  ConfigHash, VecNormalizeHash, OptimizerHash und Logit-Snapshot.
- [ ] 93R.4.3 `decoder-fix`: Token-/Semantic-Action-Mapping mit
  Python-Test absichern.
- [ ] 93R.4.4 `normalize-fix`: Eval nutzt exakt den trainierten Normalize-State;
  Drift erzeugt `policy-evidence-invalid`.
- [ ] 93R.4.5 `eval-mode-fix`: nur wenn deterministic argmax nachweislich
  wegen eines Eval-Bugs falsch ist; methodisches Unbehagen reicht nicht. Der
  alte deterministic Gate bleibt bindend, bis der Bug mit frischer
  Counterprobe falsifiziert ist.
- [ ] 93R.4.6 `entropy-config-diagnostic`: maximal 1k Diagnose, kein
  Qualitaetsclaim.

Evidence:

- `data/training/ppo/bt93r/policy_collapse_fix_manifest.json`
- `data/training/ppo/bt93r/policy_collapse_fix_report.json`

### 93R.5 Counterprobe und Abschluss

- [ ] 93R.5.1 Counterprobe nutzt dieselbe Matrix und mindestens die Eval-Seeds
  944, 945, 946 plus eine kleine zusaetzliche Seed-Kontrolle.
- [ ] 93R.5.2 Gruen braucht keine 100%-Single-Action-Dominanz, keine 2700er
  repeated-action streaks, nonzero second-best probability und Runtime Errors 0.
- [ ] 93R.5.3 DeathBefore60 wird gemessen, aber in BT93R noch nicht als
  gesamter Reparaturerfolg geclaimt.
- [ ] 93R.5.4 Wenn Collapse bleibt, endet BT93R `policy-collapse-active`.
- [ ] 93R.5.5 Wenn Evidence nicht urteilsfaehig ist, endet BT93R
  `policy-evidence-invalid`.
- [ ] 93R.5.6 Gruen braucht eine R-Allowlist-Resultklasse aus dem
  Dependency-Vertrag; `model-artifact-missing` oder `artifact-persisted-only`
  oeffnet BT93S nicht.

Evidence:

- `data/training/ppo/bt93r/policy_collapse_counterprobe_report.json`
- `data/training/ppo/bt93r/bt93r_closure_gate_report.json`
- `data/training/ppo/bt93r/bt93r_handover_package.json`

### BT93R Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| kein Modellpaket | Artefakt-Persistenz reparieren, danach frischen Mini-Repro mit Modell/Normalize/Logits | nur BT93R-Recheck, kein BT93S |
| echte Logits fehlen | Logit-Snapshot in Eval-Pfad einbauen | nur BT93R-Folge |
| Decoder-Bug | Mapping-Fix + Python-Test | BT93S nach gruenem Counterprobe |
| Normalize-Drift | Normalize-State speichern/laden, stale Runs invalidieren | BT93S nur nach frischer Evidence |
| Collapse bleibt | eigener Policy-Folgeblock | kein BT93O |

Result Classes:

- `policy-collapse-green`
- `policy-collapse-active`
- `policy-evidence-invalid`
- `normalize-mismatch`
- `model-artifact-missing`
- `decoder-fix-counterprobe-green`
- `normalize-fix-counterprobe-green`
- `eval-mode-bug-fixed-counterprobe-green`
- `measurement-invalid`

---

## Block BT93S: Wall-/Trail Action-Effekt und Action-Selection Repair

### Ziel

BT93S repariert Action-Effekt und Action-Selection nach einem BT93R-Abschluss
aus der R-Allowlist. Der Block trennt drei Fragen: Kann eine Action den Zustand
verbessern? Waehlt die Policy diese Action in der richtigen Situation? Ist die
Surface reich genug?

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93s/**` | write | Action-/Selection-Reports |
| `python/scripts/bt93s_*.py` | write | Szenariofenster, Selection, Closure |
| `python/envs/ppo_action_surface.py` | eng write | nur Sidecar-Action-Surface |
| `python/tests/test_ppo_action_surface.py` | write | Action-Mapping-/Mask-Smokes |
| `python/envs/curvios_env.py` | read/eng write | nur wenn Selection-Info fehlt |
| produktive Runtime | read-only | keine Registry-/Strategy-Aenderung |

### DoD

- [ ] DoD.S1 `action_effect_window_manifest.json` pinnt Szenarien, Seeds,
  Startzustand, Dauer, erwartete Wirkung und Negativkontrollen.
- [ ] DoD.S2 `action_effect_report.json` bewertet bestehende Actions und
  BT93Q-Sidecar-Actions ueber laengere Fenster als 4 Steps.
- [ ] DoD.S3 `action_selection_report.json` misst, ob die nicht-kollabierte
  Policy passende Escape-Actions in Gefahrfenstern waehlt.
- [ ] DoD.S4 `escape_right_open_report.json` schliesst den Zielblocker oder
  klassifiziert ihn exakt.
- [ ] DoD.S5 Neue Actions bleiben training-sidecar und safety-gate-faehig.
- [ ] DoD.S6 Command-Flags, Reward oder single-step Deltas reichen nicht.
- [ ] DoD.S7 Action-Vocabulary wird aus `python/envs/ppo_action_surface.py`
  generiert und mit `actionSurfaceId`/Decoder-Hash belegt; manuelle Listen sind
  nur Kommentar.
- [ ] DoD.S8 Jede Surface-Aenderung invalidiert Matrix-, Baseline- und
  Comparator-Artefakte, bis sie neu auf derselben Surface bewertet sind.

### 93S.1 Szenariofenster und Positive/Negative Controls

- [ ] 93S.1.1 BT93Q-Szenarien uebernehmen:
  `frontal-near-wall`, `side-wall-left`, `side-wall-right`,
  `narrowing-corridor`, `trail-ahead`, `trail-side`,
  `escape-left-open`, `escape-right-open`, `no-danger-control`.
- [ ] 93S.1.2 Fuer jede Klasse mindestens 3 Seeds oder begruendete
  deterministic scenario seeds definieren.
- [ ] 93S.1.3 Effektfenster auf ausreichend Schritte erweitern, mit
  `maxSteps`, Early-Abbruch, Terminal-Abbruch und Warmup.
- [ ] 93S.1.4 Positive Controls muessen erwartete Wirkung zeigen; wenn nicht,
  ist die Matrix selbst rot.
- [ ] 93S.1.5 Negative Controls duerfen nicht faelschlich als Erfolg gelten.

Evidence:

- `data/training/ppo/bt93s/action_effect_window_manifest.json`

### 93S.2 Existing-Action Effekt

- [ ] 93S.2.1 Alle bestehenden Actions aus dem Action-Surface-Code generieren
  und testen; erwartete aktuelle Tokens sind `noop`, `yaw-left`, `yaw-right`,
  `pitch-up`, `pitch-down`, `roll-left`, `roll-right`, `boost`, `shoot-mg`.
- [ ] 93S.2.2 Erfolg braucht reale Zustandswirkung:
  WallDistance/TrailDistance/EscapeLane besser, CollisionRisk/TerminalRisk
  niedriger oder Objective/Target ohne Risikoanstieg besser.
- [ ] 93S.2.3 `boost` braucht Geschwindigkeit, Distanzgewinn oder Escape-Fenster.
- [ ] 93S.2.4 `shoot-mg` braucht Zielausrichtung, Treffer-/Damage-Proxy oder
  Gegnerdruck-Wirkung; sonst bleibt es keine Escape-Action.
- [ ] 93S.2.5 `escape-right-open` ist ein hartes Pflichtszenario.

Evidence:

- `data/training/ppo/bt93s/existing_action_effect_report.json`

### 93S.3 Sidecar-Action Entscheidung

- [ ] 93S.3.1 Neue Actions nur, wenn 93S.2 eine echte Luecke belegt.
- [ ] 93S.3.2 Kandidaten getrennt testen:
  `turn-left-boost`, `turn-right-boost`, `evade-left`, `evade-right`,
  `brake`, `danger-turn-away`, `aim-fire`, `hold-course-safe`.
- [ ] 93S.3.3 Jede neue Action braucht Safety-/Sanitizer-/Clamp-Raten 0/0/0.
  Diese Raten brauchen Nenner, Eventcount und Missing-Rate; fehlende Nenner
  machen den Report ungueltig.
- [ ] 93S.3.4 Neue Actions muessen Action-Mapping, Mask, Decode und Report
  unverwechselbar dokumentieren.
- [ ] 93S.3.5 Wenn Sidecar-Actions nur in anderen Szenarien helfen, nicht in
  `escape-right-open`, bleibt `action-space-required`.
- [ ] 93S.3.6 Neue Actions schreiben neue `actionSurfaceId` und erzwingen
  Comparator-/Baseline-Invalidierung fuer BT93X/BT93P.

Evidence:

- `data/training/ppo/bt93s/action_surface_decision.json`
- `data/training/ppo/bt93s/sidecar_action_effect_report.json`

### 93S.4 Policy-Selection

- [ ] 93S.4.1 Nicht-kollabierte Policy aus BT93R in denselben Szenarien
  auswerten.
- [ ] 93S.4.2 Report trennt available actions, selected action, top-2,
  action probability, mask status und post-decode action.
- [ ] 93S.4.3 Eine wirksame Action gilt nicht als geloest, wenn die Policy sie
  in Gefahrfenstern nicht waehlt.
- [ ] 93S.4.4 Wenn Selection falsch ist, aber Action wirkt, endet der Block
  `action-selection-required`.
- [ ] 93S.4.5 Wenn Selection nicht bewertbar ist, weil Geometrie fehlt, endet
  `observation-telemetry-required`.
- [ ] 93S.4.6 Nach einem `observation-telemetry-required` darf BT93U nicht
  starten. Zuerst BT93T, danach ein frischer 93S-Recheck auf derselben
  Telemetry-ID.

Evidence:

- `data/training/ppo/bt93s/action_selection_report.json`

### 93S.5 Abschluss

- [ ] 93S.5.1 `escape-right-open` ist gruen oder exakt blockiert.
- [ ] 93S.5.2 Trail-Szenarien mit Telemetrie-Limit werden nicht gruen
  geclaimt.
- [ ] 93S.5.3 Kein Reward-Fix in BT93S.
- [ ] 93S.5.4 Kein PPO-Qualitaetslauf in BT93S.

Evidence:

- `data/training/ppo/bt93s/escape_right_open_report.json`
- `data/training/ppo/bt93s/bt93s_closure_gate_report.json`
- `data/training/ppo/bt93s/bt93s_handover_package.json`

### BT93S Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| `escape-right-open` weiter rot | Sidecar-Action enger reparieren oder Telemetry-Pflicht nach BT93T | kein BT93U |
| Actions wirken, Policy waehlt sie nicht | Selection-/loss-/mask-diagnostic Folgeblock | kein BT93O |
| Wirkung unklar wegen fehlender Rohgeometrie | BT93T starten, danach 93S-Recheck erzwingen | kein gruenes Action-Gate |
| Positive Controls scheitern | Matrix-Redesign statt Action-Fix | kein BT93T-Gruen |

Result Classes:

- `action-selection-green`
- `action-selection-required`
- `action-space-required`
- `matrix-redesign-required`
- `observation-telemetry-required`
- `measurement-invalid`

---

## Block BT93T: Training-only Raw-/Trail-/Escape-Lane Telemetry Repair

### Ziel

BT93T beseitigt die Messluecke aus BT93Q/S. Rohgeometrie wird nur in
Training-/Reportpfaden sichtbar. Produktive Runtime-APIs bleiben unveraendert.

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93t/**` | write | Telemetry-Contracts und Reports |
| `python/scripts/bt93t_*.py` | write | Telemetry-Audit, Scenario-Recheck, Closure |
| `python/envs/curvios_env.py` | eng write | training-only Info-Felder |
| `scripts/training-headless-lane-runner.mjs` | eng write | Raw-/Trail-/Escape-Lane Reportfelder |
| `tests/training-environment.contract.test.mjs` | write | focused training contract smoke |
| `python/tests/test_curvios_env.py` | write | info/telemetry smoke |
| produktive Runtime-/Observation-Schema | read-only | keine API-Aufweitung |

### DoD

- [ ] DoD.T1 `training_telemetry_contract.json` definiert jedes neue Feld mit
  Quelle, Einheit, Nullbarkeit, Consumer und Layer.
- [ ] DoD.T2 `telemetry_layer_guard_report.json` belegt: keine produktive
  Runtime-Surface, keine Registry, kein JS-Inference-Pfad.
- [ ] DoD.T3 `telemetry_completeness_report.json` zeigt Feldabdeckung pro
  Szenario.
- [ ] DoD.T4 Trail-Szenarien nutzen echte `trailDistance` oder enden rot.
- [ ] DoD.T5 Escape-Lane unterscheidet left/right/forward.
- [ ] DoD.T6 Action-/Reward-Reports koennen die neuen Felder konsumieren.
- [ ] DoD.T7 Observation-Breite, VecNormalize-Kompatibilitaet und produktive
  Observation-Schema-Version bleiben unveraendert oder der Block endet
  `telemetry-layer-drift`.

### 93T.1 Telemetry Contract

- [ ] 93T.1.1 Felder pinnen:
  `rawPose.x/y/z`, `heading.yaw`, `velocity.x/y/z`, `speed`,
  `trailDistance.front/left/right/min`, `trailHeadingDelta`,
  `escapeLane.leftOpen/rightOpen/forwardOpen`, `escapeLane.bestDirection`.
- [ ] 93T.1.2 Fuer jedes Feld Quelle festlegen:
  authoritative runtime-near state, derived training diagnostic oder
  unavailable.
- [ ] 93T.1.3 Wertebereiche, Einheiten und Missing-Value-Regeln definieren.
- [ ] 93T.1.4 Contract-Version und Matrix-ID schreiben.

Evidence:

- `data/training/ppo/bt93t/training_telemetry_contract.json`

### 93T.2 Instrumentation

- [ ] 93T.2.1 `training-headless-lane-runner.mjs` nur fuer Report-/Info-Felder
  erweitern.
- [ ] 93T.2.2 `curvios_env.py` gibt Felder im `info`/Report aus, nicht in
  produktiver Observation-Breite.
- [ ] 93T.2.3 Wenn ein Feld nicht authoritative verfuegbar ist, als
  `derived` oder `unavailable` markieren, nicht still nullen.
- [ ] 93T.2.4 Focused Smokes pruefen Feldpraesenz, Typen und Layer-Grenzen.
- [ ] 93T.2.5 Keine Aenderung an `ObservationSchemaV2` ohne separaten
  Governance-Block.
- [ ] 93T.2.6 Focused Smokes pruefen Observation-Length, VecNormalize-Load und
  dass neue Felder nur in `info`/Reports landen.

Evidence:

- `data/training/ppo/bt93t/telemetry_instrumentation_report.json`
- `data/training/ppo/bt93t/telemetry_layer_guard_report.json`

### 93T.3 Scenario-Recheck

- [ ] 93T.3.1 BT93S-Szenarien mit neuer Telemetrie erneut auswerten.
- [ ] 93T.3.2 Trail-Ahead und Trail-Side duerfen nicht mehr
  `telemetryLimit=trailDistance missing` tragen.
- [ ] 93T.3.3 Escape-Lane-Wahl muss mit Action-Richtung abgeglichen werden.
- [ ] 93T.3.4 `escape-right-open` wird mit Raw-/Escape-Lane-Feldern erneut
  klassifiziert.
- [ ] 93T.3.5 Wenn neue Telemetrie alte Action-Erfolge falsifiziert, wird BT93S
  erneut blockiert.
- [ ] 93T.3.6 BT93T oeffnet BT93U nur nach frischem 93S-Recheck, wenn S zuvor
  wegen Telemetrie nicht urteilsfaehig war.

Evidence:

- `data/training/ppo/bt93t/telemetry_completeness_report.json`
- `data/training/ppo/bt93t/telemetry_scenario_recheck_report.json`

### 93T.99 Abschluss

- [ ] 93T.99.1 Alle Pflichtfelder sind verfuegbar, begruendet derived oder
  ehrlich unavailable.
- [ ] 93T.99.2 Kein produktiver Runtime-Surface wurde erweitert.
- [ ] 93T.99.3 Wenn Telemetrie unvollstaendig bleibt, endet der Block
  `observation-telemetry-required`.

Evidence:

- `data/training/ppo/bt93t/bt93t_closure_gate_report.json`
- `data/training/ppo/bt93t/bt93t_handover_package.json`

### BT93T Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| Feld nicht authoritative verfuegbar | derived diagnostic mit klarer Limitierung | nur falls ausreichend fuer Szenario |
| TrailDistance nicht verfuegbar | Scenario-Matrix fuer Trail invalidieren und Messpfad reparieren | kein BT93U |
| Layer-Guard rot | Instrumentation zurueckschneiden auf report-only | kein Runtime-Bypass |
| neue Telemetrie falsifiziert Actions | zurueck zu BT93S mit neuer Matrix | kein Reward-Fix |

Result Classes:

- `telemetry-green`
- `observation-telemetry-required`
- `telemetry-layer-drift`
- `scenario-matrix-invalid`
- `measurement-invalid`

---

## Block BT93U: Danger-aware Reward- und Objective-Ordering Repair

### Ziel

BT93U repariert Reward-/Objective-Ordering erst nach Policy-, Action- und
Telemetry-Gates. Ziel ist nicht hoher Reward, sondern richtige Ordnung:
Noop bleibt non-success, Random/Semantic-Cycle darf Scripted/Policy nicht
schlagen, und Progress in lethalem Druck wird nicht positiv belohnt.

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93u/**` | write | Reward-/Ordering-Reports |
| `python/scripts/bt93u_*.py` | write | Reward Matrix, Baseline Ordering, Closure |
| `src/state/training/RewardCalculator.js` | eng write | danger-aware Reward-Fix |
| `tests/training-reward-survival.test.mjs` | write | focused reward smoke |
| `scripts/training-headless-lane-runner.mjs` | eng write | RewardBreakdown/Scenario output |
| produktive Runtime | read-only | keine Runtime-Policy-Aenderung |

### DoD

- [ ] DoD.U1 `reward_ordering_baseline_report.json` reproduziert BT93L/Q
  Ordering-Befunde auf neuer Telemetrie-Matrix.
- [ ] DoD.U2 `reward_repair_manifest.json` pinnt genau eine Reward-Fixklasse.
- [ ] DoD.U3 `reward_ordering_repair_report.json` zeigt
  `positiveRiskyRewardActionRowCount=0` oder endet rot.
- [ ] DoD.U4 Noop, Random, Semantic-Cycle, Scripted, repaired-policy werden
  auf derselben Matrix verglichen.
- [ ] DoD.U5 Scripted Positive Control muss stark genug sein; wenn nicht,
  `matrix-redesign-required`.
- [ ] DoD.U6 Reward-Fix darf MaxStep-only, Noop oder stagnierende Survival
  nicht als Erfolg belohnen.
- [ ] DoD.U7 Reward-Gruen braucht vorab gepinnte Schwellen fuer Median,
  IQR/Unsicherheit, Effektgroesse und Mindestabstand zwischen
  Noop/Random/Semantic-Cycle/Scripted/repaired-policy.
- [ ] DoD.U8 Nach Reward-Fix gibt es eine kleine Policy-Sensitivity-Probe mit
  Artefaktpflicht; sie ist Diagnose, kein BT93O-/BT93P-Qualitaetsclaim.

### 93U.1 Baseline-Reproduktion

- [ ] 93U.1.1 BT93L Kurzfenster reproduzieren: Noop, Random,
  Semantic-Cycle, Scripted.
- [ ] 93U.1.2 Laengere Szenariofenster aus BT93S/T verwenden.
- [ ] 93U.1.3 Seed-/Szenario-Rohwerte, Median, IQR, Effektgroesse und
  Unsicherheitsklasse schreiben.
- [ ] 93U.1.4 Wenn Random oder Semantic-Cycle Scripted erreicht/uebertrifft,
  ist das rot, nicht "mehr Exploration".
- [ ] 93U.1.5 Wenn Scripted schwach ist, Matrix oder Scripted-Control reparieren.
- [ ] 93U.1.6 "Erreicht/uebertrifft" wird vor dem Fix numerisch definiert:
  Pflicht sind Mindestabstand, Konfidenz-/Unsicherheitsklasse und
  Missing-Rate-Regel.

Evidence:

- `data/training/ppo/bt93u/reward_ordering_baseline_report.json`
- `data/training/ppo/bt93u/simple_baseline_ordering_report.json`

### 93U.2 Reward-Fix Manifest

- [ ] 93U.2.1 Fixklasse waehlen:
  `danger-progress-gate`, `checkpoint-pressure-cap`,
  `survival-pressure-rebalance`, `trail-risk-activation`,
  `objective-success-contract`, `matrix-redesign`.
- [ ] 93U.2.2 Erwartete Metrikrichtung vor Code-Aenderung pinnen.
- [ ] 93U.2.3 Revert-Kriterien definieren:
  Noop-Erfolg, Random-Paritaet, Semantic-Cycle-Paritaet, MaxStep-Plateau,
  negative Objective-Rate, DeathBefore60-Anstieg.
- [ ] 93U.2.4 Reward-Gewichte nicht pauschal drehen; jede Komponente braucht
  Befundbezug.
- [ ] 93U.2.5 Wenn die neue Telemetrie oder Action-Surface seit BT93L/Q driftet,
  wird die alte Baseline neu bewertet statt direkt verglichen.

Evidence:

- `data/training/ppo/bt93u/reward_repair_manifest.json`

### 93U.3 Danger-aware Reward Repair

- [ ] 93U.3.1 Progress-/Checkpoint-Reward unter hohem Wall-/Trail-Druck
  deckeln oder gated machen.
- [ ] 93U.3.2 `survivalPressureBonus` darf Risiko nicht positiv belohnen, wenn
  EscapeLane geschlossen oder TerminalRisk steigt.
- [ ] 93U.3.3 `trailRisk` muss in Trail-Szenarien aktiv werden oder als
  measurement-invalid blockieren.
- [ ] 93U.3.4 RewardBreakdown muss Ursachen sichtbar halten; keine
  monolithische Gesamtstrafe.
- [ ] 93U.3.5 Focused Smoke prueft positive risky rows, Noop, Random,
  Semantic-Cycle, Scripted.

Evidence:

- `data/training/ppo/bt93u/reward_ordering_repair_report.json`

### 93U.4 Objective-/Progress-Vertrag

- [ ] 93U.4.1 Objective-Success darf nicht nur Reward, Steps oder Checkpoint
  sein.
- [ ] 93U.4.2 Success braucht Zustandsverbesserung und non-worsening Safety:
  Risiko sinkt/stabil, EscapeLane offen/stabil, keine fruehe Death-Klasse.
- [ ] 93U.4.3 MaxStep-only ist Survival-Diagnose, kein Objective-Success.
- [ ] 93U.4.4 `progressSignalReachable` wird mit Raw-/Escape-Lane-Telemetrie
  validiert.

Evidence:

- `data/training/ppo/bt93u/objective_success_contract.json`
- `data/training/ppo/bt93u/objective_quality_repair_report.json`

### 93U.5 Reward-Sensitivity-Probe

- [ ] 93U.5.1 Probe laeuft nur, wenn U.1-U.4 gruen sind und alle Schwellen vorab
  im Contract stehen.
- [ ] 93U.5.2 Maximal 1k Timesteps oder ein reiner fixed-policy/reward replay;
  kein 10k/50k/100k, kein Extension-Claim.
- [ ] 93U.5.3 Report zeigt, ob der Reward-Fix die Policy-/Action-Preference in
  Gefahrfenstern in die erwartete Richtung verschiebt.
- [ ] 93U.5.4 Wenn Reward zwar besser ordnet, aber Policy-Sensitivity rot ist,
  endet U nicht gruen, sondern `objective-contract-required` oder enger
  Folgeblock.

Evidence:

- `data/training/ppo/bt93u/reward_sensitivity_probe_report.json`

### 93U.99 Abschluss

- [ ] 93U.99.1 Reward-Ordering gruen oder konkreter Blocker.
- [ ] 93U.99.2 BT93L Random-/Semantic-Cycle-Paritaet geschlossen oder
  `reward-redesign-required`.
- [ ] 93U.99.3 Keine Action-/Policy-/Telemetry-Luecke durch Reward-Fix
  ueberdeckt.
- [ ] 93U.99.4 Reward-Sensitivity-Probe ist gruen oder der Block bleibt
  Diagnose/Folgeblock statt BT93V-Startsignal.

Evidence:

- `data/training/ppo/bt93u/bt93u_closure_gate_report.json`
- `data/training/ppo/bt93u/bt93u_handover_package.json`

### BT93U Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| Scripted Positive Control schwach | Matrix-/Scripted-Control-Block | kein BT93V |
| Random/Semantic bleibt besser | Reward-Design rot, kein PPO-Run | kein BT93W |
| TrailRisk bleibt 0 | Telemetry/Reward-Source zurueck zu BT93T/U | kein gruen |
| Reward-Fix erzeugt Noop/MaxStep-Erfolg | Fix revertieren, neue Fixklasse | kein BT93O |

Result Classes:

- `reward-ordering-green`
- `reward-redesign-required`
- `matrix-redesign-required`
- `objective-contract-required`
- `measurement-invalid`

---

## Block BT93V: Safety-Diagnostic, Terminal-Sanity und Sidecar-Mask Decision

### Ziel

BT93V macht Safety und Terminal-Semantik urteilsfaehig, ohne produktive
Runtime-Safety umzuschalten. Der Block entscheidet, ob Safety-Diagnostik als
`safety-diagnostic-nonblocking` fuer BT93W reicht oder ein separater
training-only Sidecar-Mask-Blocker noetig wird.

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93v/**` | write | Safety-/Terminal-/Sidecar-Decision Reports |
| `python/scripts/bt93v_*.py` | write | Safety Contract, Terminal Sanity, Closure |
| `python/envs/ppo_action_surface.py` | eng write | nur training-sidecar mask diagnostics |
| `python/envs/curvios_env.py` | read/eng write | safety info fields |
| `src/state/training/EpisodeController.js` | read/eng write | nur bei bewiesener Terminal-Drift |
| produktive Runtime Safety | read-only | keine Umschaltung |

### DoD

- [ ] DoD.V1 `safety_diagnostic_contract_report.json` bestaetigt
  `productiveRuntimeSafetySwitchAllowed=false`.
- [ ] DoD.V2 `terminal_sanity_report.json` prueft `player-dead`,
  `truncated`, `max-steps`, `match-ended` gegen Raw Trace.
- [ ] DoD.V3 `sidecar_mask_decision.json` entscheidet: nicht noetig,
  training-only noetig oder measurement-invalid.
- [ ] DoD.V4 Invalid-/Sanitizer-/PostDecodeClamp-/PreSamplingMask-/Veto-Raten
  werden getrennt ausgewiesen.
- [ ] DoD.V5 Kein Runtime-Surface touched.
- [ ] DoD.V6 Jede Rate hat Nenner, Eventcount, Missing-Rate und Layer
  (`policy-mask`, `pre-sampling-mask`, `post-decode-clamp`, `veto`,
  `sanitizer`).
- [ ] DoD.V7 Wenn eine handlungswirksame training-only Maske noetig ist, endet
  BT93V `safety-sidecar-mask-required` und oeffnet einen separaten
  Sidecar-Mask-Fixblock, nicht BT93W.

### 93V.1 Safety Diagnostic Contract

- [ ] 93V.1.1 BT93Q-Befund uebernehmen: `vetoActiveRows=173`,
  `vetoEventRows=0`, `maxVetoRate=0`.
- [ ] 93V.1.2 Klaeren, welche Felder Diagnose sind und welche Action-Pfad
  beeinflussen duerfen.
- [ ] 93V.1.3 `vetoActive=true` darf nicht als Safety-Fix gelten.
- [ ] 93V.1.4 Runtime-Safety-Schalter explizit verboten dokumentieren.
- [ ] 93V.1.5 Missing- oder Null-Nenner duerfen nicht als 0%-Rate gelten.

Evidence:

- `data/training/ppo/bt93v/safety_diagnostic_contract_report.json`

### 93V.2 Terminal-Sanity

- [ ] 93V.2.1 Raw Trace mit TerminalReason vergleichen.
- [ ] 93V.2.2 Spaete positive-control `player-dead`-Faelle bleiben sichtbar
  und duerfen nicht ignoriert werden.
- [ ] 93V.2.3 Terminal-Fix nur, wenn Raw Trace Terminal-Label widerspricht.
- [ ] 93V.2.4 Wenn kein Widerspruch: Terminal bleibt non-fix, aber DeathBefore60
  weiter fachlich blockierend.
- [ ] 93V.2.5 Minimaler Terminal-Raw-Sanity muss schon aus PF.0/R/S/T/U-Quellen
  konsumiert werden; wenn dort eine Terminal-Kontradiktion sichtbar ist, darf U
  nicht durch Reward-Fix gruen werden.

Evidence:

- `data/training/ppo/bt93v/terminal_sanity_report.json`

### 93V.3 Sidecar-Mask Decision

- [ ] 93V.3.1 Nur wenn Action/Reward/Telemetry gruen sind und DeathBefore60
  weiter durch riskante gewaehlte Actions entsteht, darf eine training-only
  Emergency-Policy oder PreSampling-Mask als Folgeblocker entstehen.
- [ ] 93V.3.2 Keine produktive Runtime-Maske.
- [ ] 93V.3.3 Mask-Kandidat braucht State-Effect-Proof, nicht nur niedrigere
  Deaths.
- [ ] 93V.3.4 Wenn Mask noetig: Ergebnis `safety-sidecar-mask-required`, nicht
  BT93O-gruen.

Evidence:

- `data/training/ppo/bt93v/sidecar_mask_decision.json`

### 93V.99 Abschluss

- [ ] 93V.99.1 Safety ist `safety-diagnostic-nonblocking` oder konkreter
  Sidecar-Blocker.
- [ ] 93V.99.2 Terminal-Fix ist ausgeschlossen oder mit Raw-Kontradiktion
  begruendet.
- [ ] 93V.99.3 Kein Runtime-Safety-Surface touched.

Evidence:

- `data/training/ppo/bt93v/bt93v_closure_gate_report.json`
- `data/training/ppo/bt93v/bt93v_handover_package.json`

### BT93V Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| Terminal-Kontradiktion | enger Terminal-/Runner-Fixblock | kein BT93W |
| Safety muss handlungswirksam werden | separater training-only sidecar mask block mit State-Effect-Proof | kein Runtime-Fix, kein BT93W |
| Safety bleibt Diagnose | Result `safety-diagnostic-nonblocking` fuer BT93W | BT93W |
| Clamp/Mask/Veto vermischt | Telemetrie/Report trennen | kein gruen |

Result Classes:

- `safety-diagnostic-nonblocking`
- `safety-sidecar-mask-required`
- `terminal-semantics-required`
- `runtime-safety-drift-blocked`
- `measurement-invalid`

---

## Block BT93W: Integrierter WallTrail 10k Recheck und BT93O-Startgate

### Ziel

BT93W prueft die reparierte Kette integriert, aber klein: maximal 10k. Er
entscheidet nur, ob BT93O als Qualitaetsblock starten darf. Er erzeugt kein
BT93P/BT94A-Signal.

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93w/**` | write | Recheck-Contract, Reports, Handover |
| `python/scripts/bt93w_*.py` | write | Startgate, Micro-Recheck, Closure |
| `python/configs/ppo_bt93w*.json` | write | max 10k Recheck |
| `python/train.py`, `python/eval.py` | read/eng write | nur Reportfelder falls in R-T eingefuehrt |
| produktive Runtime | read-only | keine Integration |

### DoD

- [ ] DoD.W1 `bt93w_start_gate_report.json` bestaetigt die erlaubten
  Resultklassen aus R/S/T/U/V statt unscharfes "non-blocking".
- [ ] DoD.W2 `bt93w_micro_recheck_contract.json` pinnt Matrix, Seeds,
  Reward-Profil, Action-Surface, Telemetry-Contract und Schwellen vor Start.
- [ ] DoD.W3 Recheck maximal 10k Timesteps.
- [ ] DoD.W4 `bt93w_micro_recheck_report.json` schreibt DeathBefore60,
  PlayerDeadShare, deterministic/stochastic Action-Distribution, repeated
  streaks, Entropy/Logits, RewardBreakdown, Objective, Telemetry, Safety.
- [ ] DoD.W5 Gruen braucht den vorab gepinnten DeathBefore60-Korridor
  (`train=0`/`eval=0` als Default), non-collapsed eval,
  Action/Telemetry/Reward/Safety gruen und Runtime Errors 0.
- [ ] DoD.W6 `bt93oClaimAllowed=true` nur bei
  `resultClass=bt93o-precondition-green`.
- [ ] DoD.W7 BT93W ist Diagnose-/Startgate-Evidence fuer BT93O, kein
  Qualitaets-, BT93P-, BT94A-, Candidate-, Freeze- oder Promote-Signal.

### 93W.1 Integrated Startgate

- [ ] 93W.1.1 R/S/T/U/V Handover lesen und Hashes pruefen.
- [ ] 93W.1.2 Keine stale BT93N/Q-Quelle darf als repariert gelten.
- [ ] 93W.1.3 Wenn eine Quelle rot ist, Recheck nicht starten.
- [ ] 93W.1.4 Holdout bleibt unberuehrt.

Evidence:

- `data/training/ppo/bt93w/bt93w_start_gate_report.json`

### 93W.2 Micro-Recheck Contract

- [ ] 93W.2.1 Seeds, Eval-Seeds, Scenario-Matrix und maxSteps pinnen.
- [ ] 93W.2.2 Mindeststatistik vor Lauf festlegen:
  mindestens 8 Eval-Seeds oder begruendete kleine Diagnosegrenze, mindestens
  60 abgeschlossene Episoden ueber Train/Eval fuer Urteil, sonst Diagnose rot.
- [ ] 93W.2.3 DeathBefore60-Korridor vor Start festlegen. Default ist
  `deathBefore60TrainMax=0` und `deathBefore60EvalMax=0`; jede Abweichung
  braucht vorab begruendete Statistik und wird als Diagnose, nicht Qualitaet,
  markiert.
- [ ] 93W.2.4 Simple-Baseline-Abstand als Pflichtfeld, auch wenn noch kein DQN.
- [ ] 93W.2.5 DQN-/Ersatzvergleich bleibt fuer BT93P/BT94A separat.
- [ ] 93W.2.6 Deterministic single-action share, repeated-action streak,
  Missing-Raten und Unsicherheitsklasse werden vorab gepinnt.

Evidence:

- `data/training/ppo/bt93w/bt93w_micro_recheck_contract.json`

### 93W.3 10k Execution

- [ ] 93W.3.1 Max 10k Timesteps, kein Auto-Extend.
- [ ] 93W.3.2 Finaler Runner-Report Pflicht; Heartbeats/Snapshots reichen
  nicht.
- [ ] 93W.3.3 Runtime Error, Crash, Timeout, forced stop getrennt ausweisen.
- [ ] 93W.3.4 Train/Eval getrennt reporten.
- [ ] 93W.3.5 Wenn start gate rot wird, `actualModelTimesteps=0` und ehrlich
  blockiert.

Evidence:

- `data/training/ppo/bt93w/bt93w_micro_recheck_report.json`

### 93W.4 Closure und BT93O-Handoff

- [ ] 93W.4.1 `bt93w_closure_gate.py` klassifiziert final.
- [ ] 93W.4.2 `bt93oClaimAllowed=true` nur bei:
  policy non-collapsed, DeathBefore60 innerhalb vorab gepinntem Korridor,
  action-selection-green,
  telemetry-green, reward-ordering-green, safety-diagnostic-nonblocking,
  `terminal-nonblocking`, runtime errors 0.
- [ ] 93W.4.3 BT93P/BT94A bleiben `false`.
- [ ] 93W.4.4 Handover nennt offene DQN-/Ersatzvergleichspflicht fuer BT93X.
- [ ] 93W.4.5 `qualityClaimAllowed=false`; `bt93oClaimAllowed=true` bedeutet nur
  "BT93O darf als Qualitaetsblock pruefen".

Evidence:

- `data/training/ppo/bt93w/bt93w_closure_gate_report.json`
- `data/training/ppo/bt93w/bt93w_handover_package.json`

### BT93W Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| Startgate rot | zur roten Quelle R/S/T/U/V zurueck | kein Recheck |
| DeathBefore60 bleibt | enger Folgeblock nach dominanter Ursache | kein BT93O |
| Eval kollabiert erneut | zurueck zu BT93R | kein BT93O |
| Reward steigt trotz schlechter Semantik | zurueck zu BT93U | kein BT93O |
| alles gruen, DQN fehlt | BT93O darf starten; BT93P bleibt bis BT93X gesperrt | nur BT93O |

Result Classes:

- `bt93o-precondition-green`
- `policy-collapse-active`
- `death-before60-still-blocking`
- `action-selection-required`
- `observation-telemetry-required`
- `reward-redesign-required`
- `safety-sidecar-mask-required`
- `terminal-semantics-required`
- `measurement-invalid`

---

## Update fuer bestehenden Block BT93O

BT93O bleibt sinnvoll, aber erst nach BT93W. Der Scope wird nicht mehr als
Root-Cause-Reparatur verstanden, sondern als Qualitaets-/Anti-Plateau-Gate.

Zusaetzliche Startbedingungen:

- `BT93W.99=bt93o-precondition-green`
- `bt93oClaimAllowed=true`
- gleiche Matrix-ID, Reward-Profil, Action-Surface und Telemetry-Contract wie
  BT93W oder expliziter Drift-Invalidierungsreport
- keine aktiven Blocker aus R/S/T/U/V/W

Bei Intake-Aufnahme muss der bestehende BT93O-Depends-On im
Bot-Trainingsplan konkret ersetzt werden. Die alte Formulierung
`BT93Q.99 walltrail-policy-green oder DeathBefore60 non-blocking` ist nach
BT93Q rot nicht mehr ausreichend.

Zusaetzliche DoD fuer BT93O:

- [ ] BT93O.DoD.A Action-Qualitaet umfasst Wall/Trail, Gegnerdruck,
  Zielausrichtung, Boost, Aim/Fire, Item/Inventory und Recovery.
- [ ] BT93O.DoD.B Objective-/Progress-Qualitaet ist echte Env-Step-Telemetrie,
  nicht synthetisch.
- [ ] BT93O.DoD.C Anti-Plateau misst entropy, repeated streaks, noopShare,
  boostShare, aim/fireShare, progress-per-action, terminal diversity und
  simple-baseline distance.
- [ ] BT93O.DoD.D Random/Semantic-Cycle darf nicht scripted/repaired-policy
  erreichen oder schlagen.
- [ ] BT93O.DoD.E BT93O endet nie `BT94A-ready`; es oeffnet nur BT93X/BT93P
  Vorbereitung.
- [ ] BT93O.DoD.F Gruenes Ergebnis heisst ausschliesslich
  `bt93o-quality-green`; alte Ergebnisnamen wie `objective-quality-green`
  oeffnen BT93X/BT93P nicht ohne Mapping im Closure-Report.

BT93O Ergebnis-Ausgaenge:

- `bt93o-quality-green` (einziger gruener O-Ausgang)
- `action-quality-required`
- `objective-quality-required`
- `anti-plateau-required`
- `reward-redesign-required`
- `matrix-redesign-required`
- `measurement-invalid`

---

## Block BT93X: Same-Matrix-DQN oder Ersatzvergleich + BT93P Starttruth

### Ziel

BT93X beseitigt B.08/B.09 fuer den positiven Reentry-Pfad. Der Block hat zwei
Teile: ein frueher read-only Comparator-Preflight laeuft vor/parallel zu R-W,
damit der alte DQN-/Ersatzvergleichsblocker nicht wieder bis nach BT93O
verschleppt wird. Der volle Starttruth-Abschluss bleibt nach
`BT93O.99=bt93o-quality-green`, weil erst dann die PPO-Qualitaetsbasis feststeht.
BT93X erzeugt noch keinen BT94A-Claim, sondern klaert, ob BT93P ueberhaupt
starten darf.

### Scope

| Pfad | Zugriff | Zweck |
| --- | --- | --- |
| `data/training/ppo/bt93x/**` | write | Comparator-/DQN-/No-Start Reports |
| `python/scripts/bt93x_*.py` | write | DQN Loader, replacement policy, starttruth |
| `python/scripts/bt94a_gate_check.py` | eng write | aktuelle Handover-Quelle, kein Claim ohne P |
| historische DQN Reports | read-only | nur Kontext, nicht same-matrix |
| produktive Runtime | read-only | keine Integration |

### DoD

- [ ] DoD.X1 `comparison_policy_decision.json` endet mit Comparator-ready
  Subfeld (`sameMatrixDqnReady=true` oder `userReplacementPolicyReady=true`),
  aber `BT93X.99` selbst nutzt nur `bt93p-starttruth-green` als gruene
  Resultklasse.
- [ ] DoD.X2 Historische DQN-Reports werden nicht als same-matrix verkauft.
- [ ] DoD.X3 Replacement-Policy braucht expliziten User-Entscheid oder einen
  maschinenlesbaren Planentscheid mit `replacementPolicyOwner=user`.
- [ ] DoD.X4 `bt94a_no_start_refresh_report.json` bleibt rot, aber frisch und
  korrekt auf BT93X/BT93O/BT93P bezogen.
- [ ] DoD.X5 Kein Candidate/Freeze/Holdout/Promote.
- [ ] DoD.X6 `bt94a_gate_check.py` darf nicht weiter stale BT93M/BT93I/BT93C
  als aktuelle Wahrheit ausgeben, sobald R-X-Handover existiert.

### 93X.0 Early Comparator Preflight

- [ ] 93X.0.1 Historische DQN-/KI-Reports read-only inventarisieren, ohne
  BT93P/BT94A zu oeffnen.
- [ ] 93X.0.2 Technische Loader-Blocker frueh klassifizieren:
  Checkpoint-Format, Observation-Length, Action-Surface, Reward-/Terminal-
  Semantik, Matrix-ID, VecNormalize-/Normalizer-Frage.
- [ ] 93X.0.3 Wenn DQN offensichtlich nicht same-matrix ladbar ist, wird
  `dqn-loader-fix-required` oder `replacement-policy-user-decision-required`
  frueh dokumentiert.
- [ ] 93X.0.4 Preflight ist read-only; er kann BT93R-W nicht ersetzen und
  keinen positiven Starttruth-Claim erzeugen.

Evidence:

- `data/training/ppo/bt93x/early_comparator_preflight_report.json`

### 93X.1 Comparator-Inventory

- [ ] 93X.1.1 Alle historischen DQN-/KI-Reports inventarisieren.
- [ ] 93X.1.2 Matrix-/Reward-/Terminal-/Observation-Semantik gegen BT93W/O
  vergleichen.
- [ ] 93X.1.3 Nicht same-matrix Quellen als historische Kontextquellen
  markieren.
- [ ] 93X.1.4 Entscheidung treffen: DQN-Loader fixen oder Ersatzpolitik
  vorbereiten.

Evidence:

- `data/training/ppo/bt93x/comparator_inventory_report.json`

### 93X.2 Same-Matrix-DQN Loader oder Ersatzpolitik

- [ ] 93X.2.1 Wenn DQN loader moeglich: Same-Matrix-DQN gegen BT93W/O-Matrix
  laden, evaluieren und Hashes schreiben.
- [ ] 93X.2.2 Wenn DQN loader blockiert: Blocker technisch dokumentieren.
- [ ] 93X.2.3 Ersatzpolitik nur mit explizitem User- oder Planentscheid:
  z.B. scripted-positive-control plus simple-baseline ladder als temporaere
  Vergleichspolitik.
- [ ] 93X.2.4 Ersatzpolitik darf BT94A-Freeze nicht ersetzen, nur BT93P-Start
  methodisch absichern.
- [ ] 93X.2.5 Ohne User- oder Planentscheid endet der Block
  `replacement-policy-user-decision-required`, nicht `bt93p-starttruth-green`.

Evidence:

- `data/training/ppo/bt93x/comparison_policy_decision.json`
- `data/training/ppo/bt93x/same_matrix_dqn_report.json` oder
  `data/training/ppo/bt93x/replacement_policy_decision.json`

### 93X.3 BT93P Starttruth und No-Start Refresh

- [ ] 93X.3.1 `bt93p_starttruth_report.json` prueft:
  BT93W gruen, BT93O gruen, Comparator ready, Holdout unverbraucht,
  Statistikvertrag vorhanden.
- [ ] 93X.3.2 `bt94a_gate_check.py` bleibt rot, solange BT93P.4 fehlt.
- [ ] 93X.3.3 `no_start_gate.json` darf nur frische Quellen nennen; keine
  stale BT93I/M-Quelle als aktuelle Wahrheit.
- [ ] 93X.3.4 BT93P darf nur starten, wenn alle Starttruth-Checks gruen sind.
- [ ] 93X.3.5 Gate-Checker-Feldmapping wird geschrieben: welche Quelle liefert
  `bt93pReady`, `bt94aReady`, `claimable`, `candidateRunsAllowed`,
  `matrixDefinitionAllowed`, `bt94aBlockerCount`, Comparator-Status und
  Holdout-Lineage.

Evidence:

- `data/training/ppo/bt93x/bt93p_starttruth_report.json`
- `data/training/ppo/bt93x/bt94a_no_start_refresh_report.json`

### 93X.99 Abschluss

- [ ] 93X.99.1 Comparator ready oder BT93P gesperrt.
- [ ] 93X.99.2 BT94A bleibt geschlossen.
- [ ] 93X.99.3 Kein Holdout-Verbrauch.
- [ ] 93X.99.4 Gruen heisst nur `bt93p-starttruth-green`; Comparator-ready
  allein ist ein Subfeld und kein Abschlussresult.

Evidence:

- `data/training/ppo/bt93x/bt93x_closure_gate_report.json`
- `data/training/ppo/bt93x/bt93x_handover_package.json`
- `data/training/ppo/bt93x/gate_checker_source_mapping.json`

### BT93X Ausweichstrategien

| Problem | Ausweichstrategie | Oeffnet |
| --- | --- | --- |
| DQN loader blockiert | enger DQN-loader Fixblock oder User-Ersatzpolitik | kein BT93P ohne Entscheidung |
| Ersatzpolitik unklar | User-owned Entscheidung im Master verankern | kein BT93P, Result `replacement-policy-user-decision-required` |
| no_start source stale | Gate-Checker source resolution fixen | kein BT94A |
| Comparator ready | BT93P darf Startgate pruefen | BT93P, nicht BT94A |

Result Classes:

- `bt93p-starttruth-green`
- `comparison-policy-not-ready`
- `dqn-loader-fix-required`
- `replacement-policy-user-decision-required`
- `bt93p-start-blocked`
- `measurement-invalid`

---

## Update fuer BT93P, BT94A, BT94B

### BT93P

BT93P startet erst nach:

- `BT93O.99=bt93o-quality-green`
- `BT93X.99=bt93p-starttruth-green`
- Statistikvertrag vor Lauf
- Holdout unverbraucht
- Simple-baseline und Comparator ready
- keine aktiven R/S/T/U/V/W/O/X-Blocker

BT93P bleibt 200k -> 500k -> 1M mit Zwischenstops. Jeder Lauf muss die
BT93J/N/Q-Fehlersignatur aktiv widerlegen:

- Natural-/Task-Success vs PlayerDead
- DeathBefore60
- deterministic eval collapse
- action-selection coverage
- RewardBreakdown und positive risky rows
- Simple-baseline distance
- Comparator distance
- Runtime/Safety rates

BT93P-Starttruth muss als JSON-Feldmapping vorliegen:

| Feld | Quelle |
| --- | --- |
| `bt93oQualityGreen` | `data/training/ppo/bt93o/bt93o_closure_gate_report.json` |
| `bt93pStarttruthGreen` | `data/training/ppo/bt93x/bt93p_starttruth_report.json` |
| `comparisonPolicyReady` | `data/training/ppo/bt93x/comparison_policy_decision.json` |
| `holdoutUnconsumed` | `data/training/ppo/bt93x/bt93p_starttruth_report.json` |
| `statisticsContractLocked` | BT93P Startcontract |
| `forbiddenSignalsFalse` | BT93X/BT93P Closure-Reports |

### BT94A

BT94A startet erst bei:

- `BT93P.4=BT94A-ready`
- `bt94a_gate_check.py --write-report` mit `claimable=true`
- `candidateRunsAllowed=true`
- `matrixDefinitionAllowed=true`
- `bt94aBlockerCount=0`
- echtes Modell-/Normalize-/Optimizer-/Config-Paket
- DQN-/Ersatzvergleich ready
- Holdout-Lineage sauber

BT94A repariert keine offenen R-X-Grundlagen.

`bt94a_gate_check.py` muss vor `94A.1` diese neueren Quellen priorisieren:
BT93P.4 vor BT93X vor BT93O vor BT93W vor BT93Q. Stale BT93M/BT93I/BT93C
Quellen duerfen nur historische Kontextfelder sein.

### BT94B

BT94B bleibt nur externe A/B-Evidence und PPO-Validate. `promote` bleibt
verboten ohne:

- echten Freeze-Kandidaten
- gruene PPO-Validate-Lane
- externe Evidence mit Median/IQR/Unsicherheit
- keine offenen Reward-/Action-/Telemetry-/Safety-/Comparator-Blocker

---

## Intake-Aufnahme

Manuelle Uebernahme erforderlich.

Vorgeschlagene neue Zeilen in `docs/bot-training/Bot_Trainingsplan.md`:

| id | titel | status | prio | depends_on | current_phase | quelle |
| --- | --- | --- | --- | --- | --- | --- |
| PF.0 | R-X Plan-, Branch-, Graph- und No-Start-Preflight | planned | P0 | BT93Q.99 `policy-collapse-active` | PF.0 | `docs/plaene/neu/BT93R_Bis_BT93X_PPO_Blocker_Resolution_Replan_2026-04-30.md` |
| BT93R | Policy-Artefakt und deterministic-collapse Repair | planned | P1 | PF.0 `preflight-green` oder dokumentierte User-Ausnahme | 93R.1 | gleicher Intake |
| BT93S | Wall-/Trail Action-Effekt und Action-Selection Repair | planned | P1 | BT93R.99 in R-Allowlist | 93S.1 | gleicher Intake |
| BT93T | Training-only Raw-/Trail-/Escape-Lane Telemetry Repair | planned | P1 | BT93S.99=`observation-telemetry-required` oder Telemetry-Start | 93T.1 | gleicher Intake |
| BT93U | Danger-aware Reward- und Objective-Ordering Repair | planned | P1 | BT93T.99=`telemetry-green` + S-Recheck `action-selection-green` | 93U.1 | gleicher Intake |
| BT93V | Safety-Diagnostic, Terminal-Sanity und Sidecar-Mask Decision | planned | P1 | BT93U.99=`reward-ordering-green` | 93V.1 | gleicher Intake |
| BT93W | Integrierter WallTrail 10k Recheck und BT93O-Startgate | planned | P1 | BT93V.99=`safety-diagnostic-nonblocking` + `terminal-nonblocking` | 93W.1 | gleicher Intake |
| BT93X.0 | Early Comparator Preflight | planned | P1 | PF.0 gruen; read-only | 93X.0 | gleicher Intake |
| BT93X | Same-Matrix-DQN oder Ersatzvergleich + BT93P Starttruth | planned | P1 | BT93O.99=`bt93o-quality-green` + 93X.0 completed | 93X.1 | gleicher Intake |

Abhaengigkeitsschaerfung:

- `BT93O depends_on = BT93W.99 bt93o-precondition-green`
- `BT93P depends_on = BT93O.99 bt93o-quality-green + BT93X.99 bt93p-starttruth-green`
- `BT94A depends_on = BT93P.4 + claimable=true`
- `BT94B depends_on = BT94A.99`
- `BT95 depends_on = BT94B promote + PPO-Validate green`

Zwingende Aufnahme-Edits:

- Bestehenden BT93O-Depends-On ersetzen; keine alte BT93Q-Formel behalten.
- BT93P- und BT94A-Starttexte um das Feldmapping aus diesem Intake erweitern.
- Roadmap-Abschnitt `Aktiver PPO-Fokus` von `BT93M bis BT93P` auf `BT93R bis
  BT93X, danach BT93P` aktualisieren.
- `bt94a_gate_check.py`-Source-Prioritaet im Plan verankern: BT93P.4 vor BT93X
  vor BT93O vor BT93W vor BT93Q; BT93M/BT93I/BT93C nur historisch.
- Result-Class-Legacy-Mapping als eigene Tabelle in den Bot-Trainingsplan
  uebernehmen.

## Naechste konkrete Aktion

Nach User-Intake:

1. Intake manuell in `docs/bot-training/Bot_Trainingsplan.md` aufnehmen, aber
   zuerst nur PF.0 + BT93R/BT93X.0 als naechste claimbare Einheiten.
2. PF.0 ausfuehren und Branch-/Graph-/BT94A-No-Start-/Roadmap-Drift klaeren.
3. Wenn PF.0 gruen oder User-Ausnahme dokumentiert ist: `BT93R` claimen.
4. Parallel/read-only `93X.0 Early Comparator Preflight` vorbereiten, damit der
   DQN-/Ersatzvergleichsblocker nicht bis nach BT93O verschleppt wird.
5. In BT93R nur `93R.1` ausfuehren.
6. Erste Artefakte:
   - `python/scripts/bt93r_preflight_gate_sync.py`
   - `data/training/ppo/bt93r/bt93r_preflight_gate_sync_report.json`
   - `python/scripts/bt93r_handover_lock.py`
   - `data/training/ppo/bt93r/bt93r_handover_lock_report.json`
   - `data/training/ppo/bt93r/bt93r_hypothesis_lock.json`
7. Kein PPO-Run in 93R.1.
8. Erstes Gate:
   - `python python/scripts/bt93r_preflight_gate_sync.py --write-report`
   - `python python/scripts/bt93r_handover_lock.py --write-report`
   - `python python/scripts/bt93x_early_comparator_preflight.py --write-report`
   - `python -m py_compile python/scripts/bt93r_handover_lock.py`
   - `python -m py_compile python/scripts/bt93r_preflight_gate_sync.py`
   - `python -m py_compile python/scripts/bt93x_early_comparator_preflight.py`
   - `npm.cmd run gates:pre-commit`

## Bericht

Die zielfuehrende Reihenfolge fuer Bot-Training ist:

1. PF.0, weil Branch-/Graph-/No-Start-/Roadmap-Drift sonst wieder falsche
   Planwahrheit erzeugt.
2. Policy-Artefakt/Collapse (`BT93R`), weil eine kollabierte deterministic eval
   jede Action-/Reward-Aussage entwertet.
3. Read-only Comparator-Preflight (`BT93X.0`), weil der Same-Matrix-DQN- oder
   Ersatzvergleichsblocker nicht bis nach BT93O verschleppt werden darf.
4. Action-Effekt/Selection (`BT93S`), weil Wall-/Trail-Escape nicht durch
   Reward oder laengere Laufzeit ersetzt werden kann.
5. Raw-/Trail-/Escape-Lane-Telemetrie (`BT93T`) und danach S-Recheck, weil aktuelle Proxies
   Action-Erfolge und Trail-Druck nicht sauber beweisen.
6. Reward-/Objective-Ordering (`BT93U`), weil `random`/`semantic-cycle` und
   positive risky rows die Lernrichtung korrumpieren koennen.
7. Safety/Terminal-Sanity (`BT93V`), damit Diagnosefelder nicht als Runtime-Fix
   missverstanden werden.
8. Integrierter 10k-Recheck (`BT93W`), erst wenn alle Einzelfixes
   urteilsfaehig sind.
9. BT93O als Qualitaetsblock mit eindeutigem `bt93o-quality-green`.
10. Same-Matrix-DQN/Ersatzvergleich (`BT93X`) mit `bt93p-starttruth-green`.
11. Erst dann BT93P, danach BT94A/BT94B.

Damit werden alle bekannten Blocker nicht als geloest behauptet, sondern in
harte Reparatur- und Stop-Gates ueberfuehrt. Geloest ist ein Blocker erst, wenn
der passende Closure-Report die erlaubte Resultklasse schreibt, die Lineage
frisch ist und keine verbotenen Signale gesetzt sind.
