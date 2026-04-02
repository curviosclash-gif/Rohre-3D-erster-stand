export function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function toPositiveNumber(value, fallback = 1, min = 0.0001) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.max(min, parsed);
}

export function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

export function normalizeVec3(raw, fallback = [0, 0, 0]) {
    const source = Array.isArray(raw) ? raw : fallback;
    return [
        toFiniteNumber(source[0], fallback[0]),
        toFiniteNumber(source[1], fallback[1]),
        toFiniteNumber(source[2], fallback[2]),
    ];
}

export function normalizeForward(raw) {
    if (!Array.isArray(raw)) return null;
    const vec = normalizeVec3(raw, [0, 0, 1]);
    const lengthSq = (vec[0] * vec[0]) + (vec[1] * vec[1]) + (vec[2] * vec[2]);
    if (lengthSq < 0.000001) return null;
    const invLength = 1 / Math.sqrt(lengthSq);
    return [vec[0] * invLength, vec[1] * invLength, vec[2] * invLength];
}

export function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

export function formatDurationMs(ms) {
    const clampedMs = Math.max(0, Math.round(Number(ms) || 0));
    const totalSeconds = clampedMs / 1000;
    return `${totalSeconds.toFixed(totalSeconds >= 10 ? 1 : 2)}s`;
}

export function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toCheckpointId(rawId, fallback = '') {
    const normalized = normalizeString(rawId, fallback);
    return normalized || fallback;
}

export function buildRouteFromParcours(parcoursRaw) {
    if (!isObject(parcoursRaw) || parcoursRaw.enabled !== true) {
        return null;
    }

    const rawRules = isObject(parcoursRaw.rules) ? parcoursRaw.rules : {};
    const rules = {
        ordered: rawRules.ordered !== false,
        resetOnDeath: rawRules.resetOnDeath !== false,
        resetToLastValid: rawRules.resetToLastValid === true,
        maxSegmentTimeMs: Math.max(0, Math.trunc(toFiniteNumber(rawRules.maxSegmentTimeMs, 0))),
        cooldownMs: Math.max(0, Math.trunc(toFiniteNumber(rawRules.cooldownMs, 450))),
        allowLaneAliases: rawRules.allowLaneAliases !== false,
        winnerByParcoursComplete: rawRules.winnerByParcoursComplete !== false,
        wrongOrderCooldownMs: Math.max(0, Math.trunc(toFiniteNumber(rawRules.wrongOrderCooldownMs, 650))),
        errorIndicatorMs: Math.max(0, Math.trunc(toFiniteNumber(rawRules.errorIndicatorMs, 1400))),
        animateCheckpoints: rawRules.animateCheckpoints !== false,
    };

    const rawCheckpoints = Array.isArray(parcoursRaw.checkpoints) ? parcoursRaw.checkpoints : [];
    if (rawCheckpoints.length === 0) {
        return null;
    }

    const canonicalIds = [];
    for (let i = 0; i < rawCheckpoints.length; i += 1) {
        const rawEntry = rawCheckpoints[i];
        if (!isObject(rawEntry)) continue;
        const id = toCheckpointId(rawEntry.id, `CP${String(i + 1).padStart(2, '0')}`);
        const aliasOf = rules.allowLaneAliases ? normalizeString(rawEntry.aliasOf, '') : '';
        if (aliasOf) continue;
        if (canonicalIds.includes(id)) continue;
        canonicalIds.push(id);
    }

    if (canonicalIds.length === 0) {
        for (let i = 0; i < rawCheckpoints.length; i += 1) {
            const id = toCheckpointId(rawCheckpoints[i]?.id, `CP${String(i + 1).padStart(2, '0')}`);
            if (canonicalIds.includes(id)) continue;
            canonicalIds.push(id);
        }
    }

    const canonicalIndexById = new Map();
    for (let i = 0; i < canonicalIds.length; i += 1) {
        canonicalIndexById.set(canonicalIds[i], i);
    }

    const checkpoints = [];
    for (let i = 0; i < rawCheckpoints.length; i += 1) {
        const rawEntry = rawCheckpoints[i];
        if (!isObject(rawEntry)) continue;
        const id = toCheckpointId(rawEntry.id, `CP${String(i + 1).padStart(2, '0')}`);
        const requestedAliasOf = rules.allowLaneAliases ? normalizeString(rawEntry.aliasOf, '') : '';
        const aliasOf = requestedAliasOf && canonicalIndexById.has(requestedAliasOf) ? requestedAliasOf : '';
        const canonicalId = aliasOf || id;
        if (!canonicalIndexById.has(canonicalId)) {
            canonicalIndexById.set(canonicalId, canonicalIds.length);
            canonicalIds.push(canonicalId);
        }
        const routeIndex = canonicalIndexById.get(canonicalId);
        checkpoints.push({
            id,
            type: normalizeString(rawEntry.type, 'gate').toLowerCase() || 'gate',
            aliasOf: aliasOf || null,
            routeIndex,
            pos: normalizeVec3(rawEntry.pos, [0, 0, 0]),
            radius: toPositiveNumber(rawEntry.radius, 3.5, 0.1),
            forward: normalizeForward(rawEntry.forward),
            cooldownMs: Math.max(
                0,
                Math.trunc(toFiniteNumber(rawEntry?.params?.cooldownMs, rules.cooldownMs))
            ),
            params: isObject(rawEntry.params) ? { ...rawEntry.params } : {},
        });
    }

    if (checkpoints.length === 0) {
        return null;
    }

    const entriesByCheckpointIndex = Array.from({ length: canonicalIds.length }, () => []);
    for (const checkpoint of checkpoints) {
        if (!entriesByCheckpointIndex[checkpoint.routeIndex]) continue;
        entriesByCheckpointIndex[checkpoint.routeIndex].push(checkpoint);
    }

    const finishRaw = isObject(parcoursRaw.finish) ? parcoursRaw.finish : null;
    const finish = finishRaw ? {
        id: toCheckpointId(finishRaw.id, 'FINISH'),
        type: 'finish',
        pos: normalizeVec3(finishRaw.pos, [0, 0, 0]),
        radius: toPositiveNumber(finishRaw.radius, 4.2, 0.1),
        forward: normalizeForward(finishRaw.forward),
        cooldownMs: Math.max(
            0,
            Math.trunc(toFiniteNumber(finishRaw?.params?.cooldownMs, rules.cooldownMs))
        ),
        params: isObject(finishRaw.params) ? { ...finishRaw.params } : {},
    } : null;

    return {
        routeId: normalizeString(parcoursRaw.routeId, 'custom_route_v1'),
        totalCheckpoints: canonicalIds.length,
        sequence: canonicalIds,
        checkpoints,
        entriesByCheckpointIndex,
        finish,
        rules,
    };
}

export function createPlayerProgressState(totalCheckpoints) {
    return {
        nextCheckpointIndex: 0,
        passedMask: new Uint8Array(Math.max(0, totalCheckpoints)),
        startedAtMs: 0,
        lastCheckpointAtMs: 0,
        wrongOrderCount: 0,
        resetCount: 0,
        completed: false,
        completedAtMs: 0,
        completionTimeMs: 0,
        lastCheckpointId: '',
        lastError: '',
        errorUntilMs: 0,
        lastWrongOrderAtMs: -Infinity,
        cooldownByCheckpointId: new Map(),
    };
}
