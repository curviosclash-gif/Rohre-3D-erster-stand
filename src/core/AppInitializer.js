// @ts-check

import { attachGlobalRuntimeErrorHandler, showRuntimeErrorOverlay } from './RuntimeErrorOverlay.js';
import { createLogger } from '../shared/logging/Logger.js';

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
 * }} RuntimeWindow
 */

let domReadyHandlerAttached = false;

/**
 * @returns {RuntimeWindow}
 */
function getRuntimeWindow() {
    return /** @type {RuntimeWindow} */ (window);
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
