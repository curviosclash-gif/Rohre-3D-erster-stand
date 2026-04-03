// ============================================
// PlayingStateSystem.js - playing state update orchestration
// ============================================

import { SimStateSnapshot } from './SimStateSnapshot.js';

export class PlayingStateSystem {
    constructor(game) {
        this.game = game;
        this._lastOverheatSnapshotVersion = -1;
        this._simSnapshot = null;
        this._simSnapshotTick = 0;
        // V84: optional MatchKernelInteractiveAdapter; when set, simulation tick
        // is driven through the kernel instead of direct game.* calls.
        this._kernelAdapter = null;
    }

    /**
     * setKernelAdapter – attach a MatchKernelInteractiveAdapter for kernel-driven ticks.
     * Pass null to revert to the legacy direct-call path.
     *
     * @param {import('./MatchKernelInteractiveAdapter.js').MatchKernelInteractiveAdapter|null} adapter
     */
    setKernelAdapter(adapter) {
        this._kernelAdapter = adapter || null;
    }

    getKernelAdapter() {
        return this._kernelAdapter;
    }

    _syncHuntOverheatSnapshot() {
        const game = this.game;
        if (!game.huntState || !game.entityManager?.getHuntOverheatSnapshot) return;

        const snapshot = game.entityManager.getHuntOverheatSnapshot();
        if (!snapshot || typeof snapshot !== 'object') {
            if (game.huntState.overheatByPlayer !== snapshot) {
                game.huntState.overheatByPlayer = snapshot || {};
            }
            this._lastOverheatSnapshotVersion = -1;
            return;
        }

        const version = Number(snapshot.__version);
        if (Number.isFinite(version)) {
            if (version === this._lastOverheatSnapshotVersion) {
                return;
            }
            this._lastOverheatSnapshotVersion = version;
        } else if (game.huntState.overheatByPlayer === snapshot) {
            return;
        }

        game.huntState.overheatByPlayer = snapshot;
    }

    update(dt) {
        const game = this.game;
        const renderFrameId = game.gameLoop?.renderFrameId || 0;

        if (game.input.wasPressed('Escape')) {
            game.matchFlowUiController.pause();
            return;
        }

        game._updatePlanarAimAssist(dt);

        // V84: drive simulation through MatchKernel when an adapter is present;
        // fall back to direct calls for backwards compatibility during migration.
        if (this._kernelAdapter) {
            this._kernelAdapter.tick(dt, renderFrameId);
            this._syncHuntOverheatSnapshot();
        } else {
            game.entityManager.update(dt, game.input, renderFrameId);
            this._syncHuntOverheatSnapshot();
            game.powerupManager.update(dt);
            game.particles.update(dt);
            game.arena.update(dt);
        }

        game.hudRuntimeSystem.updatePlayingHudTick(dt);
        game._applyPlayingTimeScaleFromEffects();

        // N6: opt-in sim state snapshot capture (zero-alloc when enabled)
        if (this._simSnapshot?.enabled) {
            this._simSnapshot.capture(
                this._simSnapshotTick++,
                game.gameLoop?.elapsedTime || 0,
                game.entityManager
            );
        }
    }

    enableSimSnapshots() {
        if (!this._simSnapshot) {
            this._simSnapshot = new SimStateSnapshot();
        }
        this._simSnapshot.enable();
        this._simSnapshotTick = 0;
        return this._simSnapshot;
    }

    disableSimSnapshots() {
        if (this._simSnapshot) {
            this._simSnapshot.disable();
        }
    }

    getSimSnapshot() {
        return this._simSnapshot;
    }

    render(alpha = 1, renderDelta = null) {
        const game = this.game;
        if (!game?.entityManager) return;

        const numericAlpha = Number(alpha);
        const renderAlpha = Number.isFinite(numericAlpha) ? Math.max(0, Math.min(1, numericAlpha)) : 1;
        const renderTiming = game?.gameLoop?.getRenderTiming?.() || null;
        const numericRenderDelta = Number(renderTiming?.stabilizedDt ?? renderDelta);
        const cameraDt = Number.isFinite(numericRenderDelta)
            ? Math.max(1 / 240, Math.min(0.05, numericRenderDelta))
            : (Number(game?.gameLoop?.fixedStep) || (1 / 60));
        game?.renderer?.cameraRigSystem?.setFrameTiming?.({
            frameId: Number(renderTiming?.frameId) || 0,
            rawDt: Number(renderTiming?.rawDt),
            dt: cameraDt,
            reset: renderTiming?.reset === true,
            reason: renderTiming?.resetReason || '',
        });

        game.entityManager.renderInterpolatedTransforms(renderAlpha);
        const cameraStart = game.runtimePerfProfiler?.startSample?.();
        game.entityManager.updateCameras(cameraDt, renderAlpha, true);
        game.runtimePerfProfiler?.endSample?.('camera', cameraStart);
        game.crosshairSystem.updateCrosshairs();
    }
}
