import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
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
    for (const entry of inbox) {
        if (predicate(entry)) return entry;
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
    const resultPromise = waitForMessage(
        socket,
        inbox,
        (message) => Number(message?.id) === Number(envelope.id),
        timeoutMs
    );
    socket.send(JSON.stringify(envelope));
    return await resultPromise;
}

test('V36 trainer session loads latest checkpoint via trainer-checkpoint-load-latest', async () => {
    const config = resolveTrainerConfig({
        argv: ['--host', '127.0.0.1', '--port', '0', '--verbose', 'false', '--seed', '777'],
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
            // ignore malformed test frames
        }
    });

    const stamp = `TEST_RESUME_${Date.now()}`;
    const checkpointPath = `data/training/models/${stamp}/checkpoint.json`;
    const latestIndexPath = `data/training/runs/${stamp}/latest.resume.json`;
    try {
        await once(socket, 'open');
        await waitForMessage(socket, inbox, (entry) => entry?.type === 'trainer-ready', 2000);

        await sendAndWait(socket, inbox, {
            id: 1,
            type: 'training-reset',
            payload: {
                operation: 'reset',
                episodeId: 'resume-latest',
                episodeIndex: 1,
                stepIndex: 0,
                observation: new Array(40).fill(0),
                info: {
                    domain: { mode: 'classic', planarMode: false, domainId: 'classic-3d' },
                },
            },
        });

        for (let i = 1; i <= 8; i++) {
            await sendAndWait(socket, inbox, {
                id: 10 + i,
                type: 'training-step',
                payload: {
                    operation: 'step',
                    episodeId: 'resume-latest',
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
                        domain: { mode: 'classic', planarMode: false, domainId: 'classic-3d' },
                    },
                },
            });
        }

        const checkpointResponse = await sendAndWait(socket, inbox, {
            id: 300,
            type: 'trainer-checkpoint-request',
            payload: {},
        });
        assert.equal(checkpointResponse.ok, true);
        assert.equal(checkpointResponse.type, 'trainer-checkpoint');

        await mkdir(`data/training/models/${stamp}`, { recursive: true });
        await mkdir(`data/training/runs/${stamp}`, { recursive: true });
        await writeFile(checkpointPath, `${JSON.stringify({
            contractVersion: 'v34-checkpoint-artifact-v1',
            generatedAt: new Date().toISOString(),
            stamp,
            checkpoint: checkpointResponse.checkpoint,
        }, null, 2)}\n`, 'utf8');
        await writeFile(latestIndexPath, `${JSON.stringify({
            stamp,
            artifacts: {
                checkpoint: {
                    path: checkpointPath,
                    status: 'completed',
                    exists: true,
                },
            },
        }, null, 2)}\n`, 'utf8');

        const loadLatestResponse = await sendAndWait(socket, inbox, {
            id: 301,
            type: 'trainer-checkpoint-load-latest',
            payload: {
                latestIndexPath,
            },
        });
        assert.equal(loadLatestResponse.ok, true);
        assert.equal(loadLatestResponse.type, 'trainer-checkpoint');
        assert.equal(loadLatestResponse.loaded, true);
        assert.equal(
            String(loadLatestResponse.resumeSource || '').endsWith('/checkpoint.json'),
            true
        );
    } finally {
        try {
            socket.close();
        } catch {
            // ignore close races
        }
        await server.stop();
        await rm(`data/training/models/${stamp}`, { recursive: true, force: true });
        await rm(`data/training/runs/${stamp}`, { recursive: true, force: true });
    }
});

test('V36 checkpoint-load-latest returns clear error details for missing checkpoint path', async () => {
    const config = resolveTrainerConfig({
        argv: ['--host', '127.0.0.1', '--port', '0', '--verbose', 'false', '--seed', '909'],
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
            // ignore malformed frames
        }
    });

    try {
        await once(socket, 'open');
        await waitForMessage(socket, inbox, (entry) => entry?.type === 'trainer-ready', 2000);
        const response = await sendAndWait(socket, inbox, {
            id: 401,
            type: 'trainer-checkpoint-load-latest',
            payload: {
                checkpointPath: 'data/training/models/DOES_NOT_EXIST/checkpoint.json',
            },
        });
        assert.equal(response.ok, false);
        assert.equal(response.type, 'trainer-error');
        assert.equal(response.error, 'invalid-transition');
        assert.equal(Array.isArray(response.details?.errors), true);
        assert.equal(String(response.details.errors[0] || '').length > 0, true);
    } finally {
        try {
            socket.close();
        } catch {
            // ignore close races
        }
        await server.stop();
    }
});
