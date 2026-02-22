// ============================================
// EntityManager.js - manages players, collisions and item projectiles
// ============================================

import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { Player } from './Player.js';
import { BotAI } from './Bot.js';
import { getVehicleIds, isValidVehicleId } from '../entities/vehicle-registry.js';

// Reused input object to reduce GC
const SHARED_EMPTY_INPUT = {
    pitchUp: false,
    pitchDown: false,
    yawLeft: false,
    yawRight: false,
    rollLeft: false,
    rollRight: false,
    boost: false,
    cameraSwitch: false,
    dropItem: false,
    shootItem: false,
    shootItemIndex: -1,
    nextItem: false,
    useItem: -1,
};

function getEmptyInput() {
    // Reset properties
    SHARED_EMPTY_INPUT.pitchUp = false;
    SHARED_EMPTY_INPUT.pitchDown = false;
    SHARED_EMPTY_INPUT.yawLeft = false;
    SHARED_EMPTY_INPUT.yawRight = false;
    SHARED_EMPTY_INPUT.rollLeft = false;
    SHARED_EMPTY_INPUT.rollRight = false;
    SHARED_EMPTY_INPUT.boost = false;
    SHARED_EMPTY_INPUT.cameraSwitch = false;
    SHARED_EMPTY_INPUT.dropItem = false;
    SHARED_EMPTY_INPUT.shootItem = false;
    SHARED_EMPTY_INPUT.shootItemIndex = -1;
    SHARED_EMPTY_INPUT.nextItem = false;
    SHARED_EMPTY_INPUT.useItem = -1;
    return SHARED_EMPTY_INPUT;
}

export class EntityManager {
    constructor(renderer, arena, powerupManager, particles, audio, recorder) {
        this.renderer = renderer;
        this.arena = arena;
        this.powerupManager = powerupManager;
        this.particles = particles;
        this.audio = audio;
        this.recorder = recorder;
        this.players = [];
        this.humanPlayers = [];
        this.bots = [];
        this.botByPlayer = new Map();
        this.projectiles = [];
        this._projectileAssets = new Map();
        this._projectilePools = new Map();
        this.onPlayerDied = null;
        this.onRoundEnd = null;
        this.onPlayerFeedback = null;

        // Wiederverwendbare temp-Vektoren (vermeidet GC-Druck)
        this._tmpVec = new THREE.Vector3();
        this._tmpVec2 = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
        this._tmpDir2 = new THREE.Vector3();
        this._tmpCamAnchor = new THREE.Vector3();
        this._tmpCollisionNormal = new THREE.Vector3();

        // Lock-On Cache (einmal pro Frame berechnen)
        this._lockOnCache = new Map();
        this.botDifficulty = CONFIG.BOT.ACTIVE_DIFFICULTY || CONFIG.BOT.DEFAULT_DIFFICULTY || 'NORMAL';

        // Global Spatial Grid for trails and objects
        this.gridSize = 10;
        this.spatialGrid = new Map(); // Key: hash(cx, cz), Value: Set of segment data
    }

    setup(numHumans, numBots, options = {}) {
        console.log(`[EntityManager] Setup: Humans=${numHumans}, Bots=${numBots}`);
        this.clear();

        const humanConfigs = Array.isArray(options.humanConfigs) ? options.humanConfigs : [];
        const modelScale = typeof options.modelScale === 'number' ? options.modelScale : (CONFIG.PLAYER.MODEL_SCALE || 1);
        this.botDifficulty = options.botDifficulty || CONFIG.BOT.ACTIVE_DIFFICULTY || this.botDifficulty;
        const availableVehicleIds = getVehicleIds();
        const defaultVehicleId = String(CONFIG.PLAYER.DEFAULT_VEHICLE_ID || availableVehicleIds[0] || 'aircraft');
        const normalizeVehicleId = (value) => {
            const candidate = String(value || '').trim();
            if (isValidVehicleId(candidate)) {
                return candidate;
            }
            return defaultVehicleId;
        };
        const botVehicleSource = Array.isArray(options.botVehicleIds) && options.botVehicleIds.length > 0
            ? options.botVehicleIds
            : availableVehicleIds;
        const botVehicleIds = botVehicleSource.map((id) => normalizeVehicleId(id));

        this.humanPlayers = [];
        this.botByPlayer.clear();

        const humanColors = [CONFIG.COLORS.PLAYER_1, CONFIG.COLORS.PLAYER_2];
        for (let i = 0; i < numHumans; i++) {
            const playerVehicleId = normalizeVehicleId(humanConfigs[i]?.vehicleId);
            const player = new Player(this.renderer, i, humanColors[i], false, {
                vehicleId: playerVehicleId,
                entityManager: this
            });
            player.setControlOptions({
                invertPitch: !!humanConfigs[i]?.invertPitch,
                cockpitCamera: !!humanConfigs[i]?.cockpitCamera,
                modelScale,
            });
            this.players.push(player);
            this.humanPlayers.push(player);
        }

        for (let i = 0; i < numBots; i++) {
            const color = CONFIG.COLORS.BOT_COLORS[i % CONFIG.COLORS.BOT_COLORS.length];
            const botVehicleId = botVehicleIds.length > 0
                ? botVehicleIds[i % botVehicleIds.length]
                : defaultVehicleId;
            const player = new Player(this.renderer, numHumans + i, color, true, {
                vehicleId: botVehicleId,
                entityManager: this
            });
            player.setControlOptions({ modelScale, invertPitch: false });
            const ai = new BotAI({ difficulty: this.botDifficulty, recorder: this.recorder });
            this.players.push(player);
            this.bots.push({ player, ai });
            this.botByPlayer.set(player, ai);
        }
    }

    setBotDifficulty(profileName) {
        this.botDifficulty = profileName || this.botDifficulty;
        for (let i = 0; i < this.bots.length; i++) {
            const bot = this.bots[i];
            if (bot?.ai?.setDifficulty) {
                bot.ai.setDifficulty(this.botDifficulty);
            }
        }
    }

    spawnAll() {
        this._roundEnded = false;
        const isPlanar = !!CONFIG.GAMEPLAY.PLANAR_MODE;
        const planarSpawnLevel = isPlanar ? this._getPlanarSpawnLevel() : null;

        for (const player of this.players) {
            const pos = this._findSpawnPosition(12, 12, planarSpawnLevel);
            const dir = this._findSafeSpawnDirection(pos, player.hitboxRadius);
            player.spawn(pos, dir);
            player.shootCooldown = 0;
            if (this.recorder) {
                this.recorder.markPlayerSpawn(player);
                this.recorder.logEvent('SPAWN', player.index, player.isBot ? 'bot=1' : 'bot=0');
            }
        }
    }

    _getPlanarSpawnLevel() {
        const bounds = this.arena?.bounds || null;
        const fallback = bounds
            ? (bounds.minY + bounds.maxY) * 0.5
            : (CONFIG.PLAYER.START_Y || 5);

        const hasPortals = Array.isArray(this.arena?.portals) && this.arena.portals.length > 0;
        if (!hasPortals) {
            return fallback;
        }

        if (!this.arena?.getPortalLevels) {
            return fallback;
        }

        const levels = this.arena.getPortalLevels();
        if (!Array.isArray(levels) || levels.length === 0) {
            return fallback;
        }

        let best = fallback;
        let bestDist = Infinity;
        for (let i = 0; i < levels.length; i++) {
            const value = levels[i];
            if (!Number.isFinite(value)) continue;
            const dist = Math.abs(value - fallback);
            if (dist < bestDist) {
                bestDist = dist;
                best = value;
            }
        }
        return best;
    }

    _findSpawnPosition(minDistance = 12, margin = 12, planarLevel = null) {
        const usePlanarLevel = Number.isFinite(planarLevel) && !!this.arena?.getRandomPositionOnLevel;
        const randomSpawn = () => usePlanarLevel
            ? this.arena.getRandomPositionOnLevel(planarLevel, margin)
            : this.arena.getRandomPosition(margin);

        for (let attempts = 0; attempts < 100; attempts++) {
            const pos = randomSpawn();
            let tooClose = false;

            for (const other of this.players) {
                if (!other.alive) continue;
                if (other.position.distanceToSquared(pos) < minDistance * minDistance) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                return pos;
            }
        }

        return randomSpawn();
    }

    _findSafeSpawnDirection(position, radius = 0.8) {
        const sampleCount = 20;
        let bestDirection = new THREE.Vector3(0, 0, -1);
        let bestDistance = -1;

        for (let i = 0; i < sampleCount; i++) {
            const angle = (Math.PI * 2 * i) / sampleCount;
            this._tmpDir.set(Math.sin(angle), 0, -Math.cos(angle));
            const freeDistance = this._traceFreeDistance(position, this._tmpDir, 36, 2.2, radius);
            if (freeDistance > bestDistance) {
                bestDistance = freeDistance;
                bestDirection.copy(this._tmpDir);
            }
        }

        return bestDirection;
    }

    _traceFreeDistance(origin, direction, maxDistance, stepDistance, radius = 0.8) {
        const step = Math.max(0.5, stepDistance);
        let traveled = 0;
        while (traveled < maxDistance) {
            traveled += step;
            this._tmpVec.set(
                origin.x + direction.x * traveled,
                origin.y + direction.y * traveled,
                origin.z + direction.z * traveled
            );
            if (this.arena.checkCollision(this._tmpVec, radius)) {
                return traveled - step;
            }
        }
        return maxDistance;
    }

    update(dt, inputManager) {
        this._lockOnCache.clear();
        this._updateProjectiles(dt);

        for (const player of this.players) {
            if (!player.alive) continue;
            player.shootCooldown = Math.max(0, (player.shootCooldown || 0) - dt);

            let input = getEmptyInput();

            if (player.isBot) {
                const botAI = this.botByPlayer.get(player);
                if (botAI) {
                    input = botAI.update(dt, player, this.arena, this.players, this.projectiles);
                }
            } else {
                const includeSecondaryBindings = this.humanPlayers.length === 1 && player.index === 0;
                input = inputManager.getPlayerInput(player.index, { includeSecondaryBindings });
                if (input.cameraSwitch) {
                    this.renderer.cycleCamera(player.index);
                    player.cameraMode = this.renderer.cameraModes[player.index] || 0;
                }
            }

            if (input.nextItem) player.cycleItem();
            if (input.dropItem) player.dropItem();

            if (input.useItem >= 0) {
                const result = this._useInventoryItem(player, input.useItem);
                if (result.ok) {
                    if (this.recorder) this.recorder.logEvent('ITEM_USE', player.index, `mode=use type=${result.type}`);
                } else if (!player.isBot) {
                    this._notifyPlayerFeedback(player, result.reason);
                }
            }

            if (input.shootItem) {
                const result = this._shootItemProjectile(player, input.shootItemIndex);
                if (!result.ok && !player.isBot) {
                    this._notifyPlayerFeedback(player, result.reason);
                } else if (result.ok && this.recorder) {
                    this.recorder.logEvent('ITEM_USE', player.index, `mode=shoot type=${result.type}`);
                }
            }

            player.update(dt, input);

            const spawnProtected = (player.spawnProtectionTimer || 0) > 0;
            if (!player.isGhost && !spawnProtected) {
                const hRadius = player.hitboxRadius;

                // Präzise Arena-Kollision (Nase, Flügel, Heck + Zentrum)
                let wallHit = false;

                // Wir nutzen hier temporär Vektoren, um Array-Allokationen und .clone() zu vermeiden
                // Punkt 0: Zentrum
                if (this.arena.checkCollision(player.position, 0.4)) {
                    wallHit = true;
                }

                if (!wallHit) {
                    // Punkt 1: Nase
                    player.getAimDirection(this._tmpDir).multiplyScalar(4).add(player.position);
                    if (this.arena.checkCollision(this._tmpDir, 0.4)) wallHit = true;
                }

                if (!wallHit) {
                    // Punkt 2: Heck
                    player.getDirection(this._tmpVec).multiplyScalar(-1.5).add(player.position);
                    if (this.arena.checkCollision(this._tmpVec, 0.4)) wallHit = true;
                }

                if (!wallHit) {
                    // Seitliche Flügel-Punkte
                    this._tmpVec.set(0, 1, 0).applyQuaternion(player.group.quaternion); // Up
                    this._tmpDir.crossVectors(this._tmpVec, player.getDirection(this._tmpVec2)).normalize(); // Right

                    // Rechts
                    this._tmpVec2.copy(this._tmpDir).multiplyScalar(2).add(player.position);
                    if (this.arena.checkCollision(this._tmpVec2, 0.4)) wallHit = true;

                    if (!wallHit) {
                        // Links
                        this._tmpVec2.copy(this._tmpDir).multiplyScalar(-2).add(player.position);
                        if (this.arena.checkCollision(this._tmpVec2, 0.4)) wallHit = true;
                    }
                }

                if (wallHit) {
                    if (player.hasShield) {
                        player.hasShield = false;
                        player.getDirection(this._tmpDir).multiplyScalar(2.2);
                        player.position.sub(this._tmpDir);
                    } else {
                        if (this.audio) this.audio.play('HIT');
                        if (this.particles) this.particles.spawnHit(player.position, player.color);
                        this._killPlayer(player, 'WALL');
                        continue;
                    }
                }

                // Global Trail Collision (Nutzt OBB für Präzision)
                const collision = this.checkGlobalCollision(player.position, hRadius * 2.0, player.index, 25, player);
                if (collision && collision.hit) {
                    if (player.hasShield) {
                        player.hasShield = false;
                    } else {
                        if (this.audio) this.audio.play('HIT');
                        if (this.particles) this.particles.spawnHit(player.position, player.color);
                        this._killPlayer(player, collision.playerIndex === player.index ? 'TRAIL_SELF' : 'TRAIL_OTHER');
                        continue;
                    }
                }
            }

            if (!player.alive) continue;

            // Portal-Check
            const portalResult = this.arena.checkPortal(player.position, player.hitboxRadius, player.index);
            if (portalResult) {
                player.position.copy(portalResult.target);
                player.getDirection(this._tmpVec).normalize().multiplyScalar(2.0);
                player.position.add(this._tmpVec);
                if (CONFIG.GAMEPLAY.PLANAR_MODE) player.currentPlanarY = portalResult.target.y;
                player.trail.forceGap(0.5);
            }

            const pickedUp = this.powerupManager.checkPickup(player.position, player.hitboxRadius);
            if (pickedUp) {
                player.addToInventory(pickedUp);
                if (this.audio) this.audio.play('POWERUP');
                if (this.particles) this.particles.spawnHit(player.position, 0x00ff00);
            }
        }

        if (this._roundEnded) return;

        let humansAlive = 0;
        let lastHumanAlive = null;
        for (const h of this.humanPlayers) {
            if (h.alive) {
                humansAlive++;
                lastHumanAlive = h;
            }
        }

        let shouldEnd = false;
        let winner = null;

        if (this.humanPlayers.length === 1) {
            if (humansAlive === 0) {
                shouldEnd = true;
                for (let i = 0; i < this.bots.length; i++) {
                    const botPlayer = this.bots[i].player;
                    if (botPlayer && botPlayer.alive) { winner = botPlayer; break; }
                }
            }
        } else if (this.humanPlayers.length >= 2) {
            if (humansAlive <= 1) { shouldEnd = true; winner = lastHumanAlive; }
        }

        if (shouldEnd) {
            this._roundEnded = true;
            if (this.onRoundEnd) this.onRoundEnd(winner);
        }
    }

    _takeInventoryItem(player, preferredIndex = -1) {
        if (!player.inventory || player.inventory.length === 0) return { ok: false, reason: 'Kein Item verfuegbar', type: null };
        const index = Number.isInteger(preferredIndex) && preferredIndex >= 0
            ? Math.min(preferredIndex, player.inventory.length - 1)
            : Math.min(player.selectedItemIndex || 0, player.inventory.length - 1);
        const type = player.inventory.splice(index, 1)[0];
        if (player.inventory.length === 0 || player.selectedItemIndex >= player.inventory.length) player.selectedItemIndex = 0;
        return { ok: true, type };
    }

    _useInventoryItem(player, preferredIndex = -1) {
        const itemResult = this._takeInventoryItem(player, preferredIndex);
        if (!itemResult.ok) return { ok: false, reason: itemResult.reason };
        player.applyPowerup(itemResult.type);
        return { ok: true, type: itemResult.type };
    }

    _shootItemProjectile(player, preferredIndex = -1) {
        if ((player.shootCooldown || 0) > 0) return { ok: false, reason: `Schuss bereit in ${player.shootCooldown.toFixed(1)}s` };
        const itemResult = this._takeInventoryItem(player, preferredIndex);
        if (!itemResult.ok) return { ok: false, reason: itemResult.reason, type: null };
        const type = itemResult.type;
        const power = CONFIG.POWERUP.TYPES[type];
        if (!power) return { ok: false, reason: 'Item ungueltig' };
        player.getAimDirection(this._tmpDir).normalize();
        this._tmpVec.copy(player.position).addScaledVector(this._tmpDir, 2.2);
        const speed = CONFIG.PROJECTILE.SPEED;
        const radius = CONFIG.PROJECTILE.RADIUS;
        const rocketGroup = this._acquireProjectileMesh(type, power.color);
        rocketGroup.position.copy(this._tmpVec);
        this._tmpVec2.copy(this._tmpVec).add(this._tmpDir);
        rocketGroup.lookAt(this._tmpVec2);
        this.projectiles.push({
            mesh: rocketGroup,
            flame: rocketGroup.userData.flame || null,
            poolKey: type,
            owner: player,
            type,
            position: this._tmpVec.clone(),
            velocity: this._tmpDir.clone().multiplyScalar(speed),
            radius,
            ttl: CONFIG.PROJECTILE.LIFE_TIME,
            traveled: 0,
            target: this._checkLockOn(player),
        });
        player.shootCooldown = CONFIG.PROJECTILE.COOLDOWN;
        if (this.audio) this.audio.play('SHOOT');
        return { ok: true, type };
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
                if (i % 2 === 0) fin.position.x = Math.cos(angle) * 0.2;
                else { fin.position.y = Math.sin(angle) * 0.2; fin.rotation.z = Math.PI / 2; }
                rocketGroup.add(fin);
            }
            const flame = new THREE.Mesh(assets.flameGeo, assets.flameMat);
            flame.position.z = 0.85;
            rocketGroup.add(flame);
            rocketGroup.userData.flame = flame;
        }
        rocketGroup.visible = true;
        if (rocketGroup.userData.flame) rocketGroup.userData.flame.scale.set(1, 1, 1);
        this.renderer.addToScene(rocketGroup);
        return rocketGroup;
    }

    _getProjectilePool(type) {
        if (!this._projectilePools.has(type)) this._projectilePools.set(type, []);
        return this._projectilePools.get(type);
    }

    _getProjectileAssets(type, color) {
        if (this._projectileAssets.has(type)) return this._projectileAssets.get(type);
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8); bodyGeo.rotateX(Math.PI / 2);
        const tipGeo = new THREE.ConeGeometry(0.15, 0.4, 8); tipGeo.rotateX(Math.PI / 2);
        const finGeo = new THREE.BoxGeometry(0.02, 0.25, 0.3);
        const flameGeo = new THREE.ConeGeometry(0.1, 0.5, 6); flameGeo.rotateX(-Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.6 });
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: color, emissiveIntensity: 0.2, roughness: 0.2, metalness: 0.8 });
        const finMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.5 });
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
        const assets = { bodyGeo, tipGeo, finGeo, flameGeo, bodyMat, tipMat, finMat, flameMat };
        this._projectileAssets.set(type, assets);
        return assets;
    }

    _checkLockOn(player) {
        if (this._lockOnCache.has(player.index)) return this._lockOnCache.get(player.index);
        player.getDirection(this._tmpDir).normalize();
        const maxAngle = (CONFIG.HOMING.LOCK_ON_ANGLE * Math.PI) / 180;
        const maxRangeSq = CONFIG.HOMING.MAX_LOCK_RANGE * CONFIG.HOMING.MAX_LOCK_RANGE;
        let bestTarget = null; let bestDistSq = Infinity;
        for (const other of this.players) {
            if (other === player || !other.alive) continue;
            this._tmpVec.subVectors(other.position, player.position);
            const distSq = this._tmpVec.lengthSq();
            if (distSq > maxRangeSq || distSq < 1) continue;
            const angle = this._tmpDir.angleTo(this._tmpVec.normalize());
            if (angle <= maxAngle && distSq < bestDistSq) { bestTarget = other; bestDistSq = distSq; }
        }
        this._lockOnCache.set(player.index, bestTarget);
        return bestTarget;
    }

    getLockOnTarget(playerIndex) {
        if (this._lockOnCache.has(playerIndex)) return this._lockOnCache.get(playerIndex);
        const player = this.players[playerIndex];
        if (!player || !player.alive) return null;
        return this._checkLockOn(player);
    }

    _updateProjectiles(dt) {
        const time = performance.now() * 0.001;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const vx = projectile.velocity.x * dt; const vy = projectile.velocity.y * dt; const vz = projectile.velocity.z * dt;
            projectile.position.x += vx; projectile.position.y += vy; projectile.position.z += vz;
            projectile.traveled += Math.sqrt(vx * vx + vy * vy + vz * vz);
            projectile.ttl -= dt;
            projectile.mesh.position.copy(projectile.position);
            this._tmpVec.addVectors(projectile.position, projectile.velocity);
            projectile.mesh.lookAt(this._tmpVec);
            const portalResult = this.arena.checkPortal(projectile.position, projectile.radius, 1000 + i);
            if (portalResult) {
                projectile.position.copy(portalResult.target);
                this._tmpVec.copy(projectile.velocity).normalize().multiplyScalar(1.5);
                projectile.position.add(this._tmpVec);
                projectile.mesh.position.copy(projectile.position);
            }
            if (projectile.target && projectile.target.alive) {
                this._tmpVec.subVectors(projectile.target.position, projectile.position).normalize();
                this._tmpVec2.copy(projectile.velocity);
                const speed = this._tmpVec2.length();
                this._tmpVec2.normalize().lerp(this._tmpVec, Math.min(CONFIG.HOMING.TURN_RATE * dt, 1.0)).normalize();
                projectile.velocity.copy(this._tmpVec2.multiplyScalar(speed));
                this._tmpVec.addVectors(projectile.position, projectile.velocity);
                projectile.mesh.lookAt(this._tmpVec);
            }
            if (projectile.flame) {
                const flicker = 0.7 + Math.sin(time * 30 + i * 7) * 0.3;
                projectile.flame.scale.set(1, 1, flicker);
            }
            if (projectile.ttl <= 0 || projectile.traveled >= CONFIG.PROJECTILE.MAX_DISTANCE || this.arena.checkCollision(projectile.position, projectile.radius)) {
                if (this.particles) this.particles.spawnHit(projectile.position, 0xffff00);
                if (this.audio && !projectile.owner.isBot) this.audio.play('HIT');
                this._removeProjectileAt(i);
                continue;
            }
            let hit = false;
            for (const target of this.players) {
                if (!target.alive || target === projectile.owner) continue;
                // Falls OBB Check für Projektile gewünscht:
                if (target.isPointInOBB && target.isPointInOBB(projectile.position)) {
                    hit = true;
                } else {
                    const hitRadius = target.hitboxRadius + projectile.radius;
                    if (target.position.distanceToSquared(projectile.position) <= hitRadius * hitRadius) {
                        hit = true;
                    }
                }

                if (hit) {
                    if (target.hasShield) target.hasShield = false;
                    else {
                        target.applyPowerup(projectile.type);
                        if (this.particles) this.particles.spawnExplosion(target.position, 0xff0000);
                        if (this.audio) this.audio.play('POWERUP');
                    }
                    break;
                }
            }
            if (hit) this._removeProjectileAt(i);
        }
    }

    _removeProjectileAt(index) {
        const projectile = this.projectiles[index];
        if (!projectile) return;
        this._releaseProjectileMesh(projectile);
        this.projectiles.splice(index, 1);
    }

    _releaseProjectileMesh(projectile) {
        this.renderer.removeFromScene(projectile.mesh);
        projectile.mesh.visible = false;
        const pool = this._getProjectilePool(projectile.poolKey || projectile.type);
        pool.push(projectile.mesh);
    }

    _notifyPlayerFeedback(player, message) { if (this.onPlayerFeedback) this.onPlayerFeedback(player, message); }

    _killPlayer(player, cause = 'UNKNOWN') {
        player.kill();
        if (this.particles) this.particles.spawnExplosion(player.position, player.color);
        if (this.audio) this.audio.play('EXPLOSION');
        if (this.recorder) { this.recorder.markPlayerDeath(player, cause); this.recorder.logEvent('KILL', player.index, `cause=${cause}`); }
        if (this.onPlayerDied) this.onPlayerDied(player, cause);
    }

    _isBotPositionSafe(player, position) {
        if (this.arena.checkCollision(position, player.hitboxRadius)) return false;
        const hit = this.checkGlobalCollision(position, player.hitboxRadius, player.index, 20);
        return !hit;
    }

    _clampBotPosition(vec) {
        const b = this.arena.bounds;
        vec.x = Math.max(b.minX + 2, Math.min(b.maxX - 2, vec.x));
        vec.y = Math.max(b.minY + 2, Math.min(b.maxY - 2, vec.y));
        vec.z = Math.max(b.minZ + 2, Math.min(b.maxZ - 2, vec.z));
    }

    _findSafeBouncePosition(player, baseDirection, normal = null) {
        const pos = player.position;
        const distances = [1.5, 3.0, 5.0, 0.5];
        for (const dist of distances) {
            this._tmpVec2.copy(pos).addScaledVector(baseDirection, dist);
            if (this._isBotPositionSafe(player, this._tmpVec2)) {
                pos.copy(this._tmpVec2);
                return;
            }
        }
        if (normal) {
            pos.addScaledVector(normal, 2.0);
            if (this._isBotPositionSafe(player, pos)) return;
        }
        const b = this.arena.bounds;
        pos.set((b.minX + b.maxX) * 0.5, (b.minY + b.maxY) * 0.5, (b.minZ + b.maxZ) * 0.5);
    }

    _bounceBot(player, normalOverride = null, source = 'WALL') {
        const pos = player.position;
        let normal = normalOverride;
        if (!normal) {
            const b = this.arena.bounds;
            const dLeft = pos.x - b.minX; const dRight = b.maxX - pos.x;
            const dDown = pos.y - b.minY; const dUp = b.maxY - pos.y;
            const dBack = pos.z - b.minZ; const dFront = b.maxZ - pos.z;
            let minDist = dLeft; this._tmpVec2.set(1, 0, 0);
            if (dRight < minDist) { minDist = dRight; this._tmpVec2.set(-1, 0, 0); }
            if (dDown < minDist) { minDist = dDown; this._tmpVec2.set(0, 1, 0); }
            if (dUp < minDist) { minDist = dUp; this._tmpVec2.set(0, -1, 0); }
            if (dFront < minDist) { minDist = dFront; this._tmpVec2.set(0, 0, 1); }
            if (dBack < minDist) { minDist = dBack; this._tmpVec2.set(0, 0, -1); }
            normal = this._tmpVec2;
        }
        player.getDirection(this._tmpDir).normalize();
        const dot = this._tmpDir.dot(normal);
        this._tmpDir.x -= 2 * dot * normal.x; this._tmpDir.y -= 2 * dot * normal.y; this._tmpDir.z -= 2 * dot * normal.z;
        this._tmpDir.normalize();
        this._tmpDir.addScaledVector(normal, 0.25);
        const randomScale = source === 'TRAIL' ? 0.35 : 0.24;
        this._tmpDir.x += (Math.random() - 0.5) * randomScale;
        this._tmpDir.y += (Math.random() - 0.5) * randomScale;
        this._tmpDir.z += (Math.random() - 0.5) * randomScale;
        if (CONFIG.GAMEPLAY.PLANAR_MODE) this._tmpDir.y = 0;
        this._tmpDir.normalize();
        this._tmpDir.addScaledVector(this._tmpDir, 1); // Ein Stück weg von der Wand
        this._tmpVec.copy(pos).add(this._tmpDir);
        player.group.lookAt(this._tmpVec);
        player.quaternion.copy(player.group.quaternion);
        this._findSafeBouncePosition(player, this._tmpDir, normal);
        player.trail.forceGap(0.3);
        const botAI = this.botByPlayer.get(player);
        if (botAI?.onBounce) botAI.onBounce(source, normal);
        if (this.recorder) this.recorder.logEvent(source === 'TRAIL' ? 'BOUNCE_TRAIL' : 'BOUNCE_WALL', player.index);
    }

    updateCameras(dt) {
        for (const player of this.players) {
            if (!player.isBot && player.index < this.renderer.cameras.length) {
                const pos = player.position;
                const dir = player.alive ? player.getDirection(this._tmpDir2) : this._tmpDir2.set(0, 0, -1);
                const firstPersonAnchor = player.getFirstPersonCameraAnchor(this._tmpCamAnchor);
                this.renderer.updateCamera(player.index, pos, dir, dt, player.quaternion, player.cockpitCamera, player.isBoosting, this.arena, firstPersonAnchor);
            }
        }
    }

    getHumanPlayers() { return this.humanPlayers; }

    clear() {
        for (const p of this.players) p.dispose();
        this.players = []; this.humanPlayers = []; this.bots = []; this.botByPlayer.clear();
        this._lockOnCache.clear(); this.spatialGrid.clear();
        for (const p of this.projectiles) this._releaseProjectileMesh(p);
        this.projectiles = [];
    }

    _getGridKey(x, z) {
        const cx = Math.floor(x / this.gridSize);
        const cz = Math.floor(z / this.gridSize);
        return (cx + 1000) * 2000 + (cz + 1000);
    }

    registerTrailSegment(playerIndex, segmentIdx, data) {
        const key = this._getGridKey(data.midX, data.midZ);
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
        const entry = { playerIndex, segmentIdx, fromX: data.fromX, fromY: data.fromY, fromZ: data.fromZ, toX: data.toX, toY: data.toY, toZ: data.toZ, radius: data.radius };
        this.spatialGrid.get(key).add(entry);
        return { key, entry };
    }

    unregisterTrailSegment(key, entry) {
        const cell = this.spatialGrid.get(key);
        if (cell) { cell.delete(entry); if (cell.size === 0) this.spatialGrid.delete(key); }
    }

    checkGlobalCollision(position, radius, excludePlayerIndex = -1, skipRecent = 0, playerRef = null) {
        const cellX = Math.floor(position.x / this.gridSize);
        const cellZ = Math.floor(position.z / this.gridSize);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = (cellX + dx + 1000) * 2000 + (cellZ + dz + 1000);
                const cell = this.spatialGrid.get(key);
                if (!cell) continue;

                for (const seg of cell) {
                    if (seg.playerIndex === excludePlayerIndex) {
                        const player = this.players[seg.playerIndex];
                        if (player && player.trail) {
                            let dist = (player.trail.writeIndex - 1 - seg.segmentIdx + player.trail.maxSegments) % player.trail.maxSegments;
                            if (dist < skipRecent) continue;
                        }
                    }

                    // AABB Vor-Check
                    const totalRadius = radius + seg.radius;
                    const minX = Math.min(seg.fromX, seg.toX) - seg.radius;
                    const maxX = Math.max(seg.fromX, seg.toX) + seg.radius;
                    if (position.x < minX - radius || position.x > maxX + radius) continue;

                    const minY = Math.min(seg.fromY, seg.toY) - seg.radius;
                    const maxY = Math.max(seg.fromY, seg.toY) + seg.radius;
                    if (position.y < minY - radius || position.y > maxY + radius) continue;

                    const minZ = Math.min(seg.fromZ, seg.toZ) - seg.radius;
                    const maxZ = Math.max(seg.fromZ, seg.toZ) + seg.radius;
                    if (position.z < minZ - radius || position.z > maxZ + radius) continue;

                    // Präzise Linien-Abstandsprüfung
                    const vx = seg.toX - seg.fromX;
                    const vy = seg.toY - seg.fromY;
                    const vz = seg.toZ - seg.fromZ;
                    const wx = position.x - seg.fromX;
                    const wy = position.y - seg.fromY;
                    const wz = position.z - seg.fromZ;

                    const lenSq = vx * vx + vy * vy + vz * vz;
                    let t = 0;
                    if (lenSq > 0.000001) {
                        t = Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / lenSq));
                    }

                    const closestX = seg.fromX + t * vx;
                    const closestY = seg.fromY + t * vy;
                    const closestZ = seg.fromZ + t * vz;

                    const dxp = position.x - closestX;
                    const dyp = position.y - closestY;
                    const dzp = position.z - closestZ;

                    if (dxp * dxp + dyp * dyp + dzp * dzp <= totalRadius * totalRadius) {
                        // If OBB check is possible, then final check
                        if (playerRef && playerRef.isSphereInOBB) {
                            // We use _tmpVec for the point check
                            this._tmpVec.set(closestX, closestY, closestZ);
                            if (playerRef.isSphereInOBB(this._tmpVec, seg.radius)) {
                                return { hit: true, playerIndex: seg.playerIndex };
                            }
                        } else {
                            return { hit: true, playerIndex: seg.playerIndex };
                        }
                    }
                }
            }
        }
        return null;
    }

    dispose() {
        this.clear();
        // Assets disposen, um GPU-Leaks zu verhindern
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
    }
}
