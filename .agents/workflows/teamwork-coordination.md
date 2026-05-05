---
description: Koordinations-Workflow fuer Paararbeit ohne Merge-Konflikte
---

## Workflow fuer zwei Personen (Alice & Bob)

### Vor Blockstart

1. Alice liest `docs/Umsetzungsplan.md` + `docs/plaene/aktiv/VXX.md`.
2. Alice validiert Dependencies: `npm run phase:validate --phase=V64.8.1`.
3. Alice claimt die Phase ueber Lock-Tooling:
   ```bash
   npm run lock:claim V64 alice -- --phase=64.8.1 --target="2026-04-20"
   npm run lock:validate
   ```
4. Lock-Commits sind optional und nur noetig, wenn der Team-Flow einen expliziten Git-Sync verlangt.
5. Bob wartet, oder claimt einen anderen Block:
   ```bash
   npm run lock:claim V82 bob -- --phase=82.1 --target="2026-04-22"
   npm run lock:validate
   ```

### Waehrend Phase

- Alice arbeitet nur in `scope_files` von `64.8.1`.
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
   npm run lock:advance V64.8.1 V64.8.2 alice
   # oder
   npm run lock:release V64 alice
   npm run lock:validate
   ```

### Konflikt-Erkennung

- Bob schreibt in `scope_files` von `64.8.1` (die Alice haelt):
  ```bash
  npm run scope:validate
  # Hard fail mit Hinweis auf Block/Phase/Person
  ```

## Automatische Konflikt-Praevention

- Pre-Commit-Hook prueft Lock-Ueberschneidungen.
- Registry wird automatisch beim Validate gemergt.

## FAQ

**F: Was wenn ich meine Phase nicht zeitig fertig werde?**
A: `docs/lock-status/<person>.json` aktualisieren oder `lock:advance`/`lock:release` sauber nachziehen.

**F: Darf ich Lock-Files direkt editieren?**
A: Ja, aber danach `npm run lock:validate` ausfuehren.

**F: Wo ist der operative Lock-Wahrheitsraum?**
A: In `docs/lock-status/*.json` (plus `_locks-registry.json` als generierter Merge).
