// ─── Arcade Mission System: Types, Progress Tracking, Completion ───

import { MISSION_TYPES, formatMissionProgress } from '../../shared/contracts/ArcadeMissionContract.js';

const MISSION_TYPE_KEYS = Object.keys(MISSION_TYPES);

function toSafeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSeed(seed) {
    const text = String(seed ?? 'mission-default');
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

// ─── Mission Instance ───

export function createMissionInstance(typeId, params = {}) {
    const typeDef = MISSION_TYPES[typeId];
    if (!typeDef) return null;
    const mergedParams = { ...typeDef.defaultParams, ...params };
    return {
        id: `${typeId}-${Date.now().toString(36)}`,
        type: typeId,
        label: typeDef.label,
        icon: typeDef.icon,
        params: mergedParams,
        progress: { ...mergedParams },
        completed: false,
    };
}

// ─── Progress Updates ───

export function updateMissionProgress(mission, event) {
    if (!mission || mission.completed) return mission;
    const progress = { ...mission.progress };

    switch (mission.type) {
        case 'KILL_COUNT':
            if (event.type === 'kill') {
                progress.kills = (progress.kills || 0) + toSafeNumber(event.count, 1);
            }
            break;
        case 'COLLECT_ITEMS':
            if (event.type === 'collect') {
                progress.collected = (progress.collected || 0) + toSafeNumber(event.count, 1);
            }
            break;
        case 'SURVIVE_DURATION':
            if (event.type === 'tick') {
                progress.survived = toSafeNumber(event.elapsed, progress.survived);
            }
            break;
        case 'REACH_PORTAL':
            if (event.type === 'exit_portal') {
                progress.reached = true;
            }
            break;
        case 'TIME_TRIAL':
            if (event.type === 'sector_complete') {
                progress.elapsed = toSafeNumber(event.elapsed, 0);
            }
            break;
        default:
            return mission;
    }

    const typeDef = MISSION_TYPES[mission.type];
    const completed = typeDef ? typeDef.check(progress) : false;

    return { ...mission, progress, completed };
}

export function checkMissionComplete(mission) {
    if (!mission || typeof mission !== 'object') return false;
    const typeDef = MISSION_TYPES[mission.type];
    if (!typeDef) return false;
    return typeDef.check(mission.progress || {});
}

// formatMissionProgress is now exported from ArcadeMissionContract
// (re-exported below for backwards compatibility)

// ─── Mission Assignment ───

export function assignSectorMissions(sectorTemplate, mapMissions, seed, sectorNumber) {
    const randomFn = createSeededRandom(`${seed}-missions-${sectorNumber}`);
    const missionCount = 1 + (randomFn() > 0.5 ? 1 : 0); // 1-2 missions

    // Build weighted pool from map-specific missions, or fallback to generic
    let pool = [];
    if (Array.isArray(mapMissions) && mapMissions.length > 0) {
        pool = mapMissions;
    } else {
        // Generic fallback pool based on sector template
        const templateId = String(sectorTemplate?.id || sectorTemplate || 'sector_intro');
        pool = buildGenericMissionPool(templateId);
    }

    if (pool.length === 0) return [];

    const missions = [];
    const usedTypes = new Set();

    for (let i = 0; i < missionCount && pool.length > 0; i += 1) {
        // Weighted random selection
        const totalWeight = pool.reduce((sum, entry) => sum + toSafeNumber(entry.weight, 1), 0);
        let roll = randomFn() * totalWeight;
        let chosen = pool[0];

        for (let j = 0; j < pool.length; j += 1) {
            roll -= toSafeNumber(pool[j].weight, 1);
            if (roll <= 0) {
                chosen = pool[j];
                break;
            }
        }

        // Avoid duplicate mission types in same sector
        if (usedTypes.has(chosen.type) && pool.length > 1) {
            const alternatives = pool.filter((m) => !usedTypes.has(m.type));
            if (alternatives.length > 0) {
                chosen = alternatives[Math.floor(randomFn() * alternatives.length)];
            }
        }

        const instance = createMissionInstance(chosen.type, chosen.params);
        if (instance) {
            missions.push(instance);
            usedTypes.add(chosen.type);
        }
    }

    return missions;
}

function buildGenericMissionPool(templateId) {
    switch (templateId) {
        case 'sector_intro':
            return [
                { type: 'KILL_COUNT', params: { target: 3 }, weight: 2 },
                { type: 'SURVIVE_DURATION', params: { target: 30 }, weight: 1 },
            ];
        case 'sector_pressure':
            return [
                { type: 'KILL_COUNT', params: { target: 5 }, weight: 2 },
                { type: 'SURVIVE_DURATION', params: { target: 45 }, weight: 1.5 },
                { type: 'COLLECT_ITEMS', params: { target: 3 }, weight: 1 },
            ];
        case 'sector_hazard':
            return [
                { type: 'KILL_COUNT', params: { target: 7 }, weight: 1.5 },
                { type: 'SURVIVE_DURATION', params: { target: 55 }, weight: 1 },
                { type: 'TIME_TRIAL', params: { target: 40 }, weight: 1.5 },
            ];
        case 'sector_endurance':
            return [
                { type: 'KILL_COUNT', params: { target: 10 }, weight: 2 },
                { type: 'SURVIVE_DURATION', params: { target: 60 }, weight: 1 },
                { type: 'REACH_PORTAL', params: {}, weight: 1.5 },
            ];
        default:
            return [
                { type: 'KILL_COUNT', params: { target: 5 }, weight: 2 },
                { type: 'SURVIVE_DURATION', params: { target: 40 }, weight: 1 },
            ];
    }
}

// ─── Sector Mission State ───

export function createSectorMissionState(missions) {
    return {
        missions: Array.isArray(missions) ? missions : [],
        allCompleted: false,
        completedCount: 0,
    };
}

export function updateSectorMissionState(state, event) {
    if (!state || !Array.isArray(state.missions)) return state;
    let changed = false;
    const missions = state.missions.map((mission) => {
        if (mission.completed) return mission;
        const updated = updateMissionProgress(mission, event);
        if (updated !== mission) changed = true;
        return updated;
    });
    if (!changed) return state;
    const completedCount = missions.filter((m) => m.completed).length;
    return {
        missions,
        completedCount,
        allCompleted: completedCount === missions.length && missions.length > 0,
    };
}

export default {
    MISSION_TYPES,
    createMissionInstance,
    updateMissionProgress,
    checkMissionComplete,
    formatMissionProgress,
    assignSectorMissions,
    createSectorMissionState,
    updateSectorMissionState,
};
