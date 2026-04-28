// @ts-check
/* global __CURVIOS_E2E__ */

import { attachGlobalRuntimeErrorHandler, showRuntimeErrorOverlay } from './RuntimeErrorOverlay.js';
import { createLogger } from '../shared/logging/Logger.js';
import { createElectronShellLifecycleAdapter } from '../platform/electron/ElectronShellLifecycleBridge.js';
import { applyTrailDamageFromProjectile } from '../hunt/DestructibleTrail.js';
import { updatePlayerHealthRegen } from '../hunt/HealthSystem.js';

const logger = createLogger('AppInitializer');

/**
 * @typedef {{
 *   dispose?: (() => void) | undefined,
 *   runtimeFacade?: unknown,
 *   debugApi?: unknown,
 * }} RuntimeGameInstance
 */

/**
 * @typedef {Window & typeof globalThis & {
 *   GAME_INSTANCE?: RuntimeGameInstance | null,
 *   GAME_RUNTIME?: unknown,
 *   GAME_DEBUG?: unknown,
 *   __CURVIOS_E2E__?: boolean,
 * }} RuntimeWindow
 */

let domReadyHandlerAttached = false;

/**
 * @returns {RuntimeWindow}
 */
function getRuntimeWindow() {
    return /** @type {RuntimeWindow} */ (window);
}

function isE2ERuntimeEnabled(runtimeWindow) {
    if (runtimeWindow?.__CURVIOS_E2E__ === true) {
        return true;
    }
    const runtimeGlobal = typeof globalThis !== 'undefined'
        ? /** @type {RuntimeWindow} */ (globalThis)
        : null;
    return runtimeGlobal?.__CURVIOS_E2E__ === true;
}

const E2E_TEST_MODULE_IMPORTERS = Object.freeze({
    '/src/core/GameLoop.js': () => import('./GameLoop.js'),
    '/src/core/perf/RuntimePerfProfiler.js': () => import('./perf/RuntimePerfProfiler.js'),
    '/src/core/MediaRecorderSystem.js': () => import('./MediaRecorderSystem.js'),
    '/src/shared/contracts/RecordingCaptureContract.js': () => import('../shared/contracts/RecordingCaptureContract.js'),
    '/src/core/renderer/RecordingCapturePipeline.js': () => import('./renderer/RecordingCapturePipeline.js'),
    '/src/core/renderer/camera/RecordingOrbitCameraDirector.js': () => import('./renderer/camera/RecordingOrbitCameraDirector.js'),
    '/src/core/recording/DownloadService.js': () => import('./recording/DownloadService.js'),
    '/src/core/recording/engines/WebCodecsRecorderEngine.js': () => import('./recording/engines/WebCodecsRecorderEngine.js'),
    '/src/core/runtime/RuntimeSessionLifecycleService.js': () => import('./runtime/RuntimeSessionLifecycleService.js'),
    '/src/core/runtime/MatchStartValidationService.js': () => import('./runtime/MatchStartValidationService.js'),
    '/src/state/TelemetryHistoryStore.js': () => import('../state/TelemetryHistoryStore.js'),
});

async function importCurviosTestModule(moduleSpecifier) {
    const normalizedSpecifier = String(moduleSpecifier || '').trim();
    const importer = Object.prototype.hasOwnProperty.call(E2E_TEST_MODULE_IMPORTERS, normalizedSpecifier)
        ? E2E_TEST_MODULE_IMPORTERS[normalizedSpecifier]
        : null;
    if (typeof importer === 'function') {
        return importer();
    }
    return import(normalizedSpecifier);
}

function attachMinimalCurviosTestApi(runtimeWindow) {
    if (!runtimeWindow || typeof runtimeWindow !== 'object') return;
    const existingApi = runtimeWindow.CURVIOS_TEST_API && typeof runtimeWindow.CURVIOS_TEST_API === 'object'
        ? runtimeWindow.CURVIOS_TEST_API
        : {};
    runtimeWindow.CURVIOS_TEST_API = {
        ...existingApi,
        applyTrailDamageFromProjectile,
        updatePlayerHealthRegen,
        importCurviosTestModule,
    };
}

/**
 * Subscribes the game instance's dispose() to the shell's graceful-close handshake.
 * When the Electron window is closed, the shell sends 'request-graceful-close'.
 * This bridge calls game.dispose() (which triggers facade.dispose() ->
 * finalizeMatch(GAME_DISPOSE) -> MATCH_FINALIZED broadcast to peers) and then
 * confirms to the shell that teardown is complete.
 *
 * Platform-preload access goes exclusively through the dedicated thin adapter
 * (src/platform/electron/ElectronShellLifecycleBridge.js) to stay within the
 * legacy-surface guard matrix.  No-op in browser environments where the
 * lifecycle contract is absent.
 *
 * @param {RuntimeGameInstance} game
 */
function attachShellLifecycleBridge(game) {
    const lifecycleAdapter = createElectronShellLifecycleAdapter();
    if (!lifecycleAdapter.isAvailable()) return;

    lifecycleAdapter.onGracefulClose(async () => {
        try {
            await game?.dispose?.();
        } catch {
            // Best-effort: confirm even if dispose throws so the window always closes.
        } finally {
            lifecycleAdapter.confirmGracefulClose();
        }
    });
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function resolveErrorMessage(error) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return 'Unknown initialization error';
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function resolveErrorStack(error) {
    if (error instanceof Error && error.stack) {
        return error.stack;
    }
    return 'No stack trace';
}

/**
 * @param {() => RuntimeGameInstance} createGame
 */
function mountGameInstance(createGame) {
    const runtimeWindow = getRuntimeWindow();
    runtimeWindow.GAME_INSTANCE?.dispose?.();

    const game = createGame();
    runtimeWindow.GAME_INSTANCE = game;
    runtimeWindow.GAME_RUNTIME = game.runtimeFacade;
    runtimeWindow.GAME_DEBUG = game.debugApi;
    attachMinimalCurviosTestApi(runtimeWindow);

    // Wire shell-level lifecycle events (Electron graceful-close handshake) to the
    // game's canonical dispose port so that window-close always triggers the same
    // finalizing -> match_finalized -> menu_opened path used for in-game exits.
    // No-op in browser environments where the lifecycle contract is absent.
    attachShellLifecycleBridge(game);

    try {
        if (isE2ERuntimeEnabled(runtimeWindow)) {
            import('./TestApiBridge.js')
                .then((mod) => mod?.attachCurviosTestApi?.(runtimeWindow))
                .catch(() => {});
        }
    } catch {
        // ignore
    }
}

/**
 * @param {{ createGame: () => RuntimeGameInstance }} options
 */
export function initializeGameApp({ createGame }) {
    attachGlobalRuntimeErrorHandler();
    if (domReadyHandlerAttached) {
        return;
    }
    domReadyHandlerAttached = true;

    const start = () => {
        try {
            mountGameInstance(createGame);
        } catch (error) {
            logger.error('Fatal Game Init Error:', error);
            showRuntimeErrorOverlay({
                title: 'INIT ERROR',
                lines: [resolveErrorMessage(error)],
                stack: resolveErrorStack(error),
            });
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', start, { once: true });
        return;
    }

    start();
}
