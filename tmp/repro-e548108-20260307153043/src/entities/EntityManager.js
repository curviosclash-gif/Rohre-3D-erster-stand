// ============================================
// EntityManager.js - manages players, collisions and item projectiles
// ============================================

import { CONFIG } from '../core/Config.js';
import { BotPolicyRegistry } from './ai/BotPolicyRegistry.js';
import { DEFAULT_BOT_POLICY_TYPE } from './ai/BotPolicyTypes.js';
import { createBotRuntimeContext } from './ai/BotRuntimeContextFactory.js';
import { assembleEntityRuntime } from './runtime/EntityRuntimeAssembler.js';
import { isHuntHealthActive } from '../hunt/HealthSystem.js';

function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export class EntityManager {
    static deriveSelfTrailSkipRecentSegments(player) {
        const updateInterval = Math.max(0.01, Number(CONFIG.TRAIL?.UPDATE_INTERVAL) || 0.07);
        const speed = Math.max(1, Number(player?.speed) || Number(player?.baseSpeed) || Number(CONFIG.PLAYER?.SPEED) || 18);
        const hitboxRadius = Math.max(0.4, Number(player?.hitboxRadius) || Number(CONFIG.PLAYER?.HITBOX_RADIUS) || 0.8);
        const trailRadius = Math.max(0.05, (Number(player?.trail?.width) || Number(CONFIG.TRAIL?.WIDTH) || 0.6) * 0.5);

        let bodyLengthEstimate = hitboxRadius * 2.5;
        const box = player?.hitboxBox;
        if (box && box.min && box.max) {
            const lenX = Math.abs(Number(box.max.x) - Number(box.min.x)) || 0;
            const lenZ = Math.abs(Number(box.max.z) - Number(box.min.z)) || 0;
            bodyLengthEstimate = Math.max(bodyLengthEstimate, lenX, lenZ);
        }

        const graceDistance = Math.max(
            hitboxRadius * 3.5,
            bodyLengthEstimate + hitboxRadius * 0.5 + trailRadius
        );
        const estimatedSegmentSpacing = Math.max(0.2, speed * updateInterval);

        return clampInt(Math.ceil(graceDistance / estimatedSegmentSpacing) + 1, 5, 12);
    }

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
        this.onPlayerDied = null;
        this.onRoundEnd = null;
        this.onPlayerFeedback = null;
        this.onHuntFeedEvent = null;
        this.onHuntDamageEvent = null;
        this.botDifficulty = CONFIG.BOT.ACTIVE_DIFFICULTY || CONFIG.BOT.DEFAULT_DIFFICULTY || 'NORMAL';
        Object.assign(this, assembleEntityRuntime(this));
        this.projectiles = this._projectileSystem.projectiles;
        this.botPolicyRegistry = new BotPolicyRegistry();
        this.botPolicyType = DEFAULT_BOT_POLICY_TYPE;
        this.activeGameMode = CONFIG?.HUNT?.ACTIVE_MODE || 'classic';
        this.huntEnabled = isHuntHealthActive();
        this.runtimeConfig = null;
    }

    setup(numHumans, numBots, options = {}) {
        console.log(`[EntityManager] Setup: Humans=${numHumans}, Bots=${numBots}`);
        this.clear();
        this._setupOps.runSetup(numHumans, numBots, options);
    }

    _applySetupRuntimeOptions(options = {}) {
        this._setupOps.applySetupRuntimeOptions(options);
    }

    _resolveSetupPlayerContext(options = {}) {
        return this._setupOps.resolveSetupPlayerContext(options);
    }

    _resetSetupCollections() {
        this._setupOps.resetSetupCollections();
    }

    _setupHumanPlayers(numHumans, setupContext) {
        this._setupOps.setupHumanPlayers(numHumans, setupContext);
    }

    _setupBotPlayers(numHumans, numBots, setupContext) {
        this._setupOps.setupBotPlayers(numHumans, numBots, setupContext);
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

    createBotRuntimeContext(player, dt, options = {}) {
        return createBotRuntimeContext(this, player, dt, options);
    }

    spawnAll() {
        this._spawnOps.spawnAll();
    }

    _createSpawnContext() {
        return this._spawnOps.createSpawnContext();
    }

    _spawnPlayer(player, spawnContext) {
        this._spawnOps.spawnPlayer(player, spawnContext);
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
        return this._spawnPlacementSystem.findSpawnPosition(minDistance, margin, planarLevel);
    }

    _findSafeSpawnDirection(position, radius = 0.8) {
        return this._spawnPlacementSystem.findSafeSpawnDirection(position, radius);
    }

    _traceFreeDistance(origin, direction, maxDistance, stepDistance, radius = 0.8) {
        return this._spawnPlacementSystem.traceFreeDistance(origin, direction, maxDistance, stepDistance, radius);
    }

    update(dt, inputManager) {
        this._tickPipeline.update(dt, inputManager);
    }

    _getPendingHumanRespawns(players = this.humanPlayers) {
        const huntRespawnEnabled = isHuntHealthActive() && !!CONFIG?.HUNT?.RESPAWN_ENABLED;
        if (!huntRespawnEnabled) return 0;
        return this._respawnSystem.getPendingCountForPlayers(players);
    }

    _takeInventoryItem(player, preferredIndex = -1) {
        return this._huntCombatSystem.takeInventoryItem(player, preferredIndex);
    }

    _useInventoryItem(player, preferredIndex = -1) {
        return this._huntCombatSystem.useInventoryItem(player, preferredIndex);
    }

    _shootItemProjectile(player, preferredIndex = -1) {
        return this._huntCombatSystem.shootItemProjectile(player, preferredIndex);
    }

    _shootHuntGun(player) {
        return this._huntCombatSystem.shootHuntGun(player);
    }

    getHuntOverheatSnapshot() {
        return this._overheatGunSystem.getOverheatSnapshot();
    }

    getHuntScoreboard() {
        return this._huntScoring.getScoreboard(this.players);
    }

    getHuntScoreboardSummary(maxEntries = 3) {
        return this._huntScoring.formatSummary(this.players, { maxEntries });
    }

    _checkLockOn(player) {
        return this._huntCombatSystem.checkLockOn(player);
    }

    getLockOnTarget(playerIndex) {
        if (this._lockOnCache.has(playerIndex)) return this._lockOnCache.get(playerIndex);
        const player = this.players[playerIndex];
        if (!player || !player.alive) return null;
        return this._checkLockOn(player);
    }

    _notifyPlayerFeedback(player, message) { this._eventBus.emitPlayerFeedback(player, message); }

    _emitHuntDamageEvent(event) {
        if (isHuntHealthActive()) {
            this._huntScoring.registerDamage(event?.sourcePlayer, event?.target, event?.damageResult);
        }
        this._eventBus.emitHuntDamageEvent(event || null);
    }

    _killPlayer(player, cause = 'UNKNOWN', options = {}) {
        if (!player || !player.alive) return;
        player.kill();
        if (isHuntHealthActive()) {
            this._huntScoring.registerElimination(player, {
                killer: options?.killer || null,
            });
        }
        this._respawnSystem.onPlayerDied(player);
        if (this.particles) this.particles.spawnExplosion(player.position, player.color);
        if (this.audio) this.audio.play('EXPLOSION');
        if (this.recorder) {
            const killerIndex = Number.isInteger(options?.killer?.index) ? options.killer.index : -1;
            this.recorder.markPlayerDeath(player, cause);
            this.recorder.logEvent('KILL', player.index, `cause=${cause} killer=${killerIndex}`);
        }
        this._eventBus.emitPlayerDied(player, cause);
    }

    _isBotPositionSafe(player, position) {
        return this._collisionResponseSystem.isBotPositionSafe(player, position);
    }

    _clampBotPosition(vec) {
        this._collisionResponseSystem.clampBotPosition(vec);
    }

    _findSafeBouncePosition(player, baseDirection, normal = null, options = {}) {
        this._spawnPlacementSystem.findSafeBouncePosition(player, baseDirection, normal, options);
    }

    _bounceBot(player, normalOverride = null, source = 'WALL', options = {}) {
        this._collisionResponseSystem.bounceBot(player, normalOverride, source, options);
    }

    _bouncePlayerOnFoam(player, normalOverride = null) {
        this._collisionResponseSystem.bouncePlayerOnFoam(player, normalOverride);
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
    getRuntimeContext() { return this._runtimeContext; }
    getTrailSpatialIndex() { return this._trailSpatialIndex; }

    registerTrailSegment(playerIndex, segmentIdx, data, reusableRef = null) {
        return this._trailSpatialIndex.registerTrailSegment(playerIndex, segmentIdx, data, reusableRef);
    }

    unregisterTrailSegment(key, entry) {
        this._trailSpatialIndex.unregisterTrailSegment(key, entry);
    }

    checkGlobalCollision(position, radius, excludePlayerIndex = -1, skipRecent = 0, playerRef = null) {
        return this._trailSpatialIndex.checkGlobalCollision(position, radius, excludePlayerIndex, skipRecent, playerRef);
    }

    clear() {
        this._teardownRuntime({ disposeProjectileSystem: false });
    }

    dispose() {
        this._teardownRuntime({ disposeProjectileSystem: true });
    }

    _teardownRuntime({ disposeProjectileSystem = false } = {}) {
        for (const player of this.players) {
            if (player) player.dispose();
        }
        this.players.length = 0;
        this.humanPlayers.length = 0;
        this.bots.length = 0;
        this.botByPlayer.clear();
        if (disposeProjectileSystem) {
            this._projectileSystem.dispose();
        } else {
            this._projectileSystem.clear();
        }
        this._overheatGunSystem.reset();
        this._respawnSystem.reset();
        this._huntScoring.reset();

        if (this.powerupManager) {
            this.powerupManager.clear();
        }

        this._trailSpatialIndex.clear();
        this._lockOnCache.clear();
        this.onHuntDamageEvent = null;
        this.onHuntFeedEvent = null;
    }
}



