import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
} from '../StorageKeys.js';
import { createDefaultStoragePlatform } from '../../state/storage/StoragePlatform.js';

const MENU_TELEMETRY_STORAGE_KEY = STORAGE_KEYS.menuTelemetry;
const MENU_TELEMETRY_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuTelemetry;
const MAX_EVENTS = 30;
const MAX_RECENT_ROUNDS = 12;

function getDefaultStorage() {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

function sanitizeEventType(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || 'unknown';
}

function sanitizeBucketKey(value, fallback = 'unknown') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function toNonNegativeInt(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.floor(parsed));
}

function toNonNegativeNumber(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
}

function createDefaultBucket() {
    return {
        rounds: 0,
        matches: 0,
        humanWins: 0,
        botWins: 0,
        totalDuration: 0,
        totalSelfCollisions: 0,
        totalItemUses: 0,
        totalStuckEvents: 0,
        parcoursCompletions: 0,
        totalParcoursCompletionTimeMs: 0,
        lastSeenAt: '',
    };
}

function normalizeBucketCollection(source) {
    const normalized = {};
    if (!source || typeof source !== 'object') return normalized;
    Object.entries(source).forEach(([key, value]) => {
        const bucketKey = sanitizeBucketKey(key);
        const bucket = value && typeof value === 'object' ? value : {};
        normalized[bucketKey] = {
            rounds: toNonNegativeInt(bucket.rounds, 0),
            matches: toNonNegativeInt(bucket.matches, 0),
            humanWins: toNonNegativeInt(bucket.humanWins, 0),
            botWins: toNonNegativeInt(bucket.botWins, 0),
            totalDuration: toNonNegativeNumber(bucket.totalDuration, 0),
            totalSelfCollisions: toNonNegativeInt(bucket.totalSelfCollisions, 0),
            totalItemUses: toNonNegativeInt(bucket.totalItemUses, 0),
            totalStuckEvents: toNonNegativeInt(bucket.totalStuckEvents, 0),
            parcoursCompletions: toNonNegativeInt(bucket.parcoursCompletions, 0),
            totalParcoursCompletionTimeMs: toNonNegativeNumber(bucket.totalParcoursCompletionTimeMs, 0),
            lastSeenAt: typeof bucket.lastSeenAt === 'string' ? bucket.lastSeenAt : '',
        };
    });
    return normalized;
}

function createDefaultBalanceSummary() {
    return {
        rounds: 0,
        matches: 0,
        humanWins: 0,
        botWins: 0,
        totalDuration: 0,
        totalSelfCollisions: 0,
        totalItemUses: 0,
        totalStuckEvents: 0,
        parcoursCompletions: 0,
        totalParcoursCompletionTimeMs: 0,
        maps: {},
        modes: {},
    };
}

function normalizeBalanceSummary(source) {
    const summary = source && typeof source === 'object' ? source : {};
    return {
        rounds: toNonNegativeInt(summary.rounds, 0),
        matches: toNonNegativeInt(summary.matches, 0),
        humanWins: toNonNegativeInt(summary.humanWins, 0),
        botWins: toNonNegativeInt(summary.botWins, 0),
        totalDuration: toNonNegativeNumber(summary.totalDuration, 0),
        totalSelfCollisions: toNonNegativeInt(summary.totalSelfCollisions, 0),
        totalItemUses: toNonNegativeInt(summary.totalItemUses, 0),
        totalStuckEvents: toNonNegativeInt(summary.totalStuckEvents, 0),
        parcoursCompletions: toNonNegativeInt(summary.parcoursCompletions, 0),
        totalParcoursCompletionTimeMs: toNonNegativeNumber(summary.totalParcoursCompletionTimeMs, 0),
        maps: normalizeBucketCollection(summary.maps),
        modes: normalizeBucketCollection(summary.modes),
    };
}

function normalizeRecentRoundEntry(entry) {
    const source = entry && typeof entry === 'object' ? entry : {};
    const winnerType = sanitizeBucketKey(source.winnerType, 'draw');
    return {
        at: typeof source.at === 'string' ? source.at : '',
        mapKey: sanitizeBucketKey(source.mapKey, 'unknown'),
        mode: sanitizeBucketKey(source.mode, 'classic'),
        state: sanitizeBucketKey(source.state, 'ROUND_END'),
        reason: sanitizeBucketKey(source.reason, 'ELIMINATION'),
        winnerType: winnerType === 'human' || winnerType === 'bot' ? winnerType : 'draw',
        winnerLabel: sanitizeBucketKey(source.winnerLabel, 'Unbekannt'),
        duration: toNonNegativeNumber(source.duration, 0),
        selfCollisions: toNonNegativeInt(source.selfCollisions, 0),
        itemUses: toNonNegativeInt(source.itemUses, 0),
        stuckEvents: toNonNegativeInt(source.stuckEvents, 0),
        parcoursCompleted: source.parcoursCompleted === true,
        parcoursRouteId: sanitizeBucketKey(source.parcoursRouteId, ''),
        parcoursCompletionTimeMs: toNonNegativeNumber(source.parcoursCompletionTimeMs, 0),
    };
}

function createDefaultState() {
    return {
        abortCount: 0,
        backtrackCount: 0,
        quickStartCount: 0,
        startAttempts: 0,
        events: [],
        balanceSummary: createDefaultBalanceSummary(),
        recentRounds: [],
    };
}

export class MenuTelemetryStore {
    constructor(options = {}) {
        this.storagePlatform = options.storagePlatform || createDefaultStoragePlatform({
            storage: options.storage ?? getDefaultStorage(),
            onQuotaExceeded: options.onQuotaExceeded,
        });
        this.storage = this.storagePlatform?.driver?.storage || null;
        this.storageKey = options.storageKey || MENU_TELEMETRY_STORAGE_KEY;
        this.storageLegacyKeys = Array.isArray(options.storageLegacyKeys)
            ? [...options.storageLegacyKeys]
            : [...MENU_TELEMETRY_STORAGE_LEGACY_KEYS];
    }

    _loadState() {
        try {
            const parsed = this.storagePlatform.readJson(
                this.storageKey,
                this.storageLegacyKeys,
                createDefaultState()
            );
            return {
                ...createDefaultState(),
                ...(parsed && typeof parsed === 'object' ? parsed : {}),
                events: Array.isArray(parsed?.events) ? parsed.events : [],
                balanceSummary: normalizeBalanceSummary(parsed?.balanceSummary),
                recentRounds: Array.isArray(parsed?.recentRounds)
                    ? parsed.recentRounds.map((entry) => normalizeRecentRoundEntry(entry))
                    : [],
            };
        } catch {
            return createDefaultState();
        }
    }

    _saveState(state) {
        return this.storagePlatform.writeJson(this.storageKey, state).ok;
    }

    _resolveBucket(collection, key) {
        const bucketKey = sanitizeBucketKey(key);
        const existing = collection[bucketKey];
        if (existing && typeof existing === 'object') {
            collection[bucketKey] = {
                ...createDefaultBucket(),
                ...existing,
            };
            return collection[bucketKey];
        }
        collection[bucketKey] = createDefaultBucket();
        return collection[bucketKey];
    }

    _recordRoundBalance(state, payload = null, recordedAt = '') {
        const summary = normalizeBalanceSummary(state.balanceSummary);
        const source = payload && typeof payload === 'object' ? payload : {};
        const winnerType = sanitizeBucketKey(source.winnerType, 'draw');
        const mapKey = sanitizeBucketKey(source.mapKey, 'unknown');
        const mode = sanitizeBucketKey(source.mode, 'classic');
        const duration = toNonNegativeNumber(source.duration, 0);
        const selfCollisions = toNonNegativeInt(source.selfCollisions, 0);
        const itemUses = toNonNegativeInt(source.itemUses, 0);
        const stuckEvents = toNonNegativeInt(source.stuckEvents, 0);
        const reason = sanitizeBucketKey(source.reason, 'ELIMINATION');
        const parcoursCompleted = source.parcoursCompleted === true;
        const parcoursRouteId = sanitizeBucketKey(source.parcoursRouteId, '');
        const parcoursCompletionTimeMs = toNonNegativeNumber(source.parcoursCompletionTimeMs, 0);

        summary.rounds += 1;
        summary.totalDuration += duration;
        summary.totalSelfCollisions += selfCollisions;
        summary.totalItemUses += itemUses;
        summary.totalStuckEvents += stuckEvents;
        if (parcoursCompleted) {
            summary.parcoursCompletions += 1;
            summary.totalParcoursCompletionTimeMs += parcoursCompletionTimeMs;
        }
        if (winnerType === 'human') summary.humanWins += 1;
        if (winnerType === 'bot') summary.botWins += 1;

        const mapBucket = this._resolveBucket(summary.maps, mapKey);
        mapBucket.rounds += 1;
        mapBucket.totalDuration += duration;
        mapBucket.totalSelfCollisions += selfCollisions;
        mapBucket.totalItemUses += itemUses;
        mapBucket.totalStuckEvents += stuckEvents;
        if (parcoursCompleted) {
            mapBucket.parcoursCompletions += 1;
            mapBucket.totalParcoursCompletionTimeMs += parcoursCompletionTimeMs;
        }
        if (winnerType === 'human') mapBucket.humanWins += 1;
        if (winnerType === 'bot') mapBucket.botWins += 1;
        mapBucket.lastSeenAt = recordedAt;

        const modeBucket = this._resolveBucket(summary.modes, mode);
        modeBucket.rounds += 1;
        modeBucket.totalDuration += duration;
        modeBucket.totalSelfCollisions += selfCollisions;
        modeBucket.totalItemUses += itemUses;
        modeBucket.totalStuckEvents += stuckEvents;
        if (parcoursCompleted) {
            modeBucket.parcoursCompletions += 1;
            modeBucket.totalParcoursCompletionTimeMs += parcoursCompletionTimeMs;
        }
        if (winnerType === 'human') modeBucket.humanWins += 1;
        if (winnerType === 'bot') modeBucket.botWins += 1;
        modeBucket.lastSeenAt = recordedAt;

        state.balanceSummary = summary;
        state.recentRounds.push(normalizeRecentRoundEntry({
            at: recordedAt,
            mapKey,
            mode,
            state: sanitizeBucketKey(source.state, 'ROUND_END'),
            reason,
            winnerType,
            winnerLabel: sanitizeBucketKey(source.winnerLabel, winnerType === 'bot' ? 'Bot' : 'Spieler'),
            duration,
            selfCollisions,
            itemUses,
            stuckEvents,
            parcoursCompleted,
            parcoursRouteId,
            parcoursCompletionTimeMs,
        }));
        if (state.recentRounds.length > MAX_RECENT_ROUNDS) {
            state.recentRounds = state.recentRounds.slice(state.recentRounds.length - MAX_RECENT_ROUNDS);
        }
    }

    _recordMatchBalance(state, payload = null, recordedAt = '') {
        const summary = normalizeBalanceSummary(state.balanceSummary);
        const source = payload && typeof payload === 'object' ? payload : {};
        const mapKey = sanitizeBucketKey(source.mapKey, 'unknown');
        const mode = sanitizeBucketKey(source.mode, 'classic');

        summary.matches += 1;
        this._resolveBucket(summary.maps, mapKey).matches += 1;
        this._resolveBucket(summary.modes, mode).matches += 1;
        summary.maps[mapKey].lastSeenAt = recordedAt;
        summary.modes[mode].lastSeenAt = recordedAt;
        state.balanceSummary = summary;
    }

    recordEvent(eventType, payload = null) {
        const state = this._loadState();
        const normalizedEventType = sanitizeEventType(eventType);
        const recordedAt = new Date().toISOString();
        if (normalizedEventType === 'abort') state.abortCount += 1;
        if (normalizedEventType === 'backtrack') state.backtrackCount += 1;
        if (normalizedEventType === 'quickstart') state.quickStartCount += 1;
        if (normalizedEventType === 'start_attempt') state.startAttempts += 1;
        if (normalizedEventType === 'round_end') this._recordRoundBalance(state, payload, recordedAt);
        if (normalizedEventType === 'match_end') this._recordMatchBalance(state, payload, recordedAt);

        state.events.push({
            type: normalizedEventType,
            at: recordedAt,
            payload: payload && typeof payload === 'object' ? { ...payload } : null,
        });
        if (state.events.length > MAX_EVENTS) {
            state.events = state.events.slice(state.events.length - MAX_EVENTS);
        }
        this._saveState(state);
        return state;
    }

    getSnapshot() {
        return this._loadState();
    }

    clear() {
        const clearedState = createDefaultState();
        this._saveState(clearedState);
        return clearedState;
    }
}
