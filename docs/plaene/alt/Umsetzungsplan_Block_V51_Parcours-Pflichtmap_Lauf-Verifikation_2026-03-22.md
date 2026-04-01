# Archivierter Block V51

Archiviert aus `docs/Umsetzungsplan.md` am 2026-03-23.
Quelle-Stand des Masterplans: 2026-03-23.

---

## Block V51: Parcours-Pflichtmap mit Lauf-Verifikation

Plan-Datei: `docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V50.99, V39.9 -->

Scope:

- Neue Parcours-Pflichtmap `parcours_rift` mit geordneter Route und Finish-Gate.
- Deterministische Runtime-Verifikation (Reihenfolge, Richtung, Cooldown, Segmentzeit, Respawn-Reset).
- Objective-basiertes Match-End, HUD/Overlay-Feedback, Recorder/Telemetry und Anti-Exploit-Tests.

### Definition of Done (DoD)

- [x] DoD.1 Alle Phasen 51.1 bis 51.6 und 51.99 sind abgeschlossen und mit Evidence hinterlegt. (abgeschlossen: 2026-03-22; evidence: docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md + docs/Umsetzungsplan.md -> aktualisiert)
- [x] DoD.2 Pflicht-Tests fuer Core/Physics/Stress sowie Build sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run test:core && npm run test:physics && npm run test:stress && npm run build -> PASS)
- [x] DoD.3 Plan-/Docs-Gates (`plan:check`, `docs:sync`, `docs:check`) sind PASS. (abgeschlossen: 2026-03-22; evidence: npm run plan:check && npm run docs:sync && npm run docs:check -> PASS)
- [x] DoD.4 Conflict-Log, Lock-Status und Ownership sind fuer V51 konsistent gepflegt. (abgeschlossen: 2026-03-22; evidence: docs/Umsetzungsplan.md -> V51-Block/Conflict-Log/Ownership aktualisiert)

### 51.1 Parcours-Design und Route-Spezifikation

- [x] 51.1.1 Finale Topologie "Rift Gauntlet" mit Sektorfluss, Pflichtroute und Sichtachsen festgelegt (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js -> `parcours_rift` layout)
- [x] 51.1.2 Checkpoint/Finish-Contract (IDs, Reihenfolge, Radius, Richtung, Segmentbudget) verbindlich definiert (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + docs/Feature_Parcours_Pflichtmap_Verifikation_V51.md -> Route-Contract)

### 51.2 Schema- und Editor-Erweiterung

- [x] 51.2.1 MapSchema um `parcours` (Migration, Sanitize, Runtime-Mapping) erweitert (abgeschlossen: 2026-03-22; evidence: src/entities/mapSchema/MapSchemaMigrationOps.js + MapSchemaSanitizeOps.js + MapSchemaRuntimeOps.js -> umgesetzt)
- [x] 51.2.2 Editor-Import/Export fuer `parcours.checkpoints/rules/finish` roundtrip-faehig gemacht (abgeschlossen: 2026-03-22; evidence: editor/js/EditorMapSerializer.js + npm run test:core -> PASS (T14g))

### 51.3 Runtime-Verifikation und Fortschrittszustand

- [x] 51.3.1 `ParcoursProgressSystem` fuer Ordered-Checkpoints, Richtung, Timing, Cooldown und Reset-Regeln integriert (abgeschlossen: 2026-03-22; evidence: src/entities/systems/ParcoursProgressSystem.js + npm run test:physics -> PASS (T60a/T60b/T60c))
- [x] 51.3.2 Player-/Lifecycle-/Tick-Pipeline deterministisch auf Parcours-Progress verdrahtet (abgeschlossen: 2026-03-22; evidence: src/entities/systems/PlayerLifecycleSystem.js + src/entities/runtime/EntityTickPipeline.js -> Integration aktiv)

### 51.4 Match-Logik, HUD und Feedback

- [x] 51.4.1 Round-Outcome um Gewinnergrund `PARCOURS_COMPLETE` inkl. Completion-Metadaten erweitert (abgeschlossen: 2026-03-22; evidence: src/entities/systems/RoundOutcomeSystem.js + src/state/RoundStateOps.js -> Objective Reason integriert)
- [x] 51.4.2 HUD/Overlay/Feedback fuer `CP n/m`, Fehlerindikator und Completion-Time eingebunden (abgeschlossen: 2026-03-22; evidence: src/ui/HudRuntimeSystem.js + src/ui/MatchFlowUiController.js + npm run test:core -> PASS (T14f))

### 51.5 Content-Authoring der Map

- [x] 51.5.1 Neues Preset `parcours_rift` in den Map-Katalog aufgenommen (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + MapPresetCatalog.js + MapPresetsBase.js -> registriert)
- [x] 51.5.2 Spawn-/Item-/Lane-Setups fuer spielbare Pflichtroute austariert (abgeschlossen: 2026-03-22; evidence: src/core/config/maps/presets/parcours_maps.js + npm run test:core -> PASS (T14/T14f))

### 51.6 Test- und Anti-Exploit-Absicherung

- [x] 51.6.1 Automatisierte Happy-Path/Wrong-Order/Exploit/Respawn/Finish-Tests ergaenzt (abgeschlossen: 2026-03-22; evidence: tests/core.spec.js + tests/physics-core.spec.js + tests/stress.spec.js -> T14f/T14g/T60a-c/T81)
- [x] 51.6.2 Recorder/Telemetry um Parcours-Completion erweitert und in Dashboard-/History-Pfad gespiegelt (abgeschlossen: 2026-03-22; evidence: src/state/recorder/RoundMetricsStore.js + src/ui/menu/MenuTelemetryDashboard.js -> Completion-Felder aktiv)

### Phase 51.99: Integrations- und Abschluss-Gate

- [x] 51.99.1 `npm run test:core`, `npm run test:physics`, `npm run test:stress`, `npm run build` sind gruen (abgeschlossen: 2026-03-22; evidence: test/build Pflichtlauf -> PASS)
- [x] 51.99.2 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`, Conflict-Log/Governance abgeschlossen (abgeschlossen: 2026-03-22; evidence: docs-gates + Governance-Update -> PASS)

### Risiko-Register V51

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Falsch-positive Checkpoint-Hits durch Bewegungsrauschen | mittel | Entities | Richtungs-Crossing + Radius-Schnitt + Cooldown je CP | Pendelbewegung an Gates |
| Objective-Ende kollidiert mit bestehender K.O.-Logik | mittel | State | Objective-Precheck vor Legacy-Win-Path + Regression in Core-Tests | Unerwarteter Gewinnergrund |
| HUD/Telemetry Drift zwischen Runtime und Round-End | mittel | UI/State | Gemeinsame Outcome-Payload + Dashboard-Regressionstests | Fehlende Completion-Daten |

