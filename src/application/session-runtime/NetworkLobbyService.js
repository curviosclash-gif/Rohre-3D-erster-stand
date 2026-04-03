import { LANMatchLobby } from '../../network/LANMatchLobby.js';
import {
    createElectronDiscoveryIntentBridge,
    createElectronHostIntentBridge,
    getElectronPlatformCapabilitySnapshot,
} from '../../platform/electron/ElectronPlatformBridge.js';
import { buildMenuLifecycleEventPayload } from '../../ui/menu/MenuStateContracts.js';
import { resolveGlobalObject, toCallable } from '../../ui/menu/multiplayer/MenuMultiplayerBridgeRuntime.js';
import { createMenuMultiplayerDiscoveryPort } from '../../ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js';
import {
    createLobbyServiceDescriptor,
    LOBBY_SERVICE_EVENT_TYPES,
    LOBBY_SERVICE_TRANSPORTS,
    normalizeLobbyServiceTransport,
} from '../../shared/contracts/LobbyServiceContract.js';
import {
    buildSessionState,
    createIdleSessionState,
    deepClone,
    defaultJoinLobby,
    delay,
    normalizeLobbyCode,
    normalizeSignalingUrl,
    normalizeString,
    tryParseManualSignalingUrl,
} from './NetworkLobbyServiceSupport.js';

const DISCOVERY_POLL_INTERVAL_MS = 250;
const DISCOVERY_MAX_WAIT_MS = 3_000;

export class NetworkLobbyService {
    constructor(options = {}) {
        const runtimeGlobal = resolveGlobalObject(options.runtime?.global || null);
        this.transport = normalizeLobbyServiceTransport(options.transport, LOBBY_SERVICE_TRANSPORTS.LAN);
        this.bridgeKind = this.transport;
        this.contractVersion = normalizeString(options.contractVersion, 'lifecycle.v1');
        this.serviceDescriptor = createLobbyServiceDescriptor({
            transport: this.transport,
            providerKind: normalizeString(options.providerKind, `menu-${this.transport}`),
            lifecycleContractVersion: this.contractVersion,
            supportsConnectionContext: true,
            supportsDiscovery: options.supportsDiscovery !== false,
        });
        this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : null;
        this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
        this.onStateChanged = typeof options.onStateChanged === 'function' ? options.onStateChanged : null;
        this.onMatchStart = typeof options.onMatchStart === 'function' ? options.onMatchStart : null;
        this._runtime = options.runtime && typeof options.runtime === 'object' ? options.runtime : {};
        this._platformCapabilities = options.platformCapabilities && typeof options.platformCapabilities === 'object'
            ? options.platformCapabilities
            : getElectronPlatformCapabilitySnapshot(runtimeGlobal);
        this._hostIntentBridge = options.hostIntentBridge && typeof options.hostIntentBridge === 'object'
            ? options.hostIntentBridge
            : createElectronHostIntentBridge(runtimeGlobal);
        this._resolveHostSignalingUrlImpl = typeof options.resolveHostSignalingUrl === 'function'
            ? options.resolveHostSignalingUrl
            : null;
        this._resolveJoinSignalingUrlImpl = typeof options.resolveJoinSignalingUrl === 'function'
            ? options.resolveJoinSignalingUrl
            : null;
        this._joinLobbyImpl = typeof options.joinLobby === 'function' ? options.joinLobby : defaultJoinLobby;
        this._createLobby = typeof options.createLobby === 'function'
            ? options.createLobby
            : (signalingUrl) => new LANMatchLobby({ signalingUrl });
        this._events = [];
        this._actorId = '';
        this._signalingUrl = '';
        this._hostSettingsSnapshot = null;
        this._lobby = null;
        this._sessionState = createIdleSessionState('', this.transport);
        this._discoveryPort = options.discoveryPort === null
            ? null
            : (options.discoveryPort && typeof options.discoveryPort === 'object'
                ? options.discoveryPort
                : createMenuMultiplayerDiscoveryPort({
                    runtime: this._runtime,
                    discoveryRuntime: options.discoveryRuntime || createElectronDiscoveryIntentBridge(runtimeGlobal),
                }));
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
                transport: this.transport,
            });
            this.onStateChanged?.(this.getSessionState());
        });
        lobby.on('closed', () => {
            this._sessionState = createIdleSessionState('', this.transport);
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
        this._lobby = this._createLobby(this._signalingUrl, {
            transport: this.transport,
            runtime: this._runtime,
            platformCapabilities: this._platformCapabilities,
        });
        this._bindLobby(this._lobby);
    }

    async _resolveDefaultHostSignalingUrl() {
        const hostCapabilities = this._platformCapabilities?.host || null;
        const hostBridge = this._hostIntentBridge;
        const getLanServerStatus = toCallable(hostBridge?.getLanServerStatus || hostBridge?.getStatus, null);
        const startLanServer = toCallable(hostBridge?.startLanServer || hostBridge?.start, null);
        const status = getLanServerStatus ? await getLanServerStatus.call(hostBridge) : null;
        if (status?.running && status?.port) {
            return `http://localhost:${status.port}`;
        }
        if (startLanServer) {
            const started = await startLanServer.call(hostBridge);
            if (started?.running && started?.port) {
                return `http://localhost:${started.port}`;
            }
        }
        if (hostCapabilities?.available !== true) {
            return 'http://localhost:9090';
        }
        return 'http://localhost:9090';
    }

    async _resolveHostSignalingUrl() {
        if (this._resolveHostSignalingUrlImpl) {
            const resolved = await this._resolveHostSignalingUrlImpl({
                hostBridge: this._hostIntentBridge,
                platformCapabilities: this._platformCapabilities,
                transport: this.transport,
                normalizeSignalingUrl,
            });
            return normalizeSignalingUrl(resolved);
        }
        return this._resolveDefaultHostSignalingUrl();
    }

    async _resolveDefaultJoinSignalingUrl(lobbyCode, explicitSignalingUrl = '') {
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

    async _resolveJoinSignalingUrl(lobbyCode, explicitSignalingUrl = '') {
        if (this._resolveJoinSignalingUrlImpl) {
            const resolved = await this._resolveJoinSignalingUrlImpl({
                lobbyCode,
                explicitSignalingUrl,
                discoveryPort: this._discoveryPort,
                transport: this.transport,
                normalizeSignalingUrl,
                tryParseManualSignalingUrl,
            });
            return normalizeSignalingUrl(resolved);
        }
        return this._resolveDefaultJoinSignalingUrl(lobbyCode, explicitSignalingUrl);
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
        const event = this._emit(LOBBY_SERVICE_EVENT_TYPES.HOST, {
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
            await Promise.resolve(this._joinLobbyImpl(this._lobby, {
                signalingUrl,
                lobbyCode: requestedLobbyCode,
            }));
        } catch (error) {
            return this._fail(error instanceof Error ? error.message : 'Lobby konnte nicht beigetreten werden.', 'join_failed');
        }

        const sessionState = this.getSessionState();
        const event = this._emit(LOBBY_SERVICE_EVENT_TYPES.JOIN, {
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

        const event = this._emit(LOBBY_SERVICE_EVENT_TYPES.READY_TOGGLE, {
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
            const event = this._emit(LOBBY_SERVICE_EVENT_TYPES.READY_INVALIDATED, {
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
                transport: this.transport,
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
            const event = this._emit(LOBBY_SERVICE_EVENT_TYPES.MATCH_START, {
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
        this._sessionState = createIdleSessionState('', this.transport);
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
        return deepClone(this._sessionState) || createIdleSessionState('', this.transport);
    }

    getSnapshot() {
        return deepClone({
            lobbyCode: this._sessionState.lobbyCode,
            signalingUrl: this._signalingUrl,
            hostSettingsSnapshot: this._hostSettingsSnapshot,
            transport: this.transport,
        });
    }

    getConnectionContext() {
        return {
            isHost: this._sessionState.isHost === true,
            playerId: normalizeString(this._sessionState.peerId, ''),
            lobbyCode: this._sessionState.lobbyCode,
            signalingUrl: this._signalingUrl,
            transport: this.transport,
        };
    }

    getEvents() {
        return this._events.slice();
    }

    dispose() {
        this.leave({ silent: true });
    }
}

export class LanLobbyService extends NetworkLobbyService {
    constructor(options = {}) {
        super({
            ...options,
            transport: LOBBY_SERVICE_TRANSPORTS.LAN,
            providerKind: normalizeString(options.providerKind, 'menu-lan-lobby'),
            supportsDiscovery: true,
            createLobby: typeof options.createLobby === 'function'
                ? options.createLobby
                : (signalingUrl) => new LANMatchLobby({ signalingUrl }),
        });
    }
}
