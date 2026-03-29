import {
    ensureMenuContractState,
    MENU_SESSION_TYPES,
    normalizeSessionType,
} from '../../composition/core-ui/CoreSettingsPorts.js';

export function createSettingsSessionDraftFacade(options = {}) {
    const menuDraftStore = options.menuDraftStore;
    const getNowIso = typeof options.getNowIso === 'function'
        ? options.getNowIso
        : () => new Date().toISOString();

    function saveSessionDraft(settings, sessionType) {
        ensureMenuContractState(settings);
        const normalizedSessionType = normalizeSessionType(
            sessionType,
            settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE
        );
        const result = menuDraftStore.saveDraft(normalizedSessionType, settings);
        if (result.success) {
            if (!settings.localSettings.draftStateBySessionType || typeof settings.localSettings.draftStateBySessionType !== 'object') {
                settings.localSettings.draftStateBySessionType = {};
            }
            settings.localSettings.draftStateBySessionType[normalizedSessionType] = {
                updatedAt: getNowIso(),
                mapKey: String(settings.mapKey || ''),
                vehicleP1: String(settings?.vehicles?.PLAYER_1 || ''),
                vehicleP2: String(settings?.vehicles?.PLAYER_2 || ''),
            };
        }
        return result;
    }

    function applySessionDraft(settings, sessionType) {
        ensureMenuContractState(settings);
        const normalizedSessionType = normalizeSessionType(
            sessionType,
            settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE
        );
        const draftResult = menuDraftStore.applyDraft(settings, normalizedSessionType);
        return {
            ...draftResult,
            sessionType: normalizedSessionType,
        };
    }

    function switchSessionType(settings, nextSessionType) {
        ensureMenuContractState(settings);
        const currentSessionType = normalizeSessionType(settings?.localSettings?.sessionType, MENU_SESSION_TYPES.SINGLE);
        const targetSessionType = normalizeSessionType(nextSessionType, currentSessionType);
        if (targetSessionType === currentSessionType) {
            return {
                success: true,
                changed: false,
                targetSessionType,
                loadedDraft: false,
            };
        }

        saveSessionDraft(settings, currentSessionType);
        const draftResult = applySessionDraft(settings, targetSessionType);
        settings.localSettings.sessionType = targetSessionType;
        settings.mode = targetSessionType === MENU_SESSION_TYPES.SPLITSCREEN ? '2p' : '1p';

        return {
            success: true,
            changed: true,
            targetSessionType,
            loadedDraft: draftResult.success,
            draftResult,
        };
    }

    return {
        saveSessionDraft,
        applySessionDraft,
        switchSessionType,
    };
}
