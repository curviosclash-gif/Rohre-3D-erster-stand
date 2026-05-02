# BT93M bis BT94B PPO Root-Cause Replan Intake

Datum: 2026-04-29

Status: Intake-Vorschlag fuer user-owned Aufnahme in `docs/bot-training/Bot_Trainingsplan.md`.

Dieser Intake ist absichtlich groesser als ein einzelner Reparaturblock. Die letzten
Intakes haben jeweils echte Teilprobleme geloest, aber die Kette endet weiterhin
vor BT94A. Der neue Zuschnitt behebt die verbleibenden Root-Causes in getrennten
Phasen, mit harten Evidence-Gates und ohne Kandidaten-, Freeze-, Promote- oder
Rollout-Signal vor nachweisbarer Freigabe.

## Kurzurteil

Das aktuelle Problem liegt nicht daran, dass es "zu wenige Intakes" gab. Das
Problem liegt daran, dass der letzte gueltige Intake `BT93L` bewusst mit
`diagnose-loop-required` endete und vier konkrete Folgeprobleme offenliess:

1. `deathBefore60Count=1` im 10k-Micro-PPO-Trainingsfenster.
2. `extension50kAllowed=false`, also keine Freigabe fuer den naechsten groesseren
   Trainingsschritt.
3. `sameMatrixDqnAnchorPresent=false`, also kein belastbarer DQN-Anker auf exakt
   derselben BT93L-Matrix.
4. `data/training/ppo/bt94a/no_start_gate.json` bleibt rot:
   `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`,
   `candidateFreezeAllowed=false`, `precomparisonResultClass=ppo-regression`.

Der direkte Fehler in der operativen Schleife war deshalb: Der Plan nennt
`BT93M DeathBefore60-Stability und DQN-Same-Matrix-Anker`, aber dieser Block ist
noch nicht als aktiver Block mit Phasen, Scope, DoD und Lock-Header in den Master
aufgenommen. Nach Governance darf ein Agent diesen Master-Intake nicht still
selbst integrieren. Dieser Draft liefert die fehlende Grundlage.

## Beweisbasis

| Befund | Beleg | Relevante Felder |
| --- | --- | --- |
| BT93L endet nicht startfaehig | `data/training/ppo/bt93l/handover_package.json` | `resultClass=diagnose-loop-required`, `bt94aClaimAllowed=false`, `extension50kAllowed=false`, `sameMatrixDqnAnchorPresent=false`, `trainDeathBefore60Count=1` |
| Micro-PPO hat echte Signale, aber keine Erweiterungsfreigabe | `data/training/ppo/bt93l/micro_ppo_signal_report.json` | `resultClass=signal-green`, `trainSummary.deathBefore60Count=1`, `decision.extension50kAllowed=false`, `evalSummary.deathBefore60Count=0`, `runtimeErrorCount=0` |
| Progress-/Objective-Reachability ist inzwischen echt erreichbar | `data/training/ppo/bt93l/progress_reachability_report.json` | `resultClass=progress-reachability-green`, `realEnvStepPath=true`, `progressSignalReachable=true`, `objectiveSignalReachable=true`, `manualInjectionUsedAsEvidence=false` |
| Reward-Balance ist als Startsignal gruen, aber noch kein Qualitaetsbeweis | `data/training/ppo/bt93l/reward_balance_report.json` | `resultClass=reward-balance-green`, `pureDeathAvoidanceSuccessEligible=false`, `noopPlateauSuccessEligible=false`, `maxStepOnlySuccessEligible=false` |
| Action-Wirkung ist belegt, Action-Reichtum bleibt spaeter zu pruefen | `data/training/ppo/bt93l/action_effect_report.json` | `resultClass=action-effect-green`, `vocabularyDecision=no-extension-required`, `movementEffectiveActions` vorhanden |
| Same-Matrix-DQN-Anker fehlt | `data/training/ppo/bt93l/baseline_matrix_report.json` | `resultClass=baseline-matrix-frozen-dqn-anchor-missing`, `sameMatrixDqnAnchorPresent=false`, historische DQN-Reports sind nicht dieselbe Matrix |
| BT94A-Gate ist weiter rot | `data/training/ppo/bt94a/no_start_gate.json` | `resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `bt94aBlockerCount=4`, offene `F.05/F.19/F.27/F.31` |
| BT93J 1M war Diagnose, kein Erfolg | `data/training/ppo/bt93j/user_owned_1m_longrun_report.json` | `resultClass=reward-still-blocking`, `actualProgressTimesteps=1000000`, `naturalTerminalCount=0`, `playerDeadOnly=true`, Objective-/Progress-Rewards `0` |
| BT93K beweist Infrastruktur, aber keine Qualitaetsfreigabe | `data/training/ppo/bt93k/handover_package.json` | `resultClass=diagnose-loop-required`, `bt94aHandover.ready=false`, `remainingBlockers` enthaelt `F.05/F.19/F.27/F.31` |
| CUDA ist kein aktueller Hebel | `data/training/ppo/bt93k/cuda_benchmark_report.json` | `resultClass=cuda-not-retained`, `torchMedianWallClockImprovement=0.41452`, aber `envSmokeWallClockImprovement=-0.011358` |
| 2/4/6 Env-Smokes sind Infrastruktur, keine Qualitaet | `data/training/ppo/bt93k/env_scale_smoke_report.json` | `resultClass=env-scale-smoke-ready`, `envCounts=[2,4,6]`, `qualityClaimAllowed=false` |

## Kausalkette

1. `BT93C` bis `BT93I` haben echte PPO-Artefakte, Model-/Optimizer-/
   VecNormalize-State und Diagnosegates aufgebaut. Das loeste die fruehen
   Scaffold-/Reproduzierbarkeitsbefunde, aber nicht die Qualitaetsblocker.
2. `BT93J.5c` zeigte nach 1M Timesteps hoehere Survival-Steps, aber
   `naturalTerminalCount=0`, `playerDeadOnly=true` und keine Objective-/
   Progress-Rewards. Ursache: Der Bot ueberlebte laenger, ohne das Zielproblem
   belastbar zu loesen.
3. `BT93K` reparierte Supervisor, Mode-/Map-Smokes, 2/4/6-Env-Smokes und CUDA-
   Einordnung. Der 20k-Signal-Smoke blieb aber player-dead-only, ohne Progress
   und ohne Objective. Ergebnis: Infrastruktur ist startfaehiger, Qualitaet nicht.
4. `BT93L` fand die zentrale Verbesserung: Progress-/Objective-Signale sind im
   echten `env.step`-Pfad nun erreichbar, Reward-Balance verhindert Noop-/MaxStep-
   Fehlinterpretation, Action-Effekt ist messbar. Das ist echter Fortschritt.
5. Der erste 10k-Micro-PPO nach diesen Fixes ist `signal-green`, aber noch nicht
   stabil genug: ein frueher Tod im Train-Fenster blockiert die 50k-Erweiterung.
6. Parallel fehlt ein DQN-Anker auf derselben BT93L-Matrix. Ohne diesen Anker
   kann kein PPO/DQN-Vergleich, keine BT94A-Ablation und kein Kandidaten-Freeze
   sauber starten.
7. `bt94a_gate_check.py` liest aktuell weiter aus BT93C-/BT93I-Handover-
   Artefakten und erwartet `BT93I` als aktuelle Quelle, solange
   `data/training/ppo/bt93i/matrix_green_report.json` existiert. Fuer die
   Zukunft muss das Gate die neueste freigegebene Handover-Quelle aus BT93M+
   erkennen, ohne rote Ergebnisse umzudeuten.
8. Damit ist der naechste richtige Schritt kein weiterer Blind-Longrun, sondern
   ein mehrteiliger Replan: Gate-Wahrheit aktualisieren, DQN-Same-Matrix-Anker
   erzeugen, DeathBefore60 stabilisieren, Action-/Objective-Qualitaet stressen,
   dann erst eine laengere PPO-Leiter.

## Was bereits geloest ist

| Bereich | Stand |
| --- | --- |
| PPO laeuft technisch | Echtes PPO-Lernen, Modellpakete, Optimizer-State und VecNormalize wurden in frueheren Bloecken belegt. |
| Requirements/Clean-Env | Reproduzierbarkeit ist nicht mehr der primaere Blocker, muss aber bei neuen Runs weiter geprueft werden. |
| SB3-kompatible Action-Surface | Maskierte semantische Actions laufen mit `invalidActionRate=0`, `sanitizerRate=0`, `postDecodeClampRate=0` in den aktuellen Smokes. |
| Progress-Reachability | BT93L belegt `realEnvStepPath=true` und trennt manuelle Injektion von echter Evidence. |
| Reward-Balance | BT93L verhindert, dass Noop, MaxStep-only oder reine Todesvermeidung als Erfolg gelesen werden. |
| 2/4/6-Env-Smokes | Infrastruktur laeuft fuer kleine Env-Scale-Smokes, aber nicht als Qualitaetsbeweis. |
| CUDA-Entscheidung | GPU ist aktuell kein Fokus, weil der Pfad env-/Sidecar-dominiert bleibt. |

## Was noch offen ist

| Problem | Warum es blockiert | Loesungsblock |
| --- | --- | --- |
| Kein aktiver BT93M-Block im Master | Ohne Master-Intake darf kein Agent BT93M claimen. | User-owned Aufnahme dieses Drafts. |
| BT94A-Gate rot und teils stale zur neuesten Diagnose | Gate bleibt formal auf BT93I/BT93C-Kontext; spaetere Freigabe braucht neuen frischen Handover-Pfad. | `BT93M.1` |
| DQN-Same-Matrix-Anker fehlt | Ohne DQN-Anker gibt es keinen apples-to-apples Vergleich. | `BT93M.2` |
| Micro-PPO DeathBefore60 | `deathBefore60Count=1` blockiert 50k und BT94A-ready. | `BT93N` |
| PPO-Regression bleibt aggregiertes Urteil | `F.05/F.19/F.27/F.31` sind nicht geschlossen. | `BT93M` bis `BT93P` |
| Natural-Terminal-/Death-Matrix nicht startfaehig | Player-dead-only oder MaxStep-only darf kein Kandidat werden. | `BT93N`, `BT93O`, `BT93P` |
| Action-Reichtum nicht bewiesen | Aktuelle Actions sind sicher, aber fuer starke Spielkompetenz eventuell zu arm. | `BT93O` |
| Statistik fehlt | 10k/20k reichen nicht fuer Kandidatenqualitaet. | `BT93P`, danach `BT94A/B` |
| PPO-Validate fehlt | Kein Promote ohne eigene Validate-Lane. | `BT94B.3` |
| Rollout-/Runtime-Handoff fehlt | Keine operative Aktivierung ohne separaten Rollout-Block. | `BT95` plus separater Rollout-Intake |

## Vollstaendiger Befundabgleich F.01 bis F.37

| ID | Aktueller Status nach BT93L | Behandlung in diesem Intake |
| --- | --- | --- |
| F.01 | geschlossen, weiter bewachen | Modellpakete und Optimizer-Update in jedem neuen Run weiter hashen. |
| F.02 | geschlossen, weiter bewachen | Clean-Env-/Requirements-Smoke in Abschlussgates erhalten. |
| F.03 | geschlossen fuer Trainierbarkeit | Action-Qualitaet in `BT93O` stressen, nicht mit Action-Safety verwechseln. |
| F.04 | geschlossen, weiter bewachen | Normalize-/Optimizer-State in `BT93P` und BT94A immutable pinnen. |
| F.05 | aktiv blockierend | Survival-First mit gleicher Matrix, DeathBefore60, AvgSteps und Survival-Verteilung in `BT93N/P` beweisen. |
| F.06 | offen, spaeter hart | Eigene PPO-Validate-Lane in `BT94B.3`; kein Promote vorher. |
| F.07 | fuer Smokes gruen, fuer Qualitaet offen | 4/6-Env erst in `BT93P` als Leiter, nicht als Beweis aus BT93K lesen. |
| F.08 | Disziplinrisiko | Durchsatz/CUDA/Smokes bleiben keine Lernbeweise. |
| F.09 | geschlossen, aber frische Gates Pflicht | `BT93M.1` baut frische Gate-Wahrheit statt alter Freeze-Signale. |
| F.10 | lokal weiter riskant | Untracked user-owned Spuren bleiben Quarantaene, nicht Closure-Evidence. |
| F.11 | geschlossen als Regel | Nur `data/**` und `docs/**` sind Closure-Evidence; `tmp/**` nie. |
| F.12 | aktiv offen | DQN-Champion auf exakt derselben Matrix in `BT93M.2`. |
| F.13 | offen fuer Kandidatenphase | Mindestepisoden, Median, Streuung und Non-Inferiority in `BT93P/BT94A/B`. |
| F.14 | offen | PPO-spezifischer Validate-Report in `BT94B.3`. |
| F.15 | offen/spaeter | Keine Runtime-, Strategy-, Registry- oder Rollout-Aenderungen in BT93M-P. |
| F.16 | geschlossen als Reportingregel | Begriffe `diagnose`, `repair`, `baseline`, `candidate`, `freeze` bleiben getrennt. |
| F.17 | weitgehend geschlossen | Eval muss in `BT93P` echte Modellpakete laden und Hashes ausweisen. |
| F.18 | offen | Runtime-/Failure-Klassen in `BT93P`; PPO-Validate-Mapping in `BT94B.3`. |
| F.19 | aktiv blockierend | Terminal-/Death-Matrix mit Death-Traces und Natural-/Success-Klassen in `BT93N/O/P`. |
| F.20 | geschlossen fuer Telemetrie | Sanitizer-/Mask-/Veto-/Invalid-Raten weiter als harte Gates. |
| F.21 | laufend | `BT93M.1` pinnt Draft-/Plan-/Evidence-Drift. |
| F.22 | Disziplinregel | Plancheck bleibt Governance, kein Semantikbeweis. |
| F.23 | verbessert | Jeder Abschluss verweist auf konkrete Artefakte und Feldwerte. |
| F.24 | offen fuer Langzeit | `BT93P` fuehrt Failure-/Teardown-/Timeout-Klassen in laengeren Runs fort. |
| F.25 | geschlossen, weiter bewachen | Requirements und venv nicht als alleinige Wahrheit verwenden. |
| F.26 | verbessert, aber nicht fertig | Baseline-Begriff wird in `BT93M.2` mit Same-Matrix-DQN finalisiert. |
| F.27 | aktiv blockierend | Aggregat loest erst, wenn F.05/F.19/F.31 plus DQN-Same-Matrix geloest sind. |
| F.28 | offen/spaeter | Interne Eval-Survival bleibt keine PPO-Validate-Evidence. |
| F.29 | korrekt gesperrt | Holdout bleibt bis BT94A-Freeze reserviert. |
| F.30 | fuer aktuelle Surface geschlossen | `BT93O` prueft Policy-Mask/Clamp-Trennung bei Action-Erweiterungen erneut. |
| F.31 | aktiv blockierend | Nicht-death-/task-success-Evidence in echter Eval-Matrix erforderlich. |
| F.32 | offen | `BT93P` erzwingt groessere Episodenzahl und mehrere Seeds vor Qualitaetsurteil. |
| F.33 | offen fuer Freeze | `BT93P/BT94A` nur immutable Run-IDs, Hashes und Manifeste, kein `latest` allein. |
| F.34 | offen als Drift-Risiko | V101-/Authority-/Schema-Folgecheck in `BT93M.1` und vor BT94A. |
| F.35 | Disziplinregel | Governance-Gruen und PPO-Semantik bleiben getrennt. |
| F.36 | offen | Laengere Runs muessen Failure-Klassen und Stabilitaet versioniert belegen. |
| F.37 | offen | PPO-Validate-Bauort, Schema und Publish-Ziel in `BT94B.3`. |

## Intake-Zuschnitt

### Block BT93M: Gate-Wahrheit und DQN-Same-Matrix-Anker

Ziel: Den formalen Stillstand aufloesen, ohne BT94A faelschlich zu oeffnen. BT93M
aktualisiert Startwahrheit, Handover-Quellen und DQN-Anker auf derselben Matrix.

Nicht-Ziel:

- kein PPO-Kandidatenlauf,
- kein Freeze,
- keine Holdout-Nutzung,
- keine Runtime-/AI-Hub-/Strategy-/Registry-/Rollout-Aenderung.

Scope:

- `data/training/ppo/bt93m/**`
- `python/scripts/bt93m_*.py`
- `python/scripts/bt94a_gate_check.py`
- `python/scripts/bt93l_*.py` nur read-only oder fuer kompatible Quellenreferenz
- `python/configs/ppo_bt93m*.json`
- `docs/plaene/neu/**` nur Intake-/Berichtsdokumente

#### BT93M.1 Starttruth, Gate-Source und Evidence-Drift

- [ ] `bt93m_start_truth.json` schreiben mit BT93J/BT93K/BT93L/BT94A-Status.
- [ ] `bt94a_gate_check.py` so haerten, dass die erwartete Handover-Quelle nicht
  statisch `BT93I` bleibt, sondern den neuesten zugelassenen Handover-Pfad aus
  BT93M+ akzeptiert.
- [ ] Gate darf rote Resultate nicht weichzeichnen: Wenn neue Quelle rot ist,
  bleibt `claimable=false`, aber `currentHandoverSource.fresh=true` muss auf die
  richtige Quelle zeigen.
- [ ] Quarantaene lokaler user-owned 3M/4-Env-Spuren maschinenlesbar pinnen.
- [ ] V101-/Authority-/Schema-Folgecheck als `no-ppo-contract-drift` oder Blocker
  dokumentieren.

Evidence:

- `data/training/ppo/bt93m/start_truth.json`
- `data/training/ppo/bt93m/gate_source_freshness_report.json`
- `data/training/ppo/bt93m/evidence_quarantine_report.json`

Smoke:

- `python python/scripts/bt93m_start_truth.py --write-report`
- `python python/scripts/bt94a_gate_check.py --write-report`

Exit:

- `no_start_gate.json` ist weiterhin rot, aber frisch und nicht mehr semantisch
  an einen veralteten BT93I-Kontext gebunden.

#### BT93M.2 Same-Matrix-DQN-Anker

- [ ] DQN-Champion deterministisch laden oder ehrlich belegen, dass kein loader-
  faehiger DQN-Champion fuer diese Matrix vorhanden ist.
- [ ] Exakt dieselbe Matrix wie BT93L nutzen: Seeds, Mode, Map, Reward-Profil,
  Terminal-/Truncation-Semantik und maxSteps.
- [ ] DQN-Report mit Modell-/Config-/Matrixhash schreiben.
- [ ] Historische Reports (`data/bot_validation_report.json`,
  `data/performance_ki_baseline_report.json`) nur als Kontext, nicht als Anker.

Evidence:

- `data/training/ppo/bt93m/dqn_same_matrix_anchor_report.json`
- `data/training/ppo/bt93m/dqn_same_matrix_manifest.json`

Smoke:

- `python python/scripts/bt93m_dqn_same_matrix_anchor.py --write-report`

Exit:

- Entweder `sameMatrixDqnAnchorPresent=true`, oder ein harter Implementierungs-
  blocker mit konkretem Loader-/Artefaktproblem liegt vor. Es darf keinen
  Phantom-DQN-Anker geben.

#### BT93M.3 Comparator- und No-Start-Refresh

- [ ] `precomparison_report.json`, `handover_report.json` und
  `evidence_quality_matrix.json` aus BT93L/BT93M-Artefakten neu schreiben.
- [ ] `F.05/F.19/F.27/F.31` unverfaelscht weiterfuehren, solange die Rohwerte
  rot sind.
- [ ] `BT94A-ready` nur erlauben, wenn Gate-Inputs wirklich gruen sind.

Evidence:

- `data/training/ppo/bt93m/precomparison_refresh_report.json`
- `data/training/ppo/bt93m/handover_package.json`
- `data/training/ppo/bt94a/no_start_gate.json`

Exit:

- BT93M darf als `gate-fresh-dqn-anchor-ready`, `gate-fresh-dqn-anchor-blocked`
  oder `diagnose-loop-required` enden. Kein Candidate-Signal.

### Block BT93N: DeathBefore60-Stability und Terminal-Root-Cause

Ziel: Den unmittelbaren BT93L-Blocker `deathBefore60Count=1` nicht durch groessere
Runs ueberdecken, sondern ursachlich beseitigen.

Scope:

- `data/training/ppo/bt93n/**`
- `python/scripts/bt93n_*.py`
- `python/configs/ppo_bt93n*.json`
- `python/envs/ppo_action_surface.py` nur falls Death-Traces Action-Surface als
  Ursache belegen
- `scripts/training-headless-lane-runner.mjs`
- `src/state/training/RewardCalculator.js`
- `src/state/training/EpisodeController.js`
- `tests/training-*.mjs`
- `python/tests/test_ppo_action_surface.py`, `python/tests/test_curvios_env.py`

#### BT93N.1 Death Trace Instrumentation

- [ ] Fuer jeden Tod vor Step 60 die letzten N Beobachtungen, Actions, Rewards,
  Action-Safety, Wall-/Trail-/Threat-Metriken, Position-/Heading-Delta,
  Progress-/Objective-Signale und TerminalReason schreiben.
- [ ] Todesklassen trennen: wall/trail, opponent/projectile, self-stall/noop,
  action-collapse, reset/spawn-risk, runtime/bridge.
- [ ] Kein Reward-Fix, bevor die dominante Klasse sichtbar ist.

Evidence:

- `data/training/ppo/bt93n/death_before60_trace_report.json`
- `data/training/ppo/bt93n/death_before60_trace_samples.jsonl`

Smoke:

- `python python/scripts/bt93n_death_trace_probe.py --write-report --episodes 30`

Exit:

- Mindestens eine dominante Ursache ist belegt oder `measurement-invalid`.

#### BT93N.2 Stabilitaetsfix nach Ursache

Erlaubte Fix-Klassen:

- Reward-Fix: frueher Tod zeitabhaengig staerker negativ, aber keine Noop- oder
  MaxStep-Fehlbelohnung.
- Curriculum-Fix: sichere Startfenster, graduelle Gefahr, erst danach volle Matrix.
- Action-Fix: nur wenn Traces zeigen, dass vorhandene Actions nicht ausweichen,
  bremsen, drehen oder entkommen koennen.
- Terminal-Fix: nur wenn `player-dead`, `max-steps`, `match-ended` oder
  `truncated` falsch klassifiziert werden.
- Runner-Fix: nur wenn Bridge/Env/Reset einen Todesartefakt erzeugt.

Evidence:

- `data/training/ppo/bt93n/stability_fix_report.json`
- `data/training/ppo/bt93n/reward_terminal_delta_report.json`

JS/Node Smoke:

- `node --test tests/training-reward-survival.test.mjs tests/training-environment.contract.test.mjs`

Python Smoke:

- `python -m pytest python/tests/test_ppo_action_surface.py python/tests/test_curvios_env.py`

#### BT93N.3 Micro-PPO Wiederholung

- [ ] 10k Micro-PPO mit gleicher BT93L-Matrix wiederholen.
- [ ] Keine 50k-Erweiterung, solange Train+Eval `deathBefore60Count` nicht null
  sind oder ein vorab definierter statistischer Korridor nicht erfuellt ist.
- [ ] `runtimeErrorCount=0`, `invalidActionRate=0`, `postDecodeClampRate=0`,
  `sanitizerRate=0`.
- [ ] Progress-/Objective-Signal darf nicht wieder auf null fallen.

Evidence:

- `data/training/ppo/bt93n/micro_ppo_stability_report.json`

Command:

- `python python/scripts/bt93n_micro_ppo_stability.py --write-report --total-timesteps 10000`

Exit:

- `death-before60-clear` oder `death-before60-still-blocking`.

#### BT93N.4 50k/100k Stability Ladder

- [ ] 50k nur nach gruenem 10k.
- [ ] 100k nur nach gruenem 50k.
- [ ] Keine Holdout-Nutzung.
- [ ] Jede Stufe schreibt Modellhash, ConfigHash, VecNormalizeHash,
  OptimizerHash, Reward-Breakdown, KL/Entropy/Clip/Value/GradNorm,
  DeathBefore60, Terminal-Klassen, Progress-/Objective-Raten und Action-Entropy.

Evidence:

- `data/training/ppo/bt93n/stability_ladder_report.json`
- `data/training/ppo/bt93n/runs/**`

Exit:

- `stability-ladder-green`, `reward-redesign-required`,
  `action-space-required`, `terminal-semantics-required` oder
  `diagnose-loop-required`.

### Block BT93O: Action-Quality, Objective-Quality und Anti-Plateau

Ziel: Verhindern, dass ein sicherer, aber schwacher Bot spaeter als stark gelesen
wird. BT93O erweitert oder bestaetigt die Action-/Objective-Qualitaet mit
kontrollierten Smokes.

#### BT93O.1 Action-Effekt-Stresstest

- [ ] Bestehende Actions gegen mehrere Szenarioklassen testen: Wandnaehe,
  Gegnerdruck, Zielausrichtung, Boost-Fenster, Schussfenster, Item-/Inventory-
  Verfuegbarkeit.
- [ ] Falls schwache Klassen sichtbar sind, neue semantische Kombinationsactions
  nur im Trainings-Sidecar einfuehren, z.B. `turn-left-boost`,
  `turn-right-boost`, `evade-left`, `evade-right`, `aim-fire`, `brake`.
- [ ] Jede neue Action muss realen Effekt zeigen und Safety-Raten gruen halten.

Evidence:

- `data/training/ppo/bt93o/action_quality_stress_report.json`
- `data/training/ppo/bt93o/action_vocabulary_decision.json`

Exit:

- `no-extension-required`, `action-vocabulary-extended` oder
  `action-space-required`.

#### BT93O.2 Objective-/Progress-Qualitaet

- [ ] Positive Controls muessen Objective/Progress erreichen.
- [ ] Noop und MaxStep-only duerfen nicht success-eligible sein.
- [ ] Random darf nicht dieselbe Signalqualitaet wie scripted/learned erreichen.
- [ ] Progress muss in echter Env-Step-Telemetrie auftauchen, nicht nur in
  synthetischen Kontexten.

Evidence:

- `data/training/ppo/bt93o/objective_quality_report.json`

Exit:

- `objective-quality-green` oder `measurement-invalid`.

#### BT93O.3 Anti-Collapse und Anti-Plateau

- [ ] Action-Distribution-Entropy, repeated-action streaks, noopShare,
  boostShare, aim/fireShare und progress-per-action reporten.
- [ ] MaxStep-only darf nur als Survival-Teilziel gelten, nicht als Objective-
  oder Candidate-Erfolg.
- [ ] Reward steigt bei schlechterer Semantik fuehrt zu
  `reward-redesign-required`.

Evidence:

- `data/training/ppo/bt93o/collapse_plateau_report.json`

### Block BT93P: PPO Trainingsleiter mit belastbarer Statistik

Ziel: Erst nach BT93M/N/O-Gates eine laengere PPO-Leiter fahren, die genug Daten
fuer ein BT94A-Claim-Signal liefern kann.

Nicht-Ziel:

- kein Freeze in BT93P,
- kein Promote,
- kein Rollout,
- Holdout nur, wenn der Plan es explizit fuer den spaeteren Freeze erlaubt.

#### BT93P.1 200k Diagnostic Run

- [ ] 2 Env CPU Referenz, feste Seeds, feste Matrix, immutable Run-ID.
- [ ] Eval auf derselben Matrix plus separater Non-Holdout-Check.
- [ ] Gate: keine Runtime Errors, keine Safety Regression, DeathBefore60 stabil,
  Progress-/Objective nicht null, AvgSteps nicht regressiv.

Evidence:

- `data/training/ppo/bt93p/diagnostic_200k_report.json`

#### BT93P.2 500k Confirmation Run

- [ ] Nur wenn 200k gruen.
- [ ] Optional 4 Env, wenn 2/4 Env keine semantischen Unterschiede zeigen.
- [ ] Median ueber mehrere Eval-Seeds, Streuung und Failure-Klassen ausweisen.

Evidence:

- `data/training/ppo/bt93p/confirmation_500k_report.json`

#### BT93P.3 1M Evidence Run

- [ ] Nur wenn 500k gruen.
- [ ] Finaler Runner-Report ist Pflicht; Snapshots allein reichen nicht.
- [ ] 3M nur als spaeterer Zusatz, nicht vor gruenem 1M und nicht ohne Stop-/
  Resume-/Final-Report-Mechanik.

Evidence:

- `data/training/ppo/bt93p/evidence_1m_report.json`
- `data/training/ppo/bt93p/handover_package.json`

#### BT93P.4 Fresh BT94A Claim Check

- [ ] `bt94a_gate_check.py --write-report` nur nach gruenem Handover ausfuehren.
- [ ] BT94A claimbar nur bei:
  - `claimable=true`
  - `candidateRunsAllowed=true`
  - `matrixDefinitionAllowed=true`
  - `bt94aHandover.ready=true`
  - `precomparison != ppo-regression`
  - `bt94aBlockerCount=0`
  - Same-Matrix-DQN-Anker vorhanden
  - Death-/Terminal-/Objective-/Action-/Runtime-Gates gruen

Exit:

- `BT94A-ready`, `diagnose-loop-required`, `reward-redesign-required`,
  `action-space-required`, `terminal-semantics-required`, `dqn-anchor-blocked`.

### Block BT94A: Candidate Freeze und Ablationen

BT94A bleibt als vorhandener geplanter Block erhalten, startet aber erst nach
`BT93P.4=BT94A-ready`.

Zusaetzliche Scharfstellung:

- Keine Ablation ohne DQN-Same-Matrix-Anker.
- Keine Kandidatenlaeufe ohne `bt94aBlockerCount=0`.
- Holdout wird erst in Freeze-Kontext verbraucht, mit dokumentierter
  Nicht-Nachoptimierung.
- Genau ein Freeze-Kandidat mit immutable Run-ID, ModelHash, ConfigHash,
  VecNormalizeHash, OptimizerHash, Matrix-ID und Semantikfenster.

### Block BT94B: Externe A/B-Evidence und PPO-Validate

BT94B bleibt blockierend fuer Promote.

Zusatzpflicht:

- `BT94B.3` baut die PPO-Validate-Lane konkret:
  - Candidate laden,
  - Normalize-State laden,
  - Config/Matrix/Seeds/Maps/Modes pinnen,
  - `avgStepsPerEpisode`, `averageBotSurvival`, `runtimeErrorCount`,
    Crash/Timeout/Forced, Natural-/Death-Klassen, Safety-Raten und Hashes
    versioniert schreiben.
- `promote` ohne gruene PPO-Validate bleibt verboten.

## Mindest-Gates pro Block

| Block | Harte Gates |
| --- | --- |
| BT93M | frischer Gate-Source-Report, DQN-Same-Matrix-Anker oder harter Loader-Blocker, No-Start nicht weichgezeichnet |
| BT93N | DeathBefore60-Root-Cause belegt, 10k gruen vor 50k, 50k gruen vor 100k, keine Safety-/Runtime-Regression |
| BT93O | Action-/Objective-Qualitaet belegt, Noop/MaxStep-only nicht success-eligible, keine Clamp-/Mask-Verwechslung |
| BT93P | 200k -> 500k -> 1M Leiter mit Zwischen-Gates, versionierte Reports, ausreichende Episoden/Seeds, keine Holdout-Verunreinigung |
| BT94A | `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aBlockerCount=0`, Freeze nur mit immutable Artefakten |
| BT94B | externe A/B-Evidence plus PPO-Validate; kein Promote ohne Validate |

## Stop-Regeln

- Kein weiterer Blind-Longrun ohne DeathBefore60- und Same-Matrix-DQN-Gate.
- Kein BT94A-Claim, solange `no_start_gate.json` rot ist.
- Kein Candidate, Freeze, Promote, Rollout oder BT95-Handoff in BT93M-P.
- Kein Holdout-Verbrauch vor BT94A-Freeze-Kontext.
- Kein `latest_*` als alleinige Evidence.
- Kein `tmp/**` als Closure-Evidence.
- Kein `plan:check` oder `docs:check` als PPO-Qualitaetsbeweis.
- Kein CUDA-Fokus, solange Env-Wallclock nicht messbar gewinnt.
- Keine produktive Runtime-, Matchstart-, AI-Hub-, Strategy-, Registry-,
  Rollback- oder Rollout-Aenderung in BT93M-P.

## Empfohlene Master-Aufnahme

In `docs/bot-training/Bot_Trainingsplan.md` sollte nicht nur ein einzelnes
`BT93M` mit offenem Ende aufgenommen werden. Sinnvoll ist eine zusammenhaengende
Reparaturkette:

1. `BT93M Gate-Wahrheit und DQN-Same-Matrix-Anker`
2. `BT93N DeathBefore60-Stability und Terminal-Root-Cause`
3. `BT93O Action-/Objective-Quality und Anti-Plateau`
4. `BT93P PPO Trainingsleiter und BT94A-Reentry-Gate`
5. Danach erst vorhandenes `BT94A`
6. Danach vorhandenes `BT94B`

Damit wird nicht wieder nur ein Symptom repariert. Die Kette schliesst die
formale Gate-Quelle, den fehlenden Vergleichsanker, den fruehen Tod, die
Terminal-/Objective-Semantik, Action-Qualitaet, Statistik und PPO-Validate
schrittweise mit klaren Stop-Gates.

## Naechste konkrete Aktion nach User-Intake

Nach manueller Aufnahme von `BT93M` in den aktiven Bot-Trainingsplan:

1. `/fix-planung` claimt `BT93M`.
2. Erste Subphase ist `BT93M.1 Starttruth, Gate-Source und Evidence-Drift`.
3. Erwartete erste Code-Aenderung:
   - neues `python/scripts/bt93m_start_truth.py`
   - neues `data/training/ppo/bt93m/start_truth.json`
   - Haertung von `python/scripts/bt94a_gate_check.py`, damit die aktuelle
     Handover-Quelle nicht hart auf BT93I eingefroren bleibt.
4. Abschluss der ersten Subphase nur mit `npm.cmd run gates:pre-commit` und
   versionierter Evidence.
