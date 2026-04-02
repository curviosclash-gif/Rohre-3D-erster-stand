import {
    HEALTH_RATIO,
    LOCAL_OPENNESS_RATIO,
    PRESSURE_LEVEL,
    PROJECTILE_THREAT,
    SHIELD_RATIO,
    TARGET_ALIGNMENT,
    TARGET_DISTANCE_RATIO,
    TARGET_IN_FRONT,
    WALL_DISTANCE_DOWN,
    WALL_DISTANCE_FRONT,
    WALL_DISTANCE_LEFT,
    WALL_DISTANCE_RIGHT,
    WALL_DISTANCE_UP,
} from '../../src/entities/ai/observation/ObservationSchemaV1.js';
import { resolveHybridDecision } from '../../src/entities/ai/hybrid/HybridDecisionArchitecture.js';

const ACTION_TEMPLATE = Object.freeze({
    yawLeft: false,
    yawRight: false,
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    boost: false,
    shootMG: false,
    shootItem: false,
    shootItemIndex: -1,
    useItem: -1,
    dropItem: false,
    nextItem: false,
});

function toBoolean(value) {
    return value === true;
}

function toIntInRange(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const integer = Math.trunc(numeric);
    if (integer < min || integer > max) return fallback;
    return integer;
}

function resolvePlanarMode(input = {}, fallback = false) {
    if (typeof input.planarMode === 'boolean') return input.planarMode;
    if (typeof input.domainId === 'string' && input.domainId.endsWith('-2d')) return true;
    return !!fallback;
}

function clamp01(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric <= 0) return 0;
    if (numeric >= 1) return 1;
    return numeric;
}

function resolveObservationMetric(observation, index, fallback = 0) {
    if (!Array.isArray(observation)) return fallback;
    return clamp01(observation[index], fallback);
}

function resolveTargetAlignment(observation) {
    if (!Array.isArray(observation)) return 0;
    const numeric = Number(observation[TARGET_ALIGNMENT]);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric <= -1) return -1;
    if (numeric >= 1) return 1;
    return numeric;
}

function resolvePlayerRatio(player = null, currentKey, maxKey, observationFallback) {
    const current = Number(player?.[currentKey]);
    const max = Number(player?.[maxKey]);
    if (Number.isFinite(current) && Number.isFinite(max) && max > 0) {
        return clamp01(current / max, observationFallback);
    }
    return observationFallback;
}

function deterministicParity(seed, stepIndex) {
    const safeSeed = Number.isInteger(seed) ? seed : 0;
    const safeStep = Number.isInteger(stepIndex) ? stepIndex : 0;
    const mixed = (safeSeed * 1103515245 + safeStep * 12345) >>> 0;
    return mixed % 2;
}

function hasSteeringIntent(action = null) {
    if (!action || typeof action !== 'object') return false;
    return !!(
        action.yawLeft
        || action.yawRight
        || action.pitchUp
        || action.pitchDown
    );
}

function createSafetyProfile(observation, options = {}) {
    const player = options?.player && typeof options.player === 'object'
        ? options.player
        : null;
    const healthRatio = resolvePlayerRatio(
        player,
        'hp',
        'maxHp',
        resolveObservationMetric(observation, HEALTH_RATIO, 1)
    );
    const shieldRatio = resolvePlayerRatio(
        player,
        'shieldHp',
        'maxShieldHp',
        resolveObservationMetric(observation, SHIELD_RATIO, 0)
    );
    const vitalityRatio = clamp01(healthRatio * 0.78 + shieldRatio * 0.22, healthRatio);
    const wallFront = resolveObservationMetric(observation, WALL_DISTANCE_FRONT, 1);
    const wallLeft = resolveObservationMetric(observation, WALL_DISTANCE_LEFT, 1);
    const wallRight = resolveObservationMetric(observation, WALL_DISTANCE_RIGHT, 1);
    const wallUp = resolveObservationMetric(observation, WALL_DISTANCE_UP, 1);
    const wallDown = resolveObservationMetric(observation, WALL_DISTANCE_DOWN, 1);
    const pressureLevel = resolveObservationMetric(observation, PRESSURE_LEVEL, 0);
    const openness = resolveObservationMetric(observation, LOCAL_OPENNESS_RATIO, 1);
    const projectileThreat = resolveObservationMetric(observation, PROJECTILE_THREAT, 0) >= 0.5;
    const targetDistanceRatio = resolveObservationMetric(observation, TARGET_DISTANCE_RATIO, 1);
    const targetInFront = resolveObservationMetric(observation, TARGET_IN_FRONT, 0) >= 0.5;
    const targetAlignment = resolveTargetAlignment(observation);
    const collisionRisk = Math.max(
        1 - wallFront,
        pressureLevel * 0.92,
        projectileThreat ? 0.95 : 0,
        Math.max(0, 0.4 - openness) * 1.6
    );
    return {
        healthRatio,
        shieldRatio,
        vitalityRatio,
        wallFront,
        wallLeft,
        wallRight,
        wallUp,
        wallDown,
        pressureLevel,
        openness,
        projectileThreat,
        targetDistanceRatio,
        targetInFront,
        targetAlignment,
        collisionRisk: clamp01(collisionRisk, 0),
    };
}

function resolvePreferredYaw(profile, seed, stepIndex) {
    const sideDelta = profile.wallRight - profile.wallLeft;
    if (Math.abs(sideDelta) > 0.03) {
        return sideDelta > 0 ? 1 : -1;
    }
    return deterministicParity(seed, stepIndex) === 0 ? -1 : 1;
}

function resolvePreferredPitch(profile, planarMode, seed, stepIndex) {
    if (planarMode) return 0;
    const verticalDelta = profile.wallUp - profile.wallDown;
    if (Math.abs(verticalDelta) > 0.04) {
        return verticalDelta > 0 ? 1 : -1;
    }
    return deterministicParity(seed + 17, stepIndex + 5) === 0 ? -1 : 1;
}

function clearCombatIntent(action) {
    action.boost = false;
    action.shootMG = false;
    action.shootItem = false;
    action.shootItemIndex = -1;
}

function setEvasionSteering(action, yawDirection, pitchDirection, planarMode) {
    action.yawLeft = yawDirection < 0;
    action.yawRight = yawDirection > 0;
    if (planarMode) {
        action.pitchUp = false;
        action.pitchDown = false;
        return;
    }
    action.pitchUp = pitchDirection > 0;
    action.pitchDown = pitchDirection < 0;
}

export function applyObservationSafetyLayer(action, observation, options = {}) {
    return resolveHybridTrainerDecision(action, observation, options).action;
}

export function resolveHybridTrainerDecision(action, observation, options = {}) {
    const sanitized = sanitizeTrainerAction(action, options);
    const hybrid = resolveHybridDecision(sanitized, {
        observation,
        observationDetails: options.observationDetails || null,
        actionMetadata: options.actionMetadata || null,
        intent: options.intent || null,
        planarMode: resolvePlanarMode(options, false),
        player: options.player || null,
    });
    return {
        ...hybrid,
        action: sanitizeTrainerAction(hybrid.action, options),
    };
}

export function sanitizeTrainerAction(action, options = {}) {
    const source = action && typeof action === 'object' ? action : {};
    const planarMode = resolvePlanarMode(options, false);
    const maxItemIndex = Number.isInteger(options.maxItemIndex) ? options.maxItemIndex : 2;

    const sanitized = {
        ...ACTION_TEMPLATE,
        yawLeft: toBoolean(source.yawLeft),
        yawRight: toBoolean(source.yawRight),
        pitchUp: toBoolean(source.pitchUp),
        pitchDown: toBoolean(source.pitchDown),
        rollLeft: toBoolean(source.rollLeft),
        rollRight: toBoolean(source.rollRight),
        boost: toBoolean(source.boost),
        shootMG: toBoolean(source.shootMG),
        shootItem: toBoolean(source.shootItem),
        dropItem: toBoolean(source.dropItem),
        nextItem: toBoolean(source.nextItem),
    };

    if (sanitized.yawLeft && sanitized.yawRight) {
        sanitized.yawLeft = false;
        sanitized.yawRight = false;
    }
    if (sanitized.pitchUp && sanitized.pitchDown) {
        sanitized.pitchUp = false;
        sanitized.pitchDown = false;
    }
    if (planarMode) {
        sanitized.pitchUp = false;
        sanitized.pitchDown = false;
        sanitized.rollLeft = false;
        sanitized.rollRight = false;
    }

    sanitized.shootItemIndex = sanitized.shootItem
        ? toIntInRange(source.shootItemIndex, 0, maxItemIndex, 0)
        : -1;
    sanitized.useItem = toIntInRange(source.useItem, -1, maxItemIndex, -1);

    return sanitized;
}

export function inferActionFromObservation(observation, options = {}) {
    const vector = Array.isArray(observation) ? observation : [];
    const stepIndex = Number.isInteger(options.stepIndex) ? options.stepIndex : 0;
    const seed = Number.isInteger(options.seed) ? options.seed : 0;

    const aimHint = resolveTargetAlignment(vector);
    const forwardClearance = resolveObservationMetric(vector, WALL_DISTANCE_FRONT, 1);
    const leftClearance = resolveObservationMetric(vector, WALL_DISTANCE_LEFT, 1);
    const rightClearance = resolveObservationMetric(vector, WALL_DISTANCE_RIGHT, 1);
    const threatHint = Math.max(
        resolveObservationMetric(vector, PRESSURE_LEVEL, 0),
        resolveObservationMetric(vector, PROJECTILE_THREAT, 0)
    );
    const targetDistanceRatio = resolveObservationMetric(vector, TARGET_DISTANCE_RATIO, 1);
    const targetInFront = resolveObservationMetric(vector, TARGET_IN_FRONT, 0) >= 0.5;
    const openness = resolveObservationMetric(vector, LOCAL_OPENNESS_RATIO, 1);

    let yawLeft = false;
    let yawRight = false;
    if (forwardClearance <= 0.32 || threatHint >= 0.7) {
        yawRight = rightClearance >= leftClearance;
        yawLeft = !yawRight;
    } else if (aimHint < -0.05) {
        yawLeft = true;
    } else if (aimHint > 0.05) {
        yawRight = true;
    } else {
        const parity = deterministicParity(seed, stepIndex);
        yawLeft = parity === 0;
        yawRight = parity === 1;
    }

    const action = {
        yawLeft,
        yawRight,
        pitchUp: false,
        pitchDown: false,
        rollLeft: false,
        rollRight: false,
        boost: forwardClearance > 0.68 && openness > 0.52 && threatHint < 0.52 && ((stepIndex % 9) === 0),
        shootMG: targetInFront && Math.abs(aimHint) < 0.2 && forwardClearance > 0.18 && threatHint < 0.72,
        shootItem: targetInFront && targetDistanceRatio <= 0.4 && threatHint < 0.62 && ((stepIndex % 23) === 0),
        shootItemIndex: 0,
        useItem: -1,
        dropItem: false,
        nextItem: false,
    };
    return applyObservationSafetyLayer(action, observation, options);
}

export function createNeutralAction(options = {}) {
    return sanitizeTrainerAction(ACTION_TEMPLATE, options);
}
