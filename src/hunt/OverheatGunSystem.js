import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { isHuntHealthActive } from './HealthSystem.js';

function getMgConfig() {
    return CONFIG?.HUNT?.MG || {};
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function clearObject(target) {
    for (const key of Object.keys(target || {})) {
        delete target[key];
    }
}

export class OverheatGunSystem {
    constructor(entityManager) {
        this.entityManager = entityManager;
        this._overheatByPlayer = {};
        this._lockoutByPlayer = {};
        this._overheatSnapshot = {};
        this._overheatSnapshotVersion = 0;
        this._overheatSnapshotDirty = true;
        Object.defineProperty(this._overheatSnapshot, '__version', {
            enumerable: false,
            configurable: false,
            get: () => this._overheatSnapshotVersion,
        });
        Object.defineProperty(this._overheatSnapshot, '__dirty', {
            enumerable: false,
            configurable: false,
            get: () => this._overheatSnapshotDirty,
        });
        this._tracers = [];
        this._tmpAim = new THREE.Vector3();
        this._tmpToTarget = new THREE.Vector3();
        this._tmpHit = new THREE.Vector3();
        this._tmpMuzzle = new THREE.Vector3();
        this._tmpTracerEnd = new THREE.Vector3();
    }

    reset() {
        clearObject(this._overheatByPlayer);
        clearObject(this._lockoutByPlayer);
        clearObject(this._overheatSnapshot);
        this._markOverheatSnapshotDirty();
        this._clearTracers();
    }

    update(dt) {
        const mg = getMgConfig();
        const coolPerSecond = Math.max(0, Number(mg.COOLING_PER_SECOND || 22));
        const players = this.entityManager?.players || [];
        for (const player of players) {
            const idx = player.index;
            const currentHeat = Math.max(0, Number(this._overheatByPlayer[idx] || 0));
            this._setOverheatValue(idx, clamp(currentHeat - coolPerSecond * dt, 0, 100));
            this._lockoutByPlayer[idx] = Math.max(0, Number(this._lockoutByPlayer[idx] || 0) - dt);
        }
        this._updateTracers(dt);
    }

    getOverheatValue(playerIndex) {
        return Math.max(0, Number(this._overheatByPlayer[playerIndex] || 0));
    }

    getOverheatSnapshot() {
        return this._overheatSnapshot;
    }

    getOverheatSnapshotVersion() {
        return this._overheatSnapshotVersion;
    }

    isOverheatSnapshotDirty() {
        return this._overheatSnapshotDirty;
    }

    markOverheatSnapshotClean() {
        this._overheatSnapshotDirty = false;
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
        this._increaseOverheat(idx, mg);

        const hitResult = this._resolveHit(player, mg);
        player.getAimDirection(this._tmpAim).normalize();
        this._tmpMuzzle.copy(player.position).addScaledVector(this._tmpAim, 2.1);
        this._tmpTracerEnd.copy(this._tmpMuzzle).addScaledVector(this._tmpAim, Math.max(10, Number(mg.RANGE || 95)));
        if (hitResult.target) {
            this._tmpTracerEnd.copy(hitResult.target.position);
        }
        this._spawnTracer(this._tmpMuzzle, this._tmpTracerEnd, !!hitResult.target);
        if (hitResult.target) {
            this._applyHit(player, hitResult.target, hitResult.distance, mg);
        }

        if (this.entityManager?.audio) {
            this.entityManager.audio.play('SHOOT');
        }

        return {
            ok: true,
            type: 'MG_BULLET',
            hit: !!hitResult.target,
            overheat: this.getOverheatValue(idx),
        };
    }

    _increaseOverheat(playerIndex, mg) {
        const perShot = Math.max(0, Number(mg.OVERHEAT_PER_SHOT || 6.5));
        const threshold = Math.max(1, Number(mg.LOCKOUT_THRESHOLD || 100));
        const lockoutSeconds = Math.max(0.1, Number(mg.LOCKOUT_SECONDS || 1.2));
        const nextHeat = clamp(this.getOverheatValue(playerIndex) + perShot, 0, 100);
        this._setOverheatValue(playerIndex, nextHeat);
        if (nextHeat >= threshold) {
            this._lockoutByPlayer[playerIndex] = lockoutSeconds;
        }
    }

    _setOverheatValue(playerIndex, nextValue) {
        const key = String(playerIndex);
        const normalized = clamp(Math.max(0, Number(nextValue || 0)), 0, 100);
        const hasCurrent = Object.prototype.hasOwnProperty.call(this._overheatByPlayer, key);
        const current = hasCurrent ? Math.max(0, Number(this._overheatByPlayer[key] || 0)) : 0;
        if (hasCurrent && current === normalized) {
            return current;
        }
        this._overheatByPlayer[key] = normalized;
        this._overheatSnapshot[key] = normalized;
        this._markOverheatSnapshotDirty();
        return normalized;
    }

    _markOverheatSnapshotDirty() {
        this._overheatSnapshotVersion += 1;
        this._overheatSnapshotDirty = true;
    }

    _resolveHit(player, mg) {
        const players = this.entityManager?.players || [];
        const maxRange = Math.max(10, Number(mg.RANGE || 95));
        const minDot = clamp(Number(mg.AIM_DOT_MIN || 0.965), 0.7, 0.999);
        player.getAimDirection(this._tmpAim).normalize();

        let bestTarget = null;
        let bestDistance = Infinity;
        for (const target of players) {
            if (!target || !target.alive || target === player) continue;

            this._tmpToTarget.subVectors(target.position, player.position);
            const distance = this._tmpToTarget.length();
            if (distance <= 0.1 || distance > maxRange) continue;

            this._tmpToTarget.divideScalar(distance);
            const dot = this._tmpAim.dot(this._tmpToTarget);
            if (dot < minDot) continue;

            if (distance < bestDistance) {
                bestDistance = distance;
                bestTarget = target;
            }
        }

        return { target: bestTarget, distance: bestDistance };
    }

    _applyHit(attacker, target, distance, mg) {
        const maxRange = Math.max(10, Number(mg.RANGE || 95));
        const minFalloff = clamp(Number(mg.MIN_FALLOFF || 0.5), 0.2, 1);
        const baseDamage = Math.max(1, Number(mg.DAMAGE || 9));
        const distRatio = clamp(distance / maxRange, 0, 1);
        const damage = baseDamage * (1 - (1 - minFalloff) * distRatio);

        const damageResult = target.takeDamage(damage);
        if (this.entityManager?._emitHuntDamageEvent) {
            this.entityManager._emitHuntDamageEvent({
                target,
                sourcePlayer: attacker,
                cause: 'MG_BULLET',
                damageResult,
            });
        }
        this._emitTracerImpact(target);
        if (damageResult.isDead) {
            this.entityManager._killPlayer(target, 'PROJECTILE', { killer: attacker });
            this._pushKillFeed(attacker, target, 'ELIMINATED');
            return;
        }

        this._pushKillFeed(attacker, target, `-${Math.round(damage)} HP`);
    }

    _emitTracerImpact(target) {
        if (this.entityManager?.particles) {
            this.entityManager.particles.spawnHit(target.position, 0xffaa33);
        }
        if (this.entityManager?.audio) {
            this.entityManager.audio.play('HIT');
        }
    }

    _pushKillFeed(attacker, target, suffix) {
        const feed = this.entityManager?.onHuntFeedEvent;
        if (typeof feed !== 'function') return;
        const attackerLabel = attacker.isBot ? `Bot ${attacker.index + 1}` : `P${attacker.index + 1}`;
        const targetLabel = target.isBot ? `Bot ${target.index + 1}` : `P${target.index + 1}`;
        feed(`${attackerLabel} -> ${targetLabel}: ${suffix}`);
    }

    _spawnTracer(start, end, hit = false) {
        const renderer = this.entityManager?.renderer;
        if (!renderer?.addToScene) return;

        const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
        const material = new THREE.LineBasicMaterial({
            color: hit ? 0xffe38a : 0x8ad5ff,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 210;
        renderer.addToScene(line);

        const maxTtl = hit ? 0.11 : 0.08;
        this._tracers.push({
            mesh: line,
            ttl: maxTtl,
            maxTtl,
        });
    }

    _updateTracers(dt) {
        if (!Array.isArray(this._tracers) || this._tracers.length === 0) return;
        const renderer = this.entityManager?.renderer;
        for (let i = this._tracers.length - 1; i >= 0; i--) {
            const tracer = this._tracers[i];
            if (!tracer?.mesh) {
                this._tracers.splice(i, 1);
                continue;
            }
            tracer.ttl -= Math.max(0, dt);
            const fade = clamp(tracer.ttl / Math.max(0.001, tracer.maxTtl), 0, 1);
            if (tracer.mesh.material) {
                tracer.mesh.material.opacity = fade * 0.92;
            }
            if (tracer.ttl > 0) continue;

            if (renderer?.removeFromScene) {
                renderer.removeFromScene(tracer.mesh);
            } else if (tracer.mesh.parent) {
                tracer.mesh.parent.remove(tracer.mesh);
            }
            tracer.mesh.geometry?.dispose?.();
            tracer.mesh.material?.dispose?.();
            this._tracers.splice(i, 1);
        }
    }

    _clearTracers() {
        if (!Array.isArray(this._tracers) || this._tracers.length === 0) return;
        const renderer = this.entityManager?.renderer;
        for (const tracer of this._tracers) {
            const mesh = tracer?.mesh;
            if (!mesh) continue;
            if (renderer?.removeFromScene) {
                renderer.removeFromScene(mesh);
            } else if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            mesh.geometry?.dispose?.();
            mesh.material?.dispose?.();
        }
        this._tracers.length = 0;
    }
}
