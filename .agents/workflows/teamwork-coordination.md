---
description: Koordinations-Workflow fuer Paararbeit ohne Merge-Konflikte
---

## Workflow fuer zwei Personen (Alice & Bob)

### Vor Blockstart

1. Alice liest `docs/Umsetzungsplan.md` + `docs/plaene/aktiv/VXX.md`.
2. Alice validiert Dependencies auf Phase-Ebene: `npm run phase:validate -- --phase=VXX.Y`.
3. Alice claimt die Subphase ueber Lock-Tooling:
   ```bash
   npm run lock:claim VXX alice -- --phase=XX.Y.Z --target="YYYY-MM-DD"
   npm run lock:validate
   ```
4. Lock-Commits sind optional und nur noetig, wenn der Team-Flow einen expliziten Git-Sync verlangt.
5. Bob wartet, oder claimt einen anderen Block:
   ```bash
   npm run lock:claim VYY bob -- --phase=YY.A --target="YYYY-MM-DD"
   npm run lock:validate
   ```

### Waehrend Phase

- Alice arbeitet nur in `scope_files` der geclaimten Subphase.
- Vor jedem Commit:
  ```bash
  npm run scope:validate
  # Alle geaenderten Dateien in scope_files?
  # Person hat Lock?
  # Vorphase abgeschlossen?
  ```

### Phase abgeschlossen

1. Alice merged fachliche Aenderungen:
   ```bash
   npm run plan:check
   # bei *.99 oder Docs-/Governance-/Graph-Scope: npm run gates:pre-commit
   ```
2. Alice rollt den Lock weiter oder released:
   ```bash
   npm run lock:advance <current-phase> <next-phase> alice
   # oder
   npm run lock:release VXX alice
   npm run lock:validate
   ```

### Konflikt-Erkennung

- Bob schreibt in `scope_files` derselben geclaimten Subphase (die Alice haelt):
  ```bash
  npm run scope:validate
  # Hard fail mit Hinweis auf Block/Phase/Person
  ```

## Automatische Konflikt-Praevention

- Pre-Commit-Hook prueft Lock-Ueberschneidungen.
- Registry wird automatisch beim Validate gemergt.

## FAQ

**F: Was wenn ich meine Phase nicht zeitig fertig werde?**
A: Bevorzugt `lock:advance` oder `lock:release` sauber nachziehen. Einen manuellen Edit von `docs/lock-status/<person>.json` nur verwenden, wenn das Lock-Tooling den Sonderfall nicht abbildet; danach immer `npm run lock:validate`.

**F: Darf ich Lock-Files direkt editieren?**
A: Nur als begruendeten Fallback, wenn `lock:claim`, `lock:advance` oder `lock:release` den Sonderfall nicht abbilden. Danach `npm run lock:validate` ausfuehren; Agents bevorzugen immer das Lock-Tooling.

**F: Wo ist der operative Lock-Wahrheitsraum?**
A: In `docs/lock-status/*.json` (plus `_locks-registry.json` als generierter Merge).
