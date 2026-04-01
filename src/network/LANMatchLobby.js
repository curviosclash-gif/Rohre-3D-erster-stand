// ============================================
// LANMatchLobby.js - LAN lobby via embedded signaling
// ============================================

import { createLogger } from '../shared/logging/Logger.js';
import { MatchLobby } from '../core/lobby/MatchLobby.js';

const logger = createLogger('LANMatchLobby');
import {
    createInitialLobbySessionState,
    normalizeLobbySessionState,
} from './MatchLobbySessionState.js';
import {
    SIGNALING_HTTP_ROUTES,
} from '../shared/contracts/SignalingSessionContract.js';

/**
 * Lobby for LAN play. Communicates with the embedded LAN signaling server
 * running in the Electron/Tauri app main process.
 */
export class LANMatchLobby extends MatchLobby {
    constructor(options = {}) {
        super('lan');
        this._signalingUrl = options.signalingUrl || 'http://localhost:9090';
        this._pollingInterval = null;
        this.sessionState = createInitialLobbySessionState();
        this._localPeerId = '';
        this._lastHandledMatchCommandId = '';
    }

    _applySessionState(nextState) {
        this.sessionState = normalizeLobbySessionState(nextState);
        this.lobbyCode = this.sessionState.lobbyCode;
        this.players = this.sessionState.players;
        this._emit('playersChanged', { players: this.players, sessionState: this.sessionState });
        this._emit('sessionStateChanged', { sessionState: this.sessionState });
    }

    async create(options = {}) {
        this.isHost = true;
        this.settings = { ...options };
        this._localPeerId = 'host';
        this._lastHandledMatchCommandId = '';

        const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_CREATE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxPlayers: Number(options.maxPlayers || 10) }),
        });
        if (res?.ok === false) {
            throw new Error(`Lobby create failed (${res.status || 'unknown'})`);
        }
        const data = await res.json();
        this._processServerStatus(data);
        this._startPolling();
        if (!this.sessionState.lobbyCode) {
            throw new Error('Lobby create failed: lobby code missing');
        }
    }

    async join(codeOrAddress) {
        const joinOptions = codeOrAddress && typeof codeOrAddress === 'object'
            ? codeOrAddress
            : { signalingUrl: codeOrAddress };
        this.isHost = false;
        if (joinOptions?.lobbyCode) {
            this.lobbyCode = String(joinOptions.lobbyCode || '').trim().toUpperCase();
        }
        const rawUrl = String(joinOptions?.signalingUrl || joinOptions?.address || '').trim();
        const url = rawUrl.includes('://')
            ? rawUrl
            : `http://${rawUrl}`;
        this._signalingUrl = url;
        this._lastHandledMatchCommandId = '';

        try {
            const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_JOIN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lobbyCode: this.lobbyCode }),
            });
            if (res?.ok === false) {
                throw new Error(`Lobby join failed (${res.status || 'unknown'})`);
            }
            const data = await res.json();
            this._localPeerId = String(data.playerId || '').trim();
            this._processServerStatus(data);
            this._startPolling();
        } catch (err) {
            logger.warn('Lobby join request failed:', err);
            throw err;
        }
    }

    _syncWithServerStatus(serverState = {}) {
        const status = serverState && typeof serverState === 'object' ? serverState : {};
        const existingMembers = Array.isArray(this.sessionState?.members) ? this.sessionState.members : [];
        const serverPlayers = Array.isArray(status.players) ? status.players : [];

        const merged = [];
        const hostPeerId = String(status.hostPeerId || this.sessionState.hostPeerId || 'host').trim() || 'host';
        const now = Date.now();

        const ensureMember = (player, fallbackRole = 'client') => {
            const peerId = String(player?.playerId || player?.peerId || player?.id || '').trim();
            if (!peerId) return;
            const existing = existingMembers.find((member) => member.peerId === peerId);
            merged.push({
                peerId,
                actorId: String(existing?.actorId || player?.name || (peerId === hostPeerId ? 'Host' : peerId)).trim(),
                name: String(player?.name || existing?.name || peerId).trim(),
                role: peerId === hostPeerId ? 'host' : fallbackRole,
                ready: player?.ready === true || existing?.ready === true,
                joinedAt: Number(existing?.joinedAt || now),
                lastSeenAt: now,
            });
        };

        ensureMember({ playerId: hostPeerId, name: 'Host', ready: status.hostReady === true }, 'host');
        for (const player of serverPlayers) {
            ensureMember(player, 'client');
        }

        this._applySessionState({
            lobbyCode: status.lobbyCode || this.sessionState.lobbyCode,
            hostPeerId,
            maxPlayers: Number(status.maxPlayers || this.sessionState.maxPlayers || 10),
            members: merged,
            updatedAt: now,
            revision: Number(this.sessionState.revision || 0) + 1,
        });
    }

    _processServerStatus(serverState = {}) {
        const status = serverState?.sessionState && typeof serverState.sessionState === 'object'
            ? serverState.sessionState
            : serverState;
        this._syncWithServerStatus(status);

        const pendingMatchStart = status?.pendingMatchStart && typeof status.pendingMatchStart === 'object'
            ? {
                ...status.pendingMatchStart,
                settingsSnapshot: status.pendingMatchStart.settingsSnapshot ?? null,
            }
            : null;
        const commandId = String(pendingMatchStart?.commandId || '').trim();
        if (commandId && commandId !== this._lastHandledMatchCommandId) {
            this._lastHandledMatchCommandId = commandId;
            this._emit('matchStart', {
                pendingMatchStart,
                players: this.players,
                settings: pendingMatchStart.settingsSnapshot ?? this.settings,
                sessionState: this.sessionState,
            });
        }
    }

    _startPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }
        this._pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_STATUS}`);
                const data = await res.json();
                this._processServerStatus(data);
            } catch (err) {
                logger.debug('Lobby status poll failed:', err);
            }
        }, 500);
    }

    leave() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }

        // Notify the LAN signaling server so the player slot is freed
        if (this._signalingUrl && this._localPeerId && this.isHost) {
            try {
                fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_CREATE}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ maxPlayers: Number(this.sessionState.maxPlayers || 10) }),
                }).catch((err) => { logger.debug('Host lobby reset failed:', err); });
            } catch (err) {
                logger.debug('Host lobby reset error:', err);
            }
        } else if (this._signalingUrl && this._localPeerId && !this.isHost) {
            try {
                fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_LEAVE}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId: this._localPeerId }),
                }).catch((err) => { logger.debug('Leave notification failed:', err); });
            } catch (err) {
                logger.debug('Leave notification error:', err);
            }
        }

        this.players = [];
        this.sessionState = createInitialLobbySessionState();
        this._lastHandledMatchCommandId = '';
        this._emit('closed', {});
    }

    async setReady(ready) {
        const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_READY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: this._localPeerId || 'host', ready: ready === true }),
        });
        if (res?.ok === false) {
            throw new Error(`Lobby ready failed (${res.status || 'unknown'})`);
        }
        const data = await res.json();
        this._processServerStatus(data);
        this._emit('readyChanged', { ready: ready === true, sessionState: this.sessionState });
        return data;
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        this._emit('settingsChanged', { settings: this.settings, sessionState: this.sessionState });
    }

    async invalidateReadyForAll() {
        const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_INVALIDATE_READY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostPeerId: this._localPeerId || 'host' }),
        });
        if (res?.ok === false) {
            throw new Error(`Lobby ready invalidation failed (${res.status || 'unknown'})`);
        }
        const data = await res.json();
        this._processServerStatus(data);
        return data;
    }

    async startMatch(options = {}) {
        const settingsSnapshot = options?.settingsSnapshot ?? this.settings ?? null;
        const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_MATCH_START}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settingsSnapshot }),
        });
        if (res?.ok === false) {
            throw new Error(`Lobby match start failed (${res.status || 'unknown'})`);
        }
        const data = await res.json();
        this._processServerStatus(data);
        return data;
    }

    getLocalPeerId() {
        return this._localPeerId;
    }

    getSignalingUrl() {
        return this._signalingUrl;
    }

    dispose() {
        this.leave();
        super.dispose();
    }
}
