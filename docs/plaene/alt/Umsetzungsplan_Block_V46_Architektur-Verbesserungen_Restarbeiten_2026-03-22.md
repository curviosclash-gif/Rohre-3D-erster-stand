# Archivierter Block V46

Archiviert aus `docs/Umsetzungsplan.md` am 2026-03-23.
Quelle-Stand des Masterplans: 2026-03-23.

---

## Block V46: Architektur-Verbesserungen (Restarbeiten)

Plan-Datei: `docs/Umsetzungsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V45.9 -->

Scope:

- God Objects weiter zerlegen (Core/Menu + Hunt/AI).
- Magic Numbers und Sensing-Pfade in klare Contracts/Konfigs ueberfuehren.

### Definition of Done (DoD)

- [x] DoD.1 46.2.* und 46.3.* sind abgeschlossen und per Tests abgesichert. (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics -> PASS)
- [x] DoD.2 46.99.* ist abgeschlossen und Gate-Invariante erfuellt. (abgeschlossen: 2026-03-22; evidence: plan status audit -> docs/Umsetzungsplan.md)
- [x] DoD.3 `npm run architecture:guard`, `npm run build` und relevante Tests sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run architecture:guard && npm run build -> PASS)
- [x] DoD.4 Evidence-Format, Conflict-Log und Lock-Bereinigung sind erledigt. (abgeschlossen: 2026-03-22; evidence: npm run plan:check -> PASS)

### 46.2 Core- und Menu-Decomposition

- [x] 46.2.1 `MediaRecorderSystem` und `GameRuntimeFacade` in kleinere Module mit klaren Facades zerlegen (abgeschlossen: 2026-03-22; evidence: npm run build -> PASS (inkl. architecture:guard))
- [x] 46.2.2 `MenuMultiplayerBridge` entkoppeln und Runtime-Ports (`src/ui/menu/multiplayer/*`) per DI nutzen (abgeschlossen: 2026-03-22; evidence: npm run test:core -- --grep T41d -> commit 045de8b)

### 46.3 Hunt/AI-Cleanups und Modulgrenzen

- [x] 46.3.1 Magic Numbers in Hunt/Projectile/AI in Konfig-Objekte ueberfuehren und Sensing-Primitives abschliessen (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics -> PASS)
- [x] 46.3.2 `HuntHUD` nach `src/ui/` migriert, Lifecycle/Dispose verdrahtet (abgeschlossen: 2026-03-21; evidence: npm run test:physics:hunt -> commit f4b7f1b)

### Phase 46.99: Integrations- und Abschluss-Gate

- [x] 46.99.1 `npm run architecture:guard`, relevante Tests und Build sind gruen (nach 46.2.1 + 46.3.1) (abgeschlossen: 2026-03-22; evidence: npm run architecture:guard && npm run build -> PASS)
- [x] 46.99.2 `npm run docs:sync`, `npm run docs:check`, Conflict-Log-Abgleich und Lock-Bereinigung abgeschlossen (abgeschlossen: 2026-03-22; evidence: npm run docs:sync && npm run docs:check -> PASS)

### Risiko-Register V46

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Regression durch Decomposition | hoch | Core | Kleine PR-Schritte + zielgerichtete Regressionstests | Fehler in Runtime-Start/Tick |
| Boundary-Drift bei Refactor | mittel | Architektur | `architecture:guard` in jedem Gate | Neue verbotene Imports |
| Unvollstaendige Legacy-Entkopplung | mittel | Runtime/UI | Explizite Removal-Checkliste pro Modul | Verbleibende Legacy Hooks |

