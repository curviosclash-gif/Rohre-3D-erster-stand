import { ReplayBuffer } from '../replay/ReplayBuffer.mjs';
import {
    buildReplayTransition,
    validateTrainingFramePayload,
} from '../replay/TransitionSchema.mjs';
import {
    TRAINER_FAILURE_CODES,
    TRAINER_MESSAGE_TYPES,
    TRAINER_RESPONSE_TYPES,
} from '../config/TrainerRuntimeContract.mjs';
import {
    inferActionFromObservation,
    resolveHybridTrainerDecision,
} from './ActionSanitizer.mjs';
import { DqnTrainer } from '../model/DqnTrainer.mjs';
import { validateDqnCheckpointPayload } from '../model/CheckpointValidation.mjs';
import { resolveLatestCheckpointPayloadSync } from '../artifacts/TrainerArtifactStore.mjs';
import { MetricsLogger } from '../server/MetricsLogger.mjs';
import { RuntimeNearObservationTracker } from '../../src/entities/ai/observation/RuntimeNearObservationAdapter.js';

function toText(raw) {
    if (typeof raw === 'string') return raw;
    if (raw == null) return '';
    if (raw instanceof Uint8Array || Buffer.isBuffer(raw)) {
        return Buffer.from(raw).toString('utf8');
    }
    return String(raw);
}

function normalizeId(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.trunc(numeric);
}

function cloneSessionState(state) {
    return {
        episodeId: state.episodeId,
        episodeIndex: state.episodeIndex,
        stepIndex: state.stepIndex,
        mode: state.mode,
        planarMode: state.planarMode,
        domainId: state.domainId,
        resumeSource: state.resumeSource || null,
    };
}

export class TrainerSession {
    constructor(options = {}) {
        this.sessionId = String(options.sessionId || 'session-0');
        this.connectionId = Number.isInteger(options.connectionId) ? options.connectionId : 0;
        this.config = options.config || {};
        this.replayBuffer = options.replayBuffer instanceof ReplayBuffer
            ? options.replayBuffer
            : new ReplayBuffer({
                capacity: this.config.replayCapacity,
                seed: this.config.sessionSeed,
            });

        this._state = {
            episodeId: 'episode-0',
            episodeIndex: 0,
            stepIndex: 0,
            mode: 'classic',
            planarMode: false,
            domainId: 'classic-3d',
            lastObservation: null,
            resumeSource: null,
        };

        this._stats = {
            messagesReceived: 0,
            actionRequests: 0,
            trainingResets: 0,
            trainingSteps: 0,
            replayWrites: 0,
            modelInferences: 0,
            optimizerUpdates: 0,
            checkpointExports: 0,
            checkpointLoads: 0,
            errors: 0,
        };

        this._metrics = new MetricsLogger({ maxHistory: this.config.metricsHistory || 500 });
        this._episodeRewardAccum = 0;
        this._episodeStepAccum = 0;
        this._episodeLossAccum = 0;
        this._episodeLossCount = 0;
        this._trainingObservationTracker = new RuntimeNearObservationTracker();
        this._actionObservationTracker = new RuntimeNearObservationTracker();

        this._model = new DqnTrainer({
            observationLength: this.config.observationLength,
            maxItemIndex: this.config.maxItemIndex,
            planarMode: this.config.planarMode,
            seed: this.config.sessionSeed,
            model: this.config.model,
        });

        const startupCheckpoint = this.config?.startupCheckpoint;
        if (startupCheckpoint && typeof startupCheckpoint === 'object') {
            const startupImport = this._importCheckpoint({
                id: null,
                checkpoint: startupCheckpoint.checkpoint,
                resumeSource: startupCheckpoint.resumeSource || null,
                strict: startupCheckpoint.strict !== false,
            });
            if (startupCheckpoint.strict !== false && startupImport?.ok !== true) {
                const firstError = Array.isArray(startupImport?.details?.errors)
                    ? startupImport.details.errors[0]
                    : startupImport?.error;
                throw new Error(String(firstError || 'startup-checkpoint-import-failed'));
            }
        }
    }

    getReadyEnvelope() {
        return {
            type: TRAINER_RESPONSE_TYPES.READY,
            ok: true,
            protocolVersion: this.config.contractFreeze?.protocolVersion || null,
            contract: this.config.contractFreeze || null,
            sessionId: this.sessionId,
            connectionId: this.connectionId,
        };
    }

    getStatsSnapshot() {
        return {
            sessionId: this.sessionId,
            connectionId: this.connectionId,
            state: cloneSessionState(this._state),
            stats: { ...this._stats },
            replay: this.replayBuffer.getStats(),
            model: this._model.getSnapshot(),
            metrics: this._metrics.getSummary(),
        };
    }

    getMetricsHistory(count = 50) {
        return this._metrics.getRecentEpisodes(count);
    }

    _buildErrorEnvelope(id, code, details = null) {
        this._stats.errors += 1;
        return {
            id,
            ok: false,
            type: TRAINER_RESPONSE_TYPES.ERROR,
            error: String(code || TRAINER_FAILURE_CODES.INVALID_ENVELOPE),
            details: details && typeof details === 'object'
                ? { ...details }
                : null,
            sessionId: this.sessionId,
        };
    }

    _buildAckEnvelope(id, requestType, payload = null) {
        return {
            id,
            ok: true,
            type: TRAINER_RESPONSE_TYPES.TRAINING_ACK,
            requestType,
            ack: 'accepted',
            sessionId: this.sessionId,
            ...(payload && typeof payload === 'object' ? payload : {}),
        };
    }

    _isBackpressured(socket) {
        const maxBufferedAmount = Number(this.config?.failurePolicy?.maxSocketBufferedAmountBytes) || 0;
        if (maxBufferedAmount <= 0) return false;
        if (!socket || typeof socket.bufferedAmount !== 'number') return false;
        return socket.bufferedAmount > maxBufferedAmount;
    }

    _decodeEnvelope(raw) {
        const payloadRaw = toText(raw);
        const maxIncomingBytes = Number(this.config?.failurePolicy?.maxIncomingBytes) || 0;
        if (maxIncomingBytes > 0 && payloadRaw.length > maxIncomingBytes) {
            return {
                ok: false,
                error: TRAINER_FAILURE_CODES.PAYLOAD_TOO_LARGE,
                id: null,
                details: {
                    maxIncomingBytes,
                    actualBytes: payloadRaw.length,
                },
            };
        }

        let envelope = null;
        try {
            envelope = JSON.parse(payloadRaw);
        } catch {
            return {
                ok: false,
                error: TRAINER_FAILURE_CODES.INVALID_JSON,
                id: null,
                details: null,
            };
        }

        if (!envelope || typeof envelope !== 'object') {
            return {
                ok: false,
                error: TRAINER_FAILURE_CODES.INVALID_ENVELOPE,
                id: null,
                details: null,
            };
        }

        const id = normalizeId(envelope.id);
        if (!Number.isInteger(id)) {
            return {
                ok: false,
                error: TRAINER_FAILURE_CODES.MISSING_ID,
                id: null,
                details: null,
            };
        }

        const type = typeof envelope.type === 'string' ? envelope.type.trim() : '';
        if (!type) {
            return {
                ok: false,
                error: TRAINER_FAILURE_CODES.MISSING_TYPE,
                id,
                details: null,
            };
        }

        return {
            ok: true,
            id,
            envelope: {
                id,
                type,
                payload: envelope.payload && typeof envelope.payload === 'object'
                    ? envelope.payload
                    : {},
            },
        };
    }

    _resolveFrame(payload, defaultOperation) {
        return validateTrainingFramePayload(payload, {
            defaultOperation,
            observationLength: this.config.observationLength,
            maxItemIndex: this.config.maxItemIndex,
            sessionState: this._state,
            observationTracker: this._trainingObservationTracker,
        });
    }

    _handleActionRequest(id, payload) {
        this._stats.actionRequests += 1;
        const domainId = typeof payload?.domainId === 'string' ? payload.domainId : this._state.domainId;
        const planarMode = payload?.planarMode === true || (typeof domainId === 'string' && domainId.endsWith('-2d'));
        const rawObservation = Array.isArray(payload?.observation) ? payload.observation : this._state.lastObservation;
        const adaptedObservation = this._actionObservationTracker.lift(rawObservation, {
            expectedLength: this.config.observationLength,
            stepIndex: this._state.stepIndex,
            environmentProfile: payload?.observationContext?.environmentProfile
                || payload?.environmentProfile
                || undefined,
            metadata: payload?.observationContext || payload?.metadata || null,
            player: payload?.player || null,
        });
        const observation = adaptedObservation.observation;
        let proposedAction = null;
        let actionMetadata = null;
        let actionIndex = 0;
        let epsilon = null;
        let policy = 'fallback';
        try {
            const inferred = this._model.selectAction(observation, {
                planarMode,
                domainId,
            });
            proposedAction = inferred.action;
            actionMetadata = inferred.actionMetadata || null;
            actionIndex = inferred.actionIndex;
            epsilon = inferred.epsilon;
            policy = inferred.policy;
            this._stats.modelInferences += 1;
        } catch {
            proposedAction = inferActionFromObservation(observation, {
                seed: this.config.sessionSeed,
                stepIndex: this._state.stepIndex,
                planarMode,
                domainId,
                maxItemIndex: this.config.maxItemIndex,
                player: payload?.player || null,
                observationDetails: adaptedObservation.details,
            });
        }
        const hybrid = resolveHybridTrainerDecision(proposedAction, observation, {
            seed: this.config.sessionSeed,
            stepIndex: this._state.stepIndex,
            planarMode,
            domainId,
            maxItemIndex: this.config.maxItemIndex,
            player: payload?.player || null,
            observationDetails: adaptedObservation.details,
            actionMetadata,
        });
        return {
            id,
            ok: true,
            type: TRAINER_RESPONSE_TYPES.ACTION_RESPONSE,
            action: hybrid.action,
            actionIndex,
            epsilon,
            policy,
            intent: hybrid.intent,
            safety: hybrid.safety,
            control: hybrid.control,
            observationContext: adaptedObservation.details,
            sessionId: this.sessionId,
        };
    }

    _handleTrainingReset(id, payload) {
        this._stats.trainingResets += 1;
        this._trainingObservationTracker.reset();
        this._actionObservationTracker.reset();
        const validated = this._resolveFrame(payload, 'reset');
        if (!validated.ok || !validated.frame) {
            return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                errors: validated.errors,
            });
        }

        const frame = validated.frame;
        const domain = frame?.info?.domain || {};
        this._state.episodeId = frame.episodeId;
        this._state.episodeIndex = frame.episodeIndex;
        this._state.stepIndex = frame.stepIndex;
        this._state.mode = typeof domain.mode === 'string' ? domain.mode : this._state.mode;
        this._state.planarMode = domain.planarMode === true;
        this._state.domainId = typeof domain.domainId === 'string' ? domain.domainId : this._state.domainId;
        this._state.lastObservation = frame.observation;

        // Log previous episode metrics on reset (new episode starts)
        if (this._episodeStepAccum > 0) {
            const snapshot = this._model.getSnapshot();
            this._metrics.logEpisode({
                episodeIndex: this._state.episodeIndex - 1,
                totalReward: this._episodeRewardAccum,
                steps: this._episodeStepAccum,
                epsilon: snapshot.epsilon,
                avgLoss: this._episodeLossCount > 0 ? this._episodeLossAccum / this._episodeLossCount : 0,
                optimizerSteps: snapshot.optimizerSteps,
                replayFill: this.replayBuffer.getStats()?.fillRatio || 0,
                domainId: this._state.domainId,
            });
        }
        this._episodeRewardAccum = 0;
        this._episodeStepAccum = 0;
        this._episodeLossAccum = 0;
        this._episodeLossCount = 0;

        return this._buildAckEnvelope(id, TRAINER_MESSAGE_TYPES.TRAINING_RESET, {
            replay: this.replayBuffer.getStats(),
            state: cloneSessionState(this._state),
        });
    }

    _handleTrainingStep(id, payload) {
        this._stats.trainingSteps += 1;
        const validated = this._resolveFrame(payload, 'step');
        if (!validated.ok || !validated.frame) {
            return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                errors: validated.errors,
            });
        }

        const transitionResult = buildReplayTransition(validated.frame, this._state, {
            observationLength: this.config.observationLength,
            maxItemIndex: this.config.maxItemIndex,
        });
        if (!transitionResult.ok || !transitionResult.transition) {
            return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                errors: transitionResult.errors,
            });
        }

        const replayWrite = this.replayBuffer.push(transitionResult.transition);
        this._stats.replayWrites += 1;
        const trainingUpdate = this._model.observeTransition(
            transitionResult.transition,
            this.replayBuffer
        );
        if (trainingUpdate.trained) {
            this._stats.optimizerUpdates += 1;
        }

        // Accumulate episode metrics
        const reward = Number(transitionResult.transition.reward) || 0;
        this._episodeRewardAccum += reward;
        this._episodeStepAccum += 1;
        if (trainingUpdate.trained && trainingUpdate.loss != null) {
            this._episodeLossAccum += Number(trainingUpdate.loss) || 0;
            this._episodeLossCount += 1;
        }

        const domain = validated.frame?.info?.domain || {};
        this._state.episodeId = validated.frame.episodeId;
        this._state.episodeIndex = validated.frame.episodeIndex;
        this._state.stepIndex = validated.frame.stepIndex + 1;
        this._state.mode = typeof domain.mode === 'string' ? domain.mode : this._state.mode;
        this._state.planarMode = domain.planarMode === true;
        this._state.domainId = typeof domain.domainId === 'string' ? domain.domainId : this._state.domainId;
        this._state.lastObservation = transitionResult.transition.nextState;

        return this._buildAckEnvelope(id, TRAINER_MESSAGE_TYPES.TRAINING_STEP, {
            replay: replayWrite,
            terminal: transitionResult.transition.done,
            state: cloneSessionState(this._state),
            training: trainingUpdate,
        });
    }

    _handleCheckpointRequest(id) {
        this._stats.checkpointExports += 1;
        return {
            id,
            ok: true,
            type: TRAINER_RESPONSE_TYPES.CHECKPOINT,
            requestType: TRAINER_MESSAGE_TYPES.CHECKPOINT_REQUEST,
            sessionId: this.sessionId,
            state: cloneSessionState(this._state),
            replay: this.replayBuffer.getStats(),
            checkpoint: this._model.exportCheckpoint(),
            resumeSource: this._state.resumeSource,
        };
    }

    _importCheckpoint({ id = null, checkpoint = null, resumeSource = null, strict = true } = {}) {
        const validation = validateDqnCheckpointPayload(checkpoint);
        if (!validation.ok) {
            return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                errors: [validation.error || 'checkpoint-invalid'],
                details: validation.details,
            });
        }
        const imported = this._model.importCheckpoint(validation.checkpoint, { strict });
        if (!imported || (typeof imported === 'object' && imported.ok === false)) {
            const importError = typeof imported === 'object' ? imported.error : 'checkpoint-import-failed';
            return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                errors: [importError || 'checkpoint-import-failed'],
                details: typeof imported === 'object' ? imported.details : null,
            });
        }
        this._stats.checkpointLoads += 1;
        this._state.resumeSource = typeof resumeSource === 'string' && resumeSource.trim()
            ? resumeSource.trim()
            : this._state.resumeSource;
        return {
            id,
            ok: true,
            type: TRAINER_RESPONSE_TYPES.CHECKPOINT,
            requestType: TRAINER_MESSAGE_TYPES.CHECKPOINT_LOAD,
            loaded: true,
            strict: strict !== false,
            sessionId: this.sessionId,
            state: cloneSessionState(this._state),
            model: this._model.getSnapshot(),
            resumeSource: this._state.resumeSource,
        };
    }

    _handleCheckpointLoad(id, payload) {
        if (!payload?.checkpoint && typeof payload?.checkpointPath === 'string' && payload.checkpointPath.trim()) {
            const resolved = resolveLatestCheckpointPayloadSync({
                checkpointPath: payload.checkpointPath.trim(),
            });
            if (!resolved.ok || !resolved.checkpoint) {
                return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                    errors: [resolved.error || 'checkpoint-path-load-failed'],
                    checkpointPath: resolved.checkpointPath || payload.checkpointPath.trim(),
                });
            }
            return this._importCheckpoint({
                id,
                checkpoint: resolved.checkpoint,
                resumeSource: payload?.resumeSource || resolved.checkpointPath || null,
                strict: payload?.strict,
            });
        }
        return this._importCheckpoint({
            id,
            checkpoint: payload?.checkpoint,
            resumeSource: payload?.resumeSource,
            strict: payload?.strict,
        });
    }

    _handleCheckpointLoadLatest(id, payload) {
        const resolved = resolveLatestCheckpointPayloadSync({
            latestIndexPath: payload?.latestIndexPath,
            checkpointPath: payload?.checkpointPath,
        });
        if (!resolved.ok || !resolved.checkpoint) {
            return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.INVALID_TRANSITION, {
                errors: [resolved.error || 'checkpoint-load-latest-failed'],
                checkpointPath: resolved.checkpointPath || null,
            });
        }
        return this._importCheckpoint({
            id,
            checkpoint: resolved.checkpoint,
            resumeSource: resolved.checkpointPath || 'latest',
            strict: payload?.strict,
        });
    }

    routeMessage(raw, socket) {
        this._stats.messagesReceived += 1;

        if (this._isBackpressured(socket)) {
            return this._buildErrorEnvelope(null, TRAINER_FAILURE_CODES.BACKPRESSURE, {
                bufferedAmount: socket.bufferedAmount,
                threshold: this.config?.failurePolicy?.maxSocketBufferedAmountBytes || null,
            });
        }

        const decoded = this._decodeEnvelope(raw);
        if (!decoded.ok) {
            return this._buildErrorEnvelope(decoded.id ?? null, decoded.error, decoded.details || null);
        }

        const { id, envelope } = decoded;
        const payload = envelope.payload || {};
        switch (envelope.type) {
            case TRAINER_MESSAGE_TYPES.ACTION_REQUEST:
                return this._handleActionRequest(id, payload);
            case TRAINER_MESSAGE_TYPES.TRAINING_RESET:
                return this._handleTrainingReset(id, payload);
            case TRAINER_MESSAGE_TYPES.TRAINING_STEP:
                return this._handleTrainingStep(id, payload);
            case TRAINER_MESSAGE_TYPES.HEALTH_REQUEST:
                return {
                    id,
                    ok: true,
                    type: TRAINER_RESPONSE_TYPES.HEALTH,
                    ready: true,
                    sessionId: this.sessionId,
                    state: cloneSessionState(this._state),
                };
            case TRAINER_MESSAGE_TYPES.STATS_REQUEST:
                return {
                    id,
                    ok: true,
                    type: TRAINER_RESPONSE_TYPES.STATS,
                    sessionId: this.sessionId,
                    ...this.getStatsSnapshot(),
                };
            case TRAINER_MESSAGE_TYPES.CHECKPOINT_REQUEST:
                return this._handleCheckpointRequest(id);
            case TRAINER_MESSAGE_TYPES.CHECKPOINT_LOAD:
                return this._handleCheckpointLoad(id, payload);
            case TRAINER_MESSAGE_TYPES.CHECKPOINT_LOAD_LATEST:
                return this._handleCheckpointLoadLatest(id, payload);
            default:
                return this._buildErrorEnvelope(id, TRAINER_FAILURE_CODES.UNKNOWN_TYPE, {
                    type: envelope.type,
                });
        }
    }
}
