---
description: Koordinations-Workflow fuer Paararbeit ohne Merge-Konflikte
---

## Workflow fuer zwei Personen (Alice & Bob)

### Vor Blockstart

1. Alice liest Umsetzungsplan + VXX.md
2. Alice validiert dependencies: `npm run phase:validate --phase=V64.8.1`
3. Alice claimed Phase:
   ```bash
   npm run lock:claim V64 alice -- --phase=64.8.1 --target="2026-04-20"
   ```
4. Commit nur Lock-File-Aenderungen (separat):
   ```bash
   git add docs/lock-status/alice.json
   git commit -m "docs(V64): alice started 64.8.1"
   ```
5. Bob wartet, oder claimed einen ANDEREN Block:
   ```bash
   npm run lock:claim V82 bob -- --phase=82.1 --target="2026-04-22"
   ```

### Waehrend Phase

- Alice arbeitet nur in scope_files von 64.8.1
- Vor jedem Commit:
  ```bash
  npm run scope:validate
  # ✓ Alle geaenderten Dateien in scope_files? JA
  # ✓ Person hat Lock? JA
  # ✓ Vorphase abgeschlossen? JA
  ```

### Phase abgeschlossen

1. Alice merged Phase:
   ```bash
   npm run gates:pre-commit  # Alle Checks gruen?
   npm run lock:advance V64.8.1 V64.8.2 alice
   ```

### Konflikt-Erkennung

- Bob schreibt in scope_files von 64.8.1 (die Alice hat):
  ```bash
  npm run scope:validate
  # ✗ Hard Fail:
  # ERROR: src/core/runtime/MenuRuntimeMultiplayerService.js
  #   ist in scope_files von Phase 64.8.1
  #   Lock gehalten von: alice (seit 2026-04-16)
  #   Deine Phase: 82.1
  #   Aktion: Andere Datei bearbeiten ODER mit alice abstimmen
  ```

## Automatische Konflikt-Praevention

- Pre-Commit-Hook laeuft automatisch und prueft Lock-Ueberschneidungen
- Registry wird automatisch beim Validate gemergt

## FAQ

**F: Was wenn ich meine Phase nicht zeitig fertig werde?**
A: Editiere `docs/lock-status/alice.json` direkt und update `target_completion`.

**F: Darf ich Lock-Files direkt editieren?**
A: Ja, aber nach dem Edit: `npm run lock:validate` ausfuehren um Konsistenz zu pruefen.
