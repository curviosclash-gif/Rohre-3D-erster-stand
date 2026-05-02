import {
    ARCADE_GHOST_DUEL_MODES,
    normalizeArcadeGhostDuelMode,
} from '../../shared/contracts/ArcadeGhostDuelContract.js';

function ensureStartSetupSettings(settings) {
    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    if (!settings.localSettings.startSetup || typeof settings.localSettings.startSetup !== 'object') {
        settings.localSettings.startSetup = {};
    }
    settings.localSettings.startSetup.arcadeGhostDuelMode = normalizeArcadeGhostDuelMode(
        settings.localSettings.startSetup.arcadeGhostDuelMode,
        ARCADE_GHOST_DUEL_MODES.OFF
    );
    return settings.localSettings.startSetup;
}

export function bindArcadeGhostDuelModeSelect({
    ui,
    settings,
    bind,
    emitSettingsChangedImmediate,
    keys,
}) {
    if (!ui?.arcadeGhostDuelModeSelect) return;
    ui.arcadeGhostDuelModeSelect.value = ensureStartSetupSettings(settings).arcadeGhostDuelMode;
    bind(ui.arcadeGhostDuelModeSelect, 'change', () => {
        const startSetupSettings = ensureStartSetupSettings(settings);
        startSetupSettings.arcadeGhostDuelMode = normalizeArcadeGhostDuelMode(
            ui.arcadeGhostDuelModeSelect.value,
            ARCADE_GHOST_DUEL_MODES.OFF
        );
        ui.arcadeGhostDuelModeSelect.value = startSetupSettings.arcadeGhostDuelMode;
        emitSettingsChangedImmediate([keys.ARCADE_GHOST_DUEL_MODE]);
    });
}
