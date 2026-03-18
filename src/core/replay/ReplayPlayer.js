// ============================================
// ReplayPlayer.js - plays back recorded replays
// ============================================

/**
 * Plays back a recorded replay by feeding actions at the correct frame timing.
 * Supports play/pause and speed control.
 */
export class ReplayPlayer {
    constructor() {
        this._replay = null;
        this._playing = false;
        this._paused = false;
        this._speed = 1.0;
        this._currentActionIndex = 0;
        this._elapsedTime = 0;
        this._onAction = null;
        this._onComplete = null;
    }

    load(replay) {
        this._replay = replay;
        this._currentActionIndex = 0;
        this._elapsedTime = 0;
        this._playing = false;
        this._paused = false;
    }

    /**
     * Load replay from JSON string (C.5).
     * @param {string} json
     */
    loadFromJSON(json) {
        const replay = JSON.parse(json);
        this.load(replay);
    }

    play(onAction, onComplete) {
        if (!this._replay) return;
        this._playing = true;
        this._paused = false;
        this._onAction = onAction;
        this._onComplete = onComplete || null;
    }

    pause() {
        this._paused = true;
    }

    resume() {
        this._paused = false;
    }

    setSpeed(speed) {
        this._speed = Math.max(0.25, Math.min(4.0, speed));
    }

    update(dt) {
        if (!this._playing || this._paused || !this._replay) return;

        this._elapsedTime += dt * 1000 * this._speed;
        const actions = this._replay.actions;

        while (this._currentActionIndex < actions.length) {
            const action = actions[this._currentActionIndex];
            if (action.timestamp > this._elapsedTime) break;

            if (this._onAction) {
                this._onAction(action);
            }
            this._currentActionIndex++;
        }

        if (this._currentActionIndex >= actions.length) {
            this._playing = false;
            if (this._onComplete) {
                this._onComplete();
            }
        }
    }

    get isPlaying() {
        return this._playing;
    }

    get isPaused() {
        return this._paused;
    }

    get progress() {
        if (!this._replay || !this._replay.duration) return 0;
        return Math.min(1, this._elapsedTime / this._replay.duration);
    }

    get initialState() {
        return this._replay?.initialState || null;
    }

    get matchId() {
        return this._replay?.matchId || null;
    }

    reset() {
        this._currentActionIndex = 0;
        this._elapsedTime = 0;
        this._playing = false;
        this._paused = false;
    }
}
