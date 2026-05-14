---
title: Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung
status: draft
priority: P1
owner: user-intake
planned_block_id: V116
depends_on:
  - V109.99
  - V117.99
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
  - docs/CURRENT_CONTEXT.md
  - docs/referenz/ai_project_onboarding.md
  - docs/generated/knowledge-graph.json
  - scripts/workspace-cleanup.mjs
  - scripts/plan-context-report.mjs
  - scripts/check-agent-context.mjs
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
- Kein Reborn-/Neubau-Spike als heimlicher Ersatz des Hauptrepos; ein Spike braucht eigenen Plan, eigene Gates und Paritaetsvergleich.
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
- Maschinelle Reports gehen vor Verschiebungen: erst klassifizieren, dann bewegen.
- Der Knowledge-Graph ist bevorzugte Querpruefung fuer Scope-, Consumer-, Surface- und Dependency-Fragen.
- Evidence wird komprimiert, aber nicht entkernt: geaenderter Pfad, Gate und Ergebnis muessen nachvollziehbar bleiben.
- Code-Refactoring wird als eigener, kleiner Delivery-Slice behandelt.
- Der Master bleibt Index; Details bleiben in kanonischen Detaildateien.

## Beschlossene Leitentscheidungen

- V116.1 und V116.2 duerfen parallel zu V115 laufen, weil sie nur Baseline, Dry-Run und lokalen Artefakt-Cleanup betreffen. V116.3 und alle folgenden Phasen warten auf V115.99, damit Governance-, Planstruktur- und Agenten-Kontext-Aenderungen nicht mit offenem V115-Abschluss kollidieren.
- V116 wird nach V117 geplant, damit der Repo-Kontext-Cleanup bereits unter dem allgemeinen AI Decision Framework laeuft.
- 116.8 bleibt in V116 nur als optionaler Ausblick und Exit-Kriterium. Der erste echte Code-Entflechtungs-Slice wird als eigener Folgeblock V118 geplant. V116 veraendert keine produktive Spiel-, Physik-, Bot-, Recording- oder UI-Logik.
- Kontextregeln gelten fuer Codex, Gemini und Claude. `AGENTS.md` bleibt oberste Repo-Wahrheit; `.agents/rules/` und `.agents/workflows/` sind operative Regeln; `.gemini/README.md` und `CLAUDE.md` sind Tool-Adapter, keine konkurrierenden Projektwahrheiten.
- `docs/CURRENT_CONTEXT.md` darf als optionaler, maximal einseitiger Lagezettel eingefuehrt werden. Die Datei ersetzt keinen Masterplan, enthaelt keine eigenen Phasen oder DoD und dupliziert keine Projektsteuerung. Sie wird manuell gepflegt; Skripte pruefen hoechstens Laenge und verbotene Planlogik.
- Der graph-gestuetzte Plan-Kontext-Report startet als Report-/Check-Werkzeug. Er darf Archivkandidaten vorschlagen, aber keine Plaene automatisch verschieben. Auto-Move wird erst spaeter entschieden, wenn der Report mehrfach plausibel war und ein explizites Apply-Flag/User-Freigabe existiert.
- Alte Plaene sollen aus dem Standard-Kontext heraus, aber nicht nach Alter archiviert werden. Archivierung erfolgt nur nach Klassifikation: `master-referenziert`, `dependency-source`, `closure-evidence`, `superseded`, `archive-candidate`. Unklare Plaene bleiben geschuetzt.
- Planarchivierung nutzt Unterordner, z. B. `docs/plaene/alt/context-cleanup-2026-05/`, damit V116-Verschiebungen spaeter nachvollziehbar bleiben.
- Grosse lokale Artefakte werden intern archiviert, wenn sie eindeutig generiert oder veraltet sind. `videos/` bleibt ausdruecklich geschuetzt, weil der Ordner zum Cinematic-Camera-System gehoert; Video-Retention oder Auslagerung braucht einen eigenen Cinematic-/Recording-Scope.
- `check:agent-context` startet als eigenes, nicht pauschal blockierendes Gate. Eine spaetere Integration in `docs:check` oder `gates:pre-commit` ist erst nach stabilen, rauscharmen Laeufen sinnvoll.
- Ein Rebuild/Reborn ist kein Default-Pfad. Er ist nur als separater Spike mit eigenem Plan, Zeitlimit, Paritaetsmatrix und User-Freigabe erlaubt. Das Hauptrepo bleibt Source of Truth.

## AI-Ausfuehrungsmatrix

Diese Matrix ist bindend fuer Agenten, die V116 oder daraus abgeleitete Cleanup-Plaene ausfuehren. Bei `[REVIEW]` oder `[USER-GATE]` muss der Agent vor Datei-Aenderungen, Apply-Modi, Verschiebungen, Governance-Edits, Code-Refactors oder Rebuild-Spikes stoppen und den User explizit fragen.

| Phase | Modus | Erlaubt ohne Rueckfrage | Stop-/Rueckfragepflicht |
| --- | --- | --- | --- |
| 116.1 Baseline | `[AUTO]` | Read-only Status, `plan:check`, Graph-Abfragen, Cleanup-Dry-Run, Reports | Sobald eine Datei geaendert, geloescht, verschoben oder erzeugt werden soll |
| 116.2 Workspace-Rauschen | `[AUTO]` fuer Dry-Run, `[USER-GATE]` fuer Apply | Dry-Run, Kandidatenreport, Schutzklassen pruefen | Jeder Apply-/Delete-/Archive-Modus; `videos/` immer protected |
| 116.3 KI-Kontext-Policy | `[REVIEW]` | Abgleich, Vorschlaege, Diff-Plan | Aenderungen an `AGENTS.md`, `CLAUDE.md`, `.gemini/`, `docs/CURRENT_CONTEXT.md` oder Ignore-/Kontextregeln |
| 116.4 Plan-Kontext | `[REVIEW]` | `plan-context-report`, Graph-/Master-Abgleich, Archivvorschlaege | Jede Planverschiebung, Master-/Aktivplan-Aenderung oder Auto-Move-Logik |
| 116.5 Governance/Workflow | `[USER-GATE]` | Analyse und konkrete Patch-Vorschlaege | Jede Aenderung an `.agents/rules/`, `.agents/workflows/`, Governance-Skripten oder Gates |
| 116.6 Gate-Matrix | `[AUTO/REVIEW]` | Gates inventarisieren, rot/gruen Status berichten, Risiken zuordnen | Breite Fixes, neue Pflicht-Gates oder Volltest-Policy-Aenderungen |
| 116.7 Refactor-Kandidaten | `[AUTO/REVIEW]` | Messen, listen, Graph-Surfaces/Consumer ausgeben, `Do not touch yet`-Tabelle | Produktcode-Aenderungen oder Refactor-Start |
| 116.8 Code-Entflechtung | `[USER-GATE]` | Nur Folgeblock-Vorschlag | Jeder Code-Refactor |
| 116.9 Rebuild-Spike | `[USER-GATE]` | Nur Spike-Plan vorschlagen | Neuer Reborn-/Rebuild-Ordner, Code-Port oder Hauptrepo-Ersatz |
| 116.99 Abschluss | `[USER-GATE]` | Gate-Plan und Abschlussvorschlag | Closure-Status, Master-Intake, `*.99`-Markierung oder Abschluss-Commit ohne User-Freigabe |

Legende:

- `[AUTO]`: Read-only oder explizit konservative Report-Schritte duerfen ohne Rueckfrage laufen.
- `[REVIEW]`: Agenten duerfen analysieren und Vorschlaege machen, aber keine betroffenen Dateien aendern.
- `[USER-GATE]`: Agenten muessen vor Umsetzung explizit nachfragen.

## Betroffene Quellen

### Primaere Einstiegsschicht

- `AGENTS.md`
- `.agents/rules/*.md`
- `.agents/workflows/*.md`
- `docs/Umsetzungsplan.md`
- relevante `docs/plaene/aktiv/VXX.md`
- `docs/prozess/Open_Findings.md`
- `docs/bot-training/Bot_Trainingsplan.md` nur fuer Bot-Training-Scope

### Standard-Read-Budget

Ein normaler Agenten-Start darf ohne expliziten Anlass nur diese Quellen laden:

- `AGENTS.md`
- `docs/Umsetzungsplan.md`
- genau eine relevante aktive `docs/plaene/aktiv/VXX.md`
- `.agents/rules/` und `.agents/workflows/` nur passend zum Task
- `docs/prozess/Open_Findings.md` nur bei Finding-, Audit- oder Closure-Bezug
- `docs/bot-training/Bot_Trainingsplan.md` nur bei Bot-Training-Scope

Optional kann `docs/CURRENT_CONTEXT.md` als maximal einseitiger Lagezettel entstehen. Diese Datei darf den Master nicht ersetzen; sie zeigt nur aktuellen Fokus, aktive Bloecke, Nicht-Lesezonen, bekannte Blocker und letzten Cleanup-Stand.

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
- [ ] DoD.5 Ein graph-gestuetzter Plan-Kontext-Report existiert oder ist begruendet verworfen; Planverschiebungen erfolgen nicht ohne Report und Graph-/Master-Abgleich.
- [ ] DoD.6 `docs/plaene/neu/` enthaelt nur echte Intake-Drafts oder ist entsprechend dokumentiert; bereits uebernommene Drafts sind abgeloest oder archiviert.
- [ ] DoD.7 Agenten-Kontext-Gate prueft Tool-Ignore-/Leseweg-Regeln fuer lokale Artefakte, Archive und Tool-spezifische Adapter.
- [ ] DoD.8 Agenten-Regeln wurden nur gestrafft, nicht neu erfunden; bestehende Dead-Code-, Scope-, Lock- und Commit-Sicherungen bleiben erhalten.
- [ ] DoD.9 Refactor-Kandidaten sind inventarisiert, priorisiert und mit Test-/Gate-Signal versehen; noch kein breiter Code-Umbau im Cleanup-Scope.
- [ ] DoD.10 Rebuild-/Reborn-Spikes sind ausdruecklich als Nicht-Default abgegrenzt und duerfen den Hauptrepo-Pfad nicht ohne Paritaetsgate ersetzen.
- [ ] DoD.11 `videos/` bleibt als Cinematic-Camera-System-Pfad geschuetzt; lokale Artefakt-Archivierung trifft nur eindeutig generierte/veraltete Nicht-Video-Artefakte.
- [ ] DoD.12 Abschluss-Gates fuer Docs-/Governance-Scope sind gruen oder blockerfest dokumentiert: `npm run plan:check`, `npm run check:gemini`, `npm run gates:pre-commit`.
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
- [ ] 116.2.3 Apply nur fuer konservative Kandidaten: Root-Logs, alte Dev-Logs, nicht aktive `test-results` und eindeutig generierte tmp-Diagnoseartefakte. `videos/` wird nicht archiviert oder geloescht, weil der Ordner zum Cinematic-Camera-System gehoert.
- [ ] 116.2.4 Nach Apply `git status --short` pruefen: keine unerwarteten tracked Deletes; falls doch, stoppen und Bericht in `docs/Fehlerberichte/` oder Block-Evidence.
- [ ] 116.2.5 `workspace-cleanup` um eine kompakte Summary-/Explain-Sicht erweitern, falls der Dry-Run fuer Agenten zu lang ist: `safe delete`, `safe archive`, `protected tracked`, `protected unknown`, `needs user decision`.
- [ ] 116.2.6 `.gitignore` nur dann anpassen, wenn neue generierte Muster wiederholt auftauchen und nicht bereits abgedeckt sind.

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
- [ ] 116.3.3 Optional `docs/CURRENT_CONTEXT.md` als maximal einseitigen Lagezettel einfuehren: aktueller Fokus, aktive Bloecke, nicht zu lesende Zonen, bekannte Blocker, letzter Cleanup-Stand.
- [ ] 116.3.4 Falls Tool-spezifische Ignore-Dateien existieren oder sinnvoll sind, nur Kontext-Ausschluesse fuer lokale/archivierte Quellen definieren: `docs/archive/`, `docs/plaene/alt/`, `tmp/`, `logs/`, `.claude/`, `.codex_tmp/`, `videos/`, `dist/`, `test-results/`.
- [ ] 116.3.5 Sicherstellen, dass Archive nicht aus Git-Historie oder Dokumentation verschwinden; sie werden nur aus dem Standard-Kontext ausgeschlossen.
- [ ] 116.3.6 `check:gemini` erweitern oder nutzen, um versehentliche Gemini-Memory-/Log-Artefakte im Repo zu verhindern.
- [ ] 116.3.7 Neues oder erweitertes Agenten-Kontext-Gate definieren: `npm run check:agent-context` prueft Standard-Read-Budget, Ignore-/Kontext-Ausschluesse, Adapter-Prioritaeten und `CURRENT_CONTEXT.md`-Grenzen. Das Gate startet eigenstaendig und wird nicht sofort pauschal in `gates:pre-commit` erzwungen.

Gate:

- `npm run check:gemini`
- `npm run check:agent-context` wenn eingefuehrt
- `npm run plan:check`
- Bei Governance-Diff: `npm run gates:pre-commit`

### 116.4 Plan-Kontext klassifizieren und entschlacken

status: draft
goal: `docs/plaene/aktiv/`, `neu/` und `alt/` wieder semantisch eindeutig machen.
output: Weniger Plan-Rauschen fuer Agenten, ohne Dependency-Evidence zu verlieren.

- [ ] 116.4.1 Master-referenzierte aktive Plaene automatisch erfassen: alle `docs/plaene/aktiv/VXX.md`, die in `docs/Umsetzungsplan.md` verlinkt sind.
- [ ] 116.4.2 `scripts/plan-context-report.mjs` erstellen oder erweitern; der Report listet master-referenzierte aktive Plaene, nicht referenzierte aktive Plaene, bereits uebernommene Intake-Drafts, Bot-Training-Sonderfaelle und Archivkandidaten.
- [ ] 116.4.3 `plan-context-report` graph-gestuetzt machen: Eingaben sind `docs/Umsetzungsplan.md`, VXX-Frontmatter, `docs/generated/knowledge-graph.json` und bei Bedarf `scripts/query-knowledge-graph.mjs` fuer `open-deps`, `scope-collisions` und `surfaces-for-file`.
- [ ] 116.4.4 Nicht referenzierte aktive Plaene in Klassen teilen:
  - `dependency-source`: noch in Depends-On, Historie oder Closure-Abgleich relevant.
  - `closure-evidence`: abgeschlossen, aber noch als Nachweis wichtig.
  - `superseded`: durch neueren Block oder `CHANGELOG.md` abgeloest.
  - `archive-candidate`: nicht referenziert, nicht dependency-relevant, nicht aktuelle Evidence.
- [ ] 116.4.5 Nur `archive-candidate`-Dateien verschieben; alle anderen mit Retention-Grund dokumentieren. Zielpfad fuer V116-Verschiebungen ist ein nachvollziehbarer Unterordner, z. B. `docs/plaene/alt/context-cleanup-2026-05/`.
- [ ] 116.4.6 `docs/plaene/neu/` auf echte Intake-Drafts reduzieren: bereits uebernommene Drafts nach `alt/`, Bot-Training-Drafts gegen Bot-Training-Master klassifizieren.
- [ ] 116.4.7 Evidence-Kompression anwenden: Plan-Evidence nennt Pfad, Gate und Ergebnis, aber keine langen Terminal-Logs oder wiederholten Dateilisten.
- [ ] 116.4.8 `docs/plaene/aktiv/README.md` und `docs/plaene/neu/README.md` aktualisieren, damit Agenten die Klassen erkennen.
- [ ] 116.4.9 Keine Master-Intake-Aenderungen ohne User-owned Uebernahme. Der Planentwurf bleibt in `docs/plaene/neu/`, bis der User ihn in den Master aufnimmt.

Gate:

- `npm run plan:check`
- `node scripts/plan-context-report.mjs --check` wenn eingefuehrt
- `npm run graph:check` wenn `docs/generated/knowledge-graph.json` oder Graph-bezogene Reportlogik geaendert wurde
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
- [ ] 116.7.2 Fuer jeden Kandidaten Verbraucher, aktive Blocks, offene Findings und Knowledge-Graph-Surface erfassen; bevorzugt ueber `impact-for-file`, `surfaces-for-file`, `event-flow`, `critical-path-health` und `coverage-report`.
- [ ] 116.7.3 Fuer jeden Kandidaten eine `Do not touch yet`-Tabelle pflegen: Datei, Problem, Consumer, erster sicherer Slice, Testsignal, Risiko.
- [ ] 116.7.4 Kandidaten nach Risiko/Nutzen priorisieren:
  - Produktstabilitaet
  - Bot-/Headless-Performance
  - Testbarkeit
  - Coupling zu Electron/Desktop
  - Coupling zu UI
- [ ] 116.7.5 Pro Kandidat einen moeglichen ersten Extraktions-Slice definieren, z. B. reine Calculation-/Policy-/Adapter-Funktion statt UI- oder Runtime-Grossumbau.
- [ ] 116.7.6 Einen Kandidaten fuer Folgeblock vorschlagen; Umsetzung nicht in diesem Cleanup-Block erzwingen.

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

### 116.9 Rebuild-Spike-Grenze und Paritaetsgate

status: draft
goal: Clean-Slate-Ideen als Experiment erlauben, aber nicht als unkontrollierten Hauptpfad.
output: Klare Stop-Regel fuer Reborn-/Neubau-Vorschlaege.

- [ ] 116.9.1 Dokumentieren: Ein Reborn-/Neubau-Spike ist kein Ersatz fuer das Hauptrepo, solange Feature-Paritaet, Desktop-Start, Bot-/Headless-Pfad, Recording, Multiplayer und relevante Tests nicht verglichen sind.
- [ ] 116.9.2 Falls ein Spike vorgeschlagen wird, eigenen Plan unter `docs/plaene/neu/` verlangen: Ziel, maximale Laufzeit, importierte Referenzen, Nicht-Ziele, Paritaetsmatrix, Abbruchkriterien.
- [ ] 116.9.3 Automatisierungs-Skripte duerfen keinen neuen `CurviosClash_Reborn`-Pfad als Default erzeugen, solange dieser Block nicht explizit aufgenommen wurde.
- [ ] 116.9.4 Hauptrepo bleibt Source of Truth; alter Code darf als Referenz fuer Spikes gelesen werden, aber nicht durch Spike-Code ersetzt werden.

Gate:

- `npm run plan:check`
- Kein neuer Rebuild-Pfad ohne eigenen User-Intake.

### 116.99 Abschluss-Gate

status: draft
goal: Cleanup-Sanierung widerspruchsfrei abschliessen.
output: Weniger Kontext-Rauschen, klare Agenten-Einstiege und vorbereitete Refactor-Folgearbeit.

- [ ] 116.99.1 `docs/Umsetzungsplan.md`, aktive V116-Detaildatei, `docs/prozess/Open_Findings.md` und `docs/plaene/CHANGELOG.md` zeigen denselben Abschlussstand.
- [ ] 116.99.2 Keine offenen eigenen Cleanup-Aenderungen bleiben uncommitted.
- [ ] 116.99.3 Abschluss-Evidence nennt konkret: entfernte/archivierte Artefaktklassen, geschuetzte Klassen, Plan-Klassifikation, Agenten-Kontext-Regel und Refactor-Folgeempfehlung.
- [ ] 116.99.4 Abschluss-Evidence nennt auch: Standard-Read-Budget, graph-gestuetzten Plan-Kontext-Report, Agenten-Kontext-Gate, Evidence-Kompressionsregel und Rebuild-Spike-Abgrenzung.
- [ ] 116.99.5 Gates: `npm run plan:check`, `npm run check:gemini`, `npm run check:agent-context` falls eingefuehrt, `npm run gates:pre-commit`; weitere technische Gates nur fuer tatsaechlich geaenderte Codepfade.

## Risiko-Register

| Risiko | Schwere | Beschreibung | Gegenmassnahme |
| --- | --- | --- | --- |
| R1 | hoch | Zu aggressive Archivierung entfernt noch relevante Plan-Evidence. | Nie nach Datum verschieben; nur nach Master-/Dependency-/Closure-Klassifikation plus Graph-Abgleich. |
| R2 | hoch | Cleanup entfernt produktive oder lizenzrelevante Assets. | `workspace-cleanup` nutzt Dry-Run, getrackte-Datei-Schutz und No-Touch-Klassen; Assets nur nach Consumer-Pruefung; `videos/` ist als Cinematic-Camera-System-Pfad geschuetzt. |
| R3 | mittel | Agenten lesen trotz Policy alte Plaene. | Onboarding und Tool-Ignore-Regeln schaerfen; Archive nur bei explizitem Auftrag. |
| R4 | mittel | Governance-Straffung entfernt wichtige Safety-Regeln. | Dead-Code-, Git-, Lock- und Commit-Regeln unveraendert pruefen; `gates:pre-commit`. |
| R5 | mittel | Type-/Lint-Haertung eskaliert zu breitem Reparaturprojekt. | Gate-Matrix statt Pauschalauftrag; Fehlerklassen separaten Blocks zuordnen. |
| R6 | mittel | Erster Code-Refactor vermischt Feature-Arbeit und Entflechtung. | 116.8 optional und nur nach User-Bestaetigung; genau eine Verantwortlichkeit. |
| R7 | niedrig | Weniger Standardkontext macht Historie schwerer findbar. | Historie bleibt erhalten; README/Onboarding beschreibt explizite Suchpfade. |
| R8 | mittel | `CURRENT_CONTEXT.md` driftet vom Master ab. | Maximal einseitig, manuell gepflegt, nur Lagezettel; Check prueft Laenge und verbotene Planlogik. |
| R9 | mittel | Rebuild-Spike wird unbemerkt zum zweiten Hauptprojekt. | Eigener User-Intake, Paritaetsgate und Abbruchkriterien vor jedem Spike. |
| R10 | mittel | Knowledge-Graph ist stale und stuetzt falsche Plan-Klassifikation. | `graph:check`/`docs:sync` bei Graph-Diff; Report muss Master und Graph getrennt ausweisen. |

## Automatisierungsstrategie

Das Automatisierungs-Skript soll diesen Plan nicht als Abrissauftrag interpretieren, sondern als sequenzielles Sanierungsprogramm:

1. Immer Dry-Run vor Apply.
2. Immer kleinste sinnvolle Datei-/Scope-Menge.
3. Immer nach Phase committen, wenn verifiziert und keine fremden Aenderungen beruehrt werden.
4. Keine pauschalen Voll-Test-Suites ohne User-Entscheidung.
5. Keine Loeschungen in `src/`, `docs/plaene/aktiv/`, `docs/bot-training/`, `assets/`, `data/` oder `prototypes/` ohne explizite Klassifikation.
6. Keine Veraenderung an Bot-Training-Parametern, Physik-Tuning, Kollisionslogik oder Recording-Verhalten in Cleanup-Phasen.
7. Planverschiebungen erst nach graph-gestuetztem `plan-context-report`; keine Datum- oder Namensheuristik als alleinige Entscheidungsgrundlage.
8. Rebuild-/Reborn-Pfade nur als separater Spike mit User-Intake und Paritaetsgate.
9. `videos/` ist kein allgemeiner Artefakt-Muellpfad, sondern gehoert zum Cinematic-Camera-System und bleibt in V116 geschuetzt.

## Vorgeschlagene Master-Intake-Daten

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V116`
- Titel: `Repo-Kontext-Reduktion und Deep-Cleanup-Sanierung`
- Status: `planned`
- Prioritaet: `P1`
- Owner: `frei`
- Hard dependencies: `V109.99`, `V117.99`, `V115.99`
- Soft dependencies: `V107.99` fuer Knowledge-Graph-Nutzung, `V90` fuer Toolchain-Blocker-Kontext
- Current phase nach Intake: `116.1`
- Manuelle Uebernahme erforderlich: ja

## Verbleibende offene Entscheidungen fuer den User

- Soll `check:agent-context` nach stabilen Laeufen dauerhaft eigenstaendig bleiben oder spaeter in `docs:check`/`gates:pre-commit` integriert werden?
- Soll der graph-gestuetzte Plan-Kontext-Report nur berichten oder spaeter auch sichere Verschiebungen automatisieren?

## Angrenzender Folgeplan

- `docs/plaene/neu/Feature_AI_Decision_Framework.md` plant die repo-weite Verallgemeinerung der V116-AI-Ausfuehrungsmatrix zu einem Decision Framework mit Entscheidungsklassen, Evidence-/Confidence-Regeln, Blast-Radius-Check, Stop-Loss und User-Gates. Dieser Plan soll vor V116 aufgenommen werden.
- `docs/plaene/neu/Feature_Runtime_UI_Entflechtung_Slice_1.md` plant den nachgelagerten V118-Entflechtungsblock. V116 bereitet nur Kandidaten, Gates und Kontext vor; produktive Entflechtung bleibt V118.
- V116 bleibt auf Repo-Kontext-Cleanup und Planarchiv-Hygiene fokussiert; das allgemeine Autonomie-Framework soll nicht in V116 versteckt werden.
