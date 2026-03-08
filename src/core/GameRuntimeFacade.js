import { CONFIG } from './Config.js';
import { applyRuntimeConfigCompatibility } from './RuntimeConfig.js';
import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import {
    MenuController,
    MENU_CONTROLLER_EVENT_CONTRACT_VERSION,
    MENU_CONTROLLER_EVENT_TYPES,
} from '../ui/MenuController.js';
import { SETTINGS_CHANGE_KEYS } from '../ui/SettingsChangeKeys.js';
import { guardMenuRuntimeEvent, resolveMenuAccessContext } from '../ui/menu/MenuAccessPolicy.js';
import { MenuMultiplayerBridge } from '../ui/menu/MenuMultiplayerBridge.js';
import { LEVEL4_SECTION_IDS } from '../ui/menu/MenuStateContracts.js';
import { prewarmMatchArenaSession } from '../state/MatchSessionFactory.js';
import { GAME_STATE_IDS } from './runtime/GameStateIds.js';
import { resolveMatchStartValidationIssue } from './runtime/MatchStartValidationService.js';
import {
    applyMenuPresetAction,
    deleteMenuPresetAction,
    handleConfigExportCodeAction,
    handleConfigExportJsonAction,
    handleConfigImportAction,
    saveMenuPresetAction,
} from './runtime/MenuRuntimePresetConfigService.js';
import {
    didHostChangeMatchSettings,
    handleMultiplayerHostAction,
    handleMultiplayerJoinAction,
    handleMultiplayerReadyToggleAction,
    invalidateMultiplayerReadyIfHostChangedSettings,
} from './runtime/MenuRuntimeMultiplayerService.js';
import {
    orchestrateRuntimeSettingsChanged,
} from './runtime/RuntimeSettingsChangeOrchestrator.js';

const MATCH_SETTING_CHANGE_KEY_SET = new Set([
    SETTINGS_CHANGE_KEYS.MODE,
    SETTINGS_CHANGE_KEYS.GAME_MODE,
    SETTINGS_CHANGE_KEYS.MAP_KEY,
    SETTINGS_CHANGE_KEYS.BOTS_COUNT,
    SETTINGS_CHANGE_KEYS.BOTS_DIFFICULTY,
    SETTINGS_CHANGE_KEYS.RULES_WINS_NEEDED,
    SETTINGS_CHANGE_KEYS.RULES_AUTO_ROLL,
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
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_MODE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PORTAL_COUNT,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_LEVEL_COUNT,
]);

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
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_MODE,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PORTAL_COUNT,
    SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_LEVEL_COUNT,
    SETTINGS_CHANGE_KEYS.LOCAL_THEME_MODE,
]);

const MODE_PATH_TO_PRESET_ID = Object.freeze({
    arcade: 'arcade',
    fight: 'fight-standard',
    normal: 'normal-standard',
});

const START_VALIDATION_RELEVANT_KEY_SET = new Set([
    SETTINGS_CHANGE_KEYS.SESSION_TYPE,
    SETTINGS_CHANGE_KEYS.MODE_PATH,
    SETTINGS_CHANGE_KEYS.MAP_KEY,
    SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_1,
    SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_2,
    SETTINGS_CHANGE_KEYS.GAME_MODE,
    SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED,
]);

export class GameRuntimeFacade {
    constructor(game) {
        this.game = game || null;
        this.menuMultiplayerBridge = null;
        this._matchPrewarmTimer = null;
    }

    _clearMatchPrewarmTimer() {
        if (!this._matchPrewarmTimer) return;
        clearTimeout(this._matchPrewarmTimer);
        this._matchPrewarmTimer = null;
    }

    scheduleMatchPrewarm() {
        const game = this.game;
        if (!game?.renderer || !game?.settingsManager) return;
        if (game.state !== GAME_STATE_IDS.MENU) return;
        if (game.entityManager) return;

        this._clearMatchPrewarmTimer();
        this._matchPrewarmTimer = setTimeout(() => {
            this._matchPrewarmTimer = null;
            if (game.state !== GAME_STATE_IDS.MENU) return;
            if (game.entityManager) return;

            const runtimeConfig = game.settingsManager.createRuntimeConfig(game.settings);
            prewarmMatchArenaSession({
                renderer: game.renderer,
                settings: game.settings,
                runtimeConfig,
                requestedMapKey: runtimeConfig?.session?.mapKey || game.mapKey,
            });
        }, 50);
    }

    applySettingsToRuntime() {
        const game = this.game;
        if (!game?.settingsManager) return;

        game.runtimeConfig = game.settingsManager.createRuntimeConfig(game.settings);

        game.numHumans = game.runtimeConfig.session.numHumans;
        game.numBots = game.runtimeConfig.session.numBots;
        game.mapKey = game.runtimeConfig.session.mapKey;
        game.winsNeeded = game.runtimeConfig.session.winsNeeded;
        game.activeGameMode = game.runtimeConfig?.session?.activeGameMode || GAME_MODE_TYPES.CLASSIC;

        applyRuntimeConfigCompatibility(game.runtimeConfig, CONFIG);

        if (game.arena && game.arena.toggleBeams) {
            game.arena.toggleBeams(game.runtimeConfig.gameplay.portalBeams);
        }
        if (game.entityManager && game.entityManager.setBotDifficulty) {
            game.entityManager.setBotDifficulty(game.runtimeConfig.bot.activeDifficulty);
        }

        game.input?.setBindings?.(game.runtimeConfig.controls);
        this.scheduleMatchPrewarm();
    }

    setupMenuListeners() {
        const game = this.game;
        if (!game.menuMultiplayerBridge) {
            game.menuMultiplayerBridge = new MenuMultiplayerBridge({
                contractVersion: game?.menuLifecycleContractVersion || 'lifecycle.v1',
                onEvent: (lifecycleEvent) => game._handleMenuLifecycleEvent?.(lifecycleEvent),
                onStatus: (message) => game._showStatusToast(message, 1300, 'info'),
            });
        }
        this.menuMultiplayerBridge = game.menuMultiplayerBridge;
        game.menuController?.dispose?.();

        game.menuController = new MenuController({
            ui: game.ui,
            settings: game.settings,
            onEvent: (event) => this.handleMenuControllerEvent(event),
        });
        game.menuController.setupListeners();
    }

    handleMenuControllerEvent(event) {
        const game = this.game;
        if (!event?.type) return;
        if (event.contractVersion && event.contractVersion !== MENU_CONTROLLER_EVENT_CONTRACT_VERSION) {
            game._showStatusToast('Menu-Event-Contract mismatch.', 1800, 'error');
            return;
        }
        const accessResult = guardMenuRuntimeEvent(event.type, this._resolveMenuAccessContext());
        if (!accessResult.allowed) {
            game._showStatusToast('Aktion gesperrt (nur Host).', 1600, 'error');
            return;
        }

        switch (event.type) {
            case MENU_CONTROLLER_EVENT_TYPES.SETTINGS_CHANGED:
                this.onSettingsChanged(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.SESSION_TYPE_CHANGE:
                this.handleSessionTypeChange(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.MODE_PATH_CHANGE:
                this.handleModePathChange(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.QUICKSTART_LAST_START:
                this.handleQuickStartLastStart();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.QUICKSTART_RANDOM_START:
                this.handleQuickStartRandomStart();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.LEVEL3_RESET:
                this.handleLevel3Reset();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.LEVEL4_OPEN:
                this.handleLevel4Open();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.LEVEL4_CLOSE:
                this.handleLevel4Close();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.LEVEL4_RESET:
                this.handleLevel4Reset();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.CONFIG_EXPORT_CODE:
                this.handleConfigExportCode();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.CONFIG_EXPORT_JSON:
                this.handleConfigExportJson();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.CONFIG_IMPORT:
                this.handleConfigImport(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.START_MATCH:
                this.startMatch();
                return;
            case MENU_CONTROLLER_EVENT_TYPES.PRESET_APPLY:
                this.applyMenuPreset(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.PRESET_SAVE_OPEN:
                this.saveMenuPreset(event, 'open');
                return;
            case MENU_CONTROLLER_EVENT_TYPES.PRESET_SAVE_FIXED:
                this.saveMenuPreset(event, 'fixed');
                return;
            case MENU_CONTROLLER_EVENT_TYPES.PRESET_DELETE:
                this.deleteMenuPreset(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.MULTIPLAYER_HOST:
                this.handleMultiplayerHost(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.MULTIPLAYER_JOIN:
                this.handleMultiplayerJoin(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.MULTIPLAYER_READY_TOGGLE:
                this.handleMultiplayerReadyToggle(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_MODE_TOGGLE:
                this.handleDeveloperModeToggle(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_THEME_CHANGE:
                this.handleDeveloperThemeChange(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_VISIBILITY_CHANGE:
                this.handleDeveloperVisibilityChange(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_FIXED_PRESET_LOCK_TOGGLE:
                this.handleDeveloperFixedPresetLockToggle(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_ACTOR_CHANGE:
                this.handleDeveloperActorChange(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_RELEASE_PREVIEW_TOGGLE:
                this.handleDeveloperReleasePreviewToggle(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TEXT_OVERRIDE_SET:
                this.handleDeveloperTextOverrideSet(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TEXT_OVERRIDE_CLEAR:
                this.handleDeveloperTextOverrideClear(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.START_KEY_CAPTURE:
                game.keybindEditorController.startKeyCapture(event.player, event.action);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.SAVE_PROFILE:
                game._saveProfile(event.name);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.LOAD_PROFILE:
                game._loadProfile(event.name);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DELETE_PROFILE:
                game._deleteProfile(event.name);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.RESET_KEYS:
                game.settings.controls = game.settingsManager.cloneDefaultControls();
                this.onSettingsChanged();
                game._showStatusToast('✅ Standard-Tasten wiederhergestellt');
                return;
            case MENU_CONTROLLER_EVENT_TYPES.SAVE_KEYS:
                game._saveSettings();
                game._showStatusToast('Einstellungen gespeichert');
                return;
            case MENU_CONTROLLER_EVENT_TYPES.SHOW_STATUS_TOAST:
                game._showStatusToast(event.message, event.duration, event.tone);
                return;
            default:
                return;
        }
    }

    _resolveMenuAccessContext() {
        return resolveMenuAccessContext(this.game?.settings);
    }

    _recordMenuTelemetry(eventType, payload = null) {
        const game = this.game;
        const telemetrySnapshot = game?.settingsManager?.recordMenuTelemetry?.(game.settings, eventType, payload);
        if (game?.uiManager && typeof game.uiManager.syncDeveloperState === 'function') {
            if (typeof game.uiManager.syncByChangeKeys === 'function') {
                game.uiManager.syncByChangeKeys([SETTINGS_CHANGE_KEYS.MENU_TELEMETRY]);
            } else {
                game.uiManager.syncDeveloperState(game.settings);
            }
        }
        return telemetrySnapshot;
    }

    handleMenuPanelChanged(previousPanelId, nextPanelId, transitionMetadata = null) {
        const fromPanelId = String(previousPanelId || '').trim();
        const toPanelId = String(nextPanelId || '').trim();
        const trigger = String(transitionMetadata?.trigger || '').trim();
        if (toPanelId) return;
        if (!fromPanelId || fromPanelId === 'submenu-custom') {
            if (trigger === 'back_button' || trigger === 'escape') {
                this._recordMenuTelemetry('backtrack', { fromPanelId, trigger });
            }
            return;
        }

        const isBacktrack = trigger === 'back_button' || trigger === 'escape';
        if (isBacktrack) {
            this._recordMenuTelemetry('backtrack', { fromPanelId, trigger });
        }
        if (fromPanelId === 'submenu-game') {
            this._recordMenuTelemetry('abort', { fromPanelId, trigger });
        }
    }

    handleSessionTypeChange(event) {
        const game = this.game;
        const requestedSessionType = String(event?.sessionType || '').trim().toLowerCase();
        if (!requestedSessionType) return;

        const result = game.settingsManager.switchSessionType(game.settings, requestedSessionType);
        if (!result.success) {
            game._showStatusToast('Session-Typ konnte nicht gewechselt werden.', 1700, 'error');
            return;
        }

        this.onSettingsChanged({ changedKeys: SESSION_SWITCH_CHANGED_KEYS });
        const label = result.targetSessionType === 'splitscreen'
            ? 'Splitscreen'
            : (result.targetSessionType === 'multiplayer' ? 'Multiplayer' : 'Single Player');
        game._showStatusToast(
            result.loadedDraft ? `Session gewechselt: ${label} (Draft geladen)` : `Session gewechselt: ${label}`,
            1200,
            'info'
        );
    }

    handleModePathChange(event) {
        const game = this.game;
        const requestedModePath = String(event?.modePath || '').trim().toLowerCase();
        const modePath = requestedModePath === 'arcade' || requestedModePath === 'fight' || requestedModePath === 'normal'
            ? requestedModePath
            : 'normal';
        game.settings.localSettings.modePath = modePath;

        const changedKeys = [SETTINGS_CHANGE_KEYS.MODE_PATH];
        const presetId = MODE_PATH_TO_PRESET_ID[modePath];
        if (presetId) {
            const presetResult = game.settingsManager.applyMenuPreset(
                game.settings,
                presetId,
                this._resolveMenuAccessContext()
            );
            if (presetResult.success && Array.isArray(presetResult.changedKeys)) {
                changedKeys.push(...presetResult.changedKeys);
            }
        }

        if (modePath === 'fight') {
            game.settings.gameMode = 'HUNT';
            changedKeys.push(SETTINGS_CHANGE_KEYS.GAME_MODE, SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED);
        } else if (modePath === 'normal') {
            game.settings.gameMode = 'CLASSIC';
            changedKeys.push(SETTINGS_CHANGE_KEYS.GAME_MODE, SETTINGS_CHANGE_KEYS.HUNT_RESPAWN_ENABLED);
        }

        this.onSettingsChanged({ changedKeys: Array.from(new Set(changedKeys)) });
        game.uiManager?.menuNavigationRuntime?.showPanel?.('submenu-game', {
            trigger: 'mode_path_selected',
            modePath,
        });

        const label = modePath === 'fight' ? 'Fight' : (modePath === 'arcade' ? 'Arcade' : 'Normal');
        game._showStatusToast(`Modus gewaehlt: ${label}`, 1200, 'info');
    }

    handleQuickStartLastStart() {
        const game = this.game;
        game.settings.localSettings.modePath = 'quick_action';
        this.onSettingsChanged({ changedKeys: [SETTINGS_CHANGE_KEYS.MODE_PATH] });
        this._recordMenuTelemetry('quickstart', {
            variant: 'last_settings',
            sessionType: game?.settings?.localSettings?.sessionType || 'single',
        });
        game._showStatusToast('Schnellstart: letzte Einstellungen', 1000, 'info');
        this.startMatch();
    }

    handleQuickStartRandomStart() {
        const game = this.game;
        const mapKeys = Object.keys(CONFIG?.MAPS || {}).filter((key) => key && key !== 'custom');
        if (mapKeys.length > 0) {
            const randomIndex = Math.floor(Math.random() * mapKeys.length);
            game.settings.mapKey = mapKeys[randomIndex];
        }
        game.settings.localSettings.modePath = 'quick_action';
        this.onSettingsChanged({
            changedKeys: [
                SETTINGS_CHANGE_KEYS.MODE_PATH,
                SETTINGS_CHANGE_KEYS.MAP_KEY,
            ],
        });
        this._recordMenuTelemetry('quickstart', {
            variant: 'random_map',
            mapKey: game.settings.mapKey,
            sessionType: game?.settings?.localSettings?.sessionType || 'single',
        });
        game._showStatusToast('Schnellstart: Random Map', 1000, 'info');
        this.startMatch();
    }

    handleLevel3Reset() {
        const game = this.game;
        const sessionType = String(game?.settings?.localSettings?.sessionType || 'single').toLowerCase();
        game.settings.mapKey = 'standard';
        game.settings.vehicles.PLAYER_1 = 'ship5';
        if (sessionType === 'splitscreen') {
            game.settings.vehicles.PLAYER_2 = 'ship5';
        }
        if (!game.settings.localSettings || typeof game.settings.localSettings !== 'object') {
            game.settings.localSettings = {};
        }
        game.settings.localSettings.themeMode = 'dunkel';

        this.onSettingsChanged({
            changedKeys: [
                SETTINGS_CHANGE_KEYS.MAP_KEY,
                SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_1,
                SETTINGS_CHANGE_KEYS.VEHICLES_PLAYER_2,
                SETTINGS_CHANGE_KEYS.LOCAL_THEME_MODE,
            ],
        });
        game._showStatusToast('Ebene 3 zurueckgesetzt', 1200, 'info');
    }

    handleLevel4Open(event) {
        const game = this.game;
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

    handleLevel4Close() {
        const game = this.game;
        if (!game.settings.localSettings.toolsState || typeof game.settings.localSettings.toolsState !== 'object') {
            game.settings.localSettings.toolsState = {};
        }
        game.settings.localSettings.toolsState.level4Open = false;
        game.uiManager?.setLevel4Open?.(false);
    }

    handleLevel4Reset() {
        const game = this.game;
        const defaults = game.settingsManager.createDefaultSettings();
        game.settings.gameplay = { ...defaults.gameplay };
        game.settings.controls = JSON.parse(JSON.stringify(defaults.controls));
        game.settings.portalsEnabled = defaults.portalsEnabled;
        game.settings.autoRoll = defaults.autoRoll;
        game.settings.invertPitch = { ...defaults.invertPitch };
        game.settings.cockpitCamera = { ...defaults.cockpitCamera };
        game.settings.numBots = defaults.numBots;
        game.settings.botDifficulty = defaults.botDifficulty;
        game.settings.winsNeeded = defaults.winsNeeded;
        game.settings.hunt = { ...defaults.hunt };

        this.onSettingsChanged({
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
                SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_MODE,
                SETTINGS_CHANGE_KEYS.GAMEPLAY_PORTAL_COUNT,
                SETTINGS_CHANGE_KEYS.GAMEPLAY_PLANAR_LEVEL_COUNT,
            ],
        });
        game._showStatusToast('Ebene 4 zurueckgesetzt', 1200, 'info');
    }

    handleConfigExportCode() {
        handleConfigExportCodeAction(this.game);
    }

    handleConfigExportJson() {
        handleConfigExportJsonAction(this.game);
    }

    handleConfigImport(event) {
        handleConfigImportAction({
            game: this.game,
            inputValue: String(event?.inputValue || this.game?.ui?.configShareInput?.value || ''),
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            sessionSwitchChangedKeys: SESSION_SWITCH_CHANGED_KEYS,
        });
    }

    applyMenuPreset(event) {
        const presetId = String(event?.presetId || '').trim();
        applyMenuPresetAction({
            game: this.game,
            presetId,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    saveMenuPreset(event, kind) {
        saveMenuPresetAction({
            game: this.game,
            kind,
            presetName: String(event?.name || '').trim(),
            sourcePresetId: String(event?.sourcePresetId || '').trim(),
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    deleteMenuPreset(event) {
        deleteMenuPresetAction({
            game: this.game,
            presetId: String(event?.presetId || '').trim(),
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    _didHostChangeMatchSettings(changedKeys) {
        return didHostChangeMatchSettings(changedKeys, MATCH_SETTING_CHANGE_KEY_SET);
    }

    _invalidateMultiplayerReadyIfHostChangedSettings(changedKeys) {
        invalidateMultiplayerReadyIfHostChangedSettings({
            changedKeys,
            matchSettingChangeKeySet: MATCH_SETTING_CHANGE_KEY_SET,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            game: this.game,
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    handleMultiplayerHost(event) {
        handleMultiplayerHostAction({
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    handleMultiplayerJoin(event) {
        handleMultiplayerJoinAction({
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    handleMultiplayerReadyToggle(event) {
        handleMultiplayerReadyToggleAction({
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    handleDeveloperModeToggle(event) {
        const game = this.game;
        const result = game.settingsManager.setDeveloperMode(
            game.settings,
            !!event?.enabled,
            this._resolveMenuAccessContext()
        );
        if (!result.success) {
            game._showStatusToast('Developer-Modus gesperrt.', 1500, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_MODE_ENABLED],
        });
    }

    handleDeveloperThemeChange(event) {
        const game = this.game;
        const themeId = String(event?.themeId || '').trim();
        const result = game.settingsManager.setDeveloperTheme(
            game.settings,
            themeId,
            this._resolveMenuAccessContext()
        );
        if (!result.success) {
            game._showStatusToast('Theme-Wechsel gesperrt.', 1500, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_THEME_ID],
        });
    }

    handleDeveloperVisibilityChange(event) {
        const game = this.game;
        const result = game.settingsManager.setDeveloperVisibility(
            game.settings,
            String(event?.mode || '').trim(),
            this._resolveMenuAccessContext()
        );
        if (!result.success) {
            game._showStatusToast('Developer-Visibility gesperrt.', 1500, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_VISIBILITY_MODE],
        });
    }

    handleDeveloperFixedPresetLockToggle(event) {
        const game = this.game;
        const result = game.settingsManager.setDeveloperFixedPresetLock(
            game.settings,
            !!event?.enabled,
            this._resolveMenuAccessContext()
        );
        if (!result.success) {
            game._showStatusToast('Fixed-Preset-Lock gesperrt.', 1500, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_FIXED_PRESET_LOCK],
        });
    }

    handleDeveloperActorChange(event) {
        const game = this.game;
        const actorId = String(event?.actorId || '').trim();
        const result = game.settingsManager.setDeveloperActor(
            game.settings,
            actorId,
            this._resolveMenuAccessContext()
        );
        if (!result.success) {
            game._showStatusToast('Actor-Wechsel gesperrt.', 1500, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_ACTOR_ID],
        });
    }

    handleDeveloperReleasePreviewToggle(event) {
        const game = this.game;
        const enabled = !!event?.enabled;
        const result = game.settingsManager.setDeveloperReleasePreview(
            game.settings,
            enabled,
            this._resolveMenuAccessContext()
        );
        if (!result.success) {
            game._showStatusToast('Release-Vorschau gesperrt.', 1500, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_RELEASE_PREVIEW],
        });
        game._showStatusToast(
            enabled
                ? 'Release-Vorschau aktiv: Developer-Pfad simuliert deaktiviert.'
                : 'Release-Vorschau deaktiviert.',
            1500,
            'info'
        );
    }

    handleDeveloperTextOverrideSet(event) {
        const game = this.game;
        const textId = String(event?.textId || '').trim();
        const textValue = String(event?.textValue || '');
        if (!textId) {
            game._showStatusToast('Text-ID fehlt.', 1400, 'error');
            return;
        }

        const result = game.settingsManager.setMenuTextOverride(textId, textValue);
        if (!result.success) {
            game._showStatusToast('Text-Override konnte nicht gesetzt werden.', 1700, 'error');
            return;
        }

        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_TEXT_OVERRIDES],
        });
        game._showStatusToast('Text-Override gespeichert.', 1200, 'success');
    }

    handleDeveloperTextOverrideClear(event) {
        const game = this.game;
        const textId = String(event?.textId || '').trim();
        if (!textId) {
            game._showStatusToast('Text-ID fehlt.', 1400, 'error');
            return;
        }
        const result = game.settingsManager.clearMenuTextOverride(textId);
        if (!result.success) {
            game._showStatusToast('Text-Override konnte nicht geloescht werden.', 1700, 'error');
            return;
        }
        this.onSettingsChanged({
            changedKeys: [SETTINGS_CHANGE_KEYS.DEVELOPER_TEXT_OVERRIDES],
        });
        game._showStatusToast('Text-Override geloescht.', 1200, 'success');
    }

    _resolveStartValidationIssue() {
        return resolveMatchStartValidationIssue({
            settings: this.game?.settings,
            ui: this.game?.ui,
            maps: CONFIG?.MAPS,
            huntModeType: GAME_MODE_TYPES.HUNT,
        });
    }

    onSettingsChanged(event = null) {
        orchestrateRuntimeSettingsChanged({
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            startValidationRelevantKeySet: START_VALIDATION_RELEVANT_KEY_SET,
            invalidateMultiplayerReadyIfHostChangedSettings: (changedKeys) => this._invalidateMultiplayerReadyIfHostChangedSettings(changedKeys),
            markSettingsDirty: (isDirty) => this.markSettingsDirty(isDirty),
            updateSaveButtonState: () => this.updateSaveButtonState(),
            scheduleMatchPrewarm: () => this.scheduleMatchPrewarm(),
        });
    }

    markSettingsDirty(isDirty) {
        const game = this.game;
        game.settingsDirty = !!isDirty;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const game = this.game;
        if (!game.ui?.saveKeysButton) return;
        game.ui.saveKeysButton.classList.toggle('unsaved', game.settingsDirty);
        game.ui.saveKeysButton.textContent = game.settingsDirty
            ? '💾 Einstellungen explizit speichern *'
            : '💾 Einstellungen explizit speichern';
        game.uiManager?.updateContext();
    }

    startMatch() {
        this._clearMatchPrewarmTimer();
        const telemetryPayload = {
            sessionType: this.game?.settings?.localSettings?.sessionType || 'single',
            modePath: this.game?.settings?.localSettings?.modePath || 'normal',
        };
        this._recordMenuTelemetry('start_attempt', telemetryPayload);
        const validationIssue = this._resolveStartValidationIssue();
        if (validationIssue) {
            this.game?.uiManager?.showStartValidationError?.(validationIssue, { focusField: true });
            this._recordMenuTelemetry('abort', {
                ...telemetryPayload,
                reason: 'start_validation_failed',
                fieldKey: validationIssue.fieldKey,
            });
            this.game?._showStatusToast?.(validationIssue.message, 1700, 'error');
            return false;
        }
        this.game?.uiManager?.clearStartValidationError?.();
        this.game?.matchFlowUiController?.startMatch?.();
        return true;
    }

    restartRound() {
        this.game?.matchFlowUiController?.startRound?.();
    }

    returnToMenu() {
        this.game?.matchFlowUiController?.returnToMenu?.();
        this.scheduleMatchPrewarm();
    }

    syncP2HudVisibility() {
        const game = this.game;
        game.ui?.p2Hud?.classList?.toggle('hidden', game.numHumans !== 2);
    }

    dispose() {
        this._clearMatchPrewarmTimer();
        this.game?.menuController?.dispose?.();
        if (this.game) {
            this.game.menuController = null;
        }
    }
}
