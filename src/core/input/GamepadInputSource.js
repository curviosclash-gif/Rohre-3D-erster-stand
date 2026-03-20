// ============================================
// GamepadInputSource.js - gamepad input adapter
// ============================================

import { PlayerInputSource } from './PlayerInputSource.js';

const DEFAULT_DEADZONE = 0.15;
const DEFAULT_MAPPING = {
    pitchAxis: 1,       // Left stick Y (inverted)
    yawAxis: 0,         // Left stick X
    rollAxis: 2,        // Right stick X (or triggers)
    throttleAxis: 3,    // Right stick Y
    fireButton: 7,      // Right trigger (R2)
    boostButton: 0,     // A / Cross
    shootMGButton: 6,   // Left trigger (L2)
    nextItemButton: 3,  // Y / Triangle
    useItemButton: 2,   // X / Square
    cameraButton: 1,    // B / Circle
    pauseButton: 9,     // Start
};

/**
 * Reads input from a physical gamepad via the Gamepad API.
 * Supports hot-plug via gamepadconnected/gamepaddisconnected events.
 */
export class GamepadInputSource extends PlayerInputSource {
    constructor(gamepadIndex = 0, options = {}) {
        super('gamepad');
        this.gamepadIndex = gamepadIndex;
        this.deadzone = options.deadzone || DEFAULT_DEADZONE;
        this.mapping = { ...DEFAULT_MAPPING, ...options.mapping };
        this._prevButtons = {};
        this._connected = false;

        this._onConnected = (e) => {
            if (e.gamepad.index === this.gamepadIndex) {
                this._connected = true;
            }
        };
        this._onDisconnected = (e) => {
            if (e.gamepad.index === this.gamepadIndex) {
                this._connected = false;
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('gamepadconnected', this._onConnected);
            window.addEventListener('gamepaddisconnected', this._onDisconnected);
        }

        this._checkInitialConnection();
    }

    _checkInitialConnection() {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
        const gamepads = navigator.getGamepads();
        if (gamepads[this.gamepadIndex]) {
            this._connected = true;
        }
    }

    _getGamepad() {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
        return navigator.getGamepads()[this.gamepadIndex] || null;
    }

    _applyDeadzone(value) {
        return Math.abs(value) < this.deadzone ? 0 : value;
    }

    _isButtonDown(gamepad, buttonIndex) {
        if (!gamepad || buttonIndex < 0 || buttonIndex >= gamepad.buttons.length) return false;
        return gamepad.buttons[buttonIndex].pressed;
    }

    _wasButtonPressed(gamepad, buttonIndex) {
        const isDown = this._isButtonDown(gamepad, buttonIndex);
        const wasDown = !!this._prevButtons[buttonIndex];
        this._prevButtons[buttonIndex] = isDown;
        return isDown && !wasDown;
    }

    poll() {
        const gp = this._getGamepad();
        if (!gp) {
            return {
                pitchUp: false, pitchDown: false,
                yawLeft: false, yawRight: false,
                rollLeft: false, rollRight: false,
                boost: false, boostPressed: false,
                cameraSwitch: false, dropItem: false,
                useItem: false,
                shootItem: false, shootMG: false, nextItem: false,
            };
        }

        const m = this.mapping;
        const pitchVal = this._applyDeadzone(gp.axes[m.pitchAxis] || 0);
        const yawVal = this._applyDeadzone(gp.axes[m.yawAxis] || 0);
        const rollVal = this._applyDeadzone(gp.axes[m.rollAxis] || 0);

        return {
            pitchUp: pitchVal < -this.deadzone,
            pitchDown: pitchVal > this.deadzone,
            yawLeft: yawVal < -this.deadzone,
            yawRight: yawVal > this.deadzone,
            rollLeft: rollVal < -this.deadzone,
            rollRight: rollVal > this.deadzone,
            boost: this._isButtonDown(gp, m.boostButton),
            boostPressed: this._wasButtonPressed(gp, m.boostButton),
            cameraSwitch: this._wasButtonPressed(gp, m.cameraButton),
            dropItem: false,
            useItem: this._wasButtonPressed(gp, m.useItemButton),
            shootItem: this._wasButtonPressed(gp, m.fireButton),
            shootMG: this._isButtonDown(gp, m.shootMGButton),
            nextItem: this._wasButtonPressed(gp, m.nextItemButton),
        };
    }

    get isConnected() {
        return this._connected;
    }

    dispose() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('gamepadconnected', this._onConnected);
            window.removeEventListener('gamepaddisconnected', this._onDisconnected);
        }
        super.dispose();
    }
}
