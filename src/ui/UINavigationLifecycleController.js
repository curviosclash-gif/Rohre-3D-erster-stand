// ============================================
// UINavigationLifecycleController.js
// Navigation, Level4-Drawer, Expert-Login, Toast, Access-Sichtbarkeit und Dispose
// Extrahiert aus UIManager.js (V38 Phase 38.3.2)
// ============================================

import {
    evaluateMenuAccessPolicy,
    resolveDebugAccessPolicy,
    resolveDeveloperAccessPolicy,
    resolveMenuAccessContext,
} from './menu/MenuAccessPolicy.js';
import { LEVEL4_SECTION_IDS, MENU_SESSION_TYPES } from './menu/MenuStateContracts.js';
import { MenuNavigationRuntime } from './menu/MenuNavigationRuntime.js';
import { MenuStateMachine, MENU_STATE_IDS } from './menu/MenuStateMachine.js';
import { MenuPanelRegistry } from './menu/MenuPanelRegistry.js';
import { MenuTextRuntime } from './menu/MenuTextRuntime.js';
import { resolveMapPreview } from './menu/MenuPreviewCatalog.js';

export class UINavigationLifecycleController {
    /**
     * @param {{ ui: object, game: object, manager: object }} options
     */
    constructor({ ui, game, manager }) {
        this.ui = ui;
        this.game = game;
        this.manager = manager;
        this._level4SectionControlsSetup = false;
        this._developerTextCatalogSetup = false;
        this._toastTimer = null;
    }

    // ------------------------------------------------------------------
    // Interne Level4-Hilfsm­ethoden
    // ------------------------------------------------------------------

    _resolveLevel4Section(sectionId, fallback = LEVEL4_SECTION_IDS.CONTROLS) {
        const normalizedSectionId = String(sectionId || '').trim();
        const validIds = Object.values(LEVEL4_SECTION_IDS);
        return validIds.includes(normalizedSectionId) ? normalizedSectionId : fallback;
    }

    _setStartSectionOpen(sectionId, shouldOpen = true) {
        const normalizedSectionId = String(sectionId || '').trim();
        if (!normalizedSectionId) return;
        const section = document.querySelector(`[data-start-section="${normalizedSectionId}"]`);
        if (!(section instanceof HTMLDetailsElement)) return;
        section.open = !!shouldOpen;
    }

    _setupLevel4SectionControls() {
        if (this._level4SectionControlsSetup) return;
        if (!Array.isArray(this.ui.level4SectionTabs)) return;
        this.ui.level4SectionTabs.forEach((button) => {
            this.manager._listen(button, 'click', () => {
                const sectionId = this._resolveLevel4Section(button?.dataset?.level4SectionTarget);
                this.setLevel4Section(sectionId, { persist: true, focus: true });
            });
            this.manager._listen(button, 'keydown', (event) => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                const tabs = this.ui.level4SectionTabs.filter(Boolean);
                const currentIndex = tabs.indexOf(button);
                if (currentIndex < 0 || tabs.length === 0) return;
                const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
                tabs[nextIndex]?.focus?.();
            });
        });
        this._level4SectionControlsSetup = true;
    }

    ensureLevel4SectionControlsSetup() {
        if (this._level4SectionControlsSetup) return;
        this._setupLevel4SectionControls();
    }

    ensureDeveloperTextCatalogSetup() {
        if (this._developerTextCatalogSetup) return;
        this.manager._setupDeveloperTextCatalog();
        this._developerTextCatalogSetup = true;
    }

    _syncLevel4SectionState(sectionId, options = {}) {
        const resolvedSectionId = this._resolveLevel4Section(sectionId);
        const tabs = Array.isArray(this.ui.level4SectionTabs) ? this.ui.level4SectionTabs : [];
        const panels = Array.isArray(this.ui.level4SectionPanels) ? this.ui.level4SectionPanels : [];
        tabs.forEach((button) => {
            const isActive = this._resolveLevel4Section(button?.dataset?.level4SectionTarget, '') === resolvedSectionId;
            button.setAttribute('aria-selected', String(isActive));
            button.classList.toggle('active', isActive);
            button.tabIndex = isActive ? 0 : -1;
        });
        panels.forEach((panel) => {
            const panelSectionId = this._resolveLevel4Section(panel?.dataset?.level4Section, '');
            const isActive = panelSectionId === resolvedSectionId;
            panel.classList.toggle('is-active', isActive);
            panel.setAttribute('aria-hidden', String(!isActive));
        });
        if (options.focus) {
            const activePanel = panels.find((panel) => this._resolveLevel4Section(panel?.dataset?.level4Section, '') === resolvedSectionId);
            const focusTarget = activePanel?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
                || tabs.find((button) => this._resolveLevel4Section(button?.dataset?.level4SectionTarget, '') === resolvedSectionId);
            focusTarget?.focus?.();
        }
    }

    _syncMenuChromeState(panelId = this.game._activeSubmenu) {
        const root = this.ui.mainMenu;
        if (!root) return;
        const normalizedPanelId = String(panelId || '').trim();
        const level4Open = !!this.manager.settings?.localSettings?.toolsState?.level4Open;
        let depth = 1;
        if (normalizedPanelId === 'submenu-custom') depth = 2;
        if (normalizedPanelId === 'submenu-game') depth = level4Open ? 4 : 3;
        if (normalizedPanelId === 'submenu-expert') depth = 2;
        if (normalizedPanelId === 'submenu-developer' || normalizedPanelId === 'submenu-debug') depth = 5;
        root.setAttribute('data-menu-depth', String(depth));
        root.setAttribute('data-menu-panel', normalizedPanelId || 'main');
        root.setAttribute('data-level4-open', String(level4Open));
    }

    // ------------------------------------------------------------------
    // Public Level4-Methoden
    // ------------------------------------------------------------------

    setLevel4Section(sectionId, options = {}) {
        const resolvedSectionId = this._resolveLevel4Section(sectionId);
        const settings = this.manager.settings;
        if (!settings?.localSettings?.toolsState || typeof settings.localSettings.toolsState !== 'object') {
            settings.localSettings.toolsState = {};
        }
        if (options.persist !== false) {
            settings.localSettings.toolsState.activeSection = resolvedSectionId;
        }
        if (!settings.localSettings.toolsState.level4Open) return;
        this.ensureLevel4SectionControlsSetup();
        this._syncLevel4SectionState(resolvedSectionId, options);
        this.manager.updateContext();
    }

    setLevel4Open(isOpen) {
        const drawer = this.ui.level4Drawer;
        if (!drawer) return;
        const open = !!isOpen;
        if (open) {
            this.ensureLevel4SectionControlsSetup();
        }
        const settings = this.manager.settings;
        if (!settings?.localSettings?.toolsState || typeof settings.localSettings.toolsState !== 'object') {
            settings.localSettings.toolsState = {};
        }
        settings.localSettings.toolsState.level4Open = open;
        drawer.classList.toggle('hidden', !open);
        drawer.setAttribute('aria-hidden', String(!open));
        const activeSection = this._resolveLevel4Section(
            settings?.localSettings?.toolsState?.activeSection,
            LEVEL4_SECTION_IDS.CONTROLS
        );
        if (open || this._level4SectionControlsSetup) {
            this._syncLevel4SectionState(activeSection, { focus: false });
        }
        this._syncMenuChromeState(this.game._activeSubmenu || null);
        if (open) {
            const activePanel = Array.isArray(this.ui.level4SectionPanels)
                ? this.ui.level4SectionPanels.find((panel) => this._resolveLevel4Section(panel?.dataset?.level4Section, '') === activeSection)
                : null;
            const firstFocusable = activePanel?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
                || drawer.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
        } else if (this.game._activeSubmenu === 'submenu-game') {
            this.ui.openLevel4Button?.focus?.();
        }
        this.manager.updateContext();
    }

    // ------------------------------------------------------------------
    // Expert-Login
    // ------------------------------------------------------------------

    setupExpertLoginBindings() {
        const runtime = this.game.menuExpertLoginRuntime;
        if (!runtime) return;
        const listen = (target, type, handler) => this.manager._listen(target, type, handler);
        if (this.ui.expertPasswordInput) {
            listen(this.ui.expertPasswordInput, 'input', () => runtime.clearError());
            listen(this.ui.expertPasswordInput, 'keydown', (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                this._attemptExpertUnlock();
            });
        }
        if (this.ui.expertUnlockButton)  listen(this.ui.expertUnlockButton,   'click', () => this._attemptExpertUnlock());
        if (this.ui.expertLockButton)    listen(this.ui.expertLockButton,     'click', () => runtime.lock());
        if (this.ui.expertQuickLockButton) listen(this.ui.expertQuickLockButton, 'click', () => runtime.lock());
        if (this.ui.expertCancelButton)  listen(this.ui.expertCancelButton,   'click', () => this.manager.showMainNav());
    }

    _attemptExpertUnlock() {
        const runtime = this.game.menuExpertLoginRuntime;
        if (!runtime) return;
        const password = String(this.ui.expertPasswordInput?.value || '');
        const result = runtime.unlock(password);
        if (!result.success) {
            this.manager.showToast('Passwort falsch.', 1400, 'error');
            this.ui.expertPasswordInput?.focus?.();
            this.ui.expertPasswordInput?.select?.();
            return;
        }
        runtime.focusPrimaryControl();
    }

    handleExpertStateChanged() {
        this.manager.updateContext();
        this.manager.syncDeveloperState(this.manager.settings);
        if (this.game._activeSubmenu === 'submenu-expert') {
            this.game.menuExpertLoginRuntime?.focusPrimaryControl?.();
        }
    }

    // ------------------------------------------------------------------
    // Menü-Navigation
    // ------------------------------------------------------------------

    setupMenuNavigation() {
        const manager = this.manager;
        manager._navButtons = Array.isArray(this.ui.menuNavButtons) && this.ui.menuNavButtons.length > 0
            ? this.ui.menuNavButtons
            : Array.from(document.querySelectorAll('.nav-btn'));
        manager._submenuPanels = Array.isArray(this.ui.menuPanels) && this.ui.menuPanels.length > 0
            ? this.ui.menuPanels
            : Array.from(document.querySelectorAll('.submenu-panel'));

        manager._menuButtonByPanel.clear();
        manager._navButtons.forEach(btn => {
            const rawTargetId = btn.dataset.submenu || btn.dataset.menuTarget;
            const targetId = manager.menuPanelRegistry.resolvePanelId(rawTargetId) || rawTargetId;
            if (targetId) manager._menuButtonByPanel.set(targetId, btn);
        });

        if (manager.menuNavigationRuntime?.dispose) {
            manager.menuNavigationRuntime.dispose();
        }

        manager.menuNavigationRuntime = new MenuNavigationRuntime({
            ui: this.ui,
            panelRegistry: manager.menuPanelRegistry,
            stateMachine: manager.menuStateMachine,
            accessContext: manager._accessContext,
            onLevel4CloseRequested: () => manager.setLevel4Open(false),
            onPanelChanged: (panelId, _panelConfig, _transition, transitionMetadata) => {
                const previousPanelId = this.game._activeSubmenu || null;
                this.game._activeSubmenu = panelId || null;
                if (panelId === 'submenu-developer') {
                    this.ensureDeveloperTextCatalogSetup();
                }
                if (panelId === 'submenu-expert') {
                    this.game.menuExpertLoginRuntime?.focusPrimaryControl?.();
                }
                if (panelId !== 'submenu-game' && manager.settings?.localSettings?.toolsState?.level4Open) {
                    manager.settings.localSettings.toolsState.level4Open = false;
                    manager.setLevel4Open(false);
                }
                this.game.runtimeFacade?.handleMenuPanelChanged?.(previousPanelId, panelId || null, transitionMetadata || null);
                this._syncMenuChromeState(panelId || null);
                manager.updateContext();
            },
            onMenuStateChanged: (transition) => {
                this.game._menuState = manager.menuStateMachine.getState();
                this.game._menuTransition = transition || null;
            },
        });
        manager.menuNavigationRuntime.init();
        this._syncMenuChromeState(this.game._activeSubmenu || null);
    }

    showMainNav() {
        const manager = this.manager;
        if (manager.menuNavigationRuntime) {
            manager.menuNavigationRuntime.showMainNav({ trigger: 'ui_manager' });
            manager.setLevel4Open(false);
            return;
        }
        const submenus = manager._submenuPanels.length > 0
            ? manager._submenuPanels
            : Array.from(document.querySelectorAll('.submenu-panel'));
        submenus.forEach(p => p.classList.add('hidden'));
        manager._navButtons.forEach(b => b.classList.remove('active'));
        this.game._activeSubmenu = null;
        manager.setLevel4Open(false);
        manager.updateContext();
    }

    // ------------------------------------------------------------------
    // Developer-Release-Sichtbarkeit
    // ------------------------------------------------------------------

    _resolveDeveloperReleaseState(settings = this.manager.settings) {
        const localSettings = settings?.localSettings && typeof settings.localSettings === 'object'
            ? settings.localSettings
            : {};
        const featureEnabled = settings?.menuFeatureFlags?.developerModeEnabled !== false;
        const releasePreviewEnabled = !!localSettings.releasePreviewEnabled;
        return {
            featureEnabled,
            releasePreviewEnabled,
            developerUiHidden: !featureEnabled,
            releaseCutEnabled: !featureEnabled || releasePreviewEnabled,
        };
    }

    _setElementsHidden(elements, hidden) {
        if (!Array.isArray(elements)) return;
        elements.forEach((element) => {
            if (!element) return;
            element.classList.toggle('hidden', !!hidden);
            element.setAttribute('aria-hidden', String(!!hidden));
            if (hidden) {
                element.setAttribute('tabindex', '-1');
            } else {
                element.removeAttribute('tabindex');
            }
        });
    }

    syncDeveloperReleaseCutVisibility(settings = this.manager.settings, releaseState = this._resolveDeveloperReleaseState(settings)) {
        const shouldHideDeveloperUi = releaseState.developerUiHidden;
        const shouldHideDebugHints = releaseState.releaseCutEnabled;
        const accessContext = resolveMenuAccessContext(settings);
        const manager = this.manager;
        const developerPanelConfig = manager.menuPanelRegistry.getPanelById('submenu-developer');
        const debugPanelConfig = manager.menuPanelRegistry.getPanelById('submenu-debug');
        const developerPolicy = developerPanelConfig?.semanticId === 'developer'
            ? resolveDeveloperAccessPolicy(accessContext)
            : (developerPanelConfig?.accessPolicy || 'open');
        const debugPolicy = debugPanelConfig?.semanticId === 'debug'
            ? resolveDebugAccessPolicy(accessContext)
            : (debugPanelConfig?.accessPolicy || 'open');
        const developerAllowed = !shouldHideDeveloperUi
            && developerPanelConfig?.visibility !== 'hidden'
            && evaluateMenuAccessPolicy(developerPolicy, accessContext).allowed;
        const debugAllowed = !shouldHideDeveloperUi
            && debugPanelConfig?.visibility !== 'hidden'
            && evaluateMenuAccessPolicy(debugPolicy, accessContext).allowed;

        this._setElementsHidden(manager._developerNavButtons, !developerAllowed);
        this._setElementsHidden(manager._debugNavButtons, !debugAllowed);
        this._setElementsHidden(manager._debugHintNodes, shouldHideDebugHints);

        if (manager._developerPanel) {
            manager._developerPanel.setAttribute('data-release-cut', shouldHideDeveloperUi ? 'true' : 'false');
        }
        if (!developerAllowed && this.game._activeSubmenu === 'submenu-developer') {
            manager.showMainNav();
            return;
        }
        if (!debugAllowed && this.game._activeSubmenu === 'submenu-debug') {
            manager.showMainNav();
        }
    }

    // ------------------------------------------------------------------
    // Toast
    // ------------------------------------------------------------------

    showToast(message, durationMsOrTone = 1200, tone = 'info') {
        const toast = this.ui.statusToast;
        if (!toast) return;
        const durationMs = typeof durationMsOrTone === 'number' ? durationMsOrTone : 1200;
        const requestedTone = typeof durationMsOrTone === 'string' ? durationMsOrTone : tone;
        const normalizedTone = requestedTone === 'success' || requestedTone === 'error' ? requestedTone : 'info';
        toast.textContent = message;
        toast.classList.remove('hidden', 'show', 'toast-info', 'toast-success', 'toast-error');
        toast.classList.add(`toast-${normalizedTone}`);
        void toast.offsetWidth;
        toast.classList.add('show');
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hidden');
        }, durationMs);
    }

    // ------------------------------------------------------------------
    // updateContext + Hilfsmethoden
    // ------------------------------------------------------------------

    updateContext() {
        const manager = this.manager;
        if (!this.ui.menuContext) return;
        manager._accessContext = resolveMenuAccessContext(manager.settings);
        manager.menuNavigationRuntime?.setAccessContext?.(manager._accessContext);
        this._syncMenuChromeState(this.game._activeSubmenu || null);
        const section = this._getMenuSectionLabel(this.game._activeSubmenu);
        const activeProfile = this._resolveActiveProfileName();
        const dirtyState = this.game.settingsDirty ? 'ungespeicherte Aenderungen' : 'alles gespeichert';
        const sessionType = String(manager.settings?.localSettings?.sessionType || MENU_SESSION_TYPES.SINGLE).toLowerCase();
        const sessionLabel = sessionType === MENU_SESSION_TYPES.SPLITSCREEN
            ? 'Splitscreen'
            : (sessionType === MENU_SESSION_TYPES.MULTIPLAYER ? 'Multiplayer' : 'Single Player');
        const modePath = String(manager.settings?.localSettings?.modePath || 'normal').toLowerCase();
        const modeLabel = modePath === 'fight'
            ? 'Fight'
            : (modePath === 'arcade' ? 'Arcade' : (modePath === 'quick_action' ? 'Schnellstart' : 'Normal'));
        const mapLabel = resolveMapPreview(manager.settings?.mapKey).name;
        const activeSection = this._resolveLevel4Section(manager.settings?.localSettings?.toolsState?.activeSection);
        const activeSectionLabel = {
            [LEVEL4_SECTION_IDS.CONTROLS]: 'Steuerung',
            [LEVEL4_SECTION_IDS.GAMEPLAY]: 'Gameplay',
            [LEVEL4_SECTION_IDS.ADVANCED_MAP]: 'Map-Details',
            [LEVEL4_SECTION_IDS.TOOLS]: 'Profile',
        }[activeSection] || 'Profile';

        let contextText = `${section} | Profil: ${activeProfile} | ${dirtyState}`;
        if (manager.settings?.localSettings?.toolsState?.level4Open) {
            contextText = `Ebene 4 | ${activeSectionLabel} | ${sessionLabel} | ${dirtyState}`;
        } else if (this.game._activeSubmenu === 'submenu-game') {
            contextText = `${section} | ${sessionLabel} | ${modeLabel} | ${mapLabel}`;
        } else if (this.game._activeSubmenu === 'submenu-custom') {
            contextText = `${section} | ${sessionLabel} | Sofortstart oder Setup | ${dirtyState}`;
        } else if (this.game._activeSubmenu === 'submenu-expert') {
            const expertStateLabel = this.game.menuExpertLoginRuntime?.isUnlocked?.() ? 'freigeschaltet' : 'gesperrt';
            contextText = `${section} | Expertenstatus: ${expertStateLabel} | ${dirtyState}`;
        }
        this.ui.menuContext.textContent = contextText;
    }

    _resolveActiveProfileName() {
        const game = this.game;
        const typedProfile = game.ui?.profileNameInput?.value || '';
        const normalizedTypedProfile = game.profileManager?.normalizeProfileName
            ? game.profileManager.normalizeProfileName(typedProfile)
            : typedProfile.trim();
        return game.activeProfileName || normalizedTypedProfile || 'kein Profil';
    }

    _getMenuSectionLabel(panelId) {
        const manager = this.manager;
        if (!panelId) return 'Hauptmenue';
        const registeredPanel = manager.menuPanelRegistry.getPanelById(panelId);
        if (registeredPanel?.label) {
            return String(registeredPanel.label).replace(/\s+/g, ' ').trim();
        }
        const linkedButton = manager._menuButtonByPanel.get(panelId);
        if (linkedButton) {
            return (linkedButton.textContent || '').replace(/\s+/g, ' ').trim();
        }
        const panelTitle = document.querySelector(`#${panelId} .submenu-title`);
        return (panelTitle?.textContent || 'Untermenue').replace(/\s+/g, ' ').trim();
    }

    // ------------------------------------------------------------------
    // Dispose
    // ------------------------------------------------------------------

    dispose() {
        if (this._toastTimer) {
            clearTimeout(this._toastTimer);
            this._toastTimer = null;
        }
        this._level4SectionControlsSetup = false;
        this._developerTextCatalogSetup = false;
    }
}
