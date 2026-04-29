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
- [ ] DoD.7 Messbarer Query-Nutzen fuer neue Fragen: pro Referenzquery (`impact-for-file`, `event-flow`, `untested-systems`) Graph-Read <= 120 Zeilen und mindestens 2.5x kleiner als Baseline-Volltextspur.
- [ ] DoD.8 `docs/generated/knowledge-graph.coverage.json` weist fuer den vereinbarten Produkt-Scope eine vollstaendige Repo-Abdeckung aus (`src/`, `tests/`, `scripts/`, `data/contracts/`, `docs/`), inklusive `covered_files`, `uncovered_files`, Coverage-Quote und begruendeter Allowlist fuer bewusst ausgeschlossene Dateien.
- [ ] DoD.9 `SettingManager` ist explizit im Graph modelliert (`runtime_system` + `uses_param` + mindestens ein `validated_by`), und per Referenzquery dokumentiert (`impact-for-file` + `critical-path-health`).

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
- [ ] 107.1.3 Coverage-Vertrag fuer komplette Repo-Abdeckung definieren: Scope-Includes (`src/`, `tests/`, `scripts/`, `data/contracts/`, `docs/`), erlaubte Excludes/Allowlist und minimales Report-Schema fuer `knowledge-graph.coverage.json`.

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
- [ ] 107.3.3 Coverage-Gate ergaenzen: `knowledge-graph.coverage.json` muss vorhanden sein, Coverage fuer den vereinbarten Scope darf nicht unter den festgelegten Schwellwert fallen, und neue Uncovered-Dateien ohne Allowlist-Eintrag failen den Check.

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
- [ ] 107.6.3 Minimalen lokalen Viewer bereitstellen (`tools/graph-viewer/*`): read-only, lädt `docs/generated/knowledge-graph.json` (oder exportierten Teilgraph), bietet Typfilter/Suche/Nachbarschaft und ist in der Referenzdoku mit Startkommando beschrieben.

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

- Nutzen: Nicht nur „es gibt einen Test“, sondern „welchen Event-/State-Uebergang deckt er“.
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

### Claim-Schnitt fuer naechste Iteration

- Minimal claimbar: U1 + U3 + U2 (schneller, hoher Nutzen, geringes Risiko)
- Danach Ausbauclaim: U5 + U4
- Abschliessender Stabilitaetsclaim: U6
- Erweiterter Ausbauclaim: U7 + U8 + U9
- Performance-/Ops-Claim: U10 + U11 + U12

## Vollpaket-Entscheid

Status: angenommen (alle U1-U6 sind Bestandteil von V107)

- U1 Coverage-First als Gate: verpflichtend
- U2 Vertrauensmodell pro Kante: verpflichtend
- U3 SettingManager-Pflichtpfad: verpflichtend
- U4 Impact-Diff-Query: verpflichtend
- U5 Test-Wirkung/Assertion-Mapping: verpflichtend
- U6 Drift-/Freshness-Layer: verpflichtend
- U7 Zeitdimension: verpflichtend
- U8 Evidenzstaerke: verpflichtend
- U9 Query-Regressionstests: verpflichtend
- U10 Subgraph-Caching: verpflichtend
- U11 Explainability-Mode: verpflichtend
- U12 Change-Risk-Score: verpflichtend

Konsequenz:

- `V107` gilt erst als abgeschlossen, wenn alle U1-U12-DoD-Punkte umgesetzt und im Abschluss-Gate mit Evidence referenziert sind.

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
