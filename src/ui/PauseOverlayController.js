import {
    derivePauseTransition,
    deriveResumeTransition,
    deriveReturnToMenuTransition,
} from '../state/MatchLifecycleStateTransitions.js';

export class PauseOverlayController {
    constructor(deps = {}) {
        this.matchFlowUiController = deps.matchFlowUiController;
        this.game = deps.game || this.matchFlowUiController?.game || null;
        this.ports = deps.ports || null;
        this._listenersInitialized = false;
        this._hostPausedOverlay = null;
        this._managedListeners = [];
        this._boundHandlers = null;
    }

    /** Returns true if this is a network match. */
    _isNetworkMatch() {
        return !!this.game?.runtimeFacade?.isNetworkSession?.();
    }

    /** Returns true if the local player is the host. */
    _isHost() {
        return this.game?.runtimeFacade?.isHost?.() ?? true;
    }

    _addManagedListener(target, type, handler) {
        if (!target || typeof target.addEventListener !== 'function' || typeof handler !== 'function') {
            return;
        }
        target.addEventListener(type, handler);
        this._managedListeners.push({ target, type, handler });
    }

    _removeManagedListeners() {
        for (const listener of this._managedListeners) {
            listener.target?.removeEventListener?.(listener.type, listener.handler);
        }
        this._managedListeners.length = 0;
    }

    setupListeners() {
        if (this._listenersInitialized) {
            return;
        }

        const game = this.game;
        if (!game?.ui) return;

        this._listenersInitialized = true;
        if (!this._boundHandlers) {
            this._boundHandlers = {
                onPauseResumeClick: () => {
                    if (game.state === 'PAUSED') {
                        this.resumeFromPause();
                    }
                },
                onPauseSettingsClick: () => {
                    if (game.state === 'PAUSED') {
                        this._showSettings();
                    }
                },
                onPauseSettingsBackClick: () => {
                    if (game.state === 'PAUSED') {
                        this._hideSettings();
                    }
                },
                onPauseMenuClick: () => {
                    if (game.state === 'PAUSED') {
                        this.returnToMenuFromPause();
                    }
                },
                onPauseKeybindP1Click: (event) => this._handleKeybindClick(event, 'PLAYER_1'),
                onPauseKeybindP2Click: (event) => this._handleKeybindClick(event, 'PLAYER_2'),
                onAutoRollChange: () => {
                    if (game.state !== 'PAUSED') return;
                    const checked = !!game.ui.pauseAutoRollToggle?.checked;
                    this.ports?.settingsPort?.applyAutoRoll?.(checked);
                },
                onInvertP1Change: () => {
                    if (game.state !== 'PAUSED') return;
                    const checked = !!game.ui.pauseInvertP1?.checked;
                    this._applyInvertPitch(0, 'PLAYER_1', checked);
                },
                onInvertP2Change: () => {
                    if (game.state !== 'PAUSED') return;
                    const checked = !!game.ui.pauseInvertP2?.checked;
                    this._applyInvertPitch(1, 'PLAYER_2', checked);
                },
            };
        }

        this._addManagedListener(game.ui.pauseResumeButton, 'click', this._boundHandlers.onPauseResumeClick);
        this._addManagedListener(game.ui.pauseSettingsButton, 'click', this._boundHandlers.onPauseSettingsClick);
        this._addManagedListener(game.ui.pauseSettingsBackButton, 'click', this._boundHandlers.onPauseSettingsBackClick);
        this._addManagedListener(game.ui.pauseMenuButton, 'click', this._boundHandlers.onPauseMenuClick);
        this._addManagedListener(game.ui.pauseKeybindP1, 'click', this._boundHandlers.onPauseKeybindP1Click);
        this._addManagedListener(game.ui.pauseKeybindP2, 'click', this._boundHandlers.onPauseKeybindP2Click);
        this._addManagedListener(game.ui.pauseAutoRollToggle, 'change', this._boundHandlers.onAutoRollChange);
        this._addManagedListener(game.ui.pauseInvertP1, 'change', this._boundHandlers.onInvertP1Change);
        this._addManagedListener(game.ui.pauseInvertP2, 'change', this._boundHandlers.onInvertP2Change);
    }

    pause() {
        // Network: only host may pause
        if (this._isNetworkMatch() && !this._isHost()) return;

        const controller = this.matchFlowUiController;
        const pauseTransition = derivePauseTransition();
        controller.applyLifecycleTransition(pauseTransition);
        controller.applyMatchUiState(pauseTransition.uiState);
        this.ports?.inputPort?.clearJustPressed?.();
        this._hideSettings();
    }

    /**
     * Shows a "Host hat pausiert" overlay for network clients.
     * Called when a host-pause event is received from the session.
     */
    showHostPausedOverlay() {
        if (this._isHost()) return;
        const controller = this.matchFlowUiController;
        const pauseTransition = derivePauseTransition();
        controller.applyLifecycleTransition(pauseTransition);
        controller.applyMatchUiState(pauseTransition.uiState);

        if (!this._hostPausedOverlay) {
            this._hostPausedOverlay = document.createElement('div');
            this._hostPausedOverlay.className = 'host-paused-overlay';
            this._hostPausedOverlay.textContent = 'Host hat pausiert';
        }
        const overlay = this.game?.ui?.pauseOverlay;
        if (overlay && !overlay.contains(this._hostPausedOverlay)) {
            overlay.appendChild(this._hostPausedOverlay);
        }
    }

    /**
     * Hides the "Host hat pausiert" overlay.
     */
    hideHostPausedOverlay() {
        this._hostPausedOverlay?.remove?.();
    }

    /**
     * ESC on a network client: show disconnect confirmation instead of pause.
     */
    showDisconnectConfirmation() {
        const game = this.game;
        if (!game?.ui?.pauseOverlay) return;
        const pauseTransition = derivePauseTransition();
        this.matchFlowUiController.applyLifecycleTransition(pauseTransition);
        this.matchFlowUiController.applyMatchUiState(pauseTransition.uiState);

        // Replace pause overlay content with disconnect prompt
        if (game.ui.pauseMenuButton) {
            game.ui.pauseMenuButton.textContent = 'Verbindung trennen';
        }
        if (game.ui.pauseResumeButton) {
            game.ui.pauseResumeButton.textContent = 'Weiter spielen';
        }
        this._hideSettings();
    }

    resumeFromPause() {
        if (this._isNetworkMatch() && !this._isHost()) {
            // Client was shown disconnect confirmation - just resume
            this._restorePauseButtonLabels();
        }
        this.hideHostPausedOverlay();

        const controller = this.matchFlowUiController;
        const resumeTransition = deriveResumeTransition();
        this._hideSettings();
        controller.applyLifecycleTransition(resumeTransition);
        controller.applyMatchUiState(resumeTransition.uiState);
        this.game.gameLoop.requestDeltaReset?.('pause-resume');
    }

    returnToMenuFromPause() {
        const controller = this.matchFlowUiController;
        const game = this.game;
        const returnTransition = deriveReturnToMenuTransition();
        this._hideSettings();
        this.hideHostPausedOverlay();
        this._restorePauseButtonLabels();
        controller.applyLifecycleTransition(returnTransition);
        this.ports?.sessionPort?.clearLastRoundGhost?.();
        this.ports?.sessionPort?.teardownMatchSession?.();
        game.runtimeFacade?._teardownSession?.();
        game.hudRuntimeSystem?.clearNetworkScoreboard?.();
        controller.applyMatchUiState(returnTransition.uiState);
        controller.resetCrosshairUi();

        if (this.ports?.uiFeedbackPort?.showMenuPanel) {
            this.ports.uiFeedbackPort.showMenuPanel('submenu-game', { trigger: 'pause_menu_return' });
        } else {
            game._showMainNav();
        }
        this.ports?.uiFeedbackPort?.syncAll?.();
    }

    _restorePauseButtonLabels() {
        const game = this.game;
        if (game?.ui?.pauseMenuButton) {
            game.ui.pauseMenuButton.textContent = 'Hauptmenue';
        }
        if (game?.ui?.pauseResumeButton) {
            game.ui.pauseResumeButton.textContent = 'Weiterspielen';
        }
    }

    _handleKeybindClick(event, playerKey) {
        const game = this.game;
        if (game.state !== 'PAUSED') return;
        const button = event?.target?.closest?.('button.keybind-btn');
        if (!button) return;
        this.ports?.inputPort?.startKeyCapture?.(playerKey, button.dataset.action);
    }

    _applyInvertPitch(playerIndex, playerKey, checked) {
        const game = this.game;
        if (this.ports?.actionDispatcher) {
            this.ports.actionDispatcher.dispatch({
                type: 'settings.invertPitch',
                payload: { playerIndex, playerKey, value: checked },
            });
        } else {
            game.settings.invertPitch[playerKey] = checked;
            const players = game.entityManager?.players;
            if (players) {
                const human = players.find((player) => !player.isBot && player.index === playerIndex);
                human?.setControlOptions?.({ invertPitch: checked });
            }
        }
    }

    _syncSettingsToggles() {
        const game = this.game;
        if (game.ui.pauseAutoRollToggle) {
            game.ui.pauseAutoRollToggle.checked = !!game.settings.autoRoll;
        }
        if (game.ui.pauseInvertP1) {
            game.ui.pauseInvertP1.checked = !!game.settings.invertPitch?.PLAYER_1;
        }
        if (game.ui.pauseInvertP2) {
            game.ui.pauseInvertP2.checked = !!game.settings.invertPitch?.PLAYER_2;
        }
    }

    _showSettings() {
        const game = this.game;
        this._syncSettingsToggles();
        game.keybindEditorController?.renderPauseEditor?.();
        if (game.ui.pauseSettingsPanel) {
            game.ui.pauseSettingsPanel.classList.remove('hidden');
        }
        if (game.ui.pauseSettingsButton) {
            game.ui.pauseSettingsButton.classList.add('hidden');
        }
    }

    _hideSettings() {
        const game = this.game;
        game.keyCapture = null;
        if (game.ui.pauseSettingsPanel) {
            game.ui.pauseSettingsPanel.classList.add('hidden');
        }
        if (game.ui.pauseSettingsButton) {
            game.ui.pauseSettingsButton.classList.remove('hidden');
        }
    }

    dispose() {
        this._removeManagedListeners();
        this._listenersInitialized = false;
        this._hideSettings();
        this.hideHostPausedOverlay();
    }
}
