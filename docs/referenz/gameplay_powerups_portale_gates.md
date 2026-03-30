# Gameplay-Referenz: Powerups, Portale und Gates

Stand: 2026-03-30

## Zweck

Diese Uebersicht beschreibt die aktuell im Code vorhandenen Powerups, Portale, Exit-Portale und Spezial-Gates sowie deren Laufzeitverhalten.

## Grundablauf fuer Items

- Items spawnen ueber den `PowerupManager`.
- Auf Maps mit festen `items`-Ankern werden bevorzugt diese Positionen genutzt.
- Ein eingesammeltes Item landet im Inventar des Spielers.
- `useItem` verbraucht das Item als Selbst-Effekt.
- `shootItem` verschiesst das Item als Projektil.
- In Classic und Arcade uebertragen Projektil-Treffer den Item-Effekt auf das Ziel.
- In Hunt sind Raketen echte Schadens-Projektile; normale Status-Items bleiben Selbst-Effekte.

## Powerup-Typen

| Typ | Selbstnutzung | Projektil | Wirkung | Modus |
| --- | --- | --- | --- | --- |
| `SPEED_UP` | ja | ja in Classic/Arcade | `baseSpeed * 1.6` fuer 4s | alle |
| `SLOW_DOWN` | ja | ja in Classic/Arcade | `baseSpeed * 0.5` fuer 4s | alle |
| `THICK` | ja | ja in Classic/Arcade | Trailbreite auf `1.8` fuer 5s | alle |
| `THIN` | ja | ja in Classic/Arcade | Trailbreite auf `0.2` fuer 5s | alle |
| `SHIELD` | ja | ja in Classic/Arcade | Shield aktiv; in Hunt mit `shieldHP`, sonst Schutz fuer den naechsten Treffer | alle |
| `SLOW_TIME` | ja | ja in Classic/Arcade | setzt globale Spielzeit auf `0.4x`, solange aktiv | alle |
| `GHOST` | ja | ja in Classic/Arcade | ignoriert Wand- und Trail-Kollisionen waehrend der Laufzeit | alle |
| `INVERT` | ja | ja in Classic/Arcade | invertiert die Steuerung fuer 4s | alle |
| `ROCKET_WEAK` | ja, aber praktisch fuer Schuss gedacht | ja | 10 Schaden | Hunt |
| `ROCKET_MEDIUM` | ja, aber praktisch fuer Schuss gedacht | ja | 20 Schaden | Hunt |
| `ROCKET_HEAVY` | ja, aber praktisch fuer Schuss gedacht | ja | 40 Schaden | Hunt |
| `ROCKET_MEGA` | ja, aber praktisch fuer Schuss gedacht | ja | 70 Schaden | Hunt |

## Wichtige Item-Details

- Inventarlimit: `5`.
- Feldlimit gleichzeitig gespawnter Items: `10`.
- Spawnintervall: `3.0s`.
- Pickup-Radius: `2.5`.
- In Planar-Maps koennen freie Spawns auf `portalLevels` gelegt werden.
- Map-Autoren koennen per `pickupType` feste Item-Typen an Anchors erzwingen.
- `GHOST` und Spawn-Schutz ueberspringen den normalen Wand-/Trail-Kollisionspfad komplett.
- In Hunt haben Item-Selbstnutzungen einen Cooldown; fuer `SHIELD` gilt ein eigener Mindest-Cooldown.

## Normale Portale

- Normale Portale sind immer paarweise aufgebaut: `A <-> B`.
- Spieler und Projektile koennen beide teleportieren.
- Trigger-Radius: `4.0`.
- Pro Entity wird ein Cooldown gesetzt, damit kein direktes Rueck-Teleportieren passiert.
- Der Cooldown ist dynamisch: mindestens `1.2s`, je nach Distanz bis maximal `2.5s`.
- Spieler landen am Zielportal plus kleinem Vorwaerts-Offset.
- Im Planar-Mode wird beim Teleport auch die aktive Ebene (`currentPlanarY`) auf die Zielhoehe gesetzt.
- Projektile behalten ihre Flugrichtung und werden am Ausgang leicht nach vorne versetzt.

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
- Im Map-Schema werden unbekannte Gate-Typen aktuell auf `boost` normalisiert.

## Map-seitige Steuerung

Maps koennen folgende Felder verwenden:

- `portals`: feste Portal-Paare.
- `preferAuthoredPortals`: feste Portal-Paare gegenueber dynamischen Runtime-Portalen bevorzugen.
- `portalLevels`: feste Hoehen fuer Planar-Portal-/Item-Layouts.
- `gates`: `boost`- oder `slingshot`-Definitionen.
- `items`: feste Pickup-Anker mit optionalem `pickupType`.
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
