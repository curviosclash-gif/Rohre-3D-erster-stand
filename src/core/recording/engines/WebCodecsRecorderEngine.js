import * as Mp4MuxerModule from 'mp4-muxer';
import {
    DEFAULT_MIME_TYPE,
    WEB_CODECS_CODEC_CANDIDATES,
    resolveGlobalScope,
} from '../MediaRecorderSupport.js';
import { toPositiveInt } from '../MediaRecorderSystemOps.js';

const Mp4Muxer = Mp4MuxerModule;

export class WebCodecsRecorderEngine {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.globalScope = resolveGlobalScope(options.globalScope);
        this.width = toPositiveInt(options.width, 1920);
        this.height = toPositiveInt(options.height, 1080);
        this.bitrate = toPositiveInt(options.bitrate, 8_000_000);
        this.frameRate = toPositiveInt(options.frameRate, 60);
        this._muxer = null;
        this._videoEncoder = null;
        this._resolvedCandidate = null;
        this._resolvedConfig = null;
    }

    _buildEncoderConfig(candidate) {
        const codec = typeof candidate === 'object' ? candidate.codec : candidate;
        const family = typeof candidate === 'object' ? candidate.family : 'avc';
        const config = {
            codec,
            width: this.width,
            height: this.height,
            hardwareAcceleration: 'prefer-hardware',
            bitrate: this.bitrate,
            framerate: this.frameRate,
        };
        if (family === 'avc') {
            config.avc = { format: 'avc' };
        }
        return config;
    }

    async initialize() {
        if (this.isReady()) {
            return {
                ok: true,
                mimeType: DEFAULT_MIME_TYPE,
                codec: this._resolvedCandidate?.codec || null,
                muxerCodec: this._resolvedCandidate?.muxerCodec || null,
            };
        }

        const VideoEncoderCtor = this.globalScope?.VideoEncoder;
        const VideoFrameCtor = this.globalScope?.VideoFrame;
        if (typeof VideoEncoderCtor !== 'function') {
            return { ok: false, reason: 'missing-video-encoder' };
        }
        if (typeof VideoFrameCtor !== 'function') {
            return { ok: false, reason: 'missing-video-frame' };
        }

        let resolvedCandidate = null;
        let resolvedConfig = null;
        for (const candidate of WEB_CODECS_CODEC_CANDIDATES) {
            const config = this._buildEncoderConfig(candidate);
            const codec = typeof candidate === 'object' ? candidate.codec : candidate;
            if (typeof VideoEncoderCtor.isConfigSupported === 'function') {
                try {
                    const probe = await VideoEncoderCtor.isConfigSupported(config);
                    if (probe?.supported) {
                        resolvedCandidate = candidate;
                        resolvedConfig = config;
                        break;
                    }
                    this.logger?.info?.(
                        `[WebCodecsRecorderEngine] codec ${codec} not supported (${this.width}x${this.height}), trying next`
                    );
                } catch (error) {
                    this.logger?.info?.(
                        `[WebCodecsRecorderEngine] codec ${codec} probe failed: ${error?.message || error}`
                    );
                }
            } else {
                resolvedCandidate = candidate;
                resolvedConfig = config;
                break;
            }
        }

        if (!resolvedCandidate || !resolvedConfig) {
            return {
                ok: false,
                reason: 'encoder_config_unsupported',
                candidates: WEB_CODECS_CODEC_CANDIDATES,
            };
        }

        try {
            const muxerCodec = typeof resolvedCandidate === 'object' ? resolvedCandidate.muxerCodec : 'avc';
            this._muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: muxerCodec,
                    width: this.width,
                    height: this.height,
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });
            this._videoEncoder = new VideoEncoderCtor({
                output: (chunk, meta) => this._muxer.addVideoChunk(chunk, meta),
                error: (error) => this.logger?.error?.('[WebCodecsRecorderEngine] VideoEncoder error', error),
            });
            this._videoEncoder.configure(resolvedConfig);
            this._resolvedCandidate = resolvedCandidate;
            this._resolvedConfig = resolvedConfig;
            return {
                ok: true,
                mimeType: DEFAULT_MIME_TYPE,
                codec: typeof resolvedCandidate === 'object' ? resolvedCandidate.codec : resolvedCandidate,
                muxerCodec,
            };
        } catch (error) {
            this.logger?.warn?.('[WebCodecsRecorderEngine] initialize failed', error);
            this.dispose();
            return { ok: false, reason: 'encoder_creation_failed', error };
        }
    }

    isReady() {
        return !!this._videoEncoder && this._videoEncoder.state === 'configured';
    }

    getEncodeQueueSize() {
        return Number(this._videoEncoder?.encodeQueueSize || 0);
    }

    getEncoderState() {
        return this._videoEncoder?.state || 'inactive';
    }

    getRuntimeState() {
        return {
            muxer: this._muxer,
            videoEncoder: this._videoEncoder,
        };
    }

    encodeFrame(frameSource, { timestampUs = 0, keyFrame = false } = {}) {
        if (!this.isReady()) {
            return false;
        }
        const VideoFrameCtor = this.globalScope?.VideoFrame;
        if (typeof VideoFrameCtor !== 'function') {
            return false;
        }
        let frame = null;
        try {
            frame = new VideoFrameCtor(frameSource, {
                timestamp: Math.max(0, Math.trunc(timestampUs)),
            });
            this._videoEncoder.encode(frame, { keyFrame: !!keyFrame });
            return true;
        } catch (error) {
            this.logger?.warn?.('[WebCodecsRecorderEngine] encode failed', error);
            return false;
        } finally {
            frame?.close?.();
        }
    }

    async stop() {
        if (!this._muxer) {
            return { ok: false, reason: 'muxer_missing' };
        }
        try {
            if (this._videoEncoder) {
                await this._videoEncoder.flush();
                this._videoEncoder.close();
            }
            this._muxer.finalize();
            const buffer = this._muxer?.target?.buffer
                || this._muxer?.target?.getBuffer?.()
                || new ArrayBuffer(0);
            return {
                ok: true,
                blob: new Blob([buffer], { type: DEFAULT_MIME_TYPE }),
                mimeType: DEFAULT_MIME_TYPE,
                bufferSize: Number(buffer?.byteLength || 0),
            };
        } catch (error) {
            this.logger?.warn?.('[WebCodecsRecorderEngine] stop failed', error);
            return { ok: false, reason: 'stop_failed', error };
        }
    }

    dispose() {
        try {
            if (this._videoEncoder && this._videoEncoder.state !== 'closed') {
                this._videoEncoder.close();
            }
        } catch {
            // Ignore cleanup errors during recorder teardown.
        }
        this._videoEncoder = null;
        this._muxer = null;
        this._resolvedCandidate = null;
        this._resolvedConfig = null;
    }
}
