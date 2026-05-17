# Feature: Kompletter Spiel-Wissensgraph als mehrschichtiger Query-Layer (V107)

Stand: 2026-04-29
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V107.md`

## Ziel

Der bestehende Wissensgraph aus `V94` soll von Plan-/Scope-Governance auf einen entitaetszentrierten, semantischen Spielgraphen erweitert werden (Karpathy-nahe Richtung: `entity -> relation -> entity` als primaere Modellierung, Governance nur als eine von mehreren Sichten). Neben Block-/Datei-/Surface-Beziehungen werden Runtime-Systeme, Gameplay-Events, State-Reads/Writes, Test-Abdeckung und kritische Spielpfade modelliert, damit Impact-, Diagnose- und Regressionsfragen ohne Volltextsuche beantwortbar bleiben.

- Mehrschichtiger Graph: Governance + Code-Struktur + Runtime-Gameplay + Content/Balance.
- Semantik-first: gameplay-nahe Entitaeten (`player`, `npc`, `weapon`, `projectile`, `arena`, `mode`, `objective`, `reward`, `status_effect`, `input_action`) werden als stabile IDs gefuehrt und ueber explizite Relationen verknuepft.
- Vollabdeckung der produktrelevanten Repo-Surfaces: `src/`, `tests/`, `scripts/`, `data/contracts/`, `docs/` als explizit auditiertes Coverage-Ziel.
- Reproduzierbare Queries fuer `impact-for-file`, `event-flow`, `untested-systems`, `critical-path-health`.
- Harte Validierungen fuer Gameplay-kritische Pfade (keine Orphans, Pflicht-Testmapping fuer kritische Systeme).
- `SettingManager` ist verpflichtender Referenzknoten im Runtime-/Config-Layer (Node, Kanten, Query-Evidence, Test-Link).
- Weiterhin deterministische Artefakte mit Graph-Check als Gate.

## Semantik-Modell (Karpathy-nahe Richtung)

- Primitiv: gerichtete Tripel (`subject`, `predicate`, `object`) mit typisierten Entitaeten, Qualifiern (`mode`, `phase`, `confidence`, `source`) und optionaler Evidenzreferenz.
- IDs: kanonische, stabile IDs je Entitaetsklasse (z. B. `entity:weapon:plasma_rifle`, `event:combat:hit_registered`, `state:player:hp`).
- Relationen (Mindestset): `participates_in`, `targets`, `causes`, `prevents`, `depends_on_event`, `modifies_state`, `awards`, `consumes_resource`, `gated_by`.
- Trennung der Layer:
  - Semantik-Layer (Spielwelt/Mechanik)
  - Runtime-Layer (Systeme, Events, State)
  - Governance-Layer (Blocke, Scope, Surfaces)
- Inferenzpolitik: erste Ausbaustufe regelbasiert und deterministisch; optionale LLM-Extraktion nur als sekundares Signal mit `source=heuristic` und konservativer `confidence`.

## Desktop-first Scope

- Primaerziel bleibt das Desktop-Hauptprodukt und seine Runtime-/Gameplay-Pfade.
- Browser-/Demo-Pfade werden nur als Consumer modelliert, nicht als neuer First-Class-Laufzeitpfad.
- Keine neue Online-Only-Datenhaltung oder externe Graphdatenbank.

## Nicht-Ziel

- Kein Big-Bang-Umbau der Laufzeitarchitektur.
- Keine verpflichtende 100%-AST-Praezision ueber alle dynamischen Laufzeitpfade im ersten Schritt.
- Kein Ersatz fuer bestehende Architektur-Guards; der Graph erweitert die Analyse, ersetzt sie nicht.
- Keine schwere oder externe Visualisierungsplattform als Blocker fuer die Kernfunktion.

## Betroffene Dateien und Bereiche

- `docs/Umsetzungsplan.md`
- `docs/plaene/neu/Feature_Kompletter_Spielwissensgraph_V107.md`
- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.coverage.json`
- `docs/generated/knowledge-graph.schema.json`
- `scripts/build-knowledge-graph.mjs`
- `scripts/check-knowledge-graph.mjs`
- `scripts/query-knowledge-graph.mjs`
- `scripts/export-knowledge-graph-view.mjs`
- `scripts/architecture/legacy-surface-guard-matrix.json`
- `tools/graph-viewer/index.html`
- `tools/graph-viewer/viewer.js`
- `tools/graph-viewer/viewer.css`
- `data/contracts/knowledge-graph/`
- `src/core/`
- `src/application/`
- `src/ui/`
- `src/shared/contracts/`
- `tests/`
- `docs/referenz/ai_architecture_context.md`
- `.agents/rules/token_efficiency_and_tools.md`
- `.agents/workflows/status.md`

## Umsetzungsleitplanken (ausgearbeitet)

- Mapping-first statt Heuristik-first: Runtime- und Event-Zuordnung startet mit expliziten, versionierten Mapping-Dateien; AST-/Import-Ableitung dient als Zusatzsignal fuer Impact-Queries.
- Kritische Pfade zuerst: Spawn, Combat/Hit, Round-Ende werden als verpflichtender Pilot modelliert, bevor breite Katalogisierung folgt.
- Determinismus bleibt unverhandelbar: alle neuen Layer laufen ueber dieselbe stabile Sortierung/Serialisierung wie V94.
- Guard-Kompatibilitaet: neue Checks ergaenzen bestehende Gates und erzeugen keine stillen Ausnahmen fuer Legacy-Surfaces oder Layer-Grenzen.

## Geplante neue Datenquellen

- `data/contracts/knowledge-graph/runtime-systems.v1.json` (Systemkatalog inkl. `critical`-Marker)
- `data/contracts/knowledge-graph/runtime-event-flows.v1.json` (emits/consumes + Flow-Reihenfolge)
- `data/contracts/knowledge-graph/runtime-state-links.v1.json` (reads_state/writes_state)
- `data/contracts/knowledge-graph/runtime-test-links.v1.json` (validated_by)
- optional: `data/contracts/knowledge-graph/runtime-config-links.v1.json` (uses_param)
- `data/contracts/knowledge-graph/domain-entities.v1.json` (kanonische spielnahe Entitaeten + Typen + Aliase)
- `data/contracts/knowledge-graph/domain-relations.v1.json` (semantische Tripel und Qualifier)

## Definition of Done

- [ ] DoD.1 Das Schema kennt zusaetzlich die Node-Typen `runtime_system`, `game_event`, `game_state`, `game_mode`, `config_param`, `test_case` sowie die Edge-Typen `implements`, `emits`, `consumes`, `reads_state`, `writes_state`, `uses_param`, `validated_by`.
- [ ] DoD.1b Das Schema kennt zusaetzlich semantische Node-Typen `domain_entity` und Relationen fuer spielnahe Tripel (`participates_in`, `targets`, `causes`, `prevents`, `depends_on_event`, `modifies_state`, `awards`, `consumes_resource`, `gated_by`) inklusive Qualifier (`source`, `confidence`, `mode`, `phase`).
- [ ] DoD.2 Der Build erzeugt diese neuen Knoten/Kanten deterministisch aus bestehenden Quellen plus klar dokumentierten Mapping-Dateien, ohne manuelle Nachpflege im generierten Graph.
- [ ] DoD.3 `graph:check` validiert zusaetzlich: keine orphan `runtime_system`-Nodes, keine kritischen Runtime-Systeme ohne `validated_by`-Kante, keine unbekannten Referenz-IDs in Runtime-Mappings.
- [ ] DoD.4 Query-CLI bietet mindestens `impact-for-file`, `event-flow`, `untested-systems`, `critical-path-health` mit stabilem Text- und JSON-Output.
- [ ] DoD.4b Query-CLI bietet zusaetzlich `entity-neighborhood`, `why-can`, `why-not`, `path-between-entities` fuer semantische Spielweltfragen.
- [ ] DoD.4c Ein lokaler, read-only Graph-Viewer ist verfuegbar (Desktop-first, ohne externe DB-Pflicht) mit mindestens: Node-Typ-Filter, Suchfeld (ID/Label), Nachbarschaftsfokus fuer selektierten Knoten, Export-Link auf den zugrunde liegenden JSON-Ausschnitt.
- [ ] DoD.5 Fuer mindestens drei kritische Spielpfade (Spawn, Combat/Hit, Round-Ende) ist der End-to-End-Flow als Graphkante abfragbar und durch Contract-/Targeted-Tests referenzierbar.
- [ ] DoD.6 `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` bleiben gruen.
- [ ] DoD.7 Messbarer Query-Nutzen fuer neue Fragen: pro Referenzquery (`impact-for-file`, `event-flow`, `untested-systems`) Graph-Read <= 120 Zeilen und mindestens 2.5x kleiner als Baseline-Volltextspur; Messung erfolgt auf fixierten Referenzfixtures (`data/contracts/knowledge-graph/benchmarks/*.json`) mit dokumentiertem Harness (cold+warm run, Median aus 5 Laeufen).
- [ ] DoD.8 `docs/generated/knowledge-graph.coverage.json` weist fuer den Desktop-Kernscope eine vollstaendige Abdeckung aus (`src/core/`, `src/application/`, `src/ui/`, `src/shared/contracts/`, `scripts/build-knowledge-graph.mjs`, `scripts/check-knowledge-graph.mjs`, `scripts/query-knowledge-graph.mjs`, `data/contracts/knowledge-graph/`, `docs/referenz/ai_architecture_context.md`), inklusive `covered_files`, `uncovered_files`, Coverage-Quote und begruendeter Allowlist fuer bewusst ausgeschlossene Dateien.
- [ ] DoD.9 `SettingManager` ist explizit im Graph modelliert (`runtime_system` + `uses_param` + mindestens ein `validated_by`), und per Referenzquery dokumentiert (`impact-for-file` + `critical-path-health`).
- [ ] DoD.10 Relations-Constraints sind schema- und check-seitig erzwungen (`domain/range`, Kardinalitaet, erlaubte Layer je Predicate), inklusive Fehlermeldung mit verletzter Kante.
- [ ] DoD.11 Alle nicht-trivialen Kanten sind auf Evidence-Ebene aufloesbar (`file`, `line`, `commit`), und Query-Outputs koennen diese Provenance referenzieren.
- [ ] DoD.12 Widersprueche (`contradictions`) sind fuer kritische Pfade ein harter Check-Fail; fuer nicht-kritische Pfade mindestens als Warnklasse reportet.
- [ ] DoD.13 Runtime-Telemetrie-Replay (stichprobenbasierte Trace-Fixtures) validiert modellierte Event-Flows fuer Spawn, Combat/Hit und Round-Ende gegen beobachtetes Laufzeitverhalten.
- [ ] DoD.14 Delta-Gates fuer PR-/Diff-Sicht pruefen geaenderte Subgraphen streng (inkl. kritischer Pfade) und reduzieren Full-Graph-Pflichtchecks auf den notwendigen Umfang.
- [ ] DoD.15 Ontology-Migrationspfad ist versioniert (`schema`/`id`-Migrationen) und automatisiert testbar, sodass historische Contracts reproduzierbar migriert werden.
- [ ] DoD.16 Query-SLOs fuer Kernqueries (`impact-for-file`, `event-flow`, `critical-path-health`, `entity-neighborhood`) sind definiert, gemessen und gegen Regression abgesichert; Messumgebungen sind explizit fixiert (`desktop-local` und `ci-linux`), inkl. dokumentierter Hardware-/Runner-Klasse und Fixture-Groesse.
- [ ] DoD.17 Fuer kritische Check-Fails existieren graph-abgeleitete Failure-Playbooks mit klaren Operator-Schritten (Diagnose -> Verifikation -> Gate-Exit).
- [ ] DoD.18 Negative-Edge-Model ist verfuegbar (`cannot`, `forbidden_by`, `blocked_by`) und wird in `why-not`-Ergebnissen zuerst-classig ausgewertet.
- [ ] DoD.19 Causal-Weighting je Relation (`strength`, `directness`) ist im Schema verankert und beeinflusst Ranking/Priorisierung in Impact-Queries.
- [ ] DoD.20 Ownership-Layer (`owner_team`, `owner_contact`, optional `oncall`) ist fuer kritische Subgraphen gepflegt und querybar.
- [ ] DoD.21 Stability-Index pro Node/Edge ist definiert (u. a. Churn, Test-Health, Incident-Historie) und als Trend abfragbar.
- [ ] DoD.22 Query-Intent-Presets (`incident`, `review`, `balance`, `onboarding`) liefern stabile, dokumentierte Default-Filter und Ausgabeprofile.
- [ ] DoD.23 Cross-Artifact-Linking zu PR/Issue/ADR ist fuer kritische Pfade nachgewiesen und in Explainability-Ausgaben sichtbar.
- [ ] DoD.24 Evidence-Exports besitzen PII/Secret-Safety-Filter mit redaktionierbaren Feldern und pruefbarem Default-Schutz.
- [ ] DoD.25 Graph-Quality-Scorecard pro Build (Coverage, Contradictions, SLO, Freshness) ist erzeugt, historisiert und als Gate-Signal nutzbar.
- [ ] DoD.26 Counterfactual-Queries (`what-if-remove`, `what-if-replace`) liefern reproduzierbare Impact-Sichten fuer mindestens zwei kritische Pfade.
- [ ] DoD.27 Uncertainty-Budget ist pro Kernquery ausgewiesen (z. B. Unsicherheitsanteil, Evidenzabdeckung) und als Schwellwert pruefbar.
- [ ] DoD.28 Incident-Auto-Minimization erzeugt den kleinsten relevanten Teilgraph fuer kritische Fails und reduziert Diagnoseausgabe nachweisbar.
- [ ] DoD.29 Temporal-Anomaly-Detection erkennt Event-Flow-Abweichungen ueber Zeitfenster und reportet sie mit Ursache-Hinweisen.
- [ ] DoD.30 Schema-Lint fuer Naming/IDs verhindert Ontology-Drift (Alias-Wildwuchs, inkonsistente ID-Praefixe) per Gate.
- [ ] DoD.31 Graph-Backed-Test-Prioritization liefert fuer Diffs eine priorisierte Testliste und belegt Trefferquote gegen Baseline.
- [ ] DoD.32 Policy-as-Data steuert Gate-Regeln aus versionierten Policies statt harter Check-Logik im Code.
- [ ] DoD.33 Human-Feedback-Loop (`helpful/not_helpful`) fliesst in Presets/Ranking ein und ist als lernende Verbesserung messbar.

## Scope-Schnitt fuer V107-Abschluss (verbindlich)

- `V107.99` wird gegen DoD.1 bis DoD.12 abgeschlossen (Core-Claim).
- DoD.13 bis DoD.33 bleiben angenommen, werden aber als Folgeausbau in nachgelagerte Bloecke ueberfuehrt (empfohlen: `V110` fuer Ops/Guards, `V111` fuer adaptive/intelligence Erweiterungen).
- Bei Uebernahme nach `docs/plaene/aktiv/V107.md` darf `107.99` nur Kern-DoD blockieren; Folge-DoD duerfen dort nicht als harte Abschlussbedingung stehen.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V107`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V107.md`
- hard dependencies: `V94.99`
- soft dependencies: `V104.99`, `V105.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 107.1 Domaenenmodell und Schema v2 festziehen
status: open
goal: Spielnahe Graph-Domaene klar und maschinenpruefbar definieren
output: Schema-Erweiterung und Mapping-Vertrag

- [ ] 107.1.1 Node-/Edge-Taxonomie fuer Runtime, Events, State, Modes, Config und Tests finalisieren und im Schema versioniert dokumentieren.
- [ ] 107.1.1b Entitaetskatalog (`domain_entity`) und Relationsvokabular fuer spielnahe Tripel finalisieren; Alias-Policy fuer Synonyme und Legacy-Begriffe festlegen.
- [ ] 107.1.2 Mapping-Quellen fuer Runtime-Systeme und kritische Pfade unter `data/contracts/knowledge-graph/*.json` festlegen (inklusive Ownership, Naming-Konvention, Unknown-ID-Policy).
- [ ] 107.1.3 Coverage-Vertrag fuer Desktop-Kernscope definieren: Scope-Includes (`src/core/`, `src/application/`, `src/ui/`, `src/shared/contracts/`, Knowledge-Graph-Skripte, `data/contracts/knowledge-graph/`, `docs/referenz/ai_architecture_context.md`), erlaubte Excludes/Allowlist und minimales Report-Schema fuer `knowledge-graph.coverage.json`.

### 107.2 Builder um Runtime- und Code-Struktur-Layer erweitern
status: open
goal: Vollstaendige, deterministische Erzeugung der neuen Schichten
output: Erweiterter Build mit reproduzierbaren Kanten

- [ ] 107.2.1 `build-knowledge-graph` modular um Runtime-System-, Event-, State- und Param-Kanten erweitern (`implements`, `emits/consumes`, `reads_state/writes_state`, `uses_param`).
- [ ] 107.2.1b Builder um Entitaets-/Relations-Ingestion erweitern: semantische Tripel aus `domain-entities`/`domain-relations` einlesen, normalisieren und als eigene Schicht serialisieren.
- [ ] 107.2.2 Technische Impact-Kanten (`imports`/`calls`) fuer priorisierte Kernpfade ableiten und mit stabilen IDs in den Graph integrieren; dynamische/mehrdeutige Treffer werden als `confidence`-Metadatum gekennzeichnet.
- [ ] 107.2.3 `SettingManager` als Pflicht-Referenz im Builder verankern (Runtime-System-Node, Config-Param-Links, Test-Link-Validierung), inkl. klarer Fehlermeldung, falls Mapping fehlt.

### 107.3 Validierungen und Qualitaets-Gates erweitern
status: open
goal: Drift in kritischen Gameplay- und Testbeziehungen frueh stoppen
output: Neue Check-Regeln fuer Runtime-Vollstaendigkeit

- [ ] 107.3.1 `check-knowledge-graph` um Runtime-Orphan-, Missing-Validation- und Unknown-Reference-Regeln erweitern.
- [ ] 107.3.2 Kritische Systeme markieren und als Gate-Regel erzwingen: keine `critical=true`-Systeme ohne mindestens einen gueltigen `validated_by`-Link.
- [ ] 107.3.3 Coverage-Gate ergaenzen: `knowledge-graph.coverage.json` muss vorhanden sein, Coverage fuer den vereinbarten Desktop-Kernscope darf nicht unter den festgelegten Schwellwert fallen, und neue Uncovered-Dateien ohne Allowlist-Eintrag failen den Check.

### 107.4 Query-Layer fuer Alltag und Incident-Diagnose ausbauen
status: open
goal: Spielrelevante Fragen mit wenigen Zeilen lesbar beantworten
output: Neue CLI-Queries inkl. JSON-Output

- [ ] 107.4.1 `query-knowledge-graph` um `impact-for-file` und `event-flow` erweitern.
- [ ] 107.4.2 `query-knowledge-graph` um `untested-systems` und `critical-path-health` erweitern und in Rule/Workflow als Standardpfad dokumentieren.
- [ ] 107.4.3 Referenzquery fuer `SettingManager` dokumentieren (mindestens `impact-for-file <SettingManager-Datei>` mit stabiler JSON-Ausgabe).
- [ ] 107.4.4 Semantische Queries `entity-neighborhood`, `why-can`, `why-not`, `path-between-entities` einfuehren; fuer jede Query mindestens ein fixturebasiertes Referenzbeispiel dokumentieren.

### 107.5 Pilot-Mapping fuer kritische Spielpfade
status: open
goal: End-to-End-Nutzen an produktkritischen Kernpfaden zeigen
output: Drei belastbare Referenzpfade im Graph

- [ ] 107.5.1 Spawn-Pfad (Entry -> Spawn -> Control-Ready) mit Runtime-Systemen, Events, State und Tests verlinken.
- [ ] 107.5.2 Combat-/Hit- und Round-Ende-Pfad inklusive Ergebnis-/Score-Writeback verlinken und Query-Evidence dokumentieren.

### 107.6 Dokumentation und Rollout fuer Folgeblocks
status: open
goal: Graph-First fuer spielnahe Diagnosen in den Arbeitsalltag ueberfuehren
output: Konsistente Rule-/Workflow-/Architektur-Dokumentation

- [ ] 107.6.1 `docs/referenz/ai_architecture_context.md` um Runtime-Graph-Lesepfad und neue Query-Beispiele erweitern.
- [ ] 107.6.2 `.agents/rules/token_efficiency_and_tools.md` und `.agents/workflows/status.md` auf die neuen Queries (`impact-for-file`, `untested-systems`, `critical-path-health`) spiegeln.
- [ ] 107.6.3 Minimalen lokalen Viewer bereitstellen (`tools/graph-viewer/*`): read-only, laedt `docs/generated/knowledge-graph.json` (oder exportierten Teilgraph), bietet Typfilter/Suche/Nachbarschaft und ist in der Referenzdoku mit Startkommando beschrieben.

### 107.7 Guard-Haertung und Ops-Faehigkeit erweitern
status: open
goal: Semantische Integritaet, Laufzeitabgleich und Incident-Reaktion als Standard absichern
output: Erweiterte Constraint-, Delta-, SLO- und Playbook-Gates

- [ ] 107.7.0 `change-risk` als explizite Baseline-Query bereitstellen (Inputs, Score-Faktoren, JSON-Schema), bevor Playbooks oder Stabilitaetsfaktoren darauf aufbauen.
- [ ] 107.7.1 Predicate-Constraints (`domain/range`, Kardinalitaet, Layer) als Contract-Schema + `graph:check`-Regeln implementieren.
- [ ] 107.7.2 Evidence-Provenance auf Zeilenebene (`file`, `line`, `commit`) fuer Kernkanten ergaenzen und in Query-Ausgaben referenzierbar machen.
- [ ] 107.7.3 Contradiction-Detection als First-Class Gate einfuehren (kritische Widersprueche failen, nicht-kritische werden klassifiziert reportet).
- [ ] 107.7.4 Runtime-Telemetrie-Replay-Fixtures fuer kritische Pfade anbinden und Abweichungsreport in `graph:check` aufnehmen.
- [ ] 107.7.5 Delta-Gates fuer geaenderte Subgraphen (`impact-diff`-basiert) als Standardpfad fuer PR-/Commit-Validierung dokumentieren.
- [ ] 107.7.6 Ontology-Migrationen (`schema`/`id`) als versionierte Skripte + Regressionstests absichern.
- [ ] 107.7.7 Query-SLO-Metriken erheben und als Regression-Gate fuer Kernqueries verankern.
- [ ] 107.7.8 Failure-Playbooks fuer `critical-path-health`/`change-risk`-Fails in Referenzdoku und Workflow verankern.

### 107.8 Wissensnutzung, Sicherheit und Ownership erweitern
status: open
goal: Diagnose-Qualitaet, Bedienbarkeit und sichere Kollaboration auf Produktniveau bringen
output: Negative-Kanten, Presets, Ownership, Linking, Safety und Scorecard

- [ ] 107.8.1 Negative-Edge-Model (`cannot`, `forbidden_by`, `blocked_by`) in Schema, Builder und `why-not`-Query integrieren.
- [ ] 107.8.2 Causal-Weighting (`strength`, `directness`) fuer zentrale Relationen einfuehren und Ranking in `impact-for-file`/`impact-diff` nachweisbar beeinflussen.
- [ ] 107.8.3 Ownership-Layer fuer kritische Subgraphen einziehen (Owner-Team/Kontakt) und als Incident-Ausgabe in Queries verfuegbar machen.
- [ ] 107.8.4 Stability-Index berechnen und trendfaehig speichern; `change-risk` um Stabilitaetsfaktor erweitern.
- [ ] 107.8.5 Query-Intent-Presets (`incident`, `review`, `balance`, `onboarding`) als stabile CLI-Presets + Doku-Beispiele ausrollen.
- [ ] 107.8.6 Cross-Artifact-Linking (`pr`, `issue`, `adr`) fuer kritische Pfade und Explainability-Output absichern.
- [ ] 107.8.7 PII/Secret-Safety-Filter fuer Export- und Viewer-Ausgaben als Default aktivieren; Override nur explizit und auditierbar.
- [ ] 107.8.8 Graph-Quality-Scorecard pro Build erzeugen, historisieren und als Gate-/Trend-Signal in Workflow integrieren.

### 107.9 Entscheidungsintelligenz und adaptive Query-Qualitaet erweitern
status: open
goal: What-if-Analyse, Unsicherheitssteuerung und testnahe Priorisierung fuer schnellen Alltagseinsatz
output: Counterfactuals, Uncertainty, Minimization, Anomaly, Policy und Feedback-Loop

- [ ] 107.9.1 Counterfactual-Queries (`what-if-remove`, `what-if-replace`) fuer kritische Pfade umsetzen und mit Referenzdiffs belegen.
- [ ] 107.9.2 Uncertainty-Budget je Kernquery berechnen und als Query-/Gate-Signal ausgeben.
- [ ] 107.9.3 Incident-Auto-Minimization fuer kritische Fails implementieren (minimaler relevanter Subgraph + Explainability).
- [ ] 107.9.4 Temporal-Anomaly-Detection fuer Event-Flows anbinden (Fenstervergleich, Drift-Report, Schwellwerte).
- [ ] 107.9.5 Schema-Lint fuer Naming/ID-Standards als verpflichtenden Pre-Check integrieren.
- [ ] 107.9.6 Graph-Backed-Test-Prioritization fuer Diff-basierte Testauswahl bereitstellen und gegen Baseline validieren.
- [ ] 107.9.7 Policy-as-Data fuer Gate-Regeln einziehen (versionierte Policy-Dateien + Validator).
- [ ] 107.9.8 Human-Feedback-Loop fuer Query-Helpful-Signale integrieren und Ranking/Preset-Verbesserung dokumentieren.

### 107.99 Abschluss-Gate
status: open
goal: Mehrschichtiger Spielgraph gruensicher und reproduzierbar abgeschlossen
output: Gruene Gates, dokumentierte Referenzqueries, Intake-fertiger aktiver Block

- [ ] 107.99.1 `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen.
- [ ] 107.99.2 Referenzqueries fuer `impact-for-file`, `event-flow`, `untested-systems`, `critical-path-health` sind im Block mit Zeilen-/Nutzenvergleich dokumentiert.
- [ ] 107.99.3 Architekturkontext, Rule und Workflow spiegeln den neuen Graph-First-Leseweg fuer spielnahe Diagnosen konsistent.
- [ ] 107.99.4 Mapping-Dateien und Query-Outputs sind als Contract-/Fixture-Tests abgesichert, damit Schema- oder Builder-Aenderungen Drift sofort sichtbar machen.
- [ ] 107.99.5 Die Repo-Coverage-Evidence (inklusive Allowlist-Begruendungen) und die `SettingManager`-Referenzqueries sind im Abschluss-Gate nachvollziehbar dokumentiert.
- [ ] 107.99.6 Viewer-Smoke ist gruen dokumentiert (Laden, Filtern, Suche, Nachbarschaftsfokus auf mindestens einem kritischen Pfad) und bleibt read-only ohne Schreibpfad in Graph-Artefakte.
- [ ] 107.99.7 Predicate-Constraints, Contradiction-Detection und Evidence-Provenance sind in `graph:check` und Referenzqueries nachweisbar aktiv.
- [ ] 107.99.8 Folgepaket-Backlog fuer DoD.13-DoD.33 ist als separater Intake (V110/V111) dokumentiert, inklusive harter Dependencies auf `V107.99`.

## Risiken

- R1 | mittel | Runtime-Mapping kann anfangs unvollstaendig sein und scheinbare Luecken erzeugen.
- R2 | mittel | Zu breite Import-/Call-Kanten koennen Signal-Rauschen erzeugen; Priorisierung auf kritische Pfade ist noetig.
- R3 | mittel | Kritische-System-Pflichttests koennen kurzfristig Gate-Druck erzeugen, wenn Altpfade noch keine stabile Testzuordnung haben.
- R4 | niedrig | Query-Erweiterungen koennen bei unklaren Namenskonventionen inkonsistent wirken; feste ID-/Naming-Regeln reduzieren das Risiko.

## Konkretes Upgrade-Paket (V107.1 + V107.2 Vorschlag)

Ziel: Den Graphen von einer strukturellen Sicht zu einer belastbaren Diagnose- und Entscheidungsgrundlage fuer die komplette Repo entwickeln.

### U1 Coverage-First als hartes Gate

- Nutzen: Sichtbar, welche produktrelevanten Dateien noch nicht im Graph referenziert sind.
- Umsetzung:
  - Coverage-Report `docs/generated/knowledge-graph.coverage.json` mit `covered_files`, `uncovered_files`, `coverage_ratio`, `allowlist`.
  - `graph:check` failt bei neuen `uncovered_files` ohne Allowlist-Eintrag.
- Aufwand: mittel
- Risiko: mittel (einmaliger Aufraeumdruck bei initialer Erhebung)
- DoD-Erweiterung:
  - [ ] U1-DOD Coverage fuer vereinbarten Scope ist >= Zielschwelle, neue Luecken ohne Begruendung blockieren.

### U2 Vertrauensmodell pro Kante

- Nutzen: Queries koennen harte Evidenz (`contract`) von heuristischen Ableitungen unterscheiden.
- Umsetzung:
  - Jede Edge bekommt `source` (`contract|static|heuristic|manual`) und `confidence` (0..1).
  - Query-Filter fuer `--min-confidence` und `--source`.
- Aufwand: mittel
- Risiko: niedrig
- DoD-Erweiterung:
  - [ ] U2-DOD Alle neu erzeugten Edges tragen `source` und `confidence`; Query-Filter ist stabil verfuegbar.

### U3 Pflicht-Referenzpfad SettingManager

- Nutzen: Konfigurationsfluss ist nicht nur implizit, sondern als diagnosefaehiger Kernpfad gesichert.
- Umsetzung:
  - `SettingManager` als `runtime_system`.
  - `uses_param`-Kanten auf relevante `config_param`-Nodes.
  - Mindestens ein `validated_by`-Link plus Referenzquery-Evidence.
- Aufwand: klein
- Risiko: niedrig
- DoD-Erweiterung:
  - [ ] U3-DOD `SettingManager`-Pfad ist im Graph, Query-Output und Tests reproduzierbar nachgewiesen.

### U4 Impact-Diff fuer PR-/Commit-Sicht

- Nutzen: Bei Aenderungen sofort sichtbar, welche kritischen Systeme/Pfade potenziell betroffen sind.
- Umsetzung:
  - Neues Query `impact-diff --base <sha> --head <sha>` (oder Dateiliste als Input).
  - Output: betroffene `runtime_system`, kritische Pfade, fehlende Test-Links.
- Aufwand: mittel
- Risiko: mittel
- DoD-Erweiterung:
  - [ ] U4-DOD `impact-diff` liefert stabilen JSON-Output und ist fuer mindestens 2 Referenzdiffs dokumentiert.

### U5 Test-Wirkung statt nur Test-Link

- Nutzen: Nicht nur "es gibt einen Test", sondern "welchen Event-/State-Uebergang deckt er".
- Umsetzung:
  - Erweiterung `runtime-test-links` um `asserts`-Metadaten (z. B. event/state transition ids).
  - Query `untested-systems` bewertet auch fehlende Assertions fuer kritische Flows.
- Aufwand: mittel bis hoch
- Risiko: mittel
- DoD-Erweiterung:
  - [ ] U5-DOD Kritische Pfade (Spawn, Combat/Hit, Round-Ende, SettingManager-Config) haben je mindestens eine explizite Assertion-Zuordnung.

### U6 Drift-/Freshness-Layer

- Nutzen: Veraltete Graphbeziehungen werden automatisch sichtbar.
- Umsetzung:
  - Knoten/Kanten mit `last_verified_at`, `last_verified_by` (Commit/Test-Run) anreichern.
  - Check-Regel fuer stale Eintraege ueber konfigurierbares Fenster.
- Aufwand: mittel
- Risiko: mittel
- DoD-Erweiterung:
  - [ ] U6-DOD Freshness-Felder sind vorhanden, stale Eintraege werden in `graph:check` reportet oder blockiert.

### Empfohlene Reihenfolge

1. U1 Coverage-First
2. U3 SettingManager-Pflichtpfad
3. U2 Vertrauensmodell
4. U5 Test-Wirkung
5. U4 Impact-Diff
6. U6 Drift-/Freshness-Layer
7. U7 Zeitdimension (`valid_from`/`valid_to`/`observed_at`)
8. U8 Evidenzstaerke (`evidence_count`/`contradictions`)
9. U9 Query-Regressionstests (goldene Referenzqueries)
10. U10 Subgraph-Caching fuer Hot-Queries
11. U11 Explainability-Mode (`why this result`)
12. U12 Change-Risk-Score (Zentralitaet + Coverage + Churn)
13. U13 Relation-Constraints (`domain/range`, Kardinalitaet, Layer-Regeln)
14. U14 Evidence-Provenance auf Zeilenebene (`file`, `line`, `commit`)
15. U15 Contradiction-Detection als Gate (`critical` fail, non-critical warn)
16. U16 Runtime-Telemetrie-Replay fuer kritische Event-Flows
17. U17 Delta-Gates fuer geaenderte Subgraphen (PR-/Commit-Sicht)
18. U18 Ontology-Migrationspfad (Versionierung + Migrationsskripte)
19. U19 Query-SLOs fuer Kernqueries (Latenz/Output-Groesse)
20. U20 Failure-Playbooks aus Graph-Checks (`critical-path-health`, `change-risk`)
21. U21 Negative-Edge-Model (`cannot`, `forbidden_by`, `blocked_by`)
22. U22 Causal-Weighting pro Relation (`strength`, `directness`)
23. U23 Ownership-Layer pro kritischem Subgraph
24. U24 Stability-Index pro Node/Edge (Trendfaehigkeit)
25. U25 Query-Intent-Presets (`incident`, `review`, `balance`, `onboarding`)
26. U26 Cross-Artifact-Linking (PR/Issue/ADR)
27. U27 PII/Secret-Safety-Filter fuer Evidence-Export
28. U28 Graph-Quality-Scorecard pro Build
29. U29 Counterfactual-Queries (`what-if-remove`, `what-if-replace`)
30. U30 Uncertainty-Budget pro Query
31. U31 Incident-Auto-Minimization (minimaler Subgraph)
32. U32 Temporal-Anomaly-Detection auf Event-Flows
33. U33 Schema-Lint fuer Naming/IDs
34. U34 Graph-Backed-Test-Prioritization
35. U35 Policy-as-Data fuer Gate-Regeln
36. U36 Human-Feedback-Loop fuer Query-Qualitaet

### Claim-Schnitt fuer naechste Iteration

- Minimal claimbar: U1 + U3 + U2 (schneller, hoher Nutzen, geringes Risiko)
- Danach Ausbauclaim: U5 + U4
- Abschliessender Stabilitaetsclaim: U6
- Erweiterter Ausbauclaim: U7 + U8 + U9
- Performance-/Ops-Claim: U10 + U11 + U12
- Integritaetsclaim: U13 + U14 + U15
- Runtime-Realitaetsclaim: U16 + U17
- Betriebsclaim: U18 + U19 + U20
- Diagnoseclaim: U21 + U22 + U25
- Ownershipclaim: U23 + U24 + U26
- Safety-/Governanceclaim: U27 + U28
- Entscheidungsclaim: U29 + U30 + U31
- Drift-/Qualitaetsclaim: U32 + U33 + U34
- Adaptionsclaim: U35 + U36

## Scope-Entscheid (re-scoped)

Status: angepasst (2026-05-05)

- In `V107` verpflichtend: U1-U12 als Core-Claim (entspricht DoD.1-DoD.12 + 107.99 Core-Gates).
- In Folgeblocks verpflichtend: U13-U20 (Ops/Guard-Haertung) und U21-U36 (adaptive/intelligence Ausbau).
- Empfohlene Aufteilung:
  - `V110`: U13-U20
  - `V111`: U21-U36

Konsequenz:

- `V107` gilt als abgeschlossen, wenn der Core-Claim (DoD.1-DoD.12) mit Evidence im Abschluss-Gate nachgewiesen ist.
- U13-U36 bleiben im Backlog erhalten, blockieren aber `V107.99` nicht.

## Zusatzpaket U7-U12 (angenommen)

### U7 Zeitdimension im Graph

- Nutzen: historische und aktuelle Zusammenhaenge sauber trennen.
- Umsetzung:
  - Knoten/Kanten um `valid_from`, `valid_to`, `observed_at` erweitern.
  - Query-Filter `--as-of <timestamp>`.
- DoD-Erweiterung:
  - [ ] U7-DOD Zeitliche Filter liefern reproduzierbare `as-of`-Sichten fuer mindestens 2 Referenzqueries.

### U8 Evidenzstaerke statt nur Confidence

- Nutzen: heuristische Kanten besser gegen belastbare Kanten priorisieren.
- Umsetzung:
  - Edge-Metadaten: `evidence_count`, `contradictions`.
  - Check-Regeln fuer harte Pfade mit Mindest-Evidenz.
- DoD-Erweiterung:
  - [ ] U8-DOD Kritische Pfadkanten tragen `confidence`, `evidence_count` und `contradictions`; Gate meldet Unterdeckung.

### U9 Query-Regressionstests (Golden Files)

- Nutzen: Semantik- und Ausgabe-Drift in Queries frueh stoppen.
- Umsetzung:
  - Fixture-Suite mit Gold-Outputs fuer Kernqueries.
  - CI vergleicht JSON/Text-Ausgabe byte-stabil.
- DoD-Erweiterung:
  - [ ] U9-DOD Golden-Query-Tests laufen in CI gruen und decken mindestens 6 Kernqueries ab.

### U10 Subgraph-Caching fuer Hot-Queries

- Nutzen: schnellere Diagnose und Viewer-Reaktionszeit.
- Umsetzung:
  - Vorgebaute Teilgraph-Artefakte fuer `impact-for-file`, `critical-path-health`, `entity-neighborhood`.
  - Cache-Invalidierung via Graph-Hash.
- DoD-Erweiterung:
  - [ ] U10-DOD Hot-Queries zeigen messbare Laufzeitreduktion gegen Baseline (dokumentierter Vergleich).

### U11 Explainability-Mode

- Nutzen: jedes Query-Ergebnis nachvollziehbar begruenden.
- Umsetzung:
  - Optionaler Modus `--explain` liefert Pfad + Quellen + Filterentscheidungen.
- DoD-Erweiterung:
  - [ ] U11-DOD Mindestens 4 Kernqueries unterstuetzen `--explain` mit stabiler, menschenlesbarer Begruendung.

### U12 Change-Risk-Score

- Nutzen: Review-/Testfokus auf riskante Aenderungen lenken.
- Umsetzung:
  - Score aus Zentralitaet, Testabdeckung, Churn und Kritikalitaet.
  - Query `change-risk` + `impact-diff`-Anreicherung.
- DoD-Erweiterung:
  - [ ] U12-DOD `change-risk` liefert reproduzierbaren Score mit aufgeschluesselten Faktoren fuer mindestens 2 Referenzdiffs.

## Zusatzpaket U13-U20 (angenommen)

### U13 Relation-Constraints pro Predicate

- Nutzen: Semantisch ungueltige Kanten werden frueh erkannt und nicht in Queries weitergereicht.
- Umsetzung:
  - Pro Relation `domain`, `range`, Kardinalitaet und erlaubte Layer als Contract hinterlegen.
  - `graph:check` liefert bei Verstoessen deterministische Fehlermeldungen mit Kanten-ID.
- DoD-Erweiterung:
  - [ ] U13-DOD Alle produktiv genutzten Predicates haben Constraints; Verstoss in kritischen Pfaden failt den Gate-Run.

### U14 Evidence-Provenance auf Zeilenebene

- Nutzen: Jede relevante Aussage ist direkt bis auf Code-/Contract-Zeile zurueckverfolgbar.
- Umsetzung:
  - Kanten-/Knoten-Evidence um `file`, `line`, `commit` erweitern.
  - Queries geben optional `--with-evidence` aus, inkl. Herkunftsdaten im CLI-JSON und Viewer.
- DoD-Erweiterung:
  - [ ] U14-DOD Referenzqueries fuer kritische Pfade enthalten vollstaendige Provenance-Felder ohne Luecken.

### U15 Contradiction-Detection als First-Class Gate

- Nutzen: Inkonsistente Wissenslagen bleiben nicht latent, sondern werden aktiv gestoppt.
- Umsetzung:
  - Regelwerk fuer Widerspruchsmuster (`causes` vs. `prevents`, konkurrierende Status-Claims, unvereinbare Zeitfenster).
  - Kritische Widersprueche failen `graph:check`; nicht-kritische erzeugen Warnklasse mit Prioritaet.
- DoD-Erweiterung:
  - [ ] U15-DOD Kritische Contradictions blockieren den Build deterministisch; Warnfaelle werden mit Klassifikation ausgegeben.

### U16 Runtime-Telemetrie-Replay gegen Graph

- Nutzen: Modellierte Flows sind nicht nur logisch, sondern empirisch durch Laufzeitspuren gedeckt.
- Umsetzung:
  - Stichproben-Traces fuer Spawn, Combat/Hit, Round-Ende als Fixtures erfassen.
  - Replay-Check vergleicht beobachtete Event-Reihenfolgen mit Graph-Pfaden (inkl. Toleranzregeln).
- DoD-Erweiterung:
  - [ ] U16-DOD Jede kritische Flow-Familie hat mindestens ein gruenes Replay-Fixture mit dokumentierter Abdeckungsgrenze.

### U17 Delta-Gates fuer PR-/Commit-Sicht

- Nutzen: Schnellere, fokussierte Validierung ohne Verlust an Sicherheit.
- Umsetzung:
  - `impact-diff` liefert den geaenderten Subgraph und triggert gezielte Checks fuer betroffene kritische Pfade.
  - Full-Graph-Checks bleiben fuer `*.99`/Release erhalten, Delta-Gates fuer Alltags-PRs.
- DoD-Erweiterung:
  - [ ] U17-DOD Fuer mindestens 2 Referenzdiffs ist nachgewiesen, dass Delta-Gates gleichwertige Findings bei geringerem Laufzeitbudget liefern.

### U18 Ontology-Migrationspfad

- Nutzen: Schema-/ID-Aenderungen bleiben evolvierbar, ohne Historie zu verlieren.
- Umsetzung:
  - Versionierte Migrationsskripte fuer Node-/Edge-Schemata und ID-Renames.
  - Backfill/Validation gegen Alt-Fixtures als Pflichtteil der Migration.
- DoD-Erweiterung:
  - [ ] U18-DOD Mindestens eine Referenzmigration (vN -> vN+1) ist reproduzierbar inklusive Rollforward-Evidence dokumentiert.

### U19 Query-SLOs fuer Kernqueries

- Nutzen: Query-Nutzbarkeit bleibt auch bei wachsendem Graph planbar stabil.
- Umsetzung:
  - SLOs fuer Latenz und Ausgabevolumen je Kernquery definieren.
  - Regressionstest blockiert bei SLO-Verletzungen ausserhalb freigegebener Toleranzen.
- DoD-Erweiterung:
  - [ ] U19-DOD Kernqueries laufen unter dokumentierten SLO-Schwellen in den fixen Referenzumgebungen `desktop-local` und `ci-linux`.

### U20 Failure-Playbooks aus Graph-Checks

- Nutzen: Bei Gate-Fail gibt es sofort klare naechste Schritte statt Ad-hoc-Debugging.
- Umsetzung:
  - Pro kritischem Fail-Typ standardisierte Runbooks (Symptom, Query, Entscheidung, Exit-Kriterium).
  - Verlinkung aus Check-Output auf passendes Playbook.
- DoD-Erweiterung:
  - [ ] U20-DOD Fuer `critical-path-health`- und `change-risk`-Fails existieren getestete Playbooks mit dokumentiertem Incident-Durchlauf.

## Zusatzpaket U21-U28 (angenommen)

### U21 Negative-Edge-Model

- Nutzen: Blocker und Unmoeglichkeiten werden explizit statt implizit modelliert.
- Umsetzung:
  - Neue Relationen `cannot`, `forbidden_by`, `blocked_by` inkl. Qualifiern und Evidenz.
  - `why-not` priorisiert negative Kanten vor blossem "keine Verbindung gefunden".
- DoD-Erweiterung:
  - [ ] U21-DOD Fuer mindestens 3 Referenzfaelle liefert `why-not` explizite negative Kanten mit Evidenz.

### U22 Causal-Weighting pro Relation

- Nutzen: Impact-Analysen priorisieren relevante Pfade statt alle Kanten gleich zu gewichten.
- Umsetzung:
  - Edge-Felder `strength` (z. B. high/medium/low) und `directness` (direct/indirect).
  - Ranking-Logik fuer `impact-for-file` und `impact-diff` dokumentiert und testbar.
- DoD-Erweiterung:
  - [ ] U22-DOD Ranking-Reihenfolge ist fuer Referenzfaelle reproduzierbar und durch Tests fixiert.

### U23 Ownership-Layer pro kritischem Subgraph

- Nutzen: Incidents, Reviews und Refactors landen schneller bei der richtigen Verantwortlichkeit.
- Umsetzung:
  - Ownership-Metadaten (`owner_team`, `owner_contact`, optional `oncall`) fuer kritische Knoten/Teilgraphen.
  - Queries koennen Owner-Infos im Incident-/Review-Modus ausgeben.
- DoD-Erweiterung:
  - [ ] U23-DOD 100% der kritischen Pfade tragen Ownership-Metadaten und sind querybar.

### U24 Stability-Index pro Node/Edge

- Nutzen: Aenderungsrisiko wird als Trend sichtbar, nicht nur punktuell pro Diff.
- Umsetzung:
  - Index aus Churn, Test-Health, Incidents und Kritikalitaet; periodische Aktualisierung.
  - `change-risk` integriert den Index als aufgeschluesselten Faktor.
- DoD-Erweiterung:
  - [ ] U24-DOD Stabilitaetswerte sind fuer kritische Pfade historisiert und in mindestens 2 Zeitpunkten vergleichbar.

### U25 Query-Intent-Presets

- Nutzen: Schnellere, konsistente Nutzung mit weniger CLI-Flags.
- Umsetzung:
  - Presets `incident`, `review`, `balance`, `onboarding` mit definierten Filtern und Output-Layouts.
  - Dokumentierte Beispiele fuer jeden Preset-Typ.
- DoD-Erweiterung:
  - [ ] U25-DOD Jeder Preset liefert stabilen JSON/Text-Output und ist per Golden-Test abgesichert.

### U26 Cross-Artifact-Linking (PR/Issue/ADR)

- Nutzen: Entscheidungen und Codepfade bleiben historisch nachvollziehbar.
- Umsetzung:
  - Knoten/Kanten fuer Referenzen auf PR, Issue, ADR inkl. Typ und Status.
  - Explainability-Modus zeigt Artefaktlinks entlang des Antwortpfads.
- DoD-Erweiterung:
  - [ ] U26-DOD Fuer kritische Pfade ist mindestens ein gueltiger Cross-Link je Kategorie (PR/Issue/ADR) belegbar.

### U27 PII/Secret-Safety-Filter fuer Evidence-Export

- Nutzen: Graph-Exports sind sicherer fuer Sharing und externe Reviews.
- Umsetzung:
  - Redaktionsregeln fuer sensible Tokens/Felder, sichere Defaults fuer CLI/Viewer-Export.
  - Auditierbarer Override-Pfad mit expliziter Kennzeichnung.
- DoD-Erweiterung:
  - [ ] U27-DOD Default-Export enthaelt keine unredigierten Secret-/PII-Muster laut definierter Scan-Regeln.

### U28 Graph-Quality-Scorecard pro Build

- Nutzen: Drift und Qualitaetsabfall werden als kompakter Trend sofort sichtbar.
- Umsetzung:
  - Scorecard mit Kennzahlen (Coverage, Contradictions, SLO, Freshness, Ownership-Completeness).
  - Speicherung pro Build und Gate-Schwellwerte fuer Warnung/Fail.
- DoD-Erweiterung:
  - [ ] U28-DOD Scorecard wird pro Build erzeugt, historisiert und fuer mindestens eine Gate-Entscheidung genutzt.

## Zusatzpaket U29-U36 (angenommen)

### U29 Counterfactual-Queries

- Nutzen: Architektur- und Refactor-Entscheidungen koennen vor Umsetzung abgeschaetzt werden.
- Umsetzung:
  - Queries `what-if-remove` und `what-if-replace` fuer kritische Knoten/Kanten.
  - Ausgabe: betroffene Pfade, Risiken, Testluecken, Ownership-Hinweise.
- DoD-Erweiterung:
  - [ ] U29-DOD Mindestens 2 Referenzszenarien liefern reproduzierbare What-if-Reports.

### U30 Uncertainty-Budget pro Query

- Nutzen: Ergebnisqualitaet wird transparent und steuerbar.
- Umsetzung:
  - Unsicherheitsmetriken aus `confidence`, Evidenzdichte, Heuristikanteil aggregieren.
  - Query/Gate-Schwellwerte mit Warn-/Fail-Klassen definieren.
- DoD-Erweiterung:
  - [ ] U30-DOD Kernqueries enthalten Unsicherheitsbudget und bestehen definierte Schwellen.

### U31 Incident-Auto-Minimization

- Nutzen: Incident-Diagnose startet direkt auf minimalem relevanten Subgraph.
- Umsetzung:
  - Automatische Reduktion auf kleinsten Pfadkorridor rund um den Fail.
  - Explainability-Output zeigt, warum Knoten enthalten oder ausgeschlossen wurden.
- DoD-Erweiterung:
  - [ ] U31-DOD Incident-Ausgaben sind in Referenzfaellen signifikant kleiner als Vollgraph-Output bei gleichem Finding.

### U32 Temporal-Anomaly-Detection

- Nutzen: Laufzeitdrift wird trotz gruener Basistests sichtbar.
- Umsetzung:
  - Zeitfenstervergleich fuer Event-Frequenzen, Reihenfolgen und Latenzcluster.
  - Anomalie-Report mit Schweregrad und verlinkten Evidence-Spuren.
- DoD-Erweiterung:
  - [ ] U32-DOD Mindestens 2 simulierte Driftfaelle werden reproduzierbar erkannt und klassifiziert.

### U33 Schema-Lint fuer Naming/IDs

- Nutzen: Ontology bleibt konsistent und wartbar.
- Umsetzung:
  - Lint-Regeln fuer ID-Praefixe, Alias-Normalisierung, verbotene Dublettenmuster.
  - Pflichtlauf vor Build/Check mit klaren Auto-Fix-Hinweisen.
- DoD-Erweiterung:
  - [ ] U33-DOD Lint faengt definierte Naming-/ID-Verstoesse ab und blockiert bei kritischen Verstoessen.

### U34 Graph-Backed-Test-Prioritization

- Nutzen: CI fokussiert frueh die wahrscheinlich betroffenen Tests.
- Umsetzung:
  - Diff -> betroffene Subgraphen -> priorisierte Testliste.
  - Vergleich gegen Baseline-Lauf hinsichtlich Trefferquote und Laufzeitbudget.
- DoD-Erweiterung:
  - [ ] U34-DOD Priorisierte Testliste erreicht dokumentierte Mindest-Trefferquote auf Referenzdiffs.

### U35 Policy-as-Data fuer Gate-Regeln

- Nutzen: Gate-Verhalten ist versionierbar, auditierbar und ohne Codepatch anpassbar.
- Umsetzung:
  - Gate-Regeln in versionierten Policy-Dateien (inkl. Schema und Validator).
  - `graph:check` liest Policies deterministisch ein und reportet aktive Version.
- DoD-Erweiterung:
  - [ ] U35-DOD Policy-Updates sind ueber Contract-Tests abgesichert und ohne Check-Codeaenderung wirksam.

### U36 Human-Feedback-Loop fuer Query-Qualitaet

- Nutzen: Presets/Ranking verbessern sich aus realer Nutzung statt nur aus Annahmen.
- Umsetzung:
  - Feedback-Signale (`helpful`, `not_helpful`) pro Query-Run erfassen.
  - Regelmaessige Auswertung fuer Preset-/Ranking-Anpassungen mit Guardrails.
- DoD-Erweiterung:
  - [ ] U36-DOD Es existiert ein dokumentierter Feedback-Zyklus mit mindestens einer nachweisbaren Verbesserung.

