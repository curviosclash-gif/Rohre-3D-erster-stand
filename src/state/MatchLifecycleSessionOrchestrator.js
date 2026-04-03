import {
    disposeMatchSessionSystems,
    prepareInitializedMatchSession,
    wireInitializedMatchRuntime,
} from './MatchSessionFactory.js';
import {
    MATCH_LIFECYCLE_CONTRACT_VERSION,
    MATCH_LIFECYCLE_EVENT_TYPES,
    SESSION_FINALIZE_TRIGGERS,
} from '../shared/contracts/MatchLifecycleContract.js';

export const MATCH_SESSION_PORT_METHODS = Object.freeze([
    'getSessionRuntimeState',
    'getLifecycleState',
    'notifyLifecycleEvent',
    'prepareInitializedMatchSession',
    'wireInitializedMatchRuntime',
    'applyInitializedMatchSession',
    'getCurrentMatchSessionRefs',
    'clearMatchSessionRefs',
    'disposePreparedMatchSession',
    'disposeCurrentMatchSession',
    'settleRecorder',
    'resetRoundRuntime',
]);

function hasActiveMatchSessionRefs(currentSession) {
    return !!(
        currentSession?.arena
        || currentSession?.entityManager
        || currentSession?.powerupManager
    );
}

function createFallbackSessionRuntimeState() {
    return {
        session: {
            sequence: 0,
            activeSessionId: null,
        },
        finalize: {
            status: 'idle',
            pendingOperation: null,
            lastReason: null,
            lastTrigger: null,
            lastCompletedReason: null,
            updatedAt: Date.now(),
        },
        lifecycle: {
            gameStateId: null,
            disposed: false,
            pendingSessionInit: null,
            status: 'idle',
            updatedAt: Date.now(),
        },
    };
}

function readRuntimeStatePath(source, path = []) {
    let cursor = source;
    for (const segment of path) {
        if (!cursor || typeof cursor !== 'object') {
            return undefined;
        }
        cursor = cursor[segment];
    }
    return cursor;
}

function writeRuntimeStatePath(source, path = [], value) {
    if (!source || typeof source !== 'object' || !Array.isArray(path) || path.length === 0) {
        return;
    }
    let cursor = source;
    for (let index = 0; index < path.length - 1; index += 1) {
        const segment = path[index];
        if (!cursor[segment] || typeof cursor[segment] !== 'object') {
            cursor[segment] = {};
        }
        cursor = cursor[segment];
    }
    cursor[path[path.length - 1]] = value;
}

function resolveSessionRuntimeState(runtime) {
    if (!runtime || typeof runtime !== 'object') {
        return null;
    }
    return runtime.sessionRuntime || runtime.runtimeBundle?.sessionRuntime || null;
}

export function createMatchSessionPort(runtime) {
    const sessionRuntime = resolveSessionRuntimeState(runtime);
    const runtimeHandles = sessionRuntime?.handles || null;
    const sessionSettings = sessionRuntime?.session?.settings || null;
    const getCurrentMatchSessionRefs = () => runtime?.matchSessionRuntimeBridge?.getCurrentMatchSessionRefs?.() || null;
    const getRecorder = () => runtimeHandles?.mediaRecorderSystem || runtime?.mediaRecorderSystem || runtime?.recorder || null;
    return {
        getSessionRuntimeState: () => sessionRuntime,
        getLifecycleState: () => ({
            sessionId: sessionRuntime?.session?.activeSessionId || null,
            mapKey: sessionSettings?.mapKey || runtime?.mapKey || null,
            numHumans: Number(sessionSettings?.numHumans ?? runtime?.numHumans) || 0,
            numBots: Number(sessionSettings?.numBots ?? runtime?.numBots) || 0,
            winsNeeded: Number(sessionSettings?.winsNeeded ?? runtime?.winsNeeded) || 0,
            activeGameMode: sessionSettings?.activeGameMode || runtime?.activeGameMode || null,
            gameStateId: sessionRuntime?.lifecycle?.gameStateId || runtime?.state || null,
            lifecycleStatus: sessionRuntime?.lifecycle?.status || null,
            finalizeStatus: sessionRuntime?.finalize?.status || null,
        }),
        notifyLifecycleEvent: (type, context) => getRecorder()?.notifyLifecycleEvent?.(type, context),
        prepareInitializedMatchSession: (handlers = {}) => prepareInitializedMatchSession({
            renderer: runtimeHandles?.renderer || runtime?.renderer,
            audio: runtimeHandles?.audio || runtime?.audio,
            recorder: runtime?.recorder,
            runtimeProfiler: runtime?.runtimePerfProfiler,
            settings: runtime?.settings,
            runtimeConfig: runtime?.runtimeConfig,
            baseConfig: runtime?.config || null,
            requestedMapKey: sessionSettings?.mapKey || runtime?.mapKey,
            currentSession: getCurrentMatchSessionRefs(),
            ...handlers,
        }),
        wireInitializedMatchRuntime: (initializedMatch, handlers = {}) => wireInitializedMatchRuntime({
            renderer: runtimeHandles?.renderer || runtime?.renderer,
            initializedMatch,
            ...handlers,
        }),
        applyInitializedMatchSession: (initializedMatch) => runtime?.matchSessionRuntimeBridge?.applyInitializedMatchSession?.(initializedMatch),
        getCurrentMatchSessionRefs,
        clearMatchSessionRefs: () => runtime?.matchSessionRuntimeBridge?.clearMatchSessionRefs?.(),
        disposePreparedMatchSession: (initializedMatch, options = {}) => {
            if (!initializedMatch?.session) return;
            disposeMatchSessionSystems(runtime?.renderer, initializedMatch.session, options);
        },
        disposeCurrentMatchSession: (options = {}) => {
            const currentSession = getCurrentMatchSessionRefs();
            if (!currentSession) return;
            disposeMatchSessionSystems(runtime?.renderer, currentSession, options);
        },
        settleRecorder: (trigger = null) => {
            const recorder = getRecorder();
            if (recorder?.settleRecording) {
                return recorder.settleRecording(trigger);
            }
            return null;
        },
        resetRoundRuntime: () => {
            const currentSession = getCurrentMatchSessionRefs();
            const entityManager = currentSession?.entityManager || null;
            const powerupManager = currentSession?.powerupManager || null;
            if (!entityManager || !powerupManager) return;

            for (const player of entityManager.players) {
                player.trail.clear();
            }
            powerupManager.clear();

            runtime?.recorder?.startRound?.(entityManager.players);
            entityManager.spawnAll();
            runtime?.runtimeFacade?.arcadeRunRuntime?.applyPendingIntermissionEffects?.({
                players: entityManager.players,
            });
            for (const player of entityManager.getHumanPlayers()) {
                player.planarAimOffset = 0;
            }
        },
    };
}

export class MatchLifecycleSessionOrchestrator {
    constructor(runtimeOrDeps = null) {
        const runtime = runtimeOrDeps?.runtime || runtimeOrDeps;
        this.deps = runtimeOrDeps?.prepareInitializedMatchSession
            ? runtimeOrDeps
            : createMatchSessionPort(runtime);
        if (this.deps && typeof this.deps === 'object') {
            for (const method of MATCH_SESSION_PORT_METHODS) {
                if (typeof this.deps[method] !== 'function') {
                    console?.warn?.(`[MatchLifecycleSessionOrchestrator] deps missing: ${method}`);
                }
            }
        }
        this._lifecycleContractVersion = MATCH_LIFECYCLE_CONTRACT_VERSION;
        this._sessionRuntimeState = this.deps?.getSessionRuntimeState?.() || createFallbackSessionRuntimeState();
        this._bindRuntimeField('_sessionSequence', ['session', 'sequence'], 0);
        this._bindRuntimeField('_activeSessionId', ['session', 'activeSessionId'], null);
        this._bindRuntimeField('_pendingSessionInit', ['lifecycle', 'pendingSessionInit'], null);
        this._bindRuntimeField('_pendingFinalize', ['finalize', 'pendingOperation'], null);
        if (!this._sessionRuntimeState?.finalize?.status) {
            this._sessionRuntimeState.finalize.status = 'idle';
        }
        if (!this._sessionRuntimeState?.lifecycle?.status) {
            this._sessionRuntimeState.lifecycle.status = 'idle';
        }
    }

    _bindRuntimeField(fieldName, path, defaultValue) {
        if (readRuntimeStatePath(this._sessionRuntimeState, path) === undefined) {
            writeRuntimeStatePath(this._sessionRuntimeState, path, defaultValue);
        }
        Object.defineProperty(this, fieldName, {
            configurable: true,
            enumerable: false,
            get: () => readRuntimeStatePath(this._sessionRuntimeState, path),
            set: (value) => writeRuntimeStatePath(this._sessionRuntimeState, path, value),
        });
    }

    _setLifecycleStatus(status) {
        if (!this._sessionRuntimeState?.lifecycle || typeof status !== 'string' || !status.trim()) {
            return;
        }
        this._sessionRuntimeState.lifecycle.status = status;
        this._sessionRuntimeState.lifecycle.updatedAt = Date.now();
    }

    _setFinalizeStatus(status, extra = null) {
        if (!this._sessionRuntimeState?.finalize || typeof status !== 'string' || !status.trim()) {
            return;
        }
        this._sessionRuntimeState.finalize.status = status;
        if (extra && typeof extra === 'object') {
            Object.assign(this._sessionRuntimeState.finalize, extra);
        }
        this._sessionRuntimeState.finalize.updatedAt = Date.now();
    }

    _buildLifecycleContext(extra = null) {
        const lifecycleState = this.deps?.getLifecycleState?.() || {};
        const context = {
            contractVersion: this._lifecycleContractVersion,
            sessionId: this._activeSessionId,
            mapKey: lifecycleState.mapKey || null,
            numHumans: Number(lifecycleState.numHumans) || 0,
            numBots: Number(lifecycleState.numBots) || 0,
            winsNeeded: Number(lifecycleState.winsNeeded) || 0,
            activeGameMode: lifecycleState.activeGameMode || null,
        };
        if (extra && typeof extra === 'object') {
            Object.assign(context, extra);
        }
        return context;
    }

    _emitLifecycleEvent(type, extra = null) {
        this.deps?.notifyLifecycleEvent?.(type, this._buildLifecycleContext(extra));
    }

    _startLifecycleSession(extra = null) {
        if (!this._activeSessionId) {
            this._sessionSequence += 1;
            this._activeSessionId = `match-${this._sessionSequence}`;
        }
        this._setLifecycleStatus('playing');
        this._setFinalizeStatus('idle', {
            lastReason: null,
            lastTrigger: null,
        });
        this._emitLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.MATCH_STARTED, extra);
    }

    _endLifecycleSession(reason = 'match_teardown') {
        if (!this._activeSessionId) return;
        this._emitLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.MATCH_ENDED, { reason });
        this._activeSessionId = null;
    }

    notifyMenuOpened(extra = null) {
        this._setLifecycleStatus(this._sessionRuntimeState?.lifecycle?.disposed ? 'disposed' : 'menu');
        this._emitLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.MENU_OPENED, extra);
    }

    _buildRecorderFinalizeTrigger(reason, context = undefined) {
        const normalizedReason = typeof reason === 'string' && reason.trim()
            ? reason.trim()
            : SESSION_FINALIZE_TRIGGERS.RETURN_TO_MENU;
        const normalizedContext = context && typeof context === 'object'
            ? { ...context }
            : {};
        if (!normalizedContext.reason) {
            normalizedContext.reason = normalizedReason;
        }
        return {
            type: normalizedReason,
            context: normalizedContext,
        };
    }

    _buildFinalizeRequest(options = undefined) {
        const request = typeof options === 'string'
            ? { reason: options }
            : (options && typeof options === 'object' ? options : {});
        const reason = typeof request.reason === 'string' && request.reason.trim()
            ? request.reason.trim()
            : SESSION_FINALIZE_TRIGGERS.RETURN_TO_MENU;
        return {
            reason,
            awaitPendingInit: request.awaitPendingInit !== false,
            notifyMenuOpened: request.notifyMenuOpened !== false,
            clearScene: request.clearScene !== false,
            recorderTrigger: request.recorderTrigger || this._buildRecorderFinalizeTrigger(
                reason,
                request.recorderContext
            ),
        };
    }

    _hasCurrentSessionRefs() {
        const currentSession = this.deps?.getCurrentMatchSessionRefs?.();
        // Menu bootstrap keeps a standalone particle system alive before the first
        // real match session exists. Particles alone must not trigger stale-session
        // finalization for a new match start.
        return hasActiveMatchSessionRefs(currentSession);
    }

    async _disposePreparedMatch(initializedMatch, reason = SESSION_FINALIZE_TRIGGERS.STALE_SESSION_INIT) {
        if (!initializedMatch) return;
        try {
            await Promise.resolve(this.deps?.disposePreparedMatchSession?.(initializedMatch, {
                reason,
                clearScene: true,
            }));
        } catch {
            // Best-effort cleanup for discarded async init results.
        }
    }

    async _applyInitializedMatch(initializedMatch, expectedSessionId, lifecycleHandlers = {}) {
        if (expectedSessionId && this._activeSessionId !== expectedSessionId) {
            await this._disposePreparedMatch(initializedMatch, SESSION_FINALIZE_TRIGGERS.STALE_SESSION_INIT);
            return null;
        }

        const wiredMatch = await Promise.resolve(
            this.deps?.wireInitializedMatchRuntime?.(initializedMatch, lifecycleHandlers) || initializedMatch
        );
        if (expectedSessionId && this._activeSessionId !== expectedSessionId) {
            await this._disposePreparedMatch(wiredMatch, SESSION_FINALIZE_TRIGGERS.STALE_SESSION_INIT);
            return null;
        }

        try {
            this.deps?.applyInitializedMatchSession?.(wiredMatch);
        } catch (applyError) {
            await this._disposePreparedMatch(wiredMatch, SESSION_FINALIZE_TRIGGERS.APPLY_FAILED);
            throw applyError;
        }
        const lifecycleState = this.deps?.getLifecycleState?.() || {};
        this._startLifecycleSession({
            mapKey: wiredMatch?.session?.effectiveMapKey || lifecycleState.mapKey || null,
            numHumans: wiredMatch?.session?.numHumans || lifecycleState.numHumans || 0,
            numBots: wiredMatch?.session?.numBots || lifecycleState.numBots || 0,
            winsNeeded: wiredMatch?.session?.winsNeeded || lifecycleState.winsNeeded || 0,
        });
        return wiredMatch;
    }

    createMatchSession({ onPlayerFeedback, onPlayerDied, onRoundEnd } = {}) {
        if (!this.deps?.prepareInitializedMatchSession) {
            throw new Error('MatchLifecycleSessionOrchestrator requires runtime context');
        }
        const finalizeExistingSession = this._pendingFinalize
            ? Promise.resolve(this._pendingFinalize).catch(() => null)
            : (
                this._activeSessionId || this._hasCurrentSessionRefs()
                    ? Promise.resolve(this.finalizeMatchSession({
                        reason: SESSION_FINALIZE_TRIGGERS.NEW_MATCH_SESSION,
                        notifyMenuOpened: false,
                        awaitPendingInit: false,
                    })).catch(() => null)
                    : null
            );

        this._sessionSequence += 1;
        const provisionalId = `match-${this._sessionSequence}`;
        this._activeSessionId = provisionalId;
        this._setLifecycleStatus('starting');
        this._setFinalizeStatus('idle', {
            lastReason: null,
            lastTrigger: null,
        });
        const lifecycleHandlers = {
            onPlayerFeedback,
            onPlayerDied,
            onRoundEnd,
        };

        const runPendingInit = () => Promise.resolve(finalizeExistingSession)
            .then(() => this.deps.prepareInitializedMatchSession(lifecycleHandlers))
            .then((resolvedMatch) => this._applyInitializedMatch(resolvedMatch, provisionalId, lifecycleHandlers));

        const queuedInit = this._pendingSessionInit
            ? Promise.resolve(this._pendingSessionInit).catch(() => null).then(runPendingInit)
            : runPendingInit();

        const trackedInit = Promise.resolve(queuedInit)
            .catch((error) => {
                if (this._activeSessionId === provisionalId) {
                    this._activeSessionId = null;
                }
                this.deps?.clearMatchSessionRefs?.();
                this._setLifecycleStatus(this._sessionRuntimeState?.lifecycle?.disposed ? 'disposed' : 'menu');
                throw error;
            })
            .finally(() => {
                if (this._pendingSessionInit === trackedInit) {
                    this._pendingSessionInit = null;
                }
            });
        this._pendingSessionInit = trackedInit;
        return trackedInit;
    }

    bindHuntEventHandlers({ onHuntFeedEvent, onHuntDamageEvent } = {}) {
        const entityManager = this.deps?.getCurrentMatchSessionRefs?.()?.entityManager || null;
        if (!entityManager) return;
        entityManager.onHuntFeedEvent = typeof onHuntFeedEvent === 'function' ? onHuntFeedEvent : null;
        entityManager.onHuntDamageEvent = typeof onHuntDamageEvent === 'function' ? onHuntDamageEvent : null;
    }

    resetRoundRuntime() {
        this.deps?.resetRoundRuntime?.();
    }

    finalizeRound() {
        this.deps?.settleRecorder?.(this._buildRecorderFinalizeTrigger(SESSION_FINALIZE_TRIGGERS.ROUND_FINALIZE));
        this.deps?.resetRoundRuntime?.();
    }

    async finalizeMatchSession(options = undefined) {
        if (this._pendingFinalize) {
            return this._pendingFinalize;
        }
        const request = this._buildFinalizeRequest(options);
        this._setFinalizeStatus('finalizing', {
            lastReason: request.reason,
            lastTrigger: request.recorderTrigger?.type || request.reason,
        });
        this._setLifecycleStatus('finalizing');
        const trackedFinalize = Promise.resolve().then(async () => {
            this._endLifecycleSession(request.reason);
            this._activeSessionId = null;
            if (request.awaitPendingInit && this._pendingSessionInit) {
                await Promise.resolve(this._pendingSessionInit).catch(() => null);
            }

            let finalizeError = null;
            try {
                await Promise.resolve(this.deps?.settleRecorder?.(request.recorderTrigger));
            } catch (error) {
                finalizeError = error;
            }

            try {
                this.deps?.disposeCurrentMatchSession?.({
                    reason: request.reason,
                    clearScene: request.clearScene,
                });
            } catch (error) {
                if (!finalizeError) {
                    finalizeError = error;
                }
            }

            try {
                this.deps?.clearMatchSessionRefs?.();
            } catch (error) {
                if (!finalizeError) {
                    finalizeError = error;
                }
            }

            if (request.notifyMenuOpened) {
                try {
                    this.notifyMenuOpened({ reason: request.reason });
                } catch (error) {
                    if (!finalizeError) {
                        finalizeError = error;
                    }
                }
            }

            if (finalizeError) {
                throw finalizeError;
            }

            this._setFinalizeStatus('finalized', {
                lastCompletedReason: request.reason,
            });
            if (!request.notifyMenuOpened) {
                this._setLifecycleStatus(this._sessionRuntimeState?.lifecycle?.disposed ? 'disposed' : 'idle');
            }
            return request.reason;
        }).catch((error) => {
            this._setFinalizeStatus('error');
            throw error;
        }).finally(() => {
            if (this._pendingFinalize === trackedFinalize) {
                this._pendingFinalize = null;
            }
        });
        this._pendingFinalize = trackedFinalize;
        return trackedFinalize;
    }

    async teardownMatchSession(options = undefined) {
        return this.finalizeMatchSession(options);
    }
}
