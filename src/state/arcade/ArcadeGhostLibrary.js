import { normalizeGhostClip, validateGhostClip } from '../../shared/contracts/GhostClipContract.js';

const ARCADE_GHOST_LIBRARY_STORAGE_KEY = 'cuviosclash.arcade-ghost-library.v1';

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function toSafeDurationMs(value) {
    const numeric = Math.round(Number(value));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function cloneObject(value) {
    return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deriveDurationMsFromGhostClip(ghostClip) {
    const sourceDurationMs = toSafeDurationMs(Number(ghostClip?.sourceDuration) * 1000);
    if (sourceDurationMs > 0) return sourceDurationMs;
    const displayDurationMs = toSafeDurationMs(Number(ghostClip?.displayDuration) * 1000);
    if (displayDurationMs > 0) return displayDurationMs;
    return 0;
}

function createGhostLibraryEntry(routeId, source = null) {
    const safeRouteId = normalizeString(routeId);
    if (!safeRouteId) return null;
    const input = isPlainObject(source) ? source : {};
    const longestGhostClip = normalizeGhostClip(input.longestGhostClip ?? input.ghostClip ?? null);
    if (!longestGhostClip) return null;
    const explicitDurationMs = toSafeDurationMs(input.durationMs);
    const derivedDurationMs = deriveDurationMsFromGhostClip(longestGhostClip);
    const durationMs = Math.max(explicitDurationMs, derivedDurationMs);
    if (durationMs <= 0) return null;
    return {
        routeId: safeRouteId,
        longestGhostClip,
        durationMs,
        updatedAt: normalizeString(input.updatedAt, new Date().toISOString()),
    };
}

function normalizeGhostLibrary(rawLibrary) {
    if (!isPlainObject(rawLibrary)) return {};
    const nextLibrary = {};
    for (const routeId of Object.keys(rawLibrary)) {
        const entry = createGhostLibraryEntry(routeId, rawLibrary[routeId]);
        if (!entry) continue;
        nextLibrary[entry.routeId] = entry;
    }
    return nextLibrary;
}

function normalizeLeaderboard(bestByRoute) {
    if (!isPlainObject(bestByRoute)) return {};
    return bestByRoute;
}

function resolveLeaderboardBestEntryForRoute(leaderboard, routeId) {
    const entries = Array.isArray(leaderboard?.[routeId]) ? leaderboard[routeId] : [];
    return entries.length > 0 && isPlainObject(entries[0]) ? entries[0] : null;
}

export { ARCADE_GHOST_LIBRARY_STORAGE_KEY };

export function loadGhostLibrary(store) {
    if (!store || typeof store.loadJsonRecord !== 'function') return {};
    const raw = store.loadJsonRecord(ARCADE_GHOST_LIBRARY_STORAGE_KEY, {});
    return normalizeGhostLibrary(raw);
}

export function saveGhostLibrary(store, ghostLibrary) {
    if (!store || typeof store.saveJsonRecord !== 'function') return;
    store.saveJsonRecord(
        ARCADE_GHOST_LIBRARY_STORAGE_KEY,
        normalizeGhostLibrary(ghostLibrary)
    );
}

export function getLongestGhostByRoute(ghostLibrary, routeId) {
    const safeRouteId = normalizeString(routeId);
    if (!safeRouteId) return null;
    const normalizedLibrary = normalizeGhostLibrary(ghostLibrary);
    const entry = normalizedLibrary[safeRouteId];
    return entry ? cloneObject(entry) : null;
}

export function upsertLongestGhostByRoute(
    ghostLibrary,
    routeId,
    ghostClip,
    durationMs,
    { updatedAt = null } = {}
) {
    const safeRouteId = normalizeString(routeId);
    if (!safeRouteId) {
        return {
            ghostLibrary: normalizeGhostLibrary(ghostLibrary),
            changed: false,
            reason: 'invalid_route',
        };
    }

    const clipValidation = validateGhostClip(ghostClip);
    if (!clipValidation.valid || !clipValidation.clip) {
        return {
            ghostLibrary: normalizeGhostLibrary(ghostLibrary),
            changed: false,
            reason: clipValidation.reason === 'invalid_duration' ? 'invalid_duration' : 'invalid_clip',
        };
    }
    const safeClip = clipValidation.clip;

    const explicitDurationMs = toSafeDurationMs(durationMs);
    const derivedDurationMs = deriveDurationMsFromGhostClip(safeClip);
    const safeDurationMs = Math.max(explicitDurationMs, derivedDurationMs);
    if (safeDurationMs <= 0) {
        return {
            ghostLibrary: normalizeGhostLibrary(ghostLibrary),
            changed: false,
            reason: 'invalid_duration',
        };
    }

    const nextLibrary = normalizeGhostLibrary(ghostLibrary);
    const previousEntry = nextLibrary[safeRouteId] || null;
    if (previousEntry && previousEntry.durationMs >= safeDurationMs) {
        return {
            ghostLibrary: nextLibrary,
            changed: false,
            reason: 'not_longer',
            entry: cloneObject(previousEntry),
        };
    }

    const nextEntry = {
        routeId: safeRouteId,
        longestGhostClip: safeClip,
        durationMs: safeDurationMs,
        updatedAt: normalizeString(updatedAt, new Date().toISOString()),
    };
    nextLibrary[safeRouteId] = nextEntry;

    return {
        ghostLibrary: nextLibrary,
        changed: true,
        reason: previousEntry ? 'replaced_longest' : 'created',
        entry: cloneObject(nextEntry),
    };
}

export function bootstrapGhostLibraryFromLeaderboard(
    ghostLibrary,
    leaderboardByRoute,
    { force = false } = {}
) {
    const normalizedLibrary = normalizeGhostLibrary(ghostLibrary);
    const leaderboard = normalizeLeaderboard(leaderboardByRoute);
    let nextLibrary = normalizedLibrary;
    let changed = false;

    for (const routeId of Object.keys(leaderboard)) {
        if (!force && nextLibrary[routeId]) {
            continue;
        }
        const bestEntry = resolveLeaderboardBestEntryForRoute(leaderboard, routeId);
        if (!bestEntry) continue;

        const upsertResult = upsertLongestGhostByRoute(
            nextLibrary,
            routeId,
            bestEntry.ghostClip,
            bestEntry.totalTimeMs,
            { updatedAt: bestEntry.date }
        );
        if (!upsertResult.changed) continue;
        nextLibrary = upsertResult.ghostLibrary;
        changed = true;
    }

    return {
        ghostLibrary: nextLibrary,
        changed,
    };
}
