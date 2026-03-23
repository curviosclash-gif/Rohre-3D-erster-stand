import { MENU_SESSION_TYPES } from './MenuStateContracts.js';
import { createMenuConfigSharePayloadDefaults } from './MenuDefaultsEditorConfig.js';
import {
    LEGACY_STORAGE_KEYS,
    STORAGE_KEYS,
} from '../StorageKeys.js';
import { createDefaultStoragePlatform } from '../../state/storage/StoragePlatform.js';

const MENU_DRAFT_STORAGE_KEY = STORAGE_KEYS.menuDrafts;
const MENU_DRAFT_STORAGE_LEGACY_KEYS = LEGACY_STORAGE_KEYS.menuDrafts;
const MENU_DRAFT_STORAGE_SCHEMA_VERSION = 'menu-draft-store.v1';

const VALID_SESSION_TYPE_SET = new Set(Object.values(MENU_SESSION_TYPES));

function getDefaultStorage() {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized || fallback;
}

export function normalizeSessionType(value, fallback = MENU_SESSION_TYPES.SINGLE) {
    const requested = normalizeString(value, fallback);
    return VALID_SESSION_TYPE_SET.has(requested) ? requested : fallback;
}

function cloneObject(value, fallback = {}) {
    if (!value || typeof value !== 'object') return { ...fallback };
    return JSON.parse(JSON.stringify(value));
}

function resolveModeFromSessionType(sessionType) {
    return normalizeSessionType(sessionType) === MENU_SESSION_TYPES.SPLITSCREEN ? '2p' : '1p';
}

function createSessionDraftSnapshot(settings, sessionType) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const localSettings = source.localSettings && typeof source.localSettings === 'object'
        ? source.localSettings
        : {};
    const defaults = createMenuConfigSharePayloadDefaults();

    return {
        sessionType: normalizeSessionType(sessionType, localSettings.sessionType || defaults.sessionType || MENU_SESSION_TYPES.SINGLE),
        mode: resolveModeFromSessionType(sessionType),
        modePath: normalizeString(localSettings.modePath, defaults.modePath),
        themeMode: normalizeString(localSettings.themeMode, defaults.themeMode),
        mapKey: String(source.mapKey || defaults.mapKey),
        gameMode: String(source.gameMode || defaults.gameMode),
        numBots: Number.isFinite(Number(source.numBots)) ? Number(source.numBots) : defaults.numBots,
        botDifficulty: String(source.botDifficulty || defaults.botDifficulty).toUpperCase(),
        winsNeeded: Number.isFinite(Number(source.winsNeeded)) ? Number(source.winsNeeded) : defaults.winsNeeded,
        autoRoll: typeof source.autoRoll === 'boolean' ? source.autoRoll : defaults.autoRoll,
        portalsEnabled: typeof source.portalsEnabled === 'boolean' ? source.portalsEnabled : defaults.portalsEnabled,
        vehicles: cloneObject(source.vehicles, defaults.vehicles),
        hunt: {
            respawnEnabled: !!(source?.hunt?.respawnEnabled ?? defaults?.hunt?.respawnEnabled),
        },
        gameplay: cloneObject(source.gameplay, defaults.gameplay),
    };
}

function applySnapshotToSettings(settings, snapshot) {
    if (!settings || typeof settings !== 'object' || !snapshot || typeof snapshot !== 'object') return false;
    const defaults = createMenuConfigSharePayloadDefaults();

    settings.mode = snapshot.mode === '2p' ? '2p' : '1p';
    settings.mapKey = String(snapshot.mapKey || settings.mapKey || defaults.mapKey);
    settings.gameMode = String(snapshot.gameMode || settings.gameMode || defaults.gameMode);
    settings.numBots = Number.isFinite(Number(snapshot.numBots)) ? Number(snapshot.numBots) : settings.numBots;
    settings.botDifficulty = String(snapshot.botDifficulty || settings.botDifficulty || defaults.botDifficulty).toUpperCase();
    settings.winsNeeded = Number.isFinite(Number(snapshot.winsNeeded)) ? Number(snapshot.winsNeeded) : settings.winsNeeded;
    settings.autoRoll = typeof snapshot.autoRoll === 'boolean' ? snapshot.autoRoll : defaults.autoRoll;
    settings.portalsEnabled = typeof snapshot.portalsEnabled === 'boolean' ? snapshot.portalsEnabled : defaults.portalsEnabled;

    if (!settings.vehicles || typeof settings.vehicles !== 'object') {
        settings.vehicles = cloneObject(defaults.vehicles, { PLAYER_1: 'ship5', PLAYER_2: 'ship5' });
    }
    settings.vehicles.PLAYER_1 = String(snapshot?.vehicles?.PLAYER_1 || settings.vehicles.PLAYER_1 || defaults.vehicles.PLAYER_1);
    settings.vehicles.PLAYER_2 = String(snapshot?.vehicles?.PLAYER_2 || settings.vehicles.PLAYER_2 || defaults.vehicles.PLAYER_2);

    if (!settings.hunt || typeof settings.hunt !== 'object') {
        settings.hunt = cloneObject(defaults.hunt, { respawnEnabled: false });
    }
    settings.hunt.respawnEnabled = !!(snapshot?.hunt?.respawnEnabled ?? defaults?.hunt?.respawnEnabled);

    settings.gameplay = {
        ...(settings.gameplay && typeof settings.gameplay === 'object' ? settings.gameplay : cloneObject(defaults.gameplay, {})),
        ...cloneObject(snapshot.gameplay, defaults.gameplay),
    };

    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    settings.localSettings.sessionType = normalizeSessionType(snapshot.sessionType, settings.localSettings.sessionType);
    settings.localSettings.modePath = normalizeString(snapshot.modePath, settings.localSettings.modePath || defaults.modePath);
    settings.localSettings.themeMode = normalizeString(snapshot.themeMode, settings.localSettings.themeMode || defaults.themeMode);
    return true;
}

export class MenuDraftStore {
    constructor(options = {}) {
        this.storagePlatform = options.storagePlatform || createDefaultStoragePlatform({
            storage: options.storage ?? getDefaultStorage(),
            onQuotaExceeded: options.onQuotaExceeded,
        });
        this.storage = this.storagePlatform?.driver?.storage || null;
        this.storageKey = options.storageKey || MENU_DRAFT_STORAGE_KEY;
        this.storageLegacyKeys = Array.isArray(options.storageLegacyKeys)
            ? [...options.storageLegacyKeys]
            : [...MENU_DRAFT_STORAGE_LEGACY_KEYS];
    }

    _loadStore() {
        try {
            const parsed = this.storagePlatform.readJson(this.storageKey, this.storageLegacyKeys, null);
            if (!parsed || typeof parsed !== 'object') {
                return { schemaVersion: MENU_DRAFT_STORAGE_SCHEMA_VERSION, drafts: {} };
            }
            return {
                schemaVersion: MENU_DRAFT_STORAGE_SCHEMA_VERSION,
                drafts: parsed?.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
            };
        } catch {
            return { schemaVersion: MENU_DRAFT_STORAGE_SCHEMA_VERSION, drafts: {} };
        }
    }

    _saveStore(store) {
        return this.storagePlatform.writeJson(this.storageKey, store).ok;
    }

    saveDraft(sessionType, settings) {
        const normalizedSessionType = normalizeSessionType(sessionType);
        const store = this._loadStore();
        store.drafts[normalizedSessionType] = createSessionDraftSnapshot(settings, normalizedSessionType);
        const stored = this._saveStore(store);
        return {
            success: stored,
            sessionType: normalizedSessionType,
            draft: stored ? cloneObject(store.drafts[normalizedSessionType], null) : null,
        };
    }

    loadDraft(sessionType) {
        const normalizedSessionType = normalizeSessionType(sessionType);
        const store = this._loadStore();
        const draft = store.drafts[normalizedSessionType];
        return draft && typeof draft === 'object' ? cloneObject(draft, null) : null;
    }

    applyDraft(settings, sessionType) {
        const draft = this.loadDraft(sessionType);
        if (!draft) return { success: false, reason: 'draft_not_found' };
        const applied = applySnapshotToSettings(settings, draft);
        return {
            success: applied,
            reason: applied ? 'applied' : 'apply_failed',
            draft,
        };
    }

    clearDraft(sessionType) {
        const normalizedSessionType = normalizeSessionType(sessionType);
        const store = this._loadStore();
        if (!Object.prototype.hasOwnProperty.call(store.drafts, normalizedSessionType)) {
            return { success: false, reason: 'draft_not_found' };
        }
        delete store.drafts[normalizedSessionType];
        const stored = this._saveStore(store);
        return { success: stored, reason: stored ? 'cleared' : 'storage_failed' };
    }
}
