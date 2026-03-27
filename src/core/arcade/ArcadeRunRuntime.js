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
    applyComboAction,
    buildArcadeRunSummary,
    mergeArcadeRunRecords,
} from '../../state/arcade/ArcadeScoreOps.js';
import { MAP_PRESET_CATALOG } from '../config/maps/MapPresetCatalog.js';
import {
    resolveMapSequence,
    getMapKeyForSector,
    needsMapTransition,
} from '../../state/arcade/ArcadeMapProgression.js';
import {
    calculateSectorXp,
    loadVehicleProfiles,
    saveVehicleProfiles,
    getOrCreateProfile,
    addXp,
    getMasteryPerks,
} from '../../state/arcade/ArcadeVehicleProfile.js';
import {
    assignSectorMissions,
    createSectorMissionState,
    updateSectorMissionState,
} from '../../state/arcade/ArcadeMissionState.js';

const ARCADE_PROFILE_STORAGE_KEY = 'cuviosclash.arcade-run-profile.v1';

import { toSafeNumber, computeDailySeed } from '../../shared/utils/ArcadeUtils.js';

function resolveLogger(logger) {
    if (logger && typeof logger.log === 'function') return logger;
    return console;
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
        this._vehicleProfiles = null;
        this._activeVehicleId = null;
        this._missionState = null;
        this._onMapTransition = null;
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

    setMapTransitionHandler(handler) {
        this._onMapTransition = typeof handler === 'function' ? handler : null;
    }

    setActiveVehicle(vehicleId) {
        this._activeVehicleId = String(vehicleId || 'ship1');
    }

    getVehicleProfile() {
        if (!this._vehicleProfiles || !this._activeVehicleId) return null;
        return getOrCreateProfile(this._vehicleProfiles, this._activeVehicleId);
    }

    getMissionState() {
        return this._missionState ? { ...this._missionState } : null;
    }

    updateMissions(event) {
        if (!this._missionState) return;
        this._missionState = updateSectorMissionState(this._missionState, event);
        if (this._state) {
            this._state.missions = this._missionState;
        }
    }

    /**
     * Apply an in-game action event: updates missions and increments combo.
     * Supported event types: 'kill', 'collect', 'clean_dodge'.
     * 61.2.1 + 61.2.3 + 61.3.5
     */
    applyGameplayEvent(event) {
        if (!this._enabled || !this._state) return null;
        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));
        const eventWithTime = { ...event, nowMs };

        // Update missions first so allCompleted flag reflects current action
        const wasAllCompleted = this._missionState?.allCompleted === true;
        this.updateMissions(eventWithTime);

        // 61.2.3: Freeze combo 3s on mission-all-complete (first time only)
        // 61.3.5: Also award score boost when all sector missions completed
        const justCompleted = !wasAllCompleted && this._missionState?.allCompleted === true;
        if (justCompleted && this._state.score) {
            const MISSION_ALL_COMPLETE_BONUS = 500;
            const multiplier = Math.max(1, toSafeNumber(this._state.score?.multiplier, 1));
            const bonus = Math.round(MISSION_ALL_COMPLETE_BONUS * multiplier);
            this._state = {
                ...this._state,
                comboFreezeUntilMs: nowMs + 3000,
                score: {
                    ...this._state.score,
                    total: Math.max(0, toSafeNumber(this._state.score.total, 0) + bonus),
                    lastMissionBonus: bonus,
                },
            };
        }

        // Apply combo increment (skip if frozen)
        const frozenUntil = toSafeNumber(this._state.comboFreezeUntilMs, 0);
        if (frozenUntil <= 0 || nowMs > frozenUntil) {
            const newScore = applyComboAction(this._state.score, eventWithTime, this._state.config);
            if (newScore !== this._state.score) {
                this._state = { ...this._state, score: newScore };
            }
        }

        return this.getStateSnapshot();
    }

    startRun(options = {}) {
        if (!this._enabled) return null;
        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));
        const runId = this._nextRunId(nowMs);
        // 61.10.1: Allow options.seed to override config seed (e.g., for daily challenge)
        const runConfig = options.seed != null
            ? { ...this._config, seed: toSafeNumber(options.seed, this._config.seed) }
            : this._config;
        this._state = createArcadeRunState({
            config: runConfig,
            records: this._records,
            nowMs,
            runId,
        });
        if (options.dailyChallenge) {
            this._state.isDailyChallenge = true;
        }

        // Load vehicle profiles
        const store = this.settingsManager?.store;
        this._vehicleProfiles = loadVehicleProfiles(store);

        // Resolve map sequence from encounter plan if available
        if (options.encounterPlan) {
            const mapSequence = resolveMapSequence(options.encounterPlan, this._config.seed, MAP_PRESET_CATALOG);
            this._state.mapSequence = mapSequence;
            if (mapSequence.length > 0) {
                this._state.currentMapKey = mapSequence[0];
            }
            // Store encounter sequence for dynamic sector scoring (V61.1)
            if (Array.isArray(options.encounterPlan.sequence)) {
                this._state.encounterSequence = options.encounterPlan.sequence;
            }
        }

        this._state = beginArcadeSector(this._state, nowMs);

        // Assign initial missions
        this._assignMissionsForCurrentSector();

        this._startReplayRecording(options);
        return this.getStateSnapshot();
    }

    /**
     * Start a Daily Challenge run using today's UTC date as the seed.
     * All players on the same calendar day get the same sector sequence. (61.10.1)
     */
    startDailyChallenge(options = {}) {
        const seed = computeDailySeed(options.date || null);
        return this.startRun({ ...options, dailyChallenge: true, seed });
    }

    beginNextSector() {
        if (!this._enabled || !this._state) return null;
        const phase = String(this._state.phase || '');
        if (phase !== ARCADE_RUN_PHASES.INTERMISSION && phase !== ARCADE_RUN_PHASES.WARMUP) {
            return this.getStateSnapshot();
        }
        const nowMs = Math.max(0, toSafeNumber(this.now(), Date.now()));

        // Check if map transition is needed
        const prevMapKey = this._state.currentMapKey;
        const nextSectorIdx = this._state.completedSectors;
        if (needsMapTransition(this._state.mapSequence, nextSectorIdx - 1)) {
            const nextMapKey = getMapKeyForSector(this._state.mapSequence, nextSectorIdx);
            this._state.currentMapKey = nextMapKey;

            if (this._onMapTransition && prevMapKey !== nextMapKey) {
                try {
                    this._onMapTransition({
                        fromMap: prevMapKey,
                        toMap: nextMapKey,
                        sectorIndex: nextSectorIdx,
                    });
                } catch (err) {
                    this.logger?.warn?.('[ArcadeRunRuntime] Map transition handler error:', err);
                }
            }
        }

        this._state = beginArcadeSector(this._state, nowMs);

        // Assign new missions for the sector
        this._assignMissionsForCurrentSector();

        return this.getStateSnapshot();
    }

    _assignMissionsForCurrentSector() {
        if (!this._state) return;
        const sectorIdx = Math.max(0, this._state.sectorIndex - 1);
        const planEntry = this._state.mapSequence?.length > 0 ? { id: 'sector' } : null;
        const mapKey = this._state.currentMapKey || 'standard';
        const missions = assignSectorMissions(
            planEntry,
            null,
            `${this._config.seed}-${this._state.runId}`,
            sectorIdx
        );
        this._missionState = createSectorMissionState(missions);
        this._state.missions = this._missionState;
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

        // Apply XP from sector
        this._applySectorXpReward(payload);

        const payloadState = String(payload.state || '').trim().toUpperCase();
        if (payloadState === 'MATCH_END' || this._state.phase === ARCADE_RUN_PHASES.FINISHED) {
            this._finalizeRun(nowMs);
        }
        return this.getStateSnapshot();
    }

    _applySectorXpReward(telemetryPayload) {
        if (!this._activeVehicleId || !this._vehicleProfiles) return;
        const store = this.settingsManager?.store;

        const missionsCompleted = this._missionState?.completedCount || 0;
        const totalMissions = this._missionState?.missions?.length || 0;
        const telemetry = {
            kills: toSafeNumber(telemetryPayload?.kills, 0),
            multiplier: toSafeNumber(this._state?.score?.multiplier, 1),
            missionsCompleted,
            totalMissions,
            cleanSector: telemetryPayload?.cleanSector === true,
        };

        let profile = getOrCreateProfile(this._vehicleProfiles, this._activeVehicleId);
        // 61.8.2: Apply mastery XP perk before awarding XP
        const perks = getMasteryPerks(profile.level);
        const baseXp = calculateSectorXp(telemetry);
        const xpEarned = baseXp <= 0 ? 0 : Math.round(baseXp * (1 + perks.xpBonusPct / 100));
        if (xpEarned <= 0) return;

        const result = addXp(profile, xpEarned);
        profile = result.profile;
        this._vehicleProfiles[this._activeVehicleId] = profile;
        saveVehicleProfiles(store, this._vehicleProfiles);

        // Attach XP info to state for UI consumption
        if (this._state) {
            this._state.lastSectorXp = {
                earned: xpEarned,
                leveledUp: result.leveledUp,
                newLevel: result.newLevel,
                unlocksGained: result.unlocksGained,
            };
        }
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
