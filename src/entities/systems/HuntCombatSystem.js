// ============================================
// HuntCombatSystem.js - inventory/projectile/lock-on combat helpers
// ============================================
//
// Contract:
// - Inputs: runtime context with explicit combat callbacks and temp vectors
// - Outputs: command results for inventory use, gun fire, lock-on target
// - Side effects: mutates player inventory/selection and lock-on cache
// - Hotpath guardrail: reuse runtime temp vectors and avoid per-call allocations

import * as THREE from 'three';
import { CONFIG } from '../../core/Config.js';
import { isHuntHealthActive } from '../../hunt/HealthSystem.js';
import {
    createHuntTargetingScratch,
    resolveHuntLineTarget,
} from '../../hunt/HuntTargetingOps.js';

export class HuntCombatSystem {
    constructor(runtimeContext) {
        this.runtime = runtimeContext || null;
        this._fallbackDirection = new THREE.Vector3();
        this._fallbackDelta = new THREE.Vector3();
        this._fallbackMuzzle = new THREE.Vector3();
        this._fallbackLockOnCache = new Map();
        this._targetingScratch = createHuntTargetingScratch();
    }

    takeInventoryItem(player, preferredIndex = -1) {
        if (!player.inventory || player.inventory.length === 0) {
            return { ok: false, reason: 'Kein Item verfuegbar', type: null };
        }
        const index = Number.isInteger(preferredIndex) && preferredIndex >= 0
            ? Math.min(preferredIndex, player.inventory.length - 1)
            : Math.min(player.selectedItemIndex || 0, player.inventory.length - 1);
        const type = player.inventory.splice(index, 1)[0];
        if (player.inventory.length === 0 || player.selectedItemIndex >= player.inventory.length) {
            player.selectedItemIndex = 0;
        }
        return { ok: true, type };
    }

    useInventoryItem(player, preferredIndex = -1) {
        const itemResult = this.takeInventoryItem(player, preferredIndex);
        if (!itemResult.ok) return { ok: false, reason: itemResult.reason };
        player.applyPowerup(itemResult.type);
        return { ok: true, type: itemResult.type };
    }

    shootItemProjectile(player, preferredIndex = -1) {
        return this.runtime?.combat?.shootItemProjectile?.(player, preferredIndex)
            || { ok: false, reason: 'ProjectileSystem fehlt' };
    }

    shootHuntGun(player) {
        return this.runtime?.combat?.shootHuntGun?.(player)
            || { ok: false, reason: 'OverheatGunSystem fehlt' };
    }

    _resolveClassicLockOn(player, tmpDir, tmpVec) {
        const runtime = this.runtime;
        const maxAngle = (CONFIG.HOMING.LOCK_ON_ANGLE * Math.PI) / 180;
        const maxRangeSq = CONFIG.HOMING.MAX_LOCK_RANGE * CONFIG.HOMING.MAX_LOCK_RANGE;
        let bestTarget = null;
        let bestDistSq = Infinity;

        for (let i = 0; i < runtime.players.length; i++) {
            const other = runtime.players[i];
            if (other === player || !other?.alive) continue;
            tmpVec.subVectors(other.position, player.position);
            const distSq = tmpVec.lengthSq();
            if (distSq > maxRangeSq || distSq < 1) continue;
            const angle = tmpDir.angleTo(tmpVec.normalize());
            if (angle <= maxAngle && distSq < bestDistSq) {
                bestTarget = other;
                bestDistSq = distSq;
            }
        }

        return bestTarget;
    }

    checkLockOn(player) {
        const runtime = this.runtime;
        if (!runtime || !player) return null;

        const lockOnCache = runtime.cache?.lockOn || this._fallbackLockOnCache;
        if (lockOnCache.has(player.index)) return lockOnCache.get(player.index);

        const tmpDir = runtime.tempVectors?.direction || this._fallbackDirection;
        const tmpVec = runtime.tempVectors?.primary || this._fallbackDelta;
        if (typeof player.getAimDirection === 'function') {
            player.getAimDirection(tmpDir).normalize();
        } else {
            player.getDirection(tmpDir).normalize();
        }
        if (!isHuntHealthActive()) {
            const legacyTarget = this._resolveClassicLockOn(player, tmpDir, tmpVec);
            lockOnCache.set(player.index, legacyTarget);
            return legacyTarget;
        }

        const muzzle = this._fallbackMuzzle;
        const muzzleOffset = Math.max(0, Number(CONFIG?.HUNT?.TARGETING?.MUZZLE_OFFSET || 2.1));
        muzzle.copy(player.position).addScaledVector(tmpDir, muzzleOffset);

        const mgRange = Math.max(10, Number(CONFIG?.HUNT?.MG?.RANGE || 95));
        const descriptor = resolveHuntLineTarget({
            sourcePlayer: player,
            players: runtime.players,
            trailSpatialIndex: runtime.getTrailSpatialIndex?.() || runtime.trails?.spatialIndex || null,
            origin: muzzle,
            direction: tmpDir,
            playerRange: Math.max(10, Number(CONFIG?.HOMING?.MAX_LOCK_RANGE || 100)),
            trailRange: mgRange,
            trailSampleStep: Number(CONFIG?.HUNT?.MG?.TRAIL_SAMPLE_STEP),
            trailHitRadius: Number(CONFIG?.HUNT?.MG?.TRAIL_HIT_RADIUS),
            trailSelfSkipRecent: Number(CONFIG?.HUNT?.MG?.TRAIL_SELF_SKIP_RECENT),
            allowSelfTrailFallback: false,
            scratch: this._targetingScratch,
        });

        lockOnCache.set(player.index, descriptor || null);
        return descriptor || null;
    }
}
