import { GAME_MODE_TYPES } from '../../hunt/HuntMode.js';
import {
    clearActiveRuntimeConfig,
    setActiveRuntimeConfig,
} from './ActiveRuntimeConfigStore.js';

const BUNDLE_TARGET_COMPONENTS = 'components';
const BUNDLE_TARGET_STATE = 'state';

const LEGACY_ALIAS_MIGRATION = Object.freeze({
    KEEP: 'keep',
    REPLACE_BY_PORT: 'replace-by-port',
    REMOVE_AFTER_MIGRATION: 'remove-after-migration',
});

export const GAME_RUNTIME_LEGACY_ALIAS_SPECS = Object.freeze([
    { key: 'renderer', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'mediaRecorderSystem', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'input', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'audio', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: 'ui', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: 'runtimePorts', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: 'hudP1', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'hudP2', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'huntHud', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'screenShake', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'hudRuntimeSystem', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'crosshairSystem', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'matchFlowUiController', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: 'runtimeDiagnosticsSystem', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'keybindEditorController', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'planarAimAssistSystem', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'matchSessionRuntimeBridge', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'gameLoop', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'buildInfoController', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: 'menuExpertLoginRuntime', target: BUNDLE_TARGET_COMPONENTS, migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: 'config', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'runtimeConfig', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'activeGameMode', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'roundStateController', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'mapKey', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'numHumans', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'numBots', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'winsNeeded', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'arena', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'entityManager', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'powerupManager', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'particles', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: 'menuController', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: 'menuMultiplayerBridge', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: '_navButtons', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: '_menuButtonByPanel', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: '_activeSubmenu', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: '_lastMenuTrigger', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: '_buildInfoClipboardText', target: BUNDLE_TARGET_STATE, migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
]);

export const GAME_RUNTIME_LEGACY_WRAPPER_SPECS = Object.freeze([
    { key: '_showMainNav', target: 'uiManager.showMainNav', migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: '_saveSettings', target: 'settingsManager.saveSettings', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_applySettingsToRuntime', target: 'runtimeFacade.applySettingsToRuntime', migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: '_setupMenuListeners', target: 'runtimeFacade.setupMenuListeners', migration: LEGACY_ALIAS_MIGRATION.REMOVE_AFTER_MIGRATION },
    { key: '_handleMenuControllerEvent', target: 'runtimeFacade.handleMenuControllerEvent', migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: '_onSettingsChanged', target: 'runtimeFacade.onSettingsChanged', migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: '_markSettingsDirty', target: 'runtimeFacade.markSettingsDirty', migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: '_updateSaveButtonState', target: 'runtimeFacade.updateSaveButtonState', migration: LEGACY_ALIAS_MIGRATION.REPLACE_BY_PORT },
    { key: '_syncProfileControls', target: 'profileUiController.syncProfileControls', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_syncProfileActionState', target: 'profileUiController.syncProfileActionState', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_setProfileTransferStatus', target: 'profileUiController.setProfileTransferStatus', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_saveProfile', target: 'profileUiController.saveProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_duplicateProfile', target: 'profileUiController.duplicateProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_loadProfile', target: 'profileUiController.loadProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_exportProfile', target: 'profileUiController.exportProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_importProfile', target: 'profileUiController.importProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_setDefaultProfile', target: 'profileUiController.setDefaultProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_deleteProfile', target: 'profileUiController.deleteProfile', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_showStatusToast', target: 'uiManager.showToast', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: 'startMatch', target: 'runtimeFacade.startMatch', migration: LEGACY_ALIAS_MIGRATION.KEEP },
    { key: '_returnToMenu', target: 'runtimeFacade.returnToMenu', migration: LEGACY_ALIAS_MIGRATION.KEEP },
]);

function createDefaultRuntimeState() {
    return {
        config: null,
        runtimeConfig: null,
        activeGameMode: GAME_MODE_TYPES.CLASSIC,
        roundStateController: null,
        mapKey: null,
        numHumans: 1,
        numBots: 0,
        winsNeeded: 1,
        arena: null,
        entityManager: null,
        powerupManager: null,
        particles: null,
        menuController: null,
        menuMultiplayerBridge: null,
        _navButtons: [],
        _menuButtonByPanel: new Map(),
        _activeSubmenu: null,
        _lastMenuTrigger: null,
        _buildInfoClipboardText: '',
    };
}

function resolveAliasContainer(bundle, target) {
    if (target === BUNDLE_TARGET_COMPONENTS) {
        if (!bundle.components || typeof bundle.components !== 'object') {
            bundle.components = {};
        }
        return bundle.components;
    }
    if (!bundle.state || typeof bundle.state !== 'object') {
        bundle.state = {};
    }
    return bundle.state;
}

function adoptExistingAliasValue(game, bundle, spec) {
    const descriptor = Object.getOwnPropertyDescriptor(game, spec.key);
    if (!descriptor) return;
    if ('get' in descriptor || 'set' in descriptor) return;

    const container = resolveAliasContainer(bundle, spec.target);
    if (descriptor.value !== undefined && container[spec.key] === undefined) {
        container[spec.key] = descriptor.value;
    }
}

function defineAliasAccessor(game, bundle, spec) {
    const descriptor = Object.getOwnPropertyDescriptor(game, spec.key);
    if (descriptor?.configurable === false) {
        return;
    }

    delete game[spec.key];
    Object.defineProperty(game, spec.key, {
        configurable: true,
        enumerable: true,
        get() {
            return resolveAliasContainer(bundle, spec.target)[spec.key];
        },
        set(value) {
            resolveAliasContainer(bundle, spec.target)[spec.key] = value;
        },
    });
}

function cloneLegacyAliasInventory() {
    return GAME_RUNTIME_LEGACY_ALIAS_SPECS.map((spec) => Object.freeze({ ...spec }));
}

function cloneLegacyWrapperInventory() {
    return GAME_RUNTIME_LEGACY_WRAPPER_SPECS.map((spec) => Object.freeze({ ...spec }));
}

export function createInitialGameRuntimeState(initialState = {}) {
    return {
        ...createDefaultRuntimeState(),
        ...initialState,
    };
}

export function createGameRuntimeBundle({ state = {}, components = {}, ports = null } = {}) {
    return {
        state: createInitialGameRuntimeState(state),
        components: { ...components, runtimePorts: ports || components.runtimePorts || null },
        ports: ports || null,
        metadata: Object.freeze({
            legacyAliases: Object.freeze(cloneLegacyAliasInventory()),
            legacyWrappers: Object.freeze(cloneLegacyWrapperInventory()),
            runtimeConfigAdapter: Object.freeze({
                kind: 'ActiveRuntimeConfigStore',
                migration: 'transition-adapter',
                ownerScope: 'runtimeBundle',
                clearsOnDispose: true,
            }),
        }),
    };
}

export function attachGameRuntimeBundle(game, bundle) {
    if (!game || !bundle) return bundle;

    Object.defineProperty(game, 'runtimeBundle', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: bundle,
    });

    for (const spec of GAME_RUNTIME_LEGACY_ALIAS_SPECS) {
        adoptExistingAliasValue(game, bundle, spec);
        defineAliasAccessor(game, bundle, spec);
    }

    return bundle;
}

export function getGameRuntimeState(bundle) {
    return bundle?.state || null;
}

export function applyRuntimeSettingsState(bundle, {
    runtimeConfig = undefined,
    config = undefined,
    session = undefined,
} = {}) {
    const state = getGameRuntimeState(bundle);
    if (!state) return null;

    if (runtimeConfig !== undefined) {
        state.runtimeConfig = runtimeConfig;
    }

    if (config !== undefined) {
        state.config = config;
        if (config && typeof config === 'object') {
            setActiveRuntimeConfig(config, { owner: bundle });
        } else {
            clearActiveRuntimeConfig({ owner: bundle });
        }
    }

    if (session && typeof session === 'object') {
        if (Object.prototype.hasOwnProperty.call(session, 'numHumans')) state.numHumans = session.numHumans;
        if (Object.prototype.hasOwnProperty.call(session, 'numBots')) state.numBots = session.numBots;
        if (Object.prototype.hasOwnProperty.call(session, 'mapKey')) state.mapKey = session.mapKey;
        if (Object.prototype.hasOwnProperty.call(session, 'winsNeeded')) state.winsNeeded = session.winsNeeded;
        if (Object.prototype.hasOwnProperty.call(session, 'activeGameMode')) state.activeGameMode = session.activeGameMode;
    }

    return state;
}

export function applyMatchSessionState(bundle, matchSession) {
    const state = getGameRuntimeState(bundle);
    if (!state || !matchSession) return null;

    state.particles = matchSession.particles || null;
    state.arena = matchSession.arena || null;
    state.powerupManager = matchSession.powerupManager || null;
    state.entityManager = matchSession.entityManager || null;
    if (Object.prototype.hasOwnProperty.call(matchSession, 'effectiveMapKey')) {
        state.mapKey = matchSession.effectiveMapKey;
    }
    if (Object.prototype.hasOwnProperty.call(matchSession, 'numHumans')) {
        state.numHumans = matchSession.numHumans;
    }
    if (Object.prototype.hasOwnProperty.call(matchSession, 'numBots')) {
        state.numBots = matchSession.numBots;
    }
    if (Object.prototype.hasOwnProperty.call(matchSession, 'winsNeeded')) {
        state.winsNeeded = matchSession.winsNeeded;
    }

    return state;
}

export function getCurrentMatchSessionRefs(bundle) {
    const state = getGameRuntimeState(bundle);
    return {
        arena: state?.arena || null,
        entityManager: state?.entityManager || null,
        powerupManager: state?.powerupManager || null,
        particles: state?.particles || null,
    };
}

export function clearMatchSessionState(bundle) {
    const state = getGameRuntimeState(bundle);
    if (!state) return null;

    state.particles = null;
    state.arena = null;
    state.entityManager = null;
    state.powerupManager = null;
    return state;
}

export function clearGameRuntimeState(bundle, initialOverrides = undefined) {
    const state = getGameRuntimeState(bundle);
    if (!state) return null;

    Object.assign(state, createInitialGameRuntimeState(initialOverrides));
    clearActiveRuntimeConfig({ owner: bundle });
    return state;
}
