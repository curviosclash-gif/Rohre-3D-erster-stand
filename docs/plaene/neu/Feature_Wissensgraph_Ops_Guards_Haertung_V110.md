# Feature: Wissensgraph Ops-, Guard- und Integritaets-Haertung (V110)

Stand: 2026-05-05
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V110.md`

## Ziel

Der mehrschichtige Spiel-Wissensgraph aus `V107` soll fuer den operativen Betrieb gehaertet werden: semantische Constraints, belastbare Provenance, Widerspruchserkennung, Telemetrie-Abgleich, Delta-Gates, Migrationspfad, Query-SLOs und Failure-Playbooks.

- Fokus ist Betriebssicherheit und Gate-Vertrauen fuer produktkritische Pfade.
- Die Checks sollen Drift frueh stoppen, ohne den Desktop-Entwicklungspfad unnoetig zu verlangsamen.
- `change-risk` wird als expliziter Query-Standardpfad fuer Incident- und Review-Szenarien verankert.

## Desktop-first Scope

- Kritische Desktop-Runtime-Pfade (Spawn, Combat/Hit, Round-Ende) sind priorisiert.
- Browser-/Demo-Pfade bleiben nachrangige Consumer.
- Keine externe Graph-Datenbank; lokale Artefakte und bestehende Gates bleiben Grundlage.

## Nicht-Ziel

- Kein Ausbau von Query-Intent-Presets, Counterfactuals oder Human-Feedback-Loops (liegt in `V111`).
- Kein Big-Bang-Rewrite der Graph-Build-Pipeline.
- Keine Aufweichung bestehender Governance-/Closure-Gates.

## Betroffene Dateien und Bereiche

- `docs/plaene/neu/Feature_Wissensgraph_Ops_Guards_Haertung_V110.md`
- `docs/generated/knowledge-graph.json`
- `docs/generated/knowledge-graph.schema.json`
- `scripts/build-knowledge-graph.mjs`
- `scripts/check-knowledge-graph.mjs`
- `scripts/query-knowledge-graph.mjs`
- `data/contracts/knowledge-graph/`
- `tests/`
- `docs/referenz/ai_architecture_context.md`
- `.agents/workflows/status.md`

## Definition of Done

- [ ] DoD.1 Predicate-Constraints (`domain/range`, Kardinalitaet, Layer) sind als Contract + `graph:check` aktiv.
- [ ] DoD.2 Evidence-Provenance (`file`, `line`, `commit`) ist fuer Kernkanten durchgaengig verfuegbar und querybar.
- [ ] DoD.3 Contradiction-Detection failt deterministisch fuer kritische Widersprueche und reportet nicht-kritische als Warnklasse.
- [ ] DoD.4 Runtime-Telemetrie-Replay validiert Spawn, Combat/Hit und Round-Ende gegen modellierte Flows.
- [ ] DoD.5 Delta-Gates fuer geaenderte Subgraphen sind fuer PR-/Commit-Sicht dokumentiert und reproduzierbar.
- [ ] DoD.6 Ontology-Migrationspfad (`schema`/`id`) ist versioniert und per Regressionstest abgesichert.
- [ ] DoD.7 Query-SLOs fuer Kernqueries sind in `desktop-local` und `ci-linux` gemessen und gegen Regression abgesichert.
- [ ] DoD.8 Failure-Playbooks fuer `critical-path-health` und `change-risk` sind getestet und aus Check-Ausgaben verlinkbar.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V110`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V110.md`
- hard dependencies: `V107.99`
- soft dependencies: `V104.99`, `V105.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 110.1 Constraints- und Provenance-Fundament
status: open
goal: Semantische Gueltigkeit und Nachvollziehbarkeit auf Kernkanten absichern
output: Aktive Constraint- und Evidence-Basis

- [ ] 110.1.1 Predicate-Constraints fuer produktiv genutzte Relationen versionieren und in `graph:check` fail-fast validieren.
- [ ] 110.1.2 Evidence-Provenance (`file`, `line`, `commit`) fuer kritische Knoten/Kanten in Builder und Query-Ausgaben vollstaendig einziehen.

### 110.2 Integritaet und Laufzeitabgleich
status: open
goal: Widersprueche und Drift zwischen Modell und Laufzeit frueh erkennen
output: Widerspruchs- und Replay-Gates

- [ ] 110.2.1 Contradiction-Detection mit kritischem Fail-Pfad und nicht-kritischer Warnklassifikation implementieren.
- [ ] 110.2.2 Telemetrie-Replay-Fixtures fuer Spawn, Combat/Hit, Round-Ende anbinden und Abweichungsreport in `graph:check` integrieren.

### 110.3 Delta-Validation und Migration
status: open
goal: Schnelle PR-validierung bei gleichbleibender Sicherheit
output: Delta-Gates und migrationssicheres Schema

- [ ] 110.3.1 `impact-diff`-basierte Delta-Gates fuer geaenderte Subgraphen als Standardpfad dokumentieren und mit Referenzdiffs belegen.
- [ ] 110.3.2 Ontology-Migrationen (`schema`/`id`) als versionierte Skripte inkl. Backfill-/Regressionstest absichern.

### 110.4 SLOs und Operator-Pfade
status: open
goal: Query-Betrieb planbar stabil und incident-tauglich machen
output: SLO-Gates und Playbooks

- [ ] 110.4.1 Query-SLO-Messung fuer Kernqueries in `desktop-local` und `ci-linux` etablieren; Regression-Gate mit Toleranzfenstern verankern.
- [ ] 110.4.2 Failure-Playbooks fuer `critical-path-health` und `change-risk` schreiben, verlinken und mit Referenz-Incident testen.

### 110.99 Abschluss-Gate
status: open
goal: Ops- und Guard-Haertung reproduzierbar abschliessen
output: Gruene Integritaets- und Ops-Gates fuer den Wissensgraphen

- [ ] 110.99.1 `npm run graph:build`, `npm run graph:check`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` sind gruen.
- [ ] 110.99.2 Constraints, Provenance, Contradiction-Detection und Replay sind mit Referenzartefakten nachweisbar aktiv.
- [ ] 110.99.3 Delta-Gates und Migrationspfad sind dokumentiert, reproduzierbar und mit mindestens einem Referenzfall belegt.
- [ ] 110.99.4 SLO-Messungen (`desktop-local`, `ci-linux`) und Playbooks sind versioniert und im Workflow verankert.

## Risiken

- R1 | mittel | Zu strikte Constraint-Regeln koennen initial falsch-positive Gate-Fails erzeugen.
- R2 | mittel | Replay-Fixtures koennen bei unstabilen Traces wartungsintensiv werden.
- R3 | mittel | Delta-Gates koennen kritische Seiteneffekte uebersehen, wenn Subgraph-Grenzen unsauber sind.
- R4 | niedrig | Playbooks verlieren ohne regelmaessige Pflege schnell an Aussagekraft.
