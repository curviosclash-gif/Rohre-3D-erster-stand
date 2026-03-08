// ============================================
// BotTuningConfig.js - centralized defaults for rule-based bot tuning
// ============================================

export const BOT_ITEM_RULES = Object.freeze({
    SPEED_UP: Object.freeze({ self: 0.8, offense: 0.2, defensiveScale: 0.5, emergencyScale: 0.1, combatSelf: 0.2 }),
    SLOW_DOWN: Object.freeze({ self: -0.8, offense: 0.9, defensiveScale: 0.1, emergencyScale: 0.0, combatSelf: -0.3 }),
    THICK: Object.freeze({ self: 0.9, offense: 0.1, defensiveScale: 0.8, emergencyScale: 0.2, combatSelf: 0.4 }),
    THIN: Object.freeze({ self: -0.6, offense: 0.7, defensiveScale: 0.2, emergencyScale: 0.0, combatSelf: -0.2 }),
    SHIELD: Object.freeze({ self: 0.5, offense: 0.0, defensiveScale: 1.2, emergencyScale: 2.5, combatSelf: 0.8 }),
    SLOW_TIME: Object.freeze({ self: 0.7, offense: 0.35, defensiveScale: 0.6, emergencyScale: 0.4, combatSelf: 0.3 }),
    GHOST: Object.freeze({ self: 0.95, offense: 0.1, defensiveScale: 1.0, emergencyScale: 2.0, combatSelf: 0.5 }),
    INVERT: Object.freeze({ self: -0.7, offense: 0.85, defensiveScale: 0.15, emergencyScale: 0.0, combatSelf: -0.4 }),
});

export const BOT_FALLBACK_DIFFICULTY_PROFILE = Object.freeze({
    reactionTime: 0.15,
    lookAhead: 12,
    aggression: 0.5,
    errorRate: 0,
    probeSpread: 0.7,
    probeStep: 2,
    turnCommitTime: 0.25,
    stuckCheckInterval: 0.4,
    stuckTriggerTime: 1.6,
    minProgressDistance: 0.9,
    minForwardProgress: 0.45,
    recoveryDuration: 1.0,
    recoveryCooldown: 1.5,
    itemUseCooldown: 1.0,
    itemShootCooldown: 0.6,
    targetRefreshInterval: 0.2,
    portalInterest: 0.5,
    portalSeekDistance: 70,
    portalEntryDotMin: 0.3,
    portalIntentThreshold: 0.2,
    portalIntentDuration: 1.0,
    boostChance: 0.004,
});
