// ============================================
// LANSessionAdapter.js - LAN session via embedded signaling
// ============================================

import { SessionAdapterBase } from './SessionAdapterBase.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';
import {
    MULTIPLAYER_MESSAGE_TYPES,
    normalizeMultiplayerSessionMessage,
} from '../shared/contracts/MultiplayerSessionContract.js';

/**
 * SessionAdapter for LAN play.
 * Host runs an embedded HTTP signaling server (in Electron/Tauri main process).
 * Clients connect via fetch() to the host's IP:port.
 * After signaling, communication is P2P via WebRTC data channels.
 */
export class LANSessionAdapter extends SessionAdapterBase {
    constructor(options = {}) {
        super({
            isHost: !!options.isHost,
            reconnectWindowMs: options.reconnectWindowMs,
            now: options.now,
        });
        this._signalingUrl = options.signalingUrl || null;
        this._dataChannelManager = new DataChannelManager();
        this._peerManager = new PeerConnectionManager({
            isHost: this.isHost,
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
        this._players = [];
        this._pollingInterval = null;

        this._dataChannelManager.on('message', ({ peerId, channel, data }) => {
            this._handleMessage(peerId, channel, data);
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
            return;
        }

        await this._joinAsClient(options.lobbyCode);
    }

    async _joinAsClient(lobbyCode) {
        const joinRes = await fetch(`${this._signalingUrl}/lobby/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lobbyCode }),
        });
        const joinData = await joinRes.json();
        this.localPlayerId = joinData.playerId;

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
                if (Array.isArray(data.pendingPlayers)) {
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
        const targetPeerId = String(pending?.playerId || '').trim();
        if (!targetPeerId) return;
        const offer = await this._peerManager.createOffer(targetPeerId);

        await fetch(`${this._signalingUrl}/signaling/offer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPlayerId: targetPeerId, offer }),
        });

        for (let i = 0; i < 30; i += 1) {
            const res = await fetch(`${this._signalingUrl}/signaling/answer?playerId=${targetPeerId}`);
            const data = await res.json();
            if (!data.answer) {
                await new Promise((resolve) => setTimeout(resolve, 200));
                continue;
            }
            await this._peerManager.handleAnswer(targetPeerId, data.answer);
            this._latencyMonitor.addPeer(targetPeerId);
            if (this._disconnectedPeers.has(targetPeerId)) {
                this._resolvePeerReconnect(targetPeerId);
            } else {
                this._emit('playerConnected', { peerId: targetPeerId });
            }
            return;
        }
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
        if (peerId !== 'host') return false;
        this._emit('hostDisconnected', { reason });
        this._emit('playerDisconnected', { peerId, reason, isHost: true });
        return true;
    }

    _sendLeaveMessage() {
        if (!this.isConnected) return;
        if (this.isHost) {
            this._sendStateToAll(this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.HOST_LEAVING));
            return;
        }
        this._sendStateToPeer('host', this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.LEAVE, {
            playerId: this.localPlayerId,
        }));
    }

    sendInput(inputData) {
        if (this.isHost) return;
        this._dataChannelManager.send('host', 'inputs', {
            ...this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.INPUT),
            playerId: this.localPlayerId,
            inputs: inputData,
            timestamp: this._now(),
        });
    }

    broadcastState(stateSnapshot) {
        if (!this.isHost) return;
        this._sendStateToAll(this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT, stateSnapshot));
    }

    sendStateToPeer(peerId, stateSnapshot) {
        this._sendFullStateSync(peerId, stateSnapshot);
    }

    _handleMessage(peerId, channel, data) {
        const message = normalizeMultiplayerSessionMessage(data);
        switch (message.type) {
        case MULTIPLAYER_MESSAGE_TYPES.INPUT:
            this._emit('remoteInput', { peerId, input: data.inputs, playerId: data.playerId });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT:
            this._emit('stateUpdate', { state: data });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.FULL_STATE_SYNC:
            this._emit('fullStateSync', { state: data });
            break;
        case MULTIPLAYER_MESSAGE_TYPES.PING:
            this._dataChannelManager.send(
                peerId,
                channel === 'inputs' ? 'inputs' : 'state',
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

    getPlayers() {
        return this._players;
    }

    disconnect() {
        this._sendLeaveMessage();

        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }

        this._clearReconnectPeers();
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
