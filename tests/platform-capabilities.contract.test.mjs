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
import { StoragePlatform } from '../src/state/storage/StoragePlatform.js';
import { createMenuMultiplayerDiscoveryPort } from '../src/ui/menu/multiplayer/MenuMultiplayerDiscoveryPort.js';

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
