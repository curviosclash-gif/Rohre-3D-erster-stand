import { createSettingsHealthSnapshot } from './SettingsHealthSnapshot.js';
import { diffSettingsSnapshots } from './SettingsDiffOps.js';
import { previewMenuConfigImport } from './SettingsImportPreviewOps.js';

export function attachSettingsDiagnosticsFacade(manager) {
    manager.diffSettings = (before, after) => diffSettingsSnapshots(before, after);
    manager.previewMenuConfigImport = (settings, inputValue, accessContext = null) => previewMenuConfigImport({
        settings,
        inputValue,
        accessContext,
        sanitizeSettings: (snapshot) => manager.sanitizeSettings(snapshot),
        applyMenuCompatibilityRules: (snapshot, options = {}) => manager.applyMenuCompatibilityRules(snapshot, options),
        diffSettings: (before, after) => manager.diffSettings(before, after),
    });
    manager.getSettingsHealthSnapshot = (settings = null) => createSettingsHealthSnapshot({
        settings: settings && typeof settings === 'object' ? settings : manager.loadSettings(),
        recordStorePort: manager.settingsRecordStorePort,
        profileStorePort: manager.profileStorePort,
        menuTextOverridePort: manager.menuTextOverridePort,
        listMenuPresets: () => manager.listMenuPresets(),
        telemetryFacade: manager.telemetryFacade,
    });
}
