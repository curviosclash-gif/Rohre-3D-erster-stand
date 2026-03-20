// ============================================
// ArcadeModeStrategy.js - Arcade mode (survival gauntlet, HP, scoring)
// Stub: extends Hunt-like HP/damage defaults so the game starts cleanly.
// Full Arcade-specific mechanics (combo, sectors, mastery) will be wired
// once the V45 run-layer is integrated.
// ============================================

import { GameModeContract } from './GameModeContract.js';

const DEFAULT_MAX_HP = 100;
const DEFAULT_SHIELD_HP = 40;

function toSafe(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function nowSeconds() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now() * 0.001;
    }
    return Date.now() * 0.001;
}

export class ArcadeModeStrategy extends GameModeContract {
    get modeType() { return 'ARCADE'; }

    // --- Health & Damage ---
    resetPlayerHealth(player) {
        if (!player) return null;
        player.maxHp = DEFAULT_MAX_HP;
        player.hp = DEFAULT_MAX_HP;
        player.maxShieldHp = DEFAULT_SHIELD_HP;
        player.shieldHP = player.hasShield ? DEFAULT_SHIELD_HP : 0;
        player.lastDamageTimestamp = -Infinity;
        player.shieldHitFeedback = 0;
        return player;
    }

    applyDamage(player, amount, options) {
        if (!player) return { applied: 0, absorbedByShield: 0, remainingHp: 0, isDead: true };
        const dmg = Math.max(0, toSafe(amount, 0));
        if (dmg <= 0) {
            return { applied: 0, absorbedByShield: 0, remainingHp: Math.max(0, toSafe(player.hp, 0)), isDead: toSafe(player.hp, 0) <= 0 };
        }

        let remaining = dmg;
        let absorbed = 0;
        if (!options?.ignoreShield && player.shieldHP > 0) {
            absorbed = Math.min(player.shieldHP, remaining);
            player.shieldHP = Math.max(0, player.shieldHP - absorbed);
            remaining -= absorbed;
            if (absorbed > 0) {
                const shieldMax = Math.max(1, player.maxShieldHp || DEFAULT_SHIELD_HP);
                player.shieldHitFeedback = Math.max(player.shieldHitFeedback || 0, Math.min(1, Math.max(0.2, absorbed / shieldMax)));
            }
            if (player.shieldHP <= 0) player.hasShield = false;
        }

        if (remaining > 0) {
            player.hp = Math.max(0, toSafe(player.hp, player.maxHp) - remaining);
            player.lastDamageTimestamp = toSafe(options?.nowSeconds, nowSeconds());
        }

        return { applied: dmg, absorbedByShield: absorbed, remainingHp: player.hp, isDead: player.hp <= 0 };
    }

    applyHealing(player, amount) {
        if (!player) return { healed: 0, hp: 0 };
        const heal = Math.max(0, toSafe(amount, 0));
        if (heal <= 0) return { healed: 0, hp: toSafe(player.hp, 0) };
        const maxHp = Math.max(1, toSafe(player.maxHp, DEFAULT_MAX_HP));
        const before = Math.max(0, toSafe(player.hp, maxHp));
        player.hp = Math.min(maxHp, before + heal);
        return { healed: player.hp - before, hp: player.hp };
    }

    resolveCollisionDamage(cause) {
        const key = String(cause || '').toUpperCase();
        if (key === 'TRAIL' || key === 'TRAIL_SELF' || key === 'TRAIL_OTHER') return 34;
        if (key === 'PLAYER_CRASH') return 40;
        return 22;
    }

    grantShield(player) {
        if (!player) return 0;
        player.hasShield = true;
        player.maxShieldHp = DEFAULT_SHIELD_HP;
        player.shieldHP = DEFAULT_SHIELD_HP;
        player.shieldHitFeedback = 0;
        return player.shieldHP;
    }

    updateHealthRegen() { /* no regen in Arcade stub — will be replaced by sector-based healing */ }

    // --- Collision Response ---
    handleWallCollision(player, arenaCollision, entityManager) {
        const wallDamage = this.resolveCollisionDamage('WALL');
        const damageResult = player.takeDamage(wallDamage);
        entityManager._emitHuntDamageEvent({
            target: player,
            sourcePlayer: null,
            cause: 'WALL',
            hitNormal: arenaCollision.normal || null,
            damageResult,
            impactPoint: player.position,
        });
        if (damageResult.isDead) {
            entityManager._killPlayer(player, 'WALL');
            return true;
        }
        return false;
    }

    handleTrailCollision(player, collision, trailCause, sourcePlayer, entityManager) {
        const damageResult = player.takeDamage(this.resolveCollisionDamage('TRAIL'));
        entityManager._emitHuntDamageEvent({
            target: player,
            sourcePlayer,
            cause: trailCause,
            damageResult,
            impactPoint: player.position,
        });
        if (damageResult.isDead) {
            entityManager._killPlayer(player, trailCause, { killer: sourcePlayer || null });
            return true;
        }
        return false;
    }

    // --- Actions ---
    requiresShootItemIndex() { return false; }
    hasMachineGun() { return false; }

    // --- Projectiles ---
    resolveRocketProjectileParams() { return null; }
    resolveProjectileHitOnPlayer(target, projectile, _players, system) {
        if (target.hasShield) {
            target.hasShield = false;
        } else {
            target.applyPowerup(projectile.type);
            system?.onProjectilePowerup?.(target, projectile);
        }
    }

    // --- Spawning ---
    isRespawnEnabled() { return false; }

    filterSpawnableTypes(typeKeys, powerupTypes) {
        return typeKeys.filter((typeKey) => {
            const entry = powerupTypes[typeKey];
            if (!entry) return false;
            if (entry.huntOnly) return false;
            return true;
        });
    }

    resolveSpawnType(spawnableTypes) {
        return spawnableTypes[Math.floor(Math.random() * spawnableTypes.length)];
    }

    // --- Features ---
    hasScoring() { return true; }
    hasDamageEvents() { return true; }
    hasDestructibleTrails() { return false; }
    isHudVisible() { return true; }
}
