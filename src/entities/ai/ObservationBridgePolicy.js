// ============================================
// ObservationBridgePolicy.js - bridge policy shell with resilient local fallback
// ============================================

import { createNeutralBotAction, sanitizeBotAction } from './actions/BotActionContract.js';
import { BOT_POLICY_TYPES, normalizeBotPolicyType } from './BotPolicyTypes.js';
import { WebSocketTrainerBridge } from './training/WebSocketTrainerBridge.js';

function isRuntimeContextPayload(value) {
    return !!(
        value
        && typeof value === 'object'
        && ('arena' in value || 'players' in value || 'projectiles' in value || 'observation' in value)
    );
}

function createRuntimeContextFromLegacyArgs(player, arena, allPlayers, projectiles, dt) {
    return {
        dt: Number.isFinite(dt) ? dt : 0,
        player: player || null,
        arena: arena || null,
        players: Array.isArray(allPlayers) ? allPlayers : [],
        projectiles: Array.isArray(projectiles) ? projectiles : [],
        observation: null,
    };
}

function resolveTrainerBridgeOptions(options = {}) {
    const runtimeBotConfig = options?.runtimeConfig?.bot || null;
    const trainerConfig = options?.trainerBridge && typeof options.trainerBridge === 'object'
        ? options.trainerBridge
        : null;
    const enabled = !!(
        options?.trainerBridgeEnabled
        ?? trainerConfig?.enabled
        ?? runtimeBotConfig?.trainerBridgeEnabled
        ?? false
    );
    return {
        enabled,
        url: trainerConfig?.url || options?.trainerBridgeUrl || runtimeBotConfig?.trainerBridgeUrl || 'ws://127.0.0.1:8765',
        timeoutMs: trainerConfig?.timeoutMs || options?.trainerBridgeTimeoutMs || runtimeBotConfig?.trainerBridgeTimeoutMs || 80,
    };
}

export class ObservationBridgePolicy {
    constructor(options = {}) {
        this.type = normalizeBotPolicyType(options.type || BOT_POLICY_TYPES.CLASSIC_BRIDGE);
        this.usesRuntimeContext = true;
        this._fallbackPolicy = options.fallbackPolicy || null;
        this._resolveAction = typeof options.resolveAction === 'function' ? options.resolveAction : null;
        this._resolveObservation = typeof options.resolveObservation === 'function' ? options.resolveObservation : null;
        this._warningCooldownMs = 2000;
        this._lastWarningAt = 0;
        this._neutralAction = createNeutralBotAction({});
        this._trainerBridge = null;

        const trainerBridgeOptions = resolveTrainerBridgeOptions(options);
        if (trainerBridgeOptions.enabled) {
            this._trainerBridge = new WebSocketTrainerBridge(trainerBridgeOptions);
        }
    }

    _warn(message, error = null) {
        const now = Date.now();
        if (now - this._lastWarningAt < this._warningCooldownMs) return;
        this._lastWarningAt = now;
        const errorMessage = error ? ` (${error.message || String(error)})` : '';
        console.warn(`[ObservationBridgePolicy] ${this.type}: ${message}${errorMessage}`);
    }

    _asRuntimeContext(dt, player, runtimeContextOrArena, allPlayers, projectiles) {
        if (isRuntimeContextPayload(runtimeContextOrArena)) {
            const context = runtimeContextOrArena;
            if (!Array.isArray(context.players)) context.players = [];
            if (!Array.isArray(context.projectiles)) context.projectiles = [];
            if (!context.player) context.player = player || null;
            if (!Number.isFinite(context.dt)) context.dt = Number.isFinite(dt) ? dt : 0;
            return context;
        }
        return createRuntimeContextFromLegacyArgs(player, runtimeContextOrArena, allPlayers, projectiles, dt);
    }

    _delegateFallbackUpdate(dt, player, runtimeContext) {
        const fallbackUpdate = this._fallbackPolicy?.update;
        if (typeof fallbackUpdate !== 'function') {
            return this._neutralAction;
        }

        try {
            if (this._fallbackPolicy.usesRuntimeContext === true || fallbackUpdate.length <= 3) {
                return fallbackUpdate.call(this._fallbackPolicy, dt, player, runtimeContext);
            }
            return fallbackUpdate.call(
                this._fallbackPolicy,
                dt,
                player,
                runtimeContext.arena,
                runtimeContext.players,
                runtimeContext.projectiles
            );
        } catch (error) {
            this._warn('fallback policy update failed', error);
            return this._neutralAction;
        }
    }

    _sanitizeAction(action, player) {
        return sanitizeBotAction(action, {
            inventoryLength: Array.isArray(player?.inventory) ? player.inventory.length : 0,
            onInvalid: (reason) => this._warn(`sanitized invalid action (${reason})`),
        }, this._neutralAction);
    }

    _buildTrainerPayload(runtimeContext, player) {
        return {
            mode: String(runtimeContext?.mode || ''),
            dt: Number.isFinite(runtimeContext?.dt) ? runtimeContext.dt : 0,
            observation: runtimeContext?.observation || null,
            player: player
                ? {
                    index: Number.isInteger(player.index) ? player.index : -1,
                    hp: Number(player.hp) || 0,
                    maxHp: Number(player.maxHp) || 0,
                    shieldHp: Number(player.shieldHP) || 0,
                    maxShieldHp: Number(player.maxShieldHp) || 0,
                    inventoryLength: Array.isArray(player.inventory) ? player.inventory.length : 0,
                }
                : null,
        };
    }

    _resolveTrainerBridgeAction(runtimeContext, player) {
        if (!this._trainerBridge) {
            return { action: null, failure: null };
        }

        this._trainerBridge.submitObservation(this._buildTrainerPayload(runtimeContext, player));
        const action = this._trainerBridge.consumeLatestAction();
        const failure = this._trainerBridge.consumeFailure();
        return { action, failure };
    }

    getObservation(player, runtimeContext) {
        if (typeof this._resolveObservation === 'function') {
            try {
                return this._resolveObservation(player, runtimeContext);
            } catch (error) {
                this._warn('resolveObservation failed', error);
            }
        }
        if (typeof this._fallbackPolicy?.getObservation === 'function') {
            try {
                return this._fallbackPolicy.getObservation(player, runtimeContext);
            } catch (error) {
                this._warn('fallback getObservation failed', error);
            }
        }
        return runtimeContext?.observation || null;
    }

    update(dt, player, runtimeContextOrArena, allPlayers = null, projectiles = null) {
        const runtimeContext = this._asRuntimeContext(dt, player, runtimeContextOrArena, allPlayers, projectiles);
        if (runtimeContext.observation == null) {
            runtimeContext.observation = this.getObservation(player, runtimeContext);
        }

        const trainerResult = this._resolveTrainerBridgeAction(runtimeContext, player);
        if (trainerResult.failure) {
            this._warn(`trainer bridge ${trainerResult.failure}; fallback local policy`);
        }
        if (trainerResult.action && typeof trainerResult.action === 'object') {
            return this._sanitizeAction(trainerResult.action, player);
        }

        if (typeof this._resolveAction === 'function') {
            try {
                const action = this._resolveAction(runtimeContext, player, dt);
                if (action && typeof action === 'object') {
                    return this._sanitizeAction(action, player);
                }
                this._warn('resolveAction returned no action payload, using fallback');
            } catch (error) {
                this._warn('resolveAction failed, using fallback', error);
            }
        }

        const fallbackAction = this._delegateFallbackUpdate(dt, player, runtimeContext);
        return this._sanitizeAction(fallbackAction, player);
    }

    reset() {
        if (this._trainerBridge) {
            this._trainerBridge.close();
        }
        if (typeof this._fallbackPolicy?.reset === 'function') {
            this._fallbackPolicy.reset();
        }
    }

    setDifficulty(profileName) {
        if (typeof this._fallbackPolicy?.setDifficulty === 'function') {
            this._fallbackPolicy.setDifficulty(profileName);
        }
    }

    onBounce(type, normal = null) {
        if (typeof this._fallbackPolicy?.onBounce === 'function') {
            this._fallbackPolicy.onBounce(type, normal);
        }
    }

    setSensePhase(phase) {
        if (typeof this._fallbackPolicy?.setSensePhase === 'function') {
            this._fallbackPolicy.setSensePhase(phase);
        }
    }
}
