import { WebSocket } from 'ws';

import { createRuntimeConfigSnapshot } from '../src/core/RuntimeConfig.js';
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
import {
    MATCH_KERNEL_FIXED_STEP_SECONDS,
    MATCH_KERNEL_SURFACES,
} from '../src/shared/contracts/MatchKernelRuntimeContract.js';
import { buildTrainerRuntimeObservationPayload } from '../src/entities/ai/training/TrainerPayloadAdapter.js';
import {
    buildTrainingResetContract,
    buildTrainingStepContract,
} from '../src/entities/ai/training/TrainingContractV1.js';
import { createNeutralBotAction, sanitizeBotAction } from '../src/entities/ai/actions/BotActionContract.js';
import { resolveHybridDecision } from '../src/entities/ai/hybrid/HybridDecisionArchitecture.js';
import { RuntimeNearObservationTracker } from '../src/entities/ai/observation/RuntimeNearObservationAdapter.js';
import { buildObservation, createObservationContext } from '../src/entities/ai/observation/ObservationSystem.js';
import {
    EpisodeController,
    TRAINING_TERMINAL_REASONS,
    TRAINING_TRUNCATION_REASONS,
} from '../src/state/training/EpisodeController.js';
import { RewardCalculator } from '../src/state/training/RewardCalculator.js';

const DEFAULT_ENVIRONMENT_PROFILE = 'runtime-near';
const DEFAULT_LANE_WORKER_COUNT = 1;
const DEFAULT_MAX_STEPS = 100;
const DEFAULT_SEED = 91;
const DEFAULT_PORT = 9765;
const DEFAULT_SESSION_ID = 'bt92-single-env';
const DEFAULT_ACTION_TIMEOUT_MS = 2_000;
const DEFAULT_ACK_TIMEOUT_MS = 2_000;
const DEFAULT_BRIDGE_READY_TIMEOUT_MS = 8_000;
const DEFAULT_STATS_TIMEOUT_MS = 2_000;
const KERNEL_RUNNING_LIFECYCLES = new Set(['running', 'round_end', 'match_end']);

if (typeof globalThis.WebSocket !== 'function') {
    globalThis.WebSocket = WebSocket;
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

function normalizeKernelLifecycle(...values) {
    for (const value of values) {
        if (typeof value !== 'string') continue;
        const normalized = value.trim().toLowerCase();
        if (normalized) return normalized;
    }
    return 'running';
}

function normalizeReason(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

export function deriveHeadlessLaneEpisodeStep({
    player = null,
    lifecycle = 'running',
    tickLifecycle = null,
    input = {},
    nowMs = null,
} = {}) {
    const kernelLifecycle = normalizeKernelLifecycle(tickLifecycle, lifecycle);
    const playerAlive = player?.alive !== false;

    if (!playerAlive) {
        return {
            done: true,
            terminalReason: TRAINING_TERMINAL_REASONS.PLAYER_DEAD,
            truncated: false,
            truncatedReason: null,
            nowMs,
        };
    }

    if (kernelLifecycle === 'round_end' || kernelLifecycle === 'match_end') {
        return {
            done: true,
            terminalReason: TRAINING_TERMINAL_REASONS.MATCH_ENDED,
            truncated: false,
            truncatedReason: null,
            nowMs,
        };
    }

    if (input?.done === true) {
        return {
            done: true,
            terminalReason: normalizeReason(input.terminalReason, TRAINING_TERMINAL_REASONS.EXTERNAL),
            truncated: false,
            truncatedReason: null,
            nowMs,
        };
    }

    if (input?.truncated === true || input?.timeout === true) {
        return {
            done: false,
            terminalReason: null,
            truncated: true,
            truncatedReason: normalizeReason(
                input.truncatedReason,
                input?.timeout === true
                    ? TRAINING_TRUNCATION_REASONS.TIME_LIMIT
                    : TRAINING_TRUNCATION_REASONS.EXTERNAL,
            ),
            nowMs,
        };
    }

    return {
        done: false,
        terminalReason: null,
        truncated: false,
        truncatedReason: null,
        nowMs,
    };
}

function isDeathLikeTerminalReason(value) {
    const reason = normalizeReason(value, '').toLowerCase();
    if (!reason) return false;
    if (reason === TRAINING_TERMINAL_REASONS.PLAYER_DEAD) return true;
    return ['dead', 'death', 'killed', 'loss', 'crash'].some((token) => reason.includes(token));
}

export function buildHeadlessTrainingRewardSignals(episode = {}, context = {}) {
    const done = episode?.done === true;
    const truncated = episode?.truncated === true;
    const terminalReason = normalizeReason(episode?.terminalReason, '');
    const terminalReasonLower = terminalReason.toLowerCase();
    const deathLikeTerminal = done && isDeathLikeTerminalReason(terminalReason);
    const signals = {
        survival: done !== true && truncated !== true,
        lost: deathLikeTerminal || terminalReasonLower === 'match-loss',
        won: terminalReasonLower === 'match-win',
        crashed: terminalReasonLower.includes('crash'),
    };
    if (Number.isFinite(Number(context.totalEnvSteps))) {
        signals.totalEnvSteps = Number(context.totalEnvSteps);
    }
    return signals;
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

export class HeadlessLaneStepRunner {
    constructor({
        runtime,
        trainingAdapter,
        runtimeConfig,
        settings,
        maxSteps = DEFAULT_MAX_STEPS,
        seed = DEFAULT_SEED,
        episodeIdPrefix = 'headless-lane',
        environmentProfile = DEFAULT_ENVIRONMENT_PROFILE,
        laneWorkerCount = DEFAULT_LANE_WORKER_COUNT,
    } = {}) {
        this.runtime = runtime;
        this.trainingAdapter = trainingAdapter;
        this.runtimeConfig = runtimeConfig;
        this.settings = settings;
        this.seed = seed;
        this.episodeIdPrefix = episodeIdPrefix;
        this.environmentProfile = environmentProfile;
        this.laneWorkerCount = laneWorkerCount;
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
            environmentProfile: this.environmentProfile,
            lane: {
                workerCount: this.laneWorkerCount,
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

    reset(input = {}) {
        this.trainingAdapter.restartRound();
        this.observationTracker.reset();
        const player = createPlayerSnapshot(this._getPlayer());
        const observation = this._buildRawObservation();
        const metadata = this._buildMetadata(input.metadata || {});
        const episode = this.episodeController.reset({
            episodeId: `${this.episodeIdPrefix}-${this.seed}`,
            episodeIndex: 0,
            mode: this.mode,
            planarMode: this.planarMode,
        });
        const liftedObservation = this.observationTracker.lift(observation, {
            environmentProfile: this.environmentProfile,
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
        const kernelLifecycle = normalizeKernelLifecycle(stepResult.lifecycle, stepResult.tickResult.lifecycle);
        assert(
            KERNEL_RUNNING_LIFECYCLES.has(kernelLifecycle),
            `headless lane lifecycle drifted to ${kernelLifecycle}`,
        );

        const player = createPlayerSnapshot(this._getPlayer());
        const observation = this._buildRawObservation();
        const metadata = this._buildMetadata({
            tickResult: {
                lifecycle: stepResult.tickResult.lifecycle,
                tickIndex: stepResult.tickResult.tickIndex,
            },
        });
        const episodeStepInput = deriveHeadlessLaneEpisodeStep({
            player,
            lifecycle: stepResult.lifecycle,
            tickLifecycle: stepResult.tickResult.lifecycle,
            input,
            nowMs: (tickIndex + 1) * 16,
        });
        const episode = this.episodeController.step(episodeStepInput);
        const liftedObservation = this.observationTracker.lift(observation, {
            environmentProfile: this.environmentProfile,
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
        const reward = this.rewardCalculator.compute(buildHeadlessTrainingRewardSignals(episode, {
            totalEnvSteps: tickIndex + 1,
        }), episode);
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
                episodeSemantics: {
                    source: 'player-kernel-state',
                    playerAlive: player.alive,
                    kernelLifecycle,
                    done: episode.done,
                    truncated: episode.truncated,
                    terminalReason: episode.terminalReason,
                    truncatedReason: episode.truncatedReason,
                },
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

export class HeadlessBoundaryController {
    constructor(options = {}) {
        this.options = {
            port: Number(options.port ?? DEFAULT_PORT),
            maxSteps: Number(options.maxSteps ?? DEFAULT_MAX_STEPS),
            seed: Number(options.seed ?? DEFAULT_SEED),
            sessionId: String(options.sessionId || DEFAULT_SESSION_ID),
            episodeIdPrefix: String(options.episodeIdPrefix || 'headless-lane'),
            environmentProfile: String(options.environmentProfile || DEFAULT_ENVIRONMENT_PROFILE),
            laneWorkerCount: Math.max(1, Number(options.laneWorkerCount ?? DEFAULT_LANE_WORKER_COUNT)),
        };
        this.readyPayload = null;
        this.settings = null;
        this.runtime = null;
        this.runtimeConfig = null;
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
        this.readyPayload = this.bridge.consumeLatestReadyPayload?.() || this.bridge.consumeLatestResponse?.() || null;

        this.settings = createSmokeSettings();
        this.runtimeConfig = createRuntimeConfigSnapshot(this.settings);
        this.runtime = await Promise.resolve(createHeadlessMatchKernelRuntime({
            settings: this.settings,
            runtimeConfig: this.runtimeConfig,
            requestedMapKey: this.runtimeConfig?.session?.mapKey,
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
            runtimeConfig: this.runtimeConfig,
            settings: this.settings,
            maxSteps: this.options.maxSteps,
            seed: this.options.seed,
            episodeIdPrefix: this.options.episodeIdPrefix,
            environmentProfile: this.options.environmentProfile,
            laneWorkerCount: this.options.laneWorkerCount,
        });
        this.facade = new TrainingTransportFacade({
            bridge: this.bridge,
            stepRunner: this.stepRunner,
            kernelProfile: this.runtime.getConsumerDescriptors?.()?.training?.profile || {
                matchId: this.runtime.session?.effectiveMapKey || this.runtimeConfig?.session?.mapKey || 'standard',
                modeId: this.runtime.session?.entityManager?.activeGameMode || this.runtimeConfig?.session?.activeGameMode || 'CLASSIC',
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
        this.bridge = null;
        this.trainingAdapter = null;
        this.facade = null;
        this.stepRunner = null;
        this.runtime = null;
        this.runtimeConfig = null;
        this.settings = null;
        return {
            ok: true,
            command: 'close',
        };
    }
}
