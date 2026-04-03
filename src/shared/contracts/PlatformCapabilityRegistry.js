import { PLATFORM_CAPABILITY_IDS } from './PlatformCapabilityContract.js';
import { MULTIPLAYER_TRANSPORTS } from './RuntimeSessionContract.js';

export const PLATFORM_CAPABILITY_REGISTRY_CONTRACT_VERSION = 'platform-capability-registry.v1';

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

const VALID_PRODUCT_SURFACE_IDS = new Set(Object.values(PLATFORM_PRODUCT_SURFACE_IDS));
const VALID_RUNTIME_KINDS = new Set(Object.values(PLATFORM_RUNTIME_KINDS));
const VALID_LOBBY_TRANSPORTS = new Set(Object.values(MULTIPLAYER_TRANSPORTS));

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

export function normalizeLobbyProviderTransport(value, fallback = MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_LOBBY_TRANSPORTS.has(normalized) ? normalized : fallback;
}

export const PLATFORM_CAPABILITY_REGISTRY = Object.freeze({
    contractVersion: PLATFORM_CAPABILITY_REGISTRY_CONTRACT_VERSION,
    products: Object.freeze({
        [PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP]: Object.freeze({
            runtimeKind: PLATFORM_RUNTIME_KINDS.ELECTRON,
            defaultLobbyTransport: MULTIPLAYER_TRANSPORTS.LAN,
            toolingSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
            capabilities: Object.freeze({
                [PLATFORM_CAPABILITY_IDS.DISCOVERY]: PLATFORM_PROVIDER_KINDS.ELECTRON_IPC,
                [PLATFORM_CAPABILITY_IDS.HOST]: PLATFORM_PROVIDER_KINDS.ELECTRON_IPC,
                [PLATFORM_CAPABILITY_IDS.SAVE]: PLATFORM_PROVIDER_KINDS.ELECTRON_IPC,
                [PLATFORM_CAPABILITY_IDS.RECORDING]: PLATFORM_PROVIDER_KINDS.ELECTRON_RENDERER,
            }),
        }),
        [PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO]: Object.freeze({
            runtimeKind: PLATFORM_RUNTIME_KINDS.WEB,
            defaultLobbyTransport: MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE,
            toolingSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
            capabilities: Object.freeze({
                [PLATFORM_CAPABILITY_IDS.DISCOVERY]: PLATFORM_PROVIDER_KINDS.BROWSER_DEMO,
                [PLATFORM_CAPABILITY_IDS.HOST]: PLATFORM_PROVIDER_KINDS.BROWSER_DEMO,
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

export function resolvePlatformEnvironment(options = {}) {
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const runtimeKind = resolvePlatformRuntimeKind(options);
    const productEntry = PLATFORM_CAPABILITY_REGISTRY.products[productSurfaceId]
        || PLATFORM_CAPABILITY_REGISTRY.products[PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO];
    return Object.freeze({
        contractVersion: PLATFORM_CAPABILITY_REGISTRY.contractVersion,
        productSurfaceId,
        runtimeKind,
        defaultLobbyTransport: productEntry.defaultLobbyTransport,
        toolingSurfaceId: productEntry.toolingSurfaceId,
    });
}

export function isDesktopProductSurface(options = {}) {
    return resolvePlatformProductSurfaceId(options) === PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP;
}

export function resolveDefaultLobbyTransport(options = {}) {
    return resolvePlatformEnvironment(options).defaultLobbyTransport;
}

export function resolveLobbyProviderKind(
    transport,
    fallback = PLATFORM_PROVIDER_KINDS.MENU_STORAGE_BRIDGE
) {
    const normalizedTransport = normalizeLobbyProviderTransport(transport, fallback === ''
        ? ''
        : MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE);
    if (!normalizedTransport) {
        return normalizeString(fallback, PLATFORM_PROVIDER_KINDS.MENU_STORAGE_BRIDGE);
    }
    return normalizeString(
        PLATFORM_CAPABILITY_REGISTRY.lobbyProviders[normalizedTransport],
        normalizeString(fallback, PLATFORM_PROVIDER_KINDS.MENU_STORAGE_BRIDGE)
    );
}

export function resolveCapabilityProviderKind(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const productEntry = PLATFORM_CAPABILITY_REGISTRY.products[productSurfaceId]
        || PLATFORM_CAPABILITY_REGISTRY.products[PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO];
    const providerSpec = productEntry.capabilities?.[normalizedCapabilityId];
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
