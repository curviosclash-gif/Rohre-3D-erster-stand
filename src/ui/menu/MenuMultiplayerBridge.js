import {
    MENU_LIFECYCLE_EVENT_CONTRACT_VERSION,
    buildMenuLifecycleEventPayload,
} from './MenuStateContracts.js';
import {
    hostMultiplayerLobby,
    invalidateMultiplayerReadyForAll,
    joinMultiplayerLobby,
    publishMultiplayerHostSettings,
    requestMultiplayerMatchStart,
    toggleReadyMultiplayerLobby,
} from './multiplayer/MenuMultiplayerBridgeMutations.js';
import {
    createBroadcastChannelHandle,
    resolveEventTarget,
    resolveGlobalObject,
    resolveRuntimeTimer,
    resolveStorage,
    toCallable,
} from './multiplayer/MenuMultiplayerBridgeRuntime.js';
import {
    extendMultiplayerPresenceLease,
    MENU_MULTIPLAYER_HEARTBEAT_INTERVAL_MS,
    normalizeMultiplayerMembers,
} from './multiplayer/MenuMultiplayerPresence.js';
import {
    acquireMenuMultiplayerSnapshotLock,
    persistMenuMultiplayerSnapshotWithCas,
    releaseMenuMultiplayerSnapshotLock,
    SNAPSHOT_CAS_MAX_RETRIES,
    SNAPSHOT_NOOP,
} from './multiplayer/MenuMultiplayerBridgeCas.js';
import { createRuntimeClock } from '../../shared/contracts/RuntimeClockContract.js';
import { createRuntimeRng } from '../../shared/contracts/RuntimeRngContract.js';
import { tryCloneJsonValue } from '../../shared/utils/JsonClone.js';

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
    return tryCloneJsonValue(value, null);
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

    const normalizedMembers = normalizeMultiplayerMembers(snapshot.members, snapshot.hostPeerId, now, {
        normalizeString,
        toTimestamp,
    });
    if (normalizedMembers.length === 0) return null;

    const declaredHostPeerId = normalizeString(snapshot.hostPeerId, '');
    const hostPeerId = declaredHostPeerId || normalizeString(normalizedMembers[0]?.peerId, '');
    if (!hostPeerId) return null;
    const hostMember = normalizedMembers.find((member) => member.peerId === hostPeerId) || null;

    return {
        schemaVersion: MULTIPLAYER_SESSION_SCHEMA_VERSION,
        lobbyCode,
        hostPeerId,
        hostActorId: normalizeString(snapshot.hostActorId, hostMember?.actorId || 'host'),
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
    const hostConnected = snapshot.members.some((member) => member.peerId === snapshot.hostPeerId);
    const readyCount = snapshot.members.filter((member) => member.ready === true).length;
    const allReady = hostConnected
        && snapshot.members.length > 0
        && snapshot.members.every((member) => member.ready === true);
    const isHost = localMember?.peerId === snapshot.hostPeerId && localMember?.role === 'host';
    const joined = !!localMember;

    return {
        peerId: localPeerId,
        joined,
        connected: joined && (isHost || hostConnected),
        lobbyCode: snapshot.lobbyCode,
        role: joined ? (isHost ? 'host' : 'client') : 'offline',
        isHost,
        localReady: localMember?.ready === true,
        memberCount: snapshot.members.length,
        readyCount,
        allReady,
        canStart: joined && isHost && hostConnected && snapshot.members.length >= 2 && allReady,
        hostPeerId: snapshot.hostPeerId,
        hostConnected,
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
        this._document = resolveEventTarget(runtime.document || runtimeGlobal?.document || null);
        this._activeLobbyCode = '';
        this._sessionSnapshot = null;
        this._sessionState = createIdleSessionState(this._peerId);
        this._lastHandledMatchCommandId = '';
        this._heartbeatTimer = null;
        this._pendingMatchClearTimer = null;

        this._boundStorageHandler = (event) => this._handleStorageEvent(event);
        this._boundBeforeUnload = () => this.dispose();
        this._boundChannelHandler = (event) => this._handleBroadcastChannelMessage(event);
        this._boundVisibilityHandler = () => this._handleVisibilityChange();
        this._boundResumeHandler = () => this._handleRuntimeResume();

        this._eventTarget?.addEventListener?.('storage', this._boundStorageHandler);
        this._eventTarget?.addEventListener?.('beforeunload', this._boundBeforeUnload);
        this._eventTarget?.addEventListener?.('focus', this._boundResumeHandler);
        this._eventTarget?.addEventListener?.('pageshow', this._boundResumeHandler);
        this._channel?.addEventListener?.('message', this._boundChannelHandler);
        this._document?.addEventListener?.('visibilitychange', this._boundVisibilityHandler);
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
        const expectedRevision = Number(options?.expectedRevision);
        const baseRevision = Number.isFinite(expectedRevision)
            ? Math.max(0, Math.floor(expectedRevision))
            : Math.max(0, Math.floor(Number(snapshot?.revision) || 0));
        const nextSnapshot = snapshot ? normalizeSessionSnapshot({
            ...snapshot,
            updatedAt: this._now(),
            revision: baseRevision + 1,
        }, this._now()) : null;

        if (!nextSnapshot && options.previousLobbyCode) {
            const previousStorageKey = createLobbyStorageKey(options.previousLobbyCode);
            if (previousStorageKey) {
                try {
                    this._storage?.removeItem?.(previousStorageKey);
                } catch {
                    // Ignore localStorage cleanup failures.
                }
            }
        } else {
            persistSnapshotToStorage(this._storage, nextSnapshot);
        }
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

        for (let attempt = 0; attempt < SNAPSHOT_CAS_MAX_RETRIES; attempt += 1) {
            const lockLease = acquireMenuMultiplayerSnapshotLock({
                storage: this._storage,
                lobbyCode: activeLobbyCode,
                peerId: this._peerId,
                nowProvider: this._now,
                randomProvider: this._random,
                buildRuntimeId,
                normalizeString,
                toTimestamp,
                createLobbyStorageKey,
            });
            if (!lockLease) continue;
            try {
                const currentSnapshot = this._getSnapshot(activeLobbyCode);
                const baseRevision = Math.max(0, Math.floor(Number(currentSnapshot?.revision) || 0));
                const nextSnapshot = mutator(currentSnapshot ? deepClone(currentSnapshot) : null, {
                    attempt,
                    baseRevision,
                });
                if (nextSnapshot === SNAPSHOT_NOOP) {
                    this._syncStateFromSnapshot(currentSnapshot, {
                        preserveLobbyCode: options.preserveLobbyCode === true,
                    });
                    return currentSnapshot;
                }
                const persistResult = persistMenuMultiplayerSnapshotWithCas({
                    normalizeLobbyCode,
                    lobbyCode: activeLobbyCode,
                    snapshot: nextSnapshot,
                    expectedRevision: baseRevision,
                    getSnapshot: (lobbyCode) => this._getSnapshot(lobbyCode),
                    persistSnapshot: (snapshot, persistOptions = {}) => this._persistSnapshot(snapshot, reason, {
                        ...persistOptions,
                        previousLobbyCode: activeLobbyCode,
                    }),
                    preserveLobbyCode: options.preserveLobbyCode === true,
                });
                if (persistResult.ok) {
                    return persistResult.snapshot;
                }
            } finally {
                releaseMenuMultiplayerSnapshotLock({
                    storage: this._storage,
                    lease: lockLease,
                    normalizeString,
                });
            }
        }

        const latestSnapshot = this._getSnapshot(activeLobbyCode);
        this._syncStateFromSnapshot(latestSnapshot, {
            preserveLobbyCode: options.preserveLobbyCode === true,
        });
        return latestSnapshot;
    }

    _startHeartbeat() {
        if (this._heartbeatTimer || typeof this._setInterval !== 'function') return;
        this._heartbeatTimer = this._setInterval(() => {
            this._updateHeartbeat();
        }, MENU_MULTIPLAYER_HEARTBEAT_INTERVAL_MS);
    }

    _stopHeartbeat() {
        if (!this._heartbeatTimer) return;
        if (typeof this._clearInterval === 'function') {
            this._clearInterval(this._heartbeatTimer);
        }
        this._heartbeatTimer = null;
    }

    _handleVisibilityChange() {
        const visibilityState = normalizeString(this._document?.visibilityState, 'visible');
        if (visibilityState === 'hidden') {
            this._updateHeartbeat();
            return;
        }
        this._handleRuntimeResume();
    }

    _handleRuntimeResume() {
        if (!this._activeLobbyCode) return;
        this._syncStateFromSnapshot(this._getSnapshot(this._activeLobbyCode), {
            preserveLobbyCode: true,
        });
        this._updateHeartbeat();
    }

    _updateHeartbeat() {
        if (!this._activeLobbyCode) return;
        this._updateActiveSnapshot((snapshot) => {
            if (!snapshot) return null;
            const now = this._now();
            const members = Array.isArray(snapshot.members) ? snapshot.members : [];
            const hasLocalMember = members.some((member) => member?.peerId === this._peerId);
            if (!hasLocalMember) return SNAPSHOT_NOOP;
            return {
                ...snapshot,
                members: members.map((member) => (
                    member?.peerId === this._peerId
                        ? extendMultiplayerPresenceLease(member, now)
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
                if (normalizeLobbyCode(snapshot.lobbyCode, '') !== normalizeLobbyCode(lobbyCode, '')) return SNAPSHOT_NOOP;
                const activeCommandId = normalizeString(snapshot.pendingMatchStart?.commandId, '');
                if (activeCommandId !== normalizeString(commandId, '')) return SNAPSHOT_NOOP;
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
        this._updateActiveSnapshot((snapshot) => {
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
        }, 'leave', {
            lobbyCode: previousLobbyCode,
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
        return hostMultiplayerLobby(this, options, {
            normalizeString,
            normalizeLobbyCode,
            generateLobbyCode,
            deepClone,
            sessionSchemaVersion: MULTIPLAYER_SESSION_SCHEMA_VERSION,
            eventTypes: MENU_MULTIPLAYER_EVENT_TYPES,
        });
    }

    join(options = {}) {
        return joinMultiplayerLobby(this, options, {
            normalizeString,
            normalizeLobbyCode,
            deepClone,
            eventTypes: MENU_MULTIPLAYER_EVENT_TYPES,
        });
    }

    toggleReady(options = {}) {
        return toggleReadyMultiplayerLobby(this, options, {
            normalizeString,
            deepClone,
            eventTypes: MENU_MULTIPLAYER_EVENT_TYPES,
        });
    }

    invalidateReadyForAll(reason = 'host_settings_changed') {
        return invalidateMultiplayerReadyForAll(this, reason, {
            normalizeString,
            deepClone,
            eventTypes: MENU_MULTIPLAYER_EVENT_TYPES,
        });
    }

    syncActorIdentity(actorId) {
        const normalizedActorId = normalizeString(actorId, '');
        if (!normalizedActorId || !this._activeLobbyCode) return null;

        return this._updateActiveSnapshot((snapshot) => {
            if (!snapshot) return null;
            const hasLocalMember = snapshot.members.some((member) => member.peerId === this._peerId);
            if (!hasLocalMember) return SNAPSHOT_NOOP;
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
        return publishMultiplayerHostSettings(this, settingsSnapshot, {
            deepClone,
        });
    }

    requestMatchStart(options = {}) {
        return requestMultiplayerMatchStart(this, options, {
            deriveSessionState,
            buildRuntimeId,
            deepClone,
            eventTypes: MENU_MULTIPLAYER_EVENT_TYPES,
        });
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
        this._eventTarget?.removeEventListener?.('focus', this._boundResumeHandler);
        this._eventTarget?.removeEventListener?.('pageshow', this._boundResumeHandler);
        this._channel?.removeEventListener?.('message', this._boundChannelHandler);
        this._document?.removeEventListener?.('visibilitychange', this._boundVisibilityHandler);
        this._channel?.close?.();
    }
}
