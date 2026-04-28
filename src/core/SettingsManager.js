// ============================================
// SettingsManager.js - business logic for settings
// ============================================

import { CONFIG } from './Config.js';
import {
    applyMenuCompatibilityRuleSet,
    ensureMenuContractState,
    getFixedMenuPresetCatalog,
    MenuDraftStore,
    MenuPresetStore,
    MenuTelemetryStore,
    MenuTextOverrideStore,
    SettingsStore,
} from '../composition/core-ui/CoreSettingsPorts.js';
import { createRuntimeConfigSnapshot } from './RuntimeConfig.js';
import { TelemetryHistoryStore } from '../state/TelemetryHistoryStore.js';
import {
    cloneDefaultControlsSnapshot,
    createDefaultSettingsSnapshotForRuntime,
    rebaseSettingsSnapshotWithRuntimeDefaults,
} from './settings/SettingsDefaultsFacade.js';
import { sanitizeSettingsSnapshot } from './settings/SettingsSanitizerOps.js';
import { createSettingsSessionDraftFacade } from './settings/SettingsSessionDraftFacade.js';
import { createSettingsPresetFacade } from './settings/SettingsPresetFacade.js';
import { createSettingsDeveloperFacade } from './settings/SettingsDeveloperFacade.js';
import { createSettingsTextOverrideFacade } from './settings/SettingsTextOverrideFacade.js';
import { createSettingsTelemetryFacade } from './settings/SettingsTelemetryFacade.js';

export class SettingsManager {
    constructor(options = {}) {
        this.runtimeGlobal = options.runtimeGlobal || globalThis;
        this.settingsStore = new SettingsStore({
            storagePlatform: options.storagePlatform,
            storage: options.storage,
            onQuotaExceeded: options.onQuotaExceeded,
            sanitizeSettings: (settings) => this.sanitizeSettings(settings),
            createDefaultSettings: () => this.createDefaultSettings(),
        });
        // Temporary legacy alias until remaining external consumers migrate to named ports.
        this.store = this.settingsStore;
        this.menuPresetStore = new MenuPresetStore({
            fixedCatalog: getFixedMenuPresetCatalog(),
        });
        this.menuDraftStore = new MenuDraftStore();
        this.menuTextOverrideStore = new MenuTextOverrideStore();
        this.menuTelemetryStore = new MenuTelemetryStore();
        this.telemetryHistoryStore = new TelemetryHistoryStore();

        this.sessionDraftFacade = createSettingsSessionDraftFacade({
            menuDraftStore: this.menuDraftStore,
        });
        this.presetFacade = createSettingsPresetFacade({
            menuPresetStore: this.menuPresetStore,
            applyMenuCompatibilityRules: (settings, options = {}) => this.applyMenuCompatibilityRules(settings, options),
        });
        this.developerFacade = createSettingsDeveloperFacade();
        this.textOverrideFacade = createSettingsTextOverrideFacade({
            menuTextOverrideStore: this.menuTextOverrideStore,
        });
        this.telemetryFacade = createSettingsTelemetryFacade({
            menuTelemetryStore: this.menuTelemetryStore,
            telemetryHistoryStore: this.telemetryHistoryStore,
        });

        this.profileStorePort = {
            loadProfiles: () => this.settingsStore.loadProfiles(),
            saveProfiles: (profiles) => this.settingsStore.saveProfiles(profiles),
            sanitizeSettings: (settings) => this.sanitizeSettings(settings),
            normalizeProfileName: (rawName) => this.settingsStore.normalizeProfileName(rawName),
            findProfileIndexByName: (profiles, profileName) => this.settingsStore.findProfileIndexByName(profiles, profileName),
            findProfileByName: (profiles, profileName) => this.settingsStore.findProfileByName(profiles, profileName),
        };
        this.settingsRecordStorePort = Object.freeze({
            loadJsonRecord: (storageKey, fallbackValue = null) => this.settingsStore.loadJsonRecord(storageKey, fallbackValue),
            saveJsonRecord: (storageKey, value) => this.settingsStore.saveJsonRecord(storageKey, value),
        });
    }

    createDefaultSettings() {
        return createDefaultSettingsSnapshotForRuntime(this.runtimeGlobal);
    }

    cloneDefaultControls() {
        return cloneDefaultControlsSnapshot();
    }

    sanitizeSettings(saved) {
        const sanitizedSettings = sanitizeSettingsSnapshot(saved, () => this.createDefaultSettings());
        return rebaseSettingsSnapshotWithRuntimeDefaults(sanitizedSettings, this.runtimeGlobal);
    }

    loadSettings() {
        return this.settingsStore.loadSettings();
    }

    saveSettings(settings) {
        return this.settingsStore.saveSettings(settings);
    }

    listMenuPresets() {
        return this.presetFacade.listMenuPresets();
    }

    saveSessionDraft(settings, sessionType) {
        return this.sessionDraftFacade.saveSessionDraft(settings, sessionType);
    }

    applySessionDraft(settings, sessionType) {
        return this.sessionDraftFacade.applySessionDraft(settings, sessionType);
    }

    switchSessionType(settings, nextSessionType) {
        return this.sessionDraftFacade.switchSessionType(settings, nextSessionType);
    }

    applyMenuCompatibilityRules(settings, options = {}) {
        ensureMenuContractState(settings);
        return applyMenuCompatibilityRuleSet(settings, options);
    }

    applyMenuPreset(settings, presetId, accessContext = null) {
        return this.presetFacade.applyMenuPreset(settings, presetId, accessContext);
    }

    saveMenuPreset(settings, options = {}, accessContext = null) {
        return this.presetFacade.saveMenuPreset(settings, options, accessContext);
    }

    deleteMenuPreset(presetId, settings, accessContext = null) {
        return this.presetFacade.deleteMenuPreset(presetId, settings, accessContext);
    }

    setDeveloperMode(settings, enabled, accessContext = null) {
        return this.developerFacade.setDeveloperMode(settings, enabled, accessContext);
    }

    setDeveloperTheme(settings, themeId, accessContext = null) {
        return this.developerFacade.setDeveloperThemeById(settings, themeId, accessContext);
    }

    setDeveloperFixedPresetLock(settings, enabled, accessContext = null) {
        return this.developerFacade.setDeveloperFixedPresetLockState(settings, enabled, accessContext);
    }

    setDeveloperActor(settings, actorId, accessContext = null) {
        return this.developerFacade.setDeveloperActor(settings, actorId, accessContext);
    }

    setDeveloperReleasePreview(settings, enabled, accessContext = null) {
        return this.developerFacade.setDeveloperReleasePreview(settings, enabled, accessContext);
    }

    setDeveloperVisibility(settings, mode, accessContext = null) {
        return this.developerFacade.setDeveloperVisibility(settings, mode, accessContext);
    }

    listMenuTextOverrides() {
        return this.textOverrideFacade.listMenuTextOverrides();
    }

    setMenuTextOverride(textId, textValue) {
        return this.textOverrideFacade.setMenuTextOverride(textId, textValue);
    }

    clearMenuTextOverride(textId) {
        return this.textOverrideFacade.clearMenuTextOverride(textId);
    }

    getMenuTelemetrySnapshot(settings = null) {
        return this.telemetryFacade.getMenuTelemetrySnapshot(settings);
    }

    recordMenuTelemetry(settings, eventType, payload = null) {
        return this.telemetryFacade.recordMenuTelemetry(settings, eventType, payload);
    }

    getTelemetryHistorySummary() {
        return this.telemetryFacade.getTelemetryHistorySummary();
    }

    createRuntimeConfig(settings) {
        return createRuntimeConfigSnapshot(settings, { baseConfig: CONFIG });
    }

    getProfileStorePort() {
        return this.profileStorePort;
    }

    getSettingsRecordStorePort() {
        return this.settingsRecordStorePort;
    }
}
