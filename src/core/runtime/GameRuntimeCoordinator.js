import { UIManager } from '../../composition/core-ui/CoreUiAppPorts.js';
import { bootstrapGameRuntime } from '../GameBootstrap.js';
import { GameRuntimeFacade } from '../GameRuntimeFacade.js';
import { clearGameRuntimeState } from './GameRuntimeBundle.js';

export class GameRuntimeCoordinator {
    constructor({ game } = {}) {
        this.runtime = game || null;
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
        if (runtimeBundle?.components) {
            runtimeBundle.components.runtimeCoordinator = this;
        }

        const runtimeFacade = new GameRuntimeFacade({
            game,
            ports: this.getPorts(),
            runtimeBundle,
        });
        this.runtimeFacade = runtimeFacade;
        if (game) {
            game.runtimeFacade = runtimeFacade;
        }
        if (runtimeBundle?.components) {
            runtimeBundle.components.runtimeFacade = runtimeFacade;
        }

        const uiManager = new UIManager({
            game,
            ports: this.getPorts(),
        });
        this.uiManager = uiManager;
        if (game) {
            game.uiManager = uiManager;
        }
        uiManager.init();
        game?.keybindEditorController?.renderEditor?.();

        runtimeFacade.applySettingsToRuntime();
        game?.input?.setBindings?.(initialBindings);

        return runtimeBundle;
    }

    getPorts() {
        return this.runtimeBundle?.ports || this.runtime?.runtimePorts || null;
    }

    getRuntimeFacade() {
        return this.runtimeFacade
            || this.runtimeBundle?.components?.runtimeFacade
            || this.runtime?.runtimeFacade
            || null;
    }

    getUiManager() {
        return this.uiManager || this.runtime?.uiManager || null;
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

    startMatch() {
        return this.getRuntimeFacade()?.startMatch?.();
    }

    returnToMenu(options = undefined) {
        return this.getRuntimeFacade()?.returnToMenu?.(options);
    }

    renderBuildInfo() {
        const rendered = this.runtime?.buildInfoController?.renderBuildInfo?.();
        this.runtime._buildInfoClipboardText = typeof rendered === 'string' ? rendered : '';
        return this.runtime._buildInfoClipboardText;
    }

    finishStartup() {
        this.renderBuildInfo();
        if (this.runtime?.ui?.mainMenu) {
            this.runtime.ui.mainMenu.dataset.shellReady = 'true';
            this.runtime.ui.mainMenu.style.visibility = '';
        }
        this.runtimeBundle?.components?.gameLoop?.start?.();
    }

    disposeRuntime() {
        const game = this.runtime;
        game?.gameLoop?.stop?.();
        game?.matchFlowUiController?.dispose?.();
        this.getRuntimeFacade()?.dispose?.();
        game?.huntHud?.dispose?.();
        game?.hudRuntimeSystem?.dispose?.();
        this.getUiManager()?.dispose?.();
        game?.runtimeDiagnosticsSystem?.dispose?.();
        game?.mediaRecorderSystem?.dispose?.();
        game?.input?.dispose?.();
        game?.audio?.dispose?.();
        game?.renderer?.dispose?.();
        clearGameRuntimeState(this.runtimeBundle || game?.runtimeBundle);
    }
}
