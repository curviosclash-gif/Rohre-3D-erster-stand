// ============================================
// TrainerPayloadAdapter.js - payload adapters for runtime/transport training integration
// ============================================

import {
    OBSERVATION_LENGTH_V1,
    OBSERVATION_SCHEMA_VERSION,
} from '../observation/ObservationSchemaV1.js';
import { deriveTrainingDomain } from '../../../state/training/TrainingDomain.js';
import { TRAINING_CONTRACT_VERSION } from './TrainingContractV1.js';

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function cloneObservation(observation) {
    if (!observation || typeof observation.length !== 'number') return null;
    const length = Math.max(0, Math.trunc(observation.length));
    const cloned = new Array(length);
    for (let i = 0; i < length; i++) {
        cloned[i] = toFiniteNumber(observation[i], 0);
    }
    return cloned;
}

function resolvePlanarMode(runtimeContext = {}) {
    if (runtimeContext?.rules && typeof runtimeContext.rules === 'object') {
        return !!runtimeContext.rules.planarMode;
    }
    return !!runtimeContext.planarMode;
}

function buildPlayerPayload(player) {
    if (!player || typeof player !== 'object') return null;
    return {
        index: Number.isInteger(player.index) ? player.index : -1,
        hp: toFiniteNumber(player.hp, 0),
        maxHp: toFiniteNumber(player.maxHp, 0),
        shieldHp: toFiniteNumber(player.shieldHP, 0),
        maxShieldHp: toFiniteNumber(player.maxShieldHp, 0),
        inventoryLength: Array.isArray(player.inventory)
            ? player.inventory.length
            : Math.max(0, Math.trunc(toFiniteNumber(player.inventoryLength, 0))),
    };
}

export function buildTrainerRuntimeObservationPayload(runtimeContext = {}, player = null) {
    const rawMode = typeof runtimeContext?.mode === 'string'
        ? runtimeContext.mode
        : '';
    const planarMode = resolvePlanarMode(runtimeContext);
    const domain = deriveTrainingDomain({
        mode: rawMode,
        planarMode,
    });

    return {
        mode: rawMode,
        planarMode,
        domainId: domain.domainId,
        domainVersion: domain.version,
        dt: toFiniteNumber(runtimeContext?.dt, 0),
        observationSchemaVersion: OBSERVATION_SCHEMA_VERSION,
        observationLength: OBSERVATION_LENGTH_V1,
        observation: cloneObservation(runtimeContext?.observation),
        player: buildPlayerPayload(player),
    };
}

export function buildTrainerTransitionPayload(transition = {}, options = {}) {
    const info = transition?.info && typeof transition.info === 'object'
        ? transition.info
        : {};
    const domain = info.domain && typeof info.domain === 'object'
        ? { ...info.domain }
        : deriveTrainingDomain(options);

    return {
        contractVersion: TRAINING_CONTRACT_VERSION,
        observationSchemaVersion: OBSERVATION_SCHEMA_VERSION,
        observationLength: OBSERVATION_LENGTH_V1,
        operation: typeof transition.operation === 'string' ? transition.operation : 'step',
        episodeId: typeof transition.episodeId === 'string' ? transition.episodeId : null,
        episodeIndex: Number.isInteger(transition.episodeIndex) ? transition.episodeIndex : 0,
        stepIndex: Number.isInteger(transition.stepIndex) ? transition.stepIndex : 0,
        reward: toFiniteNumber(transition.reward, 0),
        done: !!transition.done,
        truncated: !!transition.truncated,
        observation: cloneObservation(transition.observation),
        action: transition.action && typeof transition.action === 'object'
            ? { ...transition.action }
            : null,
        info: {
            domain,
            terminalReason: typeof info.terminalReason === 'string' ? info.terminalReason : null,
            truncatedReason: typeof info.truncatedReason === 'string' ? info.truncatedReason : null,
            rewardBreakdown: info.rewardBreakdown && typeof info.rewardBreakdown === 'object'
                ? { ...info.rewardBreakdown }
                : null,
            match: info.match && typeof info.match === 'object'
                ? { ...info.match }
                : null,
        },
    };
}

export function createTrainerTransportEnvelope(type, id, payload, options = {}) {
    const envelope = {
        type: typeof type === 'string' && type.trim() ? type.trim() : 'training-step',
        id: Number.isInteger(id) ? id : 0,
        payload,
    };
    if (typeof options.contractVersion === 'string' && options.contractVersion.trim()) {
        envelope.contractVersion = options.contractVersion.trim();
    }
    const sentAtMs = toFiniteNumber(options.sentAtMs, -1);
    if (sentAtMs >= 0) {
        envelope.sentAtMs = Math.trunc(sentAtMs);
    }
    return envelope;
}
