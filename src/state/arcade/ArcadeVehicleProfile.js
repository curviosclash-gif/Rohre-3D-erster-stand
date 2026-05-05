// Arcade Vehicle Profile: XP, mastery, unlocks and upgrade progression.

import {
    ARCADE_VEHICLE_PROFILE_MAX_LEVEL,
    ARCADE_VEHICLE_PROFILE_SCHEMA_VERSION,
    ARCADE_VEHICLE_PROFILE_STORAGE_KEY,
    createArcadeVehicleProfileRecord,
    getArcadeVehicleProfileRecord,
    readArcadeVehicleProfileRecord,
} from '../../shared/contracts/ArcadeVehicleProfileContract.js';
import {
    ARCADE_HANGAR_SLOT_UNLOCK_GATES,
    ARCADE_HANGAR_TIER_UNLOCK_GATES,
    resolveArcadeHangarAllowedPartFamilies,
    resolveArcadeHangarAllowedTiers,
    resolveArcadeHangarPartFamily,
    resolveArcadeHangarProgressionSnapshot,
    resolveArcadeHangarUnlockedSlots,
} from '../../shared/contracts/ArcadeHangarRulesContract.js';
import {
    canUpgrade,
    getUpgradeCost,
} from '../../entities/arcade/ArcadeBlueprintSchema.js';
import { toSafeNumber, clampInteger as clampInt } from '../../shared/utils/ArcadeUtils.js';

const VEHICLE_PROFILE_SCHEMA_VERSION = ARCADE_VEHICLE_PROFILE_SCHEMA_VERSION;
const STORAGE_KEY = ARCADE_VEHICLE_PROFILE_STORAGE_KEY;
const MAX_UPGRADE_XP_BANK = 9_999_999;
const MAX_LOADOUT_PRESET_UPGRADE_ENTRIES = 64;

function isPersistenceSuccess(result) {
    return result === undefined || result === true || result?.success === true;
}

function warnPersistenceFailure(contextLabel, result) {
    if (isPersistenceSuccess(result)) return;
    if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(`[ArcadeVehicleProfile] ${String(contextLabel || 'save')} failed`, {
        reason: String(result?.reason || ''),
        metadata: result?.metadata && typeof result.metadata === 'object'
            ? { ...result.metadata }
            : null,
    });
}

export const XP_CONFIG = Object.freeze({
    BASE_XP: 100,
    EXPONENT: 1.5,
    MAX_LEVEL: ARCADE_VEHICLE_PROFILE_MAX_LEVEL,
});

export const SLOT_UNLOCK_LEVELS = ARCADE_HANGAR_SLOT_UNLOCK_GATES;

export const XP_REWARD_TABLE = Object.freeze({
    sectorComplete: 50,
    killBase: 15,
    missionComplete: 80,
    allMissionsBonus: 120,
    cleanSector: 40,
    comboMultiplierCap: 3.0,
    parcoursCheckpoint: 10,
    parcoursFinish: 80,
    parcoursNewBestTime: 40,
});

export const UPGRADE_PURCHASE_CODES = Object.freeze({
    APPLIED: 'applied',
    INVALID_PROFILE: 'invalid_profile',
    INVALID_SLOT: 'invalid_slot',
    INVALID_TIER: 'invalid_tier',
    INVALID_TIER_SEQUENCE: 'invalid_tier_sequence',
    SLOT_LOCKED: 'slot_locked',
    PART_FAMILY_LOCKED: 'part_family_locked',
    TIER_LOCKED: 'tier_locked',
    LEVEL_LOCKED: 'level_locked',
    INSUFFICIENT_XP: 'insufficient_xp',
    COST_INVALID: 'cost_invalid',
});

function toIsoString(nowMs) {
    return new Date(Math.max(0, toSafeNumber(nowMs, Date.now()))).toISOString();
}

function toObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function uniqueList(values) {
    return [...new Set((Array.isArray(values) ? values : []).map((entry) => String(entry || '').trim()).filter(Boolean))];
}

function normalizeSlotName(slotName) {
    return String(slotName || '').trim().toLowerCase();
}

function normalizeTier(tier) {
    const normalized = String(tier || '').trim().toUpperCase();
    return normalized || 'T1';
}

function isValidTier(tier) {
    return tier === 'T1' || tier === 'T2' || tier === 'T3';
}

function resolveNextTier(tier) {
    const normalized = normalizeTier(tier);
    if (normalized === 'T1') return 'T2';
    if (normalized === 'T2') return 'T3';
    return null;
}

function profileEquals(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeVehicleProfile(profile) {
    const source = toObject(profile);
    const level = clampInt(source.level, 1, XP_CONFIG.MAX_LEVEL, 1);
    const xp = Math.max(0, toSafeNumber(source.xp, 0));
    const progression = resolveArcadeHangarProgressionSnapshot(level);
    const upgrades = toObject(source.upgrades);
    const spentUpgradeXp = Math.max(0, toSafeNumber(source.spentUpgradeXp, 0));
    const fallbackBank = Math.max(0, xp - spentUpgradeXp);
    const xpBank = clampInt(source.xpBank, 0, MAX_UPGRADE_XP_BANK, fallbackBank);
    const totalXpEarned = Math.max(xp, toSafeNumber(source.totalXpEarned, xp));
    const upgradesApplied = Math.max(0, clampInt(source.upgradesApplied, 0, 100_000, Object.keys(upgrades).length));
    const masteryMilestones = uniqueList(source.masteryMilestones).length
        ? uniqueList(source.masteryMilestones)
        : progression.masteryMilestones;
    const normalized = {
        ...source,
        xp,
        level,
        unlockedSlots: progression.unlockedSlots.slice(),
        upgrades: { ...upgrades },
        xpBank,
        spentUpgradeXp,
        totalXpEarned,
        upgradesApplied,
        unlockedPartFamilies: progression.allowedPartFamilies.slice(),
        unlockedUpgradeTiers: progression.allowedTiers.slice(),
        masteryMilestones: masteryMilestones.slice(),
    };
    return normalized;
}

function ensureProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    return normalizeVehicleProfile(profile);
}

function finalizeUpgradeState(baseState, code, ok = false) {
    return { ...baseState, ok, code };
}

function buildUpgradeState(profile, slotName, targetTier) {
    const normalizedProfile = ensureProfile(profile);
    if (!normalizedProfile) {
        return finalizeUpgradeState({
            profile,
            slotName: normalizeSlotName(slotName),
            targetTier: normalizeTier(targetTier),
            currentTier: 'T1',
            nextTier: 'T2',
            cost: Infinity,
            spendableXp: 0,
            remainingXp: 0,
            partFamily: null,
            requiredLevel: 1,
        }, UPGRADE_PURCHASE_CODES.INVALID_PROFILE);
    }

    const normalizedSlot = normalizeSlotName(slotName);
    const normalizedTargetTier = normalizeTier(targetTier);
    const currentTier = normalizeTier(normalizedProfile.upgrades?.[normalizedSlot] || 'T1');
    const nextTier = resolveNextTier(currentTier);
    const partFamily = resolveArcadeHangarPartFamily(normalizedSlot);
    const allowedPartFamilies = new Set(resolveArcadeHangarAllowedPartFamilies(normalizedProfile.level));
    const allowedTiers = new Set(resolveArcadeHangarAllowedTiers(normalizedProfile.level));
    const unlockedSlots = new Set(resolveArcadeHangarUnlockedSlots(normalizedProfile.level));
    const tierUnlockKey = `${normalizedSlot}_${normalizedTargetTier.toLowerCase()}`;
    const requiredLevelByTier = Number(ARCADE_HANGAR_TIER_UNLOCK_GATES[normalizedTargetTier]) || 1;
    const cost = Number(getUpgradeCost(normalizedSlot, normalizedTargetTier));
    const spendableXp = Math.max(0, toSafeNumber(normalizedProfile.xpBank, 0));
    const remainingXp = spendableXp - (Number.isFinite(cost) ? cost : 0);
    const baseState = {
        profile: normalizedProfile,
        slotName: normalizedSlot,
        targetTier: normalizedTargetTier,
        currentTier,
        nextTier,
        cost,
        spendableXp,
        remainingXp,
        partFamily,
        requiredLevel: requiredLevelByTier,
    };

    if (!normalizedSlot) return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.INVALID_SLOT);
    if (normalizedTargetTier !== 'T2' && normalizedTargetTier !== 'T3') {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.INVALID_TIER);
    }
    if (!nextTier || normalizedTargetTier !== nextTier) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.INVALID_TIER_SEQUENCE);
    }
    if (!unlockedSlots.has(normalizedSlot) && !unlockedSlots.has(tierUnlockKey)) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.SLOT_LOCKED);
    }
    if (partFamily && !allowedPartFamilies.has(partFamily)) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.PART_FAMILY_LOCKED);
    }
    if (!allowedTiers.has(normalizedTargetTier)) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.TIER_LOCKED);
    }
    if (!canUpgrade(normalizedSlot, normalizedTargetTier, normalizedProfile.level)) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.LEVEL_LOCKED);
    }
    if (!Number.isFinite(cost) || cost < 0) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.COST_INVALID);
    }
    if (spendableXp < cost) {
        return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.INSUFFICIENT_XP);
    }
    return finalizeUpgradeState(baseState, UPGRADE_PURCHASE_CODES.APPLIED, true);
}

// XP Curve

export function xpForLevel(level) {
    const n = Math.max(1, Math.min(XP_CONFIG.MAX_LEVEL, Math.floor(level)));
    if (n <= 1) return 0;
    return Math.floor(XP_CONFIG.BASE_XP * Math.pow(n, XP_CONFIG.EXPONENT));
}

export function xpToNextLevel(profile) {
    if (!profile || typeof profile !== 'object') return { current: 0, required: 100, progress: 0 };
    const normalized = normalizeVehicleProfile(profile);
    const level = clampInt(normalized.level, 1, XP_CONFIG.MAX_LEVEL, 1);
    if (level >= XP_CONFIG.MAX_LEVEL) return { current: 0, required: 0, progress: 1 };
    const currentLevelXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const required = nextLevelXp - currentLevelXp;
    const current = Math.max(0, toSafeNumber(normalized.xp, 0) - currentLevelXp);
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

// Slot stat bonuses

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

// Mastery perks

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

// Slot unlocks

export function getUnlockedSlots(level) {
    return resolveArcadeHangarUnlockedSlots(level);
}

// Profile CRUD

export function createArcadeVehicleProfile(vehicleId, nowMs = Date.now()) {
    const base = createArcadeVehicleProfileRecord(vehicleId, nowMs);
    return normalizeVehicleProfile(base);
}

export function addXp(profile, amount, nowMs = Date.now()) {
    if (!profile || typeof profile !== 'object') {
        return {
            profile,
            leveledUp: false,
            newLevel: 1,
            unlocksGained: [],
            partFamiliesGained: [],
            tiersGained: [],
            masteryMilestonesGained: [],
            xpBank: 0,
        };
    }
    const normalized = normalizeVehicleProfile(profile);
    const prevLevel = clampInt(normalized.level, 1, XP_CONFIG.MAX_LEVEL, 1);
    const gain = Math.max(0, toSafeNumber(amount, 0));
    const totalXp = Math.max(0, toSafeNumber(normalized.xp, 0) + gain);
    const newLevel = computeLevel(totalXp);
    const leveledUp = newLevel > prevLevel;

    const prevSnapshot = resolveArcadeHangarProgressionSnapshot(prevLevel);
    const nextSnapshot = resolveArcadeHangarProgressionSnapshot(newLevel);

    const prevSlots = new Set(prevSnapshot.unlockedSlots);
    const nextSlots = nextSnapshot.unlockedSlots.slice();
    const unlocksGained = nextSlots.filter((slotId) => !prevSlots.has(slotId));

    const prevPartFamilies = new Set(prevSnapshot.allowedPartFamilies);
    const partFamiliesGained = nextSnapshot.allowedPartFamilies.filter((familyId) => !prevPartFamilies.has(familyId));

    const prevTiers = new Set(prevSnapshot.allowedTiers);
    const tiersGained = nextSnapshot.allowedTiers.filter((tierId) => !prevTiers.has(tierId));

    const prevMilestones = new Set(prevSnapshot.masteryMilestones);
    const masteryMilestonesGained = nextSnapshot.masteryMilestones.filter((milestoneId) => !prevMilestones.has(milestoneId));

    const xpBank = clampInt((toSafeNumber(normalized.xpBank, 0) + gain), 0, MAX_UPGRADE_XP_BANK, 0);
    const priorTotalXpEarned = Math.max(
        toSafeNumber(normalized.totalXpEarned, normalized.xp),
        toSafeNumber(normalized.xp, 0)
    );
    return {
        profile: {
            ...normalized,
            xp: totalXp,
            level: newLevel,
            unlockedSlots: nextSnapshot.unlockedSlots.slice(),
            unlockedPartFamilies: nextSnapshot.allowedPartFamilies.slice(),
            unlockedUpgradeTiers: nextSnapshot.allowedTiers.slice(),
            masteryMilestones: nextSnapshot.masteryMilestones.slice(),
            xpBank,
            totalXpEarned: Math.max(totalXp, priorTotalXpEarned + gain),
            updatedAt: toIsoString(nowMs),
        },
        leveledUp,
        newLevel,
        unlocksGained,
        partFamiliesGained,
        tiersGained,
        masteryMilestonesGained,
        xpBank,
    };
}

export function applyUpgrade(profile, slotName, tier, nowMs = Date.now()) {
    if (!profile || typeof profile !== 'object') return profile;
    const normalized = normalizeVehicleProfile(profile);
    const slotKey = normalizeSlotName(slotName);
    if (!slotKey) return normalized;
    const upgrades = { ...normalized.upgrades };
    upgrades[slotKey] = normalizeTier(tier);
    return normalizeVehicleProfile({
        ...normalized,
        upgrades,
        upgradesApplied: Math.max(0, toSafeNumber(normalized.upgradesApplied, 0)),
        updatedAt: toIsoString(nowMs),
    });
}

export function evaluateUpgradePurchase(profile, slotName, targetTier) {
    return buildUpgradeState(profile, slotName, targetTier);
}

export function purchaseUpgrade(profile, slotName, targetTier, nowMs = Date.now()) {
    const upgradeState = buildUpgradeState(profile, slotName, targetTier);
    if (!upgradeState.ok) {
        return {
            ...upgradeState,
            profile: upgradeState.profile,
        };
    }

    const normalized = upgradeState.profile;
    const upgrades = { ...toObject(normalized.upgrades) };
    upgrades[upgradeState.slotName] = upgradeState.targetTier;
    const nextProfile = normalizeVehicleProfile({
        ...normalized,
        upgrades,
        xpBank: Math.max(0, upgradeState.spendableXp - upgradeState.cost),
        spentUpgradeXp: Math.max(0, toSafeNumber(normalized.spentUpgradeXp, 0) + upgradeState.cost),
        upgradesApplied: Math.max(0, toSafeNumber(normalized.upgradesApplied, 0)) + 1,
        lastUpgrade: {
            slotName: upgradeState.slotName,
            tier: upgradeState.targetTier,
            cost: upgradeState.cost,
            at: toIsoString(nowMs),
        },
        updatedAt: toIsoString(nowMs),
    });

    return {
        ...upgradeState,
        ok: true,
        code: UPGRADE_PURCHASE_CODES.APPLIED,
        profile: nextProfile,
        remainingXp: nextProfile.xpBank,
    };
}

export function getSpendableUpgradeXp(profile) {
    const normalized = ensureProfile(profile);
    return Math.max(0, toSafeNumber(normalized?.xpBank, 0));
}

export function sanitizeLoadoutPresetUpgrades(profile, upgrades) {
    const normalizedProfile = ensureProfile(profile);
    if (!normalizedProfile) {
        return {
            upgrades: {},
            rejectedEntries: [{
                slotName: '',
                targetTier: 'T1',
                code: UPGRADE_PURCHASE_CODES.INVALID_PROFILE,
            }],
            acceptedCount: 0,
        };
    }

    const source = toObject(upgrades);
    const entries = Object.entries(source).slice(0, MAX_LOADOUT_PRESET_UPGRADE_ENTRIES);
    const rejectedEntries = [];
    let simulatedProfile = normalizeVehicleProfile({
        ...normalizedProfile,
        upgrades: {},
        xpBank: MAX_UPGRADE_XP_BANK,
    });

    for (let index = 0; index < entries.length; index += 1) {
        const [rawSlotName, rawTargetTier] = entries[index];
        const slotName = normalizeSlotName(rawSlotName);
        const targetTier = normalizeTier(rawTargetTier);

        if (!slotName || !resolveArcadeHangarPartFamily(slotName)) {
            rejectedEntries.push({
                slotName,
                targetTier,
                code: UPGRADE_PURCHASE_CODES.INVALID_SLOT,
            });
            continue;
        }
        if (!isValidTier(targetTier)) {
            rejectedEntries.push({
                slotName,
                targetTier,
                code: UPGRADE_PURCHASE_CODES.INVALID_TIER,
            });
            continue;
        }
        if (targetTier === 'T1') {
            continue;
        }

        let currentTier = 'T1';
        let blockedCode = '';
        while (currentTier !== targetTier) {
            const nextTier = resolveNextTier(currentTier);
            if (!nextTier) {
                blockedCode = UPGRADE_PURCHASE_CODES.INVALID_TIER_SEQUENCE;
                break;
            }
            const upgradeResult = purchaseUpgrade(simulatedProfile, slotName, nextTier, 0);
            if (!upgradeResult.ok) {
                blockedCode = upgradeResult.code || UPGRADE_PURCHASE_CODES.INVALID_TIER_SEQUENCE;
                break;
            }
            simulatedProfile = upgradeResult.profile;
            currentTier = nextTier;
        }

        if (blockedCode) {
            rejectedEntries.push({
                slotName,
                targetTier,
                code: blockedCode,
            });
        }
    }

    return {
        upgrades: { ...toObject(simulatedProfile.upgrades) },
        rejectedEntries,
        acceptedCount: Object.keys(toObject(simulatedProfile.upgrades)).length,
    };
}

export function applyLoadoutPreset(profile, upgrades, nowMs = Date.now()) {
    const normalizedProfile = ensureProfile(profile);
    if (!normalizedProfile) {
        return {
            profile: profile || null,
            upgrades: {},
            rejectedEntries: [{
                slotName: '',
                targetTier: 'T1',
                code: UPGRADE_PURCHASE_CODES.INVALID_PROFILE,
            }],
            acceptedCount: 0,
        };
    }

    const sanitized = sanitizeLoadoutPresetUpgrades(normalizedProfile, upgrades);
    const nextProfile = normalizeVehicleProfile({
        ...normalizedProfile,
        upgrades: { ...sanitized.upgrades },
        updatedAt: toIsoString(nowMs),
    });
    return {
        profile: nextProfile,
        upgrades: { ...toObject(nextProfile.upgrades) },
        rejectedEntries: sanitized.rejectedEntries.slice(),
        acceptedCount: sanitized.acceptedCount,
    };
}

// XP Reward Calculation

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

// Persistence

export function loadVehicleProfiles(store) {
    if (!store || typeof store.loadJsonRecord !== 'function') return {};
    const raw = store.loadJsonRecord(STORAGE_KEY, {});
    const { profiles: contractProfiles, shouldPersist } = readArcadeVehicleProfileRecord(raw);
    const normalizedProfiles = {};
    let shouldRewrite = shouldPersist;

    Object.entries(contractProfiles).forEach(([vehicleId, profile]) => {
        const normalized = normalizeVehicleProfile(profile);
        normalizedProfiles[vehicleId] = normalized;
        if (!profileEquals(profile, normalized)) shouldRewrite = true;
    });

    if (shouldRewrite && typeof store.saveJsonRecord === 'function') {
        const saveResult = store.saveJsonRecord(STORAGE_KEY, normalizedProfiles);
        warnPersistenceFailure('canonical write-back', saveResult);
    }
    return normalizedProfiles;
}

export function saveVehicleProfiles(store, profiles) {
    if (!store || typeof store.saveJsonRecord !== 'function') return;
    const sourceProfiles = profiles && typeof profiles === 'object' ? profiles : {};
    const normalizedProfiles = {};
    Object.entries(sourceProfiles).forEach(([vehicleId, profile]) => {
        normalizedProfiles[vehicleId] = normalizeVehicleProfile(profile);
    });
    const saveResult = store.saveJsonRecord(STORAGE_KEY, normalizedProfiles);
    warnPersistenceFailure('saveVehicleProfiles', saveResult);
}

export function getOrCreateProfile(profiles, vehicleId, nowMs = Date.now()) {
    const record = getArcadeVehicleProfileRecord(profiles, vehicleId, nowMs);
    return normalizeVehicleProfile(record);
}

export default {
    VEHICLE_PROFILE_SCHEMA_VERSION,
    XP_CONFIG,
    SLOT_UNLOCK_LEVELS,
    XP_REWARD_TABLE,
    UPGRADE_PURCHASE_CODES,
    xpForLevel,
    xpToNextLevel,
    getSlotStatBonuses,
    getMasteryPerks,
    getUnlockedSlots,
    createArcadeVehicleProfile,
    addXp,
    applyUpgrade,
    evaluateUpgradePurchase,
    purchaseUpgrade,
    getSpendableUpgradeXp,
    sanitizeLoadoutPresetUpgrades,
    applyLoadoutPreset,
    calculateSectorXp,
    loadVehicleProfiles,
    saveVehicleProfiles,
    getOrCreateProfile,
};
