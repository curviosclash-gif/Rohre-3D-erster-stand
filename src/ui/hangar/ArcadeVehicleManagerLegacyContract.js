export const ARCADE_VEHICLE_MANAGER_LEGACY_CONTRACT_VERSION = 'arcade-vehicle-manager-legacy.v1';

export const ARCADE_VEHICLE_MANAGER_LEGACY_STATUS = Object.freeze({
    status: 'legacy-embedded',
    scope: 'src/ui/arcade/ArcadeVehicleManager.js',
    replacementPath: 'hangar-workshop.vehicle-lab',
    replacementContracts: Object.freeze([
        'HangarWorkshopModuleContract',
        'HangarWorkshopPersistenceFacade',
        'HangarLifecycleContract',
    ]),
    note: 'Embedded Arcade vehicle manager remains a compatibility path until full workshop migration is complete.',
});

export function resolveArcadeVehicleManagerLegacyStatus() {
    return {
        contractVersion: ARCADE_VEHICLE_MANAGER_LEGACY_CONTRACT_VERSION,
        ...ARCADE_VEHICLE_MANAGER_LEGACY_STATUS,
    };
}

