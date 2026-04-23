import {
    MATCH_KERNEL_FIXED_STEP_SECONDS,
    MATCH_KERNEL_SURFACES,
} from '../src/shared/contracts/MatchKernelRuntimeContract.js';
import { MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION } from '../src/state/HeadlessMatchKernelRuntime.js';
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

const DEFAULT_ENVIRONMENT_PROFILE = 'runtime-near';
const DEFAULT_LANE_WORKER_COUNT = 1;
const DEFAULT_MAX_STEPS = 100;
const DEFAULT_SEED = 91;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
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
