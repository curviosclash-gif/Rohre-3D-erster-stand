// ============================================
// HuntBridgePolicy.js - hunt-specific bridge policy using observation/runtime context
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../../core/Config.js';
import {
    PRESSURE_LEVEL,
    PROJECTILE_THREAT,
    TARGET_DISTANCE_RATIO,
    TARGET_IN_FRONT,
} from './observation/ObservationSchemaV1.js';
import { BOT_POLICY_TYPES } from './BotPolicyTypes.js';
import { ObservationBridgePolicy } from './ObservationBridgePolicy.js';
import {
    clamp,
    findStrongestRocketIndex,
    getNearestEnemy,
    resolveHealthRatio,
    HuntBotPolicy,
} from '../../hunt/HuntBotPolicy.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TMP_TO_ENEMY = new THREE.Vector3();
const TMP_FORWARD = new THREE.Vector3();
const TMP_RIGHT = new THREE.Vector3();
const TMP_UP = new THREE.Vector3();

function resolveObservationValue(observation, index, fallback = 0) {
    if (!observation || typeof observation.length !== 'number') return fallback;
    const value = Number(observation[index]);
    return Number.isFinite(value) ? value : fallback;
}

function resolveHuntBridgePriorities(player, runtimeContext) {
    const players = Array.isArray(runtimeContext?.players) ? runtimeContext.players : [];
    const observation = runtimeContext?.observation || null;
    const targetDistanceRatio = clamp(resolveObservationValue(observation, TARGET_DISTANCE_RATIO, 1), 0, 1);
    const pressureLevel = clamp(resolveObservationValue(observation, PRESSURE_LEVEL, 0), 0, 1);
    const projectileThreat = resolveObservationValue(observation, PROJECTILE_THREAT, 0) >= 0.5;
    const targetInFront = resolveObservationValue(observation, TARGET_IN_FRONT, 0) >= 0.5;

    const nearest = getNearestEnemy(player, players, TMP_TO_ENEMY);
    const enemy = nearest.enemy;
    const healthRatio = resolveHealthRatio(player);
    const enemyHealthRatio = resolveHealthRatio(enemy);
    const aggression = clamp(0.55 + (healthRatio - enemyHealthRatio) * 0.8, 0.15, 1.0);
    const rocketIndex = findStrongestRocketIndex(player?.inventory || []);

    return {
        enemy,
        healthRatio,
        enemyHealthRatio,
        aggression,
        rocketIndex,
        pressureLevel,
        projectileThreat,
        targetDistanceRatio,
        targetInFront,
    };
}

function applyRetreatManeuver(action, player, enemy) {
    if (!enemy || !player || typeof player.getDirection !== 'function') return;

    TMP_TO_ENEMY.subVectors(enemy.position, player.position).normalize();
    player.getDirection(TMP_FORWARD).normalize();
    TMP_RIGHT.crossVectors(WORLD_UP, TMP_FORWARD);
    if (TMP_RIGHT.lengthSq() <= 0.000001) {
        TMP_RIGHT.set(1, 0, 0);
    } else {
        TMP_RIGHT.normalize();
    }
    TMP_UP.crossVectors(TMP_FORWARD, TMP_RIGHT).normalize();

    const yawTowardEnemy = TMP_RIGHT.dot(TMP_TO_ENEMY);
    if (Math.abs(yawTowardEnemy) > 0.03) {
        action.yawLeft = yawTowardEnemy > 0;
        action.yawRight = yawTowardEnemy < 0;
    }

    if (!CONFIG.GAMEPLAY.PLANAR_MODE) {
        const pitchTowardEnemy = TMP_UP.dot(TMP_TO_ENEMY);
        if (Math.abs(pitchTowardEnemy) > 0.07) {
            action.pitchUp = pitchTowardEnemy < 0;
            action.pitchDown = pitchTowardEnemy > 0;
        }
    }
}

function resolveHuntBridgeAction(runtimeContext, player) {
    const priorities = resolveHuntBridgePriorities(player, runtimeContext);
    const action = {};
    const mgRange = Math.max(12, Number(CONFIG?.HUNT?.MG?.RANGE || 95));
    const targetDistanceMax = Math.max(1, Number(runtimeContext?.observationContext?.targetDistanceMax || 120));
    const mgRangeRatio = clamp(mgRange / targetDistanceMax, 0, 1);

    if (
        priorities.enemy
        && priorities.targetInFront
        && priorities.targetDistanceRatio <= mgRangeRatio
        && priorities.healthRatio > 0.15
        && priorities.aggression >= 0.45
    ) {
        action.shootMG = true;
    }

    if (priorities.rocketIndex >= 0 && priorities.enemy) {
        const shouldUseRocket = (
            priorities.healthRatio < 0.55
            || priorities.enemyHealthRatio > 0.45
            || priorities.targetDistanceRatio > 0.18
            || priorities.pressureLevel > 0.58
        );
        if (shouldUseRocket) {
            action.shootItem = true;
            action.shootItemIndex = priorities.rocketIndex;
        }
    }

    if (priorities.projectileThreat || priorities.pressureLevel > 0.74) {
        action.boost = true;
    }

    if (priorities.healthRatio <= 0.33) {
        applyRetreatManeuver(action, player, priorities.enemy);
        action.boost = true;
        if (priorities.rocketIndex < 0) {
            action.shootItem = false;
            action.shootItemIndex = -1;
        }
    }

    return action;
}

export class HuntBridgePolicy extends ObservationBridgePolicy {
    constructor(options = {}) {
        const fallbackPolicy = options.fallbackPolicy || new HuntBotPolicy(options);
        const resolveAction = typeof options.resolveAction === 'function'
            ? options.resolveAction
            : (runtimeContext, player) => resolveHuntBridgeAction(runtimeContext, player);

        super({
            ...options,
            type: BOT_POLICY_TYPES.HUNT_BRIDGE,
            fallbackPolicy,
            resolveAction,
        });

        this.type = BOT_POLICY_TYPES.HUNT_BRIDGE;
    }
}
