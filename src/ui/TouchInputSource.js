// ============================================
// TouchInputSource.js - touch/tablet input adapter
// ============================================

import { PlayerInputSource } from './PlayerInputSource.js';

/**
 * Virtual joystick + touch buttons for tablet/mobile play.
 * Layout:
 *   Left side: virtual joystick (pitch/yaw/throttle)
 *   Right side: action buttons (fire, boost, next item)
 *
 * Auto-detected via 'ontouchstart' in window.
 * Auto-show bei Touch-Gerät, Auto-hide bei Desktop (C.4).
 * Touch-Controls nur im Match sichtbar, nicht im Menü (C.4).
 */
export class TouchInputSource extends PlayerInputSource {
    constructor(options = {}) {
        super('touch');
        this._joystickRadius = options.joystickRadius || 60;
        this._joystickCenter = null;
        this._joystickDelta = { x: 0, y: 0 };
        this._joystickActive = false;
        this._joystickTouchId = null;

        this._buttons = {
            fire: false,
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

        /** Whether the touch UI is currently shown (C.4) */
        this._uiVisible = false;
        /** Whether we are in a match (C.4) */
        this._inMatch = false;

        this._touchStartHandler = (e) => this._onTouchStart(e);
        this._touchMoveHandler = (e) => this._onTouchMove(e);
        this._touchEndHandler = (e) => this._onTouchEnd(e);
    }

    static isAvailable() {
        return typeof window !== 'undefined' && 'ontouchstart' in window;
    }

    createUI(container) {
        this._containerEl = container || document.getElementById('touch-controls') || document.body;

        // Create joystick
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

        // Create buttons
        const buttonDefs = [
            { id: 'fire', label: 'FIRE', bottom: '35%', right: '5%' },
            { id: 'boost', label: 'BOOST', bottom: '20%', right: '5%' },
            { id: 'shootMG', label: 'MG', bottom: '35%', right: '20%' },
        ];

        for (const def of buttonDefs) {
            const btn = document.createElement('div');
            btn.className = `touch-button touch-button-${def.id}`;
            btn.dataset.action = def.id;
            btn.textContent = def.label;
            btn.style.cssText = `
                position: fixed; bottom: ${def.bottom}; right: ${def.right};
                width: 60px; height: 60px; border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.3);
                color: white; display: flex; align-items: center; justify-content: center;
                font-size: 11px; font-weight: bold; touch-action: none;
                user-select: none; z-index: 1000;
            `;
            this._containerEl.appendChild(btn);
            this._buttonEls[def.id] = btn;
        }

        this._containerEl.addEventListener('touchstart', this._touchStartHandler, { passive: false });
        this._containerEl.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
        this._containerEl.addEventListener('touchend', this._touchEndHandler, { passive: false });
        this._containerEl.addEventListener('touchcancel', this._touchEndHandler, { passive: false });

        // Initially hidden until match starts (C.4)
        this._setUIVisibility(false);
    }

    /** Auto-show if touch device, auto-hide if desktop (C.4) */
    autoDetectAndShow() {
        if (TouchInputSource.isAvailable() && this._inMatch) {
            this._setUIVisibility(true);
        } else {
            this._setUIVisibility(false);
        }
    }

    /** Called when a match starts — show touch controls on touch devices (C.4) */
    onMatchStart() {
        this._inMatch = true;
        this.autoDetectAndShow();
    }

    /** Called when a match ends — hide touch controls (C.4) */
    onMatchEnd() {
        this._inMatch = false;
        this._setUIVisibility(false);
    }

    /** Set visibility of all touch UI elements (C.4) */
    _setUIVisibility(visible) {
        this._uiVisible = visible;
        const display = visible ? '' : 'none';

        if (this._joystickEl) this._joystickEl.style.display = display;
        for (const el of Object.values(this._buttonEls)) {
            if (el) el.style.display = visible ? 'flex' : 'none';
        }

        // Also set the container visibility if using the #touch-controls container
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
            } else {
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const action = target?.dataset?.action;
                if (action && action in this._buttons) {
                    this._buttons[action] = false;
                }
            }
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

    poll() {
        const deadzone = 0.15;
        const jx = Math.abs(this._joystickDelta.x) > deadzone ? this._joystickDelta.x : 0;
        const jy = Math.abs(this._joystickDelta.y) > deadzone ? this._joystickDelta.y : 0;

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
            shootItem: this._buttons.fire,
            shootMG: this._buttons.shootMG,
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
        this._joystickEl = null;
        this._joystickKnobEl = null;
    }

    dispose() {
        this.removeUI();
        super.dispose();
    }
}
