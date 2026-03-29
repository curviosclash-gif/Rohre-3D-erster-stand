// ============================================
// OnlineMatchLobby.js - Internet lobby via WebSocket signaling
// ============================================

import { MatchLobby } from '../core/lobby/MatchLobby.js';
import {
    createInitialLobbySessionState,
    normalizeLobbySessionState,
} from './MatchLobbySessionState.js';
import {
    SIGNALING_COMMAND_TYPES,
    SIGNALING_EVENT_TYPES,
    createSignalingEnvelope,
} from '../shared/contracts/SignalingSessionContract.js';

const DEFAULT_CONNECT_RETRY_DELAYS_MS = [1000, 2000, 4000];

function resolveRetryDelays(delays) {
    if (!Array.isArray(delays) || delays.length <= 0) {
        return [...DEFAULT_CONNECT_RETRY_DELAYS_MS];
    }
    return delays
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .map((value) => Math.floor(value));
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lobby for Internet play. Communicates with the self-hosted
 * WebSocket signaling server.
 */
export class OnlineMatchLobby extends MatchLobby {
    constructor(options = {}) {
        super('online');
        this._signalingUrl = options.signalingUrl || '';
        this._ws = null;
        this._playerId = null;
        this.sessionState = createInitialLobbySessionState();
    }

    _applySessionState(nextState) {
        this.sessionState = normalizeLobbySessionState(nextState);
        this.lobbyCode = this.sessionState.lobbyCode;
        this.players = this.sessionState.players;
        this._emit('playersChanged', { players: this.players, sessionState: this.sessionState });
        this._emit('sessionStateChanged', { sessionState: this.sessionState });
    }

    _setReadyStateFor(peerId, ready) {
        const normalizedPeerId = String(peerId || '').trim();
        if (!normalizedPeerId) return;
        const nextMembers = this.sessionState.members.map((member) => (
            member.peerId === normalizedPeerId
                ? { ...member, ready: ready === true, lastSeenAt: Date.now() }
                : member
        ));
        this._applySessionState({
            ...this.sessionState,
            members: nextMembers,
            updatedAt: Date.now(),
            revision: Number(this.sessionState.revision || 0) + 1,
        });
    }

    async _makeConnectPromise(setupFn, options = {}) {
        const timeoutMs = Number.isFinite(Number(options.connectTimeoutMs))
            ? Math.max(1, Math.floor(Number(options.connectTimeoutMs)))
            : 30_000;
        const retryDelays = resolveRetryDelays(options.connectRetryDelaysMs);
        const configuredAttempts = Number.isFinite(Number(options.maxConnectAttempts))
            ? Math.max(1, Math.floor(Number(options.maxConnectAttempts)))
            : 3;
        const maxAttempts = Math.min(3, configuredAttempts);
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await this._makeConnectAttempt(setupFn, timeoutMs);
                return;
            } catch (err) {
                lastError = err;
                this._closeSocket();
                if (attempt >= maxAttempts) {
                    break;
                }
                const retryDelayMs = retryDelays[Math.min(attempt - 1, retryDelays.length - 1)] || 0;
                if (retryDelayMs > 0) {
                    await delay(retryDelayMs);
                }
            }
        }

        throw lastError || new Error('Signaling connect failed');
    }

    _makeConnectAttempt(setupFn, timeoutMs) {
        return new Promise((resolve, reject) => {
            const connectState = {
                settled: false,
                rejected: false,
            };
            const settle = (fn, arg) => {
                if (connectState.settled) return;
                connectState.settled = true;
                fn(arg);
            };

            const timer = setTimeout(
                () => settle(reject, new Error('Signaling connect timed out')),
                timeoutMs
            );
            const connectResolve = () => { clearTimeout(timer); settle(resolve); };
            const connectReject = (err) => {
                if (connectState.rejected) return;
                connectState.rejected = true;
                clearTimeout(timer);
                settle(reject, err);
            };

            this._ws = new WebSocket(this._signalingUrl);
            setupFn(this._ws, connectResolve, connectReject, connectState);

            this._ws.onerror = () => {
                connectReject(new Error('WebSocket connection failed'));
            };
            this._ws.onclose = () => {
                connectReject(new Error('WebSocket closed before connection was established'));
            };
        });
    }

    _closeSocket() {
        if (this._ws) {
            try {
                this._ws.close();
            } catch {
                // Ignore socket close failures during retries.
            }
            this._ws = null;
        }
    }

    async create(options = {}) {
        this.isHost = true;
        this.settings = { ...options };
        this._signalingUrl = options.signalingUrl || this._signalingUrl;

        return this._makeConnectPromise((ws, connectResolve, connectReject, connectState) => {
            ws.onopen = () => {
                this._send(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.CREATE_LOBBY, {
                    maxPlayers: options.maxPlayers || 10,
                }));
            };
            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg, connectResolve, connectReject, connectState);
            };
        }, options);
    }

    async join(lobbyCode, options = {}) {
        this.isHost = false;

        return this._makeConnectPromise((ws, connectResolve, connectReject, connectState) => {
            ws.onopen = () => {
                this._send(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.JOIN_LOBBY, { lobbyCode }));
            };
            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg, connectResolve, connectReject, connectState);
            };
        }, options);
    }

    _handleMessage(msg, connectResolve, connectReject, connectState = null) {
        switch (msg.type) {
        case SIGNALING_EVENT_TYPES.LOBBY_CREATED: {
            this.lobbyCode = msg.lobbyCode;
            this._playerId = msg.playerId;
            const now = Date.now();
            this._applySessionState({
                lobbyCode: this.lobbyCode,
                hostPeerId: this._playerId,
                maxPlayers: Number(msg.maxPlayers || 10),
                members: [{
                    peerId: this._playerId,
                    actorId: 'Host',
                    name: 'Host',
                    role: 'host',
                    ready: true,
                    joinedAt: now,
                    lastSeenAt: now,
                }],
                updatedAt: now,
                revision: Number(this.sessionState.revision || 0) + 1,
            });
            if (connectResolve) connectResolve();
            break;
        }

        case SIGNALING_EVENT_TYPES.LOBBY_JOINED: {
            this._playerId = msg.playerId;
            const now = Date.now();
            const hasMember = this.sessionState.members.some((member) => member.peerId === this._playerId);
            if (!hasMember) {
                this._applySessionState({
                    ...this.sessionState,
                    lobbyCode: msg.lobbyCode || this.sessionState.lobbyCode,
                    members: [
                        ...this.sessionState.members,
                        {
                            peerId: this._playerId,
                            actorId: this._playerId,
                            name: this._playerId,
                            role: this._playerId === this.sessionState.hostPeerId ? 'host' : 'client',
                            ready: false,
                            joinedAt: now,
                            lastSeenAt: now,
                        },
                    ],
                    updatedAt: now,
                    revision: Number(this.sessionState.revision || 0) + 1,
                });
            }
            if (connectResolve) connectResolve();
            break;
        }

        case SIGNALING_EVENT_TYPES.PLAYER_JOINED: {
            const now = Date.now();
            const peerId = String(msg.peerId || '').trim();
            if (!peerId) break;
            const exists = this.sessionState.members.some((member) => member.peerId === peerId);
            if (!exists) {
                this._applySessionState({
                    ...this.sessionState,
                    members: [
                        ...this.sessionState.members,
                        {
                            peerId,
                            actorId: String(msg.name || peerId).trim(),
                            name: String(msg.name || peerId).trim(),
                            role: peerId === this.sessionState.hostPeerId ? 'host' : 'client',
                            ready: false,
                            joinedAt: now,
                            lastSeenAt: now,
                        },
                    ],
                    updatedAt: now,
                    revision: Number(this.sessionState.revision || 0) + 1,
                });
            }
            break;
        }

        case SIGNALING_EVENT_TYPES.PLAYER_LEFT:
            this._applySessionState({
                ...this.sessionState,
                members: this.sessionState.members.filter((member) => member.peerId !== msg.peerId),
                updatedAt: Date.now(),
                revision: Number(this.sessionState.revision || 0) + 1,
            });
            break;

        case SIGNALING_EVENT_TYPES.PLAYER_READY:
            this._setReadyStateFor(msg.peerId, msg.ready === true);
            break;

        case SIGNALING_EVENT_TYPES.ERROR:
            this._emit('error', { message: msg.message });
            if (connectReject) {
                if (connectState?.rejected) break;
                if (connectState) {
                    connectState.rejected = true;
                }
                connectReject(new Error(`Signaling error: ${msg.message}`));
            }
            break;

        default:
            break;
        }
    }

    _send(data) {
        if (!data) return;
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(data));
        }
    }

    leave() {
        this._send(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.LEAVE));
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
        this.players = [];
        this.sessionState = createInitialLobbySessionState();
        this._emit('closed', {});
    }

    setReady(ready) {
        this._send(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.READY, { ready: ready === true }));
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        this._emit('settingsChanged', { settings: this.settings, sessionState: this.sessionState });
    }

    startMatch() {
        this._emit('matchStart', { players: this.players, settings: this.settings, sessionState: this.sessionState });
    }

    dispose() {
        this.leave();
        super.dispose();
    }
}
