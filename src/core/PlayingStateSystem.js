// ============================================
// PlayingStateSystem.js - playing state update orchestration
// ============================================

export class PlayingStateSystem {
    constructor(game) {
        this.game = game;
        this._lastOverheatSnapshotVersion = -1;
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

        if (game.input.wasPressed('Escape')) {
            game.matchFlowUiController.returnToMenu();
            return;
        }

        game._updatePlanarAimAssist(dt);
        game.entityManager.update(dt, game.input);
        this._syncHuntOverheatSnapshot();
        game.powerupManager.update(dt);
        game.particles.update(dt);
        game.arena.update(dt);
        game.hudRuntimeSystem.updatePlayingHudTick(dt);
        game._applyPlayingTimeScaleFromEffects();
    }

    render(alpha = 1, renderDelta = null) {
        const game = this.game;
        if (!game?.entityManager) return;

        const numericAlpha = Number(alpha);
        const renderAlpha = Number.isFinite(numericAlpha) ? Math.max(0, Math.min(1, numericAlpha)) : 1;
        const numericRenderDelta = Number(renderDelta);
        const cameraDt = Number.isFinite(numericRenderDelta)
            ? Math.max(1 / 240, Math.min(0.05, numericRenderDelta))
            : (Number(game?.gameLoop?.fixedStep) || (1 / 60));

        game.entityManager.renderInterpolatedTransforms(renderAlpha);
        const cameraStart = game.runtimePerfProfiler?.startSample?.();
        game.entityManager.updateCameras(cameraDt, renderAlpha);
        game.runtimePerfProfiler?.endSample?.('camera', cameraStart);
        game.crosshairSystem.updateCrosshairs();
    }
}
