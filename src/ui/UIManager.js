// ============================================
// UIManager.js - Schlanke Fassade (V38 Phase 38.3)
// Orchestriert UIStartSyncController und UINavigationLifecycleController.
// Eigene Verantwortung: Sync-Methoden (modes, map, bots, rules, gameplay, vehicles, session)
//                       sowie dev-text-catalog und disposer-Infrastruktur.
// ============================================

import { CONFIG } from '../core/Config.js';
import { GAME_MODE_TYPES, resolveActiveGameMode } from '../hunt/HuntMode.js';
import { isSettingsChangeKey, normalizeSettingsChangeKeys } from './SettingsChangeKeys.js';
import { resolveSyncMethodNamesForChangeKeys } from './UISettingsSyncMap.js';
import { createMenuSchema } from './menu/MenuSchema.js';
import { MenuPanelRegistry } from './menu/MenuPanelRegistry.js';
import { resolveMenuAccessContext } from './menu/MenuAccessPolicy.js';
import { ensureMenuContractState, MENU_SESSION_TYPES } from './menu/MenuStateContracts.js';
import { MenuStateMachine, MENU_STATE_IDS } from './menu/MenuStateMachine.js';
import { listMenuTextCatalogEntries } from './menu/MenuTextCatalog.js';
import { MenuTextRuntime } from './menu/MenuTextRuntime.js';
import { DEFAULT_SHADOW_QUALITY, normalizeShadowQuality, resolveShadowQualityLabel } from '../shared/contracts/ShadowQualityContract.js';
import {
    createDefaultRecordingCaptureSettings,
    normalizeRecordingCaptureSettings,
    RECORDING_CAPTURE_PROFILE,
    RECORDING_HUD_MODE,
} from '../shared/contracts/RecordingCaptureContract.js';
import { syncMenuPresetState } from './menu/MenuPresetStateSync.js';
import { syncMenuDeveloperState } from './menu/MenuDeveloperStateSync.js';
import { syncFightMenuTuningUi } from './menu/FightMenuTuningSync.js';
import { UIStartSyncController } from './UIStartSyncController.js';
import { UINavigationLifecycleController } from './UINavigationLifecycleController.js';

export class UIManager {
    constructor(deps = {}) {
        const game = deps.game || null;
        this.game = game;
        this.ports = deps.ports || null;
        this.ui = game?.ui;
        this.settings = game?.settings;
        ensureMenuContractState(this.settings);

        this._navButtons = game?._navButtons || [];
        this._menuButtonByPanel = game?._menuButtonByPanel || new Map();
        this._lastMenuTrigger = game?._lastMenuTrigger || null;
        this._submenuPanels = [];
        this._accessContext = resolveMenuAccessContext(this.settings);
        this.menuSchema = game?.menuSchema && typeof game.menuSchema === 'object'
            ? game.menuSchema
            : createMenuSchema({ featureFlags: this.settings?.menuFeatureFlags });
        this.menuPanelRegistry = game?.menuPanelRegistry instanceof MenuPanelRegistry
            ? game.menuPanelRegistry
            : new MenuPanelRegistry(this.menuSchema);
        this.menuStateMachine = game?.menuStateMachine instanceof MenuStateMachine
            ? game.menuStateMachine
            : new MenuStateMachine({ initialState: MENU_STATE_IDS.MAIN });
        this.menuNavigationRuntime = null;
        this.menuExpertLoginRuntime = game?.menuExpertLoginRuntime || null;
        this._uiDisposers = [];
        this._developerNavButtons = Array.from(document.querySelectorAll(
            '[data-submenu="submenu-developer"], [data-menu-target="submenu-developer"], [data-menu-step-target="submenu-developer"]'
        ));
        this._debugNavButtons = Array.from(document.querySelectorAll(
            '[data-submenu="submenu-debug"], [data-menu-target="submenu-debug"], [data-menu-step-target="submenu-debug"]'
        ));
        this._developerPanel = document.getElementById('submenu-developer');
        this._debugHintNodes = Array.isArray(this.ui.debugHints) ? this.ui.debugHints : [];
        this.menuTextRuntime = game?.menuTextRuntime instanceof MenuTextRuntime
            ? game.menuTextRuntime
            : new MenuTextRuntime({ overrideStore: game.settingsManager?.menuTextOverrideStore });
        if (game) {
            game.menuSchema = this.menuSchema;
            game.menuPanelRegistry = this.menuPanelRegistry;
            game.menuStateMachine = this.menuStateMachine;
            game.menuTextRuntime = this.menuTextRuntime;
        }

        // Sub-Controller
        this._startSync = new UIStartSyncController({ ui: this.ui, game, manager: this });
        this._navLifecycle = new UINavigationLifecycleController({ ui: this.ui, game, manager: this });
    }

    // ------------------------------------------------------------------
    // Init
    // ------------------------------------------------------------------

    init() {
        this._startSync.setupVehicleSelects();
        this._startSync.setupMapSelect();
        this._startSync.setupStartSetupControls();
        this._navLifecycle.setupMenuNavigation();
        this._navLifecycle.setupExpertLoginBindings();
        if (this.menuExpertLoginRuntime) {
            this.menuExpertLoginRuntime.onStateChanged = () => this._navLifecycle.handleExpertStateChanged();
            this.menuExpertLoginRuntime.bindUi(this.ui);
        }
        this.syncAll();
        this.updateContext();
    }

    // ------------------------------------------------------------------
    // Disposer-Infrastruktur (wird von Sub-Controllern genutzt)
    // ------------------------------------------------------------------

    _pushDisposer(disposer, list = this._uiDisposers) {
        if (typeof disposer !== 'function') return;
        list.push(disposer);
    }

    _listen(target, type, handler, options = undefined, list = this._uiDisposers) {
        if (!target?.addEventListener || typeof handler !== 'function') return;
        target.addEventListener(type, handler, options);
        this._pushDisposer(() => target.removeEventListener(type, handler, options), list);
    }

    _disposeDisposerList(list) {
        while (Array.isArray(list) && list.length > 0) {
            const dispose = list.pop();
            try { dispose?.(); } catch { /* ignore teardown failures */ }
        }
    }

    // ------------------------------------------------------------------
    // Lazy-Setup-Guards (bleiben hier, da sie nur UIManager-internen Zustand brauchen)
    // ------------------------------------------------------------------

    _ensureLevel4SectionControlsSetup() {
        this._navLifecycle.ensureLevel4SectionControlsSetup();
    }

    _ensureDeveloperTextCatalogSetup() {
        this._navLifecycle.ensureDeveloperTextCatalogSetup();
    }

    _setupDeveloperTextCatalog() {
        const select = this.ui.developerTextIdSelect;
        if (!select) return;

        const entries = listMenuTextCatalogEntries().sort((left, right) => left.id.localeCompare(right.id, 'de'));
        const previousValue = String(select.value || '');
        select.innerHTML = '';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Bitte Text-ID waehlen';
        select.appendChild(placeholderOption);

        entries.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.id;
            option.textContent = `${entry.id} -> ${entry.text}`;
            select.appendChild(option);
        });

        const hasPreviousValue = entries.some((entry) => entry.id === previousValue);
        if (hasPreviousValue) select.value = previousValue;
        this._listen(select, 'change', () => {
            const selectedTextId = String(select.value || '').trim();
            if (!this.ui.developerTextOverrideInput) return;
            const overrideValue = this.game.settingsManager?.menuTextOverrideStore?.getOverride?.(selectedTextId) || '';
            this.ui.developerTextOverrideInput.value = overrideValue;
        });
    }

    // ------------------------------------------------------------------
    // Delegations zu Sub-Controllern (public API bleibt erhalten)
    // ------------------------------------------------------------------

    // Navigation & Level4
    showMainNav()                          { return this._navLifecycle.showMainNav(); }
    setLevel4Open(isOpen)                  { return this._navLifecycle.setLevel4Open(isOpen); }
    setLevel4Section(sectionId, options)   { return this._navLifecycle.setLevel4Section(sectionId, options); }
    showToast(message, durationOrTone, tone) { return this._navLifecycle.showToast(message, durationOrTone, tone); }
    updateContext()                        { return this._navLifecycle.updateContext(); }

    // Interne Methoden die von StartSyncController zurück gerufen werden
    _setStartSectionOpen(sectionId, open)  { return this._navLifecycle._setStartSectionOpen(sectionId, open); }
    _syncDeveloperReleaseCutVisibility(settings, releaseState) {
        return this._navLifecycle.syncDeveloperReleaseCutVisibility(settings, releaseState);
    }

    // Start / Validierung
    showStartValidationError(issue, opts)  { return this._startSync.showStartValidationError(issue, opts); }
    clearStartValidationError()            { return this._startSync.clearStartValidationError(); }

    // ------------------------------------------------------------------
    // syncAll / syncByChangeKeys
    // ------------------------------------------------------------------

    syncAll() {
        const settings = this.game.settings;
        this.syncSessionState(settings);
        this.syncModes(settings);
        this.syncMap(settings);
        this.syncBots(settings);
        this.syncRules(settings);
        this.syncGameplay(settings);
        this.syncVehicles(settings);
        this.syncStartSetupState(settings);
        this.syncPresetState(settings);
        this.syncMultiplayerState(settings);
        this.syncDeveloperState(settings);
    }

    syncByChangeKeys(changedKeys) {
        if (!Array.isArray(changedKeys) || changedKeys.length === 0) {
            this.syncAll();
            return;
        }
        for (const rawKey of changedKeys) {
            const key = typeof rawKey === 'string' ? rawKey.trim() : '';
            if (!key || !isSettingsChangeKey(key)) {
                this.syncAll();
                return;
            }
        }
        const normalizedKeys = normalizeSettingsChangeKeys(changedKeys);
        if (normalizedKeys.length === 0) { this.syncAll(); return; }

        const syncMethodNames = resolveSyncMethodNamesForChangeKeys(normalizedKeys);
        if (syncMethodNames.length === 0) { this.syncAll(); return; }

        for (const methodName of syncMethodNames) {
            const syncMethod = this[methodName];
            if (typeof syncMethod !== 'function') { this.syncAll(); return; }
            syncMethod.call(this);
        }
    }

    // ------------------------------------------------------------------
    // Sync-Methoden (verbleiben im UIManager – einfache DOM-Syncs)
    // ------------------------------------------------------------------

    syncSessionState(settings = this.game.settings) {
        const ui = this.ui;
        const huntFeatureEnabled = CONFIG.HUNT?.ENABLED !== false;
        const sessionType = String(settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE).toLowerCase();
        const modePath = String(settings?.localSettings?.modePath || 'normal').toLowerCase();
        if (Array.isArray(ui.sessionButtons)) {
            ui.sessionButtons.forEach((button) => {
                const buttonSessionType = String(button?.dataset?.sessionType || '').trim().toLowerCase();
                const isActive = buttonSessionType === sessionType;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
        }
        if (Array.isArray(ui.modePathButtons)) {
            ui.modePathButtons.forEach((button) => {
                const buttonModePath = String(button?.dataset?.modePath || '').trim().toLowerCase();
                const isActive = buttonModePath === modePath;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
                const isFightPath = buttonModePath === 'fight';
                button.disabled = isFightPath && !huntFeatureEnabled;
                button.title = button.disabled ? 'Fight ist per Feature-Flag deaktiviert' : '';
            });
        }
        const themeMode = String(settings?.localSettings?.themeMode || 'dunkel').toLowerCase() === 'hell'
            ? 'hell'
            : 'dunkel';
        if (this.ui.mainMenu) {
            this.ui.mainMenu.setAttribute('data-menu-local-theme', themeMode);
        }
        this.syncStartSetupState(settings);
    }

    syncModes(settings = this.game.settings) {
        const ui = this.ui;
        const sessionType = String(settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE).toLowerCase();
        const effectiveMode = sessionType === MENU_SESSION_TYPES.SPLITSCREEN ? '2p' : '1p';

        if (Array.isArray(ui.modeButtons)) {
            ui.modeButtons.forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.mode === effectiveMode);
            });
        }
        if (ui.vehicleP2Container) {
            ui.vehicleP2Container.classList.toggle('hidden', effectiveMode !== '2p');
        }

        const huntFeatureEnabled = CONFIG.HUNT?.ENABLED !== false;
        const resolvedGameMode = resolveActiveGameMode(settings.gameMode, huntFeatureEnabled);
        const huntRespawnEnabled = resolvedGameMode === GAME_MODE_TYPES.HUNT
            ? !!settings?.hunt?.respawnEnabled
            : false;

        if (Array.isArray(ui.gameModeButtons)) {
            ui.gameModeButtons.forEach((btn) => {
                const buttonMode = resolveActiveGameMode(btn.dataset.gameMode, huntFeatureEnabled);
                const isHuntButton = buttonMode === GAME_MODE_TYPES.HUNT;
                btn.classList.toggle('active', buttonMode === resolvedGameMode);
                btn.disabled = isHuntButton && !huntFeatureEnabled;
                btn.title = btn.disabled ? 'Hunt-Modus ist per Feature-Flag deaktiviert' : '';
            });
        }
        if (ui.huntRespawnRow) {
            ui.huntRespawnRow.classList.toggle('hidden', resolvedGameMode !== GAME_MODE_TYPES.HUNT);
        }
        if (ui.huntRespawnToggle) {
            ui.huntRespawnToggle.checked = huntRespawnEnabled;
            ui.huntRespawnToggle.disabled = resolvedGameMode !== GAME_MODE_TYPES.HUNT;
        }
    }

    syncMap(settings = this.game.settings) {
        if (this.ui.mapSelect) {
            this.ui.mapSelect.value = settings.mapKey;
        }
        this.syncStartSetupState(settings);
    }

    syncBots(settings = this.game.settings) {
        const ui = this.ui;
        ui.botSlider.value = settings.numBots;
        ui.botLabel.textContent = settings.numBots;
        if (ui.botDifficultySelect) ui.botDifficultySelect.value = settings.botDifficulty;
    }

    syncRules(settings = this.game.settings) {
        const ui = this.ui;
        ui.winSlider.value = settings.winsNeeded;
        ui.winLabel.textContent = settings.winsNeeded;
        ui.autoRollToggle.checked = !!settings.autoRoll;
        ui.invertP1.checked = !!settings.invertPitch.PLAYER_1;
        ui.invertP2.checked = !!settings.invertPitch.PLAYER_2;
        ui.cockpitCamP1.checked = !!settings.cockpitCamera.PLAYER_1;
        ui.cockpitCamP2.checked = !!settings.cockpitCamera.PLAYER_2;
        ui.portalsToggle.checked = !!settings.portalsEnabled;
    }

    syncGameplay(settings = this.game.settings) {
        const ui = this.ui;
        const gp = settings.gameplay;
        ui.speedSlider.value = gp.speed;
        ui.speedLabel.textContent = `${gp.speed} m/s`;
        ui.turnSlider.value = gp.turnSensitivity;
        ui.turnLabel.textContent = gp.turnSensitivity.toFixed(1);
        ui.planeSizeSlider.value = gp.planeScale;
        ui.planeSizeLabel.textContent = gp.planeScale.toFixed(1);
        ui.trailWidthSlider.value = gp.trailWidth;
        ui.trailWidthLabel.textContent = gp.trailWidth.toFixed(1);
        ui.gapSizeSlider.value = gp.gapSize;
        ui.gapSizeLabel.textContent = gp.gapSize.toFixed(2);
        ui.gapFrequencySlider.value = gp.gapFrequency;
        ui.gapFrequencyLabel.textContent = (gp.gapFrequency * 100).toFixed(0) + '%';
        ui.itemAmountSlider.value = gp.itemAmount;
        ui.itemAmountLabel.textContent = gp.itemAmount;
        ui.fireRateSlider.value = gp.fireRate;
        ui.fireRateLabel.textContent = gp.fireRate.toFixed(2) + 's';
        ui.lockOnSlider.value = gp.lockOnAngle;
        const mgTrailAimRadius = Number.isFinite(Number(gp.mgTrailAimRadius))
            ? Number(gp.mgTrailAimRadius)
            : Math.max(0.2, Number(CONFIG?.HUNT?.MG?.TRAIL_HIT_RADIUS) || 0.78);
        if (ui.mgTrailAimSlider) ui.mgTrailAimSlider.value = mgTrailAimRadius;
        if (ui.mgTrailAimLabel) ui.mgTrailAimLabel.textContent = mgTrailAimRadius.toFixed(2);
        syncFightMenuTuningUi({ ui, settings, gameplay: gp, config: CONFIG });
        const shadowQuality = normalizeShadowQuality(settings?.localSettings?.shadowQuality, DEFAULT_SHADOW_QUALITY);
        if (ui.shadowQualitySlider) ui.shadowQualitySlider.value = String(shadowQuality);
        if (ui.shadowQualityLabel) ui.shadowQualityLabel.textContent = resolveShadowQualityLabel(shadowQuality);
        ui.lockOnLabel.textContent = gp.lockOnAngle + '\u00B0';
        const recordingSettings = normalizeRecordingCaptureSettings(
            settings?.recording,
            createDefaultRecordingCaptureSettings()
        );
        if (ui.recordingProfileSelect) {
            ui.recordingProfileSelect.value = recordingSettings.profile;
        }
        if (ui.recordingHudModeSelect) {
            ui.recordingHudModeSelect.value = recordingSettings.hudMode;
        }
        if (ui.recordingProfileHint) {
            const profileLabel = recordingSettings.profile === RECORDING_CAPTURE_PROFILE.YOUTUBE_SHORT
                ? 'YouTube Shorts'
                : 'Standard';
            const hudLabel = recordingSettings.hudMode === RECORDING_HUD_MODE.WITH_HUD
                ? 'mit HUD'
                : 'clean';
            ui.recordingProfileHint.textContent = `Aufnahmeprofil: ${profileLabel} - HUD: ${hudLabel}`;
        }

        if (ui.planarModeToggle) ui.planarModeToggle.checked = !!gp.planarMode;
        if (Array.isArray(ui.dimensionModeButtons)) {
            ui.dimensionModeButtons.forEach((button) => {
                const planarRaw = String(button?.dataset?.planarMode || '').trim().toLowerCase();
                const buttonPlanarMode = planarRaw === 'true' || planarRaw === '1' || planarRaw === 'yes';
                const isActive = buttonPlanarMode === !!gp.planarMode;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
        }
    }

    syncVehicles(settings = this.game.settings) {
        const ui = this.ui;
        if (ui.vehicleSelectP1) ui.vehicleSelectP1.value = settings.vehicles.PLAYER_1;
        if (ui.vehicleSelectP2) ui.vehicleSelectP2.value = settings.vehicles.PLAYER_2;
        this.syncStartSetupState(settings);
    }

    // Delegiert an UIStartSyncController
    syncStartSetupState(settings = this.game.settings) { return this._startSync.syncStartSetupState(settings); }

    syncPresetState(settings = this.game.settings) {
        syncMenuPresetState({ ui: this.ui, settings, settingsManager: this.game.settingsManager });
    }

    syncMultiplayerState(settings = this.game.settings) {
        if (!this.ui.multiplayerStatus) return;
        const sessionType = String(settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE).toLowerCase();
        const sessionState = this.game?.menuMultiplayerBridge?.getSessionState?.() || null;
        const activePresetId = String(settings?.matchSettings?.activePresetId || '');
        const presetText = activePresetId ? ` | Preset: ${activePresetId}` : '';
        if (sessionType !== MENU_SESSION_TYPES.MULTIPLAYER) {
            this.ui.multiplayerStatus.textContent = `Lobby inaktiv${presetText}`;
            if (this.ui.startButton) { this.ui.startButton.disabled = false; this.ui.startButton.title = ''; }
            return;
        }
        if (!sessionState?.joined) {
            this.ui.multiplayerStatus.textContent = `Lobby offline | Rolle: nicht verbunden${presetText}`;
            if (this.ui.startButton) {
                this.ui.startButton.disabled = false;
                this.ui.startButton.title = 'Lobby hosten oder joinen, bevor gestartet wird.';
            }
            return;
        }
        const role = sessionState.isHost ? 'Host' : 'Client';
        const startStatus = sessionState.canStart
            ? 'Start bereit'
            : (sessionState.isHost ? 'Warte auf Ready' : 'Warte auf Host');
        this.ui.multiplayerStatus.textContent = `Lobby live | Rolle: ${role} | ${sessionState.readyCount}/${sessionState.memberCount} ready | ${startStatus}${presetText}`;
        if (this.ui.startButton) {
            this.ui.startButton.disabled = false;
            this.ui.startButton.title = sessionState.canStart
                ? ''
                : (sessionState.isHost
                    ? 'Alle Teilnehmer muessen Ready sein und mindestens 2 Spieler verbunden sein.'
                    : 'Nur der Host kann das Match starten.');
        }
    }

    syncDeveloperState(settings = this.game.settings) {
        const releaseState = this._navLifecycle._resolveDeveloperReleaseState(settings);
        syncMenuDeveloperState({
            ui: this.ui,
            settings,
            settingsManager: this.game.settingsManager,
            accessContext: this._accessContext,
            menuTextRuntime: this.menuTextRuntime,
            releaseState,
            syncReleaseCutVisibility: () => this._navLifecycle.syncDeveloperReleaseCutVisibility(settings, releaseState),
        });
    }

    // ------------------------------------------------------------------
    // Dispose
    // ------------------------------------------------------------------

    dispose() {
        if (this.menuExpertLoginRuntime) {
            this.menuExpertLoginRuntime.onStateChanged = null;
        }
        this._startSync.dispose();
        this._navLifecycle.dispose();
        this._disposeDisposerList(this._uiDisposers);
        this.menuNavigationRuntime?.dispose?.();
        this.menuNavigationRuntime = null;
    }
}
