import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';

import { DeterministicTrainingStepRunner } from '../src/entities/ai/training/DeterministicTrainingStepRunner.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createObservation(step = 0) {
    const vector = new Array(40).fill(0);
    vector[0] = Math.max(0, Math.min(1, 0.3 + step * 0.05));
    vector[1] = Math.max(0, Math.min(1, 0.9 - step * 0.1));
    vector[17] = 0;
    vector[18] = 0;
    return vector;
}

async function writeArtifact(name, payload) {
    await mkdir('data/training', { recursive: true });
    const path = `data/training/${name}`;
    await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
    return path;
}

function runTruncatedEpisode() {
    const runner = new DeterministicTrainingStepRunner({
        episode: {
            defaultMaxSteps: 3,
        },
    });
    const transitions = [];
    transitions.push(runner.reset({
        mode: 'classic',
        planarMode: false,
        matchId: 'eval-truncated',
        observation: createObservation(0),
    }));
    transitions.push(runner.step({
        observation: createObservation(1),
        rewardSignals: { survival: true },
    }));
    transitions.push(runner.step({
        observation: createObservation(2),
        rewardSignals: { survival: true },
    }));
    transitions.push(runner.step({
        observation: createObservation(3),
        rewardSignals: { survival: true },
    }));

    const terminal = transitions[3];
    assert(terminal.truncated === true, 'episode should truncate at max-steps');
    assert(terminal.info?.truncatedReason === 'max-steps', 'expected max-steps truncation reason');
    return transitions;
}

function runDoneEpisode() {
    const runner = new DeterministicTrainingStepRunner({
        episode: {
            defaultMaxSteps: 5,
        },
    });
    const transitions = [];
    transitions.push(runner.reset({
        mode: 'hunt',
        planarMode: true,
        matchId: 'eval-done',
        observation: createObservation(0),
    }));
    transitions.push(runner.step({
        observation: createObservation(1),
        rewardSignals: { survival: true, damageDealt: 10 },
    }));
    transitions.push(runner.step({
        observation: createObservation(2),
        rewardSignals: { kills: 1, won: true },
        done: true,
        terminalReason: 'match-win',
    }));

    const terminal = transitions[2];
    assert(terminal.done === true, 'episode should end with done=true');
    assert(terminal.truncated === false, 'done episode must not be truncated');
    return transitions;
}

function computeEpisodeScore(transitions) {
    let rewardSum = 0;
    for (let i = 1; i < transitions.length; i++) {
        rewardSum += Number(transitions[i]?.reward || 0);
    }
    return Number(rewardSum.toFixed(6));
}

async function main() {
    const truncatedEpisode = runTruncatedEpisode();
    const doneEpisode = runDoneEpisode();

    const summary = {
        truncatedEpisode: {
            steps: truncatedEpisode.length - 1,
            rewardSum: computeEpisodeScore(truncatedEpisode),
            terminal: {
                done: truncatedEpisode[truncatedEpisode.length - 1].done,
                truncated: truncatedEpisode[truncatedEpisode.length - 1].truncated,
                truncatedReason: truncatedEpisode[truncatedEpisode.length - 1].info?.truncatedReason || null,
            },
        },
        doneEpisode: {
            steps: doneEpisode.length - 1,
            rewardSum: computeEpisodeScore(doneEpisode),
            terminal: {
                done: doneEpisode[doneEpisode.length - 1].done,
                truncated: doneEpisode[doneEpisode.length - 1].truncated,
                terminalReason: doneEpisode[doneEpisode.length - 1].info?.terminalReason || null,
            },
        },
    };

    const artifactPath = await writeArtifact('training_eval_latest.json', {
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
