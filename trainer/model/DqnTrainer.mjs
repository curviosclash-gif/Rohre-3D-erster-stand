import { normalizeObservationVector } from '../session/ObservationNormalizer.mjs';
import { DqnMlpNetwork } from './DqnMlpNetwork.mjs';
import { ActionVocabulary } from './ActionVocabulary.mjs';
import { SeededRng } from './SeededRng.mjs';
import { OBSERVATION_LENGTH_V2, OBSERVATION_SCHEMA_VERSION_V2 } from '../../src/entities/ai/observation/ObservationSchemaV2.js';
import { HYBRID_DECISION_ARCHITECTURE_VERSION } from '../../src/entities/ai/hybrid/HybridDecisionArchitecture.js';

function clampInt(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const integer = Math.trunc(numeric);
    return Math.max(min, Math.min(max, integer));
}

function clampFloat(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

function toFinite(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function argMax(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    let bestIndex = 0;
    let bestValue = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] > bestValue) {
            bestValue = values[i];
            bestIndex = i;
        }
    }
    return bestIndex;
}

function resolveHiddenLayers(modelOptions) {
    if (Array.isArray(modelOptions?.hiddenLayers) && modelOptions.hiddenLayers.length > 0) {
        return modelOptions.hiddenLayers.map(s => clampInt(s, 64, 8, 4096));
    }
    const single = clampInt(modelOptions?.hiddenSize, 64, 8, 2048);
    return [single];
}

export const CHECKPOINT_CONTRACT_V36 = 'v36-dqn-checkpoint-v2';
export const CHECKPOINT_CONTRACT_V35 = 'v35-dqn-checkpoint-v1';
export const CHECKPOINT_CONTRACT_V34 = 'v34-dqn-checkpoint-v1';

function resolveCheckpointObservationLength(checkpoint) {
    const direct = clampInt(checkpoint?.observationLength, 0, 0, 10_000);
    if (direct > 0) {
        return direct;
    }
    const layerInputSize = clampInt(
        checkpoint?.online?.layers?.[0]?.inputSize ?? checkpoint?.online?.inputSize,
        0,
        0,
        10_000
    );
    return layerInputSize;
}

function cloneNetworkState(state) {
    return state && typeof state === 'object'
        ? JSON.parse(JSON.stringify(state))
        : null;
}

function migrateNetworkStateInputSize(networkState, targetInputSize) {
    const cloned = cloneNetworkState(networkState);
    if (!cloned || targetInputSize <= 0) {
        return null;
    }

    if (Array.isArray(cloned.layers) && cloned.layers.length > 0) {
        const firstLayer = cloned.layers[0];
        const oldInputSize = clampInt(firstLayer?.inputSize, 0, 0, 10_000);
        const outputSize = clampInt(firstLayer?.outputSize, 0, 0, 10_000);
        if (oldInputSize <= 0 || outputSize <= 0 || !Array.isArray(firstLayer?.weights)) {
            return null;
        }
        const migratedWeights = new Array(targetInputSize * outputSize).fill(0);
        const copyInputs = Math.min(oldInputSize, targetInputSize);
        for (let inputIndex = 0; inputIndex < copyInputs; inputIndex += 1) {
            for (let outputIndex = 0; outputIndex < outputSize; outputIndex += 1) {
                migratedWeights[inputIndex * outputSize + outputIndex] =
                    toFinite(firstLayer.weights[inputIndex * outputSize + outputIndex], 0);
            }
        }
        firstLayer.inputSize = targetInputSize;
        firstLayer.weights = migratedWeights;
        cloned.inputSize = targetInputSize;
        return cloned;
    }

    const oldInputSize = clampInt(cloned?.inputSize, 0, 0, 10_000);
    const hiddenSize = clampInt(cloned?.hiddenSize, 0, 0, 10_000);
    if (oldInputSize <= 0 || hiddenSize <= 0 || !Array.isArray(cloned?.weightsInputHidden)) {
        return null;
    }
    const migratedWeights = new Array(targetInputSize * hiddenSize).fill(0);
    const copyInputs = Math.min(oldInputSize, targetInputSize);
    for (let inputIndex = 0; inputIndex < copyInputs; inputIndex += 1) {
        for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
            migratedWeights[inputIndex * hiddenSize + hiddenIndex] =
                toFinite(cloned.weightsInputHidden[inputIndex * hiddenSize + hiddenIndex], 0);
        }
    }
    cloned.inputSize = targetInputSize;
    cloned.weightsInputHidden = migratedWeights;
    return cloned;
}

function migrateCheckpointObservationLength(checkpoint, targetInputSize) {
    const cloned = cloneNetworkState(checkpoint);
    if (!cloned) {
        return null;
    }
    const migratedOnline = migrateNetworkStateInputSize(cloned.online, targetInputSize);
    const migratedTarget = migrateNetworkStateInputSize(cloned.target, targetInputSize);
    if (!migratedOnline || !migratedTarget) {
        return null;
    }
    cloned.online = migratedOnline;
    cloned.target = migratedTarget;
    cloned.observationLength = targetInputSize;
    cloned.observationSchemaVersion = OBSERVATION_SCHEMA_VERSION_V2;
    cloned.migration = {
        sourceObservationLength: resolveCheckpointObservationLength(checkpoint),
        targetObservationLength: targetInputSize,
    };
    return cloned;
}

export class DqnTrainer {
    constructor(options = {}) {
        this.observationLength = clampInt(options.observationLength, OBSERVATION_LENGTH_V2, 1, 4096);
        this.maxItemIndex = clampInt(options.maxItemIndex, 2, 0, 8);
        this.seed = clampInt(options.seed, 13_337, 1, 2_147_483_647);
        this.observationSchemaVersion = typeof options.observationSchemaVersion === 'string' && options.observationSchemaVersion.trim()
            ? options.observationSchemaVersion.trim()
            : OBSERVATION_SCHEMA_VERSION_V2;
        this.actionArchitectureVersion = HYBRID_DECISION_ARCHITECTURE_VERSION;

        const hiddenLayers = resolveHiddenLayers(options?.model);

        this.hyper = {
            hiddenLayers,
            hiddenSize: hiddenLayers[0], // legacy accessor
            learningRate: clampFloat(options?.model?.learningRate, 0.0003, 0.0000001, 1),
            gamma: clampFloat(options?.model?.gamma, 0.99, 0, 1),
            batchSize: clampInt(options?.model?.batchSize, 64, 1, 4096),
            replayWarmup: clampInt(options?.model?.replayWarmup, 256, 1, 1_000_000),
            trainEvery: clampInt(options?.model?.trainEvery, 4, 1, 10_000),
            targetSyncInterval: clampInt(options?.model?.targetSyncInterval, 500, 1, 1_000_000),
            epsilonStart: clampFloat(options?.model?.epsilonStart, 1, 0, 1),
            epsilonEnd: clampFloat(options?.model?.epsilonEnd, 0.05, 0, 1),
            epsilonDecaySteps: clampInt(options?.model?.epsilonDecaySteps, 20_000, 1, 10_000_000),
            rewardClamp: clampFloat(options?.model?.rewardClamp, 10, 0.1, 1000),
        };

        const epsilonMin = Math.min(this.hyper.epsilonStart, this.hyper.epsilonEnd);
        const epsilonMax = Math.max(this.hyper.epsilonStart, this.hyper.epsilonEnd);
        this.hyper.epsilonStart = epsilonMax;
        this.hyper.epsilonEnd = epsilonMin;

        this.planarMode = options.planarMode === true;
        this.rng = new SeededRng(this.seed);
        this.actionVocabulary = new ActionVocabulary({
            maxItemIndex: this.maxItemIndex,
            planarMode: this.planarMode,
        });
        this.onlineNetwork = new DqnMlpNetwork({
            inputSize: this.observationLength,
            hiddenLayers,
            outputSize: this.actionVocabulary.size,
            rng: this.rng,
        });
        this.targetNetwork = new DqnMlpNetwork({
            inputSize: this.observationLength,
            hiddenLayers,
            outputSize: this.actionVocabulary.size,
            seed: this.seed + 1,
        });
        this.targetNetwork.copyFrom(this.onlineNetwork);

        this.envSteps = 0;
        this.optimizerSteps = 0;
        this.lastLoss = null;
        this.lastTargetSyncAt = 0;
        this.lastActionIndex = 0;
    }

    _resolveEpsilon() {
        const progress = Math.min(1, this.envSteps / this.hyper.epsilonDecaySteps);
        return this.hyper.epsilonStart + (this.hyper.epsilonEnd - this.hyper.epsilonStart) * progress;
    }

    _normalizeState(observation) {
        return normalizeObservationVector(observation, {
            length: this.observationLength,
            clampAbs: 10_000,
            warnRange: 2,
        });
    }

    _clampReward(reward) {
        const value = toFinite(reward, 0);
        return Math.max(-this.hyper.rewardClamp, Math.min(this.hyper.rewardClamp, value));
    }

    _buildTrainingSample(transition) {
        if (!transition || typeof transition !== 'object') return null;
        const info = transition.info && typeof transition.info === 'object'
            ? transition.info
            : {};
        const domain = info.domain && typeof info.domain === 'object'
            ? info.domain
            : {};
        const context = {
            planarMode: domain.planarMode === true,
            domainId: typeof domain.domainId === 'string' ? domain.domainId : null,
        };
        const actionIndex = this.actionVocabulary.encode(transition.action, context);
        return {
            state: this._normalizeState(transition.state),
            actionIndex,
            reward: this._clampReward(transition.reward),
            nextState: this._normalizeState(transition.nextState),
            done: transition.done === true,
        };
    }

    selectAction(observation, context = {}) {
        const normalized = this._normalizeState(observation);
        const epsilon = this._resolveEpsilon();
        const qValues = this.onlineNetwork.predict(normalized);
        let actionIndex = argMax(qValues);
        let policy = 'greedy';
        if (this.rng.nextFloat() < epsilon) {
            actionIndex = this.rng.nextInt(this.actionVocabulary.size);
            policy = 'explore';
        }

        this.lastActionIndex = actionIndex;
        const decoded = typeof this.actionVocabulary.decodeWithMetadata === 'function'
            ? this.actionVocabulary.decodeWithMetadata(actionIndex, context)
            : {
                action: this.actionVocabulary.decode(actionIndex, context),
                metadata: null,
            };
        return {
            action: decoded.action,
            actionIndex,
            epsilon,
            policy,
            qValue: toFinite(qValues[actionIndex], 0),
            actionMetadata: decoded.metadata,
        };
    }

    observeTransition(transition, replayBuffer) {
        this.envSteps += 1;
        const epsilon = this._resolveEpsilon();
        const replayStats = replayBuffer && typeof replayBuffer.getStats === 'function'
            ? replayBuffer.getStats()
            : null;

        const replaySize = Number(replayStats?.size || 0);
        const minReplay = Math.max(this.hyper.replayWarmup, this.hyper.batchSize);
        if (replaySize < minReplay) {
            return {
                trained: false,
                epsilon,
                replaySize,
                replayFill: toFinite(replayStats?.fillRatio, 0),
                reason: 'warmup',
                loss: this.lastLoss,
                optimizerSteps: this.optimizerSteps,
                targetSynced: false,
            };
        }
        if ((this.envSteps % this.hyper.trainEvery) !== 0) {
            return {
                trained: false,
                epsilon,
                replaySize,
                replayFill: toFinite(replayStats?.fillRatio, 0),
                reason: 'train-interval',
                loss: this.lastLoss,
                optimizerSteps: this.optimizerSteps,
                targetSynced: false,
            };
        }

        const sampledTransitions = replayBuffer.sample(this.hyper.batchSize);
        const samples = [];
        for (const sampled of sampledTransitions) {
            const mapped = this._buildTrainingSample(sampled);
            if (mapped) {
                mapped._replayIndex = sampled._replayIndex;
                mapped._isWeight = sampled._isWeight;
                samples.push(mapped);
            }
        }
        if (samples.length === 0) {
            return {
                trained: false,
                epsilon,
                replaySize,
                replayFill: toFinite(replayStats?.fillRatio, 0),
                reason: 'empty-sample',
                loss: this.lastLoss,
                optimizerSteps: this.optimizerSteps,
                targetSynced: false,
            };
        }

        const trainingResult = this.onlineNetwork.trainBatch(samples, {
            targetNetwork: this.targetNetwork,
            gamma: this.hyper.gamma,
            learningRate: this.hyper.learningRate,
        });

        // Update priorities for PER
        if (typeof replayBuffer.updatePriority === 'function' && Array.isArray(trainingResult.tdErrors)) {
            for (let i = 0; i < trainingResult.tdErrors.length; i++) {
                const sample = samples[i];
                if (sample && Number.isInteger(sample._replayIndex)) {
                    replayBuffer.updatePriority(sample._replayIndex, trainingResult.tdErrors[i]);
                }
            }
        }
        if (!trainingResult.trained) {
            return {
                trained: false,
                epsilon,
                replaySize,
                replayFill: toFinite(replayStats?.fillRatio, 0),
                reason: 'train-skip',
                loss: this.lastLoss,
                optimizerSteps: this.optimizerSteps,
                targetSynced: false,
            };
        }

        this.lastLoss = toFinite(trainingResult.meanLoss, null);
        this.optimizerSteps += 1;
        let targetSynced = false;
        if ((this.optimizerSteps % this.hyper.targetSyncInterval) === 0) {
            this.targetNetwork.copyFrom(this.onlineNetwork);
            this.lastTargetSyncAt = this.optimizerSteps;
            targetSynced = true;
        }

        return {
            trained: true,
            epsilon,
            replaySize,
            replayFill: toFinite(replayStats?.fillRatio, 0),
            reason: null,
            loss: this.lastLoss,
            optimizerSteps: this.optimizerSteps,
            targetSynced,
            batchSize: samples.length,
        };
    }

    getSnapshot() {
        return {
            observationLength: this.observationLength,
            actionCount: this.actionVocabulary.size,
            envSteps: this.envSteps,
            optimizerSteps: this.optimizerSteps,
            epsilon: this._resolveEpsilon(),
            lastLoss: this.lastLoss,
            lastTargetSyncAt: this.lastTargetSyncAt,
            hyper: { ...this.hyper },
        };
    }

    exportCheckpoint() {
        return {
            contractVersion: CHECKPOINT_CONTRACT_V36,
            seed: this.seed,
            envSteps: this.envSteps,
            optimizerSteps: this.optimizerSteps,
            lastLoss: this.lastLoss,
            lastTargetSyncAt: this.lastTargetSyncAt,
            observationLength: this.observationLength,
            observationSchemaVersion: this.observationSchemaVersion,
            maxItemIndex: this.maxItemIndex,
            planarMode: this.planarMode,
            actionCount: this.actionVocabulary.size,
            actionArchitectureVersion: this.actionArchitectureVersion,
            hyper: { ...this.hyper },
            online: this.onlineNetwork.exportState(),
            target: this.targetNetwork.exportState(),
        };
    }

    importCheckpoint(checkpoint, options = {}) {
        if (!checkpoint || typeof checkpoint !== 'object') {
            return { ok: false, error: 'checkpoint-missing' };
        }
        const version = checkpoint.contractVersion;
        if (version !== CHECKPOINT_CONTRACT_V36 && version !== CHECKPOINT_CONTRACT_V35 && version !== CHECKPOINT_CONTRACT_V34) {
            return { ok: false, error: 'checkpoint-contract-version-mismatch', details: {
                expected: [CHECKPOINT_CONTRACT_V36, CHECKPOINT_CONTRACT_V35, CHECKPOINT_CONTRACT_V34],
                actual: version || null,
            }};
        }
        const strict = options.strict !== false;
        const expectedActionCount = this.actionVocabulary.size;
        const checkpointObsLength = resolveCheckpointObservationLength(checkpoint);
        const checkpointActionCount = clampInt(
            checkpoint.online?.outputSize ?? checkpoint.online?.layers?.[checkpoint.online?.layers?.length - 1]?.outputSize ?? checkpoint.target?.outputSize,
            0, 0, 10_000
        );
        let checkpointPayload = checkpoint;
        if (checkpointObsLength && checkpointObsLength !== this.observationLength) {
            const canMigrateObservationLength = (
                checkpointObsLength > 0
                && checkpointObsLength < this.observationLength
                && checkpointActionCount === expectedActionCount
            );
            if (canMigrateObservationLength) {
                const migratedCheckpoint = migrateCheckpointObservationLength(checkpoint, this.observationLength);
                if (migratedCheckpoint) {
                    checkpointPayload = migratedCheckpoint;
                }
            }
        }
        const effectiveCheckpointObsLength = resolveCheckpointObservationLength(checkpointPayload);
        if (effectiveCheckpointObsLength && effectiveCheckpointObsLength !== this.observationLength) {
            const msg = `observation-length-mismatch: checkpoint=${checkpointObsLength} runtime=${this.observationLength}`;
            if (strict) return { ok: false, error: msg };
            console.warn(`[DqnTrainer] ${msg} (non-strict, continuing)`);
        }
        if (checkpointActionCount && checkpointActionCount !== expectedActionCount) {
            const msg = `action-count-mismatch: checkpoint=${checkpointActionCount} runtime=${expectedActionCount}`;
            if (strict) return { ok: false, error: msg };
            console.warn(`[DqnTrainer] ${msg} (non-strict, continuing)`);
        }
        const importedOnline = this.onlineNetwork.importState(checkpointPayload.online);
        const importedTarget = this.targetNetwork.importState(checkpointPayload.target);
        if (!importedOnline || !importedTarget) {
            return { ok: false, error: 'network-state-import-failed' };
        }
        this.envSteps = clampInt(checkpointPayload.envSteps, 0, 0, 1_000_000_000);
        this.optimizerSteps = clampInt(checkpointPayload.optimizerSteps, 0, 0, 1_000_000_000);
        this.lastLoss = checkpointPayload.lastLoss == null ? null : toFinite(checkpointPayload.lastLoss, 0);
        this.lastTargetSyncAt = clampInt(checkpointPayload.lastTargetSyncAt, 0, 0, 1_000_000_000);
        this.observationSchemaVersion = typeof checkpointPayload.observationSchemaVersion === 'string' && checkpointPayload.observationSchemaVersion.trim()
            ? checkpointPayload.observationSchemaVersion.trim()
            : this.observationSchemaVersion;
        return {
            ok: true,
            error: null,
            migrated: checkpointPayload !== checkpoint,
        };
    }
}
