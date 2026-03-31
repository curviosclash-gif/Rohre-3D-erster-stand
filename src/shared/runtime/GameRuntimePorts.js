function noop() {}

function getRuntimeBundle(game) {
    return game?.runtimeBundle || null;
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
        teardownMatchSession(options = undefined) {
            const matchSessionOrchestrator = getRuntimeComponent(game, 'matchSessionOrchestrator');
            matchSessionOrchestrator?.teardownMatchSession?.(options);
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
            return getRuntimeFacade(game)?.initializeSession?.();
        },
        waitForAllPlayersLoaded() {
            return getRuntimeFacade(game)?.waitForAllPlayersLoaded?.();
        },
        teardownRuntimeSession() {
            return getRuntimeFacade(game)?.teardownRuntimeSession?.();
        },
        startArcadeRunIfEnabled() {
            return getRuntimeFacade(game)?.startArcadeRunIfEnabled?.();
        },
        returnToMenu(options = undefined) {
            return getRuntimeFacade(game)?.returnToMenu?.(options);
        },
    };
}

export function createMatchUiPort(game) {
    return {
        startMatch() {
            return getRuntimeComponent(game, 'matchFlowUiController')?.startMatch?.();
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
    const matchUiPort = createMatchUiPort(game);
    return {
        settingsPort,
        uiFeedbackPort,
        sessionPort,
        renderPort,
        inputPort,
        lifecyclePort,
        matchUiPort,
        dispose: noop,
    };
}
