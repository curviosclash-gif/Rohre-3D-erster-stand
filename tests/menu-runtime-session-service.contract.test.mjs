import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProductiveMultiplayerTransport } from '../src/core/runtime/MenuRuntimeSessionService.js';
import { PLATFORM_PRODUCT_SURFACE_IDS } from '../src/shared/contracts/PlatformCapabilityRegistry.js';
import { MULTIPLAYER_TRANSPORTS } from '../src/shared/contracts/RuntimeSessionContract.js';

function createGame(multiplayerTransport = '') {
    return {
        settings: {
            localSettings: {
                multiplayerTransport,
            },
        },
        uiManager: {
            _runtimeFeatureFlags: {
                surfacePolicy: {
                    productSurfaceId: PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP,
                },
            },
        },
    };
}

test('resolveProductiveMultiplayerTransport falls back to LAN when online is selected without configured signaling', () => {
    const previousSignalingUrl = globalThis.__SIGNALING_URL__;
    const hadOwnSignalingUrl = Object.prototype.hasOwnProperty.call(globalThis, '__SIGNALING_URL__');
    delete globalThis.__SIGNALING_URL__;

    try {
        const resolved = resolveProductiveMultiplayerTransport(
            createGame(MULTIPLAYER_TRANSPORTS.ONLINE),
            MULTIPLAYER_TRANSPORTS.ONLINE
        );
        assert.equal(resolved, MULTIPLAYER_TRANSPORTS.LAN);
    } finally {
        if (hadOwnSignalingUrl) {
            globalThis.__SIGNALING_URL__ = previousSignalingUrl;
        } else {
            delete globalThis.__SIGNALING_URL__;
        }
    }
});

test('resolveProductiveMultiplayerTransport keeps online when signaling is configured', () => {
    const previousSignalingUrl = globalThis.__SIGNALING_URL__;
    const hadOwnSignalingUrl = Object.prototype.hasOwnProperty.call(globalThis, '__SIGNALING_URL__');
    globalThis.__SIGNALING_URL__ = 'wss://signal.example.test';

    try {
        const resolved = resolveProductiveMultiplayerTransport(
            createGame(MULTIPLAYER_TRANSPORTS.ONLINE),
            MULTIPLAYER_TRANSPORTS.ONLINE
        );
        assert.equal(resolved, MULTIPLAYER_TRANSPORTS.ONLINE);
    } finally {
        if (hadOwnSignalingUrl) {
            globalThis.__SIGNALING_URL__ = previousSignalingUrl;
        } else {
            delete globalThis.__SIGNALING_URL__;
        }
    }
});
