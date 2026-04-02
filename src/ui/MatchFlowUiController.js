/* eslint-disable max-lines */
import * as THREE from 'three';
import { createLogger } from '../shared/logging/Logger.js';
import { coordinateRoundEnd } from '../state/RoundEndCoordinator.js';
import { MatchFeedbackAdapter } from './MatchFeedbackAdapter.js';

const logger = createLogger('MatchFlowUiController');
import {
    createMatchSessionPort,
    MatchLifecycleSessionOrchestrator,
} from '../state/MatchLifecycleSessionOrchestrator.js';
import { PauseOverlayController } from './PauseOverlayController.js';
import { clearMessageStats, renderMessageStats } from './dom/MessageStatsDom.js';
import { resolveArenaMapSelection } from '../entities/CustomMapLoader.js';
import { deriveMatchLoadingUiState } from '../shared/contracts/MatchUiStateContract.js';
import { createPreferredMatchInputSource } from './MatchInputSourceResolver.js';
import {
    deriveMatchStartTransition,
    deriveReturnToMenuTransition,
    deriveRoundStartTransition,
} from '../state/MatchLifecycleStateTransitions.js';
import {
    GAME_STATE_IDS,
    normalizeGameStateId,
} from '../shared/contracts/GameStateIds.js';

function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
}

function hasOwnProperty(source, key) {
    return !!source && Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeTelemetryString(value, fallback = 'unknown') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function toSafeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function formatPercent(value) {
    return `${Math.round(Math.max(0, Math.min(1, toSafeNumber(value, 0))) * 100)}%`;
}

function resolveRoundTelemetryWinnerLabel(players, roundMetrics) {
    if (!roundMetrics) return 'Unbekannt';
    const winnerIndex = Number(roundMetrics.winnerIndex);
    if (!Number.isFinite(winnerIndex) || winnerIndex < 0) return 'Unentschieden';
    const winner = Array.isArray(players)
        ? players.find((player) => Number(player?.index) === winnerIndex)
        : null;
    if (!winner) {
        return roundMetrics.winnerIsBot ? `Bot ${winnerIndex + 1}` : `Spieler ${winnerIndex + 1}`;
    }
    return winner.isBot ? `Bot ${winner.index + 1}` : `Spieler ${winner.index + 1}`;
}

export class MatchFlowUiController {
    constructor(deps = {}) {
        this.game = deps.game || null;
        this.ports = deps.ports || null;
        this.sessionOrchestrator = deps.sessionOrchestrator
            || new MatchLifecycleSessionOrchestrator(createMatchSessionPort(this.game));
        this.feedbackAdapter = new MatchFeedbackAdapter({
            showToast: (message, durationMs, tone) => this.game?._showStatusToast?.(message, durationMs, tone),
            logger: console,
        });
        this._damageDir = new THREE.Vector3();
        this._damageForward = new THREE.Vector3();
        this._damageRight = new THREE.Vector3();
        this._damageWorldUp = new THREE.Vector3(0, 1, 0);
        this._startMatchPromise = null;
        this.pauseOverlayController = new PauseOverlayController({
            matchFlowUiController: this,
            game: this.game,
            ports: this.ports,
        });
        this._arcadeOverlayPanel = null;
        this._arcadeXpAnimFrame = 0;
        this._arcadeXpAnimToken = 0;
    }

    _resolveMessageStatsContainer() {
        return this.game?.ui?.messageStats || null;
    }

    _clearMessageStatsUi() {
        clearMessageStats(this._resolveMessageStatsContainer());
    }

    _renderMessageStatsUi(overlayStats) {
        renderMessageStats(this._resolveMessageStatsContainer(), overlayStats);
    }

    _cancelArcadeXpAnimation() {
        this._arcadeXpAnimToken += 1;
        if (this._arcadeXpAnimFrame) {
            cancelAnimationFrame(this._arcadeXpAnimFrame);
            this._arcadeXpAnimFrame = 0;
        }
    }

    _ensureArcadeOverlayPanel() {
        const overlay = this.game?.ui?.messageOverlay || null;
        if (!overlay) return null;
        if (this._arcadeOverlayPanel && this._arcadeOverlayPanel.parentElement === overlay) {
            return this._arcadeOverlayPanel;
        }
        const panel = document.createElement('section');
        panel.id = 'arcade-overlay-panel';
        panel.className = 'arcade-overlay-panel hidden';
        overlay.appendChild(panel);
        this._arcadeOverlayPanel = panel;
        return panel;
    }

    _clearArcadeOverlayPanel() {
        this._cancelArcadeXpAnimation();
        const panel = this._arcadeOverlayPanel;
        if (!panel) return;
        panel.classList.add('hidden');
        panel.innerHTML = '';
    }

    _animateArcadeXpCounter(node, toValue, durationMs = 900) {
        if (!node) return;
        this._cancelArcadeXpAnimation();
        const token = this._arcadeXpAnimToken;
        const target = Math.max(0, Math.round(toSafeNumber(toValue, 0)));
        const duration = Math.max(180, Math.round(toSafeNumber(durationMs, 900)));
        const start = performance.now();
        const step = (now) => {
            if (token !== this._arcadeXpAnimToken) return;
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - ((1 - progress) * (1 - progress));
            node.textContent = `${Math.round(target * eased)} XP`;
            if (progress < 1) {
                this._arcadeXpAnimFrame = requestAnimationFrame(step);
            } else {
                this._arcadeXpAnimFrame = 0;
            }
        };
        this._arcadeXpAnimFrame = requestAnimationFrame(step);
    }

    _renderArcadeIntermissionPanel(runtimeState) {
        const panel = this._ensureArcadeOverlayPanel();
        const intermission = runtimeState?.intermission;
        if (!panel || !intermission || typeof intermission !== 'object') return false;

        const choices = Array.isArray(intermission.choices) ? intermission.choices : [];
        const rewards = Array.isArray(intermission.rewardChoices) ? intermission.rewardChoices : [];
        const nextSectorIndex = Math.max(1, Math.floor(toSafeNumber(intermission.nextSectorIndex, 1)));
        const lastSectorPoints = Math.max(0, Math.round(toSafeNumber(intermission.lastSectorPoints, 0)));
        const lastSectorXp = Math.max(0, Math.round(toSafeNumber(intermission.lastSectorXp, 0)));
        const missionsCompleted = Math.max(0, Math.floor(toSafeNumber(intermission.missionsCompleted, 0)));
        const missionsTotal = Math.max(0, Math.floor(toSafeNumber(intermission.missionsTotal, 0)));
        const preview = intermission.nextSectorPreview && typeof intermission.nextSectorPreview === 'object'
            ? intermission.nextSectorPreview
            : {};
        const choiceButtons = choices.map((entry) => {
            const active = entry?.id === intermission.selectedChoiceId;
            const mapLabel = String(entry?.mapLabel || entry?.mapKey || 'Unbekannte Map');
            const modifierLabel = String(entry?.modifierLabel || 'Kein Modifier');
            const effect = String(entry?.modifierEffect || '').trim();
            return `<button type="button" class="arcade-overlay-choice-btn${active ? ' is-active' : ''}" data-arcade-choice-id="${String(entry?.id || '')}">
                <strong>${mapLabel}</strong>
                <span>${modifierLabel}</span>
                <small>${effect || 'Standardsektor'}</small>
            </button>`;
        }).join('');
        const rewardButtons = rewards.map((entry) => {
            const active = entry?.id === intermission.selectedRewardId;
            return `<button type="button" class="arcade-overlay-reward-btn${active ? ' is-active' : ''}" data-arcade-reward-id="${String(entry?.id || '')}">
                <strong>${String(entry?.label || entry?.id || '')}</strong>
                <small>${String(entry?.effectText || '').trim() || 'Kein Effekttext'}</small>
            </button>`;
        }).join('');

        panel.innerHTML = `
            <header class="arcade-overlay-header">
                <h3>Intermission Sektor ${nextSectorIndex}</h3>
                <p>Letzter Sektor: ${lastSectorPoints} Punkte | ${lastSectorXp} XP | Missionen ${missionsCompleted}/${missionsTotal}</p>
            </header>
            <div class="arcade-overlay-body">
                <section class="arcade-overlay-section">
                    <h4>Naechster Sektor</h4>
                    <p>${String(preview.mapLabel || preview.mapKey || 'Unbekannte Map')} | ${String(preview.modifierLabel || 'Kein Modifier')}</p>
                    <p>${String(preview.modifierEffect || '').trim() || 'Keine zusaetzliche Wirkung.'}</p>
                </section>
                <section class="arcade-overlay-section">
                    <h4>Map-/Modifier-Wahl</h4>
                    <div class="arcade-overlay-choice-grid">${choiceButtons || '<p class="arcade-overlay-empty">Keine Optionen verfuegbar.</p>'}</div>
                </section>
                <section class="arcade-overlay-section">
                    <h4>Reward-Auswahl</h4>
                    <div class="arcade-overlay-reward-grid">${rewardButtons || '<p class="arcade-overlay-empty">Keine Rewards verfuegbar.</p>'}</div>
                </section>
            </div>
        `;

        panel.querySelectorAll('[data-arcade-choice-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const choiceId = String(button.getAttribute('data-arcade-choice-id') || '').trim();
                if (!choiceId) return;
                this.game?.runtimeFacade?.arcadeRunRuntime?.selectIntermissionChoice?.(choiceId);
                const nextState = this.game?.runtimeFacade?.arcadeRunRuntime?.getMenuSurfaceState?.();
                this._renderArcadeIntermissionPanel(nextState);
            });
        });
        panel.querySelectorAll('[data-arcade-reward-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const rewardId = String(button.getAttribute('data-arcade-reward-id') || '').trim();
                if (!rewardId) return;
                this.game?.runtimeFacade?.arcadeRunRuntime?.selectReward?.(rewardId);
                const nextState = this.game?.runtimeFacade?.arcadeRunRuntime?.getMenuSurfaceState?.();
                this._renderArcadeIntermissionPanel(nextState);
            });
        });

        panel.classList.remove('hidden');
        return true;
    }

    _renderArcadePostRunPanel(runtimeState) {
        const panel = this._ensureArcadeOverlayPanel();
        const summary = runtimeState?.postRunSummary;
        if (!panel || !summary || typeof summary !== 'object') return false;
        const score = Math.max(0, Math.round(toSafeNumber(summary.score, 0)));
        const bestCombo = Math.max(0, Math.floor(toSafeNumber(summary.bestCombo, 0)));
        const missionRate = formatPercent(summary.missionCompletionRate);
        const xpEarned = Math.max(0, Math.round(toSafeNumber(summary.xpEarned, 0)));
        const sectorRows = Array.isArray(summary.scorePerSector)
            ? summary.scorePerSector.slice(0, 8).map((entry) => (
                `<li>S${Math.max(0, Math.floor(toSafeNumber(entry?.sectorIndex, 0)))} | ${String(entry?.mapKey || '-')} | ${Math.max(0, Math.round(toSafeNumber(entry?.awardedPoints, 0)))} Punkte</li>`
            )).join('')
            : '';
        const replay = runtimeState?.replay && typeof runtimeState.replay === 'object' ? runtimeState.replay : {};
        const replayHint = replay.playbackAvailable
            ? 'Replay verfuegbar'
            : (replay.payloadAvailable ? 'Replay als Export-Fallback verfuegbar' : 'Replay nicht verfuegbar');

        panel.innerHTML = `
            <header class="arcade-overlay-header">
                <h3>Arcade Run abgeschlossen</h3>
                <p>Gesamtscore ${score} | Best Combo ${bestCombo} | Mission-Rate ${missionRate}</p>
            </header>
            <div class="arcade-overlay-body">
                <section class="arcade-overlay-section">
                    <h4>Score pro Sektor</h4>
                    <ul class="arcade-overlay-list">${sectorRows || '<li>Keine Sektordaten.</li>'}</ul>
                </section>
                <section class="arcade-overlay-section">
                    <h4>XP</h4>
                    <p id="arcade-overlay-xp-counter">0 XP</p>
                    <p>${Math.max(1, Math.round(toSafeNumber(summary.peakMultiplier, 1) * 10) / 10)}x Peak-Multi</p>
                </section>
                <section class="arcade-overlay-section">
                    <h4>Replay</h4>
                    <p>${replayHint}</p>
                    <button type="button" class="arcade-overlay-action-btn" id="btn-arcade-overlay-replay">Replay/Fallback</button>
                </section>
            </div>
        `;
        panel.classList.remove('hidden');

        const xpCounter = panel.querySelector('#arcade-overlay-xp-counter');
        this._animateArcadeXpCounter(
            xpCounter,
            xpEarned,
            Math.max(260, Math.round(toSafeNumber(summary?.xpAnimation?.durationMs, 900)))
        );

        const replayButton = panel.querySelector('#btn-arcade-overlay-replay');
        if (replayButton) {
            replayButton.addEventListener('click', () => {
                const result = this.game?.runtimeFacade?.arcadeRunRuntime?.requestReplayPlayback?.();
                const code = String(result?.code || 'replay_unknown');
                const tone = code === 'replay_player_unavailable' ? 'warning' : 'info';
                const message = code === 'replay_player_unavailable'
                    ? 'Replay-Player fehlt, Export-Fallback bereit.'
                    : (code === 'replay_disabled'
                        ? 'Replay ist in den Runtime-Einstellungen deaktiviert.'
                        : (code === 'replay_unavailable'
                            ? 'Kein Replay fuer diesen Run verfuegbar.'
                            : 'Replay-Status aktualisiert.'));
                this.game?._showStatusToast?.(message, 1800, tone);
            });
        }

        return true;
    }

    _syncArcadeOverlayPanel() {
        const game = this.game;
        const modePath = String(game?.settings?.localSettings?.modePath || '').trim().toLowerCase();
        const arcadeEnabled = game?.runtimeConfig?.arcade?.enabled === true;
        const overlayVisible = !!game?.ui?.messageOverlay && !game.ui.messageOverlay.classList.contains('hidden');
        if (!arcadeEnabled || modePath !== 'arcade' || !overlayVisible) {
            this._clearArcadeOverlayPanel();
            return;
        }
        const runtimeState = game?.runtimeFacade?.arcadeRunRuntime?.getMenuSurfaceState?.();
        const state = normalizeGameStateId(game?.state, GAME_STATE_IDS.MENU);
        if (state === GAME_STATE_IDS.ROUND_END && this._renderArcadeIntermissionPanel(runtimeState)) {
            return;
        }
        if (state === GAME_STATE_IDS.MATCH_END && this._renderArcadePostRunPanel(runtimeState)) {
            return;
        }
        this._clearArcadeOverlayPanel();
    }

    applyMatchUiState(uiState) {
        const game = this.game;
        const visibility = uiState?.visibility || {};
        const hasOwn = (key) => hasOwnProperty(visibility, key);
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
        if (hasOwnProperty(uiState, 'overlayStats')) {
            this._renderMessageStatsUi(uiState.overlayStats);
        }
        if (game.ui.pauseOverlay && hasOwn('pauseOverlayHidden')) {
            game.ui.pauseOverlay.classList.toggle('hidden', visibility.pauseOverlayHidden !== false);
        }
        if (game.ui.statusToast && hasOwn('statusToastHidden')) {
            game.ui.statusToast.classList.toggle('hidden', visibility.statusToastHidden !== false);
        }

        if (typeof uiState?.splitScreenEnabled === 'boolean') {
            if (this.ports?.renderPort?.setSplitScreen) {
                this.ports.renderPort.setSplitScreen(uiState.splitScreenEnabled);
            } else {
                game.renderer.setSplitScreen(uiState.splitScreenEnabled);
            }
        }
        if (typeof uiState?.p2HudVisible === 'boolean') {
            if (game.ui.p2Hud) {
                game.ui.p2Hud.classList.toggle('hidden', !uiState.p2HudVisible);
            } else {
                game.runtimeFacade.syncP2HudVisibility();
            }
        }
        this._syncArcadeOverlayPanel();
    }

    applyMatchStartUiState(uiState) {
        this.applyMatchUiState(uiState);
    }

    applyLifecycleTransition(transition) {
        const game = this.game;
        if (!transition) return;

        if (typeof transition.state === 'string' && transition.state.length > 0) {
            game.state = normalizeGameStateId(transition.state, game?.state || GAME_STATE_IDS.MENU);
        }
        if (typeof transition.roundPause === 'number') {
            game.roundPause = transition.roundPause;
        }
        if (typeof transition.hudTimer === 'number') {
            game._hudTimer = transition.hudTimer;
        }
        if (transition.huntStatePatch && game.huntState) {
            // Safe mutation: shallow-copy the patch to prevent stale closure references
            // from corrupting shared state. Patch ordering is guaranteed to be sequential
            // within the same frame; patches buffered across frames apply in FIFO order.
            Object.assign(game.huntState, { ...transition.huntStatePatch });
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
        const hpApplied = Math.max(0, Number(damageResult.hpApplied) || (applied - absorbed));
        const damageValue = hpApplied + absorbed;
        if (damageValue <= 0) return;

        const intensity = THREE.MathUtils.clamp(0.2 + damageValue / 60, 0.2, 1.0);
        const nextIndicator = {
            angleDeg: this._resolveDamageIndicatorAngle(target, event),
            intensity,
            ttl: THREE.MathUtils.clamp(0.35 + intensity * 0.55, 0.35, 0.95),
        };
        if (!game.huntState.damageIndicatorsByPlayer || typeof game.huntState.damageIndicatorsByPlayer !== 'object') {
            game.huntState.damageIndicatorsByPlayer = {};
        }
        game.huntState.damageIndicatorsByPlayer[target.index] = nextIndicator;
        if (target.index === 0) {
            game.huntState.damageIndicator = nextIndicator;
        }
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

    _resolveMatchLoadingUiState() {
        const requestedMapKey = this.game?.runtimeConfig?.session?.mapKey || this.game?.mapKey || 'standard';
        const mapSelection = resolveArenaMapSelection(requestedMapKey);
        const mapDefinition = mapSelection?.mapDefinition || null;
        if (!mapDefinition?.glbModel) return null;
        return deriveMatchLoadingUiState({
            messageText: `Lade ${String(mapDefinition?.name || requestedMapKey)}...`,
            messageSub: 'GLB-Umgebung wird vorbereitet',
        });
    }

    _buildRoundEndTelemetryPayload(roundEndPlan) {
        const game = this.game;
        const roundMetrics = roundEndPlan?.recording?.roundMetrics
            || game?.recorder?.getLastRoundMetrics?.()
            || null;
        if (!roundMetrics) return null;

        const itemUseModeSource = roundMetrics.itemUseModeCounts && typeof roundMetrics.itemUseModeCounts === 'object'
            ? roundMetrics.itemUseModeCounts
            : {};
        const itemUseByMode = {
            use: Math.max(0, Number(itemUseModeSource.use) || 0),
            shoot: Math.max(0, Number(itemUseModeSource.shoot) || 0),
            mg: Math.max(0, Number(itemUseModeSource.mg) || 0),
            other: Math.max(0, Number(itemUseModeSource.other) || 0),
        };
        const itemUseTypeSource = roundMetrics.itemUseTypeCounts && typeof roundMetrics.itemUseTypeCounts === 'object'
            ? roundMetrics.itemUseTypeCounts
            : {};
        const itemUseByType = {};
        Object.entries(itemUseTypeSource).forEach(([itemType, count]) => {
            const normalizedType = String(itemType || '').trim().toUpperCase();
            if (!normalizedType) return;
            itemUseByType[normalizedType] = Math.max(0, Number(count) || 0);
        });

        return {
            mapKey: normalizeTelemetryString(game?.arena?.currentMapKey || game?.mapKey, 'standard'),
            mode: normalizeTelemetryString(game?.activeGameMode || game?.runtimeConfig?.session?.activeGameMode, 'classic').toLowerCase(),
            state: normalizeGameStateId(roundEndPlan?.outcome?.state, GAME_STATE_IDS.ROUND_END),
            reason: normalizeTelemetryString(roundEndPlan?.outcome?.reason, 'ELIMINATION'),
            winnerType: roundMetrics.winnerIndex < 0
                ? 'draw'
                : (roundMetrics.winnerIsBot ? 'bot' : 'human'),
            winnerLabel: resolveRoundTelemetryWinnerLabel(game?.entityManager?.players, roundMetrics),
            duration: Math.max(0, Number(roundMetrics.duration) || 0),
            selfCollisions: Math.max(0, Number(roundMetrics.selfCollisions) || 0),
            itemUses: Math.max(0, Number(roundMetrics.itemUseEvents) || 0),
            itemUse: {
                total: Math.max(0, Number(roundMetrics.itemUseEvents) || 0),
                byMode: itemUseByMode,
                byType: itemUseByType,
            },
            mgHits: Math.max(0, Number(roundMetrics.mgHits) || 0),
            rocketHits: Math.max(0, Number(roundMetrics.rocketHits) || 0),
            shieldAbsorb: Math.max(0, Number(roundMetrics.shieldAbsorb) || 0),
            hpDamage: Math.max(0, Number(roundMetrics.hpDamage) || 0),
            stuckEvents: Math.max(0, Number(roundMetrics.stuckEvents) || 0),
            parcoursCompleted: roundMetrics.parcoursCompleted === true,
            parcoursRouteId: normalizeTelemetryString(roundMetrics.parcoursRouteId, ''),
            parcoursCompletionTimeMs: Math.max(0, Number(roundMetrics.parcoursCompletionTimeMs) || 0),
            parcoursCheckpointCount: Math.max(0, Number(roundMetrics.parcoursCheckpointCount) || 0),
        };
    }

    _recordRoundEndTelemetry(roundEndPlan) {
        const telemetryPayload = this._buildRoundEndTelemetryPayload(roundEndPlan);
        if (!telemetryPayload) return;
        this.game?.runtimeFacade?.recordRoundEndTelemetry?.(telemetryPayload);
        if (telemetryPayload.state === GAME_STATE_IDS.MATCH_END) {
            this.game?.runtimeFacade?.recordMatchEndTelemetry?.(telemetryPayload);
        }
    }

    _completeStartedMatch(initializedMatch) {
        if (this.ports?.lifecyclePort?.startArcadeRunIfEnabled) {
            this.ports.lifecyclePort.startArcadeRunIfEnabled();
        } else {
            this.game?.runtimeFacade?.startArcadeRunIfEnabled?.();
        }
        this.sessionOrchestrator.bindHuntEventHandlers({
            onHuntFeedEvent: (entry) => this._pushHuntFeedEntry(entry),
            onHuntDamageEvent: (event) => this._handleHuntDamageEvent(event),
        });
        this.startRound();
        this.feedbackAdapter.applyFeedbackPlan(initializedMatch?.feedbackPlan);
        return true;
    }

    _handleStartMatchFailure(error) {
        logger.error('startMatch failed:', error);
        this.game?._showStatusToast?.('Map-Start fehlgeschlagen. Fallback oder Menue wird geladen.', 2600, 'error');
        this.returnToMenu({ reason: 'match_start_failure', trigger: 'match_start_failure' });
        return false;
    }

    _createPreferredInputSource(playerIndex, localHumanCount) {
        return createPreferredMatchInputSource({
            inputManager: this.game?.input,
            game: this.game,
            playerIndex,
            localHumanCount,
        });
    }

    _configureInputSourcesForMatch() {
        const game = this.game;
        const input = game?.input;
        if (!input?.setPlayerSource || !input?.clearPlayerSources) return;

        input.clearPlayerSources();
        const localHumanCount = Math.max(1, Number(game?.runtimeConfig?.session?.numHumans) || 1);
        for (let playerIndex = 0; playerIndex < localHumanCount; playerIndex += 1) {
            const source = this._createPreferredInputSource(playerIndex, localHumanCount);
            if (source) {
                input.setPlayerSource(playerIndex, source);
            }
        }
    }

    _startMatchInternal() {
        const game = this.game;
        game.keyCapture = null;
        game._applySettingsToRuntime({ schedulePrewarm: false });
        this._configureInputSourcesForMatch();

        const matchStartTransition = deriveMatchStartTransition({ numHumans: game.numHumans });
        this.applyLifecycleTransition(matchStartTransition);
        this.applyMatchStartUiState(matchStartTransition.uiState);
        const loadingUiState = this._resolveMatchLoadingUiState();
        if (loadingUiState) {
            this.applyMatchUiState(loadingUiState);
        }

        // Initialize session adapter (Local/LAN/Online)
        const sessionInitPromise = this.ports?.lifecyclePort?.initializeSession
            ? this.ports.lifecyclePort.initializeSession()
            : game.runtimeFacade?.initializeSession?.();

        const createMatch = () => {
            const initializedMatch = this.sessionOrchestrator.createMatchSession({
                onPlayerFeedback: (player, message) => {
                    game._showPlayerFeedback(player, message);
                },
                onPlayerDied: (player, cause) => {
                    if (!player.isBot) {
                        game._showStatusToast(game._getDeathMessage(cause), 2500, 'error');
                    }
                },
                onRoundEnd: (winner, outcome) => {
                    this.onRoundEnd(winner, outcome);
                },
            });
            return initializedMatch;
        };

        const completeWithLoadGate = (resolvedMatch) => {
            const loadGate = this.ports?.lifecyclePort?.waitForAllPlayersLoaded
                ? this.ports.lifecyclePort.waitForAllPlayersLoaded()
                : game.runtimeFacade?.waitForAllPlayersLoaded?.();
            if (isPromiseLike(loadGate)) {
                return Promise.resolve(loadGate).then(() => this._completeStartedMatch(resolvedMatch));
            }
            return this._completeStartedMatch(resolvedMatch);
        };

        if (isPromiseLike(sessionInitPromise)) {
            return Promise.resolve(sessionInitPromise).then(() => {
                const initializedMatch = createMatch();
                if (isPromiseLike(initializedMatch)) {
                    return Promise.resolve(initializedMatch).then((r) => completeWithLoadGate(r));
                }
                return completeWithLoadGate(initializedMatch);
            });
        }

        const initializedMatch = createMatch();
        if (isPromiseLike(initializedMatch)) {
            return Promise.resolve(initializedMatch).then((resolvedMatch) => completeWithLoadGate(resolvedMatch));
        }
        return completeWithLoadGate(initializedMatch);
    }

    startMatch() {
        if (this._startMatchPromise) return this._startMatchPromise;
        try {
            const startResult = this._startMatchInternal();
            if (isPromiseLike(startResult)) {
                this._startMatchPromise = Promise.resolve(startResult)
                    .catch((error) => this._handleStartMatchFailure(error))
                    .finally(() => {
                        this._startMatchPromise = null;
                    });
                return this._startMatchPromise;
            }
            return startResult;
        } catch (error) {
            return this._handleStartMatchFailure(error);
        }
    }

    startRound() {
        const game = this.game;
        const roundStartTransition = deriveRoundStartTransition();
        this.applyLifecycleTransition(roundStartTransition);
        game.entityManager?.clearLastRoundGhost?.();
        this._clearArcadeOverlayPanel();

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
        game.crosshairSystem?.updateCrosshairs?.();
    }

    onRoundEnd(winner, outcome = null) {
        const game = this.game;
        game.state = GAME_STATE_IDS.ROUND_END;
        game.roundPause = 3.0;

        const roundEndPlan = coordinateRoundEnd(this.buildRoundEndCoordinatorRequest(winner, outcome));
        const ghostClip = game.recorder?.getLastRoundGhostClip?.(game.entityManager?.players, {
            displayDuration: game.roundPause,
        });
        const huntSummary = game.entityManager?.getHuntScoreboardSummary
            ? game.entityManager.getHuntScoreboardSummary(4)
            : '';
        if (huntSummary) {
            if (!roundEndPlan.uiState) roundEndPlan.uiState = {};
            const baseText = String(roundEndPlan.uiState.messageText || '').trim();
            roundEndPlan.uiState.messageText = baseText ? `${baseText}\n${huntSummary}` : huntSummary;
        }
        this.applyRoundEndCoordinatorPlan(roundEndPlan);
        this._recordRoundEndTelemetry(roundEndPlan);
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
            recorder: game.recorder,
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
        this.applyMatchUiState(uiState);
    }

    applyRoundEndControllerTransitionState(roundEndTransition) {
        const game = this.game;
        if (!roundEndTransition) return;
        game.roundPause = roundEndTransition.roundPause;
        game.state = normalizeGameStateId(roundEndTransition.nextState, GAME_STATE_IDS.ROUND_END);
    }

    applyReturnToMenuUi(options = {}) {
        const game = this.game;
        const returnTransition = deriveReturnToMenuTransition();
        this._clearArcadeOverlayPanel();
        this.applyLifecycleTransition(returnTransition);
        this.applyMatchUiState(returnTransition.uiState);
        this.resetCrosshairUi();
        if (options?.showMenuPanel === false) {
            return returnTransition;
        }
        const panelId = String(options?.panelId || 'submenu-game').trim() || 'submenu-game';
        const trigger = String(options?.trigger || options?.reason || 'return_to_menu').trim() || 'return_to_menu';
        if (this.ports?.uiFeedbackPort?.showMenuPanel) {
            this.ports.uiFeedbackPort.showMenuPanel(panelId, { trigger });
        } else {
            game._showMainNav?.();
        }
        if (this.ports?.uiFeedbackPort?.syncAll) {
            this.ports.uiFeedbackPort.syncAll();
        } else {
            game.uiManager?.syncAll?.();
        }
        return returnTransition;
    }

    returnToMenu(options = {}) {
        if (this.ports?.lifecyclePort?.returnToMenu) {
            return this.ports.lifecyclePort.returnToMenu(options);
        }
        const game = this.game;
        if (game?.runtimeFacade?.returnToMenu) {
            return game.runtimeFacade.returnToMenu(options);
        }
        game.entityManager?.clearLastRoundGhost?.();
        const teardownResult = this.sessionOrchestrator.finalizeMatchSession?.({
            reason: options?.reason || 'return_to_menu',
        }) || this.sessionOrchestrator.teardownMatchSession({ reason: options?.reason || 'return_to_menu' });
        game.runtimeFacade?.teardownRuntimeSession?.();
        game.input?.clearPlayerSources?.();
        game.hudRuntimeSystem?.clearNetworkScoreboard?.();
        this.applyReturnToMenuUi(options);
        if (teardownResult && typeof teardownResult.then === 'function') {
            return Promise.resolve(teardownResult).then(() => true).catch(() => false);
        }
        return true;
    }

    /**
     * Returns true if the current match is a network session.
     */
    _isNetworkMatch() {
        return !!this.game?.runtimeFacade?.isNetworkSession?.();
    }

    /**
     * Returns true if the local client is the host.
     */
    _isHost() {
        return this.game?.runtimeFacade?.isHost?.() ?? true;
    }

    pause() {
        // In network matches only the host can pause; clients get disconnect confirmation
        if (this._isNetworkMatch() && !this._isHost()) {
            this.pauseOverlayController.showDisconnectConfirmation();
            return;
        }
        this.pauseOverlayController.pause();
    }

    resumeFromPause() {
        this.pauseOverlayController.resumeFromPause();
    }

    returnToMenuFromPause() {
        this.pauseOverlayController.returnToMenuFromPause();
    }

    setupPauseOverlayListeners() {
        this.pauseOverlayController.setupListeners();
    }

    dispose() {
        this._clearArcadeOverlayPanel();
        this.pauseOverlayController?.dispose?.();
    }
}
