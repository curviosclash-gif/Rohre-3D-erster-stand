import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { evaluateTrainingGate } from '../src/state/training/TrainingGateEvaluator.js';
import {
    buildTrainingLatestIndex,
    resolveTrainingRunArtifactLayout,
} from '../src/entities/ai/training/TrainingAutomationContractV33.js';
import {
    TRAINING_GATE_BASELINE_REFERENCE,
    TRAINING_GATE_THRESHOLD_VERSION,
} from '../src/state/training/TrainingGateThresholds.js';
import {
    evaluateChampionPromotion,
    evaluateBenchmarkArtifactRequirements,
    evaluateBenchmarkProfileGuardrails,
    resolveTrainingPerformanceProfile,
    summarizeFailureCodes,
} from '../src/state/training/TrainingBenchmarkContract.js';
import {
    buildBotValidationEval,
    evaluateBotValidationDrift,
} from './training-bot-validation-lane.mjs';
import {
    buildResumeHealth,
    buildThroughputSummary,
    createBenchmarkReport,
    readJsonIfExists as readBenchmarkJsonIfExists,
    writeJson as writeBenchmarkJson,
} from './training-benchmark-artifacts.mjs';

const RUNS_ROOT = path.join('data', 'training', 'runs');

function parseArgs(argv = []) {
    const parsed = {};
    for (let i = 0; i < argv.length; i++) {
        const token = String(argv[i] || '');
        if (!token.startsWith('--')) continue;
        const trimmed = token.slice(2);
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex >= 0) {
            parsed[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
            continue;
        }
        const next = argv[i + 1];
        if (typeof next === 'string' && !next.startsWith('--')) {
            parsed[trimmed] = next;
            i += 1;
        } else {
            parsed[trimmed] = true;
        }
    }
    return parsed;
}

function parseBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function toRepoPath(filePath) {
    return String(filePath || '').split(path.sep).join('/');
}

async function readJson(filePath) {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
}

async function readJsonIfExists(filePath) {
    try {
        return await readJson(filePath);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

async function writeJson(filePath, payload) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function resolveLatestIndex() {
    const latestPath = path.join(RUNS_ROOT, 'latest.json');
    const latest = await readJsonIfExists(latestPath);
    return {
        latestPath,
        latest,
    };
}

function formatMetricLine(check) {
    const comparatorLabel = check.comparator === 'min'
        ? `>=${check.hardThreshold} (warn >=${check.warnThreshold})`
        : `<=${check.hardThreshold} (warn <=${check.warnThreshold})`;
    return `[${check.level.toUpperCase()}] ${check.metric}: value=${check.value} target=${comparatorLabel}`;
}

function formatTrendLine(check) {
    if (check.delta == null) {
        return `[${check.level.toUpperCase()}] trend.${check.metric}: insufficient data`;
    }
    const direction = check.direction === 'max' ? '>= delta' : '<= delta';
    return `[${check.level.toUpperCase()}] trend.${check.metric}: delta=${check.delta} target ${direction} warn=${check.warnDelta} hard=${check.hardDelta}`;
}

function formatPromotionLine(check) {
    if (check.comparator === 'required') {
        return `[${check.level.toUpperCase()}] promotion.${check.metric}: value=${check.value} expected=${check.expected}`;
    }
    if (check.comparator === 'min') {
        return `[${check.level.toUpperCase()}] promotion.${check.metric}: value=${check.value} target>=${check.hardThreshold}`;
    }
    return `[${check.level.toUpperCase()}] promotion.${check.metric}: value=${check.value} target<=${check.hardThreshold}`;
}

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMetric(value) {
    return Math.round(toFiniteNumber(value, 0) * 1_000_000) / 1_000_000;
}

const TREND_RULES = Object.freeze([
    Object.freeze({
        metric: 'episodeReturnMean',
        direction: 'max',
        warnDelta: -0.03,
        hardDelta: -0.08,
    }),
    Object.freeze({
        metric: 'terminalRate',
        direction: 'max',
        warnDelta: -0.05,
        hardDelta: -0.12,
    }),
    Object.freeze({
        metric: 'timeoutRate',
        direction: 'min',
        warnDelta: 0.05,
        hardDelta: 0.12,
    }),
    Object.freeze({
        metric: 'fallbackRate',
        direction: 'min',
        warnDelta: 0.05,
        hardDelta: 0.12,
    }),
    Object.freeze({
        metric: 'actionCoverage',
        direction: 'max',
        warnDelta: -0.08,
        hardDelta: -0.2,
    }),
]);

async function listRunStampDirectories() {
    const entries = await readdir(RUNS_ROOT, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory() && /^\d/.test(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
}

async function resolveRollingWindow(runStamp, windowSize) {
    const safeWindowSize = Math.max(2, Math.min(12, Number(windowSize) || 3));
    const stamps = await listRunStampDirectories();
    const uniqueStamps = Array.from(new Set([...stamps, runStamp])).sort((left, right) => left.localeCompare(right));
    const currentIndex = uniqueStamps.findIndex((entry) => entry === runStamp);
    if (currentIndex < 0) {
        return [];
    }
    const fromIndex = Math.max(0, currentIndex - safeWindowSize + 1);
    const selected = uniqueStamps.slice(fromIndex, currentIndex + 1);
    const rows = [];
    for (const stamp of selected) {
        const evalPath = path.join(RUNS_ROOT, stamp, 'eval.json');
        const evalArtifact = await readJsonIfExists(evalPath);
        if (!evalArtifact?.metrics) continue;
        rows.push({
            stamp,
            metrics: evalArtifact.metrics,
        });
    }
    return rows;
}

function evaluateRollingTrend(windowRows) {
    if (!Array.isArray(windowRows) || windowRows.length < 2) {
        return {
            enabled: false,
            ok: true,
            status: 'pass',
            sampleCount: Array.isArray(windowRows) ? windowRows.length : 0,
            checks: [],
            warnings: [],
            hardFailures: [],
        };
    }
    const first = windowRows[0];
    const last = windowRows[windowRows.length - 1];
    const checks = TREND_RULES.map((rule) => {
        const firstValue = toFiniteNumber(first?.metrics?.[rule.metric], null);
        const lastValue = toFiniteNumber(last?.metrics?.[rule.metric], null);
        if (firstValue == null || lastValue == null) {
            return {
                metric: rule.metric,
                direction: rule.direction,
                level: 'warn',
                delta: null,
                first: firstValue,
                last: lastValue,
                warnDelta: rule.warnDelta,
                hardDelta: rule.hardDelta,
                reason: 'insufficient-data',
            };
        }
        const delta = roundMetric(lastValue - firstValue);
        let level = 'pass';
        if (rule.direction === 'max') {
            if (delta <= rule.hardDelta) level = 'fail';
            else if (delta <= rule.warnDelta) level = 'warn';
        } else {
            if (delta >= rule.hardDelta) level = 'fail';
            else if (delta >= rule.warnDelta) level = 'warn';
        }
        return {
            metric: rule.metric,
            direction: rule.direction,
            level,
            delta,
            first: roundMetric(firstValue),
            last: roundMetric(lastValue),
            warnDelta: roundMetric(rule.warnDelta),
            hardDelta: roundMetric(rule.hardDelta),
            reason: null,
        };
    });
    const hardFailures = checks.filter((entry) => entry.level === 'fail');
    const warnings = checks.filter((entry) => entry.level === 'warn');
    return {
        enabled: true,
        ok: hardFailures.length === 0,
        status: hardFailures.length === 0 ? 'pass' : 'fail',
        sampleCount: windowRows.length,
        checks,
        warnings,
        hardFailures,
    };
}

function evaluatePlayEvalDrift(evalArtifact) {
    const metrics = evalArtifact?.playEval?.metrics;
    const baseline = evalArtifact?.playEval?.baseline?.reference || {};
    if (!metrics || typeof metrics !== 'object') {
        return {
            enabled: false,
            ok: true,
            status: 'pass',
            checks: [],
            warnings: [],
            hardFailures: [],
        };
    }
    const metricDefs = [
        {
            metric: 'scenarioReturnMean',
            value: toFiniteNumber(metrics.scenarioReturnMean, 0),
            baseline: toFiniteNumber(baseline.scenarioReturnMean, 0),
        },
        {
            metric: 'scenarioWinRate',
            value: toFiniteNumber(metrics.scenarioWinRate, 0),
            baseline: toFiniteNumber(baseline.scenarioWinRate, 0),
        },
    ];
    const checks = metricDefs.map((entry) => {
        const warnThreshold = roundMetric(entry.baseline * 0.9);
        const hardThreshold = roundMetric(entry.baseline * 0.8);
        let level = 'pass';
        if (entry.value < hardThreshold) level = 'fail';
        else if (entry.value < warnThreshold) level = 'warn';
        return {
            metric: entry.metric,
            comparator: 'min',
            level,
            value: roundMetric(entry.value),
            warnThreshold,
            hardThreshold,
            baseline: roundMetric(entry.baseline),
        };
    });
    const hardFailures = checks.filter((entry) => entry.level === 'fail');
    const warnings = checks.filter((entry) => entry.level === 'warn');
    return {
        enabled: true,
        ok: hardFailures.length === 0,
        status: hardFailures.length === 0 ? 'pass' : 'fail',
        checks,
        warnings,
        hardFailures,
    };
}

function mapBotValidationChecksToFailures(checks = []) {
    const failures = [];
    for (const check of checks) {
        if (check?.level !== 'fail') continue;
        if (check.metric === 'averageBotSurvival') {
            failures.push({ code: 'player-dead', metric: check.metric, value: check.value });
        } else if (check.metric === 'botWinRate') {
            failures.push({ code: 'match-loss', metric: check.metric, value: check.value });
        } else if (check.metric === 'forcedRoundRate') {
            failures.push({ code: 'forced-round', metric: check.metric, value: check.value });
        } else if (check.metric === 'timeoutRoundRate') {
            failures.push({ code: 'timeout-round', metric: check.metric, value: check.value });
        }
    }
    return failures;
}

function buildFailureTaxonomySummary({ artifactAudit, guardrails, botValidationGate }) {
    const entries = [
        ...(Array.isArray(artifactAudit?.failures) ? artifactAudit.failures : []),
        ...(Array.isArray(guardrails?.failures) ? guardrails.failures : []),
        ...mapBotValidationChecksToFailures(botValidationGate?.checks || []),
    ];
    return {
        entries,
        counts: summarizeFailureCodes(entries),
    };
}

async function upsertLatestIndex(runStamp, updates = {}) {
    const latestPath = path.join(RUNS_ROOT, 'latest.json');
    const current = await readJsonIfExists(latestPath) || {};
    const layout = resolveTrainingRunArtifactLayout(runStamp);
    const currentRunPath = current?.artifacts?.run?.path || current?.run || null;
    const currentEvalPath = current?.artifacts?.eval?.path || current?.eval || null;
    const currentGatePath = current?.artifacts?.gate?.path || current?.gate || null;
    const currentTrainerPath = current?.artifacts?.trainer?.path || current?.trainer || null;
    const currentBenchmarkManifestPath = current?.artifacts?.benchmarkManifest?.path || null;
    const currentDecisionTracePath = current?.artifacts?.decisionTrace?.path || null;
    const currentBenchmarkReportPath = current?.artifacts?.benchmarkReport?.path || null;
    const currentCheckpointPath = current?.artifacts?.checkpoint?.path || current?.checkpoint || null;
    const runPath = Object.prototype.hasOwnProperty.call(updates, 'run') ? updates.run : currentRunPath;
    const evalPath = Object.prototype.hasOwnProperty.call(updates, 'eval') ? updates.eval : currentEvalPath;
    const gatePath = Object.prototype.hasOwnProperty.call(updates, 'gate') ? updates.gate : currentGatePath;
    const trainerPath = Object.prototype.hasOwnProperty.call(updates, 'trainer') ? updates.trainer : currentTrainerPath;
    const benchmarkManifestPath = Object.prototype.hasOwnProperty.call(updates, 'benchmarkManifest')
        ? updates.benchmarkManifest
        : currentBenchmarkManifestPath;
    const decisionTracePath = Object.prototype.hasOwnProperty.call(updates, 'decisionTrace')
        ? updates.decisionTrace
        : currentDecisionTracePath;
    const benchmarkReportPath = Object.prototype.hasOwnProperty.call(updates, 'benchmarkReport')
        ? updates.benchmarkReport
        : currentBenchmarkReportPath;
    const checkpointPath = Object.prototype.hasOwnProperty.call(updates, 'checkpoint') ? updates.checkpoint : currentCheckpointPath;
    const resumeSource = Object.prototype.hasOwnProperty.call(updates, 'resumeSource')
        ? updates.resumeSource
        : (current?.resumeSource || null);

    const next = buildTrainingLatestIndex({
        stamp: runStamp,
        generatedAt: new Date().toISOString(),
        lastCompletedStage: gatePath ? 'gate' : (evalPath ? 'eval' : (runPath ? 'run' : null)),
        resumeSource,
        artifacts: {
            run: { status: runPath ? 'completed' : 'pending', exists: !!runPath },
            eval: { status: evalPath ? 'completed' : 'pending', exists: !!evalPath },
            gate: { status: gatePath ? 'completed' : 'pending', exists: !!gatePath },
            trainer: {
                status: trainerPath ? 'completed' : 'pending',
                exists: !!trainerPath,
            },
            benchmarkManifest: {
                status: benchmarkManifestPath ? 'completed' : 'pending',
                exists: !!benchmarkManifestPath,
            },
            decisionTrace: {
                status: decisionTracePath ? 'completed' : 'pending',
                exists: !!decisionTracePath,
            },
            benchmarkReport: {
                status: benchmarkReportPath ? 'completed' : 'pending',
                exists: !!benchmarkReportPath,
            },
            checkpoint: {
                status: checkpointPath ? 'completed' : 'pending',
                exists: !!checkpointPath,
            },
        },
    });
    if (runPath) next.artifacts.run.path = runPath;
    if (evalPath) next.artifacts.eval.path = evalPath;
    if (gatePath) next.artifacts.gate.path = gatePath;
    if (trainerPath) next.artifacts.trainer.path = trainerPath;
    if (benchmarkManifestPath) next.artifacts.benchmarkManifest.path = benchmarkManifestPath;
    if (decisionTracePath) next.artifacts.decisionTrace.path = decisionTracePath;
    if (benchmarkReportPath) next.artifacts.benchmarkReport.path = benchmarkReportPath;
    if (checkpointPath) next.artifacts.checkpoint.path = checkpointPath;
    next.runDir = layout.runDir;
    await writeJson(latestPath, next);
    return {
        latestPath,
        latest: next,
    };
}

async function restoreLatestIndex(layout, latestSnapshot = null) {
    const backup = await readJsonIfExists(layout.latestBackupPath);
    if (backup && typeof backup === 'object') {
        if (backup.exists === true && backup.latest && typeof backup.latest === 'object') {
            await writeJson(layout.latestIndexPath, backup.latest);
            return true;
        }
        if (backup.exists === false) {
            await rm(layout.latestIndexPath, { force: true });
            return true;
        }
    }
    if (latestSnapshot && typeof latestSnapshot === 'object') {
        await writeJson(layout.latestIndexPath, latestSnapshot);
        return true;
    }
    return false;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const writeLatest = parseBoolean(args['write-latest'], true);
    const latestIndex = await resolveLatestIndex();
    const latestRunStamp = typeof latestIndex.latest?.stamp === 'string' && latestIndex.latest.stamp.trim()
        ? latestIndex.latest.stamp.trim()
        : (typeof latestIndex.latest?.runStamp === 'string' ? latestIndex.latest.runStamp.trim() : '');
    const runStamp = typeof args.stamp === 'string' && args.stamp.trim()
        ? args.stamp.trim()
        : latestRunStamp;
    if (!runStamp) {
        throw new Error('No run stamp found. Run training:eval first or pass --stamp <runStamp>.');
    }

    const runDir = path.join(RUNS_ROOT, runStamp);
    const layout = resolveTrainingRunArtifactLayout(runStamp);
    const evalPath = typeof args.eval === 'string' && args.eval.trim()
        ? args.eval.trim()
        : path.join(runDir, 'eval.json');
    const trendWindowSize = Math.max(2, Math.min(12, Number(args.window) || 3));
    const latestBefore = writeLatest ? await readJsonIfExists(layout.latestIndexPath) : null;
    let evalArtifact = await readJson(evalPath);
    const runArtifactPath = typeof evalArtifact?.source?.runArtifactPath === 'string' && evalArtifact.source.runArtifactPath.trim()
        ? evalArtifact.source.runArtifactPath.trim()
        : path.join(runDir, 'run.json');

    const botValidationReportPath = (
        typeof args['bot-validation-report'] === 'string' && args['bot-validation-report'].trim()
            ? args['bot-validation-report'].trim()
            : (
                typeof evalArtifact?.source?.botValidationReportPath === 'string' && evalArtifact.source.botValidationReportPath.trim()
                    ? evalArtifact.source.botValidationReportPath.trim()
                    : (
                        typeof evalArtifact?.botValidation?.source?.reportPath === 'string' && evalArtifact.botValidation.source.reportPath.trim()
                            ? evalArtifact.botValidation.source.reportPath.trim()
                            : path.join(runDir, 'bot-validation-report.json')
                    )
            )
    );
    const botValidationReport = await readJsonIfExists(botValidationReportPath);
    evalArtifact = {
        ...evalArtifact,
        botValidation: buildBotValidationEval(botValidationReport, {
            reportPath: toRepoPath(botValidationReportPath),
            exists: botValidationReport != null,
        }),
    };
    const runArtifact = await readBenchmarkJsonIfExists(runArtifactPath);
    const trainerArtifact = await readBenchmarkJsonIfExists(
        runArtifact?.trainerArtifactPath
            ? runArtifact.trainerArtifactPath
            : layout.trainerArtifactPath
    );
    const benchmarkManifest = await readBenchmarkJsonIfExists(layout.benchmarkManifestPath);
    const decisionTrace = await readBenchmarkJsonIfExists(layout.decisionTracePath);
    const hardwareTelemetry = runArtifact?.hardwareTelemetry || trainerArtifact?.hardwareTelemetry || null;
    const performanceProfile = resolveTrainingPerformanceProfile(
        benchmarkManifest?.performanceProfileName || runArtifact?.performanceProfileName || '',
        null
    );

    const gateResult = evaluateTrainingGate(evalArtifact, {
        baseline: TRAINING_GATE_BASELINE_REFERENCE,
    });
    const trendWindowRows = await resolveRollingWindow(runStamp, trendWindowSize);
    const trendResult = evaluateRollingTrend(trendWindowRows);
    const playEvalResult = evaluatePlayEvalDrift(evalArtifact);
    const botValidationResult = evaluateBotValidationDrift(evalArtifact);
    const artifactAudit = evaluateBenchmarkArtifactRequirements({
        manifest: benchmarkManifest,
        runArtifact,
        evalArtifact,
        trainerArtifact,
        decisionTrace,
    });
    const guardrails = evaluateBenchmarkProfileGuardrails({
        profile: performanceProfile,
        bridgeTelemetry: evalArtifact?.bridge?.telemetry || runArtifact?.bridgeTelemetry,
        opsKpis: evalArtifact?.metrics?.opsKpis || runArtifact?.opsKpis,
        artifactBacklogCount: artifactAudit.failures.length,
        resumeRequested: runArtifact?.resume?.requested,
        resumeLoaded: runArtifact?.resume?.loaded,
        hardwareTelemetry,
    });
    const failureTaxonomy = buildFailureTaxonomySummary({
        artifactAudit,
        guardrails,
        botValidationGate: botValidationResult,
    });
    const resumeHealth = buildResumeHealth(runArtifact);
    const throughput = runArtifact?.throughput || buildThroughputSummary({
        elapsedMs: runArtifact?.elapsedMs,
        totals: runArtifact?.summary?.totals,
    });
    const combinedOk = gateResult.ok
        && trendResult.ok
        && playEvalResult.ok
        && botValidationResult.ok
        && artifactAudit.ok
        && guardrails.ok;
    const promotion = evaluateChampionPromotion({
        manifest: benchmarkManifest,
        runStamp,
        validationLane: evalArtifact?.botValidation || null,
        botValidationGate: botValidationResult,
        playEvalGate: playEvalResult,
        gateOk: combinedOk,
    });
    const gateArtifact = {
        ok: combinedOk,
        status: combinedOk ? 'pass' : 'fail',
        runStamp,
        generatedAt: new Date().toISOString(),
        contractVersion: 'v80-training-gate-v1',
        thresholdVersion: TRAINING_GATE_THRESHOLD_VERSION,
        source: {
            evalPath: toRepoPath(evalPath),
            runPath: toRepoPath(runArtifactPath),
            benchmarkManifestPath: benchmarkManifest ? toRepoPath(layout.benchmarkManifestPath) : null,
            decisionTracePath: decisionTrace ? toRepoPath(layout.decisionTracePath) : null,
        },
        kpis: gateResult.kpis,
        checks: gateResult.checks,
        warnings: gateResult.warnings,
        hardFailures: gateResult.hardFailures,
        thresholds: gateResult.thresholds,
        trendGate: {
            windowSize: trendWindowSize,
            sampleStamps: trendWindowRows.map((entry) => entry.stamp),
            ...trendResult,
        },
        playEvalGate: playEvalResult,
        botValidationGate: botValidationResult,
        botValidationFailureTaxonomy: botValidationReport?.failureTaxonomy || null,
        artifactAudit,
        guardrails,
        failureTaxonomy,
        resumeHealth,
        throughput,
        hardwareTelemetry,
        rollout: {
            promotion,
        },
    };

    const gatePath = path.join(runDir, 'gate.json');
    await writeJson(gatePath, gateArtifact);
    const benchmarkReport = createBenchmarkReport({
        runStamp,
        profile: performanceProfile,
        manifest: benchmarkManifest,
        source: gateArtifact.source,
        artifacts: {
            run: toRepoPath(runArtifactPath),
            eval: toRepoPath(evalPath),
            trainer: runArtifact?.trainerArtifactPath || toRepoPath(layout.trainerArtifactPath),
            checkpoint: runArtifact?.checkpointPath || null,
            benchmarkManifest: benchmarkManifest ? toRepoPath(layout.benchmarkManifestPath) : null,
            decisionTrace: decisionTrace ? toRepoPath(layout.decisionTracePath) : null,
            benchmarkReport: toRepoPath(layout.benchmarkReportPath),
            botValidationReport: botValidationReportPath ? toRepoPath(botValidationReportPath) : null,
        },
        validationLane: evalArtifact?.botValidation || null,
        comparison: {
            gate: gateArtifact,
            championId: benchmarkManifest?.compareRules?.championId || null,
            originBaselineId: benchmarkManifest?.compareRules?.originBaselineId || null,
        },
        throughput,
        resumeHealth,
        hardwareTelemetry,
        gate: gateArtifact,
        artifactAudit,
        guardrails,
        failureSummary: failureTaxonomy,
        rollout: {
            promotion,
        },
    });
    await writeBenchmarkJson(layout.benchmarkReportPath, benchmarkReport);

    let latestUpdate = null;
    let latestRestored = false;
    if (writeLatest) {
        if (combinedOk) {
            latestUpdate = await upsertLatestIndex(runStamp, {
                run: latestIndex.latest?.artifacts?.run?.path || latestIndex.latest?.run || null,
                eval: toRepoPath(evalPath),
                gate: toRepoPath(gatePath),
                benchmarkManifest: benchmarkManifest ? toRepoPath(layout.benchmarkManifestPath) : null,
                decisionTrace: decisionTrace ? toRepoPath(layout.decisionTracePath) : null,
                benchmarkReport: toRepoPath(layout.benchmarkReportPath),
            });
        } else {
            latestRestored = await restoreLatestIndex(layout, latestBefore);
        }
    }

    const reportLines = [
        ...gateResult.checks.map(formatMetricLine),
        ...trendResult.checks.map(formatTrendLine),
        ...playEvalResult.checks.map(formatMetricLine),
        ...botValidationResult.checks.map(formatMetricLine),
        ...promotion.checks.map(formatPromotionLine),
        ...artifactAudit.failures.map((entry) => `[FAIL] artifact.${entry.artifact || entry.code}: ${entry.summary}`),
        ...guardrails.checks.map((entry) => `[INFO] guardrail.${entry.metric}: value=${entry.value} hard<=${entry.hardLimit}`),
    ];
    console.log(JSON.stringify({
        ok: combinedOk,
        status: combinedOk ? 'pass' : 'fail',
        runStamp,
        gatePath: toRepoPath(gatePath),
        benchmarkReportPath: toRepoPath(layout.benchmarkReportPath),
        latestIndexPath: latestUpdate ? toRepoPath(latestUpdate.latestPath) : null,
        latestRestored,
        trendWindowSize,
        trendSampleCount: trendResult.sampleCount,
        artifactFailures: artifactAudit.failures.length,
        guardrailFailures: guardrails.failures.length,
        failureCounts: failureTaxonomy.counts,
        candidateRole: promotion.candidate?.role || benchmarkManifest?.candidate?.role || null,
        promotionStatus: promotion.status,
        promotionEligible: promotion.eligible,
        referenceOnly: promotion.candidate?.referenceOnly === true,
        report: reportLines,
    }, null, 2));

    process.exitCode = combinedOk ? 0 : 1;
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
