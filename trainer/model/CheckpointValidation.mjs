function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasArrayField(value, fieldName) {
    return Array.isArray(value?.[fieldName]);
}

function toError(code, details = null) {
    return {
        ok: false,
        error: String(code || 'checkpoint-invalid'),
        details: details && typeof details === 'object' ? { ...details } : null,
        checkpoint: null,
    };
}

export function extractCheckpointFromEnvelope(raw) {
    if (!isObject(raw)) {
        return null;
    }
    if (isObject(raw.checkpoint)) {
        return raw.checkpoint;
    }
    if (raw.contractVersion === 'v34-dqn-checkpoint-v1') {
        return raw;
    }
    return null;
}

export function validateDqnCheckpointPayload(raw) {
    const checkpoint = extractCheckpointFromEnvelope(raw);
    if (!checkpoint) {
        return toError('checkpoint-missing');
    }
    if (checkpoint.contractVersion !== 'v34-dqn-checkpoint-v1') {
        return toError('checkpoint-contract-version-mismatch', {
            expected: 'v34-dqn-checkpoint-v1',
            actual: checkpoint.contractVersion || null,
        });
    }
    if (!isObject(checkpoint.online) || !isObject(checkpoint.target)) {
        return toError('checkpoint-network-state-missing');
    }
    if (
        !hasArrayField(checkpoint.online, 'weightsInputHidden')
        || !hasArrayField(checkpoint.online, 'weightsHiddenOutput')
        || !hasArrayField(checkpoint.target, 'weightsInputHidden')
        || !hasArrayField(checkpoint.target, 'weightsHiddenOutput')
    ) {
        return toError('checkpoint-network-shape-invalid');
    }
    return {
        ok: true,
        error: null,
        details: null,
        checkpoint,
    };
}

