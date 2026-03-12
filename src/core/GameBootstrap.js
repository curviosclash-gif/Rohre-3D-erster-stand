import { Renderer } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { ParticleSystem } from '../entities/Particles.js';
import { AudioManager } from './Audio.js';
import { HUD } from '../ui/HUD.js';
import { MatchFlowUiController } from '../ui/MatchFlowUiController.js';
import { RuntimeDiagnosticsSystem } from './RuntimeDiagnosticsSystem.js';
import { KeybindEditorController } from '../ui/KeybindEditorController.js';
import { HuntHUD } from '../hunt/HuntHUD.js';
import { ScreenShake } from '../hunt/ScreenShake.js';
import { PlanarAimAssistSystem } from './PlanarAimAssistSystem.js';
import { MatchSessionRuntimeBridge } from './MatchSessionRuntimeBridge.js';
import { HudRuntimeSystem } from '../ui/HudRuntimeSystem.js';
import { CrosshairSystem } from '../ui/CrosshairSystem.js';
import { BuildInfoController } from './BuildInfoController.js';
import { MediaRecorderSystem } from './MediaRecorderSystem.js';
import { MenuExpertLoginRuntime } from '../ui/menu/MenuExpertLoginRuntime.js';

function readBooleanQueryParam(paramName, fallback = false) {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has(paramName)) return fallback;
        const value = String(params.get(paramName) || '').trim().toLowerCase();
        if (value === '1' || value === 'true' || value === 'yes' || value === 'on') return true;
        if (value === '0' || value === 'false' || value === 'no' || value === 'off') return false;
    } catch {
        // no-op
    }
    return fallback;
}

function readNumberQueryParam(paramName, fallback, min, max) {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has(paramName)) return fallback;
        const value = Number(params.get(paramName));
        if (!Number.isFinite(value)) return fallback;
        return Math.max(min, Math.min(max, Math.floor(value)));
    } catch {
        // no-op
    }
    return fallback;
}

function resolveRecorderRuntimeConfig() {
    return {
        autoRecordingEnabled: readBooleanQueryParam('autorecord', false),
        captureFps: readNumberQueryParam('recordfps', 30, 10, 60),
    };
}

function defineLazyUiRef(target, key, resolver) {
    let resolved = false;
    let cached = null;
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        get() {
            if (!resolved) {
                cached = resolver();
                resolved = true;
            }
            return cached;
        },
        set(value) {
            cached = value;
            resolved = true;
        },
    });
}

export function createGameUiRefs() {
    const ui = {
        mainMenu: document.getElementById('main-menu'),
        hud: document.getElementById('hud'),
        p2Hud: document.getElementById('p2-hud'),
        p1Score: document.querySelector('#p1-hud .player-score'),
        p2Score: document.querySelector('#p2-hud .player-score'),
        p1Items: document.getElementById('p1-items'),
        p2Items: document.getElementById('p2-items'),
        messageOverlay: document.getElementById('message-overlay'),
        messageText: document.getElementById('message-text'),
        messageSub: document.getElementById('message-sub'),
        statusToast: document.getElementById('status-toast'),
        keybindWarning: document.getElementById('keybind-warning'),
        menuContext: document.getElementById('menu-context'),
        menuNav: document.getElementById('menu-nav'),
        menuPanels: Array.from(document.querySelectorAll('.submenu-panel')),
        menuNavButtons: Array.from(document.querySelectorAll('.nav-btn')),
        openExpertButton: document.getElementById('btn-open-expert'),
        expertQuickLockButton: document.getElementById('btn-expert-lock-quick'),
        expertLockedState: document.getElementById('expert-locked-state'),
        expertUnlockedState: document.getElementById('expert-unlocked-state'),
        expertPasswordInput: document.getElementById('expert-password-input'),
        expertUnlockButton: document.getElementById('btn-expert-unlock'),
        expertCancelButton: document.getElementById('btn-expert-cancel'),
        expertLockButton: document.getElementById('btn-expert-lock'),
        expertStatus: document.getElementById('expert-login-status'),
        sessionButtons: Array.from(document.querySelectorAll('.nav-btn[data-session-type]')),
        modePathButtons: Array.from(document.querySelectorAll('.mode-path-btn[data-mode-path]')),
        quickStartLastButton: document.getElementById('btn-quick-last-settings'),
        quickStartRandomButton: document.getElementById('btn-quick-random-map'),
        customStepperButtons: Array.from(document.querySelectorAll('[data-menu-step], [data-menu-step-target]')),
        buildInfo: document.getElementById('build-info'),
        buildInfoDetail: document.getElementById('build-info-detail'),
        copyBuildButton: document.getElementById('btn-copy-build'),
        openDeveloperButton: document.getElementById('btn-open-developer'),
        openDebugButton: document.getElementById('btn-open-debug'),

        modeButtons: Array.from(document.querySelectorAll('.mode-btn[data-mode]')),
        gameModeButtons: Array.from(document.querySelectorAll('.game-mode-btn')),
        dimensionModeButtons: Array.from(document.querySelectorAll('.dimension-mode-btn[data-planar-mode]')),
        huntRespawnToggle: document.getElementById('hunt-respawn-toggle'),
        huntRespawnRow: document.getElementById('hunt-respawn-row'),
        huntModeHint: document.getElementById('hunt-mode-hint'),
        mapSelect: document.getElementById('map-select'),
        mapSearchInput: document.getElementById('map-search-input'),
        mapFilterSelect: document.getElementById('map-filter-select'),
        mapFavoriteToggleButton: document.getElementById('btn-map-favorite-toggle'),
        mapFavoritesList: document.getElementById('map-favorites-list'),
        mapRecentList: document.getElementById('map-recent-list'),
        mapPreview: document.getElementById('map-preview'),
        mapFieldHint: document.getElementById('map-field-hint'),
        botSlider: document.getElementById('bot-count'),
        botLabel: document.getElementById('bot-count-label'),
        botDifficultySelect: document.getElementById('bot-difficulty'),
        winSlider: document.getElementById('win-count'),
        winLabel: document.getElementById('win-count-label'),
        autoRollToggle: document.getElementById('auto-roll-toggle'),
        invertP1: document.getElementById('invert-p1'),
        invertP2: document.getElementById('invert-p2'),
        cockpitCamP1: document.getElementById('cockpit-cam-p1'),
        cockpitCamP2: document.getElementById('cockpit-cam-p2'),
        portalsToggle: document.getElementById('portals-toggle'),

        speedSlider: document.getElementById('speed-slider'),
        speedLabel: document.getElementById('speed-label'),
        turnSlider: document.getElementById('turn-slider'),
        turnLabel: document.getElementById('turn-label'),
        planeSizeSlider: document.getElementById('plane-size-slider'),
        planeSizeLabel: document.getElementById('plane-size-label'),
        trailWidthSlider: document.getElementById('trail-width-slider'),
        trailWidthLabel: document.getElementById('trail-width-label'),
        gapSizeSlider: document.getElementById('gap-size-slider'),
        gapSizeLabel: document.getElementById('gap-size-label'),
        gapFrequencySlider: document.getElementById('gap-frequency-slider'),
        gapFrequencyLabel: document.getElementById('gap-frequency-label'),
        itemAmountSlider: document.getElementById('item-amount-slider'),
        itemAmountLabel: document.getElementById('item-amount-label'),
        fireRateSlider: document.getElementById('fire-rate-slider'),
        fireRateLabel: document.getElementById('fire-rate-label'),
        lockOnSlider: document.getElementById('lockon-slider'),
        lockOnLabel: document.getElementById('lockon-label'),
        mgTrailAimSlider: document.getElementById('mg-trail-aim-slider'),
        mgTrailAimLabel: document.getElementById('mg-trail-aim-label'),
        shadowQualitySlider: document.getElementById('shadow-quality-slider'),
        shadowQualityLabel: document.getElementById('shadow-quality-label'),
        crosshairP1: document.getElementById('crosshair-p1'),
        crosshairP2: document.getElementById('crosshair-p2'),

        keybindP1: document.getElementById('keybind-p1'),
        keybindP2: document.getElementById('keybind-p2'),
        keybindGlobal: document.getElementById('keybind-global'),
        resetKeysButton: document.getElementById('btn-reset-keys'),
        saveKeysButton: document.getElementById('btn-save-keys'),
        profileNameInput: document.getElementById('profile-name'),
        profileSelect: document.getElementById('profile-select'),
        profileSaveButton: document.getElementById('btn-profile-save'),
        profileLoadButton: document.getElementById('btn-profile-load'),
        profileDeleteButton: document.getElementById('btn-profile-delete'),
        profileDuplicateButton: document.getElementById('btn-profile-duplicate'),
        profileDefaultButton: document.getElementById('btn-profile-set-default'),
        profileTransferInput: document.getElementById('profile-transfer-input'),
        profileExportButton: document.getElementById('btn-profile-export'),
        profileImportButton: document.getElementById('btn-profile-import'),
        profileTransferStatus: document.getElementById('profile-transfer-status'),
        presetSelect: document.getElementById('preset-select'),
        presetApplyButton: document.getElementById('btn-preset-apply'),
        presetSaveOpenButton: document.getElementById('btn-preset-save-open'),
        presetSaveFixedButton: document.getElementById('btn-preset-save-fixed'),
        presetDeleteButton: document.getElementById('btn-preset-delete'),
        presetNameInput: document.getElementById('preset-name'),
        presetStatus: document.getElementById('preset-status'),
        quickstartPresetButtons: null,
        multiplayerHostButton: document.getElementById('btn-multiplayer-host'),
        multiplayerJoinButton: document.getElementById('btn-multiplayer-join'),
        multiplayerReadyToggle: document.getElementById('multiplayer-ready-toggle'),
        multiplayerStatus: document.getElementById('multiplayer-status'),
        multiplayerLobbyCodeInput: document.getElementById('multiplayer-lobby-code'),
        developerModeToggle: document.getElementById('developer-mode-toggle'),
        developerThemeSelect: document.getElementById('developer-theme-select'),
        developerVisibilitySelect: document.getElementById('developer-visibility-select'),
        developerFixedPresetLockToggle: document.getElementById('developer-fixed-preset-lock-toggle'),
        developerActorSelect: document.getElementById('developer-actor-select'),
        developerReleasePreviewToggle: document.getElementById('developer-release-preview-toggle'),
        developerTextIdSelect: document.getElementById('developer-text-id-select'),
        developerTextOverrideInput: document.getElementById('developer-text-override-input'),
        developerTextApplyButton: document.getElementById('btn-developer-text-apply'),
        developerTextClearButton: document.getElementById('btn-developer-text-clear'),
        developerTelemetryOutput: document.getElementById('developer-telemetry-output'),
        developerTrainingModeSelect: document.getElementById('developer-training-mode-select'),
        developerTrainingPlanarToggle: document.getElementById('developer-training-planar-toggle'),
        developerTrainingMaxStepsInput: document.getElementById('developer-training-max-steps-input'),
        developerTrainingSeedInput: document.getElementById('developer-training-seed-input'),
        developerTrainingInventoryInput: document.getElementById('developer-training-inventory-input'),
        developerTrainingYawSelect: document.getElementById('developer-training-yaw-select'),
        developerTrainingPitchSelect: document.getElementById('developer-training-pitch-select'),
        developerTrainingBoostToggle: document.getElementById('developer-training-boost-toggle'),
        developerTrainingShootMgToggle: document.getElementById('developer-training-shoot-mg-toggle'),
        developerTrainingShootItemToggle: document.getElementById('developer-training-shoot-item-toggle'),
        developerTrainingShootItemIndexInput: document.getElementById('developer-training-shoot-item-index-input'),
        developerTrainingKillsInput: document.getElementById('developer-training-kills-input'),
        developerTrainingDamageDealtInput: document.getElementById('developer-training-damage-dealt-input'),
        developerTrainingDamageTakenInput: document.getElementById('developer-training-damage-taken-input'),
        developerTrainingItemUsesInput: document.getElementById('developer-training-item-uses-input'),
        developerTrainingCrashedToggle: document.getElementById('developer-training-crashed-toggle'),
        developerTrainingStuckToggle: document.getElementById('developer-training-stuck-toggle'),
        developerTrainingWonToggle: document.getElementById('developer-training-won-toggle'),
        developerTrainingLostToggle: document.getElementById('developer-training-lost-toggle'),
        developerTrainingDoneToggle: document.getElementById('developer-training-done-toggle'),
        developerTrainingTerminalReasonInput: document.getElementById('developer-training-terminal-reason-input'),
        developerTrainingAutoStepsInput: document.getElementById('developer-training-auto-steps-input'),
        developerTrainingBatchEpisodesInput: document.getElementById('developer-training-batch-episodes-input'),
        developerTrainingBatchSeedsInput: document.getElementById('developer-training-batch-seeds-input'),
        developerTrainingBatchModesInput: document.getElementById('developer-training-batch-modes-input'),
        developerTrainingBridgeModeSelect: document.getElementById('developer-training-bridge-mode-select'),
        developerTrainingTimeoutMsInput: document.getElementById('developer-training-timeout-ms-input'),
        developerTrainingGateMinReturnInput: document.getElementById('developer-training-gate-min-return-input'),
        developerTrainingGateMinTerminalRateInput: document.getElementById('developer-training-gate-min-terminal-rate-input'),
        developerTrainingGateMaxTruncationRateInput: document.getElementById('developer-training-gate-max-truncation-rate-input'),
        developerTrainingGateMaxInvalidRateInput: document.getElementById('developer-training-gate-max-invalid-rate-input'),
        developerTrainingGateMaxRuntimeErrorsInput: document.getElementById('developer-training-gate-max-runtime-errors-input'),
        developerTrainingResetButton: document.getElementById('btn-developer-training-reset'),
        developerTrainingStepButton: document.getElementById('btn-developer-training-step'),
        developerTrainingAutoStepButton: document.getElementById('btn-developer-training-auto-step'),
        developerTrainingRunBatchButton: document.getElementById('btn-developer-training-run-batch'),
        developerTrainingRunEvalButton: document.getElementById('btn-developer-training-run-eval'),
        developerTrainingRunGateButton: document.getElementById('btn-developer-training-run-gate'),
        developerTrainingOutput: document.getElementById('developer-training-output'),
        developerHint: document.getElementById('developer-hint'),
        debugHints: null,

        vehicleSelectP1: document.getElementById('vehicle-select-p1'),
        vehicleSelectP2: document.getElementById('vehicle-select-p2'),
        vehicleSearchInput: document.getElementById('vehicle-search-input'),
        vehicleFilterSelect: document.getElementById('vehicle-filter-select'),
        vehicleFavoriteToggleButton: document.getElementById('btn-vehicle-favorite-toggle'),
        vehicleFavoritesList: document.getElementById('vehicle-favorites-list'),
        vehicleRecentList: document.getElementById('vehicle-recent-list'),
        vehiclePreviewP1: document.getElementById('vehicle-preview-p1'),
        vehiclePreviewP2: document.getElementById('vehicle-preview-p2'),
        vehicleP1FieldHint: document.getElementById('vehicle-p1-field-hint'),
        vehicleP2FieldHint: document.getElementById('vehicle-p2-field-hint'),
        vehicleP2Container: document.getElementById('vehicle-p2-container'),
        themeModeSelect: document.getElementById('theme-mode-select'),
        themeFieldHint: document.getElementById('theme-field-hint'),
        matchFieldHint: document.getElementById('match-field-hint'),
        startValidationStatus: document.getElementById('start-validation-status'),
        menuSummary: document.getElementById('menu-selection-summary'),
        multiplayerInlineState: document.getElementById('multiplayer-inline-stub'),
        multiplayerLobbyState: document.getElementById('multiplayer-lobby-state'),

        startButton: document.getElementById('btn-start'),
        level3ResetButton: document.getElementById('btn-level3-reset'),
        openLevel4Button: document.getElementById('btn-open-level4'),
        level4Drawer: document.getElementById('submenu-level4'),
        startAccordions: null,
        level4SectionTabs: null,
        level4SectionPanels: null,
        closeLevel4Button: document.getElementById('btn-close-level4'),
        level4ResetButton: document.getElementById('btn-level4-reset'),
        configShareInput: document.getElementById('config-share-input'),
        configShareStatus: document.getElementById('config-share-status'),
        exportConfigCodeButton: document.getElementById('btn-config-export-code'),
        exportConfigJsonButton: document.getElementById('btn-config-export-json'),
        importConfigButton: document.getElementById('btn-config-import'),
        openEditorButton: document.getElementById('btn-open-editor'),
        openVehicleEditorButton: document.getElementById('btn-open-vehicle-editor'),
    };

    defineLazyUiRef(ui, 'quickstartPresetButtons', () => Array.from(document.querySelectorAll('[data-preset-id]')));
    defineLazyUiRef(ui, 'debugHints', () => Array.from(document.querySelectorAll('.debug-hint')));
    defineLazyUiRef(ui, 'startAccordions', () => Array.from(document.querySelectorAll('[data-start-section]')));
    defineLazyUiRef(ui, 'level4SectionTabs', () => Array.from(document.querySelectorAll('[data-level4-section-target]')));
    defineLazyUiRef(ui, 'level4SectionPanels', () => Array.from(document.querySelectorAll('#submenu-level4 [data-level4-section]')));

    return ui;
}

export function bootstrapGameRuntime(game, options = {}) {
    const canvas = document.getElementById('game-canvas');
    game.renderer = new Renderer(canvas);
    game.renderer.setShadowQuality(game.settings?.localSettings?.shadowQuality);
    const recorderRuntimeConfig = resolveRecorderRuntimeConfig();
    game.mediaRecorderSystem = new MediaRecorderSystem({
        canvas,
        autoRecordingEnabled: recorderRuntimeConfig.autoRecordingEnabled,
        autoDownload: true,
        captureFps: recorderRuntimeConfig.captureFps,
        downloadDirectoryName: 'videos',
        onRecordingStateChange: (isRecording) => game.renderer?.setRecordingActive?.(isRecording),
        runtimePerfProfiler: game.runtimePerfProfiler,
        logger: console,
    });
    game.input = new InputManager();
    game.audio = new AudioManager();
    game.particles = new ParticleSystem(game.renderer);

    game.hudP1 = new HUD('p1-fighter-hud', 0);
    game.hudP2 = new HUD('p2-fighter-hud', 1);
    game.huntHud = new HuntHUD(game);
    game.screenShake = new ScreenShake(game.renderer);
    game.hudRuntimeSystem = new HudRuntimeSystem(game);
    game.crosshairSystem = new CrosshairSystem(game);
    game.matchFlowUiController = new MatchFlowUiController(game);
    game.runtimeDiagnosticsSystem = new RuntimeDiagnosticsSystem(game);
    game.keybindEditorController = new KeybindEditorController(game);
    game.planarAimAssistSystem = new PlanarAimAssistSystem(game);
    game.matchSessionRuntimeBridge = new MatchSessionRuntimeBridge(game);

    game.gameLoop = new GameLoop(
        (dt) => game.update(dt),
        (renderAlpha, renderDelta) => game.render(renderAlpha, renderDelta),
        {
            runtimePerfProfiler: game.runtimePerfProfiler,
        }
    );

    game.ui = createGameUiRefs();
    game._navButtons = [];
    game._menuButtonByPanel = new Map();
    game._activeSubmenu = null;
    game._lastMenuTrigger = null;
    game._buildInfoClipboardText = '';

    const showStatusToast = typeof options.showStatusToast === 'function'
        ? options.showStatusToast
        : (message, durationMs, tone) => game?._showStatusToast?.(message, durationMs, tone);

    game.buildInfoController = new BuildInfoController({
        ui: game.ui,
        showStatusToast,
        appVersion: options.appVersion,
        buildId: options.buildId,
        buildTime: options.buildTime,
    });
    game.menuExpertLoginRuntime = new MenuExpertLoginRuntime({
        settings: game.settings,
        ui: game.ui,
        showStatusToast,
    });
}
