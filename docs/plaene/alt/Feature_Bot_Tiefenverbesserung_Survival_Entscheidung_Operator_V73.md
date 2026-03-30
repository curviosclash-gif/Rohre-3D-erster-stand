# Feature Bot-Tiefenverbesserung Survival Entscheidung Operator V73

Stand: 2026-03-30
Status: Geplant
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Den Bot tiefgreifend verbessern: laenger ueberleben, taktisch lesbarer entscheiden, Modus-/Map-Sonderfaelle robuster behandeln und Training, Eval sowie Operator-Pfade so haerten, dass Fortschritt reproduzierbar statt zufaellig wird.

## Intake-Hinweis

- Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`
- Vorgeschlagene Intake-Zuordnung: BT20 erweitern (Safety/Reward), BT30 erweitern (Curriculum/Replay/Tuning), BT40 erweitern (Eval/Operator-Gates); falls der Blockschnitt zu eng ist, manuell einen Folgeblock nach BT40 anlegen.
- Hard dependencies:
  - Der Resume-/Bridge-Fehler aus `docs/Fehlerberichte/2026-03-28_training_resume-command-timeout.md` muss als Betreiber-Blocker behandelt werden, weil belastbare A/B-Laeufe sonst auf Workarounds beruhen.
  - Der eingefrorene Bot-Bridge-Vertrag V1 aus `docs/referenz/ai_architecture_context.md` bleibt fuer Runtime kompatibel; tiefere Features duerfen ihn nur intern oder ueber einen klar versionierten V2-Pfad erweitern.
  - V69 (`docs/plaene/alt/Feature_Item_Raketen_Schild_MG_Balance_V69.md`) und V72 (`docs/plaene/neu/Feature_Gameplay_Powerups_Portale_Gates_V72.md`) sind explizite Gameplay-Abhaengigkeiten, weil Waffen-, Item-, Portal- und Gate-Vertraege die Bot-Entscheidung direkt veraendern.
- Soft dependencies:
  - `docs/release/Releaseplan_Spiel_2026.md` sollte die erweiterten Bot-Gates spaeter als Abnahmekriterien uebernehmen.
  - Recorder-/Replay- und QA-Pfade sollten dieselben Failure-Codes und Decision-Trace-Artefakte lesen koennen wie Training/Eval.
- Hinweis: Manuelle Uebernahme in den Bot-Trainings-Masterplan erforderlich.

## Ausgangslage

- BT12 hat am 2026-03-27 Forced-/Timeout-Rounds zwar bereinigt, ist auf echter Survival-Metrik aber auf `averageBotSurvival=6.132433` eingebrochen; der letzte stabile Vergleichspunkt bleibt BT11 mit `averageBotSurvival=37.376986`.
- BT20 laeuft deshalb als Resume vom BT11-Checkpoint; der normale `trainer-checkpoint-load` Antwortpfad ist laut Fehlerbericht weiterhin nicht belastbar.
- Die Runtime-KI ist modularisiert (`BotSensingOps`, `BotDecisionOps`, `BotActionOps`, `RuleBasedBotPolicy`, `HuntBotPolicy`), bleibt aber stark reaktiv: Gefahr, Recovery und Intent werden eher punktuell als durchgaengig modelliert.
- Der Observation-/Action-Contract V1 ist absichtlich schmal und ohne History-Frames eingefroren; tiefere Verbesserungen brauchen daher internes Gedaechtnis, abgeleitete Features oder einen versionierten Trainingspfad statt eines stillen Runtime-Bruchs.
- `bot:validate`, `training:eval` und `training:gate` liefern Survival-/Stuck-KPIs, trennen aber noch zu wenig nach Todesursache, Szenarioklasse, Exit-Qualitaet, Resume-Gesundheit und Operator-Fehlern.
- Die aktuellen Gameplay-Aenderungen bei Items, Rocket/Shield, Portalen und Gates muessen fuer Bots zu First-Class-Signalen werden, sonst laufen Runtime, Training und QA weiterhin auseinander.

## Zielkorridor

| KPI / Guardrail | Aktueller Referenzwert | Zwischenziel | Zielbild |
| --- | --- | --- | --- |
| `avgStepsPerEpisode` | `123.799` (BT10 Baseline) | `>= 155` stabil auf Seed-/Mode-Matrix | `>= 185` gem. Q2-Roadmap |
| `averageBotSurvival` | `37.376986` (BT11 stabil), `6.132433` (BT12 Regression) | Rueckkehr auf `>= 37.376986` ohne Forced-/Timeout-Runden | `>= 44.000000` gem. Q2-Roadmap |
| `invalidActionRate` | `0.247460` historisch, spaeter `0.000000` moeglich | `<= 0.01` | stabil `<= 0.01` |
| `forcedRoundRate` / `timeoutRoundRate` | BT12 zeitweise `1.0` | `0` in Abschluss-Validation | `0` als hartes Gate |
| `runtimeErrorCount` | historisch >0 | `0` in jedem Kandidatenlauf | `0` stabil |
| Resume-/Validation-Robustheit | Workaround noetig | `trainer-checkpoint-load` antwortet deterministisch | Resume, Preview-Validate und Publish-Lane laufen ohne Sonderpfad |

## Betroffene Pfade (geplant)

- `src/entities/ai/BotSensorsFacade.js`
- `src/entities/ai/BotSensingOps.js`
- `src/entities/ai/BotThreatOps.js`
- `src/entities/ai/BotPortalOps.js`
- `src/entities/ai/BotRecoveryOps.js`
- `src/entities/ai/BotProbeOps.js`
- `src/entities/ai/BotDecisionOps.js`
- `src/entities/ai/BotActionOps.js`
- `src/entities/ai/RuleBasedBotPolicy.js`
- `src/hunt/HuntBotPolicy.js`
- `src/entities/ai/BotTuningConfig.js`
- `src/entities/ai/observation/ObservationSystem.js`
- `src/entities/ai/observation/ObservationSemantics.js`
- `src/entities/ai/observation/ModeFeatureEncoder.js`
- `src/entities/ai/observation/ItemSlotEncoder.js`
- `src/state/training/RewardCalculator.js`
- `src/state/training/EpisodeController.js`
- `src/state/training/TrainingGateEvaluator.js`
- `src/state/training/TrainingGateThresholds.js`
- `src/state/validation/BotValidationService.js`
- `src/state/validation/BotValidationMatrix.js`
- `src/entities/ai/training/DeterministicTrainingStepRunner.js`
- `src/entities/ai/training/WebSocketTrainerBridge.js`
- `scripts/training-run.mjs`
- `scripts/training-eval.mjs`
- `scripts/training-bot-validation-lane.mjs`
- `scripts/bot-validation-runner.mjs`
- `trainer/server/TrainerServer.mjs`
- `tests/physics-policy.spec.js`
- `tests/training-*.mjs`
- `docs/referenz/ai_architecture_context.md`
- `docs/bot-training/Bot_Trainings_Roadmap.md`

## Definition of Done (DoD)

- [ ] DoD.1 Runtime-Bot nutzt explizite Safety-, Intent- und Recovery-Logik statt nur reaktive Einzelheuristiken; Classic/Hunt teilen konsistente Grundregeln und nur klar dokumentierte Modus-Abzweige.
- [ ] DoD.2 Training und Reward-Shaping verbessern Survival auf der festen Seed-/Mode-Matrix reproduzierbar und ohne Reward-Hacking, Forced-Rounds oder stille KPI-Regression.
- [ ] DoD.3 Eval-/Validation-Reports liefern harte Survival-Metriken, Todesursachen, Szenarioklassen, Resume-Gesundheit und Decision-Trace-Evidence pro Kandidatenlauf.
- [ ] DoD.4 Resume-, Preview-Validate- und Publish-Pfade laufen ohne Sonderworkaround stabil; Artefakte und Run-Manifeste sind vollstaendig und reproduzierbar.
- [ ] DoD.5 Relevante trainingsnahe Tests, `bot:validate`, `training:eval`, `training:gate`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Nicht-Ziele

- Kein stiller Austausch des Bot-Bridge-Vertrags V1 in der produktiven Runtime.
- Kein Training-only Gewinn ohne Bestätigung durch `bot:validate` auf derselben Vergleichsmatrix.
- Kein Full-Rewrite der Bot-Architektur, solange Safety-, Intent- und Eval-Ziele mit den vorhandenen Modulen erreichbar sind.

## Phasenplan

### 73.1 Ground Truth, Failure-Taxonomie und Vergleichsbasis

- [ ] 73.1.1 `bot:validate`, Eval und Recorder um Failure-Codes, Todesursachen, Exit-Qualitaet, Resume-Status und Szenarioklassen erweitern, damit Regressionen nicht mehr nur als eine Gesamtzahl sichtbar sind.
- [ ] 73.1.2 Decision-Trace-Artefakte fuer Hochrisiko-Momente einfuehren (letzte Sensoren, Intent, Action-Veto, Reward-Zerlegung), damit schlechte Bot-Entscheidungen reproduzierbar analysiert werden koennen.
- [ ] 73.1.3 Eine feste Vergleichsmatrix aus Maps, Seeds, Modi und Baseline-Stamps definieren, damit BT10/BT11/BT12/BT20 nicht mehr mit wechselnden Bedingungen gegeneinander verglichen werden.

### 73.2 Sensorik und internes Weltmodell vertiefen

- [ ] 73.2.1 Threat-Horizon-, Dead-End-, Freiraum-, Gegnerdruck- und Exit-Signale in `BotSensingOps`/`BotThreatOps` zentralisieren, damit der Bot nicht erst am Kollisionspunkt reagiert.
- [ ] 73.2.2 Ein kleines internes Gedaechtnis fuer letzte Gefahr, letzte Recovery-Aktion, Portal-/Gate-Nutzung und Fehlschlaege einfuehren, ohne den Runtime-V1-Contract zu brechen.
- [ ] 73.2.3 Items, Portale, Gates, Shield und Modus-Sonderregeln als explizite Beobachtungs- und Policy-Semantik verdrahten, damit V69/V72-Aenderungen nicht als implizite Seiteneffekte in die KI tropfen.

### 73.3 Entscheidungsarchitektur in Safety-, Intent- und Recovery-Layer aufteilen

- [ ] 73.3.1 Einen klaren Safety-Veto-Layer vor der finalen Action-Ausgabe verankern, der Kollision, Low-HP-Risiko, Sackgassen und riskante Item-/Portal-Aktionen deterministisch blocken kann.
- [ ] 73.3.2 Einen Intent-Layer fuer `survive`, `reposition`, `engage`, `disengage`, `recover`, `use-item`, `take-portal`, `take-gate` einfuehren, damit Entscheidungen nicht nur aus losen Prioritaetslisten entstehen.
- [ ] 73.3.3 Recovery-/Stuck-Verhalten als expliziten Zustandsautomaten mit Eintritts- und Exit-Kriterien modellieren, statt Steckenbleiben nur post hoc zu zaehlen.

### 73.4 Reward-Shaping, Curriculum und Replay auf Survival-First ausrichten

- [ ] 73.4.1 Reward-Zerlegung in Survival, sichere Flaechenkontrolle, gelungene Gefahren-Exits und schadensbezogene Rewards nur bei netto ueberlebensfoerderlichem Verhalten aufspalten.
- [ ] 73.4.2 Curriculum-Stufen von einfach zu voller 4-Mode-Matrix mit Promotion-/Rollback-Regeln an echte Survival- und Stability-KPIs koppeln statt nur an Steps oder Reward-Summen.
- [ ] 73.4.3 Priorisierte Replay-/Scenario-Samples fuer near-death, Death-leading, Low-HP-Combat, Portal-/Gate-Entscheidungen und Item-Fehlgebrauch einfuehren.

### 73.5 Eval-, Gate- und Operator-Pfade haerten

- [ ] 73.5.1 `bot:validate` und `training:eval` um harte Guardrails fuer `averageBotSurvival != null`, Forced-/Timeout-Rates, Death-Cause-Verteilung und per-Szenario-Failures erweitern.
- [ ] 73.5.2 `training:gate` auf Vergleich gegen den letzten stabilen Referenzlauf plus Rolling-Window-Regeln ausrichten, damit einmalige Glueckslaeufe nicht promoted werden.
- [ ] 73.5.3 Einen einheitlichen Validate-Pfad fuer Preview/Publish/Operatorlauf bauen, damit Abschluss-Evidence nicht mehr von instabilen Dev-Server- oder Port-Konstellationen abhaengt.

### 73.6 Resume-, Bridge- und Reproduzierbarkeitsluecken schliessen

- [ ] 73.6.1 Den `trainer-checkpoint-load`/`trainer-checkpoint-load-latest` Antwortpfad zwischen `training-run`, `WebSocketTrainerBridge` und `TrainerServer` instrumentieren, testen und reparieren.
- [ ] 73.6.2 Run-Manifeste fuer Resume-Quelle, Modell-/Config-Hash, Gate-Schwellen, Validate-Argumente und Szenario-Matrix standardisieren, damit spaetere KPI-Vergleiche belastbar bleiben.
- [ ] 73.6.3 Eine deterministische A/B-Lane fuer Baseline vs. Kandidat mit festen Seeds, identischem Modus-Mix und publishbarer Evidence etablieren.

### 73.7 Rollout, Fallback und Doku-Sync

- [ ] 73.7.1 Die tieferen KI-Aenderungen hinter klaren Tuning-/Strategy-Schaltern ausrollen, damit `rule-based`, `auto`, Bridge- und Fallback-Pfade kontrolliert verglichen und im Notfall sofort zurueckgenommen werden koennen.
- [ ] 73.7.2 Architektur-, Trainings-, Release- und QA-Dokumentation auf denselben Intent-, Failure- und Gate-Vertrag aktualisieren, damit Runtime, Training und Abnahme denselben Wissensstand teilen.

### 73.99 Integrations- und Abschluss-Gate

- [ ] 73.99.1 Feste Vergleichslaeufe gegen die Baseline sind gruen: kein Resume-Workaround mehr, keine Forced-/Timeout-Runden, `averageBotSurvival` mindestens auf BT11-Stabilniveau und Trend in Richtung Roadmap-Ziel.
- [ ] 73.99.2 Trainingsnahe Tests, `bot:validate`, `training:eval`, `training:gate`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind abgeschlossen; Intake-Hinweise fuer den Masterplan sind dokumentiert.

## Verifikationsstrategie

- Deterministische Trainings-/Vergleichslane:
  - `npm run training:run -- --series-stamp <stamp> ...`
  - `npm run training:eval -- --stamp <runStamp> --bot-validation-report <reportPath>`
  - `npm run training:gate -- --stamp <runStamp> --bot-validation-report <reportPath>`
- Bot-Qualitaet:
  - `npm run bot:validate`
  - `npm run bot:validate:publish`
- Trainingsnahe Tests:
  - `npm run test:core`
  - `npm run test:physics`
  - `npm run test:core -- --grep \"training|bot|policy\"` falls ein engerer Scope schneller validiert
  - `npm run test:core` plus gezielte `tests/training-*.mjs`, sobald neue Failure-Codes und Resume-Smokes vorhanden sind
- Doku-/Prozess-Gates:
  - `npm run plan:check`
  - `npm run docs:sync`
  - `npm run docs:check`
  - `npm run build`

## Risiko-Register V73

- `R1 | high |` Mehr Sensorik und Intent-Logik kann die Runtime-KI spuerbar langsamer machen.
  - Mitigation: Hotpaths in `*Ops.js` halten, Feature-Bundles messen und teure Debug-Evidence nur in Eval/Training oder unter Flags aktivieren.
- `R2 | high |` Ein zu harter Safety-Layer kann die Policy zu passiv machen und Lernen blockieren.
  - Mitigation: Safety zuerst als Veto nur fuer klar katastrophale Aktionen, danach iterativ mit A/B-Lane kalibrieren.
- `R3 | high |` Reward-Shaping kann Reward-Hacking statt echter Survival-Verbesserung erzeugen.
  - Mitigation: Rewards immer gegen `averageBotSurvival`, Death-Causes und stabile Seed-/Mode-Matrix spiegeln.
- `R4 | high |` Bridge-/Resume-Fixes koennen Trainingsbetrieb kurzfristig instabil machen.
  - Mitigation: Smoke-Tests fuer `checkpoint-load`, `latest`, Preview-Validate und Publish-Lane vor Langlaeufen verpflichtend machen.
- `R5 | medium |` Ein internes Bot-Gedaechtnis driftet von der dokumentierten Observation-Semantik weg.
  - Mitigation: internen Zustand explizit dokumentieren und Training-only Erweiterungen vom Runtime-V1-Contract sauber trennen.
- `R6 | medium |` Portal-/Gate-/Item-Vertraege aendern sich parallel in V72 und brechen Bot-Heuristiken.
  - Mitigation: gemeinsame Capability-/Semantik-Quelle definieren und Cross-Plan-Abhaengigkeiten vor jedem Merge pruefen.
- `R7 | medium |` Mehr Failure-Codes und Decision-Trace-Artefakte ueberladen Reports und erschweren Operatorarbeit.
  - Mitigation: kompakte Summary plus gezielte Drilldown-Artefakte, keine unstrukturierte Log-Flut.
- `R8 | medium |` Reproduzierbare A/B-Laeufe kosten Zeit und bremsen Iteration.
  - Mitigation: kurze Smoke-Matrix fuer Preflight und volle Vergleichsmatrix nur fuer Kandidaten-Promotion nutzen.
- `R9 | medium |` Gemeinsame Grundlogik fuer Classic und Hunt verdeckt echte Modus-Unterschiede.
  - Mitigation: gemeinsamer Kern nur fuer Safety/Intent-Infrastruktur, Modus-Gewichte und Spezialaktionen bleiben explizit konfigurierbar.
- `R10 | medium |` Release- und QA-Gates werden strenger, bevor die Operator-Pfade stabil genug sind.
  - Mitigation: neue Gates zuerst informativ einfuehren, dann nach stabiler Lane zu harten Abnahmekriterien hochstufen.
