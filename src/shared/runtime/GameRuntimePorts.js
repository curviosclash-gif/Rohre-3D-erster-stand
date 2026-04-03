import { GAME_STATE_IDS } from '../contracts/GameStateIds.js';
import {
    createMatchFlowSnapshot,
    createSessionRuntimeSnapshot,
} from '../contracts/SessionRuntimeSnapshotContract.js';

function noop() {}

function getRuntimeBundle(game) {
    return game?.runtimeBundle || null;
}

function getSessionRuntime(game) {
    return getRuntimeBundle(game)?.sessionRuntime || game?.sessionRuntime || null;
}

function getRuntimeState(game) {
    return getRuntimeBundle(game)?.state || null;
}

function getRuntimeComponents(game) {
    return getRuntimeBundle(game)?.components || null;
}

function getRuntimeComponent(game, key) {
    return getRuntimeComponents(game)?.[key] || null;
}

function getRuntimeFacade(game) {
    return getRuntimeComponent(game, 'runtimeFacade') || game?.runtimeFacade || null;
}

function getRuntimeCoordinator(game) {
    return getRuntimeComponent(game, 'runtimeCoordinator') || game?.runtimeCoordinator || null;
}

function buildSessionRuntimeProjection(game) {
    const sessionRuntime = getSessionRuntime(game);
    const lifecycle = sessionRuntime?.lifecycle || {};
    const finalize = sessionRuntime?.finalize || {};
    const session = sessionRuntime?.session || {};
    const facade = getRuntimeFacade(game);
    const updatedAt = Math.max(
        Number(lifecycle.updatedAt) || 0,
        Number(finalize.updatedAt) || 0
    );

    return createSessionRuntimeSnapshot({
        sessionId: session.activeSessionId || null,
        lifecycleState: lifecycle.status || 'unknown',
        finalizeState: finalize.status || 'idle',
        gameStateId: lifecycle.gameStateId || game?.state || '',
        isNetworkSession: facade?.isNetworkSession?.() === true,
        isHost: facade?.isHost?.() !== false,
        pendingSessionInit: !!lifecycle.pendingSessionInit,
        pendingFinalizeTrigger: finalize.lastTrigger || '',
        updatedAt,
    });
}

function buildMatchFlowProjection(game) {
    const sessionSnapshot = buildSessionRuntimeProjection(game);
    const gameStateId = sessionSnapshot.gameStateId || game?.state || GAME_STATE_IDS.MENU;
    return createMatchFlowSnapshot({
        sessionId: sessionSnapshot.sessionId,
        gameStateId,
        uiStateId: gameStateId,
        roundStateId: gameStateId === GAME_STATE_IDS.ROUND_END ? GAME_STATE_IDS.ROUND_END : '',
        isPaused: gameStateId === GAME_STATE_IDS.PAUSED,
        canReturnToMenu: gameStateId !== GAME_STATE_IDS.MENU && sessionSnapshot.finalizeState !== 'finalizing',
        pendingFinalizeTrigger: sessionSnapshot.pendingFinalizeTrigger,
        isNetworkSession: sessionSnapshot.isNetworkSession,
        isHost: sessionSnapshot.isHost,
        lifecycleState: sessionSnapshot.lifecycleState,
        finalizeState: sessionSnapshot.finalizeState,
        updatedAt: sessionSnapshot.updatedAt,
    });
}

function callRuntimeIntent(game, methodName, options = undefined) {
    const coordinator = getRuntimeCoordinator(game);
    if (typeof coordinator?.[methodName] === 'function') {
        return coordinator[methodName](options);
    }
    return getRuntimeFacade(game)?.[methodName]?.(options);
}

export function createSettingsPort(game) {
    return {
        getSettings: () => game?.settings || null,
        getRuntimeConfig: () => getRuntimeState(game)?.runtimeConfig || game?.runtimeConfig || null,
        applyAutoRoll(value) {
            const checked = !!value;
            const runtimeState = getRuntimeState(game);
            if (game?.settings) {
                game.settings.autoRoll = checked;
            }
            if (runtimeState?.runtimeConfig?.player) {
                runtimeState.runtimeConfig.player.autoRoll = checked;
                return;
            }
            if (game?.runtimeConfig?.player) {
                game.runtimeConfig.player.autoRoll = checked;
            }
        },
        setBindings(bindings) {
            getRuntimeComponents(game)?.input?.setBindings?.(bindings);
        },
        syncUiByChangedKeys(changedKeys) {
            if (Array.isArray(changedKeys) && changedKeys.length > 0) {
                game?.uiManager?.syncByChangeKeys?.(changedKeys);
                return;
            }
            game?.uiManager?.syncAll?.();
        },
        clearStartValidationError() {
            game?.uiManager?.clearStartValidationError?.();
        },
    };
}

export function createUiFeedbackPort(game) {
    return {
        getUi: () => getRuntimeComponents(game)?.ui || game?.ui || null,
        showStatusToast(message, durationMs, tone) {
            game?._showStatusToast?.(message, durationMs, tone);
        },
        syncAll() {
            game?.uiManager?.syncAll?.();
        },
        showMenuPanel(panelId, options = undefined) {
            game?.uiManager?.menuNavigationRuntime?.showPanel?.(panelId, options);
        },
        toggleP2Hud(isVisible) {
            getRuntimeComponents(game)?.hudP2?.setVisibility?.(!!isVisible);
        },
    };
}

export function createSessionPort(game) {
    return {
        getGame: () => game || null,
        getState: () => game?.state || null,
        setState(state) {
            if (game) {
                game.state = state;
            }
        },
        getEntityManager: () => getRuntimeState(game)?.entityManager || game?.entityManager || null,
        clearLastRoundGhost() {
            const entityManager = getRuntimeState(game)?.entityManager || game?.entityManager || null;
            entityManager?.clearLastRoundGhost?.();
        },
        finalizeMatchSession(options = undefined) {
            const matchSessionOrchestrator = getRuntimeComponent(game, 'matchSessionOrchestrator');
            return matchSessionOrchestrator?.finalizeMatchSession?.(options)
                ?? matchSessionOrchestrator?.teardownMatchSession?.(options);
        },
        teardownMatchSession(options = undefined) {
            return this.finalizeMatchSession(options);
        },
        requestDeltaReset(reason) {
            const gameLoop = getRuntimeComponent(game, 'gameLoop') || game?.gameLoop || null;
            gameLoop?.requestDeltaReset?.(reason);
        },
    };
}

export function createRenderPort(game) {
    return {
        setSplitScreen(isEnabled) {
            getRuntimeComponents(game)?.renderer?.setSplitScreen?.(!!isEnabled);
        },
        setShadowQuality(level) {
            getRuntimeComponents(game)?.renderer?.setShadowQuality?.(level);
        },
        syncPortalBeams(isEnabled) {
            const arena = getRuntimeState(game)?.arena || game?.arena || null;
            arena?.toggleBeams?.(!!isEnabled);
        },
    };
}

export function createInputPort(game) {
    return {
        clearJustPressed() {
            getRuntimeComponent(game, 'input')?.clearJustPressed?.();
        },
        startKeyCapture(playerKey, action) {
            const keybindEditorController = getRuntimeComponent(game, 'keybindEditorController') || game?.keybindEditorController || null;
            keybindEditorController?.startKeyCapture?.(playerKey, action);
        },
        clearPlayerSources() {
            getRuntimeComponent(game, 'input')?.clearPlayerSources?.();
        },
    };
}

export function createLifecyclePort(game) {
    return {
        initializeSession() {
            return getRuntimeCoordinator(game)?.initializeSession?.()
                ?? getRuntimeFacade(game)?.initializeSession?.();
        },
        waitForAllPlayersLoaded() {
            return getRuntimeCoordinator(game)?.waitForAllPlayersLoaded?.()
                ?? getRuntimeFacade(game)?.waitForAllPlayersLoaded?.();
        },
        teardownRuntimeSession() {
            return getRuntimeCoordinator(game)?.teardownRuntimeSession?.()
                ?? getRuntimeFacade(game)?.teardownRuntimeSession?.();
        },
        startArcadeRunIfEnabled() {
            return getRuntimeCoordinator(game)?.startArcadeRunIfEnabled?.()
                ?? getRuntimeFacade(game)?.startArcadeRunIfEnabled?.();
        },
        returnToMenu(options = undefined) {
            return getRuntimeCoordinator(game)?.returnToMenu?.(options)
                ?? getRuntimeFacade(game)?.returnToMenu?.(options);
        },
    };
}

export function createRuntimeIntentPort(game) {
    return {
        startMatch(options = undefined) {
            return callRuntimeIntent(game, 'startMatch', options);
        },
        pauseMatch(options = undefined) {
            return callRuntimeIntent(game, 'pauseMatch', options);
        },
        resumeMatch(options = undefined) {
            return callRuntimeIntent(game, 'resumeMatch', options);
        },
        returnToMenu(options = undefined) {
            return callRuntimeIntent(game, 'returnToMenu', options);
        },
        finalizeMatch(options = undefined) {
            return callRuntimeIntent(game, 'finalizeMatch', options);
        },
        hostLobby(options = undefined) {
            return callRuntimeIntent(game, 'hostLobby', options);
        },
        joinLobby(options = undefined) {
            return callRuntimeIntent(game, 'joinLobby', options);
        },
    };
}

export function createRuntimeProjectionPort(game) {
    return {
        getSessionRuntimeSnapshot() {
            return buildSessionRuntimeProjection(game);
        },
        getMatchFlowSnapshot() {
            return buildMatchFlowProjection(game);
        },
    };
}

export function createMatchUiPort(game) {
    return {
        applyStartMatchProjection() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.applyStartMatchProjection?.();
        },
        startMatch() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.applyStartMatchProjection?.();
        },
        applyPauseMatchProjection() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.applyPauseProjection?.();
        },
        applyResumeMatchProjection() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.applyResumeProjection?.();
        },
        applyDisconnectConfirmationProjection() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.applyDisconnectConfirmationProjection?.();
        },
        startRound() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.startRound?.();
        },
        applyReturnToMenuUi(options = undefined) {
            return getRuntimeComponent(game, 'matchFlowUiController')?.applyReturnToMenuUi?.(options);
        },
        setupPauseOverlayListeners() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.setupPauseOverlayListeners?.();
        },
    };
}

export function createRuntimePorts(game) {
    const settingsPort = createSettingsPort(game);
    const uiFeedbackPort = createUiFeedbackPort(game);
    const sessionPort = createSessionPort(game);
    const renderPort = createRenderPort(game);
    const inputPort = createInputPort(game);
    const lifecyclePort = createLifecyclePort(game);
    const runtimeIntentPort = createRuntimeIntentPort(game);
    const runtimeProjectionPort = createRuntimeProjectionPort(game);
    const matchUiPort = createMatchUiPort(game);
    return {
        settingsPort,
        uiFeedbackPort,
        sessionPort,
        renderPort,
        inputPort,
        lifecyclePort,
        runtimeIntentPort,
        runtimeProjectionPort,
        matchUiPort,
        dispose: noop,
    };
}
