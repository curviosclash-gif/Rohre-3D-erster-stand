import { GAME_MODE_TYPES } from '../../hunt/HuntMode.js';
import { SETTINGS_CHANGE_KEYS } from '../../composition/core-ui/CoreUiMenuPorts.js';
import { CONFIG } from '../Config.js';
import { MATCH_SETTING_CHANGE_KEY_SET, START_VALIDATION_RELEVANT_KEY_SET } from './GameRuntimeSettingsKeySets.js';
import { resolveMatchStartValidationIssue } from './MatchStartValidationService.js';
import {
    applyMultiplayerMatchSettingsSnapshot,
    createMultiplayerMatchSettingsSnapshot,
    didHostChangeMatchSettings,
    invalidateMultiplayerReadyIfHostChangedSettings,
} from './MenuRuntimeMultiplayerService.js';
import { orchestrateRuntimeSettingsChanged } from './RuntimeSettingsChangeOrchestrator.js';

export class GameRuntimeSettingsHandler {
    constructor({ facade = null } = {}) {
        this._facade = facade || null;
    }

    captureMultiplayerMatchSettings() {
        return createMultiplayerMatchSettingsSnapshot(this._facade?.game?.settings);
    }

    applyAuthoritativeMultiplayerMatchSettings(snapshot) {
        const game = this._facade?.game;
        if (!game?.settings) return;
        applyMultiplayerMatchSettingsSnapshot(game.settings, snapshot);
        game.settingsManager?.applyMenuCompatibilityRules?.(
            game.settings,
            { accessContext: this._facade?._resolveMenuAccessContext?.() }
        );
        this.markSettingsDirty(false);
        game.uiManager?.syncAll?.();
        game.uiManager?.updateContext?.();
    }

    didHostChangeMatchSettings(changedKeys) {
        return didHostChangeMatchSettings(changedKeys, MATCH_SETTING_CHANGE_KEY_SET);
    }

    invalidateMultiplayerReadyIfHostChangedSettings(changedKeys) {
        invalidateMultiplayerReadyIfHostChangedSettings({
            changedKeys,
            matchSettingChangeKeySet: MATCH_SETTING_CHANGE_KEY_SET,
            resolveMenuAccessContext: () => this._facade?._resolveMenuAccessContext?.(),
            menuMultiplayerBridge: this._facade?.menuMultiplayerBridge,
            game: this._facade?.game,
            onSettingsChanged: (payload) => this._facade?.onSettingsChanged?.(payload),
            settingsChangeKeys: SETTINGS_CHANGE_KEYS,
        });
    }

    resolveStartValidationIssue() {
        return resolveMatchStartValidationIssue({
            settings: this._facade?.game?.settings,
            ui: this._facade?.game?.ui,
            multiplayerSessionState: this._facade?.menuMultiplayerBridge?.getSessionState?.(),
            maps: CONFIG?.MAPS,
            huntModeType: GAME_MODE_TYPES.HUNT,
        });
    }

    onSettingsChanged(event = null) {
        const changedKeys = orchestrateRuntimeSettingsChanged({
            game: this._facade?.game,
            event,
            resolveMenuAccessContext: () => this._facade?._resolveMenuAccessContext?.(),
            startValidationRelevantKeySet: START_VALIDATION_RELEVANT_KEY_SET,
            invalidateMultiplayerReadyIfHostChangedSettings: (nextChangedKeys) => this.invalidateMultiplayerReadyIfHostChangedSettings(nextChangedKeys),
            markSettingsDirty: (isDirty) => this.markSettingsDirty(isDirty),
            updateSaveButtonState: () => this.updateSaveButtonState(),
            scheduleMatchPrewarm: () => this._facade?.scheduleMatchPrewarm?.(),
        });
        this._facade?.applySettingsToRuntime?.({ schedulePrewarm: false });
        this._facade?._syncMultiplayerRuntimeContext?.(changedKeys);
        return changedKeys;
    }

    markSettingsDirty(isDirty) {
        const game = this._facade?.game;
        if (!game) return;
        game.settingsDirty = !!isDirty;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const game = this._facade?.game;
        if (!game?.ui?.saveKeysButton) return;
        game.ui.saveKeysButton.classList.toggle('unsaved', game.settingsDirty);
        game.ui.saveKeysButton.textContent = game.settingsDirty
            ? 'Einstellungen explizit speichern *'
            : 'Einstellungen explizit speichern';
        game.uiManager?.updateContext?.();
    }
}
