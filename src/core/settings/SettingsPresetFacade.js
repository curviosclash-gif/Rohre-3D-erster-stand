import {
    applyPresetToSettings,
    capturePresetValuesFromSettings,
    createPresetMetadata,
    ensureMenuContractState,
    resolveMenuAccessContext,
} from '../../composition/core-ui/CoreSettingsPorts.js';
import { normalizePresetId } from './SettingsDomainUtils.js';

export function createSettingsPresetFacade(options = {}) {
    const menuPresetStore = options.menuPresetStore;
    const applyMenuCompatibilityRules = typeof options.applyMenuCompatibilityRules === 'function'
        ? options.applyMenuCompatibilityRules
        : () => ({ changedKeys: [] });

    function listMenuPresets() {
        return menuPresetStore.listPresets();
    }

    function applyMenuPreset(settings, presetId, accessContext = null) {
        const normalizedPresetId = String(presetId || '').trim();
        if (!normalizedPresetId) {
            return { success: false, reason: 'invalid_preset_id' };
        }
        const preset = menuPresetStore.getPresetById(normalizedPresetId);
        if (!preset) {
            return { success: false, reason: 'preset_not_found' };
        }

        ensureMenuContractState(settings);
        const resolvedContext = accessContext && typeof accessContext === 'object'
            ? accessContext
            : resolveMenuAccessContext(settings);
        const result = applyPresetToSettings({
            settings,
            preset,
            accessContext: resolvedContext,
            allowOpenPresetEditing: settings?.menuFeatureFlags?.allowOpenPresetEditing !== false,
        });
        const compatibilityResult = applyMenuCompatibilityRules(settings, {
            accessContext: resolvedContext,
            changedKeys: Array.isArray(result.changedKeys) ? result.changedKeys : [],
        });
        ensureMenuContractState(settings);
        const changedKeys = Array.from(new Set([
            ...(Array.isArray(result.changedKeys) ? result.changedKeys : []),
            ...(Array.isArray(compatibilityResult.changedKeys) ? compatibilityResult.changedKeys : []),
        ]));

        return {
            success: result.reason !== 'invalid_payload',
            preset,
            ...result,
            changedKeys,
            compatibilityResult,
        };
    }

    function saveMenuPreset(settings, optionsPayload = {}, accessContext = null) {
        ensureMenuContractState(settings);
        const resolvedContext = accessContext && typeof accessContext === 'object'
            ? accessContext
            : resolveMenuAccessContext(settings);
        const kind = optionsPayload.kind === 'fixed' ? 'fixed' : 'open';
        if (kind === 'fixed' && !resolvedContext.isOwner) {
            return { success: false, reason: 'owner_required' };
        }

        const requestedName = String(optionsPayload.name || '').trim();
        const requestedId = String(optionsPayload.id || '').trim();
        const derivedId = normalizePresetId(requestedId || requestedName || `preset-${Date.now()}`);
        if (!derivedId) {
            return { success: false, reason: 'invalid_preset_id' };
        }

        const metadata = createPresetMetadata({
            id: derivedId,
            kind,
            ownerId: resolvedContext.ownerId || 'owner',
            lockedFields: Array.isArray(optionsPayload.lockedFields) ? optionsPayload.lockedFields : [],
            sourcePresetId: optionsPayload.sourcePresetId || settings?.matchSettings?.activePresetId || '',
            createdAt: optionsPayload.createdAt,
            updatedAt: optionsPayload.updatedAt,
            timestamp: optionsPayload.timestamp,
        });
        const preset = {
            id: metadata.id,
            name: requestedName || metadata.id,
            description: String(optionsPayload.description || '').trim(),
            metadata,
            values: capturePresetValuesFromSettings(settings),
        };
        return menuPresetStore.upsertPreset(preset, resolvedContext);
    }

    function deleteMenuPreset(presetId, settings, accessContext = null) {
        ensureMenuContractState(settings);
        const resolvedContext = accessContext && typeof accessContext === 'object'
            ? accessContext
            : resolveMenuAccessContext(settings);
        return menuPresetStore.deletePreset(presetId, resolvedContext);
    }

    return {
        listMenuPresets,
        applyMenuPreset,
        saveMenuPreset,
        deleteMenuPreset,
    };
}
