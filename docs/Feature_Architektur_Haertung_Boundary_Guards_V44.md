# Feature Plan: Architektur-Haertung und Boundary Guards V44

Stand: 2026-03-17

## Ziel

Die bestehende modulare Struktur (`core`, `state`, `entities`, `ui`) in eine belastbare Architektur mit echten Schichtgrenzen ueberfuehren. Dabei sollen die aktuell wichtigsten strukturellen Schulden systematisch abgebaut werden:

- global mutierbares `CONFIG`
- breite `game`-Abhaengigkeiten als impliziter Service-Locator
- UI-Module mit Domain-Mutationen statt reiner Projektion
- Session- und Runtime-Assembler mit zu vielen Verantwortungen
- fehlende automatisierte Boundary-Checks gegen erneute Drift

Der Plan setzt die erste Praeventionsstufe aus V38 fort und erweitert sie um echte Schichtentkopplung, messbare Zielmetriken und CI-Guardrails.

## Architektur-Check

- Aktuelle Staerken:
  - Keine statischen Import-Zyklen im `src/**`-Graph.
  - Funktionale Splits ueber `*Ops.js`, Controller und Runtime-Helfer sind bereits angelegt.
  - V38 hat erste Guardrails (`max-lines`, `tsc --checkJs` fuer neue Bootstrap-Helfer) etabliert.
- Aktuelle Hauptprobleme:
  - `entities -> core` und `ui -> core` sind fuer eine strikte Schichtung zu stark.
  - `CONFIG` wird nicht nur gelesen, sondern zur Laufzeit mutiert.
  - Viele Module nehmen das volle `game`-Objekt statt kleiner Ports oder Kontexte.
  - `UIManager` und verwandte UI-Pfade rendern nicht nur, sondern normalisieren/mutieren Settings.
  - `MatchSessionFactory` und `EntityRuntimeAssembler` kapseln jeweils mehrere Ebenen gleichzeitig.
- Konkrete bekannte Fundstellen aus dem Iststand:
  - `src/core/RuntimeConfig.js`
  - `src/state/MatchSessionFactory.js`
  - `src/core/GameRuntimeFacade.js`
  - `src/core/GameBootstrap.js`
  - `src/ui/UIManager.js`
  - `src/entities/runtime/EntityRuntimeAssembler.js`
  - `src/entities/EntityManager.js`

## Risiko

- Hoch
- Grund:
  - Der Scope kreuzt `src/core/**`, `src/ui/**`, `src/state/**`, `src/entities/**` und damit mehrere aktive Ownership-Bloecke.
  - Fehler in dieser Arbeit koennen latent sein: dieselben Bugs zeigen sich oft erst bei Match-Start, UI-Resync, Pause/Resume, Build oder Performance-Laeufen.
  - Ein "Big Bang"-Refactor waere zu riskant; die Arbeit muss in verifizierbare Etappen zerlegt bleiben.

## Abhaengigkeiten

- V38 ist Vorstufe, nicht Konkurrenz:
  - `38.1`, `38.2` und `38.4` gelten als bereits vorhandene Grundlage.
  - Die noch offenen Punkte `38.3` und `38.9` werden in diesem Plan nicht doppelt neu definiert, sondern in `44.4` und `44.8` integriert.
- Aktive Intake-Plaene `V40`, `V41`, `V42`, `V43` nicht parallel in denselben Kernpfaden umsetzen, solange `44.2` bis `44.7` laufen.

## Betroffene Dateien

- Neue wahrscheinliche Zielpfade:
  - `src/shared/**`
  - `src/shared/contracts/**`
  - `src/shared/runtime/**`
  - `src/ui/dom/**`
  - `scripts/architecture-report.mjs`
  - `scripts/check-architecture-boundaries.mjs`
  - `scripts/check-architecture-metrics.mjs`
- Bestehende Schwerpunktpfade:
  - `src/core/**`
  - `src/ui/**`
  - `src/state/**`
  - `src/entities/runtime/**`
  - `src/entities/EntityManager.js`
  - `src/hunt/HuntHUD.js`
  - `eslint.config.js`
  - `tsconfig.json` oder neues `tsconfig.architecture.json`
  - `package.json`
  - `tests/**`
  - `docs/**`

## Zielbild

- `core` orchestriert, aber exportiert keine Layer-Abkuerzungen mehr fuer `ui` oder `entities`.
- `state` kapselt Match-/Round-Domain, Session-Aufbau und Runtime-Bindung.
- `entities` kennt keine globale App-Fassade und keine DOM-/UI-Pfade.
- `ui` rendert ViewModels und emittiert Events; Domain-Mutationen liegen ausserhalb.
- `CONFIG` ist nur Default-Quelle; Runtime-Variabilitaet lebt in expliziten Session-/Runtime-Objekten.
- Vertrage, Event-IDs und einfache Shared-Typen liegen in einem neutralen Shared-Bereich.
- Architekturregeln sind maschinell pruefbar und schlagen bei Drift im Guard fehl.

## Messbare Zielmetriken

- `CONFIG`-Writes in `src/**`: Ziel `0`
- neue `constructor(game)` oder `this.game = game`-Eintraege ausserhalb definierter Allowlist: Ziel `0`
- direkte `document.*`-Nutzung ausserhalb `src/ui/**` und definierter Infrastruktur-Allowlist: Ziel `0` fuer neue Faelle, bestehende Faelle schrittweise abbauen
- neue `entities -> core`-Imports ausserhalb `shared/contracts` oder expliziter Infrastruktur-Allowlist: Ziel `0`
- neue `ui -> core`-Imports ausserhalb neutraler Shared-Vertraege: Ziel `0`
- Legacy-Ausnahmen in Architektur-Checks: nur mit expliziter Begruendung und geplantem Abbaupfad

## Scorecard-Freeze

- Stand `2026-03-17` via `node scripts/architecture-report.mjs`
- `CONFIG`-Writes in `src/**`: `0`
- `constructor(game)` / `this.game = game`: `17` Vorkommen in `10` Dateien, `0` disallowed
- DOM-Zugriffe ausserhalb `src/ui/**`: `41` Vorkommen in `9` Dateien, `0` disallowed
- `ui -> core`: `9` Importkanten, `0` disallowed
- `entities -> core`: `43` Importkanten, `0` disallowed
- Groesste verbleibende Hotspots nach Dateigroesse: `src/core/MediaRecorderSystem.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/core/GameRuntimeFacade.js`, `src/core/GameDebugApi.js`

## Nicht-Ziele

- Kein Framework-Wechsel auf React/Vue/etc.
- Keine komplette TypeScript-Migration des Repos.
- Kein Gameplay-Redesign oder Balance-Rework.
- Keine grossflaechige Projektstruktur-Migration nach `game/**` oder `dev/**`; das bleibt im Scope von V43.
- Kein paralleles "Beauty-Refactoring" ohne Boundary-Gewinn.

## Phasen

- [x] 44.0 Baseline-Freeze und Architektur-Scorecard
  - [x] 44.0.1 `scripts/architecture-report.mjs` eingefuehrt; die Scorecard erfasst jetzt Importkanten, `CONFIG`-Writes, `constructor(game)`-Vorkommen, Dateigroessen und DOM-Zugriffe ausserhalb `src/ui/**`
  - [x] 44.0.2 Die Metriken sind ueber Report + Guard-Skripte in den lokalen Guardrail-Output eingebunden
  - Status 2026-03-17: Baseline eingefroren; siehe `Scorecard-Freeze`

- [x] 44.1 Shared-Vertraege und neutrale Konstantschicht aufbauen
  - [x] 44.1.1 Event-Typen, IDs, Shadow-Quality-Vertraege und Shared-Runtime-Vertraege nach `src/shared/**` ueberfuehrt
  - [x] 44.1.2 Konsumenten in `ui/**`, `state/**`, `entities/**` und `core/**` auf die neutralen Shared-Pfade umgestellt
  - Status 2026-03-17: Neue neutrale Schicht ueber `src/shared/contracts/**` und `src/shared/runtime/**` aktiv

- [x] 44.2 Globales `CONFIG` entmachten
  - [x] 44.2.1 Laufzeit-Mutationen an `CONFIG` entfernt; stattdessen `ActiveRuntimeConfigStore`, explizite Runtime-Snapshots und kompatible Clone-Pfade eingefuehrt
  - [x] 44.2.2 Custom-Map-, Pause- und Runtime-Kompatibilitaetspfad so umgebaut, dass keine Runtime-Quelle mehr globale Defaults ueberschreibt
  - Status 2026-03-17: `CONFIG` dient nur noch als Default-/Read-Fassade; Runtime-Schreibzugriffe stehen bei `0`

- [x] 44.3 `game`-God-Context in kleine Ports zerlegen
  - [x] 44.3.1 Kleine Runtime-Ports fuer Settings/UI/Session/Render/Input eingefuehrt und in `GameBootstrap` zentral erstellt
  - [x] 44.3.2 `GameRuntimeFacade`, `MatchFlowUiController`, `UIManager`, `HudRuntimeSystem`, `CrosshairSystem`, `MatchSessionRuntimeBridge` und `RoundStateTickSystem` auf explizite `deps`/`ports` umgestellt
  - Status 2026-03-17: Neue Cross-Layer-Abhaengigkeiten laufen additiv ueber `runtimePorts` statt ueber unkontrollierten Vollzugriff auf `game`

- [x] 44.4 UI zu reiner Projektion und DOM-Schicht umbauen
  - [x] 44.4.1 `createGameUiRefs()` samt DOM-Registry aus `GameBootstrap` in `src/ui/dom/**` verschoben; Message-/Profil-/Menue-DOM-Helfer extrahiert
  - [x] 44.4.2 `UIManager`-/Sync-Pfade getrennt: Render-/ViewModel-Projektion mutiert keine Domain-Settings mehr
  - Status 2026-03-17: Offener V38-Punkt `38.3` ist hiermit absorbiert und funktional geschlossen

- [x] 44.5 Match-Session-Assembly aufspalten
  - [x] 44.5.1 `MatchSessionFactory` in Prewarm-/Cache-, Setup-, Map-, Runtime-Binding- und Feedback-Bausteine zerlegt
  - [x] 44.5.2 Session-Pfade auf explizite Rueckgabevertraege und testbare Funktionsgrenzen umgestellt
  - Status 2026-03-17: Session-Aufbau ist jetzt ueber `src/state/match-session/**` in benannte Verantwortungen aufgeteilt

- [x] 44.6 Entity-Runtime und Manager-Verdrahtung entkoppeln
  - [x] 44.6.1 `EntityRuntimeAssembler` in Support-, System- und Compat-Assemblies aufgeteilt
  - [x] 44.6.2 `EntityManager` arbeitet gegen explizite Runtime-Objekte und kompatible Ports statt gegen einen impliziten Feldbeutel
  - Status 2026-03-17: Entity-Runtime-Hotspots sind ueber `src/entities/runtime/**` strukturiert und einzeln testbar

- [x] 44.7 Menue-Runtime in Handler-Registry statt Zentral-Switch ueberfuehren
  - [x] 44.7.1 `GameRuntimeFacade.handleMenuControllerEvent(...)` in feature-basierte Handler-Register (`session`, `multiplayer`, `preset`, `developer`, `profile`) zerlegt
  - [x] 44.7.2 Menue-Services und Event-Vertraege so geordnet, dass neue Menue-Funktionen additiv erweitert werden koennen
  - Status 2026-03-17: Zentraler Dispatcher deutlich verkleinert; Menue-Runtime expandiert jetzt ueber Registry statt Switch-Monolith

- [x] 44.8 Boundary-Guards, Typecheck und CI-Haertung abschliessen
  - [x] 44.8.1 Architektur-Checks fuer Importgrenzen, `CONFIG`-Writes, `constructor(game)`-Neuzugaenge und DOM-Zugriffe ausserhalb der Allowlist in `scripts/check-architecture-*.mjs` eingefuehrt
  - [x] 44.8.2 `architecture:guard` um Architektur-Typecheck, Boundary-Skripte und fail-fast Guardrails erweitert
  - Status 2026-03-17: Offener V38-Punkt `38.9` ist hiermit absorbiert; Architektur-Guards laufen lokal vor Build/CI

- [x] 44.9 Abschluss-Gate
  - [x] 44.9.1 Architektur- und Funktionstore bestaetigt: `architecture:guard`, `test:fast`, `test:physics`, `test:stress`, `smoke:roundstate`, `test:gpu`, `build`
  - [x] 44.9.2 Performance- und Doku-Freeze bestaetigt: `benchmark:baseline`, `benchmark:lifecycle`, `docs:sync`, `docs:check`
  - Status 2026-03-17: Benchmark-Artefakte aktualisiert; Lifecycle-Messung bestaetigt `domToGameInstanceMs=10377`, `startMatchLatencyMs=4169`, `returnToMenuLatencyMs=98`

## Verifikation

- Nach 44.0:
  - `node scripts/architecture-report.mjs`
  - Ergebnis 2026-03-17: PASS
- Nach 44.1:
  - `npm run architecture:guard`
  - `npm run test:core`
  - Ergebnis 2026-03-17: PASS
- Nach 44.2:
  - `npm run test:fast`
  - `npm run smoke:roundstate`
  - Ergebnis 2026-03-17: PASS
- Nach 44.3 und 44.4:
  - `npm run test:core`
  - `npm run test:stress`
  - Ergebnis 2026-03-17: PASS
- Nach 44.5 und 44.6:
  - `npm run test:fast`
  - `npm run test:physics`
  - `npm run smoke:roundstate`
  - Ergebnis 2026-03-17: PASS
- Nach 44.7:
  - `npm run test:core`
  - `npm run test:stress`
  - Ergebnis 2026-03-17: PASS
- Nach 44.8 / vor 44.9:
  - `npm run architecture:guard`
  - `npm run build`
  - Ergebnis 2026-03-17: PASS
- Abschluss:
  - `npm run architecture:guard`
  - `npm run test:fast`
  - `npm run test:physics`
  - `npm run test:stress`
  - `npm run smoke:roundstate`
  - `npm run test:gpu`
  - `npm run build`
  - `npm run benchmark:baseline`
  - `npm run benchmark:lifecycle`
  - `npm run docs:sync`
  - `npm run docs:check`
  - Ergebnis 2026-03-17: PASS

## Umsetzungsreihenfolge

1. Erst messen und Vertraege neutralisieren (`44.0`, `44.1`).
2. Danach globale Runtime-Zustaende entfernen (`44.2`).
3. Anschliessend `game`-Ports und UI-Projektion trennen (`44.3`, `44.4`).
4. Erst dann Session- und Entity-Runtime spalten (`44.5`, `44.6`).
5. Menue-Dispatcher und Guardrails am Ende haerten (`44.7`, `44.8`).

Diese Reihenfolge reduziert das Risiko, gleichzeitig Struktur und Gameplay-Verhalten unkontrolliert zu veraendern.

## Abschlusskriterien

- Kein Laufzeitcode schreibt mehr in `CONFIG`.
- Neue Architekturverstosse koennen nicht still in `main` gelangen.
- Die grossen Cross-Layer-Hotspots sind in testbare, benannte Bausteine aufgeteilt.
- V38 bleibt danach nicht mehr als separater offener Architektur-Nebenpfad stehen, sondern ist durch V44 funktional absorbiert oder explizit abgeschlossen.

## Abschlussstatus

- Status 2026-03-17: Plan `44.0` bis `44.9` komplett umgesetzt und verifiziert
- V38-Restpunkte `38.3` und `38.9` sind ueber `44.4` und `44.8` absorbiert
- Offene Restpunkte aus diesem Plan: keine fachlichen Restpunkte; verbleibende Groesse-Hotspots sind als naechste Architekturziele messbar, aber nicht mehr Guard-Verstoesse

## Freshness-Hinweis

Der Plan gilt erst als geschlossen, wenn `npm run docs:sync` und `npm run docs:check` nach dem finalen Umsetzungsstand erfolgreich gelaufen sind.
