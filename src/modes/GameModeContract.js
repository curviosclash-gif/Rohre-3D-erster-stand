// ============================================
// GameModeContract.js - abstract base class for game mode strategies
// ============================================

export class GameModeContract {
    get modeType() { throw new Error('abstract: modeType'); }

    // --- Health & Damage ---
    resetPlayerHealth(player, config) { void player; void config; }
    applyDamage(player, amount, options, config) { void player; void amount; void options; void config; return { applied: 0, absorbedByShield: 0, remainingHp: 0, isDead: false }; }
    applyHealing(player, amount, config) { void player; void amount; void config; return { healed: 0, hp: 0 }; }
    resolveCollisionDamage(cause, config) { void cause; void config; return 1; }
    grantShield(player, config) { void player; void config; return 0; }
    updateHealthRegen(player, dt, config, nowSeconds) { void player; void dt; void config; void nowSeconds; }

    // --- Collision Response ---
    handleWallCollision(player, arenaCollision, entityManager) { void player; void arenaCollision; void entityManager; return false; }
    handleTrailCollision(player, collision, trailCause, sourcePlayer, entityManager) { void player; void collision; void trailCause; void sourcePlayer; void entityManager; return false; }

    // --- Actions ---
    requiresShootItemIndex() { return false; }
    hasMachineGun() { return false; }

    // --- Projectiles ---
    resolveRocketProjectileParams(type, config) { void type; void config; return null; }
    resolveProjectileHitOnPlayer(target, projectile, players, system) { void target; void projectile; void players; void system; }

    // --- Spawning ---
    isRespawnEnabled(config) { void config; return false; }
    filterSpawnableTypes(typeKeys, powerupTypes, huntModeActive) { void powerupTypes; void huntModeActive; return typeKeys; }
    resolveSpawnType(spawnableTypes, config) { void config; return spawnableTypes[Math.floor(Math.random() * spawnableTypes.length)]; }

    // --- Features ---
    hasScoring() { return false; }
    hasDamageEvents() { return false; }
    hasDestructibleTrails() { return false; }
    isHudVisible() { return false; }
}
