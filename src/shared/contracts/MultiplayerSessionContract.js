export const MULTIPLAYER_SESSION_CONTRACT_VERSION = 'multiplayer-session.v2';

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
