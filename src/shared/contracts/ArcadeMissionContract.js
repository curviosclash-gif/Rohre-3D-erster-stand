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
