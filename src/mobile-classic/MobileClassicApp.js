// @ts-check
/* global __APP_TARGET__ */

import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { MENU_SESSION_TYPES } from '../composition/core-ui/CoreSettingsPorts.js';
import {
    createMobileClassicGithubUpdateConfig,
    normalizeMobileClassicUpdateConfig,
} from './MobileClassicUpdateConfig.js';

export const MOBILE_CLASSIC_APP_TARGET = 'mobile-classic';

const MOBILE_CLASSIC_STYLE_ID = 'mobile-classic-app-style';
const MOBILE_CLASSIC_UPDATE_PANEL_ID = 'mobile-classic-update-panel';
const MOBILE_CLASSIC_UPDATE_CHECK_ID = 'mobile-classic-update-check';
const MOBILE_CLASSIC_UPDATE_OPEN_ID = 'mobile-classic-update-open';
const MOBILE_CLASSIC_UPDATE_STATUS_ID = 'mobile-classic-update-status';
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

    settings.mode = '1p';
    settings.gameMode = GAME_MODE_TYPES.CLASSIC;
    settings.localSettings.sessionType = MENU_SESSION_TYPES.SINGLE;
    settings.localSettings.modePath = 'normal';
    settings.gameplay.planarMode = false;
    settings.hunt.respawnEnabled = false;

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
body.mobile-classic-app .mode-path-btn[data-mode-path="arcade"],
body.mobile-classic-app .mode-path-btn[data-mode-path="fight"],
body.mobile-classic-app #submenu-multiplayer,
body.mobile-classic-app #multiplayer-inline-stub,
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

body.mobile-classic-app #menu-nav {
    grid-template-columns: minmax(0, 1fr);
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
    min-width: 72px;
    padding: 9px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
    line-height: 1;
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
`;
    doc.head.appendChild(style);
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

export function applyMobileClassicUiLocks(game = null) {
    const ui = game?.runtimeCoordinator?.getRuntimeHandle?.('ui') || game?.ui || null;
    if (!ui) {
        return;
    }
    if (Array.isArray(ui.sessionButtons)) {
        ui.sessionButtons.forEach((button) => {
            const sessionType = normalizeTarget(button?.dataset?.sessionType);
            setButtonLocked(button, sessionType && sessionType !== MENU_SESSION_TYPES.SINGLE);
            if (sessionType === MENU_SESSION_TYPES.SINGLE) {
                setButtonLabel(button, 'Classic');
            }
        });
    }
    if (Array.isArray(ui.modePathButtons)) {
        ui.modePathButtons.forEach((button) => {
            const modePath = normalizeTarget(button?.dataset?.modePath);
            setButtonLocked(button, modePath && modePath !== 'normal');
        });
    }
    if (ui.startButton) {
        ui.startButton.textContent = 'Classic starten';
        ui.startButton.title = '';
    }
    if (ui.menuContext) {
        ui.menuContext.textContent = 'Classic';
    }
}
