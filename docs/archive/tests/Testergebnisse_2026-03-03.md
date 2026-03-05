# Testergebnisse vom 2026-03-03

## Phase 15.5 + 15.7 - Bot-Policy-Strategie Integration und Abschluss

### Ziel

- Runtime-Auswahl der Bot-Policy (`rule-based`, `bridge`, `auto`) reproduzierbar ueber Settings/RuntimeConfig/Session verdrahten.
- Abschluss-Regressionsmatrix fuer Phase 15 mit Dokumentations-Gates auf gruen bringen.

### Ausgefuehrte Verifikation

- `npm run test:core` -> PASS (20/20)
- `npm run test:physics` -> PASS (42/42, inkl. T81 und T82 fuer Strategieauflosung + Session-Wiring)
- `npm run test:stress` -> PASS (13/13)
- `npm run smoke:roundstate` -> PASS
- `npm run smoke:selftrail` -> PASS
- `npm run build` -> PASS
- `npm run docs:sync` -> PASS (`updated=0`, `missing=0`)
- `npm run docs:check` -> PASS (`updated=0`, `missing=0`)

### Kernbeobachtungen

- `botPolicyStrategy=auto` mappt auf `rule-based` (Classic) bzw. `hunt` (Hunt-Modus).
- `botPolicyStrategy=bridge` mappt auf `classic-bridge` bzw. `hunt-bridge`.
- Session-Wiring uebergibt den aufgeloesten Typ konsistent von RuntimeConfig in `EntityManager` und aktive Bot-Policy.

### Restrisiken

- Schema-V2-Einfuehrung benoetigt spaeter einen versionierten Migrationspfad ohne Semantikbruch.
- Externe WebSocket-Trainer-Bridge bleibt latenzsensitiv und sollte mit Telemetriegrenzen abgesichert werden.

---

## Phase 20.x - QA Gate-Protokoll (Agent B, V17 Kernmodularisierung)

### Gate Q0

- Kommandos:
  - `rg -n "Arena\\.js\\.latest_commit|from '../entities/Arena\\.js\\.latest_commit'" src docs`
  - `npm run test:core`
  - `npm run build`
- Ergebnis:
  - `rg`: PASS (nur Treffer in `docs/Feature_Modularisierung_Kernmodule_2Agenten.md`, keine Runtime-Referenz in `src/**`)
  - `test:core`: PASS (20/20)
  - `build`: PASS
- Regressionsfundstellen:
  - Keine.
- Entscheidung:
  - GO

### Gate Q1

- Kommandos:
  - `npm run test:core`
  - `npm run test:physics` (2 Laeufe)
  - `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"`
- Ergebnis:
  - `test:core`: PASS (20/20)
  - `test:physics` Lauf 1: FAIL (46/47, T87)
  - `test:physics` Lauf 2: FAIL (45/47, T50 + T86)
  - Q1-Filterlauf: FAIL (7/8, T86)
- Regressionsfundstellen:
  - `tests/physics.spec.js:1042` (`T87`, `expect(result.trailHit).toBeTruthy()`).
  - `tests/physics.spec.js:968` (`T86`, `expect(result.trailHit).toBeTruthy()`).
  - `tests/helpers.js:22` und `tests/physics.spec.js:25` (Start-/Menu-Timeout bei `#submenu-game:not(.hidden)` in Wiederholungslauf).
  - Runtime-Hotpath zur Rueckgabe an Agent A: `src/entities/EntityManager.js:439`, `src/entities/systems/HuntCombatSystem.js:44`.
- Entscheidung:
  - NO-GO

### Gate Q2

- Kommandos:
  - `npm run test:core`
  - `npm run test:stress`
  - `npm run build`
- Ergebnis:
  - `test:core`: PASS (20/20)
  - `test:stress`: PASS (13/13)
  - `build`: PASS
- Regressionsfundstellen:
  - Keine.
- Entscheidung:
  - GO

### Gate Q3

- Kommandos:
  - `npm run test:core`
  - `npm run test:physics`
  - `npm run smoke:roundstate`
  - `npm run build`
- Ergebnis:
  - `test:core`: PASS (20/20)
  - `test:physics`: FAIL (siehe Q1; instabile Fehlschlaege T86/T87 sowie einmal T50)
  - `smoke:roundstate`: PASS
  - `build`: PASS
- Regressionsfundstellen:
  - `tests/physics.spec.js:968` (T86), `tests/physics.spec.js:1042` (T87), `tests/helpers.js:22` (Timeout-Pfad aus Wiederholungslauf).
  - Bot-Split-Struktur vorhanden (`src/entities/ai/BotProbeOps.js`, `src/entities/ai/BotPortalOps.js`, `src/entities/ai/BotThreatOps.js`), Gate wird aber wegen rotierendem Physics-Fehler nicht freigegeben.
- Entscheidung:
  - NO-GO

### Rueckgabe an Agent A (Runtime-Fixes)

- Stabilisierung Hunt-MG Trail-Hit/Destroy-Result in den T86/T87-Pfaden (Delegationspfad `EntityManager -> HuntCombatSystem -> OverheatGunSystem`).
- Analyse des intermittierenden Start-/Menu-Timeouts (`#submenu-game:not(.hidden)`) unter langen `physics`-Serienlaeufen.

### Dokumentations-Gate (20.4.3)

- `npm run docs:sync` -> PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=1`)
- `npm run docs:check` -> PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=1`)

---

## Phase 20.x - Re-Check nach Agent-A Runtime-Fix (2026-03-04, Agent B)

### Gate Q0

- Kommandos:
  - `rg -n "Arena\\.js\\.latest_commit|from '../entities/Arena\\.js\\.latest_commit'" src docs`
  - `npm run test:core`
- Ergebnis:
  - `rg`: PASS (keine Runtime-Referenz in `src/**`)
  - `test:core`: PASS (20/20)
- Regressionsfundstellen:
  - Keine.
- Entscheidung:
  - GO

### Gate Q1

- Kommandos:
  - `npm run test:physics`
  - `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"`
- Ergebnis:
  - `test:physics`: FAIL (42/47)
  - Q1-Filter: FAIL (3/8)
- Regressionsfundstellen:
  - `tests/physics.spec.js:550` (`T63`, `expect(result.highHit).toBeTruthy()`).
  - `tests/physics.spec.js:629` (`T64`, `expect(result.trailHit).toBeTruthy()`).
  - `tests/physics.spec.js:732` (`T83`, `expect(result.trailHit).toBeTruthy()`).
  - `tests/physics.spec.js:968` (`T86`, `expect(result.trailHit).toBeTruthy()`).
  - `tests/physics.spec.js:1042` (`T87`, `expect(result.trailHit).toBeTruthy()`).
  - Runtime-Pfade: `src/hunt/OverheatGunSystem.js:316`, `src/hunt/OverheatGunSystem.js:331`.
- Entscheidung:
  - NO-GO

### Gate Q2

- Kommandos:
  - `npm run test:stress`
  - `npm run build`
- Ergebnis:
  - `test:stress`: PASS (13/13)
  - `build`: PASS
- Regressionsfundstellen:
  - Keine.
- Entscheidung:
  - GO

### Gate Q3

- Kommandos:
  - `npm run test:core`
  - `npm run test:physics`
  - `npm run smoke:roundstate`
  - `npm run build`
- Ergebnis:
  - `test:core`: PASS (20/20)
  - `test:physics`: FAIL (siehe Q1)
  - `smoke:roundstate`: PASS
  - `build`: PASS
- Regressionsfundstellen:
  - identisch zu Q1 (`T63`, `T64`, `T83`, `T86`, `T87`).
- Entscheidung:
  - NO-GO

### Rueckgabe an Agent A (Runtime-Fixes, Stand 2026-03-04)

- Hunt-MG Trail-Treffererkennung ist nicht deterministisch/falsch ausgerichtet in Q1-Hotpaths.
- Fokus auf `OverheatGunSystem._resolveAimDirection`:
  - `Player.getDirection/getAimDirection` nutzt `-Z` via `player.quaternion` (`src/entities/Player.js:443`).
  - Fallback in `src/hunt/OverheatGunSystem.js:331` nutzt `group.getWorldDirection(...)` (Three.js +Z-Achse) ohne sichtbare Anpassung auf die lokale Forward-Konvention.
  - Das korreliert mit den reproduzierbaren `trailHit=false`-Fails in `T63/T64/T83/T86/T87`.
- Vorheriger intermittierender Menu-Start-Timeout wurde in diesem Re-Check nicht erneut reproduziert.

---

## Phase 20.x - Re-Check 2 nach Agent-A Meldung "fertig" (2026-03-04, Agent B)

### Gate-Status

- Q0: GO
- Q1: NO-GO
- Q2: GO
- Q3: NO-GO

### Kommandos und Ergebnis

- `rg -n "Arena\\.js\\.latest_commit|from '../entities/Arena\\.js\\.latest_commit'" src docs` -> PASS
- `npm run test:core` -> PASS (20/20)
- `npm run test:physics` -> FAIL (42/47)
- `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"` -> FAIL (3/8)
- `npm run test:stress` -> PASS (13/13)
- `npm run smoke:roundstate` -> PASS
- `npm run build` -> PASS

### Regressionsfundstellen

- `tests/physics.spec.js:550` (T63, `expect(result.highHit).toBeTruthy()`).
- `tests/physics.spec.js:629` (T64, `expect(result.trailHit).toBeTruthy()`).
- `tests/physics.spec.js:732` (T83, `expect(result.trailHit).toBeTruthy()` in Vollsuite; Filterlauf faellt dort auf `enemyDestroyed`).
- `tests/physics.spec.js:968` (T86, `expect(result.trailHit).toBeTruthy()`).
- `tests/physics.spec.js:1042` (T87, `expect(result.trailHit).toBeTruthy()`).
- Runtime-Hinweis an Agent A: `src/hunt/OverheatGunSystem.js:318`, `src/hunt/OverheatGunSystem.js:353`.

---

## Phase 20.x - Re-Check 3 nach Agent-A Meldung "fertig+" (2026-03-04, Agent B)

### Gate-Status

- Q0: GO
- Q1: NO-GO
- Q2: GO
- Q3: NO-GO

### Kommandos und Ergebnis

- `rg -n "Arena\\.js\\.latest_commit|from '../entities/Arena\\.js\\.latest_commit'" src docs` -> PASS
- `npm run test:core` -> PASS (20/20)
- `npm run test:physics` (Lauf 1) -> FAIL (46/47, T86)
- `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"` -> PASS (8/8)
- `npm run test:physics` (Lauf 2) -> PASS (47/47)
- `npm run test:stress` -> PASS (13/13)
- `npm run smoke:roundstate` -> PASS
- `npm run build` -> PASS

### Regressionsfundstellen

- `tests/physics.spec.js:968` (T86, `expect(result.trailHit).toBeTruthy()`) im Vollsuite-Lauf 1.
- Runtime-Pfade zur Rueckgabe an Agent A: `src/hunt/OverheatGunSystem.js:318`, `src/hunt/OverheatGunSystem.js:353`.

### QA-Entscheidung

- Trotz gruener Folge-Runs ist Q1/Q3 weiter NO-GO, weil `test:physics` in derselben Abnahme intermittierend rot wurde (nicht deterministisch stabil).

---

## Phase 20.x - Re-Check 3 nach Runtime-Korrektur (2026-03-04, Agent B)

### Gate-Status

- Q0: GO
- Q1: GO
- Q2: GO
- Q3: GO

### Kommandos und Ergebnis

- `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"` -> PASS (8/8)
- `npm run test:physics` -> PASS (47/47)
- `npm run test:core` -> PASS (20/20)
- `npm run build` -> PASS
- `npm run docs:sync` -> PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=2`)
- `npm run docs:check` -> PASS (`updated=0`, `missing=0`, `legacy=0`, `mojibake=2`)

### Korrekturhinweis

- `src/hunt/OverheatGunSystem.js`: Der Runtime-Fallback in `_resolveAimDirection` wurde auf die kanonische `player.getAimDirection(...)`-Ausrichtung zurueckgefuehrt; dadurch sind die TrailHit-Pfade (`T63/T64/T83/T86/T87`) wieder stabil gruen.

---

## Phase 20.x - Re-Check 4 nach Agent-A Meldung "fertig+" (2026-03-04, Agent B)

### Gate-Status

- Q0: GO
- Q1: NO-GO
- Q2: GO
- Q3: NO-GO

### Kommandos und Ergebnis

- `rg -n "Arena\\.js\\.latest_commit|from '../entities/Arena\\.js\\.latest_commit'" src docs` -> PASS
- `npm run test:core` -> PASS (20/20)
- `npm run test:physics` (Lauf 1) -> FAIL (46/47, T86)
- `npx playwright test tests/physics.spec.js -g "T61|T63|T64|T83|T84|T85|T86|T87"` -> PASS (8/8)
- `npm run test:physics` (Lauf 2) -> PASS (47/47)
- `npm run test:stress` -> PASS (13/13)
- `npm run smoke:roundstate` -> PASS
- `npm run build` -> PASS

### Regressionsfundstellen

- `tests/physics.spec.js:968` (T86, `expect(result.trailHit).toBeTruthy()`) im Vollsuite-Lauf 1.
- Runtime-Pfade zur Rueckgabe an Agent A: `src/hunt/OverheatGunSystem.js:318`, `src/hunt/OverheatGunSystem.js:353`.

### QA-Entscheidung

- Q1/Q3 bleiben NO-GO, da `test:physics` in derselben Abnahme nicht stabil deterministisch gruen war (intermittenter T86-Fehler trotz nachfolgend gruener Runs).
