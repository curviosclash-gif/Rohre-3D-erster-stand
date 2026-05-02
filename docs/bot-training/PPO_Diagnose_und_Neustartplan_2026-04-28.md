# PPO-Diagnose und Neustartplan 2026-04-28

## Kurzurteil

Das Problem ist nicht, dass PPO technisch nicht laeuft. Das Problem ist, dass wir PPO bisher ueberwiegend in einer Lernumgebung trainiert und bewertet haben, in der die fuer einen starken Bot relevanten Zielsignale nicht erreichbar oder nicht belastbar sind. Der Bot kann dabei laenger leben oder bis `maxSteps` kommen, ohne das eigentliche Spiel besser zu spielen. Genau deshalb sperrt der Plan BT94A: Ein Kandidaten-/Freeze-/Promotion-Pfad waere aktuell ein falsches positives Signal.

Die wichtigste Ursache ist die Kombination aus:

- Survival-only Reward dominiert die Lernerfahrung.
- Progress-/Objective-Rewards sind im echten Runner-Pfad praktisch tot.
- Terminal-Semantik bleibt player-dead-only oder max-step-dominiert.
- Action-Safety ist sauber, aber die Action-Semantik ist sehr eng und noch kein Beweis fuer spielstarke Entscheidungen.
- BT93K.6 war ein signal-gated `semantic-cycle`-Diagnose-Smoke, kein trainierter PPO-Qualitaetslauf.
- BT94A-No-Start ist deshalb korrekt: `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `precomparison=ppo-regression`.

## Datenbasis

Primaere Artefakte:

- `data/training/ppo/bt93j/user_owned_1m_longrun_report.json`
- `data/training/ppo/bt93j/post_longrun_decision_report.json`
- `data/training/ppo/bt93k/longrun_ladder_decision_report.json`
- `data/training/ppo/bt93k/handover_package.json`
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93j/reward_curriculum_diagnostics.json`
- `data/training/ppo/bt93j/diagnostic_split_report.json`
- `data/training/ppo/bt93i/matrix_green_report.json`
- `scripts/training-headless-lane-runner.mjs`
- `src/state/training/RewardCalculator.js`
- `python/envs/ppo_action_surface.py`
- `python/configs/ppo_bt93j_reward_curriculum_proof_lane.json`
- `python/configs/ppo_bt93k_longrun_ladder.json`

## Was ist das konkrete Problem?

### 1. PPO lernt, aber nicht das richtige Ziel

BT93J belegt echten PPO-Optimizer-Update und echte Modellpakete:

- `truePpoOptimizerUpdate=true`
- `truePpoModelPackage=true`
- Modell, VecNormalize und Optimizer-State sind versioniert.
- Stable-Baselines3-PPO-Metriken waren nicht kollabiert: `approx_kl` niedrig, `clip_fraction=0`, Entropy > Mindestschwelle, Grad-Norm innerhalb Grenze.

Das ist wichtig: Der technische Learner ist nicht der primaere Defekt. Der Lerner optimiert aber ein unzureichendes Signal.

BT93J 1M Longrun:

- `requestedTimesteps=1000000`
- `actualProgressTimesteps=1000000`
- `avgStepsPerEpisodeObserved=166.866667`
- DQN-Steps-Delta gegen Anker: `+49.341667`
- `naturalTerminalCount=0`
- `playerDeadOnly=true`
- Progress-/Objective-Rewards: `0`
- Result: `reward-still-blocking`

Das sieht auf den ersten Blick gut aus, weil Steps steigen. Es ist aber semantisch rot: Der Bot kommt haeufig bis `maxSteps` oder stirbt spaeter, aber er zeigt keine belastbare Objective-/Progress- oder Natural-Terminal-Kompetenz.

### 2. Progress-/Objective-Signale sind im echten Runner-Pfad tot

Der relevante Codepfad liegt in `scripts/training-headless-lane-runner.mjs`:

- `buildHeadlessTrainingRewardSignals(...)` setzt `parcoursEnabled` und `checkpointReached` nur, wenn `context.progressEvent === true`.
- `TrainingHeadlessLaneRunner.step(...)` uebergibt `progressEvent: input.progressEvent === true`.
- Der normale PPO-Pfad uebergibt beim `env.step(...)` aber nur eine Action, keinen echten `progressEvent`.
- BT93K.2 bestaetigt das: `progressEventReachableCount=0`, `progressReward=0`, `objectiveReward=0`, `noPhantomProgressOrObjective=true`.

Das bedeutet: Wir haben Reward-Gewichte fuer `checkpointReached`, `parcoursCompleted`, `win` und Objective definiert, aber der normale PPO-Runner erzeugt diese Signale nicht organisch. PPO kann kein Verhalten lernen, das in seinem Erlebnisstrom nicht vorkommt.

### 3. Survival-Reward dominiert die Lernaufgabe

In `BT93J_PROOF_REWARD_WEIGHTS`:

- `survival=0.04`
- `baseStep=-0.005`
- `loss=-4`
- `win=2.5`
- `checkpointReached=0.75`

Spaeter ab 250k Curriculum-Steps:

- `survival=0.03`
- `baseStep=-0.006`
- `loss=-4.5`
- `win=3`
- `checkpointReached=0.9`

Wenn keine Progress- und Objective-Events erreichbar sind, bleibt als wiederkehrender positiver Reward fast nur Survival. Der Bot lernt dann nicht "spiele gut", sondern "vermeide kurzfristigen Tod". Das ist ein Teilziel, aber kein exzellenter Bot.

### 4. Max-step-Plateau wurde zu lange als Erfolgsschatten toleriert

BT93J final:

- `completedEpisodeCount=15`
- `longestEpisode=180`
- viele Episoden mit `180`
- `maxSteps=12`
- `player-dead=3`
- `naturalTerminalCount=0`

Das ist besser als fruehe Tode, aber kein Beweis fuer Spielkompetenz. `maxSteps` ist eine truncation, kein Sieg. Ein Bot, der ueberlebt, aber keine Ziele erreicht, keine Gegner sinnvoll handhabt und keine natuerlichen Terminalzustande erzeugt, darf kein Kandidat werden.

### 5. BT93K beweist Infrastruktur, nicht PPO-Qualitaet

BT93K.6 nutzt laut `ppo_bt93k_longrun_ladder.json`:

- `actionPolicy=semantic-cycle`
- `trainingStarted=false`
- `qualityClaimAllowed=false`

Der 20k-Lauf ist deshalb ein Diagnose-Smoke:

- `totalStepsObserved=20000`
- `completedEpisodeCount=256`
- `avgStepsPerEpisodeObserved=78.015625`
- `playerDeadOnly=true`
- `naturalTerminalShare=0`
- `progressSignalNonZero=false`
- `objectiveSignalNonZero=false`
- `runtimeErrorCount=0`
- `invalidActionRate=0`
- `sanitizerRate=0`

Das ist kein Beweis, dass das letzte PPO-Modell schlechter geworden ist. Es beweist, dass unter einem simplen semantischen Aktionszyklus die Umgebung weiterhin tote Zielsignale und player-dead-only-Terminals produziert. Der Plan darf daraus keine Modellqualitaetsbewertung ableiten; er darf daraus aber korrekt ableiten, dass ein laengerer Blind-Run sinnlos ist.

### 6. Action-Safety ist gruen, aber Action-Qualitaet nicht bewiesen

Die aktuelle maskierte semantische Action-Surface hat neun Actions:

- `noop`
- `yaw-left`
- `yaw-right`
- `pitch-up`
- `pitch-down`
- `roll-left`
- `roll-right`
- `boost`
- `shoot-mg`

Das ist gut, um Invalid Actions, Sanitizer und Post-Decode-Clamps zu vermeiden. Es ist aber fuer einen exzellenten Bot wahrscheinlich zu arm. Ein starker Bot braucht wahrscheinlich kombinierte Aktionen, Kontextaktionen, Item-Aktionen, defensive Manöver und Ziel-/Combat-Intent, ohne wieder in invalid-action-chaos zu fallen.

### 7. CUDA ist nicht der Hebel

BT93K.5:

- CUDA-PyTorch ist verfuegbar.
- Torch-Benchmark verbessert sich deutlich.
- Env-Smoke-Wallclock verbessert sich nicht ausreichend (`envSmokeWallClockImprovement=-0.011358`).
- Result: `cuda-not-retained`.

Das ist logisch: Der Bottleneck liegt in JS-Headless-Env, Sidecar, Reset/Step-Latenz und Prozessmodell, nicht im PPO-Tensor-Rechnen. GPU hilft erst, wenn die Environment-Durchsatzkosten nicht dominieren oder wenn grosse Netze/Batches eingesetzt werden.

## Was fordert der Plan?

Der Plan fordert aktuell:

1. Kein BT94A-Claim, solange `BT93K.99` nicht `BT94A-ready` ist.
2. `data/training/ppo/bt94a/no_start_gate.json` muss `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `bt94aBlockerCount=0` und `precomparison != ppo-regression` schreiben.
3. Kein weiterer Blind-Longrun ohne Supervisor, finalen `run_exit_report.json`, Signal-Reachability und kleine 2/4/6-Env-Smokes.
4. Kein Qualitaetsurteil aus Durchsatz, CUDA, `plan:check`, Docs-Gates, `tmp/**` oder alten user-owned Spuren.
5. Holdout bleibt reserviert, solange kein echter Kandidaten-/Freeze-Kontext vorliegt.
6. Produktive Runtime-, AI-Hub-, Strategy-, Registry-, Rollback- und Matchstart-Surfaces bleiben read-only.
7. Progress, Objective, Natural-Terminal, Death-/Terminal-Matrix, Action-Safety und Survival muessen getrennt gemessen werden.

## Ist das sinnvoll?

Ja, im Kern ist es sinnvoll. Der Plan verhindert genau den Fehler, den wir mehrfach fast gemacht haben: laengere Survival oder technische gruenen Reports als PPO-Qualitaet zu lesen.

Die Forderungen sind zielfuehrend, weil:

- Sie verhindern, dass ein max-step-only Bot als gut gilt.
- Sie verhindern, dass ein scripted Smoke oder technische Infrastruktur als Kandidat missverstanden wird.
- Sie schuetzen Holdout-Seeds vor vorzeitiger Optimierung.
- Sie erzwingen, dass PPO gegen dieselbe Matrix wie der DQN-Anker bewertet wird.
- Sie halten Training, Runtime-Integration und Rollout sauber getrennt.
- Sie stoppen teure Langlaeufe, wenn die Signale tot sind.

Aber: Der Plan ist noch nicht ausreichend, um einen exzellenten PPO-Bot zu bekommen. Er ist ein guter Stop-Mechanismus, aber kein vollstaendiger Reparaturmechanismus. Er sagt praezise, warum wir nicht weiter eskalieren duerfen; er sagt noch nicht konkret genug, wie wir die Signal- und Aufgabenstruktur reparieren.

## Wo muss der Plan angepasst werden?

### Aenderung 1: BT93K.6 nicht als PPO-Modellregression lesen

Aktuell ist der BT93K-20k-Lauf ein `semantic-cycle`-Smoke. Die Planformulierung sollte klarstellen:

- `avgStepsPerEpisodeObserved=78.015625` ist ein Runner-/Signal-Smoke-Befund.
- Es ist keine direkte Bewertung des letzten trainierten PPO-Modells.
- Es blockiert Langlauf-Eskalation, aber es beweist nicht "PPO wurde schlechter".

### Aenderung 2: Progress-Reachability muss vor Reward-Tuning stehen

Neue harte Forderung:

- Kein Reward-Curriculum-Training, solange `progress_reachability_report.json` nicht zeigt, dass Progress-/Objective-Signale im echten `env.step`-Pfad ohne manuelles `input.progressEvent` erreichbar sind.

### Aenderung 3: Natural Terminal muss task-spezifisch definiert werden

`naturalTerminalShare>0` ist fuer Objective-/Match-Finish sinnvoll. Fuer reines Survival kann `maxSteps` eine gueltige truncation sein, aber kein Sieg. Der Plan sollte unterscheiden:

- Survival-Task: Ziel ist geringe fruehe Death-Rate, hohe Survival-Verteilung, keine max-step-only Fehlinterpretation, keine Objective-Behauptung.
- Objective-Task: Ziel ist echter `match-ended`, `win`, Checkpoint, Parcours oder Kampfziel.
- Candidate-Task: braucht beides: Survival stark plus mindestens ein belastbares Nicht-Death-Erfolgssignal.

### Aenderung 4: BT94A-Gate muss auf den neuesten Handover-Block zeigen

`no_start_gate.json` referenziert noch `BT93I` als current handover source. BT93K hat es bewusst nicht gruen umgedeutet, weil K nicht ready war. Fuer den naechsten Replan muss der Gate-Checker aber ein neues Handover-Artefakt akzeptieren, z.B. `BT93L`, sonst bleibt der Gate-Kontext semantisch alt.

### Aenderung 5: "Action-Safety gruen" darf nicht "Action-Semantik gut" bedeuten

Neue Forderung:

- Action-Safety bleibt Pflicht.
- Zusaetzlich braucht es Action-Effekt-Evidence: Welche Actions fuehren zu Distanzgewinn, Schaden, Ausweichen, Zielnaehe, kontrolliertem Turn/Boost, Item-Nutzung?

### Aenderung 6: CUDA bleibt optional, Env-Durchsatz wird primaerer Infra-Hebel

Planforderung:

- GPU erst wieder relevant, wenn env steps/sec nicht mehr Sidecar-dominiert sind.
- Vorher: Reset-Latenz, Sidecar-Reuse, vectorisierte Worker-Stabilitaet, Prozessstartkosten und Eval-Parallelismus optimieren.

## Was haben wir falsch gemacht?

### Fehler 1: Wir haben Infrastruktur zu lange mit Bot-Qualitaet verwechselt

BT90-BT93B/B/C haben wichtige Infrastruktur gebaut. Aber ein gruenes Scaffold, ein echter PPO-Update, ein Checkpoint und ein sauberer Build bedeuten nicht, dass der Bot gut wird. Wir haben zu oft die naechste Infrastrukturstufe erreicht und mussten danach feststellen, dass die semantische Aufgabe nicht lernbar genug war.

### Fehler 2: Wir haben lange Laeufe gestartet, bevor die Signale gesund waren

Der 1M-Longrun war technisch sauber und diagnostisch wertvoll, aber er kam zu frueh fuer einen Qualitaetsclaim. Er hat nicht Trainingserfolg bewiesen, sondern gezeigt, dass lange Laeufe das falsche Signal verstaerken koennen.

### Fehler 3: Survival wurde nicht hart genug von "Zielkompetenz" getrennt

Mehr Steps sind wichtig, aber nicht ausreichend. Der Bot muss ueberleben, ohne nur zu stagnieren. Survival ist eine notwendige Bedingung, keine hinreichende.

### Fehler 4: Progress-/Objective-Rewards wurden definiert, aber nicht erreichbar gemacht

Die Reward-Komponenten existieren. Die Berichte zeigen aber `progressReward=0` und `objectiveReward=0`. Das ist der zentrale technische Lernfehler.

### Fehler 5: Action-Surface wurde sicher gemacht, aber nicht stark genug

Die maskierte semantische Action-Surface hat Invalid-/Sanitizer-Probleme geloest. Sie ist aber wahrscheinlich zu grob, um exzellentes Verhalten zu lernen. Wir brauchen mehr semantische Aktionen oder eine hierarchische Action-Schicht, ohne die Safety-Gates aufzugeben.

### Fehler 6: Wir haben "maxSteps" nicht frueh genug als Diagnose-Falle behandelt

Max-step-Episoden sehen gut aus, weil sie lang sind. Wenn sie aber ohne Objective, ohne Natural-Terminal und ohne Progress entstehen, sind sie Plateau-Evidence, kein Champion-Signal.

### Fehler 7: Wir haben Evaluation und Training teilweise vermischt

Einige Reports koennen technische Gates, eval snapshots, longrun snapshots und Kandidatenlogik nebeneinander nennen. Der Plan hat das inzwischen korrigiert, aber der naechste Block muss noch schaerfer trennen:

- Diagnose
- Repair
- Training
- Candidate
- Holdout
- PPO-Validate
- Rollout

## Alle aktuellen Hauptbefunde

### Aktive Blocker aus BT93K/BT94A

| ID | Status | Befund | Konsequenz |
| --- | --- | --- | --- |
| F.05 | offen/kritisch | Survival-First ist nicht belastbar: BT93K-Smoke regressiert gegen Startmatrix; BT93J-Steps steigen, aber ohne Objective/Natural-Terminal. | Kein BT94A, kein Kandidat. |
| F.19 | offen/kritisch | Terminal-/Death-Matrix ist nicht startfaehig: `naturalTerminalCount=0`, player-dead-only in echten Terminalfaellen. | Terminal-Semantik braucht Ziel-/Success-Evidence. |
| F.27 | offen/kritisch | PPO-Vorvergleich bleibt `ppo-regression`. | BT94A bleibt geschlossen. |
| F.31 | offen/kritisch | Natural-Terminal-/Death-Evidence bleibt unzureichend. | Kein Freeze, kein Promote. |
| BT93K.signal-reachability | offen/hoch | `progressSignalNonZero=false`, `objectiveSignalNonZero=false`. | Erst Progress-Reachability reparieren. |
| BT94A.no-start-gate-red | offen/kritisch | `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`. | Replan/Folgeblock statt BT94A. |

### Plan-Audit F.01-F.37: aktueller Stand

| ID | Aktueller Stand | Bewertung |
| --- | --- | --- |
| F.01 | weitgehend geschlossen | Echtes PPO-Lernen ist inzwischen nachgewiesen. Nicht mehr Hauptproblem. |
| F.02 | weitgehend geschlossen | Requirements/Clean-Env sind versioniert. Weiter pflegen, aber nicht Hauptblocker. |
| F.03 | weitgehend geschlossen | SB3-trainierbare Action-Surface existiert. Qualitaetssemantik bleibt offen. |
| F.04 | weitgehend geschlossen | Modell/Optimizer/Normalize-State wurden gespeichert. |
| F.05 | offen | Survival-First ist semantisch nicht belegt. |
| F.06 | offen | Eigene PPO-Validate-Lane fehlt weiterhin. |
| F.07 | formal erledigt fuer Smokes | 4-Env-Smoke existiert, aber kein Qualitaetsbeweis. |
| F.08 | offen als Risiko | Durchsatz darf nicht Lernbeweis werden. |
| F.09 | geschlossen fuer alte Freeze-Falle | Neue Freigaben muessen weiterhin frisch sein. |
| F.10 | teilweise offen | Untracked user-owned Spuren existieren lokal weiter; sie sind quarantiniert. |
| F.11 | teilweise offen | `tmp/**` darf keine Closure-Evidence sein; Plan achtet darauf. |
| F.12 | teilweise offen | DQN-Anker/Seeds existieren, aber kein erfolgreicher apples-to-apples Kandidat. |
| F.13 | offen | Drei A/B-Laeufe waeren zu duenn; spaeter strengere Statistik noetig. |
| F.14 | offen | `bot:validate` ist nicht PPO-spezifisch genug. |
| F.15 | offen/spaeter | Runtime-Handoff bleibt separater Rollout-Block. |
| F.16 | geschlossen im Reporting | Begriffe `scaffold`, `pilot`, `baseline`, `candidate` werden besser getrennt. |
| F.17 | weitgehend geschlossen fuer echte Eval | Eval kann Modell laden; Validate-Lane fehlt trotzdem. |
| F.18 | offen | RuntimeError=0 ist in PPO-Validate noch nicht bewiesen. |
| F.19 | offen | Terminal-/Death-Matrix bleibt rot. |
| F.20 | weitgehend geschlossen fuer aktuelle Action-Safety | Safety-Telemetrie ist vorhanden; Action-Qualitaet offen. |
| F.21 | laufend | Draft-/Plan-Drift muss bei jedem Handover geprueft werden. |
| F.22 | offen als Governance-Risiko | Plancheck ist kein PPO-Beweis. |
| F.23 | verbessert | Evidence referenziert Artefakte; trotzdem weiter streng halten. |
| F.24 | teilweise offen | Kurze Smokes beweisen keine Langzeitstabilitaet. |
| F.25 | weitgehend geschlossen | Lokale venv-Pakete sind nicht mehr alleinige Wahrheit. |
| F.26 | verbessert | Baseline-Begriffe sind schaerfer, aber Candidate-Baseline fehlt. |
| F.27 | offen | PPO bleibt als Regression klassifiziert. |
| F.28 | offen/spaeter | `averageBotSurvival` aus interner Eval ist keine PPO-Validate-Evidence. |
| F.29 | korrekt offen | Holdout bleibt reserviert; das ist richtig. |
| F.30 | geschlossen fuer aktuelle maskierte Surface | Pre-sampling Masking ist per semantischer Vocabulary geloest; Action-Reichtum offen. |
| F.31 | offen | Natural-Terminal-/Death-Evidence fehlt. |
| F.32 | teilweise offen | Kleine Timesteps nicht mehr als Qualitaet lesen; echte Statistik fehlt noch. |
| F.33 | offen/spaeter | Freeze darf nicht auf mutable latest-Pointern beruhen. |
| F.34 | offen/spaeter | V101-Folgecheck bleibt vor Rollout/Kandidaten relevant. |
| F.35 | offen als Disziplinregel | Governance-Gates bleiben Nicht-Semantik. |
| F.36 | offen | Langzeitstabilitaet noch nicht bewiesen. |
| F.37 | offen | PPO-Validate-Bauort und Format fehlen. |

## Was ist nicht das Problem?

- Nicht primaer Git/Branch: `bot-training` ist synchron, letzter Push erfolgreich.
- Nicht primaer Build: `npm.cmd run build` war PASS.
- Nicht primaer Plan-Syntax: `gates:pre-commit` war PASS.
- Nicht primaer PPO-Optimizer-Kollaps: PPO-Metriken zeigen keinen KL-/Entropy-/Grad-Collapse.
- Nicht primaer Invalid Actions: aktuelle Action-Safety-Telemetrie ist sauber.
- Nicht primaer CUDA: GPU beschleunigt den env-dominierten Pfad nicht genug.
- Nicht primaer Terminal-Feld-Drift: BT93H isolierte `no-field-drift`; das Problem ist reale Coverage/Policy-Verhalten.

## Professioneller Weg zu einem exzellenten PPO-Bot

### Leitprinzip

Wir trainieren nicht laenger "mehr Steps". Wir trainieren eine messbare Aufgabe:

1. Ueberleben.
2. Bedrohungen aktiv reduzieren oder vermeiden.
3. Ziele/Progress erreichen.
4. Keine Safety-Regression.
5. Reproduzierbar gegen DQN und Holdout gewinnen.

### Neuer Folgeblock: BT93L Objective-Reachability und Survival-Task-Definition

BT93L sollte der naechste Block sein. Kein BT94A, kein Longrun, kein Freeze.

#### BT93L.1 Zieltyp und Metriktaxonomie einfrieren

Entscheidung: Welche Aufgabe soll der PPO-Bot exzellent loesen?

Empfehlung:

- Hauptziel: Survival-Combat in `hunt` und `classic` getrennt messen.
- Neben-/Curriculum-Ziel: kontrollierte Progress-/Objective-Probes in einer kleinen erreichbaren Map.
- Kein gemeinsames Urteil ueber Modi, solange `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` unterschiedliche Dynamik zeigen.

Artefakt:

- `data/training/ppo/bt93l/task_metric_contract.json`

Muss enthalten:

- `primaryMetric=avgStepsPerEpisode`
- `secondaryMetrics=deathBefore60Share, naturalTerminalShare/taskSuccessShare, progressSignalNonZero, objectiveSignalNonZero`
- klare Definition, wann `maxSteps` neutral, gut oder blockierend ist
- klare Definition, wann `match-ended` in Survival/Objective als Erfolg zaehlt

#### BT93L.2 Echte Progress-Reachability bauen

Der wichtigste Fix.

Heute:

- Progress kommt nur ueber `input.progressEvent`.
- PPO-Env liefert das nicht.

Neu:

- Progress muss aus echtem Runtime-/Training-State entstehen.
- Beispiele:
  - Distanzgewinn zu sicherer Zone / weg von Wand/Trail
  - laengere Zeit unter Gegnerdruck ohne Tod
  - Schaden ausgeteilt
  - Gegnerdistanz sinnvoll gehalten
  - Item aufgenommen/genutzt
  - Checkpoint/Parcours nur, wenn Map es wirklich unterstuetzt

Artefakte:

- `data/training/ppo/bt93l/progress_reachability_report.json`
- `data/training/ppo/bt93l/reward_signal_truth_table.json`

Gate:

- Scripted good-policy Probe muss Progress/Objective > 0 erzeugen.
- Noop/random Probe darf nicht dieselben Progresswerte erzeugen.
- PPO-Env-Step muss die Signale ohne manuelles `progressEvent` sehen.

#### BT93L.3 Reward neu kalibrieren

Ziel:

- Keine positive Qualitaetsinterpretation fuer player-dead-only.
- Keine max-step-only Promotion.
- Survival bleibt positiv, aber Ziel-/Threat-/Combat-/Progress-Signal wird lernwirksam.

Empfohlenes Reward-Design:

- kleiner Survival-Reward
- groesserer frueher Tod-Penalty, zeitabhaengig
- neutraler oder leicht positiver max-step-truncation Reward nur im reinen Survival-Smoke, nie als Objective-Erfolg
- positive Potential-Deltas statt rare sparse Events allein
- klare separate Komponenten fuer `safeDistanceDelta`, `threatReduction`, `damageDealt`, `damageTaken`, `objectiveProgress`, `terminalSuccess`

Artefakt:

- `data/training/ppo/bt93l/reward_balance_report.json`

Gate:

- Player-dead-only Episoden duerfen bei fruehem Tod netto klar negativ sein.
- Lange Survival ohne Progress darf nur als Survival-Teilziel gelten.
- Progress-/Objective-Komponenten muessen in Probe-Laeufen nonzero sein.

#### BT93L.4 Action-Semantik erweitern

Aktuelle 9 Actions sind sicher, aber arm.

Neue Action-Vocabulary:

- einfache Einzelaktionen behalten
- kombinierte Aktionen einfuehren: `turn-left-boost`, `turn-right-boost`, `evade-left`, `evade-right`, `aim-fire`, `brake/no-boost`, ggf. item-use nur bei Inventory
- Actions muessen weiterhin invalidActionRate=0, sanitizerRate=0, postDecodeClampRate=0 halten

Artefakt:

- `data/training/ppo/bt93l/action_effect_report.json`

Gate:

- jede neue Action muss in einem Probe-Lauf beobachtbare Wirkung haben
- keine Action darf nur Telemetrie-Noise sein

#### BT93L.5 Baseline neu setzen

Wir brauchen vier Baselines:

- Random/semantic-cycle baseline
- Noop baseline
- scripted heuristic baseline
- DQN champion baseline

Alle auf gleicher Seed-/Mode-/Map-Matrix.

Artefakt:

- `data/training/ppo/bt93l/baseline_matrix_report.json`

Gate:

- PPO wird spaeter nicht gegen historische oder fremde Semantik verglichen.
- DQN-Anker bleibt sichtbar, aber die neue Taskmatrix ist eindeutig.

#### BT93L.6 Micro-PPO nur nach Signal-Gruen

Erst wenn BT93L.2/3 gruen sind:

- 10k micro train
- 50k diagnostic train
- keine Holdout-Nutzung
- keine Candidate-Semantik

Metriken:

- reward component nonzero share
- avgSteps distribution
- deathBefore60Share
- progress/objective event count
- entropy / KL / value loss
- action distribution entropy
- repeated-action/collapse detector

Artefakt:

- `data/training/ppo/bt93l/micro_ppo_signal_report.json`

#### BT93L.7 Entscheidung

Ergebnisse:

- `BT94A-ready` nur, wenn PPO auf der neuen Matrix nicht regressiert und Zielsignale erreichbar sind.
- `diagnose-loop-required`, wenn Signale weiterhin tot sind.
- `reward-redesign-required`, wenn Progress erreichbar ist, PPO aber falsche Rewards ausnutzt.
- `action-space-required`, wenn Progress erreichbar ist, aber Actions keine Wirkung liefern.

### Danach: BT93M Training Candidate Build

Erst nach BT93L-Gruen:

- 4 Env CPU als Referenz.
- 6 Env nur, wenn 4 Env stabil.
- 200k -> 500k -> 1M Ladder.
- Keine 3M/1M Blindlaeufe ohne Zwischen-Gates.
- Hyperparameter-Sweep klein und begruendet:
  - `learning_rate`: 1e-4, 2.5e-4, 5e-4
  - `ent_coef`: 0.003, 0.01, 0.03
  - `n_steps`: 64, 128, 256
  - `net_arch`: [64,64], [128,128]
  - `gamma`: 0.98/0.99 je nach Survival-Horizont
- Early stop bei:
  - progress/objective wieder null
  - deathBefore60 steigt
  - action collapse
  - runtime errors
  - KL/entropy/value collapse

### Danach: BT94A Candidate Freeze

Nur wenn:

- PPO gewinnt medianbasiert gegen Random, Scripted und DQN-Anker.
- Holdout bleibt bis Freeze unangetastet.
- Keine Action-/Safety-Regression.
- Terminal-/Objective-Matrix task-spezifisch gruen.
- Modell, Config, Normalize, Optimizer, Hashes und immutable Run-ID vorhanden.

### Danach: BT94B PPO-Validate

Vor Promote:

- eigene PPO-Validate-Lane bauen
- Kandidat deterministisch laden
- `averageBotSurvival`, `avgStepsPerEpisode`, failure classes, runtime errors, action telemetry schreiben
- kein `promote` ohne PPO-Validate

### Danach: BT95 Rollout-Intake

Nur doc-only:

- Export/Load-Vertrag
- JS-Inference-Adapter
- Strategy-Flag
- Modellregistry
- Rollback
- Latenzbudget

## Konkrete naechste Aktion

Nicht BT94A. Nicht Longrun. Nicht CUDA. Nicht 4/6-Env-Training.

Naechster sinnvoller Schritt:

1. Einen neuen Planblock `BT93L Objective-Reachability und Survival-Task-Definition` anlegen oder vom User als Intake freigeben lassen.
2. Erste Subphase: `BT93L.1` Task-/Metrikvertrag.
3. Zweite Subphase: `BT93L.2` echte Progress-Reachability im Runner bauen.
4. Erst danach Reward-Tuning und PPO-Microtrain.

Der direkte Fix ist also nicht "mehr trainieren", sondern "die Aufgabe lernbar machen".

## Harte Stop-Regeln ab jetzt

- Kein Longrun, wenn Progress/Objective im echten Env-Step null bleibt.
- Kein Candidate, wenn `playerDeadOnly=true` in der Qualitaetsmatrix bleibt.
- Kein Claim, wenn `maxSteps` der einzige Survival-Gewinn ist.
- Kein Promote ohne PPO-Validate.
- Kein GPU-Fokus, solange Env-Step der Bottleneck ist.
- Kein Vergleich gegen DQN, wenn Matrix/Semantik nicht identisch ist.
- Kein Plan-Gruen als PPO-Gruen lesen.

## Schlussfolgerung

Der Weg zu einem exzellenten PPO-Bot ist vorhanden, aber er fuehrt nicht ueber den naechsten langen Lauf. Wir muessen zuerst die Lernaufgabe korrigieren: echte Progress-/Objective-Signale, task-spezifische Terminal-Semantik, bessere Action-Vocabulary und eine saubere Baseline-Matrix. Danach kann PPO sinnvoll trainieren, evaluiert werden und spaeter als Kandidat eingefroren werden.

Der Plan ist als Bremse richtig. Als Motor braucht er jetzt BT93L.
