# Aktive und referenzierte Plaene

Hier liegen die kanonischen Detaildateien der aktiven, geplanten und im Master aktuell noch referenzierten Umsetzungsplan-Bloecke. Historisch abgeschlossene Detaildateien koennen hier verbleiben, solange der Master sie als Dependency-/Abgleichsquelle verlinkt oder noch nicht archiviert hat.

Stand: 2026-05-16

- `docs/Umsetzungsplan.md` bleibt der Master-Index mit genau einer Zeile pro aktivem Block.
- Jede im Master referenzierte Block-ID hat genau eine kanonische Detaildatei unter `docs/plaene/aktiv/VXX.md`.
- `scope_files`/Ownership, DoD, Risiken, Verifikation und Phasen werden nur hier gepflegt.
- Neue oder ueberarbeitete Intake-Entwuerfe entstehen weiter unter `docs/plaene/neu/`.
- Historische oder abgeloeste Planstaende liegen unter `docs/plaene/alt/`.
- Nicht im Master verlinkte aktive Dateien duerfen nicht automatisch als Muell gelten. V116 klassifiziert sie ueber `npm run plan:context:check` in `protected-dependency-source` oder `archive-candidate`; Verschiebungen brauchen danach ein eigenes User-Gate.
