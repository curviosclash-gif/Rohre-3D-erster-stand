// ============================================
// Bot.js - AI opponent logic
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { runPerception } from './ai/BotSensingOps.js';
import { runDecision } from './ai/BotDecisionOps.js';
import { runAction } from './ai/BotActionOps.js';
import { estimateEnemyPressure, estimatePointRisk, selectTarget } from './ai/BotTargetingOps.js';
import { enterRecovery, updateRecovery, updateStuckState } from './ai/BotRecoveryOps.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const MAP_BEHAVIOR = {
    standard: { caution: 0.0, portalBias: 0.0, aggressionBias: 0.0 },
    empty: { caution: -0.12, portalBias: -0.08, aggressionBias: 0.16 },
    maze: { caution: 0.22, portalBias: 0.06, aggressionBias: -0.1 },
    complex: { caution: 0.16, portalBias: 0.08, aggressionBias: -0.04 },
    pyramid: { caution: 0.08, portalBias: 0.12, aggressionBias: 0.03 },
};

// Statische Richtungen fÃ¼r Portalsensorik (Vermeidet Array-Allokation pro Aufruf)
const PORTAL_EXIT_CHECK_DIRS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];

const BOT_COLLISION_CACHE_POS_SCALE = 32;
const BOT_COLLISION_CACHE_RADIUS_SCALE = 64;
const BOT_PROBE_LATERAL_SCAN_CLEAR_RATIO = 0.92;

// Phase 3: Kontextsensitive Item-Regeln (emergencyScale + combatSelf)
const ITEM_RULES = {
    SPEED_UP: { self: 0.8, offense: 0.2, defensiveScale: 0.5, emergencyScale: 0.1, combatSelf: 0.2 },
    SLOW_DOWN: { self: -0.8, offense: 0.9, defensiveScale: 0.1, emergencyScale: 0.0, combatSelf: -0.3 },
    THICK: { self: 0.9, offense: 0.1, defensiveScale: 0.8, emergencyScale: 0.2, combatSelf: 0.4 },
    THIN: { self: -0.6, offense: 0.7, defensiveScale: 0.2, emergencyScale: 0.0, combatSelf: -0.2 },
    SHIELD: { self: 0.5, offense: 0.0, defensiveScale: 1.2, emergencyScale: 2.5, combatSelf: 0.8 },
    SLOW_TIME: { self: 0.7, offense: 0.35, defensiveScale: 0.6, emergencyScale: 0.4, combatSelf: 0.3 },
    GHOST: { self: 0.95, offense: 0.1, defensiveScale: 1.0, emergencyScale: 2.0, combatSelf: 0.5 },
    INVERT: { self: -0.7, offense: 0.85, defensiveScale: 0.15, emergencyScale: 0.0, combatSelf: -0.4 },
};

function createProbe(name, yaw, pitch, weight = 0) {
    return {
        name,
        yaw,
        pitch,
        weight,
        dir: new THREE.Vector3(),
        risk: 999,
        wallDist: 0,
        trailDist: 0,
        clearance: 0,
        immediateDanger: false,
    };
}

export class BotAI {
    constructor(options = {}) {
        this.recorder = options.recorder || null;

        this.currentInput = {
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

        this.reactionTimer = 0;
        this._profileName = 'NORMAL';
        this.profile = null;

        this._decision = {
            yaw: 0,
            pitch: 0,
            boost: false,
            useItem: -1,
            shootItem: false,
            shootItemIndex: -1,
        };

        this.state = {
            turnCommitTimer: 0,
            committedYaw: 0,
            committedPitch: 0,

            recoveryActive: false,
            recoveryTimer: 0,
            recoveryCooldown: 0,
            recoveryYaw: 0,
            recoveryPitch: 0,
            recoverySwitchUsed: false,

            targetPlayer: null,
            targetRefreshTimer: 0,
            itemUseCooldown: 0,
            itemShootCooldown: 0,

            portalIntentActive: false,
            portalIntentTimer: 0,
            portalIntentScore: 0,
            portalEntryDistanceSq: Infinity,
        };

        this.sense = {
            lookAhead: 0,
            forwardRisk: 1,
            bestProbe: null,
            targetDistanceSq: Infinity,
            targetInFront: false,
            immediateDanger: false,
            pressure: 0,
            localOpenness: 0,
            mapCaution: 0,
            mapPortalBias: 0,
            mapAggressionBias: 0,
            projectileThreat: false,
            projectileEvadeYaw: 0,
            projectileEvadePitch: 0,
            heightBias: 0,
            botRepulsionYaw: 0,
            botRepulsionPitch: 0,
            pursuitActive: false,
            pursuitYaw: 0,
            pursuitPitch: 0,
            pursuitAimDot: 0,
        };

        this._checkStuckTimer = 0;
        this._stuckScore = 0;
        this._recentBouncePressure = 0;
        this._bounceStreak = 0;
        this._bounceStreakTimer = 0;
        this._recoveryChainCount = 0;
        this._recoveryChainTimer = 0;
        this._lastRecoveryReason = '';
        this._lastRecoveryYaw = 0;
        this._hasPositionSample = false;
        this._lastPos = new THREE.Vector3();
        this._lastCollisionNormal = new THREE.Vector3();
        this._hasCollisionNormal = false;

        this._portalEntry = new THREE.Vector3();
        this._portalExit = new THREE.Vector3();
        this._portalTarget = null;

        this._tmpForward = new THREE.Vector3();
        this._tmpRight = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3();
        this._tmpVec = new THREE.Vector3();
        this._tmpVec2 = new THREE.Vector3();
        this._tmpVec3 = new THREE.Vector3();

        // Phase 1: Erweiterte Probes (12 statt 7)
        this._probes = [
            createProbe('forward', 0, 0, 0),
            createProbe('left', -1.0, 0, 0.02),
            createProbe('right', 1.0, 0, 0.02),
            createProbe('leftWide', -1.8, 0, 0.07),
            createProbe('rightWide', 1.8, 0, 0.07),
            createProbe('up', 0, 0.9, 0.08),
            createProbe('down', 0, -0.9, 0.08),
            // Neue diagonale Probes
            createProbe('upLeft', -0.7, 0.7, 0.10),
            createProbe('upRight', 0.7, 0.7, 0.10),
            createProbe('downLeft', -0.7, -0.7, 0.10),
            createProbe('downRight', 0.7, -0.7, 0.10),
            // Backward-Probe fÃ¼r RÃ¼ckwÃ¤rtserkennung
            createProbe('backward', 3.14, 0, 0.25),
        ];

        this._collisionCache = new Map();
        this._lastSensePos = new THREE.Vector3();
        this._probeRayCenter = { wallDist: 0, trailDist: 0, immediateDanger: false };
        this._probeRayLeft = { wallDist: 0, trailDist: 0, immediateDanger: false };
        this._probeRayRight = { wallDist: 0, trailDist: 0, immediateDanger: false };

        // Time-Slicing: Sensor-Scans auf verschiedene Frames verteilen
        this._sensePhase = 0;         // Frame-Slot dieses Bots (0..3), von EntityManager gesetzt
        this._sensePhaseCounter = 0;  // Hochzaehlender Frame-Zaehler

        this._setDifficulty(options.difficulty || CONFIG.BOT.ACTIVE_DIFFICULTY || CONFIG.BOT.DEFAULT_DIFFICULTY || 'NORMAL');
        this._checkStuckTimer = this.profile.stuckCheckInterval;
    }

    _setDifficulty(profileName) {
        const profiles = CONFIG.BOT.DIFFICULTY_PROFILES || {};
        const upper = typeof profileName === 'string' ? profileName.toUpperCase() : 'NORMAL';
        this._profileName = profiles[upper] ? upper : 'NORMAL';

        const fallback = {
            reactionTime: CONFIG.BOT.REACTION_TIME || 0.15,
            lookAhead: CONFIG.BOT.LOOK_AHEAD || 12,
            aggression: CONFIG.BOT.AGGRESSION || 0.5,
            errorRate: 0,
            probeSpread: 0.7,
            probeStep: 2,
            turnCommitTime: 0.25,
            stuckCheckInterval: 0.4,
            stuckTriggerTime: 1.6,
            minProgressDistance: 0.9,
            minForwardProgress: 0.45,
            recoveryDuration: 1.0,
            recoveryCooldown: 1.5,
            itemUseCooldown: 1.0,
            itemShootCooldown: 0.6,
            targetRefreshInterval: 0.2,
            portalInterest: 0.5,
            portalSeekDistance: 70,
            portalEntryDotMin: 0.3,
            portalIntentThreshold: 0.2,
            portalIntentDuration: 1.0,
            boostChance: 0.004,
        };

        this.profile = { ...fallback, ...(profiles[this._profileName] || {}) };
    }

    setDifficulty(profileName) {
        this._setDifficulty(profileName);
        this.reactionTimer = 0;
        this.state.turnCommitTimer = 0;
        this.state.recoveryActive = false;
    }

    onBounce(type, normal = null) {
        const pressure = type === 'TRAIL' ? 1.3 : 0.9;
        this._recentBouncePressure = Math.min(4, this._recentBouncePressure + pressure);
        if (type === 'TRAIL' || type === 'WALL') {
            this._bounceStreak = Math.min(8, this._bounceStreak + 1);
            this._bounceStreakTimer = 1.25;
        }
        if (normal) {
            this._lastCollisionNormal.copy(normal).normalize();
            this._hasCollisionNormal = true;
        }
    }

    _resetInput(input) {
        input.pitchUp = false;
        input.pitchDown = false;
        input.yawLeft = false;
        input.yawRight = false;
        input.rollLeft = false;
        input.rollRight = false;
        input.boost = false;
        input.cameraSwitch = false;
        input.dropItem = false;
        input.shootItem = false;
        input.shootItemIndex = -1;
        input.nextItem = false;
        input.useItem = -1;
    }

    _resetDecision() {
        this._decision.yaw = 0;
        this._decision.pitch = 0;
        this._decision.boost = false;
        this._decision.useItem = -1;
        this._decision.shootItem = false;
        this._decision.shootItemIndex = -1;
    }

    _buildBasis(forward) {
        this._tmpRight.crossVectors(WORLD_UP, forward);
        if (this._tmpRight.lengthSq() < 0.000001) {
            this._tmpRight.set(1, 0, 0);
        } else {
            this._tmpRight.normalize();
        }
        this._tmpUp.crossVectors(forward, this._tmpRight).normalize();
    }

    _updateTimers(dt) {
        this.reactionTimer -= dt;
        this._checkStuckTimer -= dt;
        this._recentBouncePressure = Math.max(0, this._recentBouncePressure - dt * 1.35);
        this._bounceStreakTimer = Math.max(0, this._bounceStreakTimer - dt);
        if (this._bounceStreakTimer === 0) {
            this._bounceStreak = 0;
        }
        this._recoveryChainTimer = Math.max(0, this._recoveryChainTimer - dt);
        if (this._recoveryChainTimer === 0) {
            this._recoveryChainCount = 0;
            this._lastRecoveryReason = '';
        }

        this.state.turnCommitTimer = Math.max(0, this.state.turnCommitTimer - dt);
        this.state.recoveryCooldown = Math.max(0, this.state.recoveryCooldown - dt);
        this.state.targetRefreshTimer = Math.max(0, this.state.targetRefreshTimer - dt);
        this.state.itemUseCooldown = Math.max(0, this.state.itemUseCooldown - dt);
        this.state.itemShootCooldown = Math.max(0, this.state.itemShootCooldown - dt);
        this.state.portalIntentTimer = Math.max(0, this.state.portalIntentTimer - dt);

        if (this.state.portalIntentTimer === 0) {
            this.state.portalIntentActive = false;
            this.state.portalIntentScore = 0;
            this._portalTarget = null;
        }
    }

    _selectTarget(player, allPlayers) {
        selectTarget(this, player, allPlayers);
    }

    _estimateEnemyPressure(position, owner, allPlayers) {
        return estimateEnemyPressure(this, position, owner, allPlayers);
    }

    _estimatePointRisk(point, player, arena, allPlayers) {
        return estimatePointRisk(this, point, player, arena, allPlayers);
    }

    _updateStuckState(player, arena, allPlayers) {
        updateStuckState(this, player, arena, allPlayers);
    }

    _enterRecovery(player, arena, allPlayers, reason) {
        enterRecovery(this, player, arena, allPlayers, reason);
    }

    _updateRecovery(dt, player, arena, allPlayers) {
        return updateRecovery(this, dt, player, arena, allPlayers);
    }

    _computeDynamicLookAhead(player) {
        const base = this.profile.lookAhead;
        const speedRatio = player.baseSpeed > 0 ? player.speed / player.baseSpeed : 1;
        let lookAhead = base * (1 + (speedRatio - 1) * 0.75);
        if (player.isBoosting) lookAhead *= 1.2;
        return Math.max(8, lookAhead);
    }

    _mapBehavior(arena) {
        const mapKey = arena.currentMapKey || 'standard';
        return MAP_BEHAVIOR[mapKey] || MAP_BEHAVIOR.standard;
    }

    _composeProbeDirection(forward, right, up, probe) {
        const yawFactor = probe.yaw * this.profile.probeSpread;
        const pitchFactor = probe.pitch * this.profile.probeSpread;

        probe.dir.copy(forward);
        if (yawFactor !== 0) probe.dir.addScaledVector(right, yawFactor);
        if (!CONFIG.GAMEPLAY.PLANAR_MODE && pitchFactor !== 0) probe.dir.addScaledVector(up, pitchFactor);
        probe.dir.normalize();
    }

    _buildCollisionMemoKey(position, radius, excludePlayerIndex, skipRecent) {
        const qx = Math.round(position.x * BOT_COLLISION_CACHE_POS_SCALE);
        const qy = Math.round(position.y * BOT_COLLISION_CACHE_POS_SCALE);
        const qz = Math.round(position.z * BOT_COLLISION_CACHE_POS_SCALE);
        const qr = Math.round(radius * BOT_COLLISION_CACHE_RADIUS_SCALE);

        let hash = 2166136261;
        hash = Math.imul(hash ^ qx, 16777619);
        hash = Math.imul(hash ^ qy, 16777619);
        hash = Math.imul(hash ^ qz, 16777619);
        hash = Math.imul(hash ^ qr, 16777619);
        hash = Math.imul(hash ^ (excludePlayerIndex + 2048), 16777619);
        hash = Math.imul(hash ^ skipRecent, 16777619);
        return hash >>> 0;
    }

    _getCollisionMemoized(entityManager, position, radius, excludePlayerIndex, skipRecent, playerRef) {
        const key = this._buildCollisionMemoKey(position, radius, excludePlayerIndex, skipRecent);
        const cached = this._collisionCache.get(key);
        if (cached !== undefined) {
            return cached === 1;
        }

        const hit = entityManager.checkGlobalCollision(position, radius, excludePlayerIndex, skipRecent, playerRef);
        const hasHit = !!(hit && hit.hit);
        this._collisionCache.set(key, hasHit ? 1 : 0);
        return hasHit;
    }

    _checkTrailHit(position, player, allPlayers, radius = player.hitboxRadius * 1.6, skipRecent = 20) {
        const entityManager = player?.trail?.entityManager;
        if (!entityManager) return false;
        return this._getCollisionMemoized(entityManager, position, radius, player.index, skipRecent, player);
    }

    _scanProbeRay(player, arena, allPlayers, direction, lookAhead, step, out) {
        out.wallDist = lookAhead;
        out.trailDist = lookAhead;
        out.immediateDanger = false;

        const radius = player.hitboxRadius * 1.6;
        const skipRecent = 20;
        const stepX = direction.x * step;
        const stepY = direction.y * step;
        const stepZ = direction.z * step;

        this._tmpVec.set(
            player.position.x + stepX,
            player.position.y + stepY,
            player.position.z + stepZ
        );

        for (let d = step; d <= lookAhead; d += step) {
            if (arena.checkCollisionFast(this._tmpVec, radius)) {
                out.wallDist = d;
                if (d <= step * 1.5) out.immediateDanger = true;
                break;
            }

            if (this._checkTrailHit(this._tmpVec, player, allPlayers, radius, skipRecent)) {
                out.trailDist = d;
                if (d <= step * 1.5) out.immediateDanger = true;
                break;
            }

            this._tmpVec.x += stepX;
            this._tmpVec.y += stepY;
            this._tmpVec.z += stepZ;
        }
    }

    _scoreProbe(player, arena, allPlayers, probe, lookAhead) {
        const step = this.profile.probeStep;

        // Phase 1: Adaptive LookAhead pro Probe-Typ
        let probeLookAhead = lookAhead;
        const absYaw = Math.abs(probe.yaw);
        if (absYaw > 2.5) {
            probeLookAhead = lookAhead * 0.4;  // backward
        } else if (absYaw > 1.2) {
            probeLookAhead = lookAhead * 0.7;  // wide sides
        }

        this._scanProbeRay(player, arena, allPlayers, probe.dir, probeLookAhead, step, this._probeRayCenter);

        const lateralStrength = CONFIG.GAMEPLAY.PLANAR_MODE ? 0.2 : 0.24;
        const lateralLookAhead = probeLookAhead * 0.9;
        const centerClearance = Math.min(this._probeRayCenter.wallDist, this._probeRayCenter.trailDist);
        const shouldScanLaterals = this._probeRayCenter.immediateDanger
            || centerClearance < probeLookAhead * BOT_PROBE_LATERAL_SCAN_CLEAR_RATIO;

        if (shouldScanLaterals) {
            this._tmpVec2.copy(probe.dir).addScaledVector(this._tmpRight, lateralStrength).normalize();
            this._scanProbeRay(player, arena, allPlayers, this._tmpVec2, lateralLookAhead, step, this._probeRayLeft);

            this._tmpVec3.copy(probe.dir).addScaledVector(this._tmpRight, -lateralStrength).normalize();
            this._scanProbeRay(player, arena, allPlayers, this._tmpVec3, lateralLookAhead, step, this._probeRayRight);
        } else {
            this._probeRayLeft.wallDist = this._probeRayCenter.wallDist;
            this._probeRayLeft.trailDist = this._probeRayCenter.trailDist;
            this._probeRayLeft.immediateDanger = this._probeRayCenter.immediateDanger;
            this._probeRayRight.wallDist = this._probeRayCenter.wallDist;
            this._probeRayRight.trailDist = this._probeRayCenter.trailDist;
            this._probeRayRight.immediateDanger = this._probeRayCenter.immediateDanger;
        }

        const wallDist = Math.min(this._probeRayCenter.wallDist, this._probeRayLeft.wallDist, this._probeRayRight.wallDist);
        const trailDist = Math.min(this._probeRayCenter.trailDist, this._probeRayLeft.trailDist, this._probeRayRight.trailDist);
        const immediateDanger = this._probeRayCenter.immediateDanger
            || this._probeRayLeft.immediateDanger
            || this._probeRayRight.immediateDanger;

        // Phase 1: Speed-basiertes Risiko
        const speedRatio = player.baseSpeed > 0 ? player.speed / player.baseSpeed : 1;
        const speedFactor = Math.max(0, speedRatio - 1) * 0.3;

        const wallRisk = 1 - Math.min(1, wallDist / probeLookAhead);
        const trailRisk = 1 - Math.min(1, trailDist / probeLookAhead);
        let risk = wallRisk * (1.1 + this.sense.mapCaution + speedFactor)
            + trailRisk * (1.45 + this.sense.mapCaution * 0.5 + speedFactor * 0.7);

        let lateralBlocks = 0;
        if (this._probeRayLeft.wallDist < lateralLookAhead * 0.5 || this._probeRayLeft.trailDist < lateralLookAhead * 0.5) lateralBlocks++;
        if (this._probeRayRight.wallDist < lateralLookAhead * 0.5 || this._probeRayRight.trailDist < lateralLookAhead * 0.5) lateralBlocks++;

        risk += probe.weight;
        risk += lateralBlocks * 0.28;
        if (immediateDanger) risk += 2.2;

        // Easy bots make more mistakes, hard bots remain clean.
        if (this.profile.errorRate > 0 && Math.random() < this.profile.errorRate) {
            risk += (Math.random() - 0.2) * 0.65;
        }

        probe.wallDist = wallDist;
        probe.trailDist = trailDist;
        probe.clearance = Math.min(wallDist, trailDist);
        probe.immediateDanger = immediateDanger;
        probe.risk = risk;
    }

    // ================================================================
    // Phase 7: Portal-Exit-Safety â€” prÃ¼fe 4 Richtungen am Exit
    // ================================================================
    _estimateExitSafety(exit, arena, player, allPlayers) {
        const probeDistance = 5;
        let blockedCount = 0;
        for (let i = 0; i < PORTAL_EXIT_CHECK_DIRS.length; i++) {
            const dir = PORTAL_EXIT_CHECK_DIRS[i];
            this._tmpVec3.set(
                exit.x + dir.x * probeDistance,
                exit.y + dir.y * probeDistance,
                exit.z + dir.z * probeDistance
            );
            if (arena.checkCollisionFast(this._tmpVec3, player.hitboxRadius * 2.0)
                || this._checkTrailHit(this._tmpVec3, player, allPlayers)) {
                blockedCount++;
            }
        }
        return blockedCount / PORTAL_EXIT_CHECK_DIRS.length;
    }

    // ================================================================
    // ================================================================
    _senseProjectiles(player, projectiles) {
        this.sense.projectileThreat = false;
        this.sense.projectileEvadeYaw = 0;
        this.sense.projectileEvadePitch = 0;

        const awareness = this.profile.projectileAwareness || 0;
        if (awareness <= 0 || !projectiles || projectiles.length === 0) return;

        player.getDirection(this._tmpForward).normalize();
        this._buildBasis(this._tmpForward);

        let nearestTime = Infinity;
        let evadeYaw = 0;
        let evadePitch = 0;

        for (let i = 0; i < projectiles.length; i++) {
            const proj = projectiles[i];
            if (proj.owner === player) continue;  // eigene Geschosse ignorieren

            this._tmpVec.subVectors(proj.position, player.position);
            const dist = this._tmpVec.length();
            if (dist > 25 || dist < 0.5) continue;

            // PrÃ¼fen ob Projektil auf Bot zufliegt
            this._tmpVec.normalize();
            this._tmpVec2.copy(proj.velocity).normalize();
            const towardBot = -this._tmpVec2.dot(this._tmpVec); // Positiv = fliegt auf uns zu
            if (towardBot < 0.4) continue;

            // Einschlagzeit schÃ¤tzen
            const speed = proj.velocity.length();
            const timeToImpact = speed > 1 ? dist / speed : 999;
            if (timeToImpact > 0.8) continue;

            // Zufallscheck basierend auf Awareness
            if (Math.random() > awareness) continue;

            if (timeToImpact < nearestTime) {
                nearestTime = timeToImpact;

                // Ausweichrichtung = Kreuzprodukt(Flugrichtung, WORLD_UP)
                this._tmpVec3.crossVectors(this._tmpVec2, WORLD_UP).normalize();
                // Welche Seite des Bots? â†’ auf die entgegengesetzte Seite ausweichen
                const side = this._tmpRight.dot(this._tmpVec3);
                evadeYaw = side > 0 ? -1 : 1;

                if (!CONFIG.GAMEPLAY.PLANAR_MODE) {
                    // Vertikale Komponente: wenn Projektil von oben â†’ runter, etc.
                    const verticalApproach = this._tmpVec.y;
                    evadePitch = verticalApproach > 0.2 ? -1 : (verticalApproach < -0.2 ? 1 : 0);
                }
            }
        }

        if (nearestTime < Infinity) {
            this.sense.projectileThreat = true;
            this.sense.projectileEvadeYaw = evadeYaw;
            this.sense.projectileEvadePitch = evadePitch;
        }
    }

    // ================================================================
    // ================================================================
    _senseHeight(player, arena) {
        this.sense.heightBias = 0;
        if (CONFIG.GAMEPLAY.PLANAR_MODE) return;

        const bias = this.profile.heightBias || 0;
        if (bias <= 0) return;

        const b = arena.bounds;
        const midY = (b.minY + b.maxY) * 0.5;
        const offset = player.position.y - midY;
        const range = (b.maxY - b.minY) * 0.5;

        if (range <= 0) return;

        // Normalisiert: -1 (ganz unten) bis +1 (ganz oben)
        const normalizedOffset = offset / range;

        // Gegensteuerung: wenn oben â†’ Pitch-Down-Bias, wenn unten â†’ Pitch-Up
        this.sense.heightBias = -normalizedOffset * bias;
    }

    // ================================================================
    // ================================================================
    _senseBotSpacing(player, allPlayers) {
        this.sense.botRepulsionYaw = 0;
        this.sense.botRepulsionPitch = 0;

        const weight = this.profile.spacingWeight || 0;
        if (weight <= 0) return;

        const minDist = 12;
        player.getDirection(this._tmpForward).normalize();
        this._buildBasis(this._tmpForward);

        let repulseX = 0;
        let repulseY = 0;

        for (let i = 0; i < allPlayers.length; i++) {
            const other = allPlayers[i];
            if (!other || other === player || !other.alive || !other.isBot) continue;

            this._tmpVec.subVectors(player.position, other.position);
            const dist = this._tmpVec.length();
            if (dist >= minDist || dist < 0.1) continue;

            // AbstoÃŸungsstÃ¤rke
            const strength = weight * (1 - dist / minDist);
            this._tmpVec.normalize();

            // In Yaw/Pitch-Raum projizieren
            repulseX += this._tmpRight.dot(this._tmpVec) * strength;
            repulseY += this._tmpUp.dot(this._tmpVec) * strength;
        }

        if (Math.abs(repulseX) > 0.05) {
            this.sense.botRepulsionYaw = repulseX > 0 ? 1 : -1;
        }
        if (!CONFIG.GAMEPLAY.PLANAR_MODE && Math.abs(repulseY) > 0.05) {
            this.sense.botRepulsionPitch = repulseY > 0 ? 1 : -1;
        }
    }

    // ================================================================
    // ================================================================
    _evaluatePursuit(player) {
        this.sense.pursuitActive = false;
        this.sense.pursuitYaw = 0;
        this.sense.pursuitPitch = 0;
        this.sense.pursuitAimDot = 0;

        if (!this.profile.pursuitEnabled) return;
        if (this.sense.immediateDanger || this.sense.forwardRisk > 0.3) return;

        const target = this.state.targetPlayer;
        if (!target || !target.alive) return;

        const pursuitRadius = this.profile.pursuitRadius || 35;
        if (this.sense.targetDistanceSq > pursuitRadius * pursuitRadius) return;
        if (!this.sense.targetInFront) return;

        // Richtung zum Ziel berechnen
        player.getDirection(this._tmpForward).normalize();
        this._buildBasis(this._tmpForward);

        this._tmpVec.subVectors(target.position, player.position).normalize();

        const aimDot = this._tmpVec.dot(this._tmpForward);
        const yawSignal = this._tmpRight.dot(this._tmpVec);
        const pitchSignal = this._tmpUp.dot(this._tmpVec);

        this.sense.pursuitActive = true;
        this.sense.pursuitAimDot = aimDot;
        this.sense.pursuitYaw = Math.abs(yawSignal) > 0.05 ? (yawSignal > 0 ? 1 : -1) : 0;
        if (!CONFIG.GAMEPLAY.PLANAR_MODE) {
            this.sense.pursuitPitch = Math.abs(pitchSignal) > 0.08 ? (pitchSignal > 0 ? 1 : -1) : 0;
        }
    }

    _evaluatePortalIntent(player, arena, allPlayers) {
        if (!arena.portalsEnabled || !arena.portals || arena.portals.length === 0) {
            this.state.portalIntentActive = false;
            this._portalTarget = null;
            return;
        }

        if (this.profile.portalInterest <= 0) {
            this.state.portalIntentActive = false;
            this._portalTarget = null;
            return;
        }

        const seekDistance = this.profile.portalSeekDistance;
        const seekDistSq = seekDistance * seekDistance;

        player.getDirection(this._tmpForward).normalize();

        let bestScore = -Infinity;
        let bestEntry = null;
        let bestExit = null;
        let bestEntryDistSq = Infinity;

        for (let i = 0; i < arena.portals.length; i++) {
            const portal = arena.portals[i];
            // PrÃ¼fe beide Seiten des Portals
            const sides = [
                { entry: portal.posA, exit: portal.posB },
                { entry: portal.posB, exit: portal.posA },
            ];

            for (let s = 0; s < sides.length; s++) {
                const { entry, exit } = sides[s];
                const distSq = player.position.distanceToSquared(entry);
                if (distSq > seekDistSq) continue;

                this._tmpVec.subVectors(entry, player.position).normalize();
                const forwardDot = this._tmpVec.dot(this._tmpForward);
                if (forwardDot < this.profile.portalEntryDotMin) continue;

                const entryRisk = estimatePointRisk(this, entry, player, arena, allPlayers);
                // Phase 7: Exit-Safety statt einfacher Punkt-Risiko
                const exitSafety = this._estimateExitSafety(exit, arena, player, allPlayers);
                const exitRisk = exitSafety;
                // Wenn >= 75% der Exit-Richtungen blockiert sind â†’ Portal meiden
                if (exitSafety >= 0.75) continue;

                const localRelief = this.sense.forwardRisk - exitRisk;
                const distancePenalty = distSq / seekDistSq;
                const score =
                    localRelief * (0.8 + this.profile.portalInterest) +
                    this.sense.mapPortalBias * 0.5 -
                    entryRisk * 0.6 -
                    distancePenalty * 0.4;

                if (score > bestScore) {
                    bestScore = score;
                    bestEntry = entry;
                    bestExit = exit;
                    bestEntryDistSq = distSq;
                }
            }
        }

        if (bestEntry && bestScore >= this.profile.portalIntentThreshold) {
            this.state.portalIntentActive = true;
            this.state.portalIntentTimer = this.profile.portalIntentDuration;
            this.state.portalIntentScore = bestScore;
            this.state.portalEntryDistanceSq = bestEntryDistSq;
            this._portalEntry.copy(bestEntry);
            this._portalExit.copy(bestExit);
            this._portalTarget = this._portalEntry;
            return;
        }

        this.state.portalIntentActive = false;
        this.state.portalIntentScore = 0;
        this._portalTarget = null;
    }

    update(dt, player, arena, allPlayers, projectiles) {
        const activeDifficulty = CONFIG.BOT.ACTIVE_DIFFICULTY || this._profileName;
        if (activeDifficulty !== this._profileName) {
            this._setDifficulty(activeDifficulty);
        }

        this._updateTimers(dt);
        updateStuckState(this, player, arena, allPlayers);

        if (this.state.recoveryActive) {
            if (updateRecovery(this, dt, player, arena, allPlayers)) {
                return this.currentInput;
            }
        }

        if (this.reactionTimer > 0) {
            return this.currentInput;
        }

        const jitter = 1 + (Math.random() * 2 - 1) * this.profile.errorRate * 0.2;
        this.reactionTimer = Math.max(0.02, this.profile.reactionTime * jitter);

        this._resetDecision();
        runPerception(this, player, arena, allPlayers, projectiles);
        if (runDecision(this, dt, player, arena, allPlayers, ITEM_RULES)) {
            return this.currentInput;
        }

        return runAction(this);
    }
}
