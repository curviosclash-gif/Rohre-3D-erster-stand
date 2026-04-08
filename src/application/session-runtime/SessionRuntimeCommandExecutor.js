import { SESSION_FINALIZE_TRIGGERS } from '../../shared/contracts/MatchLifecycleContract.js';
import {
    normalizeSessionRuntimeCommand,
    SESSION_RUNTIME_COMMAND_TYPES,
} from '../../shared/contracts/SessionRuntimeCommandContract.js';
import { SESSION_RUNTIME_EVENT_TYPES } from '../../shared/contracts/SessionRuntimeEventContract.js';
import { recordSessionRuntimeEvent } from '../../shared/runtime/SessionRuntimeObservability.js';
import { finalizeMatchFlow } from '../../core/runtime/MatchFinalizeFlowService.js';
import {
    handleMultiplayerHostAction,
    handleMultiplayerJoinAction,
} from '../../core/runtime/MenuRuntimeMultiplayerService.js';
import { applyCommandRuntimeSettings } from '../../core/runtime/RuntimeCommandSettingsService.js';

const INVALID_COMMAND_ERROR_MESSAGE = 'invalid session runtime command';

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function createObservedCommandInput(command = null, fallbackType = 'invalid_command') {
    const payload = command?.payload && typeof command.payload === 'object' && !Array.isArray(command.payload)
        ? { ...command.payload }
        : {};
    return {
        type: normalizeString(command?.type, fallbackType),
        payload,
    };
}

function summarizeCommandPayload(command = null) {
    const payload = command?.payload && typeof command.payload === 'object'
        ? command.payload
        : {};
    return {
        commandType: normalizeString(command?.type, ''),
        commandSource: normalizeString(payload.source, 'runtime_api'),
        reason: normalizeString(payload.reason, ''),
        trigger: normalizeString(payload.trigger, ''),
        lobbyCode: normalizeString(payload.lobbyCode, ''),
        preserveLobby: payload.preserveLobby === true,
        hasSettingsSnapshot: !!payload.settingsSnapshot,
        notifyMenuOpened: payload.notifyMenuOpened !== false,
    };
}

function summarizeCommandResult(result) {
    if (result && typeof result === 'object' && typeof result.ok === 'boolean') {
        return result.ok ? 'ok' : 'error';
    }
    if (result === true) return 'true';
    if (result === false) return 'false';
    if (result == null) return 'empty';
    return typeof result;
}

function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
}

function createSettledCommandResult(command, { ok = false, value = undefined, error = null, resultStatus = '' } = {}) {
    return {
        ok: ok === true,
        ...summarizeCommandPayload(command),
        resultStatus: normalizeString(
            resultStatus,
            ok ? summarizeCommandResult(value) : 'error'
        ),
        value,
        errorMessage: error instanceof Error
            ? error.message
            : normalizeString(error, ok ? '' : 'command execution failed'),
    };
}

export class SessionRuntimeCommandExecutor {
    constructor({ facade = null } = {}) {
        this._facade = facade || null;
    }

    execute(command = null) {
        const normalizedCommand = normalizeSessionRuntimeCommand(command);
        if (!normalizedCommand) {
            const invalidCommand = createObservedCommandInput(command);
            this._recordCommandObservation(invalidCommand, 'received');
            this._recordCommandFailure(
                invalidCommand,
                'invalid_command',
                INVALID_COMMAND_ERROR_MESSAGE,
                INVALID_COMMAND_ERROR_MESSAGE
            );
            return undefined;
        }
        this._recordCommandObservation(normalizedCommand, 'received');
        let result;
        try {
            result = this._dispatchCommand(normalizedCommand);
        } catch (error) {
            this._recordCommandFailure(normalizedCommand, 'threw', error, 'command execution failed');
            throw error;
        }
        return this._trackCommandResult(normalizedCommand, result);
    }

    executeResult(command = null) {
        const normalizedCommand = normalizeSessionRuntimeCommand(command);
        if (!normalizedCommand) {
            const invalidCommand = createObservedCommandInput(command);
            this._recordCommandObservation(invalidCommand, 'received');
            this._recordCommandFailure(
                invalidCommand,
                'invalid_command',
                INVALID_COMMAND_ERROR_MESSAGE,
                INVALID_COMMAND_ERROR_MESSAGE
            );
            return Promise.resolve(createSettledCommandResult(invalidCommand, {
                ok: false,
                error: INVALID_COMMAND_ERROR_MESSAGE,
                resultStatus: 'invalid_command',
            }));
        }
        this._recordCommandObservation(normalizedCommand, 'received');
        let result;
        try {
            result = this._dispatchCommand(normalizedCommand);
        } catch (error) {
            this._recordCommandFailure(normalizedCommand, 'threw', error, 'command execution failed');
            return Promise.resolve(createSettledCommandResult(normalizedCommand, {
                ok: false,
                error,
                resultStatus: 'threw',
            }));
        }
        return this._trackSettledCommandResult(normalizedCommand, result);
    }

    _dispatchCommand(command) {
        const payload = command?.payload;
        switch (command.type) {
        case SESSION_RUNTIME_COMMAND_TYPES.APPLY_SETTINGS:
            return this._executeApplySettings(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.INITIALIZE_SESSION:
            return this._executeInitializeSession(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.START_MATCH:
            return this._executeStartMatch(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.PAUSE_MATCH:
            return this._executePauseMatch(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.RESUME_MATCH:
            return this._executeResumeMatch(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.RETURN_TO_MENU:
            return this._executeReturnToMenu(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.FINALIZE_MATCH:
            return this._executeFinalizeMatch(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.HOST_LOBBY:
            return this._executeHostLobby(payload);
        case SESSION_RUNTIME_COMMAND_TYPES.JOIN_LOBBY:
            return this._executeJoinLobby(payload);
        default:
            return undefined;
        }
    }

    _recordCommandObservation(command, phase, extra = null) {
        recordSessionRuntimeEvent(this._facade?.getRuntimeBundle?.() || this._facade?.game, {
            type: SESSION_RUNTIME_EVENT_TYPES.COMMAND_OBSERVED,
            source: 'session_runtime_command_executor',
            payload: {
                phase: normalizeString(phase, 'received'),
                ...summarizeCommandPayload(command),
                ...(extra && typeof extra === 'object' ? extra : {}),
            },
        });
    }

    _recordCommandFailure(command, resultStatus, error, fallbackMessage) {
        this._recordCommandObservation(command, 'failed', {
            resultStatus: normalizeString(resultStatus, 'error'),
            errorMessage: error instanceof Error ? error.message : normalizeString(fallbackMessage, 'command execution failed'),
        });
    }

    _trackCommandResult(command, result) {
        if (isPromiseLike(result)) {
            const trackedPromise = Promise.resolve(result)
                .then((resolvedResult) => {
                    this._recordCommandObservation(command, 'completed', {
                        resultStatus: summarizeCommandResult(resolvedResult),
                    });
                    return resolvedResult;
                })
                .catch((error) => {
                    this._recordCommandFailure(command, 'rejected', error, 'command promise rejected');
                    throw error;
                });
            trackedPromise.catch(() => {});
            return trackedPromise;
        }
        this._recordCommandObservation(command, 'completed', {
            resultStatus: summarizeCommandResult(result),
        });
        return result;
    }

    _trackSettledCommandResult(command, result) {
        if (isPromiseLike(result)) {
            return Promise.resolve(result)
                .then((resolvedResult) => {
                    const resultStatus = summarizeCommandResult(resolvedResult);
                    this._recordCommandObservation(command, 'completed', {
                        resultStatus,
                    });
                    return createSettledCommandResult(command, {
                        ok: true,
                        value: resolvedResult,
                        resultStatus,
                    });
                })
                .catch((error) => {
                    this._recordCommandFailure(command, 'rejected', error, 'command promise rejected');
                    return createSettledCommandResult(command, {
                        ok: false,
                        error,
                        resultStatus: 'rejected',
                    });
                });
        }
        const resultStatus = summarizeCommandResult(result);
        this._recordCommandObservation(command, 'completed', {
            resultStatus,
        });
        return Promise.resolve(createSettledCommandResult(command, {
            ok: true,
            value: result,
            resultStatus,
        }));
    }

    _executeApplySettings(options = undefined) {
        return applyCommandRuntimeSettings(this._facade, options);
    }

    _executeInitializeSession(options = undefined) {
        return this._facade?.sessionHandler?.initializeSession?.(options);
    }

    _executeStartMatch(options = undefined) {
        if (!this._facade?.game) return false;
        return this._facade?.sessionHandler?.startMatch?.(options);
    }

    _executePauseMatch(options = undefined) {
        return this._facade?.sessionHandler?.pauseMatch?.(options);
    }

    _executeResumeMatch(options = undefined) {
        return this._facade?.sessionHandler?.resumeMatch?.(options);
    }

    _executeReturnToMenu(options = undefined) {
        return this._facade?.sessionHandler?.returnToMenu?.(options);
    }

    _executeFinalizeMatch(options = undefined) {
        const reason = typeof options?.reason === 'string' && options.reason.trim()
            ? options.reason.trim()
            : SESSION_FINALIZE_TRIGGERS.RETURN_TO_MENU;
        return finalizeMatchFlow(this._facade, options, reason);
    }

    _executeHostLobby(options = undefined) {
        const facade = this._facade;
        return handleMultiplayerHostAction({
            game: facade?.game,
            event: {
                lobbyCode: options?.lobbyCode,
            },
            resolveMenuAccessContext: () => facade?._resolveMenuAccessContext?.(),
            menuMultiplayerBridge: facade?.menuMultiplayerBridge,
            syncUiState: () => facade?._syncMultiplayerUiState?.(),
            captureSettingsSnapshot: () => facade?._captureMultiplayerMatchSettings?.(),
            runtimeSource: facade?.getRuntimeBundle?.() || facade?.game,
        });
    }

    _executeJoinLobby(options = undefined) {
        const facade = this._facade;
        return handleMultiplayerJoinAction({
            game: facade?.game,
            event: {
                lobbyCode: options?.lobbyCode,
            },
            resolveMenuAccessContext: () => facade?._resolveMenuAccessContext?.(),
            menuMultiplayerBridge: facade?.menuMultiplayerBridge,
            syncUiState: () => facade?._syncMultiplayerUiState?.(),
            runtimeSource: facade?.getRuntimeBundle?.() || facade?.game,
        });
    }
}
