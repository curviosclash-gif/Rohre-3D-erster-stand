import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';

import { TrainingTransportFacade } from '../src/entities/ai/training/TrainingTransportFacade.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createObservation(seed = 0) {
    const vector = new Array(40).fill(0);
    vector[0] = Math.max(0, Math.min(1, 0.2 + seed * 0.1));
    vector[1] = Math.max(0, Math.min(1, 1 - seed * 0.15));
    vector[17] = 1;
    vector[18] = 1;
    return vector;
}

async function writeArtifact(name, payload) {
    await mkdir('data/training', { recursive: true });
    const path = `data/training/${name}`;
    await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
    return path;
}

function runSmoke() {
    const transportLog = [];
    const mockBridge = {
        enabled: true,
        submitTrainingPayload(type, payload) {
            transportLog.push({
                type,
                episodeId: payload?.episodeId || null,
                stepIndex: Number(payload?.stepIndex || 0),
                done: !!payload?.done,
                truncated: !!payload?.truncated,
                reward: Number(payload?.reward || 0),
            });
        },
    };
    const facade = new TrainingTransportFacade({
        bridge: mockBridge,
        episode: {
            defaultMaxSteps: 6,
        },
        reward: {
            weights: {
                survival: 0.05,
                kill: 1.4,
                crash: -1.2,
            },
        },
    });

    const resetPacket = facade.reset({
        mode: 'HUNT',
        planarMode: true,
        matchId: 'training-smoke',
        observation: createObservation(0),
    });
    const step1 = facade.step({
        observation: createObservation(1),
        action: {
            yawLeft: 'yes',
            shootItem: true,
            shootItemIndex: 99,
        },
        inventoryLength: 2,
        rewardSignals: {
            survival: true,
            itemUses: 1,
            damageDealt: 8,
        },
    });
    const step2 = facade.step({
        observation: createObservation(2),
        rewardSignals: {
            survival: true,
            kills: 1,
            won: true,
        },
        done: true,
        terminalReason: 'match-win',
    });

    assert(resetPacket.transition.operation === 'reset', 'reset contract operation mismatch');
    assert(step1.transition.operation === 'step', 'step contract operation mismatch');
    assert(step1.transition.action.shootItemIndex === 1, 'action sanitization mismatch for shootItemIndex');
    assert(step2.transition.done === true, 'final step must be terminal done');
    assert(step2.transition.truncated === false, 'final step must not be truncated');
    assert(transportLog.length === 3, `expected 3 transport frames, got ${transportLog.length}`);

    return {
        reset: {
            episodeId: resetPacket.transition.episodeId,
            domainId: resetPacket.transition.info?.domain?.domainId || null,
        },
        step1: {
            reward: step1.transition.reward,
            action: step1.transition.action,
        },
        step2: {
            reward: step2.transition.reward,
            done: step2.transition.done,
            terminalReason: step2.transition.info?.terminalReason || null,
        },
        transportLog,
    };
}

async function main() {
    const summary = runSmoke();
    const artifactPath = await writeArtifact('training_smoke_latest.json', {
        ok: true,
        generatedAt: new Date().toISOString(),
        summary,
    });
    console.log(JSON.stringify({
        ok: true,
        artifactPath,
        summary,
    }, null, 2));
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
