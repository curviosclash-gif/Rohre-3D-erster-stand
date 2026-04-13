/* eslint-disable max-lines */
import { PLATFORM_CAPABILITY_IDS } from './PlatformCapabilityContract.js';
import { MULTIPLAYER_TRANSPORTS } from './RuntimeSessionContract.js';

export const PLATFORM_CAPABILITY_REGISTRY_CONTRACT_VERSION = 'platform-capability-registry.v1';
export const PLATFORM_SURFACE_POLICY_CONTRACT_VERSION = 'platform-surface-policy.v1';

export const PLATFORM_PRODUCT_SURFACE_IDS = Object.freeze({
    DESKTOP_APP: 'desktop-app',
    BROWSER_DEMO: 'browser-demo',
});

export const PLATFORM_RUNTIME_KINDS = Object.freeze({
    ELECTRON: 'electron',
    WEB: 'web',
});

export const PLATFORM_PROVIDER_KINDS = Object.freeze({
    BROWSER_DEMO: 'browser-demo',
    BROWSER_DOWNLOAD: 'browser-download',
    BROWSER_NATIVE: 'browser-native',
    ELECTRON_IPC: 'electron-ipc',
    ELECTRON_RENDERER: 'electron-renderer',
    MENU_STORAGE_BRIDGE: 'menu-storage-bridge',
    MENU_LAN_LOBBY: 'menu-lan-lobby',
    MENU_ONLINE_LOBBY: 'menu-online-lobby',
    UNAVAILABLE: 'unavailable',
});

export const PLATFORM_TOOLING_IDS = Object.freeze({
    DEFAULT: 'default',
    TRAINING_BENCHMARK: 'training-benchmark',
});

export const PLATFORM_SURFACE_POLICY_MODES = Object.freeze({
    DEFAULT_FULL: 'default-full',
    DEFAULT_DENY: 'default-deny',
});

export const PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES = Object.freeze({
    LOCAL_UNLOCK: 'local-unlock',
    BLOCKED: 'blocked',
});

export const PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS = Object.freeze({
    LOCAL_DEVTOOLS: 'local-devtools',
    DEMO_LOCAL_DEVTOOLS: 'demo-local-devtools',
    UNAVAILABLE: 'unavailable',
});

export const PLATFORM_SURFACE_MULTIPLAYER_ROLES = Object.freeze({ HOST_AND_JOIN: 'host-and-join', JOIN_ONLY: 'join-only' });
export const PLATFORM_SURFACE_SESSION_TYPES = Object.freeze({ SINGLE: 'single', MULTIPLAYER: 'multiplayer', SPLITSCREEN: 'splitscreen' });
export const PLATFORM_SURFACE_MENU_MODE_PATHS = Object.freeze({ QUICK_ACTION: 'quick_action', ARCADE: 'arcade', FIGHT: 'fight', NORMAL: 'normal' });
export const PLATFORM_SURFACE_QUICK_START_ACTION_IDS = Object.freeze({ LAST_SETTINGS: 'last_settings', EVENT_PLAYLIST: 'event_playlist', RANDOM_MAP: 'random_map' });

const VALID_PRODUCT_SURFACE_IDS = new Set(Object.values(PLATFORM_PRODUCT_SURFACE_IDS));
const VALID_RUNTIME_KINDS = new Set(Object.values(PLATFORM_RUNTIME_KINDS));
const VALID_LOBBY_TRANSPORTS = new Set(Object.values(MULTIPLAYER_TRANSPORTS));
const VALID_SURFACE_SESSION_TYPES = new Set(Object.values(PLATFORM_SURFACE_SESSION_TYPES));
const VALID_SURFACE_MENU_MODE_PATHS = new Set(Object.values(PLATFORM_SURFACE_MENU_MODE_PATHS));
const VALID_SURFACE_QUICK_START_ACTION_IDS = new Set(Object.values(PLATFORM_SURFACE_QUICK_START_ACTION_IDS));

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function resolveRuntimeGlobal(runtimeGlobal = globalThis) {
    return runtimeGlobal && typeof runtimeGlobal === 'object'
        ? runtimeGlobal
        : (typeof globalThis !== 'undefined' ? globalThis : {});
}

export function normalizePlatformProductSurfaceId(
    value,
    fallback = PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO
) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_PRODUCT_SURFACE_IDS.has(normalized) ? normalized : fallback;
}

export function normalizePlatformRuntimeKind(value, fallback = PLATFORM_RUNTIME_KINDS.WEB) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_RUNTIME_KINDS.has(normalized) ? normalized : fallback;
}

export function normalizeLobbyProviderTransport(value, fallback = MULTIPLAYER_TRANSPORTS.LAN) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_LOBBY_TRANSPORTS.has(normalized) ? normalized : fallback;
}

function normalizeSurfaceMenuModePath(value, fallback = '') {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_SURFACE_MENU_MODE_PATHS.has(normalized) ? normalized : fallback;
}

function normalizeSurfaceSessionType(value, fallback = '') { const normalized = normalizeString(value, '').toLowerCase(); return VALID_SURFACE_SESSION_TYPES.has(normalized) ? normalized : fallback; }

function normalizeSurfaceQuickStartActionId(value, fallback = '') {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_SURFACE_QUICK_START_ACTION_IDS.has(normalized) ? normalized : fallback;
}

export const PLATFORM_CAPABILITY_REGISTRY = Object.freeze({
    contractVersion: PLATFORM_CAPABILITY_REGISTRY_CONTRACT_VERSION,
    products: Object.freeze({
        [PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP]: Object.freeze({
            runtimeKind: PLATFORM_RUNTIME_KINDS.ELECTRON,
            defaultLobbyTransport: MULTIPLAYER_TRANSPORTS.LAN,
            toolingSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
            surfacePolicy: Object.freeze({
                defaultAccessMode: PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL,
                multiplayerRole: PLATFORM_SURFACE_MULTIPLAYER_ROLES.HOST_AND_JOIN,
                defaultModePath: PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL,
                allowedSessionTypes: Object.freeze([PLATFORM_SURFACE_SESSION_TYPES.SINGLE, PLATFORM_SURFACE_SESSION_TYPES.MULTIPLAYER, PLATFORM_SURFACE_SESSION_TYPES.SPLITSCREEN]),
                defaultMultiplayerTransport: MULTIPLAYER_TRANSPORTS.LAN,
                allowedMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.LAN, MULTIPLAYER_TRANSPORTS.ONLINE]),
                hostMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.LAN, MULTIPLAYER_TRANSPORTS.ONLINE]),
                joinMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.LAN, MULTIPLAYER_TRANSPORTS.ONLINE]),
                legacyMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE]),
                allowedGameModes: Object.freeze([
                    'Arcade',
                    'Parcours',
                    'Fight',
                    'Normal',
                    'Classic',
                ]),
                allowedModePaths: Object.freeze([
                    PLATFORM_SURFACE_MENU_MODE_PATHS.QUICK_ACTION,
                    PLATFORM_SURFACE_MENU_MODE_PATHS.ARCADE,
                    PLATFORM_SURFACE_MENU_MODE_PATHS.FIGHT,
                    PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL,
                ]),
                allowedQuickStartActionIds: Object.freeze([]),
                allowedPresetIds: Object.freeze([]),
                curatedMapKeysByModePath: Object.freeze({}),
                requiresCuratedMaps: false,
                developerAccess: Object.freeze({
                    available: true,
                    accessMode: PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.LOCAL_UNLOCK,
                    reason: PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.LOCAL_DEVTOOLS,
                    message: 'Developer-, Debug- und Training-Schalter bleiben lokale Diagnosepfade und zaehlen nicht zum Produktversprechen der Vollversion.',
                }),
            }),
            capabilities: Object.freeze({
                [PLATFORM_CAPABILITY_IDS.DISCOVERY]: PLATFORM_PROVIDER_KINDS.ELECTRON_IPC,
                [PLATFORM_CAPABILITY_IDS.HOST]: PLATFORM_PROVIDER_KINDS.ELECTRON_IPC,
                [PLATFORM_CAPABILITY_IDS.SAVE]: PLATFORM_PROVIDER_KINDS.ELECTRON_IPC,
                [PLATFORM_CAPABILITY_IDS.RECORDING]: PLATFORM_PROVIDER_KINDS.ELECTRON_RENDERER,
            }),
        }),
        [PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO]: Object.freeze({
            runtimeKind: PLATFORM_RUNTIME_KINDS.WEB,
            defaultLobbyTransport: MULTIPLAYER_TRANSPORTS.LAN,
            toolingSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
            surfacePolicy: Object.freeze({
                defaultAccessMode: PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY,
                multiplayerRole: PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY,
                defaultModePath: PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL,
                allowedSessionTypes: Object.freeze([PLATFORM_SURFACE_SESSION_TYPES.SINGLE, PLATFORM_SURFACE_SESSION_TYPES.MULTIPLAYER]),
                defaultMultiplayerTransport: MULTIPLAYER_TRANSPORTS.LAN,
                allowedMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.LAN]),
                hostMultiplayerTransports: Object.freeze([]),
                joinMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.LAN]),
                legacyMultiplayerTransports: Object.freeze([MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE]),
                allowedGameModes: Object.freeze([
                    'Arcade',
                    'Parcours',
                    'Fight',
                    'Normal',
                    'Classic',
                ]),
                allowedModePaths: Object.freeze([
                    PLATFORM_SURFACE_MENU_MODE_PATHS.ARCADE,
                    PLATFORM_SURFACE_MENU_MODE_PATHS.FIGHT,
                    PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL,
                ]),
                allowedQuickStartActionIds: Object.freeze([]),
                allowedPresetIds: Object.freeze([
                    'arcade',
                    'fight-standard',
                    'normal-standard',
                ]),
                curatedMapKeysByModePath: Object.freeze({
                    [PLATFORM_SURFACE_MENU_MODE_PATHS.ARCADE]: Object.freeze(['parcours_rift']),
                    [PLATFORM_SURFACE_MENU_MODE_PATHS.FIGHT]: Object.freeze(['standard', 'maze']),
                    [PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL]: Object.freeze(['standard', 'maze']),
                }),
                requiresCuratedMaps: true,
                developerAccess: Object.freeze({
                    available: true,
                    accessMode: PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.LOCAL_UNLOCK,
                    reason: PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.DEMO_LOCAL_DEVTOOLS,
                    message: 'Developer-, Debug- und Training-Schalter sind lokale Diagnosepfade und kein Demo-Unlock, keine Lizenzgrenze und keine Sicherheitsbarriere.',
                }),
            }),
            capabilities: Object.freeze({
                [PLATFORM_CAPABILITY_IDS.DISCOVERY]: PLATFORM_PROVIDER_KINDS.BROWSER_DEMO,
                [PLATFORM_CAPABILITY_IDS.HOST]: Object.freeze({
                    enabled: false,
                    available: PLATFORM_PROVIDER_KINDS.BROWSER_DEMO,
                    unavailable: PLATFORM_PROVIDER_KINDS.UNAVAILABLE,
                }),
                [PLATFORM_CAPABILITY_IDS.SAVE]: Object.freeze({
                    available: PLATFORM_PROVIDER_KINDS.BROWSER_DOWNLOAD,
                    unavailable: PLATFORM_PROVIDER_KINDS.BROWSER_DEMO,
                }),
                [PLATFORM_CAPABILITY_IDS.RECORDING]: Object.freeze({
                    available: PLATFORM_PROVIDER_KINDS.BROWSER_NATIVE,
                    unavailable: PLATFORM_PROVIDER_KINDS.BROWSER_DEMO,
                }),
            }),
        }),
    }),
    lobbyProviders: Object.freeze({
        [MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE]: PLATFORM_PROVIDER_KINDS.MENU_STORAGE_BRIDGE,
        [MULTIPLAYER_TRANSPORTS.LAN]: PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY,
        [MULTIPLAYER_TRANSPORTS.ONLINE]: PLATFORM_PROVIDER_KINDS.MENU_ONLINE_LOBBY,
    }),
    tooling: Object.freeze({
        [PLATFORM_TOOLING_IDS.DEFAULT]: Object.freeze({
            surfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
        }),
        [PLATFORM_TOOLING_IDS.TRAINING_BENCHMARK]: Object.freeze({
            surfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
        }),
    }),
});

export function resolvePlatformRuntimeKind(options = {}) {
    const explicitRuntimeKind = normalizePlatformRuntimeKind(options.runtimeKind, '');
    if (explicitRuntimeKind) {
        return explicitRuntimeKind;
    }
    const runtimeGlobal = resolveRuntimeGlobal(options.runtimeGlobal);
    return runtimeGlobal?.curviosApp?.isApp === true || runtimeGlobal?.__CURVIOS_APP__ === true
        ? PLATFORM_RUNTIME_KINDS.ELECTRON
        : PLATFORM_RUNTIME_KINDS.WEB;
}

export function resolvePlatformProductSurfaceId(options = {}) {
    const explicitProductSurfaceId = normalizePlatformProductSurfaceId(options.productSurfaceId, '');
    if (explicitProductSurfaceId) {
        return explicitProductSurfaceId;
    }
    const normalizedAppMode = normalizeString(options.appMode, '').toLowerCase();
    if (normalizedAppMode === 'app') {
        return PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP;
    }
    return resolvePlatformRuntimeKind(options) === PLATFORM_RUNTIME_KINDS.ELECTRON
        ? PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP
        : PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO;
}

function resolveProductEntry(productSurfaceId) {
    return PLATFORM_CAPABILITY_REGISTRY.products[productSurfaceId]
        || PLATFORM_CAPABILITY_REGISTRY.products[PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO];
}

function resolveSurfaceCapabilitySpec(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    if (!normalizedCapabilityId) {
        return null;
    }
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    return resolveProductEntry(productSurfaceId)?.capabilities?.[normalizedCapabilityId] || null;
}

function resolveSurfaceDefaultAccessMode(surfacePolicy) {
    return normalizeString(
        surfacePolicy?.defaultAccessMode,
        PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY
    );
}

function resolveSurfaceDefaultProviderKind(productSurfaceId, defaultAccessMode) {
    if (defaultAccessMode !== PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL) {
        return PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
    }
    if (productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP) {
        return PLATFORM_PROVIDER_KINDS.ELECTRON_IPC;
    }
    if (productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO) {
        return PLATFORM_PROVIDER_KINDS.BROWSER_DEMO;
    }
    return PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
}

function resolveSurfaceDeveloperPolicy(surfacePolicy) {
    return surfacePolicy?.developerAccess && typeof surfacePolicy.developerAccess === 'object'
        ? surfacePolicy.developerAccess
        : null;
}

function sanitizeUniqueStringArray(values, normalizer) {
    if (!Array.isArray(values)) {
        return Object.freeze([]);
    }
    const seen = new Set();
    const sanitized = [];
    values.forEach((value) => {
        const normalized = normalizer(value, '');
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        sanitized.push(normalized);
    });
    return Object.freeze(sanitized);
}

function resolveSurfaceAllowedModePaths(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedModePaths,
        normalizeSurfaceMenuModePath
    );
}

function resolveSurfaceAllowedSessionTypes(surfacePolicy) { return sanitizeUniqueStringArray(surfacePolicy?.allowedSessionTypes, normalizeSurfaceSessionType); }

function resolveSurfaceAllowedMultiplayerTransports(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedMultiplayerTransports,
        normalizeLobbyProviderTransport
    );
}

function resolveSurfaceTransportSubset(values, allowedTransports, fallbackToAllowed = false) {
    if (!Array.isArray(values)) {
        return fallbackToAllowed === true
            ? Object.freeze([...allowedTransports])
            : Object.freeze([]);
    }
    const allowedSet = new Set(allowedTransports);
    const sanitized = sanitizeUniqueStringArray(values, normalizeLobbyProviderTransport)
        .filter((transport) => allowedSet.has(transport));
    return Object.freeze(sanitized);
}

function resolveSurfaceDefaultMultiplayerTransport(surfacePolicy, allowedMultiplayerTransports) {
    const fallbackTransport = allowedMultiplayerTransports[0] || MULTIPLAYER_TRANSPORTS.LAN;
    return normalizeLobbyProviderTransport(surfacePolicy?.defaultMultiplayerTransport, fallbackTransport);
}

function resolveSurfaceAllowedQuickStartActionIds(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedQuickStartActionIds,
        normalizeSurfaceQuickStartActionId
    );
}

function resolveSurfaceAllowedPresetIds(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedPresetIds,
        normalizeString
    );
}

function resolveSurfaceCuratedMapKeysByModePath(surfacePolicy) {
    const source = surfacePolicy?.curatedMapKeysByModePath;
    if (!source || typeof source !== 'object') {
        return Object.freeze({});
    }
    const resolved = {};
    Object.entries(source).forEach(([modePath, mapKeys]) => {
        const normalizedModePath = normalizeSurfaceMenuModePath(modePath, '');
        if (!normalizedModePath) {
            return;
        }
        resolved[normalizedModePath] = sanitizeUniqueStringArray(mapKeys, normalizeString);
    });
    return Object.freeze(resolved);
}

function resolveSurfaceDefaultModePath(surfacePolicy, allowedModePaths) {
    const fallbackModePath = allowedModePaths[0] || PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL;
    return normalizeSurfaceMenuModePath(surfacePolicy?.defaultModePath, fallbackModePath)
        || fallbackModePath;
}

function resolveSurfaceCapabilityConfiguredAvailability(providerSpec, fallbackAvailable = false) {
    if (providerSpec && typeof providerSpec === 'object') {
        if (Object.prototype.hasOwnProperty.call(providerSpec, 'enabled')) {
            return providerSpec.enabled === true;
        }
        return normalizeString(providerSpec.available, PLATFORM_PROVIDER_KINDS.UNAVAILABLE)
            !== PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
    }
    if (typeof providerSpec !== 'string') {
        return fallbackAvailable === true;
    }
    return normalizeString(providerSpec, PLATFORM_PROVIDER_KINDS.UNAVAILABLE)
        !== PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
}

export function resolvePlatformEnvironment(options = {}) {
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const runtimeKind = resolvePlatformRuntimeKind(options);
    const productEntry = resolveProductEntry(productSurfaceId);
    const surfacePolicy = productEntry?.surfacePolicy && typeof productEntry.surfacePolicy === 'object'
        ? productEntry.surfacePolicy
        : {
            defaultAccessMode: PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY,
            multiplayerRole: PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY,
        };
    const allowedMultiplayerTransports = resolveSurfaceAllowedMultiplayerTransports(surfacePolicy);
    const defaultMultiplayerTransport = resolveSurfaceDefaultMultiplayerTransport(
        surfacePolicy,
        allowedMultiplayerTransports
    );
    return Object.freeze({
        contractVersion: PLATFORM_CAPABILITY_REGISTRY.contractVersion,
        surfacePolicyContractVersion: PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
        productSurfaceId,
        runtimeKind,
        defaultLobbyTransport: defaultMultiplayerTransport,
        toolingSurfaceId: productEntry.toolingSurfaceId,
        defaultAccessMode: resolveSurfaceDefaultAccessMode(surfacePolicy),
        multiplayerRole: normalizeString(
            surfacePolicy.multiplayerRole,
            PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY
        ),
    });
}

export function isDesktopProductSurface(options = {}) {
    return resolvePlatformProductSurfaceId(options) === PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP;
}

export function resolveDefaultLobbyTransport(options = {}) {
    return resolvePlatformEnvironment(options).defaultLobbyTransport;
}

export function resolveSurfacePolicy(options = {}) {
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const productEntry = resolveProductEntry(productSurfaceId);
    const policy = productEntry?.surfacePolicy && typeof productEntry.surfacePolicy === 'object'
        ? productEntry.surfacePolicy
        : null;
    const allowedSessionTypes = resolveSurfaceAllowedSessionTypes(policy);
    const allowedMultiplayerTransports = resolveSurfaceAllowedMultiplayerTransports(policy);
    const allowedModePaths = resolveSurfaceAllowedModePaths(policy);
    const allowedQuickStartActionIds = resolveSurfaceAllowedQuickStartActionIds(policy);
    const allowedPresetIds = resolveSurfaceAllowedPresetIds(policy);
    const curatedMapKeysByModePath = resolveSurfaceCuratedMapKeysByModePath(policy);
    const allowedGameModes = Array.isArray(policy?.allowedGameModes)
        ? Object.freeze([...policy.allowedGameModes])
        : Object.freeze([]);
    const defaultMultiplayerTransport = resolveSurfaceDefaultMultiplayerTransport(
        policy,
        allowedMultiplayerTransports
    );
    const hostMultiplayerTransports = resolveSurfaceTransportSubset(
        policy?.hostMultiplayerTransports,
        allowedMultiplayerTransports,
        true
    );
    const joinMultiplayerTransports = resolveSurfaceTransportSubset(
        policy?.joinMultiplayerTransports,
        allowedMultiplayerTransports,
        true
    );
    const legacyMultiplayerTransports = resolveSurfaceTransportSubset(
        policy?.legacyMultiplayerTransports,
        Object.values(MULTIPLAYER_TRANSPORTS)
    );

    return Object.freeze({
        contractVersion: PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
        productSurfaceId,
        defaultAccessMode: resolveSurfaceDefaultAccessMode(policy),
        multiplayerRole: normalizeString(
            policy?.multiplayerRole,
            PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY
        ),
        allowedSessionTypes,
        defaultMultiplayerTransport,
        allowedMultiplayerTransports,
        hostMultiplayerTransports,
        joinMultiplayerTransports,
        legacyMultiplayerTransports,
        defaultModePath: resolveSurfaceDefaultModePath(policy, allowedModePaths),
        allowedGameModes,
        allowedModePaths,
        allowedQuickStartActionIds,
        allowedPresetIds,
        curatedMapKeysByModePath,
        requiresCuratedMaps: policy?.requiresCuratedMaps === true,
    });
}

export function resolveSurfaceDeveloperAccess(options = {}) {
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const productEntry = resolveProductEntry(productSurfaceId);
    const surfacePolicy = productEntry?.surfacePolicy && typeof productEntry.surfacePolicy === 'object'
        ? productEntry.surfacePolicy
        : null;
    const developerPolicy = resolveSurfaceDeveloperPolicy(surfacePolicy);
    const available = developerPolicy?.available !== false;
    const accessMode = normalizeString(
        developerPolicy?.accessMode,
        available
            ? PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.LOCAL_UNLOCK
            : PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.BLOCKED
    );
    const defaultReason = productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO
        ? PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.DEMO_LOCAL_DEVTOOLS
        : PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.LOCAL_DEVTOOLS;
    const reason = normalizeString(
        developerPolicy?.reason,
        available ? defaultReason : PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.UNAVAILABLE
    );
    const message = normalizeString(
        developerPolicy?.message,
        available
            ? 'Developer-, Debug- und Training-Schalter bleiben lokale Diagnosepfade.'
            : 'Developer-, Debug- und Training-Schalter sind fuer diese Surface nicht verfuegbar.'
    );

    return Object.freeze({
        contractVersion: PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
        productSurfaceId,
        available,
        accessMode,
        reason,
        message,
    });
}

export function resolveSurfaceCapabilityAccess(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    const hasCapabilityId = normalizedCapabilityId.length > 0;
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const productEntry = resolveProductEntry(productSurfaceId);
    const providerSpec = hasCapabilityId
        ? resolveSurfaceCapabilitySpec(normalizedCapabilityId, { productSurfaceId })
        : null;
    const surfacePolicy = productEntry?.surfacePolicy && typeof productEntry.surfacePolicy === 'object'
        ? productEntry.surfacePolicy
        : null;
    const defaultAccessMode = resolveSurfaceDefaultAccessMode(surfacePolicy);
    const usesDefaultPolicy = hasCapabilityId && providerSpec === null;
    const configuredAvailable = resolveSurfaceCapabilityConfiguredAvailability(
        providerSpec,
        usesDefaultPolicy && defaultAccessMode === PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL
    );
    const providerKind = usesDefaultPolicy
        ? resolveSurfaceDefaultProviderKind(productSurfaceId, defaultAccessMode)
        : resolveCapabilityProviderKind(normalizedCapabilityId, {
            productSurfaceId,
            available: configuredAvailable,
        });

    return Object.freeze({
        capabilityId: normalizedCapabilityId,
        productSurfaceId,
        available: configuredAvailable,
        providerKind,
        defaultAccessMode,
        multiplayerRole: normalizeString(
            surfacePolicy?.multiplayerRole,
            PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY
        ),
        resolvedByDefaultPolicy: usesDefaultPolicy,
    });
}

export function isLegacyLobbyTransport(transport) {
    const normalized = normalizeString(transport, '').toLowerCase();
    return normalized === MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE;
}

export function resolveLobbyProviderKind(
    transport,
    fallback = PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY
) {
    const normalizedTransport = normalizeLobbyProviderTransport(transport, fallback === ''
        ? ''
        : MULTIPLAYER_TRANSPORTS.LAN);
    if (!normalizedTransport) {
        return normalizeString(fallback, PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY);
    }
    return normalizeString(
        PLATFORM_CAPABILITY_REGISTRY.lobbyProviders[normalizedTransport],
        normalizeString(fallback, PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY)
    );
}

export function resolveCapabilityProviderKind(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const providerSpec = resolveSurfaceCapabilitySpec(normalizedCapabilityId, { productSurfaceId });
    if (providerSpec && typeof providerSpec === 'object') {
        return options.available === false
            ? normalizeString(providerSpec.unavailable, PLATFORM_PROVIDER_KINDS.UNAVAILABLE)
            : normalizeString(providerSpec.available, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
    }
    return normalizeString(providerSpec, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
}

export function resolveToolingSurfaceId(
    toolingId = PLATFORM_TOOLING_IDS.DEFAULT,
    fallback = PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP
) {
    const normalizedToolingId = normalizeString(toolingId, PLATFORM_TOOLING_IDS.DEFAULT);
    return normalizePlatformProductSurfaceId(
        PLATFORM_CAPABILITY_REGISTRY.tooling?.[normalizedToolingId]?.surfaceId,
        fallback
    );
}
