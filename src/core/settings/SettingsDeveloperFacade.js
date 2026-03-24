import {
    applyDeveloperThemeToDocument,
    setDeveloperActorId,
    setDeveloperFixedPresetLock,
    setDeveloperModeEnabled,
    setDeveloperReleasePreviewEnabled,
    setDeveloperTheme,
    setDeveloperVisibilityMode,
} from '../../composition/core-ui/CoreSettingsPorts.js';

export function createSettingsDeveloperFacade() {
    function setDeveloperMode(settings, enabled, accessContext = null) {
        return setDeveloperModeEnabled(settings, enabled, accessContext);
    }

    function setDeveloperThemeById(settings, themeId, accessContext = null) {
        const result = setDeveloperTheme(settings, themeId, accessContext);
        if (!result.success) return result;
        applyDeveloperThemeToDocument(settings?.localSettings?.developerThemeId);
        return result;
    }

    function setDeveloperFixedPresetLockState(settings, enabled, accessContext = null) {
        return setDeveloperFixedPresetLock(settings, enabled, accessContext);
    }

    function setDeveloperActor(settings, actorId, accessContext = null) {
        return setDeveloperActorId(settings, actorId, accessContext);
    }

    function setDeveloperReleasePreview(settings, enabled, accessContext = null) {
        return setDeveloperReleasePreviewEnabled(settings, enabled, accessContext);
    }

    function setDeveloperVisibility(settings, mode, accessContext = null) {
        return setDeveloperVisibilityMode(settings, mode, accessContext);
    }

    return {
        setDeveloperMode,
        setDeveloperThemeById,
        setDeveloperFixedPresetLockState,
        setDeveloperActor,
        setDeveloperReleasePreview,
        setDeveloperVisibility,
    };
}
