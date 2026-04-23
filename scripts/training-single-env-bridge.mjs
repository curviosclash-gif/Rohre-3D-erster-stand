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
import { buildTrainerRuntimeObservationPayload } from '../src/entities/ai/training/TrainerPayloadAdapter.js';
import {
    buildTrainingResetContract,
    buildTrainingStepContract,
} from '../src/entities/ai/training/TrainingContractV1.js';
import { createNeutralBotAction, sanitizeBotAction } from '../src/entities/ai/actions/BotActionContract.js';
import { resolveHybridDecision } from '../src/entities/ai/hybrid/HybridDecisionArchitecture.js';
import { RuntimeNearObservationTracker } from '../src/entities/ai/observation/RuntimeNearObservationAdapter.js';
import { buildObservation, createObservationContext } from '../src/entities/ai/observation/ObservationSystem.js';
import { EpisodeController } from '../src/state/training/EpisodeController.js';
import { RewardCalculator } from '../src/state/training/RewardCalculator.js';

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

function createPlayerSnapshot(player) {
    return {
        index: Number.isInteger(player?.index) ? player.index : 0,
        hp: Number(player?.hp ?? 0),
        maxHp: Number(player?.maxHp ?? 1),
        shieldHP: Number(player?.shieldHP ?? 0),
        maxShieldHp: Number(player?.maxShieldHp ?? 0),
        inventory: Array.isArray(player?.inventory) ? [...player.inventory] : [],
        inventoryLength: Array.isArray(player?.inventory) ? player.inventory.length : 0,
        alive: player?.alive !== false,
    };
}

class HeadlessLaneStepRunner {
    constructor({
        runtime,
        trainingAdapter,
        runtimeConfig,
        settings,
        maxSteps,
        seed,
    } = {}) {
        this.runtime = runtime;
        this.trainingAdapter = trainingAdapter;
        this.runtimeConfig = runtimeConfig;
        this.settings = settings;
        this.seed = seed;
        this.episodeController = new EpisodeController({
            defaultMaxSteps: maxSteps,
        });
        this.rewardCalculator = new RewardCalculator();
        this.observationTracker = new RuntimeNearObservationTracker();
        this._actionScratch = createNeutralBotAction({});
        this._observationScratch = null;
        this._observationContext = null;
    }

    get session() {
        return this.runtime?.session || null;
    }

    get mode() {
        return String(
            this.runtimeConfig?.session?.activeGameMode
            || this.session?.entityManager?.activeGameMode
            || this.settings?.gameMode
            || 'CLASSIC'
        ).toLowerCase();
    }

    get planarMode() {
        return !!this.runtimeConfig?.gameplay?.planarMode;
    }

    get matchId() {
        return String(this.session?.effectiveMapKey || this.runtimeConfig?.session?.mapKey || 'standard');
    }

    _getPlayer() {
        const player = this.session?.entityManager?.players?.[0] || null;
        assert(player, 'missing controlled player in headless runtime');
        return player;
    }

    _refreshObservationContext() {
        this._observationContext = createObservationContext({
            arena: this.session?.arena || this.session?.entityManager?.arena || null,
            players: this.session?.entityManager?.players || [],
            projectiles: this.session?.entityManager?.projectiles || [],
            mode: this.mode,
            planarMode: this.planarMode,
        }, this._observationContext || {});
        return this._observationContext;
    }

    _buildRawObservation() {
        const player = this._getPlayer();
        const context = this._refreshObservationContext();
        const observation = buildObservation(player, context, this._observationScratch || undefined);
        this._observationScratch = observation;
        return Array.from(observation);
    }

    _buildMetadata(extra = {}) {
        return {
            environmentProfile: 'runtime-near',
            lane: {
                workerCount: 1,
                seed: this.seed,
            },
            kernel: {
                surface: MATCH_KERNEL_SURFACES.HEADLESS,
                tickIndex: this.trainingAdapter.tickIndex,
                roundIndex: this.trainingAdapter.roundIndex,
                lifecycle: this.trainingAdapter.lifecycle,
                contractVersion: MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION,
            },
            ...extra,
        };
    }

    buildActionRequestPayload() {
        const player = createPlayerSnapshot(this._getPlayer());
        const observation = this._buildRawObservation();
        return buildTrainerRuntimeObservationPayload({
            mode: this.mode,
            planarMode: this.planarMode,
            dt: MATCH_KERNEL_FIXED_STEP_SECONDS,
            observation,
            observationContext: this._buildMetadata({
                requestTick: this.trainingAdapter.tickIndex,
            }),
        }, player);
    }

    reset() {
        this.trainingAdapter.restartRound();
        this.observationTracker.reset();
        const player = createPlayerSnapshot(this._getPlayer());
        const observation = this._buildRawObservation();
        const metadata = this._buildMetadata();
        const episode = this.episodeController.reset({
            episodeId: `bt92-headless-${this.seed}`,
            episodeIndex: 0,
            mode: this.mode,
            planarMode: this.planarMode,
        });
        const liftedObservation = this.observationTracker.lift(observation, {
            environmentProfile: 'runtime-near',
            metadata,
            player,
            stepIndex: 0,
        });
        return buildTrainingResetContract({
            mode: this.mode,
            planarMode: this.planarMode,
            matchId: this.matchId,
            seed: this.seed,
            player,
            observation: liftedObservation.observation,
            observationSchemaVersion: liftedObservation.details.schemaVersion,
            observationLength: liftedObservation.observation.length,
            episode,
            metadata: {
                ...metadata,
                observationContext: liftedObservation.details,
            },
        });
    }

    step(input = {}) {
        const action = sanitizeBotAction(
            input.action,
            {
                inventoryLength: createPlayerSnapshot(this._getPlayer()).inventoryLength,
            },
            this._actionScratch,
        );
        const tickIndex = this.trainingAdapter.tickIndex;
        const stepResult = this.trainingAdapter.step({
            players: [{
                actions: { ...action },
            }],
        }, {
            tickIndex,
            fixedStepSeconds: MATCH_KERNEL_FIXED_STEP_SECONDS,
            frameId: tickIndex + 1,
            wallClockMs: (tickIndex + 1) * 16,
            highResTimestampMs: (tickIndex + 1) * 16,
        });
        assert(stepResult?.tickResult, 'headless lane produced no tickResult');
        assert(stepResult.lifecycle === 'running', `headless lane lifecycle drifted to ${stepResult.lifecycle}`);

        const player = createPlayerSnapshot(this._getPlayer());
        const observation = this._buildRawObservation();
        const metadata = this._buildMetadata({
            tickResult: {
                lifecycle: stepResult.tickResult.lifecycle,
                tickIndex: stepResult.tickResult.tickIndex,
            },
        });
        const episode = this.episodeController.step({});
        const liftedObservation = this.observationTracker.lift(observation, {
            environmentProfile: 'runtime-near',
            metadata,
            player,
            stepIndex: episode.stepIndex,
        });
        const hybridDecision = resolveHybridDecision(action, {
            observation: liftedObservation.observation,
            observationDetails: liftedObservation.details,
            planarMode: this.planarMode,
            player,
            intent: null,
        });
        const reward = this.rewardCalculator.compute({
            survival: episode.done !== true && episode.truncated !== true,
        }, episode);
        return buildTrainingStepContract({
            mode: this.mode,
            planarMode: this.planarMode,
            matchId: this.matchId,
            seed: this.seed,
            player,
            observation: liftedObservation.observation,
            observationSchemaVersion: liftedObservation.details.schemaVersion,
            observationLength: liftedObservation.observation.length,
            episode,
            action: { ...hybridDecision.action },
            reward: reward.total,
            rewardBreakdown: reward.components,
            terminalReason: episode.terminalReason,
            truncatedReason: episode.truncatedReason,
            metadata: {
                ...metadata,
                observationContext: liftedObservation.details,
                hybridDecision: {
                    contractVersion: 'v80-hybrid-decision-trace-v1',
                    intent: hybridDecision.intent,
                    safety: hybridDecision.safety,
                    control: hybridDecision.control,
                },
            },
        });
    }
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
