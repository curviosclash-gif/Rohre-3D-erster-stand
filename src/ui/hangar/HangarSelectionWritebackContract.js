/**
 * Shared writeback contract for Start-Setup and Hangar selection persistence.
 * V76 76.2.2: use one contract for map/vehicle selection and persisted local state.
 */

export const HANGAR_SELECTION_WRITEBACK_VERSION = 'hangar-selection-writeback.v1';

export const HANGAR_SELECTION_PLAYER_SLOTS = Object.freeze({
    PLAYER_1: 'PLAYER_1',
    PLAYER_2: 'PLAYER_2',
});

const VALID_PLAYER_SLOT_SET = new Set(Object.values(HANGAR_SELECTION_PLAYER_SLOTS));

export const HANGAR_SELECTION_WRITEBACK_PATHS = Object.freeze({
    MAP_KEY: 'settings.mapKey',
    VEHICLE_PLAYER_1: 'settings.vehicles.PLAYER_1',
    VEHICLE_PLAYER_2: 'settings.vehicles.PLAYER_2',
    START_SETUP_STATE: 'settings.localSettings.startSetup',
});

export const HANGAR_START_SETUP_PERSISTED_FIELDS = Object.freeze({
    FAVORITE_MAPS: 'favoriteMaps',
    RECENT_MAPS: 'recentMaps',
    FAVORITE_VEHICLES: 'favoriteVehicles',
    RECENT_VEHICLES: 'recentVehicles',
    MAP_SEARCH: 'mapSearch',
    MAP_FILTER: 'mapFilter',
    VEHICLE_SEARCH: 'vehicleSearch',
    VEHICLE_FILTER: 'vehicleFilter',
});

function normalizeString(value, fallback = '') {
    const normalized = String(value || '').trim();
    return normalized || String(fallback || '').trim();
}

function ensureVehiclesState(settings) {
    if (!settings.vehicles || typeof settings.vehicles !== 'object') {
        settings.vehicles = {};
    }
    if (typeof settings.vehicles.PLAYER_1 !== 'string') settings.vehicles.PLAYER_1 = 'ship5';
    if (typeof settings.vehicles.PLAYER_2 !== 'string') settings.vehicles.PLAYER_2 = 'ship5';
    return settings.vehicles;
}

export function resolveHangarSelectionPlayerSlot(rawSlot) {
    const slot = normalizeString(rawSlot).toUpperCase();
    return VALID_PLAYER_SLOT_SET.has(slot) ? slot : HANGAR_SELECTION_PLAYER_SLOTS.PLAYER_1;
}

export function ensureHangarSelectionWritebackState(settings) {
    if (!settings || typeof settings !== 'object') {
        return null;
    }
    ensureVehiclesState(settings);
    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    if (!settings.localSettings.startSetup || typeof settings.localSettings.startSetup !== 'object') {
        settings.localSettings.startSetup = {};
    }
    const startSetup = settings.localSettings.startSetup;
    if (!Array.isArray(startSetup.favoriteMaps)) startSetup.favoriteMaps = [];
    if (!Array.isArray(startSetup.recentMaps)) startSetup.recentMaps = [];
    if (!Array.isArray(startSetup.favoriteVehicles)) startSetup.favoriteVehicles = [];
    if (!Array.isArray(startSetup.recentVehicles)) startSetup.recentVehicles = [];
    if (typeof startSetup.mapSearch !== 'string') startSetup.mapSearch = '';
    if (typeof startSetup.mapFilter !== 'string') startSetup.mapFilter = 'all';
    if (typeof startSetup.vehicleSearch !== 'string') startSetup.vehicleSearch = '';
    if (typeof startSetup.vehicleFilter !== 'string') startSetup.vehicleFilter = 'all';
    return startSetup;
}

function resolveVehiclePersistencePath(playerSlot) {
    return playerSlot === HANGAR_SELECTION_PLAYER_SLOTS.PLAYER_2
        ? HANGAR_SELECTION_WRITEBACK_PATHS.VEHICLE_PLAYER_2
        : HANGAR_SELECTION_WRITEBACK_PATHS.VEHICLE_PLAYER_1;
}

export function writeHangarMapSelection(settings, rawMapKey, fallbackMapKey = 'standard') {
    if (!settings || typeof settings !== 'object') {
        return {
            changed: false,
            value: normalizeString(rawMapKey, fallbackMapKey) || 'standard',
            persistencePath: HANGAR_SELECTION_WRITEBACK_PATHS.MAP_KEY,
        };
    }
    ensureHangarSelectionWritebackState(settings);
    const nextMapKey = normalizeString(rawMapKey, fallbackMapKey) || 'standard';
    const previousMapKey = normalizeString(settings.mapKey);
    settings.mapKey = nextMapKey;
    return {
        changed: previousMapKey !== nextMapKey,
        value: nextMapKey,
        persistencePath: HANGAR_SELECTION_WRITEBACK_PATHS.MAP_KEY,
    };
}

export function writeHangarVehicleSelection(settings, rawPlayerSlot, rawVehicleId, fallbackVehicleId = 'ship5') {
    if (!settings || typeof settings !== 'object') {
        const resolvedSlot = resolveHangarSelectionPlayerSlot(rawPlayerSlot);
        return {
            changed: false,
            playerSlot: resolvedSlot,
            value: normalizeString(rawVehicleId, fallbackVehicleId).toLowerCase() || 'ship5',
            persistencePath: resolveVehiclePersistencePath(resolvedSlot),
        };
    }
    ensureHangarSelectionWritebackState(settings);
    const playerSlot = resolveHangarSelectionPlayerSlot(rawPlayerSlot);
    const nextVehicleId = normalizeString(rawVehicleId, fallbackVehicleId).toLowerCase() || 'ship5';
    const previousVehicleId = normalizeString(settings.vehicles?.[playerSlot]).toLowerCase();
    settings.vehicles[playerSlot] = nextVehicleId;
    return {
        changed: previousVehicleId !== nextVehicleId,
        playerSlot,
        value: nextVehicleId,
        persistencePath: resolveVehiclePersistencePath(playerSlot),
    };
}

export function createHangarSelectionWritebackSnapshot(settings) {
    ensureHangarSelectionWritebackState(settings);
    return Object.freeze({
        contractVersion: HANGAR_SELECTION_WRITEBACK_VERSION,
        mapKey: normalizeString(settings?.mapKey, 'standard') || 'standard',
        vehicles: Object.freeze({
            PLAYER_1: normalizeString(settings?.vehicles?.PLAYER_1, 'ship5').toLowerCase() || 'ship5',
            PLAYER_2: normalizeString(settings?.vehicles?.PLAYER_2, 'ship5').toLowerCase() || 'ship5',
        }),
        persistencePathMap: HANGAR_SELECTION_WRITEBACK_PATHS,
    });
}
