import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { isHuntHealthActive } from './HealthSystem.js';
import { MGOverheatState } from './mg/MGOverheatState.js';
import { MGHitResolver } from './mg/MGHitResolver.js';
import { MGTracerFx } from './mg/MGTracerFx.js';

function getMgConfig() {
    return CONFIG?.HUNT?.MG || {};
}

export class OverheatGunSystem {
    constructor(entityManager) {
        this.entityManager = entityManager;

        this._state = new MGOverheatState();
        this._hitResolver = new MGHitResolver(entityManager);
        this._tracerFx = new MGTracerFx(entityManager);

        // Compatibility facade for existing call sites and tests.
        this._overheatByPlayer = this._state.overheatByPlayer;
        this._lockoutByPlayer = this._state.lockoutByPlayer;
        this._overheatSnapshot = this._state.overheatSnapshot;
        this._tracers = this._tracerFx.tracers;

        this._tmpAim = new THREE.Vector3();
        this._tmpMuzzle = new THREE.Vector3();
        this._tmpTracerEnd = new THREE.Vector3();
    }

    reset() {
        this._state.reset();
        this._tracerFx.clear();
    }

    update(dt) {
        const mg = getMgConfig();
        const players = this.entityManager?.players || [];
        this._state.update(players, dt, mg);
        this._tracerFx.update(dt);
    }

    getOverheatValue(playerIndex) {
        return this._state.getOverheatValue(playerIndex);
    }

    getOverheatSnapshot() {
        return this._state.overheatSnapshot;
    }

    getOverheatSnapshotVersion() {
        return this._state.overheatSnapshotVersion;
    }

    isOverheatSnapshotDirty() {
        return this._state.overheatSnapshotDirty;
    }

    markOverheatSnapshotClean() {
        this._state.markOverheatSnapshotClean();
    }

    tryFire(player) {
        if (!player || !player.alive) {
            return { ok: false, reason: 'Spieler inaktiv', type: 'MG_BULLET' };
        }
        if (!isHuntHealthActive()) {
            return { ok: false, reason: 'Hunt-Modus inaktiv', type: 'MG_BULLET' };
        }

        const mg = getMgConfig();
        const shotCooldown = Math.max(0.01, Number(mg.COOLDOWN || 0.08));
        if ((player.shootCooldown || 0) > 0) {
            return { ok: false, reason: `Schuss bereit in ${player.shootCooldown.toFixed(1)}s`, type: 'MG_BULLET' };
        }

        const idx = player.index;
        const lockout = Math.max(0, Number(this._lockoutByPlayer[idx] || 0));
        if (lockout > 0) {
            return { ok: false, reason: `MG ueberhitzt (${lockout.toFixed(1)}s)`, type: 'MG_BULLET' };
        }

        player.shootCooldown = shotCooldown;
        this._state.increaseOverheat(idx, mg);

        const hitResult = this._hitResolver.resolveHit(player, mg, this._tmpMuzzle, this._tmpAim);
        this._tmpTracerEnd.copy(this._tmpMuzzle).addScaledVector(this._tmpAim, Math.max(10, Number(mg.RANGE || 95)));
        if (hitResult.point) {
            this._tmpTracerEnd.set(hitResult.point.x, hitResult.point.y, hitResult.point.z);
        }
        this._tracerFx.spawnTracer(this._tmpMuzzle, this._tmpTracerEnd, !!(hitResult.target || hitResult.trail), mg);
        if (hitResult.target) {
            this._hitResolver.applyHit(player, hitResult.target, hitResult.distance, mg);
        } else if (hitResult.trail) {
            this._hitResolver.applyTrailHit(player, hitResult.trail, mg);
        }

        if (this.entityManager?.audio) {
            this.entityManager.audio.play('SHOOT');
        }

        return {
            ok: true,
            type: 'MG_BULLET',
            hit: !!hitResult.target,
            trailHit: !!hitResult.trail,
            overheat: this.getOverheatValue(idx),
        };
    }
}
