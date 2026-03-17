function noop() {}

export function createSettingsPort(game) {
    return {
        getSettings: () => game?.settings || null,
        getRuntimeConfig: () => game?.runtimeConfig || null,
        applyAutoRoll(value) {
            const checked = !!value;
            if (game?.settings) {
                game.settings.autoRoll = checked;
            }
            if (game?.runtimeConfig?.player) {
                game.runtimeConfig.player.autoRoll = checked;
            }
        },
        setBindings(bindings) {
            game?.input?.setBindings?.(bindings);
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
        getUi: () => game?.ui || null,
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
            game?.hudP2?.setVisibility?.(!!isVisible);
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
        getEntityManager: () => game?.entityManager || null,
        clearLastRoundGhost() {
            game?.entityManager?.clearLastRoundGhost?.();
        },
        teardownMatchSession() {
            game?.matchFlowUiController?.sessionOrchestrator?.teardownMatchSession?.();
        },
        requestDeltaReset(reason) {
            game?.gameLoop?.requestDeltaReset?.(reason);
        },
    };
}

export function createRenderPort(game) {
    return {
        setSplitScreen(isEnabled) {
            game?.renderer?.setSplitScreen?.(!!isEnabled);
        },
        setShadowQuality(level) {
            game?.renderer?.setShadowQuality?.(level);
        },
        syncPortalBeams(isEnabled) {
            game?.arena?.toggleBeams?.(!!isEnabled);
        },
    };
}

export function createInputPort(game) {
    return {
        clearJustPressed() {
            game?.input?.clearJustPressed?.();
        },
        startKeyCapture(playerKey, action) {
            game?.keybindEditorController?.startKeyCapture?.(playerKey, action);
        },
    };
}

export function createRuntimePorts(game) {
    const settingsPort = createSettingsPort(game);
    const uiFeedbackPort = createUiFeedbackPort(game);
    const sessionPort = createSessionPort(game);
    const renderPort = createRenderPort(game);
    const inputPort = createInputPort(game);
    return {
        settingsPort,
        uiFeedbackPort,
        sessionPort,
        renderPort,
        inputPort,
        dispose: noop,
    };
}
