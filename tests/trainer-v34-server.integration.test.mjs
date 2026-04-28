import assert from 'node:assert/strict';
import test from 'node:test';

import WebSocket from 'ws';

import { resolveTrainerConfig } from '../trainer/config/TrainerConfig.mjs';
import {
    TRAINER_MESSAGE_TYPES,
    TRAINER_PROTOCOL_VERSION,
    TRAINER_RESPONSE_TYPES,
} from '../trainer/config/TrainerRuntimeContract.mjs';
import { TrainerServer } from '../trainer/server/TrainerServer.mjs';

function parseMessage(raw) {
    const text = typeof raw === 'string'
        ? raw
        : Buffer.from(raw).toString('utf8');
    return JSON.parse(text);
}

async function waitForSocketOpen(socket, timeoutMs = 5000) {
    const openState = Number.isInteger(WebSocket?.OPEN) ? WebSocket.OPEN : 1;
    if (socket?.readyState === openState) {
        return;
    }
    await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            cleanup();
            callback(value);
        };
        const onOpen = () => finish(resolve);
        const onError = (error) => {
            const message = error?.message || String(error || 'unknown');
            finish(reject, new Error(`socket open error: ${message}`));
        };
        const onClose = () => finish(reject, new Error('socket closed before open'));
        const timer = setTimeout(() => {
            finish(reject, new Error(`timeout waiting for socket open (${timeoutMs}ms)`));
        }, timeoutMs);
        const cleanup = () => {
            clearTimeout(timer);
            socket.off('open', onOpen);
            socket.off('error', onError);
            socket.off('close', onClose);
        };

        socket.on('open', onOpen);
        socket.on('error', onError);
        socket.on('close', onClose);
    });
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
        }, 100);
    });
}

async function waitForMessage(socket, inbox, predicate, timeoutMs = 1500) {
    for (const message of inbox) {
        if (predicate(message)) {
            return message;
        }
    }
    return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`timeout waiting for websocket message (${timeoutMs}ms)`));
        }, timeoutMs);

        const handler = (raw) => {
            let parsed = null;
            try {
                parsed = parseMessage(raw);
            } catch {
                return;
            }
            inbox.push(parsed);
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

async function sendAndWaitForId(socket, inbox, envelope, timeoutMs = 1500) {
    const responsePromise = waitForMessage(
        socket,
        inbox,
        (message) => Number(message?.id) === Number(envelope?.id),
        timeoutMs
    );
    socket.send(JSON.stringify(envelope));
    return await responsePromise;
}

test('V34 trainer server routes request/step/ack and exposes stats', async () => {
    const config = resolveTrainerConfig({
        argv: [
            '--host', '127.0.0.1',
            '--port', '0',
            '--verbose', 'false',
            '--observation-length', '40',
            '--replay-capacity', '64',
            '--seed', '123',
        ],
        env: {},
    });
    const server = new TrainerServer(config);
    await server.start();

    const address = server.getAddress();
    assert.ok(address && Number.isInteger(address.port));
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
    const inbox = [];
    socket.on('message', (raw) => {
        try {
            inbox.push(parseMessage(raw));
        } catch {
            // ignore malformed messages in test harness
        }
    });

    try {
        await waitForSocketOpen(socket, 5000);

        const readyEnvelope = await waitForMessage(
            socket,
            inbox,
            (message) => message?.type === TRAINER_RESPONSE_TYPES.READY,
            1500
        );
        assert.equal(readyEnvelope.ok, true);
        assert.equal(readyEnvelope.protocolVersion, TRAINER_PROTOCOL_VERSION);
        assert.equal(
            readyEnvelope.contract?.requestTypes?.action,
            TRAINER_MESSAGE_TYPES.ACTION_REQUEST
        );

        const actionResponse = await sendAndWaitForId(socket, inbox, {
            id: 1,
            type: TRAINER_MESSAGE_TYPES.ACTION_REQUEST,
            payload: {
                mode: 'hunt',
                planarMode: true,
                domainId: 'hunt-2d',
                observation: new Array(40).fill(0.25),
            },
        });
        assert.equal(actionResponse.ok, true);
        assert.equal(actionResponse.type, TRAINER_RESPONSE_TYPES.ACTION_RESPONSE);
        assert.equal(typeof actionResponse.action, 'object');

        const resetAck = await sendAndWaitForId(socket, inbox, {
            id: 2,
            type: TRAINER_MESSAGE_TYPES.TRAINING_RESET,
            payload: {
                operation: 'reset',
                episodeId: 'episode-1',
                episodeIndex: 1,
                stepIndex: 0,
                observation: new Array(40).fill(0),
                info: {
                    domain: {
                        mode: 'hunt',
                        planarMode: true,
                        domainId: 'hunt-2d',
                    },
                },
            },
        });
        assert.equal(resetAck.ok, true);
        assert.equal(resetAck.type, TRAINER_RESPONSE_TYPES.TRAINING_ACK);
        assert.equal(resetAck.requestType, TRAINER_MESSAGE_TYPES.TRAINING_RESET);

        const stepAck = await sendAndWaitForId(socket, inbox, {
            id: 3,
            type: TRAINER_MESSAGE_TYPES.TRAINING_STEP,
            payload: {
                operation: 'step',
                episodeId: 'episode-1',
                episodeIndex: 1,
                stepIndex: 1,
                reward: 0.75,
                done: false,
                truncated: false,
                observation: new Array(40).fill(0.4),
                action: {
                    yawRight: true,
                    shootMG: true,
                },
                info: {
                    domain: {
                        mode: 'hunt',
                        planarMode: true,
                        domainId: 'hunt-2d',
                    },
                },
            },
        });
        assert.equal(stepAck.ok, true);
        assert.equal(stepAck.type, TRAINER_RESPONSE_TYPES.TRAINING_ACK);
        assert.equal(stepAck.requestType, TRAINER_MESSAGE_TYPES.TRAINING_STEP);
        assert.equal(Number(stepAck.replay?.size), 1);
        assert.equal(typeof stepAck.training?.epsilon, 'number');
        assert.equal(typeof stepAck.training?.reason, 'string');

        const statsResponse = await sendAndWaitForId(socket, inbox, {
            id: 4,
            type: TRAINER_MESSAGE_TYPES.STATS_REQUEST,
            payload: {},
        });
        assert.equal(statsResponse.ok, true);
        assert.equal(statsResponse.type, TRAINER_RESPONSE_TYPES.STATS);
        assert.equal(Number(statsResponse.stats?.trainingResets), 1);
        assert.equal(Number(statsResponse.stats?.trainingSteps), 1);
        assert.equal(Number(statsResponse.replay?.size), 1);
        assert.equal(typeof statsResponse.model?.epsilon, 'number');
    } finally {
        await closeSocket(socket);
        await server.stop();
    }
});
