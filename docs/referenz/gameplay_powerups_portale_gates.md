# Gameplay-Referenz: Powerups, Portale und Gates

Stand: 2026-04-11

## Zweck

Diese Uebersicht beschreibt die aktuell im Code vorhandenen Powerups, Portale, Exit-Portale und Spezial-Gates sowie deren Laufzeitverhalten.

## Grundablauf fuer Items

- Items spawnen ueber den `PowerupManager`.
- Auf Maps mit festen `items`-Ankern oder explizitem `itemSpawnMode` entscheidet die Runtime zwischen `anchor-only`, `hybrid` und `fallback-random`.
- `toArenaMapDefinition()` liefert dafuer den maschinenlesbaren Spawn-Vertrag unter `map.itemSpawnAuthoring`.
- Ein eingesammeltes Item landet im Inventar des Spielers.
- `useItem` verbraucht nur self-usable Items als Selbst-Effekt; verbotene Nutzungen bleiben im Inventar und liefern stabile Result-Codes.
- `shootItem` verschiesst das Item als Projektil.
- Projektil-Treffer uebertragen Status-Items weiterhin auf das Ziel.
- In Hunt sind Raketen projektil-only Schadens-Projektile und koennen nicht mehr per `useItem` verbrannt werden.
- HUD- und Touch-Oberflaechen lesen denselben Capability-Vertrag und markieren Slots bzw. Buttons als `USE`, `SHOT`, `DUAL` oder Cooldown.

## Powerup-Typen

| Typ | Selbstnutzung | Projektil | Wirkung | Modus |
| --- | --- | --- | --- | --- |
| `SPEED_UP` | ja | ja | `baseSpeed * 1.6` fuer 4s | `CLASSIC`, `ARCADE`, `HUNT` |
| `SLOW_DOWN` | ja | ja | `baseSpeed * 0.5` fuer 4s | `CLASSIC`, `ARCADE`, `HUNT` |
| `THICK` | ja | ja | Trailbreite auf `1.8` fuer 5s | `CLASSIC`, `ARCADE`, `HUNT` |
| `THIN` | ja | ja | Trailbreite auf `0.2` fuer 5s | `CLASSIC`, `ARCADE`, `HUNT` |
| `SHIELD` | ja | ja | Shield aktiv; in Hunt persistent solange `shieldHP > 0`, sonst Schutz fuer den naechsten Treffer | `CLASSIC`, `ARCADE`, `HUNT` |
| `SLOW_TIME` | ja | ja | setzt globale Spielzeit auf `0.4x`, solange aktiv; Hunt entfernt Legacy-Instanzen beim Effekt-Recompute | `CLASSIC`, `ARCADE` |
| `GHOST` | ja | ja | ignoriert Wand- und Trail-Kollisionen waehrend der Laufzeit | `CLASSIC`, `ARCADE`, `HUNT` |
| `INVERT` | ja | ja | invertiert die Steuerung fuer 4s | `CLASSIC`, `ARCADE`, `HUNT` |
| `ROCKET_WEAK` | nein | ja | 10 Schaden | `HUNT` |
| `ROCKET_MEDIUM` | nein | ja | 20 Schaden | `HUNT` |
| `ROCKET_HEAVY` | nein | ja | 40 Schaden | `HUNT` |
| `ROCKET_MEGA` | nein | ja | 70 Schaden | `HUNT` |

## Wichtige Item-Details

- Inventarlimit: `5`.
- Feldlimit gleichzeitig gespawnter Items: `10`.
- Spawnintervall: `3.0s`.
- Pickup-Radius: `2.5`.
- Die Capability-Matrix ist zentral in `src/entities/PickupRegistry.js` gepflegt und steuert Typ-Normalisierung, Modusfreigabe, Visuals, Bot-Gewichte und Observation-Slots.
- In Planar-Maps koennen freie Spawns auf `portalLevels` gelegt werden.
- Map-Autoren koennen per `pickupType` feste Item-Typen an Anchors erzwingen.
- `GHOST` und Spawn-Schutz ueberspringen den normalen Wand-/Trail-Kollisionspfad komplett.
- In Hunt haben Item-Selbstnutzungen einen Cooldown; fuer `SHIELD` gilt ein eigener Mindest-Cooldown.
- Recorder und Diagnostik aggregieren stabile Action-Result-Codes wie `item.pickup.success`, `item.use.cooldown`, `item.shoot.success`, `portal.travel` oder `gate.trigger.boost` in `actionResultCodeTotals`.

## Normale Portale

- Normale Portale sind immer paarweise aufgebaut: `A <-> B`.
- Spieler und Projektile koennen beide teleportieren.
- Trigger-Radius: `4.0`.
- Pro Entity wird ein Cooldown gesetzt, damit kein direktes Rueck-Teleportieren passiert.
- Der Cooldown ist dynamisch: mindestens `1.2s`, je nach Distanz bis maximal `2.5s`.
- Portal- und Gate-Meshes pulsen/skalieren leicht herunter, solange pro-Entity-Cooldowns aktiv sind.
- Spieler landen am Zielportal plus kleinem Vorwaerts-Offset.
- Im Planar-Mode wird beim Teleport auch die aktive Ebene (`currentPlanarY`) auf die Zielhoehe gesetzt.
- Projektile behalten ihre Flugrichtung, werden am Ausgang leicht nach vorne versetzt und verlieren nach dem Teleport ihr bisheriges Homing-Ziel bis zur erneuten Erfassung.
- `matchRuntimeProjection.players[*].traversal` zeigt den Runtime-Signalvertrag fuer Portal-/Gate-Interaktionen: `portalCooldownRemaining`, `gateCooldownRemaining`, Exit-Portal-Aktivstatus (`exitPortal.totalCount|activeCount|inactiveCount`) sowie Post-Portal-Fenster (`postPortalActive`, `postPortalRemainingSeconds`, `lastPortalTravelAtMs`).
- Portal-Parsing normalisiert unvollstaendige Legacy-Paare nicht mehr still auf Ursprungspunkte; ungueltige oder positionslose Eintraege werden verworfen und als Warnung gemeldet.

## Exit-Portale

- Exit-Portale sind ein eigener Portal-Typ mit nur einem Eintrittspunkt.
- Sie koennen zu Matchbeginn unsichtbar/inaktiv sein.
- Maps koennen definieren, dass sie erst nach einem Clear-Zustand aktiviert werden.
- Der Trigger-Radius ist groesser als bei normalen Portalen.
- Bei Aktivierung werden sie sichtbar geschaltet und koennen als Ziel/Exit genutzt werden.

## Spezial-Gates

Aktuell existieren genau zwei Gate-Typen:

| Gate | Aktivierung | Wirkung |
| --- | --- | --- |
| `boost` | Ueberqueren der Gate-Ebene in Vorwaertsrichtung | kurzer Vorwaertsschub, setzt Mindesttempo, markiert Boost-Status |
| `slingshot` | Ueberqueren der Gate-Ebene in Vorwaertsrichtung | Vorwaerts- plus Auftriebsschub, kurze Lenksperre |

Weitere Gate-Details:

- Gates haben einen eigenen Radius und einen Entity-Cooldown.
- Standard-Cooldown fuer Gates: `4.0s`, falls die Map nichts anderes in `params.cooldown` vorgibt.
- `boost` liest typischerweise `duration`, `forwardImpulse` und optional `bonusSpeed`.
- `slingshot` liest typischerweise `duration`, `forwardImpulse` und `liftImpulse`.
- Unbekannte Gate-Typen laufen ueber einen sichtbaren Legacy-/Warnpfad; Runtime-Diagnostik behaelt `legacyType` und `warningCode`.
- Gate-Parsing verwirft nicht-objektfoermige oder positionslose Gate-Eintraege mit sichtbaren Warnungen statt stiller `0/0/0`-Normalisierung.
- Hunt-Bots koennen nahe, bereite Special Gates unter hohem Survival-Druck als Retreat-Anker priorisieren.

## Map-seitige Steuerung

Maps koennen folgende Felder verwenden:

- `portalMode`: `dynamic`, `authored` oder `hybrid`.
- `dynamic` ignoriert authored Portal-Knoten bewusst und meldet dies als Runtime-Warnung.
- `authored` verlangt mindestens ein vollstaendiges A/B-Portalpaar; ohne Paar bleibt Dynamic-Fallback bewusst deaktiviert und wird als Warnung ausgewiesen.
- `hybrid` kombiniert authored Paare mit dynamischen Restslots; wenn kein authored Paar vorliegt, faellt die Runtime sichtbar auf dynamic-only zurueck.
- Ungerade authored Portal-Knoten werden nicht still normalisiert: Der letzte Knoten wird verworfen und als Authoring-Vertragswarnung gemeldet.
- `toArenaMapDefinition()` liefert den maschinenlesbaren Portalvertrag unter `map.portalAuthoring` (`mode`, `authoredNodeCount`, `authoredPairCount`, `usesAuthoredPortals`, `usesDynamicPortals`, `hasDanglingPortalNode`).
- `portals`: feste Portal-Paare.
- `preferAuthoredPortals`: feste Portal-Paare gegenueber dynamischen Runtime-Portalen bevorzugen.
- `portalLevels`: feste Hoehen fuer Planar-Portal-/Item-Layouts.
- `itemSpawnMode`: `anchor-only`, `hybrid` oder `fallback-random`; authored Anker werden in `fallback-random` bewusst ignoriert und als Runtime-Warnung gespiegelt.
- Ungueltige `itemSpawnMode`-Werte werden deterministisch auf `anchor-only`/`fallback-random` normalisiert und als Warnhinweis protokolliert.
- Editor-Export, Disk-Save, Import und Playtest zeigen dieselben Schema-Hinweise jetzt bereits vor dem Runtime-Load sichtbar an.
- `anchor-only` deaktiviert Random-Fallback strikt: ohne verfuegbare authored Anchors entstehen keine neuen Item-Spawns.
- `hybrid` nutzt bevorzugt authored Anchors und faellt ohne Anchor sichtbar auf Random-Spawn zurueck.
- `toArenaMapDefinition()` liefert den Spawnvertrag unter `map.itemSpawnAuthoring` (`mode`, `authoredAnchorCount`, `requiresAuthoredAnchor`, `usesAuthoredAnchors`, `usesRandomFallback`, `disablesSpawnWithoutAnchor`).
- `gates`: `boost`- oder `slingshot`-Definitionen.
- `items`: feste Pickup-Anker mit optionalem `pickupType`; ungueltige Typen werden beim Schema-Export sichtbar gemeldet und fallen deterministisch auf `type`/`model` zurueck.
- `exitPortal`: einzelnes Exit-Portal mit optionaler spaeter Aktivierung.

## Relevante Runtime-Module

- `src/entities/Powerup.js`
- `src/entities/player/PlayerEffectOps.js`
- `src/entities/systems/lifecycle/PlayerActionPhase.js`
- `src/entities/systems/lifecycle/PlayerInteractionPhase.js`
- `src/entities/systems/lifecycle/PlayerCollisionPhase.js`
- `src/entities/arena/portal/PortalRuntimeSystem.js`
- `src/entities/arena/portal/PortalLayoutBuilder.js`
- `src/entities/arena/portal/SpecialGateRuntime.js`
- `src/entities/player/PlayerMotionOps.js`
- `src/entities/systems/HuntCombatSystem.js`
- `src/entities/systems/ProjectileSystem.js`
- `src/entities/systems/projectile/ProjectileSimulationOps.js`
