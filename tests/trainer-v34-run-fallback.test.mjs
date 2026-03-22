import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import process from 'node:process';
import test from 'node:test';
import { promisify } from 'node:util';

import { WebSocketServer } from 'ws';

import { resolveDevLayoutRelativePath } from '../scripts/dev-layout-paths.mjs';
import { DqnTrainer } from '../trainer/model/DqnTrainer.mjs';

const execFileAsync = promisify(execFile);
const TRAINING_RUN_SCRIPT = resolveDevLayoutRelativePath('scripts', 'training-run.mjs');

function createCheckpoint() {
    const trainer = new DqnTrainer({
        observationLength: 40,
        maxItemIndex: 2,
        planarMode: true,
        seed: 13337,
    });
    return trainer.exportCheckpoint();
}

function waitForListening(server) {
    return new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
}

test('V36 training-run falls back to checkpoint response when trainer-stats times out', async () => {
    const checkpoint = createCheckpoint();
    const stamp = `TEST_RUN_FALLBACK_${Date.now()}`;
    const port = 9800 + Math.floor(Math.random() * 200);
    const server = new WebSocketServer({
        host: '127.0.0.1',
        port,
    });

    server.on('connection', (socket) => {
        socket.send(JSON.stringify({
            ok: true,
            type: 'trainer-ready',
            protocolVersion: 'v34-trainer-v1',
        }));

        socket.on('message', (raw) => {
            const envelope = JSON.parse(String(raw));
            const id = envelope.id;
            const type = envelope.type;
            if (type === 'bot-action-request') {
                socket.send(JSON.stringify({
                    id,
                    ok: true,
                    type: 'bot-action-response',
                    action: {
                        yawLeft: false,
                        yawRight: false,
                        boost: true,
                        shootMG: false,
                        shootItem: false,
                        shootItemIndex: -1,
                        useItem: -1,
                        dropItem: false,
                        nextItem: false,
                    },
                }));
                return;
            }
            if (type === 'training-reset' || type === 'training-step') {
                socket.send(JSON.stringify({
                    id,
                    ok: true,
                    type: 'training-ack',
                    training: {
                        trained: false,
                        loss: checkpoint.lastLoss,
                        epsilon: 0.5,
                        replayFill: 0.1,
                        optimizerSteps: checkpoint.optimizerSteps,
                    },
                }));
                return;
            }
            if (type === 'trainer-checkpoint-request') {
                socket.send(JSON.stringify({
                    id,
                    ok: true,
                    type: 'trainer-checkpoint',
                    sessionId: 'test-session',
                    replay: {
                        size: 12,
                        fillRatio: 0.2,
                    },
                    state: {
                        resumeSource: null,
                    },
                    checkpoint,
                }));
                return;
            }
            if (type === 'trainer-stats-request') {
                return;
            }
        });
    });

    await waitForListening(server);
    await mkdir(`data/training/runs/${stamp}`, { recursive: true });

    try {
        await execFileAsync(process.execPath, [
            TRAINING_RUN_SCRIPT,
            '--stamp', stamp,
            '--bridge-mode', 'bridge',
            '--bridge-url', `ws://127.0.0.1:${port}`,
            '--bridge-strict', 'true',
            '--bridge-require-ready-message', 'true',
            '--episodes', '1',
            '--seeds', '11',
            '--modes', 'hunt-2d',
            '--max-steps', '4',
            '--trainer-command-timeout-ms', '100',
            '--bridge-drain-timeout-ms', '50',
            '--write-latest', 'false',
            '--quiet', 'true',
        ]);

        const runArtifactRaw = await readFile(`data/training/runs/${stamp}/run.json`, 'utf8');
        const runArtifact = JSON.parse(runArtifactRaw);
        assert.equal(runArtifact.trainerStats.sessionId, 'test-session');
        assert.equal(runArtifact.trainerStats.replay.size, 12);
        assert.equal(runArtifact.trainerStats.model.optimizerSteps, checkpoint.optimizerSteps);
        assert.equal(runArtifact.trainerStats.type, 'trainer-stats-fallback');
    } finally {
        await new Promise((resolve) => server.close(() => resolve()));
        await rm(`data/training/runs/${stamp}`, { recursive: true, force: true });
        await rm(`data/training/models/${stamp}`, { recursive: true, force: true });
    }
});
