import { validateGhostClip } from '../../shared/contracts/GhostClipContract.js';

const ARCADE_GHOST_LIBRARY_STORAGE_KEY = 'cuviosclash.arcade-ghost-library.v1';
const ARCADE_GHOST_LIBRARY_SCHEMA_VERSION = 'arcade-ghost-library.v2';
const GHOST_LIBRARY_UPDATED_AT_FALLBACK_ISO = '1970-01-01T00:00:00.000Z';
const GHOST_LIBRARY_META_ALIAS_INDEX = '__ghostAliasIndex';
const GHOST_LIBRARY_META_LAST_TOUCH_SEQ = '__ghostLastTouchSeq';
const GHOST_LIBRARY_META_SCHEMA_VERSION = '__ghostSchemaVersion';

const DEFAULT_GHOST_LIBRARY_BUDGET = Object.freeze({
    maxRoutes: 64,
    maxFramesPerRoute: 0,
    maxBytes: 0,
    canonicalizeAliases: true,
});

function isPersistenceSuccess(result) {
    return result === undefined || result === true || result?.success === true;
}

function warnPersistenceFailure(contextLabel, result) {
    if (isPersistenceSuccess(result)) return;
    if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(`[ArcadeGhostLibrary] ${String(contextLabel || 'save')} failed`, {
        reason: String(result?.reason || ''),
        metadata: result?.metadata && typeof result.metadata === 'object'
            ? { ...result.metadata }
            : null,
    });
}

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

function toSafePositiveInteger(value, fallback = 0) {
    const numeric = Math.trunc(Number(value));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function toSafeNonNegativeInteger(value, fallback = 0) {
    const numeric = Math.trunc(Number(value));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function deriveDurationMsFromGhostClip(ghostClip) {
    const sourceDurationMs = toSafeDurationMs(Number(ghostClip?.sourceDuration) * 1000);
    if (sourceDurationMs > 0) return sourceDurationMs;
    const displayDurationMs = toSafeDurationMs(Number(ghostClip?.displayDuration) * 1000);
    if (displayDurationMs > 0) return displayDurationMs;
    return 0;
}

function normalizeGhostLibraryBudgetOptions(options = null) {
    const input = isPlainObject(options) ? options : {};
    return {
        maxRoutes: toSafePositiveInteger(input.maxRoutes, DEFAULT_GHOST_LIBRARY_BUDGET.maxRoutes),
        maxFramesPerRoute: toSafePositiveInteger(input.maxFramesPerRoute, 0),
        maxBytes: toSafePositiveInteger(input.maxBytes, 0),
        canonicalizeAliases: input.canonicalizeAliases !== false,
    };
}

function resolveGhostClipNormalizationOptions(budgetOptions) {
    return budgetOptions.maxFramesPerRoute > 0
        ? { maxFrames: budgetOptions.maxFramesPerRoute }
        : {};
}

function normalizeUpdatedAtIso(value, fallbackIso = GHOST_LIBRARY_UPDATED_AT_FALLBACK_ISO) {
    const raw = normalizeString(value);
    if (!raw) return fallbackIso;
    const parsedMs = Date.parse(raw);
    return Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : fallbackIso;
}

function toUpdatedAtMs(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function compareByEvictionPriority(left, right) {
    const byUpdatedAt = left.updatedAtMs - right.updatedAtMs;
    if (byUpdatedAt !== 0) return byUpdatedAt;
    const byLastTouchSeq = left.lastTouchSeq - right.lastTouchSeq;
    if (byLastTouchSeq !== 0) return byLastTouchSeq;
    return left.routeId.localeCompare(right.routeId);
}

function compareCanonicalWinner(left, right) {
    const leftDuration = toSafeDurationMs(left?.durationMs);
    const rightDuration = toSafeDurationMs(right?.durationMs);
    if (leftDuration !== rightDuration) return rightDuration - leftDuration;
    const byUpdatedAt = toUpdatedAtMs(right?.updatedAt) - toUpdatedAtMs(left?.updatedAt);
    if (byUpdatedAt !== 0) return byUpdatedAt;
    const bySeq = toSafeNonNegativeInteger(right?.lastTouchSeq) - toSafeNonNegativeInteger(left?.lastTouchSeq);
    if (bySeq !== 0) return bySeq;
    return String(left?.canonicalRouteId || left?.routeId || '').localeCompare(
        String(right?.canonicalRouteId || right?.routeId || '')
    );
}

function estimateSerializedSize(value) {
    try {
        return JSON.stringify(value).length;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

function createTelemetryDelta() {
    return {
        evictedRoutes: 0,
        trimmedFrames: 0,
        migrationWrites: 0,
        droppedByByteBudget: 0,
    };
}

function mergeTelemetryDelta(intoDelta, delta) {
    if (!isPlainObject(intoDelta) || !isPlainObject(delta)) return intoDelta;
    intoDelta.evictedRoutes += toSafeNonNegativeInteger(delta.evictedRoutes, 0);
    intoDelta.trimmedFrames += toSafeNonNegativeInteger(delta.trimmedFrames, 0);
    intoDelta.migrationWrites += toSafeNonNegativeInteger(delta.migrationWrites, 0);
    intoDelta.droppedByByteBudget += toSafeNonNegativeInteger(delta.droppedByByteBudget, 0);
    return intoDelta;
}

function normalizeRouteAliases(routeAliases, canonicalRouteId) {
    if (!Array.isArray(routeAliases)) return [];
    const safeCanonicalRouteId = normalizeString(canonicalRouteId);
    const seen = new Set();
    const normalized = [];
    for (let i = 0; i < routeAliases.length; i += 1) {
        const alias = normalizeString(routeAliases[i]);
        if (!alias || alias === safeCanonicalRouteId || seen.has(alias)) continue;
        seen.add(alias);
        normalized.push(alias);
    }
    return normalized;
}

function cloneAliasIndex(aliasIndex) {
    const safeAliasIndex = isPlainObject(aliasIndex) ? aliasIndex : {};
    return { ...safeAliasIndex };
}

function attachGhostLibraryMeta(ghostLibrary, {
    schemaVersion = ARCADE_GHOST_LIBRARY_SCHEMA_VERSION,
    lastTouchSeq = 0,
    aliasIndex = null,
} = {}) {
    if (!isPlainObject(ghostLibrary)) return {};
    Object.defineProperty(ghostLibrary, GHOST_LIBRARY_META_SCHEMA_VERSION, {
        value: normalizeString(schemaVersion, ARCADE_GHOST_LIBRARY_SCHEMA_VERSION),
        writable: true,
        enumerable: false,
        configurable: true,
    });
    Object.defineProperty(ghostLibrary, GHOST_LIBRARY_META_LAST_TOUCH_SEQ, {
        value: toSafeNonNegativeInteger(lastTouchSeq, 0),
        writable: true,
        enumerable: false,
        configurable: true,
    });
    Object.defineProperty(ghostLibrary, GHOST_LIBRARY_META_ALIAS_INDEX, {
        value: cloneAliasIndex(aliasIndex),
        writable: true,
        enumerable: false,
        configurable: true,
    });
    return ghostLibrary;
}

function createEmptyGhostLibrary() {
    return attachGhostLibraryMeta({}, {
        schemaVersion: ARCADE_GHOST_LIBRARY_SCHEMA_VERSION,
        lastTouchSeq: 0,
        aliasIndex: {},
    });
}

function getGhostLibraryMeta(ghostLibrary) {
    const safeLibrary = isPlainObject(ghostLibrary) ? ghostLibrary : {};
    return {
        schemaVersion: normalizeString(
            safeLibrary[GHOST_LIBRARY_META_SCHEMA_VERSION],
            ARCADE_GHOST_LIBRARY_SCHEMA_VERSION
        ),
        lastTouchSeq: toSafeNonNegativeInteger(safeLibrary[GHOST_LIBRARY_META_LAST_TOUCH_SEQ], 0),
        aliasIndex: cloneAliasIndex(safeLibrary[GHOST_LIBRARY_META_ALIAS_INDEX]),
    };
}

function cloneGhostLibraryContainer(ghostLibrary) {
    const safeLibrary = isPlainObject(ghostLibrary) ? ghostLibrary : {};
    const copy = { ...safeLibrary };
    return attachGhostLibraryMeta(copy, getGhostLibraryMeta(safeLibrary));
}

function resolveCanonicalRouteId(ghostLibrary, routeId, budgetOptions = DEFAULT_GHOST_LIBRARY_BUDGET) {
    const safeRouteId = normalizeString(routeId);
    if (!safeRouteId) return '';
    const safeLibrary = isPlainObject(ghostLibrary) ? ghostLibrary : {};
    if (budgetOptions.canonicalizeAliases !== false) {
        const aliasIndex = getGhostLibraryMeta(safeLibrary).aliasIndex;
        const aliasedCanonical = normalizeString(aliasIndex[safeRouteId]);
        if (aliasedCanonical && isPlainObject(safeLibrary[aliasedCanonical])) {
            return aliasedCanonical;
        }
    }
    return isPlainObject(safeLibrary[safeRouteId]) ? safeRouteId : '';
}

function clearAliasMappingForCanonical(aliasIndex, canonicalRouteId) {
    const safeCanonical = normalizeString(canonicalRouteId);
    if (!safeCanonical) return;
    const keys = Object.keys(aliasIndex);
    for (let i = 0; i < keys.length; i += 1) {
        if (normalizeString(aliasIndex[keys[i]]) === safeCanonical) {
            delete aliasIndex[keys[i]];
        }
    }
}

function writeAliasMappings(aliasIndex, canonicalRouteId, aliases) {
    const safeCanonical = normalizeString(canonicalRouteId);
    if (!safeCanonical) return;
    aliasIndex[safeCanonical] = safeCanonical;
    for (let i = 0; i < aliases.length; i += 1) {
        aliasIndex[aliases[i]] = safeCanonical;
    }
}

function serializeGhostLibraryForStorage(ghostLibrary, budgetOptions = DEFAULT_GHOST_LIBRARY_BUDGET) {
    const safeLibrary = isPlainObject(ghostLibrary) ? ghostLibrary : {};
    const meta = getGhostLibraryMeta(safeLibrary);
    const safeAliasIndex = {};
    if (budgetOptions.canonicalizeAliases !== false) {
        const aliases = Object.keys(meta.aliasIndex);
        for (let i = 0; i < aliases.length; i += 1) {
            const alias = normalizeString(aliases[i]);
            const canonical = normalizeString(meta.aliasIndex[alias]);
            if (!alias || !canonical || !isPlainObject(safeLibrary[canonical])) continue;
            safeAliasIndex[alias] = canonical;
        }
    }
    return {
        schemaVersion: ARCADE_GHOST_LIBRARY_SCHEMA_VERSION,
        lastTouchSeq: toSafeNonNegativeInteger(meta.lastTouchSeq, 0),
        aliasIndex: safeAliasIndex,
        routes: { ...safeLibrary },
    };
}

function createGhostLibraryEntry(
    canonicalRouteId,
    source = null,
    budgetOptions = DEFAULT_GHOST_LIBRARY_BUDGET,
    { defaultLastTouchSeq = 0, forcedRouteAliases = null } = {}
) {
    const safeCanonicalRouteId = normalizeString(canonicalRouteId);
    if (!safeCanonicalRouteId) return { entry: null, telemetryDelta: createTelemetryDelta() };
    const input = isPlainObject(source) ? source : {};
    const clipValidation = validateGhostClip(
        input.longestGhostClip ?? input.ghostClip ?? null,
        resolveGhostClipNormalizationOptions(budgetOptions)
    );
    if (!clipValidation.valid || !clipValidation.clip) {
        return { entry: null, telemetryDelta: createTelemetryDelta() };
    }
    const explicitDurationMs = toSafeDurationMs(input.durationMs);
    const derivedDurationMs = deriveDurationMsFromGhostClip(clipValidation.clip);
    const durationMs = Math.max(explicitDurationMs, derivedDurationMs);
    if (durationMs <= 0) {
        return { entry: null, telemetryDelta: createTelemetryDelta() };
    }
    const entry = {
        routeId: safeCanonicalRouteId,
        canonicalRouteId: safeCanonicalRouteId,
        routeAliases: normalizeRouteAliases(
            forcedRouteAliases || input.routeAliases,
            safeCanonicalRouteId
        ),
        longestGhostClip: clipValidation.clip,
        durationMs,
        updatedAt: normalizeUpdatedAtIso(input.updatedAt),
        lastTouchSeq: toSafeNonNegativeInteger(input.lastTouchSeq, defaultLastTouchSeq),
    };
    const telemetryDelta = createTelemetryDelta();
    telemetryDelta.trimmedFrames = toSafeNonNegativeInteger(clipValidation?.stats?.trimmedFrames, 0);
    return { entry, telemetryDelta };
}

function applyGlobalBudget(ghostLibrary, budgetOptions) {
    const routeIds = Object.keys(ghostLibrary);
    if (routeIds.length <= budgetOptions.maxRoutes && budgetOptions.maxBytes <= 0) {
        return {
            ghostLibrary,
            telemetryDelta: createTelemetryDelta(),
        };
    }
    const sortable = routeIds.map((routeId) => ({
        routeId,
        updatedAtMs: toUpdatedAtMs(ghostLibrary[routeId]?.updatedAt),
        lastTouchSeq: toSafeNonNegativeInteger(ghostLibrary[routeId]?.lastTouchSeq, 0),
    }));
    sortable.sort(compareByEvictionPriority);
    const nextLibrary = cloneGhostLibraryContainer(ghostLibrary);
    const nextMeta = getGhostLibraryMeta(nextLibrary);
    let activeRouteCount = routeIds.length;
    let serializedSize = budgetOptions.maxBytes > 0
        ? estimateSerializedSize(serializeGhostLibraryForStorage(nextLibrary, budgetOptions))
        : 0;
    const telemetryDelta = createTelemetryDelta();
    let cursor = 0;
    while (
        cursor < sortable.length
        && (
            activeRouteCount > budgetOptions.maxRoutes
            || (budgetOptions.maxBytes > 0 && serializedSize > budgetOptions.maxBytes)
        )
    ) {
        const wasOverByteBudget = budgetOptions.maxBytes > 0 && serializedSize > budgetOptions.maxBytes;
        const evictRouteId = sortable[cursor].routeId;
        delete nextLibrary[evictRouteId];
        clearAliasMappingForCanonical(nextMeta.aliasIndex, evictRouteId);
        activeRouteCount -= 1;
        cursor += 1;
        telemetryDelta.evictedRoutes += 1;
        if (wasOverByteBudget) {
            telemetryDelta.droppedByByteBudget += 1;
        }
        if (budgetOptions.maxBytes > 0) {
            serializedSize = estimateSerializedSize(serializeGhostLibraryForStorage(nextLibrary, budgetOptions));
        }
    }
    attachGhostLibraryMeta(nextLibrary, nextMeta);
    return { ghostLibrary: nextLibrary, telemetryDelta };
}

function normalizeLeaderboard(bestByRoute) {
    if (!isPlainObject(bestByRoute)) return {};
    return bestByRoute;
}

function resolveLeaderboardBestEntryForRoute(leaderboard, routeId) {
    const entries = Array.isArray(leaderboard?.[routeId]) ? leaderboard[routeId] : [];
    return entries.length > 0 && isPlainObject(entries[0]) ? entries[0] : null;
}

function isRootSchemaV2(value) {
    return isPlainObject(value)
        && normalizeString(value.schemaVersion) === ARCADE_GHOST_LIBRARY_SCHEMA_VERSION
        && isPlainObject(value.routes);
}

function buildAliasSeedFromRoot(rawRoot) {
    const aliasesByCanonical = new Map();
    const rawAliasIndex = isPlainObject(rawRoot?.aliasIndex) ? rawRoot.aliasIndex : {};
    const aliases = Object.keys(rawAliasIndex);
    for (let i = 0; i < aliases.length; i += 1) {
        const alias = normalizeString(aliases[i]);
        const canonical = normalizeString(rawAliasIndex[alias]);
        if (!alias || !canonical) continue;
        const list = aliasesByCanonical.get(canonical) || [];
        list.push(alias);
        aliasesByCanonical.set(canonical, list);
    }
    return aliasesByCanonical;
}

function normalizeGhostLibrary(
    rawLibrary,
    budgetOptions = DEFAULT_GHOST_LIBRARY_BUDGET,
    { seedLastTouchSeq = 0 } = {}
) {
    let nextLibrary = createEmptyGhostLibrary();
    const telemetryDelta = createTelemetryDelta();
    let workingLastTouchSeq = Math.max(0, toSafeNonNegativeInteger(seedLastTouchSeq, 0));

    if (isRootSchemaV2(rawLibrary)) {
        const aliasSeedByCanonical = buildAliasSeedFromRoot(rawLibrary);
        const routeIds = Object.keys(rawLibrary.routes);
        for (let i = 0; i < routeIds.length; i += 1) {
            const canonicalRouteId = normalizeString(routeIds[i]);
            if (!canonicalRouteId) continue;
            const routeEntry = rawLibrary.routes[canonicalRouteId];
            const mergedAliases = [
                ...normalizeRouteAliases(routeEntry?.routeAliases, canonicalRouteId),
                ...(aliasSeedByCanonical.get(canonicalRouteId) || []),
            ];
            const upsertResult = upsertLongestGhostByRoute(
                nextLibrary,
                canonicalRouteId,
                routeEntry?.longestGhostClip ?? routeEntry?.ghostClip ?? null,
                routeEntry?.durationMs,
                {
                    updatedAt: routeEntry?.updatedAt,
                    lastTouchSeq: routeEntry?.lastTouchSeq,
                    routeAliases: mergedAliases,
                    canonicalRouteId,
                    budgetOptions,
                    assumeNormalizedLibrary: true,
                }
            );
            nextLibrary = upsertResult.ghostLibrary;
            mergeTelemetryDelta(telemetryDelta, upsertResult.telemetryDelta);
            workingLastTouchSeq = Math.max(
                workingLastTouchSeq,
                toSafeNonNegativeInteger(routeEntry?.lastTouchSeq, 0)
            );
        }
        const finalMeta = getGhostLibraryMeta(nextLibrary);
        attachGhostLibraryMeta(nextLibrary, {
            ...finalMeta,
            lastTouchSeq: Math.max(
                toSafeNonNegativeInteger(rawLibrary.lastTouchSeq, 0),
                workingLastTouchSeq,
                finalMeta.lastTouchSeq
            ),
        });
        return { ghostLibrary: nextLibrary, telemetryDelta };
    }

    if (!isPlainObject(rawLibrary)) {
        return { ghostLibrary: nextLibrary, telemetryDelta };
    }

    const routeIds = Object.keys(rawLibrary);
    for (let i = 0; i < routeIds.length; i += 1) {
        const routeId = normalizeString(routeIds[i]);
        if (!routeId) continue;
        const sourceEntry = rawLibrary[routeId];
        const canonicalRouteId = normalizeString(sourceEntry?.canonicalRouteId, routeId);
        const upsertResult = upsertLongestGhostByRoute(
            nextLibrary,
            routeId,
            sourceEntry?.longestGhostClip ?? sourceEntry?.ghostClip ?? null,
            sourceEntry?.durationMs,
            {
                updatedAt: sourceEntry?.updatedAt,
                lastTouchSeq: sourceEntry?.lastTouchSeq,
                routeAliases: sourceEntry?.routeAliases,
                canonicalRouteId,
                budgetOptions,
                assumeNormalizedLibrary: true,
            }
        );
        nextLibrary = upsertResult.ghostLibrary;
        mergeTelemetryDelta(telemetryDelta, upsertResult.telemetryDelta);
        workingLastTouchSeq = Math.max(
            workingLastTouchSeq,
            toSafeNonNegativeInteger(sourceEntry?.lastTouchSeq, 0)
        );
    }

    const finalMeta = getGhostLibraryMeta(nextLibrary);
    attachGhostLibraryMeta(nextLibrary, {
        ...finalMeta,
        lastTouchSeq: Math.max(finalMeta.lastTouchSeq, workingLastTouchSeq),
    });
    return { ghostLibrary: nextLibrary, telemetryDelta };
}

function resolveCanonicalCandidates(library, routeId, routeAliases = []) {
    const relatedCanonicalIds = new Set();
    const safeLibrary = isPlainObject(library) ? library : {};
    const meta = getGhostLibraryMeta(safeLibrary);
    const collectFromRoute = (candidate) => {
        const safeCandidate = normalizeString(candidate);
        if (!safeCandidate) return;
        if (isPlainObject(safeLibrary[safeCandidate])) {
            relatedCanonicalIds.add(safeCandidate);
        }
        const aliasedCanonical = normalizeString(meta.aliasIndex[safeCandidate]);
        if (aliasedCanonical && isPlainObject(safeLibrary[aliasedCanonical])) {
            relatedCanonicalIds.add(aliasedCanonical);
        }
    };
    collectFromRoute(routeId);
    for (let i = 0; i < routeAliases.length; i += 1) {
        collectFromRoute(routeAliases[i]);
    }
    return [...relatedCanonicalIds.values()];
}

function selectCanonicalWinner(library, relatedCanonicalIds, fallbackRouteId) {
    if (!Array.isArray(relatedCanonicalIds) || relatedCanonicalIds.length <= 0) {
        return normalizeString(fallbackRouteId);
    }
    const sortable = [];
    for (let i = 0; i < relatedCanonicalIds.length; i += 1) {
        const canonicalRouteId = normalizeString(relatedCanonicalIds[i]);
        const entry = library[canonicalRouteId];
        if (!canonicalRouteId || !isPlainObject(entry)) continue;
        sortable.push({
            canonicalRouteId,
            durationMs: toSafeDurationMs(entry.durationMs),
            updatedAt: entry.updatedAt,
            lastTouchSeq: toSafeNonNegativeInteger(entry.lastTouchSeq, 0),
        });
    }
    if (sortable.length <= 0) return normalizeString(fallbackRouteId);
    sortable.sort(compareCanonicalWinner);
    return sortable[0].canonicalRouteId;
}

export { ARCADE_GHOST_LIBRARY_STORAGE_KEY };
export { ARCADE_GHOST_LIBRARY_SCHEMA_VERSION };
export { DEFAULT_GHOST_LIBRARY_BUDGET as ARCADE_GHOST_LIBRARY_DEFAULT_BUDGET };
export function loadGhostLibrary(store, budgetOptions = null, options = null) {
    const resolvedBudget = normalizeGhostLibraryBudgetOptions(budgetOptions);
    const safeOptions = isPlainObject(options) ? options : {};
    const onMigrationWrite = typeof safeOptions.onMigrationWrite === 'function'
        ? safeOptions.onMigrationWrite
        : null;

    if (!store || typeof store.loadJsonRecord !== 'function') {
        return createEmptyGhostLibrary();
    }

    const raw = store.loadJsonRecord(ARCADE_GHOST_LIBRARY_STORAGE_KEY, {});
    const normalization = normalizeGhostLibrary(raw, resolvedBudget, {
        seedLastTouchSeq: toSafeNonNegativeInteger(raw?.lastTouchSeq, 0),
    });
    const normalized = normalization.ghostLibrary;
    if (typeof store.saveJsonRecord === 'function') {
        const rawSerialized = JSON.stringify(raw);
        const normalizedSerialized = JSON.stringify(serializeGhostLibraryForStorage(normalized, resolvedBudget));
        if (rawSerialized !== normalizedSerialized) {
            const saveResult = store.saveJsonRecord(
                ARCADE_GHOST_LIBRARY_STORAGE_KEY,
                serializeGhostLibraryForStorage(normalized, resolvedBudget)
            );
            warnPersistenceFailure('canonical write-back', saveResult);
            if (isPersistenceSuccess(saveResult)) {
                normalization.telemetryDelta.migrationWrites += 1;
                if (onMigrationWrite) {
                    onMigrationWrite({
                        key: ARCADE_GHOST_LIBRARY_STORAGE_KEY,
                        telemetryDelta: cloneObject(normalization.telemetryDelta),
                    });
                }
            }
        }
    }
    return normalized;
}

export function saveGhostLibrary(store, ghostLibrary, budgetOptions = null) {
    if (!store || typeof store.saveJsonRecord !== 'function') return;
    const resolvedBudget = normalizeGhostLibraryBudgetOptions(budgetOptions);
    const normalized = normalizeGhostLibrary(ghostLibrary, resolvedBudget).ghostLibrary;
    const saveResult = store.saveJsonRecord(
        ARCADE_GHOST_LIBRARY_STORAGE_KEY,
        serializeGhostLibraryForStorage(normalized, resolvedBudget)
    );
    warnPersistenceFailure('saveGhostLibrary', saveResult);
}

export function getLongestGhostByRoute(ghostLibrary, routeId, budgetOptions = null) {
    const safeRouteId = normalizeString(routeId);
    if (!safeRouteId) return null;
    if (!isPlainObject(ghostLibrary)) return null;
    const resolvedBudget = normalizeGhostLibraryBudgetOptions(budgetOptions);
    const canonicalRouteId = resolveCanonicalRouteId(ghostLibrary, safeRouteId, resolvedBudget);
    if (!canonicalRouteId) return null;
    const entry = createGhostLibraryEntry(
        canonicalRouteId,
        ghostLibrary[canonicalRouteId],
        resolvedBudget,
        {
            forcedRouteAliases: ghostLibrary[canonicalRouteId]?.routeAliases,
            defaultLastTouchSeq: toSafeNonNegativeInteger(ghostLibrary[canonicalRouteId]?.lastTouchSeq, 0),
        }
    ).entry;
    return entry ? cloneObject(entry) : null;
}

export function upsertLongestGhostByRoute(
    ghostLibrary,
    routeId,
    ghostClip,
    durationMs,
    {
        updatedAt = null,
        lastTouchSeq = null,
        canonicalRouteId = null,
        routeAliases = null,
        budgetOptions = null,
        assumeNormalizedLibrary = false,
    } = {}
) {
    const resolvedBudget = normalizeGhostLibraryBudgetOptions(budgetOptions);
    const telemetryDelta = createTelemetryDelta();
    const baseLibrary = assumeNormalizedLibrary
        ? cloneGhostLibraryContainer(ghostLibrary)
        : normalizeGhostLibrary(ghostLibrary, resolvedBudget).ghostLibrary;

    const safeRouteId = normalizeString(routeId);
    if (!safeRouteId) {
        return {
            ghostLibrary: baseLibrary,
            changed: false,
            reason: 'invalid_route',
            telemetryDelta,
        };
    }

    const clipValidation = validateGhostClip(
        ghostClip,
        resolveGhostClipNormalizationOptions(resolvedBudget)
    );
    if (!clipValidation.valid || !clipValidation.clip) {
        return {
            ghostLibrary: baseLibrary,
            changed: false,
            reason: clipValidation.reason === 'invalid_duration' ? 'invalid_duration' : 'invalid_clip',
            telemetryDelta,
        };
    }

    const explicitDurationMs = toSafeDurationMs(durationMs);
    const derivedDurationMs = deriveDurationMsFromGhostClip(clipValidation.clip);
    const safeDurationMs = Math.max(explicitDurationMs, derivedDurationMs);
    if (safeDurationMs <= 0) {
        return {
            ghostLibrary: baseLibrary,
            changed: false,
            reason: 'invalid_duration',
            telemetryDelta,
        };
    }

    const safeRouteAliases = normalizeRouteAliases(routeAliases, safeRouteId);
    const relatedCanonicalIds = resolvedBudget.canonicalizeAliases
        ? resolveCanonicalCandidates(baseLibrary, safeRouteId, safeRouteAliases)
        : [];
    const preferredCanonicalFromOption = normalizeString(canonicalRouteId);
    const canonicalWinner = resolvedBudget.canonicalizeAliases
        ? (
            preferredCanonicalFromOption
            || selectCanonicalWinner(baseLibrary, relatedCanonicalIds, safeRouteId)
            || safeRouteId
        )
        : safeRouteId;

    const previousEntryRaw = isPlainObject(baseLibrary[canonicalWinner]) ? baseLibrary[canonicalWinner] : null;
    const previousEntry = createGhostLibraryEntry(
        canonicalWinner,
        previousEntryRaw,
        resolvedBudget,
        {
            forcedRouteAliases: previousEntryRaw?.routeAliases,
            defaultLastTouchSeq: toSafeNonNegativeInteger(previousEntryRaw?.lastTouchSeq, 0),
        }
    ).entry;
    const shouldReplace = !previousEntry || previousEntry.durationMs < safeDurationMs;

    const nextLibrary = cloneGhostLibraryContainer(baseLibrary);
    const nextMeta = getGhostLibraryMeta(nextLibrary);
    const allMergedAliases = new Set();
    const pushAlias = (value) => {
        const safeAlias = normalizeString(value);
        if (!safeAlias || safeAlias === canonicalWinner) return;
        allMergedAliases.add(safeAlias);
    };
    pushAlias(safeRouteId);
    for (let i = 0; i < safeRouteAliases.length; i += 1) {
        pushAlias(safeRouteAliases[i]);
    }

    if (resolvedBudget.canonicalizeAliases) {
        for (let i = 0; i < relatedCanonicalIds.length; i += 1) {
            const relatedId = normalizeString(relatedCanonicalIds[i]);
            if (!relatedId || !isPlainObject(nextLibrary[relatedId])) continue;
            const relatedAliases = normalizeRouteAliases(nextLibrary[relatedId]?.routeAliases, relatedId);
            for (let j = 0; j < relatedAliases.length; j += 1) {
                pushAlias(relatedAliases[j]);
            }
            if (relatedId !== canonicalWinner) {
                delete nextLibrary[relatedId];
                clearAliasMappingForCanonical(nextMeta.aliasIndex, relatedId);
            }
        }
        const existingWinnerAliases = normalizeRouteAliases(nextLibrary[canonicalWinner]?.routeAliases, canonicalWinner);
        for (let i = 0; i < existingWinnerAliases.length; i += 1) {
            pushAlias(existingWinnerAliases[i]);
        }
    }

    const mergedAliases = [...allMergedAliases.values()];
    if (shouldReplace) {
        const nextSeq = lastTouchSeq == null
            ? nextMeta.lastTouchSeq + 1
            : Math.max(nextMeta.lastTouchSeq + 1, toSafeNonNegativeInteger(lastTouchSeq, nextMeta.lastTouchSeq + 1));
        const nextEntryResult = createGhostLibraryEntry(
            canonicalWinner,
            {
                longestGhostClip: clipValidation.clip,
                durationMs: safeDurationMs,
                updatedAt: normalizeUpdatedAtIso(updatedAt, GHOST_LIBRARY_UPDATED_AT_FALLBACK_ISO),
                lastTouchSeq: nextSeq,
                routeAliases: resolvedBudget.canonicalizeAliases ? mergedAliases : [],
            },
            resolvedBudget,
            {
                defaultLastTouchSeq: nextSeq,
                forcedRouteAliases: resolvedBudget.canonicalizeAliases ? mergedAliases : [],
            }
        );
        if (!nextEntryResult.entry) {
            return {
                ghostLibrary: baseLibrary,
                changed: false,
                reason: 'invalid_clip',
                telemetryDelta,
            };
        }
        nextLibrary[canonicalWinner] = nextEntryResult.entry;
        nextMeta.lastTouchSeq = Math.max(nextMeta.lastTouchSeq, nextSeq);
        telemetryDelta.trimmedFrames = toSafeNonNegativeInteger(clipValidation?.stats?.trimmedFrames, 0);
    } else if (resolvedBudget.canonicalizeAliases && isPlainObject(nextLibrary[canonicalWinner])) {
        nextLibrary[canonicalWinner] = {
            ...nextLibrary[canonicalWinner],
            routeAliases: mergedAliases,
        };
    }

    if (resolvedBudget.canonicalizeAliases) {
        clearAliasMappingForCanonical(nextMeta.aliasIndex, canonicalWinner);
        writeAliasMappings(nextMeta.aliasIndex, canonicalWinner, mergedAliases);
    } else {
        nextMeta.aliasIndex = {};
    }
    attachGhostLibraryMeta(nextLibrary, nextMeta);

    const budgeted = applyGlobalBudget(nextLibrary, resolvedBudget);
    mergeTelemetryDelta(telemetryDelta, budgeted.telemetryDelta);
    const finalLibrary = budgeted.ghostLibrary;
    const previousSerialized = JSON.stringify(serializeGhostLibraryForStorage(baseLibrary, resolvedBudget));
    const nextSerialized = JSON.stringify(serializeGhostLibraryForStorage(finalLibrary, resolvedBudget));
    const changed = previousSerialized !== nextSerialized;

    const resolvedCanonical = resolveCanonicalRouteId(finalLibrary, canonicalWinner, resolvedBudget) || canonicalWinner;
    const resolvedEntry = isPlainObject(finalLibrary[resolvedCanonical])
        ? cloneObject(finalLibrary[resolvedCanonical])
        : null;
    let reason = 'not_longer';
    if (shouldReplace) {
        reason = previousEntry ? 'replaced_longest' : 'created';
    } else if (changed) {
        reason = 'merged_aliases';
    }

    return {
        ghostLibrary: finalLibrary,
        changed,
        reason,
        entry: resolvedEntry,
        telemetryDelta,
    };
}
export function bootstrapGhostLibraryFromLeaderboard(
    ghostLibrary,
    leaderboardByRoute,
    { force = false, budgetOptions = null } = {}
) {
    const resolvedBudget = normalizeGhostLibraryBudgetOptions(budgetOptions);
    const normalizedLibrary = normalizeGhostLibrary(ghostLibrary, resolvedBudget).ghostLibrary;
    const telemetryDelta = createTelemetryDelta();
    const leaderboard = normalizeLeaderboard(leaderboardByRoute);
    let nextLibrary = normalizedLibrary;
    let changed = false;

    for (const routeId of Object.keys(leaderboard)) {
        if (!force && getLongestGhostByRoute(nextLibrary, routeId, resolvedBudget)) {
            continue;
        }
        const bestEntry = resolveLeaderboardBestEntryForRoute(leaderboard, routeId);
        if (!bestEntry) continue;
        const upsertResult = upsertLongestGhostByRoute(
            nextLibrary,
            routeId,
            bestEntry.ghostClip,
            bestEntry.totalTimeMs,
            {
                updatedAt: bestEntry.date,
                budgetOptions: resolvedBudget,
                assumeNormalizedLibrary: true,
            }
        );
        mergeTelemetryDelta(telemetryDelta, upsertResult.telemetryDelta);
        if (!upsertResult.changed) continue;
        nextLibrary = upsertResult.ghostLibrary;
        changed = true;
    }

    return {
        ghostLibrary: nextLibrary,
        changed,
        telemetryDelta,
    };
}

export function getGhostLibraryDebugSnapshot(ghostLibrary, budgetOptions = null) {
    const resolvedBudget = normalizeGhostLibraryBudgetOptions(budgetOptions);
    const normalized = normalizeGhostLibrary(ghostLibrary, resolvedBudget).ghostLibrary;
    const meta = getGhostLibraryMeta(normalized);
    return {
        schemaVersion: ARCADE_GHOST_LIBRARY_SCHEMA_VERSION,
        routeCount: Object.keys(normalized).length,
        aliasCount: Object.keys(meta.aliasIndex).length,
        lastTouchSeq: meta.lastTouchSeq,
        serializedBytes: estimateSerializedSize(serializeGhostLibraryForStorage(normalized, resolvedBudget)),
        budget: {
            maxRoutes: resolvedBudget.maxRoutes,
            maxFramesPerRoute: resolvedBudget.maxFramesPerRoute,
            maxBytes: resolvedBudget.maxBytes,
            canonicalizeAliases: resolvedBudget.canonicalizeAliases,
        },
    };
}
