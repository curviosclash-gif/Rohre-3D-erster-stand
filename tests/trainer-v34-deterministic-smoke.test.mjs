import assert from 'node:assert/strict';
import test from 'node:test';

import { TrainerSession } from '../trainer/session/TrainerSession.mjs';

function createSession(seed) {
    return new TrainerSession({
        sessionId: `det-${seed}`,
        connectionId: seed,
        config: {
            observationLength: 16,
            replayCapacity: 256,
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

function route(session, id, type, payload) {
    return session.routeMessage(
        JSON.stringify({ id, type, payload }),
        { bufferedAmount: 0 }
    );
}

function runDeterministicScenario(seed) {
    const session = createSession(seed);
    const reset = route(session, 1, 'training-reset', {
        operation: 'reset',
        episodeId: 'smoke-episode',
        episodeIndex: 1,
        stepIndex: 0,
        observation: new Array(16).fill(0),
        info: {
            domain: {
                mode: 'classic',
                planarMode: false,
                domainId: 'classic-3d',
            },
        },
    });
    assert.equal(reset.ok, true);

    for (let step = 1; step <= 16; step++) {
        const ack = route(session, 100 + step, 'training-step', {
            operation: 'step',
            episodeId: 'smoke-episode',
            episodeIndex: 1,
            stepIndex: step,
            reward: 1,
            done: step === 16,
            truncated: false,
            observation: new Array(16).fill(step / 16),
            action: {
                yawLeft: step % 2 === 0,
                yawRight: step % 2 === 1,
                shootMG: step % 3 === 0,
            },
            info: {
                domain: {
                    mode: 'classic',
                    planarMode: false,
                    domainId: 'classic-3d',
                },
            },
        });
        assert.equal(ack.ok, true);
    }

    const checkpoint = route(session, 999, 'trainer-checkpoint-request', {});
    assert.equal(checkpoint.ok, true);
    return checkpoint.checkpoint;
}

test('V34 deterministic smoke session reproduces checkpoint for fixed seed', () => {
    const checkpointA = runDeterministicScenario(444);
    const checkpointB = runDeterministicScenario(444);
    const checkpointC = runDeterministicScenario(445);

    assert.deepEqual(checkpointA.online.weightsInputHidden, checkpointB.online.weightsInputHidden);
    assert.deepEqual(checkpointA.online.weightsHiddenOutput, checkpointB.online.weightsHiddenOutput);
    assert.notDeepEqual(checkpointA.online.weightsInputHidden, checkpointC.online.weightsInputHidden);
});
