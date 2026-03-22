import * as Mp4MuxerModule from 'mp4-muxer';
import {
    MATCH_LIFECYCLE_CONTRACT_VERSION,
    MATCH_LIFECYCLE_EVENT_TYPES,
} from '../shared/contracts/MatchLifecycleContract.js';
import { toFiniteNumber } from '../utils/MathOps.js';
import {
    DEFAULT_FALLBACK_MIME_TYPE,
    DEFAULT_MIME_TYPE,
    detectNativeRecorderSupport,
    RECORDER_ENGINE,
    resolveGlobalScope,
    resolvePerfNow,
    resolveSafeMediaRecorderMimeType,
    sanitizeFileToken,
    toSafeDatePart,
} from './recording/MediaRecorderSupport.js';
const Mp4Muxer = Mp4MuxerModule;

const DEFAULT_CONTRACT_VERSION = MATCH_LIFECYCLE_CONTRACT_VERSION;
const WEB_CODECS_CODEC = 'avc1.4d002a';

const ENCODE_QUEUE_SOFT_LIMIT = 2;
const ENCODE_QUEUE_DROP_LIMIT = 10;
const CAPTURE_LOAD_LEVELS = Object.freeze([
    Object.freeze({ fpsScale: 1.0, resolutionScale: 1.0 }),
    Object.freeze({ fpsScale: 0.95, resolutionScale: 0.9 }),
    Object.freeze({ fpsScale: 0.9, resolutionScale: 0.78 }),
    Object.freeze({ fpsScale: 0.8, resolutionScale: 0.65 }),
    Object.freeze({ fpsScale: 0.7, resolutionScale: 0.5 }),
    Object.freeze({ fpsScale: 0.6, resolutionScale: 0.42 }),
]);
const MAX_CAPTURE_TIMESTAMPS = 4096;
const MAX_CAPTURE_STEPS_PER_RENDER = 1;
const MAX_CAPTURE_BACKLOG_STEPS = 2;
const MEDIARECORDER_SYNTHETIC_QUEUE_SOFT_MS = 22;
const MEDIARECORDER_SYNTHETIC_QUEUE_HARD_MS = 38;

export const LIFECYCLE_EVENT_TYPES = MATCH_LIFECYCLE_EVENT_TYPES;

function defaultDownload({ blob, fileName }) {
    if (typeof document === 'undefined' || !blob || !fileName) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toPositiveInt(value, fallback, min = 1, max = 1_000_000) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function computePercentile(values, ratio) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    const index = Math.max(0, Math.min(values.length - 1, Math.ceil(values.length * clamped) - 1));
    return toFiniteNumber(values[index], 0);
}

export class MediaRecorderSystem {
    constructor({
        canvas = null,
        autoRecordingEnabled = true,
        autoDownload = false,
        downloadDirectoryName = 'videos',
        captureFps = 60,
        onRecordingStateChange = null,
        contractVersion = DEFAULT_CONTRACT_VERSION,
        filePrefix = 'aero-arena',
        logger = console,
        now = () => Date.now(),
        downloadHandler = defaultDownload,
        capabilityProbe = null,
        globalScope = null,
        runtimePerfProfiler = null,
    } = {}) {
        this.canvas = canvas || null;
        this.autoRecordingEnabled = autoRecordingEnabled !== false;
        this.autoDownload = !!autoDownload;
        this.downloadDirectoryName = sanitizeFileToken(downloadDirectoryName, 'videos');
        this.captureFps = Math.max(1, Number(captureFps) || 60);
        this.onRecordingStateChange = typeof onRecordingStateChange === 'function' ? onRecordingStateChange : null;
        this.contractVersion = String(contractVersion || DEFAULT_CONTRACT_VERSION);
        this.filePrefix = sanitizeFileToken(filePrefix, 'aero-arena');
        this.logger = logger || console;
        this.now = typeof now === 'function' ? now : (() => Date.now());
        this.downloadHandler = typeof downloadHandler === 'function' ? downloadHandler : defaultDownload;
        this._capabilityProbe = typeof capabilityProbe === 'function' ? capabilityProbe : null;
        this._globalScope = resolveGlobalScope(globalScope);
        this._perfNow = resolvePerfNow(this._globalScope);
        this.runtimePerfProfiler = runtimePerfProfiler || null;

        this._muxer = null;
        this._videoEncoder = null;
        this._mediaRecorder = null;
        this._mediaRecorderChunks = null;
        this._mediaRecorderStream = null;
        this._mediaRecorderVideoTrack = null;
        this._mediaRecorderSupportsRequestFrame = false;
        this._mediaRecorderUsesCaptureCanvas = false;
        this._activeRecording = null;
        this._pendingStop = null;
        this._lastExport = null;
        this._lifecycleEvents = [];
        this._frameCount = 0;
        this._isRecording = false;
        this._activeMimeType = DEFAULT_MIME_TYPE;
        this._activeRecorderEngine = RECORDER_ENGINE.NONE;

        this._captureLevelIndex = 0;
        this._captureAccumulatorMs = 0;
        this._captureLastNowMs = 0;
        this._captureTimestampUs = 0;
        this._captureHighPressureFrames = 0;
        this._captureLowPressureFrames = 0;
        this._captureDroppedFrames = 0;
        this._captureEncodedFrames = 0;
        this._captureBackpressureEvents = 0;
        this._captureMaxEncodeQueueSize = 0;
        this._captureCanvas = null;
        this._captureCanvasCtx = null;
        this._captureCanvasWidth = 0;
        this._captureCanvasHeight = 0;

        this._captureTimestampHistoryUs = new Float64Array(MAX_CAPTURE_TIMESTAMPS);
        this._captureTimestampHistoryCount = 0;
        this._captureTimestampHistoryWriteIndex = 0;
        this._lastFrameIntervalStats = null;
        this._frameIntervalStatsDirty = false;
    }

    getContractVersion() {
        return this.contractVersion;
    }

    _resolveSupportState() {
        const canCapture = !!this.canvas;
        let customSupport = null;
        if (typeof this._capabilityProbe === 'function') {
            try {
                customSupport = this._capabilityProbe({
                    canvas: this.canvas,
                    globalScope: this._globalScope,
                    mimeType: DEFAULT_MIME_TYPE,
                });
            } catch (error) {
                this.logger?.warn?.('[MediaRecorderSystem] capability probe failed', error);
            }
        }

        if (customSupport && typeof customSupport === 'object') {
            const hasRecorder = !!customSupport.hasRecorder;
            const canRecord = !!customSupport.canRecord;
            const recorderEngine = String(
                customSupport.recorderEngine || (hasRecorder ? RECORDER_ENGINE.NATIVE_WEBCODECS : RECORDER_ENGINE.NONE)
            );
            const selectedMimeType = String(customSupport.selectedMimeType || DEFAULT_MIME_TYPE);
            return {
                canCapture,
                hasRecorder,
                hasWebCodecs: recorderEngine === RECORDER_ENGINE.NATIVE_WEBCODECS,
                hasMediaRecorder: recorderEngine === RECORDER_ENGINE.NATIVE_MEDIARECORDER,
                canRecord,
                selectedMimeType,
                recorderEngine,
                supportReason: String(customSupport.supportReason || (canRecord ? 'capability-probe' : 'probe-disabled')),
            };
        }

        const nativeSupport = detectNativeRecorderSupport(this._globalScope, this.canvas);
        const hasRecorder = nativeSupport.hasRecorder;
        return {
            canCapture,
            hasRecorder,
            hasWebCodecs: nativeSupport.hasWebCodecs,
            hasMediaRecorder: nativeSupport.hasMediaRecorder,
            mediaRecorderMimeType: nativeSupport.mediaRecorderMimeType || null,
            canRecord: canCapture && hasRecorder,
            selectedMimeType: nativeSupport.selectedMimeType,
            recorderEngine: nativeSupport.recorderEngine,
            supportReason: canCapture ? nativeSupport.supportReason : 'missing-canvas',
        };
    }

    getSupportState() {
        return this._resolveSupportState();
    }

    setAutoRecordingEnabled(enabled) {
        this.autoRecordingEnabled = !!enabled;
    }

    isRecording() {
        return this._isRecording;
    }

    setCaptureFps(fps) {
        const nextFps = Math.max(1, Math.floor(Number(fps) || 0));
        if (!Number.isFinite(nextFps)) {
            return this.captureFps;
        }
        this.captureFps = nextFps;
        if (this._isRecording && this._activeRecorderEngine === RECORDER_ENGINE.NATIVE_WEBCODECS) {
            this._resetWebCodecsCaptureState();
        }
        return this.captureFps;
    }

    _notifyRecordingStateChange(isRecording) {
        if (typeof this.onRecordingStateChange !== 'function') return;
        try {
            this.onRecordingStateChange(!!isRecording);
        } catch (error) {
            this.logger?.warn?.('[MediaRecorderSystem] recording state callback failed', error);
        }
    }

    _resetWebCodecsCaptureState(initialLevelIndex = 1) {
        this._captureAccumulatorMs = 0;
        this._captureLastNowMs = 0;
        this._captureTimestampUs = 0;
        this._captureLevelIndex = Math.max(
            0,
            Math.min(CAPTURE_LOAD_LEVELS.length - 1, Math.trunc(toFiniteNumber(initialLevelIndex, 1)))
        );
        this._captureHighPressureFrames = 0;
        this._captureLowPressureFrames = 0;
        this._captureDroppedFrames = 0;
        this._captureEncodedFrames = 0;
        this._captureBackpressureEvents = 0;
        this._captureMaxEncodeQueueSize = 0;
        this._captureTimestampHistoryCount = 0;
        this._captureTimestampHistoryWriteIndex = 0;
        this._lastFrameIntervalStats = null;
        this._frameIntervalStatsDirty = false;
    }

    _getCaptureLevel() {
        return CAPTURE_LOAD_LEVELS[Math.max(0, Math.min(CAPTURE_LOAD_LEVELS.length - 1, this._captureLevelIndex))];
    }

    _resolveEffectiveCaptureFps() {
        const level = this._getCaptureLevel();
        return Math.max(1, this.captureFps * level.fpsScale);
    }

    _ensureCaptureSurface(scale = 1) {
        const resolutionScale = Math.max(0.2, Math.min(1, toFiniteNumber(scale, 1)));
        const sourceWidth = Math.max(2, Math.floor(toFiniteNumber(this.canvas?.width, 0)));
        const sourceHeight = Math.max(2, Math.floor(toFiniteNumber(this.canvas?.height, 0)));
        if (resolutionScale >= 0.999 || typeof document === 'undefined') {
            this._captureCanvas = null;
            this._captureCanvasCtx = null;
            this._captureCanvasWidth = sourceWidth;
            this._captureCanvasHeight = sourceHeight;
            return this.canvas;
        }

        const targetWidth = Math.max(2, Math.floor(sourceWidth * resolutionScale));
        const targetHeight = Math.max(2, Math.floor(sourceHeight * resolutionScale));
        if (!this._captureCanvas) {
            this._captureCanvas = document.createElement('canvas');
            this._captureCanvasCtx = this._captureCanvas.getContext('2d', { alpha: false });
        }
        if (!this._captureCanvas || !this._captureCanvasCtx) {
            return this.canvas;
        }
        if (this._captureCanvas.width !== targetWidth || this._captureCanvas.height !== targetHeight) {
            this._captureCanvas.width = targetWidth;
            this._captureCanvas.height = targetHeight;
        }
        this._captureCanvasWidth = targetWidth;
        this._captureCanvasHeight = targetHeight;
        this._captureCanvasCtx.imageSmoothingEnabled = true;
        this._captureCanvasCtx.clearRect(0, 0, targetWidth, targetHeight);
        this._captureCanvasCtx.drawImage(this.canvas, 0, 0, targetWidth, targetHeight);
        return this._captureCanvas;
    }

    _ensureMediaRecorderCaptureSurface(scale = 1) {
        if (typeof document === 'undefined') {
            return this.canvas;
        }
        const resolutionScale = Math.max(0.2, Math.min(1, toFiniteNumber(scale, 1)));
        const sourceWidth = Math.max(2, Math.floor(toFiniteNumber(this.canvas?.width, 0)));
        const sourceHeight = Math.max(2, Math.floor(toFiniteNumber(this.canvas?.height, 0)));
        if (!this._captureCanvas) {
            this._captureCanvas = document.createElement('canvas');
            this._captureCanvasCtx = this._captureCanvas.getContext('2d', { alpha: false });
        }
        if (!this._captureCanvas || !this._captureCanvasCtx) {
            return this.canvas;
        }

        const targetWidth = Math.max(2, Math.floor(sourceWidth * resolutionScale));
        const targetHeight = Math.max(2, Math.floor(sourceHeight * resolutionScale));
        if (this._captureCanvas.width !== targetWidth || this._captureCanvas.height !== targetHeight) {
            this._captureCanvas.width = targetWidth;
            this._captureCanvas.height = targetHeight;
        }

        this._captureCanvasWidth = targetWidth;
        this._captureCanvasHeight = targetHeight;
        this._captureCanvasCtx.imageSmoothingEnabled = true;
        this._captureCanvasCtx.clearRect(0, 0, targetWidth, targetHeight);
        this._captureCanvasCtx.drawImage(this.canvas, 0, 0, targetWidth, targetHeight);
        return this._captureCanvas;
    }

    _recordCaptureTimestampUs(timestampUs) {
        this._captureTimestampHistoryUs[this._captureTimestampHistoryWriteIndex] = timestampUs;
        this._captureTimestampHistoryWriteIndex = (this._captureTimestampHistoryWriteIndex + 1) % MAX_CAPTURE_TIMESTAMPS;
        this._captureTimestampHistoryCount = Math.min(MAX_CAPTURE_TIMESTAMPS, this._captureTimestampHistoryCount + 1);
        this._frameIntervalStatsDirty = true;
    }

    _resolveCaptureTimestampUs(sequenceIndex) {
        if (sequenceIndex < 0 || sequenceIndex >= this._captureTimestampHistoryCount) return null;
        const oldestIndex = (this._captureTimestampHistoryWriteIndex - this._captureTimestampHistoryCount + MAX_CAPTURE_TIMESTAMPS) % MAX_CAPTURE_TIMESTAMPS;
        const ringIndex = (oldestIndex + sequenceIndex) % MAX_CAPTURE_TIMESTAMPS;
        return this._captureTimestampHistoryUs[ringIndex];
    }

    _computeFrameIntervalStats() {
        if (this._captureTimestampHistoryCount < 2) {
            return null;
        }
        const intervals = [];
        for (let i = 1; i < this._captureTimestampHistoryCount; i++) {
            const previous = this._resolveCaptureTimestampUs(i - 1);
            const current = this._resolveCaptureTimestampUs(i);
            if (!Number.isFinite(previous) || !Number.isFinite(current)) continue;
            const deltaMs = (current - previous) / 1000;
            if (deltaMs > 0) {
                intervals.push(deltaMs);
            }
        }
        if (intervals.length === 0) {
            return null;
        }

        let sum = 0;
        let max = 0;
        for (let i = 0; i < intervals.length; i++) {
            const value = intervals[i];
            sum += value;
            if (value > max) max = value;
        }
        const sorted = intervals.slice().sort((a, b) => a - b);
        return {
            sampleCount: intervals.length,
            mean: sum / intervals.length,
            p95: computePercentile(sorted, 0.95),
            p99: computePercentile(sorted, 0.99),
            max,
        };
    }

    _getFrameIntervalStats(forceRecompute = false) {
        if (!forceRecompute && this._frameIntervalStatsDirty !== true) {
            return this._lastFrameIntervalStats;
        }
        this._lastFrameIntervalStats = this._computeFrameIntervalStats();
        this._frameIntervalStatsDirty = false;
        return this._lastFrameIntervalStats;
    }

    _updateCaptureLoadLevel(encodeQueueSize) {
        const safeQueueSize = Math.max(0, Math.trunc(toFiniteNumber(encodeQueueSize, 0)));
        this._captureMaxEncodeQueueSize = Math.max(this._captureMaxEncodeQueueSize, safeQueueSize);

        if (safeQueueSize >= ENCODE_QUEUE_DROP_LIMIT) {
            const nextLevel = Math.min(CAPTURE_LOAD_LEVELS.length - 1, this._captureLevelIndex + 2);
            if (nextLevel !== this._captureLevelIndex) {
                this._captureLevelIndex = nextLevel;
                this._captureBackpressureEvents += 1;
                this.logger?.warn?.('[MediaRecorderSystem] capture load level increased', {
                    level: this._captureLevelIndex,
                    encodeQueueSize: safeQueueSize,
                    immediate: true,
                });
            }
            this._captureHighPressureFrames = 0;
            this._captureLowPressureFrames = 0;
            return;
        }

        if (safeQueueSize >= ENCODE_QUEUE_SOFT_LIMIT) {
            this._captureHighPressureFrames += 1;
            this._captureLowPressureFrames = 0;
        } else if (safeQueueSize <= 1) {
            this._captureLowPressureFrames += 1;
            this._captureHighPressureFrames = Math.max(0, this._captureHighPressureFrames - 1);
        } else {
            this._captureHighPressureFrames = Math.max(0, this._captureHighPressureFrames - 1);
            this._captureLowPressureFrames = Math.max(0, this._captureLowPressureFrames - 1);
        }

        if (
            this._captureHighPressureFrames >= 2
            && this._captureLevelIndex < (CAPTURE_LOAD_LEVELS.length - 1)
        ) {
            this._captureLevelIndex += 1;
            this._captureHighPressureFrames = 0;
            this._captureBackpressureEvents += 1;
            this.logger?.warn?.('[MediaRecorderSystem] capture load level increased', {
                level: this._captureLevelIndex,
                encodeQueueSize: safeQueueSize,
            });
        } else if (this._captureLowPressureFrames >= 240 && this._captureLevelIndex > 0) {
            this._captureLevelIndex -= 1;
            this._captureLowPressureFrames = 0;
            this.logger?.info?.('[MediaRecorderSystem] capture load level recovered', {
                level: this._captureLevelIndex,
            });
        }
    }

    _resolveSyntheticQueueSizeFromRenderDelta(deltaMs) {
        const safeDeltaMs = Math.max(0, toFiniteNumber(deltaMs, 0));
        if (safeDeltaMs >= MEDIARECORDER_SYNTHETIC_QUEUE_HARD_MS) {
            return ENCODE_QUEUE_DROP_LIMIT;
        }
        if (safeDeltaMs >= (MEDIARECORDER_SYNTHETIC_QUEUE_SOFT_MS * 1.5)) {
            return ENCODE_QUEUE_SOFT_LIMIT + 2;
        }
        if (safeDeltaMs >= MEDIARECORDER_SYNTHETIC_QUEUE_SOFT_MS) {
            return ENCODE_QUEUE_SOFT_LIMIT;
        }
        return 0;
    }

    _dropCaptureBacklog(stepIntervalMs) {
        const safeStepIntervalMs = Math.max(1, toFiniteNumber(stepIntervalMs, 1000 / Math.max(1, this.captureFps)));
        const maxBacklogMs = safeStepIntervalMs * MAX_CAPTURE_BACKLOG_STEPS;
        if (!(this._captureAccumulatorMs > maxBacklogMs)) {
            return 0;
        }

        const retainedAccumulatorMs = safeStepIntervalMs;
        const overflowMs = Math.max(0, this._captureAccumulatorMs - retainedAccumulatorMs);
        const droppedFrames = Math.max(1, Math.floor(overflowMs / safeStepIntervalMs));
        this._captureAccumulatorMs = retainedAccumulatorMs;
        this._captureDroppedFrames += droppedFrames;
        return droppedFrames;
    }

    _captureWebCodecsFrame(stepIntervalMs) {
        if (!this._isRecording || !this._videoEncoder || this._videoEncoder.state !== 'configured') return;
        const VideoFrameCtor = this._globalScope?.VideoFrame;
        if (typeof VideoFrameCtor !== 'function') return;

        const encodeQueueSize = toPositiveInt(this._videoEncoder.encodeQueueSize, 0, 0, 10_000);
        this._updateCaptureLoadLevel(encodeQueueSize);
        this._captureTimestampUs += Math.max(1, Math.round(stepIntervalMs * 1000));

        if (encodeQueueSize >= ENCODE_QUEUE_DROP_LIMIT) {
            this._captureDroppedFrames += 1;
            return;
        }

        const level = this._getCaptureLevel();
        const frameSource = this._ensureCaptureSurface(level.resolutionScale);
        const encodeStart = this._perfNow();
        try {
            const frame = new VideoFrameCtor(frameSource, { timestamp: this._captureTimestampUs });
            const insertKeyFrame = (this._captureEncodedFrames % Math.max(1, Math.round(this.captureFps * 2))) === 0;
            this._videoEncoder.encode(frame, { keyFrame: insertKeyFrame });
            frame.close();
            this._frameCount += 1;
            this._captureEncodedFrames += 1;
            this._recordCaptureTimestampUs(this._captureTimestampUs);
        } catch {
            // Ignore transient frame capture errors (e.g. canvas resized)
        } finally {
            const durationMs = this._perfNow() - encodeStart;
            this.runtimePerfProfiler?.recordSubsystemDuration?.('recorder_encode', durationMs);
        }
    }

    _captureMediaRecorderFrame(stepIntervalMs) {
        if (!this._isRecording || this._activeRecorderEngine !== RECORDER_ENGINE.NATIVE_MEDIARECORDER) return;
        this._captureTimestampUs += Math.max(1, Math.round(stepIntervalMs * 1000));

        const encodeStart = this._perfNow();
        try {
            if (this._mediaRecorderUsesCaptureCanvas) {
                const level = this._getCaptureLevel();
                this._ensureMediaRecorderCaptureSurface(level.resolutionScale);
            }
            if (this._mediaRecorderSupportsRequestFrame && this._mediaRecorderVideoTrack?.requestFrame) {
                this._mediaRecorderVideoTrack.requestFrame();
            }
            this._frameCount += 1;
            this._captureEncodedFrames += 1;
            this._recordCaptureTimestampUs(this._captureTimestampUs);
        } catch {
            this._captureDroppedFrames += 1;
        } finally {
            const durationMs = this._perfNow() - encodeStart;
            this.runtimePerfProfiler?.recordSubsystemDuration?.('recorder_encode', durationMs);
        }
    }

    captureRenderedFrame(renderDelta = null) {
        if (!this._isRecording) return;
        if (
            this._activeRecorderEngine !== RECORDER_ENGINE.NATIVE_WEBCODECS
            && this._activeRecorderEngine !== RECORDER_ENGINE.NATIVE_MEDIARECORDER
        ) {
            return;
        }
        if (
            this._activeRecorderEngine === RECORDER_ENGINE.NATIVE_WEBCODECS
            && (!this._videoEncoder || this._videoEncoder.state !== 'configured')
        ) {
            return;
        }

        const now = this._perfNow();
        if (!(this._captureLastNowMs > 0)) {
            this._captureLastNowMs = now;
            return;
        }

        let deltaMs = now - this._captureLastNowMs;
        this._captureLastNowMs = now;
        if (!(deltaMs > 0)) {
            deltaMs = Math.max(1, Math.round(toFiniteNumber(renderDelta, 1 / 60) * 1000));
        }
        deltaMs = Math.min(250, deltaMs);

        this._captureAccumulatorMs += deltaMs;
        let syntheticQueueSize = 0;
        if (this._activeRecorderEngine === RECORDER_ENGINE.NATIVE_MEDIARECORDER) {
            syntheticQueueSize = this._resolveSyntheticQueueSizeFromRenderDelta(
                Math.max(deltaMs, this._captureAccumulatorMs)
            );
            this._updateCaptureLoadLevel(syntheticQueueSize);
        }

        const effectiveFps = this._resolveEffectiveCaptureFps();
        const stepIntervalMs = 1000 / effectiveFps;
        this._dropCaptureBacklog(stepIntervalMs);

        if (
            this._activeRecorderEngine === RECORDER_ENGINE.NATIVE_MEDIARECORDER
            && !this._mediaRecorderSupportsRequestFrame
            && syntheticQueueSize >= ENCODE_QUEUE_DROP_LIMIT
        ) {
            this._captureAccumulatorMs = Math.min(this._captureAccumulatorMs, stepIntervalMs);
            this._captureDroppedFrames += 1;
            return;
        }

        let captureSteps = 0;
        while (
            this._captureAccumulatorMs >= stepIntervalMs
            && captureSteps < MAX_CAPTURE_STEPS_PER_RENDER
        ) {
            this._captureAccumulatorMs -= stepIntervalMs;
            if (this._activeRecorderEngine === RECORDER_ENGINE.NATIVE_WEBCODECS) {
                this._captureWebCodecsFrame(stepIntervalMs);
            } else {
                this._captureMediaRecorderFrame(stepIntervalMs);
            }
            captureSteps += 1;
        }

        this._dropCaptureBacklog(stepIntervalMs);
    }

    getRecordingDiagnostics() {
        const level = this._getCaptureLevel();
        return {
            recording: this._isRecording,
            recorderEngine: this._activeRecorderEngine,
            captureFps: this.captureFps,
            effectiveCaptureFps: this._resolveEffectiveCaptureFps(),
            captureResolutionScale: level.resolutionScale,
            captureLevel: this._captureLevelIndex,
            requestFrameSupported: this._mediaRecorderSupportsRequestFrame,
            encodeQueueSoftLimit: ENCODE_QUEUE_SOFT_LIMIT,
            encodeQueueDropLimit: ENCODE_QUEUE_DROP_LIMIT,
            droppedFrames: this._captureDroppedFrames,
            encodedFrames: this._captureEncodedFrames,
            maxEncodeQueueSize: this._captureMaxEncodeQueueSize,
            backpressureEvents: this._captureBackpressureEvents,
            frameIntervalStats: this._getFrameIntervalStats()
                ? { ...this._lastFrameIntervalStats }
                : null,
        };
    }

    getLifecycleEvents() {
        return this._lifecycleEvents.slice();
    }

    getLastExportMeta() {
        if (!this._lastExport) return null;
        return {
            fileName: this._lastExport.fileName,
            downloadFileName: this._lastExport.downloadFileName,
            mimeType: this._lastExport.mimeType,
            sizeBytes: this._lastExport.sizeBytes,
            startedAt: this._lastExport.startedAt,
            endedAt: this._lastExport.endedAt,
            durationMs: this._lastExport.durationMs,
            trigger: this._lastExport.trigger,
            frameIntervalStats: this._lastExport.frameIntervalStats
                ? { ...this._lastExport.frameIntervalStats }
                : null,
            recorderDiagnostics: this._lastExport.recorderDiagnostics
                ? { ...this._lastExport.recorderDiagnostics }
                : null,
            timestampValidation: this._lastExport.timestampValidation
                ? { ...this._lastExport.timestampValidation }
                : null,
        };
    }

    notifyLifecycleEvent(type, context = null) {
        const eventType = String(type || '').trim();
        if (!eventType) return null;

        const event = {
            version: this.contractVersion,
            type: eventType,
            timestampMs: this.now(),
            context: context && typeof context === 'object' ? { ...context } : null,
        };
        this._lifecycleEvents.push(event);
        if (this._lifecycleEvents.length > 24) {
            this._lifecycleEvents.shift();
        }

        if (eventType === LIFECYCLE_EVENT_TYPES.MATCH_STARTED && this.autoRecordingEnabled) {
            this.startRecording(event);
            return event;
        }
        if (eventType === LIFECYCLE_EVENT_TYPES.MATCH_ENDED || eventType === LIFECYCLE_EVENT_TYPES.MENU_OPENED) {
            this.stopRecording(event).catch((error) => {
                this.logger?.warn?.('[MediaRecorderSystem] stop failed after lifecycle event', error);
            });
            return event;
        }
        if (eventType === LIFECYCLE_EVENT_TYPES.RECORDING_REQUESTED) {
            const command = String(context?.command || 'toggle').toLowerCase();
            if (command === 'start') {
                this.startRecording(event);
            } else if (command === 'stop') {
                this.stopRecording(event).catch((error) => {
                    this.logger?.warn?.('[MediaRecorderSystem] stop failed for recording request', error);
                });
            } else if (this.isRecording()) {
                this.stopRecording(event).catch((error) => {
                    this.logger?.warn?.('[MediaRecorderSystem] toggle-stop failed', error);
                });
            } else {
                this.startRecording(event);
            }
        }
        return event;
    }

    _buildStartResult(started, reason, extra = null) {
        const result = {
            action: 'start',
            ok: !!started,
            started: !!started,
            reason: String(reason || (started ? 'started' : 'unknown')),
        };
        if (extra && typeof extra === 'object') {
            Object.assign(result, extra);
        }
        return result;
    }

    _buildStopResult(stopped, reason, extra = null) {
        const result = {
            action: 'stop',
            ok: !!stopped,
            stopped: !!stopped,
            reason: String(reason || (stopped ? 'stopped' : 'unknown')),
        };
        if (extra && typeof extra === 'object') {
            Object.assign(result, extra);
        }
        return result;
    }

    _resolveRecordingDimensions(scale = 1) {
        const rawWidth = Number(this.canvas?.width || 0);
        const rawHeight = Number(this.canvas?.height || 0);
        const resolutionScale = Math.max(0.2, Math.min(1, toFiniteNumber(scale, 1)));
        const width = Math.max(2, Math.floor(rawWidth * resolutionScale));
        const height = Math.max(2, Math.floor(rawHeight * resolutionScale));
        return { width, height };
    }

    _buildWebCodecsEncoderConfig(width, height) {
        return {
            codec: WEB_CODECS_CODEC,
            width,
            height,
            hardwareAcceleration: 'prefer-hardware',
            bitrate: 8000000,
            framerate: this.captureFps,
            avc: { format: 'avc' },
        };
    }

    async _startWithWebCodecs(trigger, support) {
        const VideoEncoderCtor = this._globalScope?.VideoEncoder;
        const VideoFrameCtor = this._globalScope?.VideoFrame;
        if (typeof VideoEncoderCtor !== 'function') {
            return this._buildStartResult(false, 'missing-video-encoder', { support });
        }
        if (typeof VideoFrameCtor !== 'function') {
            return this._buildStartResult(false, 'missing-video-frame', { support });
        }

        const { width, height } = this._resolveRecordingDimensions();
        const encoderConfig = this._buildWebCodecsEncoderConfig(width, height);
        if (typeof VideoEncoderCtor.isConfigSupported === 'function') {
            try {
                const supportProbe = await VideoEncoderCtor.isConfigSupported(encoderConfig);
                if (!supportProbe?.supported) {
                    return this._buildStartResult(false, 'encoder_config_unsupported', { support });
                }
            } catch (error) {
                return this._buildStartResult(false, 'encoder_probe_failed', { error, support });
            }
        }

        try {
            this._muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width,
                    height,
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });

            this._videoEncoder = new VideoEncoderCtor({
                output: (chunk, meta) => this._muxer.addVideoChunk(chunk, meta),
                error: (e) => this.logger?.error?.('[MediaRecorderSystem] VideoEncoder error', e),
            });

            this._videoEncoder.configure(encoderConfig);
        } catch (error) {
            this._cleanupRuntimeRecorder();
            this.logger?.warn?.('[MediaRecorderSystem] WebCodecs setup failed', error);
            return this._buildStartResult(false, 'encoder_creation_failed', { error, support });
        }

        this._isRecording = true;
        this._activeRecorderEngine = RECORDER_ENGINE.NATIVE_WEBCODECS;
        this._activeMimeType = DEFAULT_MIME_TYPE;
        this._frameCount = 0;
        this._resetWebCodecsCaptureState(1);
        this._activeRecording = {
            startedAt: this.now(),
            trigger: trigger || null,
        };

        this._notifyRecordingStateChange(true);
        return this._buildStartResult(true, 'started', {
            mimeType: this._activeMimeType,
            timestampMs: this._activeRecording.startedAt,
            recorderEngine: this._activeRecorderEngine,
        });
    }

    async _startWithMediaRecorder(trigger, support, fallbackFromReason = null) {
        const MediaRecorderCtor = this._globalScope?.MediaRecorder;
        if (typeof MediaRecorderCtor !== 'function') {
            return this._buildStartResult(false, 'missing-media-recorder', { support });
        }
        if (!this.canvas || typeof this.canvas.captureStream !== 'function') {
            return this._buildStartResult(false, 'missing-capture-stream', { support });
        }

        // WebCodecs can report MP4 support while MediaRecorder still needs a WebM fallback.
        const preferredMediaRecorderMimeType = fallbackFromReason
            ? (support?.mediaRecorderMimeType || '')
            : (support?.mediaRecorderMimeType || support?.selectedMimeType || '');
        const selectedMimeType = resolveSafeMediaRecorderMimeType(
            this._globalScope,
            preferredMediaRecorderMimeType
        ) || DEFAULT_FALLBACK_MIME_TYPE;
        const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
        const stopStreamTracks = (stream) => {
            if (!stream || typeof stream.getTracks !== 'function') return;
            for (const track of stream.getTracks()) {
                try {
                    track.stop();
                } catch {
                    // Ignore track-stop cleanup errors.
                }
            }
        };
        try {
            this._mediaRecorderChunks = [];
            this._captureLevelIndex = Math.min(2, CAPTURE_LOAD_LEVELS.length - 1);
            const level = this._getCaptureLevel();
            const captureStreamSource = this._ensureMediaRecorderCaptureSurface(level.resolutionScale);
            const streamSourceCanvas = captureStreamSource && typeof captureStreamSource.captureStream === 'function'
                ? captureStreamSource
                : this.canvas;
            this._mediaRecorderUsesCaptureCanvas = streamSourceCanvas !== this.canvas;

            let captureStream = streamSourceCanvas.captureStream(0);
            let captureTrack = typeof captureStream?.getVideoTracks === 'function'
                ? captureStream.getVideoTracks()[0] || null
                : null;
            let supportsRequestFrame = !!(captureTrack && typeof captureTrack.requestFrame === 'function');

            if (!supportsRequestFrame) {
                stopStreamTracks(captureStream);
                captureStream = streamSourceCanvas.captureStream(this.captureFps);
                captureTrack = typeof captureStream?.getVideoTracks === 'function'
                    ? captureStream.getVideoTracks()[0] || null
                    : null;
            }

            this._mediaRecorderStream = captureStream;
            this._mediaRecorderVideoTrack = captureTrack;
            this._mediaRecorderSupportsRequestFrame = supportsRequestFrame;
            this._mediaRecorder = recorderOptions
                ? new MediaRecorderCtor(this._mediaRecorderStream, recorderOptions)
                : new MediaRecorderCtor(this._mediaRecorderStream);

            this._mediaRecorder.ondataavailable = (event) => {
                const chunk = event?.data;
                if (chunk && Number(chunk.size) > 0) {
                    this._mediaRecorderChunks.push(chunk);
                }
            };

            this._mediaRecorder.onerror = (event) => {
                this.logger?.error?.('[MediaRecorderSystem] MediaRecorder error', event?.error || event);
            };

            this._mediaRecorder.onstop = () => {
                const chunks = Array.isArray(this._mediaRecorderChunks) ? this._mediaRecorderChunks : [];
                const mimeType = selectedMimeType || chunks[0]?.type || DEFAULT_FALLBACK_MIME_TYPE;
                const blob = new Blob(chunks, { type: mimeType });
                this._finalizeBlobExport(blob, mimeType);
            };

            this._mediaRecorder.start(1000);
        } catch (error) {
            this._cleanupRuntimeRecorder();
            this.logger?.warn?.('[MediaRecorderSystem] MediaRecorder setup failed', error);
            return this._buildStartResult(false, 'mediarecorder_creation_failed', {
                error,
                support,
                fallbackFromReason: fallbackFromReason || undefined,
            });
        }

        this._isRecording = true;
        this._activeRecorderEngine = RECORDER_ENGINE.NATIVE_MEDIARECORDER;
        this._activeMimeType = selectedMimeType || DEFAULT_FALLBACK_MIME_TYPE;
        this._frameCount = 0;
        this._resetWebCodecsCaptureState(Math.min(2, CAPTURE_LOAD_LEVELS.length - 1));
        this._activeRecording = {
            startedAt: this.now(),
            trigger: trigger || null,
        };
        this._notifyRecordingStateChange(true);

        return this._buildStartResult(true, 'started', {
            mimeType: this._activeMimeType,
            timestampMs: this._activeRecording.startedAt,
            recorderEngine: this._activeRecorderEngine,
            fallbackFromReason: fallbackFromReason || undefined,
        });
    }

    async startRecording(trigger = null) {
        if (this._pendingStop) {
            return this._buildStartResult(false, 'stop_pending');
        }

        if (this.isRecording()) {
            return this._buildStartResult(false, 'already_recording');
        }

        const support = this.getSupportState();
        if (!support.canRecord) {
            this.logger?.warn?.('[MediaRecorderSystem] recording unsupported on this runtime', support);
            return this._buildStartResult(false, 'unsupported', { support });
        }

        if (support.recorderEngine === RECORDER_ENGINE.NATIVE_WEBCODECS) {
            const webCodecsResult = await this._startWithWebCodecs(trigger, support);
            if (webCodecsResult.started) {
                return webCodecsResult;
            }

            if (support.hasMediaRecorder) {
                this.logger?.warn?.('[MediaRecorderSystem] WebCodecs start failed, falling back to MediaRecorder', webCodecsResult);
                return this._startWithMediaRecorder(trigger, support, webCodecsResult.reason);
            }
            return webCodecsResult;
        }

        if (support.recorderEngine === RECORDER_ENGINE.NATIVE_MEDIARECORDER) {
            return this._startWithMediaRecorder(trigger, support);
        }

        this.logger?.warn?.('[MediaRecorderSystem] no recorder engine available', support);
        return this._buildStartResult(false, 'unsupported_engine', { support });
    }

    async stopRecording(trigger = null) {
        if (this._pendingStop) {
            return this._pendingStop;
        }

        if (!this._isRecording) {
            return this._buildStopResult(false, 'not_recording');
        }

        this._isRecording = false;

        this._pendingStop = new Promise((resolve) => {
            this._activeRecording = {
                ...(this._activeRecording || {}),
                stopTrigger: trigger || null,
                stopResolve: resolve,
            };
        });

        try {
            if (this._activeRecorderEngine === RECORDER_ENGINE.NATIVE_MEDIARECORDER) {
                if (!this._mediaRecorder || this._mediaRecorder.state === 'inactive') {
                    const result = this._buildStopResult(false, 'mediarecorder_inactive');
                    const resolve = this._activeRecording?.stopResolve;
                    this._cleanupRuntimeRecorder();
                    this._pendingStop = null;
                    if (typeof resolve === 'function') {
                        resolve(result);
                    }
                    return result;
                }
                this._mediaRecorder.stop();
                return this._pendingStop;
            }

            if (this._videoEncoder) {
                await this._videoEncoder.flush();
                this._videoEncoder.close();
            }
            if (this._muxer) {
                this._muxer.finalize();
                this._handleRecorderStop();
            } else {
                const result = this._buildStopResult(false, 'muxer_null');
                const resolve = this._activeRecording?.stopResolve;
                this._cleanupRuntimeRecorder();
                this._pendingStop = null;
                if (typeof resolve === 'function') {
                    resolve(result);
                }
                return result;
            }
        } catch (error) {
            const resolve = this._activeRecording?.stopResolve;
            const result = this._buildStopResult(false, 'stop_failed', { error });
            this._cleanupRuntimeRecorder();
            this._pendingStop = null;
            if (typeof resolve === 'function') {
                resolve(result);
            }
            return result;
        }

        return this._pendingStop;
    }

    _buildFilename(activeRecording, endedAtMs, mimeType) {
        const startedAt = activeRecording?.startedAt || endedAtMs;
        const mode = sanitizeFileToken(activeRecording?.trigger?.context?.activeGameMode, 'classic');
        const matchId = sanitizeFileToken(activeRecording?.trigger?.context?.sessionId, 'session');
        const normalizedMimeType = String(mimeType || '').toLowerCase();
        const ext = normalizedMimeType.includes('webm')
            ? 'webm'
            : (normalizedMimeType.includes('mp4') ? 'mp4' : 'video');
        return `${this.filePrefix}-${mode}-${matchId}-${toSafeDatePart(startedAt)}-${toSafeDatePart(endedAtMs)}.${ext}`;
    }

    _buildDownloadFileName(fileName) {
        const baseName = String(fileName || '').trim();
        if (!baseName) return baseName;
        if (!this.downloadDirectoryName) return baseName;
        return `${this.downloadDirectoryName}/${baseName}`;
    }

    _estimateCapturedDurationMs(frameIntervalStats = null) {
        const sampleCount = Math.max(0, Math.trunc(toFiniteNumber(frameIntervalStats?.sampleCount, 0)));
        const meanMs = Math.max(0, toFiniteNumber(frameIntervalStats?.mean, 0));
        if (sampleCount > 0 && meanMs > 0) {
            return sampleCount * meanMs;
        }
        return Math.max(0, Math.round(this._captureTimestampUs / 1000));
    }

    _normalizeExportTiming(activeRecording, endedAtMs, frameIntervalStats = null) {
        const rawEndedAt = toFiniteNumber(endedAtMs, this.now());
        const estimatedDurationMs = this._estimateCapturedDurationMs(frameIntervalStats);
        let startedAt = toFiniteNumber(activeRecording?.startedAt, rawEndedAt);
        let endedAt = rawEndedAt;
        let adjusted = false;

        if (!(startedAt > 0)) {
            startedAt = Math.max(0, rawEndedAt - estimatedDurationMs);
            adjusted = true;
        }
        if (!(endedAt >= startedAt)) {
            endedAt = startedAt + Math.max(1, estimatedDurationMs);
            adjusted = true;
        }

        return {
            startedAt,
            endedAt,
            durationMs: Math.max(0, endedAt - startedAt),
            adjusted,
            estimatedDurationMs,
        };
    }

    _attemptAutoDownload(blob, fileName, mimeType) {
        if (!this.autoDownload || !blob || blob.size <= 0) {
            return { requested: false, transport: 'disabled' };
        }

        const safeFileName = String(fileName || '').trim();
        const browserFileName = safeFileName.split('/').filter(Boolean).pop() || safeFileName;
        const downloadViaBrowser = (reason, error = null) => {
            if (error) {
                this.logger?.warn?.(`[MediaRecorderSystem] recording export fallback (${reason})`, error);
            }
            try {
                this.downloadHandler({
                    blob,
                    fileName: browserFileName,
                    mimeType,
                });
                return true;
            } catch (downloadError) {
                this.logger?.warn?.('[MediaRecorderSystem] recording export browser download failed', downloadError);
                return false;
            }
        };

        if (typeof fetch !== 'function') {
            downloadViaBrowser('fetch-unavailable');
            return { requested: true, transport: 'download' };
        }

        try {
            fetch('/api/editor/save-video-disk', {
                method: 'POST',
                headers: { 'x-file-name': safeFileName },
                body: blob
            }).then((response) => {
                if (!response.ok) throw new Error(`http_${response.status}`);
                this.logger?.info?.('[MediaRecorderSystem] recording export saved via api', safeFileName);
            }).catch((error) => {
                this.logger?.warn?.('[MediaRecorderSystem] recording export api failed, using browser download', error);
                downloadViaBrowser('api-failed', error);
            });
            return { requested: true, transport: 'api-with-download-fallback' };
        } catch (error) {
            downloadViaBrowser('api-throw', error);
            return { requested: true, transport: 'download' };
        }
    }

    _finalizeBlobExport(blob, mimeType = DEFAULT_MIME_TYPE) {
        const activeRecording = this._activeRecording || null;
        const safeBlob = blob instanceof Blob ? blob : new Blob([], { type: String(mimeType || DEFAULT_MIME_TYPE) });
        const resolvedMimeType = String(mimeType || safeBlob.type || this._activeMimeType || DEFAULT_MIME_TYPE);
        const frameIntervalStats = this._getFrameIntervalStats(true) || this._lastFrameIntervalStats;
        const timing = this._normalizeExportTiming(activeRecording, this.now(), frameIntervalStats);
        const fileName = this._buildFilename(
            activeRecording
                ? { ...activeRecording, startedAt: timing.startedAt }
                : { startedAt: timing.startedAt },
            timing.endedAt,
            resolvedMimeType
        );
        const downloadFileName = this._buildDownloadFileName(fileName);
        const recorderDiagnostics = this.getRecordingDiagnostics();

        if (this._lastExport?.objectUrl) {
            URL.revokeObjectURL(this._lastExport.objectUrl);
        }
        const objectUrl = safeBlob.size > 0 ? URL.createObjectURL(safeBlob) : null;
        this._lastExport = {
            blob: safeBlob,
            objectUrl,
            fileName,
            downloadFileName,
            mimeType: resolvedMimeType,
            sizeBytes: safeBlob.size,
            startedAt: timing.startedAt,
            endedAt: timing.endedAt,
            durationMs: timing.durationMs,
            trigger: activeRecording?.stopTrigger || activeRecording?.trigger || null,
            frameIntervalStats: frameIntervalStats
                ? { ...frameIntervalStats }
                : null,
            recorderDiagnostics: recorderDiagnostics
                ? { ...recorderDiagnostics }
                : null,
            timestampValidation: {
                adjusted: timing.adjusted,
                estimatedDurationMs: timing.estimatedDurationMs,
            },
        };

        const exportTransport = this._attemptAutoDownload(safeBlob, downloadFileName || fileName, resolvedMimeType);

        const resolve = activeRecording?.stopResolve;
        this._cleanupRuntimeRecorder();
        const result = this._buildStopResult(true, 'stopped', {
            fileName,
            downloadFileName,
            mimeType: resolvedMimeType,
            sizeBytes: safeBlob.size,
            exportTransport: exportTransport.transport,
            startedAt: timing.startedAt,
            endedAt: timing.endedAt,
            durationMs: timing.durationMs,
            frameIntervalStats: frameIntervalStats
                ? { ...frameIntervalStats }
                : null,
            recorderDiagnostics: recorderDiagnostics
                ? { ...recorderDiagnostics }
                : null,
            timestampValidation: {
                adjusted: timing.adjusted,
                estimatedDurationMs: timing.estimatedDurationMs,
            },
        });
        if (typeof resolve === 'function') {
            resolve(result);
        }
        this._pendingStop = null;
    }

    _handleRecorderStop() {
        const buffer = this._muxer?.target?.buffer;
        const blob = new Blob([buffer || new ArrayBuffer(0)], { type: DEFAULT_MIME_TYPE });
        this._finalizeBlobExport(blob, DEFAULT_MIME_TYPE);
    }

    _cleanupRuntimeRecorder() {
        this._isRecording = false;
        if (this._mediaRecorderStream && typeof this._mediaRecorderStream.getTracks === 'function') {
            for (const track of this._mediaRecorderStream.getTracks()) {
                try {
                    track.stop();
                } catch {
                    // Ignore track-stop cleanup errors.
                }
            }
        }
        this._muxer = null;
        this._videoEncoder = null;
        this._mediaRecorder = null;
        this._mediaRecorderChunks = null;
        this._mediaRecorderStream = null;
        this._mediaRecorderVideoTrack = null;
        this._mediaRecorderSupportsRequestFrame = false;
        this._mediaRecorderUsesCaptureCanvas = false;
        this._activeRecording = null;
        this._frameCount = 0;
        this._captureCanvas = null;
        this._captureCanvasCtx = null;
        this._captureCanvasWidth = 0;
        this._captureCanvasHeight = 0;
        this._resetWebCodecsCaptureState();
        this._activeMimeType = DEFAULT_MIME_TYPE;
        this._activeRecorderEngine = RECORDER_ENGINE.NONE;
        this._notifyRecordingStateChange(false);
    }

    dispose() {
        if (this._lastExport?.objectUrl) {
            URL.revokeObjectURL(this._lastExport.objectUrl);
        }
        this._lastExport = null;
        this._lifecycleEvents.length = 0;
        this._cleanupRuntimeRecorder();
        this._pendingStop = null;
    }
}
