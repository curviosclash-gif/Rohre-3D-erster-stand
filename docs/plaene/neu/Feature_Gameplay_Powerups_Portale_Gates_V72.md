# Feature Gameplay-Powerups Portale Gates V72

Stand: 2026-03-30
Status: Geplant
Owner: Codex

<!-- LOCK: frei -->

## Ziel

Die Gameplay-Vertraege fuer Powerups, Inventar-Items, Portale, Gates und Spawn-Regeln konsistent, sichtbar und validierbar machen, ohne bestehende Maps oder Modus-Sonderfaelle stillschweigend zu brechen.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Vorgeschlagene Block-ID: `V72`
- Hard dependencies: Hunt-spezifische Raketen- und Shield-Entscheidungen aus `V69` bleiben bis zur Intake-Entscheidung die aktive Baseline; Gate-Typ-Validierung braucht vor hartem Fail einen Legacy-/Migrationspfad fuer bestehende Maps.
- Soft dependencies: HUD-/Feedback-Wording fuer Shield, Portal- und Gate-Zustaende mit den bestehenden UI-/Gameplay-Bloecken abstimmen; Editor-Warnungen fuer Gate-/Pickup-Vertraege bei Bedarf mit den Editor-Pfaden nachziehen.
- Hinweis: Manuelle Uebernahme erforderlich.

## Ausgangslage

- Inventar-Items koennen aktuell breit sowohl selbst benutzt als auch als Projektil verschossen werden; eine explizite Capability-Matrix fehlt.
- Hunt-Raketen liegen als Pickups im selben Inventarfluss und koennen dadurch per `useItem` ohne Nutzwert verbraucht werden.
- `GHOST` ueberspringt den Kollisionspfad sehr weitgehend; `SLOW_TIME` greift global in die Zeitbasis ein; das Effekt-System arbeitet zudem teardown-basiert und ist fuer konkurrierende oder ueberlappende Statuswerte fehleranfaellig.
- Gate-Typen werden bei unbekannten Werten still auf `boost` normalisiert, wodurch Map-Fehler schwer sichtbar bleiben.
- Portal-Knoten werden bei ungerader Anzahl zur Laufzeit still beschnitten; ausserdem ist `preferAuthoredPortals` faktisch naeher an einem impliziten Authored-Override als an einem klaren Spawn-/Hybridvertrag.
- Shield-Semantik und Feedback unterscheiden sich zwischen Classic/Arcade und Hunt.
- Portal-/Gate-Cooldowns sind spielerisch kaum lesbar; mehrere relevante Tuning-Werte leben noch als Runtime-Konstanten statt als konfigurierbare Vertragsanbindung.
- Item-Typen, Aliase und Darstellungen sind ueber Runtime, AI, Spawn, Modelle und Beobachtungs-Encoding verteilt statt zentral beschrieben.
- Authored Item-Anker dominieren den Spawn-Pfad stark; die Fallback-Regel fuer Zufallsspawns ist weder klar modelliert noch sichtbar dokumentiert.
- Map-Warnungen existieren bereits in Import-/Load-Pfaden, sind fuer Spieler und Mapper aber nicht durchgaengig sichtbar; fehlgeschlagene Item-Aktionen erzeugen ausser Spielerfeedback kaum auswertbare Telemetrie.
- HUD, Touch-Input und Recorder kennen den Item-Vertrag bislang nur unvollstaendig; unmoegliche Aktionen werden nicht proaktiv ausgeblendet, und Resultate kommen oft nur als Freitext statt als stabile Diagnose-Codes zurueck.
- Hunt-Bots verstehen vor allem MG/Raketen und generischen Druck, aber kaum Portal-, Gate- oder Nicht-Raketen-Item-Nutzung als strategischen Bestandteil spezieller Maps.

## Betroffene Pfade (geplant)

- `src/core/config/ConfigSections.js`
- `src/core/PlanarAimAssistSystem.js`
- `src/entities/Powerup.js`
- `src/entities/PowerupModelFactory.js`
- `src/entities/player/PlayerEffectOps.js`
- `src/entities/player/PlayerInventoryOps.js`
- `src/entities/player/PlayerView.js`
- `src/entities/CustomMapLoader.js`
- `src/entities/ai/BotTuningConfig.js`
- `src/entities/ai/observation/ItemSlotEncoder.js`
- `src/entities/ai/RuleBasedBotPolicy.js`
- `src/entities/systems/lifecycle/PlayerActionPhase.js`
- `src/entities/systems/lifecycle/PlayerCollisionPhase.js`
- `src/entities/systems/lifecycle/PlayerInteractionPhase.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/systems/HuntCombatSystem.js`
- `src/entities/arena/portal/PortalRuntimeSystem.js`
- `src/entities/arena/portal/SpecialGateRuntime.js`
- `src/entities/mapSchema/MapSchemaSanitizeOps.js`
- `src/entities/mapSchema/MapSchemaRuntimeOps.js`
- `src/hunt/HuntConfig.js`
- `src/hunt/HealthSystem.js`
- `src/hunt/HuntBotPolicy.js`
- `src/hunt/RocketPickupSystem.js`
- `src/modes/HuntModeStrategy.js`
- `src/modes/ArcadeModeStrategy.js`
- `src/ui/HuntHUD.js`
- `src/ui/TouchInputSource.js`
- `editor/js/EditorMapSerializer.js`
- `editor/js/ui/EditorSessionControls.js`
- `editor/js/ui/EditorPropertyControls.js`
- `tests/` (direkt betroffene Core-/Physics-/Editor-Checks)
- `docs/referenz/gameplay_powerups_portale_gates.md`

## Definition of Done (DoD)

- [ ] DoD.1 Jeder Pickup-/Powerup-Typ hat explizite Nutzungs-Metadaten fuer `selfUsable`, `shootable`, Modus-Sichtbarkeit und offensive Sonderfaelle.
- [ ] DoD.2 Hunt-Raketen koennen nicht mehr versehentlich via `useItem` verbrannt werden; ungueltige Nutzungsversuche liefern deterministisches Runtime-Feedback statt stiller Konsumation.
- [ ] DoD.3 `GHOST`, `SLOW_TIME`, Shield und konkurrierende Status-Effekte verhalten sich pro Modus nach dokumentierten Regeln; der Unterschied zwischen globalen, lokalen und Modus-spezifischen Effekten ist klar definiert und stacking-sicher.
- [ ] DoD.4 Unbekannte Gate-Typen werden nicht mehr still zu `boost`; Legacy-Maps erhalten einen sichtbaren Diagnose-, Warn- oder Migrationspfad.
- [ ] DoD.5 Portal-Pairing, Authored-vs-Dynamic-Portalmodus und authored Item-Anker haben explizite Authoring-Regeln statt stiller Laufzeit-Fallbacks.
- [ ] DoD.6 Portal-/Gate-Cooldowns, ungueltige Item-Nutzung und Map-Warnungen sind fuer Player, Mapper oder Diagnostik klar lesbar; Recorder/Replay und Action-Resultate nutzen stabile Ereignis- bzw. Fehlercodes.
- [ ] DoD.7 HUD, Touch-Input und Bots respektieren denselben Item-/Portal-/Gate-Vertrag wie die Runtime und bieten keine veralteten Sonderpfade mehr an.
- [ ] DoD.8 Relevante Core-/Physics-/Editor-Verifikation sowie `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind gruen.

## Evidenzformat

Abgeschlossene Punkte verwenden dieses Format:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

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

- [ ] 72.99.1 `TEST_PORT=<port> PW_RUN_TAG=v72-core PW_OUTPUT_DIR=test-results/v72-core npm run test:core` und `npm run test:physics` sind fuer den Scope gruen; bei Editor-Eingriffen laufen die direkt betroffenen Editor-Checks mit isoliertem `TEST_PORT` ebenfalls gruen.
- [ ] 72.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind abgeschlossen; offene Hunt-/Map-Migrationen sind dokumentiert, bevor `72.99` geschlossen wird.

## Verifikationsstrategie

- Gameplay-Runtime: `TEST_PORT=<port> PW_RUN_TAG=v72-core PW_OUTPUT_DIR=test-results/v72-core npm run test:core`
- Entity-/Physics-Regression: `npm run test:physics`
- Bei kombinierten Aenderungen ueber `src/entities/**`, `src/core/**` und `editor/**`: optional `npm run test:fast`
- Plan-/Dokugates: `npm run plan:check`, `npm run docs:sync`, `npm run docs:check`

## Risiko-Register V72

- `R1 | high |` Die neue Capability-Matrix kann bestehende Inventar-, Bot- und Trainingsannahmen brechen.
  - Mitigation: Default-Kompatibilitaet fuer bestehende Typen, gezielte Regressionstests und explizite Invalid-Use-Rueckgaben.
- `R2 | high |` Ein harter Gate-Validator kann bestehende oder importierte Maps ploetzlich ablehnen.
  - Mitigation: Legacy-Aliase nur uebergangsweise mit Warnpfad halten und Migrationshinweise vor dem finalen Fail bereitstellen.
- `R3 | medium |` `GHOST`-/`SLOW_TIME`-Anpassungen veraendern die Spielbalance in mehreren Modi gleichzeitig.
  - Mitigation: pro Modus eigene Parameter, kleine Balance-Schritte und Verifikation auf Portal-/Parcours-/Hunt-Szenarien.
- `R4 | medium |` Zusaetzliches Portal-/Gate-Feedback kann Szene, HUD oder Diagnosepfade ueberladen.
  - Mitigation: leichte visuelle Signale bevorzugen und Debug-/HUD-Ebenen sauber trennen.
- `R5 | medium |` Neue Spawn-Modi fuer authored Item-Anker koennen bestehende Maps unbeabsichtigt umbalancieren.
  - Mitigation: alter Modus als expliziter Legacy-Default, neue Modi nur opt-in oder klar migriert.
- `R6 | medium |` Shield-Angleichungen betreffen Anzeigen, Trefferfeedback und Balancing zugleich.
  - Mitigation: Semantik erst festziehen, dann UI-Texte, Tests und Doku gemeinsam nachziehen.
- `R7 | medium |` Eine zentrale Item-Registry beruehrt Spawn, Inventar, Modelle, Bots und Beobachtungs-Encoding gleichzeitig.
  - Mitigation: vorhandene Typen zuerst 1:1 abbilden, Alias-Aufloesung zentralisieren und Refactor per Regressionstests absichern.
- `R8 | medium |` Zusaetzliche Warnungen und Telemetrie koennen Editor, HUD oder Recorder mit Rauschen fluten.
  - Mitigation: Warnungen deduplizieren, klare Severity-Stufen verwenden und Player-HUD von Debug-/Recorder-Details trennen.
- `R9 | medium |` Ein stacking-sicheres Effektmodell kann bestehende implizite Balance-Annahmen aendern, auch wenn kein einzelner Powerup-Wert angepasst wird.
  - Mitigation: erst Ist-Verhalten per Tests einfrieren, dann Prioritaeten/Neuberechnung schrittweise umstellen.
- `R10 | medium |` Configurierbare Portal-/Gate-Werte vergroessern die Freiheitsgrade fuer Maps, koennen aber ungueltige oder exploitbare Kombinationen erzeugen.
  - Mitigation: sinnvolle Min/Max-Grenzen, Sanitisierung und Default-Werte im Schema verankern.
- `R11 | medium |` Standardisierte Result-Codes und Recorder-Events ziehen Kreisaenderungen in UI, Audio, Tests und Replay nach sich.
  - Mitigation: erst kleinen gemeinsamen Result-Typ fuer Item-/Portal-/Gate-Aktionen definieren und Adapter fuer Legacy-Strings voruebergehend erhalten.
- `R12 | medium |` Mehr Portal-/Gate-Awareness in Bots kann zu unnatuerlichem Routing oder Exploit-Verhalten fuehren.
  - Mitigation: Bot-Heuristiken auf Reichweite, Risiko und Kartenkontext begrenzen und mit spezialisierten Szenarien gegenpruefen.
