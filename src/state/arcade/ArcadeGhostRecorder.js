// ─── Arcade Ghost Recorder: Parcours Best-Time Path Recording ───

const SAMPLE_INTERVAL_MS = 50;
const MAX_SAMPLES = 1200;

export class ArcadeGhostRecorder {
    constructor() {
        this._recording = false;
        this._frames = [];
        this._startMs = 0;
        this._lastSampleMs = -Infinity;
        this._playerIdx = 0;
    }

    startRecording(playerIndex, nowMs) {
        this._recording = true;
        this._frames = [];
        this._startMs = nowMs;
        this._lastSampleMs = -Infinity;
        this._playerIdx = Math.max(0, Math.floor(Number(playerIndex) || 0));
    }

    sample(player, nowMs) {
        if (!this._recording) return;
        if (nowMs - this._lastSampleMs < SAMPLE_INTERVAL_MS) return;
        if (this._frames.length >= MAX_SAMPLES) return;
        this._lastSampleMs = nowMs;
        this._frames.push({
            time: (nowMs - this._startMs) / 1000,
            players: [{
                idx: this._playerIdx,
                x: Number(player.position?.x) || 0,
                y: Number(player.position?.y) || 0,
                z: Number(player.position?.z) || 0,
                qx: Number(player.quaternion?.x) || 0,
                qy: Number(player.quaternion?.y) || 0,
                qz: Number(player.quaternion?.z) || 0,
                qw: Number(player.quaternion?.w) || 1,
                alive: player.alive === true,
            }],
        });
    }

    stopRecording() {
        this._recording = false;
        if (this._frames.length < 2) return null;
        const sourceDuration = this._frames[this._frames.length - 1].time;
        return {
            frames: this._frames,
            players: [{ idx: this._playerIdx, color: 0xffffff }],
            sourceDuration,
            displayDuration: sourceDuration,
        };
    }

    get isRecording() {
        return this._recording;
    }

    reset() {
        this._recording = false;
        this._frames = [];
        this._startMs = 0;
        this._lastSampleMs = -Infinity;
    }
}
