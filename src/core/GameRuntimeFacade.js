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
    applyMultiplayerMatchSettingsSnapshot,
    createMultiplayerMatchSettingsSnapshot,
    didHostChangeMatchSettings,
    handleMultiplayerHostAction,
    handleMultiplayerJoinAction,
    handleMultiplayerReadyToggleAction,
    invalidateMultiplayerReadyIfHostChangedSettings,
} from './runtime/MenuRuntimeMultiplayerService.js';
import {
    orchestrateRuntimeSettingsChanged,
} from './runtime/RuntimeSettingsChangeOrchestrator.js';
import {
    handleDeveloperTrainingAutoStepAction,
    handleDeveloperTrainingRunBatchAction,
    handleDeveloperTrainingRunEvalAction,
    handleDeveloperTrainingRunGateAction,
    handleDeveloperTrainingResetAction,
    handleDeveloperTrainingStepAction,
} from './runtime/MenuRuntimeDeveloperTrainingService.js';
import {
    handleDeveloperModeToggleAction,
    handleDeveloperThemeChangeAction,
    handleDeveloperVisibilityChangeAction,
    handleDeveloperFixedPresetLockToggleAction,
    handleDeveloperActorChangeAction,
    handleDeveloperReleasePreviewToggleAction,
    handleDeveloperTextOverrideSetAction,
    handleDeveloperTextOverrideClearAction,
} from './runtime/MenuRuntimeDeveloperModeService.js';
import {
    SESSION_SWITCH_CHANGED_KEYS,
    handleSessionTypeChangeAction,
    handleModePathChangeAction,
    handleQuickStartLastStartAction,
    handleQuickStartEventPlaylistStartAction,
    handleQuickStartRandomStartAction,
    handleLevel3ResetAction,
    handleLevel4OpenAction,
    handleLevel4CloseAction,
    handleLevel4ResetAction,
} from './runtime/MenuRuntimeSessionService.js';

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
            Promise.resolve(prewarmMatchArenaSession({
                renderer: game.renderer,
                settings: game.settings,
                runtimeConfig,
                requestedMapKey: runtimeConfig?.session?.mapKey || game.mapKey,
            })).catch((error) => {
                console.warn('[GameRuntimeFacade] Match prewarm skipped:', error);
            });
        }, 50);
    }

    applySettingsToRuntime(options = {}) {
        const game = this.game;
        if (!game?.settingsManager) return;
        const schedulePrewarm = options?.schedulePrewarm !== false;

        game.runtimeConfig = game.settingsManager.createRuntimeConfig(game.settings);
        game.renderer?.setShadowQuality?.(game.settings?.localSettings?.shadowQuality);

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
        if (schedulePrewarm) {
            this.scheduleMatchPrewarm();
        }
    }

    setupMenuListeners() {
        const game = this.game;
        if (!game.menuMultiplayerBridge) {
            game.menuMultiplayerBridge = new MenuMultiplayerBridge({
                contractVersion: game?.menuLifecycleContractVersion || 'lifecycle.v1',
                onEvent: (lifecycleEvent) => game._handleMenuLifecycleEvent?.(lifecycleEvent),
                onStatus: null,
                onStateChanged: (sessionState) => this._handleMultiplayerSessionStateChanged(sessionState),
                onMatchStart: (command) => this._handleMultiplayerMatchStart(command),
            });
        } else {
            game.menuMultiplayerBridge.onEvent = (lifecycleEvent) => game._handleMenuLifecycleEvent?.(lifecycleEvent);
            game.menuMultiplayerBridge.onStatus = null;
            game.menuMultiplayerBridge.onStateChanged = (sessionState) => this._handleMultiplayerSessionStateChanged(sessionState);
            game.menuMultiplayerBridge.onMatchStart = (command) => this._handleMultiplayerMatchStart(command);
        }
        this.menuMultiplayerBridge = game.menuMultiplayerBridge;
        this.menuMultiplayerBridge?.syncActorIdentity?.(this._resolveMenuAccessContext()?.actorId);
        this._handleMultiplayerSessionStateChanged(this.menuMultiplayerBridge?.getSessionState?.());
        game.menuController?.dispose?.();

        game.menuController = new MenuController({
            ui: game.ui,
            settings: game.settings,
            onEvent: (event) => this.handleMenuControllerEvent(event),
        });
        game.menuController.setupListeners();
    }

    _captureMultiplayerMatchSettings() {
        return createMultiplayerMatchSettingsSnapshot(this.game?.settings);
    }

    _syncMultiplayerUiState() {
        const game = this.game;
        game?.uiManager?.syncStartSetupState?.(game.settings);
        game?.uiManager?.syncMultiplayerState?.(game.settings);
        game?.uiManager?.updateContext?.();
    }

    _handleMultiplayerSessionStateChanged(sessionState = null) {
        const game = this.game;
        if (!game?.ui) return;
        if (sessionState?.joined && game.ui.multiplayerLobbyCodeInput) {
            game.ui.multiplayerLobbyCodeInput.value = String(sessionState.lobbyCode || '');
        }
        this._syncMultiplayerUiState();
    }

    _applyAuthoritativeMultiplayerMatchSettings(snapshot) {
        const game = this.game;
        if (!game?.settings) return;
        applyMultiplayerMatchSettingsSnapshot(game.settings, snapshot);
        game.settingsManager?.applyMenuCompatibilityRules?.(
            game.settings,
            { accessContext: this._resolveMenuAccessContext() }
        );
        this.markSettingsDirty(false);
        game.uiManager?.syncAll?.();
        game.uiManager?.updateContext?.();
    }

    _handleMultiplayerMatchStart(command = null) {
        const game = this.game;
        if (!game || game.state !== GAME_STATE_IDS.MENU) return false;
        if (command?.settingsSnapshot) {
            this._applyAuthoritativeMultiplayerMatchSettings(command.settingsSnapshot);
        }
        game.uiManager?.clearStartValidationError?.();
        game.matchFlowUiController?.startMatch?.();
        return true;
    }

    _syncMultiplayerRuntimeContext(changedKeys = null) {
        const game = this.game;
        const sessionType = String(game?.settings?.localSettings?.sessionType || 'single').toLowerCase();
        if (sessionType !== 'multiplayer') return;

        const accessContext = this._resolveMenuAccessContext();
        this.menuMultiplayerBridge?.syncActorIdentity?.(accessContext?.actorId);
        if (Array.isArray(changedKeys) && changedKeys.length > 0 && this._didHostChangeMatchSettings(changedKeys)) {
            this.menuMultiplayerBridge?.publishHostSettings?.(this._captureMultiplayerMatchSettings());
        }
        this._syncMultiplayerUiState();
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
            case MENU_CONTROLLER_EVENT_TYPES.QUICKSTART_EVENT_PLAYLIST_START:
                this.handleQuickStartEventPlaylistStart();
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
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TRAINING_RESET:
                this.handleDeveloperTrainingReset(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TRAINING_STEP:
                this.handleDeveloperTrainingStep(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TRAINING_AUTO_STEP:
                this.handleDeveloperTrainingAutoStep(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TRAINING_RUN_BATCH:
                this.handleDeveloperTrainingRunBatch(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TRAINING_RUN_EVAL:
                this.handleDeveloperTrainingRunEval(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.DEVELOPER_TRAINING_RUN_GATE:
                this.handleDeveloperTrainingRunGate(event);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.START_KEY_CAPTURE:
                game.keybindEditorController.startKeyCapture(event.player, event.action);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.PROFILE_UI_STATE_SYNC:
                if (typeof event.selectedName === 'string') {
                    game.selectedProfileName = event.selectedName;
                }
                if (event.fullRefresh) {
                    game._syncProfileControls();
                } else {
                    game._syncProfileActionState();
                }
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
            case MENU_CONTROLLER_EVENT_TYPES.DUPLICATE_PROFILE:
                game._duplicateProfile(event.sourceName, event.targetName);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.EXPORT_PROFILE:
                game._exportProfile(event.name);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.IMPORT_PROFILE:
                game._importProfile(event.inputValue, event.targetName);
                return;
            case MENU_CONTROLLER_EVENT_TYPES.SET_DEFAULT_PROFILE:
                game._setDefaultProfile(event.name);
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

    recordRoundEndTelemetry(payload = null) {
        return this._recordMenuTelemetry('round_end', payload);
    }

    recordMatchEndTelemetry(payload = null) {
        return this._recordMenuTelemetry('match_end', payload);
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
        handleSessionTypeChangeAction(this._sessionCtx(event));
    }

    handleModePathChange(event) {
        handleModePathChangeAction(this._sessionCtx(event));
    }

    handleQuickStartLastStart() {
        handleQuickStartLastStartAction(this._sessionCtx(null));
    }

    handleQuickStartEventPlaylistStart() {
        handleQuickStartEventPlaylistStartAction(this._sessionCtx(null));
    }

    handleQuickStartRandomStart() {
        handleQuickStartRandomStartAction(this._sessionCtx(null));
    }

    handleLevel3Reset() {
        handleLevel3ResetAction(this._sessionCtx(null));
    }

    handleLevel4Open(event) {
        handleLevel4OpenAction(this._sessionCtx(event));
    }

    handleLevel4Close() {
        handleLevel4CloseAction(this._sessionCtx(null));
    }

    handleLevel4Reset() {
        handleLevel4ResetAction(this._sessionCtx(null));
    }

    _sessionCtx(event) {
        return {
            game: this.game,
            event,
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            recordMenuTelemetry: (type, payload) => this._recordMenuTelemetry(type, payload),
            startMatch: () => this.startMatch(),
            markSettingsDirty: (dirty) => this.markSettingsDirty(dirty),
        };
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
            syncUiState: () => this._syncMultiplayerUiState(),
            captureSettingsSnapshot: () => this._captureMultiplayerMatchSettings(),
        });
    }

    handleMultiplayerJoin(event) {
        handleMultiplayerJoinAction({
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            syncUiState: () => this._syncMultiplayerUiState(),
        });
    }

    handleMultiplayerReadyToggle(event) {
        handleMultiplayerReadyToggleAction({
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            syncUiState: () => this._syncMultiplayerUiState(),
        });
    }

    handleDeveloperModeToggle(event) {
        handleDeveloperModeToggleAction(this._devModeCtx(event));
    }

    handleDeveloperThemeChange(event) {
        handleDeveloperThemeChangeAction(this._devModeCtx(event));
    }

    handleDeveloperVisibilityChange(event) {
        handleDeveloperVisibilityChangeAction(this._devModeCtx(event));
    }

    handleDeveloperFixedPresetLockToggle(event) {
        handleDeveloperFixedPresetLockToggleAction(this._devModeCtx(event));
    }

    handleDeveloperActorChange(event) {
        handleDeveloperActorChangeAction(this._devModeCtx(event));
    }

    handleDeveloperReleasePreviewToggle(event) {
        handleDeveloperReleasePreviewToggleAction(this._devModeCtx(event));
    }

    handleDeveloperTextOverrideSet(event) {
        handleDeveloperTextOverrideSetAction(this._devModeCtx(event));
    }

    handleDeveloperTextOverrideClear(event) {
        handleDeveloperTextOverrideClearAction(this._devModeCtx(event));
    }

    _devModeCtx(event) {
        return {
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            onSettingsChanged: (payload) => this.onSettingsChanged(payload),
            SETTINGS_CHANGE_KEYS,
        };
    }

    handleDeveloperTrainingReset(event) {
        handleDeveloperTrainingResetAction({
            game: this.game,
            event,
        });
    }

    handleDeveloperTrainingStep(event) {
        handleDeveloperTrainingStepAction({
            game: this.game,
            event,
        });
    }

    handleDeveloperTrainingAutoStep(event) {
        handleDeveloperTrainingAutoStepAction({
            game: this.game,
            event,
        });
    }

    handleDeveloperTrainingRunBatch(event) {
        handleDeveloperTrainingRunBatchAction({
            game: this.game,
            event,
        });
    }

    handleDeveloperTrainingRunEval(event) {
        handleDeveloperTrainingRunEvalAction({
            game: this.game,
            event,
        });
    }

    handleDeveloperTrainingRunGate(event) {
        handleDeveloperTrainingRunGateAction({
            game: this.game,
            event,
        });
    }

    _resolveStartValidationIssue() {
        return resolveMatchStartValidationIssue({
            settings: this.game?.settings,
            ui: this.game?.ui,
            multiplayerSessionState: this.menuMultiplayerBridge?.getSessionState?.(),
            maps: CONFIG?.MAPS,
            huntModeType: GAME_MODE_TYPES.HUNT,
        });
    }

    onSettingsChanged(event = null) {
        const changedKeys = orchestrateRuntimeSettingsChanged({
            game: this.game,
            event,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            startValidationRelevantKeySet: START_VALIDATION_RELEVANT_KEY_SET,
            invalidateMultiplayerReadyIfHostChangedSettings: (changedKeys) => this._invalidateMultiplayerReadyIfHostChangedSettings(changedKeys),
            markSettingsDirty: (isDirty) => this.markSettingsDirty(isDirty),
            updateSaveButtonState: () => this.updateSaveButtonState(),
            scheduleMatchPrewarm: () => this.scheduleMatchPrewarm(),
        });
        this._syncMultiplayerRuntimeContext(changedKeys);
        return changedKeys;
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
        if (String(this.game?.settings?.localSettings?.sessionType || 'single').toLowerCase() === 'multiplayer') {
            const startResult = this.menuMultiplayerBridge?.requestMatchStart?.({
                settingsSnapshot: this._captureMultiplayerMatchSettings(),
            });
            if (!startResult?.ok) {
                this._recordMenuTelemetry('abort', {
                    ...telemetryPayload,
                    reason: 'multiplayer_start_failed',
                    code: startResult?.code || 'unknown',
                });
                this.game?._showStatusToast?.(
                    startResult?.message || 'Lobby-Start konnte nicht ausgeliefert werden.',
                    1700,
                    'error'
                );
                return false;
            }
            return true;
        }
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
        this.game?.menuMultiplayerBridge?.dispose?.();
        if (this.game) {
            this.game.menuController = null;
            this.game.menuMultiplayerBridge = null;
        }
    }
}
