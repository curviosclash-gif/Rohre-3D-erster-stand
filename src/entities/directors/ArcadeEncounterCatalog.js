const MIN_SECTOR_COUNT = 1;
const MAX_SECTOR_COUNT = 24;

export const ARCADE_SQUAD_PROFILES = Object.freeze({
    scout_duo: Object.freeze({
        id: 'scout_duo',
        label: 'Scout Duo',
        botCount: 2,
        aggressiveness: 0.45,
        pressure: 0.35,
    }),
    striker_tri: Object.freeze({
        id: 'striker_tri',
        label: 'Striker Triad',
        botCount: 3,
        aggressiveness: 0.58,
        pressure: 0.5,
    }),
    hunter_pack: Object.freeze({
        id: 'hunter_pack',
        label: 'Hunter Pack',
        botCount: 4,
        aggressiveness: 0.72,
        pressure: 0.7,
    }),
    elite_lance: Object.freeze({
        id: 'elite_lance',
        label: 'Elite Lance',
        botCount: 5,
        aggressiveness: 0.85,
        pressure: 0.88,
    }),
});

export const ARCADE_SECTOR_OBJECTIVES = Object.freeze([
    Object.freeze({ id: 'survive_window', label: 'Survive Window', durationSec: 55, scoreWeight: 1.0 }),
    Object.freeze({ id: 'bounty_hunt', label: 'Bounty Hunt', durationSec: 50, scoreWeight: 1.2 }),
    Object.freeze({ id: 'clean_sector', label: 'Clean Sector', durationSec: 45, scoreWeight: 1.15 }),
    Object.freeze({ id: 'hazard_lane', label: 'Hazard Lane', durationSec: 40, scoreWeight: 1.3 }),
]);

export const ARCADE_SECTOR_MODIFIERS = Object.freeze([
    Object.freeze({ id: 'tight_turns', label: 'Tight Turns', difficultyDelta: 0.1, scoreBonus: 0.08 }),
    Object.freeze({ id: 'heat_stress', label: 'Heat Stress', difficultyDelta: 0.14, scoreBonus: 0.12 }),
    Object.freeze({ id: 'portal_storm', label: 'Portal Storm', difficultyDelta: 0.18, scoreBonus: 0.15 }),
    Object.freeze({ id: 'boost_tax', label: 'Boost Tax', difficultyDelta: 0.2, scoreBonus: 0.18 }),
]);

export const ARCADE_RUN_LEVELUP_REWARDS = Object.freeze([
    Object.freeze({ id: 'run_speed_t1', label: 'Thruster Burst', category: 'mobility' }),
    Object.freeze({ id: 'run_armor_t1', label: 'Reactive Hull', category: 'survival' }),
    Object.freeze({ id: 'run_combo_t1', label: 'Combo Buffer', category: 'score' }),
    Object.freeze({ id: 'run_pickup_t1', label: 'Salvage Scanner', category: 'economy' }),
    Object.freeze({ id: 'run_portal_t1', label: 'Portal Line', category: 'control' }),
]);

export const ARCADE_SECTOR_CATALOG = Object.freeze([
    Object.freeze({
        id: 'sector_intro',
        minSector: 1,
        maxSector: 2,
        squadPool: ['scout_duo', 'striker_tri'],
        objectivePool: ['survive_window', 'clean_sector'],
        modifierPool: ['tight_turns'],
        rewardPool: ['run_speed_t1', 'run_armor_t1', 'run_combo_t1'],
    }),
    Object.freeze({
        id: 'sector_pressure',
        minSector: 3,
        maxSector: 5,
        squadPool: ['striker_tri', 'hunter_pack'],
        objectivePool: ['survive_window', 'bounty_hunt', 'clean_sector'],
        modifierPool: ['tight_turns', 'heat_stress'],
        rewardPool: ['run_speed_t1', 'run_combo_t1', 'run_pickup_t1'],
    }),
    Object.freeze({
        id: 'sector_hazard',
        minSector: 6,
        maxSector: 9,
        squadPool: ['hunter_pack', 'elite_lance'],
        objectivePool: ['bounty_hunt', 'hazard_lane'],
        modifierPool: ['heat_stress', 'portal_storm', 'boost_tax'],
        rewardPool: ['run_armor_t1', 'run_pickup_t1', 'run_portal_t1'],
    }),
    Object.freeze({
        id: 'sector_endurance',
        minSector: 10,
        maxSector: Number.POSITIVE_INFINITY,
        squadPool: ['elite_lance'],
        objectivePool: ['hazard_lane', 'bounty_hunt'],
        modifierPool: ['portal_storm', 'boost_tax'],
        rewardPool: ['run_combo_t1', 'run_pickup_t1', 'run_portal_t1'],
    }),
]);

function normalizeSeed(seed) {
    const text = String(seed ?? 'arcade-default');
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}

function createSeededRandom(seed) {
    let state = normalizeSeed(seed) || 1;
    return () => {
        state = Math.imul(1664525, state) + 1013904223;
        state >>>= 0;
        return state / 0x100000000;
    };
}

function pickFromPool(pool, randomFn) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const index = Math.floor(randomFn() * pool.length);
    return pool[Math.max(0, Math.min(pool.length - 1, index))];
}

function pickDistinctFromPool(pool, count, randomFn) {
    const source = Array.isArray(pool) ? [...pool] : [];
    const result = [];
    while (source.length > 0 && result.length < count) {
        const index = Math.floor(randomFn() * source.length);
        result.push(source.splice(index, 1)[0]);
    }
    return result;
}

function getSectorTemplate(sectorNumber) {
    return ARCADE_SECTOR_CATALOG.find((template) => (
        sectorNumber >= template.minSector && sectorNumber <= template.maxSector
    )) || ARCADE_SECTOR_CATALOG[ARCADE_SECTOR_CATALOG.length - 1];
}

function resolveDifficultyScale(difficulty) {
    const key = String(difficulty || 'normal').toLowerCase();
    if (key === 'easy') return 0.9;
    if (key === 'hard') return 1.12;
    if (key === 'nightmare') return 1.24;
    return 1.0;
}

export function buildArcadeSectorPlan(options = {}) {
    const sectorCount = Math.max(
        MIN_SECTOR_COUNT,
        Math.min(MAX_SECTOR_COUNT, Math.floor(Number(options.sectorCount) || 8))
    );
    const randomFn = createSeededRandom(options.seed);
    const difficultyScale = resolveDifficultyScale(options.difficulty);
    const sequence = [];

    for (let sectorIndex = 0; sectorIndex < sectorCount; sectorIndex += 1) {
        const sectorNumber = sectorIndex + 1;
        const template = getSectorTemplate(sectorNumber);
        const squadId = pickFromPool(template.squadPool, randomFn);
        const objectiveId = pickFromPool(template.objectivePool, randomFn);
        const modifierId = pickFromPool(template.modifierPool, randomFn);
        const rewardChoices = pickDistinctFromPool(template.rewardPool, 2, randomFn);

        const modifierDef = ARCADE_SECTOR_MODIFIERS.find((entry) => entry.id === modifierId) || null;
        const basePressure = ARCADE_SQUAD_PROFILES[squadId]?.pressure || 0.35;
        const pressure = (basePressure + (modifierDef?.difficultyDelta || 0)) * difficultyScale;

        sequence.push({
            sectorNumber,
            templateId: template.id,
            squadId,
            objectiveId,
            modifierId,
            rewardChoices,
            pressure: Number(pressure.toFixed(3)),
        });
    }

    return {
        seed: String(options.seed ?? 'arcade-default'),
        difficulty: String(options.difficulty ?? 'normal'),
        sectorCount,
        sequence,
    };
}

export default {
    ARCADE_SQUAD_PROFILES,
    ARCADE_SECTOR_OBJECTIVES,
    ARCADE_SECTOR_MODIFIERS,
    ARCADE_RUN_LEVELUP_REWARDS,
    ARCADE_SECTOR_CATALOG,
    buildArcadeSectorPlan,
};
