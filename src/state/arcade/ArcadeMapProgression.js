// ─── Arcade Map Progression: Multi-Map Sequencing per Arcade Run ───

import { MAP_PRESET_CATALOG } from '../../core/config/maps/MapPresetCatalog.js';

export const SECTOR_MAP_POOLS = Object.freeze({
    sector_intro: Object.freeze(['standard', 'foam_forest', 'crossfire']),
    sector_pressure: Object.freeze(['maze', 'vertical_maze', 'trench', 'neon_abyss']),
    sector_hazard: Object.freeze(['complex', 'pyramid', 'crystal_ruins']),
    sector_endurance: Object.freeze(['expert_gauntlet', 'portal_madness', 'crystal_ruins']),
});

const DEFAULT_MAP = 'standard';

function normalizeSeed(seed) {
    const text = String(seed ?? 'arcade-map-default');
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

function isValidMapKey(mapKey) {
    return typeof mapKey === 'string' && mapKey in MAP_PRESET_CATALOG;
}

function pickValidMap(pool, randomFn) {
    if (!Array.isArray(pool) || pool.length === 0) return DEFAULT_MAP;
    const validPool = pool.filter(isValidMapKey);
    if (validPool.length === 0) return DEFAULT_MAP;
    const index = Math.floor(randomFn() * validPool.length);
    return validPool[Math.max(0, Math.min(validPool.length - 1, index))];
}

/**
 * Resolves a map sequence from a sector plan.
 * Each sector gets a map picked from the template's map pool.
 * Avoids repeating the same map in consecutive sectors when possible.
 */
export function resolveMapSequence(sectorPlan, seed) {
    if (!sectorPlan || !Array.isArray(sectorPlan.sequence)) return [];
    const randomFn = createSeededRandom(`${seed}-mapseq`);
    const sequence = [];

    for (let i = 0; i < sectorPlan.sequence.length; i += 1) {
        const entry = sectorPlan.sequence[i];
        const templateId = String(entry?.templateId || 'sector_intro');
        const pool = SECTOR_MAP_POOLS[templateId] || SECTOR_MAP_POOLS.sector_intro;

        let mapKey = pickValidMap(pool, randomFn);

        // Avoid consecutive duplicate maps when pool has alternatives
        if (i > 0 && mapKey === sequence[i - 1] && pool.length > 1) {
            const alternatives = pool.filter((k) => k !== mapKey && isValidMapKey(k));
            if (alternatives.length > 0) {
                mapKey = alternatives[Math.floor(randomFn() * alternatives.length)];
            }
        }

        sequence.push(mapKey);
    }

    return sequence;
}

/**
 * Gets the map key for a given sector index from the run state.
 */
export function getMapKeyForSector(mapSequence, sectorIndex) {
    if (!Array.isArray(mapSequence) || mapSequence.length === 0) return DEFAULT_MAP;
    const idx = Math.max(0, Math.min(mapSequence.length - 1, Math.floor(sectorIndex)));
    return mapSequence[idx] || DEFAULT_MAP;
}

/**
 * Checks whether the next sector requires a map transition.
 */
export function needsMapTransition(mapSequence, currentSectorIndex) {
    if (!Array.isArray(mapSequence) || mapSequence.length === 0) return false;
    const currentIdx = Math.max(0, Math.floor(currentSectorIndex));
    const nextIdx = currentIdx + 1;
    if (nextIdx >= mapSequence.length) return false;
    return mapSequence[currentIdx] !== mapSequence[nextIdx];
}

export default {
    SECTOR_MAP_POOLS,
    resolveMapSequence,
    getMapKeyForSector,
    needsMapTransition,
};
