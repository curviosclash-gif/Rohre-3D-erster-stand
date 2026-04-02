# Feature: Persistence-, Content-Contracts und Schema-Migrationen nach V83 (V85)

Stand: 2026-04-02
Status: Entwurf
Owner: Bot-Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V85.md`

## Ziel

Nach `V83` Persistenz- und Content-Pfade so haerten, dass kuenftige Features ueber versionierte Vertraege und kontrollierte Migrationen erweitert werden koennen.

- Persistierte Daten sollen pro Artefakt klare Schema-Versionen und Migrationspfade haben.
- Content wie Maps, Rewards, Missionen, Fahrzeuge, Modifiers und kuenftige Gameplay-Descriptoren soll ueber vertragliche Registries statt verstreute Sonderlogik laufen.
- Import/Export, Browser-/Desktop-Persistenz und kuenftige Meta-Features sollen von denselben Datenvertraegen profitieren.

## Desktop-first Scope

- Desktop-App bleibt die vollstaendige Persistenz- und Import/Export-Oberflaeche.
- Browser-Demo bleibt dort reduziert, wo Vollversions-Capabilities oder lokale Dateizugriffe fehlen.
- Vertragsanhebung soll Desktop nicht fuer Demo-Paritaet ausbremsen.

## Nicht-Ziel

- Kein Datenbank- oder Backend-Zwang als Teil dieses Blocks.
- Kein kompletter inhaltlicher Rebalance- oder Content-Rewrite.
- Kein einmaliger Massenimport aller historischen Artefakte ohne Migrationsstrategie.
- Kein stilles Weitertragen schema-loser JSON-Pfade als neue Norm.

## Betroffene Dateien und Bereiche

- `src/core/Config.js`
- `src/core/settings/**`
- `src/ui/menu/**`
- `src/ui/SettingsStore.js`
- `src/ui/Profile*`
- `src/core/replay/**`
- `src/core/recording/**`
- `src/state/arcade/**`
- `src/entities/MapSchema.js`
- `src/entities/CustomMapLoader.js`
- `src/shared/contracts/**`
- `src/shared/utils/**`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Settings, Profile, Presets, Replay, Arcade-Progress und weitere persistierte Artefakte tragen explizite Schema-Versionen.
- [ ] DoD.2 Fuer versionierte Artefakte existieren dokumentierte und technisch verankerte Migrationspfade.
- [ ] DoD.3 Content-Registries fuer Maps, Rewards, Missionen, Fahrzeuge und Modifiers laufen ueber stabile Descriptor-Vertraege.
- [ ] DoD.4 Import/Export- und Persistence-Pfade validieren Version, Capability und Fallback bewusst statt implizit.
- [ ] DoD.5 Folgefeatures koennen neue Datenfelder und Content-Descriptoren additiv einfuehren, ohne alte Staende unkontrolliert zu brechen.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V85`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V85.md`
- hard dependencies: `V83.99`
- soft dependencies: `V84.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

- [ ] 85.1 Dateninventar und Versionsmatrix erstellen
  - [ ] 85.1.1 Persistierte Artefakte, Import/Export-Pfade und schema-lose JSON-Stellen inventarisieren.
  - [ ] 85.1.2 Eine Versionsmatrix fuer Settings, Profile, Presets, Replay, Arcade-Progress und kuenftige Meta-Artefakte definieren.

- [ ] 85.2 Migrationsrahmen verankern
  - [ ] 85.2.1 Einen kleinen Migrationsrahmen fuer Load-, Upgrade-, Fallback- und Reject-Pfade definieren.
  - [ ] 85.2.2 Bestehende Persistence-Pfade schrittweise auf denselben Versions- und Migrationsrahmen ziehen.

- [ ] 85.3 Content-Contracts und Registries schneiden
  - [ ] 85.3.1 Maps, Rewards, Missionen, Fahrzeuge und Modifiers ueber stabile Descriptor- oder Registry-Vertraege modellieren.
  - [ ] 85.3.2 Verstreute Content-Sonderlogik auf dieselben Registries und Contracts zurueckfuehren.

- [ ] 85.4 Import/Export- und Capability-Grenzen haerten
  - [ ] 85.4.1 Datei-, Browser- und Desktop-Pfade ueber Capability- und Versionspruefungen absichern.
  - [ ] 85.4.2 Fehler-, Warn- und Migrationsmeldungen fuer inkompatible oder veraltete Artefakte bewusst gestalten.

- [ ] 85.5 Rollout und Sunset fuer Altformate vorbereiten
  - [ ] 85.5.1 Altformate, Shadow-Writes oder Kompatibilitaetsadapter mit Sunset-Regeln dokumentieren.
  - [ ] 85.5.2 Folgeblocks und Referenzdoku auf den neuen Daten- und Content-Leseweg ausrichten.

- [ ] 85.99 Abschluss-Gate
  - [ ] 85.99.1 Architektur-, Doku- und Governance-Gates fuer den migrierten Persistence-/Content-Scope sind gruensicher.
  - [ ] 85.99.2 Versionsmatrix, Migrationsregeln und Capability-Grenzen sind klar genug fuer additive Folgefeatures dokumentiert.

## Risiken

- R1 | hoch | Historische JSON-Staende koennen bei harter Versionsanhebung brechen, wenn Migrationspfade unvollstaendig sind.
- R2 | hoch | Content-Registries koennen zu generisch werden, wenn reale Descriptor-Faelle nicht zuerst inventarisiert werden.
- R3 | mittel | Browser-/Desktop-Capability-Grenzen werden inkonsistent, wenn Persistenzlogik nicht zentral gelesen wird.
- R4 | mittel | Import/Export-UX wird verwirrend, wenn Fehler-, Warn- und Fallback-Pfade nicht bewusst gestaltet werden.
