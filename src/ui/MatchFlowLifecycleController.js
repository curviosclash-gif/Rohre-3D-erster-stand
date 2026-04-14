import { createRoundEndRecorderAdapter, getLastRoundGhostClip } from './MatchFlowTransitionHotspots.js';
import {
    GAME_STATE_IDS,
    normalizeGameStateId,
} from '../shared/contracts/GameStateIds.js';

export class MatchFlowLifecycleController {
    constructor(deps = {}) {
        this.matchFlowUiController = deps.matchFlowUiController || null;
        this.runtime = deps.runtime || deps.game || this.matchFlowUiController?.game || null;
        this.runtimePort = deps.runtimePort || this.matchFlowUiController?.runtimePort || null;
        this.sessionOrchestrator = deps.sessionOrchestrator || this.matchFlowUiController?.sessionOrchestrator || null;
        this.telemetryController = deps.telemetryController || this.matchFlowUiController?.telemetryController || null;
        this.coordinateRoundEnd = typeof deps.coordinateRoundEnd === 'function'
            ? deps.coordinateRoundEnd
            : null;
        this.deriveRoundStartTransition = typeof deps.deriveRoundStartTransition === 'function'
            ? deps.deriveRoundStartTransition
            : null;
        this.deriveReturnToMenuTransition = typeof deps.deriveReturnToMenuTransition === 'function'
            ? deps.deriveReturnToMenuTransition
            : null;
    }

    get game() {
        return this.runtime;
    }

    get controller() {
        return this.matchFlowUiController;
    }

    startRound() {
        const controller = this.controller;
        const game = this.game;
        const roundStartTransition = this.deriveRoundStartTransition?.() || {};
        controller.applyLifecycleTransition(roundStartTransition);
        game.entityManager?.clearLastRoundGhost?.();
        controller._clearArcadeOverlayPanel();

        if (game.ui.crosshairP1) {
            game.ui.crosshairP1.style.display = 'none';
        }
        if (game.ui.crosshairP2) {
            game.ui.crosshairP2.style.display = 'none';
        }

        this.sessionOrchestrator?.resetRoundRuntime?.();

        game.gameLoop.setTimeScale(1.0);
        controller.applyMatchUiState(roundStartTransition.uiState);
        game.hudRuntimeSystem.updateScoreHud();
        game.crosshairSystem?.updateCrosshairs?.();
    }

    onRoundEnd(winner, outcome = null) {
        const controller = this.controller;
        const game = this.game;
        game.state = GAME_STATE_IDS.ROUND_END;
        game.roundPause = 3.0;

        const roundEndPlan = this.coordinateRoundEnd
            ? this.coordinateRoundEnd(this.buildRoundEndCoordinatorRequest(winner, outcome))
            : {};
        const ghostClip = getLastRoundGhostClip(this.runtimePort, game, {
            displayDuration: game.roundPause,
        });
        const huntSummary = controller._getMatchRuntimeProjection()?.hunt?.scoreboardSummary || '';
        if (huntSummary) {
            if (!roundEndPlan.uiState) roundEndPlan.uiState = {};
            const baseText = String(roundEndPlan.uiState.messageText || '').trim();
            roundEndPlan.uiState.messageText = baseText ? `${baseText}\n${huntSummary}` : huntSummary;
        }
        this.applyRoundEndCoordinatorPlan(roundEndPlan);
        this.telemetryController?.recordRoundEndTelemetry?.(roundEndPlan);
        if (ghostClip) {
            game.entityManager?.playLastRoundGhost?.(ghostClip);
        } else {
            game.entityManager?.clearLastRoundGhost?.();
        }
    }

    buildRoundEndCoordinatorRequest(winner, outcome = null) {
        const game = this.game;
        const normalizedOutcome = outcome && typeof outcome === 'object' ? outcome : {};
        return {
            recorder: createRoundEndRecorderAdapter(this.runtimePort, game),
            winner,
            players: game.entityManager ? game.entityManager.players : [],
            roundStateController: game.roundStateController,
            humanPlayerCount: game.entityManager?.getHumanPlayers
                ? game.entityManager.getHumanPlayers().length
                : 0,
            totalBots: game.numBots,
            winsNeeded: game.winsNeeded,
            outcomeReason: typeof normalizedOutcome.reason === 'string' ? normalizedOutcome.reason : '',
            parcours: normalizedOutcome.parcours || null,
            logger: console,
        };
    }

    applyRoundEndCoordinatorPlan(roundEndPlan) {
        this.applyRoundEndControllerTransitionState(roundEndPlan?.transition);
        this.applyRoundEndCoordinatorEffects(roundEndPlan?.effectsPlan);
        this.applyRoundEndCoordinatorUiState(roundEndPlan?.uiState);
    }

    applyRoundEndCoordinatorEffects(effectsPlan) {
        const game = this.game;
        if (!effectsPlan?.shouldUpdateHud) return;
        game.hudRuntimeSystem.updateScoreHud();
    }

    applyRoundEndCoordinatorUiState(uiState) {
        if (!uiState) return;
        this.controller.applyMatchUiState(uiState);
    }

    applyRoundEndControllerTransitionState(roundEndTransition) {
        const game = this.game;
        if (!roundEndTransition) return;
        game.roundPause = roundEndTransition.roundPause;
        game.state = normalizeGameStateId(roundEndTransition.nextState, GAME_STATE_IDS.ROUND_END);
    }

    applyReturnToMenuUi(options = {}) {
        const controller = this.controller;
        const game = this.game;
        const returnTransition = this.deriveReturnToMenuTransition?.() || {};
        controller._clearArcadeOverlayPanel();
        controller.applyLifecycleTransition(returnTransition);
        controller.applyMatchUiState(returnTransition.uiState);
        controller.resetCrosshairUi();
        if (options?.showMenuPanel === false) {
            return returnTransition;
        }
        const panelId = String(options?.panelId || 'submenu-game').trim() || 'submenu-game';
        const trigger = String(options?.trigger || options?.reason || 'return_to_menu').trim() || 'return_to_menu';
        if (this.runtimePort?.showMenuPanel) {
            this.runtimePort.showMenuPanel(panelId, { trigger });
        } else {
            game._showMainNav?.();
        }
        if (this.runtimePort?.syncUi) {
            this.runtimePort.syncUi();
        } else {
            game.uiManager?.syncAll?.();
        }
        return returnTransition;
    }

    returnToMenu(options = {}) {
        if (this.runtimePort?.returnToMenu) {
            return this.runtimePort.returnToMenu(options);
        }
        return this.applyReturnToMenuUi(options);
    }
}
