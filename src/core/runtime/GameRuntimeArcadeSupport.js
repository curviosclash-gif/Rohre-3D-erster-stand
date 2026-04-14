import { createArcadeRoundStateController } from '../../state/arcade/ArcadeRoundStateController.js';
import { buildArcadeSectorPlan } from '../../entities/directors/ArcadeEncounterCatalog.js';
import { ArcadeRunRuntime } from '../arcade/ArcadeRunRuntime.js';
import { ReplayRecorder } from '../replay/ReplayRecorder.js';

export class GameRuntimeArcadeSupport {
    constructor({
        getGame = null,
        getRuntimeState = null,
        nowMs = undefined,
        logger = console,
    } = {}) {
        this._getGame = typeof getGame === 'function' ? getGame : () => null;
        this._getRuntimeState = typeof getRuntimeState === 'function' ? getRuntimeState : () => null;
        this._baseRoundStateController = this.getRuntimeState()?.roundStateController
            || this.game?.roundStateController
            || null;
        this._arcadeRoundStateController = null;
        this._arcadeReplayRecorder = new ReplayRecorder();
        this.arcadeRunRuntime = new ArcadeRunRuntime({
            settingsManager: this.game?.settingsManager || null,
            replayRecorder: this._arcadeReplayRecorder,
            now: nowMs,
            logger,
        });

        const withArcadeStrategy = (handler) => {
            const strategy = this.getRuntimeState()?.entityManager?.gameModeStrategy
                || this.game?.entityManager?.gameModeStrategy
                || null;
            if (strategy) {
                handler(strategy);
            }
        };

        this.arcadeRunRuntime.setModifierChangedHandler((modifierId) => withArcadeStrategy((strategy) => strategy.setActiveModifier?.(modifierId)));
        this.arcadeRunRuntime.setVehicleUpgradesHandler((bonuses) => withArcadeStrategy((strategy) => strategy.applyVehicleUpgrades?.(bonuses)));
        this.arcadeRunRuntime.setSuddenDeathEnteredHandler(() => withArcadeStrategy((strategy) => strategy.enterSuddenDeath?.()));
    }

    get game() {
        return this._getGame();
    }

    getRuntimeState() {
        return this._getRuntimeState();
    }

    _activateRoundController() {
        const runtimeState = this.getRuntimeState();
        if (!runtimeState?.roundStateController) {
            return;
        }
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

    _deactivateRoundController() {
        const runtimeState = this.getRuntimeState();
        if (runtimeState && this._baseRoundStateController) {
            runtimeState.roundStateController = this._baseRoundStateController;
        }
    }

    syncRuntimeConfig() {
        const runtimeConfig = this.getRuntimeState()?.runtimeConfig || null;
        if (!runtimeConfig) {
            return;
        }
        this.arcadeRunRuntime.configure(runtimeConfig);
        if (runtimeConfig?.arcade?.enabled) {
            this._activateRoundController();
            return;
        }
        this._deactivateRoundController();
        this.resetRunState({ preserveRecords: true });
    }

    startRunIfEnabled() {
        const runtimeState = this.getRuntimeState();
        const runtimeConfig = runtimeState?.runtimeConfig || null;
        if (!runtimeConfig?.arcade?.enabled) {
            return null;
        }
        const strategy = runtimeState?.entityManager?.gameModeStrategy || null;
        this.arcadeRunRuntime.setStrategy(strategy);
        const existing = this.arcadeRunRuntime.getStateSnapshot?.();
        if (existing && String(existing.phase || '').toLowerCase() !== 'finished') {
            return existing;
        }
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

    resetRunState(options = undefined) {
        return this.arcadeRunRuntime.resetRunState({
            preserveRecords: true,
            ...(options && typeof options === 'object' ? options : {}),
        });
    }

    getRunState() {
        return this.arcadeRunRuntime.getStateSnapshot?.() || null;
    }

    getMenuSurfaceState() {
        return this.arcadeRunRuntime.getMenuSurfaceState?.() || null;
    }

    tickSuddenDeath(dt = 0) {
        const hudState = this.arcadeRunRuntime.getHudState?.();
        if (!hudState || String(hudState.phase || '') !== 'sudden_death') {
            return null;
        }
        const strategy = this.getRuntimeState()?.entityManager?.gameModeStrategy
            || this.game?.entityManager?.gameModeStrategy
            || null;
        if (typeof strategy?.tickSuddenDeath !== 'function') {
            return null;
        }
        return strategy.tickSuddenDeath(Math.max(0, Number(dt) || 0));
    }

    selectIntermissionChoice(choiceId) {
        return this.arcadeRunRuntime.selectIntermissionChoice?.(choiceId);
    }

    selectReward(rewardId) {
        return this.arcadeRunRuntime.selectReward?.(rewardId);
    }

    requestReplayPlayback() {
        return this.arcadeRunRuntime.requestReplayPlayback?.();
    }

    recordRoundEndTelemetry(payload = null, { recordMenuTelemetry = null } = {}) {
        this.arcadeRunRuntime.handleRoundEndTelemetry(payload);
        return typeof recordMenuTelemetry === 'function'
            ? recordMenuTelemetry('round_end', payload)
            : undefined;
    }

    recordMatchEndTelemetry(payload = null, { recordMenuTelemetry = null } = {}) {
        this.arcadeRunRuntime.handleMatchEndTelemetry(payload);
        return typeof recordMenuTelemetry === 'function'
            ? recordMenuTelemetry('match_end', payload)
            : undefined;
    }
}
