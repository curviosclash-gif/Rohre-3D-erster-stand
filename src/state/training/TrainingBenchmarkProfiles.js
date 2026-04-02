export const TRAINING_BENCHMARK_PROFILE_VERSION = 'v80-benchmark-profiles-v1';

export const TRAINING_PERFORMANCE_PROFILES = Object.freeze({
    'quick-benchmark': Object.freeze({
        id: 'quick-benchmark',
        label: 'Quick benchmark',
        description: 'Kurzlauf fuer deterministische Kandidatenpruefung mit maximaler Reproduzierbarkeit.',
        trainer: Object.freeze({
            workerCount: 1,
            replayCapacity: 50_000,
            batchSize: 64,
            replayWarmup: 256,
            targetSyncInterval: 500,
            checkpointEveryRuns: 1,
            parallelism: 1,
        }),
        run: Object.freeze({
            runnerProfile: 'ops',
            environmentProfile: 'runtime-near',
            episodes: 2,
            maxSteps: 120,
            stepTimeoutRetries: 0,
            timeoutStepMs: 120,
            timeoutEpisodeMs: 120_000,
            timeoutRunMs: 180_000,
        }),
        bridge: Object.freeze({
            maxPendingAcks: 256,
            backpressureThreshold: 192,
            dropTrainingWhenBacklogged: true,
        }),
        loop: Object.freeze({
            runs: 1,
            durationHours: null,
            stageTimeoutMs: 20 * 60_000,
            stopOnFail: true,
            withTrainerServer: true,
        }),
        guardrails: Object.freeze({
            maxLatencyP95Ms: 12,
            maxTimeoutRate: 0.1,
            maxFallbackRate: 0.05,
            maxBackpressureDrops: 0,
            maxPendingAckRatio: 0.35,
            maxArtifactBacklog: 0,
            maxResumeFailures: 0,
            temperatureC: null,
        }),
    }),
    ablation: Object.freeze({
        id: 'ablation',
        label: 'Ablation',
        description: 'Mittlerer Vergleichslauf fuer isolierte Einzelvariablen.',
        trainer: Object.freeze({
            workerCount: 1,
            replayCapacity: 75_000,
            batchSize: 96,
            replayWarmup: 512,
            targetSyncInterval: 700,
            checkpointEveryRuns: 1,
            parallelism: 1,
        }),
        run: Object.freeze({
            runnerProfile: 'learn',
            environmentProfile: 'synthetic-smoke',
            episodes: 4,
            maxSteps: 180,
            stepTimeoutRetries: 1,
            timeoutStepMs: 180,
            timeoutEpisodeMs: 180_000,
            timeoutRunMs: 360_000,
        }),
        bridge: Object.freeze({
            maxPendingAcks: 512,
            backpressureThreshold: 384,
            dropTrainingWhenBacklogged: true,
        }),
        loop: Object.freeze({
            runs: 3,
            durationHours: null,
            stageTimeoutMs: 40 * 60_000,
            stopOnFail: true,
            withTrainerServer: true,
        }),
        guardrails: Object.freeze({
            maxLatencyP95Ms: 18,
            maxTimeoutRate: 0.15,
            maxFallbackRate: 0.08,
            maxBackpressureDrops: 0,
            maxPendingAckRatio: 0.4,
            maxArtifactBacklog: 0,
            maxResumeFailures: 0,
            temperatureC: null,
        }),
    }),
    'overnight-high-util': Object.freeze({
        id: 'overnight-high-util',
        label: 'Overnight high util',
        description: 'Langlauf fuer hohe lokale Auslastung mit harten Resume- und Artefaktguardrails.',
        trainer: Object.freeze({
            workerCount: 1,
            replayCapacity: 150_000,
            batchSize: 128,
            replayWarmup: 1_024,
            targetSyncInterval: 1_000,
            checkpointEveryRuns: 2,
            parallelism: 1,
        }),
        run: Object.freeze({
            runnerProfile: 'learn',
            environmentProfile: 'runtime-near',
            episodes: 8,
            maxSteps: 240,
            stepTimeoutRetries: 1,
            timeoutStepMs: 220,
            timeoutEpisodeMs: 240_000,
            timeoutRunMs: 1_200_000,
        }),
        bridge: Object.freeze({
            maxPendingAcks: 1_024,
            backpressureThreshold: 768,
            dropTrainingWhenBacklogged: true,
        }),
        loop: Object.freeze({
            runs: 100_000,
            durationHours: 10,
            stageTimeoutMs: 90 * 60_000,
            stopOnFail: false,
            withTrainerServer: true,
        }),
        guardrails: Object.freeze({
            maxLatencyP95Ms: 30,
            maxTimeoutRate: 0.2,
            maxFallbackRate: 0.1,
            maxBackpressureDrops: 2,
            maxPendingAckRatio: 0.55,
            maxArtifactBacklog: 0,
            maxResumeFailures: 0,
            temperatureC: null,
        }),
    }),
    marathon: Object.freeze({
        id: 'marathon',
        label: 'Marathon',
        description: '24h-Operatorprofil fuer maximale nutzbare Leistung ohne stillen Artefaktstau.',
        trainer: Object.freeze({
            workerCount: 1,
            replayCapacity: 250_000,
            batchSize: 160,
            replayWarmup: 2_048,
            targetSyncInterval: 1_500,
            checkpointEveryRuns: 4,
            parallelism: 1,
        }),
        run: Object.freeze({
            runnerProfile: 'learn',
            environmentProfile: 'runtime-near',
            episodes: 8,
            maxSteps: 320,
            stepTimeoutRetries: 1,
            timeoutStepMs: 240,
            timeoutEpisodeMs: 300_000,
            timeoutRunMs: 1_500_000,
        }),
        bridge: Object.freeze({
            maxPendingAcks: 1_536,
            backpressureThreshold: 1_152,
            dropTrainingWhenBacklogged: true,
        }),
        loop: Object.freeze({
            runs: 100_000,
            durationHours: 24,
            stageTimeoutMs: 120 * 60_000,
            stopOnFail: false,
            withTrainerServer: true,
        }),
        guardrails: Object.freeze({
            maxLatencyP95Ms: 36,
            maxTimeoutRate: 0.22,
            maxFallbackRate: 0.12,
            maxBackpressureDrops: 3,
            maxPendingAckRatio: 0.6,
            maxArtifactBacklog: 0,
            maxResumeFailures: 0,
            temperatureC: null,
        }),
    }),
});

export function normalizeTrainingPerformanceProfileName(value, fallback = null) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized && Object.prototype.hasOwnProperty.call(TRAINING_PERFORMANCE_PROFILES, normalized)) {
        return normalized;
    }
    return fallback;
}

export function resolveTrainingPerformanceProfile(value, fallback = null) {
    const profileName = normalizeTrainingPerformanceProfileName(value, fallback);
    if (!profileName) return null;
    return TRAINING_PERFORMANCE_PROFILES[profileName] || null;
}

export function listTrainingPerformanceProfiles() {
    return Object.keys(TRAINING_PERFORMANCE_PROFILES)
        .map((key) => resolveTrainingPerformanceProfile(key))
        .filter(Boolean);
}
