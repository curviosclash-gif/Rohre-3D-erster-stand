import {
    buildRouteFromParcours,
    createPlayerProgressState,
    formatDurationMs,
    isObject,
    normalizeString,
    nowMs,
} from './ParcoursProgressUtils.js';

export class ParcoursProgressSystem {
    constructor(entityManager, options = {}) {
        this.entityManager = entityManager || null;
        this.nowProvider = typeof options.nowProvider === 'function' ? options.nowProvider : nowMs;
        this._route = null;
        this._playerStates = new Map();
        this._completionOrder = [];
    }

    isEnabled() {
        return !!this._route;
    }

    reset() {
        this._route = null;
        this._playerStates.clear();
        this._completionOrder.length = 0;
    }

    startRound(players = []) {
        this._route = buildRouteFromParcours(this.entityManager?.arena?.currentMapDefinition?.parcours);
        this._playerStates.clear();
        this._completionOrder.length = 0;
        if (!this._route) return;

        if (!Array.isArray(players)) return;
        for (const player of players) {
            if (!player || !Number.isInteger(player.index)) continue;
            this._playerStates.set(player.index, createPlayerProgressState(this._route.totalCheckpoints));
        }
    }

    _ensurePlayerState(playerIndex) {
        if (!this._route || !Number.isInteger(playerIndex)) return null;
        if (!this._playerStates.has(playerIndex)) {
            this._playerStates.set(playerIndex, createPlayerProgressState(this._route.totalCheckpoints));
        }
        return this._playerStates.get(playerIndex);
    }

    _setCheckpointCooldown(state, checkpointId, now) {
        if (!state || !checkpointId) return;
        state.cooldownByCheckpointId.set(checkpointId, now);
    }

    _isCheckpointOnCooldown(state, checkpointId, cooldownMs, now) {
        if (!state || !checkpointId || !(cooldownMs > 0)) return false;
        const lastTriggerAt = state.cooldownByCheckpointId.get(checkpointId);
        if (!Number.isFinite(lastTriggerAt)) return false;
        return (now - lastTriggerAt) < cooldownMs;
    }

    _isCheckpointTriggered(entry, player, previousPosition, now, state) {
        if (!entry || !player?.position || !previousPosition) return false;
        if (this._isCheckpointOnCooldown(state, entry.id, entry.cooldownMs, now)) return false;

        const px = Number(player.position.x) || 0;
        const py = Number(player.position.y) || 0;
        const pz = Number(player.position.z) || 0;
        const radius = Math.max(0.05, Number(player.hitboxRadius) || 0.8);
        const checkRadius = entry.radius + radius;
        const dx = px - entry.pos[0];
        const dy = py - entry.pos[1];
        const dz = pz - entry.pos[2];
        if ((dx * dx) + (dy * dy) + (dz * dz) > checkRadius * checkRadius) {
            return false;
        }

        if (!entry.forward) return true;

        const prevDx = (Number(previousPosition.x) || 0) - entry.pos[0];
        const prevDy = (Number(previousPosition.y) || 0) - entry.pos[1];
        const prevDz = (Number(previousPosition.z) || 0) - entry.pos[2];
        const dotPrev = (prevDx * entry.forward[0]) + (prevDy * entry.forward[1]) + (prevDz * entry.forward[2]);
        const dotCurr = (dx * entry.forward[0]) + (dy * entry.forward[1]) + (dz * entry.forward[2]);
        return dotPrev <= 0 && dotCurr > 0;
    }

    _notifyPlayer(player, message) {
        if (!player || !message) return;
        this.entityManager?._notifyPlayerFeedback?.(player, message);
    }

    _logRecorderEvent(type, player, details = '') {
        if (!player) return;
        this.entityManager?.recorder?.logEvent?.(type, player.index, details);
    }

    _setErrorState(state, message, now) {
        if (!this._route || !state) return;
        state.lastError = normalizeString(message, '');
        state.errorUntilMs = Math.max(0, now + this._route.rules.errorIndicatorMs);
    }

    _resetProgressState(state, {
        countReset = true,
        preserveCounters = true,
        errorMessage = '',
        now = this.nowProvider(),
    } = {}) {
        if (!state) return;
        const previousWrongOrderCount = state.wrongOrderCount;
        const previousResetCount = state.resetCount;
        state.nextCheckpointIndex = 0;
        state.passedMask.fill(0);
        state.startedAtMs = 0;
        state.lastCheckpointAtMs = 0;
        state.completed = false;
        state.completedAtMs = 0;
        state.completionTimeMs = 0;
        state.lastCheckpointId = '';
        state.lastWrongOrderAtMs = -Infinity;
        state.cooldownByCheckpointId.clear();
        state.lastError = '';
        state.errorUntilMs = 0;
        if (preserveCounters) {
            state.wrongOrderCount = previousWrongOrderCount;
            state.resetCount = previousResetCount;
        } else {
            state.wrongOrderCount = 0;
            state.resetCount = 0;
        }
        if (countReset) {
            state.resetCount += 1;
        }
        if (errorMessage) {
            this._setErrorState(state, errorMessage, now);
        }
    }

    _rewindToLastValid(state, {
        now = this.nowProvider(),
        errorMessage = '',
    } = {}) {
        if (!state || !this._route) return;
        const previousWrongOrderCount = state.wrongOrderCount;
        const previousResetCount = state.resetCount;
        const currentNext = Math.max(0, Math.min(this._route.totalCheckpoints, state.nextCheckpointIndex));
        const fallbackNext = Math.max(0, currentNext - 1);

        for (let index = fallbackNext; index < state.passedMask.length; index += 1) {
            state.passedMask[index] = 0;
        }
        state.nextCheckpointIndex = fallbackNext;
        state.completed = false;
        state.completedAtMs = 0;
        state.completionTimeMs = 0;
        state.lastCheckpointId = fallbackNext > 0 ? (this._route.sequence[fallbackNext - 1] || '') : '';
        state.lastCheckpointAtMs = fallbackNext > 0 ? now : 0;
        if (fallbackNext <= 0) {
            state.startedAtMs = 0;
        }
        state.lastWrongOrderAtMs = -Infinity;
        state.cooldownByCheckpointId.clear();
        state.lastError = '';
        state.errorUntilMs = 0;
        state.wrongOrderCount = previousWrongOrderCount;
        state.resetCount = previousResetCount + 1;
        if (errorMessage) {
            this._setErrorState(state, errorMessage, now);
        }
    }

    onPlayerSpawn(player, options = {}) {
        if (!this._route || !player || !Number.isInteger(player.index)) return;
        const state = this._ensurePlayerState(player.index);
        if (!state) return;

        const reason = normalizeString(options.reason, 'spawn');
        if (reason === 'round_start' || reason === 'match_start' || reason === 'spawn_all') {
            this._resetProgressState(state, {
                countReset: false,
                preserveCounters: false,
                errorMessage: '',
            });
        }
    }

    onPlayerDeath(player, options = {}) {
        if (!this._route || !player || !Number.isInteger(player.index)) return;
        const state = this._ensurePlayerState(player.index);
        if (!state || state.completed) return;

        const reason = normalizeString(options.cause, 'death');
        if (this._route.rules.resetOnDeath) {
            this._resetProgressState(state, {
                countReset: true,
                preserveCounters: true,
                errorMessage: 'Parcours-Reset nach Tod',
            });
            this._notifyPlayer(player, 'Parcours-Reset nach Respawn');
            this._logRecorderEvent('PARCOURS_RESET', player, `cause=${reason}`);
            return;
        }

        if (this._route.rules.resetToLastValid) {
            this._rewindToLastValid(state, {
                now: this.nowProvider(),
                errorMessage: 'Rueckfall auf letzten Checkpoint',
            });
            this._notifyPlayer(player, 'Parcours-Rueckfall nach Respawn');
            this._logRecorderEvent('PARCOURS_RESET', player, `cause=${reason} mode=last-valid`);
        }
    }

    _acceptCheckpoint(player, state, entry, now) {
        if (!this._route || !state || !entry) return;
        this._setCheckpointCooldown(state, entry.id, now);
        if (state.startedAtMs <= 0) {
            state.startedAtMs = now;
        }
        state.lastCheckpointAtMs = now;
        state.lastCheckpointId = entry.id;
        state.lastError = '';
        state.errorUntilMs = 0;
        if (entry.routeIndex >= 0 && entry.routeIndex < state.passedMask.length) {
            state.passedMask[entry.routeIndex] = 1;
        }

        if (this._route.rules.ordered) {
            state.nextCheckpointIndex = Math.max(
                state.nextCheckpointIndex,
                Math.min(this._route.totalCheckpoints, entry.routeIndex + 1)
            );
        } else {
            let passedCount = 0;
            for (let i = 0; i < state.passedMask.length; i += 1) {
                if (state.passedMask[i] === 1) passedCount += 1;
            }
            state.nextCheckpointIndex = passedCount;
        }

        const progressText = `Checkpoint validiert (${Math.min(this._route.totalCheckpoints, state.nextCheckpointIndex)}/${this._route.totalCheckpoints})`;
        this._notifyPlayer(player, progressText);
        this._logRecorderEvent(
            'PARCOURS_CP',
            player,
            `id=${entry.id} index=${entry.routeIndex + 1}/${this._route.totalCheckpoints}`
        );
    }

    _registerWrongOrder(player, state, entry, now) {
        if (!this._route || !state || !entry) return;
        if (now - state.lastWrongOrderAtMs < this._route.rules.wrongOrderCooldownMs) return;
        state.lastWrongOrderAtMs = now;
        state.wrongOrderCount += 1;
        this._setErrorState(state, 'Falsche Reihenfolge', now);
        this._notifyPlayer(player, `Falsche Reihenfolge: ${entry.id}`);
        this._logRecorderEvent(
            'PARCOURS_WRONG_ORDER',
            player,
            `expected=${state.nextCheckpointIndex + 1} got=${entry.id}`
        );
    }

    _registerSegmentTimeout(player, state, now) {
        if (this._route?.rules?.resetToLastValid) {
            this._rewindToLastValid(state, {
                now,
                errorMessage: 'Segment-Zeit ueberschritten',
            });
            this._notifyPlayer(player, 'Segment-Zeitfenster verpasst (Rueckfall)');
            this._logRecorderEvent('PARCOURS_TIMEOUT', player, 'segment-timeout mode=last-valid');
            return;
        }

        this._resetProgressState(state, {
            countReset: true,
            preserveCounters: true,
            errorMessage: 'Segment-Zeit ueberschritten',
            now,
        });
        this._notifyPlayer(player, 'Segment-Zeitfenster verpasst');
        this._logRecorderEvent('PARCOURS_TIMEOUT', player, 'segment-timeout mode=full-reset');
    }

    _completeParcours(player, state, now) {
        if (!this._route || !state || state.completed) return;
        state.completed = true;
        state.completedAtMs = now;
        state.completionTimeMs = Math.max(0, now - (state.startedAtMs || now));
        state.nextCheckpointIndex = this._route.totalCheckpoints;
        state.lastCheckpointAtMs = now;
        state.lastError = '';
        state.errorUntilMs = 0;

        if (!this._completionOrder.some((entry) => entry.playerIndex === player.index)) {
            this._completionOrder.push({
                playerIndex: player.index,
                completedAtMs: state.completedAtMs,
                completionTimeMs: state.completionTimeMs,
            });
            this._completionOrder.sort((left, right) => {
                if (left.completedAtMs !== right.completedAtMs) {
                    return left.completedAtMs - right.completedAtMs;
                }
                return left.playerIndex - right.playerIndex;
            });
        }

        this._notifyPlayer(player, `Parcours abgeschlossen (${formatDurationMs(state.completionTimeMs)})`);
        this._logRecorderEvent(
            'PARCOURS_COMPLETE',
            player,
            `route=${this._route.routeId} timeMs=${Math.round(state.completionTimeMs)}`
        );
    }

    _findTriggeredEntry(entries, player, previousPosition, now, state) {
        if (!Array.isArray(entries) || entries.length === 0) return null;
        for (const entry of entries) {
            if (this._isCheckpointTriggered(entry, player, previousPosition, now, state)) {
                return entry;
            }
        }
        return null;
    }

    updatePlayerProgress(player, previousPosition, now = this.nowProvider()) {
        if (!this._route || !player?.alive || !Number.isInteger(player.index)) return null;
        const state = this._ensurePlayerState(player.index);
        if (!state || state.completed) return null;

        const expectedIndex = Math.max(0, Math.min(this._route.totalCheckpoints, state.nextCheckpointIndex));
        const segmentTimeoutActive = this._route.rules.maxSegmentTimeMs > 0
            && state.lastCheckpointAtMs > 0
            && expectedIndex > 0;
        if (segmentTimeoutActive && (now - state.lastCheckpointAtMs) > this._route.rules.maxSegmentTimeMs) {
            this._registerSegmentTimeout(player, state, now);
            return { type: 'segment-timeout' };
        }

        if (expectedIndex < this._route.totalCheckpoints) {
            const expectedEntries = this._route.entriesByCheckpointIndex[expectedIndex] || [];
            const expectedHit = this._findTriggeredEntry(expectedEntries, player, previousPosition, now, state);
            if (expectedHit) {
                this._acceptCheckpoint(player, state, expectedHit, now);
                return { type: 'checkpoint', checkpointId: expectedHit.id };
            }
        }

        if (expectedIndex >= this._route.totalCheckpoints && this._route.finish) {
            const finishHit = this._isCheckpointTriggered(this._route.finish, player, previousPosition, now, state);
            if (finishHit) {
                this._completeParcours(player, state, now);
                return { type: 'finish', checkpointId: this._route.finish.id };
            }
        }

        for (const entry of this._route.checkpoints) {
            if (entry.routeIndex === expectedIndex) continue;
            if (!this._isCheckpointTriggered(entry, player, previousPosition, now, state)) continue;
            this._registerWrongOrder(player, state, entry, now);
            return { type: 'wrong-order', checkpointId: entry.id };
        }

        return null;
    }

    getRoundOutcome() {
        if (!this._route || this._route.rules.winnerByParcoursComplete !== true) return null;
        const completion = this._completionOrder[0];
        if (!completion) return null;
        const winner = this.entityManager?.players?.[completion.playerIndex] || null;
        if (!winner) return null;
        return {
            shouldEnd: true,
            winner,
            reason: 'PARCOURS_COMPLETE',
            parcours: {
                routeId: this._route.routeId,
                checkpointCount: this._route.totalCheckpoints,
                completionTimeMs: completion.completionTimeMs,
                completedAtMs: completion.completedAtMs,
            },
        };
    }

    getPlayerProgressSnapshot(playerIndex, now = this.nowProvider()) {
        if (!this._route) return null;
        const state = this._ensurePlayerState(playerIndex);
        if (!state) return null;
        const hasError = state.errorUntilMs > now && !!state.lastError;
        const segmentAnchor = state.lastCheckpointAtMs || state.startedAtMs || 0;
        const segmentElapsedMs = state.completed || segmentAnchor <= 0
            ? 0
            : Math.max(0, now - segmentAnchor);
        return {
            routeId: this._route.routeId,
            totalCheckpoints: this._route.totalCheckpoints,
            nextCheckpointIndex: state.nextCheckpointIndex,
            passedMask: Array.from(state.passedMask),
            startedAtMs: state.startedAtMs,
            lastCheckpointAtMs: state.lastCheckpointAtMs,
            wrongOrderCount: state.wrongOrderCount,
            resetCount: state.resetCount,
            completed: state.completed,
            completedAtMs: state.completedAtMs,
            completionTimeMs: state.completionTimeMs,
            lastCheckpointId: state.lastCheckpointId,
            hasError,
            errorMessage: hasError ? state.lastError : '',
            segmentElapsedMs,
        };
    }

    getPlayerHudState(playerIndex, now = this.nowProvider()) {
        if (!this._route) return null;
        const snapshot = this.getPlayerProgressSnapshot(playerIndex, now);
        if (!snapshot) return null;
        return {
            enabled: true,
            routeId: snapshot.routeId,
            totalCheckpoints: snapshot.totalCheckpoints,
            currentCheckpoint: snapshot.completed
                ? snapshot.totalCheckpoints
                : Math.max(0, Math.min(snapshot.totalCheckpoints, snapshot.nextCheckpointIndex)),
            completed: snapshot.completed,
            completionTimeMs: snapshot.completionTimeMs,
            segmentElapsedMs: snapshot.segmentElapsedMs,
            hasError: snapshot.hasError,
            errorMessage: snapshot.errorMessage,
            wrongOrderCount: snapshot.wrongOrderCount,
            resetCount: snapshot.resetCount,
        };
    }

    getRouteSnapshot() {
        if (!this._route) return null;
        return {
            enabled: true,
            routeId: this._route.routeId,
            totalCheckpoints: this._route.totalCheckpoints,
            sequence: [...this._route.sequence],
            checkpoints: this._route.checkpoints.map((entry) => ({
                id: entry.id,
                type: entry.type,
                aliasOf: entry.aliasOf,
                routeIndex: entry.routeIndex,
                pos: [...entry.pos],
                radius: entry.radius,
                forward: entry.forward ? [...entry.forward] : null,
            })),
            finish: this._route.finish ? {
                id: this._route.finish.id,
                type: this._route.finish.type,
                pos: [...this._route.finish.pos],
                radius: this._route.finish.radius,
                forward: this._route.finish.forward ? [...this._route.finish.forward] : null,
            } : null,
            rules: { ...this._route.rules },
        };
    }
}
