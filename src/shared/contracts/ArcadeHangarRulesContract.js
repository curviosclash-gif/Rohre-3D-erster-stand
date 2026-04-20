/**
 * ArcadeHangarRulesContract — V76 76.3 (scaffold from 76.1)
 *
 * Arcade Hangar progression rules. Defines slot unlock gates, blueprint
 * budget limits per level band, and the XP-driven development loop.
 * Arcade vehicles follow fixed rule paths — free stat adjustments are
 * not allowed (DoD.3).
 *
 * References ArcadeVehicleProfile for XP/level state; does not duplicate it.
 */
import { ARCADE_REQUIRED_SLOTS } from '../../entities/arcade/ArcadeBlueprintSchema.js';

export const ARCADE_HANGAR_RULES_CONTRACT_VERSION = 'arcade-hangar-rules.v1';

// ─── Level Bands ───
// Arcade hangar groups levels into bands that gate chassis, parts and budgets.

export const ARCADE_HANGAR_LEVEL_BANDS = Object.freeze({
    RECRUIT: Object.freeze({ id: 'recruit', minLevel: 1, maxLevel: 9, label: 'Recruit' }),
    VETERAN: Object.freeze({ id: 'veteran', minLevel: 10, maxLevel: 19, label: 'Veteran' }),
    ELITE: Object.freeze({ id: 'elite', minLevel: 20, maxLevel: 30, label: 'Elite' }),
});

// ─── Slot Unlock Gates ───
// Levels at which additional part slots are unlocked in Arcade hangar.
// Base slots (ARCADE_REQUIRED_SLOTS) are always available from level 1.

export const ARCADE_HANGAR_SLOT_UNLOCK_GATES = Object.freeze({
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

// ─── Blueprint Budget Limits per Level Band ───
// Part budget, mass, power and heat ceilings scale with level band.

export const ARCADE_HANGAR_BUDGET_BY_BAND = Object.freeze({
    [ARCADE_HANGAR_LEVEL_BANDS.RECRUIT.id]: Object.freeze({
        band: ARCADE_HANGAR_LEVEL_BANDS.RECRUIT.id,
        editorBudget: 60,
        massBudget: 55,
        powerBudget: 60,
        heatBudget: 52,
    }),
    [ARCADE_HANGAR_LEVEL_BANDS.VETERAN.id]: Object.freeze({
        band: ARCADE_HANGAR_LEVEL_BANDS.VETERAN.id,
        editorBudget: 80,
        massBudget: 72,
        powerBudget: 80,
        heatBudget: 70,
    }),
    [ARCADE_HANGAR_LEVEL_BANDS.ELITE.id]: Object.freeze({
        band: ARCADE_HANGAR_LEVEL_BANDS.ELITE.id,
        editorBudget: 100,
        massBudget: 90,
        powerBudget: 96,
        heatBudget: 88,
    }),
});

// ─── Rule Resolution ───

export function resolveArcadeHangarLevelBand(level) {
    const n = Math.max(1, Math.min(30, Math.floor(Number(level) || 1)));
    if (n >= ARCADE_HANGAR_LEVEL_BANDS.ELITE.minLevel) return ARCADE_HANGAR_LEVEL_BANDS.ELITE;
    if (n >= ARCADE_HANGAR_LEVEL_BANDS.VETERAN.minLevel) return ARCADE_HANGAR_LEVEL_BANDS.VETERAN;
    return ARCADE_HANGAR_LEVEL_BANDS.RECRUIT;
}

export function resolveArcadeHangarBudget(level) {
    const band = resolveArcadeHangarLevelBand(level);
    return ARCADE_HANGAR_BUDGET_BY_BAND[band.id] || ARCADE_HANGAR_BUDGET_BY_BAND[ARCADE_HANGAR_LEVEL_BANDS.RECRUIT.id];
}

export function resolveArcadeHangarUnlockedSlots(level) {
    const n = Math.max(1, Math.floor(Number(level) || 1));
    const slots = [...ARCADE_REQUIRED_SLOTS];
    const entries = Object.entries(ARCADE_HANGAR_SLOT_UNLOCK_GATES);
    for (let i = 0; i < entries.length; i += 1) {
        if (n >= entries[i][1]) slots.push(entries[i][0]);
    }
    return slots;
}

export function resolveArcadeHangarRulesForLevel(level) {
    const band = resolveArcadeHangarLevelBand(level);
    return Object.freeze({
        contractVersion: ARCADE_HANGAR_RULES_CONTRACT_VERSION,
        level: Math.max(1, Math.min(30, Math.floor(Number(level) || 1))),
        band: band.id,
        bandLabel: band.label,
        budget: resolveArcadeHangarBudget(level),
        unlockedSlots: resolveArcadeHangarUnlockedSlots(level),
    });
}
