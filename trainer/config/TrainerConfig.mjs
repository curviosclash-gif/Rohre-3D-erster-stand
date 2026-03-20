import {
    TRAINER_CONTRACT_FREEZE_V34,
    TRAINER_FAILURE_POLICY,
} from './TrainerRuntimeContract.mjs';

function clampInt(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function clampFloat(value, fallback, min, max) {
    const parsed = Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function parseBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function parseArgMap(argv = []) {
    const args = new Map();
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (typeof token !== 'string' || !token.startsWith('--')) continue;
        const eqIndex = token.indexOf('=');
        if (eqIndex >= 0) {
            args.set(token.slice(2, eqIndex), token.slice(eqIndex + 1));
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        if (typeof next === 'string' && !next.startsWith('--')) {
            args.set(key, next);
            i += 1;
            continue;
        }
        args.set(key, 'true');
    }
    return args;
}

function pickValue(args, env, argKey, envKey, fallback) {
    if (args.has(argKey)) return args.get(argKey);
    if (Object.prototype.hasOwnProperty.call(env, envKey)) return env[envKey];
    return fallback;
}

function freezeFailurePolicy(policyInput = {}) {
    return Object.freeze({
        timeoutOwnership: TRAINER_FAILURE_POLICY.timeoutOwnership,
        retryOwnership: TRAINER_FAILURE_POLICY.retryOwnership,
        maxIncomingBytes: clampInt(
            policyInput.maxIncomingBytes,
            TRAINER_FAILURE_POLICY.maxIncomingBytes,
            1024,
            32 * 1024 * 1024
        ),
        maxSocketBufferedAmountBytes: clampInt(
            policyInput.maxSocketBufferedAmountBytes,
            TRAINER_FAILURE_POLICY.maxSocketBufferedAmountBytes,
            4096,
            64 * 1024 * 1024
        ),
        onInvalidEnvelope: TRAINER_FAILURE_POLICY.onInvalidEnvelope,
        onBackpressure: TRAINER_FAILURE_POLICY.onBackpressure,
    });
}

export const DEFAULT_TRAINER_CONFIG = Object.freeze({
    host: '127.0.0.1',
    port: 8765,
    verbose: true,
    observationLength: 40,
    replayCapacity: 50_000,
    maxItemIndex: 2,
    sessionSeed: 13_337,
    model: Object.freeze({
        hiddenLayers: Object.freeze([256, 128]),
        hiddenSize: 256, // legacy: first hidden layer size
        learningRate: 0.0003,
        gamma: 0.99,
        batchSize: 64,
        replayWarmup: 256,
        trainEvery: 4,
        targetSyncInterval: 500,
        epsilonStart: 1,
        epsilonEnd: 0.05,
        epsilonDecaySteps: 20_000,
    }),
    contractFreeze: TRAINER_CONTRACT_FREEZE_V34,
    failurePolicy: TRAINER_FAILURE_POLICY,
});

export function resolveTrainerConfig({ argv = [], env = process.env } = {}) {
    const args = parseArgMap(argv);
    const host = String(
        pickValue(args, env, 'host', 'TRAINER_HOST', DEFAULT_TRAINER_CONFIG.host)
    ).trim() || DEFAULT_TRAINER_CONFIG.host;

    const port = clampInt(
        pickValue(args, env, 'port', 'TRAINER_PORT', DEFAULT_TRAINER_CONFIG.port),
        DEFAULT_TRAINER_CONFIG.port,
        0,
        65535
    );
    const verbose = parseBoolean(
        pickValue(args, env, 'verbose', 'TRAINER_VERBOSE', String(DEFAULT_TRAINER_CONFIG.verbose)),
        DEFAULT_TRAINER_CONFIG.verbose
    );
    const observationLength = clampInt(
        pickValue(
            args,
            env,
            'observation-length',
            'TRAINER_OBSERVATION_LENGTH',
            DEFAULT_TRAINER_CONFIG.observationLength
        ),
        DEFAULT_TRAINER_CONFIG.observationLength,
        8,
        4096
    );
    const replayCapacity = clampInt(
        pickValue(
            args,
            env,
            'replay-capacity',
            'TRAINER_REPLAY_CAPACITY',
            DEFAULT_TRAINER_CONFIG.replayCapacity
        ),
        DEFAULT_TRAINER_CONFIG.replayCapacity,
        32,
        1_000_000
    );
    const maxItemIndex = clampInt(
        pickValue(
            args,
            env,
            'max-item-index',
            'TRAINER_MAX_ITEM_INDEX',
            DEFAULT_TRAINER_CONFIG.maxItemIndex
        ),
        DEFAULT_TRAINER_CONFIG.maxItemIndex,
        0,
        8
    );
    const sessionSeed = clampInt(
        pickValue(
            args,
            env,
            'seed',
            'TRAINER_SESSION_SEED',
            DEFAULT_TRAINER_CONFIG.sessionSeed
        ),
        DEFAULT_TRAINER_CONFIG.sessionSeed,
        1,
        2_147_483_647
    );
    const rawHiddenLayers = pickValue(
        args,
        env,
        'model-hidden-layers',
        'TRAINER_MODEL_HIDDEN_LAYERS',
        null
    );
    let modelHiddenLayers;
    if (typeof rawHiddenLayers === 'string' && rawHiddenLayers.trim()) {
        modelHiddenLayers = rawHiddenLayers.split(',')
            .map(s => clampInt(s.trim(), 0, 0, 4096))
            .filter(n => n > 0);
    }
    if (!modelHiddenLayers || modelHiddenLayers.length === 0) {
        // Fallback: legacy --model-hidden-size creates a single-layer config
        const modelHiddenSize = clampInt(
            pickValue(
                args,
                env,
                'model-hidden-size',
                'TRAINER_MODEL_HIDDEN_SIZE',
                null
            ),
            0, 0, 4096
        );
        modelHiddenLayers = modelHiddenSize > 0
            ? [modelHiddenSize]
            : [...DEFAULT_TRAINER_CONFIG.model.hiddenLayers];
    }
    const modelHiddenSize = modelHiddenLayers[0];
    const modelLearningRate = clampFloat(
        pickValue(
            args,
            env,
            'model-lr',
            'TRAINER_MODEL_LR',
            DEFAULT_TRAINER_CONFIG.model.learningRate
        ),
        DEFAULT_TRAINER_CONFIG.model.learningRate,
        0.000001,
        1
    );
    const modelGamma = clampFloat(
        pickValue(
            args,
            env,
            'model-gamma',
            'TRAINER_MODEL_GAMMA',
            DEFAULT_TRAINER_CONFIG.model.gamma
        ),
        DEFAULT_TRAINER_CONFIG.model.gamma,
        0,
        1
    );
    const modelBatchSize = clampInt(
        pickValue(
            args,
            env,
            'model-batch-size',
            'TRAINER_MODEL_BATCH_SIZE',
            DEFAULT_TRAINER_CONFIG.model.batchSize
        ),
        DEFAULT_TRAINER_CONFIG.model.batchSize,
        1,
        4096
    );
    const modelReplayWarmup = clampInt(
        pickValue(
            args,
            env,
            'model-replay-warmup',
            'TRAINER_MODEL_REPLAY_WARMUP',
            DEFAULT_TRAINER_CONFIG.model.replayWarmup
        ),
        DEFAULT_TRAINER_CONFIG.model.replayWarmup,
        1,
        1_000_000
    );
    const modelTrainEvery = clampInt(
        pickValue(
            args,
            env,
            'model-train-every',
            'TRAINER_MODEL_TRAIN_EVERY',
            DEFAULT_TRAINER_CONFIG.model.trainEvery
        ),
        DEFAULT_TRAINER_CONFIG.model.trainEvery,
        1,
        10_000
    );
    const modelTargetSyncInterval = clampInt(
        pickValue(
            args,
            env,
            'model-target-sync',
            'TRAINER_MODEL_TARGET_SYNC',
            DEFAULT_TRAINER_CONFIG.model.targetSyncInterval
        ),
        DEFAULT_TRAINER_CONFIG.model.targetSyncInterval,
        1,
        1_000_000
    );
    const modelEpsilonStart = clampFloat(
        pickValue(
            args,
            env,
            'model-epsilon-start',
            'TRAINER_MODEL_EPSILON_START',
            DEFAULT_TRAINER_CONFIG.model.epsilonStart
        ),
        DEFAULT_TRAINER_CONFIG.model.epsilonStart,
        0,
        1
    );
    const modelEpsilonEnd = clampFloat(
        pickValue(
            args,
            env,
            'model-epsilon-end',
            'TRAINER_MODEL_EPSILON_END',
            DEFAULT_TRAINER_CONFIG.model.epsilonEnd
        ),
        DEFAULT_TRAINER_CONFIG.model.epsilonEnd,
        0,
        1
    );
    const modelEpsilonDecaySteps = clampInt(
        pickValue(
            args,
            env,
            'model-epsilon-decay-steps',
            'TRAINER_MODEL_EPSILON_DECAY_STEPS',
            DEFAULT_TRAINER_CONFIG.model.epsilonDecaySteps
        ),
        DEFAULT_TRAINER_CONFIG.model.epsilonDecaySteps,
        1,
        10_000_000
    );
    const modelEpsilonLo = Math.min(modelEpsilonStart, modelEpsilonEnd);
    const modelEpsilonHi = Math.max(modelEpsilonStart, modelEpsilonEnd);

    const failurePolicy = freezeFailurePolicy({
        maxIncomingBytes: pickValue(
            args,
            env,
            'max-incoming-bytes',
            'TRAINER_MAX_INCOMING_BYTES',
            TRAINER_FAILURE_POLICY.maxIncomingBytes
        ),
        maxSocketBufferedAmountBytes: pickValue(
            args,
            env,
            'max-buffered-bytes',
            'TRAINER_MAX_BUFFERED_BYTES',
            TRAINER_FAILURE_POLICY.maxSocketBufferedAmountBytes
        ),
    });

    return Object.freeze({
        host,
        port,
        verbose,
        observationLength,
        replayCapacity,
        maxItemIndex,
        sessionSeed,
        model: Object.freeze({
            hiddenLayers: Object.freeze([...modelHiddenLayers]),
            hiddenSize: modelHiddenSize,
            learningRate: modelLearningRate,
            gamma: modelGamma,
            batchSize: modelBatchSize,
            replayWarmup: modelReplayWarmup,
            trainEvery: modelTrainEvery,
            targetSyncInterval: modelTargetSyncInterval,
            epsilonStart: modelEpsilonHi,
            epsilonEnd: modelEpsilonLo,
            epsilonDecaySteps: modelEpsilonDecaySteps,
        }),
        contractFreeze: TRAINER_CONTRACT_FREEZE_V34,
        failurePolicy,
    });
}

export function formatTrainerServerHelp() {
    return [
        'Usage: node scripts/trainer-server.mjs [options]',
        '',
        'Options:',
        '  --host <host>                  WebSocket host (default: 127.0.0.1)',
        '  --port <port>                  WebSocket port (default: 8765, use 0 for auto)',
        '  --verbose <true|false>         Enable trainer logs (default: true)',
        '  --observation-length <n>       Normalized observation vector length (default: 40)',
        '  --replay-capacity <n>          Replay capacity (default: 20000)',
        '  --max-item-index <n>           Max action item slot index (default: 2)',
        '  --seed <n>                     Session RNG seed (default: 13337)',
        '  --model-hidden-layers <n,n,...>  DQN hidden layer sizes (default: 256,128)',
        '  --model-hidden-size <n>        Legacy: single hidden layer (default: 256)',
        '  --model-lr <n>                 DQN learning rate (default: 0.0003)',
        '  --model-gamma <n>              DQN discount factor (default: 0.99)',
        '  --model-batch-size <n>         DQN batch size (default: 64)',
        '  --model-replay-warmup <n>      Min replay size before training (default: 256)',
        '  --model-train-every <n>        Train every N steps (default: 4)',
        '  --model-target-sync <n>        Target network sync interval (default: 500)',
        '  --model-epsilon-start <n>      Initial epsilon (default: 1.0)',
        '  --model-epsilon-end <n>        Final epsilon (default: 0.05)',
        '  --model-epsilon-decay-steps <n> Epsilon decay steps (default: 20000)',
        '  --max-incoming-bytes <n>       Failure policy: max inbound payload bytes',
        '  --max-buffered-bytes <n>       Failure policy: max ws buffered bytes',
        '  --resume-checkpoint <token>    Optional startup resume checkpoint (path or "latest")',
        '  --resume-strict <true|false>   Fail startup when resume checkpoint cannot be loaded',
        '  --latest-index-path <path>     Optional latest index path for --resume-checkpoint latest',
        '',
        'Environment aliases:',
        '  TRAINER_HOST, TRAINER_PORT, TRAINER_VERBOSE, TRAINER_OBSERVATION_LENGTH,',
        '  TRAINER_REPLAY_CAPACITY, TRAINER_MAX_ITEM_INDEX, TRAINER_SESSION_SEED,',
        '  TRAINER_MODEL_*, TRAINER_MAX_INCOMING_BYTES, TRAINER_MAX_BUFFERED_BYTES,',
        '  TRAINER_RESUME_CHECKPOINT, TRAINER_RESUME_STRICT, TRAINER_LATEST_INDEX_PATH',
    ].join('\n');
}
