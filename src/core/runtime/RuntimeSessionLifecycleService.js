// @ts-nocheck
// ============================================
// RuntimeSessionLifecycleService.js - session/network lifecycle orchestration
// ============================================

import { GAME_STATE_IDS } from '../../shared/contracts/GameStateIds.js';
import {
    RUNTIME_SESSION_TYPES,
    resolveRuntimeSessionContract,
} from '../../shared/contracts/RuntimeSessionContract.js';
import { LocalSessionAdapter } from '../session/LocalSessionAdapter.js';
import { createGameStateSnapshot } from '../GameStateSnapshot.js';
import {
    attachMultiplayerLifecycleKernel,
    detachMultiplayerLifecycleKernel,
} from './MultiplayerMatchLifecycleKernel.js';

/** @type {number} Host broadcasts state snapshots at this interval (ms). */
const STATE_BROADCAST_INTERVAL_MS = 100; // 10/s
const STATE_UPDATE_BUFFER_LIMIT = 24;
const ROUND_START_GATE_TIMEOUT_MS = 12_000;
const ARENA_LOADED_BASE_TIMEOUT_MS = 10_000;
const ARENA_LOADED_TIMEOUT_PER_REMOTE_PLAYER_MS = 5_000;

function resolveSessionContract(sessionSource = null) {
    if (typeof sessionSource === 'string') {
        return resolveRuntimeSessionContract({ sessionType: sessionSource });
    }
    return resolveRuntimeSessionContract(sessionSource);
}

export async function createRuntimeSessionAdapter(sessionSource, adapterOptions = {}) {
    const sessionContract = resolveSessionContract(sessionSource);
    if (sessionContract.adapterSessionType === RUNTIME_SESSION_TYPES.LAN) {
        const { LANSessionAdapter } = await import(/* webpackChunkName: "net" */ '../../network/LANSessionAdapter.js');
        return new LANSessionAdapter(adapterOptions);
    }
    if (sessionContract.adapterSessionType === RUNTIME_SESSION_TYPES.ONLINE) {
        const { OnlineSessionAdapter } = await import(/* webpackChunkName: "net" */ '../../network/OnlineSessionAdapter.js');
        return new OnlineSessionAdapter(adapterOptions);
    }
    if (sessionContract.usesMenuStorageBridge) {
        // Storage-Bridge coordination is a menu-only transport contract, not a real runtime network adapter.
        return new LocalSessionAdapter();
    }
    return new LocalSessionAdapter();
}

function resolveRuntimeSessionConnectionContext(facade, sessionContract) {
    if (sessionContract?.sessionType !== RUNTIME_SESSION_TYPES.MULTIPLAYER) {
        return {};
    }
    const bridgeContext = facade?.menuMultiplayerBridge?.getConnectionContext?.();
    return bridgeContext && typeof bridgeContext === 'object'
        ? { ...bridgeContext }
        : {};
}

export async function initRuntimeSession(facade) {
    const game = facade?.game;
    const sessionContract = resolveSessionContract(game?.runtimeConfig?.session);

    teardownRuntimeSession(facade);
    facade._runtimeSessionContract = sessionContract;
    const connectionContext = resolveRuntimeSessionConnectionContext(facade, sessionContract);
    facade.session = await createRuntimeSessionAdapter(sessionContract, connectionContext);

    const numHumans = game?.runtimeConfig?.session?.numHumans || 1;
    await facade.session.connect({
        numHumans,
        ...connectionContext,
    });

    if (facade.session.isHost && sessionContract.isNetworkSession) {
        startRuntimeStateBroadcast(facade);
        setupRuntimeHostFullStateSyncHandler(facade);
    }

    if (!facade.session.isHost && sessionContract.isNetworkSession) {
        setupRuntimeClientStateReceiver(facade);
        facade._lifecycleKernelHandlers = attachMultiplayerLifecycleKernel(facade, facade.session);
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

/**
 * Host-only.  Listens for the 'fullStateSyncNeeded' event that the session adapter
 * emits when a peer reconnects after a disconnect.  Responds by immediately sending
 * the current game state snapshot to the reconnected peer so it can catch up without
 * waiting for the next scheduled broadcast tick.
 *
 * The reconciliation decision (which transport, which peer) is entirely made by the
 * session adapter; this handler only reads the game state and delegates the actual
 * send back through the adapter's sendStateToPeer() port.
 */
export function setupRuntimeHostFullStateSyncHandler(facade) {
    if (!facade?.session?.isHost) return;
    facade._onFullStateSyncNeededHandler = (/** @type {any} */ { peerId } = {}) => {
        const normalizedPeerId = typeof peerId === 'string' ? peerId.trim() : '';
        if (!normalizedPeerId) return;
        const game = facade?.game;
        if (!game?.entityManager) return;
        try {
            const snapshot = createGameStateSnapshot(game.entityManager, game.roundStateController);
            facade.session?.sendStateToPeer?.(normalizedPeerId, snapshot);
        } catch {
            // Best-effort: the host's periodic broadcast will catch the client up on the
            // next interval even if this on-demand sync fails.
        }
    };
    facade.session.on('fullStateSyncNeeded', facade._onFullStateSyncNeededHandler);
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

    // ── Client path ────────────────────────────────────────────────────────────
    // Client sends PLAYER_ARENA_LOADED (transport-level, dedicated message type)
    // and waits for the host's ROUND_START_GATE broadcast.  The decision of
    // *when* to allow the round to start belongs to the transport layer (the
    // session adapter and its host-authority contract), not to domain logic.
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
                if (facade._onRoundStartGateHandler && facade.session) {
                    facade.session.off('roundStartGate', facade._onRoundStartGateHandler);
                    facade._onRoundStartGateHandler = null;
                }
                resolve();
            };

            facade._onRoundStartGateHandler = () => {
                // Host has confirmed all players are loaded; the round may begin.
                finish();
            };

            facade.session.on('roundStartGate', facade._onRoundStartGateHandler);
            // Notify the host that this client's arena is ready.
            facade.session.notifyArenaLoaded?.(localPlayerId);

            timeoutId = setTimeout(() => finish(), ROUND_START_GATE_TIMEOUT_MS);
        });
    }

    // ── Host path ──────────────────────────────────────────────────────────────
    // Host waits for all remote peers to send PLAYER_ARENA_LOADED (surfaced as
    // 'playerLoaded' events by the adapter).  Once all peers have confirmed,
    // the host broadcasts ROUND_START_GATE — a host-authoritative transport
    // signal that instructs every client to begin arena simulation.
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
                // Broadcast the host-authoritative ROUND_START_GATE signal to all clients.
                facade.session?.broadcastRoundStartGate?.({
                    expectedPeerIds: Array.from(expectedPeerIds.values()),
                    timestamp: Date.now(),
                });
            } catch {
                // Best-effort: even if broadcast fails, local host resolves and starts.
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

        const expectedRemotePeers = Math.max(0, expectedPeerIds.size - 1);
        const dynamicTimeoutMs = ARENA_LOADED_BASE_TIMEOUT_MS
            + expectedRemotePeers * ARENA_LOADED_TIMEOUT_PER_REMOTE_PLAYER_MS;
        timeoutId = setTimeout(() => finish(), dynamicTimeoutMs);
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
    if (facade?._onRoundStartGateHandler && facade.session) {
        facade.session.off('roundStartGate', facade._onRoundStartGateHandler);
        facade._onRoundStartGateHandler = null;
    }
    if (facade?._onFullStateSyncNeededHandler && facade.session) {
        facade.session.off('fullStateSyncNeeded', facade._onFullStateSyncNeededHandler);
        facade._onFullStateSyncNeededHandler = null;
    }
    if (facade?._lifecycleKernelHandlers && facade.session) {
        detachMultiplayerLifecycleKernel(facade.session, facade._lifecycleKernelHandlers);
    }
    if (facade) {
        facade._lifecycleKernelHandlers = null;
    }
    facade?._arenaLoadedPeers?.clear?.();
    if (Array.isArray(facade?._pendingStateUpdates)) {
        facade._pendingStateUpdates.length = 0;
    }
    if (facade?.session) {
        facade.session.dispose();
        facade.session = null;
    }
    if (facade) {
        facade._runtimeSessionContract = null;
    }
    facade?._stateReconciler?.reset?.();
    facade?._resetArcadeRunState?.();
}
