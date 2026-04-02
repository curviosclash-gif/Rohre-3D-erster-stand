import assert from 'node:assert/strict';
import test from 'node:test';

import { TrainerSession } from '../trainer/session/TrainerSession.mjs';

function createSession(seed = 901) {
    return new TrainerSession({
        sessionId: `safety-${seed}`,
        connectionId: seed,
        config: {
            observationLength: 40,
            replayCapacity: 64,
            maxItemIndex: 2,
            sessionSeed: seed,
            model: {
                hiddenSize: 16,
                learningRate: 0.01,
                gamma: 0.95,
                batchSize: 4,
                replayWarmup: 4,
                trainEvery: 1,
                targetSyncInterval: 2,
                epsilonStart: 0,
                epsilonEnd: 0,
                epsilonDecaySteps: 100,
            },
            failurePolicy: {
                maxIncomingBytes: 256000,
                maxSocketBufferedAmountBytes: 2000000,
            },
        },
    });
}

function createObservation(overrides = {}) {
    const observation = new Array(40).fill(0);
    observation[1] = 1;
    observation[3] = 0.8;
    observation[4] = 0.6;
    observation[5] = 0.6;
    observation[6] = 0.5;
    observation[7] = 0.5;
    observation[8] = 0.4;
    observation[9] = 0.2;
    observation[10] = 1;
    observation[11] = 0.25;
    observation[12] = 0;
    observation[13] = 0.7;
    for (const [index, value] of Object.entries(overrides)) {
        observation[Number(index)] = value;
    }
    return observation;
}

function routeActionRequest(session, observation, player = null) {
    return session.routeMessage(JSON.stringify({
        id: 1,
        type: 'bot-action-request',
        payload: {
            mode: 'classic',
            planarMode: false,
            domainId: 'classic-3d',
            observation,
            player,
        },
    }), { bufferedAmount: 0 });
}

test('V36 trainer action safety layer forces evasion and locks risky actions under collision threat', () => {
    const session = createSession(1101);
    session._model.selectAction = () => ({
        action: {
            yawRight: true,
            boost: true,
            shootMG: true,
            shootItem: true,
            shootItemIndex: 1,
            useItem: 1,
        },
        actionIndex: 0,
        epsilon: 0,
        policy: 'greedy',
    });

    const response = routeActionRequest(
        session,
        createObservation({
            3: 0.12,
            4: 0.82,
            5: 0.16,
            11: 0.94,
            12: 1,
            13: 0.18,
        }),
        {
            hp: 18,
            maxHp: 100,
            shieldHp: 0,
            maxShieldHp: 100,
        }
    );

    assert.equal(response.ok, true);
    assert.equal(response.action.yawLeft, true);
    assert.equal(response.action.yawRight, false);
    assert.equal(response.action.boost, false);
    assert.equal(response.action.shootMG, false);
    assert.equal(response.action.shootItem, false);
    assert.equal(response.action.shootItemIndex, -1);
    assert.equal(response.action.useItem, -1);
});

test('V36 trainer action safety layer keeps aggressive actions when corridor and vitality are safe', () => {
    const session = createSession(1102);
    session._model.selectAction = () => ({
        action: {
            yawRight: true,
            boost: true,
            shootMG: true,
            shootItem: true,
            shootItemIndex: 2,
            useItem: 2,
        },
        actionIndex: 0,
        epsilon: 0,
        policy: 'greedy',
    });

    const response = routeActionRequest(
        session,
        createObservation({
            1: 0.92,
            3: 0.84,
            4: 0.64,
            5: 0.72,
            11: 0.24,
            12: 0,
            13: 0.78,
        }),
        {
            hp: 92,
            maxHp: 100,
            shieldHp: 40,
            maxShieldHp: 50,
        }
    );

    assert.equal(response.ok, true);
    assert.equal(response.action.yawRight, true);
    assert.equal(response.action.yawLeft, false);
    assert.equal(response.action.boost, true);
    assert.equal(response.action.shootMG, true);
    assert.equal(response.action.shootItem, false);
    assert.equal(response.action.shootItemIndex, -1);
    assert.equal(response.action.useItem, -1);
    assert.equal(response.intent?.applied, 'combat');
    assert.equal(response.control?.itemAllowed, false);
});

test('V36 trainer fallback heuristic uses wall clearance instead of stale indices', () => {
    const session = createSession(1103);
    session._model.selectAction = () => {
        throw new Error('force-fallback');
    };

    const response = routeActionRequest(
        session,
        createObservation({
            3: 0.15,
            4: 0.78,
            5: 0.12,
            9: 0.9,
            11: 0.8,
            12: 0,
            13: 0.22,
        }),
        {
            hp: 80,
            maxHp: 100,
            shieldHp: 0,
            maxShieldHp: 100,
        }
    );

    assert.equal(response.ok, true);
    assert.equal(response.action.yawLeft, true);
    assert.equal(response.action.yawRight, false);
    assert.equal(response.action.boost, false);
    assert.equal(response.action.shootMG, false);
});
