// ============================================
// GameLoop.js - fixed-step simulation loop with scaled game time
// ============================================

export class GameLoop {
    constructor(updateFn, renderFn, options = {}) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
        this.running = false;
        this.lastTime = 0;
        this.timeScale = 1.0; // Fuer Zeitlupe-Powerup
        this._boundLoop = this._loop.bind(this);
        this.frameId = null;
        this._errorShown = false;
        this.accumulator = 0;
        this.fixedStep = 1 / 60;
        this.maxSubSteps = 3;
        this.renderAlpha = 1;
        this.renderDelta = this.fixedStep;
        this.runtimePerfProfiler = options?.runtimePerfProfiler || null;
        this.largeDeltaResetSeconds = 0.2;
        this.renderFrameId = 0;
        this._renderTiming = {
            frameId: 0,
            rawDt: this.fixedStep,
            stabilizedDt: this.fixedStep,
            reset: false,
            resetReason: '',
            timestampMs: 0,
        };
        this._pendingDeltaReset = false;
        this._pendingDeltaResetReason = '';
        this._focusResetEventsAttached = false;
        this._boundWindowBlur = () => this.requestDeltaReset('window-blur');
        this._boundWindowFocus = () => this.requestDeltaReset('window-focus');
        this._boundVisibilityChange = () => {
            const hidden = typeof document !== 'undefined' && document.hidden === true;
            this.requestDeltaReset(hidden ? 'visibility-hidden' : 'visibility-visible');
        };
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this._errorShown = false;
        this.accumulator = 0;
        this.renderAlpha = 0;
        this.renderDelta = this.fixedStep;
        this.renderFrameId = 0;
        this.requestDeltaReset('start');
        this._attachFocusResetEvents();
        this.frameId = requestAnimationFrame(this._boundLoop);
    }

    stop() {
        this.running = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this._detachFocusResetEvents();
    }

    setTimeScale(scale) {
        const numericScale = Number(scale);
        this.timeScale = Number.isFinite(numericScale) ? Math.max(0, numericScale) : 1.0;
    }

    requestDeltaReset(reason = 'manual') {
        this._pendingDeltaReset = true;
        this._pendingDeltaResetReason = String(reason || 'manual');
    }

    getRenderTiming() {
        return this._renderTiming;
    }

    _attachFocusResetEvents() {
        if (this._focusResetEventsAttached) return;
        if (typeof window !== 'undefined' && window?.addEventListener) {
            window.addEventListener('blur', this._boundWindowBlur);
            window.addEventListener('focus', this._boundWindowFocus);
        }
        if (typeof document !== 'undefined' && document?.addEventListener) {
            document.addEventListener('visibilitychange', this._boundVisibilityChange);
        }
        this._focusResetEventsAttached = true;
    }

    _detachFocusResetEvents() {
        if (!this._focusResetEventsAttached) return;
        if (typeof window !== 'undefined' && window?.removeEventListener) {
            window.removeEventListener('blur', this._boundWindowBlur);
            window.removeEventListener('focus', this._boundWindowFocus);
        }
        if (typeof document !== 'undefined' && document?.removeEventListener) {
            document.removeEventListener('visibilitychange', this._boundVisibilityChange);
        }
        this._focusResetEventsAttached = false;
    }

    _consumeDeltaReset() {
        const reset = this._pendingDeltaReset === true;
        const reason = reset ? (this._pendingDeltaResetReason || 'manual') : '';
        this._pendingDeltaReset = false;
        this._pendingDeltaResetReason = '';
        return { reset, reason };
    }

    _updateRenderTiming(now, rawDt, stabilizedDt, reset, resetReason = '') {
        const timing = this._renderTiming;
        timing.frameId = this.renderFrameId;
        timing.rawDt = rawDt;
        timing.stabilizedDt = stabilizedDt;
        timing.reset = reset === true;
        timing.resetReason = String(resetReason || '');
        timing.timestampMs = now;
        return timing;
    }

    _loop(now) {
        if (!this.running) return;

        let rawDt = (now - this.lastTime) / 1000;
        if (!Number.isFinite(rawDt) || rawDt < 0) {
            rawDt = 0;
        }
        this.lastTime = now;

        const pendingReset = this._consumeDeltaReset();
        const deltaJump = rawDt > this.largeDeltaResetSeconds;
        const shouldResetDelta = deltaJump || pendingReset.reset;
        const resetReason = deltaJump
            ? (pendingReset.reset ? `${pendingReset.reason}|delta-jump` : 'delta-jump')
            : pendingReset.reason;
        if (shouldResetDelta) {
            // Halb gefüllter Akkumulator nach Reset → renderAlpha ≈ 0.5 statt 0,
            // verhindert sichtbaren Positions-Sprung direkt nach dem Reset-Frame.
            this.accumulator = this.fixedStep * 0.5;
        }

        const stabilizedRawDt = shouldResetDelta ? this.fixedStep : rawDt;
        const dt = Math.min(stabilizedRawDt, 0.05);
        const runtimePerfProfiler = this.runtimePerfProfiler;
        this.renderFrameId += 1;
        this._updateRenderTiming(now, rawDt, dt, shouldResetDelta, resetReason);
        runtimePerfProfiler?.beginFrame(rawDt * 1000, now);

        this.renderDelta = dt;
        const scaledDt = dt * this.timeScale;
        this.accumulator += scaledDt;

        const maxAccum = this.fixedStep * this.maxSubSteps;
        if (this.accumulator > maxAccum) {
            this.accumulator = maxAccum;
        }

        try {
            while (this.accumulator >= this.fixedStep) {
                const updateStart = runtimePerfProfiler?.startSample?.();
                this.updateFn(this.fixedStep);
                runtimePerfProfiler?.endSample?.('update', updateStart);
                this.accumulator -= this.fixedStep;
            }
            const rawAlpha = this.fixedStep > 0 ? (this.accumulator / this.fixedStep) : 0;
            this.renderAlpha = Number.isFinite(rawAlpha) ? Math.max(0, Math.min(1, rawAlpha)) : 0;
            this.renderFn(this.renderAlpha, this.renderDelta);
        } catch (err) {
            if (!this._errorShown) {
                this._errorShown = true;
                console.error('GameLoop error:', err);
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;padding:20px;background:#c00;color:#fff;font:16px monospace;z-index:99999;white-space:pre-wrap;';
                overlay.textContent = 'FEHLER: ' + err.message + '\n\n' + err.stack;
                document.body.appendChild(overlay);
            }
        }
        runtimePerfProfiler?.endFrame(rawDt * 1000, now);

        this.frameId = requestAnimationFrame(this._boundLoop);
    }
}
