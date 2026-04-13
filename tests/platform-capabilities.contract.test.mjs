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
    PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES,
    PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS,
    PLATFORM_SURFACE_MENU_MODE_PATHS,
    PLATFORM_SURFACE_MULTIPLAYER_ROLES,
    PLATFORM_SURFACE_POLICY_MODES,
    PLATFORM_SURFACE_QUICK_START_ACTION_IDS,
    isLegacyLobbyTransport,
    normalizeLobbyProviderTransport,
    resolveCapabilityProviderKind,
    resolveDefaultLobbyTransport,
    resolveLobbyProviderKind,
    resolveSurfaceCapabilityAccess,
    resolveSurfaceDeveloperAccess,
    resolveSurfacePolicy,
} from '../src/shared/contracts/PlatformCapabilityRegistry.js';
import {
    isLegacyMultiplayerTransport,
    normalizeMultiplayerTransport,
} from '../src/shared/contracts/RuntimeSessionContract.js';
import {
    normalizeLobbyServiceTransport,
} from '../src/shared/contracts/LobbyServiceContract.js';
import {
    isSurfacePresetAllowed,
    isSurfaceQuickStartActionAllowed,
    isSurfaceSessionTypeAllowed,
    listSurfaceAllowedMapKeysForModePath,
    listSurfaceAllowedSessionTypes,
    resolveSurfaceBlockedFeatureFeedback,
    resolveSurfaceEntryCopy,
    resolveSurfaceMultiplayerGateAccess,
} from '../src/shared/contracts/PlatformSurfacePolicyOps.js';
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
    assert.deepEqual(desktopPolicy.allowedSessionTypes, ['single', 'multiplayer', 'splitscreen']);
    assert.equal(desktopPolicy.defaultMultiplayerTransport, 'lan');
    assert.deepEqual(desktopPolicy.allowedMultiplayerTransports, ['lan', 'online']);
    assert.deepEqual(desktopPolicy.hostMultiplayerTransports, ['lan', 'online']);
    assert.ok(desktopPolicy.allowedGameModes.includes('Arcade'));
    assert.ok(desktopPolicy.allowedModePaths.includes(PLATFORM_SURFACE_MENU_MODE_PATHS.QUICK_ACTION));

    assert.equal(browserPolicy.defaultAccessMode, PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY);
    assert.equal(browserPolicy.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY);
    assert.equal(browserPolicy.requiresCuratedMaps, true);
    assert.deepEqual(browserPolicy.allowedSessionTypes, ['single', 'multiplayer']);
    assert.equal(browserPolicy.defaultMultiplayerTransport, 'lan');
    assert.deepEqual(browserPolicy.allowedMultiplayerTransports, ['lan']);
    assert.deepEqual(browserPolicy.hostMultiplayerTransports, []);
    assert.deepEqual(browserPolicy.joinMultiplayerTransports, ['lan']);
    assert.deepEqual(browserPolicy.legacyMultiplayerTransports, ['storage-bridge']);
    assert.ok(browserPolicy.allowedGameModes.includes('Parcours'));
    assert.deepEqual(browserPolicy.allowedPresetIds, ['arcade', 'fight-standard', 'normal-standard']);
    assert.deepEqual(browserPolicy.curatedMapKeysByModePath.arcade, ['parcours_rift']);
    assert.equal(browserPolicy.allowedModePaths.includes(PLATFORM_SURFACE_MENU_MODE_PATHS.QUICK_ACTION), false);
});

test('V77.4.1 default lobby transport follows the shared surface transport matrix', () => {
    assert.equal(resolveDefaultLobbyTransport({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    }), 'lan');
    assert.equal(resolveDefaultLobbyTransport({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    }), 'lan');
});

test('V77.3.1 browser surface policy exposes curated map and preset allowlists while quickstart stays unavailable', () => {
    assert.deepEqual(
        listSurfaceAllowedMapKeysForModePath(PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL, {
            productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
        }),
        ['standard', 'maze']
    );
    assert.equal(isSurfacePresetAllowed('arcade', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    }), true);
    assert.equal(isSurfacePresetAllowed('competitive', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    }), false);
    assert.equal(isSurfaceQuickStartActionAllowed(PLATFORM_SURFACE_QUICK_START_ACTION_IDS.EVENT_PLAYLIST, {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    }), false);
});

test('V77.3.2 blocked demo actions share the same UX feedback contract', () => {
    const blockedQuickStart = resolveSurfaceBlockedFeatureFeedback('Direktstart', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });
    const blockedPreset = resolveSurfaceBlockedFeatureFeedback('Dieses Preset', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });
    const blockedDesktop = resolveSurfaceBlockedFeatureFeedback('Direktstart', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });

    assert.equal(blockedQuickStart.reason, 'surface_policy_blocked');
    assert.equal(blockedQuickStart.tone, 'warning');
    assert.equal(blockedQuickStart.durationMs, 1600);
    assert.match(blockedQuickStart.message, /Direktstart ist in dieser Demo nicht verfuegbar/);
    assert.match(blockedPreset.message, /ist in dieser Demo nicht verfuegbar/);
    assert.match(blockedDesktop.message, /ist in dieser Surface nicht verfuegbar/);
});

test('V77.3.3 surface entry copy cuts showcase, join-only and splitscreen access per surface', () => {
    const desktopEntryCopy = resolveSurfaceEntryCopy({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
        sessionType: 'single',
    });
    const browserEntryCopy = resolveSurfaceEntryCopy({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
        sessionType: 'single',
    });

    assert.deepEqual(listSurfaceAllowedSessionTypes({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    }), ['single', 'multiplayer']);
    assert.equal(isSurfaceSessionTypeAllowed('splitscreen', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    }), false);
    assert.equal(browserEntryCopy.startButtonLabel, 'Showcase starten');
    assert.equal(browserEntryCopy.hostButtonLabel, 'Nur Desktop');
    assert.equal(browserEntryCopy.joinButtonLabel, 'Join only');
    assert.match(browserEntryCopy.multiplayerSubtitle, /hostet aber nicht/);
    assert.equal(desktopEntryCopy.hostButtonLabel, 'Host');
    assert.equal(desktopEntryCopy.sessionSummaryLabels.single, 'Single Player');
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

test('V77.2.4 developer access contract keeps expert gates local-only instead of product promises', () => {
    const desktopDeveloperAccess = resolveSurfaceDeveloperAccess({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserDeveloperAccess = resolveSurfaceDeveloperAccess({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopDeveloperAccess.available, true);
    assert.equal(desktopDeveloperAccess.accessMode, PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.LOCAL_UNLOCK);
    assert.equal(desktopDeveloperAccess.reason, PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.LOCAL_DEVTOOLS);
    assert.match(desktopDeveloperAccess.message, /Produktversprechen der Vollversion/);

    assert.equal(browserDeveloperAccess.available, true);
    assert.equal(browserDeveloperAccess.accessMode, PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.LOCAL_UNLOCK);
    assert.equal(browserDeveloperAccess.reason, PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.DEMO_LOCAL_DEVTOOLS);
    assert.match(browserDeveloperAccess.message, /kein Demo-Unlock/);
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

test('V77.4.2 normalizer defaults resolve to productive LAN transport instead of legacy storage-bridge', () => {
    assert.equal(normalizeMultiplayerTransport(''), 'lan');
    assert.equal(normalizeMultiplayerTransport(undefined), 'lan');
    assert.equal(normalizeMultiplayerTransport(null), 'lan');
    assert.equal(normalizeMultiplayerTransport('storage-bridge'), 'storage-bridge');

    assert.equal(normalizeLobbyProviderTransport(''), 'lan');
    assert.equal(normalizeLobbyProviderTransport(undefined), 'lan');
    assert.equal(normalizeLobbyProviderTransport('storage-bridge'), 'storage-bridge');

    assert.equal(normalizeLobbyServiceTransport(''), 'lan');
    assert.equal(normalizeLobbyServiceTransport(undefined), 'lan');
    assert.equal(normalizeLobbyServiceTransport('storage-bridge'), 'storage-bridge');
});

test('V77.4.2 isLegacyMultiplayerTransport and isLegacyLobbyTransport identify storage-bridge as legacy', () => {
    assert.equal(isLegacyMultiplayerTransport('storage-bridge'), true);
    assert.equal(isLegacyMultiplayerTransport('lan'), false);
    assert.equal(isLegacyMultiplayerTransport('online'), false);
    assert.equal(isLegacyMultiplayerTransport(''), false);
    assert.equal(isLegacyMultiplayerTransport(undefined), false);

    assert.equal(isLegacyLobbyTransport('storage-bridge'), true);
    assert.equal(isLegacyLobbyTransport('lan'), false);
    assert.equal(isLegacyLobbyTransport('online'), false);
    assert.equal(isLegacyLobbyTransport(''), false);
});

test('V77.4.2 resolveLobbyProviderKind defaults to LAN lobby instead of legacy storage-bridge', () => {
    assert.equal(resolveLobbyProviderKind('lan'), PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY);
    assert.equal(resolveLobbyProviderKind(''), PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY);
    assert.equal(resolveLobbyProviderKind(undefined), PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY);
    assert.equal(resolveLobbyProviderKind('storage-bridge'), PLATFORM_PROVIDER_KINDS.MENU_STORAGE_BRIDGE);
    assert.equal(resolveLobbyProviderKind('online'), PLATFORM_PROVIDER_KINDS.MENU_ONLINE_LOBBY);
});

test('V77.4.2 surface policy keeps storage-bridge only in legacyMultiplayerTransports, not in productive defaults', () => {
    const desktopPolicy = resolveSurfacePolicy({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserPolicy = resolveSurfacePolicy({
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopPolicy.defaultMultiplayerTransport, 'lan');
    assert.ok(!desktopPolicy.allowedMultiplayerTransports.includes('storage-bridge'));
    assert.ok(!desktopPolicy.hostMultiplayerTransports.includes('storage-bridge'));
    assert.ok(!desktopPolicy.joinMultiplayerTransports.includes('storage-bridge'));
    assert.deepEqual(desktopPolicy.legacyMultiplayerTransports, ['storage-bridge']);

    assert.equal(browserPolicy.defaultMultiplayerTransport, 'lan');
    assert.ok(!browserPolicy.allowedMultiplayerTransports.includes('storage-bridge'));
    assert.ok(!browserPolicy.hostMultiplayerTransports.includes('storage-bridge'));
    assert.ok(!browserPolicy.joinMultiplayerTransports.includes('storage-bridge'));
    assert.deepEqual(browserPolicy.legacyMultiplayerTransports, ['storage-bridge']);
});

test('V77.4.3 desktop host gate allows hosting while browser-demo denies it', () => {
    const desktopHost = resolveSurfaceMultiplayerGateAccess('host', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserHost = resolveSurfaceMultiplayerGateAccess('host', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopHost.allowed, true);
    assert.equal(desktopHost.action, 'host');
    assert.equal(desktopHost.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.HOST_AND_JOIN);
    assert.equal(desktopHost.reason, '');

    assert.equal(browserHost.allowed, false);
    assert.equal(browserHost.action, 'host');
    assert.equal(browserHost.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY);
    assert.equal(browserHost.reason, 'surface_host_denied');
    assert.match(browserHost.message, /Desktop-Vollversion/);
    assert.equal(browserHost.tone, 'warning');
    assert.ok(browserHost.durationMs > 0);
});

test('V77.4.3 both surfaces allow join while browser-demo stays join-only role', () => {
    const desktopJoin = resolveSurfaceMultiplayerGateAccess('join', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserJoin = resolveSurfaceMultiplayerGateAccess('join', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopJoin.allowed, true);
    assert.equal(desktopJoin.action, 'join');
    assert.equal(desktopJoin.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.HOST_AND_JOIN);

    assert.equal(browserJoin.allowed, true);
    assert.equal(browserJoin.action, 'join');
    assert.equal(browserJoin.multiplayerRole, PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY);
});

test('V77.4.3 both surfaces allow discovery', () => {
    const desktopDiscover = resolveSurfaceMultiplayerGateAccess('discover', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
    });
    const browserDiscover = resolveSurfaceMultiplayerGateAccess('discover', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(desktopDiscover.allowed, true);
    assert.equal(desktopDiscover.action, 'discover');
    assert.equal(browserDiscover.allowed, true);
    assert.equal(browserDiscover.action, 'discover');
});

test('V77.4.3 unknown multiplayer action is denied with structured feedback', () => {
    const unknownAction = resolveSurfaceMultiplayerGateAccess('', {
        productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO,
    });

    assert.equal(unknownAction.allowed, false);
    assert.equal(unknownAction.reason, 'surface_unknown_action');
    assert.match(unknownAction.message, /Unbekannte Multiplayer-Aktion/);
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
