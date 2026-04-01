import { LANMatchLobby } from '../../network/LANMatchLobby.js';
import { buildMenuLifecycleEventPayload } from '../../ui/menu/MenuStateContracts.js';
import { resolveGlobalObject, toCallable } from '../../ui/menu/multiplayer/MenuMultiplayerBridgeRuntime.js';
import { createMenuMultiplayerDiscoveryPort } from '../../ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js';

const MENU_MULTIPLAYER_EVENT_TYPES = Object.freeze({
    HOST: 'multiplayer_host',
    JOIN: 'multiplayer_join',
    READY_TOGGLE: 'multiplayer_ready_toggle',
    READY_INVALIDATED: 'multiplayer_ready_invalidated',
    MATCH_START: 'multiplayer_match_start',
});

const DISCOVERY_POLL_INTERVAL_MS = 250;
const DISCOVERY_MAX_WAIT_MS = 3_000;

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeLobbyCode(value, fallback = '') {
    const normalized = normalizeString(value, fallback)
        .toUpperCase()
        .replace(/[^A-Z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32);
    return normalized || fallback;
}

function deepClone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return null;
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function createIdleSessionState(lobbyCode = '') {
    return {
        peerId: '',
        joined: false,
        connected: false,
        lobbyCode: normalizeLobbyCode(lobbyCode, ''),
        role: 'offline',
        isHost: false,
        localReady: false,
        memberCount: 0,
        readyCount: 0,
        allReady: false,
        canStart: false,
        hostPeerId: '',
        hostConnected: false,
        pendingMatchCommandId: '',
        signalingUrl: '',
        transport: 'lan',
        members: [],
    };
}

function buildSessionState(lobbyState, options = {}) {
    const signalingUrl = normalizeString(options.signalingUrl, '');
    const localPeerId = normalizeString(options.localPeerId, '');
    const localActorId = normalizeString(options.actorId, '');
    if (!lobbyState || typeof lobbyState !== 'object') {
        return createIdleSessionState();
    }

    const members = Array.isArray(lobbyState.members) ? lobbyState.members : [];
    const hostPeerId = normalizeString(lobbyState.hostPeerId, '');
    const hostConnected = members.some((member) => normalizeString(member?.peerId, '') === hostPeerId);
    const normalizedMembers = members.map((member) => {
        const peerId = normalizeString(member?.peerId, '');
        const isLocal = peerId === localPeerId;
        return {
            ...member,
            actorId: isLocal && localActorId ? localActorId : normalizeString(member?.actorId, peerId || 'Spieler'),
            isLocal,
            isHost: peerId === hostPeerId,
        };
    });
    const localMember = normalizedMembers.find((member) => member.isLocal) || null;
    const joined = !!localMember;
    const isHost = joined && localMember.isHost === true;
    const memberCount = normalizedMembers.length;
    const readyCount = normalizedMembers.filter((member) => member.ready === true).length;
    const allReady = memberCount > 0 && readyCount === memberCount;

    return {
        peerId: localPeerId,
        joined,
        connected: joined && (isHost || hostConnected),
        lobbyCode: normalizeLobbyCode(lobbyState.lobbyCode, ''),
        role: joined ? (isHost ? 'host' : 'client') : 'offline',
        isHost,
        localReady: localMember?.ready === true,
        memberCount,
        readyCount,
        allReady,
        canStart: joined && isHost && hostConnected && memberCount >= 2 && allReady,
        hostPeerId,
        hostConnected,
        pendingMatchCommandId: normalizeString(lobbyState?.pendingMatchStart?.commandId, ''),
        signalingUrl,
        transport: 'lan',
        members: normalizedMembers,
    };
}

function normalizeSignalingUrl(value) {
    const text = normalizeString(value, '');
    if (!text) return '';
    if (text.includes('://')) return text;
    return `http://${text}`;
}

function tryParseManualSignalingUrl(rawValue) {
    const value = normalizeString(rawValue, '');
    if (!value) return '';
    if (value.includes('://')) return value;
    if (/^localhost(?::\d+)?$/i.test(value)) return normalizeSignalingUrl(value);
    if (/^\d{1,3}(\.\d{1,3}){3}(?::\d+)?$/.test(value)) return normalizeSignalingUrl(value);
    if (/^[a-z0-9.-]+:\d+$/i.test(value)) return normalizeSignalingUrl(value);
    return '';
}

export class LanMenuMultiplayerBridge {
    constructor(options = {}) {
        const runtimeGlobal = resolveGlobalObject(options.runtime?.global || null);
        this.bridgeKind = 'lan';
        this.contractVersion = normalizeString(options.contractVersion, 'lifecycle.v1');
        this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : null;
        this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
        this.onStateChanged = typeof options.onStateChanged === 'function' ? options.onStateChanged : null;
        this.onMatchStart = typeof options.onMatchStart === 'function' ? options.onMatchStart : null;
        this._runtimeGlobal = runtimeGlobal;
        this._runtime = options.runtime && typeof options.runtime === 'object' ? options.runtime : {};
        this._events = [];
        this._actorId = '';
        this._signalingUrl = '';
        this._hostSettingsSnapshot = null;
        this._lobby = null;
        this._sessionState = createIdleSessionState();
        this._discoveryPort = createMenuMultiplayerDiscoveryPort({
            runtime: this._runtime,
            discoveryRuntime: runtimeGlobal?.curviosApp,
        });
    }

    _emit(eventType, payload = null) {
        const event = buildMenuLifecycleEventPayload(eventType, {
            contractVersion: this.contractVersion,
            channel: 'multiplayer',
            payload: payload && typeof payload === 'object' ? { ...payload } : {},
        });
        event.timestampMs = Date.now();
        this._events.push(event);
        if (this._events.length > 60) {
            this._events.shift();
        }
        this.onEvent?.(event);
        return event;
    }

    _setStatus(message) {
        if (!message) return;
        this.onStatus?.(String(message));
    }

    _fail(message, code) {
        const normalizedMessage = normalizeString(message, 'Multiplayer-Aktion fehlgeschlagen.');
        this._setStatus(normalizedMessage);
        return {
            ok: false,
            code: normalizeString(code, 'multiplayer_error'),
            message: normalizedMessage,
            sessionState: this.getSessionState(),
        };
    }

    _bindLobby(lobby) {
        lobby.on('sessionStateChanged', ({ sessionState }) => {
            this._sessionState = buildSessionState(sessionState, {
                signalingUrl: this._signalingUrl,
                localPeerId: lobby.getLocalPeerId?.(),
                actorId: this._actorId,
            });
            this.onStateChanged?.(this.getSessionState());
        });
        lobby.on('closed', () => {
            this._sessionState = createIdleSessionState();
            this.onStateChanged?.(this.getSessionState());
        });
        lobby.on('matchStart', ({ pendingMatchStart }) => {
            this.onMatchStart?.(deepClone(pendingMatchStart), this.getSessionState());
        });
    }

    _replaceLobby(nextSignalingUrl) {
        if (this._lobby) {
            this._lobby.dispose?.();
        }
        this._signalingUrl = normalizeString(nextSignalingUrl, '');
        this._lobby = new LANMatchLobby({ signalingUrl: this._signalingUrl });
        this._bindLobby(this._lobby);
    }

    async _resolveHostSignalingUrl() {
        const appRuntime = this._runtimeGlobal?.curviosApp;
        const getLanServerStatus = toCallable(appRuntime?.getLanServerStatus, null);
        const startLanServer = toCallable(appRuntime?.startLanServer, null);
        const status = getLanServerStatus ? await getLanServerStatus.call(appRuntime) : null;
        if (status?.running && status?.port) {
            return `http://localhost:${status.port}`;
        }
        if (startLanServer) {
            const started = await startLanServer.call(appRuntime);
            if (started?.running && started?.port) {
                return `http://localhost:${started.port}`;
            }
        }
        return 'http://localhost:9090';
    }

    async _resolveJoinSignalingUrl(lobbyCode, explicitSignalingUrl = '') {
        const normalizedExplicitUrl = normalizeSignalingUrl(explicitSignalingUrl);
        if (normalizedExplicitUrl) return normalizedExplicitUrl;

        const manualAddress = tryParseManualSignalingUrl(lobbyCode);
        if (manualAddress) return manualAddress;

        if (!this._discoveryPort?.isAvailable?.()) {
            return '';
        }

        const normalizedLobbyCode = normalizeLobbyCode(lobbyCode, '');
        this._discoveryPort.start?.();
        try {
            const deadline = Date.now() + DISCOVERY_MAX_WAIT_MS;
            while (Date.now() <= deadline) {
                const hosts = await Promise.resolve(this._discoveryPort.getHosts?.());
                const match = Array.isArray(hosts)
                    ? hosts.find((host) => normalizeLobbyCode(host?.lobbyCode, '') === normalizedLobbyCode)
                    : null;
                if (match?.ip && match?.port) {
                    return `http://${match.ip}:${match.port}`;
                }
                await delay(DISCOVERY_POLL_INTERVAL_MS);
            }
        } finally {
            this._discoveryPort.stop?.();
        }

        return '';
    }

    async host(options = {}) {
        const actorId = normalizeString(options.actorId, 'Host');
        this._actorId = actorId;
        const signalingUrl = await this._resolveHostSignalingUrl();
        this._replaceLobby(signalingUrl);

        try {
            await this._lobby.create({
                maxPlayers: Number(options.maxPlayers || 10),
            });
        } catch (error) {
            return this._fail(error instanceof Error ? error.message : 'Lobby konnte nicht erstellt werden.', 'lobby_create_failed');
        }

        const sessionState = this.getSessionState();
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.HOST, {
            actorId,
            lobbyCode: sessionState.lobbyCode,
            mode: 'host',
            peerId: sessionState.peerId,
        });
        this._setStatus(`Lobby erstellt: ${sessionState.lobbyCode}`);
        return {
            ok: true,
            lobbyCode: sessionState.lobbyCode,
            event,
            sessionState,
            snapshot: this.getSnapshot(),
        };
    }

    async join(options = {}) {
        const actorId = normalizeString(options.actorId, 'Spieler');
        const requestedLobbyCode = normalizeLobbyCode(options.lobbyCode, '');
        if (!requestedLobbyCode) {
            return this._fail('Lobby-Code fehlt.', 'missing_lobby_code');
        }

        this._actorId = actorId;
        const signalingUrl = await this._resolveJoinSignalingUrl(requestedLobbyCode, options.signalingUrl);
        if (!signalingUrl) {
            return this._fail(`Lobby nicht gefunden: ${requestedLobbyCode}`, 'lobby_not_found');
        }

        this._replaceLobby(signalingUrl);

        try {
            await this._lobby.join({
                signalingUrl,
                lobbyCode: requestedLobbyCode,
            });
        } catch (error) {
            return this._fail(error instanceof Error ? error.message : 'Lobby konnte nicht beigetreten werden.', 'join_failed');
        }

        const sessionState = this.getSessionState();
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.JOIN, {
            actorId,
            lobbyCode: sessionState.lobbyCode,
            mode: 'join',
            peerId: sessionState.peerId,
        });
        this._setStatus(`Lobby beigetreten: ${sessionState.lobbyCode}`);
        return {
            ok: true,
            lobbyCode: sessionState.lobbyCode,
            event,
            sessionState,
            snapshot: this.getSnapshot(),
        };
    }

    async toggleReady(options = {}) {
        if (!this._lobby || !this._sessionState.joined) {
            return this._fail('Noch keiner Lobby beigetreten.', 'not_in_lobby');
        }

        const requestedReady = typeof options.ready === 'boolean'
            ? options.ready
            : !this._sessionState.localReady;
        try {
            await this._lobby.setReady(requestedReady);
        } catch (error) {
            return this._fail(error instanceof Error ? error.message : 'Ready-Status konnte nicht gesetzt werden.', 'ready_failed');
        }

        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.READY_TOGGLE, {
            actorId: normalizeString(options.actorId, this._actorId || 'Spieler'),
            lobbyCode: this._sessionState.lobbyCode,
            ready: requestedReady,
            peerId: this._sessionState.peerId,
        });
        this._setStatus(requestedReady ? 'Ready gesetzt' : 'Ready entfernt');
        return {
            ok: true,
            event,
            sessionState: this.getSessionState(),
            snapshot: this.getSnapshot(),
        };
    }

    invalidateReadyForAll(reason = 'host_settings_changed') {
        if (!this._lobby || !this._sessionState.isHost) return null;
        return Promise.resolve(this._lobby.invalidateReadyForAll()).then(() => {
            const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.READY_INVALIDATED, {
                reason: normalizeString(reason, 'host_settings_changed'),
                lobbyCode: this._sessionState.lobbyCode,
                peerId: this._sessionState.peerId,
            });
            this._setStatus('Ready-Status zurueckgesetzt (Host-Aenderung)');
            return {
                ok: true,
                event,
                sessionState: this.getSessionState(),
                snapshot: this.getSnapshot(),
            };
        }).catch(() => null);
    }

    syncActorIdentity(actorId) {
        this._actorId = normalizeString(actorId, this._actorId);
        if (this._sessionState.joined) {
            this._sessionState = buildSessionState(this._lobby?.sessionState, {
                signalingUrl: this._signalingUrl,
                localPeerId: this._lobby?.getLocalPeerId?.(),
                actorId: this._actorId,
            });
            this.onStateChanged?.(this.getSessionState());
        }
        return this.getSessionState();
    }

    publishHostSettings(settingsSnapshot) {
        this._hostSettingsSnapshot = deepClone(settingsSnapshot);
        this._lobby?.updateSettings?.(this._hostSettingsSnapshot);
        return this.getSnapshot();
    }

    requestMatchStart(options = {}) {
        if (!this._lobby || !this._sessionState.joined) {
            return this._fail('Lobby fehlt.', 'not_in_lobby');
        }
        if (!this._sessionState.isHost) {
            return this._fail('Nur der Host kann starten.', 'host_required');
        }
        if (this._sessionState.memberCount < 2) {
            return this._fail('Mindestens zwei Teilnehmer werden benoetigt.', 'not_enough_members');
        }
        if (!this._sessionState.allReady) {
            return this._fail('Alle Teilnehmer muessen Ready sein.', 'members_not_ready');
        }

        const settingsSnapshot = deepClone(options.settingsSnapshot ?? this._hostSettingsSnapshot);
        return Promise.resolve(this._lobby.startMatch({ settingsSnapshot })).then((response) => {
            const commandId = normalizeString(
                response?.pendingMatchStart?.commandId || response?.sessionState?.pendingMatchStart?.commandId,
                ''
            );
            const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.MATCH_START, {
                lobbyCode: this._sessionState.lobbyCode,
                commandId,
                participantCount: this._sessionState.memberCount,
                peerId: this._sessionState.peerId,
            });
            this._setStatus(`Match-Start an Lobby gesendet: ${this._sessionState.lobbyCode}`);
            return {
                ok: true,
                commandId,
                event,
                sessionState: this.getSessionState(),
                snapshot: this.getSnapshot(),
            };
        }).catch((error) => (
            this._fail(
                error instanceof Error ? error.message : 'Lobby-Start konnte nicht ausgeliefert werden.',
                'match_start_failed'
            )
        ));
    }

    leave(options = {}) {
        const previousState = this.getSessionState();
        const currentLobby = this._lobby;
        this._lobby = null;
        currentLobby?.dispose?.();
        this._signalingUrl = '';
        this._sessionState = createIdleSessionState();
        if (options?.silent !== true && previousState.lobbyCode) {
            this._setStatus(`Lobby verlassen: ${previousState.lobbyCode}`);
        }
        return {
            ok: true,
            previousState,
            sessionState: this.getSessionState(),
        };
    }

    getPeerId() {
        return normalizeString(this._sessionState.peerId, '');
    }

    getSessionState() {
        return deepClone(this._sessionState) || createIdleSessionState();
    }

    getSnapshot() {
        return deepClone({
            lobbyCode: this._sessionState.lobbyCode,
            signalingUrl: this._signalingUrl,
            hostSettingsSnapshot: this._hostSettingsSnapshot,
            transport: 'lan',
        });
    }

    getConnectionContext() {
        return {
            isHost: this._sessionState.isHost === true,
            playerId: normalizeString(this._sessionState.peerId, ''),
            lobbyCode: this._sessionState.lobbyCode,
            signalingUrl: this._signalingUrl,
            transport: 'lan',
        };
    }

    getEvents() {
        return this._events.slice();
    }

    dispose() {
        this.leave({ silent: true });
    }
}
