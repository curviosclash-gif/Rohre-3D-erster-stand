import { initializeMatchSession, disposeMatchSessionSystems } from './MatchSessionFactory.js';

export class MatchLifecycleSessionOrchestrator {
    constructor(game) {
        this.game = game || null;
    }

    createMatchSession({ onPlayerFeedback, onPlayerDied, onRoundEnd } = {}) {
        const game = this.game;
        if (!game) {
            throw new Error('MatchLifecycleSessionOrchestrator requires game runtime');
        }

        const initializedMatch = initializeMatchSession({
            renderer: game.renderer,
            audio: game.audio,
            recorder: game.recorder,
            settings: game.settings,
            runtimeConfig: game.runtimeConfig,
            requestedMapKey: game.mapKey,
            currentSession: game.matchSessionRuntimeBridge.getCurrentMatchSessionRefs(),
            onPlayerFeedback,
            onPlayerDied,
            onRoundEnd,
        });
        game.matchSessionRuntimeBridge.applyInitializedMatchSession(initializedMatch);
        return initializedMatch;
    }

    bindHuntEventHandlers({ onHuntFeedEvent, onHuntDamageEvent } = {}) {
        const game = this.game;
        if (!game?.entityManager) return;
        game.entityManager.onHuntFeedEvent = typeof onHuntFeedEvent === 'function' ? onHuntFeedEvent : null;
        game.entityManager.onHuntDamageEvent = typeof onHuntDamageEvent === 'function' ? onHuntDamageEvent : null;
    }

    resetRoundRuntime() {
        const game = this.game;
        if (!game?.entityManager || !game?.powerupManager) return;

        for (const player of game.entityManager.players) {
            player.trail.clear();
        }
        game.powerupManager.clear();

        game.recorder.startRound(game.entityManager.players);
        game.entityManager.spawnAll();
        for (const player of game.entityManager.getHumanPlayers()) {
            player.planarAimOffset = 0;
        }
    }

    teardownMatchSession() {
        const game = this.game;
        if (!game) return;
        disposeMatchSessionSystems(game.renderer, game.matchSessionRuntimeBridge.getCurrentMatchSessionRefs());
        game.matchSessionRuntimeBridge.clearMatchSessionRefs();
    }
}

