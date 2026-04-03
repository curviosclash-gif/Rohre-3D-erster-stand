// ============================================
// MatchKernelInteractiveAdapter.js - interactive runtime adapter for MatchKernel (V84)
// ============================================
//
// Contract (match-kernel-interactive-adapter.v1):
// - Inputs: game (interactive runtime handle), kernel (MatchKernel instance)
// - Outputs: kernel tick result via adapter.tick(dt, renderFrameId)
// - Invariants:
//   - This adapter bridges PlayingStateSystem and the MatchKernel.
//   - It reads game.input (live interactive source) and passes it to the kernel.
//   - It does NOT own round/match-end logic; callers read kernel.lifecycle after tick.
//   - Pause/Escape intent is handled by PlayingStateSystem before calling this adapter.

import {
    createMatchKernelTickEnvelope,
    MATCH_KERNEL_SURFACES,
} from '../shared/contracts/MatchKernelRuntimeContract.js';

export const MATCH_KERNEL_INTERACTIVE_ADAPTER_CONTRACT_VERSION =
    'match-kernel-interactive-adapter.v1';

/**
 * MatchKernelInteractiveAdapter – bridges the interactive `game` object to MatchKernel.
 *
 * Usage inside PlayingStateSystem:
 *   if (this._kernelAdapter) {
 *       this._kernelAdapter.tick(dt, renderFrameId);
 *   } else {
 *       // legacy direct calls
 *   }
 */
export class MatchKernelInteractiveAdapter {
    constructor({ game = null, kernel = null } = {}) {
        this._game = game;
        this._kernel = kernel;
    }

    get kernel() { return this._kernel; }

    /**
     * tick – drive one MatchKernel tick from the interactive game loop.
     *
     * @param {number} dt            Fixed simulation step in seconds.
     * @param {number} renderFrameId Current render frame counter from GameLoop.
     * @returns {object|null} MatchKernel tick result or null if not running.
     */
    tick(dt, renderFrameId = 0) {
        if (!this._kernel || this._kernel.lifecycle !== 'running') return null;

        const tickEnvelope = createMatchKernelTickEnvelope({
            tickIndex: this._kernel.tickIndex,
            fixedStepSeconds: dt,
            frameId: renderFrameId,
            surface: MATCH_KERNEL_SURFACES.INTERACTIVE,
            wallClockMs: (typeof Date !== 'undefined') ? Date.now() : 0,
            highResTimestampMs: (typeof performance !== 'undefined') ? performance.now() : 0,
            timeScale: this._game?.gameLoop?.timeScale ?? 1,
        });

        // Pass game.input directly: it provides getPlayerInput(playerIndex, options).
        // EntityManager.update(dt, inputManager, frameId) uses this interface.
        return this._kernel.tick(tickEnvelope, this._game?.input ?? null);
    }

    /**
     * dispose – release references.
     */
    dispose() {
        this._game = null;
        this._kernel = null;
    }
}

/**
 * createMatchKernelInteractiveAdapter – factory for interactive kernel adapters.
 *
 * @param {{ game: object, kernel: import('../state/MatchKernel.js').MatchKernel }} options
 */
export function createMatchKernelInteractiveAdapter({ game = null, kernel = null } = {}) {
    return new MatchKernelInteractiveAdapter({ game, kernel });
}
