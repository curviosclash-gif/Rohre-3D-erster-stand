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
        const controller = this.matchFlowUiController;
        const pauseTransition = derivePauseTransition();
        controller.applyLifecycleTransition(pauseTransition);
        controller.applyMatchUiState(pauseTransition.uiState);
        this.ports?.inputPort?.clearJustPressed?.();
        this._hideSettings();
    }

    resumeFromPause() {
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
        controller.applyLifecycleTransition(returnTransition);
        this.ports?.sessionPort?.clearLastRoundGhost?.();
        this.ports?.sessionPort?.teardownMatchSession?.();
        controller.applyMatchUiState(returnTransition.uiState);
        controller.resetCrosshairUi();

        if (this.ports?.uiFeedbackPort?.showMenuPanel) {
            this.ports.uiFeedbackPort.showMenuPanel('submenu-game', { trigger: 'pause_menu_return' });
        } else {
            game._showMainNav();
        }
        this.ports?.uiFeedbackPort?.syncAll?.();
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
                game.settings.invertPitch.PLAYER_1 = checked;
                const players = game.entityManager?.players;
                if (players) {
                    const human = players.find((player) => !player.isBot && player.index === 0);
                    human?.setControlOptions?.({ invertPitch: checked });
                }
            });
        }
        if (game.ui.pauseInvertP2) {
            game.ui.pauseInvertP2.addEventListener('change', () => {
                if (game.state !== 'PAUSED') return;
                const checked = !!game.ui.pauseInvertP2.checked;
                game.settings.invertPitch.PLAYER_2 = checked;
                const players = game.entityManager?.players;
                if (players) {
                    const human = players.find((player) => !player.isBot && player.index === 1);
                    human?.setControlOptions?.({ invertPitch: checked });
                }
            });
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
