import { GAME_STATE_IDS } from '../../shared/contracts/GameStateIds.js';
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

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
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

export class SessionRuntimeCommandExecutor {
    constructor({ facade = null } = {}) {
        this._facade = facade || null;
    }

    execute(command = null) {
        const normalizedCommand = normalizeSessionRuntimeCommand(command);
        if (!normalizedCommand) return undefined;
        this._recordCommandObservation(normalizedCommand, 'received');
        let result;
        try {
            switch (normalizedCommand.type) {
        case SESSION_RUNTIME_COMMAND_TYPES.APPLY_SETTINGS:
                result = this._executeApplySettings(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.INITIALIZE_SESSION:
                result = this._executeInitializeSession(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.START_MATCH:
                result = this._executeStartMatch(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.PAUSE_MATCH:
                result = this._executePauseMatch(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.RESUME_MATCH:
                result = this._executeResumeMatch(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.RETURN_TO_MENU:
                result = this._executeReturnToMenu(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.FINALIZE_MATCH:
                result = this._executeFinalizeMatch(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.HOST_LOBBY:
                result = this._executeHostLobby(normalizedCommand.payload);
                break;
        case SESSION_RUNTIME_COMMAND_TYPES.JOIN_LOBBY:
                result = this._executeJoinLobby(normalizedCommand.payload);
                break;
        default:
                result = undefined;
            }
        } catch (error) {
            this._recordCommandObservation(normalizedCommand, 'failed', {
                resultStatus: 'threw',
                errorMessage: error instanceof Error ? error.message : 'command execution failed',
            });
            throw error;
        }
        return this._trackCommandResult(normalizedCommand, result);
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

    _trackCommandResult(command, result) {
        if (result && typeof result.then === 'function') {
            return Promise.resolve(result)
                .then((resolvedResult) => {
                    this._recordCommandObservation(command, 'completed', {
                        resultStatus: summarizeCommandResult(resolvedResult),
                    });
                    return resolvedResult;
                })
                .catch((error) => {
                    this._recordCommandObservation(command, 'failed', {
                        resultStatus: 'rejected',
                        errorMessage: error instanceof Error ? error.message : 'command promise rejected',
                    });
                    throw error;
                });
        }
        this._recordCommandObservation(command, 'completed', {
            resultStatus: summarizeCommandResult(result),
        });
        return result;
    }

    _executeApplySettings(options = undefined) {
        return this._facade?._applySettingsToRuntimeInternal?.(options);
    }

    _executeInitializeSession(options = undefined) {
        return this._facade?.sessionHandler?.initializeSession?.(options);
    }

    _executeStartMatch(options = undefined) {
        const facade = this._facade;
        const game = facade?.game;
        if (!game || game.state !== GAME_STATE_IDS.MENU) return false;
        if (options?.settingsSnapshot) {
            facade?._applyAuthoritativeMultiplayerMatchSettings?.(options.settingsSnapshot);
            facade?.getUiManager?.()?.clearStartValidationError?.();
            const startResult = facade?.getPorts?.()?.matchUiPort?.applyStartMatchProjection?.();
            return startResult !== false;
        }
        return facade?.sessionHandler?.startMatch?.(options);
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
