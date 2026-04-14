---
trigger: "*"
description: Token efficiency, file access, and tool usage (consolidated)
---

## Token-Effizienz (KRITISCH!)

- **Keine wiederholten Reads** — gleiche Datei nie zweimal lesen.
- **Teilweise lesen** — nur relevante Teile grosser Dateien (z.B. Master-Index, dann nur die verlinkte VXX.md).
- **Keine grossen Kontexte** — grosse Dateien/Ergebnisse nicht komplett laden.
- **Keine redundanten Tool-Calls** — Ergebnis schon im Kontext? Nicht nochmal ausfuehren.
- **Parallele Tool-Calls** — 2+ unabhaengige Operationen IMMER parallel.
- **Antworten kurz halten** — der User sieht den Diff.
- **Kein Plan-Mode fuer kleine Tasks** — nur bei 5+ betroffenen Dateien planen.
- **Agent-Explore sparsam** — Default `quick`/`medium`. Nur `very thorough` auf User-Anfrage.

## File Access (Harness-Tools)

- Datei-Suche: `Glob` (z.B. `src/**/*.js`) statt `rg --files` oder `find`.
- Inhalts-Suche: `Grep` (ripgrep-basiert) statt `rg` im Bash.
- Lesen: `Read` mit `offset`/`limit` fuer grosse Dateien statt `cat`/`head`/`tail`.
- Bearbeiten: `Edit`/`Write` statt `sed`/`awk`.
- Nur gezielte Abschnitte grosser Dateien laden; fuer `docs/plaene/aktiv/VXX.md` nur aktuelle + naechste Subphase lesen.

## Lese-Budget fuer `VXX.md`

- Beim Start einer Block-Subphase: Frontmatter + DoD + aktuelle Phase + naechste Subphase lesen.
- Frueher abgeschlossene Phasen nur lesen, wenn die aktuelle Subphase sie explizit referenziert.
- Nicht den kompletten Blockplan vorsorglich laden; bei >200 Zeilen immer `offset`/`limit` nutzen.

## Tool Usage

- Turbo Default: sichere Read-only-Kommandos (`git log`, `git status`, `Grep`/`Glob`, `npm run docs:check`) ohne User-Nachfrage ausfuehren; Workflows koennen einzelne Schritte als `// turbo` oder `// turbo-all` markieren.
- Safe Commands implizit ausfuehren - User nicht um Erlaubnis fragen.
- Docs-Drift: `npm run docs:sync` + `npm run docs:check` statt manueller Edits.
- Lieber leichte Inspection-/Build-Kommandos als Test-Suites (Tests sind user-owned, siehe `planning_and_governance.md`).
- Komplexe Logik -> als Script schreiben, nicht im Chat.
- Grosse Daten im Terminal filtern, nicht im Chat.
