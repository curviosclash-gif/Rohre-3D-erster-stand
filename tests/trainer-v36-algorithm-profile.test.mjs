import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTrainerConfig } from '../trainer/config/TrainerConfig.mjs';
import { TrainerSession } from '../trainer/session/TrainerSession.mjs';

function createSessionConfig(overrides = {}) {
    return {
        observationLength: 40,
        replayCapacity: 64,
        maxItemIndex: 2,
        sessionSeed: 1234,
        algorithmProfileName: null,
        replay: {
            prioritized: false,
            priorityAlpha: 0.6,
            priorityBetaStart: 0.4,
            priorityBetaEnd: 1,
            priorityBetaAnnealSteps: 100_000,
        },
        model: {
            hiddenLayers: [16, 8],
            hiddenSize: 16,
            learningRate: 0.01,
            gamma: 0.99,
            batchSize: 4,
            replayWarmup: 4,
            trainEvery: 1,
            targetSyncInterval: 2,
            epsilonStart: 0,
            epsilonEnd: 0,
            epsilonDecaySteps: 100,
            rewardClamp: 10,
        },
        failurePolicy: {
            maxIncomingBytes: 256000,
            maxSocketBufferedAmountBytes: 2000000,
        },
        ...overrides,
    };
}

test('V80 trainer config resolves challenger-balanced algorithm profile to prioritized replay defaults', () => {
    const config = resolveTrainerConfig({
        argv: ['--algorithm-profile', 'challenger-balanced'],
        env: {},
    });

    assert.equal(config.algorithmProfileName, 'challenger-balanced');
    assert.equal(config.replay.prioritized, true);
    assert.equal(config.replay.priorityAlpha, 0.7);
    assert.equal(config.replay.priorityBetaAnnealSteps, 160000);
    assert.equal(config.model.gamma, 0.992);
    assert.equal(config.model.rewardClamp, 12);
});

test('V80 trainer session enables prioritized replay only for challenger algorithm profiles', () => {
    const challengerSession = new TrainerSession({
        sessionId: 'alg-challenger',
        connectionId: 1,
        config: createSessionConfig({
            algorithmProfileName: 'challenger-balanced',
            replay: {
                prioritized: true,
                priorityAlpha: 0.7,
                priorityBetaStart: 0.45,
                priorityBetaEnd: 1,
                priorityBetaAnnealSteps: 160000,
            },
        }),
    });
    const ablationSession = new TrainerSession({
        sessionId: 'alg-ablation',
        connectionId: 2,
        config: createSessionConfig({
            algorithmProfileName: 'ablation-no-per',
            replay: {
                prioritized: false,
                priorityAlpha: 0.6,
                priorityBetaStart: 0.4,
                priorityBetaEnd: 1,
                priorityBetaAnnealSteps: 120000,
            },
        }),
    });

    assert.equal(challengerSession.replayBuffer.prioritized, true);
    assert.equal(challengerSession.getStatsSnapshot().algorithmProfileName, 'challenger-balanced');
    assert.equal(ablationSession.replayBuffer.prioritized, false);
    assert.equal(ablationSession.getStatsSnapshot().algorithmProfileName, 'ablation-no-per');
});
