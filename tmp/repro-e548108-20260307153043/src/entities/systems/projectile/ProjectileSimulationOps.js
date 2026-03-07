import * as THREE from 'three';
import { CONFIG } from '../../../core/Config.js';

export class ProjectileSimulationOps {
    constructor(system) {
        this.system = system || null;
        this._tmpVec = new THREE.Vector3();
        this._tmpVec2 = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
        this._stepResult = {
            projectileExpired: false,
            projectileHitArena: false,
            bouncedOnFoam: false,
            arenaCollision: null,
        };
    }

    acquireHomingTarget(projectile, players) {
        if (!projectile || !Array.isArray(players) || players.length === 0) return null;

        const owner = projectile.owner;
        const maxRange = Math.max(10, Number(projectile.homingRange || CONFIG?.HOMING?.MAX_LOCK_RANGE || 100));
        const maxRangeSq = maxRange * maxRange;
        const lockOnAngle = Math.max(5, Number(projectile.homingLockOnAngle || CONFIG?.HOMING?.LOCK_ON_ANGLE || 15));
        const minDot = Math.cos(THREE.MathUtils.degToRad(lockOnAngle));

        this._tmpVec2.copy(projectile.velocity);
        const speed = this._tmpVec2.length();
        if (speed <= 0.0001) return null;
        this._tmpVec2.divideScalar(speed);

        let bestTarget = null;
        let bestDistSq = Infinity;
        let bestFallbackTarget = null;
        let bestFallbackDistSq = Infinity;
        for (const target of players) {
            if (!target || !target.alive || target === owner) continue;

            this._tmpVec.subVectors(target.position, projectile.position);
            const distSq = this._tmpVec.lengthSq();
            if (distSq <= 1 || distSq > maxRangeSq) continue;
            if (distSq < bestFallbackDistSq) {
                bestFallbackDistSq = distSq;
                bestFallbackTarget = target;
            }

            const distance = Math.sqrt(distSq);
            this._tmpDir.copy(this._tmpVec).multiplyScalar(1 / distance);
            if (this._tmpVec2.dot(this._tmpDir) < minDot) continue;

            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestTarget = target;
            }
        }
        if (bestTarget) return bestTarget;
        return projectile.huntRocket ? bestFallbackTarget : null;
    }

    bounceProjectileOnFoam(projectile, collisionInfo) {
        if (!projectile || !collisionInfo?.normal) return false;

        const maxFoamBounces = 3;
        if ((projectile.foamBounces || 0) >= maxFoamBounces) return false;
        if ((projectile.foamBounceCooldown || 0) > 0) return false;

        this._tmpVec.copy(projectile.velocity);
        const speed = this._tmpVec.length();
        if (speed <= 0.0001) return false;

        this._tmpVec2.copy(collisionInfo.normal).normalize();
        if (this._tmpVec.dot(this._tmpVec2) >= 0) {
            this._tmpVec2.multiplyScalar(-1);
        }

        this._tmpVec.normalize().reflect(this._tmpVec2);
        this._tmpVec.addScaledVector(this._tmpVec2, 0.08).normalize();
        projectile.velocity.copy(this._tmpVec.multiplyScalar(speed * 1.02));

        projectile.position.addScaledVector(this._tmpVec2, Math.max(0.2, projectile.radius * 1.25));
        projectile.mesh.position.copy(projectile.position);
        this._tmpVec.addVectors(projectile.position, projectile.velocity);
        projectile.mesh.lookAt(this._tmpVec);

        projectile.foamBounces = (projectile.foamBounces || 0) + 1;
        projectile.foamBounceCooldown = 0.045;
        projectile.ttl = Math.max(0, projectile.ttl - 0.02);

        this.system?.onProjectileHit?.(projectile.position, 0x34d399, projectile.owner, projectile);
        return true;
    }

    stepProjectile(projectile, index, dt, arena, players, time) {
        projectile.foamBounceCooldown = Math.max(0, (projectile.foamBounceCooldown || 0) - dt);

        const vx = projectile.velocity.x * dt;
        const vy = projectile.velocity.y * dt;
        const vz = projectile.velocity.z * dt;
        projectile.position.x += vx;
        projectile.position.y += vy;
        projectile.position.z += vz;
        projectile.traveled += Math.sqrt(vx * vx + vy * vy + vz * vz);
        projectile.ttl -= dt;

        projectile.mesh.position.copy(projectile.position);
        this._tmpVec.addVectors(projectile.position, projectile.velocity);
        projectile.mesh.lookAt(this._tmpVec);

        const portalResult = arena?.checkPortal
            ? arena.checkPortal(projectile.position, projectile.radius, 1000 + index)
            : null;
        if (portalResult) {
            projectile.position.copy(portalResult.target);
            this._tmpVec.copy(projectile.velocity).normalize().multiplyScalar(1.5);
            projectile.position.add(this._tmpVec);
            projectile.mesh.position.copy(projectile.position);
        }

        if (projectile.huntRocket) {
            projectile.homingReacquireTimer = Math.max(0, (projectile.homingReacquireTimer || 0) - dt);
            if (!projectile.target || !projectile.target.alive || projectile.homingReacquireTimer <= 0) {
                projectile.target = this.acquireHomingTarget(projectile, players);
                projectile.homingReacquireTimer = Math.max(0.04, Number(projectile.homingReacquireInterval || 0.12));
            }
        }

        if (projectile.target && projectile.target.alive) {
            this._tmpVec.subVectors(projectile.target.position, projectile.position).normalize();
            this._tmpVec2.copy(projectile.velocity);
            const speed = this._tmpVec2.length();
            const turnRate = Math.max(0.1, Number(projectile.homingTurnRate || CONFIG.HOMING.TURN_RATE));
            this._tmpVec2.normalize().lerp(this._tmpVec, Math.min(turnRate * dt, 1.0)).normalize();
            projectile.velocity.copy(this._tmpVec2.multiplyScalar(speed));
            this._tmpVec.addVectors(projectile.position, projectile.velocity);
            projectile.mesh.lookAt(this._tmpVec);
        }

        if (projectile.flame) {
            const flicker = 0.7 + Math.sin(time * 30 + index * 7) * 0.3;
            projectile.flame.scale.set(1, 1, flicker);
        }

        let arenaCollision = null;
        if (typeof arena?.getCollisionInfo === 'function') {
            arenaCollision = arena.getCollisionInfo(projectile.position, projectile.radius);
        } else if (typeof arena?.checkCollision === 'function' && arena.checkCollision(projectile.position, projectile.radius)) {
            arenaCollision = { hit: true, kind: 'wall', normal: null };
        }

        const projectileExpired = projectile.ttl <= 0 || projectile.traveled >= CONFIG.PROJECTILE.MAX_DISTANCE;
        const projectileHitArena = !!arenaCollision?.hit;
        const arenaKind = String(arenaCollision?.kind || 'wall').toLowerCase();
        const bouncedOnFoam = projectileHitArena && arenaKind === 'foam'
            ? this.bounceProjectileOnFoam(projectile, arenaCollision)
            : false;

        const out = this._stepResult;
        out.projectileExpired = projectileExpired;
        out.projectileHitArena = projectileHitArena;
        out.bouncedOnFoam = bouncedOnFoam;
        out.arenaCollision = arenaCollision;
        return out;
    }
}
