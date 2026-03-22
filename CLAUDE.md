# CLAUDE.md - Projektregeln fuer Claude Code

## Git-Workflow

- **Immer direkt auf `main` arbeiten.** Keine Worktrees, keine Feature-Branches.
- Niemals `EnterWorktree` verwenden oder Agents mit `isolation: "worktree"` starten.
- Commits direkt auf `main` erstellen.

## Commit-Disziplin fuer parallele Agents (KRITISCH!)

Mehrere Agents arbeiten gleichzeitig auf `main`. Jeder Agent MUSS:

1. **Vor Arbeitsbeginn pullen** — `git pull --rebase origin main` ausfuehren, bevor Code geaendert wird. So arbeitet jeder Agent auf dem aktuellen Stand.
2. **NUR eigene Scope-Dateien aendern und committen** — ausschliesslich Dateien aus dem eigenen Block/Stream (siehe Datei-Ownership im Umsetzungsplan). Wenn jeder nur seine Dateien anfasst, gibt es keine Konflikte.
3. **Sofort committen** — nach jeder abgeschlossenen Teilaenderung, nicht Aenderungen ansammeln.
4. **Nur eigene Dateien stagen** — `git add <datei1> <datei2>`, niemals `git add .` oder `git add -A`. Aenderungen anderer Agents ignorieren.
5. **Niemals `git stash` verwenden.** Keine Ausnahmen.
6. **Fremde uncommittete Aenderungen ignorieren** — nicht stashen, nicht committen, nicht verwerfen. Sie gehoeren einem anderen Agent.

## Vor einem Merge

- Niemals alte Branches blind in main mergen.
- Vor jedem Merge pruefen: liegt der Branch hinter main? Wenn ja, NICHT mergen — der alte Code wuerde neueren Code ueberschreiben.
- Im Zweifel den User fragen.

## Plaene

- Plaene gehoeren in `docs/Umsetzungsplan.md`, nicht in `.claude/plans/`.

---

# Parallele Entwicklung via Umsetzungsplan

**Alle Aufgaben folgen `docs/Umsetzungsplan.md`** — das ist die einzige Quelle für offene Arbeit.

## Workflow: Vor Jeder Task

### 1. Umsetzungsplan Lesen

Bevor ich eine Aufgabe starte, lese ich:
- **Lock-Status**: Wer arbeitet gerade an welchem Block/Stream?
- **Offene Aufgaben**: Welche [ ] sind offen?
- **Conflict-Log**: Gibt es Cross-Block-Abhängigkeiten?
- **Abhängigkeiten**: Blockiert dieser Block auf einem anderen (DEPENDS-ON)?

### 2. Block/Stream Claimen

Wenn ich eine Aufgabe aus dem Umsetzungsplan starte:

```
1. Lock-Status-Tabelle prüfen: Ist dieser Block/Stream schon claimed?
2. Wenn nicht claimed:
   - Lock-Status updaten: Agent, Block/Stream, Start-Datum, Status=ACTIVE
   - Commit mit: chore(Umsetzungsplan): claim {BLOCK-STREAM} for implementation
   - git push
3. Wenn claimed: Warten oder alternative Aufgabe wählen
```

### 3. Nur Exklusive Pfade Ändern

Ich arbeite **NUR** in reservierten Dateien für meinen Block/Stream:

**Beispiele:**
- `V47-47.2` (Agent A) → `src/modes/`, `src/entities/systems/ProjectileSystem.js`
- `V48-48.4` (Agent B) → `src/entities/systems/`, `src/hunt/`
- `N6-N6.1` (Agent C) → `src/state/`, `src/core/SimStateSnapshot.js`

**Keine Cross-Block-Änderungen außer:**
- `docs/**` — Append-only oder Conflict-Log-Eintrag
- `tests/**` — Nur Agent-spezifische Test-Dateien
- Shared Config (`vite.config.js`, `eslint.config.js`) — Mit Conflict-Log-Konsens

## Commit-Konvention (WICHTIG!)

Jeder Commit muss Block/Stream enthalten:

```
feat(V{BLOCK}-{STREAM}): Kurzbeschreibung

- Was wurde geändert
- Welche Dateien betroffen

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Muss sein:**
- Block: V45, V46, V47, V48, N4, etc.
- Stream: 45.1, 46.2, 47.99, etc.
- Co-Author: immer setzen

**Beispiele (KORREKT):**
- `feat(V47-47.2): migrate ProjectileHitResolver to Strategy pattern`
- `fix(V48-48.4): optimize hunt targeting with adaptive scan`
- `feat(N6-N6.1): add deterministic SimStateSnapshot ring buffer`

**Beispiele (FALSCH — nicht akzeptabel):**
- `fix: update hunting logic` ← Kein Block/Stream!
- `feat: add new feature` ← Zu vage!

## Workflow: Task-Abschluss

### 1. Aufgabe Markieren

Im Umsetzungsplan:
```markdown
- [x] 47.2.2 `ProjectileHitResolver.js` — Hit-Resolution via Strategy (abgeschlossen: 2026-03-20)
```

### 2. Lock-Status Aktualisieren

Nach Task-Abschluss:
```markdown
| A | V47-47.2 | 2026-03-20 | COMPLETE | 2026-03-20 ✅ |
```

Status-Progression: `ACTIVE` → (optional: `REVIEW` während Tests) → `COMPLETE`

### 3. Conflict-Log (Falls Nötig)

Wenn ich außerhalb meiner Pfade ändern musste:

```markdown
| 2026-03-20 | Agent A | V48 | src/entities/systems/ProjectileSystem.js | Strategy-Interface-Update | Konsens mit Agent B | RESOLVED |
```

### 4. Docs Sync vor Push

```bash
npm run docs:sync
npm run docs:check
```

Vor jedem Push auf main.

## Parallele Arbeits-Regeln

### Keine Konflikte durch Strikte Isolation

- ✅ Jeder Agent hat nicht-überlappende, exklusive Dateien
- ✅ Direktes Arbeiten auf `main` (kein Worktree nötig)
- ✅ Cross-Agent-Kommunikation nur über **Interfaces** (nicht direkte Abhängigkeiten)
- ❌ Niemals Dateien außerhalb des eigenen Scopes ändern

### Lock-Regeln

Wenn ein Block/Stream claimed ist:
- Andere Agents arbeiten an **verschiedenen** Blöcken/Streams
- Keine Wartezeiten, weil Pfade nicht überlappen
- Im Konflikt-Fall: Conflict-Log eintragen + kurz koordinieren

### Abhängigkeits-Blocking

Wenn `<!-- DEPENDS-ON: V45.9 -->` im Plan:

1. Prüfe: Ist V45.9 bereits COMPLETE?
2. Wenn NEIN → Nicht starten! Warten oder andere Aufgabe wählen
3. Wenn JA → Frei zum Starten

## Git Workflow

```bash
# 1. Umsetzungsplan lesen
# 2. Lock-Status updaten (optional Commit wenn claiming)

# 3. Arbeiten (nur exklusive Pfade!)

# 4. Commit mit Block/Stream
git commit -m "feat(V47-47.2): ..."

# 5. Umsetzungsplan updaten (Aufgaben-Status, Lock-Status)
git add docs/Umsetzungsplan.md
git commit -m "chore(Umsetzungsplan): V47-47.2 tasks marked complete"

# 6. Tests vor Push
npm run test:core
npm run build

# 7. Docs sync
npm run docs:sync && npm run docs:check

# 8. Push
git push origin main
```

## Testing & Validierung

Vor jedem Push:

```bash
npm run test:core          # Unit-Tests
npm run test:physics       # Physics-Tests
npm run smoke:roundstate   # Schnelle Checks
npm run build              # Full build
```

Wenn Tests feilen:
- **Nicht ignorieren!** Aufgabe im Umsetzungsplan markieren: `[/] Task - BLOCKED by {Fehler}`
- Optional Conflict-Log updaten wenn es externe Abhängigkeit ist
- Mitteilen welcher Block/Stream blockiert ist

## Häufige Szenarien

### Szenario 1: Neue Aufgabe aus Umsetzungsplan starten

```
1. Umsetzungsplan öffnen: docs/Umsetzungsplan.md
2. Suche offene [ ] Aufgabe (z.B. "46.1.1 Utility-Deduplizierung")
3. Block/Stream: V46-46.1
4. Lock-Status prüfen: frei?
   - Wenn JA: Lock-Status updaten, claimen, arbeiten
   - Wenn NEIN: Andere Aufgabe wählen
5. Implementieren (nur in exklusiven Pfaden!)
6. Commit: feat(V46-46.1): ...
7. Aufgabe markieren: [x]
8. Lock-Status COMPLETE setzen
9. git push
```

### Szenario 2: Cross-Block-Änderung nötig

```
1. STOPP! Cross-Block nur mit Conflict-Log-Eintrag
2. Eintrag hinzufügen: Datum, Agent, Fremd-Block, Datei, Grund, Lösung
3. Konsens: Andere Agent informieren (kurz mitteilen)
4. Commit mit Conflict-Log-Referenz:
   feat(V47-47.2): update ProjectileHitResolver

   Cross-block change: see Conflict-Log 2026-03-20
5. Status: RESOLVED nach Bestätigung
```

### Szenario 3: Abhängiger Block wartet

```
Block V46 hängt auf V45.9 (DEPENDS-ON: V45.9)

1. Prüfen: Ist V45.9 COMPLETE? (Status in Lock-Tabelle)
   - NEIN → Nicht starten! Andere Aufgabe wählen
   - JA → Frei zum Starten
2. Nur mit grünem Signal starten
```

## Checkliste vor git push

- [ ] Umsetzungsplan gelesen?
- [ ] Block/Stream korrekt claiemd?
- [ ] Nur exklusive Pfade geändert?
- [ ] Commit-Message hat `feat(V{BLOCK}-{STREAM}):`?
- [ ] Aufgaben-Status im Umsetzungsplan aktualisiert?
- [ ] Lock-Status aktualisiert?
- [ ] Tests grün? (`npm run test:core`, `npm run build`)
- [ ] `npm run docs:sync && npm run docs:check` erfolgreich?
- [ ] Conflict-Log (falls nötig) aktualisiert?
