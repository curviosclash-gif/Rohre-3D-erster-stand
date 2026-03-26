// ─── WebCodecs Recorder Engine: VideoEncoder & MP4 Muxer Strategy ───
// Handles WebCodecs API recording via VideoEncoder and mp4-muxer

import * as Mp4MuxerModule from 'mp4-muxer';
import { WEB_CODECS_CODEC_CANDIDATES } from '../MediaRecorderSupport.js';
import { toPositiveInt, ENCODE_QUEUE_DROP_LIMIT, ENCODE_QUEUE_SOFT_LIMIT } from '../MediaRecorderSystemOps.js';

const Mp4Muxer = Mp4MuxerModule;
const WEB_CODECS_CODEC = WEB_CODECS_CODEC_CANDIDATES[0];

/**
 * WebCodecs-based recording engine using VideoEncoder + MP4 muxer.
 * Provides fine-grained control over encoding but requires explicit frame submission.
 */
export class WebCodecsRecorderEngine {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.width = toPositiveInt(options.width, 1920);
        this.height = toPositiveInt(options.height, 1080);
        this.bitrate = toPositiveInt(options.bitrate, 15_000_000);
        this.frameRate = toPositiveInt(options.frameRate, 60);
        this._muxer = null;
        this._videoEncoder = null;
        this._encodeQueue = [];
        this._isConfigured = false;
    }

    /**
     * Initialize the WebCodecs encoder and muxer.
     */
    async initialize() {
        if (this._isConfigured) return true;
        try {
            this._muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc1',
                    width: this.width,
                    height: this.height,
                },
            });

            const config = {
                codec: WEB_CODECS_CODEC,
                width: this.width,
                height: this.height,
                bitrate: this.bitrate,
                framerate: this.frameRate,
            };

            this._videoEncoder = new VideoEncoder({
                output: this._handleEncodedChunk.bind(this),
                error: (error) => {
                    this.logger?.error?.('[WebCodecsRecorderEngine] Encoder error:', error);
                },
            });

            await this._videoEncoder.configure(config);
            this._isConfigured = true;
            return true;
        } catch (error) {
            this.logger?.error?.('[WebCodecsRecorderEngine] Initialize failed:', error);
            return false;
        }
    }

    /**
     * Submit a frame for encoding.
     */
    encodeFrame(videoFrame, timestamp) {
        if (!this._videoEncoder || !this._isConfigured) return false;
        try {
            if (this._encodeQueue.length >= ENCODE_QUEUE_HARD_LIMIT) {
                this._encodeQueue.shift();
            }
            this._videoEncoder.encode(videoFrame, { timestamp });
            this._encodeQueue.push(timestamp);
            return true;
        } catch (error) {
            this.logger?.warn?.('[WebCodecsRecorderEngine] Encode failed:', error);
            return false;
        }
    }

    /**
     * Finalize recording and return the blob.
     */
    async finalize() {
        try {
            if (this._videoEncoder) {
                await this._videoEncoder.flush();
                this._videoEncoder.close();
            }

            if (this._muxer) {
                this._muxer.finalize();
                const buffer = this._muxer.target.getBuffer();
                return new Blob([buffer], { type: 'video/mp4' });
            }
            return null;
        } catch (error) {
            this.logger?.error?.('[WebCodecsRecorderEngine] Finalize failed:', error);
            return null;
        }
    }

    /**
     * Internal handler for encoded chunks from VideoEncoder.
     */
    _handleEncodedChunk(chunk) {
        if (!this._muxer) return;
        try {
            if (chunk.type === 'key') {
                this._muxer.addVideoChunk(chunk, undefined, true);
            } else {
                this._muxer.addVideoChunk(chunk);
            }
        } catch (error) {
            this.logger?.warn?.('[WebCodecsRecorderEngine] Mux chunk failed:', error);
        }
    }

    /**
     * Check if WebCodecs is supported.
     */
    static isSupported() {
        return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
    }

    /**
     * Get current queue length.
     */
    getQueueLength() {
        return this._encodeQueue.length;
    }

    /**
     * Reset encoder state.
     */
    reset() {
        this._encodeQueue = [];
        this._muxer = null;
        this._videoEncoder = null;
        this._isConfigured = false;
    }
}

const ENCODE_QUEUE_HARD_LIMIT = 300; // Drop oldest if exceeded
