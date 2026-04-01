---
trigger: shell_or_repetitive_tasks
description: Rule to maximize use of tools and CLI commands to save context tokens
---

- Prefer running lightweight terminal commands or predefined workflows for repetitive tasks (e.g., mass renaming, finding files) instead of requesting instructions via chat.
- Don't ask the user for permission to execute safe commands (like `grep`, `dir`, finding a file) - just do it implicitly.
- For documentation drift tasks, prefer `npm run docs:sync` and `npm run docs:check` over repetitive manual edits.
- Prefer lightweight inspection, build, and docs commands over automated test suites. Test execution is user-owned and only happens after explicit user request.
- If you build a complex logic that could be a standalone script (e.g., Python or Node script for converting formats), write the script to the file system instead of keeping all the logic in the chat context.
- Avoid reading large data objects (like long arrays or JSON configs) into the chat. Filter or query them directly in the terminal where possible.

## Token-Effizienz Regeln

- **Antworten kurz halten:** Keine langen Zusammenfassungen nach Aktionen. Der User sieht den Diff.
- **Kein Plan-Mode fuer kleine Tasks:** Nur bei 5+ betroffenen Dateien planen. Kleine Fixes direkt umsetzen.
- **Agent-Explore sparsam:** Default `quick` oder `medium` Tiefe. Nur `very thorough` wenn der User explizit tiefe Suche anfordert.
- **Parallele Tool-Calls erzwingen:** 2+ unabhaengige Operationen IMMER parallel, niemals sequenziell.

**Anti-Patterns:**
- NICHT gleiche Datei mehrfach lesen
- NICHT Agent fuer einfache Dateisuche (direkt `rg` oder `dir` nutzen)
- NICHT ganze Umsetzungsplan lesen wenn nur ein Block relevant ist
- NICHT lange Zusammenfassungen nach jeder Aktion
- NICHT Tool-Calls wiederholen deren Ergebnis schon im Kontext ist
