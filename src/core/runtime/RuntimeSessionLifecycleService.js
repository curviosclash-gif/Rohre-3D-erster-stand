// ============================================
// RuntimeSessionLifecycleService.js - session/network lifecycle orchestration
// ============================================

import { GAME_STATE_IDS } from '../../shared/contracts/GameStateIds.js';
import { LocalSessionAdapter } from '../session/LocalSessionAdapter.js';
import { createGameStateSnapshot } from '../GameStateSnapshot.js';

/** @type {number} Host broadcasts state snapshots at this interval (ms). */
const STATE_BROADCAST_INTERVAL_MS = 100; // 10/s

export async function initRuntimeSession(facade) {
    const game = facade?.game;
    const sessionType = String(game?.runtimeConfig?.session?.sessionType || 'single').toLowerCase();

    teardownRuntimeSession(facade);

    if (sessionType === 'lan') {
        // Lazy-import to avoid bundling network code in single-player builds
        const { LANSessionAdapter } = await import(/* webpackChunkName: "net" */ '../../network/LANSessionAdapter.js');
        facade.session = new LANSessionAdapter();
    } else if (sessionType === 'online') {
        const { OnlineSessionAdapter } = await import(/* webpackChunkName: "net" */ '../../network/OnlineSessionAdapter.js');
        facade.session = new OnlineSessionAdapter();
    } else {
        facade.session = new LocalSessionAdapter();
    }

    const numHumans = game?.runtimeConfig?.session?.numHumans || 1;
    await facade.session.connect({ numHumans });

    if (facade.session.isHost && (sessionType === 'lan' || sessionType === 'online')) {
        startRuntimeStateBroadcast(facade);
    }

    if (!facade.session.isHost && (sessionType === 'lan' || sessionType === 'online')) {
        setupRuntimeClientStateReceiver(facade);
    }
}

export function startRuntimeStateBroadcast(facade) {
    stopRuntimeStateBroadcast(facade);
    facade._stateBroadcastTimer = setInterval(() => {
        const game = facade?.game;
        if (!game?.entityManager || game.state !== GAME_STATE_IDS.PLAYING) return;
        const snapshot = createGameStateSnapshot(game.entityManager, game.roundStateController);
        facade.session?.broadcastState?.(snapshot);
    }, STATE_BROADCAST_INTERVAL_MS);
}

export function stopRuntimeStateBroadcast(facade) {
    if (facade?._stateBroadcastTimer) {
        clearInterval(facade._stateBroadcastTimer);
        facade._stateBroadcastTimer = null;
    }
}

export function setupRuntimeClientStateReceiver(facade) {
    if (!facade?.session) return;
    // Lazy-create reconciler
    if (!facade._stateReconciler) {
        // StateReconciler is already bundled as part of the network chunk
        import('../../network/StateReconciler.js').then(({ StateReconciler }) => {
            facade._stateReconciler = new StateReconciler();
        }).catch(() => { /* reconciler unavailable - degrade gracefully */ });
    }

    facade._onStateUpdateHandler = (serverState) => {
        if (facade._stateReconciler) {
            facade._stateReconciler.receiveServerState(serverState);
            const game = facade?.game;
            if (game?.entityManager?.players) {
                facade._stateReconciler.reconcile(game.entityManager.players, game.entityManager);
            }
        }
    };
    facade.session.on('stateUpdate', facade._onStateUpdateHandler);
}

export async function waitForRuntimePlayersLoaded(facade) {
    if (!facade?.session || facade.session instanceof LocalSessionAdapter) return;

    const players = facade.session.getPlayers();
    if (!players || players.length <= 1) return;

    return new Promise((resolve) => {
        // Mark self as loaded
        facade._arenaLoadedPeers.add(facade.session.localPlayerId);
        facade.session.sendInput({ type: 'arena_loaded', playerId: facade.session.localPlayerId });

        facade._onPlayerLoadedHandler = (data) => {
            if (data?.playerId) facade._arenaLoadedPeers.add(data.playerId);
            if (facade._arenaLoadedPeers.size >= players.length) {
                resolve();
            }
        };
        facade.session.on('playerLoaded', facade._onPlayerLoadedHandler);

        // Safety timeout: don't block forever
        setTimeout(() => resolve(), 10000);
    });
}

export function teardownRuntimeSession(facade) {
    stopRuntimeStateBroadcast(facade);
    if (facade?._onStateUpdateHandler && facade.session) {
        facade.session.off('stateUpdate', facade._onStateUpdateHandler);
        facade._onStateUpdateHandler = null;
    }
    if (facade?._onPlayerLoadedHandler && facade.session) {
        facade.session.off('playerLoaded', facade._onPlayerLoadedHandler);
        facade._onPlayerLoadedHandler = null;
    }
    facade?._arenaLoadedPeers?.clear?.();
    if (facade?.session) {
        facade.session.dispose();
        facade.session = null;
    }
    facade?._stateReconciler?.reset?.();
    facade?._resetArcadeRunState?.();
}
