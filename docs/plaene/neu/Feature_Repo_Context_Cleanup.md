---
title: Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung
status: draft
priority: P1
owner: user-intake
planned_block_id: V116
depends_on:
  - V109.99
  - V115.99
affected_area: governance-context-cleanup
scope_files:
  - AGENTS.md
  - CLAUDE.md
  - .gemini/README.md
  - .gitignore
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/plan.md
  - .agents/workflows/code.md
  - docs/Umsetzungsplan.md
  - docs/plaene/aktiv/README.md
  - docs/plaene/neu/README.md
  - docs/plaene/aktiv/V*.md
  - docs/plaene/neu/*.md
  - docs/plaene/alt/*.md
  - docs/prozess/Open_Findings.md
  - docs/referenz/ai_project_onboarding.md
  - docs/generated/knowledge-graph.json
  - scripts/workspace-cleanup.mjs
  - scripts/validate-umsetzungsplan.mjs
  - scripts/check-gemini-governance.mjs
  - scripts/query-knowledge-graph.mjs
  - tmp/workspace-cleanup-report.json
---

# Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung

## Kurzfassung

Curvios Clash soll nicht neu gebaut werden. Der vorhandene Code-, Test-, Desktop-, Trainer- und Recording-Stack enthaelt zu viel validiertes Produkt- und Edge-Case-Wissen, um ihn durch einen Clean-Slate-Neubau zu ersetzen. Das eigentliche Risiko liegt auf der Meta-Ebene: alte Plaene, lokale Artefakte, Logs, Archive und mehrere Agenten-Einstiege koennen KI-Agenten in veraltete Pfade ziehen.

Dieser Plan reduziert deshalb radikal den Standard-Lesekontext fuer KI-Agenten, bleibt aber konservativ im Dateisystem. Historie, Evidence und produktive Runtime-Pfade bleiben erhalten, solange sie noch referenziert, validierend oder lizenz-/auditrelevant sind.

## Diagnose

### Code-Welt

Der produktive Stack ist komplex, aber nicht offensichtlich verloren:

- Vite, Electron, Playwright, TypeScript-Architekturcheck, Contract-Tests, Knowledge-Graph, Bot-/Training-Skripte und Recording-Pfade existieren bereits.
- `npm run plan:check` ist gruen.
- `node scripts/query-knowledge-graph.mjs critical-path-health` meldet zentrale Runtime-Pfade wie `combat-hit`, `round-end`, `settings` und `spawn` als `ok`.
- Grosse Dateien existieren weiterhin, z. B. `src/core/arcade/ArcadeRunRuntime.js`, `src/core/MediaRecorderSystem.js`, `src/ui/UIStartSyncController.js` und `src/ui/UIManager.js`; diese sind Refactor-Kandidaten, aber kein Beweis fuer einen notwendigen Neubau.

### Meta-Welt

Der Meta-Kontext ist die groessere Belastung:

- `docs/plaene/aktiv/` enthaelt mehr Detailplaene als der Master aktuell direkt referenziert.
- `docs/plaene/neu/` enthaelt alte Intake-Drafts, die fuer neue Agenten leicht wie aktuelle Plaene wirken koennen.
- `tmp/`, Root-Logs, `test-results/`, alte Videos und lokale Diagnoseartefakte erzeugen viel Rauschen.
- `.claude/`, `.gemini/`, `.agents/` und `CLAUDE.md` koennen ohne klare Priorisierung wie konkurrierende Agenten-Wahrheiten erscheinen.

### Bestehende Schutzbasis

Es gibt bereits wichtige Vorarbeit:

- `docs/Umsetzungsplan.md` ist als kompakter Master-Index definiert.
- Kanonische Blockdetails liegen in `docs/plaene/aktiv/VXX.md`.
- Bot-Training hat eine eigene Quelle: `docs/bot-training/Bot_Trainingsplan.md`.
- `scripts/workspace-cleanup.mjs` besitzt Dry-Run, Schutz fuer getrackte Dateien, Retention-Regeln und aktive Playwright-Lock-Erkennung.
- `.gitignore` schliesst viele lokale Artefakte bereits aus.
- V109 hat Governance und Workflows bereits entschlackt.
- V115 hat Repo-Retention fuer P22 bereits teilweise entschieden; dieser Plan darf P22 nicht einfach duplizieren.

## Ziel

Der Standard-Kontext fuer Codex, Gemini, Claude und andere Agenten wird so reduziert, dass sie nur aktuelle, kanonische Steuerquellen lesen, ohne historische Evidence oder produktive Assets zu verlieren.

Ergebnis:

- weniger KI-Halluzinationen durch alte Plaene oder Logs
- sauberer Einstieg fuer neue Agenten
- konservativer Workspace-Cleanup ohne Produktverlust
- klar klassifizierte Planarchive
- vorbereitete, aber nicht vermischte Code-Entflechtung
- stabile Gates fuer spaetere Refactoring-Slices

## Nicht-Ziele

- Kein kompletter Code-Neubau.
- Kein einzelnes riesiges `CURRENT_MASTER_PLAN.md`, das alle Detailplaene ersetzt.
- Kein pauschales Loeschen oder Zippen von `docs/archive/`, `docs/plaene/alt/`, `docs/plaene/aktiv/`, `.claude/` oder `tmp/` ohne Klassifikation.
- Keine Massensanierung aller TypeScript-, ESLint- oder Playwright-Probleme in einem Schritt.
- Keine God-Class-Entflechtung, bevor Meta-Cleanup, Gates und Refactor-Kandidat dokumentiert sind.
- Keine Aenderung produktiver Spielparameter, Bot-Training-Parameter, Physik-Logik oder Recording-Verhalten in diesem Block.
- Keine neuen parallelen Governance-Systeme neben `AGENTS.md`, `.agents/rules/`, `.agents/workflows/` und `docs/Umsetzungsplan.md`.

## Leitprinzipien

- Radikal im Leseweg, konservativ im Dateisystem.
- Archive sind nicht automatisch falsch; sie duerfen nur nicht Standard-Kontext sein.
- Datum allein ist kein Archivierungs- oder Loeschkriterium.
- Dead-Code-Removal nur nach Klassifikation und Ersatz-/Consumer-Beweis.
- Jeder automatisierte Cleanup startet im Dry-Run.
- Code-Refactoring wird als eigener, kleiner Delivery-Slice behandelt.
- Der Master bleibt Index; Details bleiben in kanonischen Detaildateien.

## Betroffene Quellen

### Primaere Einstiegsschicht

- `AGENTS.md`
- `.agents/rules/*.md`
- `.agents/workflows/*.md`
- `docs/Umsetzungsplan.md`
- relevante `docs/plaene/aktiv/VXX.md`
- `docs/prozess/Open_Findings.md`
- `docs/bot-training/Bot_Trainingsplan.md` nur fuer Bot-Training-Scope

### Nur bei explizitem Bedarf lesen

- `docs/plaene/alt/`
- `docs/archive/`
- alte Intake-Drafts unter `docs/plaene/neu/`
- historische Fehlerberichte
- lokale Logs, Screenshots, Videos, Test-Outputs
- `.claude/`, `.codex_tmp/`, `tmp/`, `logs/`

## Definition of Done

- [ ] DoD.1 Baseline ist dokumentiert: Git-Status, Plancheck, Knowledge-Graph-Signal und Cleanup-Dry-Run liegen vor.
- [ ] DoD.2 Lokale Artefakte sind ueber `scripts/workspace-cleanup.mjs` konservativ bereinigt oder bewusst geschuetzt; keine produktiven oder getrackten Dateien wurden versehentlich entfernt.
- [ ] DoD.3 KI-Leseweg ist eindeutig dokumentiert: Agenten lesen standardmaessig nur kanonische Quellen und ignorieren Archive/Altplaene/Logs ohne expliziten Auftrag.
- [ ] DoD.4 Plan-Kontext ist klassifiziert: Master-referenzierte, dependency-relevante, historische und archivfaehige Plan-Dateien sind getrennt.
- [ ] DoD.5 `docs/plaene/neu/` enthaelt nur echte Intake-Drafts oder ist entsprechend dokumentiert; bereits uebernommene Drafts sind abgeloest oder archiviert.
- [ ] DoD.6 Agenten-Regeln wurden nur gestrafft, nicht neu erfunden; bestehende Dead-Code-, Scope-, Lock- und Commit-Sicherungen bleiben erhalten.
- [ ] DoD.7 Refactor-Kandidaten sind inventarisiert, priorisiert und mit Test-/Gate-Signal versehen; noch kein breiter Code-Umbau im Cleanup-Scope.
- [ ] DoD.8 Abschluss-Gates fuer Docs-/Governance-Scope sind gruen oder blockerfest dokumentiert: `npm run plan:check`, `npm run check:gemini`, `npm run gates:pre-commit`.
- [ ] DoD.99 Der Block ist erst geschlossen, wenn Master, aktive Detaildatei, Open Findings und Changelog denselben Status zeigen.

## Phasen

### 116.1 Baseline und Schutzrahmen

status: draft
goal: Aktuellen Zustand messen, bevor Cleanup oder Verschiebungen stattfinden.
output: Baseline-Report und klare No-Touch-Grenzen.

- [ ] 116.1.1 Git-Status erfassen und fremde uncommittete Aenderungen als No-Touch markieren. Keine Stashes, keine destruktiven Git-Kommandos.
- [ ] 116.1.2 Struktur-Gates erfassen: `npm run plan:check`, `node scripts/query-knowledge-graph.mjs critical-path-health`, optional `node scripts/query-knowledge-graph.mjs scope-collisions --json`.
- [ ] 116.1.3 Cleanup-Dry-Run ausfuehren: `npm run cleanup:workspace`; Bericht `tmp/workspace-cleanup-report.json` nach Aktion, Risiko und Top-Level-Pfad zusammenfassen.
- [ ] 116.1.4 No-Touch-Klassen dokumentieren: produktive Assets, getrackte Dateien, aktive Locks, aktuelle Evidence, Bot-Training-Checkpoints, lizenz-/vendornahe Quellen, aktive Planreferenzen.
- [ ] 116.1.5 Entscheiden, ob V115.99 vor diesem Block geschlossen werden muss oder ob dieser Plan als V116 mit harter Dependency auf V115.99 in den Master geht.

Gate:

- `npm run plan:check`
- Kein produktiver Code-Diff.
- Keine Loeschung oder Verschiebung.

### 116.2 Lokale Artefakte und Workspace-Rauschen

status: draft
goal: Generierte oder lokale Artefakte entfernen/archivieren, ohne Versioniertes oder Produktives zu treffen.
output: Bereinigter Arbeitsbaum fuer ignorierte Artefakte und aktualisierte Retention-Evidence.

- [ ] 116.2.1 `scripts/workspace-cleanup.mjs` pruefen: Schutz fuer getrackte Dateien, aktive Playwright-Locks, `prototypes/`, Recording-Pfade und Retention-Artefakte bestaetigen.
- [ ] 116.2.2 Dry-Run-Kandidaten klassifizieren: `delete`, `archive`, `protect`; riskante Kandidaten manuell ausnehmen.
- [ ] 116.2.3 Apply nur fuer konservative Kandidaten: Root-Logs, alte Dev-Logs, nicht aktive `test-results`, eindeutig generierte tmp-Diagnoseartefakte, alte Videos nach Retention-Regel.
- [ ] 116.2.4 Nach Apply `git status --short` pruefen: keine unerwarteten tracked Deletes; falls doch, stoppen und Bericht in `docs/Fehlerberichte/` oder Block-Evidence.
- [ ] 116.2.5 `.gitignore` nur dann anpassen, wenn neue generierte Muster wiederholt auftauchen und nicht bereits abgedeckt sind.

Gate:

- `npm run cleanup:workspace`
- `git status --short`
- Keine produktiven Quellen geloescht.

### 116.3 KI-Kontext-Policy

status: draft
goal: Agenten sehen standardmaessig nur aktuelle Wahrheiten.
output: Kurzer, verbindlicher Leseweg fuer Codex/Gemini/Claude.

- [ ] 116.3.1 `AGENTS.md` gegen `.gemini/README.md` und `CLAUDE.md` abgleichen: eine klare Prioritaet dokumentieren, keine konkurrierenden Regeln.
- [ ] 116.3.2 `docs/referenz/ai_project_onboarding.md` erstellen oder aktualisieren: Standard-Leseweg, Bot-Training-Sonderweg, Archive-Read-Regel, tmp/log/video-Regel, Graph-First-Hinweise.
- [ ] 116.3.3 Falls Tool-spezifische Ignore-Dateien existieren oder sinnvoll sind, nur Kontext-Ausschluesse fuer lokale/archivierte Quellen definieren: `docs/archive/`, `docs/plaene/alt/`, `tmp/`, `logs/`, `.claude/`, `.codex_tmp/`, `videos/`, `dist/`, `test-results/`.
- [ ] 116.3.4 Sicherstellen, dass Archive nicht aus Git-Historie oder Dokumentation verschwinden; sie werden nur aus dem Standard-Kontext ausgeschlossen.
- [ ] 116.3.5 `check:gemini` erweitern oder nutzen, um versehentliche Gemini-Memory-/Log-Artefakte im Repo zu verhindern.

Gate:

- `npm run check:gemini`
- `npm run plan:check`
- Bei Governance-Diff: `npm run gates:pre-commit`

### 116.4 Plan-Kontext klassifizieren und entschlacken

status: draft
goal: `docs/plaene/aktiv/`, `neu/` und `alt/` wieder semantisch eindeutig machen.
output: Weniger Plan-Rauschen fuer Agenten, ohne Dependency-Evidence zu verlieren.

- [ ] 116.4.1 Master-referenzierte aktive Plaene automatisch erfassen: alle `docs/plaene/aktiv/VXX.md`, die in `docs/Umsetzungsplan.md` verlinkt sind.
- [ ] 116.4.2 Nicht referenzierte aktive Plaene in Klassen teilen:
  - `dependency-source`: noch in Depends-On, Historie oder Closure-Abgleich relevant.
  - `closure-evidence`: abgeschlossen, aber noch als Nachweis wichtig.
  - `superseded`: durch neueren Block oder `CHANGELOG.md` abgeloest.
  - `archive-candidate`: nicht referenziert, nicht dependency-relevant, nicht aktuelle Evidence.
- [ ] 116.4.3 Nur `archive-candidate`-Dateien verschieben; alle anderen mit Retention-Grund dokumentieren.
- [ ] 116.4.4 `docs/plaene/neu/` auf echte Intake-Drafts reduzieren: bereits uebernommene Drafts nach `alt/`, Bot-Training-Drafts gegen Bot-Training-Master klassifizieren.
- [ ] 116.4.5 `docs/plaene/aktiv/README.md` und `docs/plaene/neu/README.md` aktualisieren, damit Agenten die Klassen erkennen.
- [ ] 116.4.6 Keine Master-Intake-Aenderungen ohne User-owned Uebernahme. Der Planentwurf bleibt in `docs/plaene/neu/`, bis der User ihn in den Master aufnimmt.

Gate:

- `npm run plan:check`
- Wenn Planstruktur geaendert wurde: `npm run gates:pre-commit`
- Stichprobe: ein neuer Agent kann aus `AGENTS.md` und `docs/Umsetzungsplan.md` den richtigen aktuellen Plan finden, ohne Altplaene zu lesen.

### 116.5 Governance- und Workflow-Straffung

status: draft
goal: Regeln so kurz und eindeutig machen, dass sie KI-Arbeit fuehren, aber nicht in Meta-Arbeit druecken.
output: Gestraffte Regeln ohne Sicherheitsverlust.

- [ ] 116.5.1 `.agents/rules/token_efficiency_and_tools.md` mit der neuen KI-Kontext-Policy abgleichen: Archive nur bei Bedarf, Graph-First fuer Scope-/Runtime-Fragen, keine redundanten Reads.
- [ ] 116.5.2 `.agents/workflows/plan.md`, `code.md` und `quick.md` nur punktuell anpassen, falls sie gegen die neue Kontext-Policy laufen.
- [ ] 116.5.3 Dead-Code-, Git-, Lock- und Commit-Sicherungen unveraendert stark halten; keine Safety-Reduktion nur fuer kuerzere Prompts.
- [ ] 116.5.4 `CLAUDE.md` und `.gemini/README.md` als Adapter fuer Tool-Spezifika behandeln, nicht als zweite oder dritte Projektwahrheit.
- [ ] 116.5.5 Abschlussnotiz im passenden Governance-Kontext hinterlassen: warum weniger Standardkontext die Produktarbeit entlastet.

Gate:

- `npm run check:gemini`
- `npm run plan:check`
- `npm run gates:pre-commit`

### 116.6 Type-, Lint- und Test-Haertung vorbereiten

status: draft
goal: Sicherheitsnetz fuer spaetere Refactors definieren, ohne einen breiten Fehlerfix-Sumpf zu starten.
output: Priorisierte Gate-Matrix statt pauschalem "alles fixen".

- [ ] 116.6.1 Bestehende Gate-Landschaft erfassen: `architecture:guard`, `typecheck:architecture`, `lint:architecture`, `test:contract`, Playwright-Smokes, Knowledge-Graph-Gates.
- [ ] 116.6.2 Aktuelle bekannte Blocker und Findings abgleichen: `docs/prozess/Open_Findings.md`, V90 fuer Dependency-/Toolchain-Security, V105/V112 fuer Boundary-/Test-Recovery.
- [ ] 116.6.3 Keine pauschalen Vollruns als Standard erzwingen; pro spaeterem Refactor-Kandidaten kleinste sinnvolle Tests definieren.
- [ ] 116.6.4 Falls ein Gate bereits strukturell rot ist, nicht breit reparieren, sondern Fehlerklasse einem bestehenden oder neuen Block zuordnen.
- [ ] 116.6.5 Dokumentieren, welche Gates fuer den ersten Code-Entflechtungs-Slice Pflicht sind.

Gate:

- `npm run plan:check`
- Optional enger Check je nach Scope; kein Voll-Playwright ohne explizite User-Entscheidung.

### 116.7 Refactor-Kandidaten inventarisieren

status: draft
goal: God-Class-Entflechtung vorbereiten, aber noch nicht breit implementieren.
output: Priorisierte Kandidatenliste mit Verbrauchern, Risiko und Tests.

- [ ] 116.7.1 Groesste Dateien und Hotspots erfassen, mindestens:
  - `src/core/arcade/ArcadeRunRuntime.js`
  - `src/core/MediaRecorderSystem.js`
  - `src/ui/UIStartSyncController.js`
  - `src/ui/UIManager.js`
  - `src/ui/arcade/ArcadeVehicleManager.js`
- [ ] 116.7.2 Fuer jeden Kandidaten Verbraucher, aktive Blocks, offene Findings und Knowledge-Graph-Surface erfassen.
- [ ] 116.7.3 Kandidaten nach Risiko/Nutzen priorisieren:
  - Produktstabilitaet
  - Bot-/Headless-Performance
  - Testbarkeit
  - Coupling zu Electron/Desktop
  - Coupling zu UI
- [ ] 116.7.4 Pro Kandidat einen moeglichen ersten Extraktions-Slice definieren, z. B. reine Calculation-/Policy-/Adapter-Funktion statt UI- oder Runtime-Grossumbau.
- [ ] 116.7.5 Einen Kandidaten fuer Folgeblock vorschlagen; Umsetzung nicht in diesem Cleanup-Block erzwingen.

Gate:

- Kein produktiver Code-Diff ausser optionaler Mess-/Report-Datei.
- `npm run plan:check`

### 116.8 Erster kontrollierter Code-Entflechtungs-Slice

status: optional
goal: Nur wenn 116.1 bis 116.7 stabil sind, ein kleines Modul extrahieren.
output: Ein nachweislich unveraendertes Verhalten mit kleinerem Modulzuschnitt.

- [ ] 116.8.1 User bestaetigt den ersten Kandidaten und Scope.
- [ ] 116.8.2 Vorher-Test oder Contract-Signal definieren und ausfuehren.
- [ ] 116.8.3 Genau eine Verantwortlichkeit extrahieren; keine Feature-Arbeit, keine Parameter-Tuning-Aenderung.
- [ ] 116.8.4 Imports aktualisieren und Legacy-/Compatibility-Pfade nur mit Why-Kommentar behalten.
- [ ] 116.8.5 Nachher-Test ausfuehren und Ergebnis im aktiven Block dokumentieren.

Gate:

- Kandidatenspezifischer Contract-/Build-/Runtime-Check.
- `npm run plan:check`
- Bei `*.99` oder Docs-/Governance-Scope: `npm run gates:pre-commit`

### 116.99 Abschluss-Gate

status: draft
goal: Cleanup-Sanierung widerspruchsfrei abschliessen.
output: Weniger Kontext-Rauschen, klare Agenten-Einstiege und vorbereitete Refactor-Folgearbeit.

- [ ] 116.99.1 `docs/Umsetzungsplan.md`, aktive V116-Detaildatei, `docs/prozess/Open_Findings.md` und `docs/plaene/CHANGELOG.md` zeigen denselben Abschlussstand.
- [ ] 116.99.2 Keine offenen eigenen Cleanup-Aenderungen bleiben uncommitted.
- [ ] 116.99.3 Abschluss-Evidence nennt konkret: entfernte/archivierte Artefaktklassen, geschuetzte Klassen, Plan-Klassifikation, Agenten-Kontext-Regel und Refactor-Folgeempfehlung.
- [ ] 116.99.4 Gates: `npm run plan:check`, `npm run check:gemini`, `npm run gates:pre-commit`; weitere technische Gates nur fuer tatsaechlich geaenderte Codepfade.

## Risiko-Register

| Risiko | Schwere | Beschreibung | Gegenmassnahme |
| --- | --- | --- | --- |
| R1 | hoch | Zu aggressive Archivierung entfernt noch relevante Plan-Evidence. | Nie nach Datum verschieben; nur nach Master-/Dependency-/Closure-Klassifikation. |
| R2 | hoch | Cleanup entfernt produktive oder lizenzrelevante Assets. | `workspace-cleanup` nutzt Dry-Run, getrackte-Datei-Schutz und No-Touch-Klassen; Assets nur nach Consumer-Pruefung. |
| R3 | mittel | Agenten lesen trotz Policy alte Plaene. | Onboarding und Tool-Ignore-Regeln schaerfen; Archive nur bei explizitem Auftrag. |
| R4 | mittel | Governance-Straffung entfernt wichtige Safety-Regeln. | Dead-Code-, Git-, Lock- und Commit-Regeln unveraendert pruefen; `gates:pre-commit`. |
| R5 | mittel | Type-/Lint-Haertung eskaliert zu breitem Reparaturprojekt. | Gate-Matrix statt Pauschalauftrag; Fehlerklassen separaten Blocks zuordnen. |
| R6 | mittel | Erster Code-Refactor vermischt Feature-Arbeit und Entflechtung. | 116.8 optional und nur nach User-Bestaetigung; genau eine Verantwortlichkeit. |
| R7 | niedrig | Weniger Standardkontext macht Historie schwerer findbar. | Historie bleibt erhalten; README/Onboarding beschreibt explizite Suchpfade. |

## Automatisierungsstrategie

Das Automatisierungs-Skript soll diesen Plan nicht als Abrissauftrag interpretieren, sondern als sequenzielles Sanierungsprogramm:

1. Immer Dry-Run vor Apply.
2. Immer kleinste sinnvolle Datei-/Scope-Menge.
3. Immer nach Phase committen, wenn verifiziert und keine fremden Aenderungen beruehrt werden.
4. Keine pauschalen Voll-Test-Suites ohne User-Entscheidung.
5. Keine Loeschungen in `src/`, `docs/plaene/aktiv/`, `docs/bot-training/`, `assets/`, `data/` oder `prototypes/` ohne explizite Klassifikation.
6. Keine Veraenderung an Bot-Training-Parametern, Physik-Tuning, Kollisionslogik oder Recording-Verhalten in Cleanup-Phasen.

## Vorgeschlagene Master-Intake-Daten

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V116`
- Titel: `Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung`
- Status: `planned`
- Prioritaet: `P1`
- Owner: `frei`
- Hard dependencies: `V109.99`, `V115.99`
- Soft dependencies: `V107.99` fuer Knowledge-Graph-Nutzung, `V90` fuer Toolchain-Blocker-Kontext
- Current phase nach Intake: `116.1`
- Manuelle Uebernahme erforderlich: ja

## Offene Entscheidungen fuer den User

- Soll V116 erst nach V115.99 starten oder darf 116.1/116.2 als Vorarbeit parallel laufen?
- Soll der erste Code-Entflechtungs-Slice Teil von V116 bleiben oder als eigener Folgeblock geplant werden?
- Welche Agenten sollen aktiv ueber Ignore-/Kontextregeln gesteuert werden: Codex, Gemini, Claude oder alle drei?
- Sollen Videos und grosse lokale Artefakte nur archiviert oder auch extern ausgelagert werden?

