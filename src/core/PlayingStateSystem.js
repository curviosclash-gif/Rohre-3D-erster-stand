// ============================================
// PlayingStateSystem.js - playing state update orchestration
// ============================================

import { SimStateSnapshot } from './SimStateSnapshot.js';

export function createPlayingStateRuntimeAccess(runtime) {
    const game = runtime && typeof runtime === 'object' ? runtime : null;
    return Object.freeze({
        getRenderFrameId: () => game?.gameLoop?.renderFrameId || 0,
        wasPausePressed: () => game?.input?.wasPressed?.('Escape') === true,
        pauseMatch() {
            game?.matchFlowUiController?.pause?.();
        },
        updatePlanarAimAssist(dt) {
            game?._updatePlanarAimAssist?.(dt);
        },
        getEntityManager: () => game?.entityManager || null,
        getInput: () => game?.input || null,
        getPowerupManager: () => game?.powerupManager || null,
        getParticles: () => game?.particles || null,
        getArena: () => game?.arena || null,
        tickSuddenDeath(dt) {
            game?.runtimePorts?.arcadePort?.tickSuddenDeath?.(dt);
        },
        updatePlayingHudTick(dt) {
            game?.hudRuntimeSystem?.updatePlayingHudTick?.(dt);
        },
        applyPlayingTimeScaleFromEffects() {
            game?._applyPlayingTimeScaleFromEffects?.();
        },
        getElapsedTime: () => game?.gameLoop?.elapsedTime || 0,
        getHuntState: () => game?.huntState || null,
        getRenderer: () => game?.renderer || null,
        getRenderTiming: () => game?.gameLoop?.getRenderTiming?.() || null,
        getFixedStep: () => Number(game?.gameLoop?.fixedStep) || (1 / 60),
        getRuntimeProjectionPort: () => game?.runtimeBundle?.ports?.runtimeProjectionPort || null,
        getRuntimePerfProfiler: () => game?.runtimePerfProfiler || null,
        getCrosshairSystem: () => game?.crosshairSystem || null,
    });
}

export class PlayingStateSystem {
    constructor(runtimeAccess = {}) {
        this.runtimeAccess = runtimeAccess && typeof runtimeAccess === 'object'
            ? runtimeAccess
            : {};
        this._lastOverheatSnapshotVersion = -1;
        this._simSnapshot = null;
        this._simSnapshotTick = 0;
        this._matchRenderProjection = null;
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
        const huntState = this.runtimeAccess.getHuntState?.() || null;
        const entityManager = this.runtimeAccess.getEntityManager?.() || null;
        if (!huntState || !entityManager?.getHuntOverheatSnapshot) return;

        const snapshot = entityManager.getHuntOverheatSnapshot();
        if (!snapshot || typeof snapshot !== 'object') {
            if (huntState.overheatByPlayer !== snapshot) {
                huntState.overheatByPlayer = snapshot || {};
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
        } else if (huntState.overheatByPlayer === snapshot) {
            return;
        }

        huntState.overheatByPlayer = snapshot;
    }

    update(dt) {
        const entityManager = this.runtimeAccess.getEntityManager?.() || null;
        const renderFrameId = this.runtimeAccess.getRenderFrameId?.() || 0;

        if (this.runtimeAccess.wasPausePressed?.()) {
            this.runtimeAccess.pauseMatch?.();
            return;
        }

        this.runtimeAccess.updatePlanarAimAssist?.(dt);

        // V84: drive simulation through MatchKernel when an adapter is present;
        // fall back to direct calls for backwards compatibility during migration.
        if (this._kernelAdapter) {
            this._kernelAdapter.tick(dt, renderFrameId);
            this._syncHuntOverheatSnapshot();
        } else {
            entityManager.update(dt, this.runtimeAccess.getInput?.(), renderFrameId);
            this._syncHuntOverheatSnapshot();
            this.runtimeAccess.getPowerupManager?.()?.update?.(dt);
            this.runtimeAccess.getParticles?.()?.update?.(dt);
            this.runtimeAccess.getArena?.()?.update?.(dt);
        }

        this.runtimeAccess.tickSuddenDeath?.(dt);
        this.runtimeAccess.updatePlayingHudTick?.(dt);
        this.runtimeAccess.applyPlayingTimeScaleFromEffects?.();

        // N6: opt-in sim state snapshot capture (zero-alloc when enabled)
        if (this._simSnapshot?.enabled) {
            this._simSnapshot.capture(
                this._simSnapshotTick++,
                this.runtimeAccess.getElapsedTime?.() || 0,
                entityManager
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

    getMatchRenderProjection() {
        return this._matchRenderProjection;
    }

    render(alpha = 1, renderDelta = null) {
        const entityManager = this.runtimeAccess.getEntityManager?.() || null;
        if (!entityManager) {
            this._matchRenderProjection = null;
            return;
        }

        const numericAlpha = Number(alpha);
        const renderAlpha = Number.isFinite(numericAlpha) ? Math.max(0, Math.min(1, numericAlpha)) : 1;
        const renderTiming = this.runtimeAccess.getRenderTiming?.() || null;
        const numericRenderDelta = Number(renderTiming?.stabilizedDt ?? renderDelta);
        const cameraDt = Number.isFinite(numericRenderDelta)
            ? Math.max(1 / 240, Math.min(0.05, numericRenderDelta))
            : this.runtimeAccess.getFixedStep?.();
        this.runtimeAccess.getRenderer?.()?.cameraRigSystem?.setFrameTiming?.({
            frameId: Number(renderTiming?.frameId) || 0,
            rawDt: Number(renderTiming?.rawDt),
            dt: cameraDt,
            reset: renderTiming?.reset === true,
            reason: renderTiming?.resetReason || '',
        });

        entityManager.renderInterpolatedTransforms(renderAlpha);
        this._matchRenderProjection = this.runtimeAccess.getRuntimeProjectionPort?.()?.getMatchRenderProjection?.({
            renderAlpha,
        }) || null;
        const runtimePerfProfiler = this.runtimeAccess.getRuntimePerfProfiler?.() || null;
        const cameraStart = runtimePerfProfiler?.startSample?.();
        entityManager.updateCameras(cameraDt, renderAlpha, true, this._matchRenderProjection);
        runtimePerfProfiler?.endSample?.('camera', cameraStart);
        this.runtimeAccess.getCrosshairSystem?.()?.updateCrosshairs?.();
    }
}
