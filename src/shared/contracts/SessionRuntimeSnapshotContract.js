export const SESSION_RUNTIME_SNAPSHOT_CONTRACT_VERSION = 'session-runtime-snapshot.v1';
export const MATCH_FLOW_SNAPSHOT_CONTRACT_VERSION = 'match-flow-snapshot.v1';

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeNullableString(value) {
    const normalized = normalizeString(value, '');
    return normalized || null;
}

function normalizeTimestamp(value) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? Math.max(0, Math.floor(timestamp)) : 0;
}

export function createSessionRuntimeSnapshot(payload = {}) {
    const source = /** @type {any} */ (payload && typeof payload === 'object' ? payload : {});
    return {
        contractVersion: SESSION_RUNTIME_SNAPSHOT_CONTRACT_VERSION,
        sessionId: normalizeNullableString(source.sessionId),
        lifecycleState: normalizeString(source.lifecycleState, 'unknown'),
        finalizeState: normalizeString(source.finalizeState, 'idle'),
        gameStateId: normalizeString(source.gameStateId, ''),
        sessionType: normalizeString(source.sessionType, source.isNetworkSession === true ? 'multiplayer' : 'local'),
        runtimeTransportKind: normalizeString(source.runtimeTransportKind, source.isNetworkSession === true ? 'network' : 'local'),
        isNetworkSession: source.isNetworkSession === true,
        isHost: source.isHost !== false,
        pendingSessionInit: source.pendingSessionInit === true,
        pendingFinalizeTrigger: normalizeString(source.pendingFinalizeTrigger, ''),
        updatedAt: normalizeTimestamp(source.updatedAt),
    };
}

export function createMatchFlowSnapshot(payload = {}) {
    const source = /** @type {any} */ (payload && typeof payload === 'object' ? payload : {});
    return {
        contractVersion: MATCH_FLOW_SNAPSHOT_CONTRACT_VERSION,
        sessionId: normalizeNullableString(source.sessionId),
        gameStateId: normalizeString(source.gameStateId, ''),
        uiStateId: normalizeString(source.uiStateId, ''),
        roundStateId: normalizeString(source.roundStateId, ''),
        isPaused: source.isPaused === true,
        canReturnToMenu: source.canReturnToMenu !== false,
        pendingFinalizeTrigger: normalizeString(source.pendingFinalizeTrigger, ''),
        isNetworkSession: source.isNetworkSession === true,
        isHost: source.isHost !== false,
        lifecycleState: normalizeString(source.lifecycleState, 'unknown'),
        finalizeState: normalizeString(source.finalizeState, 'idle'),
        updatedAt: normalizeTimestamp(source.updatedAt),
    };
}
