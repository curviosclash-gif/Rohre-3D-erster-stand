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
    }

    /** Returns true if this is a network match. */
    _isNetworkMatch() {
        return !!this.game?.runtimeFacade?.isNetworkSession?.();
    }

    /** Returns true if the local player is the host. */
    _isHost() {
        return this.game?.runtimeFacade?.isHost?.() ?? true;
    }

    setupListeners() {
        if (this._listenersInitialized) {
            return;
        }

        const game = this.game;
        this._listenersInitialized = true;
        if (game.ui.pauseResumeButton) {
            game.ui.pauseResumeButton.addEventListener('click', () => {
                if (game.state === 'PAUSED') {
                    this.resumeFromPause();
                }
            });
        }
        if (game.ui.pauseSettingsButton) {
            game.ui.pauseSettingsButton.addEventListener('click', () => {
                if (game.state === 'PAUSED') {
                    this._showSettings();
                }
            });
        }
        if (game.ui.pauseSettingsBackButton) {
            game.ui.pauseSettingsBackButton.addEventListener('click', () => {
                if (game.state === 'PAUSED') {
                    this._hideSettings();
                }
            });
        }
        if (game.ui.pauseMenuButton) {
            game.ui.pauseMenuButton.addEventListener('click', () => {
                if (game.state === 'PAUSED') {
                    this.returnToMenuFromPause();
                }
            });
        }

        this._setupSettingsBindings();
        this._setupKeybindClickHandlers();
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
            // Client was shown disconnect confirmation — just resume
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
            game.ui.pauseMenuButton.textContent = 'Hauptmenü';
        }
        if (game?.ui?.pauseResumeButton) {
            game.ui.pauseResumeButton.textContent = 'Weiterspielen';
        }
    }

    _setupKeybindClickHandlers() {
        const game = this.game;
        const handleKeybindClick = (playerKey) => (event) => {
            if (game.state !== 'PAUSED') return;
            const button = event.target.closest('button.keybind-btn');
            if (!button) return;
            this.ports?.inputPort?.startKeyCapture?.(playerKey, button.dataset.action);
        };

        if (game.ui.pauseKeybindP1) {
            game.ui.pauseKeybindP1.addEventListener('click', handleKeybindClick('PLAYER_1'));
        }
        if (game.ui.pauseKeybindP2) {
            game.ui.pauseKeybindP2.addEventListener('click', handleKeybindClick('PLAYER_2'));
        }
    }

    _setupSettingsBindings() {
        const game = this.game;
        if (game.ui.pauseAutoRollToggle) {
            game.ui.pauseAutoRollToggle.addEventListener('change', () => {
                if (game.state !== 'PAUSED') return;
                const checked = !!game.ui.pauseAutoRollToggle.checked;
                this.ports?.settingsPort?.applyAutoRoll?.(checked);
            });
        }
        if (game.ui.pauseInvertP1) {
            game.ui.pauseInvertP1.addEventListener('change', () => {
                if (game.state !== 'PAUSED') return;
                const checked = !!game.ui.pauseInvertP1.checked;
                this._applyInvertPitch(0, 'PLAYER_1', checked);
            });
        }
        if (game.ui.pauseInvertP2) {
            game.ui.pauseInvertP2.addEventListener('change', () => {
                if (game.state !== 'PAUSED') return;
                const checked = !!game.ui.pauseInvertP2.checked;
                this._applyInvertPitch(1, 'PLAYER_2', checked);
            });
        }
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
}
