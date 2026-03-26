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
        const createdAt = Date.now();
        this._localPeerId = 'host';
        this._applySessionState({
            lobbyCode: this.lobbyCode,
            hostPeerId: this._localPeerId,
            members: [{
                peerId: this._localPeerId,
                actorId: 'Host',
                name: 'Host',
                role: 'host',
                ready: true,
                joinedAt: createdAt,
                lastSeenAt: createdAt,
            }],
            maxPlayers: Number(options.maxPlayers || 10),
            updatedAt: createdAt,
        });
        this._startPolling();

        try {
            const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_STATUS}`);
            const data = await res.json();
            this._syncWithServerStatus(data);
        } catch (err) {
            logger.warn('Initial lobby status fetch failed (server may not be ready):', err);
        }
    }

    async join(codeOrAddress) {
        this.isHost = false;
        const url = String(codeOrAddress || '').includes('://')
            ? String(codeOrAddress)
            : `http://${String(codeOrAddress || '')}`;
        this._signalingUrl = url;

        const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_JOIN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lobbyCode: this.lobbyCode }),
        });
        const data = await res.json();
        this._localPeerId = String(data.playerId || '').trim();
        this._syncWithServerStatus(data);
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

        ensureMember({ playerId: hostPeerId, name: 'Host', ready: true }, 'host');
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

    _startPolling() {
        this._pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${this._signalingUrl}${SIGNALING_HTTP_ROUTES.LOBBY_STATUS}`);
                const data = await res.json();
                this._syncWithServerStatus(data);
            } catch (err) {
                logger.debug('Lobby status poll failed:', err);
            }
        }, 2000);
    }

    leave() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }

        // Notify the LAN signaling server so the player slot is freed
        if (this._signalingUrl && this._localPeerId && !this.isHost) {
            try {
                fetch(`${this._signalingUrl}/lobby/leave`, {
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
        this._emit('closed', {});
    }

    setReady(ready) {
        const nextMembers = this.sessionState.members.map((member) => (
            member.peerId === this._localPeerId
                ? { ...member, ready: ready === true, lastSeenAt: Date.now() }
                : member
        ));
        this._applySessionState({
            ...this.sessionState,
            members: nextMembers,
            updatedAt: Date.now(),
            revision: Number(this.sessionState.revision || 0) + 1,
        });
        this._emit('readyChanged', { ready: ready === true, sessionState: this.sessionState });
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
