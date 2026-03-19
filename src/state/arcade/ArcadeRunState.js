const DEFAULT_ARCADE_RUN_CONFIG = Object.freeze({
    enabled: false,
    profileId: 'arcade-default',
    runType: 'gauntlet',
    seed: 0,
    scoreModel: 'arcade-score.v1',
    sectorCount: 5,
    intermissionSeconds: 3,
    comboWindowMs: 5000,
    comboDecayPerSecond: 1,
    maxMultiplier: 8,
    replayHooksEnabled: true,
});

export const ARCADE_RUN_PHASES = Object.freeze({
    WARMUP: 'warmup',
    SECTOR_ACTIVE: 'sector_active',
    INTERMISSION: 'intermission',
    SUDDEN_DEATH: 'sudden_death',
    FINISHED: 'finished',
});

const ARCADE_PHASE_SET = new Set(Object.values(ARCADE_RUN_PHASES));

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function toSafeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value, min, max, fallback) {
    const parsed = toSafeNumber(value, fallback);
    return Math.max(min, Math.min(max, parsed));
}

function clampInteger(value, min, max, fallback) {
    return Math.floor(clampNumber(value, min, max, fallback));
}

function normalizeText(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function toIsoString(nowMs) {
    return new Date(Math.max(0, toSafeNumber(nowMs, Date.now()))).toISOString();
}

function createEmptyBreakdown(source = null) {
    const input = source && typeof source === 'object' ? source : {};
    const base = Math.max(0, toSafeNumber(input.base, 0));
    const survival = Math.max(0, toSafeNumber(input.survival, 0));
    const cleanSector = Math.max(0, toSafeNumber(input.cleanSector, 0));
    const risk = Math.max(0, toSafeNumber(input.risk, 0));
    const penalty = Math.max(0, toSafeNumber(input.penalty, 0));
    const total = Math.max(0, toSafeNumber(input.total, base + survival + cleanSector + risk - penalty));
    return {
        base,
        survival,
        cleanSector,
        risk,
        penalty,
        total,
    };
}

function resolveSectorPhase(config, sectorIndex) {
    if (sectorIndex >= config.sectorCount) {
        return ARCADE_RUN_PHASES.SUDDEN_DEATH;
    }
    return ARCADE_RUN_PHASES.SECTOR_ACTIVE;
}

export function createArcadeRunConfig(source = null) {
    const input = source && typeof source === 'object' ? source : {};
    return {
        enabled: input.enabled === true,
        profileId: normalizeText(input.profileId, DEFAULT_ARCADE_RUN_CONFIG.profileId),
        runType: normalizeText(input.runType, DEFAULT_ARCADE_RUN_CONFIG.runType),
        seed: clampInteger(input.seed, 0, 2_147_483_647, DEFAULT_ARCADE_RUN_CONFIG.seed),
        scoreModel: normalizeText(input.scoreModel, DEFAULT_ARCADE_RUN_CONFIG.scoreModel),
        sectorCount: clampInteger(input.sectorCount, 1, 20, DEFAULT_ARCADE_RUN_CONFIG.sectorCount),
        intermissionSeconds: clampNumber(input.intermissionSeconds, 0.5, 10, DEFAULT_ARCADE_RUN_CONFIG.intermissionSeconds),
        comboWindowMs: clampInteger(input.comboWindowMs, 800, 20_000, DEFAULT_ARCADE_RUN_CONFIG.comboWindowMs),
        comboDecayPerSecond: clampNumber(input.comboDecayPerSecond, 0, 10, DEFAULT_ARCADE_RUN_CONFIG.comboDecayPerSecond),
        maxMultiplier: clampInteger(input.maxMultiplier, 1, 25, DEFAULT_ARCADE_RUN_CONFIG.maxMultiplier),
        replayHooksEnabled: input.replayHooksEnabled !== false,
    };
}

export function createArcadeRunRecords(source = null) {
    const input = source && typeof source === 'object' ? source : {};
    return {
        schemaVersion: 'arcade-run-profile.v1',
        updatedAt: normalizeText(input.updatedAt, ''),
        runsPlayed: Math.max(0, clampInteger(input.runsPlayed, 0, 999_999, 0)),
        bestScore: Math.max(0, toSafeNumber(input.bestScore, 0)),
        bestMultiplier: Math.max(1, toSafeNumber(input.bestMultiplier, 1)),
        bestCombo: Math.max(0, clampInteger(input.bestCombo, 0, 99_999, 0)),
        bestSector: Math.max(0, clampInteger(input.bestSector, 0, 999, 0)),
        bestRunAt: normalizeText(input.bestRunAt, ''),
        lastScore: Math.max(0, toSafeNumber(input.lastScore, 0)),
        lastMultiplier: Math.max(1, toSafeNumber(input.lastMultiplier, 1)),
        lastCombo: Math.max(0, clampInteger(input.lastCombo, 0, 99_999, 0)),
        lastSector: Math.max(0, clampInteger(input.lastSector, 0, 999, 0)),
        lastRunAt: normalizeText(input.lastRunAt, ''),
        replay: {
            lastRunId: normalizeText(input?.replay?.lastRunId, ''),
            bestRunId: normalizeText(input?.replay?.bestRunId, ''),
        },
        breakdownTotals: createEmptyBreakdown(input.breakdownTotals),
    };
}

export function createArcadeRunState({
    config = null,
    records = null,
    nowMs = Date.now(),
    runId = '',
} = {}) {
    const nextConfig = createArcadeRunConfig(config);
    const nextRecords = createArcadeRunRecords(records);
    const startedAtIso = toIsoString(nowMs);
    const normalizedRunId = normalizeText(runId, `arcade-run-${Math.floor(Math.max(0, nowMs)).toString(36)}`);

    return {
        enabled: !!nextConfig.enabled,
        runId: normalizedRunId,
        config: nextConfig,
        phase: ARCADE_RUN_PHASES.WARMUP,
        sectorIndex: 0,
        completedSectors: 0,
        startedAtIso,
        updatedAtIso: startedAtIso,
        finishedAtIso: '',
        persistedAtIso: '',
        score: {
            total: 0,
            multiplier: 1,
            peakMultiplier: 1,
            combo: 0,
            peakCombo: 0,
            lastComboAtMs: 0,
            lastScoredSector: 0,
            lastSectorPoints: 0,
            breakdown: createEmptyBreakdown(),
        },
        records: nextRecords,
        replay: {
            runReplayId: '',
        },
        lastSectorSummary: null,
    };
}

export function cloneArcadeRunState(state) {
    if (!state || typeof state !== 'object') return null;
    return deepClone(state);
}

export function setArcadeRunPhase(state, nextPhase, nowMs = Date.now()) {
    if (!state || typeof state !== 'object') return state;
    const requested = normalizeText(nextPhase, state.phase);
    const phase = ARCADE_PHASE_SET.has(requested) ? requested : state.phase;
    if (phase === state.phase) return state;
    return {
        ...state,
        phase,
        updatedAtIso: toIsoString(nowMs),
    };
}

export function beginArcadeSector(state, nowMs = Date.now()) {
    if (!state || typeof state !== 'object') return state;
    if (state.phase === ARCADE_RUN_PHASES.FINISHED) return state;
    const nextSectorIndex = Math.max(
        1,
        Math.min(
            state.config?.sectorCount || 1,
            (Math.max(0, toSafeNumber(state.completedSectors, 0)) || 0) + 1
        )
    );
    return {
        ...state,
        phase: resolveSectorPhase(state.config, nextSectorIndex),
        sectorIndex: nextSectorIndex,
        updatedAtIso: toIsoString(nowMs),
    };
}

export function completeArcadeSector(state, nowMs = Date.now()) {
    if (!state || typeof state !== 'object') return state;
    if (state.phase === ARCADE_RUN_PHASES.FINISHED) return state;
    const maxSectors = Math.max(1, toSafeNumber(state?.config?.sectorCount, 1));
    const completedSectors = Math.min(
        maxSectors,
        Math.max(
            Math.max(0, clampInteger(state.completedSectors, 0, maxSectors, 0)),
            Math.max(0, clampInteger(state.sectorIndex, 0, maxSectors, 0))
        )
    );
    const isFinished = completedSectors >= maxSectors;
    return {
        ...state,
        completedSectors,
        phase: isFinished ? ARCADE_RUN_PHASES.FINISHED : ARCADE_RUN_PHASES.INTERMISSION,
        finishedAtIso: isFinished ? toIsoString(nowMs) : state.finishedAtIso,
        updatedAtIso: toIsoString(nowMs),
    };
}
