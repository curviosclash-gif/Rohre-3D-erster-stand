import assert from 'node:assert/strict';
import test from 'node:test';

import { ObservationBridgePolicy } from '../src/entities/ai/ObservationBridgePolicy.js';

test('ObservationBridgePolicy skips latest checkpoint auto-load in desktop app runtime', async () => {
    const originalFetch = globalThis.fetch;
    const hadAppFlag = Object.prototype.hasOwnProperty.call(globalThis, '__CURVIOS_APP__');
    const originalAppFlag = globalThis.__CURVIOS_APP__;
    const fetchCalls = [];

    globalThis.fetch = async (input) => {
        fetchCalls.push(String(input?.url || input));
        return { ok: false };
    };

    try {
        globalThis.__CURVIOS_APP__ = false;
        new ObservationBridgePolicy({
            type: 'classic-bridge',
            trainerBridgeEnabled: false,
            fallbackPolicy: {
                update() {
                    return { yawRight: true };
                },
            },
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.deepEqual(fetchCalls, ['/api/bot/latest-checkpoint']);

        fetchCalls.length = 0;
        globalThis.__CURVIOS_APP__ = true;
        const desktopPolicy = new ObservationBridgePolicy({
            type: 'classic-bridge',
            trainerBridgeEnabled: false,
            fallbackPolicy: {
                update() {
                    return { yawLeft: true };
                },
            },
        });
        await new Promise((resolve) => setTimeout(resolve, 0));

        const action = desktopPolicy.update(1 / 60, { index: 0, inventory: [] }, {
            mode: 'classic',
            dt: 1 / 60,
            players: [],
            projectiles: [],
            observation: new Array(40).fill(0),
        });

        assert.deepEqual(fetchCalls, []);
        assert.equal(action?.yawLeft, true);
    } finally {
        globalThis.fetch = originalFetch;
        if (hadAppFlag) {
            globalThis.__CURVIOS_APP__ = originalAppFlag;
        } else {
            delete globalThis.__CURVIOS_APP__;
        }
    }
});
