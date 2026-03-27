// ─── Arcade Mission Contract: Shared Type Definitions & Formatters ───
// Layer: Shared (UI & State can both depend on this)
// Purpose: Decouple UI (ArcadeMissionHUD) from State (ArcadeMissionState) via shared contracts

export const MISSION_TYPES = Object.freeze({
    KILL_COUNT: Object.freeze({
        id: 'KILL_COUNT',
        label: 'Eliminate',
        icon: 'crosshair',
        defaultParams: { target: 5 },
        check: (progress) => (progress.kills || 0) >= (progress.target || 5),
        format: (progress) => `${Math.min(progress.kills || 0, progress.target || 5)}/${progress.target || 5}`,
    }),
    COLLECT_ITEMS: Object.freeze({
        id: 'COLLECT_ITEMS',
        label: 'Collect',
        icon: 'gem',
        defaultParams: { target: 3 },
        check: (progress) => (progress.collected || 0) >= (progress.target || 3),
        format: (progress) => `${Math.min(progress.collected || 0, progress.target || 3)}/${progress.target || 3}`,
    }),
    SURVIVE_DURATION: Object.freeze({
        id: 'SURVIVE_DURATION',
        label: 'Survive',
        icon: 'clock',
        defaultParams: { target: 45 },
        check: (progress) => (progress.survived || 0) >= (progress.target || 45),
        format: (progress) => `${Math.floor(progress.survived || 0)}/${progress.target || 45}s`,
    }),
    REACH_PORTAL: Object.freeze({
        id: 'REACH_PORTAL',
        label: 'Reach Exit',
        icon: 'portal',
        defaultParams: {},
        check: (progress) => progress.reached === true,
        format: (progress) => progress.reached ? 'Done' : 'Find the exit portal',
    }),
    TIME_TRIAL: Object.freeze({
        id: 'TIME_TRIAL',
        label: 'Speed Run',
        icon: 'stopwatch',
        defaultParams: { target: 30 },
        check: (progress) => progress.elapsed > 0 && progress.elapsed <= (progress.target || 30),
        format: (progress) => `${Math.floor(progress.elapsed || 0)}/${progress.target || 30}s`,
    }),
    // 61.3.1 — New mission types
    NO_DAMAGE: Object.freeze({
        id: 'NO_DAMAGE',
        label: 'No Damage',
        icon: 'shield',
        defaultParams: {},
        check: (progress) => progress.hitCount === 0,
        format: (progress) => (progress.hitCount || 0) === 0 ? 'Untouched' : `Hits: ${progress.hitCount}`,
    }),
    MULTI_KILL: Object.freeze({
        id: 'MULTI_KILL',
        label: 'Multi-Kill',
        icon: 'burst',
        defaultParams: { target: 3, windowSec: 15 },
        check: (progress) => (progress.windowKills || 0) >= (progress.target || 3),
        format: (progress) => `${Math.min(progress.windowKills || 0, progress.target || 3)}/${progress.target || 3} in ${progress.windowSec || 15}s`,
    }),
    TRAIL_MASTER: Object.freeze({
        id: 'TRAIL_MASTER',
        label: 'Trail Master',
        icon: 'trail',
        defaultParams: { target: 100 },
        check: (progress) => (progress.metersSafe || 0) >= (progress.target || 100),
        format: (progress) => `${Math.floor(progress.metersSafe || 0)}/${progress.target || 100}m`,
    }),
    // 61.3.2 — Additional new mission types
    ITEM_CHAIN: Object.freeze({
        id: 'ITEM_CHAIN',
        label: 'Item Chain',
        icon: 'chain',
        defaultParams: { target: 3 },
        check: (progress) => (progress.chain || 0) >= (progress.target || 3),
        format: (progress) => `${Math.min(progress.chain || 0, progress.target || 3)}/${progress.target || 3} chain`,
    }),
    CLOSE_CALL: Object.freeze({
        id: 'CLOSE_CALL',
        label: 'Close Call',
        icon: 'heartbeat',
        defaultParams: { target: 3 },
        check: (progress) => (progress.count || 0) >= (progress.target || 3),
        format: (progress) => `${Math.min(progress.count || 0, progress.target || 3)}/${progress.target || 3} survived`,
    }),
});

/**
 * Format mission progress for display.
 * @param {Object} mission - Mission object with progress/completed fields
 * @returns {string} Formatted progress string
 */
export function formatMissionProgress(mission) {
    if (!mission || typeof mission !== 'object') return '';
    const typeDef = MISSION_TYPES[mission.type];
    if (!typeDef) return '';
    return typeDef.format(mission.progress || {});
}

export default {
    MISSION_TYPES,
    formatMissionProgress,
};
