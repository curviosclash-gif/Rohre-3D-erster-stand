export const MATCH_RUNTIME_PROJECTION_CONTRACT_VERSION = 'match-runtime-projection.v1';

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeInt(value, fallback = 0) {
    return Math.trunc(normalizeNumber(value, fallback));
}

function normalizeNonNegativeInt(value, fallback = 0) {
    return Math.max(0, normalizeInt(value, fallback));
}

function cloneStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => normalizeString(entry, '')).filter(Boolean);
}

function cloneSerializableValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => cloneSerializableValue(entry));
    }
    if (typeof value === 'object') {
        const clone = {};
        for (const [key, entry] of Object.entries(value)) {
            if (entry === undefined || typeof entry === 'function') {
                continue;
            }
            clone[key] = cloneSerializableValue(entry);
        }
        return clone;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    return String(value);
}

function createVector3Projection(value = null) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        x: normalizeNumber(source.x, 0),
        y: normalizeNumber(source.y, 0),
        z: normalizeNumber(source.z, 0),
    };
}

function createQuaternionProjection(value = null) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        x: normalizeNumber(source.x, 0),
        y: normalizeNumber(source.y, 0),
        z: normalizeNumber(source.z, 0),
        w: normalizeNumber(source.w, 1),
    };
}

function createSessionPlayerProjection(value = null) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        playerIndex: normalizeInt(source.playerIndex, -1),
        playerId: normalizeString(source.playerId, ''),
        pingMs: normalizeInt(source.pingMs, -1),
        isLocal: source.isLocal === true,
    };
}

function createLockTargetProjection(value = null) {
    if (!value || typeof value !== 'object') return null;
    return {
        playerIndex: normalizeInt(value.playerIndex, -1),
        targetPlayerIndex: normalizeInt(value.targetPlayerIndex, -1),
        alive: value.alive !== false,
        position: createVector3Projection(value.position),
    };
}

function createDamageIndicatorProjection(value = null, nowMs = 0) {
    if (!value || typeof value !== 'object') return null;
    const expiresAtMs = Math.max(0, normalizeNumber(value.expiresAtMs, 0));
    const fallbackRemainingMs = Math.max(0, normalizeNumber(value.remainingMs, normalizeNumber(value.ttl, 0) * 1000));
    const remainingMs = expiresAtMs > 0
        ? Math.max(0, expiresAtMs - nowMs)
        : fallbackRemainingMs;
    return {
        angleDeg: normalizeNumber(value.angleDeg, 0),
        intensity: normalizeNumber(value.intensity, 0),
        expiresAtMs,
        remainingMs,
        sequence: normalizeNonNegativeInt(value.sequence, 0),
    };
}

function createPlayerProjection(value = null) {
    if (!value || typeof value !== 'object') return null;
    return {
        playerIndex: normalizeNonNegativeInt(value.playerIndex, 0),
        isBot: value.isBot === true,
        alive: value.alive !== false,
        score: normalizeInt(value.score, 0),
        speed: normalizeNumber(value.speed, 0),
        boostCharge: Math.max(0, normalizeNumber(value.boostCharge, 0)),
        boostCapacity: Math.max(0.001, normalizeNumber(value.boostCapacity, 1)),
        boostRecharging: value.boostRecharging === true,
        hp: Math.max(0, normalizeNumber(value.hp, 0)),
        maxHp: Math.max(1, normalizeNumber(value.maxHp, 1)),
        shieldHP: Math.max(0, normalizeNumber(value.shieldHP, 0)),
        maxShieldHp: Math.max(1, normalizeNumber(value.maxShieldHp, 1)),
        position: createVector3Projection(value.position),
        quaternion: createQuaternionProjection(value.quaternion),
        aimDirection: createVector3Projection(value.aimDirection),
        inventory: cloneStringArray(value.inventory),
        selectedItemIndex: normalizeInt(value.selectedItemIndex, 0),
        itemUseCooldownRemaining: Math.max(0, normalizeNumber(value.itemUseCooldownRemaining, 0)),
        shootCooldown: Math.max(0, normalizeNumber(value.shootCooldown, 0)),
        planarMode: value.planarMode === true,
        cameraModeId: normalizeString(value.cameraModeId, 'THIRD_PERSON'),
    };
}

function createParcoursProjection(value = null) {
    if (!value || typeof value !== 'object' || value.enabled !== true) {
        return {
            enabled: false,
            routeId: '',
            totalCheckpoints: 0,
            currentCheckpoint: 0,
            completed: false,
            completionTimeMs: 0,
            segmentElapsedMs: 0,
            hasError: false,
            errorMessage: '',
        };
    }
    return {
        enabled: true,
        routeId: normalizeString(value.routeId, ''),
        totalCheckpoints: normalizeNonNegativeInt(value.totalCheckpoints, 0),
        currentCheckpoint: normalizeNonNegativeInt(value.currentCheckpoint, 0),
        completed: value.completed === true,
        completionTimeMs: Math.max(0, normalizeNumber(value.completionTimeMs, 0)),
        segmentElapsedMs: Math.max(0, normalizeNumber(value.segmentElapsedMs, 0)),
        hasError: value.hasError === true,
        errorMessage: normalizeString(value.errorMessage, ''),
    };
}

function createHuntProjection(value = null, nowMs = 0) {
    const source = value && typeof value === 'object' ? value : {};
    const overheatByPlayer = {};
    const overheatSource = source.overheatByPlayer && typeof source.overheatByPlayer === 'object'
        ? source.overheatByPlayer
        : {};
    for (const [key, entry] of Object.entries(overheatSource)) {
        overheatByPlayer[key] = Math.max(0, normalizeNumber(entry, 0));
    }

    const damageIndicatorsByPlayer = {};
    const indicatorSource = source.damageIndicatorsByPlayer && typeof source.damageIndicatorsByPlayer === 'object'
        ? source.damageIndicatorsByPlayer
        : {};
    for (const [key, entry] of Object.entries(indicatorSource)) {
        const normalized = createDamageIndicatorProjection(entry, nowMs);
        if (normalized) {
            damageIndicatorsByPlayer[key] = normalized;
        }
    }

    const legacyIndicator = createDamageIndicatorProjection(source.damageIndicator, nowMs);
    return {
        active: source.active === true,
        killFeed: cloneStringArray(source.killFeed),
        overheatByPlayer,
        damageIndicatorsByPlayer,
        damageIndicator: legacyIndicator,
        scoreboardSummary: normalizeString(source.scoreboardSummary, ''),
    };
}

function createArcadeProjection(value = null) {
    if (!value || typeof value !== 'object') {
        return null;
    }
    return /** @type {any} */ (cloneSerializableValue(value));
}

export function createMatchRuntimeProjection(payload = {}) {
    const source = /** @type {any} */ (payload && typeof payload === 'object' ? payload : {});
    const updatedAt = Math.max(0, normalizeNumber(source.updatedAt, Date.now()));
    const players = Array.isArray(source.players)
        ? source.players.map((entry) => createPlayerProjection(entry)).filter(Boolean)
        : [];
    const sessionPlayers = Array.isArray(source.sessionPlayers)
        ? source.sessionPlayers.map((entry) => createSessionPlayerProjection(entry))
        : [];
    const lockTargets = Array.isArray(source.lockTargets)
        ? source.lockTargets.map((entry) => createLockTargetProjection(entry)).filter(Boolean)
        : [];

    return {
        contractVersion: MATCH_RUNTIME_PROJECTION_CONTRACT_VERSION,
        updatedAt,
        gameStateId: normalizeString(source.gameStateId, ''),
        modeId: normalizeString(source.modeId, ''),
        isNetworkSession: source.isNetworkSession === true,
        localPlayerIndex: Math.max(0, normalizeInt(source.localPlayerIndex, 0)),
        localHumanCount: Math.max(1, normalizeNonNegativeInt(source.localHumanCount, 1)),
        players,
        sessionPlayers,
        lockTargets,
        parcours: createParcoursProjection(source.parcours),
        hunt: createHuntProjection(source.hunt, updatedAt),
        arcade: createArcadeProjection(source.arcade),
    };
}
