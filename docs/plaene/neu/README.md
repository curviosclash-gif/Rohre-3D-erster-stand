# Neue Plaene

Hier werden neue oder ueberarbeitete Implementierungsplaene erstellt.
Diese Plaene werden nicht automatisch in `docs/Umsetzungsplan.md` oder `docs/plaene/aktiv/` eingetragen.

Stand: 2026-05-22
 
- `docs/Umsetzungsplan.md` ist jetzt nur noch der Master-Index; kanonische aktive Blockdetails liegen unter `docs/plaene/aktiv/`.
- Dieser Ordner ist damit aktuell die Intake-Zone fuer kuenftige neue oder ueberarbeitete Plaene.
- Neue Plaene muessen weiterhin erst logisch geprueft und anschliessend manuell in den Master-Index sowie die passende kanonische Blockdatei uebernommen werden.
- Bereits uebernommene Drafts zu erledigten Master-Bloecken werden nach expliziter V116-Freigabe unter `docs/plaene/alt/superseded-intakes-2026-05/` archiviert.
- Bereits uebernommene Drafts zu noch offenen, geplanten, aktiven oder blockierten Master-Bloecken bleiben hier sichtbar und werden von `npm run plan:context:check` als `adopted-by-open-master-block` ausgewiesen.
- Archivfaehige erledigte Drafts werden von `npm run plan:context:check` als `adopted-by-done-master-block` ausgewiesen.
- Bot-Training-Drafts sind eine Sonderzone und werden nicht durch normale VXX-Archivierung entschieden; kanonische Quelle bleibt `docs/bot-training/Bot_Trainingsplan.md`.

## Empfohlene Frontmatter-Felder

Neue Drafts sollten die maschinenlesbaren Felder direkt im Frontmatter setzen,
damit Plan-Map, `plan:context:check` und spaetere User-Intake-Schritte nicht aus
Fliesstext raten muessen:

```yaml
---
planned_block_id: VXXX
plan_file: docs/plaene/aktiv/VXXX.md
target_master: docs/Umsetzungsplan.md
intake_status: draft
decision_class: D2
scope_files:
  - path/to/file.js
---
```

- `planned_block_id`: vorgeschlagene VXX-ID; `TBD` nur verwenden, wenn wirklich keine ID feststeht.
- `plan_file`: geplante kanonische aktive Blockdatei nach User-Intake.
- `target_master`: normalerweise `docs/Umsetzungsplan.md`; Bot-Training nutzt stattdessen den Bot-Training-Master.
- `intake_status`: z. B. `draft`, `needs-user-intake`, `adopted-open`, `adopted-done`.
- `decision_class`: erwartete D0-D4-Klasse des Drafts, nicht die spaetere Umsetzungsgarantie.
- `scope_files`: engste bekannten Zielpfade; breite Globs nur, wenn sie wirklich Scope sind.

Plan-Map-Lanes sind nur Navigation: `candidate`, `adopted-open`,
`adopted-done`, `bot-training` und `meta` ersetzen keine User-Entscheidung,
keinen Master-Index und keine aktive Blockdatei.
