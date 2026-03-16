import assert from 'node:assert/strict';
import test from 'node:test';

import { ReplayBuffer } from '../trainer/replay/ReplayBuffer.mjs';
import {
    buildReplayTransition,
    validateTrainingFramePayload,
} from '../trainer/replay/TransitionSchema.mjs';

test('V34 replay schema normalizes transition payload and masks action lanes', () => {
    const validated = validateTrainingFramePayload({
        operation: 'step',
        contractVersion: 'v1',
        episodeId: 'episode-7',
        episodeIndex: 7,
        stepIndex: 2,
        reward: '1.25',
        done: false,
        truncated: true,
        observation: [0.5, Number.NaN, 50_000, -50_000],
        action: {
            yawLeft: true,
            yawRight: true,
            pitchUp: true,
            pitchDown: true,
            rollLeft: true,
            rollRight: true,
            shootItem: false,
            shootItemIndex: 99,
            useItem: 7,
        },
        info: {
            domain: {
                mode: 'hunt',
                planarMode: true,
                domainId: 'hunt-2d',
            },
        },
    }, {
        observationLength: 4,
        maxItemIndex: 2,
        sessionState: {
            lastObservation: [0.1, 0.2, 0.3, 0.4],
        },
    });

    assert.equal(validated.ok, true);
    assert.equal(validated.frame.observation.length, 4);
    assert.deepEqual(validated.frame.observation, [0.5, 0, 10_000, -10_000]);
    assert.equal(validated.frame.action.yawLeft, false);
    assert.equal(validated.frame.action.yawRight, false);
    assert.equal(validated.frame.action.pitchUp, false);
    assert.equal(validated.frame.action.rollLeft, false);
    assert.equal(validated.frame.action.shootItemIndex, -1);
    assert.equal(validated.frame.action.useItem, -1);

    const transitionResult = buildReplayTransition(validated.frame, {
        lastObservation: [1, 1, 1, 1],
    }, {
        observationLength: 4,
        maxItemIndex: 2,
    });

    assert.equal(transitionResult.ok, true);
    assert.equal(transitionResult.transition.done, true);
    assert.deepEqual(transitionResult.transition.state, [1, 1, 1, 1]);
    assert.deepEqual(transitionResult.transition.nextState, [0.5, 0, 10_000, -10_000]);
});

test('V34 replay buffer enforces capacity and deterministic sampling', () => {
    const entries = [
        { stepIndex: 1, state: [1], action: {}, reward: 0.1, nextState: [2], done: false, info: {} },
        { stepIndex: 2, state: [2], action: {}, reward: 0.2, nextState: [3], done: false, info: {} },
        { stepIndex: 3, state: [3], action: {}, reward: 0.3, nextState: [4], done: true, info: {} },
    ];

    const bufferA = new ReplayBuffer({ capacity: 2, seed: 77 });
    const bufferB = new ReplayBuffer({ capacity: 2, seed: 77 });
    for (const entry of entries) {
        bufferA.push(entry);
        bufferB.push(entry);
    }

    assert.equal(bufferA.size, 2);
    const sampleA = bufferA.sample(2).map((entry) => entry.stepIndex).sort((left, right) => left - right);
    const sampleB = bufferB.sample(2).map((entry) => entry.stepIndex).sort((left, right) => left - right);
    assert.deepEqual(sampleA, sampleB);
    assert.deepEqual(sampleA, [2, 3]);
});
