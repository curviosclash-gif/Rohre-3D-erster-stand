// @ts-check
/* global __APP_TARGET__ */

import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { MENU_SESSION_TYPES } from '../composition/core-ui/CoreSettingsPorts.js';
import { LEVEL4_SECTION_IDS, MENU_MODE_PATHS } from '../ui/menu/MenuStateContracts.js';
import {
    ARCADE_GHOST_DUEL_MODES,
} from '../shared/contracts/ArcadeGhostDuelContract.js';
import {
    createMobileClassicGithubUpdateConfig,
    normalizeMobileClassicUpdateConfig,
} from './MobileClassicUpdateConfig.js';
import { normalizeMobileClassicControlSettings } from '../shared/contracts/MobileClassicControlsContract.js';
import { ensureMobileClassicStyles } from './MobileClassicStyles.js';
import {
    MOBILE_ARCADE_DEFAULT_MAP_KEY,
    isMobileArcadeRouteAllowed,
    listMobileArcadeRouteAllowlist,
    resolveMobileArcadeMapKey,
} from '../mobile-arcade/MobileArcadeApp.js';

export const MOBILE_CLASSIC_APP_TARGET = 'mobile-classic';

const MOBILE_CLASSIC_UPDATE_PANEL_ID = 'mobile-classic-update-panel';
const MOBILE_CLASSIC_UPDATE_CHECK_ID = 'mobile-classic-update-check';
const MOBILE_CLASSIC_UPDATE_OPEN_ID = 'mobile-classic-update-open';
const MOBILE_CLASSIC_UPDATE_STATUS_ID = 'mobile-classic-update-status';
const MOBILE_ANDROID_GHOST_STATUS_ID = 'mobile-arcade-ghost-status';
const MOBILE_ANDROID_ENTRY_PANEL_ID = 'mobile-android-entry-panel';
const MOBILE_ANDROID_ENTRY_CLASSIC_ID = 'mobile-android-entry-classic';
const MOBILE_ANDROID_ENTRY_ARCADE_ID = 'mobile-android-entry-arcade';
const MOBILE_ANDROID_ROUTE_PANEL_ID = 'mobile-android-route-panel';
const MOBILE_ANDROID_ROUTE_LIST_ID = 'mobile-android-route-list';
const MOBILE_ANDROID_ROUTE_EMPTY_ID = 'mobile-android-route-empty';
const MOBILE_ANDROID_MODE_PATHS = Object.freeze([
    MENU_MODE_PATHS.NORMAL,
    MENU_MODE_PATHS.ARCADE,
]);
const MOBILE_ANDROID_LEVEL4_SECTION_IDS = Object.freeze([
    LEVEL4_SECTION_IDS.MOBILE_CONTROLS,
    LEVEL4_SECTION_IDS.GAMEPLAY,
]);
const DEFAULT_MOBILE_CLASSIC_UPDATE_CONFIG = createMobileClassicGithubUpdateConfig();
const mobileClassicUpdateState = {
    updateConfig: { ...DEFAULT_MOBILE_CLASSIC_UPDATE_CONFIG },
    updateTargetUrl: DEFAULT_MOBILE_CLASSIC_UPDATE_CONFIG.latestReleaseUrl,
};

function normalizeTarget(value = '') {
    return String(value || '').trim().toLowerCase();
}

export function isMobileClassicTargetValue(value = '') {
    return normalizeTarget(value) === MOBILE_CLASSIC_APP_TARGET;
}

export function isMobileClassicAppTarget() {
    // Build-time define; the typeof guard keeps tests and non-Vite callers safe.
    return typeof __APP_TARGET__ !== 'undefined' && isMobileClassicTargetValue(__APP_TARGET__);
}

function resolveMobileAndroidModePath(settings = null) {
    const requestedModePath = normalizeTarget(settings?.localSettings?.modePath);
    return MOBILE_ANDROID_MODE_PATHS.includes(requestedModePath)
        ? requestedModePath
        : MENU_MODE_PATHS.NORMAL;
}

function ensureStartSetup(settings) {
    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    if (!settings.localSettings.startSetup || typeof settings.localSettings.startSetup !== 'object') {
        settings.localSettings.startSetup = {};
    }
    const startSetup = settings.localSettings.startSetup;
    if (!startSetup.modeSelections || typeof startSetup.modeSelections !== 'object') {
        startSetup.modeSelections = {};
    }
    if (!startSetup.modeSelections.arcade || typeof startSetup.modeSelections.arcade !== 'object') {
        startSetup.modeSelections.arcade = {};
    }
    return startSetup;
}

function resolveExistingArcadeMapKey(settings) {
    return settings?.localSettings?.startSetup?.modeSelections?.arcade?.mapKey
        || settings?.mapKey
        || MOBILE_ARCADE_DEFAULT_MAP_KEY;
}

function applyMobileAndroidArcadeSettings(settings) {
    const startSetup = ensureStartSetup(settings);
    const mapKey = resolveMobileArcadeMapKey(resolveExistingArcadeMapKey(settings));
    settings.mapKey = mapKey;
    startSetup.modeSelections.arcade.mapKey = mapKey;
    startSetup.arcadeGhostDuelMode = ARCADE_GHOST_DUEL_MODES.SELF_LONGEST_GHOST;
    startSetup.arcadeGhostTrailCollisionEnabled = false;
}

export function applyMobileClassicSettings(settings = null) {
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    if (!settings.gameplay || typeof settings.gameplay !== 'object') {
        settings.gameplay = {};
    }
    if (!settings.hunt || typeof settings.hunt !== 'object') {
        settings.hunt = {};
    }

    const modePath = resolveMobileAndroidModePath(settings);
    settings.mode = '1p';
    settings.gameMode = GAME_MODE_TYPES.CLASSIC;
    settings.localSettings.sessionType = MENU_SESSION_TYPES.SINGLE;
    settings.localSettings.modePath = modePath;
    settings.localSettings.mobileControls = normalizeMobileClassicControlSettings(settings.localSettings.mobileControls);
    if (!settings.invertPitch || typeof settings.invertPitch !== 'object') {
        settings.invertPitch = {};
    }
    // Phone tilt already maps the calibrated hand posture directly; desktop pitch-invert feels reversed here.
    settings.invertPitch.PLAYER_1 = false;
    if (!settings.localSettings.toolsState || typeof settings.localSettings.toolsState !== 'object') {
        settings.localSettings.toolsState = {};
    }
    const requestedLevel4Section = normalizeTarget(settings.localSettings.toolsState.activeSection);
    settings.localSettings.toolsState.activeSection = MOBILE_ANDROID_LEVEL4_SECTION_IDS.includes(requestedLevel4Section)
        ? requestedLevel4Section
        : LEVEL4_SECTION_IDS.MOBILE_CONTROLS;
    settings.gameplay.planarMode = false;
    settings.hunt.respawnEnabled = false;
    if (modePath === MENU_MODE_PATHS.ARCADE) {
        applyMobileAndroidArcadeSettings(settings);
    }

    return settings;
}

function resolveFetch(fetchImpl = null) {
    if (typeof fetchImpl === 'function') {
        return fetchImpl;
    }
    return typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : null;
}

function resolveWindow(doc = document) {
    return doc?.defaultView || (typeof window !== 'undefined' ? window : null);
}

function ensureMobileClassicUpdateUi(doc = document) {
    if (!doc?.createElement) {
        return null;
    }
    const existing = doc.getElementById(MOBILE_CLASSIC_UPDATE_PANEL_ID);
    if (existing) {
        return existing;
    }

    const panel = doc.createElement('div');
    panel.id = MOBILE_CLASSIC_UPDATE_PANEL_ID;
    panel.className = 'mobile-classic-update-panel';

    const actions = doc.createElement('div');
    actions.className = 'mobile-classic-update-actions';

    const checkButton = doc.createElement('button');
    checkButton.type = 'button';
    checkButton.id = MOBILE_CLASSIC_UPDATE_CHECK_ID;
    checkButton.className = 'secondary-btn mobile-classic-update-btn';
    checkButton.textContent = 'Update';

    const openButton = doc.createElement('button');
    openButton.type = 'button';
    openButton.id = MOBILE_CLASSIC_UPDATE_OPEN_ID;
    openButton.className = 'secondary-btn mobile-classic-update-btn';
    openButton.textContent = 'GitHub';
    openButton.hidden = true;

    const status = doc.createElement('span');
    status.id = MOBILE_CLASSIC_UPDATE_STATUS_ID;
    status.className = 'mobile-classic-update-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    actions.append(checkButton, openButton);
    panel.append(actions, status);

    const host = doc.querySelector('.menu-utility-shell')
        || doc.querySelector('.menu-hero-shell')
        || doc.getElementById('main-menu')
        || doc.body;
    host?.appendChild(panel);
    return panel;
}

function createMobileAndroidEntryButton(doc, { id, modePath, label, copy }) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'nav-btn mobile-android-entry-btn';
    button.dataset.mobileModeEntry = modePath;
    button.title = '';
    const labelNode = doc.createElement('span');
    labelNode.className = 'mobile-android-entry-title';
    labelNode.textContent = label;
    const copyNode = doc.createElement('span');
    copyNode.className = 'mobile-android-entry-copy';
    copyNode.textContent = copy;
    button.append(labelNode, copyNode);
    return button;
}

function ensureMobileAndroidEntryUi(doc = document) {
    if (!doc?.createElement) {
        return null;
    }
    const existing = doc.getElementById(MOBILE_ANDROID_ENTRY_PANEL_ID);
    if (existing) {
        return existing;
    }
    const panel = doc.createElement('div');
    panel.id = MOBILE_ANDROID_ENTRY_PANEL_ID;
    panel.className = 'mobile-android-entry-panel';
    panel.setAttribute('aria-label', 'Android Spielstil');
    panel.append(
        createMobileAndroidEntryButton(doc, {
            id: MOBILE_ANDROID_ENTRY_CLASSIC_ID,
            modePath: MENU_MODE_PATHS.NORMAL,
            label: 'Classic',
            copy: 'Freier Flug fuer den schnellen Start',
        }),
        createMobileAndroidEntryButton(doc, {
            id: MOBILE_ANDROID_ENTRY_ARCADE_ID,
            modePath: MENU_MODE_PATHS.ARCADE,
            label: 'Parcours',
            copy: 'Zeitroute mit Ghost-Selbstduell',
        }),
    );
    const menuNav = doc.getElementById('menu-nav');
    const host = doc.querySelector('.menu-shell') || doc.getElementById('main-menu') || doc.body;
    if (menuNav?.parentNode) {
        menuNav.parentNode.insertBefore(panel, menuNav);
    } else {
        host?.appendChild(panel);
    }
    return panel;
}

function ensureMobileAndroidRouteUi(doc = document) {
    if (!doc?.createElement) {
        return null;
    }
    const existing = doc.getElementById(MOBILE_ANDROID_ROUTE_PANEL_ID);
    if (existing) {
        return existing;
    }

    const panel = doc.createElement('section');
    panel.id = MOBILE_ANDROID_ROUTE_PANEL_ID;
    panel.className = 'mobile-android-route-panel';
    panel.setAttribute('aria-label', 'Parcours Route');

    const title = doc.createElement('h3');
    title.className = 'mobile-android-route-title';
    title.textContent = 'Route waehlen';

    const list = doc.createElement('div');
    list.id = MOBILE_ANDROID_ROUTE_LIST_ID;
    list.className = 'mobile-android-route-list';

    const empty = doc.createElement('p');
    empty.id = MOBILE_ANDROID_ROUTE_EMPTY_ID;
    empty.className = 'mobile-android-route-empty';
    empty.textContent = 'Keine mobile Route verfuegbar.';

    panel.append(title, list, empty);

    const startRail = doc.querySelector('#submenu-game .start-rail');
    if (startRail?.parentNode) {
        startRail.parentNode.insertBefore(panel, startRail.nextSibling);
    } else {
        doc.getElementById('submenu-game')?.appendChild(panel);
    }
    return panel;
}

function getMobileClassicUpdateRefs(doc = document) {
    return {
        panel: doc.getElementById(MOBILE_CLASSIC_UPDATE_PANEL_ID),
        checkButton: doc.getElementById(MOBILE_CLASSIC_UPDATE_CHECK_ID),
        openButton: doc.getElementById(MOBILE_CLASSIC_UPDATE_OPEN_ID),
        status: doc.getElementById(MOBILE_CLASSIC_UPDATE_STATUS_ID),
    };
}

export async function hydrateMobileClassicUpdateConfig(doc = document, fetchImpl = null) {
    const fetcher = resolveFetch(fetchImpl);
    if (!fetcher) {
        return mobileClassicUpdateState.updateConfig;
    }
    try {
        const response = await fetcher('./mobile-classic.manifest.json', {
            cache: 'no-store',
        });
        if (!response?.ok) {
            return mobileClassicUpdateState.updateConfig;
        }
        const manifest = await response.json();
        mobileClassicUpdateState.updateConfig = normalizeMobileClassicUpdateConfig(manifest);
        mobileClassicUpdateState.updateTargetUrl = mobileClassicUpdateState.updateConfig.latestReleaseUrl;
    } catch {
        // Offline starts keep the static release fallback.
    }
    return mobileClassicUpdateState.updateConfig;
}

export function openMobileClassicUpdateTarget(doc = document) {
    const targetUrl = mobileClassicUpdateState.updateTargetUrl
        || mobileClassicUpdateState.updateConfig.latestReleaseUrl;
    const ownerWindow = resolveWindow(doc);
    const opened = ownerWindow?.open?.(targetUrl, '_blank', 'noopener');
    if (!opened && ownerWindow?.location) {
        ownerWindow.location.href = targetUrl;
    }
}

export async function checkMobileClassicGithubRelease(doc = document, fetchImpl = null) {
    const refs = getMobileClassicUpdateRefs(doc);
    const fetcher = resolveFetch(fetchImpl);
    if (refs.checkButton) {
        refs.checkButton.disabled = true;
    }
    if (refs.openButton) {
        refs.openButton.hidden = true;
    }
    if (refs.status) {
        refs.status.textContent = 'GitHub prueft';
    }

    if (!fetcher) {
        if (refs.status) {
            refs.status.textContent = 'GitHub Releases';
        }
        if (refs.openButton) {
            refs.openButton.hidden = false;
        }
        if (refs.checkButton) {
            refs.checkButton.disabled = false;
        }
        return null;
    }

    try {
        const response = await fetcher(mobileClassicUpdateState.updateConfig.apiUrl, {
            cache: 'no-store',
            headers: { Accept: 'application/vnd.github+json' },
        });
        if (!response?.ok) {
            throw new Error(`${response?.status || 0} ${response?.statusText || 'GitHub'}`);
        }
        const release = await response.json();
        mobileClassicUpdateState.updateTargetUrl = release.html_url
            || mobileClassicUpdateState.updateConfig.latestReleaseUrl;
        if (refs.status) {
            refs.status.textContent = `Update ${release.tag_name || release.name || 'Release'}`;
        }
        return release;
    } catch {
        mobileClassicUpdateState.updateTargetUrl = mobileClassicUpdateState.updateConfig.latestReleaseUrl;
        if (refs.status) {
            refs.status.textContent = 'GitHub Releases';
        }
        return null;
    } finally {
        if (refs.openButton) {
            refs.openButton.hidden = false;
        }
        if (refs.checkButton) {
            refs.checkButton.disabled = false;
        }
    }
}

export function setupMobileClassicUpdateUi(doc = document) {
    const panel = ensureMobileClassicUpdateUi(doc);
    if (!panel || panel.dataset.updateBound === '1') {
        return panel;
    }
    const refs = getMobileClassicUpdateRefs(doc);
    refs.checkButton?.addEventListener('click', () => {
        void checkMobileClassicGithubRelease(doc);
    });
    refs.openButton?.addEventListener('click', () => {
        openMobileClassicUpdateTarget(doc);
    });
    panel.dataset.updateBound = '1';
    void hydrateMobileClassicUpdateConfig(doc);
    return panel;
}

function ensureViewportFit(doc = document) {
    const viewport = doc.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    const content = String(viewport.getAttribute('content') || '');
    if (content.includes('viewport-fit=cover')) return;
    viewport.setAttribute('content', `${content}, viewport-fit=cover`.replace(/^,\s*/, ''));
}

function ensureMobileAndroidStatusUi(doc = document) {
    if (!doc?.createElement || typeof doc.body?.appendChild !== 'function'
        || doc.getElementById?.(MOBILE_ANDROID_GHOST_STATUS_ID)) {
        return;
    }
    const status = doc.createElement('div');
    status.id = MOBILE_ANDROID_GHOST_STATUS_ID;
    status.textContent = 'Ghost: Selbstduell';
    doc.body.appendChild(status);
}

function syncMobileAndroidMenuCopy(doc = document) {
    const customTitle = doc?.getElementById?.('submenu-custom-title');
    if (customTitle) {
        customTitle.textContent = 'Spielstil waehlen';
    }
    const gameTitle = doc?.getElementById?.('submenu-game-title');
    if (gameTitle) {
        gameTitle.textContent = 'Start vorbereiten';
    }
    const openLevel4Button = doc?.getElementById?.('btn-open-level4');
    if (openLevel4Button) {
        openLevel4Button.textContent = 'Einstellungen';
        openLevel4Button.dataset.level4Section = LEVEL4_SECTION_IDS.MOBILE_CONTROLS;
    }
    const level4Title = doc?.querySelector?.('#submenu-level4 .level4-header .submenu-title');
    if (level4Title) {
        level4Title.textContent = 'Einstellungen';
    }
    const mobileControlsTab = doc?.getElementById?.('level4-tab-mobile-controls');
    if (mobileControlsTab) {
        mobileControlsTab.textContent = 'Steuerung';
    }
    const gameplayTab = doc?.getElementById?.('level4-tab-gameplay');
    if (gameplayTab) {
        gameplayTab.textContent = 'Anzeige';
    }
    const mobileControlsTitle = doc?.querySelector?.('#level4-section-mobile-controls .section-title');
    if (mobileControlsTitle) {
        mobileControlsTitle.textContent = 'Steuerung';
    }
    const gameplayTitle = doc?.querySelector?.('#level4-section-gameplay .section-title');
    if (gameplayTitle) {
        gameplayTitle.textContent = 'Anzeige & Spielgefuehl';
    }
}

function updateMobileAndroidMenuVisibility(doc = document) {
    if (!doc?.body) {
        return;
    }
    const mainMenu = doc.getElementById?.('main-menu');
    const menuVisible = !!mainMenu && !mainMenu.classList.contains('hidden');
    doc.body.dataset.mobileMenuVisible = menuVisible ? '1' : '0';
    if (doc.documentElement?.dataset) {
        doc.documentElement.dataset.mobileMenuVisible = menuVisible ? '1' : '0';
    }
}

function ensureMobileAndroidMenuVisibilityObserver(doc = document) {
    const mainMenu = doc?.getElementById?.('main-menu');
    const ownerWindow = resolveWindow(doc);
    updateMobileAndroidMenuVisibility(doc);
    if (!mainMenu || !ownerWindow?.MutationObserver || mainMenu.dataset.mobileAndroidMenuObserverBound === '1') {
        return;
    }
    const observer = new ownerWindow.MutationObserver(() => updateMobileAndroidMenuVisibility(doc));
    observer.observe(mainMenu, { attributes: true, attributeFilter: ['class'] });
    mainMenu.dataset.mobileAndroidMenuObserverBound = '1';
}

export function applyMobileClassicDocumentState(doc = document) {
    if (!doc?.documentElement || !doc.body) {
        return;
    }
    doc.documentElement.classList.add('mobile-classic-app');
    doc.body.classList.add('mobile-classic-app');
    doc.documentElement.dataset.appTarget = MOBILE_CLASSIC_APP_TARGET;
    doc.body.dataset.appTarget = MOBILE_CLASSIC_APP_TARGET;
    ensureViewportFit(doc);
    ensureMobileClassicStyles(doc);
    ensureMobileAndroidEntryUi(doc);
    ensureMobileAndroidRouteUi(doc);
    collapseMobileAndroidStartSections(doc);
    ensureMobileAndroidStatusUi(doc);
    syncMobileAndroidMenuCopy(doc);
    ensureMobileAndroidMenuVisibilityObserver(doc);
    setupMobileClassicUpdateUi(doc);
}

function setButtonLocked(button, locked) {
    if (!button) return;
    button.disabled = !!locked;
    button.setAttribute('aria-hidden', locked ? 'true' : 'false');
    button.tabIndex = locked ? -1 : 0;
}

function setButtonLabel(button, label) {
    if (!button) return;
    const labelNode = button.querySelector?.('.nav-btn-label, .menu-choice-title');
    if (labelNode) {
        labelNode.textContent = label;
    } else {
        button.textContent = label;
    }
    button.title = '';
}

function updateMobileAndroidDocumentMode(modePath, doc = (typeof document !== 'undefined' ? document : null)) {
    const normalizedModePath = resolveMobileAndroidModePath({ localSettings: { modePath } });
    if (doc?.documentElement?.dataset) {
        doc.documentElement.dataset.mobileModePath = normalizedModePath;
    }
    if (doc?.body?.dataset) {
        doc.body.dataset.mobileModePath = normalizedModePath;
    }
    updateMobileAndroidMenuVisibility(doc);
}

function resolveCurrentMobileModePath(game = null) {
    return resolveMobileAndroidModePath(game?.settings || null);
}

function pruneMapSelectToArcadeAllowlist(select) {
    if (!select?.options) {
        return '';
    }
    const options = Array.from(select.options);
    for (let i = options.length - 1; i >= 0; i -= 1) {
        const option = options[i];
        if (!isMobileArcadeRouteAllowed(option?.value)) {
            option.remove?.();
        }
    }
    const selectedValue = resolveMobileArcadeMapKey(select.value);
    const hasSelectedOption = Array.from(select.options).some((option) => option.value === selectedValue);
    if (hasSelectedOption) {
        select.value = selectedValue;
    } else if (select.options.length > 0) {
        select.value = select.options[0].value;
    }
    return String(select.value || '');
}

function bindMobileModeResync(game, button) {
    if (!button?.dataset || button.dataset.mobileAndroidModeBound === '1') {
        return;
    }
    button.dataset.mobileAndroidModeBound = '1';
    button.addEventListener?.('click', () => {
        const ownerWindow = button.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
        ownerWindow?.setTimeout?.(() => applyMobileClassicUiLocks(game), 0);
    });
}

function syncMobileAndroidQuickStarts(ui = null) {
    const quickStartSection = ui?.quickStartLastButton?.closest?.('.menu-section')
        || ui?.quickStartEventPlaylistButton?.closest?.('.menu-section')
        || ui?.quickStartRandomButton?.closest?.('.menu-section')
        || null;
    if (!quickStartSection) {
        return;
    }
    quickStartSection.classList.add('hidden');
    quickStartSection.setAttribute('aria-hidden', 'true');
}

function collapseMobileAndroidStartSections(doc = document) {
    const mainMenu = doc?.getElementById?.('main-menu');
    if (!mainMenu || mainMenu.dataset.mobileAndroidStartSectionsCompacted === '1') {
        return;
    }
    doc.querySelectorAll?.('#submenu-game details.start-section-card')?.forEach((section) => {
        section.open = false;
    });
    mainMenu.dataset.mobileAndroidStartSectionsCompacted = '1';
}

function formatMobileRouteLabel(mapKey, option = null) {
    const optionText = String(option?.textContent || '').replace(/\s+/g, ' ').trim();
    if (optionText) {
        return optionText.replace(/\s*\([^)]*\)\s*$/, '');
    }
    return String(mapKey || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dispatchMapSelectChange(mapSelect, doc) {
    const eventFactory = doc?.defaultView?.Event || (typeof Event !== 'undefined' ? Event : null);
    if (eventFactory) {
        mapSelect.dispatchEvent(new eventFactory('change', { bubbles: true }));
    } else {
        mapSelect.dispatchEvent?.({ type: 'change', bubbles: true, target: mapSelect });
    }
}

function syncMobileAndroidRouteChoices(game = null, ui = null, modePath = MENU_MODE_PATHS.NORMAL, doc = document) {
    const panel = ensureMobileAndroidRouteUi(doc);
    const list = doc?.getElementById?.(MOBILE_ANDROID_ROUTE_LIST_ID);
    const mapSelect = ui?.mapSelect || doc?.getElementById?.('map-select') || null;
    if (!panel || !list) {
        return;
    }

    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }

    const selectableOptions = new Map(
        Array.from(mapSelect?.options || [])
            .filter((option) => isMobileArcadeRouteAllowed(option?.value))
            .map((option) => [String(option.value || ''), option])
    );
    const routeKeys = modePath === MENU_MODE_PATHS.ARCADE
        ? listMobileArcadeRouteAllowlist().filter((mapKey) => selectableOptions.has(mapKey))
        : [];
    panel.dataset.routeEmpty = routeKeys.length > 0 ? 'false' : 'true';

    routeKeys.forEach((mapKey) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'mobile-android-route-btn';
        button.dataset.mobileRouteKey = mapKey;
        button.textContent = formatMobileRouteLabel(mapKey, selectableOptions.get(mapKey));
        button.setAttribute('aria-pressed', String(mapSelect?.value === mapKey));
        button.classList.toggle('active', mapSelect?.value === mapKey);
        button.addEventListener?.('click', () => {
            if (!mapSelect) return;
            mapSelect.value = mapKey;
            if (game?.settings) {
                const startSetup = ensureStartSetup(game.settings);
                game.settings.mapKey = mapKey;
                startSetup.modeSelections.arcade.mapKey = mapKey;
            }
            dispatchMapSelectChange(mapSelect, doc);
            game?.uiManager?.syncStartSetupState?.(game.settings);
            syncMobileAndroidRouteChoices(game, ui, modePath, doc);
        });
        list.appendChild(button);
    });
}

function syncMobileAndroidEntryButtons(doc, modePath) {
    const panel = doc?.getElementById?.(MOBILE_ANDROID_ENTRY_PANEL_ID);
    if (!panel) {
        return;
    }
    panel.querySelectorAll?.('[data-mobile-mode-entry]')?.forEach((button) => {
        const buttonModePath = normalizeTarget(button?.dataset?.mobileModeEntry);
        const active = buttonModePath === modePath;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function bindMobileAndroidEntryUi(game = null, doc = document) {
    const panel = doc?.getElementById?.(MOBILE_ANDROID_ENTRY_PANEL_ID);
    if (!panel || panel.dataset.mobileAndroidEntryBound === '1') {
        return;
    }
    const ownerWindow = resolveWindow(doc);
    panel.querySelectorAll?.('[data-mobile-mode-entry]')?.forEach((button) => {
        button.addEventListener?.('click', () => {
            const modePath = resolveMobileAndroidModePath({
                localSettings: {
                    modePath: button?.dataset?.mobileModeEntry,
                },
            });
            const ui = game?.runtimeCoordinator?.getRuntimeHandle?.('ui') || game?.ui || null;
            const modeButton = Array.isArray(ui?.modePathButtons)
                ? ui.modePathButtons.find((entry) => normalizeTarget(entry?.dataset?.modePath) === modePath)
                : null;
            if (modeButton && !modeButton.disabled) {
                modeButton.click();
            } else if (game?.settings) {
                if (!game.settings.localSettings || typeof game.settings.localSettings !== 'object') {
                    game.settings.localSettings = {};
                }
                game.settings.localSettings.modePath = modePath;
                applyMobileClassicSettings(game.settings);
                game.uiManager?.menuNavigationRuntime?.showPanel?.('submenu-game', {
                    trigger: 'mobile_android_entry',
                    modePath,
                });
            }
            ownerWindow?.setTimeout?.(() => {
                if (game?.settings) {
                    applyMobileClassicSettings(game.settings);
                    game.uiManager?.syncStartSetupState?.(game.settings);
                }
                applyMobileClassicUiLocks(game);
            }, 0);
        });
    });
    panel.dataset.mobileAndroidEntryBound = '1';
}

export function applyMobileClassicUiLocks(game = null) {
    if (game?.settings) {
        applyMobileClassicSettings(game.settings);
        game.uiManager?.syncStartSetupState?.(game.settings);
    }
    const ui = game?.runtimeCoordinator?.getRuntimeHandle?.('ui') || game?.ui || null;
    if (!ui) {
        return;
    }
    const modePath = resolveCurrentMobileModePath(game);
    const doc = ui.mainMenu?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    updateMobileAndroidDocumentMode(modePath, doc);
    syncMobileAndroidMenuCopy(doc);
    bindMobileAndroidEntryUi(game, doc);
    syncMobileAndroidEntryButtons(doc, modePath);
    collapseMobileAndroidStartSections(doc);
    syncMobileAndroidQuickStarts(ui);
    if (Array.isArray(ui.sessionButtons)) {
        ui.sessionButtons.forEach((button) => {
            const sessionType = normalizeTarget(button?.dataset?.sessionType);
            setButtonLocked(button, sessionType && sessionType !== MENU_SESSION_TYPES.SINGLE);
            if (sessionType === MENU_SESSION_TYPES.SINGLE) {
                setButtonLabel(button, 'Solo spielen');
            }
        });
    }
    if (Array.isArray(ui.modePathButtons)) {
        ui.modePathButtons.forEach((button) => {
            const modePath = normalizeTarget(button?.dataset?.modePath);
            const allowed = modePath === MENU_MODE_PATHS.NORMAL || modePath === MENU_MODE_PATHS.ARCADE;
            setButtonLocked(button, modePath && !allowed);
            if (modePath === MENU_MODE_PATHS.NORMAL) {
                setButtonLabel(button, 'Classic');
                bindMobileModeResync(game, button);
            } else if (modePath === MENU_MODE_PATHS.ARCADE) {
                setButtonLabel(button, 'Parcours');
                bindMobileModeResync(game, button);
            }
        });
    }
    if (modePath === MENU_MODE_PATHS.ARCADE) {
        const selectedMapKey = pruneMapSelectToArcadeAllowlist(ui.mapSelect);
        if (selectedMapKey && game?.settings) {
            const startSetup = ensureStartSetup(game.settings);
            game.settings.mapKey = selectedMapKey;
            startSetup.modeSelections.arcade.mapKey = selectedMapKey;
        }
    }
    syncMobileAndroidRouteChoices(game, ui, modePath, doc);
    if (ui.startButton) {
        ui.startButton.textContent = modePath === MENU_MODE_PATHS.ARCADE
            ? 'Parcours starten'
            : 'Classic starten';
        ui.startButton.title = '';
    }
    if (ui.menuContext) {
        ui.menuContext.textContent = modePath === MENU_MODE_PATHS.ARCADE
            ? 'Arcade-Parcours'
            : 'Classic';
    }
}
