export const TRAINER_PROTOCOL_VERSION = 'v34-trainer-v1';

export const TRAINER_MESSAGE_TYPES = Object.freeze({
    ACTION_REQUEST: 'bot-action-request',
    TRAINING_RESET: 'training-reset',
    TRAINING_STEP: 'training-step',
    HEALTH_REQUEST: 'trainer-health-request',
    STATS_REQUEST: 'trainer-stats-request',
    CHECKPOINT_REQUEST: 'trainer-checkpoint-request',
    CHECKPOINT_LOAD: 'trainer-checkpoint-load',
    CHECKPOINT_LOAD_LATEST: 'trainer-checkpoint-load-latest',
});

export const TRAINER_RESPONSE_TYPES = Object.freeze({
    READY: 'trainer-ready',
    ACTION_RESPONSE: 'bot-action-response',
    TRAINING_ACK: 'training-ack',
    HEALTH: 'trainer-health',
    STATS: 'trainer-stats',
    CHECKPOINT: 'trainer-checkpoint',
    ERROR: 'trainer-error',
});

export const TRAINER_FAILURE_CODES = Object.freeze({
    INVALID_JSON: 'invalid-json',
    INVALID_ENVELOPE: 'invalid-envelope',
    MISSING_ID: 'missing-id',
    MISSING_TYPE: 'missing-type',
    UNKNOWN_TYPE: 'unknown-type',
    PAYLOAD_TOO_LARGE: 'payload-too-large',
    INVALID_TRANSITION: 'invalid-transition',
    BACKPRESSURE: 'backpressure',
});

export const TRAINER_FAILURE_POLICY = Object.freeze({
    timeoutOwnership: 'bridge-client',
    retryOwnership: 'bridge-client',
    maxIncomingBytes: 262_144,
    maxSocketBufferedAmountBytes: 2_097_152,
    onInvalidEnvelope: 'ack-error',
    onBackpressure: 'ack-error',
});

export const TRAINER_CONTRACT_FREEZE_V34 = Object.freeze({
    protocolVersion: TRAINER_PROTOCOL_VERSION,
    requestTypes: Object.freeze({
        action: TRAINER_MESSAGE_TYPES.ACTION_REQUEST,
        reset: TRAINER_MESSAGE_TYPES.TRAINING_RESET,
        step: TRAINER_MESSAGE_TYPES.TRAINING_STEP,
        checkpointRequest: TRAINER_MESSAGE_TYPES.CHECKPOINT_REQUEST,
        checkpointLoad: TRAINER_MESSAGE_TYPES.CHECKPOINT_LOAD,
        checkpointLoadLatest: TRAINER_MESSAGE_TYPES.CHECKPOINT_LOAD_LATEST,
    }),
    responseTypes: Object.freeze({
        action: TRAINER_RESPONSE_TYPES.ACTION_RESPONSE,
        ack: TRAINER_RESPONSE_TYPES.TRAINING_ACK,
        error: TRAINER_RESPONSE_TYPES.ERROR,
    }),
    transitionSchema: Object.freeze({
        version: 'v34-transition-v1',
        fields: Object.freeze(['state', 'action', 'reward', 'nextState', 'done']),
    }),
    checkpointSchema: Object.freeze({
        version: 'v35-dqn-checkpoint-v1',
        legacyVersions: Object.freeze(['v34-dqn-checkpoint-v1']),
        exportRequestType: TRAINER_MESSAGE_TYPES.CHECKPOINT_REQUEST,
        loadRequestType: TRAINER_MESSAGE_TYPES.CHECKPOINT_LOAD,
        responseType: TRAINER_RESPONSE_TYPES.CHECKPOINT,
    }),
    failurePolicy: TRAINER_FAILURE_POLICY,
});
