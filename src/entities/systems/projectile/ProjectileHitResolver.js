import { applyTrailDamageFromProjectile } from '../../../hunt/DestructibleTrail.js';

export class ProjectileHitResolver {
    constructor(system) {
        this.system = system || null;
        this._tmpVec = this.system?._tmpVec || null;
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

        const strategy = this.system?.getStrategy?.();
        const trailHit = applyTrailDamageFromProjectile(trailSpatialIndex, projectile, { strategy });
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

            if (strategy) {
                strategy.resolveProjectileHitOnPlayer(target, projectile, players, this.system);
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
