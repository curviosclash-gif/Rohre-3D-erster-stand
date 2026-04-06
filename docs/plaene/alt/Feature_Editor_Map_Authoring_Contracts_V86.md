# Feature: Editor- und Map-Authoring-Vertraege nach V72/V85 (V86)

Stand: 2026-04-04
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V86.md`

## Ziel

Den Editor- und Map-Authoring-Pfad wieder als eigenen Scope verankern, damit Build-Katalog, Templates, Serialisierung, Validatoren und Runtime-Preset-Verbrauch nicht weiter halb im Gameplay- und halb im Content-Block mitlaufen.

- Der 3D-Map-Editor soll dieselben authoritativen Objekt-, Spawn-, Portal- und Map-Descriptoren lesen wie Runtime und Import/Export.
- Editor-UX, Katalogdaten und Authoring-Serialisierung sollen sauber getrennt bleiben.
- Neue Map-Templates, Build-Karten und Authoring-Hinweise sollen nicht mehr als stille Sonderfaelle neben `MapPresetCatalog`, `CustomMapLoader` und `EditorMapSerializer` entstehen.

## Desktop-first Scope

- Desktop-App und lokaler Editor bleiben die volle Authoring-Oberflaeche.
- Browser-/Demo-Pfade muessen nur dort mithalten, wo Shared-Descriptoren oder Read-only-Validierung betroffen sind.
- Kein Demo-Paritaetsausbau fuer Editor- oder Tooling-Oberflaechen.

## Nicht-Ziel

- Kein allgemeiner Gameplay-Refactor fuer Pickup-, Portal- oder Gate-Regeln; das bleibt in `V72`.
- Kein allgemeiner Persistence-/Schema-Migrationsblock fuer alle Artefakte; das bleibt in `V85`.
- Kein kompletter Ersatz des Editors durch ein neues Framework oder eine zweite App.
- Kein schweres Playwright-Default-Programm ausserhalb des Abschluss-Gates.

## Betroffene Dateien und Bereiche

- `editor/map-editor-3d.html`
- `editor/js/EditorUI.js`
- `editor/js/EditorMapManager.js`
- `editor/js/EditorMapSerializer.js`
- `editor/js/EditorMeshFactory.js`
- `editor/js/ui/EditorBuildCatalog.js`
- `editor/js/ui/EditorPropertyControls.js`
- `editor/js/ui/EditorSessionControls.js`
- `editor/templates/**`
- `src/core/config/maps/**`
- `src/entities/MapSchema.js`
- `src/entities/CustomMapLoader.js`
- `docs/referenz/gameplay_powerups_portale_gates.md`

## Definition of Done

- [ ] DoD.1 Editor, Runtime und Import/Export lesen dieselben authoritativen Objekt-, Spawn-, Portal-, Gate- und Map-Descriptoren.
- [ ] DoD.2 `EditorBuildCatalog`, Template-Auswahl und Serializer bleiben sauber getrennt, greifen aber auf dieselbe Descriptor-Basis zu.
- [ ] DoD.3 Neue Maps, Templates und Build-Karten haben sichtbare Warn- oder Validierungspfade statt stiller Normalisierung.
- [ ] DoD.4 Editor-UX-Aenderungen verletzen den bestehenden `currentTool`-/`subType`-Platzierungsvertrag nicht ohne bewusst dokumentierte Migration.
- [ ] DoD.5 Pflicht-Gates, Editor-Doku und Authoring-Hinweise sind fuer Folgearbeit synchronisiert.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V86`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V86.md`
- hard dependencies: `V72.99`
- soft dependencies: `V85.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 86.1 Zielbild und Descriptor-Grenzen festziehen

- [ ] 86.1.1 Inventarisieren, welche Objekt-, Template-, Preset- und Serialisierungsquellen heute in `EditorBuildCatalog`, `EditorMapSerializer`, `MapPresetCatalog`, `MapSchema` und `CustomMapLoader` verteilt sind.
- [ ] 86.1.2 Einen klaren Vertrag festlegen, welche Felder authoritativ als Content-Descriptor gelten und welche nur UI-Metadaten des Editors sind.

### 86.2 Gemeinsamen Authoring-Katalog schneiden

- [ ] 86.2.1 `EditorBuildCatalog` auf eine zentrale Descriptor-Quelle oder klaren Adapter darueber umstellen, statt Runtime- und UI-Sonderwissen zu mischen.
- [ ] 86.2.2 Kategorien, Labels, Keywords, Default-Auswahlen und Template-Metadaten so strukturieren, dass neue Objekte additiv statt per HTML-/Serializer-Sonderfall hinzukommen.

### 86.3 Templates, Serialisierung und Validierung haerten

- [ ] 86.3.1 Template-, Snippet- und New-Map-Pfade versionierbar und sichtbar validiert an `MapSchema` und `CustomMapLoader` anbinden.
- [ ] 86.3.2 `EditorMapSerializer` und Runtime-Import so auf denselben Warn-, Reject- und Migrationspfad ziehen, dass Legacy-Maps nicht still umgeschrieben werden.

### 86.4 Editor-Bedienpfad und Warnungen angleichen

- [ ] 86.4.1 Property-, Session- und Build-Oberflaechen so schneiden, dass fehlende Spawns, Portalziele, Gates oder Item-Anker frueh sichtbar werden.
- [ ] 86.4.2 Den Build-Dock-/Katalogpfad so absichern, dass er den Platzierungsvertrag haelt und trotzdem fuer neue Templates oder Objektfamilien erweiterbar bleibt.

### 86.5 Referenz, Verifikation und Folgeverbrauch

- [ ] 86.5.1 Editor- und Gameplay-Referenzdoku fuer Build-Katalog, Templates, Pflichtobjekte und Warnpfade aktualisieren.
- [ ] 86.5.2 Einen leichten Editor-/Serializer-Scope-Check fuer Katalog, Template-Auswahl und Map-Roundtrip vorbereiten.

### 86.99 Abschluss-Gate

- [ ] 86.99.1 Editor-/Serializer-Scope-Checks sowie `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruensicher.
- [ ] 86.99.2 Build-Katalog, Templates, Serialisierung und Runtime-Import lesen dokumentiert denselben Descriptor-Vertrag.

## Risiken

- R1 | hoch | Editor-UX und Descriptor-Vertrag werden erneut vermischt, wenn UI-Metadaten nicht klar von Gameplay-/Content-Feldern getrennt werden.
- R2 | hoch | Legacy-Maps oder Template-Dateien brechen, wenn Validierung ohne sichtbaren Migrationspfad verschaerft wird.
- R3 | mittel | Zu breite UX-Ziele ziehen den Block in ein Redesign statt in einen Authoring-Vertragsblock.
- R4 | mittel | Runtime-, Import- und Editor-Kataloge driften weiter auseinander, wenn kein gemeinsamer Adapter oder Registry-Layer greift.
