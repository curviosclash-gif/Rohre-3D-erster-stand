import { GAME_STATE_IDS } from '../../shared/contracts/GameStateIds.js';
import { SESSION_FINALIZE_TRIGGERS } from '../../shared/contracts/MatchLifecycleContract.js';
import { RUNTIME_SESSION_TYPES, resolveRuntimeSessionContract } from '../../shared/contracts/RuntimeSessionContract.js';
import { applyCommandRuntimeSettings } from './RuntimeCommandSettingsService.js';
import { requestRuntimeMultiplayerMatchStart } from './RuntimeMultiplayerFlowService.js';
import {
    initRuntimeSession,
    teardownRuntimeSession,
    waitForRuntimePlayersLoaded,
} from './RuntimeSessionLifecycleService.js';

const TERMINAL_START_BLOCKING_FINALIZE_REASONS = new Set([
    SESSION_FINALIZE_TRIGGERS.GAME_DISPOSE,
    SESSION_FINALIZE_TRIGGERS.WINDOW_SHUTDOWN,
]);
const TERMINAL_DISPOSE_FINALIZE_STATES = new Set([
    'idle',
    'finalized',
    'error',
]);

function createDeferred() {
    let resolve = null;
    let reject = null;
    const promise = new Promise((nextResolve, nextReject) => {
        resolve = nextResolve;
        reject = nextReject;
    });
    promise.catch(() => {});
    return { promise, resolve, reject };
}

export class GameRuntimeSessionHandler {
    constructor({ facade = null, logger = console } = {}) {
        this._facade = facade || null;
        this._logger = logger;
        this._pendingStartMatch = null;
        this._pendingDispose = null;
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

    _getSessionRuntimeSnapshot() {
        return this._facade?.getPorts?.()?.runtimeProjectionPort?.getSessionRuntimeSnapshot?.() || null;
    }

    _isTerminalStartBarrier(reason = '') {
        return TERMINAL_START_BLOCKING_FINALIZE_REASONS.has(String(reason || '').trim());
    }

    _recordBlockedStart(telemetryPayload, reason, extra = undefined) {
        this._facade?._recordMenuTelemetry?.('abort', {
            ...telemetryPayload,
            reason,
            ...(extra && typeof extra === 'object' ? extra : {}),
        });
    }

    _awaitPendingFinalizeForStart(telemetryPayload) {
        const facade = this._facade;
        const sessionSnapshot = this._getSessionRuntimeSnapshot();
        if (sessionSnapshot?.lifecycleState === 'disposed' || sessionSnapshot?.finalizeState === 'error') {
            this._recordBlockedStart(telemetryPayload, 'start_blocked_by_runtime_state', {
                lifecycleState: sessionSnapshot?.lifecycleState || '',
                finalizeState: sessionSnapshot?.finalizeState || '',
            });
            return false;
        }
        const pendingFinalize = facade?._pendingMatchFinalize;
        const pendingReason = String(facade?._pendingMatchFinalizePlan?.reason || sessionSnapshot?.pendingFinalizeTrigger || '').trim();
        if (!pendingFinalize) {
            return true;
        }
        if (this._isTerminalStartBarrier(pendingReason)) {
            this._recordBlockedStart(telemetryPayload, 'start_blocked_by_terminal_finalize', {
                pendingFinalizeReason: pendingReason,
            });
            return false;
        }
        return Promise.resolve(pendingFinalize)
            .then((finalizeResult) => {
                const nextSnapshot = this._getSessionRuntimeSnapshot();
                if (finalizeResult === false || nextSnapshot?.finalizeState === 'error' || nextSnapshot?.lifecycleState === 'disposed') {
                    this._recordBlockedStart(telemetryPayload, 'start_blocked_after_finalize_wait', {
                        pendingFinalizeReason: pendingReason,
                        finalizeResult: finalizeResult === false ? 'false' : 'ok',
                        lifecycleState: nextSnapshot?.lifecycleState || '',
                        finalizeState: nextSnapshot?.finalizeState || '',
                    });
                    return false;
                }
                return true;
            })
            .catch((error) => {
                this._logger?.error?.('startMatch finalize barrier failed:', error);
                this._recordBlockedStart(telemetryPayload, 'start_blocked_after_finalize_rejection', {
                    pendingFinalizeReason: pendingReason,
                });
                return false;
            });
    }

    _startMatchAfterGuards(options = undefined) {
        const facade = this._facade;
        const game = facade?.game;
        if (!game) {
            return false;
        }
        if (options?.settingsSnapshot && game.state !== null && game.state !== undefined && game.state !== GAME_STATE_IDS.MENU) {
            return false;
        }
        facade?._clearMatchPrewarmTimer?.();
        const buildTelemetryPayload = () => {
            const sessionContract = resolveRuntimeSessionContract(game?.settings?.localSettings);
            return {
                sessionType: sessionContract.sessionType,
                multiplayerTransport: sessionContract.multiplayerTransport,
                modePath: game?.settings?.localSettings?.modePath || 'normal',
            };
        };
        const startBarrier = this._awaitPendingFinalizeForStart(buildTelemetryPayload());
        const runStartAttempt = () => {
            applyCommandRuntimeSettings(facade, {
                ...(options && typeof options === 'object' ? options : {}),
                schedulePrewarm: false,
            });
            const sessionContract = resolveRuntimeSessionContract(game?.settings?.localSettings);
            const telemetryPayload = buildTelemetryPayload();
            facade?._recordMenuTelemetry?.('start_attempt', telemetryPayload);
            const validationIssue = facade?._resolveStartValidationIssue?.();
            if (validationIssue) {
                facade?.game?.uiManager?.showStartValidationError?.(validationIssue, { focusField: true });
                this._recordBlockedStart(telemetryPayload, 'start_validation_failed', {
                    fieldKey: validationIssue.fieldKey,
                });
                facade?.game?._showStatusToast?.(validationIssue.message, 1700, 'error');
                return false;
            }

            facade?.getUiManager?.()?.clearStartValidationError?.();
            if (sessionContract.sessionType === RUNTIME_SESSION_TYPES.MULTIPLAYER) {
                return requestRuntimeMultiplayerMatchStart({
                    game: facade?.game,
                    menuMultiplayerBridge: facade?.menuMultiplayerBridge,
                    captureSettingsSnapshot: () => facade?._captureMultiplayerMatchSettings?.(),
                    recordMenuTelemetry: (eventType, payload) => facade?._recordMenuTelemetry?.(eventType, payload),
                });
            }
            const startResult = facade?.getPorts?.()?.matchUiPort?.applyStartMatchProjection?.();
            return startResult !== false;
        };
        if (startBarrier && typeof startBarrier.then === 'function') {
            return Promise.resolve(startBarrier).then((canStart) => (canStart ? runStartAttempt() : false));
        }
        return startBarrier === false ? false : runStartAttempt();
    }

    startMatch(options = undefined) {
        if (this._pendingStartMatch) {
            return this._pendingStartMatch;
        }
        const deferred = createDeferred();
        this._pendingStartMatch = deferred.promise;
        try {
            const startResult = this._startMatchAfterGuards(options);
            if (startResult && typeof startResult.then === 'function') {
                Promise.resolve(startResult)
                    .then((resolvedResult) => {
                        deferred.resolve(resolvedResult);
                    })
                    .catch((error) => {
                        deferred.reject(error);
                    })
                    .finally(() => {
                        if (this._pendingStartMatch === deferred.promise) {
                            this._pendingStartMatch = null;
                        }
                    });
                return deferred.promise;
            }
            deferred.resolve(startResult);
            if (this._pendingStartMatch === deferred.promise) {
                this._pendingStartMatch = null;
            }
            return startResult;
        } catch (error) {
            deferred.reject(error);
            if (this._pendingStartMatch === deferred.promise) {
                this._pendingStartMatch = null;
            }
            throw error;
        }
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

    _disposeMenuRefs() {
        const facade = this._facade;
        facade?.game?.menuController?.dispose?.();
        facade?.game?.menuMultiplayerBridge?.dispose?.();
        if (facade?.game) {
            facade.game.menuController = null;
            facade.game.menuMultiplayerBridge = null;
        }
    }

    _isDisposeFinalizeTerminal(sessionSnapshot = null) {
        const lifecycleState = String(sessionSnapshot?.lifecycleState || '').trim();
        const finalizeState = String(sessionSnapshot?.finalizeState || '').trim();
        return lifecycleState === 'disposed' || TERMINAL_DISPOSE_FINALIZE_STATES.has(finalizeState);
    }

    dispose() {
        if (this._pendingDispose) {
            return this._pendingDispose;
        }
        const facade = this._facade;
        facade?._clearMatchPrewarmTimer?.();
        const trackedDispose = Promise.resolve()
            .then(() => {
                if (typeof facade?.finalizeMatch !== 'function') {
                    return false;
                }
                return facade.finalizeMatch({
                    reason: SESSION_FINALIZE_TRIGGERS.GAME_DISPOSE,
                    notifyMenuOpened: false,
                    applyReturnToMenuUi: false,
                    schedulePrewarm: false,
                });
            })
            .catch((error) => {
                this._logger?.error?.('dispose finalize failed:', error);
                return false;
            })
            .then((finalizeResult) => {
                const sessionSnapshot = this._getSessionRuntimeSnapshot();
                if (sessionSnapshot && !this._isDisposeFinalizeTerminal(sessionSnapshot)) {
                    this._logger?.warn?.('dispose settled without terminal runtime state', {
                        lifecycleState: sessionSnapshot.lifecycleState || '',
                        finalizeState: sessionSnapshot.finalizeState || '',
                        finalizeErrorMessage: sessionSnapshot.finalizeErrorMessage || '',
                    });
                }
                this._disposeMenuRefs();
                return finalizeResult !== false;
            })
            .finally(() => {
                if (this._pendingDispose === trackedDispose) {
                    this._pendingDispose = null;
                }
            });
        this._pendingDispose = trackedDispose;
        return trackedDispose;
    }
}
