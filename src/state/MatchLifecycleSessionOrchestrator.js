import { initializeMatchSession, disposeMatchSessionSystems } from './MatchSessionFactory.js';
import {
    MATCH_LIFECYCLE_CONTRACT_VERSION,
    MATCH_LIFECYCLE_EVENT_TYPES,
} from '../shared/contracts/MatchLifecycleContract.js';

function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
}

export class MatchLifecycleSessionOrchestrator {
    constructor(runtimeOrDeps = null) {
        const runtime = runtimeOrDeps?.runtime || runtimeOrDeps;
        this.runtime = runtime || null;
        this._lifecycleContractVersion = MATCH_LIFECYCLE_CONTRACT_VERSION;
        this._sessionSequence = 0;
        this._activeSessionId = null;
    }

    _buildLifecycleContext(extra = null) {
        const game = this.runtime;
        const context = {
            contractVersion: this._lifecycleContractVersion,
            sessionId: this._activeSessionId,
            mapKey: game?.mapKey || null,
            numHumans: Number(game?.numHumans) || 0,
            numBots: Number(game?.numBots) || 0,
            winsNeeded: Number(game?.winsNeeded) || 0,
            activeGameMode: game?.activeGameMode || null,
        };
        if (extra && typeof extra === 'object') {
            Object.assign(context, extra);
        }
        return context;
    }

    _emitLifecycleEvent(type, extra = null) {
        const game = this.runtime;
        if (!game?.mediaRecorderSystem?.notifyLifecycleEvent) return;
        game.mediaRecorderSystem.notifyLifecycleEvent(type, this._buildLifecycleContext(extra));
    }

    _startLifecycleSession(extra = null) {
        // Session ID is now assigned in createMatchSession() before async work.
        // If called without a prior provisional ID (legacy path), assign one now.
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

    _applyInitializedMatch(initializedMatch, expectedSessionId) {
        // Session-ID guard: reject stale async results from a superseded createMatchSession() call
        if (expectedSessionId && this._activeSessionId !== expectedSessionId) {
            return initializedMatch;
        }
        const game = this.runtime;
        game.matchSessionRuntimeBridge.applyInitializedMatchSession(initializedMatch);
        this._startLifecycleSession({
            mapKey: initializedMatch?.session?.effectiveMapKey || game.mapKey || null,
            numHumans: initializedMatch?.session?.numHumans || game.numHumans || 0,
            numBots: initializedMatch?.session?.numBots || game.numBots || 0,
            winsNeeded: initializedMatch?.session?.winsNeeded || game.winsNeeded || 0,
        });
        return initializedMatch;
    }

    createMatchSession({ onPlayerFeedback, onPlayerDied, onRoundEnd } = {}) {
        const game = this.runtime;
        if (!game) {
            throw new Error('MatchLifecycleSessionOrchestrator requires runtime context');
        }
        if (this._activeSessionId) {
            this._endLifecycleSession('new_match_session');
        }

        // Stamp a provisional session ID before any async work so that
        // a concurrent createMatchSession() call will invalidate this one.
        this._sessionSequence += 1;
        const provisionalId = `match-${this._sessionSequence}`;
        this._activeSessionId = provisionalId;

        const initializedMatch = initializeMatchSession({
            renderer: game.renderer,
            audio: game.audio,
            recorder: game.recorder,
            runtimeProfiler: game.runtimePerfProfiler,
            settings: game.settings,
            runtimeConfig: game.runtimeConfig,
            requestedMapKey: game.mapKey,
            currentSession: game.matchSessionRuntimeBridge.getCurrentMatchSessionRefs(),
            onPlayerFeedback,
            onPlayerDied,
            onRoundEnd,
        });
        if (isPromiseLike(initializedMatch)) {
            return Promise.resolve(initializedMatch).then((resolvedMatch) => this._applyInitializedMatch(resolvedMatch, provisionalId));
        }
        return this._applyInitializedMatch(initializedMatch, provisionalId);
    }

    bindHuntEventHandlers({ onHuntFeedEvent, onHuntDamageEvent } = {}) {
        const game = this.runtime;
        if (!game?.entityManager) return;
        game.entityManager.onHuntFeedEvent = typeof onHuntFeedEvent === 'function' ? onHuntFeedEvent : null;
        game.entityManager.onHuntDamageEvent = typeof onHuntDamageEvent === 'function' ? onHuntDamageEvent : null;
    }

    resetRoundRuntime() {
        const game = this.runtime;
        if (!game?.entityManager || !game?.powerupManager) return;

        for (const player of game.entityManager.players) {
            player.trail.clear();
        }
        game.powerupManager.clear();

        game.recorder.startRound(game.entityManager.players);
        game.entityManager.spawnAll();
        game.runtimeFacade?.arcadeRunRuntime?.applyPendingIntermissionEffects?.({
            players: game.entityManager.players,
        });
        for (const player of game.entityManager.getHumanPlayers()) {
            player.planarAimOffset = 0;
        }
    }

    teardownMatchSession(options = undefined) {
        const game = this.runtime;
        if (!game) return;
        const reason = typeof options === 'string'
            ? options
            : (options?.reason || 'return_to_menu');
        this._endLifecycleSession(reason);
        disposeMatchSessionSystems(game.renderer, game.matchSessionRuntimeBridge.getCurrentMatchSessionRefs());
        game.matchSessionRuntimeBridge.clearMatchSessionRefs();
        this.notifyMenuOpened();
    }
}
