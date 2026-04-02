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

const SUPPORTED_VERSIONS = new Set([
    'v36-dqn-checkpoint-v2',
    'v35-dqn-checkpoint-v1',
    'v34-dqn-checkpoint-v1',
]);

export function extractCheckpointFromEnvelope(raw) {
    if (!isObject(raw)) {
        return null;
    }
    if (isObject(raw.checkpoint)) {
        return raw.checkpoint;
    }
    if (SUPPORTED_VERSIONS.has(raw.contractVersion)) {
        return raw;
    }
    return null;
}

function validateV35NetworkState(networkState) {
    if (!isObject(networkState)) return false;
    if (!Array.isArray(networkState.layers) || networkState.layers.length === 0) return false;
    for (const layer of networkState.layers) {
        if (!isObject(layer)) return false;
        if (!hasArrayField(layer, 'weights') || !hasArrayField(layer, 'bias')) return false;
    }
    return true;
}

function validateV34NetworkState(networkState) {
    if (!isObject(networkState)) return false;
    return hasArrayField(networkState, 'weightsInputHidden')
        && hasArrayField(networkState, 'weightsHiddenOutput');
}

export function validateDqnCheckpointPayload(raw) {
    const checkpoint = extractCheckpointFromEnvelope(raw);
    if (!checkpoint) {
        return toError('checkpoint-missing');
    }
    if (!SUPPORTED_VERSIONS.has(checkpoint.contractVersion)) {
        return toError('checkpoint-contract-version-mismatch', {
            expected: [...SUPPORTED_VERSIONS],
            actual: checkpoint.contractVersion || null,
        });
    }
    if (!isObject(checkpoint.online) || !isObject(checkpoint.target)) {
        return toError('checkpoint-network-state-missing');
    }

    const isLayeredFormat = checkpoint.contractVersion === 'v36-dqn-checkpoint-v2'
        || checkpoint.contractVersion === 'v35-dqn-checkpoint-v1';
    if (isLayeredFormat) {
        // v35: validate layers[] structure
        if (!validateV35NetworkState(checkpoint.online) || !validateV35NetworkState(checkpoint.target)) {
            // Fall back to v34 flat fields (v35 exports both for compat)
            if (!validateV34NetworkState(checkpoint.online) || !validateV34NetworkState(checkpoint.target)) {
                return toError('checkpoint-network-shape-invalid');
            }
        }
    } else {
        // v34: validate flat fields
        if (!validateV34NetworkState(checkpoint.online) || !validateV34NetworkState(checkpoint.target)) {
            return toError('checkpoint-network-shape-invalid');
        }
    }

    return {
        ok: true,
        error: null,
        details: null,
        checkpoint,
    };
}
