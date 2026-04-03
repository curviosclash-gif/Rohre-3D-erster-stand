import { UIManager } from '../../composition/core-ui/CoreUiAppPorts.js';
import { bootstrapGameRuntime } from '../GameBootstrap.js';
import { GameRuntimeFacade } from '../GameRuntimeFacade.js';
import {
    clearGameRuntimeState,
    getSessionRuntimeHandle,
    getSessionRuntimeState,
    setSessionRuntimeHandle,
} from './GameRuntimeBundle.js';

export class GameRuntimeCoordinator {
    constructor({ runtime } = {}) {
        this.runtime = runtime || null;
        this.runtimeBundle = null;
        this.runtimeFacade = null;
        this.uiManager = null;
        if (this.runtime) {
            this.runtime.runtimeCoordinator = this;
        }
    }

    initialize({
        appVersion = undefined,
        buildId = undefined,
        buildTime = undefined,
        showStatusToast = undefined,
        initialBindings = undefined,
    } = {}) {
        const game = this.runtime;
        const runtimeBundle = bootstrapGameRuntime(game, {
            appVersion,
            buildId,
            buildTime,
            showStatusToast,
        });
        this.runtimeBundle = runtimeBundle || null;
        setSessionRuntimeHandle(runtimeBundle, 'runtimeCoordinator', this);

        const runtimeFacade = new GameRuntimeFacade({
            runtime: game,
            runtimeBundle,
        });
        this.runtimeFacade = runtimeFacade;
        setSessionRuntimeHandle(runtimeBundle, 'runtimeFacade', runtimeFacade);

        const uiManager = new UIManager({
            game,
            ports: this.getPorts(),
        });
        this.uiManager = uiManager;
        setSessionRuntimeHandle(runtimeBundle, 'uiManager', uiManager);
        uiManager.init();
        this.getRuntimeHandle('keybindEditorController')?.renderEditor?.();

        runtimeFacade.applySettingsToRuntime();
        this.getRuntimeHandle('input')?.setBindings?.(initialBindings);

        return runtimeBundle;
    }

    getRuntimeState() {
        return getSessionRuntimeState(this.runtimeBundle || this.runtime);
    }

    getRuntimeHandle(key) {
        return getSessionRuntimeHandle(this.runtimeBundle || this.runtime, key);
    }

    getPorts() {
        return this.getRuntimeHandle('runtimePorts')
            || this.runtimeBundle?.ports
            || this.runtime?.runtimePorts
            || null;
    }

    getRuntimeFacade() {
        return this.runtimeFacade
            || this.getRuntimeHandle('runtimeFacade')
            || this.runtime?.runtimeFacade
            || null;
    }

    getUiManager() {
        return this.uiManager
            || this.getRuntimeHandle('uiManager')
            || this.runtime?.uiManager
            || null;
    }

    applySettingsToRuntime(options = undefined) {
        return this.getRuntimeFacade()?.applySettingsToRuntime?.(options);
    }

    setupMenuListeners() {
        return this.getRuntimeFacade()?.setupMenuListeners?.();
    }

    handleMenuControllerEvent(event) {
        return this.getRuntimeFacade()?.handleMenuControllerEvent?.(event);
    }

    onSettingsChanged(event = null) {
        return this.getRuntimeFacade()?.onSettingsChanged?.(event);
    }

    markSettingsDirty(isDirty) {
        return this.getRuntimeFacade()?.markSettingsDirty?.(isDirty);
    }

    updateSaveButtonState() {
        return this.getRuntimeFacade()?.updateSaveButtonState?.();
    }

    initializeSession() {
        return this.getRuntimeFacade()?.initializeSession?.();
    }

    waitForAllPlayersLoaded() {
        return this.getRuntimeFacade()?.waitForAllPlayersLoaded?.();
    }

    teardownRuntimeSession() {
        return this.getRuntimeFacade()?.teardownRuntimeSession?.();
    }

    startArcadeRunIfEnabled() {
        return this.getRuntimeFacade()?.startArcadeRunIfEnabled?.();
    }

    startMatch(options = undefined) {
        return this.getRuntimeFacade()?.startMatch?.(options);
    }

    pauseMatch(options = undefined) {
        return this.getRuntimeFacade()?.pauseMatch?.(options);
    }

    resumeMatch(options = undefined) {
        return this.getRuntimeFacade()?.resumeMatch?.(options);
    }

    returnToMenu(options = undefined) {
        return this.getRuntimeFacade()?.returnToMenu?.(options);
    }

    finalizeMatch(options = undefined) {
        return this.getRuntimeFacade()?.finalizeMatch?.(options);
    }

    hostLobby(options = undefined) {
        return this.getRuntimeFacade()?.hostLobby?.(options);
    }

    joinLobby(options = undefined) {
        return this.getRuntimeFacade()?.joinLobby?.(options);
    }

    renderBuildInfo() {
        const rendered = this.getRuntimeHandle('buildInfoController')?.renderBuildInfo?.();
        const clipboardText = typeof rendered === 'string' ? rendered : '';
        const runtimeState = this.getRuntimeState();
        if (runtimeState) {
            runtimeState._buildInfoClipboardText = clipboardText;
        }
        return clipboardText;
    }

    finishStartup() {
        this.renderBuildInfo();
        const ui = this.getRuntimeHandle('ui');
        if (ui?.mainMenu) {
            ui.mainMenu.dataset.shellReady = 'true';
            ui.mainMenu.style.visibility = '';
        }
        this.getRuntimeHandle('gameLoop')?.start?.();
    }

    disposeRuntime() {
        const game = this.runtime;
        this.getRuntimeHandle('gameLoop')?.stop?.();
        this.getRuntimeHandle('matchFlowUiController')?.dispose?.();
        this.getRuntimeFacade()?.dispose?.();
        this.getRuntimeHandle('huntHud')?.dispose?.();
        this.getRuntimeHandle('hudRuntimeSystem')?.dispose?.();
        this.getUiManager()?.dispose?.();
        this.getRuntimeHandle('runtimeDiagnosticsSystem')?.dispose?.();
        this.getRuntimeHandle('mediaRecorderSystem')?.dispose?.();
        this.getRuntimeHandle('input')?.dispose?.();
        this.getRuntimeHandle('audio')?.dispose?.();
        this.getRuntimeHandle('renderer')?.dispose?.();
        clearGameRuntimeState(this.runtimeBundle || game?.runtimeBundle);
    }
}
