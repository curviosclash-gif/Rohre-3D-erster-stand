---
title: Finding-, Plan- und Doku-Drift-Automatisierung
status: draft
planned_block_id: V141
priority: P2
owner: frei
intake_rule: not-yet-in-master
decision_class: D3
target_master: docs/Umsetzungsplan.md
plan_file: docs/plaene/aktiv/V141.md
depends_on:
  - V116.99
  - V117.99
  - V119.99
  - V123.99
  - V138.99
soft_depends_on:
  - V120.99
  - V134.99
blocked_by: []
affected_area: governance-drift-automation
scope_files:
  - docs/prozess/Open_Findings.md
  - docs/prozess/finding-decisions.json
  - docs/generated/open-findings-index.json
  - docs/Umsetzungsplan.md
  - docs/plaene/CHANGELOG.md
  - docs/prozess/Dokumentationsstatus.md
  - docs/prozess/Backlog.md
  - docs/qa/Manuelle_Testcheckliste_Spiel.md
  - docs/release/Releaseplan_Spiel_2026.md
  - .agents/test_mapping.md
  - package.json
  - scripts/build-open-findings-index.mjs
  - scripts/check-open-findings.mjs
  - scripts/check-plan-changelog-drift.mjs
  - scripts/check-test-mapping-drift.mjs
  - scripts/docs-freshness.mjs
  - scripts/validate-umsetzungsplan.mjs
  - tests/open-findings-index.contract.test.mjs
  - tests/plan-changelog-drift.contract.test.mjs
  - tests/test-mapping-drift.contract.test.mjs
verification:
  - npm run findings:index:build
  - npm run findings:check
  - npm run plan:check
  - npm run plan:index:check
  - npm run plan:context:check
  - npm run docs:sync
  - npm run docs:check
updated_at: 2026-06-04
---

# Finding-, Plan- und Doku-Drift-Automatisierung

Status: Draft, noch nicht in `docs/Umsetzungsplan.md` aufnehmen.

## Kurzfassung

Curvios hat mehrere bewusst manuell gepflegte Governance-Dateien: `docs/Umsetzungsplan.md`, aktive `docs/plaene/aktiv/VXX.md`, `docs/plaene/CHANGELOG.md`, `docs/prozess/Open_Findings.md`, `.agents/test_mapping.md` und einige QA-/Release-/Backlog-Snapshots. Diese Dateien bleiben als Entscheidungs- und Erklaerquellen wertvoll, koennen aber driften, wenn sie ableitbaren Status wiederholen.

V141 fuehrt deshalb keinen Big-Bang-Source-of-Truth-Wechsel ein, sondern einen konservativen Drift-Pilot: manuelle Entscheidungen werden klein und explizit gehalten, automatisch ableitbare Statussignale werden generiert, und Checks melden Widersprueche zuerst warnend. Generatoren duerfen widersprechen, aber keine Plan-, Finding- oder Security-Entscheidung allein treffen.

## Ziel

- `Open_Findings.md` von manuellen Statusbehauptungen entlasten, ohne akzeptierte Risiken wie `P21` automatisch zu schliessen.
- Einen generierten `open-findings-index` einfuehren, der Finding-Status, owning Blocks, Wiedervorlagen, Datei-/Planverweise und Drift-Signale maschinenlesbar ausweist.
- Plan-/Changelog-/Finding-Widersprueche sichtbar machen, bevor sie Abschlussclaims oder Agenten-Lesewege verfaelschen.
- `.agents/test_mapping.md` gegen veraltete Pfade, fehlende Scripts und neue ungemappte Testsignale pruefen.
- Alte QA-/Release-/Backlog-Snapshots als aktiv, historisch oder stale klassifizierbar machen, ohne sie mechanisch umzuschreiben.
- Bestehende V123-/V138-Governance fuer generierte Artefakte, `Generated-by:` und Markdown-Source-of-Truth-Regeln wiederverwenden.

## Nicht-Ziel

- Kein Ersatz von `docs/Umsetzungsplan.md` als kanonischem Master-Index.
- Keine automatische Uebernahme dieses Drafts in den Master oder nach `docs/plaene/aktiv/`.
- Keine automatische Schliessung von Findings nur aufgrund eines abgeschlossenen Blocks.
- Keine automatische Reparatur von `package.json`, Lockfiles, Security-Ausnahmen oder produktiven Runtime-Dateien.
- Keine automatische Umwandlung aktiver `VXX.md`-Blockplaene in generierte Dateien.
- Keine harten Pre-Commit-Blocker, bevor die Warnklasse mit echten Repo-Faellen kalibriert ist.

## Ausgangslage

- `docs/Umsetzungsplan.md` bleibt laut V123 kanonisch; `docs/generated/plan-index.json` ist nur generierter Spiegel.
- `_locks-registry.json` ist bereits ein generierter Merge; operative Lock-Wahrheit bleibt `docs/lock-status/*.json`.
- `Open_Findings.md` ist kanonische Nebenablage, enthaelt aber aktuell Mischformen aus Entscheidung, Status und Zuordnung.
- `P21` ist eine dokumentierte Security-Ausnahme mit Wiedervorlage 2026-06-17 und darf nicht durch einen Generator aufgeloest werden.
- `P47` zeigt den Zielkonflikt des Blocks: ein Finding kann offen gelistet sein, obwohl aktueller Code und V105-Evidence bereits auf Abschluss oder zumindest stale Formulierung hindeuten.
- `CHANGELOG.md` enthaelt notwendige menschliche Begruendungen, ist aber nur dann verlaesslich, wenn Master, VXX-Dateien, Findings und Abschlussnotizen zusammenpassen.

## Architecture Acceptance

| Bereich | Entscheidung |
| --- | --- |
| Betroffene Schichten | Docs-/Governance-Tooling, Plan-Validatoren, generierte Statusartefakte; keine Runtime-, UI-, Gameplay- oder Bot-Training-Logik. |
| Erlaubte Zielpfade | Neue kleine Generator-/Check-Skripte unter `scripts/`, Tests unter `tests/`, generierte Artefakte unter `docs/generated/`, manuelle Entscheidungsdaten unter `docs/prozess/`. |
| Verbotene Legacy-Surfaces | Keine neuen Writer fuer `docs/Umsetzungsplan.md`, aktive `VXX.md`, Lock-Status oder Findings ohne User-Gate; keine Dashboard-Schreibfunktion. |
| Neue Dependency-Kanten | Checks duerfen `docs/generated/plan-index.json`, Master, VXX-Dateien, Changelog, Open Findings und Lock-Registry lesen; sie duerfen daraus nur Reports/Generated-Artefakte ableiten. |
| Contract-/Snapshot-Erweiterung | Neuer `open-findings-index.v1` mit stabilen Feldern fuer `id`, `declared_status`, `owner_block`, `review_after`, `signals`, `drift`, `confidence`, `sources`. |
| Guard-Signal | `findings:check` und spaeter `plan:check`/`docs:check` melden Drift mit klaren Fehlercodes; Start als WARN/INFO, harte Fehler erst nach separatem Gate. |
| Ratchet-Auswirkung | Keine Senkung bestehender Plan-, Graph-, Docs- oder AI-Diff-Gates. Neue Checks duerfen nur additiv werden. |

## Responsibility-Growth-Matrix

| Datei/Modul | Bestehende Verantwortung | Neue/veraenderte Verantwortung | Bevorzugter Zielpfad | Reihenfolge |
| --- | --- | --- | --- | --- |
| `scripts/validate-umsetzungsplan.mjs` | Master-/Blockplan-Validierung | Nur kleine Integrationspunkte fuer Cross-Checks, kein weiterer Monolith | Neue Spezialchecks zuerst, spaeter gezielte Einbindung | Nach Finding-Pilot |
| `scripts/docs-freshness.mjs` | Dokumentationsstatus schreiben/pruefen | QA-/Release-/Backlog-Freshness optional melden | Kleine Freshness-Regeln mit klaren Labels | Spaete Phase |
| `.agents/test_mapping.md` | Manuelle Testauswahl-Matrix | Bleibt manuelle Entscheidung; Drift wird extern geprueft | `scripts/check-test-mapping-drift.mjs` | Nach Plan-/Finding-Checks |
| `docs/prozess/Open_Findings.md` | Kanonische Nebenablage fuer offene Findings | Entweder manuelle Entscheidungsschicht oder spaeter generierte Ansicht | `finding-decisions.json` + `docs/generated/open-findings-index.json` | Pilot zuerst |
| `docs/plaene/CHANGELOG.md` | Menschliche Status- und Abschlussnotizen | Bleibt manuell; Abschluss-/Finding-Widerspruch wird geprueft | `scripts/check-plan-changelog-drift.mjs` | Nach Finding-Pilot |

## Manuelles vs. generiertes Modell

| Kategorie | Quelle | Regel |
| --- | --- | --- |
| Entscheidungen | `finding-decisions.json`, aktive VXX-Dateien, Master, Changelog | Manuell, User-/Agent-Gate nach D3-Regeln. |
| Statussignale | `plan-index`, Master/VXX-Parser, Datei-Existenz, Wiedervorlage, Changelog-Marker | Automatisch ableitbar, aber nur als Signal. |
| Generierte Ansicht | `docs/generated/open-findings-index.json`, optional spaeter generiertes Markdown | Nicht kanonisch, bis ein separater User-Gate das aendert. |
| Drift | Check-Reports und `docs/prozess/Dokumentationsstatus.md` | Warnen, erklaeren, nicht heimlich korrigieren. |

## AI-Ausfuehrungsmatrix

| Schrittklasse | Markierung | Regel |
| --- | --- | --- |
| Read-only Analyse, Index bauen, Drift reporten | `[AUTO]` | Darf ohne Rueckfrage laufen, solange keine kanonischen Dateien geaendert werden. |
| Neue Skripte/Tests/Generated-Artefakte im V141-Scope | `[REVIEW]` | Umsetzung nach User-Intake in den aktiven Block; Diff klein und gated. |
| Aenderung an Master, AGENTS, Rules, Workflows oder Source-of-Truth-Regeln | `[USER-GATE]` | Immer explizite Freigabe, Alternativen und Blast-Radius. |
| `Open_Findings.md` als generierte Datei markieren oder ersetzen | `[USER-GATE]` | Erst nach Pilot-Evidence und separater Entscheidung. |
| Security-Finding schliessen oder `P21` neu bewerten | `[USER-GATE]` | Nur mit frischem Audit-Signal und expliziter Entscheidung. |

## Definition of Done

- [ ] DoD.1 Manuelle Finding-Entscheidungen sind von generiertem Status getrennt, ohne neue Schatten-Wahrheit.
- [ ] DoD.2 `open-findings-index.v1` ist dokumentiert, generierbar und gegen einfache Drift-Faelle getestet.
- [ ] DoD.3 `findings:check` erkennt mindestens: stale owning block, abgelaufene Wiedervorlage, fehlende Datei, Changelog-erledigt-aber-offen und Zuordnung/Tabelle-Widerspruch.
- [ ] DoD.4 `P21` bleibt als accepted-risk/Wiedervorlage modelliert und wird nicht automatisch geschlossen.
- [ ] DoD.5 Plan-/Changelog-Abgleich meldet fehlende oder widerspruechliche `*.99`-Abschlussnotizen.
- [ ] DoD.6 `.agents/test_mapping.md` wird gegen existierende Scripts/Pfade und neue Testmuster geprueft, ohne Testauswahl automatisch umzuschreiben.
- [ ] DoD.7 QA-/Release-/Backlog-Snapshots erhalten Freshness-Signale oder klare Statuslabels.
- [ ] DoD.8 Warn-/Fehlerklassen sind dokumentiert; harte Gate-Integration ist bewusst entschieden oder deferred.
- [ ] DoD.9 `plan:check`, `plan:index:check`, `plan:context:check`, `docs:sync` und `docs:check` sind gruen oder blockerfest dokumentiert.
- [ ] DoD.99 Abschlussnotiz nennt Pilot-Umfang, nicht automatisierte Entscheidungen, Restrisiko und naechsten moeglichen Gate-Schritt.

## Phasen

### 141.1 Finding-Decision-Modell und Index-Schema

status: open
goal: Manuelle Finding-Entscheidungen von automatisch ableitbaren Statussignalen trennen
output: `finding-decisions.json`-Konzept und `open-findings-index.v1`

- [ ] 141.1.1 Aktuelle `Open_Findings.md`-Eintraege in Kategorien schneiden: `manual-decision`, `status-signal`, `owner-mapping`, `stale-candidate`.
- [ ] 141.1.2 Schema fuer `docs/prozess/finding-decisions.json` festlegen: `id`, `status`, `owner_block`, `severity`, `review_after`, `reason`, `manual_override`.
- [ ] 141.1.3 Schema fuer `docs/generated/open-findings-index.json` festlegen: Quellen, Signale, Drift-Klasse, Confidence und Wiedervorlage.
- [ ] 141.1.4 `P21`, `P47` und `P48` als Pilotfaelle modellieren, ohne ihren fachlichen Status automatisch zu aendern.

### 141.2 Generator und Finding-Drift-Check

status: open
goal: Open-Findings-Drift maschinenlesbar melden
output: Generator, Check und Contract-Tests

- [ ] 141.2.1 `scripts/build-open-findings-index.mjs` implementieren: Entscheidungen, Master/Plan-Index, VXX-Dateien und Open-Findings-Tabelle lesen.
- [ ] 141.2.2 `scripts/check-open-findings.mjs` implementieren: Drift-Codes fuer `owner-block-done`, `review-after-due`, `missing-file`, `changelog-resolved-open`, `mapping-table-mismatch`.
- [ ] 141.2.3 `package.json` um `findings:index:build` und `findings:check` ergaenzen.
- [ ] 141.2.4 Contract-Test fuer mindestens drei positive und drei negative Drift-Faelle ergaenzen.

### 141.3 Plan-/Changelog-Abgleich

status: open
goal: Abschlussclaims ueber Master, aktive VXX-Datei, Findings und Changelog falsifizierbarer machen
output: Warnender Changelog-/Plan-Drift-Check

- [ ] 141.3.1 Regeln definieren: `*.99` im Master braucht Abschlussnotiz; Abschlussnotiz muss Block/Phase/Datum/Evidence oder Not-checked nennen.
- [ ] 141.3.2 Offene Findings im owning Scope gegen Blockstatus und Changelog abgleichen.
- [ ] 141.3.3 `scripts/check-plan-changelog-drift.mjs` als separaten Check oder schmalen `validate-umsetzungsplan`-Integrationspunkt umsetzen.
- [ ] 141.3.4 Warnklasse kalibrieren: keine harten Failures fuer historische Altbloecke ohne expliziten V141-Gate-Beschluss.

### 141.4 Testmapping-Drift

status: open
goal: Testauswahl-Matrix aktuell halten, ohne menschliche Testentscheidung zu ersetzen
output: `.agents/test_mapping.md`-Drift-Check

- [ ] 141.4.1 Genannte npm-Scripts gegen `package.json` pruefen.
- [ ] 141.4.2 Genannte Pfade und Globs gegen Repo-Dateien pruefen; absichtliche Pattern klar erlauben.
- [ ] 141.4.3 Neue `tests/*.contract.test.mjs` und kanonische Runner-Surfaces gegen Mapping-Sichtbarkeit pruefen.
- [ ] 141.4.4 Drift-Check mit `WARN` starten; harte Fehler nur fuer geloeschte Scripts/Pfade nach separater Entscheidung.

### 141.5 QA-/Release-/Backlog-Freshness

status: open
goal: Alte Snapshot-Listen als aktiv, historisch oder stale erkennbar machen
output: Freshness-Signale in Docs-Check oder Dokumentationsstatus

- [ ] 141.5.1 `docs/prozess/Backlog.md`, `docs/qa/Manuelle_Testcheckliste_Spiel.md` und `docs/release/Releaseplan_Spiel_2026.md` klassifizieren: aktiv, historisch, draft oder stale.
- [ ] 141.5.2 `scripts/docs-freshness.mjs` um konservative Warnungen fuer alte Stand-Daten und offene Checklisten erweitern.
- [ ] 141.5.3 Keine automatische Textkorrektur in QA-/Release-Dateien ohne User-Gate; nur Statussignal oder expliziter Label-Vorschlag.
- [ ] 141.5.4 `docs/prozess/Dokumentationsstatus.md` zeigt die neuen Freshness-Warnungen kompakt.

### 141.6 Gate-Integration und Handoff

status: open
goal: Entscheiden, welche Drift-Signale in welche Standard-Gates gehoeren
output: Gate-Matrix und Handoff fuer Folgearbeit

- [ ] 141.6.1 Gate-Matrix erstellen: `findings:check`, `plan:check`, `docs:check`, `gates:pre-commit`.
- [ ] 141.6.2 WARN/FAIL-Grenzen je Drift-Code festlegen und P1-/Security-Faelle gesondert behandeln.
- [ ] 141.6.3 Entscheiden, ob `Open_Findings.md` manuelle Entscheidungsschicht bleibt oder spaeter als generierte Ansicht markiert werden soll.
- [ ] 141.6.4 Folge-Intake fuer einen echten Source-of-Truth-Wechsel nur anlegen, wenn Pilot-Evidence zeigt, dass der Generator stabiler ist als manuelle Pflege.

### 141.99 Abschluss-Gate

status: open
goal: Drift-Pilot ist nutzbar, begrenzt und ohne Autoritaetsverschiebung abgeschlossen
output: Abschluss-Evidence und User-Handoff

- [ ] 141.99.1 `npm run findings:index:build` ist gruen und erzeugt deterministisches Output.
- [ ] 141.99.2 `npm run findings:check` ist gruen oder meldet erwartete, dokumentierte Warnungen.
- [ ] 141.99.3 `npm run plan:check`, `npm run plan:index:check` und `npm run plan:context:check` sind gruen.
- [ ] 141.99.4 `npm run docs:sync` und `npm run docs:check` sind gruen oder blockerfest dokumentiert.
- [ ] 141.99.5 Abschlussnotiz nennt: manuelle Entscheidungen, generierte Signale, harte Nicht-Ziele, Warn-/Fail-Politik, Restrisiko und naechsten Schritt.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| Generator wird als neue Wahrheit missverstanden | hoch | Generated-Pfad, Konfliktregel und klare Nicht-Ziele; Master/VXX/Entscheidungen bleiben kanonisch. |
| Security-Ausnahme wird mechanisch geschlossen | hoch | `P21` als `accepted-risk` mit `review_after`; Check darf nur Wiedervorlage melden. |
| Zu viele Warnungen machen Gates laut | mittel | Start mit begrenzten Pilotfaellen und WARN/INFO; historische Altfaelle kalibrieren. |
| Validator-Monolith waechst weiter | mittel | Neue Spezialchecks bevorzugen; `validate-umsetzungsplan` nur schmal integrieren. |
| `Open_Findings.md` und `finding-decisions.json` werden doppelte Wahrheit | mittel | Genau festlegen: Entscheidungen in JSON, Markdown entweder Uebersicht oder spaeter generiert. |
| QA-/Release-Snapshots werden faelschlich als aktuell blockierend behandelt | mittel | Freshness-Signale labeln, nicht automatisch blockieren. |
| Agents editieren Master oder aktive Plaene mechanisch | hoch | D3/User-Gate fuer Master-/VXX-/Governance-Aenderungen bleibt bestehen. |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V141`
- Vorgeschlagene kanonische Blockdatei nach Intake: `docs/plaene/aktiv/V141.md`
- Arbeitsstrom: `Repo-Pflege & Governance` mit Naehe zu `AI / Graph / Agenten-Werkzeuge`
- Hard dependencies: `V116.99`, `V117.99`, `V119.99`, `V123.99`, `V138.99`
- Soft dependencies: `V120.99`, `V134.99`
- Decision Class: `D3`, sobald Umsetzung Master-/Governance-/Generated-Gate-Regeln oder dauerhafte Statusablaegen beruehrt
- Manuelle Uebernahme erforderlich: Dieser Draft darf nicht automatisch in den Master oder einen aktiven VXX-Plan uebernommen werden.
