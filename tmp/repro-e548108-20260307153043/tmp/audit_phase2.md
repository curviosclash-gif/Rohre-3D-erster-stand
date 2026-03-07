## Phase 2: Entitäten & Gameplay-Systeme

- **EntityManager**: Loop über alle Objekte. Verbindet Systeme (Particles, Collision, Powerups).
- **Player & Bot**: Extrem große Klassen. `Player` managed Three.js Models, Inventar und Steuerung direkt (Kopplung von Logik und Darstellung). `Bot.js` hat eine Raycast-ähnliche "Probe"-Mechanik zur Kollisionsvermeidung. PPO_V2 Integration ist nicht im Haupt-Bot (wahrscheinlich über ML-System ausgelagert oder fehlt hier).
- **Arena**: Kürzlich refactored in `ArenaBuilder`, `ArenaCollision`, `PortalGateSystem`. Ziemlich sauber.
- **Hunt-Modus**: Hitscan-MG in `OverheatGunSystem`, Raketen-Pickups getrennt. `HealthSystem` entkoppelt von `Player.js`. `HuntBotPolicy` erweitert Standard-Bot-Verhalten gezielt um MG und Raketen-Nutzung.
