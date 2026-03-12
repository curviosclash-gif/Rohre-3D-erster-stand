import assert from 'node:assert/strict';
import test from 'node:test';

import { DqnTrainer } from '../trainer/model/DqnTrainer.mjs';
import { ReplayBuffer } from '../trainer/replay/ReplayBuffer.mjs';

function buildTransition(overrides = {}) {
    return {
        state: [1, 0, 0, 0],
        action: {
            yawLeft: false,
            yawRight: false,
            boost: false,
            shootMG: false,
            shootItem: false,
            shootItemIndex: -1,
            useItem: -1,
            dropItem: false,
            nextItem: false,
        },
        reward: 1,
        nextState: [1, 0, 0, 0],
        done: false,
        info: {
            domain: {
                mode: 'classic',
                planarMode: false,
                domainId: 'classic-3d',
            },
        },
        ...overrides,
    };
}

test('V34 DQN trainer initializes deterministically from identical seed', () => {
    const options = {
        observationLength: 4,
        maxItemIndex: 2,
        seed: 42,
        model: {
            hiddenSize: 8,
            learningRate: 0.001,
            gamma: 0.99,
            batchSize: 4,
            replayWarmup: 4,
            trainEvery: 1,
            targetSyncInterval: 2,
            epsilonStart: 0,
            epsilonEnd: 0,
            epsilonDecaySteps: 100,
        },
    };
    const trainerA = new DqnTrainer(options);
    const trainerB = new DqnTrainer(options);
    const observation = [0.25, 0.5, 0.75, 0.125];

    const actionA = trainerA.selectAction(observation, {
        domainId: 'classic-3d',
        planarMode: false,
    });
    const actionB = trainerB.selectAction(observation, {
        domainId: 'classic-3d',
        planarMode: false,
    });

    assert.equal(actionA.policy, 'greedy');
    assert.equal(actionB.policy, 'greedy');
    assert.equal(actionA.actionIndex, actionB.actionIndex);

    const checkpointA = trainerA.exportCheckpoint();
    const checkpointB = trainerB.exportCheckpoint();
    assert.deepEqual(checkpointA.online.weightsInputHidden, checkpointB.online.weightsInputHidden);
    assert.deepEqual(checkpointA.online.weightsHiddenOutput, checkpointB.online.weightsHiddenOutput);
});

test('V34 DQN trainer applies backprop updates from replay samples', () => {
    const trainer = new DqnTrainer({
        observationLength: 4,
        maxItemIndex: 2,
        seed: 7,
        model: {
            hiddenSize: 16,
            learningRate: 0.01,
            gamma: 0.95,
            batchSize: 8,
            replayWarmup: 8,
            trainEvery: 1,
            targetSyncInterval: 4,
            epsilonStart: 0,
            epsilonEnd: 0,
            epsilonDecaySteps: 100,
        },
    });
    const replay = new ReplayBuffer({
        capacity: 64,
        seed: 7,
    });
    const transition = buildTransition();
    for (let i = 0; i < 24; i++) {
        replay.push(transition);
    }

    const before = trainer.onlineNetwork.predict(transition.state)[0];
    let trainedCount = 0;
    let lastLoss = null;
    for (let i = 0; i < 10; i++) {
        const update = trainer.observeTransition(transition, replay);
        if (update.trained) {
            trainedCount += 1;
            lastLoss = update.loss;
        }
    }
    const after = trainer.onlineNetwork.predict(transition.state)[0];

    assert.ok(trainedCount > 0);
    assert.equal(Number.isFinite(lastLoss), true);
    assert.equal(after > before, true);
    assert.equal(trainer.optimizerSteps >= trainedCount, true);
});

test('V34 DQN inference keeps planar actions within safe boundaries', () => {
    const trainer = new DqnTrainer({
        observationLength: 4,
        maxItemIndex: 2,
        seed: 99,
        model: {
            hiddenSize: 8,
            learningRate: 0.001,
            gamma: 0.99,
            batchSize: 4,
            replayWarmup: 4,
            trainEvery: 1,
            targetSyncInterval: 2,
            epsilonStart: 1,
            epsilonEnd: 1,
            epsilonDecaySteps: 10,
        },
    });
    const result = trainer.selectAction([0, 0, 0, 0], {
        domainId: 'hunt-2d',
        planarMode: true,
    });

    assert.equal(result.policy, 'explore');
    assert.equal(result.action.pitchUp, false);
    assert.equal(result.action.pitchDown, false);
    assert.equal(result.action.rollLeft, false);
    assert.equal(result.action.rollRight, false);
    assert.equal(result.action.shootItemIndex <= 2, true);
    assert.equal(result.action.useItem <= 2, true);
});
