import { createMenuConfigSharePayloadDefaults } from './MenuDefaultsEditorConfig.js';

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function sanitizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function createSharePayload(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const defaults = createMenuConfigSharePayloadDefaults();
    return {
        sessionType: sanitizeString(source?.localSettings?.sessionType, defaults.sessionType),
        modePath: sanitizeString(source?.localSettings?.modePath, defaults.modePath),
        themeMode: sanitizeString(source?.localSettings?.themeMode, defaults.themeMode),
        mode: source.mode === '2p' ? '2p' : defaults.mode,
        gameMode: sanitizeString(source.gameMode, defaults.gameMode),
        mapKey: sanitizeString(source.mapKey, defaults.mapKey),
        numBots: Number.isFinite(Number(source.numBots)) ? Number(source.numBots) : defaults.numBots,
        botDifficulty: sanitizeString(source.botDifficulty, defaults.botDifficulty).toUpperCase(),
        winsNeeded: Number.isFinite(Number(source.winsNeeded)) ? Number(source.winsNeeded) : defaults.winsNeeded,
        autoRoll: typeof source.autoRoll === 'boolean' ? source.autoRoll : defaults.autoRoll,
        portalsEnabled: typeof source.portalsEnabled === 'boolean' ? source.portalsEnabled : defaults.portalsEnabled,
        vehicles: deepClone(source.vehicles || defaults.vehicles),
        hunt: deepClone(source.hunt || defaults.hunt),
        gameplay: deepClone(source.gameplay || defaults.gameplay),
        recording: deepClone(source.recording || defaults.recording),
    };
}

function applySharePayload(settings, payload) {
    if (!settings || typeof settings !== 'object' || !payload || typeof payload !== 'object') {
        return false;
    }
    const defaults = createMenuConfigSharePayloadDefaults();

    settings.mode = payload.mode === '2p' ? '2p' : defaults.mode;
    settings.gameMode = sanitizeString(payload.gameMode, settings.gameMode || defaults.gameMode);
    settings.mapKey = sanitizeString(payload.mapKey, settings.mapKey || defaults.mapKey);
    settings.numBots = Number.isFinite(Number(payload.numBots)) ? Number(payload.numBots) : settings.numBots;
    settings.botDifficulty = sanitizeString(payload.botDifficulty, settings.botDifficulty || defaults.botDifficulty).toUpperCase();
    settings.winsNeeded = Number.isFinite(Number(payload.winsNeeded)) ? Number(payload.winsNeeded) : settings.winsNeeded;
    settings.autoRoll = typeof payload.autoRoll === 'boolean' ? payload.autoRoll : defaults.autoRoll;
    settings.portalsEnabled = typeof payload.portalsEnabled === 'boolean' ? payload.portalsEnabled : defaults.portalsEnabled;
    settings.vehicles = {
        ...(settings.vehicles && typeof settings.vehicles === 'object' ? settings.vehicles : deepClone(defaults.vehicles)),
        ...(payload.vehicles && typeof payload.vehicles === 'object' ? payload.vehicles : {}),
    };
    settings.hunt = {
        ...(settings.hunt && typeof settings.hunt === 'object' ? settings.hunt : deepClone(defaults.hunt)),
        ...(payload.hunt && typeof payload.hunt === 'object' ? payload.hunt : {}),
    };
    settings.gameplay = {
        ...(settings.gameplay && typeof settings.gameplay === 'object' ? settings.gameplay : deepClone(defaults.gameplay)),
        ...(payload.gameplay && typeof payload.gameplay === 'object' ? payload.gameplay : {}),
    };
    settings.recording = {
        ...(settings.recording && typeof settings.recording === 'object' ? settings.recording : deepClone(defaults.recording || {})),
        ...(payload.recording && typeof payload.recording === 'object' ? payload.recording : {}),
    };
    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    settings.localSettings.sessionType = sanitizeString(payload.sessionType, settings.localSettings.sessionType || defaults.sessionType);
    settings.localSettings.modePath = sanitizeString(payload.modePath, settings.localSettings.modePath || defaults.modePath);
    settings.localSettings.themeMode = sanitizeString(payload.themeMode, settings.localSettings.themeMode || defaults.themeMode);
    return true;
}

export function exportMenuConfigAsJson(settings) {
    return JSON.stringify(createSharePayload(settings), null, 2);
}

export function exportMenuConfigAsCode(settings) {
    const json = JSON.stringify(createSharePayload(settings));
    try {
        return btoa(unescape(encodeURIComponent(json)));
    } catch {
        return '';
    }
}

export function importMenuConfigFromInput(settings, inputValue) {
    const raw = sanitizeString(inputValue);
    if (!raw) return { success: false, reason: 'empty_input' };

    let payload = null;
    try {
        payload = JSON.parse(raw);
    } catch {
        try {
            const decoded = decodeURIComponent(escape(atob(raw)));
            payload = JSON.parse(decoded);
        } catch {
            payload = null;
        }
    }

    if (!payload || typeof payload !== 'object') {
        return { success: false, reason: 'invalid_payload' };
    }

    const applied = applySharePayload(settings, payload);
    return {
        success: applied,
        reason: applied ? 'imported' : 'apply_failed',
        payload,
    };
}

