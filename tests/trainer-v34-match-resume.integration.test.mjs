import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import test from 'node:test';

import WebSocket from 'ws';

import { ObservationBridgePolicy } from '../src/entities/ai/ObservationBridgePolicy.js';
import { resolveTrainerConfig } from '../trainer/config/TrainerConfig.mjs';
import { TrainerServer } from '../trainer/server/TrainerServer.mjs';

function parseMessage(raw) {
    const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
    return JSON.parse(text);
}

async function readFileIfExists(filePath) {
    try {
        return await readFile(filePath, 'utf8');
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

async function restoreFile(filePath, content) {
    if (content == null) {
        await rm(filePath, { force: true });
        return;
    }
    await writeFile(filePath, content, 'utf8');
}

async function closeSocket(socket) {
    if (!socket) return;
    await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        socket.once('close', finish);
        try {
            socket.close();
        } catch {
            finish();
            return;
        }
        setTimeout(() => {
            try {
                socket.terminate();
            } catch {
                // ignore terminate races
            }
            finish();
        }, 50);
    });
}

async function waitForMessage(socket, inbox, predicate, timeoutMs = 2000) {
    for (const message of inbox) {
        if (predicate(message)) return message;
    }
    return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`timeout waiting for ws message (${timeoutMs}ms)`));
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
    const responsePromise = waitForMessage(
        socket,
        inbox,
        (entry) => Number(entry?.id) === Number(envelope.id),
        timeoutMs
    );
    socket.send(JSON.stringify(envelope));
    return await responsePromise;
}

test('V36 match bridge path resumes latest checkpoint before consuming trainer actions', async () => {
    const config = resolveTrainerConfig({
        argv: ['--host', '127.0.0.1', '--port', '0', '--verbose', 'false', '--seed', '5151'],
        env: {},
    });
    const server = new TrainerServer(config);
    await server.start();
    const address = server.getAddress();
    const trainerUrl = `ws://127.0.0.1:${address.port}`;

    // Build a checkpoint artifact and wire latest index to it.
    const setupSocket = new WebSocket(trainerUrl);
    const setupInbox = [];
    setupSocket.on('message', (raw) => {
        try {
            setupInbox.push(parseMessage(raw));
        } catch {
            // ignore malformed frames
        }
    });

    const stamp = `TEST_MATCH_RESUME_${Date.now()}`;
    const checkpointPath = `data/training/models/${stamp}/checkpoint.json`;
    const latestIndexPath = 'data/training/runs/latest.json';
    const latestBefore = await readFileIfExists(latestIndexPath);
    try {
        await once(setupSocket, 'open');
        await waitForMessage(setupSocket, setupInbox, (entry) => entry?.type === 'trainer-ready', 2000);

        await sendAndWait(setupSocket, setupInbox, {
            id: 1,
            type: 'training-reset',
            payload: {
                operation: 'reset',
                episodeId: 'match-resume',
                episodeIndex: 1,
                stepIndex: 0,
                observation: new Array(40).fill(0),
                info: {
                    domain: { mode: 'classic', planarMode: false, domainId: 'classic-3d' },
                },
            },
        });
        for (let i = 1; i <= 6; i++) {
            await sendAndWait(setupSocket, setupInbox, {
                id: 100 + i,
                type: 'training-step',
                payload: {
                    operation: 'step',
                    episodeId: 'match-resume',
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
        const checkpointResponse = await sendAndWait(setupSocket, setupInbox, {
            id: 300,
            type: 'trainer-checkpoint-request',
            payload: {},
        });
        assert.equal(checkpointResponse.ok, true);

        await mkdir(`data/training/models/${stamp}`, { recursive: true });
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
    } finally {
        await closeSocket(setupSocket);
        await restoreFile(latestIndexPath, latestBefore);
        await rm(`data/training/models/${stamp}`, { recursive: true, force: true });
    }

    const originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = WebSocket;
    let policy = null;
    try {
        let fallbackCalls = 0;
        policy = new ObservationBridgePolicy({
            type: 'classic-bridge',
            trainerBridgeEnabled: true,
            trainerBridgeUrl: trainerUrl,
            trainerBridgeTimeoutMs: 120,
            trainerCheckpointResumeToken: 'latest',
            trainerCheckpointResumeStrict: true,
            fallbackPolicy: {
                update() {
                    fallbackCalls += 1;
                    return { yawRight: true };
                },
            },
        });
        const bot = { index: 0, inventory: [] };
        const context = {
            mode: 'classic',
            dt: 1 / 60,
            players: [],
            projectiles: [],
            observation: new Array(40).fill(0.1),
        };

        for (let i = 0; i < 10; i++) {
            policy.update(1 / 60, bot, context);
            await new Promise((resolve) => setTimeout(resolve, 30));
        }

        const status = policy.getTrainerBridgeStatus();
        const telemetry = status?.telemetry || {};

        assert.equal(status?.resume?.loaded, true);
        assert.equal(status?.resume?.status, 'ready');
        assert.equal(Number(telemetry.actionResponses || 0) >= 1, true);
        assert.equal(fallbackCalls >= 1, true);
    } finally {
        const trainerSocket = policy?._trainerBridge?._socket || null;
        await closeSocket(trainerSocket);
        if (policy?._trainerBridge && typeof policy._trainerBridge.close === 'function') {
            policy._trainerBridge.close();
        }
        globalThis.WebSocket = originalWebSocket;
        await server.stop();
    }
});

