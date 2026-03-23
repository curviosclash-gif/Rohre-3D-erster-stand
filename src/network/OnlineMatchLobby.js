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

    async create(options = {}) {
        this.isHost = true;
        this.settings = { ...options };
        this._signalingUrl = options.signalingUrl || this._signalingUrl;

        return new Promise((resolve, reject) => {
            this._ws = new WebSocket(this._signalingUrl);
            this._ws.onopen = () => {
                this._send(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.CREATE_LOBBY, {
                    maxPlayers: options.maxPlayers || 10,
                }));
            };
            this._ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg, resolve);
            };
            this._ws.onerror = () => reject(new Error('WebSocket connection failed'));
        });
    }

    async join(lobbyCode) {
        this.isHost = false;

        return new Promise((resolve, reject) => {
            this._ws = new WebSocket(this._signalingUrl);
            this._ws.onopen = () => {
                this._send(createSignalingEnvelope(SIGNALING_COMMAND_TYPES.JOIN_LOBBY, { lobbyCode }));
            };
            this._ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg, resolve);
            };
            this._ws.onerror = () => reject(new Error('WebSocket connection failed'));
        });
    }

    _handleMessage(msg, connectResolve) {
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
