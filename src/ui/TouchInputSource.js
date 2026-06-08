// ============================================
// TouchInputSource.js - touch/tablet input adapter
// ============================================

import { PlayerInputSource } from './PlayerInputSource.js';
import { resolveInventoryActionAvailability } from '../shared/contracts/GameplayActionAvailabilityContract.js';
import {
    MOBILE_CLASSIC_TILT_PITCH_MODES,
    normalizeMobileClassicControlSettings,
    normalizeMobileClassicTiltSensitivity,
} from '../shared/contracts/MobileClassicControlsContract.js';
import {
    deriveTiltSteeringState,
    normalizeOrientationAngle,
    resolveTiltCalibrationNeutral,
    TILT_DEFAULT_CURVE_EXPONENT,
    TILT_DEFAULT_DEADZONE_DEG,
    TILT_DEFAULT_RANGE_DEG,
} from './touch/TouchTiltSteeringOps.js';

export {
    deriveTiltSteeringState,
    resolveTiltCalibrationNeutral,
} from './touch/TouchTiltSteeringOps.js';

export const TOUCH_CONTROL_MODES = Object.freeze({
    JOYSTICK: 'joystick',
    TILT: 'tilt',
});

const TILT_DEFAULT_SMOOTHING = 0.24;
const TILT_DEFAULT_RELEASE_THRESHOLD = 0.015;
const TILT_EVENT_STALE_MS = 1600;
const TILT_CALIBRATION_MIN_SAMPLES = 8;
const TILT_CALIBRATION_SAMPLE_MS = 520;
const TILT_CALIBRATION_MAX_MS = 1100;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

const JOYSTICK_BUTTON_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'fire', label: 'FIRE', bottom: '36%', right: '5%', size: 62 }),
    Object.freeze({ id: 'useItem', label: 'USE', bottom: '20%', right: '5%', size: 62 }),
    Object.freeze({ id: 'shootMG', label: 'MG', bottom: '36%', right: '20%', size: 54 }),
    Object.freeze({ id: 'nextItem', label: 'NEXT', bottom: '20%', right: '20%', size: 54 }),
    Object.freeze({ id: 'boost', label: 'BOOST', bottom: '52%', right: '12%', size: 54 }),
]);

const TILT_BUTTON_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'fire', label: 'SCHUSS', bottom: '9%', right: '6%', size: 86 }),
    Object.freeze({ id: 'useItem', label: 'ITEM', bottom: '9%', right: '35%', size: 58 }),
    Object.freeze({ id: 'nextItem', label: 'NXT', bottom: '9%', right: '52%', size: 52 }),
    Object.freeze({ id: 'boost', label: 'BOOST', bottom: '24%', right: '24%', size: 56 }),
]);

const MOBILE_ARCADE_PAUSE_BUTTON_DEFINITION = Object.freeze({
    id: 'pause',
    label: 'PAUSE',
    top: 'max(14px, env(safe-area-inset-top))',
    right: 'max(14px, env(safe-area-inset-right))',
    size: 58,
});

function formatAxisValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.005) return '0.00';
    return `${numeric > 0 ? '+' : ''}${numeric.toFixed(2)}`;
}

function formatSensorHz(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? `${numeric.toFixed(0)}Hz` : '--Hz';
}

function hasDeviceOrientationSupport() {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

function resolveScreenOrientationAngle() {
    if (typeof window === 'undefined') return 0;
    const screenAngle = Number(window.screen?.orientation?.angle);
    if (Number.isFinite(screenAngle)) {
        return screenAngle;
    }
    const legacyAngle = Number(window.orientation);
    return Number.isFinite(legacyAngle) ? legacyAngle : 0;
}

export function resolveTouchButtonDefinitions(controlMode = TOUCH_CONTROL_MODES.JOYSTICK, options = {}) {
    const definitions = controlMode === TOUCH_CONTROL_MODES.TILT
        ? TILT_BUTTON_DEFINITIONS
        : JOYSTICK_BUTTON_DEFINITIONS;
    const resolved = definitions.map((definition) => ({ ...definition }));
    if (options?.includePauseButton === true) {
        resolved.push({ ...MOBILE_ARCADE_PAUSE_BUTTON_DEFINITION });
    }
    return resolved;
}

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
        this._getRuntimeProjection = typeof options.getMatchRuntimeProjection === 'function'
            ? options.getMatchRuntimeProjection
            : null;
        this._playerIndex = Number.isInteger(options.playerIndex) ? options.playerIndex : 0;
        this._joystickRadius = options.joystickRadius || 60;
        this._controlMode = options.controlMode === TOUCH_CONTROL_MODES.TILT
            ? TOUCH_CONTROL_MODES.TILT
            : TOUCH_CONTROL_MODES.JOYSTICK;
        this._includePauseButton = options.includePauseButton === true;
        this._mobileControlSettings = normalizeMobileClassicControlSettings(options.mobileControls);
        this._tiltSensitivity = normalizeMobileClassicTiltSensitivity(
            options.tiltSensitivity ?? this._mobileControlSettings.tiltSensitivity
        );
        this._tiltPitchMode = this._mobileControlSettings.tiltPitchMode;
        this._tiltAssistMode = this._mobileControlSettings.tiltAssistMode;
        this._tiltDebugVisible = this._mobileControlSettings.tiltDebugVisible;
        this._tiltSensorHzVisible = this._mobileControlSettings.tiltSensorHzVisible;
        this._tiltDeadzoneDeg = Math.max(1, Number(options.tiltDeadzoneDeg) || TILT_DEFAULT_DEADZONE_DEG);
        this._tiltRangeDeg = Math.max(this._tiltDeadzoneDeg + 1, Number(options.tiltRangeDeg) || TILT_DEFAULT_RANGE_DEG);
        this._tiltCurveExponent = Math.max(1, Number(options.tiltCurveExponent) || TILT_DEFAULT_CURVE_EXPONENT);
        this._tiltSmoothing = clamp(Number(options.tiltSmoothing) || TILT_DEFAULT_SMOOTHING, 0, 0.95);
        this._tiltReleaseThreshold = clamp(
            Number(options.tiltReleaseThreshold) || TILT_DEFAULT_RELEASE_THRESHOLD,
            0,
            0.25
        );
        this._joystickCenter = null;
        this._joystickDelta = { x: 0, y: 0 };
        this._joystickActive = false;
        this._joystickTouchId = null;
        this._buttonTouches = new Map();
        this._tiltState = {
            supported: hasDeviceOrientationSupport(),
            enabled: false,
            listening: false,
            permission: 'idle',
            beta: 0,
            gamma: 0,
            neutralBeta: 0,
            neutralGamma: 0,
            neutralOrientationAngle: 0,
            hasNeutral: false,
            pendingCalibration: false,
            lastEventAt: 0,
            eventIntervalMs: 0,
            sensorHz: 0,
        };
        this._tiltResolved = {
            yawAxis: 0,
            pitchAxis: 0,
        };
        this._tiltCalibration = {
            active: false,
            samples: [],
            startedAt: 0,
            reason: 'none',
        };

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
        this._prevDiscreteButtons = {
            fire: false,
            useItem: false,
            nextItem: false,
        };
        this._lastPauseRequestAt = 0;
        this._overlayActive = false;
        this._blockingOverlayObserver = null;
        this._androidBackHandler = null;
        this._previousAndroidBackHandler = null;

        this._containerEl = null;
        this._joystickEl = null;
        this._joystickKnobEl = null;
        this._tiltButtonEl = null;
        this._tiltStatusEl = null;
        this._buttonEls = {};

        this._uiVisible = false;
        this._inMatch = false;

        this._touchStartHandler = (e) => this._onTouchStart(e);
        this._touchMoveHandler = (e) => this._onTouchMove(e);
        this._touchEndHandler = (e) => this._onTouchEnd(e);
        this._orientationHandler = (e) => this._onDeviceOrientation(e);
        this._tiltActivateHandler = (e) => {
            e.preventDefault();
            this.requestTiltControl().catch(() => {
                this._tiltState.permission = 'denied';
                this._updateTiltUi();
            });
        };
    }

    static isAvailable() {
        const hasTouchEvent = typeof window !== 'undefined' && 'ontouchstart' in window;
        const hasTouchPoints = typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0;
        const hasCoarsePointer = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(pointer: coarse)').matches === true;
        return hasTouchEvent || hasTouchPoints || hasCoarsePointer;
    }

    bind(playerIndex) {
        super.bind(playerIndex);
        this._playerIndex = Number.isInteger(playerIndex) ? playerIndex : 0;
    }

    createUI(container) {
        this._containerEl = container || document.getElementById('touch-controls') || document.body;
        this._containerEl.dataset.touchControlMode = this._controlMode;

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

        const buttonDefs = this._resolveButtonDefinitions();

        for (const def of buttonDefs) {
            const size = Number(def.size) || 60;
            const verticalPosition = def.top
                ? `top: ${def.top};`
                : `bottom: ${def.bottom};`;
            const horizontalPosition = def.left
                ? `left: ${def.left};`
                : `right: ${def.right};`;
            const btn = document.createElement('div');
            btn.className = `touch-button touch-button-${def.id}`;
            btn.dataset.action = def.id;
            btn.dataset.baseLabel = def.label;
            btn.textContent = def.label;
            btn.style.cssText = `
                position: fixed; ${verticalPosition} ${horizontalPosition}
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

        if (this._controlMode === TOUCH_CONTROL_MODES.TILT) {
            this._createTiltControlUI();
        }

        this._containerEl.addEventListener('touchstart', this._touchStartHandler, { passive: false });
        this._containerEl.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
        this._containerEl.addEventListener('touchend', this._touchEndHandler, { passive: false });
        this._containerEl.addEventListener('touchcancel', this._touchEndHandler, { passive: false });
        this._bindBlockingOverlayObserver();
        this._registerAndroidBackHandler();

        this._setUIVisibility(false);
    }

    _resolveButtonDefinitions() {
        return resolveTouchButtonDefinitions(this._controlMode, {
            includePauseButton: this._includePauseButton,
        });
    }

    _createTiltControlUI() {
        this._tiltButtonEl = document.createElement('button');
        this._tiltButtonEl.type = 'button';
        this._tiltButtonEl.className = 'touch-tilt-button';
        this._tiltButtonEl.dataset.tiltAction = 'calibrate';
        this._tiltButtonEl.textContent = 'NEIGUNG';
        this._tiltButtonEl.style.cssText = `
            position: fixed; top: max(14px, env(safe-area-inset-top)); left: max(14px, env(safe-area-inset-left));
            min-width: 96px; min-height: 42px; border-radius: 999px;
            border: 1px solid rgba(132,226,255,0.72); background: rgba(4,12,20,0.66);
            color: white; font-size: 12px; font-weight: 800; letter-spacing: 0;
            touch-action: manipulation; user-select: none; z-index: 1001;
        `;
        this._tiltButtonEl.addEventListener('click', this._tiltActivateHandler);
        this._containerEl.appendChild(this._tiltButtonEl);

        this._tiltStatusEl = document.createElement('div');
        this._tiltStatusEl.className = 'touch-tilt-status';
        this._tiltStatusEl.textContent = 'TILT';
        this._tiltStatusEl.style.cssText = `
            position: fixed; top: max(60px, calc(env(safe-area-inset-top) + 58px)); left: max(16px, env(safe-area-inset-left));
            color: rgba(210,245,255,0.82); font-size: 11px; font-weight: 700;
            text-shadow: 0 1px 8px rgba(0,0,0,0.7); z-index: 1001;
            pointer-events: none; user-select: none;
        `;
        this._containerEl.appendChild(this._tiltStatusEl);
        this._updateTiltUi();
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
        if (this._controlMode === TOUCH_CONTROL_MODES.TILT) {
            this._startTiltListening({ auto: true });
        }
        this.autoDetectAndShow();
    }

    onMatchEnd() {
        this._inMatch = false;
        this._setUIVisibility(false);
    }

    _setUIVisibility(visible) {
        this._uiVisible = visible;
        this._overlayActive = this._isBlockingOverlayActive();
        const display = visible ? 'block' : 'none';
        const controlsVisible = visible && !this._overlayActive;

        if (this._joystickEl) {
            this._joystickEl.style.display = controlsVisible && this._shouldShowJoystickFallback() ? '' : 'none';
        }
        for (const el of Object.values(this._buttonEls)) {
            if (el) el.style.display = controlsVisible ? 'flex' : 'none';
        }
        if (this._tiltButtonEl) this._tiltButtonEl.style.display = controlsVisible ? 'flex' : 'none';
        if (this._tiltStatusEl) this._tiltStatusEl.style.display = controlsVisible ? 'block' : 'none';

        if (this._containerEl?.id === 'touch-controls') {
            this._containerEl.style.display = display;
            this._containerEl.style.pointerEvents = controlsVisible ? 'auto' : 'none';
            this._containerEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
            this._containerEl.dataset.overlayActive = this._overlayActive ? '1' : '0';
        }
        this._updateTiltUi();
    }

    get isUIVisible() {
        return this._uiVisible;
    }

    _getMatchRuntimeProjection() {
        const projected = this._getRuntimeProjection?.();
        if (projected && typeof projected === 'object') {
            return projected;
        }
        return this._game?.runtimePorts?.runtimeProjectionPort?.getMatchRuntimeProjection?.() || null;
    }

    _findProjectedPlayer(projection = null) {
        if (!Array.isArray(projection?.players)) return null;
        return projection.players.find((player) => player?.playerIndex === this._playerIndex) || null;
    }

    _onTouchStart(e) {
        if (this._syncBlockingOverlayState()) {
            return;
        }
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const tiltTarget = target?.closest?.('[data-tilt-action]');
            if (tiltTarget && this._tiltButtonEl?.contains(tiltTarget)) {
                this._tiltActivateHandler(e);
                continue;
            }
            if (this._isJoystickTarget(target) || this._shouldStartFloatingJoystick(touch, target)) {
                this._beginJoystickTouch(touch, { floating: !this._isJoystickTarget(target) });
            } else {
                const actionTarget = target?.closest?.('[data-action]') || target;
                const action = actionTarget?.dataset?.action;
                if (action === 'pause') {
                    this._requestPause();
                    this._buttonTouches.set(touch.identifier, action);
                    continue;
                }
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
                this._restoreJoystickHomePosition();
                continue;
            }

            const action = this._buttonTouches.get(touch.identifier);
            if (action && action in this._buttons) {
                this._buttons[action] = false;
                if (action in this._prevDiscreteButtons) {
                    this._prevDiscreteButtons[action] = false;
                }
            }
            this._buttonTouches.delete(touch.identifier);
        }
    }

    _isJoystickTarget(target) {
        return target === this._joystickEl
            || target === this._joystickKnobEl
            || this._joystickEl?.contains(target);
    }

    _shouldStartFloatingJoystick(touch, target) {
        if (!this._joystickEl || this._joystickActive || !this._shouldShowJoystickFallback()) {
            return false;
        }
        if (target?.closest?.('[data-action], [data-tilt-action], button, input, select, textarea, a')) {
            return false;
        }
        const ownerWindow = this._containerEl?.ownerDocument?.defaultView
            || (typeof window !== 'undefined' ? window : null);
        const viewportWidth = Number(ownerWindow?.innerWidth)
            || Number(this._containerEl?.ownerDocument?.documentElement?.clientWidth)
            || 0;
        const viewportHeight = Number(ownerWindow?.innerHeight)
            || Number(this._containerEl?.ownerDocument?.documentElement?.clientHeight)
            || 0;
        if (viewportWidth <= 0 || viewportHeight <= 0) {
            return false;
        }
        return touch.clientX <= viewportWidth * 0.5
            && touch.clientY >= viewportHeight * 0.16;
    }

    _beginJoystickTouch(touch, { floating = false } = {}) {
        this._joystickTouchId = touch.identifier;
        if (floating) {
            this._joystickCenter = { x: touch.clientX, y: touch.clientY };
            this._positionFloatingJoystick(touch.clientX, touch.clientY);
        } else {
            const rect = this._joystickEl.getBoundingClientRect();
            this._joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        this._joystickActive = true;
        this._updateJoystick(touch.clientX, touch.clientY);
    }

    _positionFloatingJoystick(clientX, clientY) {
        if (!this._joystickEl) return;
        const left = Math.round(clientX - this._joystickRadius);
        const top = Math.round(clientY - this._joystickRadius);
        this._joystickEl.style.setProperty('left', `${left}px`, 'important');
        this._joystickEl.style.setProperty('top', `${top}px`, 'important');
        this._joystickEl.style.setProperty('bottom', 'auto', 'important');
    }

    _restoreJoystickHomePosition() {
        if (!this._joystickEl) return;
        this._joystickEl.style.setProperty('left', '5%');
        this._joystickEl.style.setProperty('bottom', '20%');
        this._joystickEl.style.setProperty('top', 'auto');
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
        const projection = this._getMatchRuntimeProjection();
        const player = this._findProjectedPlayer(projection)
            || entityManager?.players?.[this._playerIndex]
            || null;
        const strategy = entityManager?.gameModeStrategy || null;
        return resolveInventoryActionAvailability({
            player,
            modeType: projection?.modeId || strategy?.modeType || 'CLASSIC',
            showMg: !!strategy?.hasMachineGun?.(),
        });
    }

    _setButtonVisualState(id, { enabled = true, visible = true, title = '' } = {}) {
        const button = this._buttonEls[id];
        if (!button) return;
        const controlsVisible = this._uiVisible && !this._overlayActive;
        button.style.display = visible && controlsVisible ? 'flex' : 'none';
        button.title = title;
        button.dataset.enabled = enabled ? '1' : '0';
        button.style.opacity = enabled ? '1' : '0.35';
        button.style.transform = enabled ? 'scale(1)' : 'scale(0.96)';
        button.style.borderColor = enabled ? 'rgba(132,226,255,0.85)' : 'rgba(255,255,255,0.18)';
        button.style.boxShadow = enabled ? '0 0 14px rgba(0,170,255,0.18)' : 'none';
    }

    _requestPause() {
        const nowMs = Date.now();
        if (nowMs - this._lastPauseRequestAt < 350) {
            return false;
        }
        this._lastPauseRequestAt = nowMs;
        this._releaseAllControls();
        this._game?.matchFlowUiController?.pause?.();
        this._syncBlockingOverlayState();
        return true;
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

    _syncMobileControlSettings() {
        this._mobileControlSettings = normalizeMobileClassicControlSettings(
            this._game?.settings?.localSettings?.mobileControls || this._mobileControlSettings
        );
        this._tiltSensitivity = this._mobileControlSettings.tiltSensitivity;
        this._tiltPitchMode = this._mobileControlSettings.tiltPitchMode;
        this._tiltAssistMode = this._mobileControlSettings.tiltAssistMode;
        this._tiltDebugVisible = this._mobileControlSettings.tiltDebugVisible;
        this._tiltSensorHzVisible = this._mobileControlSettings.tiltSensorHzVisible;
    }

    poll() {
        this._syncMobileControlSettings();
        if (this._syncBlockingOverlayState()) {
            this._releaseAllControls();
            return this._createNeutralInput();
        }
        const deadzone = 0.15;
        const jx = Math.abs(this._joystickDelta.x) > deadzone ? this._joystickDelta.x : 0;
        const jy = Math.abs(this._joystickDelta.y) > deadzone ? this._joystickDelta.y : 0;
        const tiltInput = this._resolveTiltSteeringInput();
        const touchPitchActive = !!tiltInput && this._tiltPitchMode === MOBILE_CLASSIC_TILT_PITCH_MODES.TOUCH;
        const actionState = this._resolveActionState();
        this._syncActionButtons(actionState);

        const boostDown = this._buttons.boost;
        const boostPressed = boostDown && !this._prevBoost;
        this._prevBoost = boostDown;
        const firePressed = this._buttons.fire && !this._prevDiscreteButtons.fire;
        const useItemPressed = this._buttons.useItem && !this._prevDiscreteButtons.useItem;
        const nextItemPressed = this._buttons.nextItem && !this._prevDiscreteButtons.nextItem;
        this._prevDiscreteButtons.fire = this._buttons.fire;
        this._prevDiscreteButtons.useItem = this._buttons.useItem;
        this._prevDiscreteButtons.nextItem = this._buttons.nextItem;

        return {
            pitchUp: touchPitchActive ? jy < -deadzone : (tiltInput ? tiltInput.pitchUp : jy < -deadzone),
            pitchDown: touchPitchActive ? jy > deadzone : (tiltInput ? tiltInput.pitchDown : jy > deadzone),
            yawLeft: tiltInput ? tiltInput.yawLeft : jx < -deadzone,
            yawRight: tiltInput ? tiltInput.yawRight : jx > deadzone,
            rollLeft: false,
            rollRight: false,
            pitchAxis: touchPitchActive ? -jy : (tiltInput ? -tiltInput.pitchAxis : -jy),
            yawAxis: tiltInput ? -tiltInput.yawAxis : -jx,
            rollAxis: 0,
            boost: boostDown,
            boostPressed,
            cameraSwitch: false,
            dropItem: false,
            useItem: useItemPressed && !!actionState?.canUseNow,
            shootItem: firePressed && !!actionState?.canShootNow,
            shootMG: this._buttons.shootMG && !!actionState?.showMg,
            nextItem: nextItemPressed && !!actionState?.canCycle,
        };
    }

    _createNeutralInput() {
        return {
            pitchUp: false,
            pitchDown: false,
            yawLeft: false,
            yawRight: false,
            rollLeft: false,
            rollRight: false,
            pitchAxis: 0,
            yawAxis: 0,
            rollAxis: 0,
            boost: false,
            boostPressed: false,
            cameraSwitch: false,
            dropItem: false,
            useItem: false,
            shootItem: false,
            shootMG: false,
            nextItem: false,
        };
    }

    _releaseAllControls() {
        this._joystickActive = false;
        this._joystickTouchId = null;
        this._joystickDelta = { x: 0, y: 0 };
        if (this._joystickKnobEl) {
            this._joystickKnobEl.style.transform = '';
        }
        this._restoreJoystickHomePosition();
        this._buttonTouches.clear();
        for (const key of Object.keys(this._buttons)) {
            this._buttons[key] = false;
        }
        this._prevBoost = false;
        for (const key of Object.keys(this._prevDiscreteButtons)) {
            this._prevDiscreteButtons[key] = false;
        }
    }

    _isElementVisible(element) {
        return !!element && !element.classList?.contains?.('hidden')
            && element.getAttribute?.('aria-hidden') !== 'true';
    }

    _isPauseOverlayActive() {
        const doc = this._containerEl?.ownerDocument || (typeof document !== 'undefined' ? document : null);
        return this._isElementVisible(this._game?.ui?.pauseOverlay || doc?.getElementById?.('pause-overlay'));
    }

    _isBlockingOverlayActive() {
        const doc = this._containerEl?.ownerDocument || (typeof document !== 'undefined' ? document : null);
        return this._isPauseOverlayActive()
            || this._isElementVisible(this._game?.ui?.messageOverlay || doc?.getElementById?.('message-overlay'));
    }

    _syncBlockingOverlayState() {
        const overlayActive = this._isBlockingOverlayActive();
        if (overlayActive !== this._overlayActive) {
            this._overlayActive = overlayActive;
            if (overlayActive) {
                this._releaseAllControls();
            }
            this._setUIVisibility(this._uiVisible);
        } else if (this._containerEl?.id === 'touch-controls') {
            this._containerEl.dataset.overlayActive = overlayActive ? '1' : '0';
            this._containerEl.style.pointerEvents = this._uiVisible && !overlayActive ? 'auto' : 'none';
        }
        return overlayActive;
    }

    _bindBlockingOverlayObserver() {
        const ownerWindow = this._containerEl?.ownerDocument?.defaultView
            || (typeof window !== 'undefined' ? window : null);
        if (!ownerWindow?.MutationObserver || this._blockingOverlayObserver) {
            return;
        }
        const doc = this._containerEl?.ownerDocument || (typeof document !== 'undefined' ? document : null);
        const targets = [
            this._game?.ui?.pauseOverlay || doc?.getElementById?.('pause-overlay'),
            this._game?.ui?.messageOverlay || doc?.getElementById?.('message-overlay'),
        ].filter(Boolean);
        if (targets.length === 0) {
            return;
        }
        this._blockingOverlayObserver = new ownerWindow.MutationObserver(() => {
            this._syncBlockingOverlayState();
        });
        for (const target of targets) {
            this._blockingOverlayObserver.observe(target, {
                attributes: true,
                attributeFilter: ['class', 'aria-hidden'],
            });
        }
    }

    _registerAndroidBackHandler() {
        const ownerWindow = this._containerEl?.ownerDocument?.defaultView
            || (typeof window !== 'undefined' ? window : null);
        if (!ownerWindow || this._androidBackHandler) {
            return;
        }
        this._previousAndroidBackHandler = typeof ownerWindow.__curviosAndroidBackHandler === 'function'
            ? ownerWindow.__curviosAndroidBackHandler
            : null;
        this._androidBackHandler = () => {
            if (this._handleAndroidBack()) return true;
            return this._previousAndroidBackHandler?.() === true;
        };
        ownerWindow.__curviosAndroidBackHandler = this._androidBackHandler;
    }

    _unregisterAndroidBackHandler() {
        const ownerWindow = this._containerEl?.ownerDocument?.defaultView
            || (typeof window !== 'undefined' ? window : null);
        if (!ownerWindow || !this._androidBackHandler) {
            return;
        }
        if (ownerWindow.__curviosAndroidBackHandler === this._androidBackHandler) {
            if (this._previousAndroidBackHandler) {
                ownerWindow.__curviosAndroidBackHandler = this._previousAndroidBackHandler;
            } else {
                delete ownerWindow.__curviosAndroidBackHandler;
            }
        }
        this._androidBackHandler = null;
        this._previousAndroidBackHandler = null;
    }

    _handleAndroidBack() {
        if (!this._inMatch || !this._uiVisible) {
            return false;
        }
        if (this._isPauseOverlayActive()) {
            this._game?.matchFlowUiController?.resumeFromPause?.();
            this._syncBlockingOverlayState();
            return true;
        }
        return this._requestPause();
    }

    _isTiltFresh() {
        return this._tiltState.lastEventAt > 0
            && Date.now() - this._tiltState.lastEventAt < TILT_EVENT_STALE_MS;
    }

    _shouldShowJoystickFallback() {
        this._syncMobileControlSettings();
        return this._controlMode !== TOUCH_CONTROL_MODES.TILT
            || this._tiltPitchMode === MOBILE_CLASSIC_TILT_PITCH_MODES.TOUCH
            || !this._isTiltFresh();
    }

    _startTiltListening({ auto = false } = {}) {
        if (this._controlMode !== TOUCH_CONTROL_MODES.TILT) return false;
        this._tiltState.supported = hasDeviceOrientationSupport();
        if (!this._tiltState.supported) {
            this._tiltState.permission = 'unsupported';
            this._updateTiltUi();
            return false;
        }
        if (!this._tiltState.listening) {
            window.addEventListener('deviceorientation', this._orientationHandler, { passive: true });
            this._tiltState.listening = true;
        }
        this._tiltState.enabled = true;
        this._tiltState.permission = auto ? 'auto' : 'granted';
        this._beginTiltCalibration(auto ? 'match-start' : 'manual');
        this._updateTiltUi();
        return true;
    }

    async requestTiltControl() {
        if (this._controlMode !== TOUCH_CONTROL_MODES.TILT) return false;
        this._tiltState.supported = hasDeviceOrientationSupport();
        if (!this._tiltState.supported) {
            this._tiltState.permission = 'unsupported';
            this._updateTiltUi();
            return false;
        }

        const requestPermission = window.DeviceOrientationEvent?.requestPermission;
        if (typeof requestPermission === 'function') {
            const permission = await requestPermission.call(window.DeviceOrientationEvent);
            this._tiltState.permission = permission === 'granted' ? 'granted' : 'denied';
            if (permission !== 'granted') {
                this._updateTiltUi();
                return false;
            }
        }

        return this._startTiltListening({ auto: false });
    }

    _onDeviceOrientation(event) {
        const beta = Number(event?.beta);
        const gamma = Number(event?.gamma);
        if (!Number.isFinite(beta) || !Number.isFinite(gamma)) {
            return;
        }
        const orientationAngle = resolveScreenOrientationAngle();
        const now = Date.now();
        const previousEventAt = this._tiltState.lastEventAt;
        if (previousEventAt > 0 && now > previousEventAt) {
            const intervalMs = now - previousEventAt;
            this._tiltState.eventIntervalMs = this._tiltState.eventIntervalMs > 0
                ? (this._tiltState.eventIntervalMs * 0.82) + (intervalMs * 0.18)
                : intervalMs;
            this._tiltState.sensorHz = this._tiltState.eventIntervalMs > 0
                ? 1000 / this._tiltState.eventIntervalMs
                : 0;
        }
        this._tiltState.beta = beta;
        this._tiltState.gamma = gamma;
        this._tiltState.lastEventAt = now;
        if (
            this._tiltState.hasNeutral
            && normalizeOrientationAngle(this._tiltState.neutralOrientationAngle) !== orientationAngle
            && !this._tiltCalibration.active
        ) {
            this._beginTiltCalibration('orientation-change');
        }
        if (this._tiltState.pendingCalibration || !this._tiltState.hasNeutral || this._tiltCalibration.active) {
            this._captureTiltCalibrationSample(beta, gamma, orientationAngle);
        }
        this._updateTiltUi();
    }

    _beginTiltCalibration(reason = 'manual') {
        this._tiltCalibration.active = true;
        this._tiltCalibration.samples = [];
        this._tiltCalibration.startedAt = Date.now();
        this._tiltCalibration.reason = reason;
        this._tiltState.pendingCalibration = true;
        this._tiltResolved.yawAxis = 0;
        this._tiltResolved.pitchAxis = 0;
    }

    _captureTiltCalibrationSample(beta, gamma, orientationAngle) {
        if (!this._tiltCalibration.active) {
            this._beginTiltCalibration('sample');
        }
        this._tiltCalibration.samples.push({ beta, gamma, orientationAngle });
        const elapsedMs = Date.now() - this._tiltCalibration.startedAt;
        const enoughSamples = this._tiltCalibration.samples.length >= TILT_CALIBRATION_MIN_SAMPLES;
        const enoughTime = elapsedMs >= TILT_CALIBRATION_SAMPLE_MS;
        const timedOut = elapsedMs >= TILT_CALIBRATION_MAX_MS;
        if ((enoughSamples && enoughTime) || timedOut) {
            this._finishTiltCalibration();
        }
    }

    _finishTiltCalibration() {
        const neutral = resolveTiltCalibrationNeutral(this._tiltCalibration.samples, this._tiltState);
        this._tiltState.neutralBeta = neutral.neutralBeta;
        this._tiltState.neutralGamma = neutral.neutralGamma;
        this._tiltState.neutralOrientationAngle = neutral.neutralOrientationAngle;
        this._tiltState.hasNeutral = true;
        this._tiltState.pendingCalibration = false;
        this._tiltCalibration.active = false;
        this._tiltCalibration.samples = [];
        this._tiltResolved.yawAxis = 0;
        this._tiltResolved.pitchAxis = 0;
    }

    _resolveTiltSteeringInput() {
        if (this._controlMode !== TOUCH_CONTROL_MODES.TILT) return null;
        if (!this._tiltState.enabled || !this._tiltState.hasNeutral || !this._isTiltFresh()) {
            this._tiltResolved.yawAxis = 0;
            this._tiltResolved.pitchAxis = 0;
            return null;
        }
        if (this._tiltCalibration.active || this._tiltState.pendingCalibration) {
            return null;
        }
        const next = deriveTiltSteeringState({
            beta: this._tiltState.beta,
            gamma: this._tiltState.gamma,
            neutralBeta: this._tiltState.neutralBeta,
            neutralGamma: this._tiltState.neutralGamma,
            orientationAngle: resolveScreenOrientationAngle(),
            deadzoneDeg: this._tiltDeadzoneDeg,
            rangeDeg: this._tiltRangeDeg,
            curveExponent: this._tiltCurveExponent,
            sensitivity: this._tiltSensitivity,
            assistMode: this._tiltAssistMode,
        });
        const blend = 1 - this._tiltSmoothing;
        this._tiltResolved.yawAxis += (next.yawAxis - this._tiltResolved.yawAxis) * blend;
        this._tiltResolved.pitchAxis += (next.pitchAxis - this._tiltResolved.pitchAxis) * blend;

        const yawAxis = Math.abs(this._tiltResolved.yawAxis) <= this._tiltReleaseThreshold
            ? 0
            : this._tiltResolved.yawAxis;
        const pitchAxis = Math.abs(this._tiltResolved.pitchAxis) <= this._tiltReleaseThreshold
            ? 0
            : this._tiltResolved.pitchAxis;

        return {
            ...next,
            yawAxis,
            pitchAxis,
            yawLeft: yawAxis < 0,
            yawRight: yawAxis > 0,
            pitchUp: pitchAxis < 0,
            pitchDown: pitchAxis > 0,
        };
    }

    _stopTiltListening() {
        if (this._tiltState.listening && typeof window !== 'undefined') {
            window.removeEventListener('deviceorientation', this._orientationHandler);
        }
        this._tiltState.listening = false;
        this._tiltState.enabled = false;
        this._tiltState.lastEventAt = 0;
        this._tiltState.eventIntervalMs = 0;
        this._tiltState.sensorHz = 0;
    }

    _resolveTiltStatusText() {
        if (this._tiltCalibration.active) return 'KALIBRIERE';
        if (!this._isTiltFresh()) return this._tiltSensorHzVisible ? `TILT ${formatSensorHz(0)}` : 'TILT';
        const parts = [];
        if (this._tiltDebugVisible) {
            parts.push(`Y ${formatAxisValue(this._tiltResolved.yawAxis)}`);
            parts.push(`P ${formatAxisValue(this._tiltResolved.pitchAxis)}`);
        }
        if (this._tiltSensorHzVisible) {
            parts.push(formatSensorHz(this._tiltState.sensorHz));
        }
        return parts.length > 0 ? parts.join(' ') : 'TILT SANFT';
    }

    _updateTiltUi() {
        this._syncMobileControlSettings();
        if (this._containerEl) {
            this._containerEl.dataset.tiltActive = this._isTiltFresh() ? '1' : '0';
            this._containerEl.dataset.tiltPermission = this._tiltState.permission;
        }
        if (this._tiltButtonEl) {
            this._tiltButtonEl.dataset.active = this._isTiltFresh() ? '1' : '0';
            this._tiltButtonEl.textContent = this._tiltCalibration.active
                ? 'HALTEN'
                : (this._tiltState.hasNeutral && this._isTiltFresh() ? 'NEU' : 'NEIGUNG');
        }
        if (this._tiltStatusEl) {
            this._tiltStatusEl.textContent = this._resolveTiltStatusText();
        }
        if (this._uiVisible && this._joystickEl) {
            this._joystickEl.style.display = !this._overlayActive && this._shouldShowJoystickFallback() ? '' : 'none';
        }
    }

    removeUI() {
        this._unregisterAndroidBackHandler();
        this._blockingOverlayObserver?.disconnect?.();
        this._blockingOverlayObserver = null;
        if (this._containerEl) {
            this._containerEl.removeEventListener('touchstart', this._touchStartHandler);
            this._containerEl.removeEventListener('touchmove', this._touchMoveHandler);
            this._containerEl.removeEventListener('touchend', this._touchEndHandler);
            this._containerEl.removeEventListener('touchcancel', this._touchEndHandler);
        }
        if (this._tiltButtonEl) {
            this._tiltButtonEl.removeEventListener('click', this._tiltActivateHandler);
        }
        this._stopTiltListening();
        if (this._joystickEl?.parentNode) this._joystickEl.parentNode.removeChild(this._joystickEl);
        for (const el of Object.values(this._buttonEls)) {
            if (el?.parentNode) el.parentNode.removeChild(el);
        }
        if (this._tiltButtonEl?.parentNode) this._tiltButtonEl.parentNode.removeChild(this._tiltButtonEl);
        if (this._tiltStatusEl?.parentNode) this._tiltStatusEl.parentNode.removeChild(this._tiltStatusEl);
        this._buttonEls = {};
        this._buttonTouches.clear();
        this._joystickEl = null;
        this._joystickKnobEl = null;
        this._tiltButtonEl = null;
        this._tiltStatusEl = null;
    }

    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this.removeUI();
        super.dispose();
    }
}
