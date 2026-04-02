import { HUNT_CONFIG } from '../../../hunt/HuntConfig.js';
import { isHuntHealthActive } from '../../../hunt/HealthSystem.js';
import { isRocketTierType, resolveRocketTierDamage } from '../../../hunt/RocketPickupSystem.js';
import { applyTrailDamageFromProjectile } from '../../../hunt/DestructibleTrail.js';
import { resolveEntityRuntimeConfig } from '../../../shared/contracts/EntityRuntimeConfig.js';

export class ProjectileHitResolver {
    constructor(system) {
        this.system = system || null;
        this._tmpVec = this.system?._tmpVec || null;
    }

    _applyRocketExplosion(projectile, players, directHitTarget) {
        const rocketConfig = resolveEntityRuntimeConfig(this.system)?.HUNT?.ROCKET || HUNT_CONFIG.ROCKET;
        const explosionRadius = Math.max(1, Number(rocketConfig?.EXPLOSION_RADIUS || 25));
        const explosionDamageFalloff = Math.max(0, Math.min(1, Number(rocketConfig?.EXPLOSION_DAMAGE_FALLOFF || 0.5)));
        const baseDamage = resolveRocketTierDamage(projectile.type, this.system);
        const damageAtCenter = baseDamage * (1 + explosionDamageFalloff);

        for (const target of players || []) {
            if (!target.alive || target === projectile.owner || target === directHitTarget) continue;

            const distanceToTarget = target.position.distanceTo(projectile.position);
            if (distanceToTarget > explosionRadius) continue;

            const damageFalloff = 1 - (distanceToTarget / explosionRadius) * explosionDamageFalloff;
            const explosionDamage = Math.max(1, Math.floor(damageAtCenter * damageFalloff));
            const damageResult = target.takeDamage(explosionDamage);
            this.system?.onProjectileDamage?.(target, projectile.owner, projectile.type, damageResult, projectile);
        }
    }

    resolveProjectileOutcome(projectile, players, trailSpatialIndex, simulationResult) {
        if (!projectile || !simulationResult) return false;

        const projectileExpired = !!simulationResult.projectileExpired;
        const projectileHitArena = !!simulationResult.projectileHitArena;
        const bouncedOnFoam = !!simulationResult.bouncedOnFoam;

        if (projectileExpired || (projectileHitArena && !bouncedOnFoam)) {
            this.system?.onProjectileHit?.(projectile.position, 0xffff00, projectile.owner, projectile);
            return true;
        }

        if (bouncedOnFoam) {
            return false;
        }

        const trailHit = applyTrailDamageFromProjectile(trailSpatialIndex, projectile);
        if (trailHit) {
            if (this._tmpVec) {
                if (trailHit.closestPoint) {
                    this._tmpVec.set(
                        trailHit.closestPoint.closestX,
                        trailHit.closestPoint.closestY,
                        trailHit.closestPoint.closestZ
                    );
                } else {
                    this._tmpVec.copy(projectile.position);
                }
                this.system?.onTrailSegmentHit?.(this._tmpVec, projectile.owner, projectile, trailHit);
            } else {
                this.system?.onTrailSegmentHit?.(projectile.position, projectile.owner, projectile, trailHit);
            }

            // Trail-overflow damage is disabled for rockets to keep trail impacts
            // isolated from direct HP damage in hunt lock-on scenarios.
            const allowOverflowDamage = !isRocketTierType(projectile.type);
            if (allowOverflowDamage && trailHit.overflowDamage > 0 && trailHit.entry) {
                const trailOwnerIndex = trailHit.entry.playerIndex;
                const trailOwner = (players || []).find(
                    p => p && p.alive && Number(p.index) === trailOwnerIndex
                );
                if (trailOwner && trailOwner !== projectile.owner) {
                    const damageResult = trailOwner.takeDamage(trailHit.overflowDamage);
                    this.system?.onProjectileDamage?.(
                        trailOwner, projectile.owner, projectile.type, damageResult, projectile
                    );
                }
            }

            return true;
        }

        let hit = false;
        for (const target of players || []) {
            if (!target.alive || target === projectile.owner) continue;

            if (target.isPointInOBB && target.isPointInOBB(projectile.position)) {
                hit = true;
            } else {
                const hitRadius = target.hitboxRadius + projectile.radius;
                if (target.position.distanceToSquared(projectile.position) <= hitRadius * hitRadius) {
                    hit = true;
                }
            }

            if (!hit) continue;

            const huntRocketHit = isHuntHealthActive(resolveEntityRuntimeConfig(this.system)) && isRocketTierType(projectile.type);
            if (huntRocketHit) {
                const damage = resolveRocketTierDamage(projectile.type, this.system);
                const damageResult = target.takeDamage(damage);
                this.system?.onProjectilePowerup?.(target, projectile);
                this.system?.onProjectileDamage?.(target, projectile.owner, projectile.type, damageResult, projectile);
                this._applyRocketExplosion(projectile, players, target);
            } else if (target.hasShield) {
                target.hasShield = false;
            } else {
                target.applyPowerup(projectile.type);
                this.system?.onProjectilePowerup?.(target, projectile);
            }
            break;
        }

        return hit;
    }
}
