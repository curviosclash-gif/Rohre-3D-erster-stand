import assert from 'node:assert/strict';
import test from 'node:test';

import { OnlineMatchLobby } from '../src/network/OnlineMatchLobby.js';
import { OnlineSessionAdapter } from '../src/network/OnlineSessionAdapter.js';
import { attachMultiplayerLifecycleKernel, detachMultiplayerLifecycleKernel } from '../src/core/runtime/MultiplayerMatchLifecycleKernel.js';
import { GAME_STATE_IDS } from '../src/shared/contracts/GameStateIds.js';

function createEventHarness() {
    const listeners = new Map();
    return {
        on(event, handler) {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event).push(handler);
        },
        off(event, handler) {
            const entries = listeners.get(event) || [];
            const index = entries.indexOf(handler);
            if (index >= 0) entries.splice(index, 1);
        },
        emit(event, payload) {
            for (const handler of listeners.get(event) || []) {
                handler(payload);
            }
        },
    };
}

test('OnlineMatchLobby classifies invalid signaling payloads', () => {
    const lobby = new OnlineMatchLobby({ signalingUrl: 'ws://localhost:1234' });

    let parseError = null;
    try {
        lobby._parseSocketMessage('{broken');
    } catch (error) {
        parseError = error;
    }
    assert.equal(parseError?.code, 'signaling_payload_invalid');

    let missingTypeError = null;
    try {
        lobby._parseSocketMessage(JSON.stringify({ foo: 'bar' }));
    } catch (error) {
        missingTypeError = error;
    }
    assert.equal(missingTypeError?.code, 'signaling_payload_invalid');
});

test('OnlineSessionAdapter rejects missing signaling message type', async () => {
    const adapter = new OnlineSessionAdapter({ isHost: true, signalingUrl: 'ws://localhost:1234' });
    const result = await new Promise((resolve) => {
        adapter._handleSignalingMessage(
            { invalid: true },
            () => resolve({ resolved: true }),
            (error) => resolve({ rejected: true, code: error?.code })
        );
    });

    adapter.dispose();
    assert.equal(result?.rejected, true);
    assert.equal(result?.code, 'signaling_payload_invalid');
});

test('multiplayer lifecycle kernel observes async returnToMenu and suppresses duplicate triggers', async () => {
    const session = createEventHarness();
    let callCount = 0;
    let rejectCall = true;
    const facade = {
        _pendingMatchFinalize: false,
        game: {
            state: GAME_STATE_IDS.PLAYING,
        },
        returnToMenu() {
            callCount += 1;
            if (rejectCall) {
                rejectCall = false;
                return Promise.reject(new Error('simulated-finalize-failure'));
            }
            return Promise.resolve();
        },
    };

    const handlers = attachMultiplayerLifecycleKernel(facade, session);
    session.emit('hostDisconnected', {});
    session.emit('hostDisconnected', {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(callCount, 1);

    session.emit('hostDisconnected', {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(callCount, 2);

    detachMultiplayerLifecycleKernel(session, handlers);
});
