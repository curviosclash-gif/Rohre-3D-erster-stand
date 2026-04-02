// ============================================
// UIStartSyncController.js
// Start-Setup, Preview-Cards, Summary-Rendering und Validierungs-Hints
// Extrahiert aus UIManager.js (V38 Phase 38.3.1)
// ============================================

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
    ensureStartSetupLocalState,
    humanizePreviewCategory,
    pushRecentEntry,
    renderPreviewCard,
    renderQuickList,
    renderSummaryBlocks,
    toggleFavoriteEntry,
} from './start-setup/StartSetupUiOps.js';
import {
    formatStartSetupMapLabel,
    renderStartFieldHints,
} from './start-setup/StartSetupValidationView.js';
import { resolveGameplayConfig } from '../shared/contracts/GameplayConfigContract.js';

export class UIStartSyncController {
    /**
     * @param {{ ui: object, game: object, manager: object }} options
     */
    constructor({ ui, game, manager }) {
        this.ui = ui;
        this.game = game;
        this.manager = manager;
        this._mapPreviewEntries = listMapPreviewEntries();
        this._vehiclePreviewEntries = listVehiclePreviewEntries();
        this._startSetupDisposers = [];
        this._startValidationIssue = null;
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
        if (!select) return;
        const maps = resolveGameplayConfig(this.game).MAPS || {};

        const modePath = String(this.game?.settings?.localSettings?.modePath || 'normal').toLowerCase();
        const currentValue = String(select.value || this.game.settings?.mapKey || 'standard');
        const fallbackMapKey = resolveModePathFallbackMapKey(maps, modePath, currentValue);
        select.innerHTML = '';

        Object.entries(maps).forEach(([key, mapDef]) => {
            if (!isMapEligibleForModePath(mapDef, modePath)) {
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

        if (maps?.[currentValue] && isMapEligibleForModePath(maps[currentValue], modePath)) {
            select.value = currentValue;
        } else if (maps?.[fallbackMapKey]) {
            select.value = fallbackMapKey;
        }
    }

    setupStartSetupControls() {
        const settings = this.game.settings;
        const startSetup = ensureStartSetupLocalState(settings);
        const listen = (target, type, handler) => this.manager._listen(target, type, handler, undefined, this._startSetupDisposers);

        const mapSearchInput = this.ui.mapSearchInput;
        const mapFilterSelect = this.ui.mapFilterSelect;
        const vehicleSearchInput = this.ui.vehicleSearchInput;
        const vehicleFilterSelect = this.ui.vehicleFilterSelect;
        const mapFavoriteToggleButton = this.ui.mapFavoriteToggleButton;
        const vehicleFavoriteToggleButton = this.ui.vehicleFavoriteToggleButton;

        if (mapSearchInput) {
            mapSearchInput.value = startSetup.mapSearch;
            listen(mapSearchInput, 'input', () => {
                startSetup.mapSearch = String(mapSearchInput.value || '');
                this.syncStartSetupState(settings);
            });
        }
        if (mapFilterSelect) {
            mapFilterSelect.value = startSetup.mapFilter;
            listen(mapFilterSelect, 'change', () => {
                startSetup.mapFilter = String(mapFilterSelect.value || 'all');
                this.syncStartSetupState(settings);
            });
        }
        if (vehicleSearchInput) {
            vehicleSearchInput.value = startSetup.vehicleSearch;
            listen(vehicleSearchInput, 'input', () => {
                startSetup.vehicleSearch = String(vehicleSearchInput.value || '');
                this.syncStartSetupState(settings);
            });
        }
        if (vehicleFilterSelect) {
            vehicleFilterSelect.value = startSetup.vehicleFilter;
            listen(vehicleFilterSelect, 'change', () => {
                startSetup.vehicleFilter = String(vehicleFilterSelect.value || 'all');
                this.syncStartSetupState(settings);
            });
        }

        if (this.ui.mapSelect) {
            listen(this.ui.mapSelect, 'change', () => {
                const currentStartSetup = ensureStartSetupLocalState(this.game.settings);
                const selectedMapKey = String(this.ui.mapSelect.value || '').trim();
                if (selectedMapKey) {
                    this.game.settings.mapKey = selectedMapKey;
                }
                pushRecentEntry(currentStartSetup.recentMaps, this.ui.mapSelect.value);
            });
        }
        if (this.ui.vehicleSelectP1) {
            listen(this.ui.vehicleSelectP1, 'change', () => {
                const currentStartSetup = ensureStartSetupLocalState(this.game.settings);
                pushRecentEntry(currentStartSetup.recentVehicles, this.ui.vehicleSelectP1.value);
            });
        }
        if (this.ui.vehicleSelectP2) {
            listen(this.ui.vehicleSelectP2, 'change', () => {
                const currentStartSetup = ensureStartSetupLocalState(this.game.settings);
                pushRecentEntry(currentStartSetup.recentVehicles, this.ui.vehicleSelectP2.value);
            });
        }

        if (mapFavoriteToggleButton) {
            listen(mapFavoriteToggleButton, 'click', () => {
                const currentStartSetup = ensureStartSetupLocalState(this.game.settings);
                toggleFavoriteEntry(currentStartSetup.favoriteMaps, this.ui.mapSelect?.value);
                this.syncStartSetupState(this.game.settings);
            });
        }
        if (vehicleFavoriteToggleButton) {
            listen(vehicleFavoriteToggleButton, 'click', () => {
                const currentStartSetup = ensureStartSetupLocalState(this.game.settings);
                toggleFavoriteEntry(currentStartSetup.favoriteVehicles, this.ui.vehicleSelectP1?.value);
                this.syncStartSetupState(this.game.settings);
            });
        }

        if (this.ui.mapFavoritesList) {
            listen(this.ui.mapFavoritesList, 'click', (event) => {
                const button = event.target.closest('button[data-map-key]');
                if (!button || !this.ui.mapSelect) return;
                this.ui.mapSelect.value = button.dataset.mapKey;
                this.ui.mapSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
        if (this.ui.mapRecentList) {
            listen(this.ui.mapRecentList, 'click', (event) => {
                const button = event.target.closest('button[data-map-key]');
                if (!button || !this.ui.mapSelect) return;
                this.ui.mapSelect.value = button.dataset.mapKey;
                this.ui.mapSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
        if (this.ui.vehicleFavoritesList) {
            listen(this.ui.vehicleFavoritesList, 'click', (event) => {
                const button = event.target.closest('button[data-vehicle-id]');
                if (!button || !this.ui.vehicleSelectP1) return;
                this.ui.vehicleSelectP1.value = button.dataset.vehicleId;
                this.ui.vehicleSelectP1.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
        if (this.ui.vehicleRecentList) {
            listen(this.ui.vehicleRecentList, 'click', (event) => {
                const button = event.target.closest('button[data-vehicle-id]');
                if (!button || !this.ui.vehicleSelectP1) return;
                this.ui.vehicleSelectP1.value = button.dataset.vehicleId;
                this.ui.vehicleSelectP1.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
    }

    // ------------------------------------------------------------------
    // Interne Hilfsm­ethoden (Field-Hints und Labels)
    // ------------------------------------------------------------------

    _formatMapLabel(entry = {}) {
        return formatStartSetupMapLabel(entry);
    }

    _renderStartFieldHints(settings = this.game.settings, options = {}) {
        renderStartFieldHints({
            ui: this.ui,
            settings,
            settingsManager: this.game?.settingsManager,
            startValidationIssue: this._startValidationIssue,
            focusField: options.focusField === true,
            onOpenSection: (sectionId) => this.manager?._setStartSectionOpen?.(sectionId, true),
        });
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
        this._renderStartFieldHints(this.game.settings, { focusField: options.focusField !== false });
    }

    clearStartValidationError() {
        if (!this._startValidationIssue) return;
        this._startValidationIssue = null;
        this._renderStartFieldHints(this.game.settings);
    }

    // ------------------------------------------------------------------
    // Sync-Methoden
    // ------------------------------------------------------------------

    syncStartSetupState(settings = this.game.settings) {
        const startSetup = ensureStartSetupLocalState(settings);
        const multiplayerSessionState = this.game?.menuMultiplayerBridge?.getSessionState?.() || null;
        const mapSearch = String(startSetup.mapSearch || '').trim().toLowerCase();
        const mapFilter = String(startSetup.mapFilter || 'all').toLowerCase();
        const vehicleSearch = String(startSetup.vehicleSearch || '').trim().toLowerCase();
        const vehicleFilter = String(startSetup.vehicleFilter || 'all').toLowerCase();
        const modePath = String(settings?.localSettings?.modePath || 'normal').toLowerCase();
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

        if (this.ui.mapSelect) {
            const previousValue = String(settings.mapKey || this.ui.mapSelect.value || 'standard');
            this.ui.mapSelect.innerHTML = '';
            this._mapPreviewEntries
                .filter((entry) => {
                    const matchesSearch = !mapSearch || entry.name.toLowerCase().includes(mapSearch) || entry.key.toLowerCase().includes(mapSearch);
                    const matchesFilter = mapFilter === 'all' || entry.category === mapFilter;
                    const mapDefinition = CONFIG?.MAPS?.[entry.key];
                    const matchesModePath = isMapEligibleForModePath(mapDefinition, modePath);
                    return matchesSearch && matchesFilter && matchesModePath;
                })
                .forEach((entry) => {
                    const option = document.createElement('option');
                    option.value = entry.key;
                    option.textContent = this._formatMapLabel(entry);
                    this.ui.mapSelect.appendChild(option);
                });
            if (this.ui.mapSelect.options.length === 0) {
                const option = document.createElement('option');
                option.value = previousValue;
                option.textContent = previousValue;
                this.ui.mapSelect.appendChild(option);
            }
            const hasPreviousOption = Array.from(this.ui.mapSelect.options).some((option) => option.value === previousValue);
            this.ui.mapSelect.value = hasPreviousOption
                ? previousValue
                : this.ui.mapSelect.options[0].value;
        }

        const vehicleCandidates = this._vehiclePreviewEntries.filter((entry) => {
            const matchesSearch = !vehicleSearch || entry.label.toLowerCase().includes(vehicleSearch) || entry.id.toLowerCase().includes(vehicleSearch);
            const matchesFilter = vehicleFilter === 'all' || entry.category === vehicleFilter;
            return matchesSearch && matchesFilter;
        });
        if (this.ui.vehicleSelectP1) {
            const currentValue = String(settings?.vehicles?.PLAYER_1 || this.ui.vehicleSelectP1.value || '');
            this.ui.vehicleSelectP1.innerHTML = '';
            vehicleCandidates.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = entry.label;
                this.ui.vehicleSelectP1.appendChild(option);
            });
            const resolvedValue = resolveVehicleSelectValue(this.ui.vehicleSelectP1, currentValue);
            this.ui.vehicleSelectP1.value = resolvedValue;
        }
        if (this.ui.vehicleSelectP2) {
            const currentValue = String(settings?.vehicles?.PLAYER_2 || this.ui.vehicleSelectP2.value || '');
            this.ui.vehicleSelectP2.innerHTML = '';
            vehicleCandidates.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = entry.label;
                this.ui.vehicleSelectP2.appendChild(option);
            });
            const resolvedValue = resolveVehicleSelectValue(this.ui.vehicleSelectP2, currentValue);
            this.ui.vehicleSelectP2.value = resolvedValue;
        }

        renderQuickList(this.ui.mapFavoritesList, startSetup.favoriteMaps, 'mapKey');
        renderQuickList(this.ui.mapRecentList, startSetup.recentMaps, 'mapKey');
        renderQuickList(this.ui.vehicleFavoritesList, startSetup.favoriteVehicles, 'vehicleId');
        renderQuickList(this.ui.vehicleRecentList, startSetup.recentVehicles, 'vehicleId');

        const sessionType = String(settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE).toLowerCase();
        const sessionLabel = sessionType === MENU_SESSION_TYPES.SPLITSCREEN
            ? 'Splitscreen'
            : (sessionType === MENU_SESSION_TYPES.MULTIPLAYER ? 'Multiplayer' : 'Single Player');
        const modeLabel = modePath === 'fight'
            ? 'Fight'
            : (modePath === 'arcade' ? 'Arcade' : (modePath === 'quick_action' ? 'Schnellstart' : 'Normal'));
        const themeLabel = String(settings?.localSettings?.themeMode || 'dunkel').toLowerCase() === 'hell' ? 'Hell' : 'Dunkel';
        const mapPreview = resolveMapPreview(settings.mapKey);
        const vehiclePreviewP1 = resolveVehiclePreview(settings?.vehicles?.PLAYER_1);
        const vehiclePreviewP2 = resolveVehiclePreview(settings?.vehicles?.PLAYER_2);

        if (this.ui.menuSummary) {
            const summaryBlocks = [
                { label: 'Session', value: sessionLabel },
                { label: 'Spielstil', value: modeLabel },
                { label: 'Map', value: mapPreview.name },
                { label: 'P1', value: vehiclePreviewP1.label },
                { label: 'Ansicht', value: themeLabel },
            ];
            if (sessionType === MENU_SESSION_TYPES.SPLITSCREEN) {
                summaryBlocks.push({ label: 'P2', value: vehiclePreviewP2.label });
            }
            if (sessionType === MENU_SESSION_TYPES.MULTIPLAYER) {
                const hasCode = String(multiplayerSessionState?.lobbyCode || this.ui.multiplayerLobbyCodeInput?.value || '').trim();
                const readySummary = multiplayerSessionState?.joined
                    ? ` (${multiplayerSessionState.readyCount}/${multiplayerSessionState.memberCount} ready)`
                    : '';
                summaryBlocks.push({
                    label: 'Lobby',
                    value: hasCode ? `${hasCode}${readySummary}` : 'nicht verbunden',
                    muted: !hasCode,
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
        if (this.ui.multiplayerLobbyCodeInput && multiplayerSessionState?.joined) {
            this.ui.multiplayerLobbyCodeInput.value = String(multiplayerSessionState.lobbyCode || '');
        }
        if (this.ui.multiplayerReadyToggle) {
            this.ui.multiplayerReadyToggle.disabled = sessionType !== MENU_SESSION_TYPES.MULTIPLAYER || multiplayerSessionState?.joined !== true;
            this.ui.multiplayerReadyToggle.checked = sessionType === MENU_SESSION_TYPES.MULTIPLAYER
                ? multiplayerSessionState?.localReady === true
                : false;
        }
        if (this.ui.multiplayerLobbyState) {
            const lobbyCode = String(multiplayerSessionState?.lobbyCode || this.ui.multiplayerLobbyCodeInput?.value || '').trim();
            if (sessionType !== MENU_SESSION_TYPES.MULTIPLAYER) {
                this.ui.multiplayerLobbyState.textContent = 'Lobbystatus: inaktiv';
            } else if (multiplayerSessionState?.joined) {
                this.ui.multiplayerLobbyState.textContent = `Lobbystatus: ${lobbyCode} | ${multiplayerSessionState.memberCount} Spieler | ${multiplayerSessionState.readyCount}/${multiplayerSessionState.memberCount} ready`;
            } else if (lobbyCode) {
                this.ui.multiplayerLobbyState.textContent = `Lobbystatus: ${lobbyCode} noch nicht verbunden`;
            } else {
                this.ui.multiplayerLobbyState.textContent = 'Lobbystatus: nicht verbunden';
            }
        }

        if (this.ui.themeModeSelect) {
            const themeMode = String(settings?.localSettings?.themeMode || 'dunkel').toLowerCase() === 'hell' ? 'hell' : 'dunkel';
            this.ui.themeModeSelect.value = themeMode;
        }

        const level4Open = !!settings?.localSettings?.toolsState?.level4Open;
        this.manager.setLevel4Open(level4Open);
        this._renderStartFieldHints(settings);
    }

    // ------------------------------------------------------------------
    // Dispose
    // ------------------------------------------------------------------

    dispose() {
        this.manager._disposeDisposerList(this._startSetupDisposers);
    }
}
