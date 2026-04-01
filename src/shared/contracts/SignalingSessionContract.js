export const SIGNALING_SESSION_CONTRACT_VERSION = 'signaling-session.v1';

export const SIGNALING_COMMAND_TYPES = Object.freeze({
    CREATE_LOBBY: 'create_lobby',
    JOIN_LOBBY: 'join_lobby',
    READY: 'ready',
    LEAVE: 'leave',
    OFFER: 'offer',
    ANSWER: 'answer',
    ICE: 'ice',
});

export const SIGNALING_EVENT_TYPES = Object.freeze({
    LOBBY_CREATED: 'lobby_created',
    LOBBY_JOINED: 'lobby_joined',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    PLAYER_READY: 'player_ready',
    ERROR: 'error',
});

export const SIGNALING_HTTP_ROUTES = Object.freeze({
    LOBBY_CREATE: '/lobby/create',
    LOBBY_JOIN: '/lobby/join',
    LOBBY_READY: '/lobby/ready',
    LOBBY_LEAVE: '/lobby/leave',
    LOBBY_ACK_PENDING: '/lobby/ack-pending',
    LOBBY_MATCH_START: '/lobby/match-start',
    LOBBY_INVALIDATE_READY: '/lobby/invalidate-ready',
    LOBBY_STATUS: '/lobby/status',
    SIGNALING_OFFER: '/signaling/offer',
    SIGNALING_ANSWER: '/signaling/answer',
    SIGNALING_ICE: '/signaling/ice',
    DISCOVERY_INFO: '/discovery/info',
});

function normalizeType(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized || fallback;
}

export function createSignalingEnvelope(type, payload = null) {
    const normalizedType = normalizeType(type);
    if (!normalizedType) return null;
    return {
        contractVersion: SIGNALING_SESSION_CONTRACT_VERSION,
        type: normalizedType,
        ...(payload && typeof payload === 'object' ? payload : {}),
    };
}

export function normalizeSignalingEnvelope(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
        contractVersion: typeof source.contractVersion === 'string'
            ? source.contractVersion
            : SIGNALING_SESSION_CONTRACT_VERSION,
        type: normalizeType(source.type),
        payload: source,
    };
}
