import { GAME_STATE_IDS } from '../../shared/contracts/GameStateIds.js';
import { SESSION_FINALIZE_TRIGGERS } from '../../shared/contracts/MatchLifecycleContract.js';
import {
    createFinalizeMatchCommand,
    normalizeSessionRuntimeCommand,
    SESSION_RUNTIME_COMMAND_TYPES,
} from '../../shared/contracts/SessionRuntimeCommandContract.js';
import { finalizeMatchFlow } from '../../core/runtime/MatchFinalizeFlowService.js';
import {
    handleMultiplayerHostAction,
    handleMultiplayerJoinAction,
} from '../../core/runtime/MenuRuntimeMultiplayerService.js';

export class SessionRuntimeCommandExecutor {
    constructor({ facade = null } = {}) {
        this._facade = facade || null;
    }

    execute(command = null) {
        const normalizedCommand = normalizeSessionRuntimeCommand(command);
        if (!normalizedCommand) return undefined;

        switch (normalizedCommand.type) {
        case SESSION_RUNTIME_COMMAND_TYPES.APPLY_SETTINGS:
            return this._executeApplySettings(normalizedCommand.payload);
        case SESSION_RUNTIME_COMMAND_TYPES.INITIALIZE_SESSION:
            return this._executeInitializeSession(normalizedCommand.payload);
        case SESSION_RUNTIME_COMMAND_TYPES.START_MATCH:
            return this._executeStartMatch(normalizedCommand.payload);
        case SESSION_RUNTIME_COMMAND_TYPES.RETURN_TO_MENU:
            return this._executeReturnToMenu(normalizedCommand.payload);
        case SESSION_RUNTIME_COMMAND_TYPES.FINALIZE_MATCH:
            return this._executeFinalizeMatch(normalizedCommand.payload);
        case SESSION_RUNTIME_COMMAND_TYPES.HOST_LOBBY:
            return this._executeHostLobby(normalizedCommand.payload);
        case SESSION_RUNTIME_COMMAND_TYPES.JOIN_LOBBY:
            return this._executeJoinLobby(normalizedCommand.payload);
        default:
            return undefined;
        }
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
        if (options?.settingsSnapshot) {
            if (!game || game.state !== GAME_STATE_IDS.MENU) return false;
            facade?._applyAuthoritativeMultiplayerMatchSettings?.(options.settingsSnapshot);
            facade?.getUiManager?.()?.clearStartValidationError?.();
            const startResult = facade?.getPorts?.()?.matchUiPort?.startMatch?.();
            return startResult !== false;
        }
        return facade?.sessionHandler?.startMatch?.(options);
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
        });
    }
}
