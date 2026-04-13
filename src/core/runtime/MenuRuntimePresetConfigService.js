// ============================================
// MenuRuntimePresetConfigService.js - preset and config-share runtime actions
// ============================================

import {
    exportMenuConfigAsCode,
    exportMenuConfigAsJson,
    importMenuConfigFromInput,
} from '../../composition/core-ui/CoreUiMenuPorts.js';
import {
    isSurfacePresetAllowed,
    resolveSurfaceBlockedFeatureFeedback,
} from '../../shared/contracts/PlatformSurfacePolicyOps.js';

function setConfigShareStatus(ui, message, tone = 'info') {
    if (!ui?.configShareStatus) return;
    ui.configShareStatus.textContent = String(message || '');
    ui.configShareStatus.setAttribute('data-tone', tone);
}

export function handleConfigExportCodeAction(game) {
    if (!game) return;
    const code = exportMenuConfigAsCode(game.settings);
    if (game.ui?.configShareInput) {
        game.ui.configShareInput.value = code;
    }
    setConfigShareStatus(game.ui, 'Config-Code erzeugt');
}

export function handleConfigExportJsonAction(game) {
    if (!game) return;
    const json = exportMenuConfigAsJson(game.settings);
    if (game.ui?.configShareInput) {
        game.ui.configShareInput.value = json;
    }
    setConfigShareStatus(game.ui, 'Config-JSON erzeugt');
}

export function handleConfigImportAction({
    game,
    inputValue,
    onSettingsChanged,
    sessionSwitchChangedKeys,
}) {
    if (!game) return;
    const result = importMenuConfigFromInput(game.settings, inputValue);
    if (!result.success) {
        const errorMessage = String(result.error || 'Config-Import fehlgeschlagen');
        setConfigShareStatus(game.ui, 'Import fehlgeschlagen', 'error');
        game._showStatusToast(errorMessage, 1700, 'error');
        return;
    }

    onSettingsChanged?.({ changedKeys: sessionSwitchChangedKeys });
    const statusMessage = String(result.message || (result.usedLegacyFallback ? 'Import mit Legacy-Fallback' : 'Import erfolgreich'));
    const statusTone = String(result.tone || (result.usedLegacyFallback ? 'warning' : 'success'));
    setConfigShareStatus(game.ui, statusMessage, statusTone);
    game._showStatusToast(statusMessage, result.usedLegacyFallback ? 2200 : 1200, statusTone);
    if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        game._showStatusToast(result.warnings[0], 2800, 'warning');
    }
}

export function applyMenuPresetAction({
    game,
    presetId,
    resolveMenuAccessContext,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    if (!game) return;
    if (!presetId) {
        game._showStatusToast('Preset fehlt.', 1500, 'error');
        return;
    }
    if (!isSurfacePresetAllowed(presetId)) {
        const feedback = resolveSurfaceBlockedFeatureFeedback('Dieses Preset');
        game._showStatusToast(feedback.message, feedback.durationMs, feedback.tone);
        return;
    }

    const result = game.settingsManager.applyMenuPreset(game.settings, presetId, resolveMenuAccessContext?.());
    if (!result.success) {
        game._showStatusToast('Preset konnte nicht angewendet werden.', 1700, 'error');
        return;
    }

    const changedKeys = Array.isArray(result.changedKeys) ? result.changedKeys.slice() : [];
    changedKeys.push(
        settingsChangeKeys.PRESET_ACTIVE_ID,
        settingsChangeKeys.PRESET_ACTIVE_KIND,
        settingsChangeKeys.PRESET_STATUS
    );
    onSettingsChanged?.({ changedKeys });

    if (result.blockedPaths?.length > 0) {
        game._showStatusToast('Preset teilweise angewendet (Host-Felder blieben unveraendert).', 1900, 'info');
        return;
    }
    game._showStatusToast(`Preset geladen: ${presetId}`, 1300, 'success');
}

export function saveMenuPresetAction({
    game,
    kind,
    presetName,
    sourcePresetId,
    resolveMenuAccessContext,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    if (!game) return;
    const result = game.settingsManager.saveMenuPreset(
        game.settings,
        {
            kind,
            name: presetName,
            sourcePresetId: String(sourcePresetId || '').trim(),
        },
        resolveMenuAccessContext?.()
    );
    if (!result.success) {
        game._showStatusToast('Preset konnte nicht gespeichert werden.', 1700, 'error');
        return;
    }
    onSettingsChanged?.({
        changedKeys: [
            settingsChangeKeys.PRESET_LIST,
            settingsChangeKeys.PRESET_STATUS,
        ],
    });
    const label = kind === 'fixed' ? 'verbindlich' : 'frei';
    game._showStatusToast(`Preset gespeichert (${label}): ${result.preset?.name || result.preset?.id}`, 1400, 'success');
}

export function deleteMenuPresetAction({
    game,
    presetId,
    resolveMenuAccessContext,
    onSettingsChanged,
    settingsChangeKeys,
}) {
    if (!game) return;
    if (!presetId) {
        game._showStatusToast('Kein Preset ausgewaehlt.', 1500, 'error');
        return;
    }
    const result = game.settingsManager.deleteMenuPreset(presetId, game.settings, resolveMenuAccessContext?.());
    if (!result.success) {
        game._showStatusToast('Preset konnte nicht geloescht werden.', 1700, 'error');
        return;
    }
    onSettingsChanged?.({
        changedKeys: [
            settingsChangeKeys.PRESET_LIST,
            settingsChangeKeys.PRESET_STATUS,
        ],
    });
    game._showStatusToast(`Preset geloescht: ${presetId}`, 1200, 'success');
}
