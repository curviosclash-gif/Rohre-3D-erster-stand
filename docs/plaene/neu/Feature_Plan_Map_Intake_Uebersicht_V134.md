---
planned_block_id: V134
title: Plan Map Intake-Uebersicht und Kandidaten-Trennung
status: draft
priority: P2
owner: frei
created_at: 2026-05-22
affected_area: plan-map-intake-overview
depends_on:
  - V116.99
  - V117.99
soft_depends_on:
  - V123.1
  - V127
blocked_by: []
scope_files:
  - scripts/planning/PlanIntakeOps.mjs
  - scripts/export-plan-map.mjs
  - scripts/plan-context-report.mjs
  - tools/plan-map/index.html
  - tools/plan-map/viewer.js
  - tools/plan-map/viewer.css
  - tools/plan-map/README.md
  - tests/plan-map-export.contract.test.mjs
  - docs/plaene/neu/README.md
  - docs/plaene/CHANGELOG.md
verification:
  - npm run plan:context:check
  - node --test tests/plan-map-export.contract.test.mjs
  - npm run plan:check
  - npm run docs:check
---

# Feature: Plan Map Intake-Uebersicht und Kandidaten-Trennung (V134)

## Ziel

Die Plan Map soll fuer Menschen und Agents sofort sichtbar trennen:

- was im `docs/Umsetzungsplan.md` wirklich geplant oder aktiv kanonisch ist,
- welche Dateien in `docs/plaene/neu/` echte neue Planideen oder Kandidaten sind,
- welche Intake-Drafts bereits von offenen Master-Bloecken adoptiert wurden,
- welche Drafts erledigt/adoptiert und damit Archivkandidaten sind,
- welche Bot-Training-Drafts ausserhalb des normalen VXX-Intakes bleiben.

Der Block verbessert die Uebersicht, ohne die bestehende Source-of-Truth-Governance zu veraendern. `docs/Umsetzungsplan.md` bleibt Master-Index, `docs/plaene/aktiv/VXX.md` bleibt kanonische Blockdetailquelle, `docs/plaene/neu/` bleibt User-owned Intake-Zone.

## Ausgangslage 2026-05-22

Read-only-Signale vor Anlage dieses Drafts:

- `npm run plan:context:check` meldete 60 Intake-Drafts:
  - 5 `intake-review`
  - 8 `adopted-by-open-master-block`
  - 3 `adopted-by-done-master-block`
  - 41 `protected-bot-training-intake`
  - 3 `protected-readme`
- Nach Anlage dieses Drafts muss derselbe Check 61 Intake-Drafts und 6 `intake-review`-Kandidaten melden.
- `node scripts/export-plan-map.mjs` exportiert bereits `intakePlans` als eigene Ebene.
- `tools/plan-map` hat einen separaten Intake-Tab, zeigt aber alle Klassen in einer Grid-Liste.
- Die Metrik `Intake` zaehlt aktuell alle Intake-Dateien zusammen; dadurch wirken Bot-Training-Sonderfaelle, uebernommene Drafts und echte neue Ideen gleich offen.
- Der Export erkennt geplante Block-IDs vor allem ueber Frontmatter-Felder wie `planned_block_id`, `plan_file` oder Dateinamen. Einige Drafts enthalten relevante Intake-Daten nur als Fliesstext.
- Der zurueckgenommene Plan-Map-Glossar-Pfad `V133` bleibt bewusst nicht wiederverwendet; dieser Draft schlaegt deshalb `V134` vor.

## Nicht-Ziele

- Keine automatische Aufnahme von Intake-Drafts in `docs/Umsetzungsplan.md`.
- Keine Masterplan-, Aktivplan-, Rule- oder Workflow-Aenderung ohne separates User-Gate.
- Keine Planstatus-Schreibfunktionen im Viewer.
- Keine automatische Verschiebung, Archivierung oder Umbenennung von Draft-Dateien in diesem Block ohne explizites D3/D4-Gate.
- Kein Zusammenlegen von Plan Map, Repo Map und Graph-RAG-Viewer.
- Kein neuer Plan-Index als Source of Truth; V123 bleibt der eigene Migrationspfad.
- Kein Wiederaufleben des zurueckgenommenen V133-Glossar-/Wiki-Scope.

## Gewuenschte Produktsicht

Der erste Blick in die Plan Map soll diese Entscheidungshilfe liefern:

```text
Master / Geplant
  Kanonische VXX-Bloecke aus docs/Umsetzungsplan.md

Ideen / Intake
  Neue Ideen: echte intake-review Kandidaten
  Bereits geplant: Drafts, die offenen Master-Bloecken zugeordnet sind
  Erledigt / Archiv: Drafts zu erledigten Master-Bloecken
  Bot-Training: geschuetzte Sonderzone, standardmaessig eingeklappt
  Meta: README und Strukturhinweise, standardmaessig ausgeblendet
```

Wichtig: "Bereits geplant" soll nicht wie eine neue Aufgabe wirken. Diese Karten sollen primaer zum kanonischen Masterblock springen.

## Architecture Acceptance

Betroffene Schichten:

- Parser-/Klassifikationsschicht: `scripts/planning/PlanIntakeOps.mjs` und `scripts/plan-context-report.mjs`.
- Exportvertrag: `scripts/export-plan-map.mjs` und `curvios.plan-map.v1`.
- Viewer-Schicht: `tools/plan-map/index.html`, `viewer.js`, `viewer.css`.
- Dokumentation/Intake-Konvention: `tools/plan-map/README.md`, `docs/plaene/neu/README.md`.
- Contract-Schutz: `tests/plan-map-export.contract.test.mjs`.

Erlaubte Zielpfade:

- Additive Felder im Export, z. B. `intakeLane`, `intakeAction`, `primaryBlockId`, `canonicalBlockId`, `isCanonical`, `requiresUserIntake`.
- UI-Lanes, Default-Filter und Metrik-Aufteilung im vorhandenen Plan-Map-Viewer.
- Fallback-Erkennung fuer menschenlesbare Intake-Hinweise, solange Frontmatter weiter bevorzugt bleibt.
- Read-only Crosslinks von Intake-Draft zu kanonischem Masterblock.

Verbotene Legacy- oder Risiko-Surfaces:

- Keine direkten Writes in Master, aktive Plaene, Locks oder Graph-Dateien aus dem Viewer.
- Keine neue zweite Wahrheit neben Master, aktiven VXX-Dateien, Changelog und `plan:context`.
- Keine stille Umdeutung von Bot-Training-Drafts in normale VXX-Intakes.
- Keine automatische Loesch-/Move-Logik in UI oder Export.

Neue oder veraenderte Dependency-Kanten:

- `export-plan-map` konsumiert die erweiterte Intake-Klassifikation aus `PlanIntakeOps`.
- `viewer.js` konsumiert die neuen Lane-/Action-Felder, muss aber mit alten Exporten kompatibel bleiben.
- `plan-context-report` und `export-plan-map` sollen dieselbe Klassifikation nicht divergent interpretieren.

Contract-/Snapshot-/Port-Erweiterung:

- `tests/plan-map-export.contract.test.mjs` prueft neue Felder und mindestens je einen Eintrag fuer `candidate`, `adopted-open`, `adopted-done`, `bot-training`, `meta`.
- Optional kleine Unit-Abdeckung fuer `classifyIntakeDraft`, falls die Fallback-Erkennung komplexer wird.
- Viewer-Smoke oder manueller Browser-Check fuer Desktop und schmale Breite bei UI-Aenderungen.

Guard-Signal:

- `npm run plan:context:check`
- `node --test tests/plan-map-export.contract.test.mjs`
- `npm run plan:check`
- `npm run docs:check`
- bei Viewer-/Shell-Auswirkung: vorhandene Map-Tools-Android-/Electron-Contracts oder gezielte Start-Smokes.

Ratchet-Auswirkung:

- Keine Verschiebung der Source of Truth.
- Additive Exportfelder muessen optional bleiben, bis alle konsumierenden Shells denselben Viewer verwenden.
- Spaetere physische Ordnertrennung oder Archivierung bleibt eigener D3/D4-Scope.

## Phasen

### 134.1 Baseline und Zielklassifikation
status: open
goal: bestehende Datenlage und Ziel-Lanes ohne Code-Diff fixieren
output: bestaetigte Lane-Matrix und Abgleich gegen `plan:context`

- [ ] 134.1.1 Aktuelle Counts aus `npm run plan:context:check` und `node scripts/export-plan-map.mjs` erfassen: Master-Bloecke, Intake-Klassen, echte Kandidaten, Bot-Training, adoptierte Drafts.
- [ ] 134.1.2 Lane-Modell festlegen: `candidate`, `adopted-open`, `adopted-done`, `bot-training`, `meta`.
- [ ] 134.1.3 User-Entscheidung fuer `V134` vs. Merge in `V127` dokumentieren; bis dahin bleibt dieser Draft eigenstaendig.
- [ ] 134.1.4 Bestehende `V133`-Rollback-Historie als No-go fuer Wiederverwendung der Block-ID bestaetigen.

### 134.2 Intake-Klassifikation und Exportvertrag
status: open
goal: Plan Map kann Ideen, uebernommene Drafts und Sonderzonen maschinell unterscheiden
output: additive Exportfelder mit Contract-Abdeckung

- [ ] 134.2.1 `PlanIntakeOps` um `intakeLane`, `intakeAction`, `primaryBlockId`, `canonicalBlockId` und `requiresUserIntake` erweitern.
- [ ] 134.2.2 Fallback-Erkennung fuer Fliesstext ergaenzen: "Vorgeschlagene Block-ID", "Geplante aktive Detaildatei", "Ziel-Masterplan", "Manuelle Uebernahme erforderlich".
- [ ] 134.2.3 Mehrdeutige Block-IDs sauber markieren: z. B. Dateinamen mit altem Kontextblock plus Zielblock duerfen nicht still falschen Primary-Block erzeugen.
- [ ] 134.2.4 `scripts/export-plan-map.mjs` summary-Metriken splitten: echte Kandidaten, offene adoptierte Drafts, erledigte adoptierte Drafts, Bot-Training, Meta.
- [ ] 134.2.5 Contract-Test fuer Exportfelder und Summary-Counts nachziehen.

### 134.3 Intake-UI als Lanes statt Mischliste
status: open
goal: Intake-Tab zeigt Entscheidungsstatus statt Dateiliste
output: scanbare Lane-Ansicht mit sinnvollen Defaults

- [ ] 134.3.1 Intake-View standardmaessig auf echte Kandidaten/Ideen fokussieren.
- [ ] 134.3.2 Lanes rendern: `Neue Ideen`, `Bereits geplant`, `Erledigt / Archiv`, `Bot-Training`, `Meta`.
- [ ] 134.3.3 Bot-Training und Meta standardmaessig einklappen oder per Filter ausblenden.
- [ ] 134.3.4 `adopted-open`-Karten als Handoff-Karten zeigen: kanonischer Block, Status, Sprung zum Blockdetail, Draft nur als Source-History.
- [ ] 134.3.5 `adopted-done`-Karten als Archivkandidaten zeigen, ohne automatische Move-Aktion.
- [ ] 134.3.6 Leere Zustande formulieren: keine echten Kandidaten, aber uebernommene Drafts vorhanden; keine Bot-Training-Anzeige im normalen VXX-Intake.

### 134.4 Master-/Intake-Navigation verbinden
status: open
goal: bereits geplante Drafts landen beim kanonischen Block statt als zweite Aufgabe zu wirken
output: read-only Querlinks und Blockdetail-Herkunft

- [ ] 134.4.1 Im Detailpanel fuer Master-Bloecke "Draft-Herkunft" anzeigen, wenn passende `adopted-open`- oder `adopted-done`-Drafts existieren.
- [ ] 134.4.2 Intake-Karten mit `canonicalBlockId` bekommen einen Button/Link zum Block.
- [ ] 134.4.3 Suche und Workstream-Filter behalten sowohl Master- als auch Intake-Treffer, zeigen aber die Quelle klar an.
- [ ] 134.4.4 Datei-Fokus nutzt `scope_files` aus Drafts weiterhin, markiert aber ob der Treffer Kandidat oder bereits geplant ist.
- [ ] 134.4.5 URL-State optional vorbereiten (`?view=intake&lane=candidate`, `?block=V120`), ohne ihn als Contract-Pflicht einzufuehren.

### 134.5 Begriffe, Frontmatter und Dokumentation
status: open
goal: neue Drafts werden von Anfang an maschinenlesbar und fuer Menschen eindeutig
output: Intake-Konvention und Plan-Map-Doku

- [ ] 134.5.1 `docs/plaene/neu/README.md` um empfohlene Frontmatter-Felder ergaenzen: `planned_block_id`, `plan_file`, `target_master`, `intake_status`, `decision_class`, `scope_files`.
- [ ] 134.5.2 `tools/plan-map/README.md` mit Lane-Modell, Default-Filter und Source-of-Truth-Grenze nachziehen.
- [ ] 134.5.3 UI-Begriffe schaerfen: `Map` optional zu `Master`/`Geplant`, `Intake` optional zu `Ideen / Intake`; Entscheidung vor Umsetzung treffen.
- [ ] 134.5.4 Changelog-Notiz fuer den Umsetzungsslice vorbereiten: keine neue Wahrheit, nur bessere Navigation.

### 134.6 Optionaler Struktur- und Archivierungsentscheid
status: open
goal: physische Ordnertrennung nur mit separatem User-Gate bewerten
output: Entscheidungsvorlage, keine Auto-Moves

- [ ] 134.6.1 Pruefen, ob UI-/Export-Lanes reichen; Default ist kein Ordnerumbau.
- [ ] 134.6.2 Falls weiterhin unuebersichtlich: Vorschlag fuer `docs/plaene/neu/kandidaten/`, `docs/plaene/neu/adoptiert-offen/`, `docs/plaene/neu/meta/` als D3/D4-Option ausarbeiten.
- [ ] 134.6.3 Bot-Training-Sonderzone separat bewerten; kein normaler VXX-Move ohne Bot-Training-Governance.
- [ ] 134.6.4 Move-/Archivierungsplan nur als Dry-Run/Report liefern; jede echte Verschiebung braucht User-Gate, Recovery-Pfad und planbezogene Changelog-Notiz.

### 134.7 Verifikation und Shell-Abgleich
status: open
goal: Plan Map bleibt in Browser, Electron Map Tools und Android Wrapper stabil
output: gezielte Gates und UI-Smoke

- [ ] 134.7.1 `node --test tests/plan-map-export.contract.test.mjs` fuer den Exportvertrag ausfuehren.
- [ ] 134.7.2 `npm run plan:context:check` gegen `PlanIntakeOps`-Klassifikation spiegeln.
- [ ] 134.7.3 `npm run plan:check` und `npm run docs:check` ausfuehren.
- [ ] 134.7.4 Bei Viewer-Aenderungen `.\start-plan-map.ps1` oder lokalen statischen Viewer starten und Desktop/narrow Layout pruefen.
- [ ] 134.7.5 Bei Map-Tools-Shell-Auswirkung gezielte Electron-/Android-Map-Tools-Contracts oder vorhandene App-Checks laufen lassen.

### 134.99 Abschluss-Gate
status: open
goal: Intake-Uebersicht ist verbessert, ohne Source-of-Truth-Grenzen zu verschieben
output: nachvollziehbarer Abschluss mit Evidence

- [ ] 134.99.1 Alle frueheren Phasen sind erledigt oder blockerfest mit Nachfolgeentscheidung dokumentiert.
- [ ] 134.99.2 Plan Map zeigt echte Kandidaten getrennt von uebernommenen, erledigten, Bot-Training- und Meta-Drafts.
- [ ] 134.99.3 Summary-Metriken unterscheiden `Ideen`, `Bereits geplant`, `Archivkandidaten`, `Bot-Training` und `Meta`.
- [ ] 134.99.4 Kein Viewer-Pfad schreibt Master, aktive Plaene, Locks, Graph oder Draft-Dateien.
- [ ] 134.99.5 Contract-, Plan- und Doku-Gates sind gruen oder blockerfest dokumentiert.
- [ ] 134.99.6 Abschlussnotiz nennt, ob physische Ordnertrennung verworfen, vertagt oder als separater User-Gate-Scope vorbereitet wurde.

## Definition of Done

- [ ] DoD.1 Die Plan Map trennt kanonische Master-Bloecke sichtbar von nicht-kanonischen Intake-Drafts.
- [ ] DoD.2 Echte neue Planideen sind ohne Bot-Training-, README- und bereits-adoptiert-Rauschen sichtbar.
- [ ] DoD.3 Bereits geplante Drafts verweisen klar auf ihren kanonischen Masterblock und erscheinen nicht als zweite Aufgabe.
- [ ] DoD.4 Erledigt adoptierte Drafts sind als Archivkandidaten sichtbar, aber werden nicht automatisch verschoben.
- [ ] DoD.5 Intake-Parser erkennt Frontmatter und wichtige Alt-Fliesstext-Muster robust genug, ohne mehrdeutige Block-IDs still falsch zu setzen.
- [ ] DoD.6 Exportvertrag und Viewer bleiben read-only und rueckwaertskompatibel fuer fehlende optionale Felder.
- [ ] DoD.7 `docs/plaene/neu/README.md` beschreibt die empfohlenen maschinenlesbaren Felder fuer neue Drafts.
- [ ] DoD.8 Tests/Gates belegen Exportvertrag, Plan-Kontext-Konsistenz und Doku-/Planvaliditaet.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| UI-Lanes werden als neue Governance-Klassen missverstanden. | mittel | README und UI nennen sie Navigation/Anzeige, nicht Source of Truth. |
| Parser-Fallbacks erzeugen falsche Primary-Block-IDs. | mittel | Frontmatter gewinnt; Fallbacks nur mit Ambiguitaetsmarker und Tests. |
| Adoptierte Drafts wirken weiterhin wie offene Ideen. | mittel | Separate Lane, Sprung zum Masterblock, andere Kartenform. |
| Bot-Training wird versehentlich in normalen VXX-Intake gezogen. | hoch | Eigene geschuetzte Lane, Default eingeklappt, keine normalen Move-Aktionen. |
| Physische Ordnertrennung erzeugt Archiv-/Move-Risiko. | hoch | Nur optionaler D3/D4-Entscheid, Default ist UI-/Export-Loesung. |
| V134 kollidiert mit V127/V123. | mittel | Als eigenstaendigen kleinen Plan-Map-Intake-Scope halten oder bewusst per User-Intake in V127 mergen. |
| Viewer-Aenderung bricht Android-/Electron-Embedding. | mittel | Map-Tools-Contracts/App-Checks bei UI-Shell-Auswirkung. |

## Dependencies und Handoff

### Hard

- `V116.99`: Plan-Kontext-Reduktion, Intake-/Archivklassifikation und `plan:context:check` sind Baseline.
- `V117.99`: D3/D4-Gates und User-owned Intake-Governance sind Baseline.

### Soft

- `V123.1`: Plan-Index- und Source-of-Truth-Migration kann spaeter strukturierte Plan-Daten liefern; V134 darf sie nicht vorwegnehmen.
- `V127`: Repo-/Plan-Map-Crosslinks und Dependency-Fokus sind verwandt. V134 kann eigenstaendig starten, sollte aber bei V127-Intake auf Scope-Dopplung geprueft werden.

## AI-Ausfuehrungsmatrix

| Bereich | Klasse | Default | Grenze |
| --- | --- | --- | --- |
| Read-only Analyse, Export, `plan:context`, Contract-Reads | D0 | AUTO | Keine getrackten Source-of-Truth-Dateien aendern |
| Neuer Intake-Draft unter `docs/plaene/neu/` | D2 | AUTO | Keine Master-/Aktivplan-Aenderung |
| Parser-/Export-/Viewer-/CSS-/Contract-Test-Aenderungen | D2 | REVIEW | Read-only Viewer; scoped Tests und Plan-/Doku-Gates |
| `docs/plaene/neu/README.md` und `tools/plan-map/README.md` | D2 | REVIEW | Begriffe duplizieren keine Governance |
| Masterplan-/Aktivplan-Intake, Rules, Workflows | D3 | USER-GATE | User-owned Intake |
| Physische Moves/Archivierung/Loeschungen | D4 | USER-GATE | Recovery-Pfad, Dry-Run, Changelog noetig |

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V134`
- vorgeschlagene kanonische Blockdatei nach Intake: `docs/plaene/aktiv/V134.md`
- Alternative: als expliziter Teil-Scope in `V127` aufnehmen, falls V127 zuerst kanonisiert wird.
- hard dependencies: `V116.99`, `V117.99`
- soft dependencies: `V123.1`, `V127`
- vorgeschlagene Prioritaet: `P2`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
