import * as THREE from 'three';
import { coordinateRoundEnd } from '../state/RoundEndCoordinator.js';
import { MatchFeedbackAdapter } from './MatchFeedbackAdapter.js';
import { MatchLifecycleSessionOrchestrator } from '../state/MatchLifecycleSessionOrchestrator.js';
import {
    deriveMatchStartTransition,
    deriveReturnToMenuTransition,
    deriveRoundStartTransition,
} from '../state/MatchLifecycleStateTransitions.js';

export class MatchFlowUiController {
    constructor(game) {
        this.game = game;
        this.sessionOrchestrator = new MatchLifecycleSessionOrchestrator(game);
        this.feedbackAdapter = new MatchFeedbackAdapter({
            showToast: (message, durationMs, tone) => this.game?._showStatusToast?.(message, durationMs, tone),
            logger: console,
        });
        this._damageDir = new THREE.Vector3();
        this._damageForward = new THREE.Vector3();
        this._damageRight = new THREE.Vector3();
        this._damageWorldUp = new THREE.Vector3(0, 1, 0);
    }

    applyMatchUiState(uiState) {
        const game = this.game;
        const visibility = uiState?.visibility || {};
        const hasOwn = (key) => Object.prototype.hasOwnProperty.call(visibility, key);
        if (game.ui.mainMenu && hasOwn('mainMenuHidden')) {
            game.ui.mainMenu.classList.toggle('hidden', visibility.mainMenuHidden !== false);
        }
        if (game.ui.hud && hasOwn('hudHidden')) {
            game.ui.hud.classList.toggle('hidden', visibility.hudHidden === true);
        }
        if (game.ui.messageOverlay) {
            if (typeof uiState?.messageText === 'string' && game.ui.messageText) {
                game.ui.messageText.textContent = uiState.messageText;
            }
            if (typeof uiState?.messageSub === 'string' && game.ui.messageSub) {
                game.ui.messageSub.textContent = uiState.messageSub;
            }
            if (hasOwn('messageOverlayHidden')) {
                game.ui.messageOverlay.classList.toggle('hidden', visibility.messageOverlayHidden !== false);
            }
        }
        if (game.ui.statusToast && hasOwn('statusToastHidden')) {
            game.ui.statusToast.classList.toggle('hidden', visibility.statusToastHidden !== false);
        }

        if (typeof uiState?.splitScreenEnabled === 'boolean') {
            game.renderer.setSplitScreen(uiState.splitScreenEnabled);
        }
        if (typeof uiState?.p2HudVisible === 'boolean') {
            if (game.ui.p2Hud) {
                game.ui.p2Hud.classList.toggle('hidden', !uiState.p2HudVisible);
            } else {
                game.runtimeFacade.syncP2HudVisibility();
            }
        }
    }

    applyMatchStartUiState(uiState) {
        this.applyMatchUiState(uiState);
    }

    applyLifecycleTransition(transition) {
        const game = this.game;
        if (!transition) return;

        if (typeof transition.state === 'string' && transition.state.length > 0) {
            game.state = transition.state;
        }
        if (typeof transition.roundPause === 'number') {
            game.roundPause = transition.roundPause;
        }
        if (typeof transition.hudTimer === 'number') {
            game._hudTimer = transition.hudTimer;
        }
        if (transition.huntStatePatch && game.huntState) {
            Object.assign(game.huntState, transition.huntStatePatch);
        }
    }

    resetCrosshairElementUi(element) {
        if (!element) return;
        element.style.display = 'none';
        element.style.left = '50%';
        element.style.top = '50%';
        element.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    }

    resetCrosshairUi() {
        const game = this.game;
        this.resetCrosshairElementUi(game.ui.crosshairP1);
        this.resetCrosshairElementUi(game.ui.crosshairP2);
    }

    _resolveDamageIndicatorAngle(target, event) {
        if (!target) return 0;

        if (event?.sourcePlayer?.position) {
            this._damageDir.subVectors(event.sourcePlayer.position, target.position);
        } else if (event?.hitNormal) {
            this._damageDir.copy(event.hitNormal).multiplyScalar(-1);
        } else {
            target.getDirection(this._damageDir).multiplyScalar(-1);
        }

        if (this._damageDir.lengthSq() <= 0.000001) {
            return 0;
        }
        this._damageDir.normalize();

        target.getDirection(this._damageForward).normalize();
        this._damageRight.crossVectors(this._damageWorldUp, this._damageForward);
        if (this._damageRight.lengthSq() <= 0.000001) {
            this._damageRight.set(1, 0, 0);
        } else {
            this._damageRight.normalize();
        }

        const forwardDot = THREE.MathUtils.clamp(this._damageForward.dot(this._damageDir), -1, 1);
        const sideDot = THREE.MathUtils.clamp(this._damageRight.dot(this._damageDir), -1, 1);
        return THREE.MathUtils.radToDeg(Math.atan2(sideDot, forwardDot));
    }

    _handleHuntDamageEvent(event) {
        const game = this.game;
        if (!game.huntState) return;

        if (game.screenShake?.triggerForDamage) {
            game.screenShake.triggerForDamage(event);
        }

        const target = event?.target;
        if (!target || target.isBot || !target.alive) return;

        const humans = game.entityManager?.getHumanPlayers ? game.entityManager.getHumanPlayers() : [];
        if (!humans.includes(target)) return;

        const damageResult = event?.damageResult || {};
        const applied = Math.max(0, Number(damageResult.applied) || 0);
        const absorbed = Math.max(0, Number(damageResult.absorbedByShield) || 0);
        const damageValue = Math.max(applied, absorbed);
        if (damageValue <= 0) return;

        const intensity = THREE.MathUtils.clamp(0.2 + damageValue / 60, 0.2, 1.0);
        game.huntState.damageIndicator = {
            angleDeg: this._resolveDamageIndicatorAngle(target, event),
            intensity,
            ttl: THREE.MathUtils.clamp(0.35 + intensity * 0.55, 0.35, 0.95),
        };
    }

    _pushHuntFeedEntry(entry) {
        const game = this.game;
        if (!game.huntState) return;
        if (!Array.isArray(game.huntState.killFeed)) game.huntState.killFeed = [];
        game.huntState.killFeed.unshift(String(entry));
        if (game.huntState.killFeed.length > 5) {
            game.huntState.killFeed.length = 5;
        }
    }

    startMatch() {
        const game = this.game;
        game.keyCapture = null;
        game._applySettingsToRuntime();

        const matchStartTransition = deriveMatchStartTransition({ numHumans: game.numHumans });
        this.applyLifecycleTransition(matchStartTransition);
        this.applyMatchStartUiState(matchStartTransition.uiState);

        const initializedMatch = this.sessionOrchestrator.createMatchSession({
            onPlayerFeedback: (player, message) => {
                game._showPlayerFeedback(player, message);
            },
            onPlayerDied: (player, cause) => {
                if (!player.isBot) {
                    game._showStatusToast(game._getDeathMessage(cause), 2500, 'error');
                }
            },
            onRoundEnd: (winner) => {
                this.onRoundEnd(winner);
            },
        });
        this.sessionOrchestrator.bindHuntEventHandlers({
            onHuntFeedEvent: (entry) => this._pushHuntFeedEntry(entry),
            onHuntDamageEvent: (event) => this._handleHuntDamageEvent(event),
        });
        this.feedbackAdapter.applyFeedbackPlan(initializedMatch.feedbackPlan);

        this.startRound();
    }

    startRound() {
        const game = this.game;
        const roundStartTransition = deriveRoundStartTransition();
        this.applyLifecycleTransition(roundStartTransition);

        if (game.ui.crosshairP1) {
            game.ui.crosshairP1.style.display = 'none';
        }
        if (game.ui.crosshairP2) {
            game.ui.crosshairP2.style.display = 'none';
        }

        this.sessionOrchestrator.resetRoundRuntime();

        game.gameLoop.setTimeScale(1.0);
        this.applyMatchUiState(roundStartTransition.uiState);
        game.hudRuntimeSystem.updateScoreHud();
    }

    onRoundEnd(winner) {
        const game = this.game;
        game.state = 'ROUND_END';
        game.roundPause = 3.0;

        const roundEndPlan = coordinateRoundEnd(this.buildRoundEndCoordinatorRequest(winner));
        const huntSummary = game.entityManager?.getHuntScoreboardSummary
            ? game.entityManager.getHuntScoreboardSummary(4)
            : '';
        if (huntSummary) {
            if (!roundEndPlan.uiState) roundEndPlan.uiState = {};
            const baseText = String(roundEndPlan.uiState.messageText || '').trim();
            roundEndPlan.uiState.messageText = baseText ? `${baseText}\n${huntSummary}` : huntSummary;
        }
        this.applyRoundEndCoordinatorPlan(roundEndPlan);
    }

    buildRoundEndCoordinatorRequest(winner) {
        const game = this.game;
        return {
            recorder: game.recorder,
            winner,
            players: game.entityManager ? game.entityManager.players : [],
            roundStateController: game.roundStateController,
            humanPlayerCount: game.entityManager ? game.entityManager.getHumanPlayers().length : 0,
            totalBots: game.numBots,
            winsNeeded: game.winsNeeded,
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
        this.applyMatchUiState(uiState);
    }

    applyRoundEndControllerTransitionState(roundEndTransition) {
        const game = this.game;
        if (!roundEndTransition) return;
        game.roundPause = roundEndTransition.roundPause;
        game.state = roundEndTransition.nextState;
    }

    returnToMenu() {
        const game = this.game;
        const returnTransition = deriveReturnToMenuTransition();
        this.applyLifecycleTransition(returnTransition);
        this.sessionOrchestrator.teardownMatchSession();
        this.applyMatchUiState(returnTransition.uiState);
        game._showMainNav();
        this.resetCrosshairUi();
        game.uiManager.syncAll();
    }
}
