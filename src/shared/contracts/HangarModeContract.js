/**
 * HangarModeContract — V76 76.1
 *
 * Desktop Hangar architecture contract. Defines:
 *  - ARCADE vs FIGHT mode separation (76.1.2)
 *  - Preload capability IDs exposed to renderer (76.1.1)
 *  - Desktop navigation event types — no window.open() (76.1.3)
 *  - Integration policy: all hangar/workshop access via named IPC capabilities
 *
 * Leitplanke: electron/main.cjs owns window/navigation/persistence lifecycle.
 * electron/preload.cjs is the sole bridge via small named capability contracts.
 * Hangar renderer and workshop must not import electron directly, call
 * window.open(), or bypass defined capability ports.
 */

export const HANGAR_MODE_CONTRACT_VERSION = 'hangar-mode.v1';

// ─── Hangar Modes ───
// Arcade and Fight are strictly separate flows: different rule contracts,
// different data spaces, different start paths. Shared UI shell only.

export const HANGAR_MODES = Object.freeze({
    ARCADE: 'arcade',
    FIGHT: 'fight',
});

// ─── Desktop Capability IDs (Preload Bridge) ───
// Named capability IDs for electron/preload.cjs to expose to renderer.
// Renderer code uses only these names — never electron IPC channel strings.

export const HANGAR_CAPABILITY_IDS = Object.freeze({
    OPEN_HANGAR: 'hangar:open',
    CLOSE_HANGAR: 'hangar:close',
    NAVIGATE_TO_WORKSHOP: 'hangar:navigate-to-workshop',
    NAVIGATE_FROM_WORKSHOP: 'hangar:navigate-from-workshop',
    LOAD_VEHICLE_SELECTION: 'hangar:load-vehicle-selection',
    SAVE_VEHICLE_SELECTION: 'hangar:save-vehicle-selection',
    LOAD_CUSTOM_BLUEPRINT: 'hangar:load-custom-blueprint',
    SAVE_CUSTOM_BLUEPRINT: 'hangar:save-custom-blueprint',
    DELETE_CUSTOM_BLUEPRINT: 'hangar:delete-custom-blueprint',
    RENAME_CUSTOM_BLUEPRINT: 'hangar:rename-custom-blueprint',
    HANGAR_READY: 'hangar:ready',
    MATCH_START_FROM_HANGAR: 'hangar:match-start',
    RETURN_TO_MENU: 'hangar:return-to-menu',
});

// ─── Navigation Events ───
// Renderer emits these via preload capability; main.cjs handles BrowserWindow
// state in response. No direct window.open() or global navigation in renderer.

export const HANGAR_NAV_EVENTS = Object.freeze({
    OPEN_ARCADE_HANGAR: 'hangar_nav:open_arcade',
    OPEN_FIGHT_HANGAR: 'hangar_nav:open_fight',
    OPEN_WORKSHOP: 'hangar_nav:open_workshop',
    CLOSE_WORKSHOP: 'hangar_nav:close_workshop',
    START_MATCH: 'hangar_nav:start_match',
    RETURN_TO_MENU: 'hangar_nav:return_to_menu',
});

// ─── User Flow Descriptors (76.1.2) ───
// Arcade and Fight share UI components but not rule contracts, data spaces,
// or start paths. Each flow references its own rule contract by name.

export const HANGAR_USER_FLOW_DESCRIPTORS = Object.freeze({
    [HANGAR_MODES.ARCADE]: Object.freeze({
        mode: HANGAR_MODES.ARCADE,
        ruleContract: 'ArcadeHangarRulesContract',
        dataSpace: 'settings.vehicles.arcade',
        persistenceKey: 'cuviosclash.hangar.arcade.v1',
        startNavEvent: HANGAR_NAV_EVENTS.OPEN_ARCADE_HANGAR,
        workshopAllowed: true,
        progressionDriven: true,
        freeRulesAllowed: false,
    }),
    [HANGAR_MODES.FIGHT]: Object.freeze({
        mode: HANGAR_MODES.FIGHT,
        ruleContract: 'FightHangarBalanceContract',
        dataSpace: 'settings.vehicles.fight',
        persistenceKey: 'cuviosclash.hangar.fight.v1',
        startNavEvent: HANGAR_NAV_EVENTS.OPEN_FIGHT_HANGAR,
        workshopAllowed: true,
        progressionDriven: false,
        freeRulesAllowed: true,
    }),
});

// ─── Desktop Integration Policy (76.1.3) ───
// Enforces that hangar and workshop integration uses named desktop-navigation
// ports only. window.open() and direct Electron access are forbidden in renderer.

export const HANGAR_DESKTOP_INTEGRATION_POLICY = Object.freeze({
    noWindowOpen: true,
    noDirectElectronAccess: true,
    noGlobalBackdoors: true,
    navigationVia: 'ipc-capability',
    persistenceVia: 'named-capability',
    surfaceGuardRequired: true,
});

// ─── Guard Helpers ───

export function resolveHangarMode(rawMode) {
    const normalized = String(rawMode || '').trim().toLowerCase();
    if (Object.values(HANGAR_MODES).includes(normalized)) return normalized;
    return HANGAR_MODES.FIGHT;
}

export function resolveHangarUserFlow(mode) {
    const resolved = resolveHangarMode(mode);
    return HANGAR_USER_FLOW_DESCRIPTORS[resolved] || HANGAR_USER_FLOW_DESCRIPTORS[HANGAR_MODES.FIGHT];
}

export function assertHangarCapabilityId(rawId) {
    const id = String(rawId || '').trim();
    return new Set(Object.values(HANGAR_CAPABILITY_IDS)).has(id) ? id : null;
}

export function assertHangarNavEvent(rawEvent) {
    const ev = String(rawEvent || '').trim();
    return new Set(Object.values(HANGAR_NAV_EVENTS)).has(ev) ? ev : null;
}
