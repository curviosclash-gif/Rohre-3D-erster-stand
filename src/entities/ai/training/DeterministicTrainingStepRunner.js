// ============================================
// DeterministicTrainingStepRunner.js - additive deterministic reset/step training runner
// ============================================

import { createNeutralBotAction, sanitizeBotAction } from '../actions/BotActionContract.js';
import { EpisodeController } from '../../../state/training/EpisodeController.js';
import { RewardCalculator } from '../../../state/training/RewardCalculator.js';
import {
    buildTrainingResetContract,
    buildTrainingStepContract,
} from './TrainingContractV1.js';

function resolveInventoryLength(input = {}, fallback = 0) {
    const candidates = [
        input.inventoryLength,
        input.player?.inventoryLength,
        Array.isArray(input.player?.inventory) ? input.player.inventory.length : null,
        fallback,
    ];
    for (let i = 0; i < candidates.length; i++) {
        const value = Number(candidates[i]);
        if (Number.isFinite(value)) {
            return Math.max(0, Math.trunc(value));
        }
    }
    return 0;
}

export class DeterministicTrainingStepRunner {
    constructor(options = {}) {
        this.episodeController = options.episodeController instanceof EpisodeController
            ? options.episodeController
            : new EpisodeController(options.episode || {});
        this.rewardCalculator = options.rewardCalculator instanceof RewardCalculator
            ? options.rewardCalculator
            : new RewardCalculator(options.reward || {});
        this._actionScratch = createNeutralBotAction({});
        this._lastTransition = null;
    }

    getEpisodeSnapshot() {
        return this.episodeController.getSnapshot();
    }

    getLastTransition() {
        return this._lastTransition ? { ...this._lastTransition } : null;
    }

    reset(input = {}) {
        const episode = this.episodeController.reset(input);
        const transition = buildTrainingResetContract({
            ...input,
            episode,
        });
        this._lastTransition = transition;
        return transition;
    }

    step(input = {}) {
        const currentEpisode = this.episodeController.getSnapshot();
        if (!currentEpisode) {
            this.reset(input);
        }

        const inventoryLength = resolveInventoryLength(
            input,
            resolveInventoryLength(this._lastTransition?.info?.player, 0)
        );
        const sanitizedAction = sanitizeBotAction(
            input.action,
            {
                inventoryLength,
                onInvalid: typeof input.onInvalidAction === 'function' ? input.onInvalidAction : null,
            },
            this._actionScratch
        );
        const episode = this.episodeController.step(input);
        const rewardResult = this.rewardCalculator.compute(input.rewardSignals || {}, episode);
        const transition = buildTrainingStepContract({
            ...input,
            episode,
            action: { ...sanitizedAction },
            reward: rewardResult.total,
            rewardBreakdown: rewardResult.components,
        });
        this._lastTransition = transition;
        return transition;
    }
}
