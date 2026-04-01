import assert from 'node:assert/strict';
import test from 'node:test';

import { OBSERVATION_LENGTH_V1 } from '../src/entities/ai/observation/ObservationSchemaV1.js';
import { DeterministicTrainingStepRunner } from '../src/entities/ai/training/DeterministicTrainingStepRunner.js';
import { WebSocketTrainerBridge } from '../src/entities/ai/training/WebSocketTrainerBridge.js';
import { buildTrainerRuntimeObservationPayload, buildTrainerTransitionPayload } from '../src/entities/ai/training/TrainerPayloadAdapter.js';
import { EpisodeController, TRAINING_TRUNCATION_REASONS } from '../src/state/training/EpisodeController.js';
import { RewardCalculator, sumRewardComponents } from '../src/state/training/RewardCalculator.js';

test('DeterministicTrainingStepRunner keeps additive reset/step contract stable', () => {
    const runner = new DeterministicTrainingStepRunner({
        episode: {
            defaultMaxSteps: 4,
        },
    });
    const observation = new Array(OBSERVATION_LENGTH_V1).fill(0.25);
    const reset = runner.reset({
        mode: 'HUNT',
        planarMode: true,
        matchId: 't90',
        observation,
    });
    const step = runner.step({
        observation: observation.map((value, index) => (index === 0 ? 0.5 : value)),
        action: {
            yawLeft: 'yes',
            shootItem: true,
            shootItemIndex: 99,
        },
        inventoryLength: 2,
        rewardSignals: {
            survival: true,
            damageDealt: 3,
        },
    });

    assert.equal(reset.operation, 'reset');
    assert.equal(reset.observation.length, 40);
    assert.equal(reset.reward, 0);
    assert.equal(reset.done, false);
    assert.equal(reset.truncated, false);
    assert.equal(reset.info?.domain?.domainId, 'hunt-2d');
    assert.ok(typeof reset.info?.domain?.controlProfileId === 'string' && reset.info.domain.controlProfileId.length > 0);
    assert.equal(step.operation, 'step');
    assert.equal(Boolean(step.action?.shootItem), true);
    assert.equal(Number(step.action?.shootItemIndex), 1);
    assert.ok(Number(step.reward) > 0);
    assert.equal(Boolean(step.done), false);
    assert.equal(Boolean(step.truncated), false);
    assert.equal(step.info?.observationSchemaVersion, 'v1');
    assert.ok(typeof step.info?.domain?.controlProfileId === 'string' && step.info.domain.controlProfileId.length > 0);
});

test('EpisodeController derives done and truncated state deterministically', () => {
    const controller = new EpisodeController({
        defaultMaxSteps: 2,
    });
    const reset = controller.reset({
        mode: 'classic',
        planarMode: false,
    });
    const step1 = controller.step({});
    const step2 = controller.step({});
    const reset2 = controller.reset({
        episodeId: 'custom-episode',
        mode: 'fight',
        planarMode: true,
    });
    const doneStep = controller.step({
        done: true,
        terminalReason: 'match-ended',
    });

    assert.equal(reset.domain?.domainId, 'classic-3d');
    assert.equal(step1.done, false);
    assert.equal(step1.truncated, false);
    assert.equal(step2.done, false);
    assert.equal(step2.truncated, true);
    assert.equal(step2.truncatedReason, TRAINING_TRUNCATION_REASONS.MAX_STEPS);
    assert.equal(reset2.episodeId, 'custom-episode');
    assert.equal(reset2.domain?.domainId, 'fight-2d');
    assert.equal(doneStep.done, true);
    assert.equal(doneStep.terminalReason, 'match-ended');
});

test('RewardCalculator keeps transparent additive shaping totals', () => {
    const calculator = new RewardCalculator({
        weights: {
            baseStep: -0.01,
            survival: 0.1,
            kill: 2,
            crash: -3,
            stuck: -1,
            itemPickup: 0.5,
            itemUse: 0.25,
            damageDealt: 0.05,
            damageTaken: -0.02,
            win: 4,
            loss: -4,
        },
    });
    const reward = calculator.compute({
        survival: true,
        kills: 2,
        crashed: true,
        stuck: true,
        itemsCollected: 1,
        itemUses: 2,
        damageDealt: 10,
        damageTaken: 5,
        won: true,
        bonusReward: 0.5,
    });

    assert.equal(reward.total.toFixed(2), '5.99');
    assert.equal(sumRewardComponents(reward.components).toFixed(2), reward.total.toFixed(2));
    assert.equal(reward.components.kill.toFixed(2), '4.00');
    assert.equal(reward.components.crash.toFixed(2), '-3.00');
    assert.equal(reward.components.stuck.toFixed(2), '-1.00');
    assert.equal(reward.components.itemPickup.toFixed(2), '0.50');
    assert.equal(reward.components.itemUse.toFixed(2), '0.50');
    assert.equal(reward.components.damageDealt.toFixed(2), '0.50');
    assert.equal(reward.components.damageTaken.toFixed(2), '-0.10');
    assert.equal(reward.components.external.toFixed(2), '0.50');
});

test('Trainer payload adapter and WebSocketTrainerBridge transport additive training frames', async () => {
    const originalWebSocket = globalThis.WebSocket;
    const sent = [];

    class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        constructor() {
            this.readyState = MockWebSocket.OPEN;
            this._listeners = new Map();
            setTimeout(() => this._emit('open', {}), 0);
        }

        addEventListener(type, handler) {
            const list = this._listeners.get(type) || [];
            list.push(handler);
            this._listeners.set(type, list);
        }

        removeEventListener(type, handler) {
            const list = this._listeners.get(type) || [];
            this._listeners.set(type, list.filter((entry) => entry !== handler));
        }

        _emit(type, event) {
            const list = this._listeners.get(type) || [];
            list.forEach((handler) => handler(event));
        }

        send(raw) {
            const envelope = JSON.parse(raw);
            sent.push(envelope);
            if (envelope.type === 'bot-action-request') {
                setTimeout(() => {
                    this._emit('message', {
                        data: JSON.stringify({
                            id: envelope.id,
                            action: { yawLeft: true },
                        }),
                    });
                }, 0);
                return;
            }
            setTimeout(() => {
                this._emit('message', {
                    data: JSON.stringify({
                        id: envelope.id,
                        ok: true,
                    }),
                });
            }, 0);
        }

        close() {
            this.readyState = MockWebSocket.CLOSED;
            this._emit('close', {});
        }
    }

    globalThis.WebSocket = MockWebSocket;
    try {
        const bridge = new WebSocketTrainerBridge({
            enabled: true,
            timeoutMs: 100,
            url: 'ws://127.0.0.1:8765',
        });
        const runtimePayload = buildTrainerRuntimeObservationPayload({
            mode: 'classic',
            planarMode: false,
            dt: 1 / 60,
            observation: new Array(40).fill(0),
        }, {
            index: 1,
            hp: 10,
            maxHp: 10,
            shieldHP: 3,
            maxShieldHp: 5,
            inventory: ['rocket'],
        });
        bridge.submitObservation(runtimePayload);
        await new Promise((resolve) => setTimeout(resolve, 10));
        const action = bridge.consumeLatestAction();

        const transitionPayload = buildTrainerTransitionPayload({
            operation: 'step',
            episodeId: 'episode-1',
            episodeIndex: 1,
            stepIndex: 1,
            observation: new Array(40).fill(0.2),
            action: { yawLeft: true },
            reward: 0.5,
            done: false,
            truncated: false,
            info: {
                domain: {
                    mode: 'classic',
                    planarMode: false,
                    domainId: 'classic-3d',
                },
            },
        });
        bridge.submitTrainingStep(transitionPayload);
        await new Promise((resolve) => setTimeout(resolve, 10));
        const response = bridge.consumeLatestResponse();
        bridge.close();

        assert.deepEqual(sent.map((entry) => entry.type), ['bot-action-request', 'training-step']);
        assert.equal(Boolean(action?.yawLeft), true);
        assert.equal(response?.ok === true, true);
        assert.ok(typeof runtimePayload?.controlProfileId === 'string' && runtimePayload.controlProfileId.length > 0);
        assert.ok(typeof transitionPayload?.info?.domain?.controlProfileId === 'string' && transitionPayload.info.domain.controlProfileId.length > 0);
        assert.equal(sent[0]?.type, 'bot-action-request');
        assert.equal(Number.isInteger(sent[0]?.id), true);
        assert.equal(Object.prototype.hasOwnProperty.call(sent[0] || {}, 'payload'), true);
        assert.equal(typeof sent[1]?.contractVersion, 'string');
    } finally {
        globalThis.WebSocket = originalWebSocket;
    }
});
