# Powerup Lab (Prototype)

Separater Prototyp-Ordner fuer neue Powerup-Ideen. Keine Integration ins Hauptspiel (`js/main.js`, `EntityManager`, `PowerupManager`) erfolgt.

## Archiv / Zukunftsplanung

- Integrationsplan (archiviert): `INTEGRATIONSPLAN_ARCHIV.md`

## Enthaltene Prototypen

- `BoostPortalPowerup`: Ring/Portal zum Durchfliegen, gibt starken Vorwaertsschub + kurzen Speed-Surge.
- `SlingshotGatePowerup`: Impuls-Gate mit leichter Aufwaertskraft und zeitlich begrenzter Flugstabilisierung.
- `MagnetTunnelPowerup`: Gewaehrt Magnet-Aura, zieht `Energy Shards` in der Naehe an.
- `ChronoBubblePowerup`: Aktiviert kurze Zeitdilatation (Welt langsamer, Spieler bleibt schnell).
- `BlinkGatePowerup`: Kurzsprung/Teleport nach vorne mit kleinem Exit-Impuls.
- `ResonanceBeaconPowerup`: Verdoppelt eingesammelte Shard-Energie fuer eine kurze Zeit.
- `ApexBrakeFieldPowerup`: Reduziert Topspeed kurzzeitig, verbessert dafuer Kontrolle/Lenkbarkeit.

## Starten (lokal)

1. `npm run dev`
2. Im Browser `http://localhost:5173/prototypes/powerup-lab/` aufrufen

## Struktur

- `index.html`, `style.css`, `main.js`: isolierter Demo-Entry
- `src/PowerupLabApp.js`: Demo-Szene, Kamera, HUD, Platzierung
- `src/DemoPlayer.js`: kleine Flugphysik + Effektzustand
- `src/powerups/*`: einzelne Powerup-Prototypen (visuell + Trigger + Effekt)
- `src/EnergyShardField.js`: Demo-Collectibles fuer den Magnet-Prototyp

## Spaetere Integration (Skizze)

- Trigger-/Gate-Logik aus `src/powerups/PrototypePowerupBase.js` in einen neuen Manager fuer "World Triggers" uebernehmen.
- Effekte in `Player`/`EntityManager` auf echte Spielwerte mappen (Speed, Shield, Zeitfaktor, Magnet fuer Pickups).
- Visuals der Prototypen koennen direkt als Startpunkt fuer spaetere Ingame-Meshes dienen.
