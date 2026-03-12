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
        this.largeDeltaResetSeconds = 0.25;
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this._errorShown = false;
        this.accumulator = 0;
        this.renderAlpha = 0;
        this.renderDelta = this.fixedStep;
        this.frameId = requestAnimationFrame(this._boundLoop);
    }

    stop() {
        this.running = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    setTimeScale(scale) {
        const numericScale = Number(scale);
        this.timeScale = Number.isFinite(numericScale) ? Math.max(0, numericScale) : 1.0;
    }

    _loop(now) {
        if (!this.running) return;

        let rawDt = (now - this.lastTime) / 1000;
        if (!Number.isFinite(rawDt) || rawDt < 0) {
            rawDt = 0;
        }
        this.lastTime = now;

        const deltaJump = rawDt > this.largeDeltaResetSeconds;
        if (deltaJump) {
            this.accumulator = 0;
        }

        const stabilizedRawDt = deltaJump ? this.fixedStep : rawDt;
        const dt = Math.min(stabilizedRawDt, 0.05);
        const runtimePerfProfiler = this.runtimePerfProfiler;
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
