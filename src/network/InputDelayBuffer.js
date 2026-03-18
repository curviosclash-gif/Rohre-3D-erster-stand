// ============================================
// InputDelayBuffer.js - adaptive input delay for netcode
// ============================================

/**
 * Delays local input application by D frames to compensate for network latency.
 * D is adaptive based on RTT:
 *   LAN (<5ms):        D = 1 frame
 *   Good internet:     D = 3 frames
 *   Medium internet:   D = 6 frames
 *   Poor internet:     D = 10 frames
 *
 * Range: 1-12 frames (clamped).
 */
export class InputDelayBuffer {
    constructor(maxDelay = 12) {
        this._maxDelay = maxDelay;
        this._buffer = [];
        this._currentDelay = 1;
        this._frame = 0;
    }

    get delayFrames() {
        return this._currentDelay;
    }

    /**
     * Update delay based on current RTT (in milliseconds).
     */
    updateFromRTT(rttMs) {
        // ~16.67ms per frame at 60Hz
        const framesOfLatency = Math.ceil(rttMs / 16.67);
        // Add 1 frame safety margin, clamp to [1, maxDelay]
        this._currentDelay = Math.max(1, Math.min(this._maxDelay, framesOfLatency + 1));
    }

    /**
     * Push an input into the delay buffer.
     */
    push(input) {
        this._buffer.push({
            frame: this._frame,
            input: { ...input },
        });
        this._frame++;

        // Trim old entries beyond the delay window
        const cutoff = this._frame - this._currentDelay - 5;
        while (this._buffer.length > 0 && this._buffer[0].frame < cutoff) {
            this._buffer.shift();
        }
    }

    /**
     * Get the delayed input (currentFrame - delay).
     * Returns null if no input available for that frame.
     */
    getDelayed() {
        const targetFrame = this._frame - this._currentDelay;
        if (targetFrame < 0) return null;

        for (let i = this._buffer.length - 1; i >= 0; i--) {
            if (this._buffer[i].frame <= targetFrame) {
                return this._buffer[i].input;
            }
        }
        return null;
    }

    reset() {
        this._buffer = [];
        this._frame = 0;
        this._currentDelay = 1;
    }
}
