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

## File Access

- Use `rg`/`rg --files` to locate files quickly.
- Read only targeted sections with line limits.
- Prefer focused path queries over broad recursive listings.

## Tool Usage

- Run safe commands implicitly — nicht den User um Erlaubnis fragen.
- For docs drift: prefer `npm run docs:sync` + `npm run docs:check` over manual edits.
- Prefer lightweight inspection/build commands over test suites (tests are user-owned).
- Complex logic → write as script, not in chat context.
- Filter/query large data in terminal, not in chat.
