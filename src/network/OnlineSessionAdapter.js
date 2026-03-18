// ============================================
// OnlineSessionAdapter.js - Internet session via WebSocket signaling + STUN/TURN
// ============================================

import { SessionAdapter } from '../core/session/SessionAdapter.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';

const DEFAULT_TURN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

/** Reconnect window in ms (C.1) */
const RECONNECT_WINDOW_MS = 30_000;

/**
 * SessionAdapter for Internet play.
 * Uses a self-hosted WebSocket signaling server for lobby and SDP exchange.
 * After signaling, communication is P2P via WebRTC (with STUN/TURN for NAT traversal).
 */
export class OnlineSessionAdapter extends SessionAdapter {
    constructor(options = {}) {
        super();
        this.isHost = !!options.isHost;
        this._signalingUrl = options.signalingUrl || '';
        this._iceServers = options.iceServers || DEFAULT_TURN_SERVERS;
        this._ws = null;
        this._dataChannelManager = new DataChannelManager();
        this._peerManager = new PeerConnectionManager({
            isHost: this.isHost,
            iceServers: this._iceServers,
            dataChannelManager: this._dataChannelManager,
        });
        this._latencyMonitor = new LatencyMonitor({
            onPingNeeded: (peerId, pingId) => {
                this._dataChannelManager.send(peerId, 'state', { type: 'ping', pingId });
            },
        });
        this._players = [];
        this._lobbyCode = null;

        /** Disconnected peers awaiting reconnect (C.1) */
        this._disconnectedPeers = new Map();

        this._dataChannelManager.on('message', ({ peerId, channel, data }) => {
            this._handleDataMessage(peerId, channel, data);
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

        this._peerManager.on('iceCandidate', ({ peerId, candidate }) => {
            this._sendSignaling({ type: 'ice', targetPeerId: peerId, candidate });
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

        return new Promise((resolve, reject) => {
            this._ws = new WebSocket(this._signalingUrl);

            this._ws.onopen = () => {
                if (this.isHost) {
                    this._sendSignaling({ type: 'create_lobby', maxPlayers: options.maxPlayers || 10 });
                } else {
                    this._sendSignaling({ type: 'join_lobby', lobbyCode: options.lobbyCode });
                }
            };

            this._ws.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }
                this._handleSignalingMessage(msg, resolve);
            };

            this._ws.onerror = () => reject(new Error('WebSocket connection failed'));
            this._ws.onclose = () => {
                this._emit('signalingDisconnected', {});
            };
        });
    }

    async _handleSignalingMessage(msg, connectResolve) {
        switch (msg.type) {
        case 'lobby_created':
            this._lobbyCode = msg.lobbyCode;
            this.localPlayerId = msg.playerId;
            this.isConnected = true;
            this._latencyMonitor.start();
            this._emit('connected', { playerId: this.localPlayerId, lobbyCode: this._lobbyCode });
            if (connectResolve) connectResolve();
            break;

        case 'lobby_joined':
            this.localPlayerId = msg.playerId;
            this.isConnected = true;
            this._emit('connected', { playerId: this.localPlayerId });
            if (connectResolve) connectResolve();
            break;

        case 'player_joined':
            this._emit('playerJoined', { peerId: msg.peerId, name: msg.name });
            if (this.isHost) {
                // Check if this is a reconnect (C.1)
                if (this._disconnectedPeers.has(msg.peerId)) {
                    this._handleReconnect(msg.peerId);
                }
                const offer = await this._peerManager.createOffer(msg.peerId);
                this._sendSignaling({ type: 'offer', targetPeerId: msg.peerId, offer });
            }
            break;

        case 'offer':
            if (!this.isHost) {
                const answer = await this._peerManager.handleOffer(msg.fromPeerId, msg.offer);
                this._sendSignaling({ type: 'answer', targetPeerId: msg.fromPeerId, answer });
            }
            break;

        case 'answer':
            await this._peerManager.handleAnswer(msg.fromPeerId, msg.answer);
            this._latencyMonitor.addPeer(msg.fromPeerId);
            this._emit('playerConnected', { peerId: msg.fromPeerId });
            break;

        case 'ice':
            await this._peerManager.addIceCandidate(msg.fromPeerId, msg.candidate);
            break;

        case 'player_left':
            this._handlePeerDisconnect(msg.peerId, 'signaling-left');
            break;

        case 'error':
            this._emit('error', { message: msg.message });
            break;
        }
    }

    /** Handle peer disconnect with reconnect window (C.1) */
    _handlePeerDisconnect(peerId, reason) {
        // Avoid duplicate handling
        if (this._disconnectedPeers.has(peerId)) return;

        if (this.isHost) {
            const timer = setTimeout(() => {
                this._finalizePeerRemoval(peerId);
            }, RECONNECT_WINDOW_MS);

            this._disconnectedPeers.set(peerId, {
                reason,
                disconnectedAt: Date.now(),
                timer,
            });

            // Inform other clients
            this._dataChannelManager.sendToAll('state', {
                type: 'player_disconnected',
                peerId,
                reason,
                reconnectWindowMs: RECONNECT_WINDOW_MS,
            }, peerId);

            this._emit('playerDisconnected', { peerId, reason, canReconnect: true });
        } else {
            // Check if host disconnected
            const hostPeerId = this._findHostPeerId();
            if (peerId === hostPeerId) {
                this._emit('hostDisconnected', { reason });
            }
            this._peerManager.closePeer(peerId);
            this._latencyMonitor.removePeer(peerId);
            this._emit('playerDisconnected', { peerId, reason, isHost: peerId === hostPeerId });
        }
    }

    _findHostPeerId() {
        // In online mode the host is whoever created the lobby
        // We detect host by checking the first connected peer
        const peerIds = this._peerManager.getAllPeerIds();
        return peerIds.length > 0 ? peerIds[0] : null;
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

        this._dataChannelManager.sendToAll('state', {
            type: 'player_reconnected',
            peerId,
        });

        this._emit('playerReconnected', { peerId });
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
            this._dataChannelManager.send(
                this._peerManager.getAllPeerIds()[0] || 'host',
                'state',
                { type: 'leave', playerId: this.localPlayerId },
            );
        }
        // Also inform signaling server
        this._sendSignaling({ type: 'leave' });
    }

    _sendSignaling(msg) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(msg));
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

    _handleDataMessage(peerId, channel, data) {
        if (data.type === 'input') {
            this._emit('remoteInput', { peerId, input: data.inputs, playerId: data.playerId });
        } else if (data.type === 'state_snapshot') {
            this._emit('stateUpdate', { state: data });
        } else if (data.type === 'full_state_sync') {
            this._emit('fullStateSync', { state: data });
        } else if (data.type === 'ping') {
            this._dataChannelManager.send(peerId, channel, { type: 'pong', pingId: data.pingId });
        } else if (data.type === 'pong') {
            this._latencyMonitor.recordPongReceived(peerId, data.pingId);
        } else if (data.type === 'heartbeat') {
            this._dataChannelManager.send(peerId, 'state', { type: 'heartbeat_ack' });
        } else if (data.type === 'heartbeat_ack') {
            this._peerManager.recordHeartbeatAck(peerId);
        } else if (data.type === 'leave') {
            this._peerManager.closePeer(data.playerId || peerId);
            this._latencyMonitor.removePeer(data.playerId || peerId);
            this._emit('playerDisconnected', { peerId: data.playerId || peerId, reason: 'graceful-leave' });
        } else if (data.type === 'host_leaving') {
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

    get lobbyCode() {
        return this._lobbyCode;
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

        // Clear reconnect timers
        for (const [, info] of this._disconnectedPeers) {
            if (info.timer) clearTimeout(info.timer);
        }
        this._disconnectedPeers.clear();

        this._latencyMonitor.stop();
        this._peerManager.dispose();
        this._dataChannelManager.dispose();
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
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
