# Feature: Architecture Type-Safety und Contract-Hardening (V101)

Stand: 2026-04-22
Status: Entwurf
Owner: Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V101.md`

## Ziel

Die aktuell blockierenden Architektur-Qualitaetsluecken als eigener Hardening-Block schliessen:

- `npm run typecheck:architecture` wieder auf gruen bringen (Ist: 107 Fehler).
- `npm run lint:architecture` wieder auf gruen bringen (Ist: `max-lines` in zentralen Contract-Dateien).
- Contract-Normalizer und Store-/Menu-Typgrenzen so schaerfen, dass union/literal-Drift nicht erneut ungeprueft in Runtime-Pfade rutscht.
- Bestehende Architekturgrenzen (`check:architecture:*`) halten, ohne neue Legacy-Surface-Bypaesse zu erzeugen.

## Desktop-first Scope

- Primaerziel bleibt die Desktop-App, weil Runtime-/Policy-/Settings-Vertraege dort authoritativ gepflegt werden.
- Browser-/Demo-Auswirkungen bleiben auf Shared-Contracts und bestehende Resolver beschraenkt.
- Kein Browser-first-Paritaetsausbau.

## Nicht-Ziel

- Kein neues Produktfeature.
- Kein ungezielter Komplett-Refactor aller AI- oder UI-Dateien ohne direkten Typecheck-/Lint-Mehrwert.
- Kein Aufweichen der `V91`/`V92` Guard- und Legacy-Surface-Leitplanken.

## Betroffene Dateien und Bereiche

- `src/shared/contracts/PlatformCapabilityContract.js`
- `src/shared/contracts/PlatformCapabilityRegistry.js`
- `src/shared/contracts/BrowserDemoSurfacePolicyOverrideContract.js`
- `src/shared/contracts/ArtifactVersionMigrationContract.js`
- `src/core/RuntimeConfig.js`
- `src/core/AppInitializer.js`
- `src/ui/menu/MenuDefaultsEditorConfig.js`
- `src/ui/menu/MenuDraftStore.js`
- `src/ui/menu/MenuPresetStore.js`
- `src/ui/menu/MenuTelemetryStore.js`
- `src/ui/menu/MenuTextOverrideStore.js`
- `src/ui/menu/MenuCompatibilityRules.js`
- `src/state/storage/StorageMigrationRegistry.js`
- `src/state/training/TrainingDomain.js`
- `src/entities/ai/ObservationBridgePolicy.js`
- `src/entities/ai/observation/RuntimeNearObservationAdapter.js`
- `src/entities/ai/hybrid/HybridDecisionArchitecture.js`
- `tsconfig.architecture.json`
- `tests/platform-capabilities.contract.test.mjs`
- `tests/settings-studio-override.contract.test.mjs`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 `npm run typecheck:architecture` ist gruen.
- [ ] DoD.2 `npm run lint:architecture` ist gruen; Contract-Hotspots liegen wieder innerhalb der vereinbarten Dateigrenzen.
- [ ] DoD.3 Runtime-Globals (`__APP_MODE__`, `__CURVIOS_E2E__` und vergleichbare Build-Flags) sind typisiert und konsistent konsumierbar.
- [ ] DoD.4 Contract-Normalizer liefern explizite, stabile union-/literal-Vertraege statt impliziter `string`-Aufweichung.
- [ ] DoD.5 Store-/Menu-/Training-Pfade vermeiden unsichere Objektzugriffe und readonly/mutable-Mismatchs im betroffenen Scope.
- [ ] DoD.6 `npm run check:architecture:boundaries` und `npm run check:architecture:metrics` bleiben ohne neue disallowed edges gruen.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V101`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V101.md`
- hard dependencies: `V98.99`
- soft dependencies: `V96.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 101.1 Fehler-Taxonomie und Scope-Schnitt
status: open
goal: Typecheck-/Lint-Fehler in belastbare Cluster schneiden
output: Priorisierte Fehlermatrix mit Besitzpfad je Modul

- [ ] 101.1.1 `typecheck:architecture`-Fehler in Cluster schneiden (`globals`, `literal-unions`, `object-shapes`, `readonly-vs-mutable`, `api-arity`) und pro Cluster Zielmodule festlegen.
- [ ] 101.1.2 `max-lines`-Hotspots (`PlatformCapabilityRegistry`, `BrowserDemoSurfacePolicyOverrideContract`) entlang Verantwortungen in Zielmodule aufteilen.

### 101.2 Basistypen und Global-Vertrag
status: open
goal: Build-Flags und Shared-Typgrundlagen stabilisieren
output: Konsistenter Global-/Typ-Basispfad fuer Architektur-Typecheck

- [ ] 101.2.1 Gemeinsame Declarations fuer Runtime-Build-Flags ergaenzen und in betroffenen Konsumenten konsistent nutzen.
- [ ] 101.2.2 Hilfstypen fuer Contract-/Store-Objektformen zentralisieren, damit wiederholte `typeof x === 'object'`-Pfadtypen nicht zu `object`-Blindstellen degenerieren.

### 101.3 Contract- und Normalizer-Hardening
status: open
goal: union/literal-Vertraege in Shared Contracts konsolidieren
output: Type-stabile Contract-Resolver ohne String-Aufweichung

- [ ] 101.3.1 `PlatformCapabilityContract`, `PlatformCapabilityRegistry` und `BrowserDemoSurfacePolicyOverrideContract` auf explizite union-konforme Normalizer und Diagnostics-Typen heben.
- [ ] 101.3.2 `ArtifactVersionMigrationContract`, `RuntimeConfig`, `CameraPerspectiveContract` und angrenzende Contract-Pfade auf konsistente Argument-/Rueckgabeformen nachziehen.

### 101.4 Store-, Menu- und Training-Typhaertung
status: open
goal: unsichere Objektzugriffe und readonly-Drift in Runtime-nahen Stores abbauen
output: Stabilere Typgrenzen fuer Menu-/Storage-/Training-Pfade

- [ ] 101.4.1 `MenuDefaultsEditorConfig`, `MenuDraftStore`, `MenuPresetStore`, `MenuTelemetryStore`, `MenuTextOverrideStore` und `MenuCompatibilityRules` auf typsichere Snapshot-/Normalizer-Vertraege umstellen.
- [ ] 101.4.2 `StorageMigrationRegistry`, `TrainingDomain`, `ObservationBridgePolicy`, `RuntimeNearObservationAdapter`, `HybridDecisionArchitecture` auf konsistente Input-/State-Typen nachziehen.

### 101.5 Contract-Hotspot-Dekomposition und Ratchet-Sicherung
status: open
goal: zentrale Contract-Dateien wieder in wartbare Verantwortungen schneiden
output: kleinere Module mit stabilem Exportvertrag

- [ ] 101.5.1 `PlatformCapabilityRegistry` und `BrowserDemoSurfacePolicyOverrideContract` in klar getrennte Teilmodule schneiden (Normalizer, Diagnostics, Merge, Runtime-Bridge).
- [ ] 101.5.2 Oeffentliche Exporte stabil halten, Guard-/Contract-Tests spiegeln und keine neuen Legacy-Surface-Restadapter erzeugen.

### 101.99 Abschluss-Gate
status: open
goal: Type-Safety-Hardening reproduzierbar abschliessen
output: Gruene Architektur-/Lint-/Typecheck-Nachweise

- [ ] 101.99.1 `npm run typecheck:architecture`, `npm run lint:architecture`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics` sind gruen.
- [ ] 101.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.
- [ ] 101.99.3 Keine neuen disallowed Layer-Kanten oder Legacy-Surface-Budgetausweitungen im geaenderten Scope.

## Risiken

- R1 | hoch | Typkorrekturen veraendern still Laufzeitverhalten, wenn Normalizer/Narrowing ohne Contract-Regressionstests angepasst werden.
- R2 | hoch | Hotspot-Splits brechen bestehende Importpfade, falls Exportflaechen nicht kompatibel bleiben.
- R3 | mittel | Parallelarbeit in `V98` kollidiert mit Contract-Dateien; daher bewusst als nachgelagerter Intake nach `V98.99`.
- R4 | mittel | Guard-Gates bleiben gruen, aber Type-Sicherheit driftet zurueck, wenn Basistypen nicht zentralisiert werden.
