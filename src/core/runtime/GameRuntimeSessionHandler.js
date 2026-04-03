import { SESSION_FINALIZE_TRIGGERS } from '../../shared/contracts/MatchLifecycleContract.js';
import { RUNTIME_SESSION_TYPES, resolveRuntimeSessionContract } from '../../shared/contracts/RuntimeSessionContract.js';
import { requestRuntimeMultiplayerMatchStart } from './RuntimeMultiplayerFlowService.js';
import {
    initRuntimeSession,
    teardownRuntimeSession,
    waitForRuntimePlayersLoaded,
} from './RuntimeSessionLifecycleService.js';

export class GameRuntimeSessionHandler {
    constructor({ facade = null, logger = console } = {}) {
        this._facade = facade || null;
        this._logger = logger;
    }

    async initializeSession(_options = undefined) {
        return initRuntimeSession(this._facade);
    }

    async waitForAllPlayersLoaded() {
        return waitForRuntimePlayersLoaded(this._facade);
    }

    teardownRuntimeSession() {
        teardownRuntimeSession(this._facade);
    }

    isNetworkSession() {
        return !!this._facade?.game?.runtimeConfig?.session?.networkEnabled;
    }

    isHost() {
        return this._facade?.session?.isHost ?? true;
    }

    startMatch(_options = undefined) {
        const facade = this._facade;
        facade?._clearMatchPrewarmTimer?.();
        const sessionContract = resolveRuntimeSessionContract(facade?.game?.settings?.localSettings);
        const telemetryPayload = {
            sessionType: sessionContract.sessionType,
            multiplayerTransport: sessionContract.multiplayerTransport,
            modePath: facade?.game?.settings?.localSettings?.modePath || 'normal',
        };
        facade?._recordMenuTelemetry?.('start_attempt', telemetryPayload);
        const validationIssue = facade?._resolveStartValidationIssue?.();
        if (validationIssue) {
            facade?.game?.uiManager?.showStartValidationError?.(validationIssue, { focusField: true });
            facade?._recordMenuTelemetry?.('abort', {
                ...telemetryPayload,
                reason: 'start_validation_failed',
                fieldKey: validationIssue.fieldKey,
            });
            facade?.game?._showStatusToast?.(validationIssue.message, 1700, 'error');
            return false;
        }

        facade?.game?.uiManager?.clearStartValidationError?.();
        if (sessionContract.sessionType === RUNTIME_SESSION_TYPES.MULTIPLAYER) {
            return requestRuntimeMultiplayerMatchStart({
                game: facade?.game,
                menuMultiplayerBridge: facade?.menuMultiplayerBridge,
                captureSettingsSnapshot: () => facade?._captureMultiplayerMatchSettings?.(),
                recordMenuTelemetry: (eventType, payload) => facade?._recordMenuTelemetry?.(eventType, payload),
            });
        }
        const startResult = facade?.ports?.matchUiPort?.applyStartMatchProjection?.();
        return startResult !== false;
    }

    pauseMatch() {
        const facade = this._facade;
        if (this.isNetworkSession() && !this.isHost()) {
            facade?.ports?.matchUiPort?.applyDisconnectConfirmationProjection?.();
            return false;
        }
        facade?.ports?.matchUiPort?.applyPauseMatchProjection?.();
        return true;
    }

    resumeMatch() {
        this._facade?.ports?.matchUiPort?.applyResumeMatchProjection?.();
        return true;
    }

    restartRound() {
        this._facade?.ports?.matchUiPort?.startRound?.();
    }

    returnToMenu(options = {}) {
        return this._facade?.finalizeMatch?.({
            ...options,
            reason: options?.reason || SESSION_FINALIZE_TRIGGERS.RETURN_TO_MENU,
            notifyMenuOpened: true,
            applyReturnToMenuUi: true,
            schedulePrewarm: true,
        }, SESSION_FINALIZE_TRIGGERS.RETURN_TO_MENU);
    }

    syncP2HudVisibility() {
        const game = this._facade?.game;
        game?.ui?.p2Hud?.classList?.toggle('hidden', game.numHumans !== 2);
    }

    dispose() {
        const facade = this._facade;
        facade?._clearMatchPrewarmTimer?.();
        Promise.resolve(facade?.finalizeMatch?.({
            reason: SESSION_FINALIZE_TRIGGERS.GAME_DISPOSE,
            notifyMenuOpened: false,
            applyReturnToMenuUi: false,
            schedulePrewarm: false,
        })).catch((error) => {
            this._logger?.error?.('dispose finalize failed:', error);
        });
        facade?.game?.menuController?.dispose?.();
        facade?.game?.menuMultiplayerBridge?.dispose?.();
        if (facade?.game) {
            facade.game.menuController = null;
            facade.game.menuMultiplayerBridge = null;
        }
    }
}
