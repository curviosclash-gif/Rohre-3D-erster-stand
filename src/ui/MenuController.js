import { CONFIG } from '../core/Config.js';
import { VEHICLE_DEFINITIONS } from '../entities/vehicle-registry.js';
import { CUSTOM_MAP_KEY } from '../entities/MapSchema.js';

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export class MenuController {
    /**
     * @param {Object} options
     * @param {Object} options.ui Elements from the DOM
     * @param {Object} options.settings Current runtime settings
     * @param {Function} options.onSettingsChanged Callback when settings mutate
     * @param {Function} options.onStartMatch Callback to start the game
     * @param {Function} options.onStartKeyCapture Callback to bind keys (player, action)
     * @param {Function} options.onSaveProfile Callback to save profile
     * @param {Function} options.onLoadProfile Callback to load profile
     * @param {Function} options.onDeleteProfile Callback to delete profile
     * @param {Function} options.onResetKeys Callback to restore default controls
     * @param {Function} options.onSaveKeys Callback to explicitly save settings
     * @param {Function} options.onStatusToast Callback to show a message toast
     */
    constructor(options) {
        this.ui = options.ui;
        this.settings = options.settings;
        this.onSettingsChanged = options.onSettingsChanged;
        this.onStartMatch = options.onStartMatch;
        this.onStartKeyCapture = options.onStartKeyCapture;
        this.onSaveProfile = options.onSaveProfile;
        this.onLoadProfile = options.onLoadProfile;
        this.onDeleteProfile = options.onDeleteProfile;
        this.onResetKeys = options.onResetKeys;
        this.onSaveKeys = options.onSaveKeys;
        this.onStatusToast = options.onStatusToast;
    }

    setupListeners() {
        const ui = this.ui;
        const settings = this.settings;

        ui.modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                settings.mode = btn.dataset.mode === '2p' ? '2p' : '1p';
                this.onSettingsChanged();
            });
        });

        if (ui.vehicleSelectP1) {
            ui.vehicleSelectP1.addEventListener('change', (e) => {
                settings.vehicles.PLAYER_1 = e.target.value;
                this.onSettingsChanged();
            });
        }
        if (ui.vehicleSelectP2) {
            ui.vehicleSelectP2.addEventListener('change', (e) => {
                settings.vehicles.PLAYER_2 = e.target.value;
                this.onSettingsChanged();
            });
        }

        ui.mapSelect.addEventListener('change', (e) => {
            const selectedMapKey = String(e.target.value || '');
            settings.mapKey = (selectedMapKey === CUSTOM_MAP_KEY || CONFIG.MAPS[selectedMapKey])
                ? selectedMapKey
                : 'standard';
            this.onSettingsChanged();
        });

        ui.botSlider.addEventListener('input', () => {
            settings.numBots = clamp(parseInt(ui.botSlider.value, 10), 0, 8);
            this.onSettingsChanged();
        });

        if (ui.botDifficultySelect) {
            ui.botDifficultySelect.addEventListener('change', () => {
                const value = String(ui.botDifficultySelect.value || '').toUpperCase();
                settings.botDifficulty = ['EASY', 'NORMAL', 'HARD'].includes(value) ? value : 'NORMAL';
                this.onSettingsChanged();
            });
        }

        ui.winSlider.addEventListener('input', () => {
            settings.winsNeeded = clamp(parseInt(ui.winSlider.value, 10), 1, 15);
            this.onSettingsChanged();
        });

        ui.autoRollToggle.addEventListener('change', () => {
            settings.autoRoll = !!ui.autoRollToggle.checked;
            this.onSettingsChanged();
        });

        ui.invertP1.addEventListener('change', () => {
            settings.invertPitch.PLAYER_1 = !!ui.invertP1.checked;
            this.onSettingsChanged();
        });

        ui.invertP2.addEventListener('change', () => {
            settings.invertPitch.PLAYER_2 = !!ui.invertP2.checked;
            this.onSettingsChanged();
        });

        ui.cockpitCamP1.addEventListener('change', () => {
            settings.cockpitCamera.PLAYER_1 = !!ui.cockpitCamP1.checked;
            this.onSettingsChanged();
        });

        ui.cockpitCamP2.addEventListener('change', () => {
            settings.cockpitCamera.PLAYER_2 = !!ui.cockpitCamP2.checked;
            this.onSettingsChanged();
        });

        const planarModeToggle = document.getElementById('planar-mode-toggle');
        if (planarModeToggle) {
            planarModeToggle.addEventListener('change', (e) => {
                if (!settings.gameplay) settings.gameplay = {};
                settings.gameplay.planarMode = e.target.checked;

                // Usability: Auto-active portals if they are off, because Planar Mode needs them
                if (settings.gameplay.planarMode && (settings.gameplay.portalCount || 0) === 0) {
                    settings.gameplay.portalCount = 4;
                    this.onStatusToast('Ebenen-Modus: 4 Portale aktiviert');
                }

                this.onSettingsChanged();
            });
        }

        ui.portalsToggle.addEventListener('change', () => {
            settings.portalsEnabled = !!ui.portalsToggle.checked;
            this.onSettingsChanged();
        });

        ui.speedSlider.addEventListener('input', () => {
            settings.gameplay.speed = clamp(parseFloat(ui.speedSlider.value), 8, 40);
            this.onSettingsChanged();
        });

        ui.turnSlider.addEventListener('input', () => {
            settings.gameplay.turnSensitivity = clamp(parseFloat(ui.turnSlider.value), 0.8, 5);
            this.onSettingsChanged();
        });

        ui.planeSizeSlider.addEventListener('input', () => {
            settings.gameplay.planeScale = clamp(parseFloat(ui.planeSizeSlider.value), 0.6, 2.0);
            this.onSettingsChanged();
        });

        ui.trailWidthSlider.addEventListener('input', () => {
            settings.gameplay.trailWidth = clamp(parseFloat(ui.trailWidthSlider.value), 0.2, 2.5);
            this.onSettingsChanged();
        });

        ui.gapSizeSlider.addEventListener('input', () => {
            settings.gameplay.gapSize = clamp(parseFloat(ui.gapSizeSlider.value), 0.05, 1.5);
            this.onSettingsChanged();
        });

        ui.gapFrequencySlider.addEventListener('input', () => {
            settings.gameplay.gapFrequency = clamp(parseFloat(ui.gapFrequencySlider.value), 0, 0.25);
            this.onSettingsChanged();
        });

        ui.itemAmountSlider.addEventListener('input', () => {
            settings.gameplay.itemAmount = clamp(parseInt(ui.itemAmountSlider.value, 10), 1, 20);
            this.onSettingsChanged();
        });

        ui.fireRateSlider.addEventListener('input', () => {
            settings.gameplay.fireRate = clamp(parseFloat(ui.fireRateSlider.value), 0.1, 2.0);
            this.onSettingsChanged();
        });

        ui.lockOnSlider.addEventListener('input', () => {
            settings.gameplay.lockOnAngle = clamp(parseInt(ui.lockOnSlider.value, 10), 5, 45);
            this.onSettingsChanged();
        });

        ui.keybindP1.addEventListener('click', (e) => {
            const btn = e.target.closest('button.keybind-btn');
            if (!btn) return;
            this.onStartKeyCapture('PLAYER_1', btn.dataset.action);
        });

        ui.keybindP2.addEventListener('click', (e) => {
            const btn = e.target.closest('button.keybind-btn');
            if (!btn) return;
            this.onStartKeyCapture('PLAYER_2', btn.dataset.action);
        });

        ui.resetKeysButton.addEventListener('click', () => {
            this.onResetKeys();
        });

        ui.saveKeysButton.addEventListener('click', () => {
            this.onSaveKeys();
        });

        ui.startButton.addEventListener('click', () => {
            this.onStartMatch();
        });

        if (ui.openEditorButton) {
            ui.openEditorButton.addEventListener('click', () => {
                window.open('editor/map-editor-3d.html', '_blank');
            });
        }

        if (ui.openVehicleEditorButton) {
            ui.openVehicleEditorButton.addEventListener('click', () => {
                window.open('prototypes/vehicle-lab/index.html', '_blank');
            });
        }

        if (ui.profileSaveButton) {
            ui.profileSaveButton.addEventListener('click', () => {
                this.onSaveProfile(ui.profileNameInput?.value || '');
            });
        }
        if (ui.profileLoadButton) {
            ui.profileLoadButton.addEventListener('click', () => {
                this.onLoadProfile(ui.profileSelect?.value || '');
            });
        }
        if (ui.profileDeleteButton) {
            ui.profileDeleteButton.addEventListener('click', () => {
                this.onDeleteProfile(ui.profileSelect?.value || '');
            });
        }

        const portalCountSlider = document.getElementById('portal-count-slider');
        const portalCountLabel = document.getElementById('portal-count-label');
        if (portalCountSlider && portalCountLabel) {
            portalCountSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                portalCountLabel.textContent = val;
                if (!settings.gameplay) settings.gameplay = {};
                settings.gameplay.portalCount = val;
                this.onSettingsChanged();
            });
        }

        const planarLevelCountSlider = document.getElementById('planar-level-count-slider');
        const planarLevelCountLabel = document.getElementById('planar-level-count-label');
        if (planarLevelCountSlider && planarLevelCountLabel) {
            planarLevelCountSlider.addEventListener('input', (e) => {
                const val = clamp(parseInt(e.target.value, 10), 2, 10);
                planarLevelCountLabel.textContent = val;
                if (!settings.gameplay) settings.gameplay = {};
                settings.gameplay.planarLevelCount = val;
                this.onSettingsChanged();
            });
        }
    }
}
