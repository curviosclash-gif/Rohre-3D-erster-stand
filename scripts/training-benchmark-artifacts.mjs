import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import {
    TRAINING_BENCHMARK_COMPARE_RULES,
    TRAINING_BENCHMARK_CONTRACT_VERSION,
    TRAINING_BENCHMARK_MANIFEST_VERSION,
    TRAINING_BENCHMARK_MATRIX,
    TRAINING_BENCHMARK_PROFILE_VERSION,
    TRAINING_BENCHMARK_REPORT_VERSION,
    TRAINING_BENCHMARK_SEMANTIC_WINDOW,
    TRAINING_DECISION_TRACE_VERSION,
    TRAINING_FROZEN_REFERENCES,
    TRAINING_HARDWARE_TELEMETRY_VERSION,
    normalizeTrainingPerformanceProfileName,
    resolveTrainingPerformanceProfile,
} from '../src/state/training/TrainingBenchmarkContract.js';

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMetric(value) {
    return Math.round(toFiniteNumber(value, 0) * 1_000_000) / 1_000_000;
}

export function toRepoPath(targetPath) {
    return String(targetPath || '').split(path.sep).join('/');
}

export async function readJsonIfExists(filePath) {
    try {
        const raw = await readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

export async function writeJson(filePath, payload) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function captureHardwareTelemetry({
    phase = 'unknown',
    profileName = null,
    extra = {},
} = {}) {
    const cpus = Array.isArray(os.cpus?.()) ? os.cpus() : [];
    const processMemory = process.memoryUsage();
    return {
        contractVersion: TRAINING_HARDWARE_TELEMETRY_VERSION,
        capturedAt: new Date().toISOString(),
        phase,
        performanceProfile: profileName,
        host: {
            platform: process.platform,
            arch: process.arch,
            hostname: os.hostname?.() || null,
            release: os.release?.() || null,
            uptimeSeconds: toFiniteNumber(os.uptime?.(), 0),
            cpuCount: cpus.length,
            cpuModel: cpus[0]?.model || null,
            totalMemoryBytes: toFiniteNumber(os.totalmem?.(), 0),
            freeMemoryBytes: toFiniteNumber(os.freemem?.(), 0),
            loadAverage: Array.isArray(os.loadavg?.()) ? os.loadavg() : [],
        },
        process: {
            pid: process.pid,
            nodeVersion: process.version,
            rssBytes: toFiniteNumber(processMemory.rss, 0),
            heapTotalBytes: toFiniteNumber(processMemory.heapTotal, 0),
            heapUsedBytes: toFiniteNumber(processMemory.heapUsed, 0),
            externalBytes: toFiniteNumber(processMemory.external, 0),
            arrayBuffersBytes: toFiniteNumber(processMemory.arrayBuffers, 0),
            uptimeSeconds: roundMetric(process.uptime?.() || 0),
        },
        thermal: {
            available: false,
            temperatureC: null,
            note: 'Lokale Temperaturdaten werden noch nicht automatisch ausgelesen.',
        },
        extra,
    };
}

export function buildThroughputSummary({
    elapsedMs = 0,
    totals = null,
    stages = [],
    runsExecuted = null,
} = {}) {
    const safeElapsedMs = Math.max(0, Math.trunc(toFiniteNumber(elapsedMs, 0)));
    const elapsedSeconds = safeElapsedMs > 0 ? safeElapsedMs / 1000 : 0;
    const episodesTotal = Math.max(0, Math.trunc(toFiniteNumber(totals?.episodesTotal, 0)));
    const stepsTotal = Math.max(0, Math.trunc(toFiniteNumber(totals?.stepsTotal, 0)));
    const completedRuns = runsExecuted == null
        ? null
        : Math.max(0, Math.trunc(toFiniteNumber(runsExecuted, 0)));
    const runStageDurations = Array.isArray(stages)
        ? stages
            .flatMap((entry) => Array.isArray(entry?.stages) ? entry.stages : [])
            .map((entry) => ({
                stage: entry?.stage || 'unknown',
                elapsedMs: Math.max(0, Math.trunc(toFiniteNumber(entry?.elapsedMs, 0))),
            }))
        : [];

    const stageTotals = {};
    for (const stage of runStageDurations) {
        if (!Object.prototype.hasOwnProperty.call(stageTotals, stage.stage)) {
            stageTotals[stage.stage] = 0;
        }
        stageTotals[stage.stage] += stage.elapsedMs;
    }

    return {
        elapsedMs: safeElapsedMs,
        episodesPerSecond: elapsedSeconds > 0 ? roundMetric(episodesTotal / elapsedSeconds) : 0,
        stepsPerSecond: elapsedSeconds > 0 ? roundMetric(stepsTotal / elapsedSeconds) : 0,
        runsPerHour: elapsedSeconds > 0 && completedRuns != null
            ? roundMetric((completedRuns / elapsedSeconds) * 3600)
            : null,
        totals: {
            episodesTotal,
            stepsTotal,
            runsExecuted: completedRuns,
        },
        stageTotalsMs: stageTotals,
    };
}

export function buildResumeHealth(runArtifact = {}) {
    const resume = runArtifact?.resume && typeof runArtifact.resume === 'object'
        ? runArtifact.resume
        : {};
    return {
        requested: resume.requested === true,
        mode: resume.mode || null,
        sourcePath: resume.sourcePath || null,
        loaded: resume.loaded === true,
        responseOk: resume.responseOk === true,
        strict: resume.strict === true,
        error: resume.error || null,
        errorDetails: resume.errorDetails || null,
        status: resume.requested === true
            ? (resume.loaded === true ? 'pass' : 'fail')
            : 'not-requested',
    };
}

export function createDecisionTraceArtifact({
    runStamp,
    playScenarios = [],
    bridgeScenarios = [],
    source = {},
} = {}) {
    const decisionCount = Array.isArray(playScenarios)
        ? playScenarios.reduce((sum, scenario) => sum + Math.max(0, Number(scenario?.actionCount || 0)), 0)
        : 0;
    return {
        contractVersion: TRAINING_DECISION_TRACE_VERSION,
        generatedAt: new Date().toISOString(),
        runStamp: runStamp || null,
        source,
        playScenarios,
        bridgeScenarios,
        summary: {
            scenarioCount: Array.isArray(playScenarios) ? playScenarios.length : 0,
            bridgeScenarioCount: Array.isArray(bridgeScenarios) ? bridgeScenarios.length : 0,
            decisionCount,
        },
    };
}

export function createBenchmarkManifest({
    stamp,
    seriesStamp = null,
    profileName = null,
    layout,
    source = {},
} = {}) {
    const normalizedProfileName = normalizeTrainingPerformanceProfileName(profileName, null);
    const profile = resolveTrainingPerformanceProfile(normalizedProfileName, null);
    const environmentProfile = source?.summaryConfig?.environmentProfile || profile?.run?.environmentProfile || null;
    const runtimeNear = environmentProfile === 'runtime-near';
    return {
        contractVersion: TRAINING_BENCHMARK_MANIFEST_VERSION,
        generatedAt: new Date().toISOString(),
        stamp: stamp || layout?.stamp || null,
        seriesStamp: seriesStamp || null,
        benchmarkContractVersion: TRAINING_BENCHMARK_CONTRACT_VERSION,
        benchmarkMatrix: TRAINING_BENCHMARK_MATRIX,
        semantics: TRAINING_BENCHMARK_SEMANTIC_WINDOW,
        compareRules: TRAINING_BENCHMARK_COMPARE_RULES,
        references: TRAINING_FROZEN_REFERENCES,
        performanceProfileVersion: TRAINING_BENCHMARK_PROFILE_VERSION,
        performanceProfile: profile,
        performanceProfileName: normalizedProfileName,
        environment: {
            profile: environmentProfile,
            runtimeNear,
            syntheticLane: environmentProfile === 'synthetic-smoke',
            promotionEligible: runtimeNear,
        },
        artifacts: {
            run: layout?.runArtifactPath ? toRepoPath(layout.runArtifactPath) : null,
            eval: layout?.evalArtifactPath ? toRepoPath(layout.evalArtifactPath) : null,
            gate: layout?.gateArtifactPath ? toRepoPath(layout.gateArtifactPath) : null,
            trainer: layout?.trainerArtifactPath ? toRepoPath(layout.trainerArtifactPath) : null,
            checkpoint: layout?.checkpointPath ? toRepoPath(layout.checkpointPath) : null,
            benchmarkManifest: layout?.benchmarkManifestPath ? toRepoPath(layout.benchmarkManifestPath) : null,
            decisionTrace: layout?.decisionTracePath ? toRepoPath(layout.decisionTracePath) : null,
            benchmarkReport: layout?.benchmarkReportPath ? toRepoPath(layout.benchmarkReportPath) : null,
        },
        source,
    };
}

export function createBenchmarkReport({
    runStamp,
    profile = null,
    manifest = null,
    source = {},
    artifacts = {},
    validationLane = null,
    comparison = {},
    throughput = null,
    resumeHealth = null,
    hardwareTelemetry = null,
    gate = null,
    artifactAudit = null,
    guardrails = null,
    failureSummary = {},
} = {}) {
    return {
        contractVersion: TRAINING_BENCHMARK_REPORT_VERSION,
        generatedAt: new Date().toISOString(),
        runStamp: runStamp || null,
        benchmarkContractVersion: TRAINING_BENCHMARK_CONTRACT_VERSION,
        manifestVersion: manifest?.contractVersion || null,
        performanceProfileName: profile?.id || manifest?.performanceProfileName || null,
        performanceProfile: profile,
        source,
        artifacts,
        validationLane,
        comparison,
        throughput,
        resumeHealth,
        hardwareTelemetry,
        gate,
        artifactAudit,
        guardrails,
        failureSummary,
    };
}
