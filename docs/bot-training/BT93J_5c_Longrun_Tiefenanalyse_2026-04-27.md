# BT93J.5c Longrun-Tiefenanalyse

Datum: 2026-04-27  
Branch: `bot-training`  
Run: `20260426T175502Z-bt93j-user-owned-1m-proof-longrun`  
Primaerartefakt: `data/training/ppo/bt93j/user_owned_1m_longrun_report.json`  
Status: Analysebericht, kein neuer Trainingslauf, kein BT94A-Claim, kein Candidate, kein Freeze, kein Promote.

## Kurzurteil

Der 1M-Run ist technisch gueltig, aber fachlich weiterhin rot. Das Problem ist nicht primaer DQN-Unterlegenheit, PPO-Collapse, Runtime-Crash oder Action-Invaliditaet. Das Problem ist: Die Policy hat gelernt, im aktuellen Headless-Survival-Korridor lange genug zu ueberleben, aber sie erzeugt keine natuerlichen Terminale, keine Progress-Events, keine Siege, keine Kills, keine Item-/Combat-Wirkung und keine belegte Zielkompetenz.

Ja, der finale PPO-Snapshot ist in dieser Eval-Lane bei `avgStepsPerEpisodeObserved=166.866667` besser als der gepinnte DQN-Steps-Anker `117.525`. Nein, das reicht nicht fuer BT94A, weil `naturalTerminalCount=0`, `terminalDiversified=false`, keine Holdout-Evidence genutzt wurde, das Resultat als `reward-still-blocking` klassifiziert ist und BT93J.6 laut Plan nur nach `green-for-93J.6` starten darf.

Das lokale Optimum ist sehr wahrscheinlich real: "nicht sterben bis nahe maxSteps" wird belohnt, waehrend Ziel-, Progress-, Natural-Terminal- und Mode-Diversitaet praktisch nicht gelernt oder nicht erreicht werden. Der Bot ist dadurch robuster als die frueheren roten PPO-Lanes und in dieser Metrik besser als DQN, aber noch nicht schlauer im Sinne von Spielziel-Erfuellung.

## Harte Evidence

| Punkt | Beobachtung | Quelle |
| --- | ---: | --- |
| Resultatklasse | `reward-still-blocking` | `user_owned_1m_longrun_report.json` |
| Requested Timesteps | `1000000` | Report |
| Actual Progress Timesteps | `1000000` | Report |
| Model Timesteps | `1004992` | Report |
| Snapshot-Cadence | `20/20`, `missingSteps=[]` | Report |
| Technische Gates | `allSnapshotGatesOk=true` | Report |
| Final Avg Steps | `166.866667` | Report |
| Delta vs DQN Steps Anchor | `+49.341667` | Report |
| Delta vs Start Avg Steps | `+94.033334` | Report |
| Final natural terminals | `0` | Report |
| Final terminal diversity | `false` | Report |
| Final terminal reasons | `player-dead: 3` | Report |
| Final max-step episodes | `12` | Report |
| Final episode lengths | `180,180,180,180,180,180,59,180,180,108,176,180,180,180,180` | Report |

Snapshot-Avg-Steps:

| Step | AvgSteps |
| ---: | ---: |
| 50k | 150.200000 |
| 100k | 125.266667 |
| 150k | 148.400000 |
| 200k | 172.400000 |
| 250k | 159.866667 |
| 300k | 155.000000 |
| 350k | 171.400000 |
| 400k | 154.200000 |
| 450k | 138.866667 |
| 500k | 173.200000 |
| 550k | 136.333333 |
| 600k | 119.466667 |
| 650k | 174.600000 |
| 700k | 148.133333 |
| 750k | 167.066667 |
| 800k | 170.933333 |
| 850k | 169.000000 |
| 900k | 166.333333 |
| 950k | 138.333333 |
| 1000k | 166.866667 |

Aggregate ueber 20 Snapshot-Evals:

| Metrik | Wert |
| --- | ---: |
| AvgSteps min | `119.466667` |
| AvgSteps max | `174.600000` |
| AvgSteps mean | `155.293333` |
| AvgSteps median | `157.433334` |
| AvgSteps stdev | `16.311664` |
| Completed Episodes | `300` |
| Episodes mit Laenge 180 | `221` |
| Player-dead Terminals | `80` |
| Max-step Truncations | `220` |
| Natural Terminals | `0` |
| Positive Progress Reward | `0` |

Reward-Aggregat ueber 20 Snapshot-Evals:

| Komponente | Summe |
| --- | ---: |
| `survival` | `1921.84` |
| `baseStep` | `-241.73` |
| `loss` | `-320.00` |
| `checkpointReached` | `0` |
| `parcoursCompleted` | `0` |
| `win` | `0` |
| `kill` | `0` |
| `damageDealt` | `0` |
| `damageTaken` | `0` |
| `itemPickup` | `0` |
| `itemUse` | `0` |
| `wallRisk` | `0` |
| `trailRisk` | `0` |
| `opponentRisk` | `0` |
| `lowHealthThreat` | `0` |

Action-/Safety-Aggregat ueber 20 Snapshot-Evals:

| Metrik | Wert |
| --- | ---: |
| Total Actions | `48346` |
| Invalid Actions | `0` |
| Pre-Sampling Mask Count | `48346` |
| Post-Decode Clamp Count | `0` |
| Veto Count | `0` |
| Sanitizer Count | `0` |
| Noop Count | `265` |

PPO-Learning-Metriken:

| Metrik | Wert |
| --- | ---: |
| `policy_loss` | `-0.0008942432` |
| `value_loss` | `0.8309706966` |
| `entropy` | `0.9406925291` |
| `approx_kl` | `0.0000551324` |
| `clip_fraction` | `0` |
| `explained_variance` | `0.2905117273` |
| `grad_norm.globalNorm` | `0.5` |
| Collapse/Instability | `false` |

## Woran scheitert es genau?

Es scheitert an der Kombination aus Reward-Semantik, Curriculum-Uhr, nicht erreichter Progress-Signalisierung, fehlender natuerlicher Terminal-Diversitaet und einem Headless-Environment, das aktuell nicht wirklich die angekuendigte Mode-/Map-Matrix trainiert. PPO optimiert das, was es sieht: lange leben. Es bekommt aber fast keine verwertbaren Signale dafuer, wie es Spielziele erreicht, Gegner sinnvoll adressiert, Progress macht oder nicht-toedlich terminiert.

Die technische Trainingspipeline funktioniert: Checkpoints, Eval-Snapshots, Optimizer-Updates, Action-Mask und Artefaktpersistenz sind gruen. Gerade deshalb ist der Befund ernst: Der Run ist nicht "kaputt gemessen", sondern zeigt, dass die aktuelle Lernaufgabe den Bot in ein Survival-Plateau fuehrt.

## Wie lernt der Bot gerade?

Der Bot lernt aktuell ueber den PPO-Zweitpfad des Bot-Trainingsplans, nicht ueber eine produktive In-Game-Runtime-Umschaltung. Konkret:

1. Python startet `stable_baselines3.PPO`.
2. PPO sieht eine Gym-Umgebung `CurviosEnv`.
3. `CurviosEnv` startet pro Env einen Node-Sidecar ueber `scripts/training-single-env-bridge.mjs`.
4. Der Sidecar nutzt `scripts/training-headless-lane-runner.mjs`.
5. Dieser Runner erzeugt eine Headless-Match-Kernel-Runtime ueber `createHeadlessMatchKernelRuntime()`.
6. Daraus entstehen Observations, Rewards, Done-/Truncation-Flags und Info-Telemetry.
7. PPO waehlt diskrete semantische Actions aus der maskierten Action-Oberflaeche.
8. Die Actions werden in den Headless-Kernel eingespeist.
9. Der Reward kommt aus der Headless-Reward-Funktion und wird im PPO-Optimizer verarbeitet.

Das ist mehr als ein reiner Fake-Smoke: Es verwendet den JS-nahen Headless-Match-Kernel und den Match-Kernel-Training-Adapter. Es ist aber noch nicht identisch mit "der Bot laeuft im finalen Spiel als produktive KI". Der aktuelle Trainingspfad ist `runtime-near-headless-v1`: nahe an der Runtime, aber bewusst Sidecar-/Trainingslane.

Was der Bot jetzt tatsaechlich lernt:

- Er lernt aus numerischen Observations, die aus dem Headless-Match-Kontext gebaut werden.
- Er lernt eine diskrete Policy ueber semantische Actions wie yaw/roll/pitch/boost/shoot-mg.
- Er lernt Rewards, die aktuell fast nur Survival positiv wirksam machen.
- Er lernt unter `maxStepsPerEpisode=180`.
- Er lernt im aktuellen 93J.5c-Lauf effektiv eine hardcodierte Classic/3D/normal/standard-nahe Lane.

Was er jetzt nicht belastbar lernt:

- Kein belegtes Spielziel.
- Kein belegtes nicht-toedliches Rundenende.
- Kein belegter Progress.
- Kein belegter Hunt-/Combat-Erfolg.
- Keine belegte 2D/3D/Hunt/Classic-Generalisation.
- Keine produktive JS-Inference im echten Spieltick.
- Keine Modellregistry-/Runtime-Flag-/Rollback-faehige Integration.

Kurz: Er lernt gerade ein echtes PPO-Modell gegen eine JS-nahe Headless-Trainingsumgebung. Er lernt aber noch nicht nachweislich "das tatsaechliche Spiel" in dem Sinn, den wir fuer spaetere Produktqualitaet brauchen.

## Wie wird spaeter sichergestellt, dass er im echten Spiel genauso gut ist?

Aktuell ist das noch nicht sichergestellt. Der Bot-Trainingsplan sagt genau deshalb, dass BT93J keine Promotion, keinen Freeze, kein Rollout und keine BT95-Handoff-Freigabe erzeugen darf.

Die Absicherung ist im PPO-Pfad bewusst mehrstufig:

| Planstufe | Zweck | Bedeutung fuer "echtes Spiel" |
| --- | --- | --- |
| BT90-BT93 | Scaffold, Baseline, Diagnose, Reward-/Terminal-Reparatur | Training und Evidence werden aufgebaut, aber keine Produktfreigabe |
| BT93J | Reward-Curriculum-Proof-Lane | Klaert, ob PPO ueberhaupt aus der reparierten Lane sinnvoll lernt |
| BT94A | Candidate Freeze und Ablationen | Erst hier duerfen Kandidaten systematisch verglichen und ggf. eingefroren werden |
| BT94B | Externe A/B-Evidence und PPO-Validate | Erst hier kommt harte externe Evidence plus PPO-spezifische Validate-Lane |
| BT94B.3 | PPO-Validate | Kandidat, Modellhash, Normalize-State, Config, Semantikfenster und Validierungsreport muessen zusammenpassen |
| BT95 | Integrations-Handoff | Export-/Load-Vertrag, Runtime-Flag, Modellregistry, Latenzbudget und Rollback werden vorbereitet |
| spaeterer Rollout-Intake | produktive Entscheidung | Erst nach User-Entscheid und separater Integration darf echte Laufzeitnutzung passieren |

Der Plan schuetzt uns also vor einer falschen Annahme: Ein PPO-Modell, das in Headless-Eval gut aussieht, ist noch kein Produktbot. Erst wenn dieselbe Semantik ueber Candidate, Holdout, PPO-Validate, externe Evidence, JS-Inference-Vertrag, Registry und Rollback laeuft, kann man sagen: Das Verhalten ist fuer das tatsaechliche Spiel abgesichert.

Aktuelle Luecke: Diese Kette ist noch nicht erreicht. 93J.5c ist nur Diagnose-Evidence. BT94A bleibt geschlossen.

## Alle Befunde und Loesungsansaetze

### 1. Der Run ist formal valide

Befund: Der 1M-Run hat die angeforderten Timesteps erreicht, alle 20 Snapshot-Slots sind vorhanden, technische Stop-Gates sind gruen, `runtimeErrorCount=0`, keine NaN-/Inf-/Artefaktkorruption ist belegt.

Warum relevant: Wir koennen die roten fachlichen Signale nicht bequem als Messfehler wegwerfen.

Loesung: Den Run als gueltige Diagnose-Evidence behandeln. Keine Wiederholung desselben Longruns ohne neue Hypothese.

### 2. `reward-still-blocking` ist die richtige Klassifikation

Befund: `resultClass=reward-still-blocking`. Der Plan sagt bei diesem Ergebnis: kein weiterer Trainingsclaim ohne neue Hypothese, und 93J.6 darf nicht starten.

Warum relevant: Der Run trennt Untertraining von Reward-/Curriculum-Problem. Nach 1M Steps ist "einfach laenger laufen lassen" nicht mehr die primaere Hypothese.

Loesung: BT93J.7.1 als Decision-Report schreiben und danach eine neue Repair-Hypothese oeffnen: Reward-Clock, Progress-Signale, Mode-/Map-Konfiguration und Terminal-Zielsignale.

### 3. PPO schlaegt DQN in dieser Steps-Metrik, aber nicht im Gate-Sinn

Befund: Final `166.866667` AvgSteps vs DQN-Steps-Anker `117.525`. Das ist +49.341667 Steps.

Warum relevant: Der Bot ueberlebt laenger als der DQN-Anker in dieser Eval-Lane. Das ist echter Fortschritt, aber nur auf Survival/Steps.

Loesung: Aussage begrenzen: "PPO ist in dieser BT93J.5c Eval-Lane bei AvgSteps besser als der DQN-Anker." Nicht sagen: "PPO ist insgesamt besser", "BT94A-ready", "Champion" oder "schlauer".

### 4. Kein einziges natuerliches Terminal

Befund: `naturalTerminalCount=0` in finaler Eval und ueber alle Snapshot-Evals. Terminale sind player-dead oder max-step truncations.

Warum relevant: BT94A verlangt terminale Startfaehigkeit und nicht-toedliche Natural-Terminal-Evidence. Survival bis maxSteps ist kein Spielziel.

Loesung: Vor jedem neuen Longrun einen Terminal-Smoke verlangen, der in echter Eval mindestens einen nicht-toedlichen Natural-Terminal-Pfad erzeugt. Reward und Environment muessen diesen Pfad nicht nur technisch darstellen, sondern durch Policy-Verhalten erreichbar machen.

### 5. Max-step Survival-Plateau

Befund: 221 von 300 Completed Episodes haben Laenge 180; 220 max-step truncations sind in der Terminalmatrix gezahlt. Viele Episoden enden also am Cap.

Warum relevant: Die Policy hat gelernt, das Episodenlimit auszunutzen. Das kann gut fuer Survival sein, aber schlecht fuer Zielkompetenz.

Loesung: MaxSteps nicht als Erfolg interpretieren. Separat reporten: `maxStepShare`, `naturalTerminalShare`, `playerDeadShare`, `progressRewardShare`. Gate: max-step-only oder max-step-dominant darf BT94 nicht oeffnen.

### 6. Survival-Reward dominiert alle positiven Signale

Befund: Ueber alle Snapshot-Evals ist `survival=1921.84`, waehrend `checkpointReached=0`, `parcoursCompleted=0`, `win=0`, `kill=0`, `damageDealt=0`, `itemPickup=0`, `itemUse=0` sind.

Warum relevant: Das Belohnungssystem sagt praktisch: "Lebe weiter." Es sagt nicht wirksam: "Erreiche ein Ziel."

Loesung: Survival-Reward weiter reduzieren oder degressiv machen, Progress-/Natural-/Objective-Reward erreichbar machen und Gate einfuehren: ein Longrun darf nur starten, wenn in Smoke/Eval mindestens eine Zielkomponente nonzero ist.

### 7. Progress-Reward ist im Run faktisch tot

Befund: `checkpointReached=0` und `parcoursCompleted=0` in allen Snapshot-Evals, obwohl die Proof-Lane solche Rewards vorgesehen hat.

Warum relevant: Der Plan wollte player-dead-only negativ machen und Progress/Natural-Terminal getrennt positiv sichtbar machen. Im langen Lauf kam davon nichts an.

Loesung: Progress-Signal vom Environment bis `buildHeadlessTrainingRewardSignals()` durchverdrahten. Danach einen 1k-5k Reward-Smoke erzwingen, der `checkpointReached > 0` oder eine bewusst ausgeloeste Progress-Probe belegt.

### 8. `progressEvent` wird nicht uebergeben

Befund im Code: `buildHeadlessTrainingRewardSignals()` setzt `parcoursEnabled` und `checkpointReached` nur bei `context.progressEvent === true`. Der Step-Call uebergibt aber nur `totalEnvSteps` und `rewardProfileId`.

Relevante Stellen:

- `scripts/training-headless-lane-runner.mjs`: Reward-Signal-Funktion um Zeile 260 bis 281.
- `scripts/training-headless-lane-runner.mjs`: Reward-Call um Zeile 561 bis 564.

Warum relevant: Eine im Proof-Smoke belegte Reward-Komponente ist im echten Lauf unerreichbar, wenn der Runtime-Call sie nie setzt.

Loesung: Entweder echtes Progress-Event aus dem Match-/Adapter-State ableiten und uebergeben, oder die Proof-Lane darf diese Komponente nicht als aktiviert behaupten. Danach Report-Assertion: `progressEventReachable=true`.

### 9. Curriculum-Stufe 2 ist praktisch unerreichbar

Befund im Code: `BT93J_PROOF_CURRICULUM_STAGES` hat Stufe 2 ab `minSteps: 250_000`. Der Reward-Call uebergibt aber `totalEnvSteps: tickIndex + 1`. `tickIndex` ist episodenlokal und erreicht bei `maxSteps=180` nie 250000.

Relevante Stellen:

- `scripts/training-headless-lane-runner.mjs`: Curriculum-Stufen um Zeile 69 bis 94.
- `scripts/training-headless-lane-runner.mjs`: `totalEnvSteps: tickIndex + 1` um Zeile 561 bis 563.

Warum relevant: Die geplante Diversity-/Terminal-Pressure-Stufe wurde im 1M-Run nie wirksam. Das ist ein zentraler Root Cause.

Loesung: Eine globale Curriculum-Uhr uebergeben: `globalTrainingStep`, `globalEnvStep` oder ein vom Python-Env verwalteter monotonic counter. Danach im Snapshot reporten: aktive Curriculum-Stufe pro Eval/Train-Fenster.

### 10. Player-dead-only wurde nicht ausreichend negativ in Verhalten uebersetzt

Befund: Final gibt es nur player-dead Terminale und max-step truncations. `loss=-320` ueber alle Snapshot-Evals reicht nicht, um Natural-/Progress-Verhalten zu erzeugen.

Warum relevant: Der Reward-Smoke "player-dead-only ist netto negativ" ist nur ein lokaler Beispielbeweis. Er garantiert nicht, dass Training in der echten Lane Zielverhalten findet.

Loesung: Death-Penalty nicht isoliert erhoehen, sondern Reward-Landschaft reparieren: Progress/Natural muss erreichbar und haeufig genug sein, damit PPO eine Alternative zum Survival-Plateau sieht.

### 11. PPO ist nicht kollabiert

Befund: `entropy=0.9407`, `approx_kl=0.000055`, `clip_fraction=0`, `grad_norm` innerhalb Limit, `collapseOrInstabilitySignal=false`.

Warum relevant: Das Problem ist nicht "Policy explodiert" oder "alles NaN". Die Policy lernt konservativ aus schwachem Signal.

Loesung: Nicht zuerst an Stabilitaets-Notfallparametern drehen. Erst Reward-/Environment-Signal fixen. Danach koennen KL/Clip/Entropy fuer Exploration nachjustiert werden.

### 12. Updates sind extrem klein

Befund: `approx_kl` ist sehr niedrig und `clip_fraction=0`. Das spricht fuer sehr kleine Policy-Aenderungen oder fuer wenig nuetzliche Advantage-Struktur.

Warum relevant: Mehr Timesteps koennen im gleichen lokalen Optimum verpuffen.

Loesung: Nach Reward-Fix kurze Smokes mit staerkerem Diagnoseblick: Advantage-/Reward-Komponenten, Curriculum-Stage, terminale Ereignisse und Action-Distribution pro Fenster. Erst wenn nonzero Zielsignale auftauchen, lohnt ein laengerer Run.

### 13. Action-Surface ist sauber, aber nicht der Zielbeweis

Befund: Invalid, sanitizer, post-decode clamp und veto sind 0; Pre-Sampling-Mask ist bei allen Actions aktiv.

Warum relevant: Das schliesst eine fruehere Klasse technischer Action-Bugs aus. Es beweist aber nicht, dass die Policy Zielkompetenz hat.

Loesung: Action-Safety-Gate beibehalten, aber nicht mehr als Hauptblocker behandeln. Neue Gates: Progress, Natural-Terminal, Mode/Map-Wirklichkeit, Reward-Komponenten.

### 14. Full per-step Replay fehlt

Befund: `action_policy_diagnostics.json` dokumentiert, dass historische Reports Action-Telemetry und Beispiele persistieren, aber keinen vollstaendigen per-step Action Replay.

Warum relevant: Wir koennen nicht exakt jede Fehlentscheidung im Run rekonstruieren.

Loesung: Fuer die naechste Diagnose-Lane optional begrenzte Trace-Persistenz aktivieren: z.B. 2 Episoden pro Eval-Snapshot mit observation-summary, raw action, semantic action, reward components, terminal flags, mode/map und curriculum stage.

### 15. Mode-/Map-Konfiguration wird im PPO-Headless-Run nicht wirklich ausgespielt

Befund im Code: `createSmokeSettings()` hardcodet `mapKey: 'standard'`, `gameMode: 'CLASSIC'`, `gameplay.planarMode: false`, `modePath: 'normal'`.

Relevante Stelle: `scripts/training-headless-lane-runner.mjs` um Zeile 155 bis 170.

Warum relevant: Die Config nennt `maps: ["standard","maze"]`, aber der Headless-Runner nutzt faktisch `standard`, `CLASSIC`, `3D`, `normal`.

Loesung: `mapKey`, `mode/domain`, `planarMode` und ggf. `modePath` als Runner-Optionen einfuehren. Python-Env muss diese Optionen pro Env weiterreichen.

### 16. CLI/Python-Bridge kann Modes/Maps aktuell nicht uebergeben

Befund im Code: `training-single-env-bridge.mjs` parsed nur `--port`, `--max-steps`, `--seed`, `--session-id`, `--reward-profile-id`. `python/envs/curvios_env.py` reicht entsprechend nur diese Argumente weiter.

Relevante Stellen:

- `scripts/training-single-env-bridge.mjs` um Zeile 21 bis 50.
- `python/envs/curvios_env.py` um Zeile 128 bis 141.

Warum relevant: Selbst wenn die Config mehrere Modes/Maps verspricht, kommt das nicht in der JS-Headless-Session an.

Loesung: CLI erweitern: `--map-key`, `--domain-mode` oder `--game-mode`, `--planar-mode`, optional `--mode-path`. Python Env Constructor und Vec-Env-Erzeugung entsprechend erweitern.

### 17. Die vier Modi sind im Debug-Facade-Konzept vorhanden, aber nicht in der PPO-Lane

Befund im Code: `GameDebugTrainingFacade.js` kennt `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`. Der PPO-Headless-Runner nutzt diese Auswahl nicht.

Relevante Stellen: `src/core/debug/GameDebugTrainingFacade.js` um Zeile 58 bis 71.

Warum relevant: Es gibt schon eine Domain-Terminologie. Die Trainingslane ist nur noch nicht daran angeschlossen.

Loesung: Keine neue Begriffswelt erfinden. PPO-Headless sollte dieselben Domain-IDs verwenden: `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`.

### 18. Seeds 936/937 und Eval Seed 946 sind in der 2-Env-Konfiguration wahrscheinlich nicht aktiv

Befund: Config listet Train-Seeds `[934,935,936,937]`, aber `envCount=2`. Eval-Seeds `[944,945,946]`, aber `evalEnvCount=2`.

Warum relevant: Mehr Seed-Diversitaet steht im Config-Text, wird aber bei 2 Envs nur teilweise genutzt, wenn die Env-Erzeugung die ersten N Seeds nimmt.

Loesung: Reports muessen `effectiveTrainSeeds` und `effectiveEvalSeeds` ausgeben. Wenn bewusst nur 2 Envs genutzt werden, Config als solche formulieren oder EnvCount erhoehen, sobald Gates gruen sind.

### 19. Holdout ist korrekt unbenutzt, also keine Generalisierungsfreigabe

Befund: 93J.5c war explizit user-owned diagnostic longrun. Guardrails: kein Holdout, kein Candidate, kein Freeze, kein BT94A-Gate-Refresh.

Warum relevant: Ein guter Eval-Snapshot darf nicht als Candidate-Evidence missverstanden werden.

Loesung: Holdout erst nach gruener Eval-Lane in 93J.6 oder einem neuen Repair-Block. Kein Holdout auf rotem Reward-/Terminal-Befund verschwenden.

### 20. BT94A bleibt geschlossen

Befund: Plan sagt: 93J.6 nur bei `green-for-93J.6`. 93J.5c ist `reward-still-blocking`. 93J.7.1 verlangt bei reward-still-blocking: kein weiterer Trainingsclaim ohne neue Hypothese.

Warum relevant: Die Blocker vor BT94 sind nicht geschlossen.

Loesung: BT93J.7 Decision-/Gate-Refresh schreiben und rotes Ergebnis sauber pinnen. Danach neuer Reparatur-Intake mit konkreter Hypothese.

### 21. F.05 ist verbessert, aber nicht geschlossen

Befund: Steps vs DQN sind in der finalen Eval gruen. Aber die Evidence ist keine Holdout-/Candidate-Evidence und terminale Regeln bleiben rot.

Warum relevant: F.05 war nicht nur "irgendein AvgSteps hoeher", sondern Teil eines BT94A-Gate-Verbunds.

Loesung: F.05 maximal als "Eval-Steps verbessert, weiterhin durch F.19/F.31/Governance blockiert" klassifizieren.

### 22. F.19 bleibt offen

Befund: Terminal-/Death-Matrix bleibt player-dead/max-step-dominiert. Keine startfaehige Terminal-Diversitaet.

Loesung: Real-Eval muss nicht-toedliche Natural-Terminals erzeugen. Vorher Terminal-Repair nicht als abgeschlossen markieren.

### 23. F.31 bleibt offen

Befund: Natural-Terminal-Evidence fehlt im echten PPO-Verhalten, obwohl Terminal-Probes zeigen, dass das System solche Terminale technisch darstellen kann.

Loesung: Natural-Terminal-Zielpfad trainierbar machen: Reward, Environment-Ziel, Mode/Map und Evaluationsziel synchronisieren.

### 24. F.27 bleibt offen

Befund: Aggregat bleibt wegen Reward-/Terminal-Blockern rot. Steps allein heben das Aggregat nicht.

Loesung: F.27 erst schliessen, wenn Eval plus Holdout nicht regressiv sind und F.19/F.31 nicht mehr rot sind.

### 25. Terminal-Semantik selbst ist nicht kaputt

Befund: `terminal_semantics_report.json` zeigt Probes fuer `player-dead`, `match-ended`, `max-steps`, `forced-round`, `time-limit`, Runtime-Failure. Natural `match-ended` kann technisch erzeugt werden.

Warum relevant: Der Fehler liegt nicht primaer im Terminal-Feldvertrag, sondern darin, dass die Policy/Environment/Reward-Lane Natural-Terminals nicht erreicht.

Loesung: Nicht Terminal-Normalizer umschreiben. Stattdessen erreichbare Natural-Terminal-Szenarien in Headless-Lane und Reward einbauen.

### 26. Reward-Smoke und echter Lauf klaffen auseinander

Befund: 93J.5b Smokes konnten zeigen, dass Progress/Natural separat positiv waeren. Der echte 1M-Run hatte davon 0.

Warum relevant: Smokes prueften Reward-Arithmetik, aber nicht zwingend Reachability im echten Runtime-Loop.

Loesung: Neue Smoke-Kategorie: "reachable reward smoke". Nicht nur synthetische Reward-Funktion testen, sondern mindestens eine echte Episode/Probe durch den Runner, die nonzero Progress/Natural schreibt.

### 27. Risk-Komponenten sind tot

Befund: `wallRisk`, `trailRisk`, `opponentRisk`, `lowHealthThreat` sind ueber alle Snapshot-Evals 0.

Warum relevant: Wenn Risk-Shaping nie feuert, lernt die Policy keine differenzierte Gefahrvermeidung ausser "ueberleben".

Loesung: Entweder Risk-Signale korrekt aus Observation/Runtime ableiten oder aus dem Reward-Profil entfernen, bis sie echt belegt sind. Tote Reward-Komponenten duerfen nicht als Sicherheits-Lernsignal verkauft werden.

### 28. Combat-/Hunt-Kompetenz ist nicht belegt

Befund: `kill=0`, `damageDealt=0`, `damageTaken=0`, `itemUse=0`, `shootMG`-Kompetenz nicht als Erfolg sichtbar.

Warum relevant: Fuer Hunt-Modi ist das zentral. Der aktuelle Run ist eher Classic/Survival als Hunt-Kompetenz.

Loesung: Hunt nicht in denselben Longrun werfen, bevor Headless mode-aware ist. Erst Hunt-Smoke mit erreichbarem Gegner-/Combat-Signal.

### 29. Eval schwankt stark, kein stabiler monotoner Lerntrend

Befund: AvgSteps schwankt zwischen `119.466667` und `174.6`. Es gibt Rueckfaelle bei 550k, 600k, 950k.

Warum relevant: Der finale Snapshot ist gut, aber die Entwicklung ist nicht glatt. Das spricht fuer fragile Policy/Seed-Abhaengigkeit oder stochastic lokale Plateaus.

Loesung: Nach Repairs nicht direkt 1M. Erst 50k/100k Diagnose-Sweeps mit mehreren Eval-Snapshots und gleicher Statistik.

### 30. Die Episode-Cap-Laenge 180 kann das Ziel verdecken

Befund: Sehr viele Episoden enden genau bei 180. Ein Bot, der nur cap-stabil ist, sieht in AvgSteps stark aus.

Warum relevant: AvgSteps ist bei Cap-nahem Verhalten nicht mehr ausreichend aussagekraeftig.

Loesung: Zusaetzliche Score-Komponenten: `objectiveCompletionRate`, `naturalTerminalRate`, `maxStepShare`, `progressPer180Steps`, `deathBefore60Share`.

### 31. 2-Env/kurze Rollouts begrenzen Exploration

Befund: `envCount=2`, `nStepsPerEnv=64`, `nEpochs=2`, `batchSize=32`. Das ist fuer Diagnose ok, aber fuer seltene Progress-/Natural-Ereignisse eng.

Warum relevant: Wenn Zielereignisse selten sind, sieht PPO sie kaum.

Loesung: Erst Reward-Reachability fixen. Danach ggf. 4 Envs oder mehr Seeds, aber erst wenn `fourEnvAllowed`/Governance und technische Gates es erlauben. Nicht mit groesserem Setup tote Signale kaschieren.

### 32. Latency ist nicht der aktive Blocker

Befund: Model reload und forward pass sind klein; Action/ack-Latenzen waren im gueltigen Rahmen. Keine Runtime-Fehler.

Warum relevant: Performance-Tuning bringt jetzt wenig fuer Lernqualitaet.

Loesung: Latency weiter reporten, aber nicht als Reparaturfokus.

### 33. Der PC-Absturz hat den finalen Befund nicht invalidiert

Befund: Der Lauf wurde aus einem 600k-Artefakt fortgesetzt und final mit 1M Progress abgeschlossen. Manifest und Report dokumentieren Resume-Quelle und Hashes.

Warum relevant: Der Crash ist operativ unschoen, aber der Abschlussreport ist vorhanden und klassifiziert.

Loesung: Keine Wiederholung wegen Crash noetig. Nur bei Hash-/Manifest-/Snapshot-Luecke waere eine Messinvaliditaet anzunehmen.

### 34. "Laenger laufen lassen" ist jetzt keine gute Hypothese mehr

Befund: 1M Steps haben Survival verbessert, aber nicht Natural/Progress/Win/Combat erzeugt.

Warum relevant: Ein weiterer identischer 1M-Run wuerde wahrscheinlich wieder Survival stabilisieren, nicht Zielverhalten.

Loesung: Naechster Longrun erst nach konkreten Repairs und Gruen-Smokes.

### 35. Die naechste Phase ist kein normaler Pilot

Befund: 93J.6 ist laut Plan nur nach `green-for-93J.6` erlaubt. Das liegt nicht vor.

Loesung: 93J.7.1 Decision-Report schreiben und Ergebnis als Diagnose-Loop mit neuer Hypothese pinnen. Danach neuer enger Reparaturscope.

### 36. Der Bot lernt aktuell eine Headless-nahe Aufgabe, nicht den finalen Produktpfad

Befund: Der PPO-Pfad nutzt `CurviosEnv` plus Node-Sidecar plus Headless-Match-Kernel. Das ist runtime-nah, aber nicht dieselbe Sache wie produktive Inference ueber Runtime-Flag, BotPolicyRegistry und Rollback im echten Spiel.

Warum relevant: Headless-Eval kann besser aussehen als echte Runtime, wenn Settings, Modi, Maps, Timing, Observation-Schema oder Integrationspfad abweichen.

Loesung: Bis BT94B/BT95 nur von "runtime-near-headless Evidence" sprechen. Produktqualitaet erst nach PPO-Validate und Integrations-Handoff behaupten.

### 37. Aktuelle Lernaufgabe ist Survival-dominiert

Befund: PPO bekommt fast nur Survival als positiven Reward. Dadurch lernt es nicht zwingend das Spielziel, sondern das Ueberleben im Cap-Fenster.

Warum relevant: Ein Bot kann in Metriken gut aussehen und trotzdem im eigentlichen Spiel schlecht wirken, wenn das eigentliche Ziel fehlt.

Loesung: Objective-/Progress-/Natural-Terminal-Rewards erreichbar machen und als Gate vor Longruns erzwingen.

### 38. Echte Spielgleichheit ist im Plan absichtlich noch nicht garantiert

Befund: Der Trainingsplan sagt: PPO-Validate ist erst in `BT94B.3` hard required; Integration mit Export, Runtime-Flag, Registry und Rollback liegt in `BT95`.

Warum relevant: Die aktuelle Stufe darf keine Endnutzerqualitaet versprechen.

Loesung: Alle Reports muessen den Evidence-Typ ausweisen: `diagnostic`, `candidate`, `holdout`, `ppo-validate`, `integration-handoff`. 93J.5c bleibt `diagnostic`.

### 39. Semantikfenster muss vor Produktvergleich identisch gemacht werden

Befund: Der Plan verwendet `runtime-near-headless-v1`. Aktuell sind Modes/Maps hardcodiert und nicht voll mit der geplanten Matrix verbunden.

Warum relevant: Wenn Training auf Classic/3D/standard laeuft, kann man daraus keine Sicherheit fuer Hunt/2D/Maze oder Produktspiel ableiten.

Loesung: Vor BT94A/BT94B muss der Report `effectiveMode`, `effectiveMap`, `planarMode`, `gameMode`, `modePath`, `rewardProfile`, `observationSchema`, `actionSurfaceId` und `normalizeStateHash` pinnen.

### 40. Endgueltige Produktleistung braucht JS-Inference-Beweis

Befund: Python-Forward-Pass im Training ist kein JS-Tick-Latenz- und Inference-Beweis im Produktpfad. Der Plan fuehrt diese Luecke bereits als kritisch.

Warum relevant: Ein Modell kann in Python korrekt laufen, aber beim Export/Load, Normalize-State, Tick-Budget oder Runtime-Integration scheitern.

Loesung: BT95 nicht ueberspringen. Export-/Load-Smoke, Registry-Eintrag, Runtime-Strategieflag, Rollback-Test und Tick-Latenzbudget muessen spaeter eigene Evidence bekommen.

### 41. Ohne PPO-Validate gibt es keine belastbare "genauso gut im Spiel"-Aussage

Befund: `BT94B.3` ist als eigene PPO-Validate-Lane definiert. Bis diese Lane existiert und gruen ist, darf kein PPO-Ergebnis `promote`, `rollout-ready` oder `BT95-Handoff-ready` heissen.

Warum relevant: Genau diese Validate-Lane soll verhindern, dass Headless-Erfolg mit Produktqualitaet verwechselt wird.

Loesung: BT94B.3 muss spaeter Kandidat, Modellhash, Normalize-State, Config, Semantikfenster, Action-Surface, Eval-Matrix und Report-Schema zusammen validieren.

### 42. Der aktuelle 1M-Run ist kein Beweis fuer Generalisierung

Befund: Kein Holdout, keine externe A/B-Evidence, keine Mode-Matrix, keine Candidate-Ablation.

Warum relevant: Der Bot kann auf die aktuelle Lane ueberangepasst sein.

Loesung: Nach Repair erst Eval, dann Holdout, dann BT94A-Ablationen, dann BT94B externe Evidence. Keine direkte Produktannahme aus 93J.5c.

## Sollten die Modi jetzt getrennt werden?

Antwort: Ja fuer Diagnose und Harness-Konfiguration, nein fuer vier unabhaengige Champion-Longruns.

Es ist nicht zu frueh, die Modi technisch sauber zu trennen. Im Gegenteil: Der aktuelle Befund zeigt, dass wir gar nicht sicher die vier Modi trainieren, die wir diskutieren. Es ist aber zu frueh, jetzt vier separate 1M-Trainings fuer `3d hunt`, `2d hunt`, `3d normal`, `2d normal` zu starten.

Empfohlene Trennung:

1. Gemeinsame Terminologie nutzen: `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d`.
2. Headless-Runner mode-aware machen.
3. Python-Env mode/map/planar weiterreichen lassen.
4. Pro Mode kurze deterministische Probes laufen lassen, keine Longruns.
5. Danach entscheiden:
   - Wenn alle Modi dieselben Reward-/Progress-Toten zeigen: shared Reward/Clock zuerst fixen.
   - Wenn nur Hunt rot ist: Hunt separat reparieren.
   - Wenn 2D/3D stark unterschiedliche Dynamiken haben: separate Modelle oder separate Normalize-States pruefen.

Aktuelle Einschaetzung: Zuerst die gemeinsame Infrastruktur reparieren. Danach mode-selektive Smokes. Erst spaeter getrennte Policies.

## Reicht das, um Blocker vor BT94 zu schliessen?

Nein.

Was besser wurde:

- AvgSteps in finaler Eval liegt ueber DQN-Steps-Anker.
- Action-Safety ist sauber.
- PPO ist stabil genug, kein Collapse.
- Lange technische Laufkette funktioniert.

Was weiterhin blockiert:

- `resultClass=reward-still-blocking`.
- `naturalTerminalCount=0`.
- `terminalDiversified=false`.
- Kein Progress-/Objective-Reward.
- Kein Holdout.
- Kein Candidate-/Freeze-/PPO-Validate-Kontext.
- 93J.6 darf nicht starten.
- BT94A-Gate darf nicht geoeffnet werden.

BT94A kann erst geoeffnet werden, wenn nach Repair Eval und Holdout gruene Terminal-/Survival-/Steps-Evidence liefern und `no_start_gate.json` explizit `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true` schreibt.

## Wann kann der naechste Longrun gestartet werden?

Nicht sofort.

Der naechste Longrun sollte erst starten, wenn diese Vorbedingungen erfuellt sind:

1. Curriculum-Uhr repariert: Stufe 2 muss anhand globaler Steps aktivierbar sein.
2. Progress-/Checkpoint-Signal repariert oder bewusst aus dem Claim entfernt.
3. Headless-Runner und Python-Env koennen Mode/Map/Planar explizit setzen.
4. Ein echter Reward-Reachability-Smoke zeigt nonzero `checkpointReached` oder nonzero Natural-/Objective-Signal.
5. Terminal-Smoke zeigt nicht nur technische Natural-Terminal-Faehigkeit, sondern echte Eval-Erreichbarkeit.
6. Report enthaelt aktive Curriculum-Stage pro Eval/Train-Fenster.
7. Action-Safety bleibt gruen.
8. Ein 20k/50k Kurzlauf zeigt keine Regression unter DQN-Anker und mindestens ein Zielsignal.

Empfohlene Reihenfolge:

1. Kein 1M.
2. 1k-5k Runner-Smoke fuer Reward-Reachability.
3. 20k Mode-/Map-Diagnose.
4. 50k bis 100k Repair-Smoke.
5. 200k bis 300k Diagnose-Longrun, wenn Smokes gruen sind.
6. Erst danach wieder 1M.

## Handlungsempfehlungen

1. `BT93J.7.1` schreiben: `post_longrun_decision_report.json` mit `reward-still-blocking`, `93J.6 blocked`, `BT94A closed`.
2. Neuen Reparatur-Intake definieren, nicht 93J.6 erzwingen.
3. In `scripts/training-headless-lane-runner.mjs` globale Curriculum-Steps statt `tickIndex + 1` nutzen.
4. `progressEvent` echt aus Runtime/Adapter ableiten oder Progress-Reward aus dem aktiven Claim entfernen.
5. Snapshot-/Eval-Reports um `activeCurriculumStage` erweitern.
6. Runner-CLI erweitern: `--map-key`, `--domain-mode`, `--planar-mode`, optional `--mode-path`.
7. `python/envs/curvios_env.py` um dieselben Optionen erweitern.
8. Config-Reports um `effectiveTrainSeeds`, `effectiveEvalSeeds`, `effectiveMaps`, `effectiveModes` erweitern.
9. Mode-Matrix-Smoke bauen: `classic-3d`, `classic-2d`, `hunt-3d`, `hunt-2d` x mindestens `standard`, `maze`.
10. Nicht alle Modi zusammen in einen Longrun werfen, bevor die Matrix belegt ist.
11. Reward-Reachability-Smoke einfuehren: nicht nur synthetische Reward-Arithmetik, sondern echte Runner-Episode.
12. Natural-Terminal-Eval-Smoke einfuehren: mindestens ein nicht-toedliches Natural-Terminal in echter Eval.
13. `maxStepShare` als harte rote Diagnosemetrik behandeln, wenn Natural/Progress 0 bleibt.
14. Survival-Reward degressiv machen oder ab einer Schwelle staerker von Progress abhaengig machen.
15. Objective-/Progress-Reward haeufig genug machen, damit PPO ihn in kurzen Smokes sieht.
16. Risk-Shaping entweder aktivieren oder als tot markieren.
17. Hunt-spezifische Combat-Signale erst nach mode-aware Harness testen.
18. Bei 2D/3D keine gemeinsame Normalize-/Policy-Entscheidung treffen, bevor Beobachtungs- und Reward-Verteilungen verglichen sind.
19. Begrenzten Step-Trace fuer naechste Diagnose persistieren.
20. Nach Repairs zuerst 20k/50k/100k, nicht 1M.
21. 1M nur starten, wenn Kurzlauf nonzero Progress/Natural und keine DQN-Regression zeigt.
22. BT94A weiter geschlossen halten, bis `no_start_gate.json` gruene Artefaktlage schreibt.

## Fragen und Antworten zum Verstaendnis

### Ist der Bot besser als DQN?

In dieser einen BT93J.5c Eval-Steps-Metrik: ja. Er erreicht `166.866667` AvgSteps gegen `117.525` DQN-Anker. Insgesamt: noch nicht bewiesen. Es fehlen Holdout, Natural-Terminals, Progress, Objective-Erfolg und Candidate-Prozess.

### Hat der Bot ein lokales Optimum erreicht?

Sehr wahrscheinlich ja. Das Optimum lautet: lange ueberleben, haeufig bis maxSteps, ohne Zielabschluss. Die Reward-Landschaft macht dieses Verhalten attraktiv und gibt fast keine Alternativsignale.

### Ist das ein PPO-Algorithmusproblem?

Nicht primaer. PPO ist stabil und updated. Das Problem ist die Lernaufgabe: tote oder unerreichbare Reward-Komponenten, falsche Curriculum-Uhr und nicht mode-aware Environment.

### Hat der PC-Absturz den Run wertlos gemacht?

Nein. Der Run wurde fortgesetzt und final mit Manifest, Hashes, Checkpoints und Snapshot-Gates abgeschlossen. Der Absturz ist nicht der Root Cause.

### Warum sieht AvgSteps gut aus, obwohl der Befund rot ist?

Weil AvgSteps bei einem 180-Step-Cap leicht durch passives/langes Ueberleben steigt. BT94 braucht aber nicht nur lange Episoden, sondern terminale und zielbezogene Kompetenz.

### Warum reicht kein `naturalTerminalCount=0`?

Weil ohne Natural-Terminal kein Beweis existiert, dass die Policy eine Runde sinnvoll beendet oder ein nicht-toedliches Ziel erreicht. Max-step ist nur Zeitablauf.

### Warum ist `checkpointReached=0` so wichtig?

Weil die Proof-Lane genau Progress sichtbar machen sollte. Wenn Progress 0 bleibt, trainiert PPO nicht auf Fortschritt.

### Was war der wahrscheinlich groesste Code-Bug?

Die Curriculum-Uhr: Stufe 2 erwartet `minSteps=250000`, bekommt aber `tickIndex + 1`, also episodale Steps bis maximal 180. Dadurch bleibt die geplante Diversity-Pressure aus.

### Was war der zweite grosse Code-Bug?

`progressEvent` wird im echten Reward-Call nicht uebergeben. Dadurch bleiben `checkpointReached` und `parcoursEnabled` praktisch unerreichbar.

### Was ist mit den Modi?

Die vier Modi existieren konzeptionell im Debug-Facade, aber die PPO-Headless-Lane setzt sie nicht sauber. Der aktuelle Run ist effektiv Classic/3D/normal/standard-nahe, nicht die volle vierfache Mode-Matrix.

### Sollten wir die Modi jetzt trennen?

Ja fuer Diagnose und Harness. Nein fuer vier 1M-Trainings. Erst mode-aware Smokes, dann entscheiden, ob separate Policies noetig sind.

### Ist Hunt jetzt schon trainierbar?

Nicht belegt. Combat-/Damage-/Kill-Komponenten sind 0. Hunt braucht eigene erreichbare Reward- und Terminalsignale.

### Ist 2D einfacher und sollte zuerst trainiert werden?

Moeglich, aber nicht belegt. 2D kann Exploration vereinfachen, aber solange Headless den Mode nicht explizit setzt, ist das nur Spekulation.

### Sollen wir Survival-Reward komplett entfernen?

Nein. Survival bleibt wichtig, aber muss degressiv, begrenzt oder an Progress gekoppelt werden. Sonst lernt der Bot wieder nur das Cap.

### Sollen wir die Death-Penalty einfach erhoehen?

Nicht als Hauptfix. Mehr Death-Penalty kann Risk-Aversion erhoehen, erzeugt aber kein Zielverhalten, wenn Natural/Progress weiterhin unerreichbar ist.

### Sollten wir Exploration erhoehen?

Erst nach Reward-/Reachability-Fix. Mehr Entropy oder groessere Rollouts helfen wenig, wenn relevante Rewards tot sind.

### Sollte der naechste Test 1M sein?

Nein. Erst Smokes und kurze Diagnose-Laeufe. Ein 1M-Run testet Durchhaltefaehigkeit, aber ist teuer und verwischt Root Causes.

### Was ist der naechste sinnvolle technische Schritt?

BT93J.7.1 Decision-Report schreiben, dann Repair-Scope mit vier Kernfixes: globale Curriculum-Uhr, Progress-Reachability, mode-aware Headless, effektive Matrix-/Seed-Reports.

### Lernt der Bot gerade wirklich das tatsaechliche Spiel?

Teilweise, aber nicht ausreichend fuer diese Aussage. Er lernt gegen einen JS-nahen Headless-Match-Kernel, also gegen mehr als eine synthetische Dummy-Umgebung. Aber er lernt nicht den kompletten Produktpfad: keine produktive Runtime-Auswahl, keine JS-Inference-Integration, keine Registry, kein Rollback, keine echte 4-Mode-Matrix. Er lernt aktuell vor allem Survival in einer Headless-Lane.

### Wie ist sichergestellt, dass der Bot im tatsaechlichen Spiel am Ende genauso gut ist?

Aktuell noch gar nicht abschliessend. Genau dafuer existiert der restliche PPO-Pfad: BT94A Candidate/Ablationen, BT94B externe Evidence und PPO-Validate, BT95 Integrations-Handoff mit Export/Load, Runtime-Flag, Registry, Latenzbudget und Rollback. 93J.5c darf diese Sicherheit nicht behaupten.

### Was muss sich aendern, damit diese Sicherheit spaeter real wird?

Die Trainings- und Eval-Semantik muss gepinnt und vergleichbar sein: gleiche Observation-Semantik, gleiche Action-Surface, gleicher Normalize-State, explizite Mode-/Map-Auswahl, echte Reward-Komponenten, Holdout, PPO-Validate und spaeter JS-Inference im Runtime-Tick. Erst dann kann eine Headless-Leistung auf Produktleistung uebertragen werden.

## Agenten-Prompt fuer den naechsten Chat

```text
Du arbeitest im Repo D:\Antigravity\Projekte\Neuer Ordner (6) auf Branch bot-training. Folge AGENTS.md, .agents/rules/token_efficiency_and_tools.md, .agents/rules/planning_and_governance.md und .agents/workflows/bot-training-plan.md. Nutze npm.cmd statt npm in PowerShell. Keine Trainingsruns starten, solange der User es nicht explizit verlangt.

Kontext: BT93J.5c User-owned 1M Longrun ist abgeschlossen. Primaerartefakt: data/training/ppo/bt93j/user_owned_1m_longrun_report.json. Ergebnis: resultClass=reward-still-blocking, requestedTimesteps=1000000, actualProgressTimesteps=1000000, modelNumTimesteps=1004992, 20/20 Snapshots, allSnapshotGatesOk=true. Final avgSteps=166.866667, DQN-Steps-Anker=117.525, delta=+49.341667. Aber naturalTerminalCount=0, terminalDiversified=false, final terminalReasonCounts={player-dead:3}, viele max-step Episoden, Progress-/Win-/Combat-/Item-Rewards alle 0.

Wichtigste Root Causes:
1. Curriculum-Uhr in scripts/training-headless-lane-runner.mjs ist falsch: BT93J_PROOF_CURRICULUM_STAGES Stufe 2 beginnt bei minSteps=250000, aber Reward-Call uebergibt totalEnvSteps=tickIndex+1, also episodenlokal bis max 180. Stufe 2 war im 1M-Run praktisch unerreichbar.
2. progressEvent wird nicht an buildHeadlessTrainingRewardSignals uebergeben. checkpointReached/parcoursEnabled bleiben im echten Runner tot.
3. PPO-Headless ist nicht mode-aware: createSmokeSettings hardcodet mapKey='standard', gameMode='CLASSIC', gameplay.planarMode=false, modePath='normal'. training-single-env-bridge.mjs und python/envs/curvios_env.py reichen keine --map-key/--domain-mode/--planar-mode Optionen durch.
4. Debug-Facade kennt classic-3d, classic-2d, hunt-3d, hunt-2d, aber PPO-Lane nutzt diese Domain-IDs nicht.
5. BT94A bleibt geschlossen. 93J.6 darf nicht starten, weil 93J.5c nicht green-for-93J.6 ist. Naechster planbarer Schritt ist 93J.7.1 post_longrun_decision_report.json oder ein enger Repair-Intake mit neuer Hypothese.

Aufgabe fuer dich:
- Zuerst docs/bot-training/BT93J_5c_Longrun_Tiefenanalyse_2026-04-27.md lesen.
- Dann docs/bot-training/Bot_Trainingsplan.md nur um BT93J.7 lesen.
- Schreibe BT93J.7.1 post_longrun_decision_report.json, der reward-still-blocking sauber pinnt und 93J.6/BT94A geschlossen haelt.
- Setze alle Fragen in den PPO-Pfad-Kontext: BT93J ist Diagnose, BT94A ist Candidate/Ablation, BT94B ist externe Evidence plus PPO-Validate, BT95 ist Integrations-Handoff. Aktuell ist nicht sichergestellt, dass Headless-Leistung im produktiven Spiel identisch ist.
- Danach, falls User Umsetzung will, implementiere nicht direkt Training, sondern einen kleinen Repair-Scope: globale Curriculum-Steps, progressEvent-Reachability, mode/map/planar CLI-Durchreichung, effectiveModes/effectiveSeeds Reporting, Reward-Reachability-Smoke und kurze Mode-Matrix-Smokes. Kein 1M-Run ohne explizite Freigabe.
```
