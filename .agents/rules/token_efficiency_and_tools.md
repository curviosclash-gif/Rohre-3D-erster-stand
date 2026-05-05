---
description: Token efficiency, file access, and tool usage (consolidated)
---

<!-- Frontmatter-Feld `trigger:` entfallen ab V93 93.3.3 - Rule-Aktivierung ist nicht maschinell ausgewertet. -->


## Token-Effizienz (KRITISCH!)

- Keine redundanten Reads: gleiche Datei nur erneut laden, wenn sich der Inhalt geaendert hat oder ein engerer Abschnitt fuer die Umsetzung noetig ist.
- Teilweise lesen: nur relevante Teile grosser Dateien (z. B. Master-Index, dann nur verlinkte VXX.md-Abschnitte).
- Keine grossen Kontexte: grosse Ergebnisse zusammenfassen statt vollstaendig in den Chat zu ziehen.
- Keine redundanten Tool-Calls: Ergebnis schon im Kontext? Nicht nochmal ausfuehren.
- Parallele Tool-Calls: 2+ unabhaengige Operationen parallel ausfuehren.
- Antworten kurz halten - der User sieht den Diff.
- Kein Plan-Mode fuer kleine Tasks - nur bei grossen Multi-Datei-Vorhaben.
- Agent-Explore sparsam: Default `quick`/`medium`. `very thorough` nur auf User-Anfrage.
- Graph-First fuer Planfragen: bei Abhaengigkeits-/Scope-/Surface-Fragen zuerst `docs/generated/knowledge-graph.json` oder `npm run graph:query` nutzen.

## AI-Arbeitsleitplanken

- Ein Hauptpfad gleichzeitig: keine neuen Nebenpfade ohne klaren Produkt- oder Stabilitaetshebel.
- Diff-Budget pro Slice: bevorzugt klein und fokussiert; breite Multi-File-Diffs nur mit kurzer Begruendung im Plan-/Commit-Kontext.
- Keine Generated-Artefakt-Flut ohne klaren Nutzen fuer Produkt, Safety oder Wartbarkeit.
- Meta-Produktion vermeiden: Status-/Plan-Updates nur soweit sie Lieferung, Stabilitaet oder Governance-Klarheit real verbessern.

## File Access (Harness-Tools)

- Datei-Suche: `Glob` (z. B. `src/**/*.js`) statt `rg --files` oder `find`.
- Inhalts-Suche: `Grep` (ripgrep-basiert) statt `rg` im Bash.
- Lesen: `Read` mit `offset`/`limit` fuer grosse Dateien statt `cat`/`head`/`tail`.
- Bearbeiten: `Edit`/`Write` statt `sed`/`awk`.
- Nur gezielte Abschnitte grosser Dateien laden; fuer `docs/plaene/aktiv/VXX.md` nur aktuelle + naechste Subphase lesen.
- Query-Shortcuts fuer den Graph: `node scripts/query-knowledge-graph.mjs open-deps V81 --json`, `node scripts/query-knowledge-graph.mjs scope-collisions --json`, `node scripts/query-knowledge-graph.mjs surfaces-for-file src/core/main.js --json`.

## Lese-Budget fuer `VXX.md`

- Beim Start einer Block-Subphase: Frontmatter + DoD + aktuelle Phase + naechste Subphase lesen.
- Frueher abgeschlossene Phasen nur lesen, wenn die aktuelle Subphase sie explizit referenziert.
- Nicht den kompletten Blockplan vorsorglich laden; bei >200 Zeilen immer `offset`/`limit` nutzen.

## Tool Usage

- Turbo Default: sichere Read-only-Kommandos (`git log`, `git status`, `Grep`/`Glob`, `npm run docs:check`) ohne User-Nachfrage ausfuehren.
- Safe Commands implizit ausfuehren - User nicht um Erlaubnis fragen.
- Docs-Drift: `npm run docs:sync` + `npm run docs:check` nur bei Docs-/Governance-/Graph-Scope oder explizitem Drift-Verdacht.
- Lieber leichte Inspection-/Build-Kommandos als Voll-Test-Suites (Tests sind user-owned, siehe `planning_and_governance.md`).
- Komplexe Logik als Script schreiben, nicht im Chat.
- Grosse Daten im Terminal filtern, nicht im Chat.
