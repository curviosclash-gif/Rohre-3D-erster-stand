// ============================================
// OnlineSessionAdapter.js - Internet session via WebSocket signaling + STUN/TURN
// ============================================

import { createLogger } from '../shared/logging/Logger.js';
import { SessionAdapterBase } from './SessionAdapterBase.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { DataChannelManager } from './DataChannelManager.js';
import { LatencyMonitor } from './LatencyMonitor.js';
import {
    buildMultiplayerStateUpdateEvent,
    MULTIPLAYER_MESSAGE_TYPES,
    normalizeMultiplayerSessionMessage,
} from '../shared/contracts/MultiplayerSessionContract.js';
import {
    SIGNALING_COMMAND_TYPES,
    SIGNALING_EVENT_TYPES,
    createSignalingEnvelope,
} from '../shared/contracts/SignalingSessionContract.js';
import {
    resolveRetryDelays,
    delay,
    resolveConnectTimeoutMs,
    resolveOnlineSignalingUrl,
    buildSocketCloseDetails,
    createSocketLifecycleError,
    createServerSignalingError,
    isRetryableSignalingError,
    toErrorPayload,
} from './OnlineSignalingSupport.js';

const logger = createLogger('OnlineSessionAdapter');

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
            this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.ICE, { targetPeerId: peerId, candidate }));
        });

        this._beforeUnloadHandler = () => { this._sendLeaveMessage(); };
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
        }
    }

    async connect(options = {}) {
        this._signalingUrl = resolveOnlineSignalingUrl(options.signalingUrl, this._signalingUrl);
        return this._runConnectLoop(() => this._connectSingleAttempt(options), options);
    }

    async reconnect(options = {}) {
        if (options.signalingUrl) {
            this._signalingUrl = resolveOnlineSignalingUrl(options.signalingUrl, this._signalingUrl);
        }
        return this._runConnectLoop(() => this._reconnectSingleAttempt(options), options);
    }

    async _runConnectLoop(singleAttemptFn, options = {}) {
        const retryDelays = resolveRetryDelays(options.connectRetryDelaysMs);
        const maxAttempts = Number.isFinite(Number(options.maxConnectAttempts))
            ? Math.min(3, Math.max(1, Math.floor(Number(options.maxConnectAttempts)))) : 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await singleAttemptFn();
                return;
            } catch (err) {
                lastError = err;
                this._teardownSignalingSocket();
                if (attempt >= maxAttempts || !isRetryableSignalingError(err)) break;
                const retryDelayMs = retryDelays[Math.min(attempt - 1, retryDelays.length - 1)] || 0;
                if (retryDelayMs > 0) {
                    logger.debug('Signaling connect attempt failed; retrying', { attempt, maxAttempts, retryDelayMs });
                    await delay(retryDelayMs);
                }
            }
        }

        throw lastError || createSocketLifecycleError('error', { signalingUrl: this._signalingUrl });
    }

    _socketAttempt(onOpenFn, options = {}) {
        const timeoutMs = resolveConnectTimeoutMs(options.connectTimeoutMs);
        return new Promise((resolve, reject) => {
            let settled = false;
            const settle = (fn, arg) => { if (settled) return; settled = true; fn(arg); };
            const timer = setTimeout(
                () => settle(reject, createSocketLifecycleError('timeout', { signalingUrl: this._signalingUrl })),
                timeoutMs
            );
            const done = () => { clearTimeout(timer); settle(resolve); };
            const fail = (err) => { clearTimeout(timer); settle(reject, err); };

            this._ws = new WebSocket(this._signalingUrl);
            this._ws.onopen = onOpenFn;
            this._ws.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }
                this._handleSignalingMessage(msg, done, fail);
            };
            this._ws.onerror = () => fail(createSocketLifecycleError('error', { signalingUrl: this._signalingUrl }));
            this._ws.onclose = (event) => {
                fail(createSocketLifecycleError('close', buildSocketCloseDetails(event, this._signalingUrl)));
                this._emit('signalingDisconnected', {});
            };
        });
    }

    _connectSingleAttempt(options = {}) {
        return this._socketAttempt(() => {
            if (this.isHost) {
                this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.CREATE_LOBBY, { maxPlayers: options.maxPlayers || 10 }));
            } else {
                this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.JOIN_LOBBY, { lobbyCode: options.lobbyCode }));
            }
        }, options);
    }

    _reconnectSingleAttempt(options = {}) {
        return this._socketAttempt(() => {
            this._sendSignaling(createSignalingEnvelope(
                SIGNALING_COMMAND_TYPES.RESUME_CONNECTION,
                { lobbyCode: this._lobbyCode, playerId: this.localPlayerId }
            ));
        }, options);
    }

    _teardownSignalingSocket() {
        if (!this._ws) return;
        try { this._ws.close(); } catch { /* Best-effort cleanup between retries. */ }
        this._ws = null;
    }

    async _handleSignalingMessage(msg, connectResolve, connectReject) {
        switch (msg.type) {
        case SIGNALING_EVENT_TYPES.LOBBY_CREATED:
            this._lobbyCode = msg.lobbyCode;
            this.localPlayerId = msg.playerId;
            this.isConnected = true;
            this._latencyMonitor.start();
            this._emit('connected', { playerId: this.localPlayerId, lobbyCode: this._lobbyCode });
            if (connectResolve) connectResolve();
            break;

        case SIGNALING_EVENT_TYPES.LOBBY_JOINED:
            this.localPlayerId = msg.playerId;
            this.isConnected = true;
            this._emit('connected', { playerId: this.localPlayerId });
            if (connectResolve) connectResolve();
            break;

        case SIGNALING_EVENT_TYPES.CONNECTION_RESUMED:
            this.isConnected = true;
            this._emit('connectionResumed', { lobbyCode: msg.lobbyCode || this._lobbyCode });
            if (connectResolve) connectResolve();
            break;

        case SIGNALING_EVENT_TYPES.PLAYER_JOINED:
            this._emit('playerJoined', { peerId: msg.peerId, name: msg.name });
            if (this.isHost) {
                if (this._disconnectedPeers.has(msg.peerId)) this._resolvePeerReconnect(msg.peerId);
                const offer = await this._peerManager.createOffer(msg.peerId);
                this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.OFFER, { targetPeerId: msg.peerId, offer }));
            }
            break;

        case SIGNALING_EVENT_TYPES.PLAYER_RECONNECTED:
            this._emit('playerReconnected', { peerId: msg.peerId });
            if (this.isHost && msg.peerId) {
                if (this._disconnectedPeers.has(msg.peerId)) this._resolvePeerReconnect(msg.peerId);
                const offer = await this._peerManager.createOffer(msg.peerId);
                this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.OFFER, { targetPeerId: msg.peerId, offer }));
            }
            break;

        case SIGNALING_COMMAND_TYPES.OFFER:
            if (!this.isHost) {
                this._hostPeerId = msg.fromPeerId;
                const answer = await this._peerManager.handleOffer(msg.fromPeerId, msg.offer);
                this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.ANSWER, { targetPeerId: msg.fromPeerId, answer }));
            }
            break;

        case SIGNALING_COMMAND_TYPES.ANSWER:
            await this._peerManager.handleAnswer(msg.fromPeerId, msg.answer);
            this._latencyMonitor.addPeer(msg.fromPeerId);
            this._emit('playerConnected', { peerId: msg.fromPeerId });
            break;

        case SIGNALING_COMMAND_TYPES.ICE:
            await this._peerManager.addIceCandidate(msg.fromPeerId, msg.candidate);
            break;

        case SIGNALING_EVENT_TYPES.PLAYER_LEFT:
            this._registerPeerDisconnect(msg.peerId, 'signaling-left');
            break;

        case SIGNALING_EVENT_TYPES.ERROR: {
            const err = createServerSignalingError(msg.message);
            this._emit('error', toErrorPayload(err));
            if (connectReject) connectReject(err);
            break;
        }

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
                    this._createStateMessage(MULTIPLAYER_MESSAGE_TYPES.LEAVE, { playerId: this.localPlayerId })
                );
            }
        }
        this._sendSignaling(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.LEAVE));
    }

    _sendSignaling(msg) {
        if (!msg) return;
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
