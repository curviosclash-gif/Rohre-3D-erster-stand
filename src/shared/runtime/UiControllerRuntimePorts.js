export function createMatchFlowUiControllerPort(ports = null) {
    const renderPort = ports?.renderPort || null;
    const lifecyclePort = ports?.lifecyclePort || null;
    const runtimeIntentPort = ports?.runtimeIntentPort || null;
    const uiFeedbackPort = ports?.uiFeedbackPort || null;
    const controllerPort = {};

    if (typeof renderPort?.setSplitScreen === 'function') {
        controllerPort.setSplitScreen = (isEnabled) => renderPort.setSplitScreen(!!isEnabled);
    }
    if (typeof lifecyclePort?.initializeSession === 'function') {
        controllerPort.initializeSession = () => lifecyclePort.initializeSession();
    }
    if (typeof lifecyclePort?.waitForAllPlayersLoaded === 'function') {
        controllerPort.waitForAllPlayersLoaded = () => lifecyclePort.waitForAllPlayersLoaded();
    }
    if (typeof lifecyclePort?.startArcadeRunIfEnabled === 'function') {
        controllerPort.startArcadeRunIfEnabled = () => lifecyclePort.startArcadeRunIfEnabled();
    }
    if (typeof runtimeIntentPort?.startMatch === 'function') {
        controllerPort.startMatch = (options = undefined) => runtimeIntentPort.startMatch(options);
    }
    if (typeof runtimeIntentPort?.returnToMenu === 'function') {
        controllerPort.returnToMenu = (options = undefined) => runtimeIntentPort.returnToMenu(options);
    } else if (typeof lifecyclePort?.returnToMenu === 'function') {
        controllerPort.returnToMenu = (options = undefined) => lifecyclePort.returnToMenu(options);
    }
    if (typeof uiFeedbackPort?.showMenuPanel === 'function') {
        controllerPort.showMenuPanel = (panelId, options = undefined) => uiFeedbackPort.showMenuPanel(panelId, options);
    }
    if (typeof uiFeedbackPort?.syncAll === 'function') {
        controllerPort.syncUi = () => uiFeedbackPort.syncAll();
    }

    return Object.freeze(controllerPort);
}

export function createPauseOverlayControllerPort(ports = null) {
    const settingsPort = ports?.settingsPort || null;
    const inputPort = ports?.inputPort || null;
    const lifecyclePort = ports?.lifecyclePort || null;
    const runtimeIntentPort = ports?.runtimeIntentPort || null;
    const runtimeProjectionPort = ports?.runtimeProjectionPort || null;
    const actionDispatcher = ports?.actionDispatcher || null;
    const controllerPort = {};

    if (typeof runtimeProjectionPort?.getMatchFlowSnapshot === 'function') {
        controllerPort.getMatchFlowSnapshot = () => runtimeProjectionPort.getMatchFlowSnapshot();
    }
    if (typeof runtimeProjectionPort?.getSessionRuntimeSnapshot === 'function') {
        controllerPort.getSessionRuntimeSnapshot = () => runtimeProjectionPort.getSessionRuntimeSnapshot();
    }
    if (typeof runtimeIntentPort?.pauseMatch === 'function') {
        controllerPort.pauseMatch = () => runtimeIntentPort.pauseMatch();
    }
    if (typeof runtimeIntentPort?.resumeMatch === 'function') {
        controllerPort.resumeMatch = () => runtimeIntentPort.resumeMatch();
    }
    if (typeof runtimeIntentPort?.returnToMenu === 'function') {
        controllerPort.returnToMenu = (options = undefined) => runtimeIntentPort.returnToMenu(options);
    } else if (typeof lifecyclePort?.returnToMenu === 'function') {
        controllerPort.returnToMenu = (options = undefined) => lifecyclePort.returnToMenu(options);
    }
    if (typeof settingsPort?.applyAutoRoll === 'function') {
        controllerPort.applyAutoRoll = (checked) => settingsPort.applyAutoRoll(checked);
    }
    if (typeof inputPort?.startKeyCapture === 'function') {
        controllerPort.startKeyCapture = (playerKey, action) => inputPort.startKeyCapture(playerKey, action);
    }
    if (typeof inputPort?.clearJustPressed === 'function') {
        controllerPort.clearJustPressed = () => inputPort.clearJustPressed();
    }
    if (typeof actionDispatcher?.dispatch === 'function') {
        controllerPort.dispatchAction = (action) => actionDispatcher.dispatch(action);
    }

    return Object.freeze(controllerPort);
}
