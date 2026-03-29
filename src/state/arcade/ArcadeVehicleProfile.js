// ─── Arcade Vehicle Profile: XP, Levels, Slot-Unlocks, Upgrade-Tracking ───

const VEHICLE_PROFILE_SCHEMA_VERSION = 'arcade-vehicle-profile.v1';
const STORAGE_KEY = 'cuviosclash.arcade-vehicle-profile.v1';

export const XP_CONFIG = Object.freeze({
    BASE_XP: 100,
    EXPONENT: 1.5,
    MAX_LEVEL: 30,
});

export const SLOT_UNLOCK_LEVELS = Object.freeze({
    utility: 5,
    wing_left_t2: 10,
    wing_right_t2: 10,
    engine_left_t2: 15,
    engine_right_t2: 15,
    core_t2: 20,
    nose_t2: 20,
    utility_t2: 25,
    core_t3: 28,
    nose_t3: 28,
});

export const XP_REWARD_TABLE = Object.freeze({
    sectorComplete: 50,
    killBase: 15,
    missionComplete: 80,
    allMissionsBonus: 120,
    cleanSector: 40,
    comboMultiplierCap: 3.0,
});

const BASE_SLOTS = Object.freeze([
    'core', 'nose', 'wing_left', 'wing_right', 'engine_left', 'engine_right',
]);

import { toSafeNumber, clampInteger as clampInt } from '../../shared/utils/ArcadeUtils.js';

function toIsoString(nowMs) {
    return new Date(Math.max(0, toSafeNumber(nowMs, Date.now()))).toISOString();
}

// ─── XP Curve ───

export function xpForLevel(level) {
    const n = Math.max(1, Math.min(XP_CONFIG.MAX_LEVEL, Math.floor(level)));
    if (n <= 1) return 0;
    return Math.floor(XP_CONFIG.BASE_XP * Math.pow(n, XP_CONFIG.EXPONENT));
}

export function xpToNextLevel(profile) {
    if (!profile || typeof profile !== 'object') return { current: 0, required: 100, progress: 0 };
    const level = clampInt(profile.level, 1, XP_CONFIG.MAX_LEVEL, 1);
    if (level >= XP_CONFIG.MAX_LEVEL) return { current: 0, required: 0, progress: 1 };
    const currentLevelXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const required = nextLevelXp - currentLevelXp;
    const current = Math.max(0, toSafeNumber(profile.xp, 0) - currentLevelXp);
    return {
        current,
        required,
        progress: required > 0 ? Math.min(1, current / required) : 1,
    };
}

function computeLevel(totalXp) {
    let level = 1;
    while (level < XP_CONFIG.MAX_LEVEL && totalXp >= xpForLevel(level + 1)) {
        level += 1;
    }
    return level;
}

// ─── Slot Stat Bonuses (61.8.1) ───

/**
 * Returns stat bonuses from installed T2 upgrade slots.
 * T2 Wing (either left or right) = +10% turning.
 * T2 Engine (either left or right) = +8% speed.
 * T2 Core = +15 max HP.
 */
export function getSlotStatBonuses(upgrades) {
    const u = upgrades && typeof upgrades === 'object' ? upgrades : {};
    const hasWingT2 = u.wing_left_t2 === 'T2' || u.wing_right_t2 === 'T2';
    const hasEngineT2 = u.engine_left_t2 === 'T2' || u.engine_right_t2 === 'T2';
    const hasCoreT2 = u.core_t2 === 'T2';
    return {
        turningBonusPct: hasWingT2 ? 10 : 0,
        speedBonusPct: hasEngineT2 ? 8 : 0,
        maxHpBonus: hasCoreT2 ? 15 : 0,
    };
}

// ─── Mastery Perks (61.8.2) ───

/**
 * Returns passive perks earned at the given mastery level.
 * Level 5: +5% score bonus, Level 10: combo decays 20% slower, Level 15: +10% XP bonus.
 */
export function getMasteryPerks(level) {
    const lvl = Math.max(1, Math.floor(clampInt(level, 1, XP_CONFIG.MAX_LEVEL, 1)));
    const perks = {
        scoreBonusPct: 0,
        comboDecaySlowPct: 0,
        xpBonusPct: 0,
    };
    if (lvl >= 5) perks.scoreBonusPct = 5;
    if (lvl >= 10) perks.comboDecaySlowPct = 20;
    if (lvl >= 15) perks.xpBonusPct = 10;
    return perks;
}

// ─── Slot Unlocks ───

export function getUnlockedSlots(level) {
    const slots = [...BASE_SLOTS];
    const entries = Object.entries(SLOT_UNLOCK_LEVELS);
    for (let i = 0; i < entries.length; i += 1) {
        if (level >= entries[i][1]) {
            slots.push(entries[i][0]);
        }
    }
    return slots;
}

// ─── Profile CRUD ───

export function createArcadeVehicleProfile(vehicleId, nowMs = Date.now()) {
    return {
        schemaVersion: VEHICLE_PROFILE_SCHEMA_VERSION,
        vehicleId: String(vehicleId || 'ship1'),
        xp: 0,
        level: 1,
        unlockedSlots: [...BASE_SLOTS],
        upgrades: {},
        createdAt: toIsoString(nowMs),
        updatedAt: toIsoString(nowMs),
    };
}

export function addXp(profile, amount, nowMs = Date.now()) {
    if (!profile || typeof profile !== 'object') return { profile, leveledUp: false, newLevel: 1, unlocksGained: [] };
    const prevLevel = clampInt(profile.level, 1, XP_CONFIG.MAX_LEVEL, 1);
    const totalXp = Math.max(0, toSafeNumber(profile.xp, 0) + Math.max(0, toSafeNumber(amount, 0)));
    const newLevel = computeLevel(totalXp);
    const leveledUp = newLevel > prevLevel;

    const prevSlots = new Set(getUnlockedSlots(prevLevel));
    const nextSlots = getUnlockedSlots(newLevel);
    const unlocksGained = nextSlots.filter((s) => !prevSlots.has(s));

    return {
        profile: {
            ...profile,
            xp: totalXp,
            level: newLevel,
            unlockedSlots: nextSlots,
            updatedAt: toIsoString(nowMs),
        },
        leveledUp,
        newLevel,
        unlocksGained,
    };
}

export function applyUpgrade(profile, slotName, tier, nowMs = Date.now()) {
    if (!profile || typeof profile !== 'object') return profile;
    const upgrades = { ...(profile.upgrades || {}) };
    upgrades[slotName] = String(tier || 'T1');
    return {
        ...profile,
        upgrades,
        updatedAt: toIsoString(nowMs),
    };
}

// ─── XP Reward Calculation ───

export function calculateSectorXp(telemetry) {
    if (!telemetry || typeof telemetry !== 'object') return 0;
    const kills = Math.max(0, toSafeNumber(telemetry.kills, 0));
    const comboMultiplier = Math.min(
        XP_REWARD_TABLE.comboMultiplierCap,
        Math.max(1, toSafeNumber(telemetry.multiplier, 1))
    );
    const missionsCompleted = Math.max(0, toSafeNumber(telemetry.missionsCompleted, 0));
    const totalMissions = Math.max(0, toSafeNumber(telemetry.totalMissions, 0));
    const isClean = telemetry.cleanSector === true;

    let xp = XP_REWARD_TABLE.sectorComplete;
    xp += kills * XP_REWARD_TABLE.killBase;
    xp += missionsCompleted * XP_REWARD_TABLE.missionComplete;
    if (totalMissions > 0 && missionsCompleted >= totalMissions) {
        xp += XP_REWARD_TABLE.allMissionsBonus;
    }
    if (isClean) xp += XP_REWARD_TABLE.cleanSector;

    return Math.floor(xp * comboMultiplier);
}

// ─── Persistence ───

export function loadVehicleProfiles(store) {
    if (!store || typeof store.loadJsonRecord !== 'function') return {};
    const raw = store.loadJsonRecord(STORAGE_KEY, {});
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw;
}

export function saveVehicleProfiles(store, profiles) {
    if (!store || typeof store.saveJsonRecord !== 'function') return;
    store.saveJsonRecord(STORAGE_KEY, profiles || {});
}

export function getOrCreateProfile(profiles, vehicleId, nowMs = Date.now()) {
    const map = profiles && typeof profiles === 'object' ? profiles : {};
    const key = String(vehicleId || 'ship1');
    if (map[key] && typeof map[key] === 'object') return map[key];
    return createArcadeVehicleProfile(key, nowMs);
}

export default {
    VEHICLE_PROFILE_SCHEMA_VERSION,
    XP_CONFIG,
    SLOT_UNLOCK_LEVELS,
    XP_REWARD_TABLE,
    xpForLevel,
    xpToNextLevel,
    getSlotStatBonuses,
    getMasteryPerks,
    getUnlockedSlots,
    createArcadeVehicleProfile,
    addXp,
    applyUpgrade,
    calculateSectorXp,
    loadVehicleProfiles,
    saveVehicleProfiles,
    getOrCreateProfile,
};
