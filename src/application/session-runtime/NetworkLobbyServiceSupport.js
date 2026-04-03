import { LOBBY_SERVICE_TRANSPORTS, normalizeLobbyServiceTransport } from '../../shared/contracts/LobbyServiceContract.js';
import { tryCloneJsonValue } from '../../shared/utils/JsonClone.js';

export function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

export function normalizeLobbyCode(value, fallback = '') {
    const normalized = normalizeString(value, fallback)
        .toUpperCase()
        .replace(/[^A-Z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32);
    return normalized || fallback;
}

export function deepClone(value) {
    return tryCloneJsonValue(value, null);
}

export function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createIdleSessionState(lobbyCode = '', transport = LOBBY_SERVICE_TRANSPORTS.LAN) {
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
        transport,
        members: [],
    };
}

export function buildSessionState(lobbyState, options = {}) {
    const signalingUrl = normalizeString(options.signalingUrl, '');
    const localPeerId = normalizeString(options.localPeerId, '');
    const localActorId = normalizeString(options.actorId, '');
    const transport = normalizeLobbyServiceTransport(options.transport, LOBBY_SERVICE_TRANSPORTS.LAN);
    if (!lobbyState || typeof lobbyState !== 'object') {
        return createIdleSessionState('', transport);
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
        transport,
        members: normalizedMembers,
    };
}

export function normalizeSignalingUrl(value) {
    const text = normalizeString(value, '');
    if (!text) return '';
    if (text.includes('://')) return text;
    return `http://${text}`;
}

export function tryParseManualSignalingUrl(rawValue) {
    const value = normalizeString(rawValue, '');
    if (!value) return '';
    if (value.includes('://')) return value;
    if (/^localhost(?::\d+)?$/i.test(value)) return normalizeSignalingUrl(value);
    if (/^\d{1,3}(\.\d{1,3}){3}(?::\d+)?$/.test(value)) return normalizeSignalingUrl(value);
    if (/^[a-z0-9.-]+:\d+$/i.test(value)) return normalizeSignalingUrl(value);
    return '';
}

export function defaultJoinLobby(lobby, options = {}) {
    return lobby.join({
        signalingUrl: options.signalingUrl,
        lobbyCode: options.lobbyCode,
    });
}
