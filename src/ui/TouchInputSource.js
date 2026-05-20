// ============================================
// TouchInputSource.js - touch/tablet input adapter
// ============================================

import { PlayerInputSource } from './PlayerInputSource.js';
import { resolveInventoryActionAvailability } from '../shared/contracts/GameplayActionAvailabilityContract.js';

export const TOUCH_CONTROL_MODES = Object.freeze({
    JOYSTICK: 'joystick',
    TILT: 'tilt',
});

const TILT_DEFAULT_DEADZONE_DEG = 8;
const TILT_DEFAULT_RANGE_DEG = 34;
const TILT_DEFAULT_CURVE_EXPONENT = 1.35;
const TILT_DEFAULT_SMOOTHING = 0.58;
const TILT_DEFAULT_PRESS_THRESHOLD = 0.14;
const TILT_DEFAULT_RELEASE_THRESHOLD = 0.06;
const TILT_EVENT_STALE_MS = 1600;
const TILT_CALIBRATION_MIN_SAMPLES = 8;
const TILT_CALIBRATION_SAMPLE_MS = 520;
const TILT_CALIBRATION_MAX_MS = 1100;

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

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeOrientationAngle(value = 0) {
    const normalized = Math.round(Number(value) || 0) % 360;
    return normalized < 0 ? normalized + 360 : normalized;
}

function normalizeTiltDelta(rawValue = 0, neutralValue = 0) {
    let delta = (Number(rawValue) || 0) - (Number(neutralValue) || 0);
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
}

function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
}

export function resolveTiltCalibrationNeutral(samples = [], fallback = {}) {
    const validSamples = Array.isArray(samples)
        ? samples.filter((sample) => isFiniteNumber(sample?.beta) && isFiniteNumber(sample?.gamma))
        : [];
    if (validSamples.length === 0) {
        return {
            neutralBeta: Number(fallback.neutralBeta) || 0,
            neutralGamma: Number(fallback.neutralGamma) || 0,
            neutralOrientationAngle: normalizeOrientationAngle(fallback.neutralOrientationAngle),
        };
    }

    const totals = validSamples.reduce((acc, sample) => {
        acc.beta += Number(sample.beta);
        acc.gamma += Number(sample.gamma);
        return acc;
    }, { beta: 0, gamma: 0 });
    const lastSample = validSamples[validSamples.length - 1];
    return {
        neutralBeta: totals.beta / validSamples.length,
        neutralGamma: totals.gamma / validSamples.length,
        neutralOrientationAngle: normalizeOrientationAngle(lastSample.orientationAngle),
    };
}

function applyTiltResponseCurve(axis, deadzoneAxis, curveExponent) {
    const absAxis = Math.abs(axis);
    if (absAxis <= deadzoneAxis) return 0;
    const safeRange = Math.max(0.0001, 1 - deadzoneAxis);
    const normalized = clamp((absAxis - deadzoneAxis) / safeRange, 0, 1);
    const curved = Math.pow(normalized, Math.max(1, Number(curveExponent) || TILT_DEFAULT_CURVE_EXPONENT));
    return Math.sign(axis) * curved;
}

export function deriveTiltSteeringState({
    beta = 0,
    gamma = 0,
    neutralBeta = 0,
    neutralGamma = 0,
    orientationAngle = 0,
    deadzoneDeg = TILT_DEFAULT_DEADZONE_DEG,
    rangeDeg = TILT_DEFAULT_RANGE_DEG,
    curveExponent = TILT_DEFAULT_CURVE_EXPONENT,
} = {}) {
    const betaDelta = normalizeTiltDelta(beta, neutralBeta);
    const gammaDelta = normalizeTiltDelta(gamma, neutralGamma);
    const angle = normalizeOrientationAngle(orientationAngle);
    let yawDeg = gammaDelta;
    let pitchDeg = betaDelta;

    if (angle === 90) {
        yawDeg = betaDelta;
        pitchDeg = -gammaDelta;
    } else if (angle === 270) {
        yawDeg = -betaDelta;
        pitchDeg = gammaDelta;
    } else if (angle === 180) {
        yawDeg = -gammaDelta;
        pitchDeg = -betaDelta;
    }

    const safeRange = Math.max(1, Number(rangeDeg) || TILT_DEFAULT_RANGE_DEG);
    const deadzoneAxis = clamp(Math.max(0, Number(deadzoneDeg) || 0) / safeRange, 0, 0.95);
    const rawYawAxis = clamp(yawDeg / safeRange, -1, 1);
    const rawPitchAxis = clamp(pitchDeg / safeRange, -1, 1);
    const yawAxis = applyTiltResponseCurve(rawYawAxis, deadzoneAxis, curveExponent);
    const pitchAxis = applyTiltResponseCurve(rawPitchAxis, deadzoneAxis, curveExponent);

    return {
        yawAxis,
        pitchAxis,
        rawYawAxis,
        rawPitchAxis,
        pitchUp: pitchAxis < 0,
        pitchDown: pitchAxis > 0,
        yawLeft: yawAxis < 0,
        yawRight: yawAxis > 0,
    };
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

export function resolveTouchButtonDefinitions(controlMode = TOUCH_CONTROL_MODES.JOYSTICK) {
    const definitions = controlMode === TOUCH_CONTROL_MODES.TILT
        ? TILT_BUTTON_DEFINITIONS
        : JOYSTICK_BUTTON_DEFINITIONS;
    return definitions.map((definition) => ({ ...definition }));
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
        this._tiltDeadzoneDeg = Math.max(1, Number(options.tiltDeadzoneDeg) || TILT_DEFAULT_DEADZONE_DEG);
        this._tiltRangeDeg = Math.max(this._tiltDeadzoneDeg + 1, Number(options.tiltRangeDeg) || TILT_DEFAULT_RANGE_DEG);
        this._tiltCurveExponent = Math.max(1, Number(options.tiltCurveExponent) || TILT_DEFAULT_CURVE_EXPONENT);
        this._tiltSmoothing = clamp(Number(options.tiltSmoothing) || TILT_DEFAULT_SMOOTHING, 0, 0.95);
        this._tiltPressThreshold = clamp(
            Number(options.tiltPressThreshold) || TILT_DEFAULT_PRESS_THRESHOLD,
            0.01,
            0.95
        );
        this._tiltReleaseThreshold = clamp(
            Number(options.tiltReleaseThreshold) || TILT_DEFAULT_RELEASE_THRESHOLD,
            0,
            this._tiltPressThreshold
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
        };
        this._tiltResolved = {
            yawAxis: 0,
            pitchAxis: 0,
            yawDirection: 0,
            pitchDirection: 0,
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

        if (this._controlMode === TOUCH_CONTROL_MODES.TILT) {
            this._createTiltControlUI();
        }

        this._containerEl.addEventListener('touchstart', this._touchStartHandler, { passive: false });
        this._containerEl.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
        this._containerEl.addEventListener('touchend', this._touchEndHandler, { passive: false });
        this._containerEl.addEventListener('touchcancel', this._touchEndHandler, { passive: false });

        this._setUIVisibility(false);
    }

    _resolveButtonDefinitions() {
        return resolveTouchButtonDefinitions(this._controlMode);
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
        const display = visible ? 'block' : 'none';

        if (this._joystickEl) {
            this._joystickEl.style.display = visible && this._shouldShowJoystickFallback() ? '' : 'none';
        }
        for (const el of Object.values(this._buttonEls)) {
            if (el) el.style.display = visible ? 'flex' : 'none';
        }
        if (this._tiltButtonEl) this._tiltButtonEl.style.display = visible ? 'flex' : 'none';
        if (this._tiltStatusEl) this._tiltStatusEl.style.display = visible ? 'block' : 'none';

        if (this._containerEl?.id === 'touch-controls') {
            this._containerEl.style.display = display;
            this._containerEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
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
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const tiltTarget = target?.closest?.('[data-tilt-action]');
            if (tiltTarget && this._tiltButtonEl?.contains(tiltTarget)) {
                this._tiltActivateHandler(e);
                continue;
            }
            if (target === this._joystickEl || target === this._joystickKnobEl || this._joystickEl?.contains(target)) {
                this._joystickTouchId = touch.identifier;
                const rect = this._joystickEl.getBoundingClientRect();
                this._joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                this._joystickActive = true;
                this._updateJoystick(touch.clientX, touch.clientY);
            } else {
                const actionTarget = target?.closest?.('[data-action]') || target;
                const action = actionTarget?.dataset?.action;
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
        const tiltInput = this._resolveTiltSteeringInput();
        const actionState = this._resolveActionState();
        this._syncActionButtons(actionState);

        const boostDown = this._buttons.boost;
        const boostPressed = boostDown && !this._prevBoost;
        this._prevBoost = boostDown;

        return {
            pitchUp: tiltInput ? tiltInput.pitchUp : jy < -deadzone,
            pitchDown: tiltInput ? tiltInput.pitchDown : jy > deadzone,
            yawLeft: tiltInput ? tiltInput.yawLeft : jx < -deadzone,
            yawRight: tiltInput ? tiltInput.yawRight : jx > deadzone,
            rollLeft: false,
            rollRight: false,
            pitchAxis: tiltInput ? -tiltInput.pitchAxis : -jy,
            yawAxis: tiltInput ? -tiltInput.yawAxis : -jx,
            rollAxis: 0,
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

    _isTiltFresh() {
        return this._tiltState.lastEventAt > 0
            && Date.now() - this._tiltState.lastEventAt < TILT_EVENT_STALE_MS;
    }

    _shouldShowJoystickFallback() {
        return this._controlMode !== TOUCH_CONTROL_MODES.TILT || !this._isTiltFresh();
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
        this._tiltState.beta = beta;
        this._tiltState.gamma = gamma;
        this._tiltState.lastEventAt = Date.now();
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
        this._tiltResolved.yawDirection = 0;
        this._tiltResolved.pitchDirection = 0;
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
        this._tiltResolved.yawDirection = 0;
        this._tiltResolved.pitchDirection = 0;
    }

    _resolveTiltSteeringInput() {
        if (this._controlMode !== TOUCH_CONTROL_MODES.TILT) return null;
        if (!this._tiltState.enabled || !this._tiltState.hasNeutral || !this._isTiltFresh()) {
            this._tiltResolved.yawAxis = 0;
            this._tiltResolved.pitchAxis = 0;
            this._tiltResolved.yawDirection = 0;
            this._tiltResolved.pitchDirection = 0;
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
        });
        const blend = 1 - this._tiltSmoothing;
        this._tiltResolved.yawAxis += (next.yawAxis - this._tiltResolved.yawAxis) * blend;
        this._tiltResolved.pitchAxis += (next.pitchAxis - this._tiltResolved.pitchAxis) * blend;

        this._tiltResolved.yawDirection = this._resolveTiltDirection(
            this._tiltResolved.yawAxis,
            this._tiltResolved.yawDirection
        );
        this._tiltResolved.pitchDirection = this._resolveTiltDirection(
            this._tiltResolved.pitchAxis,
            this._tiltResolved.pitchDirection
        );

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
            yawLeft: this._tiltResolved.yawDirection < 0,
            yawRight: this._tiltResolved.yawDirection > 0,
            pitchUp: this._tiltResolved.pitchDirection < 0,
            pitchDown: this._tiltResolved.pitchDirection > 0,
        };
    }

    _resolveTiltDirection(axis, previousDirection) {
        const magnitude = Math.abs(axis);
        if (magnitude >= this._tiltPressThreshold) {
            return Math.sign(axis);
        }
        if (magnitude <= this._tiltReleaseThreshold) {
            return 0;
        }
        return previousDirection;
    }

    _stopTiltListening() {
        if (this._tiltState.listening && typeof window !== 'undefined') {
            window.removeEventListener('deviceorientation', this._orientationHandler);
        }
        this._tiltState.listening = false;
        this._tiltState.enabled = false;
        this._tiltState.lastEventAt = 0;
    }

    _updateTiltUi() {
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
            this._tiltStatusEl.textContent = this._tiltCalibration.active
                ? 'KALIBRIERE'
                : (this._isTiltFresh() ? 'TILT SANFT' : 'TILT');
        }
        if (this._uiVisible && this._joystickEl) {
            this._joystickEl.style.display = this._shouldShowJoystickFallback() ? '' : 'none';
        }
    }

    removeUI() {
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
