// ============================================
// GameLoop.js - fixed-step simulation loop with scaled game time
// ============================================

export class GameLoop {
    constructor(updateFn, renderFn) {
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
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this._errorShown = false;
        this.accumulator = 0;
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

        const rawDt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        const dt = Math.min(rawDt, 0.05);
        const scaledDt = dt * this.timeScale;
        this.accumulator += scaledDt;

        const maxAccum = this.fixedStep * this.maxSubSteps;
        if (this.accumulator > maxAccum) {
            this.accumulator = maxAccum;
        }

        try {
            while (this.accumulator >= this.fixedStep) {
                this.updateFn(this.fixedStep);
                this.accumulator -= this.fixedStep;
            }
            this.renderFn();
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

        this.frameId = requestAnimationFrame(this._boundLoop);
    }
}
