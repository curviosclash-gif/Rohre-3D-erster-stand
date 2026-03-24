import { MENU_TEXT_CATALOG } from '../../composition/core-ui/CoreSettingsPorts.js';

export function createSettingsTextOverrideFacade(options = {}) {
    const menuTextOverrideStore = options.menuTextOverrideStore;

    function listMenuTextOverrides() {
        return menuTextOverrideStore.listOverrides();
    }

    function setMenuTextOverride(textId, textValue) {
        const normalizedTextId = String(textId || '').trim();
        if (!normalizedTextId || !Object.prototype.hasOwnProperty.call(MENU_TEXT_CATALOG, normalizedTextId)) {
            return { success: false, reason: 'unknown_text_id' };
        }
        return menuTextOverrideStore.setOverride(textId, textValue);
    }

    function clearMenuTextOverride(textId) {
        const normalizedTextId = String(textId || '').trim();
        if (!normalizedTextId || !Object.prototype.hasOwnProperty.call(MENU_TEXT_CATALOG, normalizedTextId)) {
            return { success: false, reason: 'unknown_text_id' };
        }
        return menuTextOverrideStore.clearOverride(textId);
    }

    return {
        listMenuTextOverrides,
        setMenuTextOverride,
        clearMenuTextOverride,
    };
}
