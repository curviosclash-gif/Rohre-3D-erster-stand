import {
    MENU_LIFECYCLE_EVENT_CONTRACT_VERSION,
    buildMenuLifecycleEventPayload,
} from './MenuStateContracts.js';
import {
    createBroadcastChannelHandle,
    resolveEventTarget,
    resolveGlobalObject,
    resolveRuntimeTimer,
    resolveStorage,
    toCallable,
} from './multiplayer/MenuMultiplayerBridgeRuntime.js';
import { createRuntimeClock } from '../../shared/contracts/RuntimeClockContract.js';
import { createRuntimeRng } from '../../shared/contracts/RuntimeRngContract.js';

export const MENU_MULTIPLAYER_EVENT_TYPES = Object.freeze({
    HOST: 'multiplayer_host',
    JOIN: 'multiplayer_join',
    READY_TOGGLE: 'multiplayer_ready_toggle',
    READY_INVALIDATED: 'multiplayer_ready_invalidated',
    MATCH_START: 'multiplayer_match_start',
});

const MULTIPLAYER_SESSION_SCHEMA_VERSION = 'multiplayer-session.v1';
const MULTIPLAYER_STORAGE_KEY_PREFIX = 'cuviosclash.multiplayer.lobby.';
const MULTIPLAYER_PEER_SESSION_KEY = 'cuviosclash.multiplayer.peer.v1';
const MULTIPLAYER_CHANNEL_NAME = 'cuviosclash.multiplayer.v1';
const HEARTBEAT_INTERVAL_MS = 4000;
const MEMBER_STALE_AFTER_MS = 15000;
const MATCH_START_MAX_AGE_MS = 12000;
const MATCH_START_CLEAR_DELAY_MS = 2500;

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

function toTimestamp(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}
function deepClone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return null;
    }
}

function buildRuntimeId(nowProvider, randomProvider, randomLength = 6) {
    let rawNow = Number.NaN;
    try {
        rawNow = Number(toCallable(nowProvider, () => 0)());
    } catch {
        rawNow = Number.NaN;
    }
    const safeNow = Number.isFinite(rawNow) ? Math.max(0, Math.floor(rawNow)) : 0;
    let randomValue = Number.NaN;
    try {
        randomValue = Number(toCallable(randomProvider, () => 0.5)());
    } catch {
        randomValue = Number.NaN;
    }

    const normalizedRandom = Number.isFinite(randomValue)
        ? Math.abs(randomValue % 1)
        : 0.5;
    const randomToken = normalizedRandom
        .toString(36)
        .slice(2, 2 + randomLength)
        .padEnd(randomLength, '0');
    return `${safeNow.toString(36)}-${randomToken}`;
}

function createPeerId(nowProvider, randomProvider) {
    return `mp-${buildRuntimeId(nowProvider, randomProvider, 6)}`;
}

function ensurePeerId(providedPeerId, sessionStorage, nowProvider, randomProvider) {
    const normalizedProvidedPeerId = normalizeString(providedPeerId, '');
    if (normalizedProvidedPeerId) return normalizedProvidedPeerId;

    try {
        const stored = normalizeString(sessionStorage?.getItem?.(MULTIPLAYER_PEER_SESSION_KEY), '');
        if (stored) return stored;
    } catch {
        // Ignore sessionStorage lookup failures.
    }

    const nextPeerId = createPeerId(nowProvider, randomProvider);
    try {
        sessionStorage?.setItem?.(MULTIPLAYER_PEER_SESSION_KEY, nextPeerId);
    } catch {
        // Ignore sessionStorage persistence failures.
    }
    return nextPeerId;
}

function createLobbyStorageKey(lobbyCode) {
    const normalizedLobbyCode = normalizeLobbyCode(lobbyCode, '');
    return normalizedLobbyCode ? `${MULTIPLAYER_STORAGE_KEY_PREFIX}${normalizedLobbyCode}` : '';
}

function createIdleSessionState(peerId, lobbyCode = '') {
    return {
        peerId: normalizeString(peerId, ''),
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
        pendingMatchCommandId: '',
        members: [],
    };
}

function normalizeMemberSnapshot(member, fallbackRole, now) {
    const peerId = normalizeString(member?.peerId, '');
    if (!peerId) return null;
    const role = normalizeString(member?.role, fallbackRole) === 'host' ? 'host' : 'client';
    return {
        peerId,
        actorId: normalizeString(member?.actorId, role === 'host' ? 'host' : 'player'),
        role,
        ready: member?.ready === true,
        joinedAt: toTimestamp(member?.joinedAt, now),
        lastSeenAt: toTimestamp(member?.lastSeenAt, now),
    };
}

function pruneMembers(members, now) {
    if (!Array.isArray(members)) return [];
    return members.filter((member) => {
        const lastSeenAt = toTimestamp(member?.lastSeenAt, 0);
        return lastSeenAt > 0 && (now - lastSeenAt) <= MEMBER_STALE_AFTER_MS;
    });
}

function normalizeMembers(members, hostPeerId, now) {
    const hostId = normalizeString(hostPeerId, '');
    const normalizedMembers = pruneMembers(members, now)
        .map((member) => normalizeMemberSnapshot(member, member?.peerId === hostId ? 'host' : 'client', now))
        .filter(Boolean);

    if (normalizedMembers.length === 0) return [];

    const hostMember = normalizedMembers.find((member) => member.peerId === hostId) || normalizedMembers[0];
    return normalizedMembers
        .map((member) => ({
            ...member,
            role: member.peerId === hostMember.peerId ? 'host' : 'client',
        }))
        .sort((left, right) => {
            if (left.role !== right.role) return left.role === 'host' ? -1 : 1;
            if (left.joinedAt !== right.joinedAt) return left.joinedAt - right.joinedAt;
            return left.peerId.localeCompare(right.peerId);
        });
}

function normalizePendingMatchStart(command, now) {
    if (!command || typeof command !== 'object') return null;
    const commandId = normalizeString(command.commandId, '');
    if (!commandId) return null;
    return {
        commandId,
        lobbyCode: normalizeLobbyCode(command.lobbyCode, ''),
        hostPeerId: normalizeString(command.hostPeerId, ''),
        issuedAt: toTimestamp(command.issuedAt, now),
        settingsSnapshot: deepClone(command.settingsSnapshot),
    };
}

function normalizeSessionSnapshot(snapshot, now) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const lobbyCode = normalizeLobbyCode(snapshot.lobbyCode, '');
    if (!lobbyCode) return null;

    const normalizedMembers = normalizeMembers(snapshot.members, snapshot.hostPeerId, now);
    if (normalizedMembers.length === 0) return null;

    const hostMember = normalizedMembers.find((member) => member.role === 'host') || normalizedMembers[0];
    const hostPeerId = normalizeString(hostMember?.peerId, '');
    if (!hostPeerId) return null;

    return {
        schemaVersion: MULTIPLAYER_SESSION_SCHEMA_VERSION,
        lobbyCode,
        hostPeerId,
        hostActorId: normalizeString(snapshot.hostActorId, hostMember.actorId),
        updatedAt: toTimestamp(snapshot.updatedAt, now),
        revision: Math.max(0, Math.floor(Number(snapshot.revision) || 0)),
        members: normalizedMembers,
        hostSettingsSnapshot: deepClone(snapshot.hostSettingsSnapshot),
        pendingMatchStart: normalizePendingMatchStart(snapshot.pendingMatchStart, now),
    };
}

function deriveSessionState(snapshot, peerId) {
    if (!snapshot) return createIdleSessionState(peerId);

    const localPeerId = normalizeString(peerId, '');
    const localMember = snapshot.members.find((member) => member.peerId === localPeerId) || null;
    const readyCount = snapshot.members.filter((member) => member.ready === true).length;
    const allReady = snapshot.members.length > 0 && snapshot.members.every((member) => member.ready === true);
    const isHost = localMember?.peerId === snapshot.hostPeerId && localMember?.role === 'host';
    const joined = !!localMember;

    return {
        peerId: localPeerId,
        joined,
        connected: joined,
        lobbyCode: snapshot.lobbyCode,
        role: joined ? (isHost ? 'host' : 'client') : 'offline',
        isHost,
        localReady: localMember?.ready === true,
        memberCount: snapshot.members.length,
        readyCount,
        allReady,
        canStart: joined && isHost && snapshot.members.length >= 2 && allReady,
        hostPeerId: snapshot.hostPeerId,
        pendingMatchCommandId: normalizeString(snapshot.pendingMatchStart?.commandId, ''),
        members: snapshot.members.map((member) => ({
            ...member,
            isLocal: member.peerId === localPeerId,
            isHost: member.peerId === snapshot.hostPeerId,
        })),
    };
}

function generateLobbyCode(nowProvider, randomProvider) {
    const randomToken = buildRuntimeId(nowProvider, randomProvider, 4).split('-')[1] || '0000';
    return `LOBBY-${randomToken.toUpperCase()}`;
}

function readSnapshotFromStorage(storage, lobbyCode, now) {
    const storageKey = createLobbyStorageKey(lobbyCode);
    if (!storageKey || !storage?.getItem) return null;

    try {
        const raw = storage.getItem(storageKey);
        if (!raw) return null;
        return normalizeSessionSnapshot(JSON.parse(raw), now);
    } catch {
        return null;
    }
}

function persistSnapshotToStorage(storage, snapshot) {
    if (!storage) return;
    const storageKey = createLobbyStorageKey(snapshot?.lobbyCode || '');
    if (!storageKey) return;

    try {
        if (!snapshot || !Array.isArray(snapshot.members) || snapshot.members.length === 0) {
            storage.removeItem(storageKey);
            return;
        }
        storage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
        // Ignore localStorage persistence failures.
    }
}

export class MenuMultiplayerBridge {
    constructor(options = {}) {
        const runtime = options.runtime && typeof options.runtime === 'object' ? options.runtime : {};
        const runtimeGlobal = resolveGlobalObject(runtime.global || null);
        const runtimeClock = createRuntimeClock({
            nowMs: options.now || runtime.now,
            runtime: runtimeGlobal,
        });
        const runtimeRng = createRuntimeRng({
            random: options.random || runtime.random,
        });

        this.contractVersion = normalizeString(options.contractVersion, MENU_LIFECYCLE_EVENT_CONTRACT_VERSION);
        this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : null;
        this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
        this.onStateChanged = typeof options.onStateChanged === 'function' ? options.onStateChanged : null;
        this.onMatchStart = typeof options.onMatchStart === 'function' ? options.onMatchStart : null;

        this._events = [];
        this._clock = runtimeClock;
        this._rng = runtimeRng;
        this._now = runtimeClock.nowMs;
        this._random = runtimeRng.next;
        this._eventTarget = resolveEventTarget(runtime.eventTarget || runtimeGlobal);
        this._setInterval = resolveRuntimeTimer(runtime.setInterval, runtimeGlobal, 'setInterval');
        this._clearInterval = resolveRuntimeTimer(runtime.clearInterval, runtimeGlobal, 'clearInterval');
        this._setTimeout = resolveRuntimeTimer(runtime.setTimeout, runtimeGlobal, 'setTimeout');
        this._clearTimeout = resolveRuntimeTimer(runtime.clearTimeout, runtimeGlobal, 'clearTimeout');
        this._storage = resolveStorage(options.storage, 'localStorage', runtimeGlobal);
        this._sessionStorage = resolveStorage(options.sessionStorage, 'sessionStorage', runtimeGlobal);
        this._peerId = ensurePeerId(options.peerId, this._sessionStorage, this._now, this._random);
        this._channel = createBroadcastChannelHandle(runtime.createBroadcastChannel, runtimeGlobal, MULTIPLAYER_CHANNEL_NAME);
        this._activeLobbyCode = '';
        this._sessionSnapshot = null;
        this._sessionState = createIdleSessionState(this._peerId);
        this._lastHandledMatchCommandId = '';
        this._heartbeatTimer = null;
        this._pendingMatchClearTimer = null;

        this._boundStorageHandler = (event) => this._handleStorageEvent(event);
        this._boundBeforeUnload = () => this.dispose();
        this._boundChannelHandler = (event) => this._handleBroadcastChannelMessage(event);

        this._eventTarget?.addEventListener?.('storage', this._boundStorageHandler);
        this._eventTarget?.addEventListener?.('beforeunload', this._boundBeforeUnload);
        this._channel?.addEventListener?.('message', this._boundChannelHandler);
    }

    _emit(eventType, payload = null) {
        const event = buildMenuLifecycleEventPayload(eventType, {
            contractVersion: this.contractVersion,
            channel: 'multiplayer',
            payload: payload && typeof payload === 'object' ? { ...payload } : {},
        });
        event.timestampMs = this._now();
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

    _getSnapshot(lobbyCode = this._activeLobbyCode) {
        const resolvedLobbyCode = normalizeLobbyCode(lobbyCode, '');
        if (!resolvedLobbyCode) return null;
        return readSnapshotFromStorage(this._storage, resolvedLobbyCode, this._now());
    }

    _announceSnapshotChange(lobbyCode, reason, revision) {
        if (!this._channel?.postMessage) return;
        try {
            this._channel.postMessage({
                type: 'multiplayer_snapshot_changed',
                lobbyCode,
                reason: normalizeString(reason, 'updated'),
                revision: Math.max(0, Math.floor(Number(revision) || 0)),
                sourcePeerId: this._peerId,
            });
        } catch {
            // Ignore BroadcastChannel delivery failures.
        }
    }

    _syncStateFromSnapshot(snapshot, options = {}) {
        const nextSnapshot = snapshot ? normalizeSessionSnapshot(snapshot, this._now()) : null;
        const previousLobbyCode = this._activeLobbyCode;

        this._sessionSnapshot = nextSnapshot;
        this._activeLobbyCode = nextSnapshot?.lobbyCode || '';
        this._sessionState = deriveSessionState(nextSnapshot, this._peerId);

        if (this._sessionState.joined) {
            this._startHeartbeat();
        } else {
            this._stopHeartbeat();
            if (!nextSnapshot && previousLobbyCode && options.preserveLobbyCode === true) {
                this._sessionState = createIdleSessionState(this._peerId, previousLobbyCode);
            }
        }

        this.onStateChanged?.(this.getSessionState());

        const pendingMatchStart = nextSnapshot?.pendingMatchStart || null;
        if (pendingMatchStart && this._shouldHandleMatchStartCommand(pendingMatchStart)) {
            this._lastHandledMatchCommandId = pendingMatchStart.commandId;
            this.onMatchStart?.(deepClone(pendingMatchStart), this.getSessionState());
        }
    }

    _persistSnapshot(snapshot, reason, options = {}) {
        const nextSnapshot = snapshot ? normalizeSessionSnapshot({
            ...snapshot,
            updatedAt: this._now(),
            revision: Math.max(0, Math.floor(Number(snapshot?.revision) || 0)) + 1,
        }, this._now()) : null;

        persistSnapshotToStorage(this._storage, nextSnapshot);
        this._syncStateFromSnapshot(nextSnapshot, options);
        if (nextSnapshot?.lobbyCode) {
            this._announceSnapshotChange(nextSnapshot.lobbyCode, reason, nextSnapshot.revision);
        } else if (options.previousLobbyCode) {
            this._announceSnapshotChange(options.previousLobbyCode, reason, 0);
        }
        return nextSnapshot;
    }

    _updateActiveSnapshot(mutator, reason, options = {}) {
        const activeLobbyCode = normalizeLobbyCode(options.lobbyCode || this._activeLobbyCode, '');
        if (!activeLobbyCode) return null;
        const currentSnapshot = this._getSnapshot(activeLobbyCode);
        const nextSnapshot = mutator(currentSnapshot ? deepClone(currentSnapshot) : null);
        return this._persistSnapshot(nextSnapshot, reason, {
            previousLobbyCode: activeLobbyCode,
            preserveLobbyCode: options.preserveLobbyCode === true,
        });
    }

    _startHeartbeat() {
        if (this._heartbeatTimer || typeof this._setInterval !== 'function') return;
        this._heartbeatTimer = this._setInterval(() => {
            this._updateHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);
    }

    _stopHeartbeat() {
        if (!this._heartbeatTimer) return;
        if (typeof this._clearInterval === 'function') {
            this._clearInterval(this._heartbeatTimer);
        }
        this._heartbeatTimer = null;
    }

    _updateHeartbeat() {
        if (!this._activeLobbyCode) return;
        this._updateActiveSnapshot((snapshot) => {
            if (!snapshot) return null;
            const now = this._now();
            const members = Array.isArray(snapshot.members) ? snapshot.members : [];
            const hasLocalMember = members.some((member) => member?.peerId === this._peerId);
            if (!hasLocalMember) return snapshot;
            return {
                ...snapshot,
                members: members.map((member) => (
                    member?.peerId === this._peerId
                        ? { ...member, lastSeenAt: now }
                        : member
                )),
            };
        }, 'heartbeat');
    }

    _shouldHandleMatchStartCommand(command) {
        if (!this._sessionState.joined) return false;
        const commandId = normalizeString(command?.commandId, '');
        if (!commandId || commandId === this._lastHandledMatchCommandId) return false;
        const issuedAt = toTimestamp(command?.issuedAt, 0);
        if (issuedAt <= 0) return false;
        return (this._now() - issuedAt) <= MATCH_START_MAX_AGE_MS;
    }

    _schedulePendingMatchCommandClear(lobbyCode, commandId) {
        if (this._pendingMatchClearTimer) {
            if (typeof this._clearTimeout === 'function') {
                this._clearTimeout(this._pendingMatchClearTimer);
            }
            this._pendingMatchClearTimer = null;
        }
        const clearPendingCommand = () => {
            this._pendingMatchClearTimer = null;
            this._updateActiveSnapshot((snapshot) => {
                if (!snapshot) return null;
                if (normalizeLobbyCode(snapshot.lobbyCode, '') !== normalizeLobbyCode(lobbyCode, '')) return snapshot;
                const activeCommandId = normalizeString(snapshot.pendingMatchStart?.commandId, '');
                if (activeCommandId !== normalizeString(commandId, '')) return snapshot;
                return {
                    ...snapshot,
                    pendingMatchStart: null,
                };
            }, 'match_start_cleared');
        };

        if (typeof this._setTimeout !== 'function') {
            clearPendingCommand();
            return;
        }
        this._pendingMatchClearTimer = this._setTimeout(clearPendingCommand, MATCH_START_CLEAR_DELAY_MS);
    }

    _handleStorageEvent(event) {
        const changedKey = normalizeString(event?.key, '');
        if (!changedKey.startsWith(MULTIPLAYER_STORAGE_KEY_PREFIX)) return;
        const activeStorageKey = createLobbyStorageKey(this._activeLobbyCode);
        if (!activeStorageKey || changedKey !== activeStorageKey) return;
        this._syncStateFromSnapshot(this._getSnapshot(this._activeLobbyCode), {
            preserveLobbyCode: false,
        });
    }

    _handleBroadcastChannelMessage(event) {
        const data = event?.data && typeof event.data === 'object' ? event.data : null;
        if (!data || data.type !== 'multiplayer_snapshot_changed') return;
        const lobbyCode = normalizeLobbyCode(data.lobbyCode, '');
        if (!lobbyCode || lobbyCode !== this._activeLobbyCode) return;
        const sourcePeerId = normalizeString(data.sourcePeerId, '');
        if (sourcePeerId && sourcePeerId === this._peerId) return;
        this._syncStateFromSnapshot(this._getSnapshot(lobbyCode), {
            preserveLobbyCode: false,
        });
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

    leave(options = {}) {
        const previousLobbyCode = this._activeLobbyCode;
        if (!previousLobbyCode) {
            this._syncStateFromSnapshot(null);
            return { ok: true, sessionState: this.getSessionState() };
        }

        const silent = options?.silent === true;
        const previousState = this.getSessionState();
        this._persistSnapshot((() => {
            const snapshot = this._getSnapshot(previousLobbyCode);
            if (!snapshot) return null;
            const remainingMembers = snapshot.members.filter((member) => member.peerId !== this._peerId);
            if (remainingMembers.length === 0) {
                return null;
            }
            if (snapshot.hostPeerId === this._peerId) {
                return null;
            }
            return {
                ...snapshot,
                members: remainingMembers,
            };
        })(), 'leave', {
            previousLobbyCode,
            preserveLobbyCode: false,
        });
        this._syncStateFromSnapshot(null);
        if (!silent) {
            this._setStatus(`Lobby verlassen: ${previousLobbyCode}`);
        }
        return {
            ok: true,
            previousState,
            sessionState: this.getSessionState(),
        };
    }

    host(options = {}) {
        const actorId = normalizeString(options.actorId, 'host');
        const requestedLobbyCode = normalizeLobbyCode(options.lobbyCode, generateLobbyCode(this._now, this._random));
        if (this._activeLobbyCode && this._activeLobbyCode !== requestedLobbyCode) {
            this.leave({ silent: true });
        }

        const existingSnapshot = this._getSnapshot(requestedLobbyCode);
        const existingHostPeerId = normalizeString(existingSnapshot?.hostPeerId, '');
        if (existingHostPeerId && existingHostPeerId !== this._peerId) {
            return this._fail(`Lobby bereits aktiv: ${requestedLobbyCode}`, 'lobby_taken');
        }

        const now = this._now();
        const preservedMembers = Array.isArray(existingSnapshot?.members)
            ? existingSnapshot.members
                .filter((member) => member.peerId !== this._peerId)
                .map((member) => ({
                    ...member,
                    role: 'client',
                    ready: false,
                    lastSeenAt: now,
                }))
            : [];
        const nextSnapshot = {
            schemaVersion: MULTIPLAYER_SESSION_SCHEMA_VERSION,
            lobbyCode: requestedLobbyCode,
            hostPeerId: this._peerId,
            hostActorId: actorId,
            revision: existingSnapshot?.revision || 0,
            updatedAt: now,
            members: [
                {
                    peerId: this._peerId,
                    actorId,
                    role: 'host',
                    ready: false,
                    joinedAt: now,
                    lastSeenAt: now,
                },
                ...preservedMembers,
            ],
            hostSettingsSnapshot: deepClone(existingSnapshot?.hostSettingsSnapshot),
            pendingMatchStart: null,
        };
        const persistedSnapshot = this._persistSnapshot(nextSnapshot, 'host');
        this._setStatus(`Lobby erstellt: ${requestedLobbyCode}`);
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.HOST, {
            actorId,
            lobbyCode: requestedLobbyCode,
            mode: 'host',
            peerId: this._peerId,
        });
        return {
            ok: true,
            lobbyCode: requestedLobbyCode,
            event,
            sessionState: this.getSessionState(),
            snapshot: deepClone(persistedSnapshot),
        };
    }

    join(options = {}) {
        const actorId = normalizeString(options.actorId, 'player');
        const requestedLobbyCode = normalizeLobbyCode(options.lobbyCode, '');
        if (!requestedLobbyCode) {
            return this._fail('Lobby-Code fehlt.', 'missing_lobby_code');
        }
        if (this._activeLobbyCode && this._activeLobbyCode !== requestedLobbyCode) {
            this.leave({ silent: true });
        }

        const existingSnapshot = this._getSnapshot(requestedLobbyCode);
        if (!existingSnapshot?.hostPeerId) {
            return this._fail(`Lobby nicht gefunden: ${requestedLobbyCode}`, 'lobby_not_found');
        }

        const now = this._now();
        const existingLocalMember = existingSnapshot.members.find((member) => member.peerId === this._peerId);
        const nextSnapshot = {
            ...existingSnapshot,
            members: [
                ...existingSnapshot.members.filter((member) => member.peerId !== this._peerId),
                {
                    peerId: this._peerId,
                    actorId,
                    role: existingSnapshot.hostPeerId === this._peerId ? 'host' : 'client',
                    ready: false,
                    joinedAt: existingLocalMember?.joinedAt || now,
                    lastSeenAt: now,
                },
            ],
        };
        const persistedSnapshot = this._persistSnapshot(nextSnapshot, 'join');
        if (!persistedSnapshot) {
            return this._fail(`Lobby nicht verfuegbar: ${requestedLobbyCode}`, 'lobby_not_found');
        }

        this._setStatus(`Lobby beigetreten: ${requestedLobbyCode}`);
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.JOIN, {
            actorId,
            lobbyCode: requestedLobbyCode,
            mode: 'join',
            peerId: this._peerId,
        });
        return {
            ok: true,
            lobbyCode: requestedLobbyCode,
            event,
            sessionState: this.getSessionState(),
            snapshot: deepClone(persistedSnapshot),
        };
    }

    toggleReady(options = {}) {
        if (!this._activeLobbyCode) {
            return this._fail('Noch keiner Lobby beigetreten.', 'not_in_lobby');
        }

        const existingSnapshot = this._getSnapshot(this._activeLobbyCode);
        if (!existingSnapshot) {
            return this._fail('Lobby nicht mehr verfuegbar.', 'lobby_not_found');
        }

        const localMember = existingSnapshot.members.find((member) => member.peerId === this._peerId);
        if (!localMember) {
            return this._fail('Noch keiner Lobby beigetreten.', 'not_in_lobby');
        }

        const actorId = normalizeString(options.actorId, localMember.actorId || 'player');
        const ready = typeof options.ready === 'boolean' ? options.ready : !localMember.ready;
        const persistedSnapshot = this._persistSnapshot({
            ...existingSnapshot,
            members: existingSnapshot.members.map((member) => (
                member.peerId === this._peerId
                    ? {
                        ...member,
                        actorId,
                        ready,
                        lastSeenAt: this._now(),
                    }
                    : member
            )),
        }, 'ready_toggle');
        this._setStatus(ready ? 'Ready gesetzt' : 'Ready entfernt');
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.READY_TOGGLE, {
            actorId,
            ready,
            lobbyCode: this._activeLobbyCode,
            peerId: this._peerId,
        });
        return {
            ok: true,
            ready,
            event,
            sessionState: this.getSessionState(),
            snapshot: deepClone(persistedSnapshot),
        };
    }

    invalidateReadyForAll(reason = 'host_settings_changed') {
        if (!this._activeLobbyCode) return null;
        const existingSnapshot = this._getSnapshot(this._activeLobbyCode);
        if (!existingSnapshot || existingSnapshot.hostPeerId !== this._peerId) return null;

        const hadReady = existingSnapshot.members.some((member) => member.ready === true);
        if (!hadReady) return null;

        const persistedSnapshot = this._persistSnapshot({
            ...existingSnapshot,
            members: existingSnapshot.members.map((member) => ({
                ...member,
                ready: false,
                lastSeenAt: member.peerId === this._peerId ? this._now() : member.lastSeenAt,
            })),
        }, 'ready_invalidated');
        this._setStatus('Ready-Status zurueckgesetzt (Host-Aenderung)');
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.READY_INVALIDATED, {
            reason: normalizeString(reason, 'host_settings_changed'),
            lobbyCode: this._activeLobbyCode,
            peerId: this._peerId,
        });
        return {
            ok: true,
            event,
            sessionState: this.getSessionState(),
            snapshot: deepClone(persistedSnapshot),
        };
    }

    syncActorIdentity(actorId) {
        const normalizedActorId = normalizeString(actorId, '');
        if (!normalizedActorId || !this._activeLobbyCode) return null;

        return this._updateActiveSnapshot((snapshot) => {
            if (!snapshot) return null;
            const hasLocalMember = snapshot.members.some((member) => member.peerId === this._peerId);
            if (!hasLocalMember) return snapshot;
            return {
                ...snapshot,
                hostActorId: snapshot.hostPeerId === this._peerId
                    ? normalizedActorId
                    : snapshot.hostActorId,
                members: snapshot.members.map((member) => (
                    member.peerId === this._peerId
                        ? {
                            ...member,
                            actorId: normalizedActorId,
                            lastSeenAt: this._now(),
                        }
                        : member
                )),
            };
        }, 'identity_sync');
    }

    publishHostSettings(settingsSnapshot) {
        if (!this._activeLobbyCode) return null;
        const existingSnapshot = this._getSnapshot(this._activeLobbyCode);
        if (!existingSnapshot || existingSnapshot.hostPeerId !== this._peerId) return null;

        return this._persistSnapshot({
            ...existingSnapshot,
            hostActorId: existingSnapshot.hostActorId,
            hostSettingsSnapshot: deepClone(settingsSnapshot),
        }, 'host_settings_sync');
    }

    requestMatchStart(options = {}) {
        if (!this._activeLobbyCode) {
            return this._fail('Lobby fehlt.', 'not_in_lobby');
        }
        const existingSnapshot = this._getSnapshot(this._activeLobbyCode);
        if (!existingSnapshot) {
            return this._fail('Lobby nicht mehr verfuegbar.', 'lobby_not_found');
        }
        const sessionState = deriveSessionState(existingSnapshot, this._peerId);
        if (!sessionState.isHost) {
            return this._fail('Nur der Host kann starten.', 'host_required');
        }
        if (sessionState.memberCount < 2) {
            return this._fail('Mindestens zwei Teilnehmer werden benoetigt.', 'not_enough_members');
        }
        if (!sessionState.allReady) {
            return this._fail('Alle Teilnehmer muessen Ready sein.', 'members_not_ready');
        }

        const commandId = `match-${buildRuntimeId(this._now, this._random, 5)}`;
        const command = {
            commandId,
            lobbyCode: this._activeLobbyCode,
            hostPeerId: this._peerId,
            issuedAt: this._now(),
            settingsSnapshot: deepClone(options.settingsSnapshot),
        };
        const persistedSnapshot = this._persistSnapshot({
            ...existingSnapshot,
            hostSettingsSnapshot: deepClone(options.settingsSnapshot),
            pendingMatchStart: command,
        }, 'match_start');
        this._schedulePendingMatchCommandClear(this._activeLobbyCode, commandId);
        this._setStatus(`Match-Start an Lobby gesendet: ${this._activeLobbyCode}`);
        const event = this._emit(MENU_MULTIPLAYER_EVENT_TYPES.MATCH_START, {
            lobbyCode: this._activeLobbyCode,
            commandId,
            participantCount: sessionState.memberCount,
            peerId: this._peerId,
        });
        return {
            ok: true,
            commandId,
            event,
            sessionState: this.getSessionState(),
            snapshot: deepClone(persistedSnapshot),
        };
    }

    getPeerId() {
        return this._peerId;
    }

    getSessionState() {
        return deepClone(this._sessionState) || createIdleSessionState(this._peerId, this._activeLobbyCode);
    }

    getSnapshot() {
        return deepClone(this._sessionSnapshot);
    }

    getEvents() {
        return this._events.slice();
    }

    dispose() {
        this.leave({ silent: true });
        this._stopHeartbeat();
        if (this._pendingMatchClearTimer) {
            if (typeof this._clearTimeout === 'function') {
                this._clearTimeout(this._pendingMatchClearTimer);
            }
            this._pendingMatchClearTimer = null;
        }
        this._eventTarget?.removeEventListener?.('storage', this._boundStorageHandler);
        this._eventTarget?.removeEventListener?.('beforeunload', this._boundBeforeUnload);
        this._channel?.removeEventListener?.('message', this._boundChannelHandler);
        this._channel?.close?.();
    }
}
