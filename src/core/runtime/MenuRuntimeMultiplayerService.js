// ============================================
// MenuRuntimeMultiplayerService.js - multiplayer lobby/runtime helpers
// ============================================

import { MenuMultiplayerBridge } from '../../composition/core-ui/CoreUiMenuPorts.js';
import { MATCH_LIFECYCLE_CONTRACT_VERSION } from '../../shared/contracts/MatchLifecycleContract.js';

function deepClone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return null;
    }
}

function ensureMultiplayerSessionType(game) {
    if (!game?.settings || typeof game.settings !== 'object') return;
    if (!game.settings.localSettings || typeof game.settings.localSettings !== 'object') {
        game.settings.localSettings = {};
    }
    game.settings.localSettings.sessionType = 'multiplayer';
}

export function createMenuMultiplayerBridge(options = {}) {
    const {
        existingBridge = null,
        contractVersion = MATCH_LIFECYCLE_CONTRACT_VERSION,
        onEvent = null,
        onStatus = null,
        onStateChanged = null,
        onMatchStart = null,
        now,
        runtime,
        storage,
        sessionStorage,
        peerId,
    } = options;

    if (existingBridge) {
        existingBridge.contractVersion = contractVersion;
        existingBridge.onEvent = typeof onEvent === 'function' ? onEvent : null;
        existingBridge.onStatus = typeof onStatus === 'function' ? onStatus : null;
        existingBridge.onStateChanged = typeof onStateChanged === 'function' ? onStateChanged : null;
        existingBridge.onMatchStart = typeof onMatchStart === 'function' ? onMatchStart : null;
        return existingBridge;
    }

    return new MenuMultiplayerBridge({
        contractVersion,
        onEvent,
        onStatus,
        onStateChanged,
        onMatchStart,
        now,
        runtime,
        storage,
        sessionStorage,
        peerId,
    });
}

export function didHostChangeMatchSettings(changedKeys, matchSettingChangeKeySet) {
    if (!Array.isArray(changedKeys) || changedKeys.length === 0) return false;
    return changedKeys.some((key) => matchSettingChangeKeySet?.has(key));
}

export function createMultiplayerMatchSettingsSnapshot(settings = {}) {
    return deepClone({
        mode: '1p',
        gameMode: settings?.gameMode || 'CLASSIC',
        mapKey: settings?.mapKey || 'standard',
        numBots: settings?.numBots ?? 1,
        botDifficulty: settings?.botDifficulty || 'NORMAL',
        winsNeeded: settings?.winsNeeded ?? 5,
        autoRoll: settings?.autoRoll !== false,
        portalsEnabled: settings?.portalsEnabled !== false,
        hunt: settings?.hunt ? { ...settings.hunt } : { respawnEnabled: false },
        gameplay: settings?.gameplay ? { ...settings.gameplay } : {},
        vehicles: settings?.vehicles ? { ...settings.vehicles } : {},
        matchSettings: settings?.matchSettings ? { ...settings.matchSettings } : {},
        playerLoadout: settings?.playerLoadout ? { ...settings.playerLoadout } : {},
        localSettings: {
            sessionType: 'multiplayer',
            modePath: settings?.localSettings?.modePath || 'normal',
        },
    });
}

export function applyMultiplayerMatchSettingsSnapshot(targetSettings, snapshot = null) {
    if (!targetSettings || typeof targetSettings !== 'object' || !snapshot || typeof snapshot !== 'object') {
        return targetSettings;
    }

    targetSettings.mode = '1p';
    targetSettings.gameMode = snapshot.gameMode || targetSettings.gameMode;
    targetSettings.mapKey = snapshot.mapKey || targetSettings.mapKey;
    targetSettings.numBots = Number.isFinite(Number(snapshot.numBots))
        ? Number(snapshot.numBots)
        : targetSettings.numBots;
    targetSettings.botDifficulty = snapshot.botDifficulty || targetSettings.botDifficulty;
    targetSettings.winsNeeded = Number.isFinite(Number(snapshot.winsNeeded))
        ? Number(snapshot.winsNeeded)
        : targetSettings.winsNeeded;
    targetSettings.autoRoll = typeof snapshot.autoRoll === 'boolean' ? snapshot.autoRoll : targetSettings.autoRoll;
    targetSettings.portalsEnabled = typeof snapshot.portalsEnabled === 'boolean'
        ? snapshot.portalsEnabled
        : targetSettings.portalsEnabled;

    if (!targetSettings.hunt || typeof targetSettings.hunt !== 'object') {
        targetSettings.hunt = { respawnEnabled: false };
    }
    if (!targetSettings.gameplay || typeof targetSettings.gameplay !== 'object') {
        targetSettings.gameplay = {};
    }
    if (!targetSettings.vehicles || typeof targetSettings.vehicles !== 'object') {
        targetSettings.vehicles = {};
    }
    if (!targetSettings.matchSettings || typeof targetSettings.matchSettings !== 'object') {
        targetSettings.matchSettings = {};
    }
    if (!targetSettings.playerLoadout || typeof targetSettings.playerLoadout !== 'object') {
        targetSettings.playerLoadout = {};
    }
    if (!targetSettings.localSettings || typeof targetSettings.localSettings !== 'object') {
        targetSettings.localSettings = {};
    }

    targetSettings.hunt = {
        ...targetSettings.hunt,
        ...(snapshot.hunt && typeof snapshot.hunt === 'object' ? snapshot.hunt : {}),
    };
    targetSettings.gameplay = {
        ...targetSettings.gameplay,
        ...(snapshot.gameplay && typeof snapshot.gameplay === 'object' ? snapshot.gameplay : {}),
    };
    targetSettings.vehicles = {
        ...targetSettings.vehicles,
        ...(snapshot.vehicles && typeof snapshot.vehicles === 'object' ? snapshot.vehicles : {}),
    };
    targetSettings.matchSettings = {
        ...targetSettings.matchSettings,
        ...(snapshot.matchSettings && typeof snapshot.matchSettings === 'object' ? snapshot.matchSettings : {}),
    };
    targetSettings.playerLoadout = {
        ...targetSettings.playerLoadout,
        ...(snapshot.playerLoadout && typeof snapshot.playerLoadout === 'object' ? snapshot.playerLoadout : {}),
    };
    targetSettings.localSettings.sessionType = 'multiplayer';
    if (typeof snapshot?.localSettings?.modePath === 'string' && snapshot.localSettings.modePath.trim()) {
        targetSettings.localSettings.modePath = snapshot.localSettings.modePath.trim();
    }

    return targetSettings;
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

    const invalidationResult = menuMultiplayerBridge?.invalidateReadyForAll('host_settings_changed');
    if (!invalidationResult?.event) return;

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
    syncUiState,
    captureSettingsSnapshot,
}) {
    if (!game) return null;
    const accessContext = resolveMenuAccessContext?.();
    const result = menuMultiplayerBridge?.host({
        actorId: accessContext?.actorId,
        lobbyCode: String(event?.lobbyCode || '').trim(),
    });
    if (!result?.ok) {
        game._showStatusToast(result?.message || 'Lobby konnte nicht erstellt werden.', 1800, 'error');
        return result;
    }

    ensureMultiplayerSessionType(game);
    if (game.ui?.multiplayerLobbyCodeInput) {
        game.ui.multiplayerLobbyCodeInput.value = result.lobbyCode || '';
    }
    menuMultiplayerBridge?.publishHostSettings?.(captureSettingsSnapshot?.());
    syncUiState?.();
    return result;
}

export function handleMultiplayerJoinAction({
    game,
    event,
    resolveMenuAccessContext,
    menuMultiplayerBridge,
    syncUiState,
}) {
    if (!game) return null;
    const accessContext = resolveMenuAccessContext?.();
    const result = menuMultiplayerBridge?.join({
        actorId: accessContext?.actorId,
        lobbyCode: String(event?.lobbyCode || '').trim(),
    });
    if (!result?.ok) {
        game._showStatusToast(result?.message || 'Lobby konnte nicht beigetreten werden.', 1800, 'error');
        return result;
    }

    ensureMultiplayerSessionType(game);
    if (game.ui?.multiplayerLobbyCodeInput) {
        game.ui.multiplayerLobbyCodeInput.value = result.lobbyCode || '';
    }
    syncUiState?.();
    return result;
}

export function handleMultiplayerReadyToggleAction({
    game,
    event,
    resolveMenuAccessContext,
    menuMultiplayerBridge,
    syncUiState,
}) {
    ensureMultiplayerSessionType(game);
    const result = menuMultiplayerBridge?.toggleReady({
        actorId: resolveMenuAccessContext?.()?.actorId,
        ready: !!event?.ready,
    });
    if (!result?.ok) {
        game?._showStatusToast?.(result?.message || 'Ready-Status konnte nicht gesetzt werden.', 1700, 'error');
        if (game?.ui?.multiplayerReadyToggle) {
            game.ui.multiplayerReadyToggle.checked = false;
        }
        return result;
    }
    syncUiState?.();
    return result;
}
