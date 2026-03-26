// ─── Native MediaRecorder Engine: Browser MediaRecorder API Strategy ───
// Handles native MediaRecorder API as fallback for WebCodecs unavailable

import {
    DEFAULT_FALLBACK_MIME_TYPE,
    DEFAULT_MIME_TYPE,
    detectNativeRecorderSupport,
    resolveSafeMediaRecorderMimeType,
} from '../MediaRecorderSupport.js';
import { toPositiveInt, MEDIARECORDER_SYNTHETIC_QUEUE_HARD_MS, MEDIARECORDER_SYNTHETIC_QUEUE_SOFT_MS } from '../MediaRecorderSystemOps.js';

/**
 * Native MediaRecorder-based recording engine.
 * Uses browser's built-in MediaRecorder API as fallback when WebCodecs unavailable.
 */
export class NativeMediaRecorderEngine {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.mimeType = resolveSafeMediaRecorderMimeType(options.mimeType) || DEFAULT_MIME_TYPE;
        this.canvas = options.canvas || null;
        this._mediaRecorder = null;
        this._mediaRecorderChunks = [];
        this._mediaRecorderStream = null;
        this._mediaRecorderVideoTrack = null;
        this._mediaRecorderSupportsRequestFrame = false;
        this._lastFrameTimestamp = 0;
        this._isRecording = false;
    }

    /**
     * Initialize native MediaRecorder from canvas.
     */
    async initialize() {
        if (this._mediaRecorder || !this.canvas) return false;
        try {
            const stream = this.canvas.captureStream(60); // 60 FPS capture
            const videoTracks = stream.getVideoTracks();

            if (!videoTracks.length) {
                this.logger?.error?.('[NativeMediaRecorderEngine] No video tracks available');
                return false;
            }

            this._mediaRecorderVideoTrack = videoTracks[0];
            this._mediaRecorderStream = stream;
            this._mediaRecorderSupportsRequestFrame = typeof this._mediaRecorderVideoTrack.requestFrame === 'function';

            this._mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.mimeType,
                videoBitsPerSecond: 15_000_000,
            });

            this._mediaRecorder.ondataavailable = this._handleDataAvailable.bind(this);
            this._mediaRecorder.onerror = (event) => {
                this.logger?.warn?.('[NativeMediaRecorderEngine] Recorder error:', event.error);
            };

            return true;
        } catch (error) {
            this.logger?.error?.('[NativeMediaRecorderEngine] Initialize failed:', error);
            return false;
        }
    }

    /**
     * Start recording.
     */
    start(timeslice = 100) {
        if (!this._mediaRecorder || this._isRecording) return false;
        try {
            this._mediaRecorder.start(timeslice);
            this._isRecording = true;
            return true;
        } catch (error) {
            this.logger?.warn?.('[NativeMediaRecorderEngine] Start failed:', error);
            return false;
        }
    }

    /**
     * Stop recording and return accumulated blob.
     */
    async stop() {
        if (!this._mediaRecorder || !this._isRecording) return null;
        try {
            return new Promise((resolve) => {
                const onStop = () => {
                    this._mediaRecorder.removeEventListener('stop', onStop);
                    const blob = new Blob(this._mediaRecorderChunks, { type: this.mimeType });
                    this._mediaRecorderChunks = [];
                    this._isRecording = false;
                    resolve(blob);
                };
                this._mediaRecorder.addEventListener('stop', onStop);
                this._mediaRecorder.stop();
            });
        } catch (error) {
            this.logger?.warn?.('[NativeMediaRecorderEngine] Stop failed:', error);
            return null;
        }
    }

    /**
     * Request frame if supported (for synchronized capture).
     */
    requestFrame() {
        if (this._mediaRecorderSupportsRequestFrame && this._mediaRecorderVideoTrack) {
            try {
                this._mediaRecorderVideoTrack.requestFrame();
                return true;
            } catch (error) {
                this.logger?.warn?.('[NativeMediaRecorderEngine] RequestFrame failed:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * Internal handler for data chunks.
     */
    _handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            this._mediaRecorderChunks.push(event.data);
        }
    }

    /**
     * Check if native MediaRecorder is supported.
     */
    static isSupported() {
        return typeof MediaRecorder !== 'undefined' && detectNativeRecorderSupport();
    }

    /**
     * Get recording state.
     */
    isRecording() {
        return this._isRecording;
    }

    /**
     * Cleanup resources.
     */
    cleanup() {
        if (this._mediaRecorderStream) {
            this._mediaRecorderStream.getTracks().forEach((track) => track.stop());
            this._mediaRecorderStream = null;
        }
        if (this._mediaRecorder) {
            this._mediaRecorder = null;
        }
        this._mediaRecorderChunks = [];
        this._isRecording = false;
    }
}
