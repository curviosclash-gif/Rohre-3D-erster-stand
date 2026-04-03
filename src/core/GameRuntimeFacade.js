import { createLogger } from '../shared/logging/Logger.js';
import { SessionRuntimeCommandExecutor } from '../application/session-runtime/SessionRuntimeCommandExecutor.js';
import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { createArcadeRoundStateController } from '../state/arcade/ArcadeRoundStateController.js';
import { prewarmMatchArenaSession } from '../state/MatchSessionFactory.js';
import { GAME_STATE_IDS } from '../shared/contracts/GameStateIds.js';
import { MATCH_LIFECYCLE_CONTRACT_VERSION } from '../shared/contracts/MatchLifecycleContract.js';
import { MENU_CONTROLLER_EVENT_CONTRACT_VERSION } from '../shared/contracts/MenuControllerContract.js';
import { createApplySettingsCommand, createFinalizeMatchCommand, createHostLobbyCommand, createInitializeSessionCommand, createJoinLobbyCommand } from '../shared/contracts/SessionRuntimeCommandContract.js';
import { createPauseMatchCommand, createResumeMatchCommand, createReturnToMenuCommand, createStartMatchCommand } from '../shared/contracts/SessionRuntimeCommandContract.js';
import { createRuntimeClock } from '../shared/contracts/RuntimeClockContract.js';
import {
    guardMenuRuntimeEvent,
    MenuController,
    resolveMenuAccessContext,
    SETTINGS_CHANGE_KEYS,
} from '../composition/core-ui/CoreUiMenuPorts.js';
import { buildArcadeSectorPlan } from '../entities/directors/ArcadeEncounterCatalog.js';
import { ArcadeRunRuntime } from './arcade/ArcadeRunRuntime.js';
import { CONFIG_BASE } from './Config.js';
import { ReplayRecorder } from './replay/ReplayRecorder.js';
import { applyRuntimeConfigCompatibility } from './RuntimeConfig.js';
import {
    applyRuntimeSettingsState,
    getSessionRuntimeHandle,
    getSessionRuntimeState,
} from './runtime/GameRuntimeBundle.js';
import { GameRuntimeMenuActionHandler } from './runtime/GameRuntimeMenuActionHandler.js';
import { GameRuntimeSessionHandler } from './runtime/GameRuntimeSessionHandler.js';
import { GameRuntimeSettingsHandler } from './runtime/GameRuntimeSettingsHandler.js';
import { createMenuEventHandlerRegistry } from './runtime/menu-handlers/CreateMenuEventHandlerRegistry.js';
import {
    createMenuMultiplayerBridge,
} from './runtime/MenuRuntimeMultiplayerService.js';
import { ProfileLifecycleController } from './runtime/ProfileLifecycleController.js';
import { syncRuntimeMultiplayerContext } from './runtime/RuntimeMultiplayerFlowService.js';
import {
    setupRuntimeClientStateReceiver,
    startRuntimeStateBroadcast,
    stopRuntimeStateBroadcast,
} from './runtime/RuntimeSessionLifecycleService.js';

const logger = createLogger('GameRuntimeFacade');

export class GameRuntimeFacade {
    constructor(deps = {}) {
        this.game = deps.game || null;
        this.runtimeBundle = deps.runtimeBundle || this.game?.runtimeBundle || null;
        this.runtimeClock = createRuntimeClock({
            runtime: deps.runtimeClockRuntime || null,
            nowMs: deps.nowMs,
            nowHighRes: deps.nowHighRes,
        });
        this.menuMultiplayerBridge = null;
        this._matchPrewarmTimer = null;
        this.profileLifecycleController = new ProfileLifecycleController({ game: this.game });
        this.menuActionHandler = new GameRuntimeMenuActionHandler({ facade: this });
        this.settingsHandler = new GameRuntimeSettingsHandler({ facade: this });
        this.sessionHandler = new GameRuntimeSessionHandler({ facade: this, logger });
        this.sessionRuntimeCommandExecutor = new SessionRuntimeCommandExecutor({ facade: this });
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
        this._pendingMatchFinalize = null;
        this._pendingMatchFinalizePlan = null;

        this._baseRoundStateController = this.getRuntimeState()?.roundStateController
            || this.game?.roundStateController
            || null;
        this._arcadeRoundStateController = null;
        this._arcadeReplayRecorder = new ReplayRecorder();
        this.arcadeRunRuntime = new ArcadeRunRuntime({
            settingsManager: this.game?.settingsManager || null,
            replayRecorder: this._arcadeReplayRecorder,
            now: this.runtimeClock.nowMs,
            logger: console,
        });

        const withArcadeStrategy = (handler) => {
            const strategy = this.getRuntimeState()?.entityManager?.gameModeStrategy
                || this.game?.entityManager?.gameModeStrategy;
            if (strategy) handler(strategy);
        };
        this.arcadeRunRuntime.setModifierChangedHandler((modifierId) => withArcadeStrategy((strategy) => strategy.setActiveModifier?.(modifierId)));
        this.arcadeRunRuntime.setVehicleUpgradesHandler((bonuses) => withArcadeStrategy((strategy) => strategy.applyVehicleUpgrades?.(bonuses)));
        this.arcadeRunRuntime.setSuddenDeathEnteredHandler(() => withArcadeStrategy((strategy) => strategy.enterSuddenDeath?.()));
    }

    getRuntimeBundle() { return this.runtimeBundle || this.game?.runtimeBundle || null; }
    getRuntimeState() { return getSessionRuntimeState(this.getRuntimeBundle() || this.game); }
    getRuntimeHandle(key) { return getSessionRuntimeHandle(this.getRuntimeBundle() || this.game, key); }
    getPorts() { return this.getRuntimeHandle('runtimePorts'); }
    getUiManager() { return this.getRuntimeHandle('uiManager') || this.game?.uiManager || null; }

    _clearMatchPrewarmTimer() {
        if (!this._matchPrewarmTimer) return;
        clearTimeout(this._matchPrewarmTimer);
        this._matchPrewarmTimer = null;
    }
    scheduleMatchPrewarm() {
        const game = this.game;
        const renderer = this.getRuntimeHandle('renderer');
        if (!renderer || !game?.settingsManager) return;
        if (game.state !== GAME_STATE_IDS.MENU) return;
        if (this.getRuntimeState()?.entityManager) return;
        this._clearMatchPrewarmTimer();
        this._matchPrewarmTimer = setTimeout(() => {
            this._matchPrewarmTimer = null;
            const runtimeState = this.getRuntimeState();
            if (game.state !== GAME_STATE_IDS.MENU) return;
            if (runtimeState?.entityManager) return;
            const runtimeConfig = game.settingsManager.createRuntimeConfig(game.settings);
            Promise.resolve(prewarmMatchArenaSession({
                renderer,
                settings: game.settings,
                runtimeConfig,
                baseConfig: runtimeState?.config || game.config || CONFIG_BASE,
                requestedMapKey: runtimeConfig?.session?.mapKey || runtimeState?.mapKey || game.mapKey,
            })).catch((error) => {
                logger.warn('Match prewarm skipped:', error);
            });
        }, 50);
    }

    executeSessionRuntimeCommand(command = null) { return this.sessionRuntimeCommandExecutor.execute(command); }

    _applySettingsToRuntimeInternal(options = {}) {
        const game = this.game;
        const runtimeBundle = this.getRuntimeBundle();
        const runtimeState = this.getRuntimeState();
        const renderer = this.getRuntimeHandle('renderer');
        const mediaRecorderSystem = this.getRuntimeHandle('mediaRecorderSystem');
        const input = this.getRuntimeHandle('input');
        if (!game?.settingsManager) return;
        const schedulePrewarm = options?.schedulePrewarm !== false;
        const runtimeConfig = game.settingsManager.createRuntimeConfig(game.settings);
        const compatibilityConfig = applyRuntimeConfigCompatibility(runtimeConfig, CONFIG_BASE);

        renderer?.setShadowQuality?.(game.settings?.localSettings?.shadowQuality);
        renderer?.setRecordingCaptureSettings?.(runtimeConfig?.recording);
        renderer?.setCameraPerspectiveSettings?.(runtimeConfig?.cameraPerspective);
        mediaRecorderSystem?.setRecordingCaptureSettings?.(runtimeConfig?.recording);

        applyRuntimeSettingsState(runtimeBundle, {
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

        runtimeState?.arena?.toggleBeams?.(runtimeConfig.gameplay.portalBeams);
        runtimeState?.entityManager?.setBotDifficulty?.(runtimeConfig.bot.activeDifficulty);

        input?.setBindings?.(runtimeConfig.controls);
        this._syncArcadeRuntimeConfig();
        if (schedulePrewarm) {
            this.scheduleMatchPrewarm();
        }
    }

    applySettingsToRuntime(options = {}) { return this.executeSessionRuntimeCommand(createApplySettingsCommand(options)); }

    _activateArcadeRoundController() {
        const runtimeState = this.getRuntimeState();
        if (!runtimeState?.roundStateController) return;
        if (!this._baseRoundStateController) {
            this._baseRoundStateController = runtimeState.roundStateController;
        }
        if (!this._arcadeRoundStateController) {
            this._arcadeRoundStateController = createArcadeRoundStateController({
                baseController: this._baseRoundStateController,
                arcadeRuntime: this.arcadeRunRuntime,
            });
        }
        runtimeState.roundStateController = this._arcadeRoundStateController;
    }

    _deactivateArcadeRoundController() {
        const runtimeState = this.getRuntimeState();
        if (runtimeState && this._baseRoundStateController) runtimeState.roundStateController = this._baseRoundStateController;
    }

    _syncArcadeRuntimeConfig() {
        const runtimeConfig = this.getRuntimeState()?.runtimeConfig || null;
        if (!runtimeConfig) return;
        this.arcadeRunRuntime.configure(runtimeConfig);
        if (runtimeConfig?.arcade?.enabled) {
            this._activateArcadeRoundController();
            return;
        }
        this._deactivateArcadeRoundController();
        this.arcadeRunRuntime.resetRunState({ preserveRecords: true });
    }

    _startArcadeRunIfEnabled() {
        const runtimeState = this.getRuntimeState();
        const runtimeConfig = runtimeState?.runtimeConfig || null;
        if (!runtimeConfig?.arcade?.enabled) return null;
        const strategy = runtimeState?.entityManager?.gameModeStrategy || null;
        this.arcadeRunRuntime.setStrategy(strategy);
        const existing = this.arcadeRunRuntime.getStateSnapshot?.();
        if (existing && String(existing.phase || '').toLowerCase() !== 'finished') return existing;
        const encounterPlan = buildArcadeSectorPlan({
            seed: runtimeConfig?.arcade?.seed,
            sectorCount: runtimeConfig?.arcade?.sectorCount,
            difficulty: runtimeConfig?.bot?.activeDifficulty || runtimeConfig?.bot?.difficulty || 'normal',
        });
        return this.arcadeRunRuntime.startRun({
            entityManager: runtimeState?.entityManager || null,
            roundStateController: runtimeState?.roundStateController || null,
            playerCount: Math.max(1, Number(runtimeState?.numHumans) || 1),
            encounterPlan,
            strategy,
        });
    }

    startArcadeRunIfEnabled() { return this._startArcadeRunIfEnabled(); }

    _resetArcadeRunState() { this.arcadeRunRuntime.resetRunState({ preserveRecords: true }); }
    getArcadeRunState() { return this.arcadeRunRuntime.getStateSnapshot(); }

    setupMenuListeners() {
        const game = this.game;
        const runtimeState = this.getRuntimeState();
        const ui = this.getRuntimeHandle('ui');
        if (!game || !runtimeState || !ui) return;
        runtimeState.menuMultiplayerBridge = createMenuMultiplayerBridge({
            existingBridge: runtimeState.menuMultiplayerBridge,
            contractVersion: game?.menuLifecycleContractVersion || MATCH_LIFECYCLE_CONTRACT_VERSION,
            onEvent: (lifecycleEvent) => game._handleMenuLifecycleEvent?.(lifecycleEvent),
            onStatus: null,
            onStateChanged: (sessionState) => this._handleMultiplayerSessionStateChanged(sessionState),
            onMatchStart: (command) => this._handleMultiplayerMatchStart(command),
        });
        this.menuMultiplayerBridge = runtimeState.menuMultiplayerBridge;
        this.menuMultiplayerBridge?.syncActorIdentity?.(this._resolveMenuAccessContext()?.actorId);
        this._handleMultiplayerSessionStateChanged(this.menuMultiplayerBridge?.getSessionState?.());
        runtimeState.menuController?.dispose?.();

        runtimeState.menuController = new MenuController({
            ui,
            settings: game.settings,
            onEvent: (event) => this.handleMenuControllerEvent(event),
        });
        runtimeState.menuController.setupListeners();
    }

    _captureMultiplayerMatchSettings() {
        return this.settingsHandler.captureMultiplayerMatchSettings();
    }

    _syncMultiplayerUiState() {
        const game = this.game;
        const uiManager = this.getUiManager();
        uiManager?.syncStartSetupState?.(game?.settings);
        uiManager?.syncMultiplayerState?.(game?.settings);
        uiManager?.updateContext?.();
    }

    _handleMultiplayerSessionStateChanged(sessionState = null) {
        const ui = this.getRuntimeHandle('ui');
        if (!ui) return;
        if (sessionState?.joined && ui.multiplayerLobbyCodeInput) {
            ui.multiplayerLobbyCodeInput.value = String(sessionState.lobbyCode || '');
        }
        this._syncMultiplayerUiState();
    }

    _applyAuthoritativeMultiplayerMatchSettings(snapshot) {
        this.settingsHandler.applyAuthoritativeMultiplayerMatchSettings(snapshot);
    }

    _handleMultiplayerMatchStart(command = null) {
        return this.startMatch({ commandId: command?.commandId, hostPeerId: command?.hostPeerId, issuedAt: command?.issuedAt, lobbyCode: command?.lobbyCode, settingsSnapshot: command?.settingsSnapshot, source: 'menu_multiplayer_bridge' });
    }

    _syncMultiplayerRuntimeContext(changedKeys = null) {
        syncRuntimeMultiplayerContext({
            game: this.game,
            changedKeys,
            menuMultiplayerBridge: this.menuMultiplayerBridge,
            resolveMenuAccessContext: () => this._resolveMenuAccessContext(),
            didHostChangeMatchSettings: (nextChangedKeys) => this._didHostChangeMatchSettings(nextChangedKeys),
            captureSettingsSnapshot: () => this._captureMultiplayerMatchSettings(),
            syncUiState: () => this._syncMultiplayerUiState(),
        });
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
        const uiManager = this.getUiManager();
        const telemetrySnapshot = game?.settingsManager?.recordMenuTelemetry?.(game.settings, eventType, payload);
        if (uiManager && typeof uiManager.syncDeveloperState === 'function') {
            if (typeof uiManager.syncByChangeKeys === 'function') {
                uiManager.syncByChangeKeys([SETTINGS_CHANGE_KEYS.MENU_TELEMETRY]);
            } else {
                uiManager.syncDeveloperState(game.settings);
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
        return this.menuActionHandler.handleMenuPanelChanged(previousPanelId, nextPanelId, transitionMetadata);
    }

    handleSessionTypeChange(event) {
        return this.menuActionHandler.handleSessionTypeChange(event);
    }

    handleModePathChange(event) {
        return this.menuActionHandler.handleModePathChange(event);
    }

    handleQuickStartLastStart() {
        return this.menuActionHandler.handleQuickStartLastStart();
    }

    handleQuickStartEventPlaylistStart() {
        return this.menuActionHandler.handleQuickStartEventPlaylistStart();
    }

    handleQuickStartRandomStart() {
        return this.menuActionHandler.handleQuickStartRandomStart();
    }

    handleLevel3Reset() {
        return this.menuActionHandler.handleLevel3Reset();
    }

    handleLevel4Open(event) {
        return this.menuActionHandler.handleLevel4Open(event);
    }

    handleLevel4Close() {
        return this.menuActionHandler.handleLevel4Close();
    }

    handleLevel4Reset() {
        return this.menuActionHandler.handleLevel4Reset();
    }

    handleConfigExportCode() {
        return this.menuActionHandler.handleConfigExportCode();
    }

    handleConfigExportJson() {
        return this.menuActionHandler.handleConfigExportJson();
    }

    handleConfigImport(event) {
        return this.menuActionHandler.handleConfigImport(event);
    }

    applyMenuPreset(event) {
        return this.menuActionHandler.applyMenuPreset(event);
    }

    saveMenuPreset(event, kind) {
        return this.menuActionHandler.saveMenuPreset(event, kind);
    }

    deleteMenuPreset(event) {
        return this.menuActionHandler.deleteMenuPreset(event);
    }

    _didHostChangeMatchSettings(changedKeys) {
        return this.settingsHandler.didHostChangeMatchSettings(changedKeys);
    }

    _invalidateMultiplayerReadyIfHostChangedSettings(changedKeys) {
        return this.settingsHandler.invalidateMultiplayerReadyIfHostChangedSettings(changedKeys);
    }

    handleMultiplayerHost(event) {
        return this.menuActionHandler.handleMultiplayerHost(event);
    }

    handleMultiplayerJoin(event) {
        return this.menuActionHandler.handleMultiplayerJoin(event);
    }

    handleMultiplayerReadyToggle(event) {
        return this.menuActionHandler.handleMultiplayerReadyToggle(event);
    }

    handleDeveloperModeToggle(event) {
        return this.menuActionHandler.handleDeveloperModeToggle(event);
    }

    handleDeveloperThemeChange(event) {
        return this.menuActionHandler.handleDeveloperThemeChange(event);
    }

    handleDeveloperVisibilityChange(event) {
        return this.menuActionHandler.handleDeveloperVisibilityChange(event);
    }

    handleDeveloperFixedPresetLockToggle(event) {
        return this.menuActionHandler.handleDeveloperFixedPresetLockToggle(event);
    }

    handleDeveloperActorChange(event) {
        return this.menuActionHandler.handleDeveloperActorChange(event);
    }

    handleDeveloperReleasePreviewToggle(event) {
        return this.menuActionHandler.handleDeveloperReleasePreviewToggle(event);
    }

    handleDeveloperTextOverrideSet(event) {
        return this.menuActionHandler.handleDeveloperTextOverrideSet(event);
    }

    handleDeveloperTextOverrideClear(event) {
        return this.menuActionHandler.handleDeveloperTextOverrideClear(event);
    }

    handleDeveloperTrainingReset(event) {
        return this.menuActionHandler.handleDeveloperTrainingReset(event);
    }

    handleDeveloperTrainingStep(event) {
        return this.menuActionHandler.handleDeveloperTrainingStep(event);
    }

    handleDeveloperTrainingAutoStep(event) { return this.menuActionHandler.handleDeveloperTrainingAutoStep(event); }
    handleDeveloperTrainingRunBatch(event) { return this.menuActionHandler.handleDeveloperTrainingRunBatch(event); }
    handleDeveloperTrainingRunEval(event) { return this.menuActionHandler.handleDeveloperTrainingRunEval(event); }
    handleDeveloperTrainingRunGate(event) { return this.menuActionHandler.handleDeveloperTrainingRunGate(event); }
    startKeyCapture(event) { return this.menuActionHandler.startKeyCapture(event); }
    resetKeys() { return this.menuActionHandler.resetKeys(); }
    saveKeys() { return this.menuActionHandler.saveKeys(); }
    showStatusToast(event) { return this.menuActionHandler.showStatusToast(event); }
    _resolveStartValidationIssue() { return this.settingsHandler.resolveStartValidationIssue(); }
    onSettingsChanged(event = null) { return this.settingsHandler.onSettingsChanged(event); }
    markSettingsDirty(isDirty) { return this.settingsHandler.markSettingsDirty(isDirty); }
    updateSaveButtonState() { return this.settingsHandler.updateSaveButtonState(); }
    async _initSession(options = undefined) { return this.executeSessionRuntimeCommand(createInitializeSessionCommand(options)); }
    initializeSession(options = undefined) { return this._initSession(options); }
    _startStateBroadcast() { startRuntimeStateBroadcast(this); }
    _stopStateBroadcast() { stopRuntimeStateBroadcast(this); }
    _setupClientStateReceiver() { setupRuntimeClientStateReceiver(this); }
    async _waitForAllPlayersLoaded() { return this.sessionHandler.waitForAllPlayersLoaded(); }
    waitForAllPlayersLoaded() { return this._waitForAllPlayersLoaded(); }
    _teardownSession() { return this.sessionHandler.teardownRuntimeSession(); }
    teardownRuntimeSession() { this._teardownSession(); }
    isNetworkSession() { return this.sessionHandler.isNetworkSession(); }
    isHost() { return this.sessionHandler.isHost(); }
    startMatch(options = undefined) { return this.executeSessionRuntimeCommand(createStartMatchCommand(options)); }
    pauseMatch(options = undefined) { return this.executeSessionRuntimeCommand(createPauseMatchCommand(options)); }
    resumeMatch(options = undefined) { return this.executeSessionRuntimeCommand(createResumeMatchCommand(options)); }
    restartRound() { return this.sessionHandler.restartRound(); }
    returnToMenu(options = {}) { return this.executeSessionRuntimeCommand(createReturnToMenuCommand(options)); }
    finalizeMatch(options = {}) { return this.executeSessionRuntimeCommand(createFinalizeMatchCommand(options)); }
    hostLobby(options = {}) { return this.executeSessionRuntimeCommand(createHostLobbyCommand(options)); }
    joinLobby(options = {}) { return this.executeSessionRuntimeCommand(createJoinLobbyCommand(options)); }
    syncP2HudVisibility() { return this.sessionHandler.syncP2HudVisibility(); }
    dispose() { return this.sessionHandler.dispose(); }
}
