// ============================================
// OnlineSessionAdapter.js - Internet session via WebSocket signaling + STUN/TURN
// ============================================

import { SessionAdapterBase } from './SessionAdapterBase.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';
import {
    buildMultiplayerStateUpdateEvent,
    MULTIPLAYER_MESSAGE_TYPES,
    normalizeMultiplayerSessionMessage,
} from '../shared/contracts/MultiplayerSessionContract.js';

function resolveSignalingUrl(explicit) {
    if (explicit) return explicit;
    /* global __SIGNALING_URL__ */
    return (typeof __SIGNALING_URL__ !== 'undefined' && __SIGNALING_URL__) || '';
}

/**
 * SessionAdapter for Internet play.
 * Uses a self-hosted WebSocket signaling server for lobby and SDP exchange.
 * After signaling, communication is P2P via WebRTC (with STUN/TURN for NAT traversal).
 */
export class OnlineSessionAdapter extends SessionAdapterBase {
    constructor(options = {}) {
        super({
            isHost: !!options.isHost,
            reconnectWindowMs: options.reconnectWindowMs,
            now: options.now,
        });
        this._signalingUrl = resolveSignalingUrl(options.signalingUrl);
        this._iceServers = options.iceServers || null;
        this._ws = null;
        this._dataChannelManager = new DataChannelManager();
        this._peerManager = new PeerConnectionManager({
            isHost: this.isHost,
            iceServers: this._iceServers,
            dataChannelManager: this._dataChannelManager,
        });
        this._latencyMonitor = new LatencyMonitor({
            onPingNeeded: (peerId, pingId) => {
                this._sendStateToPeer(
                    peerId,
                    this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.PING, { pingId })
                );
            },
        });
        this._lobbyCode = null;
        this._hostPeerId = null;

        this._dataChannelManager.on('message', ({ peerId, channel, data }) => {
            this._handleDataMessage(peerId, channel, data);
        });

        this._dataChannelManager.on('channelClose', ({ peerId }) => {
            this._registerPeerDisconnect(peerId, 'channel-close');
        });

        this._peerManager.on('peerDisconnected', ({ peerId, state }) => {
            this._registerPeerDisconnect(peerId, state);
        });

        this._peerManager.on('heartbeatTimeout', ({ peerId }) => {
            this._registerPeerDisconnect(peerId, 'heartbeat-timeout');
        });

        this._peerManager.on('iceCandidate', ({ peerId, candidate }) => {
            this._sendSignaling({ type: 'ice', targetPeerId: peerId, candidate });
        });

        this._beforeUnloadHandler = () => {
            this._sendLeaveMessage();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
        }
    }

    async connect(options = {}) {
        this._signalingUrl = options.signalingUrl || this._signalingUrl;
        const timeoutMs = options.connectTimeoutMs || 30_000;

        return new Promise((resolve, reject) => {
            let settled = false;
            const settle = (fn, arg) => {
                if (settled) return;
                settled = true;
                fn(arg);
            };

            const timer = setTimeout(
                () => settle(reject, new Error('Signaling connect timed out')),
                timeoutMs
            );

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
                try {
                    msg = JSON.parse(event.data);
                } catch {
                    return;
                }
                this._handleSignalingMessage(
                    msg,
                    () => { clearTimeout(timer); settle(resolve); },
                    (err) => { clearTimeout(timer); settle(reject, err); }
                );
            };

            this._ws.onerror = () => {
                clearTimeout(timer);
                settle(reject, new Error('WebSocket connection failed'));
            };
            this._ws.onclose = () => {
                clearTimeout(timer);
                settle(reject, new Error('WebSocket closed before connection was established'));
                this._emit('signalingDisconnected', {});
            };
        });
    }

    async _handleSignalingMessage(msg, connectResolve, connectReject) {
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
                if (this._disconnectedPeers.has(msg.peerId)) {
                    this._resolvePeerReconnect(msg.peerId);
                }
                const offer = await this._peerManager.createOffer(msg.peerId);
                this._sendSignaling({ type: 'offer', targetPeerId: msg.peerId, offer });
            }
            break;

        case 'offer':
            if (!this.isHost) {
                this._hostPeerId = msg.fromPeerId;
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
            this._registerPeerDisconnect(msg.peerId, 'signaling-left');
            break;

        case 'error':
            this._emit('error', { message: msg.message });
            if (connectReject) connectReject(new Error(`Signaling error: ${msg.message}`));
            break;

        default:
            break;
        }
    }

    _findHostPeerId() {
        return this._hostPeerId || null;
    }

    _sendStateToAll(message, excludePeerId = null) {
        if (!message) return;
        this._dataChannelManager.sendToAll('state', message, excludePeerId);
    }

    _sendStateToPeer(peerId, message) {
        if (!peerId || !message) return;
        this._dataChannelManager.send(peerId, 'state', message);
    }

    _closePeerConnection(peerId) {
        this._peerManager.closePeer(peerId);
    }

    _removePeerLatency(peerId) {
        this._latencyMonitor.removePeer(peerId);
    }

    _handleClientPeerDisconnect(peerId, reason) {
        const hostPeerId = this._findHostPeerId();
        if (peerId === hostPeerId) {
            this._emit('hostDisconnected', { reason });
            this._closePeerConnection(peerId);
            this._removePeerLatency(peerId);
            this._emit('playerDisconnected', { peerId, reason, isHost: true });
            return true;
        }
        this._closePeerConnection(peerId);
        this._removePeerLatency(peerId);
        this._emit('playerDisconnected', { peerId, reason, isHost: false });
        return true;
    }

    _sendLeaveMessage() {
        if (!this.isConnected) return;
        if (this.isHost) {
            this._sendStateToAll(this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.HOST_LEAVING));
        } else {
            const hostPeerId = this._findHostPeerId();
            if (hostPeerId) {
                this._sendStateToPeer(
                    hostPeerId,
                    this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.LEAVE, {
                        playerId: this.localPlayerId,
                    })
                );
            }
        }
        this._sendSignaling({ type: 'leave' });
    }

    _sendSignaling(msg) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(msg));
        }
    }

    sendInput(inputData) {
        const payload = {
            ...this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.INPUT),
            playerId: this.localPlayerId || (this.isHost ? 'host' : ''),
            inputs: inputData,
            timestamp: this._now(),
        };
        if (this.isHost) {
            this._sendStateToAll(payload);
            return;
        }
        const hostPeerId = this._findHostPeerId();
        if (hostPeerId) {
            this._dataChannelManager.send(hostPeerId, 'inputs', payload);
        }
    }

    broadcastState(stateSnapshot) {
        if (!this.isHost) return;
        this._sendStateToAll(this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT, stateSnapshot));
    }

    sendStateToPeer(peerId, stateSnapshot) {
        this._sendFullStateSync(peerId, stateSnapshot);
    }

    _handleDataMessage(peerId, channel, data) {
        const message = normalizeMultiplayerSessionMessage(data);
        switch (message.type) {
        case MULTIPLAYER_MESSAGE_TYPES.INPUT:
            if (data?.inputs?.type === 'arena_loaded') {
                this._emit('playerLoaded', { playerId: data.playerId || peerId });
            }
            this._emit('remoteInput', { peerId, input: data.inputs, playerId: data.playerId });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT:
            this._emit('stateUpdate', buildMultiplayerStateUpdateEvent(data, {
                messageType: MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT,
            }));
            break;
        case MULTIPLAYER_MESSAGE_TYPES.FULL_STATE_SYNC:
            this._emit('fullStateSync', { state: data });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.PING:
            this._dataChannelManager.send(
                peerId,
                channel,
                this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.PONG, { pingId: data.pingId })
            );
            break;
        case MULTIPLAYER_MESSAGE_TYPES.PONG:
            this._latencyMonitor.recordPongReceived(peerId, data.pingId);
            break;
        case MULTIPLAYER_MESSAGE_TYPES.HEARTBEAT:
            this._sendStateToPeer(peerId, this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.HEARTBEAT_ACK));
            break;
        case MULTIPLAYER_MESSAGE_TYPES.HEARTBEAT_ACK:
            this._peerManager.recordHeartbeatAck(peerId);
            break;
        case MULTIPLAYER_MESSAGE_TYPES.LEAVE:
            this._closePeerConnection(data.playerId || peerId);
            this._removePeerLatency(data.playerId || peerId);
            this._emit('playerDisconnected', { peerId: data.playerId || peerId, reason: 'graceful-leave' });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.HOST_LEAVING:
            this._emit('hostDisconnected', { reason: 'graceful-leave' });
            this._emit('playerDisconnected', { peerId, reason: 'host-leaving', isHost: true });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.PLAYER_DISCONNECTED:
            this._emit('playerDisconnected', {
                peerId: data.peerId,
                reason: data.reason,
                canReconnect: true,
                reconnectWindowMs: data.reconnectWindowMs,
            });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.PLAYER_RECONNECTED:
            this._emit('playerReconnected', { peerId: data.peerId });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.PLAYER_REMOVED:
            this._emit('playerRemoved', { peerId: data.peerId });
            break;
        default:
            break;
        }
    }

    get lobbyCode() {
        return this._lobbyCode;
    }

    getPlayers() {
        const players = [];
        const localPlayerId = String(this.localPlayerId || '').trim();
        if (localPlayerId) {
            players.push({
                id: localPlayerId,
                peerId: localPlayerId,
                name: this.isHost ? 'Host' : localPlayerId,
                isHost: this.isHost,
                ready: this.isConnected,
                connected: this.isConnected,
            });
        }

        const peerIds = this._peerManager?.getAllPeerIds?.() || [];
        for (const peerId of peerIds) {
            const normalizedPeerId = String(peerId || '').trim();
            if (!normalizedPeerId || normalizedPeerId === localPlayerId) continue;
            players.push({
                id: normalizedPeerId,
                peerId: normalizedPeerId,
                name: normalizedPeerId,
                isHost: !this.isHost && normalizedPeerId === 'host',
                ready: true,
                connected: true,
            });
        }

        return players;
    }

    disconnect() {
        this._sendLeaveMessage();
        this._clearReconnectPeers();
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
