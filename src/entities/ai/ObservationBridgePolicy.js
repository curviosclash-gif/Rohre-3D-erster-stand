// ============================================
// ObservationBridgePolicy.js - bridge policy shell with resilient local fallback
// ============================================

import { createNeutralBotAction, sanitizeBotAction } from './actions/BotActionContract.js';
import { BOT_POLICY_TYPES, normalizeBotPolicyType } from './BotPolicyTypes.js';
import { buildTrainerRuntimeObservationPayload } from './training/TrainerPayloadAdapter.js';
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
        maxRetries: trainerConfig?.maxRetries
            ?? options?.trainerBridgeMaxRetries
            ?? runtimeBotConfig?.trainerBridgeMaxRetries
            ?? 1,
        retryDelayMs: trainerConfig?.retryDelayMs
            ?? options?.trainerBridgeRetryDelayMs
            ?? runtimeBotConfig?.trainerBridgeRetryDelayMs
            ?? 0,
        resumeCheckpoint: trainerConfig?.resumeCheckpoint
            ?? options?.trainerCheckpointResumeToken
            ?? runtimeBotConfig?.trainerCheckpointResumeToken
            ?? '',
        resumeStrict: trainerConfig?.resumeStrict
            ?? options?.trainerCheckpointResumeStrict
            ?? runtimeBotConfig?.trainerCheckpointResumeStrict
            ?? false,
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
        this._trainerBridgeOptions = null;
        this._trainerBridgeInitPromise = null;
        this._trainerBridgeInitState = Object.freeze({
            status: 'disabled',
            resumeRequested: false,
            resumeToken: null,
            loaded: false,
            error: null,
            resumeSource: null,
        });

        const trainerBridgeOptions = resolveTrainerBridgeOptions(options);
        if (trainerBridgeOptions.enabled) {
            this._trainerBridgeOptions = trainerBridgeOptions;
            this._trainerBridge = new WebSocketTrainerBridge(trainerBridgeOptions);
            this._primeTrainerBridge(trainerBridgeOptions);
        }
    }

    _setTrainerBridgeInitState(nextState = {}) {
        this._trainerBridgeInitState = Object.freeze({
            status: typeof nextState.status === 'string' ? nextState.status : 'disabled',
            resumeRequested: nextState.resumeRequested === true,
            resumeToken: typeof nextState.resumeToken === 'string' ? nextState.resumeToken : null,
            loaded: nextState.loaded === true,
            error: typeof nextState.error === 'string' ? nextState.error : null,
            resumeSource: typeof nextState.resumeSource === 'string' ? nextState.resumeSource : null,
        });
    }

    _primeTrainerBridge(trainerBridgeOptions = {}) {
        const resumeToken = typeof trainerBridgeOptions.resumeCheckpoint === 'string'
            ? trainerBridgeOptions.resumeCheckpoint.trim()
            : '';
        if (!resumeToken) {
            this._setTrainerBridgeInitState({
                status: 'ready',
                resumeRequested: false,
                loaded: true,
            });
            return;
        }
        this._setTrainerBridgeInitState({
            status: 'pending',
            resumeRequested: true,
            resumeToken,
            loaded: false,
            error: null,
            resumeSource: null,
        });

        this._trainerBridgeInitPromise = this._initializeTrainerCheckpointResume(resumeToken, trainerBridgeOptions);
    }

    async _initializeTrainerCheckpointResume(resumeToken, trainerBridgeOptions) {
        if (!this._trainerBridge) return;
        const resumeStrict = trainerBridgeOptions?.resumeStrict === true;
        const commandTimeoutMs = Math.max(
            40,
            Number(trainerBridgeOptions?.timeoutMs || 80) * 4
        );
        try {
            if (typeof this._trainerBridge.waitForReady === 'function') {
                const ready = await this._trainerBridge.waitForReady(commandTimeoutMs);
                if (!ready) {
                    if (resumeStrict) {
                        this._setTrainerBridgeInitState({
                            status: 'failed',
                            resumeRequested: true,
                            resumeToken,
                            loaded: false,
                            error: 'ready-timeout',
                        });
                        return;
                    }
                    this._setTrainerBridgeInitState({
                        status: 'ready',
                        resumeRequested: true,
                        resumeToken,
                        loaded: false,
                        error: 'ready-timeout',
                    });
                    return;
                }
            }

            const payload = {
                strict: resumeStrict,
            };
            let requestType = 'trainer-checkpoint-load-latest';
            if (resumeToken.toLowerCase() !== 'latest') {
                payload.checkpointPath = resumeToken;
            }
            const response = await this._trainerBridge.submitCommand(requestType, payload, {
                timeoutMs: commandTimeoutMs,
            });
            const loaded = response?.ok === true && response?.loaded === true;
            if (!loaded && resumeStrict) {
                this._setTrainerBridgeInitState({
                    status: 'failed',
                    resumeRequested: true,
                    resumeToken,
                    loaded: false,
                    error: response?.error || 'checkpoint-load-failed',
                    resumeSource: response?.resumeSource || null,
                });
                return;
            }
            this._setTrainerBridgeInitState({
                status: 'ready',
                resumeRequested: true,
                resumeToken,
                loaded,
                error: loaded ? null : (response?.error || 'checkpoint-load-failed'),
                resumeSource: response?.resumeSource || null,
            });
        } catch (error) {
            this._setTrainerBridgeInitState({
                status: resumeStrict ? 'failed' : 'ready',
                resumeRequested: true,
                resumeToken,
                loaded: false,
                error: error?.message || 'checkpoint-load-exception',
            });
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
        return buildTrainerRuntimeObservationPayload(runtimeContext, player);
    }

    _resolveTrainerBridgeAction(runtimeContext, player) {
        if (!this._trainerBridge) {
            return { action: null, failure: null, usedBridge: false };
        }
        const initStatus = this._trainerBridgeInitState?.status;
        if (initStatus === 'pending') {
            return { action: null, failure: 'checkpoint-resume-pending', usedBridge: true };
        }
        if (initStatus === 'failed') {
            return {
                action: null,
                failure: this._trainerBridgeInitState?.error || 'checkpoint-resume-failed',
                usedBridge: true,
            };
        }

        this._trainerBridge.submitObservation(this._buildTrainerPayload(runtimeContext, player));
        const action = this._trainerBridge.consumeLatestAction();
        const failure = this._trainerBridge.consumeFailure();
        return { action, failure, usedBridge: true };
    }

    _recordTrainerFallback(reason = 'bridge-fallback') {
        if (this._trainerBridge && typeof this._trainerBridge.recordFallback === 'function') {
            this._trainerBridge.recordFallback(reason);
        }
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
        if (trainerResult.usedBridge) {
            this._recordTrainerFallback(
                trainerResult.failure
                    ? `bridge-${trainerResult.failure}`
                    : 'bridge-no-action'
            );
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

    getTrainerBridgeTelemetry() {
        if (!this._trainerBridge || typeof this._trainerBridge.getTelemetrySnapshot !== 'function') {
            return null;
        }
        return this._trainerBridge.getTelemetrySnapshot();
    }

    getTrainerBridgeStatus() {
        return {
            enabled: !!this._trainerBridge,
            resume: {
                ...this._trainerBridgeInitState,
            },
            telemetry: this.getTrainerBridgeTelemetry(),
        };
    }

    reset() {
        if (this._trainerBridge) {
            this._trainerBridge.close();
        }
        this._trainerBridgeInitPromise = null;
        if (this._trainerBridge && this._trainerBridgeOptions) {
            this._primeTrainerBridge(this._trainerBridgeOptions);
        } else {
            this._setTrainerBridgeInitState({
                status: this._trainerBridge ? 'ready' : 'disabled',
                resumeRequested: false,
                loaded: true,
                error: null,
                resumeSource: null,
            });
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
