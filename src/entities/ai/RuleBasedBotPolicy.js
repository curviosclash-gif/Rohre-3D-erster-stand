// ============================================
// RuleBasedBotPolicy.js - adapter for legacy BotAI
// ============================================

import { BotAI } from '../Bot.js';
import { BOT_POLICY_TYPES } from './BotPolicyTypes.js';

export class RuleBasedBotPolicy {
    constructor(options = {}) {
        this.type = BOT_POLICY_TYPES.RULE_BASED;
        this._botAI = new BotAI(options);
    }

    update(dt, player, arena, allPlayers, projectiles) {
        return this._botAI.update(dt, player, arena, allPlayers, projectiles);
    }

    setDifficulty(profileName) {
        if (typeof this._botAI.setDifficulty === 'function') {
            this._botAI.setDifficulty(profileName);
        }
    }

    onBounce(type, normal = null) {
        if (typeof this._botAI.onBounce === 'function') {
            this._botAI.onBounce(type, normal);
        }
    }

    setSensePhase(phase) {
        if (typeof this._botAI.setSensePhase === 'function') {
            this._botAI.setSensePhase(phase);
        }
    }

    getSensorSnapshot() {
        if (typeof this._botAI.getSensorSnapshot === 'function') {
            return this._botAI.getSensorSnapshot();
        }
        return null;
    }

    getSensorArray() {
        if (typeof this._botAI.getSensorArray === 'function') {
            return this._botAI.getSensorArray();
        }
        return null;
    }
}
