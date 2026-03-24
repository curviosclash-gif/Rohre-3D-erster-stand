import { ensureMenuContractState } from '../../composition/core-ui/CoreSettingsPorts.js';

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

function sanitizeTelemetryKey(value, fallback = 'unknown') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeTelemetryBucketSnapshot(source) {
    const bucket = source && typeof source === 'object' ? source : {};
    return {
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
}

function deriveTelemetryTopBuckets(source, fallbackKey) {
    if (!source || typeof source !== 'object') return [];
    return Object.entries(source)
        .map(([key, value]) => {
            const bucket = normalizeTelemetryBucketSnapshot(value);
            return {
                key: sanitizeTelemetryKey(key, fallbackKey),
                rounds: bucket.rounds,
                matches: bucket.matches,
                humanWins: bucket.humanWins,
                botWins: bucket.botWins,
                humanWinRate: bucket.rounds > 0 ? bucket.humanWins / bucket.rounds : 0,
                botWinRate: bucket.rounds > 0 ? bucket.botWins / bucket.rounds : 0,
                averageRoundDuration: bucket.rounds > 0 ? bucket.totalDuration / bucket.rounds : 0,
                selfCollisionsPerRound: bucket.rounds > 0 ? bucket.totalSelfCollisions / bucket.rounds : 0,
                itemUsesPerRound: bucket.rounds > 0 ? bucket.totalItemUses / bucket.rounds : 0,
                stuckEventsPerRound: bucket.rounds > 0 ? bucket.totalStuckEvents / bucket.rounds : 0,
                parcoursCompletionRate: bucket.rounds > 0 ? bucket.parcoursCompletions / bucket.rounds : 0,
                averageParcoursCompletionTimeMs: bucket.parcoursCompletions > 0
                    ? bucket.totalParcoursCompletionTimeMs / bucket.parcoursCompletions
                    : 0,
                lastSeenAt: bucket.lastSeenAt,
            };
        })
        .filter((entry) => entry.rounds > 0 || entry.matches > 0)
        .sort((left, right) => {
            if (right.rounds !== left.rounds) return right.rounds - left.rounds;
            if (right.matches !== left.matches) return right.matches - left.matches;
            return left.key.localeCompare(right.key);
        })
        .slice(0, 3);
}

function normalizeTelemetryRecentRounds(source) {
    if (!Array.isArray(source)) return [];
    return source
        .slice(-6)
        .map((entry) => ({
            at: typeof entry?.at === 'string' ? entry.at : '',
            mapKey: sanitizeTelemetryKey(entry?.mapKey, 'unknown'),
            mode: sanitizeTelemetryKey(entry?.mode, 'classic'),
            state: sanitizeTelemetryKey(entry?.state, 'ROUND_END'),
            reason: sanitizeTelemetryKey(entry?.reason, 'ELIMINATION'),
            winnerType: sanitizeTelemetryKey(entry?.winnerType, 'draw'),
            winnerLabel: sanitizeTelemetryKey(entry?.winnerLabel, 'Unbekannt'),
            duration: toNonNegativeNumber(entry?.duration, 0),
            selfCollisions: toNonNegativeInt(entry?.selfCollisions, 0),
            itemUses: toNonNegativeInt(entry?.itemUses, 0),
            stuckEvents: toNonNegativeInt(entry?.stuckEvents, 0),
            parcoursCompleted: entry?.parcoursCompleted === true,
            parcoursRouteId: sanitizeTelemetryKey(entry?.parcoursRouteId, ''),
            parcoursCompletionTimeMs: toNonNegativeNumber(entry?.parcoursCompletionTimeMs, 0),
        }));
}

export function normalizeTelemetrySnapshot(snapshot) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const balanceSource = source.balanceSummary && typeof source.balanceSummary === 'object'
        ? source.balanceSummary
        : {};
    const rounds = toNonNegativeInt(balanceSource.rounds, 0);
    const matches = toNonNegativeInt(balanceSource.matches, 0);
    const humanWins = toNonNegativeInt(balanceSource.humanWins, 0);
    const botWins = toNonNegativeInt(balanceSource.botWins, 0);
    const totalDuration = toNonNegativeNumber(balanceSource.totalDuration, 0);
    const totalSelfCollisions = toNonNegativeInt(balanceSource.totalSelfCollisions, 0);
    const totalItemUses = toNonNegativeInt(balanceSource.totalItemUses, 0);
    const totalStuckEvents = toNonNegativeInt(balanceSource.totalStuckEvents, 0);
    const parcoursCompletions = toNonNegativeInt(balanceSource.parcoursCompletions, 0);
    const totalParcoursCompletionTimeMs = toNonNegativeNumber(balanceSource.totalParcoursCompletionTimeMs, 0);
    return {
        abortCount: toNonNegativeInt(source.abortCount, 0),
        backtrackCount: toNonNegativeInt(source.backtrackCount, 0),
        quickStartCount: toNonNegativeInt(source.quickStartCount, 0),
        startAttempts: toNonNegativeInt(source.startAttempts, 0),
        lastEvents: Array.isArray(source.events) ? source.events.slice(-15) : [],
        balance: {
            rounds,
            matches,
            humanWins,
            botWins,
            humanWinRate: rounds > 0 ? humanWins / rounds : 0,
            botWinRate: rounds > 0 ? botWins / rounds : 0,
            averageRoundDuration: rounds > 0 ? totalDuration / rounds : 0,
            selfCollisionsPerRound: rounds > 0 ? totalSelfCollisions / rounds : 0,
            itemUsesPerRound: rounds > 0 ? totalItemUses / rounds : 0,
            stuckEventsPerRound: rounds > 0 ? totalStuckEvents / rounds : 0,
            parcoursCompletions,
            parcoursCompletionRate: rounds > 0 ? parcoursCompletions / rounds : 0,
            averageParcoursCompletionTimeMs: parcoursCompletions > 0
                ? totalParcoursCompletionTimeMs / parcoursCompletions
                : 0,
        },
        topMaps: deriveTelemetryTopBuckets(balanceSource.maps, 'unknown'),
        topModes: deriveTelemetryTopBuckets(balanceSource.modes, 'classic'),
        recentRounds: normalizeTelemetryRecentRounds(source.recentRounds),
    };
}

export function createSettingsTelemetryFacade(options = {}) {
    const menuTelemetryStore = options.menuTelemetryStore;
    const telemetryHistoryStore = options.telemetryHistoryStore;

    function getMenuTelemetrySnapshot(settings = null) {
        const snapshot = normalizeTelemetrySnapshot(menuTelemetryStore.getSnapshot());
        if (settings && typeof settings === 'object') {
            ensureMenuContractState(settings);
            settings.localSettings.telemetryState = {
                ...settings.localSettings.telemetryState,
                ...snapshot,
            };
        }
        return snapshot;
    }

    function recordMenuTelemetry(settings, eventType, payload = null) {
        const snapshot = normalizeTelemetrySnapshot(menuTelemetryStore.recordEvent(eventType, payload));
        if (settings && typeof settings === 'object') {
            ensureMenuContractState(settings);
            settings.localSettings.telemetryState = {
                ...settings.localSettings.telemetryState,
                ...snapshot,
            };
        }
        const normalizedType = typeof eventType === 'string' ? eventType.trim().toLowerCase() : '';
        if (normalizedType === 'round_end' && payload && telemetryHistoryStore?.recordRound) {
            telemetryHistoryStore.recordRound(payload).catch(() => {});
        }
        return snapshot;
    }

    function getTelemetryHistorySummary() {
        if (!telemetryHistoryStore?.getSummary) return {};
        return telemetryHistoryStore.getSummary();
    }

    return {
        getMenuTelemetrySnapshot,
        recordMenuTelemetry,
        getTelemetryHistorySummary,
    };
}
