# BT93J Root-Cause-Repair-Intake fuer F.05/F.19/F.27/F.31

User-Intake: 2026-04-25

Status: Draft fuer User-owned Intake in den Bot-Trainingsplan. Dieser Draft oeffnet BT94A nicht.

## Ziel

BT93J ist ein enger Root-Cause-Repair-Block vor BT94A. Der Block darf die roten Befunde `F.05`, `F.19`, `F.27` und `F.31` nicht erneut nur weiterreichen. Vor jedem Fix, Repair-Lauf, Pilot oder Long-run muss zuerst ein Diagnose-Trennmesser beweisen, welche Problemklasse aktiv ist und welche Gegenprobe die Kausalkette widerlegt oder bestaetigt.

BT93J ist kein Candidate-, Freeze-, Promote-, Rollout- oder Runtime-Integrationsblock.

## Aktuelle Start-Wahrheit

Arbeitskopie beim Draft: `06a93afbfb490236463ded6b1d9f812080d3a073` auf Branch `bot-training`.

| Feld | Aktueller Wert | Quelle |
| --- | --- | --- |
| `claimable` | `false` | `data/training/ppo/bt94a/no_start_gate.json` |
| `candidateRunsAllowed` | `false` | `data/training/ppo/bt94a/no_start_gate.json` |
| `matrixDefinitionAllowed` | `false` | `data/training/ppo/bt94a/no_start_gate.json` |
| `candidateFreezeAllowed` | `false` | `data/training/ppo/bt94a/no_start_gate.json` |
| `precomparisonResultClass` | `ppo-regression` | `data/training/ppo/bt94a/no_start_gate.json`, `data/training/ppo/bt93c/precomparison_report.json` |
| `bt94aBlockerCount` | `4` | `data/training/ppo/bt94a/no_start_gate.json` |
| offene Gates | `F.05/F.19/F.27/F.31` | `data/training/ppo/bt94a/no_start_gate.json` |
| BT93I Matrix-Urteil | `matrixVerdict=ppo-regression`, `resultClass=diagnose-blocked` | `data/training/ppo/bt93i/matrix_green_report.json` |

Aktuelle BT93I-Matrix:

| Metrik | Eval | Holdout | Ziel/Anker | Ergebnis |
| --- | ---: | ---: | ---: | --- |
| Run-ID | `20260425T153044Z-terminal-curriculum-repair-eval` | `20260425T153136Z-holdout-eval` | n/a | versioniert |
| `completedEpisodeCount` | `15` | `8` | Eval `>=15`, Holdout `>=8` | Mindestepisoden erreicht |
| `avgStepsPerEpisode` | `69.133333` | `71.75` | `>=117.525` | rot |
| `averageBotSurvival` | `69.133333` | `71.75` | `>=48.590082` | gruen, aber nicht ausreichend |
| DQN-Anker Steps | n/a | n/a | `117.525` | PPO regressiert bei Steps |
| DQN-Anker Survival | n/a | n/a | `37.376986` | +30%-Ziel `48.590082` |
| Steps-Delta gegen DQN | `-41.175637%` | `-38.94916%` | `>=0%` | rot |
| Survival-Delta gegen DQN | `+84.9623%` | `+91.963044%` | `>=+30%` | gruen, aber Terminal-Matrix blockiert |
| Terminal-Matrix | `terminalDeathMatrixStartCapable=false` | `playerDeadOnlyBlocksStart=true` | startfaehig, nicht player-dead-only | rot |

## Artefakt-Pinning

| Artefakt | SHA-256 | Run-/Matrix-ID | Artefakt-Git-SHA | Relevanz |
| --- | --- | --- | --- | --- |
| `data/training/ppo/bt93i/closure_gate_report.json` | `841c806a1604fd12e5d30d58da9e154d0561372417e35f8c3f5510abf7fad116` | `BT93I/93I.99` | `7685c9a28d6d1323df9d8d6e55a704c838fbc707` | BT93I endet `diagnose-blocked-closed`; Restgates bleiben sichtbar. |
| `data/training/ppo/bt93i/matrix_green_report.json` | `c664bdc5f716ed7575dd02c9adf7dd7d5bd2aed92c8e6932c0f546639a43d4fc` | Matrix `bt93i-terminal-curriculum-episode-matrix-v1`; Eval `20260425T153044Z-terminal-curriculum-repair-eval`; Holdout `20260425T153136Z-holdout-eval` | `ee73aa4907348ff5991dbcc2354b93a70326c0b5` | Aktuelle rote Steps-/Terminal-Beweise. |
| `data/training/ppo/bt93i/handover_package.json` | `74610a79117b98a6b7b994674561d3ecd5eda11639a59e2a472f472f8ee4b702` | `BT93I/93I.5` | `14c90ba318df3f07936beb0445f5522e6f3f8e9a` | Handover bleibt `diagnose-blocked`; BT94A bleibt geschlossen. |
| `data/training/ppo/bt93i/followup_gate_report.json` | `ca66e4da3bc7033bb58c450fe44cfb178f542b442e0a1ed60a61fe94853a2bca` | `BT93I/93I.5.3` | n/a | `followupRequired=true`, Restgates `F.05/F.19/F.27/F.31`. |
| `data/training/ppo/bt94a/no_start_gate.json` | `288018064b50e130fb0fea7ded67b7ac2b29a6c393198a9a494417d16fd37062` | Matrix `bt93c-dqn-ppo-precomparison-v1`; Modell-Run `20260425T151155Z-terminal-curriculum-repair` | `14c90ba318df3f07936beb0445f5522e6f3f8e9a` | Formales No-Start-Gate fuer BT94A. |
| `data/training/ppo/bt93c/precomparison_report.json` | `7ff00d1c24d345642e521b76a89f7746a9d5dc0748adaeaa39f51caa12bcb1fb` | Matrix `bt93c-dqn-ppo-precomparison-v1` | `14c90ba318df3f07936beb0445f5522e6f3f8e9a` | Setzt `resultClass=ppo-regression`. |
| `data/training/ppo/bt93c/handover_report.json` | `f7554bef13fd37a5bc4a24061a5422ebe23c460c2f0e070b4521425665bebd68` | Modell-Run `20260425T151155Z-terminal-curriculum-repair` | `14c90ba318df3f07936beb0445f5522e6f3f8e9a` | Handover `ready=false`, `resultClass=diagnose`. |
| `data/training/ppo/bt93c/evidence_quality_matrix.json` | `f13a0aabbe8d2bfe0d6ad52e7f39ecc38a772018fd24a150b01cfcb85bbc2d11` | `BT93C/93I.5.1` | n/a | Evidence-Matrix fuehrt `bt94aStoppers=[F.05,F.19,F.27,F.31]`. |

## Harte Grenzen

- Kein BT94A-Claim.
- Kein Kandidatenlauf.
- Kein Freeze.
- Kein Promote.
- Kein Rollout-Signal.
- Keine produktive Runtime-, Matchstart- oder AI-Hub-Integration.
- Keine Aenderung an AI-Hub-, Runtime-, Matchstart-, Strategy-, Registry-, Rollback-, Rollout-, Authority- oder Bridge-Vertraegen innerhalb BT93J.
- Keine Masterplan-Aenderung durch den ausfuehrenden Agenten; Intake in den Master bleibt user-owned.
- Keine Blocker-Downgrades ohne Artefakt- und Gate-Beweis.
- Kein "weiter trainieren und hoffen".
- Plan-/Docs-Gates zaehlen nicht als PPO-Beweis.

## AI-Hub- und Contract-Governance

BT93J darf keine AI-Hub- oder produktiven Runtime-Vertraege brechen, stillschweigend erweitern, umdeuten oder durch Trainingsbedarf faktisch ersetzen. Contract-Dateien sind fuer BT93J read-only. Wenn eine Diagnose zeigt, dass ein Contract wirklich geaendert werden muesste, ist das kein BT93J-Fix, sondern ein Stop-/Escalation-Befund.

Pflichtverhalten bei jeder vermuteten Contract-Aenderung:

1. Sofort stoppen, bevor Code oder Contract-Text geaendert wird.
2. Einen Befundbericht schreiben, der exakt benennt:
   - welcher Vertrag betroffen waere,
   - warum die aktuelle Diagnose ohne Vertragsaenderung nicht loesbar ist,
   - welche Alternative ohne Vertragsaenderung geprueft wurde,
   - welches Risiko fuer AI-Hub, Runtime, Matchstart, Rollback und bestehende DQN-/Hybrid-Pfade entsteht.
3. Den User explizit benachrichtigen.
4. Eine separate, user-owned Intake-/Freigabeentscheidung verlangen.
5. Ohne ausdrueckliche Zustimmung keine Aenderung vornehmen.

Default-Entscheidung: keine Vertragsaenderung. BT93J muss zuerst Diagnose-, Mapping-, Observation-, Matrix-, Action-, Reward- oder Trainingsursachen innerhalb der erlaubten Sidecar-/Trainingsgrenzen isolieren. Eine Vertragsaenderung ist nur ein Eskalationspfad, kein normaler Repair-Hebel.

## Scope-Files

Primaerer neuer BT93J-Scope:

- `data/training/ppo/bt93j/**`
- `python/scripts/bt93j_*.py`
- `python/configs/ppo_bt93j*.json`
- `python/eval.py` nur fuer Diagnose-/Report-Erweiterungen, falls BT93J.0.5/BT93J.2 bis BT93J.5 die Noetigkeit belegen.
- `python/train.py` nur fuer Micro-/Pilot-/Long-run-Gates nach gruener Readiness, nicht fuer Kandidatenlaeufe.
- `python/envs/**` und `python/callbacks/**` nur bei belegtem Observation-, Action-, Reward- oder Terminal-Root-Cause.
- `scripts/training-headless-lane-runner.mjs`, `src/state/training/EpisodeController.js`, `src/state/training/RewardCalculator.js` nur trainingsnah und nur, wenn Diagnose-Reports Environment-/Mapping-/Reward-Semantik als Hauptursache belegen.
- `tests/training-*.mjs`, `python/tests/**` fuer gezielte Diagnose-/Report-Smokes.

Read-only/No-Go:

- `docs/bot-training/Bot_Trainingsplan.md` bis zum user-owned Intake.
- `docs/Umsetzungsplan.md`.
- Produktive JS-Inference-, Registry-, Strategy-Flag-, RuntimeConfig-, Matchstart-, AI-Hub-, Rollback- und Rollout-Surfaces.
- AI-Hub-/Bridge-/Authority-Vertraege, produktive Runtime-Vertraege und alle Dateien, die eine operative Bot-Auswahl oder Matchstart-Semantik veraendern wuerden.

## Vollstaendiges Befundregister fuer BT93J

Quelle: `data/training/ppo/bt93c/evidence_quality_matrix.json` (`summary.closed=22`, `summary.follow-gated=11`, `summary.bt94a-blocker=4`) plus aktuelles `data/training/ppo/bt94a/no_start_gate.json`.

### BT94A-Claim-Checks

| Check | Status | Beobachtet | Erforderlich | Wirkung |
| --- | --- | --- | --- | --- |
| `current_handover_source_is_latest` | gruen | `BT93I` | `BT93I` | blockiert nicht |
| `bt93c_result_allows_bt94a` | rot | `diagnose` | `not diagnose` | blockiert Start |
| `handover_gate_ready` | rot | `closed-diagnose-blocked-by-bt93i` | `ready=true` | blockiert Start |
| `precomparison_not_regression` | rot | `ppo-regression` | `not ppo-regression` | blockiert Start |
| `no_open_bt94a_audit_blockers` | rot | `4` | `0` | blockiert Start |

### BT94A-Gate-Befunde

| ID | Status | Ursache | BT93J-Behandlung |
| --- | --- | --- | --- |
| `G.01` | still-blocking | BT94A-Gate ist rot. | `no_start_gate.json` bleibt Startwahrheit; nur BT93J.15 darf refreshen. |
| `G.02` | still-blocking | `candidateRunsAllowed=false`. | Kein Candidate-Run in BT93J. |
| `G.03` | still-blocking | `matrixDefinitionAllowed=false`. | BT93J definiert nur Diagnose-/Repair-Matrizen, keine BT94A-Ablationsmatrix. |
| `G.04` | carried-hard-red | `candidateFreezeAllowed=false`. | Kein Freeze vor `94A.3`; BT93J darf Freeze nicht vorbereiten. |
| `G.05` | still-blocking | Handover-Ergebnis bleibt `diagnose`. | Handover nur nach BT93J-Artefakten neu bewerten. |
| `G.06` | still-blocking | Handover-Gate bleibt `closed-diagnose-blocked-by-bt93i`. | `ready=true` nur bei geschlossenem Root-Cause-Beweis. |
| `G.07` | still-blocking | Precomparison bleibt `ppo-regression`. | Comparator nur nach gruenen Rohinputs oder belegtem Comparator-Bug aendern. |
| `G.08` | still-blocking | Offene BT94A-Audit-Blocker `F.05/F.19/F.27/F.31`. | Alle vier muessen geschlossen oder nicht mehr blockierend belegt sein. |
| `C.01` | still-blocking | `bt93c_result_allows_bt94a=false`, beobachtet `diagnose`. | BT93J muss echte Diagnose-/Repair-Evidence liefern, kein Plantext-Downgrade. |
| `C.02` | still-blocking | `handover_gate_ready=false`. | Handover-Ready nur mit `no_start_gate.json` gruen. |
| `C.03` | still-blocking | `precomparison_not_regression=false`. | `precomparison_report.resultClass != ppo-regression` ist Pflicht. |
| `C.04` | still-blocking | `no_open_bt94a_audit_blockers=false`, beobachtet `4`. | `bt94aBlockerCount=0` ist Pflicht. |

### F-Befunde F.01 bis F.37

| ID | Status | Blockiert BT94A | Behandlung in BT93J |
| --- | --- | --- | --- |
| `F.01` | `closed` | nein | Echtes PPO-Lernen und Modellpaket weiter hashen; nicht neu oeffnen. |
| `F.02` | `closed` | nein | Requirements, Clean-Env, `pip check` und Import-Smoke bleiben Referenz. |
| `F.03` | `closed` | nein | SB3-kompatible Action-Surface beibehalten. |
| `F.04` | `closed` | nein | Modell, Optimizer, VecNormalize, Config und Hashes weiter versionieren. |
| `F.05` | `bt94a-blocker` | ja | Steps-Regression und Survival-First mit Root-Cause-Trennmesser klaeren; Eval/Holdout muessen `avgStepsPerEpisode >=117.525` und `averageBotSurvival >=48.590082` erreichen. |
| `F.06` | `follow-gated` | nein | PPO-Validate bleibt `BT94B.3`; BT93J darf nicht promote nennen. |
| `F.07` | `follow-gated` | nein | `4-Env` bleibt ohne direkte Evidence gesperrt. |
| `F.08` | `closed` | nein | Throughput bleibt nur Budget-/Lane-Evidence, kein Lernbeweis. |
| `F.09` | `closed` | nein | Frischer Freeze-Check bleibt Startreferenz; kein alter roter Freeze. |
| `F.10` | `closed` | nein | Keine stale Artefakt-/README-Widersprueche wieder einfuehren. |
| `F.11` | `closed` | nein | `tmp/**` bleibt nicht closure-faehig. |
| `F.12` | `closed` | nein | DQN-Champion, Matrix, Semantikfenster und Holdout bleiben fixiert oder Drift wird Blocker. |
| `F.13` | `follow-gated` | nein | Externe Kandidatenstatistik bleibt BT94A/BT94B-Regel. |
| `F.14` | `follow-gated` | nein | PPO-spezifischer Validate-Report fehlt bis `BT94B.3`. |
| `F.15` | `follow-gated` | nein | Runtime-Handoff bleibt ausserhalb BT93J; Contract-Governance erzwingt Stop bei Runtime-Bedarf. |
| `F.16` | `closed` | nein | Scaffold, Pilot, Baseline und Candidate weiter hart trennen. |
| `F.17` | `closed` | nein | Eval muss echtes PPO-Modellpaket laden. |
| `F.18` | `follow-gated` | nein | Runtime-/Failure-Klassen intern berichten; PPO-Validate-Mapping bleibt spaeter. |
| `F.19` | `bt94a-blocker` | ja | Terminal-/Death-Matrix startfaehig machen oder Root-Cause beweisen; `player-dead-only` bleibt rot. |
| `F.20` | `closed` | nein | Sanitizer-, Mask-, Veto- und Invalid-Raten weiter messen. |
| `F.21` | `closed` | nein | Risk-Drift in Handover/Reports weiter sichtbar halten. |
| `F.22` | `closed` | nein | Governance-Gates bleiben kein Lern-, Survival- oder PPO-Beweis. |
| `F.23` | `closed` | nein | Keine Self-Count-Evidence als Closure. |
| `F.24` | `follow-gated` | nein | Langzeitstabilitaet bleibt spaeteres Urteil; BT93J berichtet Failure-Klassen. |
| `F.25` | `closed` | nein | Clean-Env-Reproduzierbarkeit erhalten. |
| `F.26` | `closed` | nein | Baseline-ID und Metrikquellen fix halten. |
| `F.27` | `bt94a-blocker` | ja | `ppo-regression` als Aggregat aus F.05/F.19/F.31 behandeln, bis Rohinputs anderes beweisen. |
| `F.28` | `follow-gated` | nein | Interne Eval-Survival bleibt keine PPO-Validate-Evidence. |
| `F.29` | `closed` | nein | Holdout-Verbrauch und No-Optimization weiter maschinenlesbar beweisen. |
| `F.30` | `closed` | nein | Pre-Sampling-Mask bleibt aktiv; Clamp/Veto duerfen Policy-Qualitaet nicht verdecken. |
| `F.31` | `bt94a-blocker` | ja | Nicht-toedliche Natural-Terminal-Evidence in echter Eval/Holdout-Matrix beweisen. |
| `F.32` | `follow-gated` | nein | Groessere Kandidatenstatistik bleibt BT94A/BT94B. |
| `F.33` | `closed` | nein | Immutable Run-IDs, Hashes und Manifeste statt `latest` fortfuehren. |
| `F.34` | `closed` | nein | V101-Folgecheck bleibt `no-ppo-contract-drift`; neue Semantikdrift wird Blocker. |
| `F.35` | `closed` | nein | Plan-/Docs-Gates getrennt von PPO-Semantik halten. |
| `F.36` | `follow-gated` | nein | Laengere Kandidatenlaeufe muessen spaeter Failure-Klassen fortfuehren. |
| `F.37` | `follow-gated` | nein | PPO-Validate-Bauort und Schema bleiben `BT94B.3`. |

### Weitere gefuehrte Restbefunde

| Befund | Status | Behandlung |
| --- | --- | --- |
| `BT94A closed` | aktiv | `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`; kein BT94A-Claim vor gruenem Gate. |
| `BT93I followupRequired` | aktiv | `followupRequired=true`; BT93J darf nur Diagnose-/Repair-Folgeblock sein. |
| `PPO baseline is misread as promotion` | Risiko aktiv | `promotionAllowed=false`, kein Promote-/Rollout-Label. |
| `4-env escalation without direct evidence` | Risiko aktiv | `fourEnvAllowed=false` weiterfuehren. |
| `V101 drift invalidates PPO contracts` | aktuell `no-ppo-contract-drift` | Bei neuer Drift Stop/Eskalation, keine stille Contract-Aenderung. |
| `PPO-Validate confused with BT80C legacy validate` | Risiko aktiv | BT94B.3 bleibt Eigentuemer der PPO-Validate-Lane. |
| `R.01 Reward/Safety episode shortening` | in BT93G geschlossen/downgraded, weiter zu beobachten | Bei Reward-Anstieg mit roten Steps/Terminal-Matrix sofort wieder Diagnose-Blocker. |

## BT93J.0 Start-Wahrheit und Scope

DoD:

- Aktuelle rote Gate-Lage maschinenlesbar als `data/training/ppo/bt93j/start_truth.json` zusammenfassen.
- Alle oben gepinnten Artefakte mit Pfad, SHA-256, Run-ID, Matrix-ID, Artefakt-Git-SHA und aktueller Workspace-SHA referenzieren.
- `F.05`, `F.19`, `F.27`, `F.31` je mit aktueller Regel, Quelle und roter Evidence erfassen.
- Scope-Files und No-Go-Regeln in `start_truth.json` und im Handoverpaket wiederholen.
- Keine neue Bewertung erzeugen; BT93J.0 ist ein Wahrheits- und Reproduktionsanker.

## BT93J.0.5 Diagnose-Trennmesser vor jedem Repair

DoD:

- Vor jedem Fix, Repair-Lauf, Pilot oder Long-run schreibt BT93J `data/training/ppo/bt93j/diagnostic_split_report.json`.
- `diagnosticSplit.readyForRepair=false`, bis mindestens eine konkrete Hauptursache mit Gegenprobe benannt ist.
- `diagnosticSplit.readyForTraining=false`, bis Observation-, Terminal-/Mapping-, Eval-/Matrix- und Action-Safety-Gates gruen oder als nicht ursachlich bewiesen sind.
- Der Trennmesser klassifiziert separat:
  - Terminal-Semantik rot wegen Environment/Mapping.
  - Terminal-Semantik rot wegen Policy-Verhalten.
  - Steps rot wegen Training/Curriculum.
  - Steps rot wegen Reward-Shaping.
  - Steps rot wegen Observation-Fehler.
  - Steps rot wegen Eval-/Messmatrix.
  - Steps rot wegen Action-/Policy-Safety.
- Jede Problemklasse braucht mindestens eine Gegenprobe:
  - Observation: Schema-/Range-/Staleness-/VecNormalize-Audit plus Headless/Python/PPO-Input-Diff.
  - Environment/Mapping: scripted Terminal-Provocation und Headless/Python-Feldparitaet ohne Policy.
  - Policy: Oracle-/scripted-safe Policy gegen dieselbe Matrix; wenn Oracle nicht player-dead-only ist, ist Policy-Verhalten aktiv.
  - Eval-/Matrix: gleiche Roh-Episoden gegen alternative, reine Auswertungslogik neu klassifizieren; Rohdaten duerfen sich nicht aendern.
  - Action-/Safety: Pre-Sampling-Action, Maske, Clamp, Veto, Sanitizer und final ausgefuehrte Action pro Step diffen.
  - Reward/Curriculum: Reward-Breakdown gegen Episode-Length, Death-Cause und Risikoaktionen korrelieren; gleiche Policy mit Reward-neutralem Eval messen.
  - Training: Lernkurven, Seeds, Horizont, Timesteps, Entropy/KL/Value/Grad-Norm gegen roten Steps-Befund abgleichen.
- Wenn mehrere Klassen rot sind, gilt Reparaturreihenfolge:
  1. Observation.
  2. Terminal-/Mapping-Semantik.
  3. Eval-/Matrix-Vertrag.
  4. Action-/Policy-Safety.
  5. Reward/Curriculum.
  6. Training/Pilot.
- Ein Repair ohne benannte Hauptursache ist verboten.

## BT93J.1 Kausalketten-Register

DoD:

- `data/training/ppo/bt93j/causal_chain_register.json` schreiben.
- Fuer jeden Blocker werden Symptom, Regel, Artefakt, Codepfad, Hypothese, Gegenbeweis und Erfolgskriterium erfasst.
- Beziehungen zwischen Blockern werden maschinenlesbar: `F.27` bleibt Aggregat, solange `F.05`, `F.19` oder `F.31` rot sind.

| Blocker | Symptom | Aktuelle Regel/Quelle | Wahrscheinliche Kette | Gegenbeweis | Erfolgskriterium |
| --- | --- | --- | --- | --- | --- |
| `F.05` | Survival-First nicht belegt. `averageBotSurvival` ist gruen, `avgStepsPerEpisode` rot. | `matrix_green_report.resultRules.evalStepsNonRegressionOk=false`, `holdoutStepsNonRegressionOk=false`; DQN Steps `117.525`; BT93I Eval `69.133333`, Holdout `71.75`. | PPO ueberlebt laenger pro interner Episodenlaenge, beendet aber Episoden frueher/anders oder die Messmatrix zaehlt Steps falsch. Terminal-Matrix rot macht Survival nicht interpretierbar. | Observation-Integrity gruen, Terminal-Matrix startfaehig, Eval-Rohsteps und Matrix-Aggregat stimmen, Oracle/Scripted-Policy zeigt vergleichbare Step-Zaehllogik. | Eval und Holdout `avgStepsPerEpisode >=117.525`, `averageBotSurvival >=48.590082`, Terminal-Matrix startfaehig, keine Mess-/Observation-Invaliditaet. |
| `F.19` | Terminal-/Death-Diagnostik unzureichend. | BT93I `terminalDeathMatrixStartCapable=false`. | Nicht-toedliche Natural-Terminals sind entweder im Environment/Mapping nicht erreichbar, in Python falsch gemappt, von der Policy nie erreicht oder von der Matrix falsch klassifiziert. | Scripted Provocation erzeugt `player-dead`, `match-ended`/gleichwertig, `max-steps`, forced round und timeout in Headless und Python mit identischen Feldern. | Eval/Holdout-Matrix trennt Death, Natural-Terminal, Max-Steps, forced round, timeout und Runtime-Failure. |
| `F.27` | PPO/DQN bleibt `ppo-regression`. | `precomparison_report.resultClass=ppo-regression`; `no_start_gate.claimChecks.precomparison_not_regression=false`; Evidence-Matrix stoppt F.05/F.19/F.27/F.31. | `F.27` ist aktuell Aggregat aus Steps-Regression plus roter Terminal-Matrix. Vergleichslogik kann nur eigene Hauptursache sein, wenn Rohinputs gruen sind und die Klassifizierung trotzdem falsch ist. | Unveraenderte Rohreports werden mit unabhaengigem Comparator reproduziert; bei identischen Inputs entsteht dasselbe Urteil oder ein Comparator-Bug wird isoliert. | `precomparison_report.json` aus BT93J-Artefakten schreibt nicht `ppo-regression`, Handover `ready=true`, `no_start_gate` gruen, keine offenen BT94A-Blocker. |
| `F.31` | Natural-Terminal-Matrix fehlt. | BT93I `playerDeadOnlyBlocksStart=true`; echte Eval/Holdout sehen keine nicht-toedlichen Natural-Terminals. | Provocation kann Feldvertrag beweisen, echte Eval/Holdout aber policy-dominiert oder Matrixfenster/config zu kurz/falsch. | Gleiche Semantikfenster, Seeds, Maps und `maxSteps` in Provocation und echter Eval; Oracle/Scripted-Policy erreicht Natural-Terminal in Eval-Runner. | Echte Eval und Holdout enthalten nicht-toedliche Natural-Terminals oder eine belegte Matrix-Regel erklaert, warum F.31 nicht mehr BT94A-blockierend ist. |

## BT93J.2 Observation-Integrity-Probes

DoD:

- `data/training/ppo/bt93j/observation_integrity_report.json` schreiben.
- Train, Eval, Holdout und Resume muessen gleiche Observation-Semantik beweisen.
- Pro Episode und pro Terminal-Klasse werden Observation-Qualitaetsmetriken berichtet.
- Ohne gruene Observation-Integritaet startet kein Long-run.

Pflicht-Probes:

- Schema: alle erwarteten Observation-Felder im PPO-Env vorhanden; Reihenfolge, Shape, Datentyp und Missing-Felder gegen Manifest pruefen.
- Ranges/Normalisierung: rohe Headless-Werte, Python-Adapter-Werte, VecNormalize-Input und Modell-Input mit erwarteten Min/Max/Scale vergleichen.
- Staleness: Positions-, Health-, Gefahr-, Terminal-, Reward- und Gegnerdaten duerfen nicht null, konstant, verzerrt oder um einen Step versetzt sein.
- Synchronitaet: gleiche Episode-ID, Step-ID, Seed, Map, Terminal-Reason und Reward-Step zwischen JS Headless-State, Python Env, Observation Adapter und PPO Input.
- VecNormalize: Train/Eval/Resume laden denselben Normalize-State oder schreiben absichtliche Drift mit Hash, Modus und Read-only-Status.
- Terminal-Klassen: Observation-Qualitaet fuer `player-dead`, `match-ended`/Natural-Terminal, `max-steps`, forced round und timeout getrennt.

Roter Befund:

- `diagnosticSplit.readyForRepair=true` nur fuer Observation-Fix.
- Kein Training, Pilot oder Long-run.
- Nach Observation-Fix muss BT93J.0.5 erneut laufen.

## BT93J.3 Terminal- und Death-Semantik-Probes

DoD:

- `data/training/ppo/bt93j/terminal_semantics_report.json` schreiben.
- Kleine Probes fuer `player-dead`, nicht-toedliches `match-ended` oder gleichwertiges Natural-Terminal, `max-steps`, forced round und timeout definieren.
- Headless und Python-Eval schreiben dieselben Felder und Klassifikationen.
- Der Bericht entscheidet, ob das Problem Environment/Mapping, Matrix oder Policy ist.
- Bei `player-dead-only` bleibt Repair-Pflicht vor jedem Eval-Vergleich.

Trennlogik:

- Scripted Headless ohne Policy beweist technische Erreichbarkeit der Terminal-Klassen.
- Python-Eval-Runner konsumiert dieselben Szenarien und schreibt identische `terminalReason`, `naturalTerminal`, `deathCause`, `maxSteps`, `forcedRound`, `timeout`, `runtimeFailure`.
- Oracle-/scripted-safe Policy laeuft gegen echte Eval-Konfiguration. Wenn Oracle Natural-Terminals erreicht, aber PPO nicht, ist Policy-Verhalten aktiv.
- Wenn Provocation gruen ist, echte Eval aber rot bleibt, prueft BT93J Semantikfenster, Episode-Laenge, Seeds, Maps und Matrixfilter auf Drift.

## BT93J.4 Eval- und Matrix-Vertrag

DoD:

- `data/training/ppo/bt93j/matrix_contract_report.json` schreiben.
- Matrix trennt Death, Natural-Terminal, Max-Steps und Runtime-Failures.
- Mindestepisoden, Seeds, Maps, Modi, `maxSteps`, DQN-Anker und Semantikfenster sind fixiert.
- `player-dead-only` und `max-steps-only` bleiben harte Blocker.
- Keine `F.05`-/`F.27`-Bewertung, solange `F.19`/`F.31` rot sind.

Matrix-Regeln:

- Eval mindestens `15` abgeschlossene Episoden, Holdout mindestens `8`.
- Steps-Non-Regression: Eval und Holdout `avgStepsPerEpisode >=117.525`.
- Survival: Eval und Holdout `averageBotSurvival >=48.590082`.
- Runtime: `runtimeErrorCount=0`; Crash, timeout, forced round und runtime failure separat.
- Terminal-Startfaehigkeit: echte Eval und Holdout duerfen weder `player-dead-only` noch `max-steps-only` sein.
- Holdout wird erst nach gruener Eval genutzt und danach nicht mehr auf denselben Seeds optimiert.

## BT93J.5 Action-/Policy-Diagnose

DoD:

- `data/training/ppo/bt93j/action_policy_diagnostics.json` schreiben.
- Pre-Sampling-Policy-Action, Action-Mask, Clamp, Veto, Sanitizer und final ausgefuehrte Action werden pro Step diffbar.
- Invalid-Action-Rate, Clamp-/Veto-/Sanitizer-Rate und Safety-Overrules werden pro Episode und Terminal-Klasse berichtet.
- Der Bericht zeigt, ob die Policy schlechte Entscheidungen trifft oder nachgelagerte Schutzlogik Verhalten verdeckt.

Schwellen fuer Readiness:

- `invalidActionRate=0`.
- `sanitizerRate=0`.
- `preSamplingMaskRate=1.0` oder begruendete gleichwertige Policy-Level-Maskierung.
- `postDecodeClampRate=0` fuer BT94A-ready; jeder Wert groesser `0` braucht Diagnose oder Downgate mit Artefakt.
- `vetoRate <0.25`; Veto darf Survival/Steps nicht primaer erzeugen.

## BT93J.6 Reward- und Curriculum-Diagnose

DoD:

- `data/training/ppo/bt93j/reward_curriculum_diagnostics.json` schreiben.
- Reward-Breakdown wird gegen Episode-Length, Death-Cause, Terminal-Klasse, Risk-Actions und Progress korreliert.
- Der Bericht prueft, ob Reward kurze Episoden, passives Ueberleben oder riskante Aktionen beguenstigt.
- Curriculum-Horizont, Gegnerdruck, Map-/Seed-Schwierigkeit, Timesteps, KL, Entropy, Value-Loss, Grad-Norm und Collapse-Metriken werden bewertet.
- Konkrete Repair-Hebel werden definiert, aber noch kein Langlauf gestartet.

Trennlogik:

- Wenn Reward steigt, aber Steps/Terminal-Matrix rot bleiben, ist Reward-Hacking oder Messinvaliditaet aktiv.
- Wenn Reward neutral evaluiert wird und Steps rot bleiben, liegt Fokus auf Policy/Training/Observation/Terminal.
- Wenn scripted/Oracle-Policy unter gleicher Reward-/Matrix-Logik gruen ist, ist Training/Curriculum wahrscheinlicher als Eval-Matrix.

## BT93J.7 Repair-Runde R1: Minimal Fix

DoD:

- R1 startet erst, wenn `diagnostic_split_report.json` eine konkrete Hauptursache benennt.
- R1 adressiert genau diese Hauptursache.
- Genau eine primaere Hypothese wird repariert.
- Kleine Aenderung, klare erwartete Wirkung, klarer Smoke-Test.
- Wenn die Hauptursache nach R1 nicht bestaetigt wird, wird die Kausalkette korrigiert, bevor R2 geplant wird.
- Wenn R1 neue rote Symptome erzeugt, wird nicht weitertrainiert; BT93J.0.5 laeuft erneut.

Erlaubte R1-Beispiele:

- Observation-Fix, wenn Schema/Range/Staleness/VecNormalize rot ist.
- Terminal-Mapping-Fix, wenn Headless/Python-Felder auseinanderlaufen.
- Matrix-Classifier-Fix, wenn Rohdaten gruen sind, aber Aggregation falsch klassifiziert.
- Action-Safety-Fix, wenn Clamp/Veto/Sanitizer Policy-Qualitaet verdeckt.
- Reward-/Curriculum-Fix erst nach gruener Observation-, Terminal-, Matrix- und Action-Diagnose.

## BT93J.8 Micro-Test nach R1

DoD:

- Kurzer technischer Lauf oder reine Diagnose-Reanalyse, passend zur Hauptursache.
- Ergebnis wird in `data/training/ppo/bt93j/r1_micro_test_report.json` klassifiziert: `green`, `same-red`, `new-red`, `inconclusive`.
- Bei `same-red`, `new-red` oder `inconclusive`: kein Pilot, keine Erweiterung, neue Analysephase mit gewonnenen Daten.
- Bei `green`: BT93J.0.5 erneut ausfuehren und Readiness neu bewerten.

## BT93J.9 Iterativer Diagnose-Repair-Test-Loop

DoD:

- Jede Iteration beginnt mit aktualisiertem `diagnostic_split_report.json`.
- Jede Iteration endet mit Entscheidung: `cause-confirmed`, `cause-refuted`, `new-cause`, `measurement-invalid`.
- Weitere Runden `R2`, `R3` nur mit neuer oder praezisierter Hypothese und neuer Evidence.
- Jede Runde dokumentiert Aenderung, erwartete Wirkung, Ergebnis, Entscheidung.
- Keine Wiederholung derselben Reparatur ohne neue Erkenntnis.
- Bei `cause-refuted`, `new-cause` oder `measurement-invalid` ist eine neue Analysephase Pflicht.
- Nach drei roten Runden ohne Metrikverbesserung: Eskalation statt Blindlauf.

Iterationsregel:

1. Neue Daten auswerten.
2. Kausalkette aktualisieren.
3. Hypothese aendern oder praezisieren.
4. Minimalen Fix planen.
5. Erneut klein testen.
6. Erst bei gruener Readiness eskalieren.

## BT93J.10 Pilot-Readiness

DoD:

- `data/training/ppo/bt93j/pilot_readiness_report.json` schreiben.
- Pilot nur erlaubt, wenn alle Bedingungen gruen sind:
  - Observation-Integritaet gruen.
  - Terminal-Matrix startfaehig.
  - Nicht `player-dead-only`.
  - Nicht `max-steps-only`.
  - Runtime-Fehler `0`.
  - Action-/Veto-/Invalid-Raten innerhalb Schwelle.
  - Micro-Test zeigt mindestens Trendverbesserung.
- `readyForTraining=false` blockiert Pilot und Long-run.

## BT93J.11 Pilot-Run

DoD:

- Begrenzter Pilot, kein Kandidat, kein Freeze.
- `run-kind=bt93j-pilot-repair` oder engerer Name, niemals `candidate`.
- Eval-Intervalle, Modell, Optimizer, VecNormalize, Config und Hashes versionieren.
- Keine Holdout-Nutzung vor stabiler Eval.
- Ergebnis in `data/training/ppo/bt93j/pilot_report.json` klassifizieren: `green`, `same-red`, `new-red`, `inconclusive`.
- Bei `same-red/new-red/inconclusive`: zur Diagnosephase zurueck.

## BT93J.12 Holdout-Schutz und Vergleich

DoD:

- Holdout erst nach gruener Eval.
- `data/training/ppo/bt93j/holdout_guard_report.json` nennt Train-Run-IDs, Holdout-Run-IDs, Seeds, Modellhash, Optimizer-Step und Optimizer-State-Hash vor/nach Holdout.
- Nach Holdout keine Optimierung auf denselben Seeds.
- PPO/DQN-Vergleich laeuft auf gleicher Matrix.
- `F.05` und `F.27` nur schliessen, wenn Steps-/Survival-Regeln gegen DQN erfuellt sind und `F.19`/`F.31` nicht mehr rot sind.

## BT93J.13 Long-run-Readiness

DoD:

- `data/training/ppo/bt93j/long_run_readiness_report.json` schreiben.
- Long-run nur erlauben, wenn:
  - `F.19` und `F.31` gruen.
  - `F.05` und `F.27` mindestens Trendverbesserung und keine harte Regression zeigen.
  - Observation-, Action-, Reward- und Terminal-Berichte gruen sind.
  - Early-Stop-Regeln aktiv sind.
  - Budget, Timesteps, Max-Dauer, Checkpoints und Eval-Intervalle fixiert sind.
- Long-run-Readiness ist kein BT94A-Claim und kein Candidate-Signal.

## BT93J.14 Laengerer Lauf

DoD:

- Laengerer Lauf nur nach BT93J.13.
- Kein Candidate, kein Freeze, kein Promote.
- Artefakte vollstaendig versionieren.
- Early stop bei Regression, Terminal-Matrix-Fehler, Reward-Hacking, Runtime-Fehlern, Observation-Drift oder Action-Safety-Regression.
- Nach Lauf immer Eval-Refresh, Holdout nur bei gruener Eval und aktivem Holdout-Schutz.

## BT93J.15 Gate-Refresh

DoD:

- `data/training/ppo/bt93c/precomparison_report.json`, `data/training/ppo/bt93c/handover_report.json`, `data/training/ppo/bt93c/evidence_quality_matrix.json` und `data/training/ppo/bt94a/no_start_gate.json` aus BT93J-Artefakten neu schreiben.
- BT94A oeffnet nur bei:
  - `claimable=true`.
  - `candidateRunsAllowed=true`.
  - `matrixDefinitionAllowed=true`.
  - `bt94aBlockerCount=0`.
  - `bt94aHandover.ready=true`.
  - `precomparison != ppo-regression`.
- Wenn Vergleichslogik selbst als Bug repariert wurde, muessen alte Rohinputs und neue Comparator-Outputs nebeneinander versioniert sein.

## BT93J.99 Abschluss-Gate

DoD:

- Erfolgreicher Abschluss nur, wenn alle vier Blocker `F.05/F.19/F.27/F.31` geschlossen oder nachweislich nicht mehr BT94A-blockierend sind.
- `data/training/ppo/bt94a/no_start_gate.json` ist gruen.
- Wenn irgendein Blocker rot bleibt, darf der Block nicht erfolgreich abgeschlossen werden.
- Dann Ergebnis: `diagnose-loop-required` oder `diagnose-blocked-escalation` mit konkreter naechster Hypothese, Fehlerbericht und Folge-Intake-Vorschlag.
- Governance-Gates gruen: `npm.cmd run plan:check`, `npm.cmd run docs:sync`, `npm.cmd run docs:check`.
- Plan-/Docs-Gates zaehlen nicht als PPO-Beweis.

## Closure-Evidence je Blocker

| Blocker | Darf schliessen, wenn | Darf nicht schliessen, wenn |
| --- | --- | --- |
| `F.05` | Eval und Holdout `avgStepsPerEpisode >=117.525`, `averageBotSurvival >=48.590082`, Terminal-Matrix startfaehig, Observation/Eval-Matrix nicht invalid, Holdout-Schutz gruen. | Nur `averageBotSurvival` gruen ist, Steps rot bleiben, Terminal-Matrix `player-dead-only` ist oder Vergleichsinputs invalid sind. |
| `F.19` | Headless und Python trennen `player-dead`, nicht-toedliches Natural-Terminal, `max-steps`, forced round, timeout und runtime failure; echte Eval/Holdout-Matrix startfaehig. | Nur Provocation gruen ist, echte Eval/Holdout aber weiterhin `player-dead-only` oder Mapping-Diff offen ist. |
| `F.27` | `precomparison_report.resultClass != ppo-regression`, `handover.ready=true`, `no_start_gate` gruen, `F.05/F.19/F.31` geschlossen oder nicht blockierend belegt. | `F.05`, `F.19` oder `F.31` rot bleiben; oder Comparator nur per Plantext umgedeutet wurde. |
| `F.31` | Echte Eval und Holdout nicht-toedliche Natural-Terminals sehen oder Matrix-Regel mit Rohdaten beweist, dass F.31 nicht mehr BT94A-blockierend ist. | Nur `player-dead` oder nur `max-steps` sichtbar ist, oder Provocation und echte Eval unterschiedliche Semantikfenster nutzen. |

## Risiko-Register

| Risiko | Severity | Mitigation | Trigger |
| --- | --- | --- | --- |
| Repair wiederholt Training ohne Root Cause | kritisch | BT93J.0.5 blockiert Repair/Training bis Hauptursache und Gegenprobe vorliegen. | `readyForRepair=false`, aber Fix/Lauf wird geplant. |
| Observation-Drift verfaelscht Steps | kritisch | BT93J.2 vor Terminal-/Reward-/Training-Fixes. | Stale/null/konstante/out-of-range Werte oder VecNormalize-Drift. |
| Terminal-Provocation ersetzt echte Eval | hoch | BT93J.3 fordert Provocation plus echte Eval/Holdout-Matrix. | Provocation gruen, echte Eval `player-dead-only`. |
| F.27 wird als Einzelbug behandelt | hoch | F.27 bleibt Aggregat, bis F.05/F.19/F.31 gruen oder Comparator-Bug isoliert ist. | `precomparison` wird umgedeutet, ohne Rohinput-Beweis. |
| Reward-Hacking kaschiert rote Steps | hoch | BT93J.6 korreliert Reward mit Steps, Death-Cause und Terminal-Klasse. | Reward steigt, Steps/Terminal bleiben rot. |
| Holdout wird entwertet | hoch | BT93J.12 erzwingt No-Optimization nach Holdout. | Training auf gleichen Holdout-Seeds nach Holdout. |
| Produktive Runtime wird versehentlich beruehrt | kritisch | Scope-Files und No-Go-Liste sind Gate-Bestandteil. | Matchstart-, AI-Hub-, Registry-, JS-Inference- oder Rollout-Datei wird geaendert. |
