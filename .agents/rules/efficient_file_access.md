---
trigger: file_access_*
description: Rule for efficient file access, context management, and token minimization
---

- Use `rg` / `rg --files` first to locate files and code regions quickly.
- Read only targeted sections with line-limited `Get-Content` whenever possible.
- Avoid loading whole files unless structure/context requires it.
- Prefer focused path queries over broad recursive listings.

## Token-Effizienz (KRITISCH!)

**Ziel: Minimaler Token-Verbrauch bei maximaler Produktivitaet.**

- **Keine wiederholten Reads:** Gleiche Datei zweimal lesen = Token verschwenden. Info aus vorherigem Read verwenden.
- **Teilweise lesen:** Nur relevante Teile von grossen Dateien lesen (z.B. Umsetzungsplan nur den relevanten Block, nicht alles).
- **Keine grossen Kontexte:** Grosse Dateien oder Ergebnisse nicht komplett in den Kontext laden.
- **Keine redundanten Tool-Calls:** Wenn ein Read/Search-Ergebnis schon im Kontext ist, nicht nochmal ausfuehren.
- **2+ unabhaengige Reads/Searches IMMER parallel ausfuehren**, niemals sequenziell.
