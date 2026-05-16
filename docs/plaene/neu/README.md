# Neue Plaene

Hier werden neue oder ueberarbeitete Implementierungsplaene erstellt.
Diese Plaene werden nicht automatisch in `docs/Umsetzungsplan.md` oder `docs/plaene/aktiv/` eingetragen.

Stand: 2026-05-16

- `docs/Umsetzungsplan.md` ist jetzt nur noch der Master-Index; kanonische aktive Blockdetails liegen unter `docs/plaene/aktiv/`.
- Dieser Ordner ist damit aktuell die Intake-Zone fuer kuenftige neue oder ueberarbeitete Plaene.
- Neue Plaene muessen weiterhin erst logisch geprueft und anschliessend manuell in den Master-Index sowie die passende kanonische Blockdatei uebernommen werden.
- Bereits uebernommene Drafts bleiben bis zur expliziten Archivfreigabe hier sichtbar und werden von `npm run plan:context:check` als `superseded-by-master-intake` ausgewiesen.
- Bot-Training-Drafts sind eine Sonderzone und werden nicht durch normale VXX-Archivierung entschieden; kanonische Quelle bleibt `docs/bot-training/Bot_Trainingsplan.md`.
