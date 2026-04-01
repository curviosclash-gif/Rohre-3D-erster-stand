# Archivierter Block V41

Archiviert aus `docs/Umsetzungsplan.md` am 2026-03-23.
Quelle-Stand des Masterplans: 2026-03-23.

---

## Block V41: Multiplayer Rest-Gate

Plan-Datei: `docs/Feature_Lokaler_Multiplayer_V41.md`

<!-- LOCK: frei -->

Scope:

- Restliche Real-World-Verifikation fuer Multiplayer-LAN/Internet.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Block-Phasen sind `[x]` inklusive 41.99.*.
- [ ] DoD.2 Relevante Tests/Smokes sind gruen (`test:core`, Multiplayer-Smokes).
- [ ] DoD.3 `npm run docs:sync` und `npm run docs:check` sind PASS.
- [ ] DoD.4 Evidence, Conflict-Log und Lock-Status sind konsistent.

### Phase 41.99: Abschluss-Gate

- [x] 41.99.1 LAN-Match auf 2+ Rechnern manuell verifizieren (stabiler Session-Lebenszyklus) (abgeschlossen: 2026-03-23; evidence: user-override -> docs/Umsetzungsplan.md)
- [x] 41.99.2 Internet-Match auf 2+ Rechnern via Signaling-Server verifizieren (abgeschlossen: 2026-03-23; evidence: user-override -> docs/Umsetzungsplan.md)
- [x] 41.99.3 Gamepad + Touch in Multiplayer validieren (abgeschlossen: 2026-03-23; evidence: user-override -> docs/Umsetzungsplan.md)
- [x] 41.99.4 Host-Performance bei 10 Spielern gegen Zielbudget pruefen (abgeschlossen: 2026-03-23; evidence: node scripts/perf-host-budget-v41.mjs -> tmp/perf-host-budget-report-v41.json)

### Risiko-Register V41

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reconnect-Drift zwischen LAN/Online | mittel | Netzwerk | End-to-End Testmatrix je Session-Typ | Disconnect/Resume Unterschiede |
| Multi-Input Regression (Gamepad/Touch) | mittel | UI | Dedizierte Input-Smokes + manuelle Matrix | UI/Input Event Konflikte |
| Performance-Einbruch bei 10 Spielern | hoch | Runtime | Profiling + CPU-Budget-Gate vor Abschluss | Host-FPS/CPU ausserhalb Ziel |

