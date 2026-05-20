// @ts-check
/* global __APP_TARGET__ */

import { GAME_MODE_TYPES } from '../hunt/HuntMode.js';
import { MENU_SESSION_TYPES } from '../composition/core-ui/CoreSettingsPorts.js';

export const MOBILE_CLASSIC_APP_TARGET = 'mobile-classic';

const MOBILE_CLASSIC_STYLE_ID = 'mobile-classic-app-style';

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
