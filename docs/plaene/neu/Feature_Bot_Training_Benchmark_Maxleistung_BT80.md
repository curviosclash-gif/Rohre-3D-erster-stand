# Feature Bot Training Benchmark Maxleistung BT80

Stand: 2026-04-01
Status: Entwurf
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Das Bot-Training wird auf einen benchmark-first Ablauf umgebaut: zuerst wird eine feste, reproduzierbare Vergleichsbasis aufgebaut und gemessen, danach wird die Trainings- und Hardware-Leistung systematisch bis an die stabile Nutzgrenze ausgereizt. Ziel ist kein einzelner gluecklicher Spitzenlauf, sondern ein Bot, der auf einer festen Matrix aus Modi, Seeds, Szenarioklassen und Gameplay-Semantik robust besser wird, waehrend Trainingsdurchsatz, Resume-Pfade, Gates und Artefakte belastbar bleiben.

## Intake-Hinweis

- Ziel-Masterplan: `docs/bot-training/Bot_Trainingsplan.md`
- Vorgeschlagene Block-Familie: `BT80A`, `BT80B`, `BT80C`
- Geplante Plan-Datei nach Intake: `docs/bot-training/Bot_Benchmark_Maxleistung_Training_Plan_BT80.md`
- Hard dependencies: `BT20.99` als Safety-/Reward-Baseline; haertbare Eval-/Gate-Vertraege aus `BT40`; stabilisierte Gameplay-Semantik fuer Portale, Gates, Items und Shield aus `V72`, bevor finale Vergleichsmatrizen eingefroren oder produktionsnah ausgerollt werden.
- Soft dependencies: `BT30`, `BT73` und die aktuelle BT15-Roadmap sollten nicht parallel in konkurrierende Richtungen laufen; empfohlen ist eine Zusammenfuehrung oder ein bewusstes Supersede statt Split-Scope.
- Datei-Ownership: Hauptsaechlich `scripts/training-*.mjs`, `scripts/bot-validation-*.mjs`, `src/entities/ai/training/**`, `trainer/**`, `src/state/training/**`, `src/state/validation/**`, `src/entities/ai/**`, `tests/training-*.mjs`, `tests/trainer-*.mjs`, `docs/bot-training/**`; moegliche Cross-Block-Kollision mit `V72` in Gameplay-/Portal-/Gate-Pfaden.
- Hinweis: Manuelle Uebernahme in `docs/bot-training/Bot_Trainingsplan.md` erforderlich.

## Empfohlener Blockzuschnitt

Der Gesamtplan ist bewusst nicht als ein einzelner Durchmarsch gedacht. Fuer die Umsetzung wird eine dreistufige Blockfolge empfohlen, damit erst eine harte Messbasis entsteht und erst danach die teureren Architektur- und Maximierungsarbeiten freigeschaltet werden.

### Block BT80A: Benchmark, Reporting und Gate-Haertung

- Ziel: Eine eingefrorene Champion-Baseline, feste Benchmark-Matrix, harte Artefaktpflicht und belastbare Messpipeline schaffen.
- Enthaelt: `80.1`, `80.2`, `80.3`
- Empfohlene Reihenfolge: zuerst `BT20.99` sauber schliessen oder bewusst superseden, dann `BT80A`
- Ergebnis: Ab diesem Punkt kann jeder Kandidatenlauf reproduzierbar gegen dieselbe Wahrheit gemessen werden.
- Ohne Abschluss von `BT80A`: keine Promotion neuer Modelle, keine Aussage ueber "wirklich besser", keine ehrliche Maxleistungs-Optimierung.

### Block BT80B: Runtime-nahe Trainingsbasis und Bot-Architektur

- Ziel: Die Trainingswelt naeher an die echte Runtime bringen und Observation, Memory, Action-Architektur und Hybrid-Policy fuer mehrere Sekunden Absicht aufbauen.
- Enthaelt: `80.4`, `80.5`, `80.6`
- Hard dependency: `BT80A.99`
- Soft dependency: `V72` fuer finale Portal-/Gate-/Item-Semantik sollte vor der finalen Benchmark-Einfrierung dieses Blocks abgestimmt sein.
- Ergebnis: Der Bot wird nicht mehr nur auf vereinfachte Runner-Signale und Einzel-Snapshots optimiert.

### Block BT80C: Algorithmus-Ausbau, High-Util-Training und Champion-Rollout

- Ziel: Auf der gehaerteten Benchmark- und Architektur-Basis Algorithmen, Ablationen und lokale Hardwareprofile bis zur maximal nutzbaren Leistung ausreizen.
- Enthaelt: `80.7`, `80.8`, `80.9`, `80.99`
- Hard dependency: `BT80B.99`
- Ergebnis: Champion/Challenger-Betrieb, Promotion-/Rollback-Regeln und High-Util-Trainingsprofile werden produktionsreif.

## Intake-Variante fuer den Masterplan

- Variante empfohlen: drei getrennte Intake-Bloecke `BT80A`, `BT80B`, `BT80C`
- Variante vermeiden: ein einzelner Sammelblock `BT80`, weil Benchmark, Architektur und Maximierungsbetrieb sonst gleichzeitig offen sind und Regressionen schwer zuordbar werden.
- Empfohlene manuelle Reihenfolge:
  - `BT80A` claimen und abschliessen
  - `BT80B` erst nach gruenem `BT80A.99` intake-faehig machen
  - `BT80C` erst nach gruenem `BT80B.99` intake-faehig machen

## Ausgangslage

- `BT11` ist der letzte sauber dokumentierte Abschlussstand mit positivem Survival-Delta, aber bereits mit erhoehter Forced-Round-Last.
- `BT12` zeigt, dass Zwischengewinne ohne harte, realistische Abschlussvalidierung spaet kollabieren koennen.
- `BT20` adressiert bereits sinnvolle Hebel wie Safety-Layer und Survival-Reward-Shaping, ist aber noch nicht mit einem harten Benchmark-first A/B-Nachweis abgeschlossen.
- Der aktuelle Trainingspfad nutzt fuer grosse Teile einen deterministischen Runner; dadurch ist die Messbarkeit gut, die Runtime-Naehe aber begrenzt.
- Die aktuelle Gate-/Validation-Landschaft ist noch nicht streng genug, wenn Reports fehlen oder Survival-Qualitaet nur indirekt sichtbar wird.
- Der aktuelle MLP-DQN-Aufbau ist fuer reaktive Entscheidungen ausreichend, wird aber ohne staerkere Beobachtungen, Temporalitaet und realistischere Trainingsdaten keine Spitzenrobustheit ueber mehrere Sekunden erreichen.

## Scope

- Desktop-App-Runtime ist die primaere Produkt- und Benchmark-Wahrheit; Browser/Web bleibt Demo-Surface und ist nicht Trainings-Source-of-Truth.
- Der Block umfasst Benchmark-Definition, Messpipeline, Trainingsorchestrierung, Hardware-Auslastung, Observation-/Action-/Reward-Vertraege, Algorithmen-Experimente, Gates und Reporting.
- Das Training wird so geschnitten, dass jede Leistungssteigerung zuerst gegen eine feste Benchmark-Matrix bewiesen wird, bevor neue Langlaeufe oder Rollouts Standard werden.
- Lokale Hardware soll maximal sinnvoll ausgenutzt werden, aber nur innerhalb stabiler Grenzen fuer Resume, Artefakte, Temperatur-/Backpressure-Verhalten und Eval-Qualitaet.
- Runtime-Bot, Training und Operatorpfade werden gemeinsam betrachtet; es reicht nicht, nur das Modell zu vergroessern.

## Nicht-Ziel

- Kein Greenwashing durch lockerere Schwellwerte oder deaktivierte Validation-Lanes.
- Keine Browser-Demo-Vollparitaet als Trainingsziel.
- Kein unkontrolliertes "mehr Layer, mehr Stunden, mehr Glueck" ohne reproduzierbare Benchmark-Basis.
- Kein reines End-to-End-RL ohne deterministischen Safety-/Recovery-Schutz fuer produktionsnahe Bot-Entscheidungen.
- Kein paralleler Wildwuchs aus mehreren aktiven Trainingsbloecken mit ueberlappendem Ownership-Scope.

## Zielbild

- Eine feste Benchmark-Matrix vergleicht jeden Kandidatenlauf gegen denselben Champion auf denselben Seeds, Modi, Szenarioklassen und Gameplay-Vertraegen.
- Jede Benchmark liefert Survival-, Robustheits-, Throughput- und Artefakt-KPIs in einem konsistenten Report.
- Training und Benchmark sind getrennte Lanes: Training darf die Hardware auslasten, Benchmark bleibt eingefroren, schnell und reproduzierbar.
- Missing Reports, deaktivierte Survival-Lanes oder Resume-Ausfaelle fuehren zu hartem Fail statt stillem Pass.
- Die Trainingsorchestrierung kennt definierte Leistungsprofile wie `quick-benchmark`, `ablation`, `overnight-high-util`, `marathon`, jeweils mit klaren Guardrails.
- Der Produktionsbot kombiniert gelernte Policy mit deterministischem Safety-/Recovery-Layer und wird nicht durch einzelne Aktionstemplates oder punktuelle Observations-Snapshots limitiert.

## Betroffene Pfade (geplant)

- `docs/bot-training/Bot_Trainingsplan.md`
- `docs/bot-training/Bot_Trainings_Roadmap.md`
- `docs/bot-training/Bot_Benchmark_Maxleistung_Training_Plan_BT80.md`
- `docs/referenz/ai_architecture_context.md`
- `scripts/training-run.mjs`
- `scripts/training-loop.mjs`
- `scripts/training-eval.mjs`
- `scripts/training-gate.mjs`
- `scripts/training-bot-validation-lane.mjs`
- `scripts/bot-validation-*.mjs`
- `src/entities/ai/training/**`
- `src/entities/ai/observation/**`
- `src/entities/ai/inference/**`
- `src/entities/ai/**`
- `src/state/training/**`
- `src/state/validation/**`
- `trainer/**`
- `tests/training-*.mjs`
- `tests/trainer-*.mjs`
- `tests/physics-policy.spec.js`
- trainingsnahe Doku, Reports und Runbooks

## Definition of Done (DoD)

- [ ] DoD.1 Eine feste Benchmark-Matrix mit Seeds, Modi, Szenarioklassen, Gegnerprofilen und klarer Champion-Referenz ist definiert und fuer jeden Kandidatenlauf automatisch ausfuehrbar.
- [ ] DoD.2 Kein Kandidat wird promoted, solange `bot:validate`, Eval, Gate, Throughput-Telemetrie oder Resume-Health fehlen oder deaktiviert sind.
- [ ] DoD.3 Die Trainingsumgebung ist fuer Benchmark- und Abschlusslaeufe runtime-nah genug, dass ein Benchmarkgewinn nicht nur ein Gewinn gegen synthetische Trainingssignale ist.
- [ ] DoD.4 Observation-, Memory- und Action-Architektur tragen mehr Kontext ueber mehrere Sekunden, Portale, Gates, Items, Shield, Threat-Horizon und Recovery.
- [ ] DoD.5 Training nutzt die verfuegbare lokale Hardware in klaren Leistungsprofilen maximal aus, ohne Resume-/Artifact-/Eval-Stabilitaet zu verlieren.
- [ ] DoD.6 Champion/Challenger-, Promotion-/Rollback- und Benchmark-Reports sind im Bot-Trainingsplan und in der Roadmap dokumentiert.
- [ ] DoD.7 Der finale Champion schlaegt die eingefrorene Baseline reproduzierbar auf der festen Vergleichsmatrix und nicht nur in Einzelruns.
- [ ] DoD.8 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind fuer den Planstand gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

Die folgenden Phasen bleiben als gemeinsamer Programmplan bestehen, werden fuer die Ausfuehrung aber ueber die drei Intake-Bloecke `BT80A`, `BT80B`, `BT80C` aufgeteilt.

### 80.1 Benchmark-Vertrag und Champion-Baseline einfrieren

- [ ] 80.1.1 Eine verbindliche Benchmark-Matrix fuer Modi, Seeds, Maps, Szenarioklassen, Gegnerprofile, Episodenbudget und Bewertungsfenster definieren, damit kuenftige Vergleiche nicht mehr zwischen Laeufen driften.
- [ ] 80.1.2 Einen klaren Champion-Referenzstand festlegen, inklusive letzter belastbarer BT11-/BT20-Referenzen, eingefrorener Checkpoints und dokumentierter Semantikversionen fuer Portale, Gates, Items und Shield.
- [ ] 80.1.3 Ein Benchmark-Manifest-Format und einen Runnerpfad festlegen, der jeden Kandidatenlauf mit denselben Eingaben und denselben Reportpfaden ausfuehrt.

### 80.2 Messpipeline, Failure-Taxonomie und harte Artefaktpflicht

- [ ] 80.2.1 Eval, Gate, `bot:validate`, Resume-Health, Decision-Trace und Hardware-Telemetrie in einen gemeinsamen Benchmark-Report zusammenziehen, damit Survival, Stabilitaet und Durchsatz in einem Blick sichtbar sind.
- [ ] 80.2.2 Failure-Codes fuer `player-dead`, `match-loss`, `forced-round`, `timeout-round`, `bridge-fallback`, `resume-failed`, `artifact-missing`, `validation-disabled` und weitere Kernbilder standardisieren.
- [ ] 80.2.3 Gates so haerten, dass fehlende oder deaktivierte Reports nicht mehr als stilles `pass` durchlaufen duerfen.

### 80.3 Kapazitaetsprofiling und Maxleistungsprofile fuer lokale Hardware

- [ ] 80.3.1 Einen Engpass-Scan fuer Trainer-Server, Bridge, Serialization, Replay, Checkpoint-Export, Eval-Lane, Report-IO und Preview-/Publish-Pfade aufbauen.
- [ ] 80.3.2 Leistungsprofile wie `quick-benchmark`, `ablation`, `overnight-high-util` und `marathon` definieren, jeweils mit konkreten Budgets fuer Workerzahl, Batch-Groesse, Replay, Sync-Intervalle, Checkpoint-Frequenz und Parallelitaet.
- [ ] 80.3.3 Guardrails fuer Temperatur, Backpressure, Queue-Tiefen, Latency-Spikes, Resume-Haeufigkeit und Artefaktstau einbauen, damit "maximal nutzen" nicht in "unstabil kaputtfahren" endet.

### 80.4 Trainingsumgebung von synthetisch zu runtime-nah heben

- [ ] 80.4.1 Den aktuellen deterministischen Trainingsrunner gegen die echte Runtime-Semantik kartieren und die groessten Abweichungen fuer Targeting, Kollision, Gegnerdruck, Portale, Gates, Items und Shield dokumentieren.
- [ ] 80.4.2 Einen runtime-nahen Benchmark- und Trainingspfad aufbauen, der echte oder aus echten Laeufen abgeleitete Zustandsfolgen, Reward-Signale und Todesursachen nutzt.
- [ ] 80.4.3 Synthetische Lanes nur noch als schnelle Vorpruefung, Smoke oder Ablation-Hilfe behalten; Promotion und Abschluss duerfen nur auf runtime-nahen Benchmarks basieren.

### 80.5 Observationen, Temporalitaet und Gedaechtnis erweitern

- [ ] 80.5.1 Observation-V2 fuer Threat-Horizon, Dead-End-Risiko, Exit-Qualitaet, Gegnerdruck, letzte Recovery-Aktion, Portal-/Gate-Kontext, Item-Wert und Shield-Lage entwerfen.
- [ ] 80.5.2 Frame-Stack oder rekurrente Memory-Komponente einfuehren, damit der Bot nicht nur auf einen einzelnen 40er Snapshot reagiert, sondern mehrere Sekunden Verlauf nutzen kann.
- [ ] 80.5.3 Checkpoint-, Resume- und Runtime-Migrationspfade fuer neue Observation-/Modelldimensionen sauber versionieren, damit Benchmarkvergleiche und Resume nicht implodieren.

### 80.6 Action- und Entscheidungsarchitektur hybridisieren

- [ ] 80.6.1 Die Entscheidung in mindestens `Safety`, `Intent` und `Control` aufteilen, damit der gelernte Teil stark werden darf, ohne elementare Selbstzerstoerung wieder freizugeben.
- [ ] 80.6.2 Den Action-Space von starren Templates zu einer feineren Struktur weiterentwickeln, zum Beispiel Intent-Klassen fuer `evade`, `chase`, `portal`, `item-use`, `combat` plus kontrolliertere Ausfuehrung.
- [ ] 80.6.3 Harte Invarianten definieren wie "keine riskante Item-/Portal-Aktion bei aktivem Safety-Veto", damit der Produktionsbot auch unter Last reproduzierbar bleibt.

### 80.7 Lernalgorithmus, Ablationen und Champion/Challenger-Modell

- [ ] 80.7.1 Eine Experimentmatrix fuer `baseline DQN`, `Double DQN`, `Dueling`, `n-step`, `Prioritized Replay`, `recurrent DQN` und gegebenenfalls einen Actor-Critic-Kandidaten definieren.
- [ ] 80.7.2 Ablationen strikt einzeln schneiden, damit jede Aenderung auf einer festen Benchmark-Matrix messbar bleibt und nicht mehrere Variablen gleichzeitig die Ursache verschleiern.
- [ ] 80.7.3 Champion/Challenger-Regeln aufsetzen: Promotion nur bei Benchmarkgewinn, stabilen Gates, sauberem Resume und akzeptabler Throughput-/Kostenrelation.

### 80.8 Trainingsorchestrierung fuer maximale nutzbare Leistung

- [ ] 80.8.1 Langlauf-, Sweep- und Benchmark-Lanes technisch trennen, damit Training die Hardware ausreizen kann, waehrend Benchmark-Laeufe reproduzierbar und nicht durch warmen Zustand verschmutzt werden.
- [ ] 80.8.2 Resume-, Checkpoint-, Retention- und Rollback-Strategien fuer High-Util-Laeufe standardisieren, inklusive automatischer Kandidatenmarkierung, Champion-Pinning und Garbage-Collection fuer Artefakte.
- [ ] 80.8.3 Operator-Runbooks fuer Start, Resume, Pause, Stop, Benchmark-Trigger, Ueberlast-Reaktion und Recovery mit klaren Standardprofilen hinterlegen.

### 80.9 Harte Benchmark-Gates, Reporting und Rollout-Politik

- [ ] 80.9.1 Survival-, Throughput-, Forced-/Timeout-, Invalid-Action-, Resume- und Coverage-Metriken als gleichwertige Rollout-Gates definieren, nicht nur als lose Zusatzinfos.
- [ ] 80.9.2 Benchmark-Reports so strukturieren, dass Baseline, Kandidat, Delta, Kosten, Failure-Mix und Entscheidung `promote / hold / rollback / diagnose` sofort lesbar sind.
- [ ] 80.9.3 Woechentliche Re-Baselining- und Quartalsziel-Logik mit BT15 koppeln, damit das Maximierungsprogramm nicht von veralteten Champions oder verschobenen Hardwarebedingungen lebt.

### 80.99 Abschluss-Gate

- [ ] 80.99.1 Der finale Champion schlaegt die eingefrorene Baseline reproduzierbar auf der festen Benchmark-Matrix und zwar mit vollstaendigen Reports fuer Eval, Gate, `bot:validate`, Resume-Health und Throughput.
- [ ] 80.99.2 High-Util-Profile sind stabil dokumentiert; ein neuer Trainingslauf kann ohne Sonderwissen gestartet, resumed, benchmarked und bei Regression sauber zurueckgerollt werden.
- [ ] 80.99.3 Manuelle Intake-/Handoff-Notiz fuer `docs/bot-training/Bot_Trainingsplan.md` enthaelt die Blockfolge `BT80A -> BT80B -> BT80C`, Dependencies, Scope und die Kernentscheidung `benchmark first, dann maximal nutzbare Leistung`.

## Risiko-Register BT80

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Benchmark wird auf zu schwache oder veraltete Szenarien eingefroren und misst spaeter an der Wirklichkeit vorbei | hoch | Train-Ops + RL | Benchmark-Matrix an Runtime-Semantik und V72-Vertraege koppeln; Champion nur auf bewusst eingefrorener Semantikversion vergleichen | Kandidat schlaegt Benchmark, versagt aber in echter Runtime |
| Mehr Hardware-Auslastung verschlechtert Resume, Artefakte oder Validation, waehrend der Throughput scheinbar steigt | hoch | Train-Ops | High-Util-Profile nur mit Resume-/Artifact-/Validation-Gates freigeben | mehr steps/h, aber steigende `command-timeout`, fehlende Reports oder kaputte Checkpoints |
| Algorithmus- oder Observation-Upgrades machen historische Checkpoints unbrauchbar und zerstoeren Vergleichbarkeit | mittel | Trainer | Versions- und Migrationsvertrag fuer Observation/Checkpoint/Action-Space einfuehren | Resume oder Benchmark import scheitert nach Modellupgrade |
| Hybrid-Policy und Safety-Layer widersprechen sich und der gelernte Teil wird zu konservativ | mittel | RL | Safety-Invarianten dokumentieren, Intent und Control getrennt auswerten, konservative Fehlalarme als eigene KPI messen | Survival steigt, aber Tempo, Zielerreichung oder Item-Nutzung brechen weg |
| Bot wird auf synthetische Runner-Signale statt auf echte Runtime-Verhalten optimiert | hoch | RL + QA | Promotion nur auf runtime-naher Benchmark-Lane; synthetische Runner nur fuer Vorfilter und Ablation | Kandidat ist auf Trainingslane stark, im Runtime-Benchmark aber schwach |
| Zu viele parallele Trainingsbloecke erzeugen Scope-Kollision mit BT30, BT40, BT73 oder V72 | hoch | Planung + User | Intake nur als konsolidierter Nachfolge- oder Merge-Block; keine parallelen konkurrierenden Ownerships | dieselben Dateien werden in mehreren Blocks gleichzeitig beansprucht |
| Decision-Traces und Failure-Taxonomie wachsen unkontrolliert und machen den Betrieb teuer | mittel | Train-Ops | schlanke Pflichttraces fuer Hochrisiko-Momente; tiefe Traces nur fuer Diagnoseprofile | Reports werden gross, langsam oder schwer auswertbar |
| Maximierungsdruck fuehrt zu Reward-Hacking statt zu echter Survival-Qualitaet | hoch | RL | harte Survival-, Resume- und Failure-Mix-Gates; keine Promotion ohne runtime-nahe Benchmark-Verbesserung | hohe Reward-Werte bei schlechter echter Ueberlebenszeit |
