/**
 * FightHangarBalanceContract — V76 76.4 (scaffold from 76.1)
 *
 * Fight Hangar balance rules. All Fight vehicle stats (HP, speed, inventory
 * slots, MG count) are derived deterministically from the hitbox class.
 * No free HP/speed/slot values may be set directly (DoD.4).
 *
 * Exploit protection: stat bands are closed — a build cannot exceed class
 * ceilings by part composition. Live rule explanation is mandatory in UI.
 */
import { ARCADE_HITBOX_CLASSES } from '../../entities/arcade/ArcadeBlueprintSchema.js';

export const FIGHT_HANGAR_BALANCE_CONTRACT_VERSION = 'fight-hangar-balance.v1';

export const FIGHT_HITBOX_CLASSES = Object.freeze({
    compact: 'compact',
    standard: 'standard',
    heavy: 'heavy',
});

// ─── Stat Bands per Hitbox Class ───
// HP, speed, inventory slots and MG count are derived from hitbox class only.
// Consumers must call resolveFightVehicleStats() — never set these directly.

export const FIGHT_CLASS_STAT_BANDS = Object.freeze({
    [FIGHT_HITBOX_CLASSES.compact]: Object.freeze({
        hitboxClass: FIGHT_HITBOX_CLASSES.compact,
        hitboxLimits: ARCADE_HITBOX_CLASSES.compact,
        baseHp: 80,
        speedNorm: 1.20,
        inventorySlots: 3,
        mgCount: 1,
        description: 'Schnell und wendig; geringes HP-Budget und wenig Ausruestungsraum.',
    }),
    [FIGHT_HITBOX_CLASSES.standard]: Object.freeze({
        hitboxClass: FIGHT_HITBOX_CLASSES.standard,
        hitboxLimits: ARCADE_HITBOX_CLASSES.standard,
        baseHp: 120,
        speedNorm: 1.00,
        inventorySlots: 5,
        mgCount: 2,
        description: 'Ausgewogen; mittleres HP-Budget und Standard-Ausruestung.',
    }),
    [FIGHT_HITBOX_CLASSES.heavy]: Object.freeze({
        hitboxClass: FIGHT_HITBOX_CLASSES.heavy,
        hitboxLimits: ARCADE_HITBOX_CLASSES.heavy,
        baseHp: 180,
        speedNorm: 0.80,
        inventorySlots: 7,
        mgCount: 3,
        description: 'Robust und schwerf; hohes HP-Budget und maximale Ausruestungsoptionen.',
    }),
});

// ─── Stat Resolution ───

export function resolveFightHitboxClass(rawClass) {
    const normalized = String(rawClass || '').trim().toLowerCase();
    if (Object.values(FIGHT_HITBOX_CLASSES).includes(normalized)) return normalized;
    return FIGHT_HITBOX_CLASSES.standard;
}

export function resolveFightVehicleStats(rawHitboxClass) {
    const hitboxClass = resolveFightHitboxClass(rawHitboxClass);
    return FIGHT_CLASS_STAT_BANDS[hitboxClass] || FIGHT_CLASS_STAT_BANDS[FIGHT_HITBOX_CLASSES.standard];
}

export function validateFightBlueprintClass(blueprint) {
    if (!blueprint || typeof blueprint !== 'object') {
        return { ok: false, errors: ['missing blueprint'], hitboxClass: FIGHT_HITBOX_CLASSES.standard };
    }
    const hitboxClass = resolveFightHitboxClass(blueprint.hitboxClass);
    const band = FIGHT_CLASS_STAT_BANDS[hitboxClass];
    const limits = band.hitboxLimits;
    const stats = blueprint.stats && typeof blueprint.stats === 'object' ? blueprint.stats : {};
    const extents = stats.extents && typeof stats.extents === 'object' ? stats.extents : {};
    const errors = [];

    if ((Number(stats.radius) || 0) > limits.maxRadius) {
        errors.push(`hitbox radius exceeds ${hitboxClass} limit (${stats.radius}/${limits.maxRadius})`);
    }
    if ((Number(extents.width) || 0) > limits.maxWidth) {
        errors.push(`hitbox width exceeds ${hitboxClass} limit (${extents.width}/${limits.maxWidth})`);
    }
    if ((Number(extents.height) || 0) > limits.maxHeight) {
        errors.push(`hitbox height exceeds ${hitboxClass} limit (${extents.height}/${limits.maxHeight})`);
    }
    if ((Number(extents.length) || 0) > limits.maxLength) {
        errors.push(`hitbox length exceeds ${hitboxClass} limit (${extents.length}/${limits.maxLength})`);
    }

    return { ok: errors.length === 0, errors, hitboxClass };
}
