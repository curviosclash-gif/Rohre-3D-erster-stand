// ============================================
// UIStartSyncController.js
// Start-Setup, Preview-Cards, Summary-Rendering und Validierungs-Hints
// Extrahiert aus UIManager.js (V38 Phase 38.3.1)
// ============================================

/* eslint-disable max-lines */

import { VEHICLE_DEFINITIONS } from '../entities/vehicle-registry.js';
import { MENU_SESSION_TYPES } from './menu/MenuStateContracts.js';
import {
    listMapPreviewEntries,
    listVehiclePreviewEntries,
    resolveMapPreview,
    resolveVehiclePreview,
} from './menu/MenuPreviewCatalog.js';
import {
    isMapEligibleForModePath,
    resolveModePathFallbackMapKey,
} from '../shared/contracts/MapModeContract.js';
import {
    resolveSurfaceEntryCopy,
    resolveSurfaceMenuState,
} from '../shared/contracts/PlatformSurfacePolicyOps.js';
import { createSurfacePolicyPort } from '../shared/runtime/SurfacePolicyPort.js';
import {
    ensureStartSetupLocalState,
    humanizePreviewCategory,
    renderPreviewCard,
    renderQuickList,
    renderSummaryBlocks,
} from './start-setup/StartSetupUiOps.js';
import { bindStartSetupControls } from './start-setup/StartSetupControlBindings.js';
import {
    formatStartSetupMapLabel,
    renderStartFieldHints,
} from './start-setup/StartSetupValidationView.js';
import {
    HANGAR_SELECTION_PLAYER_SLOTS,
    readHangarMapSelection,
    readHangarVehicleSelection,
    writeHangarMapSelection,
    writeHangarVehicleSelection,
} from './hangar/HangarSelectionWritebackContract.js';
import { getRuntimeMapCatalog } from '../shared/contracts/RuntimeMapCatalogContract.js';
import {
    MULTIPLAYER_TRANSPORTS,
    normalizeMultiplayerTransport,
    resolveRuntimeSessionContract,
} from '../shared/contracts/RuntimeSessionContract.js';
import { hasConfiguredOnlineSignalingUrl } from '../shared/contracts/OnlineSignalingConfig.js';
import {
    ARCADE_GHOST_DUEL_MODES,
    isArcadeGhostDuelPlaybackEnabled,
    normalizeArcadeGhostDuelMode,
    normalizeArcadeGhostTrailCollisionEnabled,
} from '../shared/contracts/ArcadeGhostDuelContract.js';

function resolveArcadeGhostDuelModeLabel(mode) {
    return mode === ARCADE_GHOST_DUEL_MODES.SELF_LONGEST_GHOST
        ? 'Selbstduell (laengste Spur)'
        : 'Aus';
}

export class UIStartSyncController {
    /**
     * @param {{ ui: object, manager: object, port?: object }} options
     */
    constructor({ ui, manager, port = null }) {
        this.ui = ui;
        this.manager = manager;
        this.port = port;
        this._mapPreviewEntries = listMapPreviewEntries();
        this._vehiclePreviewEntries = listVehiclePreviewEntries();
        this._startSetupDisposers = [];
        this._startValidationIssue = null;
        this._activeSyncSnapshot = null;
    }

    _getSettings() {
        return this.port?.getSettings?.() || this.manager?.settings || null;
    }

    _getSurfacePolicyPort() {
        if (this.port?.surfacePolicyPort) return this.port.surfacePolicyPort;
        return createSurfacePolicyPort({
            getProductSurfaceId: () => this._resolveSurfacePolicy()?.productSurfaceId || '',
            getSettings: () => this._getSettings()
        });
    }

    _getSettingsManager() {
        return this.port?.getSettingsManager?.() || null;
    }

    _getMapDefinitions() {
        return this.port?.getMapDefinitions?.() || {};
    }

    _getRuntimeMaps() {
        return getRuntimeMapCatalog();
    }

    _getMultiplayerSessionState() {
        if (this._activeSyncSnapshot?.multiplayerSessionState) {
            return this._activeSyncSnapshot.multiplayerSessionState;
        }
        return this.port?.getMultiplayerSessionState?.() || null;
    }

    // ------------------------------------------------------------------
    // Setup: Vehicle- und Map-Selects, Start-Setup-Controls
    // ------------------------------------------------------------------

    setupVehicleSelects() {
        const populate = (select) => {
            if (!select) return;
            select.innerHTML = '';
            VEHICLE_DEFINITIONS.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = v.label;
                select.appendChild(opt);
            });
        };
        populate(this.ui.vehicleSelectP1);
        populate(this.ui.vehicleSelectP2);
    }

    setupMapSelect() {
        const select = this.ui.mapSelect;
        const settings = this._getSettings();
        if (!select || !settings) return;
        const maps = this._getMapDefinitions();

        const modePath = this._resolveAllowedModePath(settings?.localSettings?.modePath || 'normal');
        if (settings?.localSettings) {
            settings.localSettings.modePath = modePath;
        }
        const currentValue = String(select.value || settings?.mapKey || 'standard');
        const fallbackMapKey = this._resolveSurfaceFallbackMapKey(maps, modePath, currentValue);
        select.innerHTML = '';

        Object.entries(maps).forEach(([key, mapDef]) => {
            if (!isMapEligibleForModePath(mapDef, modePath) || !this._getSurfacePolicyPort().isMapAllowed(key, modePath)) {
                return;
            }
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = this._formatMapLabel({
                name: String(mapDef?.name || key),
                hasGlbModel: typeof mapDef?.glbModel === 'string' && mapDef.glbModel.trim().length > 0,
            });
            select.appendChild(opt);
        });

        if (this._hasStoredCustomMap()) {
            const opt = document.createElement('option');
            opt.value = 'custom';
            opt.textContent = this._formatMapLabel({
                key: 'custom',
                name: 'Custom (lokal)',
                hasGlbModel: true,
            });
            select.appendChild(opt);
        }

        if (maps?.[currentValue]
            && isMapEligibleForModePath(maps[currentValue], modePath)
            && this._getSurfacePolicyPort().isMapAllowed(currentValue, modePath)) {
            select.value = currentValue;
        } else if (currentValue === 'custom' && this._hasStoredCustomMap()) {
            select.value = 'custom';
        } else if (maps?.[fallbackMapKey]) {
            select.value = fallbackMapKey;
        }
    }

    setupStartSetupControls() {
        const settings = this._getSettings();
        if (!settings) return;
        this.manager._disposeDisposerList(this._startSetupDisposers);
        const startSetup = ensureStartSetupLocalState(settings);
        const getSettings = () => this._getSettings();
        const listen = (target, type, handler) => this.manager._listen(target, type, handler, undefined, this._startSetupDisposers);

        const mapSearchInput = this.ui.mapSearchInput;
        const mapFilterSelect = this.ui.mapFilterSelect;
        const vehicleSearchInput = this.ui.vehicleSearchInput;
        const vehicleFilterSelect = this.ui.vehicleFilterSelect;

        if (mapSearchInput) {
            mapSearchInput.value = startSetup.mapSearch;
            listen(mapSearchInput, 'input', () => {
                const currentSettings = getSettings();
                if (!currentSettings) return;
                ensureStartSetupLocalState(currentSettings).mapSearch = String(mapSearchInput.value || '');
                this.syncStartSetupState(currentSettings);
            });
        }
        if (mapFilterSelect) {
            mapFilterSelect.value = startSetup.mapFilter;
            listen(mapFilterSelect, 'change', () => {
                const currentSettings = getSettings();
                if (!currentSettings) return;
                ensureStartSetupLocalState(currentSettings).mapFilter = String(mapFilterSelect.value || 'all');
                this.syncStartSetupState(currentSettings);
            });
        }
        if (vehicleSearchInput) {
            vehicleSearchInput.value = startSetup.vehicleSearch;
            listen(vehicleSearchInput, 'input', () => {
                const currentSettings = getSettings();
                if (!currentSettings) return;
                ensureStartSetupLocalState(currentSettings).vehicleSearch = String(vehicleSearchInput.value || '');
                this.syncStartSetupState(currentSettings);
            });
        }
        if (vehicleFilterSelect) {
            vehicleFilterSelect.value = startSetup.vehicleFilter;
            listen(vehicleFilterSelect, 'change', () => {
                const currentSettings = getSettings();
                if (!currentSettings) return;
                ensureStartSetupLocalState(currentSettings).vehicleFilter = String(vehicleFilterSelect.value || 'all');
                this.syncStartSetupState(currentSettings);
            });
        }

        bindStartSetupControls(this, listen, getSettings);
    }

    // ------------------------------------------------------------------
    // Interne Hilfsm­ethoden (Field-Hints und Labels)
    // ------------------------------------------------------------------

    _formatMapLabel(entry = {}) {
        return formatStartSetupMapLabel(entry);
    }

    _hasStoredCustomMap() {
        try {
            return !!globalThis?.localStorage?.getItem?.('custom_map_test');
        } catch {
            return false;
        }
    }

    _renderStartFieldHints(settings = this._getSettings(), options = {}) {
        if (!settings) return;
        renderStartFieldHints({
            ui: this.ui,
            settings,
            settingsManager: this._getSettingsManager(),
            startValidationIssue: this._startValidationIssue,
            focusField: options.focusField === true,
            onOpenSection: (sectionId) => this.manager?._setStartSectionOpen?.(sectionId, true),
        });
    }

    _resolveSurfacePolicy(settings = this._getSettings()) {
        if (this._activeSyncSnapshot?.surfacePolicy) {
            return this._activeSyncSnapshot.surfacePolicy;
        }
        return this.port?.resolveSurfacePolicy?.(settings)
            || this.manager?.resolveSurfacePolicy?.(settings)
            || null;
    }

    _resolveAllowedModePath(requestedModePath) {
        const normalizedModePath = String(requestedModePath || 'normal').trim().toLowerCase() || 'normal';
        return this._getSurfacePolicyPort().isModePathAllowed(normalizedModePath)
            ? normalizedModePath
            : this._getSurfacePolicyPort().resolveFallbackModePath();
    }

    _resolveSurfaceFallbackMapKey(maps, modePath, currentMapKey = '') {
        const surfacePolicy = this._resolveSurfacePolicy();
        const normalizedModePath = this._resolveAllowedModePath(modePath);
        if (surfacePolicy?.requiresCuratedMaps === true) {
            const curatedMapKeys = this._getSurfacePolicyPort().listAllowedMapKeysForModePath(normalizedModePath)
                .filter((mapKey) => maps?.[mapKey] && isMapEligibleForModePath(maps[mapKey], normalizedModePath));
            if (curatedMapKeys.includes(String(currentMapKey || '').trim())) {
                return String(currentMapKey || '').trim();
            }
            if (curatedMapKeys.length > 0) {
                return curatedMapKeys[0];
            }
        }
        return resolveModePathFallbackMapKey(maps, normalizedModePath, currentMapKey);
    }

    _resolveHangarSelectionModePath(settings = this._getSettings()) {
        return this._resolveAllowedModePath(settings?.localSettings?.modePath || 'normal');
    }

    // 64.3.1 macht die LAN-/Online-Wahl im Menu explizit. Online wird nur dann
    // als produktiver Pfad behandelt, wenn ein Signaling-Endpoint konfiguriert ist.
    _resolveMultiplayerTransportUiState(settings = this._getSettings()) {
        const surfacePolicy = this._resolveSurfacePolicy(settings);
        const allowedTransports = Array.isArray(surfacePolicy?.allowedMultiplayerTransports)
            ? surfacePolicy.allowedMultiplayerTransports.filter((transport) => transport !== MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE)
            : [MULTIPLAYER_TRANSPORTS.LAN];
        const onlineConfigured = hasConfiguredOnlineSignalingUrl({
            runtimeGlobal: typeof globalThis !== 'undefined' ? globalThis : null,
        });
        const selectedTransport = allowedTransports.includes(
            normalizeMultiplayerTransport(settings?.localSettings?.multiplayerTransport, '')
        )
            ? normalizeMultiplayerTransport(settings?.localSettings?.multiplayerTransport, '')
            : (allowedTransports[0] || MULTIPLAYER_TRANSPORTS.LAN);
        const isOnlineUnconfigured = selectedTransport === MULTIPLAYER_TRANSPORTS.ONLINE && !onlineConfigured;
        return {
            allowedTransports,
            selectedTransport,
            selectedTransportLabel: selectedTransport === MULTIPLAYER_TRANSPORTS.ONLINE ? 'Online' : 'LAN',
            onlineConfigured,
            isOnlineUnconfigured,
        };
    }

    // ------------------------------------------------------------------
    // Öffentliche Validierungsmethoden
    // ------------------------------------------------------------------

    showStartValidationError(issue, options = {}) {
        const normalizedIssue = issue && typeof issue === 'object' ? issue : {};
        this._startValidationIssue = {
            message: String(normalizedIssue.message || 'Start nicht moeglich.').trim(),
            fieldKey: String(normalizedIssue.fieldKey || '').trim(),
            fieldMessage: String(normalizedIssue.fieldMessage || '').trim(),
        };
        this._renderStartFieldHints(this._getSettings(), { focusField: options.focusField !== false });
    }

    clearStartValidationError() {
        if (!this._startValidationIssue) return;
        this._startValidationIssue = null;
        this._renderStartFieldHints(this._getSettings());
    }

    // ------------------------------------------------------------------
    // Sync-Methoden
    // ------------------------------------------------------------------

    syncStartSetupState(settings = this._getSettings(), syncSnapshot = null) {
        if (!settings) return;
        const normalizedSnapshot = syncSnapshot && typeof syncSnapshot === 'object'
            ? syncSnapshot
            : null;
        const previousSyncSnapshot = this._activeSyncSnapshot;
        const runtimeMaps = this._getRuntimeMaps();
        const surfacePolicy = normalizedSnapshot?.surfacePolicy
            || normalizedSnapshot?.menuUiContext?.surfacePolicy
            || this._resolveSurfacePolicy(settings);
        const surfaceMenuState = normalizedSnapshot?.surfaceMenuState
            || normalizedSnapshot?.menuUiContext?.surfaceMenuState
            || resolveSurfaceMenuState(settings, {
                productSurfaceId: surfacePolicy?.productSurfaceId,
                maps: runtimeMaps,
            });
        const multiplayerSessionState = normalizedSnapshot?.multiplayerSessionState
            || this.port?.getMultiplayerSessionState?.()
            || null;
        this._activeSyncSnapshot = {
            surfacePolicy,
            surfaceMenuState,
            multiplayerSessionState,
        };
        try {
            const startSetup = ensureStartSetupLocalState(settings);
            const resolvedMultiplayerSessionState = this._getMultiplayerSessionState();
            const mapSearch = String(startSetup.mapSearch || '').trim().toLowerCase();
            const mapFilter = String(startSetup.mapFilter || 'all').toLowerCase();
            const vehicleSearch = String(startSetup.vehicleSearch || '').trim().toLowerCase();
            const vehicleFilter = String(startSetup.vehicleFilter || 'all').toLowerCase();
            const modePath = surfaceMenuState.modePath;
            const hangarSelectionModePath = this._resolveHangarSelectionModePath(settings);
            const sessionType = surfaceMenuState.sessionType;
            const multiplayerTransportUiState = this._resolveMultiplayerTransportUiState(settings);
            const sessionContract = resolveRuntimeSessionContract({
                sessionType,
                multiplayerTransport: settings?.localSettings?.multiplayerTransport,
            });
            const isMultiplayerSession = sessionType === MENU_SESSION_TYPES.MULTIPLAYER;
            const configuredArcadeGhostDuelMode = normalizeArcadeGhostDuelMode(
                startSetup.arcadeGhostDuelMode,
                ARCADE_GHOST_DUEL_MODES.OFF
            );
            startSetup.arcadeGhostDuelMode = configuredArcadeGhostDuelMode;
            const configuredArcadeGhostTrailCollisionEnabled = normalizeArcadeGhostTrailCollisionEnabled(
                startSetup.arcadeGhostTrailCollisionEnabled,
                false
            );
            startSetup.arcadeGhostTrailCollisionEnabled = configuredArcadeGhostTrailCollisionEnabled;
            const ghostDuelSelectable = sessionType === MENU_SESSION_TYPES.SINGLE;
            const effectiveArcadeGhostDuelMode = ghostDuelSelectable
                ? configuredArcadeGhostDuelMode
                : ARCADE_GHOST_DUEL_MODES.OFF;
            const ghostTrailCollisionSelectable = ghostDuelSelectable
                && isArcadeGhostDuelPlaybackEnabled(effectiveArcadeGhostDuelMode);
            const effectiveArcadeGhostTrailCollisionEnabled = ghostTrailCollisionSelectable
                && configuredArcadeGhostTrailCollisionEnabled;
            const hasActiveLobbySession = isMultiplayerSession && resolvedMultiplayerSessionState?.joined === true;
        const knownVehicleIds = new Set(this._vehiclePreviewEntries.map((entry) => entry.id));
        const appendVehicleOption = (select, vehicleId) => {
            const normalizedVehicleId = String(vehicleId || '').trim();
            if (!(select instanceof HTMLSelectElement) || !normalizedVehicleId) return;
            if (Array.from(select.options).some((option) => option.value === normalizedVehicleId)) return;
            const option = document.createElement('option');
            option.value = normalizedVehicleId;
            option.textContent = resolveVehiclePreview(normalizedVehicleId).label;
            select.appendChild(option);
        };
        const resolveVehicleSelectValue = (select, currentValue) => {
            const normalizedCurrentValue = String(currentValue || '').trim();
            if (knownVehicleIds.has(normalizedCurrentValue)) {
                appendVehicleOption(select, normalizedCurrentValue);
                return normalizedCurrentValue;
            }
            const fallbackVehicleId = this._vehiclePreviewEntries[0]?.id || 'ship5';
            appendVehicleOption(select, fallbackVehicleId);
            return fallbackVehicleId;
        };

        if (this.ui.mapSearchInput && this.ui.mapSearchInput.value !== startSetup.mapSearch) {
            this.ui.mapSearchInput.value = startSetup.mapSearch;
        }
        if (this.ui.mapFilterSelect && this.ui.mapFilterSelect.value !== startSetup.mapFilter) {
            this.ui.mapFilterSelect.value = startSetup.mapFilter;
        }
        if (this.ui.vehicleSearchInput && this.ui.vehicleSearchInput.value !== startSetup.vehicleSearch) {
            this.ui.vehicleSearchInput.value = startSetup.vehicleSearch;
        }
        if (this.ui.vehicleFilterSelect && this.ui.vehicleFilterSelect.value !== startSetup.vehicleFilter) {
            this.ui.vehicleFilterSelect.value = startSetup.vehicleFilter;
        }
        if (this.ui.arcadeGhostDuelModeSelect) {
            this.ui.arcadeGhostDuelModeSelect.value = configuredArcadeGhostDuelMode;
            this.ui.arcadeGhostDuelModeSelect.disabled = !ghostDuelSelectable;
            this.ui.arcadeGhostDuelModeSelect.title = ghostDuelSelectable
                ? 'Spielt im Einzelspieler deine laengste gespeicherte Spur ab.'
                : 'Nur im Einzelspieler aktiv.';
        }
        if (this.ui.arcadeGhostDuelModeHint) {
            if (ghostDuelSelectable) {
                this.ui.arcadeGhostDuelModeHint.textContent = `Aktiv: ${resolveArcadeGhostDuelModeLabel(configuredArcadeGhostDuelMode)}`;
            } else if (configuredArcadeGhostDuelMode === ARCADE_GHOST_DUEL_MODES.SELF_LONGEST_GHOST) {
                this.ui.arcadeGhostDuelModeHint.textContent = 'Gespeichert: Selbstduell ist aktiv, sobald Single gewaehlt ist.';
            } else {
                this.ui.arcadeGhostDuelModeHint.textContent = 'Nur im Einzelspieler aktiv.';
            }
        }
        if (this.ui.arcadeGhostTrailCollisionToggle) {
            this.ui.arcadeGhostTrailCollisionToggle.checked = configuredArcadeGhostTrailCollisionEnabled;
            this.ui.arcadeGhostTrailCollisionToggle.disabled = !ghostTrailCollisionSelectable;
            this.ui.arcadeGhostTrailCollisionToggle.title = ghostTrailCollisionSelectable
                ? 'Ghost-Spur nimmt an der normalen Trail-Kollision teil.'
                : 'Aktiv, sobald Ghost-Wiedergabe im Einzelspieler laeuft.';
        }

        if (this.ui.mapSelect) {
            const mapSelection = readHangarMapSelection(settings, 'standard', {
                modePath: hangarSelectionModePath,
            });
            const previousValue = String(mapSelection.value || surfaceMenuState.mapKey || settings.mapKey || this.ui.mapSelect.value || 'standard');
            const fallbackMapKey = this._resolveSurfaceFallbackMapKey(runtimeMaps, modePath, previousValue);
            this.ui.mapSelect.innerHTML = '';
            this._mapPreviewEntries
                .filter((entry) => {
                    const matchesSearch = !mapSearch || entry.name.toLowerCase().includes(mapSearch) || entry.key.toLowerCase().includes(mapSearch);
                    const matchesFilter = mapFilter === 'all' || entry.category === mapFilter;
                    const mapDefinition = runtimeMaps?.[entry.key];
                    const matchesModePath = isMapEligibleForModePath(mapDefinition, modePath);
                    const matchesSurfacePolicy = this._getSurfacePolicyPort().isMapAllowed(entry.key, modePath);
                    return matchesSearch && matchesFilter && matchesModePath && matchesSurfacePolicy;
                })
                .forEach((entry) => {
                    const option = document.createElement('option');
                    option.value = entry.key;
                    option.textContent = this._formatMapLabel(entry);
                    this.ui.mapSelect.appendChild(option);
                });
            if (this._hasStoredCustomMap()) {
                const option = document.createElement('option');
                option.value = 'custom';
                option.textContent = this._formatMapLabel({
                    key: 'custom',
                    name: 'Custom (lokal)',
                    hasGlbModel: true,
                });
                this.ui.mapSelect.appendChild(option);
            }
            if (this.ui.mapSelect.options.length === 0) {
                const option = document.createElement('option');
                const fallbackOptionKey = String(fallbackMapKey || previousValue || 'standard');
                option.value = fallbackOptionKey;
                option.textContent = this._formatMapLabel(resolveMapPreview(fallbackOptionKey));
                this.ui.mapSelect.appendChild(option);
            }
            const hasPreviousOption = Array.from(this.ui.mapSelect.options).some((option) => option.value === previousValue);
            const resolvedMapKey = hasPreviousOption
                ? previousValue
                : this.ui.mapSelect.options[0].value;
            this.ui.mapSelect.value = resolvedMapKey;
            writeHangarMapSelection(settings, resolvedMapKey, resolvedMapKey, {
                modePath: hangarSelectionModePath,
            });
        }
        const effectiveMapKey = String(this.ui.mapSelect?.value || surfaceMenuState.mapKey || settings.mapKey || 'standard');

        const vehicleCandidates = this._vehiclePreviewEntries.filter((entry) => {
            const matchesSearch = !vehicleSearch || entry.label.toLowerCase().includes(vehicleSearch) || entry.id.toLowerCase().includes(vehicleSearch);
            const matchesFilter = vehicleFilter === 'all' || entry.category === vehicleFilter;
            return matchesSearch && matchesFilter;
        });
        if (this.ui.vehicleSelectP1) {
            const vehicleSelection = readHangarVehicleSelection(
                settings,
                HANGAR_SELECTION_PLAYER_SLOTS.PLAYER_1,
                'ship5',
                { modePath: hangarSelectionModePath }
            );
            const currentValue = String(vehicleSelection.value || this.ui.vehicleSelectP1.value || '');
            this.ui.vehicleSelectP1.innerHTML = '';
            vehicleCandidates.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = entry.label;
                this.ui.vehicleSelectP1.appendChild(option);
            });
            const resolvedValue = resolveVehicleSelectValue(this.ui.vehicleSelectP1, currentValue);
            this.ui.vehicleSelectP1.value = resolvedValue;
            writeHangarVehicleSelection(
                settings,
                HANGAR_SELECTION_PLAYER_SLOTS.PLAYER_1,
                resolvedValue,
                resolvedValue,
                { modePath: hangarSelectionModePath }
            );
        }
        if (this.ui.vehicleSelectP2) {
            const vehicleSelection = readHangarVehicleSelection(
                settings,
                HANGAR_SELECTION_PLAYER_SLOTS.PLAYER_2,
                'ship5',
                { modePath: hangarSelectionModePath }
            );
            const currentValue = String(vehicleSelection.value || this.ui.vehicleSelectP2.value || '');
            this.ui.vehicleSelectP2.innerHTML = '';
            vehicleCandidates.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = entry.label;
                this.ui.vehicleSelectP2.appendChild(option);
            });
            const resolvedValue = resolveVehicleSelectValue(this.ui.vehicleSelectP2, currentValue);
            this.ui.vehicleSelectP2.value = resolvedValue;
            writeHangarVehicleSelection(
                settings,
                HANGAR_SELECTION_PLAYER_SLOTS.PLAYER_2,
                resolvedValue,
                resolvedValue,
                { modePath: hangarSelectionModePath }
            );
        }

        renderQuickList(
            this.ui.mapFavoritesList,
            startSetup.favoriteMaps.filter((mapKey) => this._getSurfacePolicyPort().isMapAllowed(mapKey, modePath)),
            'mapKey'
        );
        renderQuickList(
            this.ui.mapRecentList,
            startSetup.recentMaps.filter((mapKey) => this._getSurfacePolicyPort().isMapAllowed(mapKey, modePath)),
            'mapKey'
        );
        renderQuickList(this.ui.vehicleFavoritesList, startSetup.favoriteVehicles, 'vehicleId');
        renderQuickList(this.ui.vehicleRecentList, startSetup.recentVehicles, 'vehicleId');

        const surfaceEntryCopy = resolveSurfaceEntryCopy({
            productSurfaceId: this._resolveSurfacePolicy()?.productSurfaceId,
            sessionType,
        });
        const sessionLabel = surfaceEntryCopy.sessionSummaryLabels[sessionType]
            || (sessionType === MENU_SESSION_TYPES.SPLITSCREEN
                ? 'Splitscreen'
                : (sessionType === MENU_SESSION_TYPES.MULTIPLAYER ? 'Multiplayer' : 'Single Player'));
        const modeLabel = modePath === 'fight'
            ? 'Fight'
            : (modePath === 'arcade' ? 'Arcade' : (modePath === 'quick_action' ? 'Schnellstart' : 'Normal'));
        const themeLabel = String(settings?.localSettings?.themeMode || 'dunkel').toLowerCase() === 'hell' ? 'Hell' : 'Dunkel';
        const mapPreview = resolveMapPreview(effectiveMapKey);
        const vehiclePreviewP1 = resolveVehiclePreview(settings?.vehicles?.PLAYER_1);
        const vehiclePreviewP2 = resolveVehiclePreview(settings?.vehicles?.PLAYER_2);

        if (this.ui.menuSummary) {
            const summaryBlocks = [
                { label: 'Session', value: sessionLabel },
                { label: 'Spielstil', value: modeLabel },
                { label: 'Map', value: mapPreview.name },
                { label: 'P1', value: vehiclePreviewP1.label },
                {
                    label: 'Ghost',
                    value: resolveArcadeGhostDuelModeLabel(effectiveArcadeGhostDuelMode),
                    muted: !ghostDuelSelectable,
                },
                {
                    label: 'Ghost-Kollision',
                    value: effectiveArcadeGhostTrailCollisionEnabled ? 'An' : 'Aus',
                    muted: !ghostTrailCollisionSelectable,
                },
                { label: 'Ansicht', value: themeLabel },
            ];
            if (sessionType === MENU_SESSION_TYPES.SPLITSCREEN) {
                summaryBlocks.push({ label: 'P2', value: vehiclePreviewP2.label });
            }
            if (sessionType === MENU_SESSION_TYPES.MULTIPLAYER) {
                const hasCode = String(resolvedMultiplayerSessionState?.lobbyCode || this.ui.multiplayerLobbyCodeInput?.value || '').trim();
                const readySummary = hasActiveLobbySession
                    ? ` | ${resolvedMultiplayerSessionState.readyCount}/${resolvedMultiplayerSessionState.memberCount} ready`
                    : '';
                const roleSummary = hasActiveLobbySession
                    ? (resolvedMultiplayerSessionState.isHost ? 'Host' : surfaceEntryCopy.multiplayerClientRoleLabel)
                    : '';
                const connectionSummary = hasActiveLobbySession
                    ? (resolvedMultiplayerSessionState.pendingMatchCommandId
                        ? 'Startsignal gesendet'
                        : (resolvedMultiplayerSessionState.connected ? 'verbunden' : 'Warte auf Host'))
                    : '';
                summaryBlocks.push({
                    label: 'Lobby',
                    value: hasCode
                        ? [hasCode, roleSummary, connectionSummary].filter(Boolean).join(' | ') + readySummary
                        : 'nicht verbunden',
                    muted: !hasCode,
                });
                summaryBlocks.push({
                    label: 'Transport',
                    value: sessionContract.transportAudienceLabel,
                    muted: sessionContract.isLegacyTransport === true,
                });
            }
            renderSummaryBlocks(this.ui.menuSummary, summaryBlocks);
        }

        if (this.ui.mapPreview) {
            renderPreviewCard(this.ui.mapPreview, {
                title: mapPreview.name,
                badges: [
                    mapPreview.renderMode,
                    humanizePreviewCategory(mapPreview.category),
                    mapPreview.portalLevelCount > 1 ? `${mapPreview.portalLevelCount} Ebenen` : mapPreview.sizeText,
                ],
                facts: [
                    { label: 'Groesse', value: mapPreview.sizeText },
                    { label: 'Hindernisse', value: String(mapPreview.obstacleCount) },
                    { label: 'Tunnel', value: String(mapPreview.tunnelCount) },
                    { label: 'Portale', value: String(mapPreview.portalCount) },
                    { label: 'Gates', value: String(mapPreview.gateCount) },
                    { label: 'Spawns', value: String(mapPreview.spawnCount) },
                    { label: 'Items', value: String(mapPreview.itemAnchorCount) },
                    { label: 'Deko', value: String(mapPreview.aircraftCount) },
                ],
            });
        }
        if (this.ui.vehiclePreviewP1) {
            renderPreviewCard(this.ui.vehiclePreviewP1, {
                title: vehiclePreviewP1.label,
                badges: ['Pilot 1', humanizePreviewCategory(vehiclePreviewP1.category)],
                facts: [
                    { label: 'Klasse', value: humanizePreviewCategory(vehiclePreviewP1.category) },
                    { label: 'Hitbox', value: vehiclePreviewP1.hitboxRadius.toFixed(2) },
                ],
            });
        }
        if (this.ui.vehiclePreviewP2) {
            renderPreviewCard(this.ui.vehiclePreviewP2, {
                title: vehiclePreviewP2.label,
                badges: ['Pilot 2', humanizePreviewCategory(vehiclePreviewP2.category)],
                facts: [
                    { label: 'Klasse', value: humanizePreviewCategory(vehiclePreviewP2.category) },
                    { label: 'Hitbox', value: vehiclePreviewP2.hitboxRadius.toFixed(2) },
                ],
            });
        }

        if (this.ui.multiplayerInlineState) {
            this.ui.multiplayerInlineState.classList.toggle('hidden', sessionType !== MENU_SESSION_TYPES.MULTIPLAYER);
            if (this.ui.multiplayerInlineState instanceof HTMLDetailsElement) {
                this.ui.multiplayerInlineState.open = sessionType === MENU_SESSION_TYPES.MULTIPLAYER;
            }
        }
        if (Array.isArray(this.ui.multiplayerTransportButtons)) {
            this.ui.multiplayerTransportButtons.forEach((button) => {
                const transport = normalizeMultiplayerTransport(button?.dataset?.multiplayerTransport, '');
                const allowed = multiplayerTransportUiState.allowedTransports.includes(transport);
                const active = transport === multiplayerTransportUiState.selectedTransport;
                button.classList.toggle('hidden', !allowed);
                button.classList.toggle('active', active);
                button.setAttribute('aria-hidden', String(!allowed));
                button.setAttribute('aria-pressed', String(active));
                button.disabled = !allowed || (
                    transport === MULTIPLAYER_TRANSPORTS.ONLINE
                    && !multiplayerTransportUiState.onlineConfigured
                );
                if (transport === MULTIPLAYER_TRANSPORTS.ONLINE && allowed) {
                    button.title = multiplayerTransportUiState.isOnlineUnconfigured
                        ? 'Online ist nicht konfiguriert. Bitte VITE_SIGNALING_URL setzen oder LAN verwenden.'
                        : 'Online-Lobby als Internet-Pfad nutzen.';
                } else if (allowed) {
                    button.title = 'LAN als produktiven Host-/Join-Pfad nutzen.';
                } else {
                    button.title = '';
                }
            });
        }
        if (this.ui.multiplayerTransportHint) {
            this.ui.multiplayerTransportHint.textContent = multiplayerTransportUiState.isOnlineUnconfigured
                ? 'Auswahl: Online | nicht konfiguriert, bitte LAN verwenden'
                : `Produktiver Transport: ${multiplayerTransportUiState.selectedTransportLabel}`;
        }
        if (this.ui.multiplayerLobbyCodeInput) {
            if (hasActiveLobbySession) {
                this.ui.multiplayerLobbyCodeInput.value = String(resolvedMultiplayerSessionState.lobbyCode || '');
            }
            this.ui.multiplayerLobbyCodeInput.readOnly = hasActiveLobbySession;
            this.ui.multiplayerLobbyCodeInput.title = hasActiveLobbySession
                ? 'Lobby-Code wird aus der aktiven Session gelesen.'
                : '';
        }
        if (this.ui.multiplayerHostButton) {
            this.ui.multiplayerHostButton.disabled = !isMultiplayerSession
                || hasActiveLobbySession
                || multiplayerTransportUiState.isOnlineUnconfigured
                || surfaceEntryCopy?.hostActionAvailable === false;
        }
        if (this.ui.multiplayerJoinButton) {
            this.ui.multiplayerJoinButton.disabled = !isMultiplayerSession
                || hasActiveLobbySession
                || multiplayerTransportUiState.isOnlineUnconfigured;
        }
        if (this.ui.multiplayerLeaveLobbyButton) {
            this.ui.multiplayerLeaveLobbyButton.disabled = !hasActiveLobbySession;
        }
        if (this.ui.multiplayerReadyToggle) {
            this.ui.multiplayerReadyToggle.disabled = !hasActiveLobbySession;
            this.ui.multiplayerReadyToggle.checked = isMultiplayerSession
                ? resolvedMultiplayerSessionState?.localReady === true
                : false;
        }
        if (this.ui.multiplayerLobbyState) {
            const lobbyCode = String(resolvedMultiplayerSessionState?.lobbyCode || this.ui.multiplayerLobbyCodeInput?.value || '').trim();
            if (!isMultiplayerSession) {
                this.ui.multiplayerLobbyState.textContent = 'Lobbystatus: inaktiv';
            } else if (hasActiveLobbySession) {
                const roleLabel = resolvedMultiplayerSessionState.isHost
                    ? 'Host'
                    : surfaceEntryCopy.multiplayerClientRoleLabel;
                const connectionLabel = resolvedMultiplayerSessionState.pendingMatchCommandId
                    ? 'Startsignal gesendet'
                    : (resolvedMultiplayerSessionState.connected
                        ? 'verbunden'
                        : (resolvedMultiplayerSessionState.isHost ? 'Host aktiv' : 'Warte auf Host'));
                const transportSuffix = sessionContract.isLegacyTransport === true
                    ? ` | ${sessionContract.transportAudienceLabel}`
                    : '';
                this.ui.multiplayerLobbyState.textContent = `Lobbystatus: ${lobbyCode} | ${roleLabel} | ${connectionLabel} | ${resolvedMultiplayerSessionState.memberCount} Spieler | ${resolvedMultiplayerSessionState.readyCount}/${resolvedMultiplayerSessionState.memberCount} ready${transportSuffix}`;
            } else if (sessionContract.isLegacyTransport === true) {
                this.ui.multiplayerLobbyState.textContent = lobbyCode
                    ? `Lobbystatus: ${lobbyCode} | ${sessionContract.transportAudienceLabel}`
                    : 'Lobbystatus: Legacy-Fallback aktiv | lokaler Menu-Bridge-Pfad, kein produktives LAN/Online';
            } else if (multiplayerTransportUiState.isOnlineUnconfigured) {
                this.ui.multiplayerLobbyState.textContent = 'Lobbystatus: Online ausgewaehlt | nicht konfiguriert, bitte LAN verwenden';
            } else if (lobbyCode) {
                this.ui.multiplayerLobbyState.textContent = `Lobbystatus: ${lobbyCode} | ${surfaceEntryCopy.joinButtonLabel} noch nicht verbunden`;
            } else {
                this.ui.multiplayerLobbyState.textContent = `Lobbystatus: ${surfaceEntryCopy.joinButtonLabel} noch nicht verbunden | Transport: ${sessionContract.transportAudienceLabel}`;
            }
        }

        const disableTransportUnavailableActions = sessionType === MENU_SESSION_TYPES.MULTIPLAYER
            && multiplayerTransportUiState.isOnlineUnconfigured;
        if (this.ui.multiplayerHostButton) {
            const surfaceDisabled = this.ui.multiplayerHostButton.disabled === true;
            this.ui.multiplayerHostButton.disabled = surfaceDisabled || disableTransportUnavailableActions;
            if (disableTransportUnavailableActions) {
                this.ui.multiplayerHostButton.title = 'Online ist nicht konfiguriert. Bitte VITE_SIGNALING_URL setzen oder LAN verwenden.';
            }
        }
        if (this.ui.multiplayerJoinButton) {
            const surfaceDisabled = this.ui.multiplayerJoinButton.disabled === true;
            this.ui.multiplayerJoinButton.disabled = surfaceDisabled || disableTransportUnavailableActions;
            if (disableTransportUnavailableActions) {
                this.ui.multiplayerJoinButton.title = 'Online ist nicht konfiguriert. Bitte VITE_SIGNALING_URL setzen oder LAN verwenden.';
            } else {
                this.ui.multiplayerJoinButton.title = '';
            }
        }

        if (this.ui.themeModeSelect) {
            const themeMode = String(settings?.localSettings?.themeMode || 'dunkel').toLowerCase() === 'hell' ? 'hell' : 'dunkel';
            this.ui.themeModeSelect.value = themeMode;
        }

        const level4Open = !!settings?.localSettings?.toolsState?.level4Open;
        this.manager.setLevel4Open(level4Open);
        this._renderStartFieldHints(settings);
        } finally {
            this._activeSyncSnapshot = previousSyncSnapshot;
        }
    }

    // ------------------------------------------------------------------
    // Dispose
    // ------------------------------------------------------------------

    dispose() {
        this.manager._disposeDisposerList(this._startSetupDisposers);
    }
}
