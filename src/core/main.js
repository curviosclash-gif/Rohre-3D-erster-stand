// ============================================
// main.js - entry point and game controller
// ============================================

import { CONFIG } from './Config.js';
import { RoundRecorder } from '../state/RoundRecorder.js';
import { CUSTOM_MAP_KEY } from '../entities/MapSchema.js';
import { UIManager } from '../ui/UIManager.js';
import { SettingsManager } from './SettingsManager.js';
import { ProfileManager } from './ProfileManager.js';
import { ProfileUiController } from '../ui/ProfileUiController.js';
import { createRoundStateController } from '../state/RoundStateController.js';
import { PlayingStateSystem } from './PlayingStateSystem.js';
import { RoundStateTickSystem } from '../state/RoundStateTickSystem.js';
import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { bootstrapGameRuntime } from './GameBootstrap.js';
import { GameRuntimeFacade } from './GameRuntimeFacade.js';
import { GameDebugApi } from './GameDebugApi.js';
import { GAME_STATE_IDS } from '../shared/contracts/GameStateIds.js';
import { LIFECYCLE_EVENT_TYPES } from './MediaRecorderSystem.js';
import { RuntimePerfProfiler } from './perf/RuntimePerfProfiler.js';
import { initializeGameApp } from './AppInitializer.js';
import { isPlaytestLaunchRequested, readPlaytestLaunchBoolParam } from './PlaytestLaunchParams.js';

/* global __APP_VERSION__, __BUILD_TIME__, __BUILD_ID__ */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

export class Game {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.profileManager = new ProfileManager(this.settingsManager.store);

        this.profileDataOps = this.profileManager.getProfileDataOps();

        this.settings = this._loadSettings();
        this.settingsDirty = false;
        this.config = CONFIG;
        this.runtimeConfig = null;
        this.activeGameMode = GAME_MODE_TYPES.CLASSIC;
        this.menuLifecycleContractVersion = 'lifecycle.v1';
        this.menuLifecycleEvents = [];
        this.huntState = {
            overheatByPlayer: {},
            killFeed: [],
            damageIndicator: null,
            damageIndicatorsByPlayer: {},
        };

        this.state = GAME_STATE_IDS.MENU;
        this.roundPause = 0;
        this.roundStateController = createRoundStateController({ defaultRoundPause: 3.0 });
        this.playingStateSystem = new PlayingStateSystem(this);
        this.roundStateTickSystem = new RoundStateTickSystem({ game: this });
        this._hudTimer = 0;
        this._renderAlpha = 1;
        this._renderDelta = 1 / 60;
        this.runtimePerfProfiler = new RuntimePerfProfiler({
            spikeThresholdMs: 30,
        });
        this.keyCapture = null;
        this._disposed = false;
        this._playtestStartTimeoutId = null;
        this._boundKeyCaptureHandler = (event) => this.keybindEditorController.handleKeyCapture(event);

        bootstrapGameRuntime(this, {
            appVersion: APP_VERSION,
            buildId: BUILD_ID,
            buildTime: BUILD_TIME,
            showStatusToast: (message, durationMs, tone) => this._showStatusToast(message, durationMs, tone),
        });
        this.runtimeFacade = new GameRuntimeFacade({ game: this, ports: this.runtimePorts });
        this.debugApi = new GameDebugApi(this);

        // Debug Recorder
        this.recorder = new RoundRecorder();
        this._recorderFrameCaptureEnabled = this.debugApi.resolveRecorderFrameCaptureEnabledDefault();
        this.recorder.setFrameCaptureEnabled(this._recorderFrameCaptureEnabled);

        this._applySettingsToRuntime();
        this.input.setBindings(this.settings.controls);

        this.arena = null;
        this.entityManager = null;
        this.powerupManager = null;

        this.uiManager = new UIManager({ game: this, ports: this.runtimePorts });
        this.uiManager.init();
        this.keybindEditorController.renderEditor();

        this.profileUiController = new ProfileUiController({
            profileManager: this.profileManager,
            settingsManager: this.settingsManager,
            getUi: () => this.ui,
            getUiManager: () => this.uiManager,
            getSettings: () => this.settings,
            setSettings: (s) => { this.settings = s; },
            showStatusToast: (msg, ms, tone) => this._showStatusToast(msg, ms, tone),
            onSettingsChanged: () => this._onSettingsChanged(),
            markSettingsDirty: (dirty) => this._markSettingsDirty(dirty),
            profileControlStateOps: this.profileManager.getProfileControlStateOps(),
            profileUiStateOps: this.profileManager.getProfileUiStateOps(),
        });

        // Backward-compat aliases for callers that read these from game.*
        this.settingsProfiles = this.profileUiController.settingsProfiles;
        this.activeProfileName = this.profileUiController.activeProfileName;
        this.selectedProfileName = this.profileUiController.selectedProfileName;
        this.loadedProfileName = this.profileUiController.loadedProfileName;

        this._setupMenuListeners();
        this._syncProfileControls();
        this._markSettingsDirty(false);
        this._renderBuildInfo();
        if (this.ui?.mainMenu) {
            this.ui.mainMenu.style.visibility = '';
        }

        this.gameLoop.start();

        window.addEventListener('keydown', this._boundKeyCaptureHandler, true);

        this._autoStartPlaytestIfRequested();
    }

    // update() ist weiter unten definiert (einzelne Methode für alles)

    _autoStartPlaytestIfRequested() {
        if (!isPlaytestLaunchRequested()) {
            return;
        }

        this.settings.mapKey = CUSTOM_MAP_KEY;
        const planarRequested = readPlaytestLaunchBoolParam('planar');
        if (typeof planarRequested === 'boolean') {
            if (!this.settings.gameplay) this.settings.gameplay = {};
            this.settings.gameplay.planarMode = planarRequested;
            if (planarRequested) {
                if ((this.settings.gameplay.portalCount || 0) === 0) {
                    this.settings.gameplay.portalCount = 4;
                }
                this.settings.portalsEnabled = true;
            }
        }
        this._onSettingsChanged();

        this._playtestStartTimeoutId = window.setTimeout(() => {
            this._playtestStartTimeoutId = null;
            if (this.state !== GAME_STATE_IDS.MENU) return;
            this.startMatch();
        }, 0);
    }

    _clearPlaytestStartTimeout() {
        if (this._playtestStartTimeoutId == null) return;
        clearTimeout(this._playtestStartTimeoutId);
        this._playtestStartTimeoutId = null;
    }

    _showMainNav() {
        if (this.uiManager) {
            this.uiManager.showMainNav();
        }
    }

    _renderBuildInfo() {
        this._buildInfoClipboardText = this.buildInfoController.renderBuildInfo();
    }

    _loadSettings() {
        return this.settingsManager.loadSettings();
    }

    _saveSettings() {
        const persisted = this.settingsManager.saveSettings(this.settings);
        if (persisted) {
            this._markSettingsDirty(false);
        }
    }

    _applySettingsToRuntime(options = undefined) {
        this.runtimeFacade.applySettingsToRuntime(options);
    }

    _setupMenuListeners() {
        this.runtimeFacade.setupMenuListeners();
    }

    _handleMenuControllerEvent(event) {
        this.runtimeFacade.handleMenuControllerEvent(event);
    }

    _onSettingsChanged(event = null) {
        this.runtimeFacade.onSettingsChanged(event);
    }

    _markSettingsDirty(isDirty) {
        this.runtimeFacade.markSettingsDirty(isDirty);
    }

    _updateSaveButtonState() {
        this.runtimeFacade.updateSaveButtonState();
    }

    _syncProfileControls(options = null) {
        this.profileUiController?.syncProfileControls(options || undefined);
    }

    _syncProfileActionState() {
        this.profileUiController?.syncProfileActionState();
    }

    _setProfileTransferStatus(message, tone) {
        this.profileUiController?.setProfileTransferStatus(message, tone);
    }

    _saveProfile(profileName) {
        return this.profileUiController?.saveProfile(profileName) ?? false;
    }

    _duplicateProfile(sourceProfileName, targetProfileName) {
        return this.profileUiController?.duplicateProfile(sourceProfileName, targetProfileName) ?? false;
    }

    _loadProfile(profileName) {
        return this.profileUiController?.loadProfile(profileName) ?? false;
    }

    _exportProfile(profileName) {
        return this.profileUiController?.exportProfile(profileName) ?? false;
    }

    _importProfile(inputValue, requestedProfileName) {
        return this.profileUiController?.importProfile(inputValue, requestedProfileName) ?? false;
    }

    _setDefaultProfile(profileName) {
        return this.profileUiController?.setDefaultProfile(profileName) ?? false;
    }

    _deleteProfile(profileName) {
        return this.profileUiController?.deleteProfile(profileName) ?? false;
    }

    _showStatusToast(message, durationMs = 1200, tone = 'info') {
        if (!this.uiManager || typeof this.uiManager.showToast !== 'function') return;
        this.uiManager.showToast(message, durationMs, tone);
    }

    _toggleCinematicCameraFromGlobalHotkey() {
        const renderer = this.renderer;
        if (!renderer || typeof renderer.getCinematicEnabled !== 'function' || typeof renderer.setCinematicEnabled !== 'function') {
            return;
        }
        const currentlyEnabled = !!renderer.getCinematicEnabled();
        const nextEnabled = !currentlyEnabled;
        renderer.setCinematicEnabled(nextEnabled);
        this.gameLoop?.requestDeltaReset?.('cinematic-toggle');
        this._showStatusToast(
            nextEnabled ? 'Cinematic Kamera: aktiv' : 'Cinematic Kamera: deaktiviert',
            1400,
            'info'
        );
    }

    _toggleRecordingFromGlobalHotkey() {
        const recorder = this.mediaRecorderSystem;
        if (!recorder || typeof recorder.notifyLifecycleEvent !== 'function') {
            return;
        }

        const support = recorder.getSupportState?.() || null;
        if (support && support.canRecord === false) {
            this._showStatusToast('Videoaufnahme nicht verfuegbar', 1600, 'error');
            return;
        }

        const wasRecording = !!recorder.isRecording?.();
        recorder.notifyLifecycleEvent(LIFECYCLE_EVENT_TYPES.RECORDING_REQUESTED, {
            command: 'toggle',
            source: 'global_hotkey',
        });
        const isRecording = !!recorder.isRecording?.();

        if (!wasRecording && isRecording) {
            this._showStatusToast('Videoaufnahme: gestartet', 1200, 'success');
            return;
        }
        if (wasRecording && !isRecording) {
            this._showStatusToast('Videoaufnahme: gestoppt', 1200, 'info');
            return;
        }
        this._showStatusToast('Videoaufnahme: keine Aenderung', 1200, 'warning');
    }

    _handleGlobalInputHotkeys() {
        if (this.keyCapture) return;
        if (this.input?.wasGlobalActionPressed?.('CINEMATIC_TOGGLE')) {
            this._toggleCinematicCameraFromGlobalHotkey();
        }
        if (this.input?.wasGlobalActionPressed?.('RECORDING_TOGGLE')) {
            this._toggleRecordingFromGlobalHotkey();
        }
    }

    _handleMenuLifecycleEvent(event) {
        const sourceEvent = event && typeof event === 'object' ? event : {};
        const contractVersion = String(sourceEvent.contractVersion || sourceEvent.version || '').trim();
        const type = String(sourceEvent.eventType || sourceEvent.type || '').trim();
        if (!type) return;

        const payload = sourceEvent.payload && typeof sourceEvent.payload === 'object'
            ? { ...sourceEvent.payload }
            : (sourceEvent.context && typeof sourceEvent.context === 'object' ? { ...sourceEvent.context } : {});
        const normalizedEvent = {
            contractVersion: contractVersion || this.menuLifecycleContractVersion,
            type,
            timestampMs: Number(sourceEvent.timestampMs || Date.now()),
            payload,
        };

        this.menuLifecycleEvents.push(normalizedEvent);
        if (this.menuLifecycleEvents.length > 60) {
            this.menuLifecycleEvents.shift();
        }

        if (normalizedEvent.contractVersion !== this.menuLifecycleContractVersion) {
            this._showStatusToast(`Lifecycle-Contract mismatch: ${normalizedEvent.contractVersion}`, 1800, 'error');
            return;
        }

        if (normalizedEvent.type === 'multiplayer_host') {
            const lobbyCode = String(normalizedEvent.payload?.lobbyCode || 'local-lobby');
            this._showStatusToast(`Lobby erstellt: ${lobbyCode}`, 1200, 'info');
            return;
        }
        if (normalizedEvent.type === 'multiplayer_join') {
            const lobbyCode = String(normalizedEvent.payload?.lobbyCode || 'local-lobby');
            this._showStatusToast(`Lobby beigetreten: ${lobbyCode}`, 1200, 'info');
            return;
        }
        if (normalizedEvent.type === 'multiplayer_ready_toggle') {
            const ready = !!normalizedEvent.payload?.ready;
            this._showStatusToast(ready ? 'Ready gesetzt' : 'Ready entfernt', 1000, 'info');
            return;
        }
        if (normalizedEvent.type === 'multiplayer_ready_invalidated') {
            this._showStatusToast('Ready zurueckgesetzt: Host-Settings geaendert', 1500, 'info');
            return;
        }
        if (normalizedEvent.type === 'multiplayer_match_start') {
            const lobbyCode = String(normalizedEvent.payload?.lobbyCode || 'Lobby');
            this._showStatusToast(`Lobby startet Match: ${lobbyCode}`, 1400, 'info');
        }
    }

    getMenuLifecycleEvents() {
        return this.menuLifecycleEvents.slice();
    }

    _showPlayerFeedback(player, message) {
        if (!player) return;
        const prefix = player.isBot ? `Bot ${player.index + 1}` : `P${player.index + 1}`;
        this._showStatusToast(`${prefix}: ${message}`);
    }

    _getDeathMessage(cause) {
        const messages = {
            'WALL': 'Kollision mit der Wand!',
            'TRAIL_SELF': 'Eigener Schweif getroffen!',
            'TRAIL_OTHER': 'Gegnerischer Schweif getroffen!',
            'PROJECTILE': 'Abgeschossen!',
            'OUT_OF_BOUNDS': 'Arena verlassen!',
            'UNKNOWN': 'Unbekannte Todesursache'
        };
        return messages[cause] || messages['UNKNOWN'];
    }

    startMatch() {
        this.runtimeFacade.startMatch();
    }

    getBotValidationMatrix() {
        return this.debugApi?.getBotValidationMatrix?.() || [];
    }

    applyBotValidationScenario(idOrIndex = 0) {
        return this.debugApi?.applyBotValidationScenario?.(idOrIndex) || null;
    }

    _onRoundEnd(winner = null) {
        this.matchFlowUiController?.onRoundEnd?.(winner);
    }

    _getPlanarAimAxis(playerIndex) {
        return this.planarAimAssistSystem.getPlanarAimAxis(playerIndex);
    }

    _updatePlanarAimAssist(dt) {
        this.planarAimAssistSystem.updatePlanarAimAssist(dt);
    }

    _applyPlayingTimeScaleFromEffects() {
        this.planarAimAssistSystem.applyPlayingTimeScaleFromEffects();
    }

    _updatePlayingState(dt) {
        this.playingStateSystem.update(dt);
    }

    _updateRoundEndState(dt) {
        this.roundStateTickSystem.updateRoundEnd(dt);
    }

    _updateMatchEndState(dt) {
        this.roundStateTickSystem.updateMatchEnd(dt);
    }

    _updatePausedState(_dt) {
        if (this.input.wasPressed('Escape')) {
            this.matchFlowUiController.resumeFromPause();
        }
    }

    update(dt) {
        this.runtimeDiagnosticsSystem.update(dt);
        this._handleGlobalInputHotkeys();

        // Debug Recording
        if (this.state === GAME_STATE_IDS.PLAYING && this.entityManager && this.recorder?.shouldCaptureFrames?.()) {
            this.recorder.recordFrame(this.entityManager.players);
        }

        if (this.state === GAME_STATE_IDS.PLAYING) {
            this._updatePlayingState(dt);
        } else if (this.state === GAME_STATE_IDS.PAUSED) {
            this._updatePausedState(dt);
        } else if (this.state === GAME_STATE_IDS.ROUND_END) {
            this._updateRoundEndState(dt);
        } else if (this.state === GAME_STATE_IDS.MATCH_END) {
            this._updateMatchEndState(dt);
        }

        if (this.huntHud) {
            this.huntHud.update(dt);
        }
    }

    // Legacy compatibility hook retained for runtime/tests.
    _returnToMenu() {
        this.runtimeFacade.returnToMenu();
    }

    render(alpha = this.gameLoop?.renderAlpha ?? 1, renderDelta = this.gameLoop?.renderDelta ?? this.gameLoop?.fixedStep ?? (1 / 60)) {
        const numericAlpha = Number(alpha);
        const numericRenderDelta = Number(renderDelta);
        this._renderAlpha = Number.isFinite(numericAlpha) ? Math.max(0, Math.min(1, numericAlpha)) : 1;
        this._renderDelta = Number.isFinite(numericRenderDelta) ? Math.max(0, Math.min(0.05, numericRenderDelta)) : (1 / 60);

        if (this.state === GAME_STATE_IDS.PLAYING || this.state === GAME_STATE_IDS.PAUSED) {
            this.playingStateSystem.render(this._renderAlpha, this._renderDelta);
        }
        const renderStart = this.runtimePerfProfiler?.startSample?.();
        this.renderer.render();
        this.runtimePerfProfiler?.endSample?.('render', renderStart);
        this.mediaRecorderSystem?.captureRenderedFrame?.(this._renderDelta);
    }

    dispose() {
        if (this._disposed) return;
        this._disposed = true;

        this._clearPlaytestStartTimeout();
        if (this._boundKeyCaptureHandler) {
            window.removeEventListener('keydown', this._boundKeyCaptureHandler, true);
            this._boundKeyCaptureHandler = null;
        }

        this.keyCapture = null;
        this.gameLoop?.stop?.();
        this.matchFlowUiController?.sessionOrchestrator?.teardownMatchSession?.();
        this.runtimeFacade?.dispose?.();
        this.huntHud?.dispose?.();
        this.uiManager?.dispose?.();
        this.runtimeDiagnosticsSystem?.dispose?.();
        this.mediaRecorderSystem?.dispose?.();
        this.input?.dispose?.();
        this.audio?.dispose?.();
        this.renderer?.dispose?.();

        if (window.GAME_INSTANCE === this) window.GAME_INSTANCE = null;
        if (window.GAME_RUNTIME === this.runtimeFacade) window.GAME_RUNTIME = null;
        if (window.GAME_DEBUG === this.debugApi) window.GAME_DEBUG = null;
    }

}
initializeGameApp({ createGame: () => new Game() });
