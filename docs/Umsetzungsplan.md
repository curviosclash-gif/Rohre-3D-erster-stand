# Umsetzungsplan (Aktiver Master)

Stand: 2026-03-31 (V58-V70 archiviert; V72 und V74 aktiv; V64 bleibt offen)

Dieser Plan ist die einzige aktive Quelle fuer offene Arbeit.
Inaktive/zurueckgestellte Eintraege: `docs/prozess/Backlog.md`.
Abgeschlossene Blockarchive liegen unter `docs/plaene/alt/`; aeltere Masterplaene unter `docs/archive/plans/`.

## Externe Planquelle: Bot-Training

- Bot-Training wird ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md` geplant und verfolgt.
- In diesem Plan werden keine Bot-Training-Phasen, -Locks oder -Conflict-Log-Eintraege gepflegt.

## Status-Legende

- Offen = `[ ]`
- In Bearbeitung = `[/]`
- Abgeschlossen = `[x]`

## Governance-Regeln (verbindlich)

1. `*.99`-Gates duerfen nur auf `[x]` stehen, wenn alle vorherigen Phasen desselben Blocks auf `[x]` stehen.
2. Jeder `[x]`-Eintrag muss Evidence tragen: `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`.
3. Jeder aktive Block braucht eine `Definition of Done (DoD)` mit mindestens 4 Pruefpunkten.
4. Jeder aktive Block braucht genau einen gueltigen Lock-Header: `<!-- LOCK: frei -->` oder `<!-- LOCK: Bot-X seit YYYY-MM-DD -->`.
5. Plan-Governance ist Pflicht-Gate in den Workflows: `npm run plan:check`.

## Abhaengigkeiten (Hard/Soft)

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V72 | V69.99 | hard | ja | Fight/Hunt-Item-, Rocket- und Shield-Baseline aus V69 bleibt Ausgangspunkt fuer Pickup-/Portal-/Gate-Vertraege |
| V72 | Legacy-/Migrationspfad fuer Gate-/Portal-Validierung | hard | nein | Vor hartem Fail muessen sichtbare Warn-, Diagnose- oder Migrationspfade fuer bestehende Maps umgesetzt werden |
| V74 | V58.99 | hard | ja | Architektur-Guard- und Budget-Baseline aus V58 bleibt die verbindliche Ausgangsbasis |
| V74 | V60.3 | hard | ja | V60.3 dokumentiert das Zielbild fuer Rest-Orchestratoren und dient als Referenz fuer die Runtime-Entkopplung |
| V74 | V70.99 | soft | ja | Settings-/Preset-Pfade im Runtime-/Menue-Lifecycle muessen bei Refactors mitgeprueft werden |
| V74 | V67/V68 Abschlussstand | soft | ja | Multiplayer- und Arcade-Lifecycle aus V67/V68 liefern den Regression-Scope fuer Start-/Return-Pfade |

## Datei-Ownership (aktive Arbeit)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `src/core/config/ConfigSections.js`, `src/entities/Powerup.js`, `src/entities/player/**`, `src/entities/arena/portal/**`, `src/entities/mapSchema/**`, `src/entities/ai/BotTuningConfig.js`, `src/entities/ai/observation/ItemSlotEncoder.js`, `src/entities/ai/RuleBasedBotPolicy.js`, `src/entities/systems/lifecycle/**`, `src/hunt/**`, `src/modes/HuntModeStrategy.js`, `src/modes/ArcadeModeStrategy.js`, `src/ui/HuntHUD.js`, `src/ui/TouchInputSource.js`, `editor/js/EditorMapSerializer.js`, `editor/js/ui/EditorSessionControls.js`, `editor/js/ui/EditorPropertyControls.js`, `docs/referenz/gameplay_powerups_portale_gates.md` | V72 | offen | Pickup-/Portal-/Gate-Vertraege, Effekt-Semantik sowie Authoring-/HUD-/Bot-Angleichung |
| `src/core/main.js`, `src/core/Config.js`, `src/core/GameBootstrap.js`, `src/core/GameLoop.js`, `src/core/GameRuntimeFacade.js`, `src/core/MatchSessionRuntimeBridge.js`, `src/core/MediaRecorderSystem.js`, `src/core/RuntimeDiagnosticsSystem.js`, `src/core/RuntimeErrorOverlay.js`, `src/core/RuntimeConfig.js`, `src/core/runtime/**`, `src/ui/MatchFlowUiController.js`, `src/ui/PauseOverlayController.js`, `src/ui/menu/MenuMultiplayerBridge.js`, `src/state/MatchLifecycleSessionOrchestrator.js`, `src/state/MatchSessionFactory.js`, `src/state/RoundStateTickSystem.js`, `src/state/match-session/MatchSessionSetupOps.js`, `src/entities/EntityManager.js`, `src/entities/runtime/**`, `src/shared/runtime/GameRuntimePorts.js`, `src/shared/contracts/MatchLifecycleContract.js`, `src/shared/contracts/GameStateIds.js`, `scripts/architecture-report.mjs`, `scripts/check-architecture-boundaries.mjs`, `scripts/check-architecture-metrics.mjs`, `docs/referenz/ai_architecture_context.md` | V74 | offen | Runtime-Komposition, Lifecycle-Ports, Config-/Entity-Entkopplung und Guard-Ratchet |
| `docs/**`, `tests/**`, `scripts/validate-umsetzungsplan.mjs` | Shared | shared | Append-only oder eigener Abschnitt |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V64 | - | frei | Scope noch nicht definiert |
| - | V72 | - | frei | Claim fuer 72.1 Capability-/Portal-/Gate-Vertrag offen |
| - | V74 | - | frei | Claim fuer 74.1 Runtime-Bundle und Port-Schnitt offen |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | Keine aktiven Cross-Block-Aenderungen offen; historische Eintraege wurden mit den abgeschlossenen Blockdefinitionen archiviert. | - | - |

---

## Parallelisierungs-Empfehlung (Stand: 2026-03-31, aktualisiert)

V58-V70 sind archiviert. Aktive Planung konzentriert sich auf V72 und V74; V64 bleibt weiterhin undefiniert.

| Spur | Bloecke | Hinweis |
| --- | --- | --- |
| A | **V72** | Gameplay-Vertraege fuer Powerups, Portale und Gates; vor tiefer Bot-Semantik und vor weiteren Map-/HUD-Sonderpfaden stabilisieren |
| B | **V74** | Runtime-Komposition, Lifecycle-Port-Schnitt und Config-/Entity-Entkopplung; parallel zu V72 moeglich, aber auf Shared-Core-Pfade achten |
| C | **V64** | Desktop/Electron, komplett isoliert; Scope noch undefiniert |

Empfehlung: V72 und V74 als aktive P1-Spuren bearbeiten; V64 separat konkretisieren.

---

## Aktive Bloecke

## Priorisierte Pipeline

Hinweis: Bot-Training-Backlog wird in `docs/bot-training/Bot_Trainingsplan.md` gepflegt.

| ID | Titel | Plan-Datei | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V72 | Gameplay-Powerups, Portale und Gates - Vertragsklarheit und Sichtbarkeit | `docs/plaene/alt/Feature_Gameplay_Powerups_Portale_Gates_V72.md` | hoch | gross | P1 | Claim fuer 72.1 Capability-Matrix und Portal-/Gate-Vertrag offen | Geplant |
| V74 | Architektur-Runtime-Entkopplung | `docs/plaene/alt/Feature_Architektur_Runtime_Entkopplung_V74.md` | sehr hoch | gross | P1 | Claim fuer 74.1 Runtime-Bundle und Entkopplungsport offen | Geplant |

Weitere inaktive Eintraege (V39, V40, V42, V43, V2, V26.3c, V29b, N2, N8, T1) liegen in `docs/prozess/Backlog.md`. Abgeschlossene Blockdefinitionen V58-V70 sind nach `docs/plaene/alt/` ausgelagert.

---

## Block V72: Gameplay-Powerups, Portale und Gates - Vertragsklarheit und Sichtbarkeit

Plan-Datei: `docs/plaene/alt/Feature_Gameplay_Powerups_Portale_Gates_V72.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V69.99 -->

Scope:

- Pickup-Capabilities, Inventarvertrag und Effekt-Semantik fuer Items, Shield, `GHOST` und `SLOW_TIME` zentralisieren und pro Modus klar dokumentieren.
- Portal-, Gate- und Spawn-Vertraege fuer Runtime, Editor und Map-Sanitisierung explizit machen, statt auf stille Fallbacks und implizite Legacy-Regeln zu setzen.
- HUD, Touch-Input, Recorder, Diagnostik und Bot-Awareness auf denselben stabilen Item-/Portal-/Gate-Vertrag bringen.

### Definition of Done (DoD)

- [ ] DoD.1 Jeder Pickup-/Powerup-Typ hat explizite Nutzungs-Metadaten fuer `selfUsable`, `shootable`, Modus-Sichtbarkeit und offensive Sonderfaelle.
- [ ] DoD.2 Hunt-Raketen koennen nicht mehr versehentlich via `useItem` verbrannt werden; ungueltige Nutzungsversuche liefern deterministisches Runtime-Feedback statt stiller Konsumation.
- [ ] DoD.3 `GHOST`, `SLOW_TIME`, Shield und konkurrierende Status-Effekte verhalten sich pro Modus nach dokumentierten Regeln; der Unterschied zwischen globalen, lokalen und Modus-spezifischen Effekten ist klar definiert und stacking-sicher.
- [ ] DoD.4 Unbekannte Gate-Typen werden nicht mehr still zu `boost`; Legacy-Maps erhalten einen sichtbaren Diagnose-, Warn- oder Migrationspfad.
- [ ] DoD.5 Portal-Pairing, Authored-vs-Dynamic-Portalmodus und authored Item-Anker haben explizite Authoring-Regeln statt stiller Laufzeit-Fallbacks.
- [ ] DoD.6 Portal-/Gate-Cooldowns, ungueltige Item-Nutzung und Map-Warnungen sind fuer Player, Mapper oder Diagnostik klar lesbar; Recorder/Replay und Action-Resultate nutzen stabile Ereignis- bzw. Fehlercodes.
- [ ] DoD.7 HUD, Touch-Input und Bots respektieren denselben Item-/Portal-/Gate-Vertrag wie die Runtime und bieten keine veralteten Sonderpfade mehr an.
- [ ] DoD.8 Relevante Core-/Physics-/Editor-Verifikation sowie `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.

### 72.1 Pickup-Capabilities und Inventarvertrag

- [ ] 72.1.1 Eine zentrale Pickup-Registry/Capability-Matrix fuer alle Item-Typen einfuehren (`selfUsable`, `shootable`, `offensive`, `allowedModes`, optional projektil-only, Alias-/Visual-/Encoding-Metadaten), damit Runtime, UI, Bots und Beobachtungs-Encoding denselben Vertrag lesen.
- [ ] 72.1.2 Den Inventar-/Action-Pfad auf diese Matrix umstellen: ungueltige Selbstnutzung wird abgefangen, Hunt-Raketen bleiben projektil-orientiert, und `useItem`/`shootItem` verbrauchen Items nur noch in erlaubten Faellen.
- [ ] 72.1.3 Bot-Heuristik, Trainings-/Observation-Encoding und Model-/Spawn-Aufloesung an dieselbe Registry koppeln, damit neue Item-Typen oder Umbenennungen nicht mehr an mehreren Stellen manuell synchronisiert werden muessen.

### 72.2 Effekt- und Modus-Semantik schaerfen

- [ ] 72.2.1 `GHOST` und `SLOW_TIME` pro Modus neu fassen: entweder lokalere Wirkung oder harte Prioritaets-, Stacking- und Balancing-Regeln, damit Portal-/Parcours-Maps und Hunt nicht durch globale Nebeneffekte kippen.
- [ ] 72.2.2 Das Effekt-System auf zustandsbasierte oder priorisierte Neubewertung umstellen, damit sich konkurrierende Buffs/Debuffs nicht ueber Remove-/Reset-Seiteneffekte gegenseitig in falsche Defaults schiessen.
- [ ] 72.2.3 Shield-Regeln zwischen Classic/Arcade und Hunt angleichen oder sichtbar differenzieren, inklusive konsistentem UI-/HUD-Wording und nachvollziehbarem Damage-/Absorb-Feedback.

### 72.3 Portal- und Gate-Vertraege haerten

- [ ] 72.3.1 Die Map-Sanitisierung fuer Gates und Portale auf sichtbare Validierung umstellen: unbekannte Gate-Typen, ungerade Portal-Knoten oder unklare Legacy-Faelle liefern Warnung, Migrationshinweis oder harten Fehler statt stiller Normalisierung bzw. Ignorierung.
- [ ] 72.3.2 Fuer Portale einen expliziten Authoring-Vertrag einfuehren (`dynamic`, `authored`, `hybrid`) statt des impliziten `preferAuthoredPortals`-Verhaltens; Layout-Builder, Editor und Runtime sollen denselben Modus lesen.
- [ ] 72.3.3 Portal- und Gate-Cooldowns sowie Inaktiv-/Rearm-Zustaende ueber Runtime-Feedback, VFX oder HUD-Diagnostik sichtbar machen; zusaetzlich einen Post-Portal-Vertrag fuer Projektile festlegen, damit Homing- oder Reacquire-Verhalten nach Teleports lesbar und balancierbar bleibt.
- [ ] 72.3.4 Relevante Portal-/Gate-Tuning-Werte aus harten Runtime-Konstanten in dokumentierte Config- oder Map-Parameter ziehen, damit Balancing und Sonderkarten nicht nur ueber Codeaenderungen moeglich sind.

### 72.4 Spawn- und Authoring-Regeln klaeren

- [ ] 72.4.1 Den Spawn-Vertrag fuer authored Item-Anker explizit modellieren: `anchor-only`, `hybrid` oder `fallback-random` statt impliziter Dominanz authored Positionen.
- [ ] 72.4.2 Map-/Editor-Pfade fuer `pickupType`, Gate-Typ und Spawn-Modus dokumentieren oder validieren, damit Authoring-Fehler frueh auffallen und Maps denselben Laufzeitvertrag nutzen.

### 72.5 Tests, Diagnostik und Doku

- [ ] 72.5.1 Gezielte Regressionstests fuer Capability-Matrix, Rocket-Selbstnutzungs-Block, Gate-/Portal-Validierung, Shield-Semantik, Projektil-Verhalten nach Portalen und authored Spawn-Regeln ergaenzen.
- [ ] 72.5.2 Fehlgeschlagene Item-Aktionen als auswertbare Telemetrie oder Recorder-Diagnostik erfassen (`cooldown`, `forbidden-use`, `invalid-index`, `map-warning`), statt sie nur als kurzes Player-Feedback zu behandeln.
- [ ] 72.5.3 Portal-, Gate- und Pickup-Ereignisse als Recorder-/Replay-faehige Events mit stabilen Result-Codes mitschreiben, damit Balancing, QA und Replay-Auswertung denselben Vertrag nutzen.
- [ ] 72.5.4 Die Gameplay-Referenz, Editor-Save-/Import-Hinweise und Custom-Map-Load-Warnungen aktualisieren, damit neue Nutzungsregeln, Warnpfade und Sichtbarkeitsmechaniken fuer Entwickler, Mapper und Playtester nachvollziehbar bleiben.

### 72.6 Bedienpfad und Bot-Awareness angleichen

- [ ] 72.6.1 HUD, Touch-Input und sonstige Action-Oberflaechen auf den Capability-/Cooldown-Vertrag umstellen, damit unmoegliche `use`-/`shoot`-Aktionen proaktiv deaktiviert oder klar markiert werden.
- [ ] 72.6.2 Standardisierte Action-Result-Codes fuer Item-, Portal- und Gate-Interaktionen einfuehren, damit UI, Audio, Recorder, Tests und Debug-Tools nicht mehr an frei formulierten `reason`-Strings haengen.
- [ ] 72.6.3 Hunt-Bot- und Fallback-Policies fuer Portal-, Gate- und Nicht-Raketen-Items erweitern, damit Spezialkarten nicht nur fuer Menschen, sondern auch fuer Bots strategisch spielbar bleiben.

### 72.99 Integrations- und Abschluss-Gate

- [ ] 72.99.1 `TEST_PORT=<port> PW_RUN_TAG=v72-core PW_OUTPUT_DIR=test-results/v72-core npm run test:core`, `npm run test:physics` und bei Editor-Eingriffen die direkt betroffenen Editor-Checks sind fuer den Scope gruen.
- [ ] 72.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; offene Hunt-/Map-Migrationen sind dokumentiert, bevor `72.99` schliesst.

### Risiko-Register V72

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Die Capability-Matrix bricht bestehende Inventar-, Bot- und Trainingsannahmen | hoch | Gameplay/AI | Default-Kompatibilitaet fuer bestehende Typen halten und Invalid-Use-Regeln per Regression absichern | Neue oder umbenannte Items verhalten sich inkonsistent |
| Ein harter Gate-/Portal-Validator lehnt bestehende Maps ploetzlich ab | hoch | Gameplay/Content | Legacy-Aliase nur uebergangsweise mit Warnpfad halten und Migrationshinweise vor finalem Fail bereitstellen | Maps laden nicht mehr oder verlieren Objekte |
| `GHOST`-/`SLOW_TIME`-/Shield-Anpassungen kippen Balance in mehreren Modi zugleich | mittel | Gameplay | Pro Modus eigene Parameter, kleine Balance-Schritte und Szenario-Regressionen fuer Hunt, Portal- und Parcours-Maps | Spielerfeedback oder Tests zeigen systemweite Drift |
| Zusaetzliches Portal-/Gate-/Recorder-Feedback ueberlaedt HUD und Diagnostik | mittel | UI/Telemetry | Leichte Signalschichten bevorzugen, Warnungen deduplizieren und Player-HUD sauber von Debug-/Recorder-Details trennen | Zu viel Rauschen in HUD, Logs oder Replays |
| Neue Spawn-Modi fuer authored Item-Anker rebalance bestehende Maps unbeabsichtigt | mittel | Gameplay/Content | Legacy-Modus als expliziten Default halten und neue Modi nur opt-in oder klar migriert aktivieren | Spawnverteilung driftet ohne gewollte Map-Aenderung |
| Result-Codes und Recorder-Events ziehen breite Folgeaenderungen in UI, Audio, Tests und Replay nach sich | mittel | Shared Runtime | Erst kleinen gemeinsamen Result-Typ definieren und Legacy-Adapter nur uebergangsweise behalten | Breite Folgefehler bei Item-/Portal-Aktionen |

---

## Block V74: Architektur-Runtime-Entkopplung

Plan-Datei: `docs/plaene/alt/Feature_Architektur_Runtime_Entkopplung_V74.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: V58.99 -->

Scope:

- `Game`, `GameRuntimeFacade`, `MatchFlowUiController`, Match-Session-State und Runtime-Config ueber explizite Ports, Bundles und Lifecycle-Einstiegspunkte statt ueber ein breit mutiertes `game`-Objekt koppeln.
- Core/UI-Orchestrierung, Return-to-Menu, Recorder-Dispose und Session-Cleanup auf einen klaren Richtungssinn und deterministische Cleanup-Pfade umstellen.
- `EntityManager` und benachbarte Runtime-Pfade von globalem `CONFIG`-/`ActiveRuntimeConfigStore`-Ambient-State loesen und die Architektur-Guards auf die neue Baseline ratcheten.

### Definition of Done (DoD)

- [ ] DoD.1 `GameBootstrap`, `GameRuntimeFacade` und `MatchSessionRuntimeBridge` erzeugen und verdrahten Runtime-Abhaengigkeiten ueber explizite Bundles/Ports statt ueber breit verteilte `game.*`-Mutation als Default-Muster.
- [ ] DoD.2 `ActiveRuntimeConfigStore` ist entweder klar als Uebergangsadapter isoliert oder aus den betroffenen Entity-/Hunt-/Arena-Pfaden herausgedraengt; Match-Lifecycle und Tests koennen Runtime-Konfiguration deterministisch ohne globalen Restzustand setzen und zuruecksetzen.
- [ ] DoD.3 Der Match-Start-/Pause-/Return-Pfad zwischen Core und UI hat einen klaren Richtungssinn; `MatchFlowUiController` und `PauseOverlayController` rufen keine privaten Session-/Arcade-/Teardown-Interna der Facade mehr direkt auf, und Return-to-Menu laeuft ueber genau einen oeffentlichen Exit-Pfad.
- [ ] DoD.4 `MatchLifecycleSessionOrchestrator` arbeitet gegen einen kleinen Session-Lifecycle-Port; verworfene oder ersetzte Initialisierungen sowie Recorder-/Session-Stopps werden deterministisch aufgeraeumt.
- [ ] DoD.5 `EntityManager` und direkt benachbarte Entity-Runtime-Pfade lesen Modus-/Runtime-Informationen nicht mehr aus `src/core/**`-Globals oder dem `CONFIG`-Proxy, sondern aus expliziten Setup-/Contract-Parametern.
- [ ] DoD.6 Der Vertragsbruch zwischen Menue-`multiplayer`, Storage-Bridge und echter Match-Runtime ist aufgeloest oder explizit umbenannt/dokumentiert; State-IDs laufen konsistent ueber `GAME_STATE_IDS`, und Core-DOM-/Error-Overlays sind sauber in Runtime-/UI-Grenzen eingeordnet.
- [ ] DoD.7 Architektur-Guards und Metriken bilden die neue Baseline ab und lassen keine neuen Legacy-Ausnahmen fuer `ui -> core`, `entities -> core`, `constructor(game)`, globale Runtime-Stores oder private Cross-Layer-Ports entstehen.
- [ ] DoD.8 Match-, Multiplayer-, Arcade-, Recorder- und Pause-Lifecycle bleiben funktional stabil; relevante Regressionen fuer Start, Return-to-Menu, Session-Wechsel, Recorder-Stop und Storage-Bridge-Sonderfaelle sind durch Tests oder Smokes abgesichert.
- [ ] DoD.9 `docs/referenz/ai_architecture_context.md` und der externe Plan dokumentieren die neuen Verantwortungsgrenzen, Runtime-Vertraege und benannten Rest-Adapter nachvollziehbar.
- [ ] DoD.10 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und die direkt betroffenen Runtime-/Architektur-Checks sind gruen.

### 74.1 Runtime-Komposition und `game`-Mutation zurueckdruecken

- [ ] 74.1.1 Die in `GameBootstrap` erzeugten Runtime-Komponenten in ein explizites Bootstrap-/Runtime-Bundle ueberfuehren, damit `main.js` nicht mehr Dutzende lose Properties als impliziten API-Surface verwaltet.
- [ ] 74.1.2 `GameRuntimeFacade.applySettingsToRuntime()` und angrenzende Setup-Pfade so schneiden, dass abgeleitete Runtime-Werte (`runtimeConfig`, Session-Daten, aktive Controller) in klaren Stores/Ports landen statt breit auf dem Root-Objekt zu verstreuen.
- [ ] 74.1.3 Bestehende Backward-Compat-Wrapper in `Game` inventarisieren und in `keep`, `replace-by-port` oder `remove-after-migration` klassifizieren, damit weitere Refactors nicht an stillen Aliasen haengen.
- [ ] 74.1.4 Den globalen `CONFIG`-/`ActiveRuntimeConfigStore`-Pfad inventarisieren und fuer den Lifecycle explizit machen: klare Set-/Clear-Semantik, dokumentierter Uebergangsadapter und keine stillen Match-Reste zwischen Tests, Matches oder `Game`-Instanzen.

### 74.2 Core/UI-Orchestrierungszyklus aufloesen

- [ ] 74.2.1 Einen expliziten Match-Lifecycle-Port zwischen Runtime-Core und UI definieren, sodass `GameRuntimeFacade` keine UI-Controller direkt antreibt und `MatchFlowUiController` keine privaten Facade-Interna `_initSession`, `_waitForAllPlayersLoaded`, `_teardownSession` oder `_startArcadeRunIfEnabled` mehr aufruft.
- [ ] 74.2.2 Start-, Round-, Pause- und Return-to-Menu-Flows in klar getrennte Verantwortlichkeiten schneiden: UI steuert Darstellung und Nutzereingaben, Runtime-Core steuert Session-/Arcade-/Netzwerk-Lifecycle.
- [ ] 74.2.3 Direkte Privatmethodenaufrufe aus Bootstrap in UI-Controller (`_setupPauseOverlayListeners`) durch explizite Public-Ports oder Initializer ersetzen, damit Bootstrap nur noch definierte Vertraege nutzt.
- [ ] 74.2.4 Die vorhandene Port-Schicht (`GameRuntimePorts`) auf echte Richtungstreue pruefen und Rueckgriffe auf `game`, `matchFlowUiController` oder `sessionOrchestrator` aus den Ports entfernen; Ports sollen Vertragsanbieter sein, keine getarnten Alias-Weiterleitungen.
- [ ] 74.2.5 Einen einzigen oeffentlichen Return-to-Menu-Entry-Point definieren und alle Round-End-, Pause-, Fehler- und Hotkey-Pfade darauf konsolidieren, damit Arcade-Reset, Match-Prewarm, Input-Cleanup und Session-Teardown nicht auseinanderlaufen.

### 74.3 Match-Session-Lifecycle und Stale-Cleanup haerten

- [ ] 74.3.1 `MatchLifecycleSessionOrchestrator` von einem Vollzugriff auf `runtime/game` auf ein kleines Dependency-Objekt oder Session-Port umstellen, das nur die fuer Match-Initialisierung, Round-Reset und Teardown notwendigen Operationen enthaelt.
- [ ] 74.3.2 Den Session-ID-Guard so erweitern, dass verworfene `initializeMatchSession()`-Ergebnisse aktiv disposed werden und keine Arena-, Entity-, Particle- oder Camera-Reste im Renderer oder Runtime-Bridge-Zustand verbleiben.
- [ ] 74.3.3 Fuer Matchstart, Abbruch waehrend Async-Init, Multiplayer-Load-Gate und Return-to-Menu deterministische Cleanup- und Error-Pfade definieren, damit Lifecycle-Races nicht mehr nur durch `_startMatchPromise` maskiert werden.
- [ ] 74.3.4 `MediaRecorderSystem` in den Lifecycle einschliessen: offene `stopRecording()`-/Finalize-Promises muessen bei Dispose, Session-Abbruch oder Return-to-Menu deterministisch abgeschlossen werden, statt in orphaned Pending-States zu enden.

### 74.4 Entity-Runtime von Core-Globals loesen

- [ ] 74.4.1 `EntityManager` so umbauen, dass Modus, Bot-Policy, Runtime-Config und aktive Strategie ausschliesslich ueber Setup-/Factory-Parameter oder dedizierte Contracts gesetzt werden und keine `src/core/**`-Imports fuer aktive Runtime-Entscheidungen mehr benoetigt werden.
- [ ] 74.4.2 `ActiveRuntimeConfigStore`-Abhaengigkeiten in Entity-/Mode-Pfaden inventarisieren und auf lokale Runtime-Kontexte oder `shared/contracts` umstellen, damit `entities` isoliert instanziierbar und testbarer wird.
- [ ] 74.4.3 Den Entity-Setup-Pfad in `MatchSessionFactory` und benachbarten Setup-Ops auf die neuen Contracts umstellen und dabei klar dokumentieren, welche Werte pro Match-Session, pro Round und pro Player gelten.
- [ ] 74.4.4 Die direkten `CONFIG`-/Proxy-Leser in `Trail`, `Powerup`, Projectile-, Portal- und Hunt-Pfaden priorisieren und schrittweise auf explizite Runtime-Inputs umstellen, damit Match-spezifische Konfiguration nicht mehr als globaler Ambient-State in die Simulation einsickert.

### 74.5 Vertragsklarheit, Guard-Ratchet, Tests und Dokumentation

- [ ] 74.5.1 Den Vertragsbruch zwischen Menue-`multiplayer`, Storage-Bridge und Match-Runtime explizit aufloesen: entweder durch klares Renaming/Scoping des Storage-Bridge-Modus oder durch einen echten, zur Runtime passenden Transportvertrag.
- [ ] 74.5.2 State-IDs und Lifecycle-Contracts vereinheitlichen: rohe String-Zustaende (`'MENU'`, `'PLAYING'`, `'ROUND_END'`, ...) durch `GAME_STATE_IDS` bzw. klare Contract-Helfer ersetzen und Drift zwischen Core, State und UI abbauen.
- [ ] 74.5.3 Core-DOM-/Overlay-Verantwortung inventarisieren (`GameLoop`, `RuntimeDiagnosticsSystem`, Fehler-Overlay) und entscheiden, was in UI/Debug-Infrastruktur wandert und was als klar markierter Runtime-Debug-Adapter bestehen bleiben darf.
- [ ] 74.5.4 Architektur-Reports und Boundary-/Metrics-Checks um die neue Baseline nachziehen, damit private Cross-Layer-Vertraege, `entities -> core`-Reste, globale Runtime-Store-Abhaengigkeiten oder neue `constructor(game)`-Legacy-Pfade nicht erneut still wachsen.
- [ ] 74.5.5 Gezielte Regressionstests oder Smokes fuer Matchstart, Session-Abbruch, Return-to-Menu, Multiplayer-Load-Gate, Recorder-Stop/Dispose und Entity-Setup ohne Core-Globals ergaenzen.
- [ ] 74.5.6 Die Architektur-Referenz, insbesondere das Zielbild fuer `Game`, `GameRuntimeFacade`, `MatchFlowUiController`, Session-Orchestrierung, Runtime-Config-Lebenszyklus und Entity-Runtime, auf den neuen Zustand aktualisieren.

### 74.99 Integrations- und Abschluss-Gate

- [ ] 74.99.1 `npm run architecture:report`, `npm run check:architecture:boundaries`, `npm run check:architecture:metrics` und die direkt betroffenen Runtime-Tests/Smokes sind fuer den Scope gruen.
- [ ] 74.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; verbleibende Rest-Hotspots ausserhalb des Block-Scopes sind dokumentiert, bevor `74.99` schliesst.

### Risiko-Register V74

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Die Entkopplung von `GameRuntimeFacade` und `MatchFlowUiController` bricht Matchstart, Pause, Return-to-Menu oder Multiplayer zugleich | hoch | Core/UI | Start-/Return-Pfade in kleine Ports schneiden und jede Etappe mit Runtime-Smokes absichern | Session startet oder endet nicht mehr deterministisch |
| Das Schliessen der Session-Race-Leaks offenbart unerwartete Dispose-Reihenfolgen bei Renderer, Recorder oder Kamera | hoch | Core Runtime | Cleanup-Pfade zentralisieren und Async-Abbruchfaelle explizit testen | Renderer-/Recorder-Reste bleiben nach Abbruch haengen |
| Das Zurueckdruecken von `game.*`-Mutation oder Legacy-Wrappern bricht implizite Call-Sites in UI, Debug oder Tests | mittel | Core Architecture | Wrapper zuerst inventarisieren und dann schrittweise durch Ports ersetzen; Uebergangsadapter klar markieren | Nachgelagerte Aufrufer verlieren still ihre Datenquelle |
| Die Entkopplung von `EntityManager` von Core-Globals veraendert Modus- oder Bot-Initialisierung subtil | mittel | Entities/Gameplay | Aktive Runtime-Inputs pro Session dokumentieren und Bot-/Mode-Regressionen gegen bestehende Smokes pruefen | Verhalten driftet trotz gruener Imports |
| Schaerfere Architektur-Guards blockieren tolerierte Legacy-Pfade, bevor alle Aufrufer migriert sind | mittel | Architecture | Ratchet nur mit klarer Zielbaseline anheben und jede neue Regel an bewusst migrierten Call-Sites verifizieren | Build oder Guard-Gates kippen auf breiter Front |
| Die Konsolidierung auf einen einzigen Return-to-Menu-Pfad legt verdeckte Sonderfaelle in Pause-, Fehler- und Round-End-Flows frei | mittel | Core/UI | Alle Exit-Call-Sites vorab inventarisieren und fuer jeden Exit-Typ gezielte Smokes fuehren | Einzelne Exit-Pfade verlieren Cleanup, Reset oder Overlay-Wiring |

---

## Abgeschlossene Bloecke (archiviert)

| Block | Grund | Plan-Datei | Archiv-Pfad |
| --- | --- | --- | --- |
| V41 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V41_Multiplayer_Rest-Gate_2026-03-23.md` | `docs/archive/plans/completed/` |
| V46 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V46_Architektur-Verbesserungen_Restarbeiten_2026-03-22.md` | `docs/archive/plans/completed/` |
| V50 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V50_Architektur-Haertung_II_2026-03-23.md` | `docs/archive/plans/completed/` |
| V51 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Block_V51_Parcours-Pflichtmap_Lauf-Verifikation_2026-03-22.md` | `docs/archive/plans/completed/` |
| V45 | abgeschlossen | `docs/archive/plans/completed/Feature_Arcade_Modus_V45.md` | `docs/archive/plans/completed/` |
| V47 | abgeschlossen | `docs/archive/plans/completed/Feature_Strategy_Pattern_V47.md` | `docs/archive/plans/completed/` |
| V48 | abgeschlossen | `docs/archive/plans/completed/Feature_Fight_Modus_Qualitaet_V48.md` | `docs/archive/plans/completed/` |
| V52-V57 | abgeschlossen | `docs/archive/plans/completed/Umsetzungsplan_Bloecke_V52-V57_Architektur-Haertung-bis-Arcade_2026-03-27.md` | `docs/archive/plans/completed/` |
| V58 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V59 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V60 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V61 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V62 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V63 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V65 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V66 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V67 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V68 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V69 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| V70 | inline abgeschlossen; 2026-03-31 aus aktivem Master ausgelagert | `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` | `docs/plaene/alt/` |
| N4-N7 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V49 | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| V41-D | abgeschlossen | `docs/archive/plans/superseded/Umsetzungsplan_2026-03-22_pre-restrukturierung.md` | `docs/archive/plans/superseded/` |
| Alte Masterplaene bis 2026-03-06 | abgeloest | `docs/archive/plans/superseded/Umsetzungsplan_bis_2026-03-06.md` | `docs/archive/plans/superseded/` |

## Weekly Review (KW 14/2026)

Stand: 2026-03-31

- Abgeschlossen diese Woche: V58-V70 aus dem aktiven Masterplan in `docs/plaene/alt/Umsetzungsplan_Abgeschlossene_Bloecke_V58-V70_2026-03-31.md` ausgelagert.
- Aktiv: V72 und V74 als offene P1-Bloecke.
- Blockiert: Kein harter Blocker im Masterplan; V64 ist weiterhin nur als offener Scope vermerkt.
- Naechste 3 Ziele:
  1. V72.1 claimen und Capability-Matrix sowie Inventarvertrag fixieren.
  2. V74.1 claimen und Runtime-Bundle-/Port-Schnitt fuer `GameBootstrap`/`GameRuntimeFacade` vorbereiten.
  3. V64 konkretisieren: Desktop/Electron-Scope und Priorisierung klaeren.

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`
