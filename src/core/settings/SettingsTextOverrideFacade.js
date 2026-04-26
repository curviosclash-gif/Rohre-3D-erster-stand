import {
    MENU_TEXT_CATALOG,
    SETTINGS_CHANGE_KEYS,
} from '../../composition/core-ui/CoreSettingsPorts.js';

function withMutationChangedKeys(result, textId) {
    return {
        ...result,
        changedKeys: result?.success ? [SETTINGS_CHANGE_KEYS.DEVELOPER_TEXT_OVERRIDES] : [],
        metadata: result?.success
            ? { textId: String(textId || '').trim() }
            : null,
    };
}

export function createSettingsTextOverrideFacade(options = {}) {
    const menuTextOverrideStore = options.menuTextOverrideStore;

    function listMenuTextOverrides() {
        return menuTextOverrideStore.listOverrides();
    }

    function setMenuTextOverride(textId, textValue) {
        const normalizedTextId = String(textId || '').trim();
        if (!normalizedTextId || !Object.prototype.hasOwnProperty.call(MENU_TEXT_CATALOG, normalizedTextId)) {
            return { success: false, reason: 'unknown_text_id', changedKeys: [], metadata: null };
        }
        return withMutationChangedKeys(menuTextOverrideStore.setOverride(textId, textValue), normalizedTextId);
    }

    function clearMenuTextOverride(textId) {
        const normalizedTextId = String(textId || '').trim();
        if (!normalizedTextId || !Object.prototype.hasOwnProperty.call(MENU_TEXT_CATALOG, normalizedTextId)) {
            return { success: false, reason: 'unknown_text_id', changedKeys: [], metadata: null };
        }
        return withMutationChangedKeys(menuTextOverrideStore.clearOverride(textId), normalizedTextId);
    }

    return {
        listMenuTextOverrides,
        setMenuTextOverride,
        clearMenuTextOverride,
    };
}
