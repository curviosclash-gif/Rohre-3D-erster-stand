// ============================================
// RuntimeSettingsChangeOrchestrator.js - centralized menu settings-change flow
// ============================================

export function orchestrateRuntimeSettingsChanged({
    game,
    event = null,
    resolveMenuAccessContext,
    startValidationRelevantKeySet,
    invalidateMultiplayerReadyIfHostChangedSettings,
    markSettingsDirty,
    updateSaveButtonState,
    scheduleMatchPrewarm,
}) {
    if (!game) return null;
    const incomingChangedKeys = Array.isArray(event?.changedKeys) ? event.changedKeys : [];
    if (incomingChangedKeys.some((key) => startValidationRelevantKeySet?.has(key))) {
        game.uiManager?.clearStartValidationError?.();
    }
    const compatibilityResult = game.settingsManager?.applyMenuCompatibilityRules?.(
        game.settings,
        { accessContext: resolveMenuAccessContext?.() }
    );
    const compatibilityKeys = Array.isArray(compatibilityResult?.changedKeys)
        ? compatibilityResult.changedKeys
        : [];
    const mergedChangedKeys = Array.from(new Set([
        ...incomingChangedKeys,
        ...compatibilityKeys,
    ]));
    const changedKeys = mergedChangedKeys.length > 0 ? mergedChangedKeys : null;

    markSettingsDirty?.(true);
    game.renderer?.setShadowQuality?.(game.settings?.localSettings?.shadowQuality);
    game.renderer?.setRecordingCaptureSettings?.(game.settings?.recording);
    game.renderer?.setCameraPerspectiveSettings?.(game.settings?.cameraPerspective);
    game.mediaRecorderSystem?.setRecordingCaptureSettings?.(game.settings?.recording);
    if (game.uiManager) {
        if (Array.isArray(changedKeys) && changedKeys.length > 0 && typeof game.uiManager.syncByChangeKeys === 'function') {
            game.uiManager.syncByChangeKeys(changedKeys);
        } else {
            game.uiManager.syncAll();
        }
        game.uiManager.updateContext();
    }
    if (Array.isArray(changedKeys) && changedKeys.length > 0) {
        invalidateMultiplayerReadyIfHostChangedSettings?.(changedKeys);
    }
    game.keybindEditorController?.renderEditor?.();
    game._syncProfileControls?.();
    updateSaveButtonState?.();
    scheduleMatchPrewarm?.();
    return changedKeys;
}

export function updateSaveButtonUi(game) {
    if (!game?.ui?.saveKeysButton) return;
    game.ui.saveKeysButton.classList.toggle('unsaved', game.settingsDirty);
    game.ui.saveKeysButton.textContent = game.settingsDirty
        ? 'Einstellungen explizit speichern *'
        : 'Einstellungen explizit speichern';
    game.uiManager?.updateContext?.();
}
