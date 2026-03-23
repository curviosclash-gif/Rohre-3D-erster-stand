import { SessionAdapter } from '../core/session/SessionAdapter.js';
import {
    MULTIPLAYER_MESSAGE_TYPES,
    buildMultiplayerSessionMessage,
} from '../shared/contracts/MultiplayerSessionContract.js';
import { createRuntimeClock } from '../shared/contracts/RuntimeClockContract.js';

function normalizePeerId(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized;
}

function toTimestamp(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

export class SessionAdapterBase extends SessionAdapter {
    constructor(options = {}) {
        super();
        this.isHost = !!options.isHost;
        this._clock = createRuntimeClock({
            nowMs: options.now,
            runtime: options.clockRuntime,
        });
        this._now = this._clock.nowMs;
        this._reconnectWindowMs = Number.isFinite(Number(options.reconnectWindowMs))
            ? Math.max(0, Math.floor(Number(options.reconnectWindowMs)))
            : 30_000;
        this._disconnectedPeers = new Map();
    }

    _createStateMessage(type, payload = null) {
        return buildMultiplayerSessionMessage(type, payload);
    }

    _sendStateToAll(_message, _excludePeerId = null) {
        throw new Error('SessionAdapterBase._sendStateToAll() not implemented');
    }

    _sendStateToPeer(_peerId, _message) {
        throw new Error('SessionAdapterBase._sendStateToPeer() not implemented');
    }

    _closePeerConnection(_peerId) {
        throw new Error('SessionAdapterBase._closePeerConnection() not implemented');
    }

    _removePeerLatency(_peerId) {
        throw new Error('SessionAdapterBase._removePeerLatency() not implemented');
    }

    _handleClientPeerDisconnect(_peerId, _reason) {
        return false;
    }

    _registerPeerDisconnect(peerId, reason) {
        const normalizedPeerId = normalizePeerId(peerId);
        if (!normalizedPeerId) return;
        if (this._disconnectedPeers.has(normalizedPeerId)) return;

        if (this.isHost) {
            const timer = setTimeout(() => {
                this._finalizePeerRemoval(normalizedPeerId);
            }, this._reconnectWindowMs);

            const disconnectedAt = toTimestamp(this._now(), 0);
            this._disconnectedPeers.set(normalizedPeerId, {
                reason: String(reason || 'unknown'),
                disconnectedAt,
                timer,
            });

            this._sendStateToAll(
                this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.PLAYER_DISCONNECTED, {
                    peerId: normalizedPeerId,
                    reason: String(reason || 'unknown'),
                    reconnectWindowMs: this._reconnectWindowMs,
                }),
                normalizedPeerId
            );
            this._emit('playerDisconnected', {
                peerId: normalizedPeerId,
                reason: String(reason || 'unknown'),
                canReconnect: true,
            });
            return;
        }

        const handled = this._handleClientPeerDisconnect(normalizedPeerId, reason);
        if (!handled) {
            this._emit('playerDisconnected', {
                peerId: normalizedPeerId,
                reason: String(reason || 'unknown'),
            });
        }
    }

    _finalizePeerRemoval(peerId) {
        const normalizedPeerId = normalizePeerId(peerId);
        if (!normalizedPeerId) return;
        const entry = this._disconnectedPeers.get(normalizedPeerId);
        if (entry?.timer) {
            clearTimeout(entry.timer);
        }
        this._disconnectedPeers.delete(normalizedPeerId);
        this._closePeerConnection(normalizedPeerId);
        this._removePeerLatency(normalizedPeerId);
        this._sendStateToAll(this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.PLAYER_REMOVED, {
            peerId: normalizedPeerId,
        }));
        this._emit('playerRemoved', { peerId: normalizedPeerId });
    }

    _resolvePeerReconnect(peerId) {
        const normalizedPeerId = normalizePeerId(peerId);
        if (!normalizedPeerId) return;
        const entry = this._disconnectedPeers.get(normalizedPeerId);
        if (entry?.timer) {
            clearTimeout(entry.timer);
        }
        this._disconnectedPeers.delete(normalizedPeerId);
        this._sendStateToAll(this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.PLAYER_RECONNECTED, {
            peerId: normalizedPeerId,
        }));
        this._emit('playerReconnected', { peerId: normalizedPeerId });
        this._emit('fullStateSyncNeeded', { peerId: normalizedPeerId });
    }

    _sendFullStateSync(peerId, stateSnapshot) {
        const normalizedPeerId = normalizePeerId(peerId);
        if (!normalizedPeerId) return;
        this._sendStateToPeer(normalizedPeerId, this._createStateMessage(
            MULTIPLAYER_MESSAGE_TYPES.FULL_STATE_SYNC,
            stateSnapshot
        ));
    }

    getReconnectInfo(peerId) {
        const normalizedPeerId = normalizePeerId(peerId);
        if (!normalizedPeerId) return null;
        const info = this._disconnectedPeers.get(normalizedPeerId);
        if (!info) return null;
        const now = toTimestamp(this._now(), 0);
        const elapsed = now - info.disconnectedAt;
        return {
            remainingMs: Math.max(0, this._reconnectWindowMs - elapsed),
            reason: info.reason,
        };
    }

    getDisconnectedPeers() {
        const now = toTimestamp(this._now(), 0);
        const result = [];
        for (const [peerId, info] of this._disconnectedPeers.entries()) {
            const elapsed = now - info.disconnectedAt;
            result.push({
                peerId,
                remainingMs: Math.max(0, this._reconnectWindowMs - elapsed),
                reason: info.reason,
            });
        }
        return result;
    }

    _clearReconnectPeers() {
        for (const entry of this._disconnectedPeers.values()) {
            if (entry?.timer) {
                clearTimeout(entry.timer);
            }
        }
        this._disconnectedPeers.clear();
    }
}
