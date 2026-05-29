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
import {
    MOBILE_ARCADE_DEFAULT_MAP_KEY,
    isMobileArcadeRouteAllowed,
    listMobileArcadeRouteAllowlist,
    resolveMobileArcadeMapKey,
} from '../mobile-arcade/MobileArcadeApp.js';

export const MOBILE_CLASSIC_APP_TARGET = 'mobile-classic';

const MOBILE_CLASSIC_STYLE_ID = 'mobile-classic-app-style';
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

function ensureMobileClassicStyles(doc = document) {
    if (doc.getElementById(MOBILE_CLASSIC_STYLE_ID)) {
        return;
    }
    const style = doc.createElement('style');
    style.id = MOBILE_CLASSIC_STYLE_ID;
    style.textContent = `
html.mobile-classic-app,
body.mobile-classic-app {
    width: 100%;
    min-height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: manipulation;
    background: #04070b;
}

body.mobile-classic-app {
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

body.mobile-classic-app .nav-btn[data-session-type="multiplayer"],
body.mobile-classic-app .nav-btn[data-session-type="splitscreen"],
body.mobile-classic-app .mode-path-btn[data-mode-path="fight"],
body.mobile-classic-app #submenu-multiplayer,
body.mobile-classic-app #multiplayer-inline-stub,
body.mobile-classic-app #btn-level3-reset,
body.mobile-classic-app #btn-level4-reset,
body.mobile-classic-app #btn-open-expert,
body.mobile-classic-app #btn-open-developer,
body.mobile-classic-app #btn-open-debug,
body.mobile-classic-app #hunt-mode-hint,
body.mobile-classic-app #fight-player-hp-setting,
body.mobile-classic-app #fight-mg-damage-setting,
body.mobile-classic-app #fight-tuning-hint,
body.mobile-classic-app #arcade-ghost-duel-row,
body.mobile-classic-app #arcade-ghost-trail-collision-row {
    display: none !important;
}

body.mobile-classic-app #level4-tab-controls,
body.mobile-classic-app #level4-section-controls,
body.mobile-classic-app #level4-tab-advanced-map,
body.mobile-classic-app #level4-section-advanced-map,
body.mobile-classic-app #level4-tab-tools,
body.mobile-classic-app #level4-section-tools,
body.mobile-classic-app #submenu-game .setup-search-grid,
body.mobile-classic-app #btn-map-favorite-toggle,
body.mobile-classic-app #btn-vehicle-favorite-toggle,
body.mobile-classic-app #submenu-game .menu-section:has(#arcade-ghost-duel-mode-select),
body.mobile-classic-app #submenu-game .menu-section:has(#btn-dimension-planar),
body.mobile-classic-app #submenu-game .menu-section:has(#bot-policy-strategy),
body.mobile-classic-app label:has(#mobile-tilt-debug-toggle),
body.mobile-classic-app label:has(#mobile-tilt-sensor-hz-toggle),
body.mobile-classic-app label[for="speed-slider"],
body.mobile-classic-app #speed-slider,
body.mobile-classic-app label[for="turn-slider"],
body.mobile-classic-app #turn-slider,
body.mobile-classic-app label[for="plane-size-slider"],
body.mobile-classic-app #plane-size-slider,
body.mobile-classic-app label[for="trail-width-slider"],
body.mobile-classic-app #trail-width-slider,
body.mobile-classic-app label[for="gap-size-slider"],
body.mobile-classic-app #gap-size-slider,
body.mobile-classic-app label[for="gap-frequency-slider"],
body.mobile-classic-app #gap-frequency-slider,
body.mobile-classic-app label[for="item-amount-slider"],
body.mobile-classic-app #item-amount-slider,
body.mobile-classic-app label[for="fire-rate-slider"],
body.mobile-classic-app #fire-rate-slider,
body.mobile-classic-app label[for="lockon-slider"],
body.mobile-classic-app #lockon-slider,
body.mobile-classic-app label[for="next-checkpoint-glow-slider"],
body.mobile-classic-app #next-checkpoint-glow-slider,
body.mobile-classic-app label[for="mg-trail-aim-slider"],
body.mobile-classic-app #mg-trail-aim-slider,
body.mobile-classic-app label[for="recording-profile-select"],
body.mobile-classic-app #recording-profile-select,
body.mobile-classic-app label[for="recording-hud-mode-select"],
body.mobile-classic-app #recording-hud-mode-select,
body.mobile-classic-app #recording-profile-hint,
body.mobile-classic-app label[for="normal-camera-perspective-select"],
body.mobile-classic-app #normal-camera-perspective-select,
body.mobile-classic-app label:has(#normal-camera-speed-fov-toggle),
body.mobile-classic-app label[for="normal-camera-speed-fov-intensity-slider"],
body.mobile-classic-app #normal-camera-speed-fov-intensity-slider,
body.mobile-classic-app label[for="normal-camera-thruster-exhaust-intensity-slider"],
body.mobile-classic-app #normal-camera-thruster-exhaust-intensity-slider,
body.mobile-classic-app #normal-camera-perspective-hint,
body.mobile-classic-app label:has(#invert-p2),
body.mobile-classic-app label:has(#cockpit-cam-p1),
body.mobile-classic-app label:has(#cockpit-cam-p2) {
    display: none !important;
}

body.mobile-classic-app #menu-nav {
    grid-template-columns: minmax(0, 1fr);
}

body.mobile-classic-app #mobile-android-entry-panel {
    display: none;
}

body.mobile-classic-app #main-menu[data-menu-depth="1"] #mobile-android-entry-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}

body.mobile-classic-app #main-menu[data-menu-depth="1"] #menu-nav {
    display: none !important;
}

body.mobile-classic-app .mobile-android-entry-btn {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 6px;
    min-height: 82px;
    border-radius: 8px;
    letter-spacing: 0 !important;
    text-align: center;
}

body.mobile-classic-app .mobile-android-entry-title {
    color: #f4fbff;
    font-size: 1.08rem;
    font-weight: 800;
    line-height: 1.1;
}

body.mobile-classic-app .mobile-android-entry-copy {
    max-width: 22ch;
    color: #9fc3da;
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.25;
}

body.mobile-classic-app #game-container {
    min-height: 100dvh;
}

body.mobile-classic-app #main-menu {
    max-width: min(460px, calc(100vw - 22px));
    max-height: calc(100dvh - max(18px, env(safe-area-inset-top)) - max(18px, env(safe-area-inset-bottom)));
    margin: max(10px, env(safe-area-inset-top)) auto max(10px, env(safe-area-inset-bottom));
    border-color: rgba(126, 218, 255, 0.32);
}

body.mobile-classic-app #main-menu[data-menu-depth="3"] .menu-hero-shell,
body.mobile-classic-app #main-menu[data-menu-depth="4"] .menu-hero-shell,
body.mobile-classic-app #main-menu[data-menu-depth="5"] .menu-hero-shell {
    margin-bottom: 6px;
    align-items: center;
}

body.mobile-classic-app #main-menu[data-menu-depth="3"] .menu-brand-copy,
body.mobile-classic-app #main-menu[data-menu-depth="4"] .menu-brand-copy,
body.mobile-classic-app #main-menu[data-menu-depth="5"] .menu-brand-copy {
    display: none;
}

body.mobile-classic-app #mobile-classic-update-panel {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    margin-left: auto;
    min-width: 112px;
}

body.mobile-classic-app .mobile-classic-update-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
}

body.mobile-classic-app .mobile-classic-update-btn {
    width: auto;
    min-width: 0;
    min-height: 34px;
    padding: 7px 9px;
    border-radius: 8px;
    font-size: 0.72rem;
    line-height: 1;
    opacity: 0.84;
}

body.mobile-classic-app #mobile-classic-update-open[hidden] {
    display: none !important;
}

body.mobile-classic-app .mobile-classic-update-status {
    min-height: 1em;
    max-width: 170px;
    color: #a9c6df;
    font-size: 0.72rem;
    line-height: 1.25;
    text-align: right;
    overflow-wrap: anywhere;
}

body.mobile-classic-app #menu-selection-summary {
    font-size: 13px;
    line-height: 1.35;
}

body.mobile-classic-app #submenu-game .submenu-header {
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

body.mobile-classic-app #submenu-game .submenu-title {
    font-size: 1rem;
    line-height: 1.15;
}

body.mobile-classic-app #submenu-game .back-btn {
    min-height: 34px;
    padding: 7px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
}

body.mobile-classic-app #submenu-game .level3-body {
    gap: 8px;
}

body.mobile-classic-app #submenu-game .start-rail {
    top: 6px;
    gap: 8px;
    padding: 10px;
    border-radius: 8px;
}

body.mobile-classic-app #submenu-game .start-rail-copy {
    gap: 6px;
}

body.mobile-classic-app #submenu-game .start-rail-copy .section-title {
    display: none;
}

body.mobile-classic-app #submenu-game .start-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

body.mobile-classic-app #submenu-game .start-summary-block {
    min-width: 0;
    padding: 7px 8px;
    border-radius: 8px;
}

body.mobile-classic-app #submenu-game .start-summary-block[data-summary-label="session"],
body.mobile-classic-app #submenu-game .start-summary-block[data-summary-label="ghost_kollision"],
body.mobile-classic-app #submenu-game .start-summary-block[data-summary-label="ansicht"] {
    display: none;
}

body.mobile-classic-app #submenu-game .start-summary-label {
    font-size: 0.58rem;
    letter-spacing: 0;
}

body.mobile-classic-app #submenu-game .start-summary-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.78rem;
}

body.mobile-classic-app #submenu-game .start-rail-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

body.mobile-classic-app #submenu-game .start-rail-actions .start-btn {
    grid-column: 1 / -1;
    order: -1;
    min-height: 44px;
    border-radius: 8px;
}

body.mobile-classic-app #submenu-game .start-rail-actions .secondary-btn {
    min-height: 34px;
    padding: 7px 8px;
    border-radius: 8px;
    font-size: 0.68rem;
}

body.mobile-classic-app .mobile-android-route-panel {
    display: none;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(255, 210, 118, 0.34);
    border-radius: 8px;
    background: linear-gradient(160deg, rgba(36, 24, 10, 0.88), rgba(13, 24, 32, 0.82));
}

body.mobile-classic-app[data-mobile-mode-path="arcade"] .mobile-android-route-panel {
    display: grid;
}

body.mobile-classic-app .mobile-android-route-title {
    margin: 0;
    color: #ffe2ad;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
}

body.mobile-classic-app .mobile-android-route-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

body.mobile-classic-app .mobile-android-route-btn {
    min-width: 0;
    min-height: 42px;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 220, 150, 0.3);
    background: rgba(255, 210, 118, 0.08);
    color: #f8f0dc;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
    text-align: left;
    overflow-wrap: anywhere;
}

body.mobile-classic-app .mobile-android-route-btn.active {
    border-color: rgba(255, 229, 170, 0.78);
    background: rgba(255, 210, 118, 0.2);
    color: #fff8e8;
}

body.mobile-classic-app .mobile-android-route-empty {
    display: none;
    margin: 0;
    color: #c9af88;
    font-size: 0.72rem;
}

body.mobile-classic-app .mobile-android-route-panel[data-route-empty="true"] .mobile-android-route-empty {
    display: block;
}

body.mobile-classic-app .arcade-inline-surface,
body.mobile-classic-app .start-section-card[data-start-section="presets"] {
    display: none !important;
}

body.mobile-classic-app #submenu-game .start-section-card {
    border-radius: 8px;
}

body.mobile-classic-app #submenu-game .menu-accordion-summary {
    padding: 10px 12px;
}

body.mobile-classic-app #submenu-game .menu-accordion-body {
    gap: 8px;
    padding: 0 12px 12px;
}

body.mobile-classic-app #submenu-game .menu-preview-card,
body.mobile-classic-app #submenu-game .setup-chip-grid {
    display: none;
}

@media (max-height: 520px) {
    body.mobile-classic-app #main-menu {
        max-width: min(760px, calc(100vw - 12px));
        max-height: calc(100dvh - max(8px, env(safe-area-inset-top)) - max(8px, env(safe-area-inset-bottom)));
        margin: max(4px, env(safe-area-inset-top)) auto max(4px, env(safe-area-inset-bottom));
    }

    body.mobile-classic-app .menu-content {
        padding: 8px;
    }

    body.mobile-classic-app #main-menu[data-menu-depth="3"] .menu-hero-shell,
    body.mobile-classic-app #main-menu[data-menu-depth="4"] .menu-hero-shell,
    body.mobile-classic-app #main-menu[data-menu-depth="5"] .menu-hero-shell {
        display: none;
    }

    body.mobile-classic-app #submenu-game .submenu-header {
        margin-bottom: 5px;
    }

    body.mobile-classic-app #submenu-game .start-rail {
        position: static;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: stretch;
        padding: 8px;
    }

    body.mobile-classic-app #submenu-game .start-rail-actions {
        min-width: 210px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    body.mobile-classic-app #submenu-game .start-summary-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    body.mobile-classic-app .mobile-android-route-list {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    body.mobile-classic-app #submenu-game .start-section-card[data-start-section="map"] {
        display: none;
    }
}

body.mobile-classic-app #touch-controls {
    position: fixed;
    inset: 0;
    pointer-events: auto;
    z-index: 1000;
}

body.mobile-classic-app .touch-joystick {
    left: max(14px, env(safe-area-inset-left)) !important;
    bottom: max(22px, env(safe-area-inset-bottom)) !important;
    width: 112px !important;
    height: 112px !important;
    border-color: rgba(116, 225, 255, 0.76) !important;
    background: rgba(2, 14, 24, 0.42) !important;
}

body.mobile-classic-app #touch-controls[data-touch-control-mode="tilt"] .touch-joystick {
    opacity: 0.58;
}

body.mobile-classic-app #touch-controls[data-tilt-active="1"] .touch-joystick {
    display: none !important;
}

body.mobile-classic-app .touch-button {
    border-color: rgba(255, 210, 118, 0.7) !important;
    background: rgba(6, 16, 24, 0.52) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32) !important;
    letter-spacing: 0 !important;
}

body.mobile-classic-app #touch-controls[data-touch-control-mode="tilt"] .touch-button-fire {
    right: max(18px, env(safe-area-inset-right)) !important;
    bottom: max(26px, env(safe-area-inset-bottom)) !important;
    width: 96px !important;
    height: 96px !important;
    border-width: 3px !important;
    border-color: rgba(255, 214, 118, 0.95) !important;
    background: radial-gradient(circle at 35% 30%, rgba(255, 234, 166, 0.95), rgba(242, 126, 45, 0.88) 56%, rgba(70, 18, 8, 0.72)) !important;
    color: #10151b !important;
    font-size: 14px !important;
    font-weight: 900 !important;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38), 0 0 24px rgba(255, 178, 82, 0.42) !important;
}

body.mobile-classic-app .touch-tilt-button {
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
}

body.mobile-classic-app .touch-tilt-button[data-active="1"] {
    border-color: rgba(136, 255, 189, 0.92) !important;
    background: rgba(4, 32, 26, 0.72) !important;
    color: #dfffee !important;
}

body.mobile-classic-app .touch-button-fire,
body.mobile-classic-app .touch-button-useItem {
    right: max(14px, env(safe-area-inset-right)) !important;
}

body.mobile-classic-app .touch-button-shootMG,
body.mobile-classic-app .touch-button-nextItem {
    right: calc(max(14px, env(safe-area-inset-right)) + 72px) !important;
}

body.mobile-classic-app .touch-button-fire,
body.mobile-classic-app .touch-button-shootMG {
    bottom: calc(max(22px, env(safe-area-inset-bottom)) + 82px) !important;
}

body.mobile-classic-app .touch-button-useItem,
body.mobile-classic-app .touch-button-nextItem {
    bottom: max(22px, env(safe-area-inset-bottom)) !important;
}

body.mobile-classic-app .touch-button-boost {
    right: calc(max(14px, env(safe-area-inset-right)) + 34px) !important;
    bottom: calc(max(22px, env(safe-area-inset-bottom)) + 154px) !important;
}

body.mobile-classic-app #touch-controls[data-touch-control-mode="tilt"] .touch-button-useItem {
    right: calc(max(18px, env(safe-area-inset-right)) + 124px) !important;
    bottom: max(28px, env(safe-area-inset-bottom)) !important;
    width: 58px !important;
    height: 58px !important;
}

body.mobile-classic-app #touch-controls[data-touch-control-mode="tilt"] .touch-button-nextItem {
    right: calc(max(18px, env(safe-area-inset-right)) + 190px) !important;
    bottom: max(28px, env(safe-area-inset-bottom)) !important;
    width: 52px !important;
    height: 52px !important;
}

body.mobile-classic-app #touch-controls[data-touch-control-mode="tilt"] .touch-button-boost {
    right: max(18px, env(safe-area-inset-right)) !important;
    bottom: calc(max(28px, env(safe-area-inset-bottom)) + 108px) !important;
    width: 62px !important;
    height: 62px !important;
}

body.mobile-classic-app .touch-button-pause {
    top: max(14px, env(safe-area-inset-top)) !important;
    right: max(14px, env(safe-area-inset-right)) !important;
    bottom: auto !important;
    width: 58px !important;
    height: 42px !important;
    border-radius: 8px !important;
    font-size: 11px !important;
    z-index: 1002 !important;
}

body.mobile-classic-app #parcours-hud {
    top: max(12px, env(safe-area-inset-top)) !important;
    left: 50% !important;
    min-width: 150px !important;
    max-width: min(44vw, 230px) !important;
    padding: 7px 9px !important;
    border-radius: 8px !important;
    font-size: 12px !important;
    pointer-events: none !important;
    z-index: 912 !important;
}

body.mobile-classic-app #parcours-route {
    font-size: 0.58rem !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

body.mobile-classic-app #parcours-progress {
    font-size: 0.92rem !important;
}

body.mobile-classic-app #parcours-timer,
body.mobile-classic-app #parcours-status {
    font-size: 0.68rem !important;
}

body.mobile-classic-app #parcours-minimap {
    top: max(68px, calc(env(safe-area-inset-top) + 66px)) !important;
    right: max(10px, env(safe-area-inset-right)) !important;
    width: 118px !important;
    height: 118px !important;
    opacity: 0.92;
    z-index: 909 !important;
}

body.mobile-classic-app #arcade-score-hud {
    top: max(68px, calc(env(safe-area-inset-top) + 66px)) !important;
    left: max(10px, env(safe-area-inset-left)) !important;
    min-width: 154px !important;
    max-width: 178px !important;
    padding: 7px 8px !important;
    gap: 5px !important;
    font-size: 10px !important;
}

body.mobile-classic-app #arcade-score-hud .arcade-score-hud-breakdown,
body.mobile-classic-app #arcade-score-hud .arcade-score-hud-modifier {
    display: none !important;
}

body.mobile-classic-app #arcade-mission-hud {
    top: max(190px, calc(env(safe-area-inset-top) + 188px)) !important;
    right: max(10px, env(safe-area-inset-right)) !important;
    max-width: 150px !important;
    font-size: 10px !important;
}

body.mobile-classic-app #arcade-mission-hud .arcade-mission-card {
    min-width: 128px !important;
    padding: 4px 7px !important;
}

body.mobile-classic-app #parcours-xp-notification,
body.mobile-classic-app #parcours-split-delta,
body.mobile-classic-app #arcade-stats-flash,
body.mobile-classic-app #parcours-penalty-notification {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(70vw, 280px);
    padding: 6px 9px;
    border-radius: 8px;
    background: rgba(7, 17, 27, 0.88);
    border: 1px solid rgba(255, 210, 118, 0.48);
    color: #f8f4df;
    font-size: 0.74rem;
    font-weight: 800;
    text-align: center;
    pointer-events: none;
    z-index: 913;
}

body.mobile-classic-app #parcours-xp-notification,
body.mobile-classic-app #arcade-stats-flash {
    top: max(132px, calc(env(safe-area-inset-top) + 130px));
}

body.mobile-classic-app #parcours-split-delta,
body.mobile-classic-app #parcours-penalty-notification {
    top: max(168px, calc(env(safe-area-inset-top) + 166px));
}

body.mobile-classic-app #parcours-split-delta.split-better {
    color: #a8ffbf;
    border-color: rgba(126, 255, 170, 0.58);
}

body.mobile-classic-app #parcours-split-delta.split-worse,
body.mobile-classic-app #parcours-penalty-notification {
    color: #ffb2a2;
    border-color: rgba(255, 132, 112, 0.62);
}

body.mobile-classic-app #mobile-arcade-ghost-status {
    position: fixed;
    left: max(14px, env(safe-area-inset-left));
    bottom: calc(max(22px, env(safe-area-inset-bottom)) + 126px);
    display: none;
    max-width: 118px;
    color: rgba(210, 245, 255, 0.82);
    font-size: 10px;
    font-weight: 800;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
    pointer-events: none;
    z-index: 1001;
}

body.mobile-classic-app[data-mobile-mode-path="arcade"][data-mobile-menu-visible="0"] #mobile-arcade-ghost-status {
    display: block;
}
`;
    doc.head.appendChild(style);
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
