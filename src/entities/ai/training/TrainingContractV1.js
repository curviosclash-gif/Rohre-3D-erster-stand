// ============================================
// TrainingContractV1.js - additive training transition contract
// ============================================

import {
    OBSERVATION_LENGTH_V1,
    OBSERVATION_SCHEMA_VERSION,
} from '../observation/ObservationSchemaV1.js';
import { deriveTrainingDomain } from '../../../state/training/TrainingDomain.js';

export const TRAINING_CONTRACT_VERSION = 'v1';
export const TRAINING_OPERATION_RESET = 'reset';
export const TRAINING_OPERATION_STEP = 'step';

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function toPositiveInt(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.trunc(numeric));
}

function normalizeObservation(observation) {
    const target = new Array(OBSERVATION_LENGTH_V1).fill(0);
    if (!observation || typeof observation.length !== 'number') {
        return target;
    }

    const limit = Math.min(OBSERVATION_LENGTH_V1, Math.max(0, Math.trunc(observation.length)));
    for (let i = 0; i < limit; i++) {
        target[i] = toFiniteNumber(observation[i], 0);
    }
    return target;
}

function normalizeAction(action) {
    if (!action || typeof action !== 'object') return null;
    return { ...action };
}

function normalizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') return null;
    return { ...metadata };
}

function resolveDomain(input = {}) {
    if (input?.episode?.domain && typeof input.episode.domain === 'object') {
        return { ...input.episode.domain };
    }
    return deriveTrainingDomain(input);
}

function buildInfoPayload(input = {}) {
    const domain = resolveDomain(input);
    return {
        observationSchemaVersion: OBSERVATION_SCHEMA_VERSION,
        observationLength: OBSERVATION_LENGTH_V1,
        domain,
        match: {
            matchId: typeof input.matchId === 'string' ? input.matchId : null,
            mode: domain.mode,
            planarMode: domain.planarMode,
        },
        terminalReason: typeof input.terminalReason === 'string' ? input.terminalReason : null,
        truncatedReason: typeof input.truncatedReason === 'string' ? input.truncatedReason : null,
        rewardBreakdown: input.rewardBreakdown && typeof input.rewardBreakdown === 'object'
            ? { ...input.rewardBreakdown }
            : null,
        metadata: normalizeMetadata(input.metadata),
    };
}

function resolveEpisodeId(input = {}) {
    if (typeof input?.episode?.episodeId === 'string' && input.episode.episodeId.trim()) {
        return input.episode.episodeId.trim();
    }
    if (typeof input.episodeId === 'string' && input.episodeId.trim()) {
        return input.episodeId.trim();
    }
    return 'episode-0';
}

function resolveEpisodeIndex(input = {}) {
    return toPositiveInt(input?.episode?.episodeIndex, toPositiveInt(input.episodeIndex, 0));
}

function resolveStepIndex(input = {}, fallback = 0) {
    return toPositiveInt(input?.episode?.stepIndex, toPositiveInt(input.stepIndex, fallback));
}

export function buildTrainingResetContract(input = {}) {
    return {
        contractVersion: TRAINING_CONTRACT_VERSION,
        operation: TRAINING_OPERATION_RESET,
        episodeId: resolveEpisodeId(input),
        episodeIndex: resolveEpisodeIndex(input),
        stepIndex: resolveStepIndex(input, 0),
        observation: normalizeObservation(input.observation),
        action: null,
        reward: 0,
        done: false,
        truncated: false,
        info: buildInfoPayload({
            ...input,
            terminalReason: null,
            truncatedReason: null,
            rewardBreakdown: null,
        }),
    };
}

export function buildTrainingStepContract(input = {}) {
    const done = !!(input?.episode?.done ?? input.done);
    const truncated = !!(input?.episode?.truncated ?? input.truncated);
    return {
        contractVersion: TRAINING_CONTRACT_VERSION,
        operation: TRAINING_OPERATION_STEP,
        episodeId: resolveEpisodeId(input),
        episodeIndex: resolveEpisodeIndex(input),
        stepIndex: resolveStepIndex(input, 0),
        observation: normalizeObservation(input.observation),
        action: normalizeAction(input.action),
        reward: toFiniteNumber(input.reward, 0),
        done,
        truncated,
        info: buildInfoPayload({
            ...input,
            terminalReason: input?.episode?.terminalReason ?? input.terminalReason,
            truncatedReason: input?.episode?.truncatedReason ?? input.truncatedReason,
        }),
    };
}
