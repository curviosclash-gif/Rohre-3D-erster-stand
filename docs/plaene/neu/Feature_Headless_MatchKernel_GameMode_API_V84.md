# Feature: Headless MatchKernel und einheitliche GameMode-API nach V83 (V84)

Stand: 2026-04-02
Status: Entwurf
Owner: Bot-Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V84.md`

## Ziel

Nach `V83` die Match- und Simulationslogik in einen headless faehigen `MatchKernel` ueberfuehren und fuer Spielmodi eine einheitliche GameMode-API schaffen.

- Matchlogik soll ohne DOM, Electron und Renderer bootbar sein.
- `classic`, `hunt`, `arcade` und kuenftige Modi sollen denselben Vertragsrahmen nutzen.
- UI, Recording, Replay, Training und Netzwerk sollen denselben Kernel konsumieren statt eigene Sonderpfade aufzubauen.

## Desktop-first Scope

- Desktop-App bleibt primaere Produktoberflaeche.
- Headless-Kernel ist ein Architektur- und Entwicklungshebel, kein eigenes Produkt.
- Browser-Demo und Tooling profitieren indirekt ueber denselben Kern.

## Nicht-Ziel

- Kein separater Dedicated-Server-Launch als Teil dieses Blocks.
- Kein kompletter Gameplay-Umbau auf ECS oder neues Framework.
- Keine fachliche Komplettueberarbeitung aller Modi in einem Schritt.
- Kein Rewrite aller Trainings- und Replay-Tools in demselben Block.

## Betroffene Dateien und Bereiche

- `src/state/**`
- `src/entities/**`
- `src/modes/**`
- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/GameLoop.js`
- `src/core/PlayingStateSystem.js`
- `src/core/MatchSessionRuntimeBridge.js`
- `src/application/**`
- `src/shared/contracts/**`
- `docs/referenz/ai_architecture_context.md`

## Definition of Done

- [ ] DoD.1 Ein headless bootbarer `MatchKernel` oder gleichwertiger Simulationskern kapselt Tick-, Session- und Matchablauf ohne DOM-/Electron-Abhaengigkeiten.
- [ ] DoD.2 GameModes nutzen einen gemeinsamen API-Vertrag fuer Bootstrap, Regeln, Scoring, Spawn, Cleanup und Runtime-Projektionen.
- [ ] DoD.3 UI, Renderer, Replay, Recording, Training und Netzwerk konsumieren denselben Kern ueber Adapter statt ueber Modus-Sonderlogik.
- [ ] DoD.4 Clock-, Seed-, Input- und Snapshot-Injektion sind kontrolliert genug fuer reproduzierbare headless Laeufe.
- [ ] DoD.5 Architektur- und Referenzdoku beschreiben den neuen Kernel- und GameMode-Leseweg.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V84`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V84.md`
- hard dependencies: `V83.99`
- soft dependencies: `V72.99`, `V82.99`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

- [ ] 84.1 Kernel-Zielbild und Simulationsseams definieren
  - [ ] 84.1.1 Zielgrenzen zwischen `SessionRuntime`, `MatchKernel`, Renderer, UI und Plattformadaptern dokumentieren.
  - [ ] 84.1.2 Tick-, Clock-, Seed-, Input- und Snapshot-Vertraege fuer headless und interaktive Laeufe definieren.

- [ ] 84.2 Headless MatchKernel einfuehren
  - [ ] 84.2.1 Matchstart, Tick, Round-Ende, Match-Ende und Cleanup in einen headless bootbaren Kern ueberfuehren.
  - [ ] 84.2.2 Interaktive Runtime, Replay, Training und kuenftige Netzwerklayer ueber Adapter an denselben Kern anbinden.

- [ ] 84.3 GameMode-API vereinheitlichen
  - [ ] 84.3.1 Fuer `classic`, `hunt`, `arcade` und kuenftige Modi einen gemeinsamen Vertragsrahmen fuer Regeln, Spawn, Score und Cleanup definieren.
  - [ ] 84.3.2 Bestehende Modus-Sonderpfade schrittweise auf denselben API-Vertrag umstellen.

- [ ] 84.4 Projektionen und Renderadapter schneiden
  - [ ] 84.4.1 UI- und HUD-Lesewege auf stabile Runtime-Projektionen statt direkte Modus- oder Entity-Zugriffe ziehen.
  - [ ] 84.4.2 Renderer- und Effektadapter nur noch lesen, was der Kernel oder die Projektionen freigeben.

- [ ] 84.5 Reproduzierbarkeit und Folgeverbrauch absichern
  - [ ] 84.5.1 Headless-Smokes fuer Matchstart, Tick und Cleanup ueber denselben Kernel vorbereiten.
  - [ ] 84.5.2 Replay-, Training- und Netzwerknutzung als Folgeverbrauch im Architekturkontext und in Nachfolgeblocks verankern.

- [ ] 84.99 Abschluss-Gate
  - [ ] 84.99.1 Architektur-, Doku- und Governance-Gates fuer den migrierten Kernel-Scope sind gruensicher.
  - [ ] 84.99.2 Headless-Boot, GameMode-API und Runtime-Projektionsvertrag sind klar genug fuer Folgearbeit dokumentiert.

## Risiken

- R1 | hoch | Headless- und interaktive Laufpfade driften auseinander, wenn Clock-/Input-Schnittstellen unscharf bleiben.
- R2 | hoch | GameMode-Vereinheitlichung kann versteckte Hunt-/Arcade-Sonderfaelle freilegen.
- R3 | mittel | Render- und UI-Projektionen bleiben zu nah an Entities, wenn der Kernelvertrag nicht streng genug ist.
- R4 | mittel | Reproduzierbarkeit leidet, wenn Seed-, Timing- oder Snapshot-Grenzen nicht konsequent versioniert werden.
