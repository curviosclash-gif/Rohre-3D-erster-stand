// ============================================
// RewardCalculator.js - deterministic additive reward shaping for training
// ============================================
//
// Expected reward ranges per step (with default weights):
//   baseStep:     0        (constant)
//   survival:     0..0.01  (per step)
//   kill:         0..1     (rare, 0-1 per step)
//   crash:       -1..0     (rare)
//   stuck:       -0.35..0  (rare)
//   itemPickup:   0..0.08  (0-1 per step)
//   itemUse:      0..0.03  (0-1 per step)
//   damageDealt:  0..~0.5  (0-25 damage units typical)
//   damageTaken: -0.5..0   (0-20 damage units typical)
//   win:          0..1.5   (terminal only)
//   loss:        -1.5..0   (terminal only)
//
// Typical per-step range: ~[-2.5, +3.0]
// Terminal step range:    ~[-3.5, +4.5]
// Trainer clamps rewards to [-rewardClamp, +rewardClamp] (default +-10)
// ============================================

const REWARD_PRECISION = 1_000_000;

export const DEFAULT_TRAINING_REWARD_WEIGHTS = Object.freeze({
    baseStep: 0,
    survival: 0.01,
    kill: 1,
    crash: -1,
    stuck: -0.35,
    itemPickup: 0.08,
    itemUse: 0.03,
    damageDealt: 0.02,
    damageTaken: -0.025,
    win: 1.5,
    loss: -1.5,
});

function roundReward(value) {
    return Math.round(Number(value) * REWARD_PRECISION) / REWARD_PRECISION;
}

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function toCount(value) {
    if (value === true) return 1;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.trunc(numeric));
}

function resolveWeightMap(input = {}) {
    const source = input?.weights && typeof input.weights === 'object'
        ? input.weights
        : input;
    const weights = { ...DEFAULT_TRAINING_REWARD_WEIGHTS };
    for (const key of Object.keys(weights)) {
        if (source && Object.prototype.hasOwnProperty.call(source, key)) {
            weights[key] = toFiniteNumber(source[key], weights[key]);
        }
    }
    return weights;
}

function resolveTerminalWinLoss(signals, episodeSnapshot) {
    const won = signals?.won === true
        || String(episodeSnapshot?.terminalReason || '').toLowerCase() === 'match-win';
    const lost = signals?.lost === true
        || String(episodeSnapshot?.terminalReason || '').toLowerCase() === 'match-loss';
    return { won, lost };
}

export function sumRewardComponents(components = {}) {
    let total = 0;
    for (const value of Object.values(components)) {
        total += toFiniteNumber(value, 0);
    }
    return roundReward(total);
}

export function calculateReward(signals = {}, options = {}) {
    const weights = resolveWeightMap(options);
    const episodeSnapshot = options?.episodeSnapshot || null;
    const killCount = toCount(signals.kills ?? signals.killCount);
    const crashCount = toCount(signals.crashes ?? (signals.crashed ? 1 : 0));
    const stuckCount = toCount(signals.stuckEvents ?? (signals.stuck ? 1 : 0));
    const itemPickupCount = toCount(signals.itemsCollected ?? signals.itemPickups);
    const itemUseCount = toCount(signals.itemUses);
    const damageDealt = Math.max(0, toFiniteNumber(signals.damageDealt, 0));
    const damageTaken = Math.max(0, toFiniteNumber(signals.damageTaken, 0));
    const survived = signals.survival !== false;
    const { won, lost } = resolveTerminalWinLoss(signals, episodeSnapshot);

    const components = {
        baseStep: roundReward(weights.baseStep),
        survival: roundReward(survived ? weights.survival : 0),
        kill: roundReward(killCount * weights.kill),
        crash: roundReward(crashCount * weights.crash),
        stuck: roundReward(stuckCount * weights.stuck),
        itemPickup: roundReward(itemPickupCount * weights.itemPickup),
        itemUse: roundReward(itemUseCount * weights.itemUse),
        damageDealt: roundReward(damageDealt * weights.damageDealt),
        damageTaken: roundReward(damageTaken * weights.damageTaken),
        win: roundReward(won ? weights.win : 0),
        loss: roundReward(lost ? weights.loss : 0),
        external: roundReward(toFiniteNumber(signals.bonusReward, 0)),
    };
    const total = sumRewardComponents(components);

    return {
        total,
        components,
    };
}

// ============================================
// Curriculum stages: gradually increase reward complexity
// ============================================
export const CURRICULUM_STAGES = Object.freeze([
    {
        name: 'navigate',
        minSteps: 0,
        description: 'Navigation + survival only',
        weightOverrides: {
            kill: 0, crash: -0.5, stuck: -0.5, itemPickup: 0, itemUse: 0,
            damageDealt: 0, damageTaken: 0, win: 0, loss: 0,
            survival: 0.02, baseStep: 0.001,
        },
    },
    {
        name: 'combat',
        minSteps: 5000,
        description: 'Navigation + shooting',
        weightOverrides: {
            itemPickup: 0, itemUse: 0,
            survival: 0.015, baseStep: 0,
        },
    },
    {
        name: 'full',
        minSteps: 15000,
        description: 'Full complexity with items',
        weightOverrides: {},
    },
]);

export function resolveCurriculumStage(totalSteps, stages = CURRICULUM_STAGES) {
    let resolved = stages[0];
    for (const stage of stages) {
        if (totalSteps >= stage.minSteps) {
            resolved = stage;
        }
    }
    return resolved;
}

export class RewardCalculator {
    constructor(options = {}) {
        this.weights = resolveWeightMap(options);
        this.curriculumEnabled = options.curriculum === true;
        this.curriculumStages = options.curriculumStages || CURRICULUM_STAGES;
        this._currentStage = null;
    }

    compute(signals = {}, episodeSnapshot = null) {
        let weights = this.weights;
        if (this.curriculumEnabled && typeof signals.totalEnvSteps === 'number') {
            const stage = resolveCurriculumStage(signals.totalEnvSteps, this.curriculumStages);
            if (stage && stage.weightOverrides) {
                weights = { ...this.weights, ...stage.weightOverrides };
                this._currentStage = stage.name;
            }
        }
        return calculateReward(signals, {
            weights,
            episodeSnapshot,
        });
    }

    get currentStage() {
        return this._currentStage;
    }
}
