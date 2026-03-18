// ============================================
// OnlineMatchLobby.js - Internet lobby via WebSocket signaling
// ============================================

import { MatchLobby } from '../core/lobby/MatchLobby.js';

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
    }

    async create(options = {}) {
        this.isHost = true;
        this.settings = { ...options };
        this._signalingUrl = options.signalingUrl || this._signalingUrl;

        return new Promise((resolve, reject) => {
            this._ws = new WebSocket(this._signalingUrl);
            this._ws.onopen = () => {
                this._send({ type: 'create_lobby', maxPlayers: options.maxPlayers || 10 });
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
                this._send({ type: 'join_lobby', lobbyCode });
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
        case 'lobby_created':
            this.lobbyCode = msg.lobbyCode;
            this._playerId = msg.playerId;
            this.players = [{ id: this._playerId, name: 'Host', isHost: true, ready: true }];
            this._emit('playersChanged', { players: this.players });
            if (connectResolve) connectResolve();
            break;

        case 'lobby_joined':
            this._playerId = msg.playerId;
            if (connectResolve) connectResolve();
            break;

        case 'player_joined':
            this.players.push({ id: msg.peerId, name: msg.name || msg.peerId, isHost: false, ready: false });
            this._emit('playersChanged', { players: this.players });
            break;

        case 'player_left':
            this.players = this.players.filter((p) => p.id !== msg.peerId);
            this._emit('playersChanged', { players: this.players });
            break;

        case 'player_ready': {
            const player = this.players.find((p) => p.id === msg.peerId);
            if (player) player.ready = msg.ready;
            this._emit('playersChanged', { players: this.players });
            break;
        }

        case 'error':
            this._emit('error', { message: msg.message });
            break;
        }
    }

    _send(data) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(data));
        }
    }

    leave() {
        this._send({ type: 'leave' });
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
        this.players = [];
        this._emit('closed', {});
    }

    setReady(ready) {
        this._send({ type: 'ready', ready });
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        this._emit('settingsChanged', { settings: this.settings });
    }

    startMatch() {
        this._emit('matchStart', { players: this.players, settings: this.settings });
    }

    dispose() {
        this.leave();
        super.dispose();
    }
}
