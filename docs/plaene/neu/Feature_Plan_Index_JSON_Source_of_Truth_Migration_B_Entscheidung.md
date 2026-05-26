---
title: Future-Entscheidung JSON als Plan-Source-of-Truth
status: draft
planned_block_id: TBD
priority: P2
owner: frei
intake_rule: not-yet-in-master
decision_class: D3/D4
depends_on:
  - V123.99
soft_depends_on:
  - V120.99
  - V134.99
blocked_by: []
affected_area: plan-governance-source-of-truth
scope_files:
  - docs/Umsetzungsplan.md
  - docs/generated/plan-index.json
  - docs/plaene/neu/Feature_Plan_Index_JSON_Source_of_Truth_Migration_B_Entscheidung.md
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/fix-planung.md
  - scripts/build-plan-index.mjs
  - scripts/validate-plan-index.mjs
  - scripts/validate-umsetzungsplan.mjs
  - scripts/plan-context-report.mjs
  - scripts/export-plan-map.mjs
  - scripts/build-knowledge-graph.mjs
  - scripts/check-knowledge-graph.mjs
  - tests/plan-index.contract.test.mjs
  - tests/plan-context-report.contract.test.mjs
  - tests/plan-map-export.contract.test.mjs
verification:
  - npm run plan:check
  - npm run plan:index:check
  - npm run plan:context:check
  - npm run graph:check
  - npm run docs:check
updated_at: 2026-05-26
---

# Future-Entscheidung: JSON als Plan-Source-of-Truth

Status: Draft, noch nicht in `docs/Umsetzungsplan.md` aufnehmen.

## Kurzfassung

V123 entscheidet fuer den laufenden Betrieb Option A: `docs/Umsetzungsplan.md` bleibt kanonisch und `docs/generated/plan-index.json` bleibt generierter Spiegel. Dieser Draft beschreibt, wann und wie spaeter erneut entschieden werden kann, ob Option B sinnvoll ist: JSON wird Wahrheit, Markdown wird generierte Menschenansicht.

Der Draft ist ein Future-Intake. Er erzeugt keine Autoritaetsverschiebung und ist keine neue Quelle neben Master, aktiven VXX-Plaenen, Locks oder Changelog.

## Wechselkriterium

Option B wird erst erneut bewertet, wenn manuelle Markdown-Pflege mehr Risiko oder Reibung erzeugt als die Tooling-Komplexitaet einer strukturierten Source-of-Truth.

Konkrete Einstiegssignale:

- Mindestens ein echter Planpflege-Slice lief erfolgreich ueber den strukturierten Index-/Generator-Pfad.
- Keine manuelle Nachkorrektur an Master- oder Index-Daten war noetig.
- `plan:check`, `plan:index:check`, `plan:context:check`, relevante Graph-Gates und Docs-Gates bleiben gruen.
- Schreibpfade fuer Status, Phase, Lock, Master-Zeilen und Workstream sind eindeutig benannt.
- V120/V123-Overlap auf Graph-, Master- und Changelog-Flaechen ist erledigt oder bewusst entkoppelt.

## Ziel

- Bewusst entscheiden, ob `docs/generated/plan-index.json` oder ein daraus entwickeltes strukturiertes Planformat kanonisch werden soll.
- Vor einer Autoritaetsverschiebung Generatoren, Validatoren, Roundtrip-Tests, Locks und Agenten-Lesewege absichern.
- `docs/Umsetzungsplan.md` nur dann als generierte Ansicht markieren, wenn der strukturierte Schreibpfad stabil, testbar und rollback-faehig ist.

## Nicht-Ziel

- Kein automatischer Wechsel auf JSON als Wahrheit.
- Keine versteckte Aenderung von Master-, Lock- oder Phasenautoritaet.
- Kein Ersatz aktiver `docs/plaene/aktiv/VXX.md` Detailplaene.
- Keine Schreibfunktion in einem optionalen Dashboard.
- Keine Migration, solange Roundtrip-/Readback-Tests fehlen.

## Option B Blast-Radius

| Bereich | Risiko | Absicherung vor Umsetzung |
| --- | --- | --- |
| Master-Index | Markdown waere nicht mehr Schreibquelle | Markdown als generiert markieren und Drift-Check erzwingen |
| Validatoren | `plan:check` und `plan:index:check` koennen unterschiedliche Autoritaet annehmen | Single Authority Contract und Cross-Check |
| Graph | Graph-Build koennte still von alter Quelle lesen | Graph-Input explizit umstellen und `graph:check` verlangen |
| Workflows/Rules | Agenten koennten alte Lese-/Schreibreihenfolge nutzen | `AGENTS.md`, Rules und Workflows mit User-Gate aktualisieren |
| Changelog | Evidence kann gegen falsche Quelle referenzieren | Abschlussnotizen nennen aktive Autoritaet und Generatorpfad |
| Plan-Map | Workstream- und Intake-Sichten koennen auseinanderlaufen | Plan-Map-Contract gegen Source-of-Truth testen |
| Lock-Projektion | JSON-Lock darf nicht operative Lock-Wahrheit werden | `docs/lock-status/*.json` bleibt operativer Lock-Wahrheitsraum |
| Human Edit Flow | Menschen editieren versehentlich generierten Markdown | Generated-Marker, Check und klare Intake-Regel |

## Definition of Done

- [ ] DoD.1 Entscheidungsvorlage nennt Option A, Option B und No-Go-Kriterien.
- [ ] DoD.2 Ein echter Planpflege-Slice hat den strukturierten Pfad ohne manuelle Nachkorrektur genutzt.
- [ ] DoD.3 Roundtrip-/Readback-Test prueft Block-ID, Titel, Status, Prioritaet, Owner, Dependencies, `current_phase`, Planfile, Workstream und Lock-Projektion.
- [ ] DoD.4 Schreibpfade fuer Status, Phase, Lock, Master-Zeilen und Workstream sind dokumentiert und gated.
- [ ] DoD.5 `docs/Umsetzungsplan.md` kann deterministisch aus der strukturierten Quelle erzeugt werden.
- [ ] DoD.6 Manuelle Markdown-Drift wird erkannt, bevor ein Commit durchgeht.
- [ ] DoD.7 `plan:check`, `plan:index:check`, `plan:context:check`, relevante Graph-Gates und Docs-Gates sind gruen.
- [ ] DoD.8 User-Gate entscheidet explizit: bei A bleiben oder B als separaten Migrationsblock starten.
- [ ] DoD.9 Falls B gestartet wird, existiert ein Recovery-Pfad zur letzten Markdown-kanonischen Version.

## Phasen

### B.1 Spiegelbetrieb beweisen

status: open
goal: Zeigen, dass strukturierte Plan-Daten bei echter Planpflege stabil bleiben
output: Evidence aus mindestens einem Planpflege-Slice

- [ ] B.1.1 Einen echten Master-/VXX-Pflege-Slice mit `plan:index:build` und `plan:index:check` begleiten.
- [ ] B.1.2 Dokumentieren, ob manuelle Nachkorrektur an Master oder Index noetig war.
- [ ] B.1.3 Drift-Faelle und Fallbacks auswerten.

### B.2 Authority- und Schreibpfad-Modell

status: open
goal: Vor einer Migration klaeren, wer welche Planfelder schreiben darf
output: Schreibpfad-Matrix und Gate-Entscheidung

- [ ] B.2.1 Felder klassifizieren: Status, Phase, Prioritaet, Owner, Dependencies, Workstream, Planfile, Lock.
- [ ] B.2.2 Pro Feld benennen: Quelle, Writer, Validator, Rollback.
- [ ] B.2.3 Lock-Projektion explizit von `docs/lock-status/*.json` trennen.
- [ ] B.2.4 D3/D4-Gate fuer Autoritaetswechsel vorbereiten.

### B.3 Generator, Roundtrip und Drift-Guard

status: open
goal: Markdown-Ansicht deterministisch aus strukturierter Quelle erzeugen koennen
output: Generator-/Readback-Konzept und Tests

- [ ] B.3.1 Generator-Determinismus pruefen.
- [ ] B.3.2 Roundtrip-/Readback-Test fuer Master-Felder einfuehren oder als Muss-Kriterium dokumentieren.
- [ ] B.3.3 Manual-edit-Drift an generiertem Markdown erkennen.
- [ ] B.3.4 Recovery auf Markdown-kanonische Version beschreiben.

### B.4 User-Entscheidung

status: open
goal: Bewusst entscheiden, ob B jetzt gestartet wird
output: User-Gate mit Alternativen, Blast-Radius und Recovery

- [ ] B.4.1 Option A beibehalten: Markdown bleibt Wahrheit.
- [ ] B.4.2 Option B starten: strukturierte Quelle wird Wahrheit.
- [ ] B.4.3 No-Go dokumentieren, falls Gates, Drift oder Ownership unklar bleiben.

### B.99 Abschluss-Gate

status: open
goal: Entscheidung ist nachvollziehbar und nicht versehentlich migriert
output: Intake- oder Migrationsentscheidung mit Evidence

- [ ] B.99.1 `npm run plan:check` ist gruen.
- [ ] B.99.2 `npm run plan:index:check` ist gruen.
- [ ] B.99.3 `npm run plan:context:check` ist gruen.
- [ ] B.99.4 Relevante Graph-/Docs-Gates sind gruen oder blockerfest dokumentiert.
- [ ] B.99.5 Abschlussnotiz nennt Entscheidung, Restrisiko, Recovery und naechsten Schritt.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| JSON wird zu frueh kanonisch | hoch | B nur nach User-Gate und Roundtrip-/Readback-Evidence |
| Markdown und JSON laufen auseinander | hoch | Generated-Marker, Drift-Guard, deterministischer Generator |
| Lock-Projektion wird als Lock-Wahrheit missverstanden | hoch | Operative Locks bleiben `docs/lock-status/*.json` |
| Agents aendern Planstatus mechanisch | hoch | Schreibpfad-Matrix, D3/D4-Gate, keine Auto-Writer |
| Graph liest falsche Quelle | mittel | Graph-Input explizit testen und dokumentieren |
| Menschen verlieren einfache Pflege | mittel | B nur waehlen, wenn Tool-first-Arbeit tatsaechlich gewollt ist |

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `TBD`
- Hard dependency: `V123.99`
- Soft dependency: `V120.99`, falls Graph-/Plan-Source-Overlap noch relevant ist
- Manuelle Uebernahme erforderlich: Dieser Draft darf nicht automatisch in den Master oder einen aktiven VXX-Plan uebernommen werden.
