// ============================================
// RuntimeSessionLifecycleService.js - session/network lifecycle orchestration
// ============================================

import { GAME_STATE_IDS } from '../../shared/contracts/GameStateIds.js';
import { LocalSessionAdapter } from '../session/LocalSessionAdapter.js';
import { createGameStateSnapshot } from '../GameStateSnapshot.js';

/** @type {number} Host broadcasts state snapshots at this interval (ms). */
const STATE_BROADCAST_INTERVAL_MS = 100; // 10/s
const STATE_UPDATE_BUFFER_LIMIT = 24;
const ARENA_START_SIGNAL_TIMEOUT_MS = 12_000;
const ARENA_LOADED_SIGNAL_TYPE = 'arena_loaded';
const ARENA_START_SIGNAL_TYPE = 'arena_start';

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
    } else if (sessionType === 'multiplayer') {
        // 'multiplayer' is the Storage-Bridge coordination type: each participant runs a
        // LocalSessionAdapter independently. Real-time state sync is NOT performed — the
        // BroadcastChannel/localStorage bridge only handles lobby coordination and match-start
        // signalling. Use 'lan' or 'online' sessionType (via localSettings.multiplayerTransport)
        // to enable actual network state sync in a future transport upgrade.
        facade.session = new LocalSessionAdapter();
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
    if (!Array.isArray(facade._pendingStateUpdates)) {
        facade._pendingStateUpdates = [];
    }
    const loadStateReconciler = typeof facade._loadStateReconciler === 'function'
        ? facade._loadStateReconciler
        : async () => {
            const { StateReconciler } = await import('../../network/StateReconciler.js');
            return new StateReconciler();
        };

    const replayBufferedStateUpdates = () => {
        if (!facade._stateReconciler) return;
        if (!Array.isArray(facade._pendingStateUpdates) || facade._pendingStateUpdates.length <= 0) return;
        const buffered = facade._pendingStateUpdates.splice(0, facade._pendingStateUpdates.length);
        for (const stateUpdate of buffered) {
            facade._stateReconciler.receiveServerState(stateUpdate);
        }
        const game = facade?.game;
        if (game?.entityManager?.players) {
            facade._stateReconciler.reconcile(game.entityManager.players, game.entityManager);
        }
    };

    // Lazy-create reconciler
    if (!facade._stateReconciler) {
        loadStateReconciler().then((stateReconciler) => {
            facade._stateReconciler = stateReconciler || null;
            replayBufferedStateUpdates();
        }).catch(() => { /* reconciler unavailable - degrade gracefully */ });
    }

    facade._onStateUpdateHandler = (serverState) => {
        if (!facade._stateReconciler) {
            facade._pendingStateUpdates.push(serverState);
            if (facade._pendingStateUpdates.length > STATE_UPDATE_BUFFER_LIMIT) {
                facade._pendingStateUpdates.splice(0, facade._pendingStateUpdates.length - STATE_UPDATE_BUFFER_LIMIT);
            }
            return;
        }
        facade._stateReconciler.receiveServerState(serverState);
        const game = facade?.game;
        if (game?.entityManager?.players) {
            facade._stateReconciler.reconcile(game.entityManager.players, game.entityManager);
        }
    };
    facade.session.on('stateUpdate', facade._onStateUpdateHandler);
}

export async function waitForRuntimePlayersLoaded(facade) {
    if (!facade?.session || facade.session instanceof LocalSessionAdapter) return;

    const players = Array.isArray(facade.session.getPlayers?.()) ? facade.session.getPlayers() : [];
    if (players.length <= 1) return;

    const localPlayerId = String(facade.session.localPlayerId || '').trim();
    if (localPlayerId) {
        facade._arenaLoadedPeers.add(localPlayerId);
    }

    if (!facade.session.isHost) {
        return new Promise((resolve) => {
            let completed = false;
            let timeoutId = null;

            const finish = () => {
                if (completed) return;
                completed = true;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (facade._onArenaStartSignalHandler && facade.session) {
                    facade.session.off('remoteInput', facade._onArenaStartSignalHandler);
                    facade._onArenaStartSignalHandler = null;
                }
                resolve();
            };

            facade._onArenaStartSignalHandler = (payload) => {
                const inputType = String(payload?.input?.type || '').trim().toLowerCase();
                if (inputType !== ARENA_START_SIGNAL_TYPE) return;
                finish();
            };

            facade.session.on('remoteInput', facade._onArenaStartSignalHandler);
            facade.session.sendInput({ type: ARENA_LOADED_SIGNAL_TYPE, playerId: localPlayerId });

            timeoutId = setTimeout(() => finish(), ARENA_START_SIGNAL_TIMEOUT_MS);
        });
    }

    const expectedPeerIds = new Set(
        players
            .map((player) => String(player?.peerId || player?.id || '').trim())
            .filter(Boolean)
    );
    if (localPlayerId) {
        expectedPeerIds.add(localPlayerId);
    }

    return new Promise((resolve) => {
        let completed = false;
        let timeoutId = null;

        const finish = () => {
            if (completed) return;
            completed = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            try {
                facade.session?.sendInput?.({
                    type: ARENA_START_SIGNAL_TYPE,
                    playerId: localPlayerId || 'host',
                    expectedPeerIds: Array.from(expectedPeerIds.values()),
                    timestamp: Date.now(),
                });
            } catch {
                // Ignore best-effort host start signaling failures.
            }
            if (facade._onPlayerLoadedHandler && facade.session) {
                facade.session.off('playerLoaded', facade._onPlayerLoadedHandler);
                facade._onPlayerLoadedHandler = null;
            }
            resolve();
        };

        const hasAllPlayersLoaded = () => {
            for (const peerId of expectedPeerIds.values()) {
                if (!facade._arenaLoadedPeers.has(peerId)) return false;
            }
            return true;
        };

        facade._onPlayerLoadedHandler = (data) => {
            const playerId = String(data?.playerId || '').trim();
            if (playerId) {
                facade._arenaLoadedPeers.add(playerId);
            }
            if (hasAllPlayersLoaded()) {
                finish();
            }
        };
        facade.session.on('playerLoaded', facade._onPlayerLoadedHandler);

        if (hasAllPlayersLoaded()) {
            finish();
            return;
        }

        // Safety timeout: don't block forever
        timeoutId = setTimeout(() => finish(), 10000);
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
    if (facade?._onArenaStartSignalHandler && facade.session) {
        facade.session.off('remoteInput', facade._onArenaStartSignalHandler);
        facade._onArenaStartSignalHandler = null;
    }
    facade?._arenaLoadedPeers?.clear?.();
    if (Array.isArray(facade?._pendingStateUpdates)) {
        facade._pendingStateUpdates.length = 0;
    }
    if (facade?.session) {
        facade.session.dispose();
        facade.session = null;
    }
    facade?._stateReconciler?.reset?.();
    facade?._resetArcadeRunState?.();
}
