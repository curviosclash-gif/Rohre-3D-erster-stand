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

function deterministicParity(seed, stepIndex) {
    const safeSeed = Number.isInteger(seed) ? seed : 0;
    const safeStep = Number.isInteger(stepIndex) ? stepIndex : 0;
    const mixed = (safeSeed * 1103515245 + safeStep * 12345) >>> 0;
    return mixed % 2;
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

    const aimHint = Number(vector[9]) || 0;
    const forwardClearance = Number(vector[0]) || 0;
    const threatHint = Number(vector[6]) || 0;

    let yawLeft = aimHint < -0.05;
    let yawRight = aimHint > 0.05;
    if (!yawLeft && !yawRight) {
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
        boost: forwardClearance > 0.65 && ((stepIndex % 9) === 0),
        shootMG: Math.abs(aimHint) < 0.2 && forwardClearance > 0.15,
        shootItem: threatHint > 0.85 && ((stepIndex % 23) === 0),
        shootItemIndex: 0,
        useItem: -1,
        dropItem: false,
        nextItem: false,
    };
    return sanitizeTrainerAction(action, options);
}

export function createNeutralAction(options = {}) {
    return sanitizeTrainerAction(ACTION_TEMPLATE, options);
}
