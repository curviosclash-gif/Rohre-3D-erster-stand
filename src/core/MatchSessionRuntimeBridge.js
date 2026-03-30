// ============================================
// MatchSessionRuntimeBridge.js - match session ref apply/clear facade
// ============================================
//
// Contract:
// - Inputs: game runtime + initializedMatch payload from MatchSessionFactory
// - Outputs: stable current-session reference object for lifecycle operations
// - Side effects: applies/clears game runtime refs (arena/entity/powerup/particles)

import {
    applyMatchSessionState,
    clearMatchSessionState,
    getCurrentMatchSessionRefs,
} from './runtime/GameRuntimeBundle.js';

export class MatchSessionRuntimeBridge {
    constructor(deps = {}) {
        this.game = deps.game || null;
        this.ports = deps.ports || null;
        this.runtimeBundle = deps.runtimeBundle || this.game?.runtimeBundle || null;
    }

    applyInitializedMatchSession(initializedMatch) {
        const matchSession = initializedMatch?.session;
        if (!this.game || !matchSession) return;
        applyMatchSessionState(this.runtimeBundle || this.game.runtimeBundle, matchSession);
    }

    getCurrentMatchSessionRefs() {
        return getCurrentMatchSessionRefs(this.runtimeBundle || this.game?.runtimeBundle);
    }

    clearMatchSessionRefs() {
        if (!this.game) return;
        clearMatchSessionState(this.runtimeBundle || this.game.runtimeBundle);
    }
}
