# CLAUDE.md - Projektregeln fuer Claude Code

> Status: Legacy-Hinweisdatei fuer Claude-Workflows.
> Verbindliche Governance fuer alle Agents: `AGENTS.md` und `.agents/rules/*`.

## Git-Workflow

- **Immer direkt auf `main` arbeiten.** Keine Worktrees, keine Feature-Branches.
- Niemals `git stash` verwenden. Bei Bedarf WIP-Commits.
- Niemals alte Branches blind in main mergen - vorher pruefen ob Branch hinter main liegt.

## Token-Effizienz

- Gleiche Datei nicht mehrmals lesen - Memory oder vorherigen Read nutzen.
- `Glob`/`Grep` direkt nutzen, nicht `Agent` (Agent nur fuer komplexe Explore-Aufgaben).
- Grosse Dateien mit `limit`/`offset` teilweise lesen.
- Antworten kurz halten - keine Zusammenfassungen nach Aktionen.
- Unabhaengige Tool-Calls immer parallel ausfuehren.

## Commit-Konvention

Format: `feat(V{block}): Kurzbeschreibung`

Beispiele:
- `feat(V61): add combo multiplier to arcade scoring`
- `fix(V59): close signaling error paths fail-fast`

Co-Author immer setzen. Block-Nummer muss im Commit stehen.

## Aufgaben-Workflow

1. Offene Tasks stehen in `docs/Umsetzungsplan.md` - das ist die einzige Quelle.
2. Abhaengigkeiten beachten: blockierte Bloecke nicht starten.
3. Nach Abschluss: Task als `[x]` markieren mit Datum und Evidence.
4. Umsetzungsplan-Updates immer separat von Code-Aenderungen committen.

## Tests vor Push

```bash
npm run test:core          # Unit-Tests
npm run test:physics       # Physics-Tests
npm run build              # Full build
npm run docs:sync && npm run docs:check
```

Wenn Tests fehlschlagen: nicht ignorieren, Problem beheben oder im Plan als blockiert markieren.
