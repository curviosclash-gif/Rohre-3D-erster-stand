# V47: Strategy Pattern — Game-Mode if/else eliminieren

Stand: 2026-03-19

## Motivation

Das Spiel hat aktuell 2 Modi (CLASSIC + HUNT). ~20 Dateien enthalten
`if (isHuntHealthActive())` oder `if (huntModeActive)` Checks. Jeder neue
Modus (z.B. ARCADE) wuerde Aenderungen in all diesen Dateien erfordern.

**Entscheidung: Ein grosses Spiel mit Strategy Pattern statt drei separate Spiele.**

### Abwaegung: Drei separate Spiele vs. ein grosses Spiel

| Kriterium | Drei Spiele (Fight/Classic/Arcade) | Ein Spiel mit Strategy Pattern |
|-----------|-----------------------------------|-------------------------------|
| **Kommerziell** | Drei separate Produkte, schwierigeres Marketing, Nutzer muessen mehrfach installieren | Ein Produkt, ein Download, breitere Zielgruppe |
| **Einfachheit** | Jedes Spiel ist fuer sich einfacher, aber Code-Duplikation ueber Projekte | Eine Codebasis, kein Sync-Aufwand zwischen Projekten |
| **Komplexitaet** | if/else pro Modus entfaellt, aber geteilter Code muss als Library extrahiert werden | Strategy Pattern eliminiert if/else; neuer Modus = neue Klasse |
| **Wartung** | Bug in geteiltem Code muss in 3 Repos gefixt werden | Ein Fix, ein Repo |
| **Nutzer-Erlebnis** | Fragmentiert, Spieler muessen zwischen Apps wechseln | Nahtlos, Modus-Wechsel im Menue |

**Fazit:** Ein grosses Spiel mit Strategy Pattern ist klar ueberlegen.

### Wie das Strategy Pattern die if/else-Komplexitaet loest

**Vorher** (EntityManager, CollisionSystem, ProjectileSystem, ...):
```javascript
if (isHuntHealthActive()) {
    // Hunt-Logik: HP-Damage, Shield-Absorption, Regen...
} else {
    // Classic-Logik: Instant-Kill, Shield=1HP...
}
```

**Nachher:**
```javascript
const died = strategy.handleWallCollision(player, collision, entityManager);
```

Jeder Modus implementiert sein eigenes Verhalten in einer Strategy-Klasse.
Kein if/else mehr in den aufrufenden Systemen.

---

## Phase 0: Foundation (rein additiv, keine Verhaltensaenderung)

### 0.1 `src/modes/GameModeContract.js`

Abstrakte Basis-Klasse mit allen Methoden, die sich zwischen Modi unterscheiden:

```javascript
export class GameModeContract {
    get modeType() { throw new Error('abstract'); }

    // --- Health & Damage ---
    resetPlayerHealth(player, config) {}
    applyDamage(player, amount, options, config) {}
    applyHealing(player, amount, config) {}
    resolveCollisionDamage(cause, config) {}
    grantShield(player, config) {}
    updateHealthRegen(player, dt, config, nowSeconds) {}

    // --- Collision Response ---
    handleWallCollision(player, arenaCollision, entityManager) {}
    handleTrailCollision(player, collision, entityManager) {}

    // --- Actions ---
    requiresShootItemIndex() { return false; }
    hasMachineGun() { return false; }

    // --- Projectiles ---
    resolveRocketProjectileParams(type, config) { return null; }
    resolveProjectileHitOnPlayer(target, projectile, players, system) {}

    // --- Spawning ---
    isRespawnEnabled(config) { return false; }
    filterSpawnableTypes(typeKeys, powerupTypes) { return typeKeys; }
    resolveSpawnType(spawnableTypes, config) {}

    // --- Features ---
    hasScoring() { return false; }
    hasDamageEvents() { return false; }
    hasDestructibleTrails() { return false; }
    isHudVisible() { return false; }
}
```

### 0.2 `src/modes/ClassicModeStrategy.js`

| Methode | Verhalten |
|---------|-----------|
| `modeType` | `'CLASSIC'` |
| `resetPlayerHealth` | maxHp=1, hp=1, shieldHP= hasShield ? 1 : 0 |
| `applyDamage` | Sofortiger Tod (hp=0, isDead=true) |
| `applyHealing` | hp=1 |
| `resolveCollisionDamage` | return 1 |
| `grantShield` | shieldHP=1 |
| `updateHealthRegen` | no-op |
| `handleWallCollision` | Shield-Verlust oder Instant-Kill (Logik aus `PlayerCollisionPhase.js:65-76`) |
| `handleTrailCollision` | Shield-Verlust oder Instant-Kill (Logik aus `PlayerCollisionPhase.js:101-110`) |
| `requiresShootItemIndex` | false |
| `hasMachineGun` | false |
| `resolveRocketProjectileParams` | null |
| `isRespawnEnabled` | false |
| `filterSpawnableTypes` | filtert `huntOnly` Items raus |
| `hasScoring/hasDamageEvents/hasDestructibleTrails/isHudVisible` | false |

### 0.3 `src/modes/HuntModeStrategy.js`

| Methode | Verhalten |
|---------|-----------|
| `modeType` | `'HUNT'` |
| `resetPlayerHealth` | 100hp, 40 shield aus Config |
| `applyDamage` | Shield-Absorption + HP-Reduktion (aus `HealthSystem.js:100-126`) |
| `applyHealing` | Progressives Heilen |
| `resolveCollisionDamage` | Config-Lookup (WALL/TRAIL/PLAYER_CRASH) |
| `grantShield` | Volle Shield HP aus Config |
| `updateHealthRegen` | Regen-Delay + Regen-per-Second |
| `handleWallCollision` | Damage + emitDamageEvent + Kill-if-dead (aus `PlayerCollisionPhase.js:50-64`) |
| `handleTrailCollision` | Damage + emitDamageEvent (aus `PlayerCollisionPhase.js:85-100`) |
| `requiresShootItemIndex` | true |
| `hasMachineGun` | true |
| `resolveRocketProjectileParams` | visualScale, collisionRadius, homingTurnRate etc. aus `CONFIG.HUNT.ROCKET` |
| `isRespawnEnabled` | `config.HUNT.RESPAWN_ENABLED` |
| `filterSpawnableTypes` | filtert `classicOnly` Items raus |
| `resolveSpawnType` | Gewichtete Rocket/Non-Rocket Spawn-Logik (aus `Powerup.js:148-169`) |
| `hasScoring/hasDamageEvents/hasDestructibleTrails/isHudVisible` | true |

### 0.4 `src/modes/GameModeRegistry.js`

```javascript
import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { ClassicModeStrategy } from './ClassicModeStrategy.js';
import { HuntModeStrategy } from './HuntModeStrategy.js';

const FACTORIES = {
    [GAME_MODE_TYPES.CLASSIC]: (config) => new ClassicModeStrategy(config),
    [GAME_MODE_TYPES.HUNT]:    (config) => new HuntModeStrategy(config),
};

export function createGameModeStrategy(modeType, config) {
    const normalized = String(modeType || '').trim().toUpperCase();
    const factory = FACTORIES[normalized] || FACTORIES[GAME_MODE_TYPES.CLASSIC];
    return factory(config);
}
```

### 0.5 Strategy in EntityManager verdrahten

**`src/entities/EntityManager.js`** — Constructor:
```javascript
this.gameModeStrategy = null;
```

**`src/entities/runtime/EntitySetupOps.js`** — nach Setup:
```javascript
owner.gameModeStrategy = createGameModeStrategy(owner.activeGameMode, CONFIG);
```

### 0.6 Tests

`tests/game-mode-strategy.spec.js`:
- ClassicModeStrategy und HuntModeStrategy direkt instanziieren
- Jede Contract-Methode mit Mock-Player-Objekten testen
- Registry-Fallback auf Classic bei unbekanntem Modus testen

**Risiko: Keins** — rein additiv.

---

## Phase 1: Core Gameplay migrieren

### 1.1 `PlayerLifecycleSystem.js`

`const huntModeActive = isHuntHealthActive();`
→ `const strategy = this.entityManager.gameModeStrategy;`

Strategy an beide Phasen weiterreichen.

### 1.2 `PlayerCollisionPhase.js`

Signatur: `run(player, prevPos, huntModeActive)` → `run(player, prevPos, strategy)`

Wall-Collision (Zeilen 50-76): Gesamter if/else-Block → `strategy.handleWallCollision()`
Trail-Collision (Zeilen 85-110): Gesamter if/else-Block → `strategy.handleTrailCollision()`

### 1.3 `PlayerActionPhase.js`

Signatur: `run(player, input, huntModeActive)` → `run(player, input, strategy)`

- `if (huntModeActive && ...)` → `if (strategy.requiresShootItemIndex() && ...)`
- `if (input.shootMG && huntModeActive)` → `if (input.shootMG && strategy.hasMachineGun())`

### 1.4 `HealthSystem.js`

Bestehende Funktionen bleiben erhalten (Backward-Compat), mit `@deprecated` Marker.

**Risiko: Mittel** — Core-Gameplay. Verifizieren mit `physics-hunt.spec.js` + `physics-core.spec.js`.

---

## Phase 2: Projectile-Systeme migrieren

### 2.1 `ProjectileSystem.js`

`isHuntHealthActive() && isRocketTierType(type)` →
`strategy.resolveRocketProjectileParams(type, config)`

### 2.2 `ProjectileHitResolver.js`

Hit-Resolution Branch → Strategy-Aufruf.

### 2.3 `DestructibleTrail.js`

`!isHuntHealthActive()` → `!strategy?.hasDestructibleTrails()`

**Risiko: Mittel** — Rocket-Verhalten gameplay-sensitiv. Tests T61-T64 decken ab.

---

## Phase 3: EntityManager-Interna migrieren

- Respawn-Guard → `this.gameModeStrategy?.isRespawnEnabled()`
- DamageEvent-Guard → `this.gameModeStrategy?.hasDamageEvents()`
- Scoring-Guard → `this.gameModeStrategy?.hasScoring()`

**Risiko: Niedrig** — nur Guard-Conditions.

---

## Phase 4: Combat/Gun/Respawn migrieren

- `HuntCombatSystem.js` — Lock-On via Strategy
- `OverheatGunSystem.js` — `!isHuntHealthActive()` → `!strategy.hasMachineGun()`
- `RespawnSystem.js` — `isHuntHealthActive()` → `strategy.isRespawnEnabled()`

**Risiko: Niedrig** — isolierte Guard-Aenderungen.

---

## Phase 5: Powerup-Spawning migrieren

`Powerup.js` Zeilen 128-169:
- Type-Filtering → `strategy.filterSpawnableTypes()`
- Spawn-Resolution → `strategy.resolveSpawnType()`

**Risiko: Mittel** — beeinflusst Balance.

---

## Phase 6: Optionale Cleanup (Config/Bot/UI)

Folgende Dateien brauchen **keine Pflichtaenderung**:

| Datei | Begruendung |
|-------|------------|
| `RuntimeConfig.js` | Config-Resolution, nicht Runtime |
| `BotPolicyRegistry.js` | Bereits string-basiert |
| `BotPolicyTypes.js` | Bereits parametrisiert |
| `SettingsManager.js` | Menue-Validierung |
| `UIManager.js` | Menue-Sync |
| `GameRuntimeFacade.js` | Setzt Mode-String |
| `BotRuntimeContextFactory.js` | Optional: `strategy.modeType` statt `isHuntHealthActive()` |
| `HuntHUD.js` | Optional: `strategy.isHudVisible()` |

---

## Phase 7: Cleanup

- `isHuntHealthActive` Imports aus migrierten Dateien entfernen
- `isHuntHealthActive()` in HealthSystem.js als `@deprecated` markieren
- Tote if/else-Branches entfernen

---

## Datei-Uebersicht

| # | Datei | Aenderungstyp | Phase | Risiko |
|---|-------|--------------|-------|--------|
| 1 | `src/modes/GameModeContract.js` | **NEU** | 0 | Keins |
| 2 | `src/modes/ClassicModeStrategy.js` | **NEU** | 0 | Keins |
| 3 | `src/modes/HuntModeStrategy.js` | **NEU** | 0 | Keins |
| 4 | `src/modes/GameModeRegistry.js` | **NEU** | 0 | Keins |
| 5 | `tests/game-mode-strategy.spec.js` | **NEU** | 0 | Keins |
| 6 | `src/entities/EntityManager.js` | Property + 3 Guards | 0+3 | Niedrig |
| 7 | `src/entities/runtime/EntitySetupOps.js` | 1 Zeile | 0 | Keins |
| 8 | `src/entities/systems/PlayerLifecycleSystem.js` | Strategy statt bool | 1 | Niedrig |
| 9 | `src/entities/systems/lifecycle/PlayerCollisionPhase.js` | if/else → Strategy | 1 | **Mittel** |
| 10 | `src/entities/systems/lifecycle/PlayerActionPhase.js` | bool → Strategy | 1 | Niedrig |
| 11 | `src/hunt/HealthSystem.js` | Deprecation | 1 | Niedrig |
| 12 | `src/entities/systems/ProjectileSystem.js` | Rocket-Params → Strategy | 2 | **Mittel** |
| 13 | `src/entities/systems/projectile/ProjectileHitResolver.js` | Hit → Strategy | 2 | **Mittel** |
| 14 | `src/hunt/DestructibleTrail.js` | Guard → Strategy | 2 | Niedrig |
| 15 | `src/entities/systems/HuntCombatSystem.js` | Lock-On → Strategy | 4 | Niedrig |
| 16 | `src/hunt/OverheatGunSystem.js` | Guard → Strategy | 4 | Niedrig |
| 17 | `src/hunt/RespawnSystem.js` | Guard → Strategy | 4 | Niedrig |
| 18 | `src/entities/Powerup.js` | Spawn → Strategy | 5 | **Mittel** |

---

## Verifikation

### Nach jeder Phase:
1. `npm test` — alle bestehenden Tests gruen
2. Manueller Playtest Classic: Wandkollision, Trail-Kollision, Shield, Tod
3. Manueller Playtest Hunt: MG, Rocket, Damage, Respawn, Trail-Zerstoerung

### Kritische Tests:
- `tests/physics-hunt.spec.js` — T61, T62a/b, T63/T64, T83-89e
- `tests/physics-core.spec.js` — Classic Collision/Death
- `tests/physics-policy.spec.js` — Bot Policy Resolution
- `tests/core.spec.js` — Game Startup/Setup
- `tests/game-mode-strategy.spec.js` — **NEU**

### Proof-of-Concept:
Leere `ArcadeModeStrategy extends GameModeContract` in Registry registrieren.
Spiel startet fehlerfrei → Refactoring erfolgreich.
