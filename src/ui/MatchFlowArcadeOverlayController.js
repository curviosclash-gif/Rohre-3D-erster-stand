import { clearMessageStats, renderMessageStats } from './dom/MessageStatsDom.js';
import {
    getArcadeMenuSurfaceState,
    requestArcadeReplayPlayback,
    selectArcadeIntermissionChoice,
    selectArcadeReward,
} from './MatchFlowTransitionHotspots.js';
import {
    GAME_STATE_IDS,
    normalizeGameStateId,
} from '../shared/contracts/GameStateIds.js';

function toSafeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function formatPercent(value) {
    return `${Math.round(Math.max(0, Math.min(1, toSafeNumber(value, 0))) * 100)}%`;
}

export class MatchFlowArcadeOverlayController {
    constructor(deps = {}) {
        this.matchFlowUiController = deps.matchFlowUiController || null;
        this.runtime = deps.runtime || deps.game || this.matchFlowUiController?.game || null;
        this.runtimePort = deps.runtimePort || this.matchFlowUiController?.runtimePort || null;
        this._arcadeOverlayPanel = null;
        this._arcadeXpAnimFrame = 0;
        this._arcadeXpAnimToken = 0;
    }

    get game() {
        return this.runtime;
    }

    _resolveMessageStatsContainer() {
        return this.game?.ui?.messageStats || null;
    }

    clearMessageStatsUi() {
        clearMessageStats(this._resolveMessageStatsContainer());
    }

    renderMessageStatsUi(overlayStats) {
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

    clearArcadeOverlayPanel() {
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
                selectArcadeIntermissionChoice(this.runtimePort, this.game, choiceId);
                const nextState = getArcadeMenuSurfaceState(this.runtimePort, this.game);
                this._renderArcadeIntermissionPanel(nextState);
            });
        });
        panel.querySelectorAll('[data-arcade-reward-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const rewardId = String(button.getAttribute('data-arcade-reward-id') || '').trim();
                if (!rewardId) return;
                selectArcadeReward(this.runtimePort, this.game, rewardId);
                const nextState = getArcadeMenuSurfaceState(this.runtimePort, this.game);
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
                const result = requestArcadeReplayPlayback(this.runtimePort, this.game);
                const code = String(result?.code || 'replay_unknown');
                const tone = code === 'replay_player_unavailable' ? 'warning' : 'info';
                const message = code === 'ghost_fallback_started'
                    ? 'Ghost-Fallback wird abgespielt.'
                    : (code === 'replay_player_unavailable'
                    ? 'Replay-Player fehlt, Export-Fallback bereit.'
                    : (code === 'replay_disabled'
                        ? 'Replay ist in den Runtime-Einstellungen deaktiviert.'
                        : (code === 'replay_unavailable'
                            ? 'Kein Replay fuer diesen Run verfuegbar.'
                            : 'Replay-Status aktualisiert.')));
                this.game?._showStatusToast?.(message, 1800, tone);
            });
        }

        return true;
    }

    syncArcadeOverlayPanel() {
        const game = this.game;
        const runtimeProjection = this.runtimePort?.getMatchRuntimeProjection?.() || null;
        const arcadeActive = String(runtimeProjection?.modeId || '').toUpperCase() === 'ARCADE';
        const overlayVisible = !!game?.ui?.messageOverlay && !game.ui.messageOverlay.classList.contains('hidden');
        if (!arcadeActive || !overlayVisible) {
            this.clearArcadeOverlayPanel();
            return;
        }
        const runtimeState = getArcadeMenuSurfaceState(this.runtimePort, this.game);
        const state = normalizeGameStateId(game?.state, GAME_STATE_IDS.MENU);
        if (state === GAME_STATE_IDS.ROUND_END && this._renderArcadeIntermissionPanel(runtimeState)) {
            return;
        }
        if (state === GAME_STATE_IDS.MATCH_END && this._renderArcadePostRunPanel(runtimeState)) {
            return;
        }
        this.clearArcadeOverlayPanel();
    }

    dispose() {
        this.clearArcadeOverlayPanel();
        this._arcadeOverlayPanel?.remove?.();
        this._arcadeOverlayPanel = null;
    }
}
