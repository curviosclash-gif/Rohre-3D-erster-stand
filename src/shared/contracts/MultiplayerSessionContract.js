export const MULTIPLAYER_SESSION_CONTRACT_VERSION = 'multiplayer-session.v2';
export const MULTIPLAYER_STATE_UPDATE_EVENT_SCHEMA_VERSION = 'multiplayer-state-update-event.v1';

export const MULTIPLAYER_MESSAGE_TYPES = Object.freeze({
    JOIN: 'join',
    READY: 'ready',
    LEAVE: 'leave',
    RECONNECT: 'reconnect',
    FULL_STATE_SYNC: 'full_state_sync',
    INPUT: 'input',
    STATE_SNAPSHOT: 'state_snapshot',
    PING: 'ping',
    PONG: 'pong',
    HEARTBEAT: 'heartbeat',
    HEARTBEAT_ACK: 'heartbeat_ack',
    HOST_LEAVING: 'host_leaving',
    PLAYER_DISCONNECTED: 'player_disconnected',
    PLAYER_RECONNECTED: 'player_reconnected',
    PLAYER_REMOVED: 'player_removed',
});

const MULTIPLAYER_MESSAGE_TYPE_SET = new Set(Object.values(MULTIPLAYER_MESSAGE_TYPES));

function normalizeType(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized || fallback;
}

export function isMultiplayerMessageType(value) {
    return MULTIPLAYER_MESSAGE_TYPE_SET.has(normalizeType(value));
}

export function buildMultiplayerSessionMessage(type, payload = null) {
    const normalizedType = normalizeType(type);
    if (!normalizedType) return null;
    return {
        contractVersion: MULTIPLAYER_SESSION_CONTRACT_VERSION,
        type: normalizedType,
        ...(payload && typeof payload === 'object' ? payload : {}),
    };
}

export function normalizeMultiplayerSessionMessage(rawMessage, fallbackType = '') {
    const source = rawMessage && typeof rawMessage === 'object' ? rawMessage : {};
    const type = normalizeType(source.type, normalizeType(fallbackType));
    return {
        contractVersion: typeof source.contractVersion === 'string'
            ? source.contractVersion
            : MULTIPLAYER_SESSION_CONTRACT_VERSION,
        type,
        payload: source,
    };
}

function resolveStateUpdateMessageType(source, fallbackType = MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT) {
    const normalizedFallbackType = normalizeType(fallbackType, MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT);
    const normalizedType = normalizeType(source?.messageType || source?.type, normalizedFallbackType);
    return isMultiplayerMessageType(normalizedType)
        ? normalizedType
        : MULTIPLAYER_MESSAGE_TYPES.STATE_SNAPSHOT;
}

export function buildMultiplayerStateUpdateEvent(rawState, options = {}) {
    const state = rawState && typeof rawState === 'object' ? rawState : {};
    const messageType = resolveStateUpdateMessageType(state, options?.messageType);
    const contractVersion = typeof state.contractVersion === 'string'
        ? state.contractVersion
        : MULTIPLAYER_SESSION_CONTRACT_VERSION;
    return {
        schemaVersion: MULTIPLAYER_STATE_UPDATE_EVENT_SCHEMA_VERSION,
        contractVersion,
        messageType,
        state,
    };
}

export function normalizeMultiplayerStateUpdateEvent(rawEvent) {
    const source = rawEvent && typeof rawEvent === 'object' ? rawEvent : {};
    const state = source.state && typeof source.state === 'object'
        ? source.state
        : source;
    const normalized = buildMultiplayerStateUpdateEvent(state, {
        messageType: source.messageType || source.type || state?.type,
    });
    if (typeof source.schemaVersion === 'string') {
        const schemaVersion = source.schemaVersion.trim();
        if (schemaVersion) {
            normalized.schemaVersion = schemaVersion;
        }
    }
    if (typeof source.contractVersion === 'string') {
        const contractVersion = source.contractVersion.trim();
        if (contractVersion) {
            normalized.contractVersion = contractVersion;
        }
    }
    if (typeof source.messageType === 'string') {
        const messageType = resolveStateUpdateMessageType({ messageType: source.messageType }, normalized.messageType);
        normalized.messageType = messageType;
    }
    return normalized;
}
