// ============================================
// MetricsLogger.mjs - episode-level training metrics logger
// ============================================

function toFinite(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export class MetricsLogger {
    constructor(options = {}) {
        this._maxHistory = Math.max(1, Math.trunc(Number(options.maxHistory) || 500));
        this._episodes = [];
        this._globalStats = {
            totalEpisodes: 0,
            totalSteps: 0,
            totalOptimzerUpdates: 0,
            bestEpisodeReward: -Infinity,
            worstEpisodeReward: Infinity,
        };
    }

    logEpisode(episodeData = {}) {
        const entry = {
            episodeIndex: toFinite(episodeData.episodeIndex, this._globalStats.totalEpisodes),
            totalReward: toFinite(episodeData.totalReward),
            steps: toFinite(episodeData.steps),
            epsilon: toFinite(episodeData.epsilon),
            avgLoss: toFinite(episodeData.avgLoss),
            kills: toFinite(episodeData.kills),
            deaths: toFinite(episodeData.deaths),
            won: episodeData.won === true,
            domainId: typeof episodeData.domainId === 'string' ? episodeData.domainId : null,
            optimizerSteps: toFinite(episodeData.optimizerSteps),
            replayFill: toFinite(episodeData.replayFill),
            timestamp: Date.now(),
        };

        this._episodes.push(entry);
        if (this._episodes.length > this._maxHistory) {
            this._episodes.shift();
        }

        this._globalStats.totalEpisodes += 1;
        this._globalStats.totalSteps += entry.steps;
        this._globalStats.totalOptimzerUpdates += entry.optimizerSteps;
        if (entry.totalReward > this._globalStats.bestEpisodeReward) {
            this._globalStats.bestEpisodeReward = entry.totalReward;
        }
        if (entry.totalReward < this._globalStats.worstEpisodeReward) {
            this._globalStats.worstEpisodeReward = entry.totalReward;
        }

        return entry;
    }

    getRecentEpisodes(count = 50) {
        const n = Math.min(count, this._episodes.length);
        return this._episodes.slice(-n);
    }

    getMovingAverage(field, window = 20) {
        const episodes = this._episodes;
        if (episodes.length === 0) return [];
        const result = [];
        for (let i = 0; i < episodes.length; i++) {
            const start = Math.max(0, i - window + 1);
            let sum = 0;
            let count = 0;
            for (let j = start; j <= i; j++) {
                const value = toFinite(episodes[j][field]);
                sum += value;
                count += 1;
            }
            result.push({
                episodeIndex: episodes[i].episodeIndex,
                value: count > 0 ? sum / count : 0,
            });
        }
        return result;
    }

    getSummary() {
        const recent = this.getRecentEpisodes(50);
        let recentRewardSum = 0;
        let recentLossSum = 0;
        let recentStepsSum = 0;
        let recentWins = 0;
        for (const ep of recent) {
            recentRewardSum += ep.totalReward;
            recentLossSum += ep.avgLoss;
            recentStepsSum += ep.steps;
            if (ep.won) recentWins += 1;
        }
        const recentCount = recent.length || 1;
        return {
            global: { ...this._globalStats },
            recent: {
                count: recent.length,
                avgReward: recentRewardSum / recentCount,
                avgLoss: recentLossSum / recentCount,
                avgSteps: recentStepsSum / recentCount,
                winRate: recentWins / recentCount,
                latestEpsilon: recent.length > 0 ? recent[recent.length - 1].epsilon : 1,
                latestReplayFill: recent.length > 0 ? recent[recent.length - 1].replayFill : 0,
            },
        };
    }

    toJSON() {
        return {
            episodes: this._episodes,
            global: { ...this._globalStats },
        };
    }
}
