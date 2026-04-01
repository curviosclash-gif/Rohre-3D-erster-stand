import { createLogger } from '../shared/logging/Logger.js';
import { CONFIG, CONFIG_BASE } from './Config.js';

const logger = createLogger('GameRuntimeFacade');
import { applyRuntimeConfigCompatibility } from './RuntimeConfig.js';
import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { MENU_CONTROLLER_EVENT_CONTRACT_VERSION } from '../shared/contracts/MenuControllerContract.js';
import { MATCH_LIFECYCLE_CONTRACT_VERSION } from '../shared/contracts/MatchLifecycleContract.js';
import { createRuntimeClock } from '../shared/contracts/RuntimeClockContract.js';
import { resolveRuntimeSessionContract } from '../shared/contracts/RuntimeSessionContract.js';
import { prewarmMatchArenaSession } from '../state/MatchSessionFactory.js';
import { GAME_STATE_IDS } from '../shared/contracts/GameStateIds.js';
import { applyRuntimeSettingsState } from './runtime/GameRuntimeBundle.js';
import { resolveMatchStartValidationIssue } from './runtime/MatchStartValidationService.js';
import { ReplayRecorder } from './replay/ReplayRecorder.js';
import { ArcadeRunRuntime } from './arcade/ArcadeRunRuntime.js';
import { createArcadeRoundStateController } from '../state/arcade/ArcadeRoundStateController.js';
import { buildArcadeSectorPlan } from '../entities/directors/ArcadeEncounterCatalog.js';
import {
    guardMenuRuntimeEvent,
    MenuController,
    resolveMenuAccessContext,
    SETTINGS_CHANGE_KEYS,
} from '../composition/core-ui/CoreUiMenuPorts.js';
import { MATCH_SETTING_CHANGE_KEY_SET, START_VALIDATION_RELEVANT_KEY_SET } from './runtime/GameRuntimeSettingsKeySets.js';
import {
    initRuntimeSession,
    setupRuntimeClientStateReceiver,
    startRuntimeStateBroadcast,
    stopRuntimeStateBroadcast,
    teardownRuntimeSession,
    waitForRuntimePlayersLoaded,
} from './runtime/RuntimeSessionLifecycleService.js';
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
    createMenuMultiplayerBridge,
    createMultiplayerMatchSettingsSnapshot,
    didHostChangeMatchSettings,
    handleMultiplayerHostAction,
    handleMultiplayerJoinAction,
    handleMultiplayerReadyToggleAction,
    invalidateMultiplayerReadyIfHostChangedSettings,
} from './runtime/MenuRuntimeMultiplayerService.js';
import { orchestrateRuntimeSettingsChanged } from './runtime/RuntimeSettingsChangeOrchestrator.js';
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
import { createMenuEventHandlerRegistry } from './runtime/menu-handlers/CreateMenuEventHandlerRegistry.js';
import { ProfileLifecycleController } from './runtime/ProfileLifecycleController.js';

export class GameRuntimeFacade {
    constructor(deps = {}) {
        this.game = deps.game || null;
        this.ports = deps.ports || null;
        this.runtimeBundle = deps.runtimeBundle || this.game?.runtimeBundle || null;
        this.runtimeClock = createRuntimeClock({
            runtime: deps.runtimeClockRuntime || null,
            nowMs: deps.nowMs,
            nowHighRes: deps.nowHighRes,
        });
        this.menuMultiplayerBridge = null;
        this._matchPrewarmTimer = null;
        this.profileLifecycleController = new ProfileLifecycleController({ game: this.game });
        this._menuEventHandlers = createMenuEventHandlerRegistry(this);

        /** @type {import('./session/SessionAdapter.js').SessionAdapter|null} */
        this.session = null;
        /** @type {import('../network/StateReconciler.js').StateReconciler|null} */
        this._stateReconciler = null;
        this._stateBroadcastTimer = null;
        this._arenaLoadedPeers = new Set();
        this._onStateUpdateHandler = null;
        this._onPlayerLoadedHandler = null;
        this._onArenaStartSignalHandler = null;
        this._pendingStateUpdates = [];

        this._baseRoundStateController = this.game?.roundStateController || null;
        this._arcadeRoundStateController = null;
        this._arcadeReplayRecorder = new ReplayRecorder();
        this.arcadeRunRuntime = new ArcadeRunRuntime({
            settingsManager: this.game?.settingsManager || null,
            replayRecorder: this._arcadeReplayRecorder,
            now: this.runtimeClock.nowMs,
            logger: console,
        });

        const withArcadeStrategy = (handler) => {
            const strategy = this.game?.entityManager?.gameModeStrategy;
            if (strategy) handler(strategy);
        };
        this.arcadeRunRuntime.setModifierChangedHandler((modifierId) => withArcadeStrategy((strategy) => strategy.setActiveModifier?.(modifierId)));
        this.arcadeRunRuntime.setVehicleUpgradesHandler((bonuses) => withArcadeStrategy((strategy) => strategy.applyVehicleUpgrades?.(bonuses)));
        this.arcadeRunRuntime.setSuddenDeathEnteredHandler(() => withArcadeStrategy((strategy) => strategy.enterSuddenDeath?.()));
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
                baseConfig: game.config || CONFIG_BASE,
                requestedMapKey: runtimeConfig?.session?.mapKey || game.mapKey,
            })).catch((error) => {
                logger.warn('Match prewarm skipped:', error);
            });
        }, 50);
    }

    applySettingsToRuntime(options = {}) {
        const game = this.game;
        if (!game?.settingsManager) return;
        const schedulePrewarm = options?.schedulePrewarm !== false;
        const runtimeConfig = game.settingsManager.createRuntimeConfig(game.settings);
        const compatibilityConfig = applyRuntimeConfigCompatibility(runtimeConfig, CONFIG_BASE);

        game.renderer?.setShadowQuality?.(game.settings?.localSettings?.shadowQuality);
        game.renderer?.setRecordingCaptureSettings?.(runtimeConfig?.recording);
        game.renderer?.setCameraPerspectiveSettings?.(runtimeConfig?.cameraPerspective);
        game.mediaRecorderSystem?.setRecordingCaptureSettings?.(runtimeConfig?.recording);

        applyRuntimeSettingsState(this.runtimeBundle || game.runtimeBundle, {
            runtimeConfig,
            config: compatibilityConfig,
            session: {
                numHumans: runtimeConfig?.session?.numHumans,
                numBots: runtimeConfig?.session?.numBots,
                mapKey: runtimeConfig?.session?.mapKey,
                winsNeeded: runtimeConfig?.session?.winsNeeded,
                activeGameMode: runtimeConfig?.session?.activeGameMode || GAME_MODE_TYPES.CLASSIC,
            },
        });

        if (game.arena && game.arena.toggleBeams) {
            game.arena.toggleBeams(runtimeConfig.gameplay.portalBeams);
        }
        if (game.entityManager && game.entityManager.setBotDifficulty) {
            game.entityManager.setBotDifficulty(runtimeConfig.bot.activeDifficulty);
        }

        game.input?.setBindings?.(runtimeConfig.controls);
        this._syncArcadeRuntimeConfig();
        if (schedulePrewarm) {
            this.scheduleMatchPrewarm();
        }
    }

    _activateArcadeRoundController() {
        const game = this.game;
        if (!game?.roundStateController) return;
        if (!this._baseRoundStateController) {
            this._baseRoundStateController = game.roundStateController;
        }
        if (!this._arcadeRoundStateController) {
            this._arcadeRoundStateController = createArcadeRoundStateController({
                baseController: this._baseRoundStateController,
                arcadeRuntime: this.arcadeRunRuntime,
            });
        }
        game.roundStateController = this._arcadeRoundStateController;
    }

    _deactivateArcadeRoundController() {
        const game = this.game;
        if (!game) return;
        if (this._baseRoundStateController) {
            game.roundStateController = this._baseRoundStateController;
        }
    }

    _syncArcadeRuntimeConfig() {
        const game = this.game;
        if (!game?.runtimeConfig) return;
        this.arcadeRunRuntime.configure(game.runtimeConfig);
        if (game.runtimeConfig?.arcade?.enabled) {
            this._activateArcadeRoundController();
            return;
        }
        this._deactivateArcadeRoundController();
        this.arcadeRunRuntime.resetRunState({ preserveRecords: true });
    }

    _startArcadeRunIfEnabled() {
        const game = this.game;
        if (!game?.runtimeConfig?.arcade?.enabled) return null;
        const strategy = game?.entityManager?.gameModeStrategy || null;
        this.arcadeRunRuntime.setStrategy(strategy);
        const existing = this.arcadeRunRuntime.getStateSnapshot?.();
        if (existing && String(existing.phase || '').toLowerCase() !== 'finished') return existing;
        const encounterPlan = buildArcadeSectorPlan({
            seed: game.runtimeConfig?.arcade?.seed,
            sectorCount: game.runtimeConfig?.arcade?.sectorCount,
            difficulty: game.runtimeConfig?.bot?.activeDifficulty || game.runtimeConfig?.bot?.difficulty || 'normal',
        });
        return this.arcadeRunRuntime.startRun({
            entityManager: game.entityManager,
            roundStateController: game.roundStateController,
            playerCount: Math.max(1, Number(game.numHumans) || 1),
            encounterPlan,
            strategy,
        });
    }

    startArcadeRunIfEnabled() { return this._startArcadeRunIfEnabled(); }

    _resetArcadeRunState() {
        this.arcadeRunRuntime.resetRunState({ preserveRecords: true });
    }
    getArcadeRunState() {
        return this.arcadeRunRuntime.getStateSnapshot();
    }

    setupMenuListeners() {
        const game = this.game;
        game.menuMultiplayerBridge = createMenuMultiplayerBridge({
            existingBridge: game.menuMultiplayerBridge,
            contractVersion: game?.menuLifecycleContractVersion || MATCH_LIFECYCLE_CONTRACT_VERSION,
            onEvent: (lifecycleEvent) => game._handleMenuLifecycleEvent?.(lifecycleEvent),
            onStatus: null,
            onStateChanged: (sessionState) => this._handleMultiplayerSessionStateChanged(sessionState),
            onMatchStart: (command) => this._handleMultiplayerMatchStart(command),
        });
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
        const startResult = this.ports?.matchUiPort?.startMatch?.();
        return startResult !== false;
    }

    _syncMultiplayerRuntimeContext(changedKeys = null) {
        const game = this.game;
        if (!resolveRuntimeSessionContract(game?.settings?.localSettings).usesMenuStorageBridge) return;

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

        const handler = this._menuEventHandlers.get(event.type);
        if (typeof handler === 'function') {
            handler(event);
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
        this.arcadeRunRuntime.handleRoundEndTelemetry(payload);
        return this._recordMenuTelemetry('round_end', payload);
    }

    recordMatchEndTelemetry(payload = null) {
        this.arcadeRunRuntime.handleRoundEndTelemetry(payload);
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

    startKeyCapture(event) {
        this.game?.keybindEditorController?.startKeyCapture?.(event?.player, event?.action);
    }

    resetKeys() {
        const game = this.game;
        game.settings.controls = game.settingsManager.cloneDefaultControls();
        this.onSettingsChanged();
        game._showStatusToast('Standard-Tasten wiederhergestellt');
    }

    saveKeys() {
        this.game?._saveSettings?.();
        this.game?._showStatusToast?.('Einstellungen gespeichert');
    }

    showStatusToast(event) {
        this.game?._showStatusToast?.(event?.message, event?.duration, event?.tone);
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
        this.applySettingsToRuntime({ schedulePrewarm: false });
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
            ? 'Einstellungen explizit speichern *'
            : 'Einstellungen explizit speichern';
        game.uiManager?.updateContext();
    }

    // ---- SessionAdapter lifecycle ----

    /**
     * Creates and connects the appropriate SessionAdapter based on runtimeConfig.sessionType.
     * Called at the beginning of a match.
     */
    async _initSession() {
        return initRuntimeSession(this);
    }

    initializeSession() { return this._initSession(); }

    /**
     * Host: broadcasts state snapshots at 10/s to all connected clients.
     */
    _startStateBroadcast() {
        startRuntimeStateBroadcast(this);
    }

    _stopStateBroadcast() {
        stopRuntimeStateBroadcast(this);
    }

    /**
     * Client: listens for authoritative state from the host and feeds it to StateReconciler.
     */
    _setupClientStateReceiver() {
        setupRuntimeClientStateReceiver(this);
    }

    /**
     * Arena-Load-Gate: waits for all peers to signal "loaded" before tick 0.
     * For LocalSessionAdapter this resolves immediately.
     */
    async _waitForAllPlayersLoaded() {
        return waitForRuntimePlayersLoaded(this);
    }

    waitForAllPlayersLoaded() { return this._waitForAllPlayersLoaded(); }

    _teardownSession() {
        teardownRuntimeSession(this);
    }

    teardownRuntimeSession() { this._teardownSession(); }

    /** Returns true if the current session is a network (LAN/Online) session. */
    isNetworkSession() {
        return !!this.game?.runtimeConfig?.session?.networkEnabled;
    }

    /** Returns true if the local client is the host of the session. */
    isHost() {
        return this.session?.isHost ?? true;
    }

    startMatch() {
        this._clearMatchPrewarmTimer();
        const sessionContract = resolveRuntimeSessionContract(this.game?.settings?.localSettings);
        const telemetryPayload = { sessionType: sessionContract.sessionType, multiplayerTransport: sessionContract.multiplayerTransport, modePath: this.game?.settings?.localSettings?.modePath || 'normal' };
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
        if (sessionContract.usesMenuStorageBridge) {
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
        const startResult = this.ports?.matchUiPort?.startMatch?.();
        return startResult !== false;
    }

    restartRound() { this.ports?.matchUiPort?.startRound?.(); }

    returnToMenu(options = {}) {
        this.ports?.sessionPort?.clearLastRoundGhost?.();
        let teardownResult = null;
        try {
            teardownResult = this.ports?.sessionPort?.teardownMatchSession?.({ reason: options?.reason || 'return_to_menu' });
        } catch (error) {
            logger.error('returnToMenu teardown failed:', error);
        }
        this.teardownRuntimeSession();
        this.ports?.inputPort?.clearPlayerSources?.();
        this.game?.hudRuntimeSystem?.clearNetworkScoreboard?.();
        this.ports?.matchUiPort?.applyReturnToMenuUi?.(options);
        this._resetArcadeRunState();
        if (teardownResult && typeof teardownResult.then === 'function') {
            return Promise.resolve(teardownResult).then(() => true).catch((error) => {
                logger.error('returnToMenu teardown failed:', error);
                return false;
            }).finally(() => { this.scheduleMatchPrewarm(); });
        }
        this.scheduleMatchPrewarm();
        return true;
    }

    syncP2HudVisibility() {
        const game = this.game;
        game.ui?.p2Hud?.classList?.toggle('hidden', game.numHumans !== 2);
    }

    dispose() {
        this._clearMatchPrewarmTimer();
        this.teardownRuntimeSession();
        this.game?.menuController?.dispose?.();
        this.game?.menuMultiplayerBridge?.dispose?.();
        if (this.game) {
            this.game.menuController = null;
            this.game.menuMultiplayerBridge = null;
        }
    }
}
