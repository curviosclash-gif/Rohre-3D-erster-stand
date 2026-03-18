// ============================================
// ReplayRecorder.js - records match actions for replay
// ============================================

import { createGameStateSnapshot } from '../GameStateSnapshot.js';

/**
 * Records a match as { initialState, actions[] } for deterministic playback.
 * Actions include all player inputs with frame timestamps.
 */
export class ReplayRecorder {
    constructor() {
        this._recording = false;
        this._initialState = null;
        this._actions = [];
        this._playerCount = 0;
        this._startTime = 0;
    }

    start(entityManager, roundState, playerCount) {
        this._recording = true;
        this._playerCount = playerCount;
        this._startTime = Date.now();
        this._initialState = createGameStateSnapshot(entityManager, roundState);
        this._actions = [];
    }

    recordAction(action) {
        if (!this._recording) return;
        this._actions.push({
            ...action,
            timestamp: Date.now() - this._startTime,
        });
    }

    stop() {
        this._recording = false;
        return this.getReplay();
    }

    getReplay() {
        return {
            version: 'replay.v1',
            playerCount: this._playerCount,
            startTime: this._startTime,
            duration: Date.now() - this._startTime,
            initialState: this._initialState,
            actions: this._actions,
            actionCount: this._actions.length,
        };
    }

    get isRecording() {
        return this._recording;
    }

    reset() {
        this._recording = false;
        this._initialState = null;
        this._actions = [];
        this._playerCount = 0;
    }
}
