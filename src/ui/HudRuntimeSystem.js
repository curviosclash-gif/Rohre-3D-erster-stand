// ============================================
// HudRuntimeSystem.js - HUD runtime orchestration
// ============================================

import { ArcadeMissionHUD } from './arcade/ArcadeMissionHUD.js';
import { ArcadeScoreHUD } from './arcade/ArcadeScoreHUD.js';
import {
    isPickupTypeSelfUsable,
    isPickupTypeShootable,
    normalizePickupType,
} from '../entities/PickupRegistry.js';
import { resolveGameplayConfig } from '../shared/contracts/GameplayConfigContract.js';

function formatParcoursDurationMs(value) {
    const ms = Math.max(0, Number(value) || 0);
    const seconds = ms / 1000;
    return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
}

export class HudRuntimeSystem {
    constructor(deps = {}) {
        this.game = deps.game || null;
        this.ports = deps.ports || null;
        this._hudP2Visible = null;
        this._fighterHudTimer = 0;
        /** @type {HTMLElement|null} */
        this._scoreboardContainer = null;
        this._arcadeMissionHud = null;
        this._arcadeScoreHud = null;
        this._arcadeSuddenDeathOverlay = null;
        this._arcadeSectorTransitionOverlay = null;
        this._arcadeTransitionVisibleUntilMs = 0;
        this._lastArcadeSectorIndex = 0;
    }

    /**
     * Returns the local player index (0 for host / single-player).
     */
    _getLocalPlayerIndex() {
        return this.game?.runtimeFacade?.session?.localPlayerId
            ? (this.game.runtimeFacade.session.getPlayers?.() || [])
                .findIndex((p) => p.id === this.game.runtimeFacade.session.localPlayerId)
            : 0;
    }

    /**
     * Returns true if this is a network session.
     */
    _isNetworkSession() {
        return !!this.game?.runtimeConfig?.session?.networkEnabled;
    }

    updateScoreHud() {
        const game = this.game;

        // Network mode: update N-player scoreboard
        if (this._isNetworkSession()) {
            this._updateNetworkScoreboard();
            // Still update local player's item bar
            const localIdx = Math.max(0, this._getLocalPlayerIndex());
            const localPlayer = game.entityManager?.players?.[localIdx];
            if (localPlayer && game.ui.p1Items) {
                this._updateItemBar(game.ui.p1Items, localPlayer);
            }
            return;
        }

        // Original local scoreboard logic
        const humans = game.entityManager?.getHumanPlayers
            ? game.entityManager.getHumanPlayers()
            : [];

        if (humans.length > 0) {
            const p1Score = String(humans[0].score);
            if (game.ui.p1Score.textContent !== p1Score) {
                game.ui.p1Score.textContent = p1Score;
            }
            this._updateItemBar(game.ui.p1Items, humans[0]);
        }

        if (humans.length > 1) {
            const p2Score = String(humans[1].score);
            if (game.ui.p2Score.textContent !== p2Score) {
                game.ui.p2Score.textContent = p2Score;
            }
            this._updateItemBar(game.ui.p2Items, humans[1]);
        }
    }

    /**
     * Renders a dynamic N-player scoreboard for network sessions (up to 10 players).
     * Shows all players with score and ping indicator.
     */
    _updateNetworkScoreboard() {
        const game = this.game;
        const players = game.entityManager?.players;
        if (!players || players.length === 0) return;

        const container = this._ensureScoreboardContainer();
        if (!container) return;

        // Ensure we have enough rows
        while (container.children.length < players.length) {
            const row = document.createElement('div');
            row.className = 'mp-scoreboard-row';
            row.innerHTML = '<span class="mp-sb-name"></span><span class="mp-sb-score"></span><span class="mp-sb-ping"></span>';
            container.appendChild(row);
        }
        while (container.children.length > players.length) {
            container.removeChild(container.lastChild);
        }

        const session = game.runtimeFacade?.session;
        const sessionPlayers = session?.getPlayers?.() || [];

        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const row = container.children[i];
            const nameEl = row.children[0];
            const scoreEl = row.children[1];
            const pingEl = row.children[2];

            const label = p.isBot ? `Bot ${p.index + 1}` : `P${p.index + 1}`;
            if (nameEl.textContent !== label) nameEl.textContent = label;

            const scoreStr = String(p.score ?? 0);
            if (scoreEl.textContent !== scoreStr) scoreEl.textContent = scoreStr;

            // Ping from session peer data (if available)
            const peer = sessionPlayers.find((sp) => sp.index === p.index);
            const pingMs = peer?.ping ?? (p.isBot ? 0 : -1);
            const pingLabel = pingMs >= 0 ? `${pingMs}ms` : '';
            if (pingEl.textContent !== pingLabel) pingEl.textContent = pingLabel;
        }
    }

    _ensureScoreboardContainer() {
        if (this._scoreboardContainer) return this._scoreboardContainer;
        const hud = this.game?.ui?.hud;
        if (!hud) return null;
        let container = hud.querySelector('.mp-scoreboard');
        if (!container) {
            container = document.createElement('div');
            container.className = 'mp-scoreboard';
            hud.appendChild(container);
        }
        this._scoreboardContainer = container;
        return container;
    }

    /**
     * Removes the network scoreboard DOM element (e.g. when returning to menu).
     */
    clearNetworkScoreboard() {
        if (this._scoreboardContainer) {
            this._scoreboardContainer.remove();
            this._scoreboardContainer = null;
        }
        this._setParcoursHudVisible(false);
        this._hideArcadeHud();
    }

    _ensureArcadeHud() {
        if (!this._arcadeMissionHud) {
            this._arcadeMissionHud = new ArcadeMissionHUD(document.body);
        }
        if (!this._arcadeScoreHud) {
            this._arcadeScoreHud = new ArcadeScoreHUD(document.body);
        }
    }

    _hideArcadeHud() {
        this._arcadeMissionHud?.hide?.();
        this._arcadeScoreHud?.hide?.();
        this._hideArcadeFeedbackOverlays();
    }

    _ensureArcadeFeedbackOverlays() {
        if (!this._arcadeSuddenDeathOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'arcade-sudden-death-overlay';
            overlay.className = 'hidden';
            document.body.appendChild(overlay);
            this._arcadeSuddenDeathOverlay = overlay;
        }
        if (!this._arcadeSectorTransitionOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'arcade-sector-transition-overlay';
            overlay.className = 'hidden';
            document.body.appendChild(overlay);
            this._arcadeSectorTransitionOverlay = overlay;
        }
    }

    _hideArcadeFeedbackOverlays() {
        if (this._arcadeSuddenDeathOverlay) {
            this._arcadeSuddenDeathOverlay.classList.add('hidden');
        }
        if (this._arcadeSectorTransitionOverlay) {
            this._arcadeSectorTransitionOverlay.classList.add('hidden');
        }
        this._arcadeTransitionVisibleUntilMs = 0;
        this._lastArcadeSectorIndex = 0;
    }

    _updateArcadeHud(dt = 0) {
        const game = this.game;
        const arcadeEnabled = game?.runtimeConfig?.arcade?.enabled === true;
        const modePath = String(game?.settings?.localSettings?.modePath || '').trim().toLowerCase();
        if (!arcadeEnabled || modePath !== 'arcade') {
            this._hideArcadeHud();
            return;
        }

        const arcadeRuntime = game?.runtimeFacade?.arcadeRunRuntime;
        const hudState = arcadeRuntime?.getHudState?.();
        if (!hudState || hudState.phase === 'finished') {
            this._hideArcadeHud();
            return;
        }

        this._ensureArcadeHud();
        this._arcadeScoreHud?.update?.(hudState);
        this._arcadeMissionHud?.update?.(hudState.missionState);
        this._ensureArcadeFeedbackOverlays();

        const nowMs = Math.max(0, Number(hudState.nowMs) || Date.now());
        const suddenDeathActive = String(hudState.phase || '') === 'sudden_death';
        if (suddenDeathActive) {
            const strategy = game?.entityManager?.gameModeStrategy;
            if (strategy && typeof strategy.tickSuddenDeath === 'function') {
                strategy.tickSuddenDeath(Math.max(0, Number(dt) || 0));
            }
        }
        this._arcadeSuddenDeathOverlay?.classList?.toggle('hidden', !suddenDeathActive);

        const sectorIndex = Math.max(0, Math.floor(Number(hudState.sectorIndex) || 0));
        if (sectorIndex > 0 && sectorIndex !== this._lastArcadeSectorIndex) {
            this._arcadeTransitionVisibleUntilMs = nowMs + 1200;
            if (this._arcadeSectorTransitionOverlay) {
                const mapKey = String(hudState.currentMapKey || '').trim() || 'unknown';
                this._arcadeSectorTransitionOverlay.textContent = `Sektor ${sectorIndex}  |  ${mapKey}`;
                this._arcadeSectorTransitionOverlay.classList.remove('hidden');
            }
        }
        this._lastArcadeSectorIndex = sectorIndex;
        if (this._arcadeSectorTransitionOverlay) {
            this._arcadeSectorTransitionOverlay.classList.toggle('hidden', nowMs >= this._arcadeTransitionVisibleUntilMs);
        }
    }

    _setParcoursHudVisible(isVisible) {
        const root = this.game?.ui?.parcoursHud;
        if (!root) return;
        root.classList.toggle('hidden', !isVisible);
    }

    _clearParcoursHud() {
        const ui = this.game?.ui;
        if (!ui) return;
        if (ui.parcoursProgress) ui.parcoursProgress.textContent = 'CP 0/0';
        if (ui.parcoursTimer) ui.parcoursTimer.textContent = '0.00s';
        if (ui.parcoursStatus) {
            ui.parcoursStatus.textContent = '';
            ui.parcoursStatus.classList.remove('success');
        }
    }

    _updateParcoursHud() {
        const game = this.game;
        const ui = game?.ui;
        if (!ui?.parcoursHud || !game?.entityManager) return;

        const localPlayerIndex = this._isNetworkSession()
            ? Math.max(0, this._getLocalPlayerIndex())
            : 0;
        const hudState = game.entityManager.getParcoursHudState(localPlayerIndex);
        if (!hudState?.enabled) {
            this._setParcoursHudVisible(false);
            this._clearParcoursHud();
            return;
        }

        this._setParcoursHudVisible(true);
        const routeLabel = String(hudState.routeId || 'parcours').replace(/_/g, ' ');
        if (ui.parcoursRoute) ui.parcoursRoute.textContent = routeLabel;

        const total = Math.max(0, Number(hudState.totalCheckpoints) || 0);
        const current = Math.max(0, Math.min(total, Number(hudState.currentCheckpoint) || 0));
        if (ui.parcoursProgress) {
            ui.parcoursProgress.textContent = `CP ${current}/${total}`;
        }

        if (ui.parcoursTimer) {
            if (hudState.completed) {
                ui.parcoursTimer.textContent = `Finish ${formatParcoursDurationMs(hudState.completionTimeMs)}`;
            } else {
                ui.parcoursTimer.textContent = `Segment ${formatParcoursDurationMs(hudState.segmentElapsedMs)}`;
            }
        }

        if (ui.parcoursStatus) {
            let statusText = '';
            let isSuccess = false;
            if (hudState.completed) {
                statusText = 'Parcours abgeschlossen';
                isSuccess = true;
            } else if (hudState.hasError && hudState.errorMessage) {
                statusText = hudState.errorMessage;
            }
            ui.parcoursStatus.textContent = statusText;
            ui.parcoursStatus.classList.toggle('success', isSuccess);
        }
    }

    _updateItemBar(container, player) {
        const powerupConfig = resolveGameplayConfig(this.game).POWERUP;
        this._ensureItemSlots(container);
        const inventory = Array.isArray(player?.inventory) ? player.inventory : [];
        const inventoryLength = inventory.length;
        const selectedIndex = inventoryLength > 0
            ? Math.max(0, Math.min(Number(player?.selectedItemIndex) || 0, inventoryLength - 1))
            : -1;
        const strategy = this.game?.entityManager?.gameModeStrategy || null;
        const modeType = String(strategy?.modeType || 'CLASSIC').trim().toUpperCase();
        const useCooldownRemaining = Math.max(0, Number(player?.itemUseCooldownRemaining || 0));
        const shootCooldownRemaining = Math.max(0, Number(player?.shootCooldown || 0));

        for (let i = 0; i < powerupConfig.MAX_INVENTORY; i++) {
            const slot = container.children[i];
            const rawType = i < inventoryLength ? inventory[i] : '';
            const type = normalizePickupType(rawType, { fallback: rawType });
            const config = type ? powerupConfig.TYPES?.[type] : null;
            const canUse = !!type && isPickupTypeSelfUsable(type, modeType);
            const canShoot = !!type && isPickupTypeShootable(type, modeType);
            const isSelected = !!type && i === selectedIndex;
            const useOnCooldown = canUse && useCooldownRemaining > 0.001;
            const shootOnCooldown = canShoot && shootCooldownRemaining > 0.001;
            const hasCooldown = !!type && (useOnCooldown || shootOnCooldown);
            const hintLabel = canUse && canShoot
                ? 'DUAL'
                : (canShoot ? 'SHOT' : (canUse ? 'USE' : ''));
            const titleParts = [];
            if (type) {
                titleParts.push(type.replace(/_/g, ' '));
                if (canUse && canShoot) titleParts.push('Use oder Shoot');
                else if (canShoot) titleParts.push('Verschiessbar');
                else if (canUse) titleParts.push('Direkt nutzbar');
                else titleParts.push('Nur kontextbasiert');
                if (useOnCooldown) titleParts.push(`Use-CD ${useCooldownRemaining.toFixed(1)}s`);
                if (shootOnCooldown) titleParts.push(`Shoot-CD ${shootCooldownRemaining.toFixed(1)}s`);
            }

            slot.dataset.type = rawType;
            slot.dataset.pickupType = type || '';
            slot.dataset.actionHint = hintLabel.toLowerCase();
            slot.dataset.actionHintLabel = hintLabel;
            slot.dataset.selected = isSelected ? '1' : '0';
            slot.dataset.cooldown = hasCooldown ? '1' : '0';
            slot.textContent = type ? (config?.icon || '?') : '';
            slot.title = titleParts.join(' | ');
            slot.classList.toggle('active', !!type);
            slot.classList.toggle('selected', isSelected);
            slot.classList.toggle('projectile-only', !!type && canShoot && !canUse);
            slot.classList.toggle('use-only', !!type && canUse && !canShoot);
            slot.classList.toggle('dual-action', !!type && canUse && canShoot);
            slot.classList.toggle('cooldown', hasCooldown);
            slot.style.borderColor = type && Number.isFinite(config?.color)
                ? '#' + config.color.toString(16).padStart(6, '0')
                : '';
        }
    }

    _ensureItemSlots(container) {
        const desired = resolveGameplayConfig(this.game).POWERUP.MAX_INVENTORY;

        while (container.children.length < desired) {
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            slot.dataset.type = '';
            slot.dataset.pickupType = '';
            slot.dataset.actionHint = '';
            slot.dataset.actionHintLabel = '';
            slot.dataset.selected = '0';
            slot.dataset.cooldown = '0';
            container.appendChild(slot);
        }

        while (container.children.length > desired) {
            container.removeChild(container.lastChild);
        }
    }

    _setHudP2Visibility(isVisible) {
        if (this._hudP2Visible === isVisible) return;
        this._hudP2Visible = isVisible;
        if (this.ports?.uiFeedbackPort?.toggleP2Hud) {
            this.ports.uiFeedbackPort.toggleP2Hud(isVisible);
            return;
        }
        this.game.hudP2.setVisibility(isVisible);
    }

    _resolveScoreHudInterval() {
        const configuredInterval = Number(this.game?.runtimeConfig?.uiHotpath?.scoreInventoryInterval);
        if (Number.isFinite(configuredInterval) && configuredInterval > 0) {
            return configuredInterval;
        }
        return 0.2;
    }

    _resolveFighterHudInterval() {
        const configuredInterval = Number(this.game?.runtimeConfig?.uiHotpath?.fighterHudInterval);
        if (Number.isFinite(configuredInterval) && configuredInterval > 0) {
            return configuredInterval;
        }
        return 0.05;
    }

    _consumeInterval(timerKey, dt, interval) {
        const elapsed = this[timerKey] + dt;
        if (elapsed < interval) {
            this[timerKey] = elapsed;
            return 0;
        }
        this[timerKey] = elapsed % interval;
        return elapsed;
    }

    updatePlayingHudTick(dt) {
        const game = this.game;
        if (!game.entityManager) return;
        this._updateParcoursHud();

        // Score/Inventory laufen auf eigener, konservativer Tick-Frequenz.
        const scoreHudInterval = this._resolveScoreHudInterval();
        game._hudTimer += dt;
        if (game._hudTimer >= scoreHudInterval) {
            game._hudTimer %= scoreHudInterval;
            this.updateScoreHud();
        }

        const fighterHudInterval = this._resolveFighterHudInterval();
        const fighterElapsed = this._consumeInterval('_fighterHudTimer', dt, fighterHudInterval);
        if (fighterElapsed > 0) {
            this._updateArcadeHud(fighterElapsed);
        }

        // FIGHTER HUD UPDATE
        const localHumans = game.numHumans || 1;
        const networkSession = this._isNetworkSession();
        // In network mode only 1 local player — no P2 HUD
        this._setHudP2Visibility(!networkSession && localHumans >= 2);
        if (fighterElapsed <= 0) return;

        if (networkSession) {
            // Show only the local player's fighter HUD
            const localIdx = Math.max(0, this._getLocalPlayerIndex());
            const localPlayer = game.entityManager.players[localIdx];
            if (localPlayer) game.hudP1.update(localPlayer, fighterElapsed, game.entityManager);
        } else {
            const p1 = game.entityManager.players[0];
            if (p1) game.hudP1.update(p1, fighterElapsed, game.entityManager);

            if (localHumans >= 2) {
                const p2 = game.entityManager.players[1];
                if (p2) game.hudP2.update(p2, fighterElapsed, game.entityManager);
            }
        }
    }

    dispose() {
        this.clearNetworkScoreboard();
        this._arcadeMissionHud?.dispose?.();
        this._arcadeScoreHud?.dispose?.();
        this._arcadeMissionHud = null;
        this._arcadeScoreHud = null;
        if (this._arcadeSuddenDeathOverlay?.parentElement) {
            this._arcadeSuddenDeathOverlay.parentElement.removeChild(this._arcadeSuddenDeathOverlay);
        }
        if (this._arcadeSectorTransitionOverlay?.parentElement) {
            this._arcadeSectorTransitionOverlay.parentElement.removeChild(this._arcadeSectorTransitionOverlay);
        }
        this._arcadeSuddenDeathOverlay = null;
        this._arcadeSectorTransitionOverlay = null;
        this._arcadeTransitionVisibleUntilMs = 0;
        this._lastArcadeSectorIndex = 0;
    }
}
