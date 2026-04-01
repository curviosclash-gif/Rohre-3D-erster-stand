// ============================================
// TouchInputSource.js - touch/tablet input adapter
// ============================================

import { PlayerInputSource } from './PlayerInputSource.js';
import {
    isPickupTypeSelfUsable,
    isPickupTypeShootable,
    normalizePickupType,
} from '../entities/PickupRegistry.js';

/**
 * Virtual joystick + touch buttons for tablet/mobile play.
 * Layout:
 *   Left side: virtual joystick (pitch/yaw/throttle)
 *   Right side: action buttons (fire, use, boost, next item)
 *
 * Auto-detected via 'ontouchstart' in window.
 * Auto-show bei Touch-Geraet, Auto-hide bei Desktop (C.4).
 * Touch-Controls nur im Match sichtbar, nicht im Menue (C.4).
 */
export class TouchInputSource extends PlayerInputSource {
    constructor(options = {}) {
        super('touch');
        this._disposed = false;
        this._game = options.game || null;
        this._playerIndex = Number.isInteger(options.playerIndex) ? options.playerIndex : 0;
        this._joystickRadius = options.joystickRadius || 60;
        this._joystickCenter = null;
        this._joystickDelta = { x: 0, y: 0 };
        this._joystickActive = false;
        this._joystickTouchId = null;
        this._buttonTouches = new Map();

        this._buttons = {
            fire: false,
            useItem: false,
            boost: false,
            boostPressed: false,
            nextItem: false,
            dropItem: false,
            shootMG: false,
        };
        this._prevBoost = false;

        this._containerEl = null;
        this._joystickEl = null;
        this._joystickKnobEl = null;
        this._buttonEls = {};

        this._uiVisible = false;
        this._inMatch = false;

        this._touchStartHandler = (e) => this._onTouchStart(e);
        this._touchMoveHandler = (e) => this._onTouchMove(e);
        this._touchEndHandler = (e) => this._onTouchEnd(e);
    }

    static isAvailable() {
        return typeof window !== 'undefined' && 'ontouchstart' in window;
    }

    bind(playerIndex) {
        super.bind(playerIndex);
        this._playerIndex = Number.isInteger(playerIndex) ? playerIndex : 0;
    }

    createUI(container) {
        this._containerEl = container || document.getElementById('touch-controls') || document.body;

        this._joystickEl = document.createElement('div');
        this._joystickEl.className = 'touch-joystick';
        this._joystickEl.style.cssText = `
            position: fixed; bottom: 20%; left: 5%;
            width: ${this._joystickRadius * 2}px; height: ${this._joystickRadius * 2}px;
            border-radius: 50%; border: 2px solid rgba(255,255,255,0.4);
            background: rgba(0,0,0,0.2); touch-action: none; z-index: 1000;
        `;
        this._joystickKnobEl = document.createElement('div');
        this._joystickKnobEl.className = 'touch-joystick-knob';
        this._joystickKnobEl.style.cssText = `
            position: absolute; top: 50%; left: 50%;
            width: 40px; height: 40px; margin: -20px 0 0 -20px;
            border-radius: 50%; background: rgba(255,255,255,0.6);
        `;
        this._joystickEl.appendChild(this._joystickKnobEl);
        this._containerEl.appendChild(this._joystickEl);

        const buttonDefs = [
            { id: 'fire', label: 'FIRE', bottom: '36%', right: '5%', size: 62 },
            { id: 'useItem', label: 'USE', bottom: '20%', right: '5%', size: 62 },
            { id: 'shootMG', label: 'MG', bottom: '36%', right: '20%', size: 54 },
            { id: 'nextItem', label: 'NEXT', bottom: '20%', right: '20%', size: 54 },
            { id: 'boost', label: 'BOOST', bottom: '52%', right: '12%', size: 54 },
        ];

        for (const def of buttonDefs) {
            const size = Number(def.size) || 60;
            const btn = document.createElement('div');
            btn.className = `touch-button touch-button-${def.id}`;
            btn.dataset.action = def.id;
            btn.dataset.baseLabel = def.label;
            btn.textContent = def.label;
            btn.style.cssText = `
                position: fixed; bottom: ${def.bottom}; right: ${def.right};
                width: ${size}px; height: ${size}px; border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.3);
                color: white; display: flex; align-items: center; justify-content: center;
                font-size: 11px; font-weight: bold; touch-action: none;
                user-select: none; z-index: 1000;
                transition: opacity 120ms ease, transform 120ms ease, border-color 120ms ease;
            `;
            this._containerEl.appendChild(btn);
            this._buttonEls[def.id] = btn;
        }

        this._containerEl.addEventListener('touchstart', this._touchStartHandler, { passive: false });
        this._containerEl.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
        this._containerEl.addEventListener('touchend', this._touchEndHandler, { passive: false });
        this._containerEl.addEventListener('touchcancel', this._touchEndHandler, { passive: false });

        this._setUIVisibility(false);
    }

    autoDetectAndShow() {
        if (TouchInputSource.isAvailable() && this._inMatch) {
            this._setUIVisibility(true);
        } else {
            this._setUIVisibility(false);
        }
    }

    onMatchStart() {
        this._inMatch = true;
        this.autoDetectAndShow();
    }

    onMatchEnd() {
        this._inMatch = false;
        this._setUIVisibility(false);
    }

    _setUIVisibility(visible) {
        this._uiVisible = visible;
        const display = visible ? '' : 'none';

        if (this._joystickEl) this._joystickEl.style.display = display;
        for (const el of Object.values(this._buttonEls)) {
            if (el) el.style.display = visible ? 'flex' : 'none';
        }

        if (this._containerEl?.id === 'touch-controls') {
            this._containerEl.style.display = display;
        }
    }

    get isUIVisible() {
        return this._uiVisible;
    }

    _onTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target === this._joystickEl || target === this._joystickKnobEl || this._joystickEl?.contains(target)) {
                this._joystickTouchId = touch.identifier;
                const rect = this._joystickEl.getBoundingClientRect();
                this._joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                this._joystickActive = true;
                this._updateJoystick(touch.clientX, touch.clientY);
            } else {
                const action = target?.dataset?.action;
                if (action && action in this._buttons) {
                    this._buttons[action] = true;
                    this._buttonTouches.set(touch.identifier, action);
                }
            }
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._joystickTouchId) {
                this._updateJoystick(touch.clientX, touch.clientY);
            }
        }
    }

    _onTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._joystickTouchId) {
                this._joystickActive = false;
                this._joystickTouchId = null;
                this._joystickDelta = { x: 0, y: 0 };
                if (this._joystickKnobEl) {
                    this._joystickKnobEl.style.transform = '';
                }
                continue;
            }

            const action = this._buttonTouches.get(touch.identifier);
            if (action && action in this._buttons) {
                this._buttons[action] = false;
            }
            this._buttonTouches.delete(touch.identifier);
        }
    }

    _updateJoystick(clientX, clientY) {
        if (!this._joystickCenter) return;
        let dx = clientX - this._joystickCenter.x;
        let dy = clientY - this._joystickCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this._joystickRadius;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        this._joystickDelta = { x: dx / maxDist, y: dy / maxDist };

        if (this._joystickKnobEl) {
            this._joystickKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    _resolveActionState() {
        const entityManager = this._game?.entityManager;
        const player = entityManager?.players?.[this._playerIndex] || null;
        const strategy = entityManager?.gameModeStrategy || null;
        const inventory = Array.isArray(player?.inventory) ? player.inventory : [];
        const inventoryLength = inventory.length;
        const selectedIndex = inventoryLength > 0
            ? Math.max(0, Math.min(Number(player?.selectedItemIndex) || 0, inventoryLength - 1))
            : -1;
        const rawType = selectedIndex >= 0 ? inventory[selectedIndex] : '';
        const type = normalizePickupType(rawType, { fallback: rawType });
        const modeType = String(strategy?.modeType || 'CLASSIC').trim().toUpperCase();
        const canUse = !!type && isPickupTypeSelfUsable(type, modeType);
        const canShoot = !!type && isPickupTypeShootable(type, modeType);
        const useCooldownRemaining = Math.max(0, Number(player?.itemUseCooldownRemaining || 0));
        const shootCooldownRemaining = Math.max(0, Number(player?.shootCooldown || 0));
        return {
            type,
            hasItem: selectedIndex >= 0,
            canUse,
            canShoot,
            canUseNow: canUse && useCooldownRemaining <= 0.001,
            canShootNow: canShoot && shootCooldownRemaining <= 0.001,
            canCycle: inventoryLength > 1,
            showMg: !!strategy?.hasMachineGun?.(),
            useCooldownRemaining,
            shootCooldownRemaining,
        };
    }

    _setButtonVisualState(id, { enabled = true, visible = true, title = '' } = {}) {
        const button = this._buttonEls[id];
        if (!button) return;
        button.style.display = visible ? 'flex' : 'none';
        button.title = title;
        button.dataset.enabled = enabled ? '1' : '0';
        button.style.opacity = enabled ? '1' : '0.35';
        button.style.transform = enabled ? 'scale(1)' : 'scale(0.96)';
        button.style.borderColor = enabled ? 'rgba(132,226,255,0.85)' : 'rgba(255,255,255,0.18)';
        button.style.boxShadow = enabled ? '0 0 14px rgba(0,170,255,0.18)' : 'none';
    }

    _syncActionButtons(actionState) {
        const typeLabel = actionState?.type ? actionState.type.replace(/_/g, ' ') : 'Kein Item';
        this._setButtonVisualState('fire', {
            enabled: !!actionState?.canShootNow,
            visible: true,
            title: actionState?.canShoot
                ? `${typeLabel}${actionState.canShootNow ? '' : ` | Shoot-CD ${actionState.shootCooldownRemaining.toFixed(1)}s`}`
                : `${typeLabel} | Nicht verschiessbar`,
        });
        this._setButtonVisualState('useItem', {
            enabled: !!actionState?.canUseNow,
            visible: true,
            title: actionState?.canUse
                ? `${typeLabel}${actionState.canUseNow ? '' : ` | Use-CD ${actionState.useCooldownRemaining.toFixed(1)}s`}`
                : `${typeLabel} | Nicht direkt nutzbar`,
        });
        this._setButtonVisualState('nextItem', {
            enabled: !!actionState?.canCycle,
            visible: true,
            title: actionState?.canCycle ? 'Naechstes Inventar-Item' : 'Kein weiteres Inventar-Item',
        });
        this._setButtonVisualState('shootMG', {
            enabled: !!actionState?.showMg,
            visible: !!actionState?.showMg,
            title: actionState?.showMg ? 'Maschinengewehr' : '',
        });

        if (!actionState?.canShootNow) this._buttons.fire = false;
        if (!actionState?.canUseNow) this._buttons.useItem = false;
        if (!actionState?.canCycle) this._buttons.nextItem = false;
        if (!actionState?.showMg) this._buttons.shootMG = false;
    }

    poll() {
        const deadzone = 0.15;
        const jx = Math.abs(this._joystickDelta.x) > deadzone ? this._joystickDelta.x : 0;
        const jy = Math.abs(this._joystickDelta.y) > deadzone ? this._joystickDelta.y : 0;
        const actionState = this._resolveActionState();
        this._syncActionButtons(actionState);

        const boostDown = this._buttons.boost;
        const boostPressed = boostDown && !this._prevBoost;
        this._prevBoost = boostDown;

        return {
            pitchUp: jy < -deadzone,
            pitchDown: jy > deadzone,
            yawLeft: jx < -deadzone,
            yawRight: jx > deadzone,
            rollLeft: false,
            rollRight: false,
            boost: boostDown,
            boostPressed,
            cameraSwitch: false,
            dropItem: false,
            useItem: this._buttons.useItem && !!actionState?.canUseNow,
            shootItem: this._buttons.fire && !!actionState?.canShootNow,
            shootMG: this._buttons.shootMG && !!actionState?.showMg,
            nextItem: this._buttons.nextItem,
        };
    }

    removeUI() {
        if (this._containerEl) {
            this._containerEl.removeEventListener('touchstart', this._touchStartHandler);
            this._containerEl.removeEventListener('touchmove', this._touchMoveHandler);
            this._containerEl.removeEventListener('touchend', this._touchEndHandler);
            this._containerEl.removeEventListener('touchcancel', this._touchEndHandler);
        }
        if (this._joystickEl?.parentNode) this._joystickEl.parentNode.removeChild(this._joystickEl);
        for (const el of Object.values(this._buttonEls)) {
            if (el?.parentNode) el.parentNode.removeChild(el);
        }
        this._buttonEls = {};
        this._buttonTouches.clear();
        this._joystickEl = null;
        this._joystickKnobEl = null;
    }

    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this.removeUI();
        super.dispose();
    }
}
