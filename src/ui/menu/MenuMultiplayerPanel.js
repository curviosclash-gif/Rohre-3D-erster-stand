/**
 * MenuMultiplayerPanel.js — Host/Join UI component for Multiplayer.
 *
 * Uses MenuMultiplayerBridge for state management and MenuTextCatalog for all texts.
 * Bridge events: HOST, JOIN, READY_TOGGLE, READY_INVALIDATED, MATCH_START
 *
 * --- Manual Test Checklist ---
 * [ ] Menu navigation: Hauptmenue -> Multiplayer panel opens
 * [ ] Feature-Flag canHost=false hides "Spiel erstellen" button
 * [ ] Feature-Flag canHost=true shows "Spiel erstellen" button
 * [ ] Host flow: click "Spiel erstellen" -> lobby view with code + player list
 * [ ] Join flow: click "Spiel beitreten" -> code input shown, submit joins lobby
 * [ ] Join with invalid code -> error feedback shown
 * [ ] Ready toggle: click toggles local ready state
 * [ ] Match start: host clicks "Match starten" when all ready -> bridge.requestMatchStart()
 * [ ] Match start disabled when not all players ready
 * [ ] Leave lobby: click "Lobby verlassen" -> returns to multiplayer menu
 * [ ] Back button: returns to main menu
 * [ ] Lobby full (10 players): error.full message shown on join attempt
 * [ ] Connection error: error.connection message shown
 * [ ] Player list updates dynamically via BroadcastChannel
 * [ ] Responsive layout on touch/tablet devices
 */

import { resolveMenuCatalogText } from './MenuTextCatalog.js';
import { MENU_MULTIPLAYER_EVENT_TYPES } from './MenuMultiplayerBridge.js';
import { renderLobbyView, updateLobbyView, disposeLobbyView } from './MenuLobbyRenderer.js';

const MULTIPLAYER_MAX_PLAYERS = 10;

const PANEL_VIEW = Object.freeze({
    MENU: 'menu',
    HOST_LOBBY: 'host_lobby',
    JOIN_INPUT: 'join_input',
    JOIN_LOBBY: 'join_lobby',
});

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function t(textId, fallback) {
    return resolveMenuCatalogText(textId, fallback);
}

function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

function createButton(className, textContent, onClick) {
    const btn = createElement('button', className, textContent);
    btn.type = 'button';
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
}

export function createMultiplayerPanel(ctx) {
    const bridge = ctx.bridge;
    const container = ctx.container;
    const canHost = ctx.canHost === true;
    const onNavigateBack = typeof ctx.onNavigateBack === 'function' ? ctx.onNavigateBack : null;

    let currentView = PANEL_VIEW.MENU;
    let panelRoot = null;
    let lobbyContainer = null;
    let errorEl = null;
    let joinCodeInput = null;
    const bindings = [];

    function bind(el, event, handler) {
        el.addEventListener(event, handler);
        bindings.push({ el, event, handler });
    }

    function clearError() {
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('is-hidden');
        }
    }

    function showError(message) {
        if (errorEl) {
            errorEl.textContent = normalizeString(message, t('menu.multiplayer.error.connection', 'Verbindung fehlgeschlagen.'));
            errorEl.classList.remove('is-hidden');
        }
    }

    function switchView(view) {
        currentView = view;
        render();
    }

    function handleHost() {
        clearError();
        const result = bridge.host();
        if (!result.ok) {
            showError(result.message);
            return;
        }
        switchView(PANEL_VIEW.HOST_LOBBY);
    }

    function handleJoinSubmit() {
        clearError();
        const code = normalizeString(joinCodeInput?.value, '');
        if (!code) {
            showError(t('menu.multiplayer.error.connection', 'Verbindung fehlgeschlagen.'));
            return;
        }
        const state = bridge.getSessionState();
        if (state.memberCount >= MULTIPLAYER_MAX_PLAYERS) {
            showError(t('menu.multiplayer.error.full', 'Lobby ist voll (max. 10 Spieler).'));
            return;
        }
        const result = bridge.join({ lobbyCode: code });
        if (!result.ok) {
            if (result.code === 'lobby_not_found') {
                showError(t('menu.multiplayer.error.connection', 'Verbindung fehlgeschlagen.'));
            } else {
                showError(result.message);
            }
            return;
        }
        switchView(PANEL_VIEW.JOIN_LOBBY);
    }

    function handleLeave() {
        disposeLobbyView(lobbyContainer);
        bridge.leave();
        switchView(PANEL_VIEW.MENU);
    }

    function handleReady() {
        bridge.toggleReady();
    }

    function handleMatchStart() {
        const state = bridge.getSessionState();
        if (!state.canStart) return;
        bridge.requestMatchStart();
    }

    function renderMenuView(root) {
        const title = createElement('h2', 'submenu-title', t('menu.multiplayer.title', 'Multiplayer'));
        root.appendChild(title);

        if (canHost) {
            const hostBtn = createButton('nav-btn mp-host-btn', t('menu.multiplayer.host.label', 'Spiel erstellen'), handleHost);
            root.appendChild(hostBtn);
        }

        const joinBtn = createButton('nav-btn mp-join-btn', t('menu.multiplayer.join.label', 'Spiel beitreten'), () => {
            switchView(PANEL_VIEW.JOIN_INPUT);
        });
        root.appendChild(joinBtn);

        const backBtn = createButton('nav-btn mp-back-btn', t('menu.multiplayer.lobby.back', 'Zurueck'), () => {
            if (onNavigateBack) onNavigateBack();
        });
        root.appendChild(backBtn);
    }

    function renderJoinInputView(root) {
        const title = createElement('h2', 'submenu-title', t('menu.multiplayer.join.label', 'Spiel beitreten'));
        root.appendChild(title);

        const fieldWrap = createElement('div', 'mp-field-group');
        const label = createElement('label', 'mp-field-label', t('menu.multiplayer.lobby.code', 'Lobby-Code'));
        joinCodeInput = createElement('input', 'mp-code-input');
        joinCodeInput.type = 'text';
        joinCodeInput.maxLength = 32;
        joinCodeInput.placeholder = 'LOBBY-XXXX';
        joinCodeInput.autocomplete = 'off';
        joinCodeInput.spellcheck = false;
        fieldWrap.appendChild(label);
        fieldWrap.appendChild(joinCodeInput);
        root.appendChild(fieldWrap);

        bind(joinCodeInput, 'keydown', (e) => {
            if (e.key === 'Enter') handleJoinSubmit();
        });

        const submitBtn = createButton('nav-btn mp-join-submit-btn', t('menu.multiplayer.join.label', 'Spiel beitreten'), handleJoinSubmit);
        root.appendChild(submitBtn);

        const backBtn = createButton('nav-btn mp-back-btn', t('menu.multiplayer.lobby.back', 'Zurueck'), () => {
            switchView(PANEL_VIEW.MENU);
        });
        root.appendChild(backBtn);
    }

    function renderLobbyUI(root, isHost) {
        const state = bridge.getSessionState();

        lobbyContainer = createElement('div', 'mp-lobby-container');
        renderLobbyView(lobbyContainer, { sessionState: state, isHost });
        root.appendChild(lobbyContainer);

        const actionBar = createElement('div', 'mp-lobby-actions');

        const readyBtn = createButton(
            `nav-btn mp-ready-btn${state.localReady ? ' is-ready' : ''}`,
            t('menu.multiplayer.lobby.ready', 'Bereit'),
            handleReady,
        );
        actionBar.appendChild(readyBtn);

        if (isHost) {
            const startBtn = createButton('nav-btn mp-start-btn', t('menu.multiplayer.lobby.start', 'Match starten'), handleMatchStart);
            if (!state.canStart) startBtn.disabled = true;
            actionBar.appendChild(startBtn);
        }

        const leaveBtn = createButton('nav-btn mp-leave-btn', t('menu.multiplayer.lobby.leave', 'Lobby verlassen'), handleLeave);
        actionBar.appendChild(leaveBtn);

        root.appendChild(actionBar);
    }

    function render() {
        if (panelRoot) {
            panelRoot.innerHTML = '';
        } else {
            panelRoot = createElement('div', 'mp-panel');
            container.appendChild(panelRoot);
        }

        errorEl = createElement('div', 'menu-field-hint is-error is-hidden');
        panelRoot.appendChild(errorEl);

        switch (currentView) {
            case PANEL_VIEW.MENU:
                renderMenuView(panelRoot);
                break;
            case PANEL_VIEW.HOST_LOBBY:
                renderLobbyUI(panelRoot, true);
                break;
            case PANEL_VIEW.JOIN_INPUT:
                renderJoinInputView(panelRoot);
                break;
            case PANEL_VIEW.JOIN_LOBBY:
                renderLobbyUI(panelRoot, false);
                break;
        }
    }

    function handleStateChanged(sessionState) {
        if (!lobbyContainer) return;
        if (currentView === PANEL_VIEW.HOST_LOBBY || currentView === PANEL_VIEW.JOIN_LOBBY) {
            const isHost = currentView === PANEL_VIEW.HOST_LOBBY;
            updateLobbyView(lobbyContainer, { sessionState, isHost });

            const readyBtn = panelRoot?.querySelector('.mp-ready-btn');
            if (readyBtn) {
                readyBtn.classList.toggle('is-ready', sessionState.localReady);
            }
            const startBtn = panelRoot?.querySelector('.mp-start-btn');
            if (startBtn) {
                startBtn.disabled = !sessionState.canStart;
            }

            if (sessionState.memberCount >= MULTIPLAYER_MAX_PLAYERS) {
                showError(t('menu.multiplayer.error.full', 'Lobby ist voll (max. 10 Spieler).'));
            }
        }

        if (!sessionState.joined && (currentView === PANEL_VIEW.HOST_LOBBY || currentView === PANEL_VIEW.JOIN_LOBBY)) {
            switchView(PANEL_VIEW.MENU);
        }
    }

    function dispose() {
        for (const b of bindings) {
            b.el.removeEventListener(b.event, b.handler);
        }
        bindings.length = 0;
        disposeLobbyView(lobbyContainer);
        lobbyContainer = null;
        if (panelRoot && panelRoot.parentNode) {
            panelRoot.parentNode.removeChild(panelRoot);
        }
        panelRoot = null;
    }

    render();

    return Object.freeze({
        handleStateChanged,
        dispose,
        getCurrentView() { return currentView; },
    });
}
