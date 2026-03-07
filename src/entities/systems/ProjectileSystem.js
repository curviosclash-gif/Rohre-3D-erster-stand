// ============================================
// ProjectileSystem.js - projectile lifecycle and hit handling
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../../core/Config.js';
import { isHuntHealthActive } from '../../hunt/HealthSystem.js';
import { isRocketTierType } from '../../hunt/RocketPickupSystem.js';
import { ProjectileStatePool } from './projectile/ProjectileStatePool.js';
import { ProjectileSimulationOps } from './projectile/ProjectileSimulationOps.js';
import { ProjectileHitResolver } from './projectile/ProjectileHitResolver.js';

function getNowMilliseconds() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function getHuntRocketConfig() {
    return CONFIG?.HUNT?.ROCKET || {};
}

function resolveRocketVisualScale(type, rocketConfig) {
    const normalized = String(type || '').toUpperCase();
    if (normalized === 'ROCKET_STRONG') return Math.max(1, Number(rocketConfig?.VISUAL_SCALE_STRONG || 2.2));
    if (normalized === 'ROCKET_MEDIUM') return Math.max(1, Number(rocketConfig?.VISUAL_SCALE_MEDIUM || 1.95));
    if (normalized === 'ROCKET_WEAK') return Math.max(1, Number(rocketConfig?.VISUAL_SCALE_WEAK || 1.7));
    return 1;
}

export class ProjectileSystem {
    constructor(options = {}) {
        this.renderer = options.renderer || null;
        this.getArena = typeof options.getArena === 'function'
            ? options.getArena
            : (() => options.arena || null);
        this.getPlayers = typeof options.getPlayers === 'function'
            ? options.getPlayers
            : (() => options.players || []);
        this.takeInventoryItem = typeof options.takeInventoryItem === 'function'
            ? options.takeInventoryItem
            : (() => ({ ok: false, reason: 'Kein Item verfuegbar', type: null }));
        this.resolveLockOn = typeof options.resolveLockOn === 'function'
            ? options.resolveLockOn
            : (() => null);
        this.getTrailSpatialIndex = typeof options.getTrailSpatialIndex === 'function'
            ? options.getTrailSpatialIndex
            : (() => options.trailSpatialIndex || null);
        this.onShoot = typeof options.onShoot === 'function' ? options.onShoot : (() => { });
        this.onProjectileHit = typeof options.onProjectileHit === 'function' ? options.onProjectileHit : (() => { });
        this.onProjectilePowerup = typeof options.onProjectilePowerup === 'function' ? options.onProjectilePowerup : (() => { });
        this.onProjectileDamage = typeof options.onProjectileDamage === 'function' ? options.onProjectileDamage : (() => { });
        this.onTrailSegmentHit = typeof options.onTrailSegmentHit === 'function' ? options.onTrailSegmentHit : (() => { });

        this.projectiles = [];
        this._projectileAssets = new Map();
        this._projectilePools = new Map();
        this._statePool = new ProjectileStatePool();
        this._projectileStatePool = this._statePool.pool;
        this._simulationOps = new ProjectileSimulationOps(this);
        this._hitResolver = new ProjectileHitResolver(this);

        this._tmpVec = new THREE.Vector3();
        this._tmpVec2 = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
    }

    shootItemProjectile(player, preferredIndex = -1) {
        if ((player.shootCooldown || 0) > 0) {
            return { ok: false, reason: `Schuss bereit in ${player.shootCooldown.toFixed(1)}s` };
        }

        const itemResult = this.takeInventoryItem(player, preferredIndex);
        if (!itemResult.ok) {
            return { ok: false, reason: itemResult.reason, type: null };
        }

        const type = itemResult.type;
        const power = CONFIG.POWERUP.TYPES[type];
        if (!power) {
            return { ok: false, reason: 'Item ungueltig' };
        }
        const huntRocket = isHuntHealthActive() && isRocketTierType(type);
        const huntRocketConfig = getHuntRocketConfig();
        const visualScale = huntRocket ? resolveRocketVisualScale(type, huntRocketConfig) : 1;
        const collisionRadiusMultiplier = huntRocket
            ? Math.max(1, Number(huntRocketConfig.COLLISION_RADIUS_MULTIPLIER || 1.65))
            : 1;
        const baseTurnRate = Math.max(0.1, Number(CONFIG?.HOMING?.TURN_RATE || 3));
        const homingTurnRate = huntRocket
            ? Math.max(baseTurnRate, Number(huntRocketConfig.HOMING_TURN_RATE || 6.2))
            : baseTurnRate;
        const baseLockOnAngle = Math.max(5, Number(CONFIG?.HOMING?.LOCK_ON_ANGLE || 15));
        const homingLockOnAngle = huntRocket
            ? Math.max(baseLockOnAngle, Number(huntRocketConfig.HOMING_LOCK_ON_ANGLE || 32))
            : baseLockOnAngle;
        const baseHomingRange = Math.max(10, Number(CONFIG?.HOMING?.MAX_LOCK_RANGE || 100));
        const homingRange = huntRocket
            ? Math.max(baseHomingRange, Number(huntRocketConfig.HOMING_RANGE || 130))
            : baseHomingRange;
        const homingReacquireInterval = huntRocket
            ? Math.max(0.04, Number(huntRocketConfig.HOMING_REACQUIRE_INTERVAL || 0.12))
            : 0.2;

        player.getAimDirection(this._tmpDir).normalize();
        this._tmpVec.copy(player.position).addScaledVector(this._tmpDir, 2.2);

        const speed = CONFIG.PROJECTILE.SPEED;
        const radius = CONFIG.PROJECTILE.RADIUS;
        const rocketGroup = this._acquireProjectileMesh(type, power.color);
        rocketGroup.scale.setScalar(visualScale);
        rocketGroup.position.copy(this._tmpVec);
        this._tmpVec2.copy(this._tmpVec).add(this._tmpDir);
        rocketGroup.lookAt(this._tmpVec2);

        const projectile = this._acquireProjectileState();
        projectile.mesh = rocketGroup;
        projectile.flame = rocketGroup.userData.flame || null;
        projectile.poolKey = type;
        projectile.owner = player;
        projectile.type = type;
        projectile.huntRocket = huntRocket;
        projectile.visualScale = visualScale;
        projectile.position.copy(this._tmpVec);
        projectile.velocity.copy(this._tmpDir).multiplyScalar(speed);
        projectile.radius = radius * collisionRadiusMultiplier;
        projectile.ttl = CONFIG.PROJECTILE.LIFE_TIME;
        projectile.traveled = 0;
        projectile.homingTurnRate = homingTurnRate;
        projectile.homingLockOnAngle = homingLockOnAngle;
        projectile.homingRange = homingRange;
        projectile.homingReacquireInterval = homingReacquireInterval;
        projectile.homingReacquireTimer = 0;
        projectile.target = this.resolveLockOn(player);
        if (huntRocket && (!projectile.target || !projectile.target.alive)) {
            projectile.target = this._acquireHomingTarget(projectile, this.getPlayers());
        }
        projectile.foamBounces = 0;
        projectile.foamBounceCooldown = 0;
        this.projectiles.push(projectile);

        player.shootCooldown = CONFIG.PROJECTILE.COOLDOWN;
        this.onShoot(player, type, projectile);
        return { ok: true, type };
    }

    _acquireProjectileState() {
        return this._statePool.acquire();
    }

    _releaseProjectileState(projectile) {
        this._statePool.release(projectile);
    }

    _acquireProjectileMesh(type, color) {
        const pool = this._getProjectilePool(type);
        let rocketGroup = pool.pop();

        if (!rocketGroup) {
            const assets = this._getProjectileAssets(type, color);
            rocketGroup = new THREE.Group();

            const body = new THREE.Mesh(assets.bodyGeo, assets.bodyMat);
            rocketGroup.add(body);

            const tip = new THREE.Mesh(assets.tipGeo, assets.tipMat);
            tip.position.z = -0.8;
            rocketGroup.add(tip);

            for (let i = 0; i < 4; i++) {
                const fin = new THREE.Mesh(assets.finGeo, assets.finMat);
                fin.position.z = 0.5;
                const angle = (Math.PI / 2) * i;
                if (i % 2 === 0) {
                    fin.position.x = Math.cos(angle) * 0.2;
                } else {
                    fin.position.y = Math.sin(angle) * 0.2;
                    fin.rotation.z = Math.PI / 2;
                }
                rocketGroup.add(fin);
            }

            const flame = new THREE.Mesh(assets.flameGeo, assets.flameMat);
            flame.position.z = 0.85;
            rocketGroup.add(flame);
            rocketGroup.userData.flame = flame;
        }

        rocketGroup.visible = true;
        if (rocketGroup.userData.flame) {
            rocketGroup.userData.flame.scale.set(1, 1, 1);
        }

        if (this.renderer) {
            this.renderer.addToScene(rocketGroup);
        }

        return rocketGroup;
    }

    _getProjectilePool(type) {
        if (!this._projectilePools.has(type)) {
            this._projectilePools.set(type, []);
        }
        return this._projectilePools.get(type);
    }

    _getProjectileAssets(type, color) {
        if (this._projectileAssets.has(type)) {
            return this._projectileAssets.get(type);
        }

        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
        bodyGeo.rotateX(Math.PI / 2);
        const tipGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
        tipGeo.rotateX(Math.PI / 2);
        const finGeo = new THREE.BoxGeometry(0.02, 0.25, 0.3);
        const flameGeo = new THREE.ConeGeometry(0.1, 0.5, 6);
        flameGeo.rotateX(-Math.PI / 2);

        const bodyMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.6,
        });
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            emissive: color,
            emissiveIntensity: 0.2,
            roughness: 0.2,
            metalness: 0.8,
        });
        const finMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
            roughness: 0.4,
            metalness: 0.5,
        });
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8,
        });

        const assets = { bodyGeo, tipGeo, finGeo, flameGeo, bodyMat, tipMat, finMat, flameMat };
        this._projectileAssets.set(type, assets);
        return assets;
    }

    _bounceProjectileOnFoam(projectile, collisionInfo) {
        return this._simulationOps.bounceProjectileOnFoam(projectile, collisionInfo);
    }

    _acquireHomingTarget(projectile, players) {
        return this._simulationOps.acquireHomingTarget(projectile, players);
    }

    update(dt) {
        const arena = this.getArena();
        const players = this.getPlayers();
        const trailSpatialIndex = this.getTrailSpatialIndex();
        const time = getNowMilliseconds() * 0.001;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const simulationResult = this._simulationOps.stepProjectile(projectile, i, dt, arena, players, time);
            const shouldRemove = this._hitResolver.resolveProjectileOutcome(
                projectile,
                players,
                trailSpatialIndex,
                simulationResult
            );
            if (shouldRemove) {
                this._removeProjectileAt(i);
            }
        }
    }

    _removeProjectileAt(index) {
        const projectile = this.projectiles[index];
        if (!projectile) return;

        this._releaseProjectileMesh(projectile);
        const lastIndex = this.projectiles.length - 1;
        if (index !== lastIndex) {
            this.projectiles[index] = this.projectiles[lastIndex];
        }
        this.projectiles.pop();
        this._releaseProjectileState(projectile);
    }

    _releaseProjectileMesh(projectile) {
        if (!projectile?.mesh) return;

        if (this.renderer) {
            this.renderer.removeFromScene(projectile.mesh);
        }
        projectile.mesh.visible = false;
        projectile.mesh.scale.setScalar(1);

        const pool = this._getProjectilePool(projectile.poolKey || projectile.type);
        pool.push(projectile.mesh);
    }

    clear() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            this._releaseProjectileMesh(projectile);
            this._releaseProjectileState(projectile);
        }
        this.projectiles.length = 0;
    }

    dispose() {
        this.clear();

        for (const assets of this._projectileAssets.values()) {
            if (assets.bodyGeo) assets.bodyGeo.dispose();
            if (assets.tipGeo) assets.tipGeo.dispose();
            if (assets.finGeo) assets.finGeo.dispose();
            if (assets.flameGeo) assets.flameGeo.dispose();
            if (assets.bodyMat) assets.bodyMat.dispose();
            if (assets.tipMat) assets.tipMat.dispose();
            if (assets.finMat) assets.finMat.dispose();
            if (assets.flameMat) assets.flameMat.dispose();
        }

        this._projectileAssets.clear();
        this._projectilePools.clear();
        this._statePool.clear();
    }
}
