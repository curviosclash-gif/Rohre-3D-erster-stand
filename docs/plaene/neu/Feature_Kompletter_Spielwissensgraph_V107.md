# Feature: Kompletter Spiel-Wissensgraph als mehrschichtiger Query-Layer (V107)

Stand: 2026-04-29
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V107.md`

## Ziel

Der bestehende Wissensgraph aus `V94` soll von Plan-/Scope-Governance auf einen vollstaendigen, spielnahen Query-Layer erweitert werden. Neben Block-/Datei-/Surface-Beziehungen werden Runtime-Systeme, Gameplay-Events, State-Reads/Writes, Test-Abdeckung und kritische Spielpfade modelliert, damit Impact- und Regressionsfragen ohne Volltextsuche beantwortbar bleiben.

- Mehrschichtiger Graph: Governance + Code-Struktur + Runtime-Gameplay + Content/Balance.
- Reproduzierbare Queries fuer `impact-for-file`, `event-flow`, `untested-systems`, `critical-path-health`.
- Harte Validierungen fuer Gameplay-kritische Pfade (keine Orphans, Pflicht-Testmapping fuer kritische Systeme).
- Weiterhin deterministische Artefakte mit Graph-Check als Gate.

## Desktop-first Scope

- Primaerziel bleibt das Desktop-Hauptprodukt und seine Runtime-/Gameplay-Pfade.
- Browser-/Demo-Pfade werden nur als Consumer modelliert, nicht als neuer First-Class-Laufzeitpfad.
- Keine neue Online-Only-Datenhaltung oder externe Graphdatenbank.

## Nicht-Ziel

- Kein Big-Bang-Umbau der Laufzeitarchitektur.
- Keine verpflichtende 100%-AST-Praezision ueber alle dynamischen Laufzeitpfade im ersten Schritt.
- Kein Ersatz fuer bestehende Architektur-Guards; der Graph erweitert die Analyse, ersetzt sie nicht.
- Keine Visualisierungs-UI als Blocker fuer die Kernfunktion.

## Betroffene Dateien und Bereiche

- `docs/Umsetzungsplan.md`
- `docs/plaene/neu/Feature_Kompletter_Spielwissensgraph_V107.md`
- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.coverage.json`
- `docs/generated/knowledge-graph.schema.json`
- `scripts/build-knowledge-graph.mjs`
- `scripts/check-knowledge-graph.mjs`
- `scripts/query-knowledge-graph.mjs`
- `scripts/architecture/legacy-surface-guard-matrix.json`
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

## Definition of Done

- [ ] DoD.1 Das Schema kennt zusaetzlich die Node-Typen `runtime_system`, `game_event`, `game_state`, `game_mode`, `config_param`, `test_case` sowie die Edge-Typen `implements`, `emits`, `consumes`, `reads_state`, `writes_state`, `uses_param`, `validated_by`.
- [ ] DoD.2 Der Build erzeugt diese neuen Knoten/Kanten deterministisch aus bestehenden Quellen plus klar dokumentierten Mapping-Dateien, ohne manuelle Nachpflege im generierten Graph.
- [ ] DoD.3 `graph:check` validiert zusaetzlich: keine orphan `runtime_system`-Nodes, keine kritischen Runtime-Systeme ohne `validated_by`-Kante, keine unbekannten Referenz-IDs in Runtime-Mappings.
- [ ] DoD.4 Query-CLI bietet mindestens `impact-for-file`, `event-flow`, `untested-systems`, `critical-path-health` mit stabilem Text- und JSON-Output.
- [ ] DoD.5 Fuer mindestens drei kritische Spielpfade (Spawn, Combat/Hit, Round-Ende) ist der End-to-End-Flow als Graphkante abfragbar und durch Contract-/Targeted-Tests referenzierbar.
- [ ] DoD.6 `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` bleiben gruen.
- [ ] DoD.7 Messbarer Query-Nutzen fuer neue Fragen: pro Referenzquery (`impact-for-file`, `event-flow`, `untested-systems`) Graph-Read <= 120 Zeilen und mindestens 2.5x kleiner als Baseline-Volltextspur.

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
- [ ] 107.1.2 Mapping-Quellen fuer Runtime-Systeme und kritische Pfade unter `data/contracts/knowledge-graph/*.json` festlegen (inklusive Ownership, Naming-Konvention, Unknown-ID-Policy).

### 107.2 Builder um Runtime- und Code-Struktur-Layer erweitern
status: open
goal: Vollstaendige, deterministische Erzeugung der neuen Schichten
output: Erweiterter Build mit reproduzierbaren Kanten

- [ ] 107.2.1 `build-knowledge-graph` modular um Runtime-System-, Event-, State- und Param-Kanten erweitern (`implements`, `emits/consumes`, `reads_state/writes_state`, `uses_param`).
- [ ] 107.2.2 Technische Impact-Kanten (`imports`/`calls`) fuer priorisierte Kernpfade ableiten und mit stabilen IDs in den Graph integrieren; dynamische/mehrdeutige Treffer werden als `confidence`-Metadatum gekennzeichnet.

### 107.3 Validierungen und Qualitaets-Gates erweitern
status: open
goal: Drift in kritischen Gameplay- und Testbeziehungen frueh stoppen
output: Neue Check-Regeln fuer Runtime-Vollstaendigkeit

- [ ] 107.3.1 `check-knowledge-graph` um Runtime-Orphan-, Missing-Validation- und Unknown-Reference-Regeln erweitern.
- [ ] 107.3.2 Kritische Systeme markieren und als Gate-Regel erzwingen: keine `critical=true`-Systeme ohne mindestens einen gueltigen `validated_by`-Link.

### 107.4 Query-Layer fuer Alltag und Incident-Diagnose ausbauen
status: open
goal: Spielrelevante Fragen mit wenigen Zeilen lesbar beantworten
output: Neue CLI-Queries inkl. JSON-Output

- [ ] 107.4.1 `query-knowledge-graph` um `impact-for-file` und `event-flow` erweitern.
- [ ] 107.4.2 `query-knowledge-graph` um `untested-systems` und `critical-path-health` erweitern und in Rule/Workflow als Standardpfad dokumentieren.

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

### 107.99 Abschluss-Gate
status: open
goal: Mehrschichtiger Spielgraph gruensicher und reproduzierbar abgeschlossen
output: Gruene Gates, dokumentierte Referenzqueries, Intake-fertiger aktiver Block

- [ ] 107.99.1 `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen.
- [ ] 107.99.2 Referenzqueries fuer `impact-for-file`, `event-flow`, `untested-systems`, `critical-path-health` sind im Block mit Zeilen-/Nutzenvergleich dokumentiert.
- [ ] 107.99.3 Architekturkontext, Rule und Workflow spiegeln den neuen Graph-First-Leseweg fuer spielnahe Diagnosen konsistent.
- [ ] 107.99.4 Mapping-Dateien und Query-Outputs sind als Contract-/Fixture-Tests abgesichert, damit Schema- oder Builder-Aenderungen Drift sofort sichtbar machen.

## Risiken

- R1 | mittel | Runtime-Mapping kann anfangs unvollstaendig sein und scheinbare Luecken erzeugen.
- R2 | mittel | Zu breite Import-/Call-Kanten koennen Signal-Rauschen erzeugen; Priorisierung auf kritische Pfade ist noetig.
- R3 | mittel | Kritische-System-Pflichttests koennen kurzfristig Gate-Druck erzeugen, wenn Altpfade noch keine stabile Testzuordnung haben.
- R4 | niedrig | Query-Erweiterungen koennen bei unklaren Namenskonventionen inkonsistent wirken; feste ID-/Naming-Regeln reduzieren das Risiko.
