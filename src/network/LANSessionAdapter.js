// ============================================
// LANSessionAdapter.js - LAN session via embedded signaling
// ============================================

import { SessionAdapter } from '../core/session/SessionAdapter.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';

/** Reconnect window in ms (C.1) */
const RECONNECT_WINDOW_MS = 30_000;

/**
 * SessionAdapter for LAN play.
 * Host runs an embedded HTTP signaling server (in Electron/Tauri main process).
 * Clients connect via fetch() to the host's IP:port.
 * After signaling, communication is P2P via WebRTC data channels.
 */
export class LANSessionAdapter extends SessionAdapter {
    constructor(options = {}) {
        super();
        this.isHost = !!options.isHost;
        this._signalingUrl = options.signalingUrl || null;
        this._dataChannelManager = new DataChannelManager();
        this._peerManager = new PeerConnectionManager({
            isHost: this.isHost,
            dataChannelManager: this._dataChannelManager,
        });
        this._latencyMonitor = new LatencyMonitor({
            onPingNeeded: (peerId, pingId) => {
                this._dataChannelManager.send(peerId, 'state', { type: 'ping', pingId });
            },
        });
        this._players = [];
        this._pollingInterval = null;

        /** Disconnected peers awaiting reconnect (C.1) */
        this._disconnectedPeers = new Map();

        this._dataChannelManager.on('message', ({ peerId, channel, data }) => {
            this._handleMessage(peerId, channel, data);
        });

        // Channel close detection (C.1)
        this._dataChannelManager.on('channelClose', ({ peerId }) => {
            this._handlePeerDisconnect(peerId, 'channel-close');
        });

        this._peerManager.on('peerDisconnected', ({ peerId, state }) => {
            this._handlePeerDisconnect(peerId, state);
        });

        // Heartbeat timeout detection (C.1)
        this._peerManager.on('heartbeatTimeout', ({ peerId }) => {
            this._handlePeerDisconnect(peerId, 'heartbeat-timeout');
        });

        // Graceful leave: beforeunload (C.1)
        this._beforeUnloadHandler = () => {
            this._sendLeaveMessage();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
        }
    }

    async connect(options = {}) {
        this._signalingUrl = options.signalingUrl || this._signalingUrl;

        if (this.isHost) {
            this.localPlayerId = 'host';
            this.isConnected = true;
            this._emit('connected', { playerId: this.localPlayerId });
            this._latencyMonitor.start();
            this._startPolling();
        } else {
            await this._joinAsClient(options.lobbyCode);
        }
    }

    async _joinAsClient(lobbyCode) {
        const joinRes = await fetch(`${this._signalingUrl}/lobby/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lobbyCode }),
        });
        const joinData = await joinRes.json();
        this.localPlayerId = joinData.playerId;

        // Get SDP offer from host
        const offerRes = await fetch(`${this._signalingUrl}/signaling/offer?playerId=${this.localPlayerId}`);
        const offerData = await offerRes.json();

        const answer = await this._peerManager.handleOffer('host', offerData.offer);

        await fetch(`${this._signalingUrl}/signaling/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: this.localPlayerId, answer }),
        });

        this.isConnected = true;
        this._emit('connected', { playerId: this.localPlayerId });
    }

    _startPolling() {
        if (!this.isHost || !this._signalingUrl) return;
        this._pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${this._signalingUrl}/lobby/status`);
                const data = await res.json();
                if (data.pendingPlayers) {
                    for (const pending of data.pendingPlayers) {
                        await this._connectToPendingClient(pending);
                    }
                }
            } catch {
                // signaling server might not be ready yet
            }
        }, 1000);
    }

    async _connectToPendingClient(pending) {
        const offer = await this._peerManager.createOffer(pending.playerId);

        await fetch(`${this._signalingUrl}/signaling/offer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPlayerId: pending.playerId, offer }),
        });

        // Poll for answer
        const pollAnswer = async () => {
            for (let i = 0; i < 30; i++) {
                const res = await fetch(`${this._signalingUrl}/signaling/answer?playerId=${pending.playerId}`);
                const data = await res.json();
                if (data.answer) {
                    await this._peerManager.handleAnswer(pending.playerId, data.answer);
                    this._latencyMonitor.addPeer(pending.playerId);

                    // Check if this is a reconnect (C.1)
                    if (this._disconnectedPeers.has(pending.playerId)) {
                        this._handleReconnect(pending.playerId);
                    } else {
                        this._emit('playerConnected', { peerId: pending.playerId });
                    }
                    return;
                }
                await new Promise((r) => setTimeout(r, 200));
            }
        };
        await pollAnswer();
    }

    /** Handle peer disconnect with reconnect window (C.1) */
    _handlePeerDisconnect(peerId, reason) {
        // Avoid duplicate handling
        if (this._disconnectedPeers.has(peerId)) return;

        if (this.isHost) {
            // Start reconnect window
            const timer = setTimeout(() => {
                this._finalizePeerRemoval(peerId);
            }, RECONNECT_WINDOW_MS);

            this._disconnectedPeers.set(peerId, {
                reason,
                disconnectedAt: Date.now(),
                timer,
            });

            // Inform other clients about the disconnect
            this._dataChannelManager.sendToAll('state', {
                type: 'player_disconnected',
                peerId,
                reason,
                reconnectWindowMs: RECONNECT_WINDOW_MS,
            }, peerId);

            this._emit('playerDisconnected', { peerId, reason, canReconnect: true });
        } else if (peerId === 'host') {
            // Host disconnected — show dialog, end match (C.1)
            this._emit('hostDisconnected', { reason });
            this._emit('playerDisconnected', { peerId, reason, isHost: true });
        } else {
            this._emit('playerDisconnected', { peerId, reason });
        }
    }

    /** Finalize removal after reconnect window expires (C.1) */
    _finalizePeerRemoval(peerId) {
        this._disconnectedPeers.delete(peerId);
        this._peerManager.closePeer(peerId);
        this._latencyMonitor.removePeer(peerId);

        this._dataChannelManager.sendToAll('state', {
            type: 'player_removed',
            peerId,
        });

        this._emit('playerRemoved', { peerId });
    }

    /** Handle successful reconnect with full state sync (C.1) */
    _handleReconnect(peerId) {
        const info = this._disconnectedPeers.get(peerId);
        if (info?.timer) clearTimeout(info.timer);
        this._disconnectedPeers.delete(peerId);

        // Notify about reconnect
        this._dataChannelManager.sendToAll('state', {
            type: 'player_reconnected',
            peerId,
        });

        this._emit('playerReconnected', { peerId });

        // Request full state sync for reconnected client
        this._emit('fullStateSyncNeeded', { peerId });
    }

    /** Send graceful leave message (C.1) */
    _sendLeaveMessage() {
        if (!this.isConnected) return;
        if (this.isHost) {
            this._dataChannelManager.sendToAll('state', {
                type: 'host_leaving',
            });
        } else {
            this._dataChannelManager.send('host', 'state', {
                type: 'leave',
                playerId: this.localPlayerId,
            });
        }
    }

    sendInput(inputData) {
        if (this.isHost) return;
        this._dataChannelManager.send('host', 'inputs', {
            type: 'input',
            playerId: this.localPlayerId,
            inputs: inputData,
            timestamp: Date.now(),
        });
    }

    broadcastState(stateSnapshot) {
        if (!this.isHost) return;
        this._dataChannelManager.sendToAll('state', {
            type: 'state_snapshot',
            ...stateSnapshot,
        });
    }

    /** Send full state to a specific peer (for reconnect) (C.1) */
    sendStateToPeer(peerId, stateSnapshot) {
        this._dataChannelManager.send(peerId, 'state', {
            type: 'full_state_sync',
            ...stateSnapshot,
        });
    }

    _handleMessage(peerId, channel, data) {
        if (data.type === 'input') {
            this._emit('remoteInput', { peerId, input: data.inputs, playerId: data.playerId });
        } else if (data.type === 'state_snapshot') {
            this._emit('stateUpdate', { state: data });
        } else if (data.type === 'full_state_sync') {
            this._emit('fullStateSync', { state: data });
        } else if (data.type === 'ping') {
            this._dataChannelManager.send(peerId, channel === 'inputs' ? 'inputs' : 'state', {
                type: 'pong', pingId: data.pingId,
            });
        } else if (data.type === 'pong') {
            this._latencyMonitor.recordPongReceived(peerId, data.pingId);
        } else if (data.type === 'heartbeat') {
            // Reply to heartbeat (C.1)
            this._dataChannelManager.send(peerId, 'state', { type: 'heartbeat_ack' });
        } else if (data.type === 'heartbeat_ack') {
            this._peerManager.recordHeartbeatAck(peerId);
        } else if (data.type === 'leave') {
            // Graceful leave from client (C.1)
            this._peerManager.closePeer(data.playerId || peerId);
            this._latencyMonitor.removePeer(data.playerId || peerId);
            this._emit('playerDisconnected', { peerId: data.playerId || peerId, reason: 'graceful-leave' });
        } else if (data.type === 'host_leaving') {
            // Host sent graceful leave (C.1)
            this._emit('hostDisconnected', { reason: 'graceful-leave' });
            this._emit('playerDisconnected', { peerId, reason: 'host-leaving', isHost: true });
        } else if (data.type === 'player_disconnected') {
            this._emit('playerDisconnected', {
                peerId: data.peerId,
                reason: data.reason,
                canReconnect: true,
                reconnectWindowMs: data.reconnectWindowMs,
            });
        } else if (data.type === 'player_reconnected') {
            this._emit('playerReconnected', { peerId: data.peerId });
        } else if (data.type === 'player_removed') {
            this._emit('playerRemoved', { peerId: data.peerId });
        }
    }

    getPlayers() {
        return this._players;
    }

    /** Get reconnect status for a disconnected peer (C.2) */
    getReconnectInfo(peerId) {
        const info = this._disconnectedPeers.get(peerId);
        if (!info) return null;
        const elapsed = Date.now() - info.disconnectedAt;
        return {
            remainingMs: Math.max(0, RECONNECT_WINDOW_MS - elapsed),
            reason: info.reason,
        };
    }

    /** Get all disconnected peers awaiting reconnect (C.2) */
    getDisconnectedPeers() {
        const result = [];
        for (const [peerId, info] of this._disconnectedPeers) {
            const elapsed = Date.now() - info.disconnectedAt;
            result.push({
                peerId,
                remainingMs: Math.max(0, RECONNECT_WINDOW_MS - elapsed),
                reason: info.reason,
            });
        }
        return result;
    }

    disconnect() {
        this._sendLeaveMessage();

        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }

        // Clear reconnect timers
        for (const [, info] of this._disconnectedPeers) {
            if (info.timer) clearTimeout(info.timer);
        }
        this._disconnectedPeers.clear();

        this._latencyMonitor.stop();
        this._peerManager.dispose();
        this._dataChannelManager.dispose();
        this.isConnected = false;

        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
        }

        this._emit('disconnected', { reason: 'manual' });
    }

    dispose() {
        this.disconnect();
        super.dispose();
    }
}
