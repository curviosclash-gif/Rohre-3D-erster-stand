// ─── Arcade Vehicle Manager UI: Ship Selection, Loadout, Upgrades ───

import { resolveMenuCatalogText } from '../menu/MenuTextCatalog.js';
import {
    loadVehicleProfiles,
    saveVehicleProfiles,
    getOrCreateProfile,
    applyUpgrade,
    xpToNextLevel,
} from '../../state/arcade/ArcadeVehicleProfile.js';
import {
    UPGRADE_TIERS,
    getUpgradeCost,
    canUpgrade,
} from '../../entities/arcade/ArcadeBlueprintSchema.js';
import { getVehicleIds } from '../../entities/vehicle-registry.js';

function t(textId, fallback) {
    return resolveMenuCatalogText(textId, fallback);
}

function createElement(tag, className, textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

const UPGRADE_SLOT_DISPLAY = [
    { key: 'core', label: 'Core' },
    { key: 'nose', label: 'Nose' },
    { key: 'wing_left', label: 'Wing L' },
    { key: 'wing_right', label: 'Wing R' },
    { key: 'engine_left', label: 'Engine L' },
    { key: 'engine_right', label: 'Engine R' },
    { key: 'utility', label: 'Utility' },
];

function getNextTier(currentTier) {
    if (!currentTier || currentTier === 'T1') return 'T2';
    if (currentTier === 'T2') return 'T3';
    return null;
}

export function setupArcadeVehicleManager(ctx = {}) {
    const ui = ctx.ui || {};
    const settings = ctx.settings || {};
    const emit = typeof ctx.emit === 'function' ? ctx.emit : null;
    const eventTypes = ctx.eventTypes || {};
    const bind = typeof ctx.bind === 'function' ? ctx.bind : null;
    const store = ctx.settingsManager?.store || null;

    if (!bind) return;

    // ─── Build DOM ───

    const container = createElement('section', 'arcade-surface-card arcade-vehicle-manager');
    container.id = 'arcade-vehicle-manager';
    container.appendChild(createElement('h3', 'arcade-surface-card-title', t('menu.arcade.vehicle.title', 'Vehicle Manager')));

    // Ship selector grid
    const shipGrid = createElement('div', 'arcade-vehicle-grid');
    const vehicleIds = getVehicleIds();
    const shipButtons = [];

    for (let i = 0; i < vehicleIds.length; i += 1) {
        const btn = createElement('button', 'arcade-vehicle-card', vehicleIds[i]);
        btn.type = 'button';
        btn.dataset.vehicleId = vehicleIds[i];
        shipGrid.appendChild(btn);
        shipButtons.push(btn);
    }
    container.appendChild(shipGrid);

    // Profile display
    const profileDisplay = createElement('div', 'arcade-vehicle-profile');
    const levelLine = createElement('p', 'arcade-vehicle-level', 'Level 1 | XP 0/100');
    profileDisplay.appendChild(levelLine);
    const xpBar = createElement('div', 'arcade-vehicle-xp-bar');
    const xpFill = createElement('div', 'arcade-vehicle-xp-fill');
    xpBar.appendChild(xpFill);
    profileDisplay.appendChild(xpBar);
    container.appendChild(profileDisplay);

    // Slot upgrade grid
    const slotGrid = createElement('div', 'arcade-vehicle-slots');
    const slotRefs = {};

    for (let i = 0; i < UPGRADE_SLOT_DISPLAY.length; i += 1) {
        const slot = UPGRADE_SLOT_DISPLAY[i];
        const row = createElement('div', 'arcade-vehicle-slot-row');
        const label = createElement('span', 'arcade-vehicle-slot-label', slot.label);
        const tierLabel = createElement('span', 'arcade-vehicle-slot-tier', 'T1');
        const upgradeBtn = createElement('button', 'secondary-btn arcade-vehicle-upgrade-btn', 'Upgrade');
        upgradeBtn.type = 'button';
        upgradeBtn.dataset.slot = slot.key;
        row.appendChild(label);
        row.appendChild(tierLabel);
        row.appendChild(upgradeBtn);
        slotGrid.appendChild(row);
        slotRefs[slot.key] = { tierLabel, upgradeBtn };
    }
    container.appendChild(slotGrid);

    // Save loadout hint
    const saveHint = createElement('p', 'menu-hint', t('menu.arcade.vehicle.autosave', 'Upgrades werden automatisch gespeichert.'));
    container.appendChild(saveHint);

    // ─── State ───

    let profiles = loadVehicleProfiles(store);
    let selectedVehicleId = String(settings?.vehicles?.PLAYER_1 || vehicleIds[0] || 'ship1');

    function getProfile() {
        return getOrCreateProfile(profiles, selectedVehicleId);
    }

    function syncDisplay() {
        const profile = getProfile();
        const xpInfo = xpToNextLevel(profile);

        // Level line
        levelLine.textContent = `Level ${profile.level} | XP ${xpInfo.current}/${xpInfo.required}`;
        xpFill.style.width = `${(xpInfo.progress * 100).toFixed(1)}%`;

        // Ship buttons
        for (let i = 0; i < shipButtons.length; i += 1) {
            shipButtons[i].classList.toggle('selected', shipButtons[i].dataset.vehicleId === selectedVehicleId);
        }

        // Slot tiers
        const unlockedSet = new Set(profile.unlockedSlots || []);
        for (let i = 0; i < UPGRADE_SLOT_DISPLAY.length; i += 1) {
            const slot = UPGRADE_SLOT_DISPLAY[i];
            const ref = slotRefs[slot.key];
            if (!ref) continue;

            const currentTier = profile.upgrades?.[slot.key] || 'T1';
            const nextTier = getNextTier(currentTier);
            ref.tierLabel.textContent = currentTier;

            if (!nextTier) {
                ref.upgradeBtn.textContent = 'MAX';
                ref.upgradeBtn.disabled = true;
            } else {
                const cost = getUpgradeCost(slot.key, nextTier);
                const canDo = canUpgrade(slot.key, nextTier, profile.level);
                const tierKey = `${slot.key}_${nextTier.toLowerCase()}`;
                const slotUnlocked = unlockedSet.has(slot.key) || unlockedSet.has(tierKey);
                ref.upgradeBtn.textContent = `→ ${nextTier} (${cost} XP)`;
                ref.upgradeBtn.disabled = !canDo || !slotUnlocked;
            }
        }
    }

    // ─── Events ───

    for (let i = 0; i < shipButtons.length; i += 1) {
        bind(shipButtons[i], 'click', () => {
            selectedVehicleId = shipButtons[i].dataset.vehicleId;
            syncDisplay();
        });
    }

    for (let i = 0; i < UPGRADE_SLOT_DISPLAY.length; i += 1) {
        const slot = UPGRADE_SLOT_DISPLAY[i];
        const ref = slotRefs[slot.key];
        if (!ref) continue;

        bind(ref.upgradeBtn, 'click', () => {
            const profile = getProfile();
            const currentTier = profile.upgrades?.[slot.key] || 'T1';
            const nextTier = getNextTier(currentTier);
            if (!nextTier) return;

            const updated = applyUpgrade(profile, slot.key, nextTier);
            profiles[selectedVehicleId] = updated;
            saveVehicleProfiles(store, profiles);

            if (emit && eventTypes.SHOW_STATUS_TOAST) {
                emit(eventTypes.SHOW_STATUS_TOAST, {
                    message: `${slot.label} upgraded to ${nextTier}`,
                    tone: 'info',
                    duration: 1200,
                });
            }

            syncDisplay();
        });
    }

    syncDisplay();

    return { container, syncDisplay, getSelectedVehicleId: () => selectedVehicleId };
}
