import {
    ARCADE_RUN_PHASES,
    beginArcadeSector,
    cloneArcadeRunState,
    completeArcadeSector,
    createArcadeRunConfig,
    createArcadeRunRecords,
    createArcadeRunState,
} from '../../state/arcade/ArcadeRunState.js';
import {
    applyArcadeSectorScore,
    buildArcadeRunSummary,
    mergeArcadeRunRecords,
} from '../../state/arcade/ArcadeScoreOps.js';

const ARCADE_PROFILE_STORAGE_KEY = 'cuviosclash.arcade-run-profile.v1';

function resolveLogger(logger) {
    if (logger && typeof logger.log === 'function') return logger;
    return console;
}

function toSafeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
}

export class ArcadeRunRuntime {
    constructor(options = {}) {
        this.settingsManager = options.settingsManager || null;
        this.replayRecorder = options.replayRecorder || null;
        this.now = typeof options.now === 'function' ? options.now : () => Date.now();
        this.logger = resolveLogger(options.logger);
        this._runSequence = 0;
        this._config = createArcadeRunConfig();
        this._records = createArcadeRunRecords();
        this._state = null;
        this._enabled = false;
    }

    _nextRunId(nowMs = Date.now()) {
        this._runSequence += 1;
        return `arcade-run-${Math.floor(Math.max(0, nowMs)).toString(36)}-${this._runSequence}`;
    }

    _readRecordsFromStorage() {
        const store = this.settingsManager?.store;
        if (!store || typeof store.loadJsonRecord !== 'function') {
            return createArcadeRunRecords(this._records);
        }
        const storedValue = store.loadJsonRecord(ARCADE_PROFILE_STORAGE_KEY, null);
        return createArcadeRunRecords(storedValue);
    }

    _writeRecordsToStorage(records) {
        const store = this.settingsManager?.store;
        if (!store || typeof store.saveJsonRecord !== 'function') return false;
        return store.saveJsonRecord(ARCADE_PROFILE_STORAGE_KEY, createArcadeRunRecords(records));
    }

    configure(runtimeConfig = null) {
        const nextConfig = createArcadeRunConfig(runtimeConfig?.arcade || null);
        this._config = nextConfig;
        this._enabled = nextConfig.enabled === true;
        this._records = this._readRecordsFromStorage();
        if (!this._enabled) {
            this.resetRunState({ preserveRecords: true });
        }
        return cloneArcadeRunState(this._state);
    }

    isEnabled() {
        return this._enabled;
    }

    getStateSnapshot() {
        return cloneArcadeRunState(this._state);
    }

    getRecordsSnapshot() {
        return createArcadeRunRecords(this._records);
    }

    _startReplayRecording({ entityManager = null, roundStateController = null, playerCount = 1 } = {}) {
        const recorder = this.replayRecorder;
        if (!this._config.replayHooksEnabled || !recorder || typeof recorder.startRecording !== 'function') {
            return;
        }
        try {
            recorder.startRecording(entityManager, roundStateController, playerCount);
        } catch (error) {
            this.logger?.warn?.('[ArcadeRunRuntime] Replay recording start failed:', error);
        }
    }

    _stopReplayRecording() {
        const recorder = this.replayRecorder;
        if (!recorder) return null;
        try {
            if (typeof recorder.stopRecording === 'function' && recorder.isRecording) {
                return recorder.stopRecording();
            }
            if (typeof recorder.getReplay === 'function') {
                return recorder.getReplay();
            }
        } catch (error) {
            this.logger?.warn?.('[ArcadeRunRuntime] Replay recording stop failed:', error);
        }
        return null;
    }

    startRun(options = {}) {
        if (!this._enabled) return null;
        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));
        const runId = this._nextRunId(nowMs);
        this._state = createArcadeRunState({
            config: this._config,
            records: this._records,
            nowMs,
            runId,
        });
        this._state = beginArcadeSector(this._state, nowMs);
        this._startReplayRecording(options);
        return this.getStateSnapshot();
    }

    beginNextSector() {
        if (!this._enabled || !this._state) return null;
        const phase = String(this._state.phase || '');
        if (phase !== ARCADE_RUN_PHASES.INTERMISSION && phase !== ARCADE_RUN_PHASES.WARMUP) {
            return this.getStateSnapshot();
        }
        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));
        this._state = beginArcadeSector(this._state, nowMs);
        return this.getStateSnapshot();
    }

    deriveRoundEndPlan({ players, inputs = {}, baseController } = {}) {
        if (!this._enabled || !this._state || !baseController) {
            return baseController?.deriveOnRoundEndPlan?.(players, inputs) || null;
        }

        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));
        this._state = completeArcadeSector(this._state, nowMs);
        const finished = this._state.phase === ARCADE_RUN_PHASES.FINISHED;
        const scoreTotal = Math.max(0, toSafeNumber(this._state?.score?.total, 0));
        const combo = Math.max(0, Math.floor(toSafeNumber(this._state?.score?.combo, 0)));
        const multiplier = Math.max(1, toSafeNumber(this._state?.score?.multiplier, 1));
        const sectorLabel = `${this._state.completedSectors}/${this._state.config.sectorCount}`;
        const messageText = finished
            ? `Arcade Run beendet - Score ${Math.round(scoreTotal)}`
            : `Sektor ${sectorLabel} abgeschlossen`;
        const messageSub = finished
            ? 'ENTER fuer neuen Run oder ESC fuer Menue'
            : `Intermission: Combo ${combo} / x${multiplier}`;

        return {
            outcome: {
                state: finished ? 'MATCH_END' : 'ROUND_END',
                canWinMatch: true,
                requiredWins: Math.max(1, Number(inputs?.winsNeeded) || 1),
                matchWinner: null,
                messageText,
                messageSub,
                arcade: {
                    phase: this._state.phase,
                    sectorIndex: this._state.sectorIndex,
                    completedSectors: this._state.completedSectors,
                    score: scoreTotal,
                },
            },
            transition: {
                roundPause: Number(baseController.defaultRoundPause) || 3,
                nextState: finished ? 'MATCH_END' : 'ROUND_END',
                overlayMessageText: messageText,
                overlayMessageSub: messageSub,
            },
        };
    }

    handleRoundEndTelemetry(payload = null) {
        if (!this._enabled || !this._state || !payload || typeof payload !== 'object') {
            return this.getStateSnapshot();
        }

        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));
        this._state = applyArcadeSectorScore(this._state, payload, { nowMs });
        const payloadState = String(payload.state || '').trim().toUpperCase();
        if (payloadState === 'MATCH_END' || this._state.phase === ARCADE_RUN_PHASES.FINISHED) {
            this._finalizeRun(nowMs);
        }
        return this.getStateSnapshot();
    }

    _finalizeRun(nowMs = Date.now()) {
        if (!this._state) return null;
        if (this._state.persistedAtIso) {
            return this.getStateSnapshot();
        }

        const replaySnapshot = this._stopReplayRecording();
        const replayId = typeof replaySnapshot?.matchId === 'string' ? replaySnapshot.matchId : '';
        const summary = buildArcadeRunSummary(this._state, {
            endedAtMs: nowMs,
            replayId,
        });
        if (!summary) return this.getStateSnapshot();

        this._records = mergeArcadeRunRecords(this._records, summary);
        this._writeRecordsToStorage(this._records);
        this._state = {
            ...this._state,
            phase: ARCADE_RUN_PHASES.FINISHED,
            finishedAtIso: summary.finishedAtIso,
            persistedAtIso: summary.finishedAtIso,
            updatedAtIso: summary.finishedAtIso,
            records: createArcadeRunRecords(this._records),
            replay: {
                runReplayId: replayId,
            },
        };
        return this.getStateSnapshot();
    }

    resetRunState(options = {}) {
        const preserveRecords = options?.preserveRecords === true;
        const replayRecorder = this.replayRecorder;
        if (replayRecorder?.isRecording && typeof replayRecorder.stopRecording === 'function') {
            try {
                const stopResult = replayRecorder.stopRecording();
                if (isPromiseLike(stopResult)) {
                    stopResult.catch(() => { /* no-op */ });
                }
            } catch {
                // no-op
            }
        }
        this._state = null;
        if (!preserveRecords) {
            this._records = this._readRecordsFromStorage();
        }
        return this.getStateSnapshot();
    }
}
