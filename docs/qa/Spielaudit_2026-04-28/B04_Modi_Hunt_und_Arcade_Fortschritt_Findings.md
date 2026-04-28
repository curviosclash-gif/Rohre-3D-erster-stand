# B04 Modi, Hunt und Arcade-Fortschritt - Findings

Stand: 2026-04-29
Status: in Arbeit
Planquelle: [README.md](./README.md)

## Scope

- `src/modes/**`
- `src/hunt/**`
- `src/core/arcade/**`
- `src/state/arcade/**`
- `src/entities/arcade/**`
- `src/ui/arcade/**`
- `src/ui/hangar/**`

Bisher vertieft gelesen:

- `src/core/arcade/ArcadeRunRuntime.js`
- `src/state/arcade/ArcadeLeaderboard.js`
- `src/state/arcade/ArcadeMapProgression.js`
- `src/state/arcade/ArcadeMissionState.js`
- `src/state/arcade/ArcadeVehicleProfile.js`
- `src/shared/contracts/ArcadeVehicleProfileContract.js`
- `src/ui/arcade/ArcadeMenuSurface.js`
- `src/ui/arcade/ArcadeVehicleManager.js`
- `src/ui/arcade/vehicle-manager/VehicleManagerLoadoutPresets.js`
- `src/ui/hangar/HangarWorkshopPersistenceFacade.js`
- `src/modes/ArcadeModeStrategy.js`
- `src/core/runtime/GameRuntimeArcadeSupport.js`
- `src/hunt/RespawnSystem.js`
- `src/hunt/HuntScoring.js`
- `src/modes/HuntModeStrategy.js`

## Prueffokus

- Mode-Grenzen und gemeinsame Strategien
- Hunt-Kampf-, Respawn- und Scoring-Pfade
- Arcade-Run-, Progressions- und Hangar-Integration
- Produktlogik, Balancing-Vertraege und Drift zwischen Runtime und UI

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B04-F1 | hoch | Seed-Override driftet zwischen angezeigter Challenge und realer Arcade-Sequenz | `src/core/arcade/ArcadeRunRuntime.js`, `src/shared/utils/ArcadeUtils.js` | `startRun()` baut `runConfig` mit `options.seed` (`ArcadeRunRuntime.js:715-718`), verwendet fuer `resolveMapSequence()` aber weiter `this._config.seed` (`ArcadeRunRuntime.js:747-750`) und seeded Missions ebenfalls mit `this._config.seed` statt dem aktiven Run-Seed (`ArcadeRunRuntime.js:873-877`). `startDailyChallenge()` delegiert nur ueber `seed` nach `startRun()` (`ArcadeRunRuntime.js:783-785`). Daily-/Challenge-Seeds koennen damit UI-seitig korrekt erscheinen, waehrend Map- und Missionsfolge aus einem alten Seed stammen. | Seed-Quelle fuer Sequenz-, Missions- und Replay-nahe Ableitungen auf `runConfig.seed` bzw. `this._state.config.seed` vereinheitlichen und mit einem gezielten Contract-Test fuer Daily- und manuelle Challenge-Seeds absichern. | offen |
| B04-F2 | hoch | Vehicle-Loadout-Presets umgehen Upgrade-Gates und Persistenzhaertung | `src/ui/arcade/ArcadeVehicleManager.js`, `src/ui/arcade/vehicle-manager/VehicleManagerLoadoutPresets.js`, `src/state/arcade/ArcadeVehicleProfile.js`, `src/shared/contracts/ArcadeVehicleProfileContract.js` | Preset-Load schreibt `preset.upgrades` direkt ins Profil (`ArcadeVehicleManager.js:503-514`). Der Preset-Store akzeptiert beliebige Slot-Keys mit `T1`-`T3` (`VehicleManagerLoadoutPresets.js:20-32`, `174-191`). `normalizeVehicleProfile()` und `saveVehicleProfiles()` kopieren `upgrades` ohne Validierung gegen freigeschaltete Slots, erlaubte Teilefamilien oder Tier-Gates (`ArcadeVehicleProfile.js:96-125`, `450-457`); der Contract normalisiert dieselbe Struktur ebenfalls nur oberflaechlich (`ArcadeVehicleProfileContract.js:30-44`). Manipulierte oder veraltete Presets koennen so gesperrte Upgrades konservieren oder wieder einschleusen. | Preset-Import ueber dieselben Gate-Pruefungen wie `purchaseUpgrade()` fuehren oder beim Load/Save hart gegen erlaubte Slots/Tiers/Level sanitizen; abgewiesene Eintraege sichtbar melden statt still zu uebernehmen. | offen |
| B04-F3 | hoch | Sudden-Death-Strategiestatus kann run-uebergreifend haengen bleiben | `src/modes/ArcadeModeStrategy.js`, `src/core/runtime/GameRuntimeArcadeSupport.js` | `enterSuddenDeath()` setzt `_sdActive`, Stacks und Damage-Multiplikator (`ArcadeModeStrategy.js:148-175`). Schaden, Heilung und Intermission-Heal lesen diesen Zustand direkt (`ArcadeModeStrategy.js:263-330`). `cleanup()` setzt aber nur `_roundScores` zurueck (`ArcadeModeStrategy.js:75-77`), `GameRuntimeArcadeSupport.startRunIfEnabled()` reused die bestehende Strategy-Instanz ueber `setStrategy(strategy)` (`GameRuntimeArcadeSupport.js:93-95`), und im Repo gibt es keinen Aufrufer von `exitSuddenDeath()`. Nach dem ersten Sudden-Death-Eintritt kann ein Folge-Run deshalb mit permanent erhoehtem Schaden und veraendertem Heal-Verhalten starten. | Beim Run-Ende bzw. `resetRunState()` den kompletten Arcade-Strategy-Zustand explizit resetten (`exitSuddenDeath()`, Modifier-, Sector- und Bonus-Reset) oder die Strategy pro Run frisch instanziieren; Lifecycle-Test fuer "zweiter Run nach Sudden Death" ergaenzen. | offen |
| B04-F4 | mittel | Arcade-Missionen ignorieren den tatsaechlichen Map- und Sector-Kontext | `src/core/arcade/ArcadeRunRuntime.js`, `src/state/arcade/ArcadeMissionState.js`, `src/shared/contracts/RuntimeMapCatalogContract.js` | `_assignMissionsForCurrentSector()` berechnet `currentMapKey`, reicht aber weder Map-Missions noch eine echte Sector-Template-Id weiter: `planEntry` wird auf `{ id: 'sector' }` reduziert und `assignSectorMissions()` mit `mapMissions = null` aufgerufen (`ArcadeRunRuntime.js:868-879`). `assignSectorMissions()` faellt damit immer auf `buildGenericMissionPool(templateId)` zurueck; fuer `id: 'sector'` landet der Code im Default-Pool (`ArcadeMissionState.js:143-155`, `231-270`). Gleichzeitig fuehrt der Runtime-Map-Katalog Missionsmetadaten explizit als Map-Eigenschaft (`RuntimeMapCatalogContract.js:95`). Ergebnis: map- oder sektor-spezifische Missionsvariation ist im produktiven Pfad faktisch abgeklemmt. | Echten Sector-Template-Id- und Map-Mission-Input bis in `assignSectorMissions()` durchreichen und mit einem Contract-Test absichern, dass Parcours-, Hazard- und map-spezifische Missionspools wirklich am aktiven `currentMapKey` haengen. | offen |
| B04-F5 | mittel | Hunt-Pickup-Auswahl umgeht deterministische RNG-Hooks | `src/modes/HuntModeStrategy.js`, `src/hunt/RocketPickupSystem.js` | `HuntModeStrategy.resolveSpawnType()` verwendet fuer die Rocket-Gate-Entscheidung und fuer gewichtete Non-Rocket-Auswahl direkt `Math.random()` (`HuntModeStrategy.js:74`, `337-365`). `pickWeightedRocketTierType()` bietet bereits einen injizierbaren `random`-Hook an, faellt aber nur deshalb auf `Math.random` zurueck, weil der Aufrufer keine Quelle uebergibt (`RocketPickupSystem.js:97-115`). Gleiche Konfigurationen erzeugen damit unterschiedliche Pickup-Verteilungen und erschweren Replays, Debug-Reruns und spaetere Sync-/Training-Pfade. | Pickup-Auswahl auf eine injizierte Runtime-RNG umstellen und denselben Seed-/Replay-Pfad wie die anderen deterministischen Runtime-Systeme verwenden; danach einen kleinen Determinismus-Test fuer identische Hunt-Konfigurationen ergaenzen. | offen |
| B04-F6 | mittel | Hunt-Retreat-Fallback steuert Bots im Notfall direkt auf den Gegner zu | `src/hunt/HuntBotPolicy.js` | Der Rueckzugszweig wird bei niedriger Vitalitaet oder hoher Survival-Pressure aktiv (`HuntBotPolicy.js:422-449`). Falls weder Gate noch Portal verfuegbar sind und keine Sensor-Steering-Daten vorliegen, ruft der Code `applyRetreatSteeringFallback()` auf (`HuntBotPolicy.js:440-441`), und diese Funktion delegiert direkt an `applySteeringTowardPosition(... enemy.position ...)` (`HuntBotPolicy.js:214-216`). Im genau als Rueckzug markierten Pfad beschleunigt der Bot damit auf das Bedrohungsziel zu statt Distanz aufzubauen. | Retreat-Fallback auf einen echten Escape-Vektor oder sicheren Wegpunkt umstellen und mit einem Bot-Regressionstest absichern, dass Low-HP-Retreat nicht in einen Frontal-Approach kippt. | offen |

## Offene Fragen

- Soll der Arcade-Seed bewusst nur fuer Teilaspekte des Runs gelten, oder ist die Produktabsicht eine vollstaendig reproduzierbare Challenge aus Map-, Mission-, Reward- und Replay-Perspektive?
- Sind Vehicle-Presets als rein kosmetische Komfortfunktion gedacht, oder duerfen sie produktiv niemals Progression/Gates beeinflussen und muessen deshalb beim Import denselben Vertragsweg wie echte Upgrade-Kaeufe nutzen?
- Ist die derzeit generische Arcade-Missionsauswahl nur ein Zwischenstand, oder sollen Map-/Sector-Metadaten bewusst nicht in den produktiven Mission-Pool einfliessen?
- Hunt-spezifische Tiefenpruefung fuer Respawn- und Scoring-Drift ist nach den RNG- und Retreat-Funden noch offen und sollte in der naechsten Audit-Runde separat nachgezogen werden.

## Folgearbeit

- Seed-Override in `ArcadeRunRuntime` auf eine einzige aktive Seed-Quelle konsolidieren und danach gezielt Daily-/Challenge-Run gegen Map- und Missionssequenz testen.
- Preset-Load-Pfad gegen illegale Upgrade-Staende haerten und dabei klaeren, ob ungueltige Presets verworfen, migriert oder nur teilweise angewandt werden sollen.
- Arcade-Strategy-Lifecycle um einen echten Run-Reset fuer Sudden Death, Modifier und Slot-Boni ergaenzen.
- Arcade-Missionszuweisung an echten Sector-/Map-Kontext anbinden und danach Parcours-/Hazard-Sektoren gezielt gegen ihre erwarteten Missionspools rechecken.
- Hunt-Pickup-Auswahl auf deterministische Runtime-RNG umstellen und den Retreat-Fallback auf echten Distanzaufbau korrigieren; danach den verbleibenden Hunt-Teil von B04 mit Fokus auf Respawn und kampfnahe Ergebnisdrift weiter auditieren.
