// ============================================
// NetworkHud.js - ping, status, warnings overlay
// ============================================

/**
 * Displays network status in a small HUD corner overlay:
 * - Ping (color-coded: green <10ms, yellow 10-80ms, red >80ms)
 * - Player count
 * - Connection status indicator
 */
export class NetworkHud {
    constructor() {
        this._element = null;
        this._pingEl = null;
        this._playersEl = null;
        this._statusEl = null;
        this._visible = false;
    }

    create(container) {
        this._element = document.createElement('div');
        this._element.className = 'network-hud';
        this._element.style.cssText = `
            position: fixed; top: 8px; right: 8px; z-index: 900;
            background: rgba(0,0,0,0.6); color: white; padding: 6px 10px;
            border-radius: 4px; font-size: 12px; font-family: monospace;
            pointer-events: none; display: none;
        `;

        this._pingEl = document.createElement('div');
        this._playersEl = document.createElement('div');
        this._statusEl = document.createElement('div');

        this._element.appendChild(this._pingEl);
        this._element.appendChild(this._playersEl);
        this._element.appendChild(this._statusEl);

        (container || document.body).appendChild(this._element);
    }

    show() {
        if (this._element) {
            this._element.style.display = 'block';
            this._visible = true;
        }
    }

    hide() {
        if (this._element) {
            this._element.style.display = 'none';
            this._visible = false;
        }
    }

    update(stats) {
        if (!this._visible) return;

        const ping = stats.ping ?? 0;
        const players = stats.players ?? 0;
        const maxPlayers = stats.maxPlayers ?? 10;
        const connected = stats.connected ?? false;

        let pingColor = '#4caf50';
        if (ping > 80) pingColor = '#f44336';
        else if (ping > 10) pingColor = '#ff9800';

        if (this._pingEl) {
            this._pingEl.textContent = `Ping: ${ping}ms`;
            this._pingEl.style.color = pingColor;
        }
        if (this._playersEl) {
            this._playersEl.textContent = `Spieler: ${players}/${maxPlayers}`;
        }
        if (this._statusEl) {
            this._statusEl.innerHTML = connected
                ? '<span style="color:#4caf50">● Verbunden</span>'
                : '<span style="color:#f44336">● Getrennt</span>';
        }
    }

    dispose() {
        if (this._element?.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }
        this._element = null;
    }
}
