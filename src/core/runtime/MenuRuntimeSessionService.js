// ============================================
// MenuRuntimeSessionService.js - session/mode/quickstart/level actions
// ============================================

import { CONFIG } from '../Config.js';
import {
    createMenuLevel3ResetDefaults,
    getNextEventPlaylistEntry,
    LEVEL4_SECTION_IDS,
    SETTINGS_CHANGE_KEYS,
} from '../../composition/core-ui/CoreUiMenuPorts.js';
import { listEligibleMapKeysForModePath } from '../../shared/contracts/MapModeContract.js';
import { createRuntimeRng } from '../../shared/contracts/RuntimeRngContract.js';

const MODE_PATH_TO_PRESET_ID = Object.freeze({
    arcade: 'arcade',
    fight: 'fight-standard',
    normal: 'normal-standard',
});

const SESSION_SWITCH_CHANGED_KEYS = Object.freeze([
    SETTINGS_CHANGE_KEYS.SESSION_TYPE,
    SETTINGS_CHANGE_KEYS.MODE,
    SETTINGS_CHANGE_KEYS.MODE_PATH,
    SETTINGS_CHANGE_KEYS.MAP_KEY,
    SETTINGS_CHANGE_KEYS.GAME_MODE,
    SETTINGS_CHANGE_KEYS.BOTS_COUNT,
    SETTINGS_CHANGE_KEYS.BOTS_DIFFICULTY,
    SETTINGS_CHANGE_KEYS.RULES_WINS_NEEDED,
    SETTINGS_CHANGE_KEYS.RULES_AUTO_ROLL,
    SETTINGS_CHANGE_KEYS.RULES_PORTALS_ENABLED,
    SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED,
    SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_1,
    SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_2,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_SPEED,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_TURN_SENSITIVITY,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANE_SCALE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_TRAIL_WIDTH,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_GAP_SIZE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_GAP_FREQUENCY,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_ITEM_AMOUNT,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_FIRE_RATE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_LOCK_ON_ANGLE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_MG_TRAIL_AIM_RADIUS,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_FIGHT_PLAYER_HP,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_FIGHT_MG_DAMAGE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_MODE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PORTAL_COUNT,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_LEVEL_COUNT,
    SETTINGS_CHANGE_KEYS.LOCAL_THEME_MODE,
]);

export { SESSION_SWITCH_CHANGED_KEYS, MODE_PATH_TO_PRESET_ID };

function resolveQuickStartRng(game, event = null) {
    const runtimeRng = game?.runtimeRng && typeof game.runtimeRng.next === 'function'
        ? game.runtimeRng
        : createRuntimeRng({
            random: typeof game?.random === 'function' ? game.random : Math.random,
        });
    const hasSeed = Number.isFinite(Number(event?.seed));
    if (!hasSeed) {
        return runtimeRng;
    }
    return createRuntimeRng({ seed: Number(event.seed) });
}

export function handleSessionTypeChangeAction(ctx) {
    const { game, event, onSettingsChanged } = ctx;
    const requestedSessionType = String(event?.sessionType || '').trim().toLowerCase();
    if (!requestedSessionType) return;

    const result = game.settingsManager.switchSessionType(game.settings, requestedSessionType);
    if (!result.success) {
        game._showStatusToast('Session-Typ konnte nicht gewechselt werden.', 1700, 'error');
        return;
    }

    onSettingsChanged({ changedKeys: SESSION_SWITCH_CHANGED_KEYS });
    const label = result.targetSessionType === 'splitscreen'
        ? 'Splitscreen'
        : (result.targetSessionType === 'multiplayer' ? 'Multiplayer' : 'Single Player');
    game._showStatusToast(
        result.loadedDraft ? `Session gewechselt: ${label} (Draft geladen)` : `Session gewechselt: ${label}`,
        1200,
        'info'
    );
}

export function handleModePathChangeAction(ctx) {
    const { game, event, onSettingsChanged, resolveMenuAccessContext } = ctx;
    const huntFeatureEnabled = CONFIG.HUNT?.ENABLED !== false;
    const requestedModePath = String(event?.modePath || '').trim().toLowerCase();
    let modePath = requestedModePath === 'arcade' || requestedModePath === 'fight' || requestedModePath === 'normal'
        ? requestedModePath
        : 'normal';
    if (modePath === 'fight' && !huntFeatureEnabled) {
        modePath = 'normal';
    }
    game.settings.localSettings.modePath = modePath;

    const changedKeys = [SETTINGS_CHANGE_KEYS.MODE_PATH];
    const presetId = MODE_PATH_TO_PRESET_ID[modePath];
    if (presetId) {
        const presetResult = game.settingsManager.applyMenuPreset(
            game.settings,
            presetId,
            resolveMenuAccessContext()
        );
        if (presetResult.success && Array.isArray(presetResult.changedKeys)) {
            changedKeys.push(...presetResult.changedKeys);
        }
    }

    if (modePath === 'fight') {
        game.settings.gameMode = 'HUNT';
        if (!game.settings.hunt || typeof game.settings.hunt !== 'object') {
            game.settings.hunt = {};
        }
        game.settings.hunt.respawnEnabled = true;
        changedKeys.push(SETTINGS_CHANGE_KEYS.GAME_MODE, SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED);
    } else if (modePath === 'normal' || modePath === 'arcade') {
        game.settings.gameMode = 'CLASSIC';
        if (!game.settings.hunt || typeof game.settings.hunt !== 'object') {
            game.settings.hunt = {};
        }
        game.settings.hunt.respawnEnabled = false;
        changedKeys.push(SETTINGS_CHANGE_KEYS.GAME_MODE, SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED);
    }

    onSettingsChanged({ changedKeys: Array.from(new Set(changedKeys)) });
    game.uiManager?.menuNavigationRuntime?.showPanel?.('submenu-game', {
        trigger: 'mode_path_selected',
        modePath,
    });

    const label = modePath === 'fight' ? 'Fight' : (modePath === 'arcade' ? 'Arcade' : 'Normal');
    if (requestedModePath === 'fight' && !huntFeatureEnabled) {
        game._showStatusToast('Fight ist deaktiviert. Normal wurde gesetzt.', 1500, 'warning');
    } else {
        game._showStatusToast(`Modus gewaehlt: ${label}`, 1200, 'info');
    }
}

export function handleQuickStartLastStartAction(ctx) {
    const { game, onSettingsChanged, recordMenuTelemetry, startMatch } = ctx;
    game.settings.localSettings.modePath = 'quick_action';
    onSettingsChanged({ changedKeys: [SETTINGS_CHANGE_KEYS.MODE_PATH] });
    recordMenuTelemetry('quickstart', {
        variant: 'last_settings',
        sessionType: game?.settings?.localSettings?.sessionType || 'single',
    });
    game._showStatusToast('Schnellstart: letzte Einstellungen', 1000, 'info');
    startMatch();
}

export function handleQuickStartEventPlaylistStartAction(ctx) {
    const { game, onSettingsChanged, resolveMenuAccessContext, recordMenuTelemetry, startMatch, markSettingsDirty } = ctx;
    const playlistStep = getNextEventPlaylistEntry(game?.settings?.localSettings?.eventPlaylistState);
    const presetId = String(playlistStep?.entry?.presetId || '').trim();
    if (!presetId) {
        game._showStatusToast('Event-Playlist ist nicht verfuegbar.', 1500, 'error');
        return;
    }

    const presetResult = game.settingsManager.applyMenuPreset(
        game.settings,
        presetId,
        resolveMenuAccessContext()
    );
    if (!presetResult.success) {
        game._showStatusToast('Event-Playlist konnte nicht vorbereitet werden.', 1600, 'error');
        return;
    }

    game.settings.localSettings.modePath = 'quick_action';
    game.settings.localSettings.eventPlaylistState = {
        ...playlistStep.persistedState,
    };

    const changedKeys = [
        SETTINGS_CHANGE_KEYS.MODE_PATH,
    ];
    if (Array.isArray(presetResult.changedKeys)) {
        changedKeys.push(...presetResult.changedKeys);
    }
    onSettingsChanged({ changedKeys: Array.from(new Set(changedKeys)) });

    const presetName = String(playlistStep?.preset?.name || presetId).trim() || presetId;
    const started = startMatch();
    if (started) {
        recordMenuTelemetry('quickstart', {
            variant: 'event_playlist',
            playlistId: playlistStep?.playlist?.id || '',
            presetId,
            stepIndex: playlistStep.currentIndex,
            displayIndex: playlistStep.displayIndex,
            totalSteps: playlistStep.totalSteps,
            sessionType: game?.settings?.localSettings?.sessionType || 'single',
        });
        const persisted = game.settingsManager.saveSettings(game.settings);
        if (persisted) {
            markSettingsDirty(false);
        }
        game._showStatusToast(
            `Event-Playlist: ${presetName} (${playlistStep.displayIndex}/${playlistStep.totalSteps})`,
            1300,
            'info'
        );
    }
}

export function handleQuickStartRandomStartAction(ctx) {
    const { game, event, onSettingsChanged, recordMenuTelemetry, startMatch } = ctx;
    const mapKeys = listEligibleMapKeysForModePath(CONFIG?.MAPS, 'quick_action', { includeCustom: false });
    if (mapKeys.length > 0) {
        const rng = resolveQuickStartRng(game, event);
        const randomIndex = rng.int(mapKeys.length);
        game.settings.mapKey = mapKeys[randomIndex];
    }
    game.settings.localSettings.modePath = 'quick_action';
    onSettingsChanged({
        changedKeys: [
            SETTINGS_CHANGE_KEYS.MODE_PATH,
            SETTINGS_CHANGE_KEYS.MAP_KEY,
        ],
    });
    recordMenuTelemetry('quickstart', {
        variant: 'random_map',
        mapKey: game.settings.mapKey,
        sessionType: game?.settings?.localSettings?.sessionType || 'single',
    });
    game._showStatusToast('Schnellstart: Random Map', 1000, 'info');
    startMatch();
}

export function handleLevel3ResetAction(ctx) {
    const { game, onSettingsChanged } = ctx;
    const sessionType = String(game?.settings?.localSettings?.sessionType || 'single').toLowerCase();
    const defaults = createMenuLevel3ResetDefaults();
    game.settings.mapKey = defaults.mapKey;
    game.settings.vehicles.PLAYER_1 = defaults.vehicles.PLAYER_1;
    if (sessionType === 'splitscreen') {
        game.settings.vehicles.PLAYER_2 = defaults.vehicles.PLAYER_2;
    }
    if (!game.settings.localSettings || typeof game.settings.localSettings !== 'object') {
        game.settings.localSettings = {};
    }
    game.settings.localSettings.themeMode = defaults.themeMode;

    onSettingsChanged({
        changedKeys: [
            SETTINGS_CHANGE_KEYS.MAP_KEY,
            SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_1,
            SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_2,
            SETTINGS_CHANGE_KEYS.LOCAL_THEME_MODE,
        ],
    });
    game._showStatusToast('Ebene 3 zurueckgesetzt', 1200, 'info');
}

export function handleLevel4OpenAction(ctx) {
    const { game, event } = ctx;
    const requestedSectionId = String(event?.sectionId || '').trim();
    const validSectionIds = new Set(Object.values(LEVEL4_SECTION_IDS));
    game.uiManager?.menuNavigationRuntime?.showPanel?.('submenu-game', { trigger: 'open_level4' });
    if (!game.settings.localSettings.toolsState || typeof game.settings.localSettings.toolsState !== 'object') {
        game.settings.localSettings.toolsState = {};
    }
    if (validSectionIds.has(requestedSectionId)) {
        game.settings.localSettings.toolsState.activeSection = requestedSectionId;
        game.uiManager?.setLevel4Section?.(requestedSectionId, { persist: true, focus: false });
    }
    game.settings.localSettings.toolsState.level4Open = true;
    game.uiManager?.setLevel4Open?.(true);
}

export function handleLevel4CloseAction(ctx) {
    const { game } = ctx;
    if (!game.settings.localSettings.toolsState || typeof game.settings.localSettings.toolsState !== 'object') {
        game.settings.localSettings.toolsState = {};
    }
    game.settings.localSettings.toolsState.level4Open = false;
    game.uiManager?.setLevel4Open?.(false);
}

export function handleLevel4ResetAction(ctx) {
    const { game, onSettingsChanged } = ctx;
    const defaults = game.settingsManager.createDefaultSettings();
    game.settings.gameplay = { ...defaults.gameplay };
    game.settings.controls = JSON.parse(JSON.stringify(defaults.controls));
    if (!game.settings.localSettings || typeof game.settings.localSettings !== 'object') {
        game.settings.localSettings = {};
    }
    game.settings.localSettings.shadowQuality = defaults.localSettings.shadowQuality;
    game.settings.portalsEnabled = defaults.portalsEnabled;
    game.settings.autoRoll = defaults.autoRoll;
    game.settings.invertPitch = { ...defaults.invertPitch };
    game.settings.cockpitCamera = { ...defaults.cockpitCamera };
    game.settings.numBots = defaults.numBots;
    game.settings.botDifficulty = defaults.botDifficulty;
    game.settings.winsNeeded = defaults.winsNeeded;
    game.settings.hunt = { ...defaults.hunt };
    game.settings.cameraPerspective = { ...defaults.cameraPerspective };

    onSettingsChanged({
        changedKeys: [
            SETTINGS_CHANGE_KEYS.BOTS_COUNT,
            SETTINGS_CHANGE_KEYS.BOTS_DIFFICULTY,
            SETTINGS_CHANGE_KEYS.RULES_WINS_NEEDED,
            SETTINGS_CHANGE_KEYS.RULES_AUTO_ROLL,
            SETTINGS_CHANGE_KEYS.RULES_INVERT_P1,
            SETTINGS_CHANGE_KEYS.RULES_INVERT_P2,
            SETTINGS_CHANGE_KEYS.RULES_COCKPIT_P1,
            SETTINGS_CHANGE_KEYS.RULES_COCKPIT_P2,
            SETTINGS_CHANGE_KEYS.RULES_PORTALS_ENABLED,
            SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_SPEED,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_TURN_SENSITIVITY,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANE_SCALE,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_TRAIL_WIDTH,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_GAP_SIZE,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_GAP_FREQUENCY,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_ITEM_AMOUNT,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_FIRE_RATE,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_LOCK_ON_ANGLE,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_MG_TRAIL_AIM_RADIUS,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_FIGHT_PLAYER_HP,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_FIGHT_MG_DAMAGE,
            SETTINGS_CHANGE_KEYS.LOCAL_SHADOW_QUALITY,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_MODE,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_PORTAL_COUNT,
            SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_LEVEL_COUNT,
            SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_NORMAL,
            SETTINGS_CHANGE_KEYS.CAMERA_PERSPECTIVE_REDUCE_MOTION,
        ],
    });
    game._showStatusToast('Ebene 4 zurueckgesetzt', 1200, 'info');
}
