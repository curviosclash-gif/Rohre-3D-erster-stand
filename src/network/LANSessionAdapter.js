// ============================================
// LANSessionAdapter.js - LAN session via embedded signaling
// ============================================

import { SessionAdapter } from '../core/session/SessionAdapter.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';

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

        this._dataChannelManager.on('message', ({ peerId, channel, data }) => {
            this._handleMessage(peerId, channel, data);
        });

        this._peerManager.on('peerDisconnected', ({ peerId }) => {
            this._emit('playerDisconnected', { peerId });
        });
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
                    this._emit('playerConnected', { peerId: pending.playerId });
                    return;
                }
                await new Promise((r) => setTimeout(r, 200));
            }
        };
        await pollAnswer();
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

    _handleMessage(peerId, channel, data) {
        if (data.type === 'input') {
            this._emit('remoteInput', { peerId, input: data.inputs, playerId: data.playerId });
        } else if (data.type === 'state_snapshot') {
            this._emit('stateUpdate', { state: data });
        } else if (data.type === 'ping') {
            this._dataChannelManager.send(peerId, channel === 'inputs' ? 'inputs' : 'state', {
                type: 'pong', pingId: data.pingId,
            });
        } else if (data.type === 'pong') {
            this._latencyMonitor.recordPongReceived(peerId, data.pingId);
        }
    }

    getPlayers() {
        return this._players;
    }

    disconnect() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
        this._latencyMonitor.stop();
        this._peerManager.dispose();
        this._dataChannelManager.dispose();
        this.isConnected = false;
        this._emit('disconnected', { reason: 'manual' });
    }

    dispose() {
        this.disconnect();
        super.dispose();
    }
}
