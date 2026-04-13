import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createBrowserDiscoveryAdapter,
    createBrowserHostAdapter,
} from '../src/platform/browser/BrowserPlatformAdapters.js';
import {
    createElectronPreloadDiscoveryAdapter,
    createElectronPreloadSaveAdapter,
} from '../src/platform/electron/ElectronPlatformBridge.js';
import {
    PLATFORM_CAPABILITY_IDS,
} from '../src/shared/contracts/PlatformCapabilityContract.js';
import {
    PLATFORM_PRODUCT_SURFACE_IDS,
    PLATFORM_PROVIDER_KINDS,
    PLATFORM_SURFACE_MULTIPLAYER_ROLES,
    PLATFORM_SURFACE_POLICY_MODES,
    resolveCapabilityProviderKind,
    resolveSurfaceCapabilityAccess,
    resolveSurfacePolicy,
} from '../src/shared/contracts/PlatformCapabilityRegistry.js';
import { StoragePlatform } from '../src/state/storage/StoragePlatform.js';
import { resolveRuntimeMenuFeatureFlags } from '../src/ui/menu/MenuRuntimeFeatureFlags.js';
import { createMenuMultiplayerDiscoveryPort } from '../src/ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js';
import { createMenuMultiplayerHostIpResolver } from '../src/ui/menu/multiplayer/MenuMultiplayerHostIpResolver.js';

test('V87.3 Electron discovery adapter suppresses stale capability availability without intents', () => {
    const runtimeGlobal = {
        __CURVIOS_APP__: true,
        curviosApp: {
            isApp: true,
            contracts: {
                discovery: {
                    contractVersion: 'preload.discovery.test',
                },
            },
            capabilities: {
                discovery: {
                    available: true,
                    providerKind: 'electron-ipc',
                    supportsSubscribe: true,
                },
            },
        },
    };

    const adapter = createElectronPreloadDiscoveryAdapter(runtimeGlobal);
    assert.equal(adapter.capability.available, false);
    assert.equal(adapter.isAvailable(), false);
    assert.equal(adapter.startDiscovery, null);
    assert.equal(adapter.getDiscoveredHosts, null);
    assert.equal(adapter.onDiscoveredHosts, null);
    assert.equal(adapter.capability.degradedReason, 'discovery_unavailable');
    assert.equal(adapter.capability.supportsSubscribe, false);
});

test('V87.3 Browser discovery port stays unavailable when desktop fallbacks are absent', async () => {
    const port = createMenuMultiplayerDiscoveryPort({
        runtime: { global: {} },
    });

    assert.equal(port.isAvailable(), false);
    assert.deepEqual(await Promise.resolve(port.getHosts()), []);
    assert.equal(typeof port.subscribe(() => {}), 'function');
});

test('V87.3 Browser platform adapters expose null intents while capability availability stays false', () => {
    const discovery = createBrowserDiscoveryAdapter();
    const host = createBrowserHostAdapter();

    assert.equal(discovery.isAvailable(), false);
    assert.equal(discovery.capability.available, false);
    assert.equal(discovery.startDiscovery, null);
    assert.equal(discovery.stopDiscovery, null);
    assert.equal(discovery.getDiscoveredHosts, null);
    assert.equal(discovery.onDiscoveredHosts, null);
    assert.equal(host.isAvailable(), false);
    assert.equal(host.capability.available, false);
    assert.equal(host.getLanServerStatus, null);
    assert.equal(host.startLanServer, null);
    assert.equal(host.stopLanServer, null);
});

test('V77.2.1 surface policy contract keeps desktop default-full and browser default-deny', () => {
    const desktopPolicy = resolveSurfacePolicy({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserPolicy = resolveSurfacePolicy({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopPolicy.defaultAccessMode, PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL);
    assert.equal(desktopPolicy.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.HOST_AND_JOIN);
    assert.equal(desktopPolicy.requiresCuratedMaps, false);
    assert.ok(desktopPolicy.allowedGameModes.includes('Arcade'));

    assert.equal(browserPolicy.defaultAccessMode, PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY);
    assert.equal(browserPolicy.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY);
    assert.equal(browserPolicy.requiresCuratedMaps, true);
    assert.ok(browserPolicy.allowedGameModes.includes('Parcours'));
});

test('V77.2.1 browser host provider resolves unavailable when host capability is disabled', () => {
    const providerKind = resolveCapabilityProviderKind(PLATFORM_CAPABILITY_IDS.HOST, {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
        available: false,
    });
    assert.equal(providerKind, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
});

test('V77.2.2 surface capability access resolves host denylist and discovery allowlist per product surface', () => {
    const desktopHost = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.HOST, {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserHost = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.HOST, {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });
    const browserDiscovery = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.DISCOVERY, {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopHost.available, true);
    assert.equal(desktopHost.providerKind, PLATFORM_PROVIDER_KINDS.ELECTRON_IPC);
    assert.equal(browserHost.available, false);
    assert.equal(browserHost.providerKind, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
    assert.equal(browserDiscovery.available, true);
    assert.equal(browserDiscovery.providerKind, PLATFORM_PROVIDER_KINDS.BROWSER_DEMO);
});

test('V77.2.3 default access mode resolves unknown capabilities as default-full (desktop) and default-deny (browser)', () => {
    const desktopUnknown = resolveSurfaceCapabilityAccess('future-surface-feature', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserUnknown = resolveSurfaceCapabilityAccess('future-surface-feature', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopUnknown.defaultAccessMode, PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL);
    assert.equal(desktopUnknown.available, true);
    assert.equal(desktopUnknown.providerKind, PLATFORM_PROVIDER_KINDS.ELECTRON_IPC);
    assert.equal(desktopUnknown.resolvedByDefaultPolicy, true);

    assert.equal(browserUnknown.defaultAccessMode, PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY);
    assert.equal(browserUnknown.available, false);
    assert.equal(browserUnknown.providerKind, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
    assert.equal(browserUnknown.resolvedByDefaultPolicy, true);
});

test('V77.2.3 explicit browser save capability stays opt-in and bypasses default deny fallback', () => {
    const browserSave = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.SAVE, {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(browserSave.available, true);
    assert.equal(browserSave.providerKind, PLATFORM_PROVIDER_KINDS.BROWSER_DOWNLOAD);
    assert.equal(browserSave.resolvedByDefaultPolicy, false);
});

test('V77.2.2 runtime menu feature flags read host access from surface capability contract', () => {
    const desktopFlags = resolveRuntimeMenuFeatureFlags(null, {
        __CURVIOS_APP__: true,
        curviosApp: { isApp: true },
    });
    const browserFlags = resolveRuntimeMenuFeatureFlags(null, {});

    assert.equal(desktopFlags.canHost, true);
    assert.equal(browserFlags.canHost, false);
});

test('V77.2.2 browser host IP resolver stays on localhost when surface policy denies hosting', async () => {
    let customCalls = 0;
    const resolver = createMenuMultiplayerHostIpResolver({
        runtime: {},
        resolveHostIp: async () => {
            customCalls += 1;
            return '192.168.0.10';
        },
    });

    assert.equal(await resolver.resolve(), 'localhost');
    assert.equal(customCalls, 0);
});

test('V87.99 StoragePlatform surfaces partial legacy migrations when legacy-key removal fails', () => {
    const memory = new Map();
    memory.set('legacy.settings', JSON.stringify({
        numBots: 2,
        localSettings: {
            shadowQuality: 2,
        },
    }));

    const warnings = [];
    const migrationEvents = [];
    const originalWarn = console.warn;
    console.warn = (...args) => {
        warnings.push(args.map((entry) => String(entry)).join(' '));
    };

    try {
        const storage = {
            getItem(key) {
                return memory.has(key) ? memory.get(key) : null;
            },
            setItem(key, value) {
                memory.set(key, String(value));
            },
            removeItem() {
                throw new Error('remove_blocked');
            },
        };

        const platform = new StoragePlatform({
            storage,
            onMigrationResult(resultEntry) {
                migrationEvents.push(resultEntry);
            },
        });
        const parsed = platform.readJson('current.settings', ['legacy.settings'], null);
        const migrationResult = platform.getLastMigrationResult('current.settings');

        assert.equal(parsed?.numBots, 2);
        assert.notEqual(memory.get('current.settings') || null, null);
        assert.notEqual(memory.get('legacy.settings') || null, null);
        assert.equal(migrationResult?.attempted, true);
        assert.equal(migrationResult?.migrated, false);
        assert.equal(migrationResult?.ok, false);
        assert.equal(migrationResult?.writeOk, true);
        assert.equal(migrationResult?.removeOk, false);
        assert.equal(migrationResult?.status, 'remove_failed');
        assert.equal(migrationResult?.reason, 'remove_blocked');
        assert.equal(migrationEvents.length, 1);
        assert.equal(warnings.length, 1);
        assert.match(warnings[0] || '', /Legacy storage migration incomplete/);
    } finally {
        console.warn = originalWarn;
    }
});

test('V87.3 Electron save adapter clears fallback degradedReason when invoke basis is available', () => {
    const runtimeGlobal = {
        __CURVIOS_APP__: true,
        curviosApp: {
            isApp: true,
            saveReplay: async () => ({ saved: true }),
            capabilities: {
                save: {
                    available: true,
                    providerKind: 'electron-ipc',
                },
            },
        },
    };

    const adapter = createElectronPreloadSaveAdapter(runtimeGlobal);
    assert.equal(adapter.capability.available, true);
    assert.equal(adapter.isAvailable(), true);
    assert.equal(adapter.capability.degradedReason, '');
    assert.equal(typeof adapter.saveReplay, 'function');
    assert.equal(adapter.saveVideo, null);
    assert.equal(adapter.capability.supportsBinaryExport, false);
});
