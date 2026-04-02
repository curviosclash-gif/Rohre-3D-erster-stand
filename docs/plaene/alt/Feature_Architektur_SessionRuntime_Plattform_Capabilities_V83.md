# Feature: Architektur SessionRuntime und Plattform-Capabilities nach V74 (V83)

Stand: 2026-04-02
Status: Archivierter Intake-Entwurf
Owner: Bot-Codex
Risiko: hoch
plan_file: `docs/plaene/aktiv/V83.md`

## Ziel

Nach `V74` die Runtime-Architektur einen Schritt grundsaetzlicher verbessern:

- `SessionRuntime` als einzige Source of Truth fuer Match-, Session- und Finalize-Zustand einfuehren.
- Einen echten Application-Layer fuer Runtime-Commands, Runtime-Events und koordinierte Use-Cases schaffen.
- Desktop-, Browser- und Lobby-Faehigkeiten hinter kleine, degradierbare Plattform-Capabilities ziehen.
- `Game`, `GameRuntimeCoordinator`, `GameRuntimeFacade`, `GameRuntimePorts` und UI-Controller weiter verschlanken, statt neue Wrapper auf dieselbe breite Runtime zu stapeln.

## Ausgangslage

- `V74` entkoppelt Sammelpunkte bereits sichtbar, aber `game`, `runtimeBundle`, `runtimeFacade` und Port-Objekte teilen sich weiter Zustands- und Verantwortungsbesitz.
- `GameRuntimePorts` kapseln aktuell oft nur breite Rueckgriffe auf `game` oder `runtimeBundle`.
- Pre-Session-Multiplayer, Electron-Capabilities und Browser-Fallbacks sind noch auf mehrere Runtime- und UI-Pfade verteilt.
- Die groessten Rest-Hotspots bleiben `MediaRecorderSystem`, `ArcadeRunRuntime`, `MatchFlowUiController` und `MenuMultiplayerBridge`.

## Desktop-first Scope

- Primaeres Ziel ist die Desktop-App als Vollprodukt.
- Browser-/Online-Demo bleibt bewusst degradierbar.
- Keine Funktionsparitaet erzwingen, wenn native Desktop-Capabilities fuer Host, Discovery, Save oder Recording nicht verfuegbar sind.

## Nicht-Ziel

- Kein Big-Bang-Refactor des gesamten Spiels in einem Block.
- Kein Framework-Wechsel (kein React-, ECS- oder TypeScript-Komplettumbau).
- Keine Vollzerlegung von Recorder- oder Arcade-Fachlogik in demselben Block; diese werden nur architektonisch vorbereitet.
- Keine Verwischung der Desktop-/Demo-Grenzen zugunsten kuenstlicher Paritaet.

## Betroffene Dateien und Bereiche

- `src/core/main.js`
- `src/core/GameBootstrap.js`
- `src/core/GameRuntimeFacade.js`
- `src/core/runtime/GameRuntimeCoordinator.js`
- `src/shared/runtime/GameRuntimePorts.js`
- `src/state/MatchLifecycleSessionOrchestrator.js`
- `src/ui/MatchFlowUiController.js`
- `src/ui/PauseOverlayController.js`
- `src/core/runtime/MenuRuntimeMultiplayerService.js`
- `src/ui/menu/MenuMultiplayerBridge.js`
- `src/composition/core-ui/LanMenuMultiplayerBridge.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `docs/referenz/ai_architecture_context.md`
- neue Zielbereiche: `src/application/**`, `src/platform/**`, `src/shared/contracts/**`

## Definition of Done

- [ ] DoD.1 Ein `SessionRuntime` oder gleichwertiger Runtime-Kern ist die einzige Source of Truth fuer Match-/Session-Zustand, Finalize-Status und Runtime-Referenzen.
- [ ] DoD.2 UI, Electron und Menue-Lobby sprechen Runtime-Use-Cases ueber explizite Commands/Capabilities anstatt ueber breite `game`- oder Port-Rueckgriffe.
- [ ] DoD.3 `GameRuntimePorts` verlieren ihre Service-Locator-Rolle und werden auf schmale, fachlich benannte Ports reduziert.
- [ ] DoD.4 Desktop-, Browser- und Lobby-Faehigkeiten sind als kleine Plattform-Capabilities modelliert und sauber degradierbar.
- [ ] DoD.5 Bestehende Architektur-Guards werden nicht nur gehalten, sondern fuer den migrierten Scope auf strengere Restbudgets nachgezogen.
- [ ] DoD.6 Recorder- und Arcade-Folgeschnitte sind als eigene Folgearbeit sauber abgegrenzt.

## Dokumentationsimpact

- `docs/referenz/ai_architecture_context.md`
- Folgeabgleich fuer `V64`, `V77`, `V81`, `V82`
- bei Intake: `docs/Umsetzungsplan.md` und kanonisch `docs/plaene/aktiv/V83.md`

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V83`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V83.md`
- hard dependencies: `V74.99`
- soft dependencies: Architekturabgleich mit `V77`, `V81`, `V82`; Folgeverbrauch durch `V64`
- Hinweis: `Manuelle Uebernahme erforderlich`

## Umsetzungsplan-Intake-Vorschlag

### Vorschlag fuer `## Aktive Bloecke`

```md
| V83 | Architektur SessionRuntime und Plattform-Capabilities | planned | P1 | frei | V74.99 | 83.1 | `docs/plaene/aktiv/V83.md` |
```

### Vorschlag fuer `## Abhaengigkeiten`

```md
| V83 | V74.99 | hard | nein | SessionRuntime-, Command/Event- und Capability-Folgeschnitt setzt die Runtime-Entkopplung aus V74 als Baseline voraus |
| V83 | V77 Surface-Policy | soft | nein | Desktop-Vollversion und Browser-Demo sollen spaeter dieselben Capability-Grenzen nutzen; Policy kann parallel vorbereitet, aber vor 83.99 abgeglichen werden |
| V83 | V67/V68 Abschlussstand | soft | ja | Arcade- und Multiplayer-Lifecycle aus den Altbloecken liefern den Regression-Scope fuer Runtime-Kern, Lobby-Service und Finalize-Contracts |
```

### Vorschlag fuer `## Lock-Status`

```md
| - | V83 | - | frei | Nach `V74.99` mit `83.1` Zielbild, Command/Event-Vertrag und SessionRuntime-Schnitt starten |
```

### Empfohlene Folgeanpassungen nach Intake

Diese Punkte sind kein Pflichtteil der ersten Intake-Uebernahme, passen aber mittelfristig gut zum Master-Index:

- `V64`: zusaetzlich `V83.99` als hard dependency pruefen, sobald Host/Join auf Application-Commands und Plattform-Capabilities umgestellt werden soll.
- `V75`: zusaetzlich `V83.99` als hard dependency pruefen, falls Recorder-Start/Stop/Export auf denselben Runtime-Kern und Capability-Vertrag gehoben werden soll.
- `V81`: zusaetzlich `V83.99` als hard dependency pruefen, falls die Tuning-Console nicht mehr ueber breite Runtime-/Config-Backdoors laufen soll.
- `V76`: `V83.99` mindestens als soft dependency pruefen, wenn Hangar-/Werkstatt-Flows auf dieselben Session-/Capability-Grenzen aufsetzen sollen.
- `V82`: nur dann `V83.99` als soft dependency nachziehen, wenn XP-/Ghost-/Leaderboard-State auf denselben Runtime-Projektionsvertrag gezogen wird.

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

- [ ] 83.1 Zielbild und Vertragsgrenzen fixieren
  - [ ] 83.1.1 Zielgrenzen zwischen `Game`, `SessionRuntime`, Application-Layer, UI und Plattform-Capabilities dokumentieren und bestehende Mehrfach-Ownership explizit markieren.
  - [ ] 83.1.2 Einen kleinen Vertragskatalog fuer Runtime-Commands, Runtime-Events, Session-Snapshots und Plattform-Capabilities definieren.

- [ ] 83.2 SessionRuntime als Runtime-Kern einfuehren
  - [ ] 83.2.1 Match-/Session-Referenzen, Finalize-Status, Lifecycle-Status und Runtime-Handles aus `game`/`runtimeBundle` in einen einzigen Runtime-Kern ueberfuehren.
  - [ ] 83.2.2 `Game`, `GameBootstrap`, `GameRuntimeCoordinator` und `GameRuntimeFacade` auf Adapter-Rollen ueber dem Runtime-Kern reduzieren.

- [ ] 83.3 Application-Commands und Runtime-Events einziehen
  - [ ] 83.3.1 Kern-Use-Cases wie `startMatch`, `returnToMenu`, `applySettings`, `initializeSession`, `hostLobby`, `joinLobby` und `finalizeMatch` als explizite Commands modellieren.
  - [ ] 83.3.2 UI-Controller und Electron-Glue nur noch Intents emittieren und Runtime-Events/State-Projektionen konsumieren, nicht mehr breit auf Runtime-Objekte zugreifen.

- [ ] 83.4 Plattform-Capabilities und Lobby-Service haerten
  - [ ] 83.4.1 Desktop-/Browser-Capabilities fuer Host, Discovery, Save und Recording ueber kleine benannte Preload- und Browser-Adapter schneiden.
  - [ ] 83.4.2 Storage-Bridge, LAN-Bridge und kuenftige Online-Vorstufen hinter einem gemeinsamen Lobby-Service-Vertrag kapseln und aus UI-nahen Klassen herausziehen.

- [ ] 83.5 Legacy-Reste reduzieren und Folgearbeit schneiden
  - [ ] 83.5.1 `constructor(game)`, breite Port-Zugriffe, verbleibende Legacy-Kanten und Max-Line-Budgets fuer den migrierten Scope aktiv absenken.
  - [ ] 83.5.2 Recorder- und Arcade-Hotspots fuer anschliessende eigenstaendige Folgeblocks vorbereiten, ohne ihren fachlichen Umbau in diesen Block zu druecken.

- [ ] 83.99 Abschluss-Gate
  - [ ] 83.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics`, `npm run check:architecture:ratchet` und `npm run typecheck:architecture` sind fuer den Block gruensicher.
  - [ ] 83.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; Referenzdoku und Folgeblock-Leitplanken sind synchronisiert.

## Risiken

- R1 | hoch | Der Wechsel auf einen Runtime-Kern kann versteckte implizite Zustandsabhaengigkeiten offenlegen.
- R2 | hoch | Zu fruehe Generalisierung von Commands/Events kann neue Abstraktion ohne echten Nutzen erzeugen.
- R3 | mittel | Plattform-Capability-Schnitt kann zu breit werden, wenn Desktop-Sonderfaelle nicht konsequent getrennt werden.
- R4 | mittel | Lobby-Service-Konsolidierung kann bestehende Browser-Smokes oder LAN-Workflows kurzfristig destabilisieren.
- R5 | mittel | Folgeblocks fuer Recorder und Arcade koennen unscharf bleiben, wenn V83 die Scope-Grenzen nicht explizit festzieht.

## Empfohlene Reihenfolge nach Intake

1. Erst `83.1` und `83.2`, damit Zustandsbesitz und Zielgrenzen stabil sind.
2. Danach `83.3`, weil Commands/Events erst auf einem klaren Runtime-Kern belastbar sind.
3. Anschliessend `83.4`, damit Plattform- und Lobby-Grenzen nicht wieder direkt in UI/Core zuruecklaufen.
4. `83.5` erst nach den neuen Grenzen nachziehen, damit Budgets auf reale Architektur und nicht auf Zwischenzustaende ratcheten.
