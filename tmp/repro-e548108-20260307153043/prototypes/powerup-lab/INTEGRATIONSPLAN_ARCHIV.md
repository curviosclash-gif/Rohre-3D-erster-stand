# Integrationsplan Archiv (Powerup Lab)

Stand: 22.02.2026

## Ziel

Das `Powerup Lab` soll langfristig in das Hauptspiel ueberfuehrt werden, so dass neue Powerups zuerst sicher testbar sind und spaeter gezielt in andere Maps integriert werden koennen.

## Kernentscheidung (Empfehlung)

Nicht das komplette Standalone-Lab 1:1 ins Hauptspiel uebernehmen.

Stattdessen:

1. `Standalone Lab` behalten (schnelles Prototyping / Ideen testen)
2. `Test-Map im Hauptspiel` bauen (echte Spielphysik, echte Kollisionen, echtes Balancing)
3. `Datengetriebenes Trigger-System` schaffen, damit Powerups spaeter pro Map aktiviert werden koennen

## Warum das sinnvoll ist

- Das Standalone-Lab nutzt eigene Demo-Logik (`DemoPlayer`) und bildet nicht exakt das Hauptspiel ab.
- Fuer echtes Verhalten muessen Powerups mit `Player`, `EntityManager`, Arena-Kollision, Trail, Portalen usw. getestet werden.
- Eine Test-Map im Hauptspiel erlaubt realistische Validierung, ohne normale Maps zu destabilisieren.

## Zielbild Architektur

Powerups in 5 Bausteine aufteilen:

1. `Effektlogik` (was passiert beim Aktivieren)
2. `Trigger-Objekte` (Gate / Bubble / Beacon)
3. `Visuals / Mesh / FX`
4. `Map-Platzierung` (datengetrieben)
5. `Status/Freigabe` (`prototype`, `beta`, `stable`)

## Empfohlene Organisation

### A) Standalone-Lab bleibt erhalten

- Pfad: `prototypes/powerup-lab/`
- Zweck: schnelle Iteration, neue Ideen, visuelles Experimentieren

### B) Ingame-Test-Map einfuehren

- Eine dedizierte Karte nur fuer experimentelle Powerups
- Enthält alle neuen Trigger zum Testen unter echten Spielbedingungen
- Optional mit Debug-HUD (Trigger, Cooldowns, aktive Effekte)

### C) Neues Trigger-System im Hauptspiel

- Bestehende Pickup-Wuerfel aus `js/modules/Powerup.js` vorerst getrennt lassen
- Neues System fuer `World Trigger Powerups` (Gates/Bubbles/Beacons) daneben aufbauen

## Technischer Integrationsplan (Phasen)

### Phase 1: Minimal integrieren (Boost Portal)

Ziel:
- Nur `Boost Portal` ins Hauptspiel bringen
- Ein erster End-to-End-Pfad fuer Trigger + Effekt + Visuals

Arbeitspunkte:
1. Effektlogik fuer Boost in `Player`/`EntityManager` sauber abbilden
2. Trigger-Objekt fuer Portal-Durchflug einfuehren
3. Eine Test-Map mit einem oder mehreren Boost-Portalen bauen
4. Balancing pruefen (Schub, Dauer, Cooldown)

### Phase 2: Allgemeines Trigger-Framework

Ziel:
- Wiederverwendbare Basis fuer alle Welt-Powerups

Arbeitspunkte:
1. Registry fuer Powerups/Trigger anlegen
2. Einheitliches Trigger-Update im Spiel-Loop
3. Gemeinsame Aktivierungs-/Cooldown-Logik
4. Map-Definition fuer Trigger-Platzierung

### Phase 3: Weitere Prototypen ueberfuehren

Kandidaten aus dem Lab:
- `Blink Gate`
- `Slingshot Gate`
- `Magnet Tunnel`
- `Chrono Bubble`
- `Resonance Beacon`
- `Apex Brake Field`

Vorgehen je Powerup:
1. Effektlogik ins Hauptspiel uebertragen
2. Trigger-Visual im Hauptspiel bauen
3. Test-Map pruefen
4. Status auf `beta` / `stable`

### Phase 4: Map-Integration (datengetrieben)

Ziel:
- Powerups pro Map aktivierbar machen

Arbeitspunkte:
1. `MapSchema` erweitern (Trigger-Definitionen)
2. Laden/Speichern der Trigger in bestehenden Maps
3. Feature-Flags / Statusfilter pro Map

### Phase 5: Editor-Support (spaeter)

Ziel:
- Platzierung und Tuning direkt im Editor

Arbeitspunkte:
1. Editor-Palette fuer Powerup-Trigger
2. Parameter-Editor (Cooldown, Radius, Dauer, Staerke)
3. Preview/Debug-Anzeige

## Vorschlag fuer Datenmodell (Beispiel)

Map-Trigger (skizziert):

```json
{
  "kind": "powerupTrigger",
  "powerupId": "boost_portal",
  "position": [0, 5, -40],
  "rotation": [0, 0, 0],
  "params": {
    "cooldown": 4.5,
    "bonusSpeed": 58,
    "duration": 1.6
  },
  "status": "prototype"
}
```

## Freigabe-Workflow (empfohlen)

1. Idee entsteht im `Standalone Lab`
2. Uebernahme in `Test-Map` (Hauptspiel)
3. Gameplay-/Kollisions-/Balancing-Tests
4. Statuswechsel auf `beta`
5. Einsatz in normalen Maps
6. Statuswechsel auf `stable`

## Ordnerstruktur (Vorschlag)

- `prototypes/powerup-lab/` (bleibt fuer schnelle Prototypen)
- `js/powerups/core/` (Runtime, Registry)
- `js/powerups/effects/` (Effektlogik)
- `js/powerups/triggers/` (Trigger-Objekte)
- `js/powerups/visuals/` (Meshes/FX)
- `js/maps/test/` (Test-Map(s) fuer Powerups)

## Empfehlung fuer den ersten echten Umsetzungsschritt

Start mit `Boost Portal`, danach Trigger-Framework generalisieren.

Grund:
- Hoher Gameplay-Nutzen
- Klarer Durchflug-Trigger
- Effekt ist relativ direkt und gut balancierbar

