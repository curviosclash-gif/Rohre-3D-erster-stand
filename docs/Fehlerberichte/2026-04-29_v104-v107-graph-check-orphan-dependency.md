# 2026-04-29 V104/V107 Graph-Check Orphan-Dependency Blocker

## Kontext
- Arbeitsstand: Umsetzung `V104.1` (Inventarisierung + Zielmatrix + Dead-Code-Klassifizierung) inkl. Wissensgraph-Update.
- User-Wunsch: vorhandene Zusatzänderungen aktiv mit einbeziehen und mit committen.

## Fehlerbild
- `npm run graph:check` faellt reproduzierbar mit:
  - `[DEPENDS_METADATA_ORPHAN] V107::V94`
  - `[DEPENDS_METADATA_ORPHAN] V107::V104`
  - `[DEPENDS_METADATA_ORPHAN] V107::V105`

## Reproduktion
1. `npm run graph:build`
2. `npm run graph:check`
3. Ergebnis: oben genannte Orphan-Verletzungen.

## Betroffene Dateien
- `docs/Umsetzungsplan.md` (Abhaengigkeits-Metadaten enthalten V107-Referenzen)
- `docs/plaene/neu/Feature_Kompletter_Spielwissensgraph_V107.md` (Intake-Draft, nicht kanonischer aktiver Block)
- `scripts/check-knowledge-graph.mjs` (validiert Meta-Abhaengigkeit gegen Basis-Kante)

## Bereits versuchte Schritte
- V107-Dependency-Zeilen im Master temporär wiederhergestellt und erneuter Build/Check.
- Ergebnis unveraendert, da fuer `V107` weiterhin keine kanonische Basis-Kante im erwarteten Graph-Pfad vorhanden ist.

## Status
- Blocker bleibt offen fuer strikten `graph:check`-Green-Run.
- `plan:check` und `docs:check` sind gruen.

## Naechster Schritt
- Entscheidung auf Planebene:
  - entweder V107 als kanonischen aktiven Block mit Basis-Kanten uebernehmen,
  - oder V107-Dependency-Metadaten im Master so absenken/verschieben, dass kein Canonical-Orphan entsteht.