function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeBoolean(value) {
    return value === true;
}

function toNonNegativeInt(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.floor(parsed));
}

export function normalizeLobbyMember(member, fallbackRole = 'client') {
    const peerId = normalizeString(member?.peerId || member?.id);
    if (!peerId) return null;
    const role = normalizeString(member?.role, fallbackRole) === 'host' ? 'host' : 'client';
    return {
        peerId,
        id: peerId,
        actorId: normalizeString(member?.actorId || member?.name, role === 'host' ? 'Host' : peerId),
        name: normalizeString(member?.name || member?.actorId, role === 'host' ? 'Host' : peerId),
        role,
        isHost: role === 'host',
        ready: normalizeBoolean(member?.ready),
        joinedAt: toNonNegativeInt(member?.joinedAt, 0),
        lastSeenAt: toNonNegativeInt(member?.lastSeenAt, 0),
    };
}

export function normalizeLobbySessionState(state = {}) {
    const lobbyCode = normalizeString(state?.lobbyCode || state?.code, '');
    const hostPeerId = normalizeString(state?.hostPeerId || state?.hostId, '');
    const members = Array.isArray(state?.members)
        ? state.members
        : (Array.isArray(state?.players) ? state.players : []);

    const normalizedMembers = members
        .map((member) => normalizeLobbyMember(member, member?.peerId === hostPeerId ? 'host' : 'client'))
        .filter(Boolean)
        .map((member) => ({
            ...member,
            role: member.peerId === hostPeerId ? 'host' : member.role,
            isHost: member.peerId === hostPeerId,
        }))
        .sort((left, right) => {
            if (left.isHost !== right.isHost) return left.isHost ? -1 : 1;
            if (left.joinedAt !== right.joinedAt) return left.joinedAt - right.joinedAt;
            return left.peerId.localeCompare(right.peerId);
        });

    const readyCount = normalizedMembers.filter((member) => member.ready).length;
    const memberCount = normalizedMembers.length;
    return {
        lobbyCode,
        hostPeerId: hostPeerId || normalizeString(normalizedMembers[0]?.peerId, ''),
        memberCount,
        readyCount,
        allReady: memberCount > 0 && readyCount === memberCount,
        maxPlayers: toNonNegativeInt(state?.maxPlayers, 10) || 10,
        revision: toNonNegativeInt(state?.revision, 0),
        members: normalizedMembers,
        players: normalizedMembers.map((member) => ({
            id: member.peerId,
            name: member.name,
            isHost: member.isHost,
            ready: member.ready,
        })),
        updatedAt: toNonNegativeInt(state?.updatedAt, 0),
    };
}

export function createInitialLobbySessionState() {
    return normalizeLobbySessionState({
        lobbyCode: '',
        hostPeerId: '',
        members: [],
        maxPlayers: 10,
        revision: 0,
        updatedAt: 0,
    });
}
