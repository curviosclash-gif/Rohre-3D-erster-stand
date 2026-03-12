import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import WebSocket from 'ws';

import { resolveTrainerConfig } from '../trainer/config/TrainerConfig.mjs';
import { TrainerServer } from '../trainer/server/TrainerServer.mjs';

function parseMessage(raw) {
    const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
    return JSON.parse(text);
}

async function waitForMessage(socket, inbox, predicate, timeoutMs = 2000) {
    for (const message of inbox) {
        if (predicate(message)) {
            return message;
        }
    }
    return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`timeout waiting for message (${timeoutMs}ms)`));
        }, timeoutMs);
        const handler = (raw) => {
            let parsed = null;
            try {
                parsed = parseMessage(raw);
            } catch {
                return;
            }
            if (!predicate(parsed)) return;
            cleanup();
            resolve(parsed);
        };
        const cleanup = () => {
            clearTimeout(timer);
            socket.off('message', handler);
        };
        socket.on('message', handler);
    });
}

async function sendAndWait(socket, inbox, envelope, timeoutMs = 2000) {
    const promise = waitForMessage(
        socket,
        inbox,
        (message) => Number(message?.id) === Number(envelope.id),
        timeoutMs
    );
    socket.send(JSON.stringify(envelope));
    return await promise;
}

test('V34 checkpoint contract exports and reloads model state via websocket', async () => {
    const config = resolveTrainerConfig({
        argv: [
            '--host', '127.0.0.1',
            '--port', '0',
            '--verbose', 'false',
            '--observation-length', '40',
            '--replay-capacity', '256',
            '--seed', '111',
            '--model-hidden-size', '16',
            '--model-batch-size', '4',
            '--model-replay-warmup', '4',
            '--model-train-every', '1',
            '--model-target-sync', '2',
            '--model-epsilon-start', '0',
            '--model-epsilon-end', '0',
        ],
        env: {},
    });
    const server = new TrainerServer(config);
    await server.start();

    const address = server.getAddress();
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
    const inbox = [];
    socket.on('message', (raw) => {
        try {
            inbox.push(parseMessage(raw));
        } catch {
            // ignore malformed test message payloads
        }
    });

    try {
        await once(socket, 'open');
        await waitForMessage(socket, inbox, (message) => message?.type === 'trainer-ready', 2000);

        await sendAndWait(socket, inbox, {
            id: 1,
            type: 'training-reset',
            payload: {
                operation: 'reset',
                episodeId: 'checkpoint-episode',
                episodeIndex: 1,
                stepIndex: 0,
                observation: new Array(40).fill(0),
                info: {
                    domain: {
                        mode: 'classic',
                        planarMode: false,
                        domainId: 'classic-3d',
                    },
                },
            },
        });

        for (let i = 1; i <= 12; i++) {
            const stepAck = await sendAndWait(socket, inbox, {
                id: 100 + i,
                type: 'training-step',
                payload: {
                    operation: 'step',
                    episodeId: 'checkpoint-episode',
                    episodeIndex: 1,
                    stepIndex: i,
                    reward: 1,
                    done: false,
                    truncated: false,
                    observation: new Array(40).fill(i / 40),
                    action: {
                        yawLeft: i % 2 === 0,
                        yawRight: i % 2 === 1,
                    },
                    info: {
                        domain: {
                            mode: 'classic',
                            planarMode: false,
                            domainId: 'classic-3d',
                        },
                    },
                },
            });
            assert.equal(stepAck.ok, true);
        }

        const checkpointResponse = await sendAndWait(socket, inbox, {
            id: 500,
            type: 'trainer-checkpoint-request',
            payload: {},
        });
        assert.equal(checkpointResponse.ok, true);
        assert.equal(checkpointResponse.type, 'trainer-checkpoint');
        assert.equal(checkpointResponse.checkpoint?.contractVersion, 'v34-dqn-checkpoint-v1');

        const checkpointLoadResponse = await sendAndWait(socket, inbox, {
            id: 501,
            type: 'trainer-checkpoint-load',
            payload: {
                checkpoint: checkpointResponse.checkpoint,
                resumeSource: 'tests://checkpoint',
            },
        });
        assert.equal(checkpointLoadResponse.ok, true);
        assert.equal(checkpointLoadResponse.type, 'trainer-checkpoint');
        assert.equal(checkpointLoadResponse.loaded, true);
        assert.equal(checkpointLoadResponse.resumeSource, 'tests://checkpoint');

        const statsResponse = await sendAndWait(socket, inbox, {
            id: 502,
            type: 'trainer-stats-request',
            payload: {},
        });
        assert.equal(statsResponse.ok, true);
        assert.equal(Number(statsResponse.model?.optimizerSteps) > 0, true);
        assert.equal(statsResponse.state?.resumeSource, 'tests://checkpoint');
    } finally {
        try {
            socket.close();
        } catch {
            // ignore socket close errors
        }
        await server.stop();
    }
});
