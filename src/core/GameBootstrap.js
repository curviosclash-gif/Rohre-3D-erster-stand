import { Renderer } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { ParticleSystem } from '../entities/Particles.js';
import { AudioManager } from './Audio.js';
import { RuntimeDiagnosticsSystem } from './RuntimeDiagnosticsSystem.js';
import { ScreenShake } from '../hunt/ScreenShake.js';
import { PlanarAimAssistSystem } from './PlanarAimAssistSystem.js';
import { MatchSessionRuntimeBridge } from './MatchSessionRuntimeBridge.js';
import { BuildInfoController } from './BuildInfoController.js';
import { MediaRecorderSystem } from './MediaRecorderSystem.js';
import { createRuntimePorts } from '../shared/runtime/GameRuntimePorts.js';
import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { CONFIG } from './Config.js';
import {
    CrosshairSystem,
    createGameUiDomRefs,
    createHuntHudDomRefs,
    HUD,
    HudRuntimeSystem,
    HuntHUD,
    KeybindEditorController,
    MatchFlowUiController,
    MenuExpertLoginRuntime,
} from '../composition/core-ui/CoreUiBootstrapPorts.js';

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

export function createGameUiRefs() {
    return createGameUiDomRefs(document);
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
        captureSourceResolver: () => game.renderer?.getRecordingCaptureCanvas?.() || canvas,
        recordingCaptureSettings: game.settings?.recording,
        onRecordingStateChange: (isRecording) => game.renderer?.setRecordingActive?.(isRecording),
        runtimePerfProfiler: game.runtimePerfProfiler,
        logger: console,
    });
    game.renderer.setRecordingCaptureSettings(game.settings?.recording);
    game.renderer.setCameraPerspectiveSettings(game.settings?.cameraPerspective);
    game.input = new InputManager();
    game.audio = new AudioManager();
    game.particles = new ParticleSystem(game.renderer);
    game.ui = createGameUiRefs();
    game.runtimePorts = createRuntimePorts(game);

    game.hudP1 = new HUD('p1-fighter-hud', 0);
    game.hudP2 = new HUD('p2-fighter-hud', 1);
    game.huntHud = new HuntHUD({
        runtime: game,
        refs: createHuntHudDomRefs(document),
        isHuntActive: (runtime) => runtime.activeGameMode === GAME_MODE_TYPES.HUNT && runtime.state !== 'MENU',
        getBoostCapacity: () => Number(CONFIG?.PLAYER?.BOOST_DURATION) || 1,
    });
    game.screenShake = new ScreenShake(game.renderer);
    game.hudRuntimeSystem = new HudRuntimeSystem({ game, ports: game.runtimePorts });
    game.crosshairSystem = new CrosshairSystem({ game, ports: game.runtimePorts });
    game.matchFlowUiController = new MatchFlowUiController({ game, ports: game.runtimePorts });
    game.runtimeDiagnosticsSystem = new RuntimeDiagnosticsSystem(game);
    game.keybindEditorController = new KeybindEditorController(game);
    game.planarAimAssistSystem = new PlanarAimAssistSystem(game);
    game.matchSessionRuntimeBridge = new MatchSessionRuntimeBridge({ game, ports: game.runtimePorts });

    game.gameLoop = new GameLoop(
        (dt) => game.update(dt),
        (renderAlpha, renderDelta) => game.render(renderAlpha, renderDelta),
        {
            runtimePerfProfiler: game.runtimePerfProfiler,
        }
    );

    game.matchFlowUiController._setupPauseOverlayListeners();
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
