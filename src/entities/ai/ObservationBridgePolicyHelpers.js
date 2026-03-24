export function isRuntimeContextPayload(value) {
    return !!(
        value
        && typeof value === 'object'
        && ('arena' in value || 'players' in value || 'projectiles' in value || 'observation' in value)
    );
}

export function createRuntimeContextFromLegacyArgs(player, arena, allPlayers, projectiles, dt) {
    return {
        dt: Number.isFinite(dt) ? dt : 0,
        player: player || null,
        arena: arena || null,
        players: Array.isArray(allPlayers) ? allPlayers : [],
        projectiles: Array.isArray(projectiles) ? projectiles : [],
        observation: null,
    };
}

export function resolveTrainerBridgeOptions(options = {}) {
    const runtimeBotConfig = options?.runtimeConfig?.bot || null;
    const trainerConfig = options?.trainerBridge && typeof options.trainerBridge === 'object'
        ? options.trainerBridge
        : null;
    const enabled = !!(
        options?.trainerBridgeEnabled
        ?? trainerConfig?.enabled
        ?? runtimeBotConfig?.trainerBridgeEnabled
        ?? false
    );
    return {
        enabled,
        url: trainerConfig?.url || options?.trainerBridgeUrl || runtimeBotConfig?.trainerBridgeUrl || 'ws://127.0.0.1:8765',
        timeoutMs: trainerConfig?.timeoutMs || options?.trainerBridgeTimeoutMs || runtimeBotConfig?.trainerBridgeTimeoutMs || 80,
        maxRetries: trainerConfig?.maxRetries
            ?? options?.trainerBridgeMaxRetries
            ?? runtimeBotConfig?.trainerBridgeMaxRetries
            ?? 1,
        retryDelayMs: trainerConfig?.retryDelayMs
            ?? options?.trainerBridgeRetryDelayMs
            ?? runtimeBotConfig?.trainerBridgeRetryDelayMs
            ?? 0,
        resumeCheckpoint: trainerConfig?.resumeCheckpoint
            ?? options?.trainerCheckpointResumeToken
            ?? runtimeBotConfig?.trainerCheckpointResumeToken
            ?? '',
        resumeStrict: trainerConfig?.resumeStrict
            ?? options?.trainerCheckpointResumeStrict
            ?? runtimeBotConfig?.trainerCheckpointResumeStrict
            ?? false,
    };
}

export function hasSteeringIntent(action = null) {
    if (!action || typeof action !== 'object') return false;
    return !!(
        action.yawLeft
        || action.yawRight
        || action.pitchUp
        || action.pitchDown
        || action.rollLeft
        || action.rollRight
    );
}

function isPassiveForwardIntent(action = null) {
    if (!action || typeof action !== 'object') return true;
    if (hasSteeringIntent(action)) return false;
    const hasCombatIntent = action.shootMG === true
        || action.shootItem === true
        || action.dropItem === true
        || action.nextItem === true
        || (Number.isInteger(action.useItem) && action.useItem >= 0);
    return !hasCombatIntent;
}

export async function initializeTrainerCheckpointResume(policy, resumeToken, trainerBridgeOptions) {
    if (!policy?._trainerBridge) return;
    const resumeStrict = trainerBridgeOptions?.resumeStrict === true;
    const commandTimeoutMs = Math.max(
        40,
        Number(trainerBridgeOptions?.timeoutMs || 80) * 4
    );
    try {
        if (typeof policy._trainerBridge.waitForReady === 'function') {
            const ready = await policy._trainerBridge.waitForReady(commandTimeoutMs);
            if (!ready) {
                if (resumeStrict) {
                    policy._setTrainerBridgeInitState({
                        status: 'failed',
                        resumeRequested: true,
                        resumeToken,
                        loaded: false,
                        error: 'ready-timeout',
                    });
                    return;
                }
                policy._setTrainerBridgeInitState({
                    status: 'ready',
                    resumeRequested: true,
                    resumeToken,
                    loaded: false,
                    error: 'ready-timeout',
                });
                return;
            }
        }

        const payload = {
            strict: resumeStrict,
        };
        if (resumeToken.toLowerCase() !== 'latest') {
            payload.checkpointPath = resumeToken;
        }
        const response = await policy._trainerBridge.submitCommand('trainer-checkpoint-load-latest', payload, {
            timeoutMs: commandTimeoutMs,
        });
        const loaded = response?.ok === true && response?.loaded === true;
        if (!loaded && resumeStrict) {
            policy._setTrainerBridgeInitState({
                status: 'failed',
                resumeRequested: true,
                resumeToken,
                loaded: false,
                error: response?.error || 'checkpoint-load-failed',
                resumeSource: response?.resumeSource || null,
            });
            return;
        }
        policy._setTrainerBridgeInitState({
            status: 'ready',
            resumeRequested: true,
            resumeToken,
            loaded,
            error: loaded ? null : (response?.error || 'checkpoint-load-failed'),
            resumeSource: response?.resumeSource || null,
        });
    } catch (error) {
        policy._setTrainerBridgeInitState({
            status: resumeStrict ? 'failed' : 'ready',
            resumeRequested: true,
            resumeToken,
            loaded: false,
            error: error?.message || 'checkpoint-load-exception',
        });
    }
}

export function resolveLocalInferenceAction(policy, runtimeContext) {
    if (!policy?._localInference || !policy._localInference.loaded) {
        return null;
    }
    const observation = runtimeContext?.observation;
    if (!Array.isArray(observation)) return null;
    if (policy._localInferenceVocabulary && typeof policy._localInferenceVocabulary.decode === 'function') {
        const decodeContext = {
            planarMode: runtimeContext?.rules?.planarMode,
            domainId: runtimeContext?.rules?.domainId,
        };

        const qValues = typeof policy._localInference.predict === 'function'
            ? policy._localInference.predict(observation)
            : null;

        if (Array.isArray(qValues) && qValues.length > 0) {
            const rankedIndices = qValues
                .map((value, index) => ({
                    index,
                    qValue: Number.isFinite(Number(value)) ? Number(value) : Number.NEGATIVE_INFINITY,
                }))
                .sort((left, right) => right.qValue - left.qValue)
                .map((entry) => entry.index);

            if (rankedIndices.length > 0) {
                const primaryAction = policy._localInferenceVocabulary.decode(rankedIndices[0], decodeContext);
                if (!isPassiveForwardIntent(primaryAction)) {
                    return primaryAction;
                }

                for (let i = 1; i < rankedIndices.length; i += 1) {
                    const candidateAction = policy._localInferenceVocabulary.decode(rankedIndices[i], decodeContext);
                    if (!hasSteeringIntent(candidateAction)) continue;
                    policy._warn(
                        'local inference selected passive forward action; using next best steering action',
                        null,
                        'local-steering-rank-assist',
                    );
                    return candidateAction;
                }

                return primaryAction;
            }
        }

        const { actionIndex } = policy._localInference.selectBestAction(observation);
        return policy._localInferenceVocabulary.decode(actionIndex, decodeContext);
    }
    return null;
}
