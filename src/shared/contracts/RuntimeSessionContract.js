export const RUNTIME_SESSION_TYPES = Object.freeze({
    SINGLE: 'single',
    SPLITSCREEN: 'splitscreen',
    MULTIPLAYER: 'multiplayer',
    LAN: 'lan',
    ONLINE: 'online',
});

export const MULTIPLAYER_TRANSPORTS = Object.freeze({
    STORAGE_BRIDGE: 'storage-bridge',
    LAN: 'lan',
    ONLINE: 'online',
});

const VALID_SESSION_TYPE_SET = new Set(Object.values(RUNTIME_SESSION_TYPES));
const VALID_MULTIPLAYER_TRANSPORT_SET = new Set(Object.values(MULTIPLAYER_TRANSPORTS));

export function normalizeRuntimeSessionType(value, fallback = RUNTIME_SESSION_TYPES.SINGLE) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return VALID_SESSION_TYPE_SET.has(normalized) ? normalized : fallback;
}

export function normalizeMultiplayerTransport(value, fallback = MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return VALID_MULTIPLAYER_TRANSPORT_SET.has(normalized) ? normalized : fallback;
}

export function resolveRuntimeSessionContract(source = null) {
    const sessionType = normalizeRuntimeSessionType(source?.sessionType, RUNTIME_SESSION_TYPES.SINGLE);
    const multiplayerTransport = normalizeMultiplayerTransport(
        source?.multiplayerTransport,
        MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE
    );
    const usesMenuStorageBridge = sessionType === RUNTIME_SESSION_TYPES.MULTIPLAYER
        && multiplayerTransport === MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE;
    const adapterSessionType = usesMenuStorageBridge
        ? RUNTIME_SESSION_TYPES.SINGLE
        : sessionType;
    const runtimeTransportKind = usesMenuStorageBridge
        ? 'menu-storage-bridge'
        : adapterSessionType;
    return {
        sessionType,
        multiplayerTransport,
        usesMenuStorageBridge,
        adapterSessionType,
        runtimeTransportKind,
        isNetworkSession: adapterSessionType === RUNTIME_SESSION_TYPES.LAN || adapterSessionType === RUNTIME_SESSION_TYPES.ONLINE,
    };
}

export function isMenuStorageBridgeSession(source = null) {
    return resolveRuntimeSessionContract(source).usesMenuStorageBridge === true;
}
