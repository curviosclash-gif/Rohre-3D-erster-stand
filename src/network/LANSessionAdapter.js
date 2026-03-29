// ============================================
// LANSessionAdapter.js - LAN session via embedded signaling
// ============================================

import { createLogger } from '../shared/logging/Logger.js';
import { SessionAdapterBase } from './SessionAdapterBase.js';

const logger = createLogger('LANSessionAdapter');
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';
import {
    buildMultiplayerStateUpdateEvent,
    MULTIPLAYER_MESSAGE_TYPES,
    normalizeMultiplayerSessionMessage,
} from '../shared/contracts/MultiplayerSessionContract.js';

const JOIN_OFFER_MAX_WAIT_MS = 12_000;
const JOIN_OFFER_INITIAL_BACKOFF_MS = 200;
const JOIN_OFFER_MAX_BACKOFF_MS = 1_600;
const ICE_POLL_MAX_RETRIES = 20;
const ICE_QUIET_WINDOW_POLLS = 3;
const ICE_POLL_DELAY_MS = 200;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

        this._peerManager.on('iceCandidate', ({ peerId, candidate }) => {
            this._sendIceCandidate(peerId, candidate);
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
        try {
            const joinRes = await fetch(`${this._signalingUrl}/lobby/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lobbyCode }),
            });
            if (joinRes?.ok === false) {
                throw new Error(`Lobby join failed (${joinRes.status || 'unknown'})`);
            }
            const joinData = await joinRes.json();
            this.localPlayerId = joinData.playerId;

            // Poll for the offer from host
            let offerData = null;
            let offerPollDelayMs = JOIN_OFFER_INITIAL_BACKOFF_MS;
            const offerPollingStartedAt = Number(this._now()) || 0;
            while ((Number(this._now()) || 0) - offerPollingStartedAt < JOIN_OFFER_MAX_WAIT_MS) {
                try {
                    const offerRes = await fetch(`${this._signalingUrl}/signaling/offer?playerId=${this.localPlayerId}`);
                    if (offerRes?.ok === false) {
                        throw new Error(`Offer poll failed (${offerRes.status || 'unknown'})`);
                    }
                    const data = await offerRes.json();
                    if (data.offer) {
                        offerData = data;
                        break;
                    }
                } catch (err) {
                    logger.debug('Offer poll failed:', err);
                }
                await delay(offerPollDelayMs);
                offerPollDelayMs = Math.min(JOIN_OFFER_MAX_BACKOFF_MS, offerPollDelayMs * 2);
            }
            if (!offerData?.offer) {
                throw new Error('Timed out waiting for host offer');
            }

            const answer = await this._peerManager.handleOffer('host', offerData.offer);

            await fetch(`${this._signalingUrl}/signaling/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: this.localPlayerId, answer }),
            }).catch((err) => { logger.warn('Answer send failed:', err); });
        } catch (err) {
            logger.error('Join as client failed:', err);
            throw err;
        }

        // Exchange ICE candidates with host
        await this._pollIceCandidates('host', {
            playerId: this.localPlayerId,
            fromPeerId: 'host',
        });

        this.isConnected = true;
        this._emit('connected', { playerId: this.localPlayerId });
    }

    async _sendIceCandidate(peerId, candidate) {
        if (!this._signalingUrl) return;
        const sourcePlayerId = String(this.localPlayerId || (this.isHost ? 'host' : '') || '').trim();
        const targetPlayerId = String(peerId || '').trim() || 'host';
        try {
            await fetch(`${this._signalingUrl}/signaling/ice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: sourcePlayerId,
                    targetPlayerId,
                    candidate,
                }),
            });
        } catch (err) {
            logger.debug('ICE send failed (may still connect via other candidates):', err);
        }
    }

    async _pollIceCandidates(peerId, options = {}) {
        // Continue polling after first batch to support Trickle-ICE:
        // stop only after ICE_QUIET_WINDOW_POLLS consecutive empty polls once at least one
        // candidate has been received, or after ICE_POLL_MAX_RETRIES total iterations.
        const playerId = String(options.playerId || this.localPlayerId || '').trim();
        if (!playerId) return;
        const fromPeerId = String(options.fromPeerId || '').trim();
        const maxRetries = Number.isFinite(Number(options.maxRetries))
            ? Math.max(1, Math.floor(Number(options.maxRetries)))
            : ICE_POLL_MAX_RETRIES;
        const quietWindowPolls = Number.isFinite(Number(options.quietWindowPolls))
            ? Math.max(1, Math.floor(Number(options.quietWindowPolls)))
            : ICE_QUIET_WINDOW_POLLS;
        const pollDelayMs = Number.isFinite(Number(options.pollDelayMs))
            ? Math.max(0, Math.floor(Number(options.pollDelayMs)))
            : ICE_POLL_DELAY_MS;
        const params = new URLSearchParams({ playerId });
        if (fromPeerId) {
            params.set('fromPlayerId', fromPeerId);
        }
        const pollUrl = `${this._signalingUrl}/signaling/ice?${params.toString()}`;

        let hasReceivedAny = false;
        let quietCount = 0;
        for (let i = 0; i < maxRetries; i += 1) {
            try {
                const res = await fetch(pollUrl);
                const data = await res.json();
                if (Array.isArray(data.candidates) && data.candidates.length > 0) {
                    for (const candidate of data.candidates) {
                        await this._peerManager.addIceCandidate(peerId, candidate);
                    }
                    hasReceivedAny = true;
                    quietCount = 0;
                } else if (hasReceivedAny) {
                    quietCount += 1;
                    if (quietCount >= quietWindowPolls) return;
                }
            } catch (err) {
                logger.debug('ICE candidate poll failed:', err);
            }
            await delay(pollDelayMs);
        }
    }

    _startPolling() {
        if (!this.isHost || !this._signalingUrl) return;
        this._connectingPeers = new Set();
        this._pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${this._signalingUrl}/lobby/status`);
                const data = await res.json();
                if (Array.isArray(data.pendingPlayers)) {
                    for (const pending of data.pendingPlayers) {
                        const peerId = String(pending?.playerId || '').trim();
                        if (!peerId || this._connectingPeers.has(peerId)) continue;
                        this._connectingPeers.add(peerId);
                        this._connectToPendingClient(pending).finally(() => {
                            this._connectingPeers.delete(peerId);
                        });
                    }
                }
            } catch (err) {
                logger.debug('Polling lobby status failed:', err);
            }
        }, 1000);
    }

    async _connectToPendingClient(pending) {
        const targetPeerId = String(pending?.playerId || '').trim();
        if (!targetPeerId) return;
        try {
            const offer = await this._peerManager.createOffer(targetPeerId);

            await fetch(`${this._signalingUrl}/signaling/offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPlayerId: targetPeerId, offer }),
            }).catch((err) => { logger.warn('Offer send to pending client failed:', err); });

            for (let i = 0; i < 30; i += 1) {
                // Poll for ICE candidates from client while waiting for answer
                try {
                    const iceParams = new URLSearchParams({
                        playerId: 'host',
                        fromPlayerId: targetPeerId,
                    });
                    const iceRes = await fetch(`${this._signalingUrl}/signaling/ice?${iceParams.toString()}`);
                    const iceData = await iceRes.json();
                    if (Array.isArray(iceData.candidates)) {
                        for (const candidate of iceData.candidates) {
                            await this._peerManager.addIceCandidate(targetPeerId, candidate);
                        }
                    }
                } catch (err) {
                    logger.debug('ICE poll for pending client failed:', err);
                }

                try {
                    const res = await fetch(`${this._signalingUrl}/signaling/answer?playerId=${targetPeerId}`);
                    const data = await res.json();
                    if (!data.answer) {
                        await delay(200);
                        continue;
                    }
                    await this._peerManager.handleAnswer(targetPeerId, data.answer);
                    this._latencyMonitor.addPeer(targetPeerId);

                    // Acknowledge successful connection — removes from pending list on server
                    fetch(`${this._signalingUrl}/lobby/ack-pending`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId: targetPeerId }),
                    }).catch((err) => { logger.debug('Ack-pending failed:', err); });

                    if (this._disconnectedPeers.has(targetPeerId)) {
                        this._resolvePeerReconnect(targetPeerId);
                    } else {
                        this._emit('playerConnected', { peerId: targetPeerId });
                    }
                    return;
                } catch (err) {
                    logger.debug('Answer poll for pending client failed:', err);
                    await delay(200);
                }
            }
        } catch (err) {
            logger.error('Connect to pending client failed:', err);
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
        this._dataChannelManager.send('host', 'inputs', payload);
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
            this._closePeerConnection(peerId || 'host');
            this._removePeerLatency(peerId || 'host');
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
        const players = [];
        const localPlayerId = String(this.localPlayerId || '').trim();
        if (localPlayerId) {
            players.push({
                id: localPlayerId,
                peerId: localPlayerId,
                name: localPlayerId === 'host' ? 'Host' : localPlayerId,
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
                name: normalizedPeerId === 'host' ? 'Host' : normalizedPeerId,
                isHost: normalizedPeerId === 'host',
                ready: true,
                connected: true,
            });
        }

        return players;
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
