const CHECKPOINT_ACTION_TEMPLATE = Object.freeze({
    yawLeft: false,
    yawRight: false,
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    boost: false,
    shootMG: false,
    shootItem: false,
    shootItemIndex: -1,
    useItem: -1,
    dropItem: false,
    nextItem: false,
});

function createCheckpointAction(overrides = {}) {
    return {
        ...CHECKPOINT_ACTION_TEMPLATE,
        ...overrides,
    };
}

function toCheckpointActionCount(checkpoint = {}) {
    const directCount = Number(checkpoint?.actionCount);
    if (Number.isInteger(directCount) && directCount > 0) {
        return directCount;
    }
    const outputSize = Number(checkpoint?.online?.outputSize);
    if (Number.isInteger(outputSize) && outputSize > 0) {
        return outputSize;
    }
    return 0;
}

export function resolveRuntimePlanarMode(runtimeContext = {}, fallback = false) {
    if (typeof runtimeContext?.rules?.planarMode === 'boolean') return runtimeContext.rules.planarMode;
    if (typeof runtimeContext?.planarMode === 'boolean') return runtimeContext.planarMode;
    return fallback;
}

export function resolveRuntimeDomainId(runtimeContext = {}) {
    const domainId = runtimeContext?.rules?.domainId ?? runtimeContext?.domainId;
    return typeof domainId === 'string' && domainId.trim() ? domainId.trim() : null;
}

export function createCheckpointActionVocabulary(checkpoint = {}) {
    const maxItemIndexRaw = Number(checkpoint?.maxItemIndex);
    const maxItemIndex = Number.isInteger(maxItemIndexRaw) && maxItemIndexRaw >= 0
        ? maxItemIndexRaw
        : 0;
    const checkpointPlanarMode = checkpoint?.planarMode === true;
    const templates = [
        createCheckpointAction(),
        createCheckpointAction({ yawLeft: true }),
        createCheckpointAction({ yawRight: true }),
        createCheckpointAction({ yawLeft: true, boost: true }),
        createCheckpointAction({ yawRight: true, boost: true }),
        createCheckpointAction({ boost: true }),
        createCheckpointAction({ shootMG: true }),
        createCheckpointAction({ yawLeft: true, shootMG: true }),
        createCheckpointAction({ yawRight: true, shootMG: true }),
    ];

    if (!checkpointPlanarMode) {
        templates.push(createCheckpointAction({ pitchUp: true }));
        templates.push(createCheckpointAction({ pitchDown: true }));
        templates.push(createCheckpointAction({ pitchUp: true, boost: true }));
        templates.push(createCheckpointAction({ pitchDown: true, boost: true }));
    }

    for (let i = 0; i <= maxItemIndex; i += 1) {
        templates.push(createCheckpointAction({ shootItem: true, shootItemIndex: i }));
    }
    for (let i = 0; i <= maxItemIndex; i += 1) {
        templates.push(createCheckpointAction({ useItem: i }));
    }
    templates.push(createCheckpointAction({ nextItem: true }));
    templates.push(createCheckpointAction({ dropItem: true }));

    const actionCount = toCheckpointActionCount(checkpoint);
    if (actionCount > 0 && actionCount !== templates.length) {
        return null;
    }

    return {
        decode(index, context = {}) {
            const normalizedIndex = Number.isInteger(index)
                ? Math.max(0, Math.min(templates.length - 1, index))
                : 0;
            const template = templates[normalizedIndex] || templates[0];
            const planarMode = typeof context?.planarMode === 'boolean'
                ? context.planarMode
                : checkpointPlanarMode;
            if (!planarMode) {
                return { ...template };
            }
            return {
                ...template,
                pitchUp: false,
                pitchDown: false,
                rollLeft: false,
                rollRight: false,
            };
        },
    };
}
