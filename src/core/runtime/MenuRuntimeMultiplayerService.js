// ============================================
// MenuRuntimeMultiplayerService.js - multiplayer stub orchestration helpers
// ============================================

export function didHostChangeMatchSettings(changedKeys, matchSettingChangeKeySet) {
    if (!Array.isArray(changedKeys) || changedKeys.length === 0) return false;
    return changedKeys.some((key) => matchSettingChangeKeySet?.has(key));
}

export function invalidateMultiplayerReadyIfHostChangedSettings({
    changedKeys,
    matchSettingChangeKeySet,
    resolveMenuAccessContext,
    menuMultiplayerBridge,
    game,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    if (!didHostChangeMatchSettings(changedKeys, matchSettingChangeKeySet)) return;
    const accessContext = resolveMenuAccessContext?.();
    if (!accessContext?.isOwner) return;

    const invalidatedEvent = menuMultiplayerBridge?.invalidateReadyForAll('host_settings_changed');
    if (!invalidatedEvent) return;

    if (game?.ui?.multiplayerReadyToggle) {
        game.ui.multiplayerReadyToggle.checked = false;
    }
    onSettingsChanged?.({
        changedKeys: [settingsChangeKeys.MULTIPLAYER_STATUS],
    });
}

export function handleMultiplayerHostAction({
    game,
    event,
    resolveMenuAccessContext,
    menuMultiplayerBridge,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    if (!game) return;
    const accessContext = resolveMenuAccessContext?.();
    menuMultiplayerBridge?.host({
        actorId: accessContext?.actorId,
        lobbyCode: String(event?.lobbyCode || '').trim(),
    });
    onSettingsChanged?.({
        changedKeys: [settingsChangeKeys.MULTIPLAYER_STATUS],
    });
    game._showStatusToast('Multiplayer-Host gestartet (Stub).', 1500, 'info');
}

export function handleMultiplayerJoinAction({
    game,
    event,
    resolveMenuAccessContext,
    menuMultiplayerBridge,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    if (!game) return;
    const accessContext = resolveMenuAccessContext?.();
    menuMultiplayerBridge?.join({
        actorId: accessContext?.actorId,
        lobbyCode: String(event?.lobbyCode || '').trim(),
    });
    onSettingsChanged?.({
        changedKeys: [settingsChangeKeys.MULTIPLAYER_STATUS],
    });
    game._showStatusToast('Multiplayer-Join angefragt (Stub).', 1500, 'info');
}

export function handleMultiplayerReadyToggleAction({
    event,
    resolveMenuAccessContext,
    menuMultiplayerBridge,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    menuMultiplayerBridge?.toggleReady({
        actorId: resolveMenuAccessContext?.()?.actorId,
        ready: !!event?.ready,
    });
    onSettingsChanged?.({
        changedKeys: [settingsChangeKeys.MULTIPLAYER_STATUS],
    });
}
