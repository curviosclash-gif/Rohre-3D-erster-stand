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

        this._dataChannelManager.on('message', ({ peerId, channel, data }) => {
            this._handleDataMessage(peerId, channel, data);
        });

        this._peerManager.on('peerDisconnected', ({ peerId }) => {
            this._emit('playerDisconnected', { peerId });
        });

        this._peerManager.on('iceCandidate', ({ peerId, candidate }) => {
            this._sendSignaling({ type: 'ice', targetPeerId: peerId, candidate });
        });
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
            this._peerManager.closePeer(msg.peerId);
            this._latencyMonitor.removePeer(msg.peerId);
            this._emit('playerDisconnected', { peerId: msg.peerId });
            break;

        case 'error':
            this._emit('error', { message: msg.message });
            break;
        }
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

    _handleDataMessage(peerId, channel, data) {
        if (data.type === 'input') {
            this._emit('remoteInput', { peerId, input: data.inputs, playerId: data.playerId });
        } else if (data.type === 'state_snapshot') {
            this._emit('stateUpdate', { state: data });
        } else if (data.type === 'ping') {
            this._dataChannelManager.send(peerId, channel, { type: 'pong', pingId: data.pingId });
        } else if (data.type === 'pong') {
            this._latencyMonitor.recordPongReceived(peerId, data.pingId);
        }
    }

    get lobbyCode() {
        return this._lobbyCode;
    }

    getPlayers() {
        return this._players;
    }

    disconnect() {
        this._latencyMonitor.stop();
        this._peerManager.dispose();
        this._dataChannelManager.dispose();
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
        this.isConnected = false;
        this._emit('disconnected', { reason: 'manual' });
    }

    dispose() {
        this.disconnect();
        super.dispose();
    }
}
