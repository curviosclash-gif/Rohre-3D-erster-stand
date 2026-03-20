import assert from 'node:assert/strict';
import test from 'node:test';

import { DqnMlpNetwork } from '../trainer/model/DqnMlpNetwork.mjs';
import { DqnTrainer, CHECKPOINT_CONTRACT_V35, CHECKPOINT_CONTRACT_V34 } from '../trainer/model/DqnTrainer.mjs';
import { LocalDqnInference } from '../src/entities/ai/inference/LocalDqnInference.js';
import { validateDqnCheckpointPayload } from '../trainer/model/CheckpointValidation.mjs';

test('v35 multi-layer network forward pass produces correct dimensions', () => {
    const net = new DqnMlpNetwork({
        inputSize: 40,
        hiddenLayers: [256, 128],
        outputSize: 21,
        seed: 1,
    });
    assert.equal(net.layers.length, 3); // input→256, 256→128, 128→21
    assert.equal(net.inputSize, 40);
    assert.equal(net.outputSize, 21);
    assert.equal(net.hiddenLayers.length, 2);
    assert.deepEqual(net.hiddenLayers, [256, 128]);

    const output = net.predict(new Array(40).fill(0.5));
    assert.equal(output.length, 21);
    assert.ok(output.every(v => Number.isFinite(v)));
});

test('v35 checkpoint export/import round-trip preserves weights', () => {
    const net = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [32, 16],
        outputSize: 5,
        seed: 42,
    });
    const exported = net.exportState();
    assert.equal(exported.layers.length, 3);
    assert.deepEqual(exported.hiddenLayers, [32, 16]);

    const net2 = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [32, 16],
        outputSize: 5,
        seed: 99, // different seed
    });
    const input = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const before = net2.predict(input);
    const ok = net2.importState(exported);
    assert.equal(ok, true);
    const after = net2.predict(input);
    const original = net.predict(input);
    assert.deepEqual(after, original);
    // Should differ from before import (different seed)
    assert.notDeepEqual(after, before);
});

test('v35 DqnTrainer exports v35 contract and imports it back', () => {
    const trainer = new DqnTrainer({
        observationLength: 10,
        maxItemIndex: 2,
        seed: 7,
        model: {
            hiddenLayers: [32, 16],
            learningRate: 0.001,
            gamma: 0.99,
            batchSize: 4,
            replayWarmup: 4,
            trainEvery: 1,
            targetSyncInterval: 2,
            epsilonStart: 0,
            epsilonEnd: 0,
        },
    });
    const checkpoint = trainer.exportCheckpoint();
    assert.equal(checkpoint.contractVersion, CHECKPOINT_CONTRACT_V35);
    assert.equal(Array.isArray(checkpoint.online.layers), true);
    assert.equal(checkpoint.online.layers.length, 3);

    // Import into fresh trainer with same architecture
    const trainer2 = new DqnTrainer({
        observationLength: 10,
        maxItemIndex: 2,
        seed: 99,
        model: { hiddenLayers: [32, 16] },
    });
    const result = trainer2.importCheckpoint(checkpoint);
    assert.equal(result.ok, true);

    // Both should produce identical predictions
    const obs = new Array(10).fill(0.5);
    const pred1 = trainer.onlineNetwork.predict(obs);
    const pred2 = trainer2.onlineNetwork.predict(obs);
    assert.deepEqual(pred1, pred2);
});

test('v34 checkpoint loads into v35 trainer (migration)', () => {
    // First create a trainer to know the correct action count
    const trainer = new DqnTrainer({
        observationLength: 10,
        maxItemIndex: 2,
        seed: 99,
        model: { hiddenLayers: [16] },
    });
    const actionCount = trainer.actionVocabulary.size;

    // Create a v34-style checkpoint with matching dimensions
    const oldNet = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [16],
        outputSize: actionCount,
        seed: 42,
    });
    const v34Checkpoint = {
        contractVersion: CHECKPOINT_CONTRACT_V34,
        seed: 42,
        envSteps: 100,
        optimizerSteps: 25,
        lastLoss: 0.05,
        lastTargetSyncAt: 20,
        observationLength: 10,
        maxItemIndex: 2,
        planarMode: false,
        actionCount,
        online: {
            inputSize: 10,
            hiddenSize: 16,
            outputSize: actionCount,
            weightsInputHidden: Array.from(oldNet.layers[0].weights),
            biasHidden: Array.from(oldNet.layers[0].bias),
            weightsHiddenOutput: Array.from(oldNet.layers[1].weights),
            biasOutput: Array.from(oldNet.layers[1].bias),
        },
        target: {
            inputSize: 10,
            hiddenSize: 16,
            outputSize: actionCount,
            weightsInputHidden: Array.from(oldNet.layers[0].weights),
            biasHidden: Array.from(oldNet.layers[0].bias),
            weightsHiddenOutput: Array.from(oldNet.layers[1].weights),
            biasOutput: Array.from(oldNet.layers[1].bias),
        },
    };

    const result = trainer.importCheckpoint(v34Checkpoint);
    assert.equal(result.ok, true);
    assert.equal(trainer.envSteps, 100);
    assert.equal(trainer.optimizerSteps, 25);

    // Network should produce same output as original
    const obs = new Array(10).fill(0.3);
    const expected = oldNet.predict(obs);
    const actual = trainer.onlineNetwork.predict(obs);
    assert.deepEqual(actual, expected);
});

test('v35 checkpoint validation accepts v35 and v34 contracts', () => {
    const trainer = new DqnTrainer({
        observationLength: 10,
        maxItemIndex: 2,
        seed: 1,
        model: { hiddenLayers: [16, 8] },
    });
    const checkpoint = trainer.exportCheckpoint();

    // v35 should validate
    const v35Result = validateDqnCheckpointPayload(checkpoint);
    assert.equal(v35Result.ok, true);

    // v34-style should also validate
    const v34Checkpoint = {
        contractVersion: CHECKPOINT_CONTRACT_V34,
        online: {
            inputSize: 10,
            hiddenSize: 16,
            outputSize: 5,
            weightsInputHidden: new Array(160).fill(0),
            biasHidden: new Array(16).fill(0),
            weightsHiddenOutput: new Array(80).fill(0),
            biasOutput: new Array(5).fill(0),
        },
        target: {
            inputSize: 10,
            hiddenSize: 16,
            outputSize: 5,
            weightsInputHidden: new Array(160).fill(0),
            biasHidden: new Array(16).fill(0),
            weightsHiddenOutput: new Array(80).fill(0),
            biasOutput: new Array(5).fill(0),
        },
    };
    const v34Result = validateDqnCheckpointPayload(v34Checkpoint);
    assert.equal(v34Result.ok, true);
});

test('v35 LocalDqnInference loads multi-layer checkpoint', () => {
    const trainer = new DqnTrainer({
        observationLength: 10,
        maxItemIndex: 2,
        seed: 7,
        model: { hiddenLayers: [32, 16] },
    });
    const checkpoint = trainer.exportCheckpoint();

    const inference = new LocalDqnInference();
    const result = inference.loadCheckpoint(checkpoint);
    assert.equal(result.ok, true);
    assert.equal(inference.loaded, true);
    assert.equal(inference.inputSize, 10);
    assert.deepEqual(inference.checkpointMeta.hiddenLayers, [32, 16]);

    const obs = new Array(10).fill(0.5);
    const qValues = inference.predict(obs);
    assert.ok(qValues !== null);
    assert.equal(qValues.length, trainer.actionVocabulary.size);

    // Should match the trainer's online network
    const trainerQ = trainer.onlineNetwork.predict(obs);
    assert.deepEqual(qValues, trainerQ);
});

test('v35 multi-layer network copyFrom works correctly', () => {
    const netA = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [32, 16],
        outputSize: 5,
        seed: 42,
    });
    const netB = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [32, 16],
        outputSize: 5,
        seed: 99,
    });
    const input = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    assert.notDeepEqual(netA.predict(input), netB.predict(input));

    const ok = netB.copyFrom(netA);
    assert.equal(ok, true);
    assert.deepEqual(netA.predict(input), netB.predict(input));
});

test('v35 multi-layer network rejects copyFrom with different architecture', () => {
    const netA = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [32, 16],
        outputSize: 5,
        seed: 42,
    });
    const netB = new DqnMlpNetwork({
        inputSize: 10,
        hiddenLayers: [64],
        outputSize: 5,
        seed: 42,
    });
    const ok = netB.copyFrom(netA);
    assert.equal(ok, false);
});
