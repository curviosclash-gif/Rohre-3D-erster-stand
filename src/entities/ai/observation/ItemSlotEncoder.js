// ============================================
// ItemSlotEncoder.js - stable 20-slot item encoding for bot observations
// ============================================

export const ITEM_SLOT_COUNT = 20;
export const ITEM_SLOT_UNKNOWN_INDEX = 19;

export const ITEM_SLOT_BY_TYPE = Object.freeze({
    SPEED_UP: 0,
    SLOW_DOWN: 1,
    THICK: 2,
    THIN: 3,
    SHIELD: 4,
    SLOW_TIME: 5,
    GHOST: 6,
    INVERT: 7,
    ROCKET_WEAK: 8,
    ROCKET_MEDIUM: 9,
    ROCKET_HEAVY: 10,
    ROCKET_MEGA: 11,
});

function normalizeItemType(type) {
    return String(type || '').trim().toUpperCase();
}

export function resolveItemSlotIndex(itemType) {
    const normalized = normalizeItemType(itemType);
    if (!normalized) return ITEM_SLOT_UNKNOWN_INDEX;
    return Number.isInteger(ITEM_SLOT_BY_TYPE[normalized])
        ? ITEM_SLOT_BY_TYPE[normalized]
        : ITEM_SLOT_UNKNOWN_INDEX;
}

export function clearItemSlots(target, offset = 0) {
    for (let i = 0; i < ITEM_SLOT_COUNT; i++) {
        target[offset + i] = 0;
    }
    return target;
}

export function encodeItemSlots(items, target = new Array(ITEM_SLOT_COUNT), offset = 0) {
    clearItemSlots(target, offset);
    if (!Array.isArray(items) || items.length === 0) {
        return target;
    }

    for (let i = 0; i < items.length; i++) {
        const slotIndex = resolveItemSlotIndex(items[i]);
        if (slotIndex < 0 || slotIndex >= ITEM_SLOT_COUNT) continue;
        target[offset + slotIndex] = 1;
    }
    return target;
}
