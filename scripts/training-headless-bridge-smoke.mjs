#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PYTHON_ROOT = path.join(REPO_ROOT, 'python');
const PPO_ROOT = path.join(REPO_ROOT, 'data', 'training', 'ppo');
const CONTRACT_SMOKE_ARTIFACT_PATH = path.join(PPO_ROOT, 'contract_smoke.json');
const LANE_BASELINE_ARTIFACT_PATH = path.join(PPO_ROOT, 'lane_baseline.json');

const DEFAULT_ACTION_TIMEOUT_MS = 2_000;
const DEFAULT_ACK_TIMEOUT_MS = 2_000;
const DEFAULT_BRIDGE_READY_TIMEOUT_MS = 8_000;
const DEFAULT_STATS_TIMEOUT_MS = 2_000;
const DEFAULT_LANE_STEPS = 100;
const DEFAULT_SEED = 91;

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

function summarizeSamples(samples) {
    if (!Array.isArray(samples) || samples.length === 0) {
        return {
            count: 0,
            min: null,
            max: null,
            average: null,
            median: null,
        };
    }
    const sorted = [...samples].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    const total = sorted.reduce((sum, entry) => sum + entry, 0);
    return {
        count: sorted.length,
        min: round(sorted[0]),
        max: round(sorted[sorted.length - 1]),
        average: round(total / sorted.length),
        median: round(median),
    };
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

async function resolvePythonExecutable() {
    const preferred = process.env.BT91_PYTHON_EXE
        ? path.resolve(REPO_ROOT, process.env.BT91_PYTHON_EXE)
        : path.join(PYTHON_ROOT, '.venv', 'Scripts', 'python.exe');
    try {
        await access(preferred);
        return preferred;
    } catch {
        return process.env.BT91_PYTHON_EXE || 'python';
    }
}

function choosePort() {
    const fromEnv = Number(process.env.BT91_BRIDGE_PORT);
    if (Number.isInteger(fromEnv) && fromEnv >= 1024 && fromEnv <= 65_535) {
        return fromEnv;
    }
    return 9_700 + Math.floor(Math.random() * 200);
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

function summarizePacket(packet) {
    return {
        type: packet?.type || null,
        delivered: packet?.delivered === true,
        stepIndex: packet?.transition?.stepIndex ?? null,
        done: packet?.transition?.done ?? null,
        truncated: packet?.transition?.truncated ?? null,
        reward: round(packet?.transition?.reward),
        domainId: packet?.payload?.info?.domain?.domainId || null,
        observationLength: packet?.payload?.observationLength ?? null,
    };
}

function createSidecarHandle(pythonExecutable, port) {
    const sidecarStdout = [];
    const sidecarStderr = [];
    const child = spawn(
        pythonExecutable,
        [
            '-u',
            path.join('python', 'scripts', 'headless_bridge_sidecar.py'),
            '--host', '127.0.0.1',
            '--port', String(port),
            '--session-id', 'bt91-headless-bridge-smoke',
        ],
        {
            cwd: REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    );
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
        sidecarStdout.push(String(chunk));
    });
    child.stderr?.on('data', (chunk) => {
        sidecarStderr.push(String(chunk));
    });
    return {
        child,
        getStdout() {
            return sidecarStdout.join('').trim();
        },
        getStderr() {
            return sidecarStderr.join('').trim();
        },
    };
}

async function waitForSidecarReady(bridge, handle, timeoutMs = DEFAULT_BRIDGE_READY_TIMEOUT_MS) {
    const startedAt = performance.now();
    while ((performance.now() - startedAt) < timeoutMs) {
        const remainingMs = Math.max(50, Math.trunc(timeoutMs - (performance.now() - startedAt)));
        const ready = await bridge.waitForReady(Math.min(600, remainingMs));
        if (ready === true) {
            return true;
        }
        if (handle?.child?.exitCode != null) {
            break;
        }
        await sleep(120);
    }
    return false;
}

async function stopSidecar(handle) {
    if (!handle?.child || handle.child.killed) {
        return;
    }
    handle.child.kill();
    await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2_000);
        handle.child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

async function runSmoke() {
    const port = choosePort();
    const pythonExecutable = await resolvePythonExecutable();
    const sidecarHandle = createSidecarHandle(pythonExecutable, port);
    let runtime = null;
    let bridge = null;
    let trainingAdapter = null;

    try {
        const bootStartedAt = performance.now();
        bridge = new WebSocketTrainerBridge({
            enabled: true,
            url: `ws://127.0.0.1:${port}`,
            timeoutMs: 250,
            maxRetries: 0,
            retryDelayMs: 0,
            requireReadyMessage: true,
            maxPendingAcks: 32,
            backpressureThreshold: 16,
        });
        const bridgeReady = await waitForSidecarReady(bridge, sidecarHandle, DEFAULT_BRIDGE_READY_TIMEOUT_MS);
        assert(bridgeReady === true, `sidecar ready handshake failed: ${sidecarHandle.getStderr() || sidecarHandle.getStdout() || 'no sidecar output'}`);
        const bootLatencyMs = round(performance.now() - bootStartedAt);
        const readyPayload = bridge.consumeLatestReadyPayload?.() || bridge.consumeLatestResponse?.() || null;

        const settings = createSmokeSettings();
        const runtimeConfig = createRuntimeConfigSnapshot(settings);
        runtime = await Promise.resolve(createHeadlessMatchKernelRuntime({
            settings,
            runtimeConfig,
            requestedMapKey: runtimeConfig?.session?.mapKey,
            profile: {
                sessionId: 'bt91-headless-bridge-smoke',
                fixedStepSeconds: MATCH_KERNEL_FIXED_STEP_SECONDS,
                deterministic: true,
            },
        }));
        trainingAdapter = createMatchKernelTrainingAdapter({
            headlessRuntime: runtime,
        });
        const stepRunner = new HeadlessLaneStepRunner({
            runtime,
            trainingAdapter,
            runtimeConfig,
            settings,
            maxSteps: DEFAULT_LANE_STEPS,
            seed: DEFAULT_SEED,
            episodeIdPrefix: 'bt91-headless',
        });
        const facade = new TrainingTransportFacade({
            bridge,
            stepRunner,
            kernelProfile: runtime.getConsumerDescriptors?.()?.training?.profile || {
                matchId: runtime.session?.effectiveMapKey || runtimeConfig?.session?.mapKey || 'standard',
                modeId: runtime.session?.entityManager?.activeGameMode || runtimeConfig?.session?.activeGameMode || 'CLASSIC',
            },
        });

        drainBridge(bridge);
        const resetPacket = facade.reset();
        const resetAck = await waitForTrainingAck(bridge, 'training-reset');

        const actionLatencies = [];
        const stepLatencies = [];
        const stepSamples = [];
        let finalPacket = resetPacket;

        for (let step = 1; step <= DEFAULT_LANE_STEPS; step += 1) {
            drainBridge(bridge);
            bridge.submitObservation(stepRunner.buildActionRequestPayload());
            const actionResponse = await waitForLatestAction(bridge);
            actionLatencies.push(actionResponse.latencyMs);

            finalPacket = facade.step({
                action: actionResponse.action,
            });
            const stepAck = await waitForTrainingAck(bridge, 'training-step');
            stepLatencies.push(stepAck.latencyMs);

            if (step === 1 || step === 50 || step === DEFAULT_LANE_STEPS) {
                stepSamples.push({
                    step,
                    action: {
                        yawLeft: !!actionResponse.action?.yawLeft,
                        yawRight: !!actionResponse.action?.yawRight,
                        boost: !!actionResponse.action?.boost,
                    },
                    transition: summarizePacket(finalPacket),
                    ackLatencyMs: stepAck.latencyMs,
                });
            }
        }

        const statsStartedAt = performance.now();
        const statsResponse = await bridge.submitCommand('trainer-stats-request', {}, {
            timeoutMs: DEFAULT_STATS_TIMEOUT_MS,
        });
        const statsLatencyMs = round(performance.now() - statsStartedAt);
        assert(statsResponse?.ok === true, `trainer-stats-request failed: ${JSON.stringify(statsResponse)}`);
        assert(Number(statsResponse?.contractSmoke?.validationFailures || 0) === 0, 'sidecar reported contract validation failures');
        assert(Number(statsResponse?.messageCounts?.['training-step'] || 0) >= DEFAULT_LANE_STEPS, 'sidecar saw fewer than 100 training-step messages');
        assert(Number(statsResponse?.messageCounts?.['training-reset'] || 0) >= 1, 'sidecar did not see training-reset');
        assert(Number(statsResponse?.messageCounts?.['bot-action-request'] || 0) >= DEFAULT_LANE_STEPS, 'sidecar did not see bot-action-request');
        assert(finalPacket?.transition?.stepIndex === DEFAULT_LANE_STEPS, `expected final stepIndex ${DEFAULT_LANE_STEPS}, got ${finalPacket?.transition?.stepIndex}`);
        assert(finalPacket?.transition?.truncated === true, 'expected final lane transition to truncate at the 100-step budget');

        const contractSmokeArtifact = {
            ok: true,
            generatedAt: new Date().toISOString(),
            scope: {
                workerCount: 1,
                stepsTarget: DEFAULT_LANE_STEPS,
                stepsCompleted: finalPacket?.transition?.stepIndex ?? 0,
                contractVersion: finalPacket?.payload?.contractVersion || null,
                observationSchemaVersion: finalPacket?.payload?.observationSchemaVersion || null,
                observationLength: finalPacket?.payload?.observationLength || null,
            },
            handshake: {
                readyPayload,
                bootLatencyMs,
                resetAckLatencyMs: resetAck.latencyMs,
                statsLatencyMs,
            },
            runtime: {
                headlessRuntimeContractVersion: MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION,
                trainingAdapterContractVersion: MATCH_KERNEL_TRAINING_ADAPTER_CONTRACT_VERSION,
                surface: runtime.getConsumerDescriptors?.()?.training?.profile?.surface || MATCH_KERNEL_SURFACES.HEADLESS,
                mapKey: runtime.session?.effectiveMapKey || runtimeConfig?.session?.mapKey || null,
                activeGameMode: runtimeConfig?.session?.activeGameMode || null,
                planarMode: !!runtimeConfig?.gameplay?.planarMode,
            },
            sidecar: {
                pythonExecutable,
                messageCounts: statsResponse?.messageCounts || null,
                processingLatencyMs: statsResponse?.processingLatencyMs || null,
                contractSmoke: statsResponse?.contractSmoke || null,
            },
            transport: {
                reset: summarizePacket(resetPacket),
                finalStep: summarizePacket(finalPacket),
                bridgeTelemetry: bridge.getTelemetrySnapshot?.() || null,
            },
            sampleSteps: stepSamples,
        };

        const laneBaselineArtifact = {
            ok: true,
            generatedAt: contractSmokeArtifact.generatedAt,
            lane: {
                workerCount: 1,
                deterministic: true,
                seed: DEFAULT_SEED,
                stepsTarget: DEFAULT_LANE_STEPS,
                stepsCompleted: finalPacket?.transition?.stepIndex ?? 0,
            },
            latencyMs: {
                boot: bootLatencyMs,
                resetAck: resetAck.latencyMs,
                action: summarizeSamples(actionLatencies),
                trainingStepAck: summarizeSamples(stepLatencies),
                stats: statsLatencyMs,
                sidecarProcessing: statsResponse?.processingLatencyMs || null,
            },
            handover: {
                nextBlock: 'BT92',
                notes: [
                    'exactly one headless worker lane only',
                    '100-step baseline closes via max-steps truncation',
                    '2-/4-worker, multi-env, VecEnv and PPO baseline remain outside BT91',
                ],
            },
        };

        await mkdir(PPO_ROOT, { recursive: true });
        await writeFile(CONTRACT_SMOKE_ARTIFACT_PATH, `${JSON.stringify(contractSmokeArtifact, null, 2)}\n`, 'utf8');
        await writeFile(LANE_BASELINE_ARTIFACT_PATH, `${JSON.stringify(laneBaselineArtifact, null, 2)}\n`, 'utf8');

        console.log(JSON.stringify({
            ok: true,
            contractSmokeArtifact: path.relative(REPO_ROOT, CONTRACT_SMOKE_ARTIFACT_PATH),
            laneBaselineArtifact: path.relative(REPO_ROOT, LANE_BASELINE_ARTIFACT_PATH),
            stepsCompleted: finalPacket?.transition?.stepIndex ?? 0,
            bootLatencyMs,
            resetAckLatencyMs: resetAck.latencyMs,
            averageStepAckLatencyMs: summarizeSamples(stepLatencies).average,
        }, null, 2));
    } finally {
        try {
            bridge?.close?.();
        } finally {
            try {
                trainingAdapter?.dispose?.();
            } finally {
                await stopSidecar(sidecarHandle);
            }
        }
    }
}

runSmoke().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
