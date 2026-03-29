const ARCADE_REWARD_META = Object.freeze({
    run_speed_t1: Object.freeze({
        id: 'run_speed_t1',
        label: 'Thruster Burst',
        effectText: '+8% Intermission-Heal',
    }),
    run_armor_t1: Object.freeze({
        id: 'run_armor_t1',
        label: 'Reactive Hull',
        effectText: '+16% Intermission-Heal',
    }),
    run_combo_t1: Object.freeze({
        id: 'run_combo_t1',
        label: 'Combo Buffer',
        effectText: 'Combo-Freeze +1.2s',
    }),
    run_pickup_t1: Object.freeze({
        id: 'run_pickup_t1',
        label: 'Salvage Scanner',
        effectText: '+6% Intermission-Heal',
    }),
    run_portal_t1: Object.freeze({
        id: 'run_portal_t1',
        label: 'Portal Line',
        effectText: '+10% Shield-Topup',
    }),
});

function normalizeRewardId(rewardId) {
    return typeof rewardId === 'string' ? rewardId.trim().toLowerCase() : '';
}

export function resolveArcadeRewardMeta(rewardId) {
    const normalized = normalizeRewardId(rewardId);
    return ARCADE_REWARD_META[normalized] || null;
}

export function listArcadeRewardMeta() {
    return Object.values(ARCADE_REWARD_META);
}

