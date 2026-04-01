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

export function createMatchSessionPort(runtime) {
    const getCurrentMatchSessionRefs = () => runtime?.matchSessionRuntimeBridge?.getCurrentMatchSessionRefs?.() || null;
    const getRecorder = () => runtime?.mediaRecorderSystem || runtime?.recorder || null;
    return {
        getLifecycleState: () => ({
            mapKey: runtime?.mapKey || null,
            numHumans: Number(runtime?.numHumans) || 0,
            numBots: Number(runtime?.numBots) || 0,
            winsNeeded: Number(runtime?.winsNeeded) || 0,
            activeGameMode: runtime?.activeGameMode || null,
        }),
        notifyLifecycleEvent: (type, context) => getRecorder()?.notifyLifecycleEvent?.(type, context),
        prepareInitializedMatchSession: (handlers = {}) => prepareInitializedMatchSession({
            renderer: runtime?.renderer,
            audio: runtime?.audio,
            recorder: runtime?.recorder,
            runtimeProfiler: runtime?.runtimePerfProfiler,
            settings: runtime?.settings,
            runtimeConfig: runtime?.runtimeConfig,
            baseConfig: runtime?.config || null,
            requestedMapKey: runtime?.mapKey,
            currentSession: getCurrentMatchSessionRefs(),
            ...handlers,
        }),
        wireInitializedMatchRuntime: (initializedMatch, handlers = {}) => wireInitializedMatchRuntime({
            renderer: runtime?.renderer,
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
        this._sessionSequence = 0;
        this._activeSessionId = null;
        this._pendingSessionInit = null;
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
        this._emitLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.MATCH_STARTED, extra);
    }

    _endLifecycleSession(reason = 'match_teardown') {
        if (!this._activeSessionId) return;
        this._emitLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.MATCH_ENDED, { reason });
        this._activeSessionId = null;
    }

    notifyMenuOpened(extra = null) {
        this._emitLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.MENU_OPENED, extra);
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
        if (this._activeSessionId) {
            this._endLifecycleSession(SESSION_FINALIZE_TRIGGERS.NEW_MATCH_SESSION);
            this.deps?.disposeCurrentMatchSession?.({ reason: SESSION_FINALIZE_TRIGGERS.NEW_MATCH_SESSION });
            this.deps?.clearMatchSessionRefs?.();
        }

        this._sessionSequence += 1;
        const provisionalId = `match-${this._sessionSequence}`;
        this._activeSessionId = provisionalId;
        const lifecycleHandlers = {
            onPlayerFeedback,
            onPlayerDied,
            onRoundEnd,
        };

        const runPendingInit = () => Promise.resolve(
            this.deps.prepareInitializedMatchSession(lifecycleHandlers)
        ).then((resolvedMatch) => this._applyInitializedMatch(resolvedMatch, provisionalId, lifecycleHandlers));

        const queuedInit = this._pendingSessionInit
            ? Promise.resolve(this._pendingSessionInit).catch(() => null).then(runPendingInit)
            : runPendingInit();

        const trackedInit = Promise.resolve(queuedInit)
            .catch((error) => {
                if (this._activeSessionId === provisionalId) {
                    this._activeSessionId = null;
                }
                this.deps?.clearMatchSessionRefs?.();
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
        this.deps?.settleRecorder?.({ type: SESSION_FINALIZE_TRIGGERS.ROUND_FINALIZE });
        this.deps?.resetRoundRuntime?.();
    }

    async teardownMatchSession(options = undefined) {
        const reason = typeof options === 'string'
            ? options
            : (options?.reason || 'return_to_menu');
        this._endLifecycleSession(reason);
        this._activeSessionId = null;
        if (this._pendingSessionInit) {
            await Promise.resolve(this._pendingSessionInit).catch(() => null);
        }
        await Promise.resolve(this.deps?.settleRecorder?.({
            type: 'session_teardown',
            context: { reason },
        }));
        this.deps?.disposeCurrentMatchSession?.();
        this.deps?.clearMatchSessionRefs?.();
        this.notifyMenuOpened();
    }
}
