/**
 * MenuLobbyRenderer.js — Lobby display component.
 *
 * Renders player list with ready status, ping display,
 * settings summary (map, mode, rounds), and handles
 * dynamic updates via BroadcastChannel events.
 */

import { resolveMenuCatalogText } from './MenuTextCatalog.js';

const MULTIPLAYER_CHANNEL_NAME = 'cuviosclash.multiplayer.v1';

function t(textId, fallback) {
    return resolveMenuCatalogText(textId, fallback);
}

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

function renderPlayerCard(member) {
    const card = createElement('div', `mp-player-card${member.ready ? ' is-ready' : ''}${member.isHost ? ' is-host' : ''}${member.isLocal ? ' is-local' : ''}`);

    const nameRow = createElement('div', 'mp-player-name');
    const roleLabel = member.isHost ? ' (Host)' : '';
    nameRow.textContent = `${normalizeString(member.actorId, 'Spieler')}${roleLabel}`;
    card.appendChild(nameRow);

    const statusRow = createElement('div', 'mp-player-status');
    const readyIndicator = createElement('span', `mp-ready-indicator${member.ready ? ' is-ready' : ''}`,
        member.ready ? '\u2713' : '\u2014');
    statusRow.appendChild(readyIndicator);
    card.appendChild(statusRow);

    return card;
}

function renderSettingsSummary(container, sessionState) {
    const summary = createElement('div', 'mp-settings-summary');
    const title = createElement('h3', 'mp-settings-title', t('menu.multiplayer.lobby.settings', 'Lobby-Einstellungen'));
    summary.appendChild(title);

    const settings = sessionState.members?.length > 0
        ? [
            { label: t('menu.multiplayer.lobby.map', 'Map'), value: '—' },
            { label: t('menu.multiplayer.lobby.mode', 'Modus'), value: '—' },
            { label: t('menu.multiplayer.lobby.rounds', 'Runden'), value: '—' },
        ]
        : [];

    for (const setting of settings) {
        const row = createElement('div', 'mp-settings-row');
        row.appendChild(createElement('span', 'mp-settings-label', setting.label));
        row.appendChild(createElement('span', 'mp-settings-value', setting.value));
        summary.appendChild(row);
    }

    container.appendChild(summary);
}

function renderPlayerList(container, sessionState) {
    const section = createElement('div', 'mp-player-list');
    const header = createElement('div', 'mp-player-list-header');
    header.appendChild(createElement('span', null, t('menu.multiplayer.lobby.players', 'Spieler')));
    header.appendChild(createElement('span', 'mp-player-count', `${sessionState.memberCount || 0} / 10`));
    section.appendChild(header);

    const members = Array.isArray(sessionState.members) ? sessionState.members : [];
    for (const member of members) {
        section.appendChild(renderPlayerCard(member));
    }

    if (members.length === 0) {
        const waiting = createElement('div', 'mp-waiting-message', t('menu.multiplayer.lobby.waiting', 'Warte auf Spieler…'));
        section.appendChild(waiting);
    }

    container.appendChild(section);
}

function renderCodeDisplay(container, sessionState) {
    const codeWrap = createElement('div', 'mp-lobby-code-display');
    const label = createElement('span', 'mp-code-label', t('menu.multiplayer.lobby.code', 'Lobby-Code'));
    const codeValue = createElement('span', 'mp-code-value', normalizeString(sessionState.lobbyCode, '—'));
    codeWrap.appendChild(label);
    codeWrap.appendChild(codeValue);
    container.appendChild(codeWrap);
}

function renderReadySummary(container, sessionState) {
    const readyWrap = createElement('div', 'mp-ready-summary');
    const readyText = `${sessionState.readyCount || 0} / ${sessionState.memberCount || 0} ${t('menu.multiplayer.lobby.ready', 'Bereit')}`;
    readyWrap.textContent = readyText;
    if (sessionState.allReady) readyWrap.classList.add('is-all-ready');
    container.appendChild(readyWrap);
}

const activeBroadcastChannels = new WeakMap();

export function renderLobbyView(container, options) {
    if (!container) return;
    const sessionState = options?.sessionState || {};
    container.innerHTML = '';

    renderCodeDisplay(container, sessionState);
    renderPlayerList(container, sessionState);
    renderReadySummary(container, sessionState);
    renderSettingsSummary(container, sessionState);

    if (!activeBroadcastChannels.has(container)) {
        try {
            const channel = new BroadcastChannel(MULTIPLAYER_CHANNEL_NAME);
            activeBroadcastChannels.set(container, channel);
        } catch {
            // BroadcastChannel not available.
        }
    }
}

export function updateLobbyView(container, options) {
    if (!container) return;
    const sessionState = options?.sessionState || {};
    container.innerHTML = '';

    renderCodeDisplay(container, sessionState);
    renderPlayerList(container, sessionState);
    renderReadySummary(container, sessionState);
    renderSettingsSummary(container, sessionState);
}

export function disposeLobbyView(container) {
    if (!container) return;
    const channel = activeBroadcastChannels.get(container);
    if (channel) {
        try { channel.close(); } catch { /* ignore */ }
        activeBroadcastChannels.delete(container);
    }
    container.innerHTML = '';
}
