import { normalizeObservationVector } from '../session/ObservationNormalizer.mjs';
import { sanitizeTrainerAction } from '../session/ActionSanitizer.mjs';
import { liftObservationWithRuntimeNearContext } from '../../src/entities/ai/observation/RuntimeNearObservationAdapter.js';

function toFinite(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function toNonNegativeInt(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.trunc(numeric));
}

function resolveEpisodeId(payload = {}, sessionState = {}) {
    const fromPayload = typeof payload.episodeId === 'string' && payload.episodeId.trim()
        ? payload.episodeId.trim()
        : null;
    if (fromPayload) return fromPayload;
    if (typeof sessionState.episodeId === 'string' && sessionState.episodeId.trim()) {
        return sessionState.episodeId.trim();
    }
    return 'episode-0';
}

function resolveDomain(payload = {}, sessionState = {}) {
    const info = payload.info && typeof payload.info === 'object' ? payload.info : {};
    const domain = info.domain && typeof info.domain === 'object' ? info.domain : {};
    const mode = typeof domain.mode === 'string' && domain.mode.trim()
        ? domain.mode.trim()
        : (typeof sessionState.mode === 'string' && sessionState.mode.trim()
            ? sessionState.mode.trim()
            : 'classic');
    const planarMode = typeof domain.planarMode === 'boolean'
        ? domain.planarMode
        : !!sessionState.planarMode;
    const domainId = typeof domain.domainId === 'string' && domain.domainId.trim()
        ? domain.domainId.trim()
        : `${mode.toLowerCase()}-${planarMode ? '2d' : '3d'}`;
    return {
        mode,
        planarMode,
        domainId,
    };
}

export function validateTrainingFramePayload(payload, options = {}) {
    const errors = [];
    if (!payload || typeof payload !== 'object') {
        return {
            ok: false,
            errors: ['payload-not-object'],
            frame: null,
        };
    }

    const observationLength = Math.max(1, Math.trunc(Number(options.observationLength) || 40));
    if (!Array.isArray(payload.observation)) {
        errors.push('observation-not-array');
    }

    const domain = resolveDomain(payload, options.sessionState || {});
    const liftOptions = {
        expectedLength: observationLength,
        stepIndex: toNonNegativeInt(payload.stepIndex, toNonNegativeInt(options.sessionState?.stepIndex, 0)),
        environmentProfile: payload?.info?.metadata?.environmentProfile
            || payload?.environmentProfile
            || undefined,
        metadata: payload?.info?.metadata,
        intent: payload?.info?.hybridDecision?.intent?.applied
            || payload?.info?.hybridDecision?.intent?.requested
            || null,
        player: options.player || null,
    };
    const lifted = options.observationTracker && typeof options.observationTracker.lift === 'function'
        ? options.observationTracker.lift(payload.observation, liftOptions)
        : liftObservationWithRuntimeNearContext(payload.observation, liftOptions);

    const frame = {
        operation: typeof payload.operation === 'string' && payload.operation.trim()
            ? payload.operation.trim()
            : (typeof options.defaultOperation === 'string' ? options.defaultOperation : 'step'),
        contractVersion: typeof payload.contractVersion === 'string' && payload.contractVersion.trim()
            ? payload.contractVersion.trim()
            : 'v1',
        episodeId: resolveEpisodeId(payload, options.sessionState || {}),
        episodeIndex: toNonNegativeInt(payload.episodeIndex, toNonNegativeInt(options.sessionState?.episodeIndex, 0)),
        stepIndex: toNonNegativeInt(payload.stepIndex, toNonNegativeInt(options.sessionState?.stepIndex, 0)),
        reward: toFinite(payload.reward, 0),
        done: payload.done === true,
        truncated: payload.truncated === true,
        observation: normalizeObservationVector(lifted.observation, {
            length: observationLength,
        }),
        action: sanitizeTrainerAction(payload.action, {
            planarMode: domain.planarMode,
            domainId: domain.domainId,
            maxItemIndex: Number.isInteger(options.maxItemIndex) ? options.maxItemIndex : 2,
        }),
        info: {
            ...((payload.info && typeof payload.info === 'object') ? payload.info : {}),
            domain,
            observationContext: lifted.details,
        },
    };

    if (errors.length > 0) {
        return {
            ok: false,
            errors,
            frame: null,
        };
    }

    return {
        ok: true,
        errors: [],
        frame,
    };
}

export function buildReplayTransition(frame, sessionState = {}, options = {}) {
    if (!frame || typeof frame !== 'object') {
        return {
            ok: false,
            errors: ['frame-not-object'],
            transition: null,
        };
    }

    const observationLength = Math.max(1, Math.trunc(Number(options.observationLength) || 40));
    const previousObservation = normalizeObservationVector(sessionState.lastObservation, {
        length: observationLength,
    });
    const nextObservation = normalizeObservationVector(frame.observation, {
        length: observationLength,
    });
    const done = frame.done === true || frame.truncated === true;

    return {
        ok: true,
        errors: [],
        transition: {
            schemaVersion: 'v34-transition-v1',
            state: previousObservation,
            action: sanitizeTrainerAction(frame.action, {
                planarMode: frame?.info?.domain?.planarMode,
                domainId: frame?.info?.domain?.domainId,
                maxItemIndex: Number.isInteger(options.maxItemIndex) ? options.maxItemIndex : 2,
            }),
            reward: toFinite(frame.reward, 0),
            nextState: nextObservation,
            done,
            truncated: frame.truncated === true,
            episodeId: frame.episodeId,
            episodeIndex: toNonNegativeInt(frame.episodeIndex, 0),
            stepIndex: toNonNegativeInt(frame.stepIndex, 0),
            info: frame.info && typeof frame.info === 'object'
                ? { ...frame.info }
                : {},
        },
    };
}
