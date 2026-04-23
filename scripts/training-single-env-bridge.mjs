#!/usr/bin/env node
import process from 'node:process';
import readline from 'node:readline';

import { WebSocket } from 'ws';

import { createRuntimeConfigSnapshot } from '../src/core/RuntimeConfig.js';
import {
    MATCH_KERNEL_FIXED_STEP_SECONDS,
    MATCH_KERNEL_SURFACES,
} from '../src/shared/contracts/MatchKernelRuntimeContract.js';
import {
    createHeadlessMatchKernelRuntime,
    MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION,
} from '../src/state/HeadlessMatchKernelRuntime.js';
import {
    createMatchKernelTrainingAdapter,
    MATCH_KERNEL_TRAINING_ADAPTER_CONTRACT_VERSION,
} from '../src/core/MatchKernelTrainingAdapter.js';
import { TrainingTransportFacade } from '../src/entities/ai/training/TrainingTransportFacade.js';
import { WebSocketTrainerBridge } from '../src/entities/ai/training/WebSocketTrainerBridge.js';
import { HeadlessLaneStepRunner } from './training-headless-lane-runner.mjs';

if (typeof globalThis.WebSocket !== 'function') {
    globalThis.WebSocket = WebSocket;
}

const forwardToStderr = (...args) => {
    process.stderr.write(`${args.map((entry) => String(entry)).join(' ')}\n`);
};
Reflect.set(console, 'log', forwardToStderr);
Reflect.set(console, 'info', forwardToStderr);
Reflect.set(console, 'warn', forwardToStderr);
Reflect.set(console, 'error', forwardToStderr);

const DEFAULT_ACTION_TIMEOUT_MS = 2_000;
const DEFAULT_ACK_TIMEOUT_MS = 2_000;
const DEFAULT_BRIDGE_READY_TIMEOUT_MS = 8_000;
const DEFAULT_STATS_TIMEOUT_MS = 2_000;

function parseArgs(argv) {
    const options = {
        port: 9765,
        maxSteps: 100,
        seed: 91,
        sessionId: 'bt92-single-env',
    };
    for (let index = 2; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--port') {
            options.port = Number(argv[index + 1]);
            index += 1;
            continue;
        }
        if (value === '--max-steps') {
            options.maxSteps = Number(argv[index + 1]);
            index += 1;
            continue;
        }
        if (value === '--seed') {
            options.seed = Number(argv[index + 1]);
            index += 1;
            continue;
        }
        if (value === '--session-id') {
            options.sessionId = String(argv[index + 1] || options.sessionId);
            index += 1;
        }
    }
    return options;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function round(value, digits = 3) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    const factor = 10 ** digits;
    return Math.round(numeric * factor) / factor;
}

function createSmokeSettings() {
    return {
        localSettings: {
            modePath: 'normal',
            sessionType: 'single',
        },
        mode: '1p',
        mapKey: 'standard',
        gameMode: 'CLASSIC',
        numBots: 1,
        winsNeeded: 3,
        botDifficulty: 'NORMAL',
        gameplay: {
            planarMode: false,
        },
        portalsEnabled: false,
    };
}

async function waitForLatestAction(bridge, timeoutMs = DEFAULT_ACTION_TIMEOUT_MS) {
    const startedAt = performance.now();
    let latestFailure = null;
    while ((performance.now() - startedAt) < timeoutMs) {
        const action = bridge.consumeLatestAction?.();
        if (action && typeof action === 'object') {
            return {
                action,
                latencyMs: round(performance.now() - startedAt),
            };
        }
        const failure = bridge.consumeFailure?.();
        if (failure) {
            latestFailure = failure;
        }
        await sleep(5);
    }
    throw new Error(`timed out waiting for bot-action-response${latestFailure ? ` (${latestFailure})` : ''}`);
}

async function waitForTrainingAck(bridge, label, timeoutMs = DEFAULT_ACK_TIMEOUT_MS) {
    const startedAt = performance.now();
    let latestFailure = null;
    while ((performance.now() - startedAt) < timeoutMs) {
        const response = bridge.consumeLatestResponse?.();
        if (response?.type === 'trainer-ready') {
            continue;
        }
        if (response?.ok === true && (response?.type === 'training-ack' || response?.type === label)) {
            return {
                response,
                latencyMs: round(performance.now() - startedAt),
            };
        }
        if (response?.ok === false) {
            throw new Error(`${label} rejected by sidecar: ${response.error || response.type || 'unknown-error'}`);
        }
        const failure = bridge.consumeFailure?.();
        if (failure) {
            latestFailure = failure;
        }
        await sleep(5);
    }
    throw new Error(`timed out waiting for ${label} ack${latestFailure ? ` (${latestFailure})` : ''}`);
}

function drainBridge(bridge) {
    while (bridge.consumeLatestAction?.()) {
        // drain
    }
    while (bridge.consumeLatestResponse?.()) {
        // drain
    }
    while (bridge.consumeFailure?.()) {
        // drain
    }
}

async function waitForSidecarReady(bridge, timeoutMs = DEFAULT_BRIDGE_READY_TIMEOUT_MS) {
    const startedAt = performance.now();
    while ((performance.now() - startedAt) < timeoutMs) {
        const remainingMs = Math.max(50, Math.trunc(timeoutMs - (performance.now() - startedAt)));
        const ready = await bridge.waitForReady(Math.min(600, remainingMs));
        if (ready === true) {
            return true;
        }
        await sleep(120);
    }
    return false;
}

class SingleEnvController {
    constructor(options) {
        this.options = options;
        this.runtime = null;
        this.bridge = null;
        this.trainingAdapter = null;
        this.facade = null;
        this.stepRunner = null;
    }

    async initialize() {
        this.bridge = new WebSocketTrainerBridge({
            enabled: true,
            url: `ws://127.0.0.1:${this.options.port}`,
            timeoutMs: 250,
            maxRetries: 0,
            retryDelayMs: 0,
            requireReadyMessage: true,
            maxPendingAcks: 32,
            backpressureThreshold: 16,
        });
        const bridgeReady = await waitForSidecarReady(this.bridge, DEFAULT_BRIDGE_READY_TIMEOUT_MS);
        assert(bridgeReady === true, 'sidecar ready handshake failed');

        const settings = createSmokeSettings();
        const runtimeConfig = createRuntimeConfigSnapshot(settings);
        this.runtime = await Promise.resolve(createHeadlessMatchKernelRuntime({
            settings,
            runtimeConfig,
            requestedMapKey: runtimeConfig?.session?.mapKey,
            profile: {
                sessionId: this.options.sessionId,
                fixedStepSeconds: MATCH_KERNEL_FIXED_STEP_SECONDS,
                deterministic: true,
            },
        }));
        this.trainingAdapter = createMatchKernelTrainingAdapter({
            headlessRuntime: this.runtime,
        });
        this.stepRunner = new HeadlessLaneStepRunner({
            runtime: this.runtime,
            trainingAdapter: this.trainingAdapter,
            runtimeConfig,
            settings,
            maxSteps: this.options.maxSteps,
            seed: this.options.seed,
            episodeIdPrefix: 'bt92-headless',
        });
        this.facade = new TrainingTransportFacade({
            bridge: this.bridge,
            stepRunner: this.stepRunner,
            kernelProfile: this.runtime.getConsumerDescriptors?.()?.training?.profile || {
                matchId: this.runtime.session?.effectiveMapKey || runtimeConfig?.session?.mapKey || 'standard',
                modeId: this.runtime.session?.entityManager?.activeGameMode || runtimeConfig?.session?.activeGameMode || 'CLASSIC',
            },
        });
    }

    async reset() {
        drainBridge(this.bridge);
        const packet = this.facade.reset();
        const ack = await waitForTrainingAck(this.bridge, 'training-reset');
        return {
            ok: true,
            command: 'reset',
            ackLatencyMs: ack.latencyMs,
            packet,
        };
    }

    async step() {
        drainBridge(this.bridge);
        this.bridge.submitObservation(this.stepRunner.buildActionRequestPayload());
        const actionResponse = await waitForLatestAction(this.bridge);
        const packet = this.facade.step({
            action: actionResponse.action,
        });
        const ack = await waitForTrainingAck(this.bridge, 'training-step');
        return {
            ok: true,
            command: 'step',
            actionLatencyMs: actionResponse.latencyMs,
            ackLatencyMs: ack.latencyMs,
            resolvedAction: actionResponse.action,
            packet,
        };
    }

    async stats() {
        const stats = await this.bridge.submitCommand('trainer-stats-request', {}, {
            timeoutMs: DEFAULT_STATS_TIMEOUT_MS,
        });
        return {
            ok: true,
            command: 'stats',
            stats,
            bridgeTelemetry: this.bridge.getTelemetrySnapshot?.() || null,
            runtime: {
                headlessRuntimeContractVersion: MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION,
                trainingAdapterContractVersion: MATCH_KERNEL_TRAINING_ADAPTER_CONTRACT_VERSION,
                surface: this.runtime.getConsumerDescriptors?.()?.training?.profile?.surface || MATCH_KERNEL_SURFACES.HEADLESS,
            },
        };
    }

    async close() {
        this.bridge?.close?.();
        this.trainingAdapter?.dispose?.();
        return {
            ok: true,
            command: 'close',
        };
    }
}

async function main() {
    const options = parseArgs(process.argv);
    const controller = new SingleEnvController(options);
    await controller.initialize();

    const rl = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
    });

    try {
        for await (const line of rl) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }
            let decoded = null;
            try {
                decoded = JSON.parse(trimmed);
                const command = String(decoded.command || '').trim();
                let response = null;
                if (command === 'reset') {
                    response = await controller.reset();
                } else if (command === 'step') {
                    response = await controller.step();
                } else if (command === 'stats') {
                    response = await controller.stats();
                } else if (command === 'close') {
                    response = await controller.close();
                    process.stdout.write(`${JSON.stringify(response)}\n`);
                    break;
                } else {
                    throw new Error(`unsupported command: ${command || '<empty>'}`);
                }
                process.stdout.write(`${JSON.stringify(response)}\n`);
            } catch (error) {
                process.stdout.write(`${JSON.stringify({
                    ok: false,
                    command: decoded?.command || null,
                    error: error?.stack || String(error),
                })}\n`);
            }
        }
    } finally {
        await controller.close();
        rl.close();
    }
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
