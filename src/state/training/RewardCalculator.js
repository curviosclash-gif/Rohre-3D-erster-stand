// ============================================
// RewardCalculator.js - deterministic additive reward shaping for training
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

export class RewardCalculator {
    constructor(options = {}) {
        this.weights = resolveWeightMap(options);
    }

    compute(signals = {}, episodeSnapshot = null) {
        return calculateReward(signals, {
            weights: this.weights,
            episodeSnapshot,
        });
    }
}
