// ============================================
// LANMatchLobby.js - LAN lobby via embedded signaling
// ============================================

import { MatchLobby } from '../core/lobby/MatchLobby.js';

/**
 * Lobby for LAN play. Communicates with the embedded LAN signaling server
 * running in the Electron/Tauri app main process.
 */
export class LANMatchLobby extends MatchLobby {
    constructor(options = {}) {
        super('lan');
        this._signalingUrl = options.signalingUrl || 'http://localhost:9090';
        this._pollingInterval = null;
    }

    async create(options = {}) {
        this.isHost = true;
        this.settings = { ...options };
        this.players = [{ id: 'host', name: 'Host', isHost: true, ready: true }];
        this._emit('playersChanged', { players: this.players });
        this._startPolling();

        // Get lobby code from signaling server
        try {
            const res = await fetch(`${this._signalingUrl}/lobby/status`);
            const data = await res.json();
            this.lobbyCode = data.lobbyCode;
        } catch {
            // Server may not be ready yet
        }
    }

    async join(codeOrAddress) {
        this.isHost = false;
        const url = codeOrAddress.includes('://') ? codeOrAddress : `http://${codeOrAddress}`;
        this._signalingUrl = url;

        const res = await fetch(`${this._signalingUrl}/lobby/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lobbyCode: this.lobbyCode }),
        });
        const data = await res.json();
        this.players.push({ id: data.playerId, name: data.playerId, isHost: false, ready: false });
        this._emit('playersChanged', { players: this.players });
    }

    _startPolling() {
        this._pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${this._signalingUrl}/lobby/status`);
                const data = await res.json();
                this.players = [
                    { id: 'host', name: 'Host', isHost: true, ready: true },
                    ...data.players.map((p) => ({
                        id: p.playerId,
                        name: p.playerId,
                        isHost: false,
                        ready: p.ready,
                    })),
                ];
                this._emit('playersChanged', { players: this.players });
            } catch {
                // polling failure
            }
        }, 2000);
    }

    leave() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
        this.players = [];
        this._emit('closed', {});
    }

    setReady(ready) {
        this._emit('readyChanged', { ready });
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
